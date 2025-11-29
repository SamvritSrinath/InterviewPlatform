import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireInterviewer } from '@/lib/supabase/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await requireInterviewer()
    const serviceClient = createServiceClient()
    
    // Remove ambiguous users(*) - fetch user details separately
    let query = serviceClient
      .from('sessions')
      .select('*, problems(*)')
    
    // If user is not admin, only show sessions assigned to them
    if (!user.is_admin) {
      query = query.eq('interviewer_id', user.id)
    }
    
    const { data: sessions, error } = await query.order('created_at', { ascending: false }).limit(100)

    if (error) {
      console.error('Error fetching sessions:', error)
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }

    // Fetch interviewee and interviewer details separately to avoid ambiguous relationship
    if (sessions && sessions.length > 0) {
      // Get unique user IDs (interviewees)
      const intervieweeIds = [...new Set(sessions.map((s: any) => s.user_id).filter(Boolean))]
      // Get unique interviewer IDs
      const interviewerIds = [...new Set(sessions.map((s: any) => s.interviewer_id).filter(Boolean))]
      
      // Fetch interviewee details
      let intervieweeMap = new Map()
      if (intervieweeIds.length > 0) {
        const { data: interviewees } = await serviceClient
          .from('users')
          .select('id, email, full_name, is_interviewer, is_admin')
          .in('id', intervieweeIds)
        
        intervieweeMap = new Map(interviewees?.map((i: any) => [i.id, i]) || [])
      }
      
      // Fetch interviewer details
      let interviewerMap = new Map()
      if (interviewerIds.length > 0) {
        const { data: interviewers } = await serviceClient
          .from('users')
          .select('id, email, full_name, is_interviewer, is_admin')
          .in('id', interviewerIds)
        
        interviewerMap = new Map(interviewers?.map((i: any) => [i.id, i]) || [])
      }
      
      // Attach user details to sessions
      sessions.forEach((session: any) => {
        if (session.user_id && intervieweeMap.has(session.user_id)) {
          session.interviewee = intervieweeMap.get(session.user_id)
        }
        if (session.interviewer_id && interviewerMap.has(session.interviewer_id)) {
          session.interviewer = interviewerMap.get(session.interviewer_id)
        }
      })
    }

    const data = sessions

    return NextResponse.json({ sessions: data || [] })
  } catch (error: any) {
    console.error('Error in GET /api/dashboard/sessions:', error)
    if (error.message === 'Forbidden: Interviewer access required' || error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

