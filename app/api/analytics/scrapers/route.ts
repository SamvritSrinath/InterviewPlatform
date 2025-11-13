import {NextRequest, NextResponse} from 'next/server';
import {createServiceClient} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/analytics/scrapers - Get scraper logs (public analytics endpoint)
export async function GET(request: NextRequest) {
  try {
    const serviceClient = createServiceClient();

    const {data: logs, error} = await serviceClient
      .from('scraper_logs')
      .select('*')
      .order('detected_at', {ascending: false})
      .limit(100);

    if (error) {
      console.error('Error fetching scraper logs:', error);
      return NextResponse.json(
        {error: 'Failed to fetch scraper logs'},
        {status: 500},
      );
    }

    return NextResponse.json({logs: logs || []});
  } catch (error: any) {
    console.error('Error in GET /api/analytics/scrapers:', error);
    return NextResponse.json({error: 'Internal server error'}, {status: 500});
  }
}
