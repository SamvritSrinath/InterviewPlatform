import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { Database } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

type Session = Database['public']['Tables']['sessions']['Row'];

/**
 * GET /api/public/interviews
 * Public endpoint to fetch active interviews (no auth required)
 * Used by the persistent SEO site to list interviews
 * 
 * Query params:
 * - token: Filter by honeypot token
 * - search: Search by interview ID or token
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');
    const search = searchParams.get('search');

    const serviceClient = createServiceClient();

    // Build query for active interviews (end_time IS NULL)
    let query = serviceClient
      .from('sessions')
      .select(`
        id,
        honeypot_token,
        problem_id,
        interviewer_id,
        client_ip,
        created_at,
        start_time,
        time_limit,
        session_status,
        interviewer_ready,
        interviewee_started,
        approved,
        candidate_name
      `)
      .is('end_time', null) // Only active interviews
      .order('created_at', { ascending: false });

    // Filter by token if provided
    if (token) {
      query = query.eq('honeypot_token', token);
    }

    // Search by interview ID or token if provided
    if (search) {
      query = query.or(
        `id.ilike.%${search}%,honeypot_token.ilike.%${search}%`,
      );
    }

    const { data: sessions, error } = await query;

    if (error) {
      console.error('Error fetching public interviews:', error);
      return NextResponse.json(
        { error: 'Failed to fetch interviews' },
        { status: 500 },
      );
    }

    // Return sanitized data (no sensitive information)
    const sanitizedSessions = ((sessions || []) as Session[]).map(session => ({
      id: session.id,
      honeypot_token: session.honeypot_token,
      problem_id: session.problem_id,
      interviewer_id: session.interviewer_id,
      client_ip: session.client_ip,
      created_at: session.created_at,
      start_time: session.start_time,
      time_limit: session.time_limit,
      session_status: session.session_status,
      interviewer_ready: session.interviewer_ready,
      interviewee_started: session.interviewee_started,
      approved: session.approved,
      // Don't expose candidate_name for privacy
    }));

    return NextResponse.json({
      interviews: sanitizedSessions,
      count: sanitizedSessions.length,
    });
  } catch (error: any) {
    console.error('Error in GET /api/public/interviews:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

