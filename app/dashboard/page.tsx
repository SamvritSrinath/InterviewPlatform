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
  Alert,
  CircularProgress,
  Snackbar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material'
import { ExpandMore, Warning } from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/types'

export default function DashboardPage() {
  // Use a map to group data: { [intervieweeId]: { user: User, sessions: Session[], attempts: Attempt[] } }
  const [interviewees, setInterviewees] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ message: string; severity: 'error' | 'warning' | 'info' | 'success' } | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to cheating attempts
    const cheatingChannel = supabase
      .channel('cheating-attempts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cheating_attempts',
        },
        (payload: RealtimePostgresChangesPayload<Database['public']['Tables']['cheating_attempts']['Row']>) => {
          if (payload.new && 'attempt_type' in payload.new) {
            setNotification({
              message: `New cheating attempt detected: ${payload.new.attempt_type}`,
              severity: 'warning',
            })
          }
          fetchData() // Refresh all data
        }
      )
      .subscribe()

    // Subscribe to sessions
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
          fetchData() // Refresh all data
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(cheatingChannel)
      supabase.removeChannel(sessionsChannel)
    }
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch sessions and cheating attempts in parallel
      const [sessionsRes, attemptsRes] = await Promise.all([
        fetch('/api/dashboard/sessions'),
        fetch('/api/dashboard/cheating')
      ])

      if (!sessionsRes.ok) {
        if (sessionsRes.status === 403) {
          setError('You do not have permission to access this dashboard. Interviewer access required.')
          return
        }
        throw new Error('Failed to fetch sessions')
      }

      if (!attemptsRes.ok) {
         // Silently ignore if attempts fail, just show sessions
         console.warn('Failed to fetch cheating attempts')
      }

      const sessionsData = await sessionsRes.json()
      const attemptsData = await attemptsRes.json()

      const sessions = sessionsData.sessions || []
      const attempts = attemptsData.attempts || []

      // Group by Interviewee
      const grouped: Record<string, any> = {}

      // Process sessions first
      sessions.forEach((session: any) => {
        const userId = session.user_id
        if (!userId) return

        if (!grouped[userId]) {
          grouped[userId] = {
            user: session.interviewee,
            sessions: [],
            attempts: []
          }
        }
        grouped[userId].sessions.push(session)
      })

      // Process attempts
      attempts.forEach((attempt: any) => {
        const userId = attempt.user_id
        if (!userId) return

        if (!grouped[userId]) {
           // Should ideally be populated by sessions, but if session deleted/missing, we might still have attempts
           // We'll skip for now if no session found, or create a placeholder if we had user info in attempts
           // In this implementation, we rely on sessions to identify interviewees
           return
        }
        grouped[userId].attempts.push(attempt)
      })

      setInterviewees(grouped)
      setError(null)
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
    <Container maxWidth="xl" sx={{ py: { xs: 4, sm: 6, md: 8 } }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Interviewer Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ mt: 4 }}>
          {Object.keys(interviewees).length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No interviewees found.</Typography>
            </Paper>
          ) : (
            Object.values(interviewees).map((group: any) => (
              <Accordion key={group.user?.id || 'unknown'} defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between', pr: 2 }}>
                    <Box>
                      <Typography variant="h6">
                        {group.user?.full_name || group.user?.email || group.sessions[0]?.candidate_name || 'Unknown User'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {group.user?.email || (group.sessions[0]?.candidate_name ? 'Anonymous Candidate' : 'No ID')}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Chip label={`${group.sessions.length} Sessions`} size="small" />
                      {group.attempts.length > 0 && (
                        <Chip 
                          icon={<Warning />} 
                          label={`${group.attempts.length} Cheating Alerts`} 
                          color="error" 
                          size="small" 
                        />
                      )}
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>Sessions</Typography>
                  <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Problem</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Started At</TableCell>
                          <TableCell>IP</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {group.sessions.map((session: any) => (
                          <TableRow key={session.id}>
                            <TableCell>{session.problems?.title || 'Unknown Problem'}</TableCell>
                            <TableCell>
                              <Chip 
                                label={session.session_status} 
                                size="small" 
                                color={session.session_status === 'active' ? 'success' : 'default'} 
                              />
                            </TableCell>
                            <TableCell>{new Date(session.start_time).toLocaleString()}</TableCell>
                            <TableCell>{(session as any).client_ip || 'N/A'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {group.attempts.length > 0 && (
                    <>
                      <Typography variant="subtitle2" gutterBottom color="error">Cheating Attempts</Typography>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Type</TableCell>
                              <TableCell>Time</TableCell>
                              <TableCell>Details</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {group.attempts.map((attempt: any) => (
                              <TableRow key={attempt.id}>
                                <TableCell>
                                  <Chip label={attempt.attempt_type} color="error" size="small" />
                                </TableCell>
                                <TableCell>{new Date(attempt.detected_at).toLocaleString()}</TableCell>
                                <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {JSON.stringify(attempt.details)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  )}
                </AccordionDetails>
              </Accordion>
            ))
          )}
        </Box>
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
          sx={{ width: '100%' }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </Container>
  )
}
