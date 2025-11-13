import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireInterviewer } from '@/lib/supabase/auth'

export const dynamic = 'force-dynamic'

// GET /api/dashboard/ai-analytics - Get AI analytics for interviewers
export async function GET(request: NextRequest) {
  try {
    const user = await requireInterviewer()
    const serviceClient = createServiceClient()
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const activeOnly = searchParams.get('activeOnly') === 'true'
    
    // Get AI requests (llm-api-request type)
    let query = serviceClient
      .from('cheating_attempts')
      .select('*, sessions!inner(interviewer_id, session_status, start_time, end_time, time_limit, client_ip, *), problems(*), users(*)')
      .eq('attempt_type', 'llm-api-request')
    
    // If user is not admin, only show AI requests from sessions assigned to them
    if (!user.is_admin) {
      query = query.eq('sessions.interviewer_id', user.id)
    }

    // Filter by session if provided
    if (sessionId) {
      query = query.eq('session_id', sessionId)
    }

    // Filter by active sessions only if requested
    if (activeOnly) {
      query = query.eq('sessions.session_status', 'active')
    }
    
    const { data: aiRequests, error } = await query
      .order('detected_at', { ascending: false })
      .limit(200)

    if (error) {
      console.error('Error fetching AI analytics:', error)
      return NextResponse.json({ error: 'Failed to fetch AI analytics' }, { status: 500 })
    }

    // Enhance data with temporal matching information
    const enhancedData = (aiRequests || []).map((request: any) => {
      const session = request.sessions || {}
      const detectedAt = new Date(request.detected_at)
      const sessionStart = session.start_time ? new Date(session.start_time) : detectedAt
      const sessionEnd = session.end_time 
        ? new Date(session.end_time)
        : session.time_limit
          ? new Date(sessionStart.getTime() + session.time_limit * 1000)
          : new Date(sessionStart.getTime() + 1800 * 1000)
      
      // Check if AI request occurred during active session
      const isDuringActiveSession = session.session_status === 'active' &&
        detectedAt >= sessionStart &&
        detectedAt <= sessionEnd

      // Check if IP matches session IP
      const ipMatches = request.client_ip && session.client_ip && 
        request.client_ip === session.client_ip

      // Extract AI request details
      const aiDetails = request.details || {}
      const aiRequestDuringActiveSession = aiDetails.aiRequestDuringActiveSession || false
      const sessionActive = aiDetails.sessionActive || false

      return {
        ...request,
        temporalMatch: {
          isDuringActiveSession,
          ipMatches,
          sessionStart: session.start_time || null,
          sessionEnd: session.end_time || null,
          sessionStatus: session.session_status || 'unknown',
          detectedAt: request.detected_at,
          timeSinceSessionStart: detectedAt.getTime() - sessionStart.getTime(),
          timeUntilSessionEnd: sessionEnd.getTime() - detectedAt.getTime(),
          aiRequestDuringActiveSession,
          sessionActive,
        },
        ipAddress: request.client_ip || 'unknown',
        sessionIpAddress: session.client_ip || 'unknown',
      }
    })

    // Get summary statistics
    const stats = {
      total: enhancedData.length,
      duringActiveSessions: enhancedData.filter((r: any) => r.temporalMatch.isDuringActiveSession).length,
      ipMatches: enhancedData.filter((r: any) => r.temporalMatch.ipMatches).length,
      withActiveSessions: enhancedData.filter((r: any) => r.temporalMatch.sessionActive).length,
      bySession: {} as Record<string, number>,
    }

    // Count by session
    enhancedData.forEach((request: any) => {
      const sessionId = request.session_id
      if (!stats.bySession[sessionId]) {
        stats.bySession[sessionId] = 0
      }
      stats.bySession[sessionId]++
    })

    return NextResponse.json({ 
      aiRequests: enhancedData,
      stats,
    })
  } catch (error: any) {
    console.error('Error in GET /api/dashboard/ai-analytics:', error)
    if (error.message === 'Forbidden: Interviewer access required' || error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

