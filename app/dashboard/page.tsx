'use client'

import { useState, useEffect } from 'react'
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Snackbar,
} from '@mui/material'
import { Warning, Security, Assessment, Psychology } from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState(0)
  const [sessions, setSessions] = useState<any[]>([])
  const [cheatingAttempts, setCheatingAttempts] = useState<any[]>([])
  const [scraperLogs, setScraperLogs] = useState<any[]>([])
  const [aiAnalytics, setAiAnalytics] = useState<any[]>([])
  const [aiStats, setAiStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ message: string; severity: 'error' | 'warning' | 'info' | 'success' } | null>(null)

  useEffect(() => {
    fetchData()
  }, [activeTab])

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to cheating attempts (only when on cheating tab)
    const cheatingChannel = supabase
      .channel('cheating-attempts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cheating_attempts',
        },
        (payload) => {
          setNotification({
            message: `New cheating attempt detected: ${payload.new.attempt_type}`,
            severity: 'warning',
          })
          // Only refresh if on cheating tab
          if (activeTab === 1) {
            fetchCheatingAttempts()
          }
        }
      )
      .subscribe()

    // Subscribe to sessions (only when on sessions tab)
    const sessionsChannel = supabase
      .channel('sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
        },
        () => {
          // Only refresh if on sessions tab
          if (activeTab === 0) {
            fetchSessions()
          }
        }
      )
      .subscribe()

    // Subscribe to cheating attempts for AI analytics (only when on AI analytics tab)
    const aiAnalyticsChannel = supabase
      .channel('ai-analytics')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cheating_attempts',
          filter: 'attempt_type=eq.llm-api-request',
        },
        (payload) => {
          setNotification({
            message: `New AI request detected from IP: ${payload.new.client_ip || 'Unknown'}`,
            severity: 'warning',
          })
          // Only refresh if on AI analytics tab
          if (activeTab === 3) {
            fetchAiAnalytics()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(cheatingChannel)
      supabase.removeChannel(sessionsChannel)
      supabase.removeChannel(aiAnalyticsChannel)
    }
  }, [activeTab])

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/dashboard/sessions')
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 403) {
          setError('You do not have permission to access this dashboard. Interviewer access required.')
          return
        }
        throw new Error(data.error || 'Failed to fetch sessions')
      }
      setSessions(data.sessions || [])
      setError(null)
    } catch (error) {
      console.error('Error fetching sessions:', error)
      if (error instanceof Error) {
        setError(error.message)
      }
    }
  }

  const fetchCheatingAttempts = async () => {
    try {
      const res = await fetch('/api/dashboard/cheating')
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 403) {
          setError('You do not have permission to access this dashboard. Interviewer access required.')
          return
        }
        throw new Error(data.error || 'Failed to fetch cheating attempts')
      }
      setCheatingAttempts(data.attempts || [])
      setError(null)
    } catch (error) {
      console.error('Error fetching cheating attempts:', error)
      if (error instanceof Error) {
        setError(error.message)
      }
    }
  }

  const fetchScraperLogs = async () => {
    try {
      const res = await fetch('/api/dashboard/scrapers')
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 403) {
          setError('You do not have permission to access this dashboard. Interviewer access required.')
          return
        }
        throw new Error(data.error || 'Failed to fetch scraper logs')
      }
      setScraperLogs(data.logs || [])
      setError(null)
    } catch (error) {
      console.error('Error fetching scraper logs:', error)
      if (error instanceof Error) {
        setError(error.message)
      }
    }
  }

  const fetchAiAnalytics = async () => {
    try {
      const res = await fetch('/api/dashboard/ai-analytics')
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 403) {
          setError('You do not have permission to access this dashboard. Interviewer access required.')
          return
        }
        throw new Error(data.error || 'Failed to fetch AI analytics')
      }
      setAiAnalytics(data.aiRequests || [])
      setAiStats(data.stats || null)
      setError(null)
    } catch (error) {
      console.error('Error fetching AI analytics:', error)
      if (error instanceof Error) {
        setError(error.message)
      }
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      if (activeTab === 0) {
        await fetchSessions()
      } else if (activeTab === 1) {
        await fetchCheatingAttempts()
      } else if (activeTab === 2) {
        await fetchScraperLogs()
      } else if (activeTab === 3) {
        await fetchAiAnalytics()
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      if (error instanceof Error) {
        setError(error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="xl" className="py-8">
      <Typography variant="h4" component="h1" gutterBottom>
        Interviewer Dashboard
      </Typography>

      {error && (
        <Alert severity="error" className="mb-6" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Tabs value={activeTab} onChange={(_: any, newValue: number) => setActiveTab(newValue)} className="mb-6">
        <Tab icon={<Assessment />} label="Sessions" />
        <Tab icon={<Warning />} label="Cheating Attempts" />
        <Tab icon={<Security />} label="Scraper Logs" />
        <Tab icon={<Psychology />} label="AI Analytics" />
      </Tabs>

      {loading ? (
        <Box className="text-center py-8">
          <CircularProgress />
        </Box>
      ) : (
        <>
          {activeTab === 0 && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Problem</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Interviewer</TableCell>
                    <TableCell>Public</TableCell>
                    <TableCell>Start Time</TableCell>
                    <TableCell>IP Address</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No sessions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    sessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>{session.interviewee?.email || session.user_id || 'N/A'}</TableCell>
                        <TableCell>{session.problems?.title || 'N/A'}</TableCell>
                        <TableCell>
                          <Chip
                            label={session.session_status}
                            color={
                              session.session_status === 'active' ? 'success' : 'default'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {session.interviewer?.email ? (
                            session.interviewer.email
                          ) : session.interviewer_id ? (
                            <Chip label="Assigned" color="info" size="small" />
                          ) : (
                            <Chip label="Unassigned" size="small" />
                          )}
                        </TableCell>
                        <TableCell>
                          {session.is_public ? (
                            <Chip label="Public" color="warning" size="small" />
                          ) : (
                            <Chip label="Private" size="small" />
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(session.start_time).toLocaleString()}
                        </TableCell>
                        <TableCell>{session.client_ip || 'N/A'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {activeTab === 1 && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Problem</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Detected At</TableCell>
                    <TableCell>IP Address</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cheatingAttempts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No cheating attempts detected
                      </TableCell>
                    </TableRow>
                  ) : (
                    cheatingAttempts.map((attempt) => (
                      <TableRow key={attempt.id}>
                        <TableCell>{attempt.users?.email || 'N/A'}</TableCell>
                        <TableCell>{attempt.problems?.title || 'N/A'}</TableCell>
                        <TableCell>
                          <Chip label={attempt.attempt_type} color="error" size="small" />
                        </TableCell>
                        <TableCell>
                          {new Date(attempt.detected_at).toLocaleString()}
                        </TableCell>
                        <TableCell>{attempt.client_ip || 'N/A'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {activeTab === 2 && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>IP Address</TableCell>
                    <TableCell>User Agent</TableCell>
                    <TableCell>Pattern Type</TableCell>
                    <TableCell>Request Path</TableCell>
                    <TableCell>Detected At</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scraperLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No scraper logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    scraperLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{log.ip_address}</TableCell>
                        <TableCell>{log.user_agent || 'N/A'}</TableCell>
                        <TableCell>
                          <Chip label={log.pattern_type || 'N/A'} size="small" />
                        </TableCell>
                        <TableCell>{log.request_path || 'N/A'}</TableCell>
                        <TableCell>
                          {new Date(log.detected_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {activeTab === 3 && (
            <>
              {aiStats && (
                <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    AI Analytics Summary
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 2 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Total AI Requests
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        {aiStats.total}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        During Active Sessions
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 600, color: 'warning.main' }}>
                        {aiStats.duringActiveSessions}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        IP Matches
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 600, color: 'info.main' }}>
                        {aiStats.ipMatches}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        With Active Sessions
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 600, color: 'success.main' }}>
                        {aiStats.withActiveSessions}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              )}
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>User</TableCell>
                      <TableCell>Problem</TableCell>
                      <TableCell>IP Address</TableCell>
                      <TableCell>Session IP</TableCell>
                      <TableCell>During Active Session</TableCell>
                      <TableCell>IP Matches</TableCell>
                      <TableCell>Detected At</TableCell>
                      <TableCell>Session Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {aiAnalytics.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          No AI requests detected
                        </TableCell>
                      </TableRow>
                    ) : (
                      aiAnalytics.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>{request.users?.email || 'N/A'}</TableCell>
                          <TableCell>{request.problems?.title || 'N/A'}</TableCell>
                          <TableCell>
                            <Chip 
                              label={request.ipAddress || 'N/A'} 
                              size="small"
                              color={request.temporalMatch?.ipMatches ? 'error' : 'default'}
                            />
                          </TableCell>
                          <TableCell>
                            {request.sessionIpAddress || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={request.temporalMatch?.isDuringActiveSession ? 'Yes' : 'No'} 
                              size="small"
                              color={request.temporalMatch?.isDuringActiveSession ? 'error' : 'default'}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={request.temporalMatch?.ipMatches ? 'Yes' : 'No'} 
                              size="small"
                              color={request.temporalMatch?.ipMatches ? 'error' : 'default'}
                            />
                          </TableCell>
                          <TableCell>
                            {new Date(request.detected_at).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={request.temporalMatch?.sessionStatus || 'N/A'} 
                              size="small"
                              color={request.temporalMatch?.sessionStatus === 'active' ? 'success' : 'default'}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </>
      )}

      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setNotification(null)}
          severity={notification?.severity || 'info'}
          className="w-full"
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </Container>
  )
}

