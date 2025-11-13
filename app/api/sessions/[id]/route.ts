import {NextRequest, NextResponse} from 'next/server';
import {createClient, createServiceClient} from '@/lib/supabase/server';
import {requireAuth} from '@/lib/supabase/auth';
import {Database} from '@/types/database';

export const dynamic = 'force-dynamic';

// GET /api/sessions/[id] - Get specific session
export async function GET(
  request: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  try {
    const {id} = await params;
    const user = await requireAuth();
    // Use service client to avoid RLS recursion issues
    const serviceClient = createServiceClient();

    // Get session with problem
    const {data: session, error} = await serviceClient
      .from('sessions')
      .select('*, problems(*)')
      .eq('id', id)
      .single();

    if (error || !session) {
      console.error('Error fetching session:', error);
      return NextResponse.json({error: 'Session not found'}, {status: 404});
    }

    // Check if user has access to this session
    const sessionTyped =
      session as Database['public']['Tables']['sessions']['Row'] & {
        problems?: Database['public']['Tables']['problems']['Row'];
      };
    // Allow access if: user owns session, user is admin, user is assigned interviewer, or session is public
    const hasAccess =
      sessionTyped.user_id === user.id ||
      user.is_admin ||
      (user.is_interviewer && sessionTyped.interviewer_id === user.id) ||
      sessionTyped.is_public;

    if (!hasAccess) {
      return NextResponse.json({error: 'Forbidden'}, {status: 403});
    }

    return NextResponse.json({session});
  } catch (error: any) {
    console.error('Error in GET /api/sessions/[id]:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }
    return NextResponse.json({error: 'Internal server error'}, {status: 500});
  }
}

// PUT /api/sessions/[id] - Update session (end session, mark ready, etc.)
export async function PUT(
  request: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  try {
    const {id} = await params;
    const user = await requireAuth();
    // Use service client to avoid RLS issues
    const serviceClient = createServiceClient();

    // First, get the session to check access
    const {data: existingSession, error: fetchError} = await serviceClient
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingSession) {
      return NextResponse.json({error: 'Session not found'}, {status: 404});
    }

    // Check if user has access to this session
    const sessionTyped =
      existingSession as Database['public']['Tables']['sessions']['Row'];
    // Allow access if: user owns session, user is admin, or user is assigned interviewer
    const hasAccess =
      sessionTyped.user_id === user.id ||
      user.is_admin ||
      (user.is_interviewer && sessionTyped.interviewer_id === user.id);

    if (!hasAccess) {
      return NextResponse.json({error: 'Forbidden'}, {status: 403});
    }

    const body = await request.json();
    const {session_status, end_time, interviewer_ready, interviewee_started} =
      body;

    const updateData: Database['public']['Tables']['sessions']['Update'] = {};
    if (session_status !== undefined)
      updateData.session_status = session_status;
    if (end_time !== undefined) updateData.end_time = end_time;
    if (interviewer_ready !== undefined)
      updateData.interviewer_ready = interviewer_ready;
    if (interviewee_started !== undefined)
      updateData.interviewee_started = interviewee_started;

    // If interviewer is marking ready, automatically start the interview for the interviewee
    // This means: set interviewee_started = true, set session status to active, and reset start_time
    if (interviewer_ready === true && sessionTyped.interviewer_id === user.id) {
      updateData.session_status = 'active';
      updateData.interviewee_started = true; // Automatically start interview for interviewee
      updateData.start_time = new Date().toISOString(); // Reset start time when interview actually starts
    }

    // TypeScript inference issue with Supabase update - using type assertion as workaround
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const {data: session, error} = await (serviceClient.from('sessions') as any)
      .update(updateData)
      .eq('id', id)
      .select('*, problems(*)')
      .single();

    if (error || !session) {
      console.error('Error updating session:', error);
      return NextResponse.json(
        {error: 'Failed to update session'},
        {status: 500},
      );
    }

    return NextResponse.json({session});
  } catch (error: any) {
    console.error('Error in PUT /api/sessions/[id]:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }
    return NextResponse.json({error: 'Internal server error'}, {status: 500});
  }
}
