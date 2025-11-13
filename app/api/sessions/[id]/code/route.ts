import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/supabase/auth'
import { Database } from '@/types/database'

export const dynamic = 'force-dynamic'

// PUT /api/sessions/[id]/code - Save code for a session
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const serviceClient = createServiceClient()

    // Get session to check access and get problem_id
    const { data: session, error: sessionError } = await serviceClient
      .from('sessions')
      .select('user_id, problem_id, interviewer_id, is_public')
      .eq('id', id)
      .maybeSingle()

    if (sessionError && sessionError.code !== 'PGRST116') {
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

    const sessionTyped = session as { user_id: string; problem_id: string; interviewer_id: string | null; is_public: boolean }

    // Check if session is public (allow saving without auth for public sessions)
    if (sessionTyped.is_public) {
      // For public sessions, allow saving code without authentication
      // We'll use the session's user_id as the owner
      const body = await request.json()
      const { code } = body

      if (typeof code !== 'string') {
        return NextResponse.json(
          { error: 'Code must be a string' },
          { status: 400 }
        )
      }

      // Upsert solution for public session (use session's user_id)
      const { data: existingSolution } = await serviceClient
        .from('solutions')
        .select('id')
        .eq('session_id', id)
        .eq('user_id', sessionTyped.user_id)
        .maybeSingle()

      if (existingSolution) {
        const existingSolutionTyped = existingSolution as { id: string }
        // Update existing solution
        // TypeScript inference issue with Supabase update - using type assertion as workaround
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: solution, error } = await (serviceClient.from('solutions') as any)
          .update({
            code,
            submission_time: new Date().toISOString(),
          })
          .eq('id', existingSolutionTyped.id)
          .select()
          .single()

        if (error) {
          console.error('Error updating solution:', error)
          return NextResponse.json(
            { error: 'Failed to save code' },
            { status: 500 }
          )
        }

        return NextResponse.json({ success: true, solution })
      } else {
        // Create new solution
        const solutionData: Database['public']['Tables']['solutions']['Insert'] = {
          session_id: id,
          user_id: sessionTyped.user_id,
          problem_id: sessionTyped.problem_id,
          code,
          language: 'python',
          submission_time: new Date().toISOString(),
        }

        // TypeScript inference issue with Supabase insert - using type assertion as workaround
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: solution, error } = await (serviceClient.from('solutions') as any)
          .insert([solutionData])
          .select()
          .single()

        if (error) {
          console.error('Error creating solution:', error)
          return NextResponse.json(
            { error: 'Failed to save code' },
            { status: 500 }
          )
        }

        return NextResponse.json({ success: true, solution })
      }
    }

    // Private session - require auth
    try {
      const user = await requireAuth()

      // Check if user has access (must be the interviewee)
      if (sessionTyped.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Only the interviewee can save code' },
          { status: 403 }
        )
      }

      const body = await request.json()
      const { code } = body

      if (typeof code !== 'string') {
        return NextResponse.json(
          { error: 'Code must be a string' },
          { status: 400 }
        )
      }

      // Upsert solution (update if exists, create if not)
      const { data: existingSolution } = await serviceClient
        .from('solutions')
        .select('id')
        .eq('session_id', id)
        .eq('user_id', user.id)
        .maybeSingle() // Use maybeSingle() to handle 0 rows case

      if (existingSolution) {
        const existingSolutionTyped2 = existingSolution as { id: string }
        // Update existing solution
        // TypeScript inference issue with Supabase update - using type assertion as workaround
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: solution, error } = await (serviceClient.from('solutions') as any)
          .update({
            code,
            submission_time: new Date().toISOString(),
          })
          .eq('id', existingSolutionTyped2.id)
          .select()
          .single()

        if (error) {
          console.error('Error updating solution:', error)
          return NextResponse.json(
            { error: 'Failed to save code' },
            { status: 500 }
          )
        }

        return NextResponse.json({ success: true, solution })
      } else {
        // Create new solution
        const solutionData: Database['public']['Tables']['solutions']['Insert'] = {
          session_id: id,
          user_id: user.id,
          problem_id: sessionTyped.problem_id,
          code,
          language: 'python',
          submission_time: new Date().toISOString(),
        }

        // TypeScript inference issue with Supabase insert - using type assertion as workaround
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: solution, error } = await (serviceClient.from('solutions') as any)
          .insert([solutionData])
          .select()
          .single()

        if (error) {
          console.error('Error creating solution:', error)
          return NextResponse.json(
            { error: 'Failed to save code' },
            { status: 500 }
          )
        }

        return NextResponse.json({ success: true, solution })
      }
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
  } catch (error: any) {
    console.error('Error in PUT /api/sessions/[id]/code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/sessions/[id]/code - Get code for a session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const serviceClient = createServiceClient()

    // Get session to check access (allow public sessions)
    const { data: session, error: sessionError } = await serviceClient
      .from('sessions')
      .select('user_id, interviewer_id, is_public')
      .eq('id', id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    const sessionTyped = session as { user_id: string; interviewer_id: string | null; is_public: boolean }

    // Check if session is public (no auth required)
    if (sessionTyped.is_public) {
      // Public session - allow access without auth
      const { data: solution, error } = await serviceClient
        .from('solutions')
        .select('code, language')
        .eq('session_id', id)
        .eq('user_id', sessionTyped.user_id) // Get interviewee's code
        .order('submission_time', { ascending: false })
        .limit(1)
        .maybeSingle() // Use maybeSingle() to handle 0 rows case

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching solution:', error)
        return NextResponse.json(
          { error: 'Failed to fetch code' },
          { status: 500 }
        )
      }

      const solutionTyped = solution as { code: string; language: string } | null
      return NextResponse.json({ 
        code: solutionTyped?.code || '',
        language: solutionTyped?.language || 'python',
      })
    }

    // Private session - require auth
    try {
      const { requireAuth } = await import('@/lib/supabase/auth')
      const user = await requireAuth()

      // Check if user has access (interviewee or interviewer/admin)
      const hasAccess = 
        sessionTyped.user_id === user.id ||
        user.is_admin ||
        (user.is_interviewer && sessionTyped.interviewer_id === user.id)

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      // Get solution for this session
      const { data: solution, error } = await serviceClient
        .from('solutions')
        .select('code, language')
        .eq('session_id', id)
        .eq('user_id', sessionTyped.user_id) // Get interviewee's code
        .order('submission_time', { ascending: false })
        .limit(1)
        .maybeSingle() // Use maybeSingle() to handle 0 rows case

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching solution:', error)
        return NextResponse.json(
          { error: 'Failed to fetch code' },
          { status: 500 }
        )
      }

      const solutionTyped2 = solution as { code: string; language: string } | null
      return NextResponse.json({ 
        code: solutionTyped2?.code || '',
        language: solutionTyped2?.language || 'python',
      })
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
  } catch (error: any) {
    console.error('Error in GET /api/sessions/[id]/code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

