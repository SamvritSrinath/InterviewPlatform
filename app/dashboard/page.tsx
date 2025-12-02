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
  Collapse,
  IconButton,
} from '@mui/material'
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material'
import React from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/types'

export default function DashboardPage() {
  // Flat list of interviews with their cheating attempts
  const [interviews, setInterviews] = useState<Array<{
    session: any
    attempts: any[]
  }>>([])
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ message: string; severity: 'error' | 'warning' | 'info' | 'success' } | null>(null)
  
  const toggleRow = (sessionId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId)
    } else {
      newExpanded.add(sessionId)
    }
    setExpandedRows(newExpanded)
  }

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

      // Filter out tab-switch events from attempts
      const filteredAttempts = attempts.filter((attempt: any) => 
        attempt.attempt_type !== 'tab-switch'
      )

      // Sort sessions by created_at (temporal order, most recent first)
      const sortedSessions = [...sessions].sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || a.start_time || 0).getTime()
        const dateB = new Date(b.created_at || b.start_time || 0).getTime()
        return dateB - dateA // Descending order
      })

      // Create flat list: each session with its associated attempts
      const interviewsList = sortedSessions.map((session: any) => {
        const sessionAttempts = filteredAttempts.filter((attempt: any) => 
          attempt.session_id === session.id
        )
        return {
          session,
          attempts: sessionAttempts
        }
      })

      setInterviews(interviewsList)
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
          {interviews.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No interviews found.</Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 50 }}></TableCell>
                    <TableCell>Problem</TableCell>
                    <TableCell>Interviewer</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Started At</TableCell>
                    <TableCell>Client IP</TableCell>
                    <TableCell>Attack Modality</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {interviews.map(({ session, attempts }) => {
                    const attackModality = session.attack_modality || 'url_visitation'
                    const ocrEnabled = session.ocr_enabled || false
                    const isExpanded = expandedRows.has(session.id)
                    
                    // Analyze attempts for LLM detection
                    const honeypotAttempts = attempts.filter((a: any) => a.attempt_type === 'honeypot-access')
                    const copyPasteAttempts = attempts.filter((a: any) => a.attempt_type === 'copy-paste')
                    
                    // Extract LLM info from honeypot attempts
                    const llmInfo = honeypotAttempts.map((attempt: any) => {
                      const userAgent = (attempt.details as any)?.user_agent || 
                                      (attempt.details as any)?.userAgent || 
                                      (attempt.exposed_info as any)?.userAgent || 
                                      (attempt.exposed_info as any)?.user_agent ||
                                      'Unknown'
                      
                      let llmType = 'Unknown'
                      if (userAgent.includes('GoogleAgent')) {
                        llmType = 'Google (Bard/Gemini)'
                      } else if (userAgent.includes('ChatGPT-User') || userAgent.includes('OpenAI')) {
                        llmType = 'ChatGPT/OpenAI'
                      } else if (userAgent.includes('Qwen')) {
                        llmType = 'Qwen'
                      } else if (userAgent !== 'Unknown') {
                        llmType = 'LLM (Unknown)'
                      }
                      
                      const detectedIp = (attempt.details as any)?.ip || 
                                       (attempt.details as any)?.detected_ip || 
                                       'Unknown'
                      const intervieweeIp = session.client_ip || 'Unknown'
                      const ipMismatch = detectedIp !== 'Unknown' && intervieweeIp !== 'Unknown' && detectedIp !== intervieweeIp
                      
                      return {
                        llmType,
                        userAgent,
                        detectedIp,
                        intervieweeIp,
                        ipMismatch,
                        timestamp: attempt.detected_at
                      }
                    })
                    
                    return (
                      <React.Fragment key={session.id}>
                        <TableRow>
                          <TableCell>
                            {attempts.length > 0 && (
                              <IconButton
                                aria-label="expand row"
                                size="small"
                                onClick={() => toggleRow(session.id)}
                              >
                                {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                              </IconButton>
                            )}
                          </TableCell>
                          <TableCell>{session.problems?.title || 'Unknown Problem'}</TableCell>
                          <TableCell>
                            {session.interviewer?.full_name || session.interviewer?.email || 'Unknown'}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={session.session_status} 
                              size="small" 
                              color={session.session_status === 'active' ? 'success' : 'default'} 
                            />
                          </TableCell>
                          <TableCell>{new Date(session.start_time || session.created_at).toLocaleString()}</TableCell>
                          <TableCell>{session.client_ip || 'N/A'}</TableCell>
                          <TableCell>
                            <Chip 
                              label={attackModality === 'hyperlink_solution' ? 'Hyperlink Solution' : 'URL Visitation'} 
                              size="small" 
                              color={attackModality === 'hyperlink_solution' ? 'info' : 'default'}
                            />
                          </TableCell>
                        </TableRow>
                        {attempts.length > 0 && (
                          <TableRow>
                            <TableCell colSpan={7} sx={{ py: 0, border: 0 }}>
                              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                <Box sx={{ p: 2 }}>
                                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                                    Cheating Attempts ({attempts.length})
                                  </Typography>
                                  
                                  {/* OCR Status */}
                                  <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
                                      OCR Enabled:
                                    </Typography>
                                    <Chip label={ocrEnabled ? 'Yes' : 'No'} size="small" color={ocrEnabled ? 'info' : 'default'} />
                                  </Box>
                                  
                                  {/* LLM Detection Section */}
                                  {honeypotAttempts.length > 0 && (
                                    <Box sx={{ mb: 3 }}>
                                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: 'error.main' }}>
                                        LLM Detection ({honeypotAttempts.length} honeypot access{honeypotAttempts.length > 1 ? 'es' : ''})
                                      </Typography>
                                      {llmInfo.map((info, idx) => (
                                        <Alert 
                                          key={idx} 
                                          severity={info.llmType !== 'Unknown' ? 'error' : 'warning'} 
                                          sx={{ mb: 1 }}
                                        >
                                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {info.llmType !== 'Unknown' ? `LLM Detected: ${info.llmType}` : 'Honeypot Accessed'}
                                          </Typography>
                                          <Typography variant="caption" display="block">
                                            User Agent: {info.userAgent}
                                          </Typography>
                                          <Typography variant="caption" display="block">
                                            Detected IP: {info.detectedIp} | Interviewee IP: {info.intervieweeIp}
                                          </Typography>
                                          {info.ipMismatch && (
                                            <Typography variant="caption" display="block" sx={{ color: 'error.main', fontWeight: 600 }}>
                                              ⚠️ IP Mismatch - Strong indicator of LLM usage
                                            </Typography>
                                          )}
                                          <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                            Detected at: {new Date(info.timestamp).toLocaleString()}
                                          </Typography>
                                        </Alert>
                                      ))}
                                    </Box>
                                  )}
                                  
                                  {/* Copy-Paste Attempts */}
                                  {copyPasteAttempts.length > 0 && (
                                    <Box sx={{ mb: 2 }}>
                                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                                        Copy-Paste Events ({copyPasteAttempts.length})
                                      </Typography>
                                      {copyPasteAttempts.map((attempt: any) => (
                                        <Alert key={attempt.id} severity="warning" sx={{ mb: 1 }}>
                                          <Typography variant="body2">
                                            Copy-paste detected at: {new Date(attempt.detected_at).toLocaleString()}
                                          </Typography>
                                          {attempt.details?.copiedFrom && (
                                            <Typography variant="caption" display="block">
                                              Source: {attempt.details.copiedFrom}
                                            </Typography>
                                          )}
                                        </Alert>
                                      ))}
                                    </Box>
                                  )}
                                  
                                  {/* Other Attempts */}
                                  {attempts.filter((a: any) => 
                                    a.attempt_type !== 'honeypot-access' && a.attempt_type !== 'copy-paste'
                                  ).length > 0 && (
                                    <Box>
                                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                                        Other Events
                                      </Typography>
                                      {attempts.filter((a: any) => 
                                        a.attempt_type !== 'honeypot-access' && a.attempt_type !== 'copy-paste'
                                      ).map((attempt: any) => (
                                        <Alert key={attempt.id} severity="info" sx={{ mb: 1 }}>
                                          <Typography variant="body2">
                                            {attempt.attempt_type} at: {new Date(attempt.detected_at).toLocaleString()}
                                          </Typography>
                                        </Alert>
                                      ))}
                                    </Box>
                                  )}
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
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
