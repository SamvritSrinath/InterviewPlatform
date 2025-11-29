import {NextRequest, NextResponse} from 'next/server';
import {createServiceClient} from '@/lib/supabase/server';
import {Database} from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

// POST /api/cheating/detect - Log cheating detection event from client
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      type,
      details,
      problemId,
      sessionId,
      platform,
      screenResolution,
      timezone,
    } = body;

    if (!sessionId || !type) {
      return NextResponse.json(
        {error: 'Session ID and event type are required'},
        {status: 400},
      );
    }

    const serviceClient = createServiceClient();

    // Get session details
    const {data: sessionData} = await serviceClient
      .from('sessions')
      .select('user_id, problem_id, interviewer_id, end_time')
      .eq('id', sessionId)
      .single();

    if (!sessionData) {
      return NextResponse.json({error: 'Session not found'}, {status: 404});
    }

    // Type the session data properly
    const session = sessionData as {
      user_id: string;
      problem_id: string;
      interviewer_id: string | null;
      end_time: string | null;
    };

    // Reject events if interview has ended
    if (session.end_time) {
      return NextResponse.json(
        {success: true, skipped: true, reason: 'Interview has ended'},
        {status: 200},
      );
    }

    // Map event types to attempt types
    const attemptTypeMap: Record<string, string> = {
      tab_switch: 'tab-switch',
      console_access: 'console-access',
      clipboard: 'clipboard-access',
      llm_api: 'llm-api-request',
      copy_paste: 'copy-paste',
      typing_pattern: 'suspicious-typing-pattern',
    };

    const attemptType = attemptTypeMap[type] || type;

    // FILTER: Only skip truly benign events
    // Tab switches and copy-paste are logged during interviews (important for monitoring)
    // But we still filter console access and clipboard access (too common)
    const skipEventTypes = [
      'console-access', // Console.log calls are common in development, skip entirely
      'clipboard-access', // Normal clipboard use is common, skip entirely (unless suspicious)
    ];

    // Skip benign event types that are never suspicious
    if (skipEventTypes.includes(attemptType)) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'Benign event, not logged',
      });
    }

    // For copy-paste, only log if marked as suspicious (multiple rapid pastes)
    // Tab switches are ALWAYS logged during interviews (important for interviewers)
    if (attemptType === 'copy-paste') {
      // Check if the event is marked as suspicious
      if (!details?.suspicious && !details?.pasteCount) {
        // Not marked as suspicious, skip it
        return NextResponse.json({
          success: true,
          skipped: true,
          reason: 'Benign event, not logged',
        });
      }
    }

    // Tab switches are always logged during interviews (store in DB)
    // But send real-time alerts only for suspicious patterns

    // IP monitoring removed - token-based honeypot system is now used
    const ipSuspicious = false;

    // For AI requests, check if session is active and match temporally
    let aiRequestDuringActiveSession = false;
    let sessionActive = false;
    if (attemptType === 'llm-api-request') {
      try {
        // Get session details to check if it's active
        const {data: sessionDetails} = await serviceClient
          .from('sessions')
          .select('start_time, end_time, time_limit, session_status')
          .eq('id', sessionId)
          .single();

        if (sessionDetails) {
          const session = sessionDetails as Pick<
            Database['public']['Tables']['sessions']['Row'],
            | 'start_time'
            | 'end_time'
            | 'time_limit'
            | 'session_status'
          >;
          sessionActive = session.session_status === 'active';
          const now = new Date();
          const sessionStart = new Date(session.start_time);
          const sessionEnd = session.end_time
            ? new Date(session.end_time)
            : new Date(
                sessionStart.getTime() + (session.time_limit || 1800) * 1000,
              );

          // Check if AI request occurred during active session time window
          // IP matching removed - token-based honeypot system handles attribution
          aiRequestDuringActiveSession =
            sessionActive &&
            now >= sessionStart &&
            now <= sessionEnd;
        }
      } catch (err) {
        console.error('Error checking session status for AI request:', err);
      }
    }

    // Create cheating attempt
    const insertData: Database['public']['Tables']['cheating_attempts']['Insert'] =
      {
        user_id: session.user_id,
        session_id: sessionId,
        problem_id: problemId || session.problem_id || null,
        attempt_type: attemptType,
        details: {
          ...details,
          platform,
          screenResolution,
          timezone,
          aiRequestDuringActiveSession:
            attemptType === 'llm-api-request'
              ? aiRequestDuringActiveSession
              : undefined,
          sessionActive:
            attemptType === 'llm-api-request' ? sessionActive : undefined,
        },
        exposed_info: {
          platform,
          screenResolution,
          timezone,
          userAgent: request.headers.get('user-agent'),
          aiRequestTimestamp: new Date().toISOString(),
        },
        detected_at: new Date().toISOString(),
      };

    // TypeScript inference issue with Supabase insert - using type assertion as workaround
    const {data: cheatingAttempt, error} = await (
      serviceClient.from('cheating_attempts') as any
    )
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Error creating cheating attempt:', error);
      return NextResponse.json(
        {error: 'Failed to log cheating attempt'},
        {status: 500},
      );
    }

    return NextResponse.json({success: true, cheatingAttempt});
  } catch (error) {
    console.error('Error in POST /api/cheating/detect:', error);
    return NextResponse.json({error: 'Internal server error'}, {status: 500});
  }
}
