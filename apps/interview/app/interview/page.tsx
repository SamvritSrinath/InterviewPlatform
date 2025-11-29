'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  FormControlLabel,
  Checkbox,
  TextField,
  Snackbar,
} from '@mui/material'
import { PlayArrow, ContentCopy } from '@mui/icons-material'
import { Problem } from '@interview-platform/supabase-client'
import { useAuth } from '@/lib/supabase/auth-context'

export default function InterviewPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [problems, setProblems] = useState<Problem[]>([])
  const [selectedProblemId, setSelectedProblemId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [shareableLink, setShareableLink] = useState<string | null>(null)
  const [timeLimit, setTimeLimit] = useState<number | ''>('')
  
  // Derive interviewer status from auth context
  const isInterviewer = user ? (user.is_interviewer || user.is_admin) : false

  useEffect(() => {
    fetchProblems()
  }, [])

  const fetchProblems = async () => {
    try {
      setLoading(true)
      setError(null)
      const questionsAppUrl = process.env.NEXT_PUBLIC_QUESTIONS_APP_URL || 'http://localhost:3001'
      
      const response = await fetch(`${questionsAppUrl}/api/problems`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || `Failed to fetch problems: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      setProblems(data.problems || [])
      if (data.problems && data.problems.length > 0) {
        setSelectedProblemId(data.problems[0].id)
      }
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to load problems'
      
      // More helpful error message if it's a network error
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        setError(`Unable to connect to questions app. Make sure it's running on ${process.env.NEXT_PUBLIC_QUESTIONS_APP_URL || 'http://localhost:3001'}`)
      } else {
        setError(errorMessage)
      }
      console.error('Error fetching problems:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStartInterview = async () => {
    if (!selectedProblemId) return

    // Validate time limit
    if (timeLimit === '' || typeof timeLimit !== 'number' || timeLimit < 180) {
      setError('Time limit must be at least 180 seconds (3 minutes)')
      return
    }

    try {
      setStarting(true)
      setError(null)
      setShareableLink(null)

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: selectedProblemId,
          timeLimit: timeLimit,
          isPublic: true,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start interview')
      }

      // If public session, show shareable link
      if (data.shareableLink) {
        const fullLink = `${window.location.origin}${data.shareableLink}`
        setShareableLink(fullLink)
      } else {
        // Redirect to interview session page
        router.push(`/interview/${data.session.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start interview')
      console.error('Error starting interview:', err)
    } finally {
      setStarting(false)
    }
  }

  const handleCopyLink = async () => {
    if (shareableLink) {
      try {
        await navigator.clipboard.writeText(shareableLink)
        setError(null)
      } catch (err) {
        setError('Failed to copy link')
      }
    }
  }

  if (loading) {
    return (
      <Container maxWidth="md" className="py-16 text-center">
        <CircularProgress />
      </Container>
    )
  }

  if (error && problems.length === 0) {
    return (
      <Container maxWidth="md" className="py-16">
        <Alert severity="error">{error}</Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, sm: 6, md: 8 } }}>
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom
          sx={{ 
            fontWeight: 600,
            mb: 1,
          }}
        >
          Start Interview Session
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Select a problem to begin your interview
        </Typography>
      </Box>

      <Card 
        elevation={3}
        sx={{ 
          p: { xs: 3, sm: 4, md: 6 },
          borderRadius: 2,
        }}
      >
        <CardContent sx={{ p: 0 }}>
          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 4 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          <FormControl 
            fullWidth 
            sx={{ mb: 4 }}
          >
            <InputLabel>Select Problem</InputLabel>
            <Select
              value={selectedProblemId}
              onChange={(e: any) => setSelectedProblemId(e.target.value)}
              label="Select Problem"
              variant="outlined"
            >
              {problems.map((problem) => (
                <MenuItem key={problem.id} value={problem.id}>
                  {problem.title} ({problem.difficulty})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            type="number"
            label="Time Limit (seconds)"
            value={timeLimit}
            onChange={(e) => {
              const value = e.target.value
              setTimeLimit(value === '' ? '' : parseInt(value) || '')
            }}
            sx={{ mb: 4 }}
            helperText="Minimum: 180 seconds (3 minutes). Recommended: 1800 seconds (30 minutes)"
            variant="outlined"
            inputProps={{
              min: 180,
              step: 60,
            }}
            error={timeLimit !== '' && (typeof timeLimit !== 'number' || timeLimit < 180)}
          />

          {shareableLink && (
            <Alert 
              severity="success" 
              sx={{ mb: 4 }}
            >
              <Typography variant="body2" gutterBottom sx={{ fontWeight: 500 }}>
                Public session created! Share this link:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                <TextField
                  fullWidth
                  value={shareableLink}
                  size="small"
                  InputProps={{ readOnly: true }}
                  variant="outlined"
                />
                <Button
                  variant="outlined"
                  startIcon={<ContentCopy />}
                  onClick={handleCopyLink}
                  sx={{ flexShrink: 0 }}
                >
                  Copy
                </Button>
              </Box>
            </Alert>
          )}

          <Button
            variant="contained"
            fullWidth
            size="large"
            startIcon={<PlayArrow />}
            onClick={handleStartInterview}
            disabled={!selectedProblemId || starting || timeLimit === '' || (typeof timeLimit === 'number' && timeLimit < 180)}
            sx={{
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600,
              mt: 2,
            }}
          >
            {starting ? 'Starting...' : 'Create Public Session'}
          </Button>
        </CardContent>
      </Card>
    </Container>
  )
}

