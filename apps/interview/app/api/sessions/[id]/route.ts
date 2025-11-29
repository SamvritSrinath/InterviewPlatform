import {NextRequest, NextResponse} from 'next/server';
import {createClient, createServiceClient} from '@/lib/supabase/server';
import {requireAuth} from '@/lib/supabase/auth';
import {Database} from '@interview-platform/supabase-client';

export const dynamic = 'force-dynamic';

// GET /api/sessions/[id] - Get specific session
export async function GET(
  request: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  try {
    const {id} = await params;
    
    let user = null;
    try {
        user = await requireAuth();
    } catch (e) {
        // Anonymous access allowed
    }

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
      
    // Allow access if:
    // 1. User owns session
    // 2. User is admin
    // 3. User is assigned interviewer
    // 4. Session is public
    // 5. User is anonymous (we allow reading basic session info if they have the ID, to support anonymous joining)
    let hasAccess = true; // Default true for now if they know the UUID

    if (user) {
        hasAccess =
          sessionTyped.user_id === user.id ||
          user.is_admin ||
          (user.is_interviewer && sessionTyped.interviewer_id === user.id) ||
          sessionTyped.is_public;
    } else {
        // Anonymous user accessing via ID - allow read (mainly for joining)
        hasAccess = true; 
    }

    if (!hasAccess) {
      return NextResponse.json({error: 'Forbidden'}, {status: 403});
    }

    return NextResponse.json({session});
  } catch (error: any) {
    console.error('Error in GET /api/sessions/[id]:', error);
    // Don't return 401 for anonymous GET, allow it to fail gracefully
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

    const sessionTyped = existingSession as Database['public']['Tables']['sessions']['Row'];
    const body = await request.json();
    
    let user;
    try {
      user = await requireAuth();
    } catch (error) {
      // If auth fails, check if this is an anonymous candidate joining (setting name)
      if (body.candidate_name && Object.keys(body).length === 1) {
         // Allow anonymous update of candidate_name
      } else {
         throw error; // Re-throw if it's any other update
      }
    }

    if (user) {
      // Check if user has access to this session
      const hasAccess =
        sessionTyped.user_id === user.id ||
        user.is_admin ||
        (user.is_interviewer && sessionTyped.interviewer_id === user.id);

      if (!hasAccess) {
        return NextResponse.json({error: 'Forbidden'}, {status: 403});
      }
    }
    
    const {
      session_status,
      end_time,
      interviewer_ready,
      interviewee_started,
      candidate_name,
      approved,
    } = body;

    const updateData: Database['public']['Tables']['sessions']['Update'] & {candidate_name?: string, client_ip?: string} = {};
    if (session_status !== undefined)
      updateData.session_status = session_status;
    if (end_time !== undefined) updateData.end_time = end_time;
    if (interviewer_ready !== undefined)
      updateData.interviewer_ready = interviewer_ready;
    if (interviewee_started !== undefined)
      updateData.interviewee_started = interviewee_started;
    if (approved !== undefined) updateData.approved = approved;
    if (candidate_name !== undefined) {
      updateData.candidate_name = candidate_name;
      
      // Capture IP if updating name (joining)
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
      updateData.client_ip = ip;
    }

    // If interviewer is marking ready, automatically start the interview for the interviewee
    if (interviewer_ready === true && user && sessionTyped.interviewer_id === user.id) {
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
