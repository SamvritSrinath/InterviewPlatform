import {NextRequest, NextResponse} from 'next/server';

export const dynamic = 'force-dynamic';

// POST /api/analytics/log-scraper - Log scraper access (called by middleware)
// Note: Scraper logs are not used, so this endpoint is a no-op
export async function POST(request: NextRequest) {
  try {
    // Scraper logging is disabled - just return success
    return NextResponse.json({success: true});
  } catch (error) {
    console.error('Error in POST /api/analytics/log-scraper:', error);
    return NextResponse.json({error: 'Internal server error'}, {status: 500});
  }
}
