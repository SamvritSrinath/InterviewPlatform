import {NextRequest, NextResponse} from 'next/server';
import {createServiceClient} from '@/lib/supabase/server';
import {Database} from '@/types/database';

export const dynamic = 'force-dynamic';

// POST /api/monitoring/check-ip - Check if IP is suspicious for a session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {sessionId, clientIp} = body;

    if (!sessionId || !clientIp) {
      return NextResponse.json(
        {error: 'Session ID and client IP are required'},
        {status: 400},
      );
    }

    const serviceClient = createServiceClient();

    // Get session to find user
    const {data: session} = await serviceClient
      .from('sessions')
      .select('user_id')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return NextResponse.json({error: 'Session not found'}, {status: 404});
    }

    const sessionTyped = session as Pick<
      Database['public']['Tables']['sessions']['Row'],
      'user_id'
    >;

    // Check if this IP has been used by other users for this session
    const {data: ipRecords} = await serviceClient
      .from('user_ips')
      .select('user_id')
      .eq('ip_address', clientIp)
      .eq('session_id', sessionId);

    // If IP is used by different user, it's suspicious
    const ipRecordsTyped = (ipRecords || []) as Array<
      Pick<Database['public']['Tables']['user_ips']['Row'], 'user_id'>
    >;
    const suspicious = ipRecordsTyped.some(
      record => record.user_id !== sessionTyped.user_id,
    );

    return NextResponse.json({suspicious: suspicious || false});
  } catch (error) {
    console.error('Error in POST /api/monitoring/check-ip:', error);
    return NextResponse.json({error: 'Internal server error'}, {status: 500});
  }
}
