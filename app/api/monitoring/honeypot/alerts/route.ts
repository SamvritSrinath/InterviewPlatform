import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/supabase/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    const serviceClient = createServiceClient();

    const { data: alerts, error } = await serviceClient
      .from('honeypot_access_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching honeypot alerts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch honeypot alerts' },
        { status: 500 }
      );
    }

    return NextResponse.json({ alerts: alerts || [] });
  } catch (error) {
    console.error('Error in GET /api/monitoring/honeypot/alerts:', error);
    if (
      error instanceof Error &&
      (error.message === 'Forbidden: Admin access required' ||
        error.message === 'Unauthorized')
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}