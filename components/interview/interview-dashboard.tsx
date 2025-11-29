'use client'

import { useState, useEffect } from 'react'
import {
  Paper,
  Typography,
  Box,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import { Warning, Assessment, Psychology, AccessTime, Security } from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'
import { Session, Problem, Database } from '@/lib/supabase/types'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface InterviewDashboardProps {
  session: Session
  problem: Problem
  intervieweeCode: string
  isInterviewer: boolean
  timeLeft?: number
}

export function InterviewDashboard({
  session,
  problem,
  intervieweeCode,
  isInterviewer,
  timeLeft,
}: InterviewDashboardProps) {
  const [activeTab, setActiveTab] = useState(0)
  const [cheatingAttempts, setCheatingAttempts] = useState<any[]>([])
  const [llmAttempts, setLlmAttempts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!isInterviewer) return

    // Subscribe to cheating attempts for real-time alerts
    // All cheating attempts are stored in DB, but we show real-time alerts to interviewer
    const cheatingChannel = supabase
      .channel(`cheating-${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cheating_attempts',
          filter: `session_id=eq.${session.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Database['public']['Tables']['cheating_attempts']['Row']>) => {
          if (payload.new && 'attempt_type' in payload.new) {
            const attempt = payload.new as Database['public']['Tables']['cheating_attempts']['Row']
            // Add to cheating attempts list
            setCheatingAttempts((prev) => [attempt, ...prev])
            
            // If it's an LLM attempt or honeypot access, also add to LLM attempts
            // Honeypot visits indicate LLM usage (they accessed the honeypot URL)
            if (attempt.attempt_type === 'llm-api-request' || attempt.attempt_type === 'honeypot-access') {
              setLlmAttempts((prev) => [attempt, ...prev])
            }
            
            // Real-time alert: All cheating attempts trigger alerts via this subscription
            // No need to store alerts separately - they're broadcast via real-time
          }
        }
      )
      .subscribe()

    // Subscribe to session updates for real-time timer sync
    const sessionChannel = supabase
      .channel(`session-timer-${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${session.id}`,
        },
        (_payload: RealtimePostgresChangesPayload<Database['public']['Tables']['sessions']['Row']>) => {
          // Session updated - timer will recalculate on next render
          // This ensures timer stays synced between interviewer and interviewee
        }
      )
      .subscribe()

    // Fetch existing cheating attempts
    fetchCheatingAttempts()

    return () => {
      supabase.removeChannel(cheatingChannel)
      supabase.removeChannel(sessionChannel)
    }
  }, [session.id, isInterviewer])

  const fetchCheatingAttempts = async () => {
    try {
      const response = await fetch(`/api/dashboard/cheating?sessionId=${session.id}`)
      if (response.ok) {
        const data = await response.json()
        const attempts = data.attempts || []
        setCheatingAttempts(attempts)
        // Filter LLM attempts and Honeypot access
        setLlmAttempts(attempts.filter((a: any) =>
          a.attempt_type === 'llm-api-request' || a.attempt_type === 'honeypot-access'
        ))
      }
    } catch (error) {
      console.error('Error fetching cheating attempts:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number | undefined) => {
    if (seconds === undefined) return 'N/A'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (!isInterviewer) {
    return null
  }

  return (
    <Paper 
      elevation={3}
      sx={{ 
        p: { xs: 2, sm: 3 }, 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        borderRadius: 2,
      }}
    >
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        Interviewer Dashboard
      </Typography>

      {/* Key Metrics - Prominently Displayed */}
      <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip
          icon={<Security />}
          label={`IP: ${session.client_ip || 'Unknown'}`}
          size="small"
          color="info"
          variant="outlined"
          sx={{ fontWeight: 600 }}
        />
        {timeLeft !== undefined && (
          <Chip
            icon={<AccessTime />}
            label={`Time: ${formatTime(timeLeft)}`}
            size="small"
            color={timeLeft < 300 ? 'error' : 'primary'}
            sx={{ fontWeight: 600 }}
          />
        )}
        <Chip
          label={`Status: ${session.session_status}`}
          size="small"
          color={session.session_status === 'active' ? 'success' : 'default'}
        />
        {llmAttempts.length > 0 && (
          <Chip
            icon={<Psychology />}
            label={`LLM: ${llmAttempts.length}`}
            size="small"
            color="error"
            sx={{ fontWeight: 600, animation: 'pulse 2s infinite' }}
          />
        )}
      </Box>

      {/* LLM Detection Alert - Most Prominent */}
      {llmAttempts.length > 0 && (
        <Alert 
          severity="error" 
          icon={<Psychology />}
          sx={{ 
            mb: 3,
            '& .MuiAlert-message': {
              width: '100%',
            },
          }}
        >
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
            ⚠️ LLM Usage Detected: {llmAttempts.length} AI request(s) detected during this session!
          </Typography>
          <Typography variant="body2">
            Check the LLM Detection tab for details. IP addresses and timestamps are logged.
          </Typography>
        </Alert>
      )}

      <Tabs 
        value={activeTab} 
        onChange={(_, v) => setActiveTab(v)} 
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab 
          icon={<Psychology />} 
          iconPosition="start"
          label={`LLM Detection ${llmAttempts.length > 0 ? `(${llmAttempts.length})` : ''}`}
          sx={{ minHeight: 48 }}
        />
        <Tab 
          icon={<Warning />} 
          iconPosition="start"
          label={`Alerts ${cheatingAttempts.length > 0 ? `(${cheatingAttempts.length})` : ''}`}
        />
        <Tab 
          icon={<Assessment />} 
          iconPosition="start"
          label="Session Info" 
        />
      </Tabs>

      {/* LLM Detection Tab - Primary Focus */}
      {activeTab === 0 && (
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          {llmAttempts.length === 0 ? (
            <Alert severity="success">
              No LLM usage detected. AI requests are being monitored in real-time.
            </Alert>
          ) : (
            <List sx={{ p: 0 }}>
              {llmAttempts.map((attempt, idx) => (
                <Box key={attempt.id || idx}>
                  <ListItem 
                    sx={{ 
                      bgcolor: idx === 0 ? 'error.light' : 'background.paper',
                      borderRadius: 1,
                      mb: 1,
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Psychology color="error" fontSize="small" />
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {attempt.attempt_type === 'honeypot-access' ? 'Honeypot Triggered (LLM Usage)' : 'AI Request Detected'}
                          </Typography>
                          <Chip
                            label={new Date(attempt.detected_at).toLocaleTimeString()}
                            size="small"
                            color="error"
                          />
                          {attempt.details?.aiRequestDuringActiveSession && (
                            <Chip
                              label="During Active Session"
                              size="small"
                              color="error"
                              variant="outlined"
                            />
                          )}
                          {attempt.details?.ipSuspicious && (
                            <Chip
                              label="Suspicious IP"
                              size="small"
                              color="warning"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                            IP Address: {(attempt as any).client_ip || (attempt as any).sessions?.client_ip || (attempt.details as any)?.client_ip || 'Unknown'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Detected at: {new Date(attempt.detected_at).toLocaleString()}
                          </Typography>
                          {attempt.attempt_type === 'honeypot-access' && (
                            <>
                              <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
                                Honeypot URL accessed - indicates LLM copied problem text and visited the trap URL!
                              </Alert>
                              {attempt.details?.honeypotUrl && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                  Honeypot URL: {attempt.details.honeypotUrl}
                                </Typography>
                              )}
                              {attempt.details?.userAgent && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                  User Agent: {attempt.details.userAgent}
                                </Typography>
                              )}
                            </>
                          )}
                          {attempt.details?.url && attempt.attempt_type !== 'honeypot-access' && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              URL: {attempt.details.url.substring(0, 100)}
                            </Typography>
                          )}
                          {attempt.details?.aiRequestDuringActiveSession && (
                            <Alert severity="error" sx={{ mt: 1 }}>
                              This AI request occurred during an active interview session!
                            </Alert>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  {idx < llmAttempts.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          )}
        </Box>
      )}

      {/* All Cheating Attempts Tab */}
      {activeTab === 1 && (
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          {cheatingAttempts.length === 0 ? (
            <Alert severity="info">No cheating attempts detected</Alert>
          ) : (
            <List sx={{ p: 0 }}>
              {cheatingAttempts.map((attempt, idx) => (
                <Box key={attempt.id || idx}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Warning
                            color={(attempt.attempt_type === 'llm-api-request' || attempt.attempt_type === 'honeypot-access') ? 'error' : 'warning'}
                            fontSize="small"
                          />
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {attempt.attempt_type}
                          </Typography>
                          <Chip
                            label={new Date(attempt.detected_at).toLocaleTimeString()}
                            size="small"
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          IP: {(attempt as any).client_ip || (attempt as any).sessions?.client_ip || (attempt.details as any)?.client_ip || 'Unknown'} | 
                          {attempt.details 
                            ? ` Details: ${JSON.stringify(attempt.details).substring(0, 100)}...`
                            : ' No additional details'}
                        </Typography>
                      }
                    />
                  </ListItem>
                  {idx < cheatingAttempts.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          )}
        </Box>
      )}

      {/* Session Info Tab */}
      {activeTab === 2 && (
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          <TableContainer>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Session ID</TableCell>
                  <TableCell>{session.id}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Problem</TableCell>
                  <TableCell>{problem.title}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Start Time</TableCell>
                  <TableCell>
                    {new Date(session.start_time).toLocaleString()}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Time Limit</TableCell>
                  <TableCell>
                    {session.time_limit ? `${Math.floor(session.time_limit / 60)} minutes` : 'N/A'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Client IP</TableCell>
                  <TableCell>{session.client_ip || 'Unknown'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Interviewer Ready</TableCell>
                  <TableCell>
                    <Chip 
                      label={session.interviewer_ready ? 'Yes' : 'No'} 
                      size="small"
                      color={session.interviewer_ready ? 'success' : 'default'}
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Interviewee Started</TableCell>
                  <TableCell>
                    <Chip 
                      label={session.interviewee_started ? 'Yes' : 'No'} 
                      size="small"
                      color={session.interviewee_started ? 'success' : 'default'}
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Paper>
  )
}

