import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requireAuth, requireInterviewee } from '@/lib/supabase/auth'
import { Database } from '@interview-platform/supabase-client'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

// GET /api/sessions - Get user's sessions or specific session by ID
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('id')

    if (sessionId) {
      // Use service client to avoid RLS recursion issues
      const serviceClient = createServiceClient()

      // Get specific session with problem (allow public sessions)
      const { data: session, error } = await serviceClient
        .from('sessions')
        .select('*, problems(*)')
        .eq('id', sessionId)
        .maybeSingle() // Use maybeSingle() to handle 0 rows case

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching session:', error)
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        )
      }

      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        )
      }

      // Check if session is public (no auth required)
      const sessionTyped = session as Database['public']['Tables']['sessions']['Row'] & { problems?: Database['public']['Tables']['problems']['Row'] }
      if (sessionTyped.is_public) {
        // Public session - allow access without auth
        return NextResponse.json({ sessions: [session] })
      }

      // Private session - require auth
      try {
        const user = await requireInterviewee()
        // Check if user has access
        // Allow access if: user owns session, user is interviewer/admin
        if (sessionTyped.user_id !== user.id && !user.is_interviewer && !user.is_admin) {
          return NextResponse.json(
            { error: 'Forbidden' },
            { status: 403 }
          )
        }

        return NextResponse.json({ sessions: [session] })
      } catch (authError: any) {
        // Auth error - return 401
        if (authError.message === 'Unauthorized') {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          )
        }
        throw authError
      }
    } else {
      // Get all user's sessions (requires auth)
      const user = await requireInterviewee()
      const supabase = await createClient()
      // Get all user's sessions
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching sessions:', error)
        return NextResponse.json(
          { error: 'Failed to fetch sessions' },
          { status: 500 }
        )
      }

      return NextResponse.json({ sessions: sessions || [] })
    }
  } catch (error: any) {
    console.error('Error in GET /api/sessions:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/sessions - Create new interview session
export async function POST(request: NextRequest) {
  try {
    // Allow any authenticated user to create a session (not just interviewees)
    const user = await requireAuth()
    const supabase = await createClient()
    const serviceClient = createServiceClient()
    
    const body = await request.json()
    const { problemId, timeLimit, isPublic, interviewerId } = body

    if (!problemId) {
      return NextResponse.json(
        { error: 'Problem ID is required' },
        { status: 400 }
      )
    }

    // Only interviewers/admins can assign interviewers
    // Creating public sessions is now available to everyone
    if (interviewerId && !user.is_interviewer && !user.is_admin) {
      return NextResponse.json(
        { error: 'Only interviewers can assign interviewers' },
        { status: 403 }
      )
    }

    // If assigning interviewer, verify they are an interviewer/admin
    if (interviewerId) {
      const { data: interviewerData } = await serviceClient
        .from('users')
        .select('is_interviewer, is_admin')
        .eq('id', interviewerId)
        .single()
      
      const interviewer = interviewerData as { is_interviewer: boolean; is_admin: boolean } | null
      
      if (!interviewer || (!interviewer.is_interviewer && !interviewer.is_admin)) {
        return NextResponse.json(
          { error: 'Assigned interviewer must be an interviewer or admin' },
          { status: 400 }
        )
      }
    }

    // Generate session token for public sessions
    const sessionToken = isPublic ? randomUUID() : null

    // Generate honeypot_token for ALL sessions (token-based canary system)
    const honeypotToken = randomUUID()

    // Create session
    const sessionData: Database['public']['Tables']['sessions']['Insert'] = {
      problem_id: problemId,
      user_id: user.id,
      interviewer_id: interviewerId || (user.is_interviewer || user.is_admin ? user.id : null),
      start_time: new Date().toISOString(),
      time_limit: timeLimit || 1800, // Default 30 minutes
      session_status: 'pending', // Start as pending until interviewer is ready
      session_token: sessionToken,
      honeypot_token: honeypotToken,
      is_public: isPublic || true, // Default to true if not specified
      interviewer_ready: false, // Interviewer must explicitly start
      interviewee_started: false, // Interviewee starts after interviewer is ready
    }
    
    // TypeScript inference issue with Supabase insert - using type assertion as workaround
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session, error: sessionError } = await (serviceClient.from('sessions') as any)
      .insert([sessionData])
      .select()
      .single()

    if (sessionError || !session) {
      console.error('Error creating session:', sessionError)
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      session,
      shareableLink: isPublic && sessionToken ? `/interview/${sessionToken}` : null,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/sessions:', error)
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

