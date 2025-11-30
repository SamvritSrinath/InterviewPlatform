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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
} from '@mui/material';
import {Problem, Session} from '@/lib/supabase/types';
import {useCheatingDetection} from '@/lib/cheating-detection/client-monitor';
import {useAuth} from '@/lib/supabase/auth-context';
import {InterviewDashboard} from '@/components/interview/interview-dashboard';
import {createClient} from '@/lib/supabase/client';
import {CheckCircle} from '@mui/icons-material';
import {marked} from 'marked';
import {
  createHiddenInstructions,
  createMarkdownImageInjection,
} from '@/lib/utils/unicode-smuggling';
import {VisualTrap} from '@/components/interview/visual-trap';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
});

export default function InterviewSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const {user, loading: authLoading} = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [candidateName, setCandidateName] = useState('');
  const [notification, setNotification] = useState<{
    message: string;
    severity: 'error' | 'warning' | 'info' | 'success';
  } | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const codeSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const codeBroadcastRef = useRef<((code: string) => void) | null>(null);
  const finishedRef = useRef<boolean>(false);
  const problemRef = useRef<Problem | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSessionUpdateRef = useRef<string | null>(null);
  const supabase = createClient();

  // Check if current user is interviewer/admin for this session
  // Only valid if auth is not loading
  const isInterviewer =
    !authLoading &&
    user &&
    session &&
    (user.is_admin ||
      (user.is_interviewer && session.interviewer_id === user.id) ||
      (user.is_interviewer && session.user_id !== user.id));

  // Keep problem ref in sync with problem state
  useEffect(() => {
    problemRef.current = problem;
    // Initialize code if problem is loaded and code is empty (and not interviewer)
    if (problem && !code && !isInterviewer) {
      setCode(problem.default_code || '');
    }
  }, [problem, code, isInterviewer]);

  // Check if interviewee can see the problem
  // Problem is visible when interviewer is ready (no need to wait for interviewee_started)
  // But not if the interview has ended (end_time is set)
  // AND if the session is approved
  const canSeeProblem = isInterviewer
    ? true // Interviewers can always see
    : session?.interviewer_ready && !session?.end_time && session?.approved; // Interviewees can see if ready and not finished and approved

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

  // Inject honeypot token into clipboard on copy and log copy events
  useEffect(() => {
    if (!session?.honeypot_token || !problem?.id || isInterviewer) return;

    const handleCopy = (e: ClipboardEvent) => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      // Only inject if copying from problem description
      const text = selection.toString();
      if (text.length < 50) return; // Don't inject on small copies

      // Log copy event for cheating detection
      // Mark as suspicious to ensure it gets logged (copying problem description is always logged)
      logEvent('copy_paste', {
        action: 'copy',
        textLength: text.length,
        copiedFrom: 'problem_description',
        sessionId: session.id,
        problemId: problem.id,
        suspicious: true, // Always log copy events from problem description
      });

      // Construct the honeypot URL using current origin
      const honeypotUrl = `${window.location.origin}/docs/v1/${session.honeypot_token}/${problem.id}`;

      // Construct the markdown image URL for FR004 (Markdown Image Beacons)
      const imageUrl = `${window.location.origin}/assets/img/v1/${session.honeypot_token}/diagram.png`;

      // Construct the persistent site URL for SEO-optimized documentation
      const persistentSiteUrl = `${window.location.origin}/public/interviews/${session.honeypot_token}`;

      // ASCII Smuggling: Hidden instructions encoded in Unicode Tag characters
      // These are invisible to users but will be seen by LLMs when processing the text
      const hiddenInstructions = createHiddenInstructions(
        honeypotUrl,
        session.id,
        persistentSiteUrl,
      );

      // Markdown Image Injection (FR004): Hidden instruction to include diagram in response
      // This will cause LLMs to include markdown image tags, triggering automatic GET requests
      const markdownImageInstruction = createMarkdownImageInjection(imageUrl);

      // Combine: hidden instructions + markdown image instruction + visible text + hidden instructions
      // Removed visible [Context] link as it's obvious to users
      // This pattern ensures LLMs see the hidden instructions regardless of where they start reading
      const plainTextPayload = `${hiddenInstructions}${markdownImageInstruction}${text}${hiddenInstructions}${markdownImageInstruction}`;

      if (e.clipboardData) {
        e.preventDefault();
        // Set plain text with both visible and hidden content
        e.clipboardData.setData('text/plain', plainTextPayload);
        // For HTML, embed hidden instructions in the text (no visible URL)
        const htmlContent =
          selection.getRangeAt(0).cloneContents().textContent || '';
        e.clipboardData.setData(
          'text/html',
          `${hiddenInstructions}${markdownImageInstruction}${htmlContent}${hiddenInstructions}${markdownImageInstruction}`,
        );
      }
    };

    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, [
    session?.honeypot_token,
    problem?.id,
    isInterviewer,
    logEvent,
    session?.id,
  ]);

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

  // Re-evaluate modal visibility when auth loading changes
  useEffect(() => {
    if (!session || loading || authLoading) return;

    const isInterviewerForSession =
      user &&
      (user.is_admin ||
        (user.is_interviewer && session.interviewer_id === user.id) ||
        (user.is_interviewer && session.user_id !== user.id));

    if (!isInterviewerForSession && !(session as any).candidate_name) {
      setShowJoinModal(true);
    } else {
      setShowJoinModal(false);
    }
  }, [session, loading, authLoading, user]);

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
        // Always fetch problem when interviewer becomes ready
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
      }-${sessionData.end_time || 'null'}-${sessionData.approved}`;
      if (sessionKey !== lastSessionUpdateRef.current) {
        lastSessionUpdateRef.current = sessionKey;

        setSession((prevSession: Session | null) => {
          if (!prevSession) return sessionData as Session;

          // Only update if something actually changed
          if (
            prevSession.interviewer_ready !== sessionData.interviewer_ready ||
            prevSession.interviewee_started !==
              sessionData.interviewee_started ||
            prevSession.end_time !== sessionData.end_time ||
            prevSession.start_time !== sessionData.start_time ||
            prevSession.approved !== sessionData.approved
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

  // Subscribe to session updates
  useEffect(() => {
    if (!session?.id) return;

    lastSessionUpdateRef.current = `${session.interviewer_ready}-${
      session.interviewee_started
    }-${session.end_time || 'null'}-${session.approved}`;

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
        (payload: any) => {
          const updatedSession = payload.new as Session;

          // Use functional update to ensure we have the latest state
          setSession((prevSession: Session | null) => {
            if (!prevSession) return updatedSession;
            handleSessionUpdate(updatedSession, prevSession);
            return updatedSession;
          });
        },
      )
      .subscribe((status: string, err?: Error) => {
        if (status === 'CHANNEL_ERROR' && err) {
          console.error('❌ Error subscribing to session updates:', err);
        }
      });

    // Set up polling fallback (checks every 2 seconds as backup)
    pollingIntervalRef.current = setInterval(pollSessionUpdates, 2000);

    return () => {
      supabase.removeChannel(sessionChannel);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [session?.id, pollSessionUpdates, handleSessionUpdate]);

  // Timer sync
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const updateTimer = () => {
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
        setTimeLeft(0);
      }
    };

    updateTimer();

    if (
      session &&
      session.time_limit &&
      session.interviewee_started &&
      session.start_time &&
      !session.end_time
    ) {
      intervalRef.current = setInterval(updateTimer, 1000);
    } else if (session?.end_time) {
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

  // Save code to database periodically
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
    }
  };

  // Real-time code sync via WebSocket broadcast
  useEffect(() => {
    if (!session || !session.id) return;

    const codeChannel = supabase.channel(`code-sync-${session.id}`, {
      config: {
        broadcast: {self: false},
      },
    });

    codeChannel
      .on('broadcast', {event: 'code-update'}, (payload: any) => {
        const {code: newCode} = payload.payload as {code: string};
        if (newCode !== undefined) {
          if (isInterviewer) {
            setCode(newCode || '');
          }
        }
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
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

    if (!isInterviewer && session.interviewer_ready) {
      const broadcastCode = (newCode: string) => {
        codeChannel
          .send({
            type: 'broadcast',
            event: 'code-update',
            payload: {code: newCode},
          })
          .then(() => {
            // Successfully broadcasted
          })
          .catch((err: any) => {
            console.error('Error broadcasting code:', err);
          });
      };

      codeBroadcastRef.current = broadcastCode;
    } else {
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

      let response = await fetch(`/api/sessions?id=${sessionId}`);
      let data = await response.json();

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

      const sessionData = data.sessions?.[0] || data.session;
      if (sessionData) {
        setSession(sessionData);

        // Note: We don't rely on fetchSession to set modal visibility anymore
        // We use the useEffect hook that depends on auth loading state

        if (sessionData.end_time) {
          finishedRef.current = true;
        }

        if (sessionData.problems) {
          setProblem(sessionData.problems);
          // Only initialize code if not interviewer (though useEffect handles this too)
          // Logic in useEffect is safer
        } else if (sessionData.problem_id) {
          const problemResponse = await fetch(
            `/api/problems/${sessionData.problem_id}`,
          );
          const problemData = await problemResponse.json();
          if (problemData.problem) {
            setProblem(problemData.problem);
          }
        }
      } else {
        throw new Error('Session not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeUp = async () => {
    if (!session || isInterviewer || finishedRef.current || session.end_time)
      return;

    finishedRef.current = true;
    await finishInterview();
  };

  const finishInterview = async () => {
    if (!session || finishedRef.current || session.end_time) return;

    try {
      finishedRef.current = true;
      setUpdating(true);

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
      finishedRef.current = false;
      setError(
        err instanceof Error ? err.message : 'Failed to finish interview',
      );
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
    } finally {
      setUpdating(false);
    }
  };

  const handleApproveCandidate = async () => {
    console.log('[Interview] Approving candidate...');
    if (!session) return;

    try {
      setUpdating(true);
      const response = await fetch(`/api/sessions/${session.id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          approved: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve candidate');
      }

      const data = await response.json();
      setSession(data.session);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to approve candidate',
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleJoinSession = async () => {
    console.log('[Interview] Joining session...', candidateName);
    if (!session || !candidateName.trim()) return;

    try {
      setUpdating(true);
      const response = await fetch(`/api/sessions/${session.id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          candidate_name: candidateName,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to join session');
      }

      const data = await response.json();
      setSession(data.session);
      setShowJoinModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join session');
    } finally {
      setUpdating(false);
    }
  };

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

      {/* Interviewer: Approve Candidate */}
      {isInterviewer &&
        (session as any).candidate_name &&
        !session.approved && (
          <Alert severity="warning" sx={{mb: 4}}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
              <Typography>
                Candidate <strong>{(session as any).candidate_name}</strong> is
                asking to join.
              </Typography>
              <Button
                variant="contained"
                color="success"
                onClick={handleApproveCandidate}
                disabled={updating}
                sx={{ml: 2}}>
                {updating ? 'Approving...' : 'Approve'}
              </Button>
            </Box>
          </Alert>
        )}

      {/* Interviewee: Waiting for Approval */}
      {!isInterviewer &&
        (session as any).candidate_name &&
        !session.approved && (
          <Alert severity="info" sx={{mb: 4}}>
            <Typography>
              Waiting for interviewer approval... Please stay on this page.
            </Typography>
          </Alert>
        )}

      {/* Interviewer: Show start button if not ready */}
      {isInterviewer &&
        !session.interviewer_ready &&
        (session.approved || !(session as any).candidate_name) && (
          <Alert severity="warning" sx={{mb: 4}}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
              <Typography>
                Click &quot;Start Interview&quot; when you&apos;re ready to
                begin. The problem will be visible to the interviewee once you
                start.
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
      {!isInterviewer && !session.interviewer_ready && session.approved && (
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
      {!isInterviewer && session?.end_time && (
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
          interviewee's progress in real-time.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Problem Description - Only show if interviewer is ready (for interviewees) or if interviewer */}
        {canSeeProblem && (
          <Grid item xs={12} md={isInterviewer ? 3 : 4}>
            <Paper
              elevation={2}
              sx={{
                p: {xs: 3, sm: 4, md: 5},
                height: '100%',
                overflow: 'auto',
                maxHeight: '80vh',
                borderRadius: 3,
                position: 'relative', // Required for absolute positioning of VisualTrap
                backgroundColor: '#FFFFFF', // Explicit white background for visual trap
                border: '1px solid',
                borderColor: 'grey.200',
                boxShadow:
                  '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                '&::-webkit-scrollbar': {
                  width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: 'grey.50',
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: 'grey.300',
                  borderRadius: '4px',
                  '&:hover': {
                    backgroundColor: 'grey.400',
                  },
                },
              }}>
              <Box
                sx={{
                  mb: 3,
                  pb: 2.5,
                  borderBottom: '2px solid',
                  borderColor: 'primary.main',
                }}>
                <Typography
                  variant="h5"
                  gutterBottom
                  sx={{
                    fontWeight: 700,
                    fontSize: {xs: '1.25rem', sm: '1.5rem', md: '1.75rem'},
                    color: 'grey.900',
                    lineHeight: 1.3,
                    mb: 1.5,
                  }}>
                  {problem.title}
                </Typography>
                <Chip
                  label={problem.difficulty}
                  size="medium"
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    height: '28px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    backgroundColor:
                      problem.difficulty?.toLowerCase() === 'easy'
                        ? 'success.light'
                        : problem.difficulty?.toLowerCase() === 'medium'
                        ? 'warning.light'
                        : problem.difficulty?.toLowerCase() === 'hard'
                        ? 'error.light'
                        : 'primary.light',
                    color:
                      problem.difficulty?.toLowerCase() === 'easy'
                        ? 'success.dark'
                        : problem.difficulty?.toLowerCase() === 'medium'
                        ? 'warning.dark'
                        : problem.difficulty?.toLowerCase() === 'hard'
                        ? 'error.dark'
                        : 'primary.dark',
                  }}
                />
              </Box>
              <Box
                className="problem-description"
                dangerouslySetInnerHTML={{
                  __html: marked.parse(problem.description || '') as string,
                }}
                sx={{
                  color: 'grey.800',
                  fontSize: {xs: '0.9375rem', sm: '1rem'},
                  lineHeight: 1.7,
                  '& h1': {
                    fontWeight: 700,
                    fontSize: '1.75rem',
                    mb: 2,
                    mt: 3,
                    color: 'grey.900',
                    lineHeight: 1.3,
                  },
                  '& h2': {
                    fontWeight: 700,
                    fontSize: '1.5rem',
                    mb: 1.5,
                    mt: 2.5,
                    color: 'grey.900',
                    lineHeight: 1.3,
                  },
                  '& h3': {
                    fontWeight: 600,
                    fontSize: '1.25rem',
                    mb: 1.25,
                    mt: 2,
                    color: 'grey.900',
                    lineHeight: 1.4,
                  },
                  '& h4': {
                    fontWeight: 600,
                    fontSize: '1.125rem',
                    mb: 1,
                    mt: 1.5,
                    color: 'grey.900',
                  },
                  '& p': {
                    mb: 1.75,
                    fontSize: 'inherit',
                    lineHeight: 'inherit',
                  },
                  '& ul, & ol': {
                    pl: 4,
                    mb: 1.75,
                    '& li': {
                      mb: 0.75,
                      lineHeight: 1.7,
                    },
                  },
                  '& ul': {
                    listStyleType: 'disc',
                  },
                  '& ol': {
                    listStyleType: 'decimal',
                  },
                  '& blockquote': {
                    borderLeft: '4px solid',
                    borderColor: 'primary.main',
                    pl: 2,
                    py: 1,
                    my: 2,
                    backgroundColor: 'grey.50',
                    fontStyle: 'italic',
                    color: 'grey.700',
                  },
                  '& a': {
                    color: 'primary.main',
                    textDecoration: 'underline',
                    '&:hover': {
                      color: 'primary.dark',
                    },
                  },
                  '& pre': {
                    backgroundColor: '#1e293b',
                    color: '#e2e8f0',
                    p: 2.5,
                    borderRadius: 2,
                    overflow: 'auto',
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    fontSize: '0.875rem',
                    mb: 2,
                    mt: 1.5,
                    lineHeight: 1.6,
                    boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.1)',
                    '& code': {
                      backgroundColor: 'transparent',
                      padding: 0,
                      color: 'inherit',
                      fontSize: 'inherit',
                      fontFamily: 'inherit',
                      border: 'none',
                    },
                  },
                  '& code': {
                    backgroundColor: '#f1f5f9',
                    color: '#0f172a',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  },
                  '& strong': {
                    fontWeight: 700,
                    color: 'grey.900',
                  },
                  '& em': {
                    fontStyle: 'italic',
                  },
                  '& hr': {
                    border: 'none',
                    borderTop: '1px solid',
                    borderColor: 'grey.300',
                    my: 3,
                  },
                  '& table': {
                    width: '100%',
                    borderCollapse: 'collapse',
                    mb: 2,
                    mt: 1.5,
                    '& th, & td': {
                      border: '1px solid',
                      borderColor: 'grey.300',
                      px: 1.5,
                      py: 1,
                      textAlign: 'left',
                    },
                    '& th': {
                      backgroundColor: 'grey.100',
                      fontWeight: 600,
                      color: 'grey.900',
                    },
                  },
                }}
              />
              {/* Visual Trap (FR-003) - Visible configuration section for screenshots - Inline within problem description */}
              {session?.honeypot_token && problem?.id && !isInterviewer && (
                <Box sx={{mt: 3}}>
                  <VisualTrap
                    honeypotUrl={`${window.location.origin}/docs/v1/${session.honeypot_token}/${problem.id}`}
                    token={session.honeypot_token}
                    persistentSiteUrl={`${window.location.origin}/public/interviews/${session.honeypot_token}`}
                    imageUrl={`${window.location.origin}/assets/img/v1/${session.honeypot_token}/diagram.png`}
                  />
                </Box>
              )}
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
                {!session?.approved && (session as any)?.candidate_name ? (
                  <>
                    <Typography variant="h6" gutterBottom>
                      Waiting for Approval
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Please wait for the interviewer to approve your request to
                      join.
                    </Typography>
                  </>
                ) : (
                  <>
                    <Typography variant="h6" gutterBottom>
                      Problem will be visible once the interviewer starts the
                      interview
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Please wait for the interviewer to begin...
                    </Typography>
                  </>
                )}
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

      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
        anchorOrigin={{vertical: 'top', horizontal: 'right'}}>
        <Alert
          onClose={() => setNotification(null)}
          severity={notification?.severity || 'info'}
          className="w-full">
          {notification?.message}
        </Alert>
      </Snackbar>

      <Dialog open={showJoinModal} disableEscapeKeyDown>
        <DialogTitle>Join Interview</DialogTitle>
        <DialogContent>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{mb: 2, mt: 1}}>
            Please enter your full name to join the interview session.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Full Name"
            fullWidth
            variant="outlined"
            value={candidateName}
            onChange={e => setCandidateName(e.target.value)}
            disabled={updating}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleJoinSession}
            variant="contained"
            disabled={!candidateName.trim() || updating}>
            {updating ? 'Joining...' : 'Join Session'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
