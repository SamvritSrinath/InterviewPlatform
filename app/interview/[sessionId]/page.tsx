'use client';

import {useState, useEffect, useRef, useCallback} from 'react';
import {useParams, useRouter} from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {Problem, Session} from '@/types/database';
import {useCheatingDetection} from '@/lib/cheating-detection/client-monitor';
import {useAuth} from '@/lib/supabase/auth-context';
import {InterviewDashboard} from '@/components/interview-dashboard';
import {createClient} from '@/lib/supabase/client';
import {CheckCircle} from '@mui/icons-material';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
});

export default function InterviewSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const {user} = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const codeSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const codeBroadcastRef = useRef<((code: string) => void) | null>(null);
  const finishedRef = useRef<boolean>(false);
  const problemRef = useRef<Problem | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSessionUpdateRef = useRef<string | null>(null);
  const supabase = createClient();

  // Keep problem ref in sync with problem state
  useEffect(() => {
    problemRef.current = problem;
  }, [problem]);

  // Check if current user is interviewer/admin for this session
  const isInterviewer =
    user &&
    session &&
    (user.is_admin ||
      (user.is_interviewer && session.interviewer_id === user.id) ||
      (user.is_interviewer && session.user_id !== user.id));

  // Check if interviewee can see the problem
  // Problem is visible when interviewer is ready (no need to wait for interviewee_started)
  // But not if the interview has ended (end_time is set)
  const canSeeProblem = isInterviewer
    ? true // Interviewers can always see
    : session?.interviewer_ready && !session?.end_time; // Interviewees can see if ready and not finished

  // Initialize cheating detection (only when session is loaded and started)
  // Enable when interviewer is ready (interview auto-starts when interviewer marks ready)
  // Disable when interview is finished (end_time is set)
  const {handleTyping, logEvent} = useCheatingDetection({
    sessionId: session?.id || null,
    problemId: problem?.id || null,
    enabled:
      !!session &&
      !!problem &&
      !session?.end_time &&
      (isInterviewer || session?.interviewer_ready),
  });

  useEffect(() => {
    if (sessionId) {
      fetchSession();
      finishedRef.current = false; // Reset finished ref when session changes
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (codeSaveTimeoutRef.current) {
        clearTimeout(codeSaveTimeoutRef.current);
      }
    };
  }, [sessionId]);

  // Handle session updates (used by both real-time and polling)
  const handleSessionUpdate = useCallback(
    (updatedSession: Session, prevSession: Session | null) => {
      // Handle interview finished state
      if (updatedSession.end_time && !finishedRef.current) {
        finishedRef.current = true;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setTimeLeft(0);
      }

      // Handle interviewer ready - ensure problem becomes visible for interviewee
      if (
        updatedSession.interviewer_ready &&
        prevSession &&
        !prevSession.interviewer_ready
      ) {
        console.log(
          '✅ Interviewer marked ready - problem should now be visible',
        );
        // Always fetch problem when interviewer becomes ready (even if we think we have it)
        if (updatedSession.problem_id) {
          fetch(`/api/problems/${updatedSession.problem_id}`)
            .then(res => res.json())
            .then(data => {
              if (data.problem) {
                setProblem(data.problem);
                // Only initialize with default_code for interviewees
                const currentIsInterviewer =
                  user &&
                  (user.is_admin ||
                    (user.is_interviewer &&
                      updatedSession.interviewer_id === user.id) ||
                    (user.is_interviewer &&
                      updatedSession.user_id !== user.id));
                if (!currentIsInterviewer) {
                  setCode(data.problem.default_code || '');
                }
              }
            })
            .catch(err => console.error('Error fetching problem:', err));
        }
      }
    },
    [user],
  );

  // Polling fallback function to check for session updates
  const pollSessionUpdates = useCallback(async () => {
    if (!session?.id) return;

    try {
      const response = await fetch(`/api/sessions?id=${session.id}`);
      if (!response.ok) return;

      const data = await response.json();
      const sessionData = data.sessions?.[0] || data.session;
      if (!sessionData) return;

      // Check if session has been updated (compare updated_at or key fields)
      const sessionKey = `${sessionData.interviewer_ready}-${
        sessionData.interviewee_started
      }-${sessionData.end_time || 'null'}`;
      if (sessionKey !== lastSessionUpdateRef.current) {
        lastSessionUpdateRef.current = sessionKey;
        console.log('📡 Polling detected session update:', sessionData);

        setSession(prevSession => {
          if (!prevSession) return sessionData as Session;

          // Only update if something actually changed
          if (
            prevSession.interviewer_ready !== sessionData.interviewer_ready ||
            prevSession.interviewee_started !==
              sessionData.interviewee_started ||
            prevSession.end_time !== sessionData.end_time ||
            prevSession.start_time !== sessionData.start_time
          ) {
            handleSessionUpdate(sessionData as Session, prevSession);
            return sessionData as Session;
          }
          return prevSession;
        });
      }
    } catch (err) {
      console.error('Error polling session updates:', err);
    }
  }, [session?.id, handleSessionUpdate]);

  // Subscribe to session updates (for real-time interviewer_ready and interviewee_started changes)
  useEffect(() => {
    if (!session?.id) return;

    console.log('Setting up real-time subscription for session:', session.id);
    lastSessionUpdateRef.current = `${session.interviewer_ready}-${
      session.interviewee_started
    }-${session.end_time || 'null'}`;

    const sessionChannel = supabase
      .channel(`session-${session.id}`, {
        config: {
          // Use presence for better connection handling
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${session.id}`,
        },
        payload => {
          console.log('📡 Session updated via real-time:', payload.new);
          const updatedSession = payload.new as Session;

          // Use functional update to ensure we have the latest state
          setSession(prevSession => {
            if (!prevSession) return updatedSession;
            handleSessionUpdate(updatedSession, prevSession);
            return updatedSession;
          });
        },
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(
            '✅ Successfully subscribed to session updates for session:',
            session.id,
          );
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to session updates:', err);
        } else if (status === 'TIMED_OUT') {
          console.warn('⚠️ Subscription timed out, will use polling fallback');
        } else if (status === 'CLOSED') {
          console.log('🔌 Subscription closed, will use polling fallback');
        }
      });

    // Set up polling fallback (checks every 2 seconds as backup)
    pollingIntervalRef.current = setInterval(pollSessionUpdates, 2000);

    return () => {
      console.log(
        'Cleaning up real-time subscription for session:',
        session.id,
      );
      supabase.removeChannel(sessionChannel);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [session?.id, pollSessionUpdates, handleSessionUpdate]);

  // Timer sync - calculate from server time and update every second
  // Timer only runs when interviewee has started (both interviewer and interviewee see it)
  // Timer is synced between interviewer and interviewee by calculating from session start_time
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Calculate timer from session start_time and time_limit
    // This ensures timer is synced between interviewer and interviewee
    // Both calculate from the same server time, so they stay in sync
    const updateTimer = () => {
      // Stop timer if interview has ended
      if (session?.end_time) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setTimeLeft(0);
        return;
      }

      if (
        session &&
        session.time_limit &&
        session.interviewee_started &&
        session.start_time
      ) {
        try {
          const startTime = new Date(session.start_time).getTime();
          const now = Date.now();
          const elapsed = Math.floor((now - startTime) / 1000);
          const remaining = Math.max(0, session.time_limit - elapsed);
          setTimeLeft(remaining);

          // If time is up, stop the timer and finish interview
          if (remaining <= 0) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            if (!isInterviewer && !session.end_time && !finishedRef.current) {
              handleTimeUp();
            }
          }
        } catch (err) {
          console.error('Error calculating timer:', err);
          setTimeLeft(0);
        }
      } else {
        // Timer not started yet
        setTimeLeft(0);
      }
    };

    // Update timer immediately
    updateTimer();

    // Update timer every second (synced with server time)
    // This ensures timer is constantly updated and synced between interviewer and interviewee
    // Only start timer if interview hasn't ended
    if (
      session &&
      session.time_limit &&
      session.interviewee_started &&
      session.start_time &&
      !session.end_time
    ) {
      intervalRef.current = setInterval(updateTimer, 1000);
    } else if (session?.end_time) {
      // Interview has ended, ensure timer is stopped
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setTimeLeft(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [
    session?.id,
    session?.start_time,
    session?.time_limit,
    session?.interviewee_started,
    session?.end_time,
    isInterviewer,
  ]);

  // Save code to database periodically (debounced) - for persistence only
  // Real-time sync is via WebSocket broadcast, not DB
  const saveCodeToDB = async (codeToSave: string) => {
    if (
      !session ||
      !session.id ||
      isInterviewer ||
      !session.interviewer_ready ||
      session.end_time
    )
      return;

    try {
      await fetch(`/api/sessions/${session.id}/code`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({code: codeToSave}),
      });
    } catch (err) {
      console.error('Error saving code to DB:', err);
      // Don't show error to user - DB save is just for persistence
    }
  };

  // Real-time code sync via WebSocket broadcast (no DB roundtrip)
  // Use Supabase Realtime broadcast channels for instant code updates
  useEffect(() => {
    if (!session || !session.id) return;

    // Create a broadcast channel for this session
    const codeChannel = supabase.channel(`code-sync-${session.id}`, {
      config: {
        broadcast: {self: false}, // Don't receive our own broadcasts
      },
    });

    // Subscribe to code updates from other clients (real-time, no DB)
    codeChannel
      .on('broadcast', {event: 'code-update'}, payload => {
        const {code: newCode} = payload.payload as {code: string};
        if (newCode !== undefined) {
          // Interviewer receives code updates from interviewee
          // Interviewee receives their own code (can be ignored)
          if (isInterviewer) {
            // Interviewer: always update with interviewee's code
            setCode(newCode || '');
          }
          // Interviewee ignores broadcasts (they're the source) to prevent circular updates
        }
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Connected to real-time code sync channel');

          // For interviewers: fetch initial code from DB once on connect
          // Then all future updates come via broadcast (no DB roundtrip)
          if (isInterviewer) {
            try {
              const response = await fetch(`/api/sessions/${session.id}/code`);
              if (response.ok) {
                const data = await response.json();
                setCode(data.code || '');
              }
            } catch (err) {
              console.error('Error fetching initial code:', err);
            }
          }
        }
      });

    // For interviewees: set up code broadcaster (only when interviewer is ready)
    if (!isInterviewer && session.interviewer_ready) {
      // Set up code change broadcaster function
      const broadcastCode = (newCode: string) => {
        codeChannel
          .send({
            type: 'broadcast',
            event: 'code-update',
            payload: {code: newCode},
          })
          .then(() => {
            // Successfully broadcasted - real-time sync complete (no DB needed)
          })
          .catch(err => {
            console.error('Error broadcasting code:', err);
          });
      };

      // Store broadcaster in ref so we can use it in onChange handler
      codeBroadcastRef.current = broadcastCode;
    } else {
      // Clear broadcaster if conditions not met
      codeBroadcastRef.current = null;
    }

    return () => {
      supabase.removeChannel(codeChannel);
      codeBroadcastRef.current = null;
    };
  }, [session?.id, isInterviewer, session?.interviewer_ready]);

  const fetchSession = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, try to fetch as a regular session (authenticated)
      let response = await fetch(`/api/sessions?id=${sessionId}`);
      let data = await response.json();

      // If that fails, try fetching as a public token
      if (
        !response.ok &&
        (response.status === 403 || response.status === 404)
      ) {
        response = await fetch(`/api/sessions/public/${sessionId}`);
        data = await response.json();
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch session');
      }

      // Handle both response formats (sessions array or single session)
      const sessionData = data.sessions?.[0] || data.session;
      if (sessionData) {
        setSession(sessionData);
        // Set finished ref if session already has end_time
        if (sessionData.end_time) {
          finishedRef.current = true;
        }

        // Check if current user is interviewer for this session
        const isInterviewerForSession =
          user &&
          (user.is_admin ||
            (user.is_interviewer && sessionData.interviewer_id === user.id) ||
            (user.is_interviewer && sessionData.user_id !== user.id));

        // Problem might be included in the session data
        if (sessionData.problems) {
          setProblem(sessionData.problems);
          // Only initialize with default_code for interviewees, not interviewers
          // Interviewers should see the interviewee's actual code (via real-time broadcast)
          if (!isInterviewerForSession) {
            setCode(sessionData.problems.default_code || '');
          } else {
            // Interviewer: start with empty code, will be populated via real-time broadcast
            setCode('');
          }
        } else if (sessionData.problem_id) {
          // Fetch problem if not included
          const problemResponse = await fetch(
            `/api/problems/${sessionData.problem_id}`,
          );
          const problemData = await problemResponse.json();
          if (problemData.problem) {
            setProblem(problemData.problem);
            // Only initialize with default_code for interviewees, not interviewers
            if (!isInterviewerForSession) {
              setCode(problemData.problem.default_code || '');
            } else {
              // Interviewer: start with empty code, will be populated via real-time broadcast
              setCode('');
            }
          }
        }
      } else {
        throw new Error('Session not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
      console.error('Error fetching session:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeUp = async () => {
    if (!session || isInterviewer || finishedRef.current || session.end_time)
      return;

    // Automatically finish the interview when time runs out
    finishedRef.current = true;
    await finishInterview();
  };

  const finishInterview = async () => {
    if (!session || finishedRef.current || session.end_time) return;

    try {
      finishedRef.current = true;
      setUpdating(true);

      // Stop the timer immediately
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setTimeLeft(0);

      const response = await fetch(`/api/sessions/${session.id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          end_time: new Date().toISOString(),
          session_status: 'completed',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to finish interview');
      }

      const data = await response.json();
      setSession(data.session);
      if (isInterviewer) {
        setError(
          'Interview has been finished. The interviewee can no longer access this session.',
        );
      } else {
        setError(
          'Interview has been finished. You can no longer access this session.',
        );
      }
    } catch (err) {
      finishedRef.current = false; // Reset on error so user can try again
      setError(
        err instanceof Error ? err.message : 'Failed to finish interview',
      );
      console.error('Error finishing interview:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleInterviewerReady = async () => {
    if (!session) return;

    try {
      setUpdating(true);
      const response = await fetch(`/api/sessions/${session.id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          interviewer_ready: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start interview');
      }

      const data = await response.json();
      setSession(data.session);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to start interview',
      );
      console.error('Error starting interview:', err);
    } finally {
      setUpdating(false);
    }
  };

  // Removed handleIntervieweeStart - interview now auto-starts when interviewer marks ready
  // The API automatically sets interviewee_started = true when interviewer marks ready

  // Run code functionality removed - code execution is not needed for interview monitoring

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{py: 8, textAlign: 'center'}}>
        <CircularProgress />
      </Container>
    );
  }

  if (error && !session) {
    return (
      <Container maxWidth="xl" sx={{py: 8}}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!session || !problem) {
    return (
      <Container maxWidth="xl" sx={{py: 8}}>
        <Alert severity="info">Session or problem not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{py: {xs: 3, sm: 4, md: 6}}}>
      <Box
        sx={{
          mb: 4,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}>
        <Typography variant="h5" component="h1" sx={{fontWeight: 600}}>
          Interview Session
        </Typography>
        {/* Timer only shows when interviewee has started (not for interviewers until then) */}
        {session?.interviewee_started && !isInterviewer && (
          <Chip
            label={`Time Left: ${formatTime(timeLeft)}`}
            color={timeLeft < 300 ? 'error' : 'primary'}
            sx={{
              fontSize: '1rem',
              py: 1.5,
              px: 2,
              fontWeight: 600,
            }}
          />
        )}
        {/* Interviewer sees timer in dashboard once interviewee has started */}
        {isInterviewer && session?.interviewee_started && (
          <Chip
            label={`Time Left: ${formatTime(timeLeft)}`}
            color={timeLeft < 300 ? 'error' : 'info'}
            sx={{
              fontSize: '1rem',
              py: 1.5,
              px: 2,
              fontWeight: 600,
            }}
          />
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{mb: 4}} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Interviewer: Show start button if not ready */}
      {isInterviewer && !session.interviewer_ready && (
        <Alert severity="warning" sx={{mb: 4}}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
            <Typography>
              Click &quot;Start Interview&quot; when you&apos;re ready to begin.
              The problem will be visible to the interviewee once you start.
            </Typography>
            <Button
              variant="contained"
              onClick={handleInterviewerReady}
              disabled={updating}
              sx={{ml: 2}}>
              {updating ? 'Starting...' : 'Start Interview'}
            </Button>
          </Box>
        </Alert>
      )}

      {/* Interviewee: Show waiting message if interviewer not ready */}
      {!isInterviewer && !session.interviewer_ready && (
        <Alert severity="info" sx={{mb: 4}}>
          <Typography>
            Waiting for the interviewer to start the interview. The problem will
            be visible and the timer will start automatically once the
            interviewer is ready.
          </Typography>
        </Alert>
      )}

      {/* Interviewee: Show message when interviewer is ready (interview auto-starts) */}
      {!isInterviewer &&
        session.interviewer_ready &&
        !session.interviewee_started && (
          <Alert severity="success" sx={{mb: 4}}>
            <Typography>
              The interviewer is ready! The interview is starting now. The timer
              will begin automatically.
            </Typography>
          </Alert>
        )}

      {/* Interviewee: Show message when interview is finished */}
      {!isInterviewer && session.end_time && (
        <Alert severity="warning" sx={{mb: 4}}>
          <Typography>
            This interview has been finished. You can no longer access the
            problem or make changes to your code.
          </Typography>
        </Alert>
      )}

      {isInterviewer && session.interviewer_ready && (
        <Alert severity="info" sx={{mb: 4}}>
          You are viewing this session as an interviewer. You can monitor the
          interviewee&apos;s progress in real-time.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Problem Description - Only show if interviewer is ready (for interviewees) or if interviewer */}
        {canSeeProblem && (
          <Grid item xs={12} md={isInterviewer ? 3 : 4}>
            <Paper
              sx={{
                p: {xs: 2, sm: 3, md: 4},
                height: '100%',
                overflow: 'auto',
                maxHeight: '80vh',
                borderRadius: 2,
              }}>
              <Typography variant="h6" gutterBottom sx={{fontWeight: 600}}>
                {problem.title}
              </Typography>
              <Chip label={problem.difficulty} size="small" sx={{mb: 3}} />
              <Box
                dangerouslySetInnerHTML={{__html: problem.description}}
                sx={{
                  '& pre': {
                    backgroundColor: 'grey.100',
                    p: 2,
                    borderRadius: 1,
                    overflow: 'auto',
                  },
                }}
              />
            </Paper>
          </Grid>
        )}

        {/* Show placeholder if problem not visible yet (for interviewees) */}
        {!canSeeProblem && !isInterviewer && (
          <Grid item xs={12} md={8}>
            <Paper
              sx={{
                p: {xs: 4, sm: 6, md: 8},
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 2,
                minHeight: '400px',
              }}>
              <Box sx={{textAlign: 'center'}}>
                <Typography variant="h6" gutterBottom>
                  Problem will be visible once the interviewer starts the
                  interview
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Please wait for the interviewer to begin...
                </Typography>
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Code Editor - Only show if problem is visible */}
        {canSeeProblem && (
          <Grid item xs={12} md={isInterviewer ? 5 : 8}>
            <Paper
              sx={{
                p: {xs: 2, sm: 3, md: 4},
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 2,
              }}>
              <Box
                sx={{
                  mb: 3,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 2,
                }}>
                <Typography variant="h6" sx={{fontWeight: 600}}>
                  {isInterviewer
                    ? 'Interviewee Code (Real-time)'
                    : 'Code Editor'}
                </Typography>
                {/* Finish Interview button for interviewers */}
                {isInterviewer &&
                  session?.interviewer_ready &&
                  !session?.end_time && (
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircle />}
                      onClick={finishInterview}
                      disabled={updating}
                      sx={{flexShrink: 0}}>
                      {updating ? 'Finishing...' : 'Finish Interview'}
                    </Button>
                  )}
              </Box>

              <Box
                sx={{
                  flexGrow: 1,
                  mb: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  overflow: 'hidden',
                }}>
                <MonacoEditor
                  height="400px"
                  language="python"
                  value={code}
                  onChange={value => {
                    if (
                      !isInterviewer &&
                      session?.interviewer_ready &&
                      !session?.end_time
                    ) {
                      const newCode = value || '';
                      setCode(newCode);
                      handleTyping();

                      // Broadcast code change in real-time (instant, no DB roundtrip)
                      if (codeBroadcastRef.current) {
                        codeBroadcastRef.current(newCode);
                      }

                      // Debounce DB save for persistence (save after 2 seconds of no typing)
                      // This is just for persistence - real-time sync is via broadcast
                      if (codeSaveTimeoutRef.current) {
                        clearTimeout(codeSaveTimeoutRef.current);
                      }
                      codeSaveTimeoutRef.current = setTimeout(() => {
                        saveCodeToDB(newCode);
                      }, 2000);
                    }
                  }}
                  theme="vs-dark"
                  options={{
                    minimap: {enabled: true},
                    fontSize: 14,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    readOnly:
                      isInterviewer ||
                      !session?.interviewer_ready ||
                      !!session?.end_time,
                  }}
                />
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Interviewer Dashboard - Only show if interviewer is ready */}
        {isInterviewer && session.interviewer_ready && (
          <Grid item xs={12} md={4}>
            <InterviewDashboard
              session={session}
              problem={problem}
              intervieweeCode={code}
              isInterviewer={true}
              timeLeft={timeLeft}
            />
          </Grid>
        )}
      </Grid>
    </Container>
  );
}
