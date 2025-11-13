import {NextRequest, NextResponse} from 'next/server';
import {createServiceClient} from '@/lib/supabase/server';
import {Database} from '@/types/database';

export const dynamic = 'force-dynamic';

// POST /api/analytics/log-scraper - Log scraper access (called by middleware)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {ip_address, user_agent, request_path, pattern_type} = body;

    if (!ip_address) {
      return NextResponse.json(
        {error: 'IP address is required'},
        {status: 400},
      );
    }

    const serviceClient = createServiceClient();

    const insertData: Database['public']['Tables']['scraper_logs']['Insert'] = {
      ip_address,
      user_agent: user_agent || null,
      request_path: request_path || null,
      pattern_type: pattern_type || null,
      detected_at: new Date().toISOString(),
    };

    // TypeScript inference issue with Supabase insert - using type assertion as workaround
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const {error} = await (serviceClient.from('scraper_logs') as any).insert([
      insertData,
    ]);

    if (error) {
      console.error('Error logging scraper access:', error);
      return NextResponse.json(
        {error: 'Failed to log scraper access'},
        {status: 500},
      );
    }

    return NextResponse.json({success: true});
  } catch (error) {
    console.error('Error in POST /api/analytics/log-scraper:', error);
    return NextResponse.json({error: 'Internal server error'}, {status: 500});
  }
}
