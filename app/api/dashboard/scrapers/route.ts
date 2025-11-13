import {NextRequest, NextResponse} from 'next/server';
import {createServiceClient} from '@/lib/supabase/server';
import {requireInterviewer} from '@/lib/supabase/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireInterviewer();
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
  } catch (error: unknown) {
    console.error('Error in GET /api/dashboard/scrapers:', error);
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
