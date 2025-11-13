import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/sessions/public/[token] - Get public session by token (no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const serviceClient = createServiceClient()

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Get session by token (only public sessions)
    // Note: session_token might be the token OR the session ID (for backwards compatibility)
    const { data: sessionData, error } = await serviceClient
      .from('sessions')
      .select('*, problems(*)')
      .or(`session_token.eq.${token},id.eq.${token}`)
      .eq('is_public', true)
      .maybeSingle() // Use maybeSingle() to handle 0 rows case

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching public session:', error)
      return NextResponse.json(
        { error: 'Failed to fetch session' },
        { status: 500 }
      )
    }

    if (!sessionData) {
      return NextResponse.json(
        { error: 'Session not found or not publicly accessible' },
        { status: 404 }
      )
    }

    const session = sessionData as any

    // Get client IP for monitoring
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown'

    // Log IP access for this session (for monitoring)
    try {
      // TypeScript inference issue with Supabase insert - using type assertion as workaround
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (serviceClient.from('user_ips') as any).insert([
        {
          user_id: session.user_id,
          ip_address: ipAddress,
          session_id: session.id,
          detected_at: new Date().toISOString(),
        },
      ])
    } catch (err: any) {
      // Ignore duplicate errors
      console.error('Error logging IP for public session:', err)
    }

    return NextResponse.json({ session })
  } catch (error: any) {
    console.error('Error in GET /api/sessions/public/[token]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

