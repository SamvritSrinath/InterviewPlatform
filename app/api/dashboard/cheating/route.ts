import {NextRequest, NextResponse} from 'next/server';
import {createServiceClient} from '@/lib/supabase/server';
import {requireInterviewer} from '@/lib/supabase/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await requireInterviewer();
    const serviceClient = createServiceClient();
    const {searchParams} = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    let query = serviceClient
      .from('cheating_attempts')
      .select('*, sessions!inner(interviewer_id, client_ip), problems(*), users(*)');

    // If user is not admin, only show cheating attempts from sessions assigned to them
    if (!user.is_admin) {
      query = query.eq('sessions.interviewer_id', user.id);
    }

    // Filter by session if provided
    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    // Filter out tab-switch events - only return copy-paste and honeypot-access
    query = query.neq('attempt_type', 'tab-switch');

    const {data, error} = await query
      .order('detected_at', {ascending: false})
      .limit(100);

    if (error) {
      console.error('Error fetching cheating attempts:', error);
      return NextResponse.json(
        {error: 'Failed to fetch cheating attempts'},
        {status: 500},
      );
    }

    return NextResponse.json({attempts: data || []});
  } catch (error: unknown) {
    console.error('Error in GET /api/dashboard/cheating:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    if (
      errorMessage === 'Forbidden: Interviewer access required' ||
      errorMessage === 'Unauthorized'
    ) {
      return NextResponse.json({error: errorMessage}, {status: 403});
    }
    return NextResponse.json({error: 'Internal server error'}, {status: 500});
  }
}
