'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Typography,
  Box,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  FormControlLabel,
  Checkbox,
} from '@mui/material'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isInterviewer, setIsInterviewer] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            is_interviewer: isInterviewer,
          },
        },
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      if (data.user) {
        // Create user profile via API route (server-side)
        // IMPORTANT: API route ensures is_admin: false (no auto-admin)
        try {
          const profileResponse = await fetch('/api/users/create-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: data.user.id,
              email: data.user.email!,
              fullName: fullName || null,
              isInterviewer: isInterviewer,
            }),
          })

          if (!profileResponse.ok) {
            const errorData = await profileResponse.json().catch(() => ({}))
            console.error('Error creating user profile:', errorData.error || 'Unknown error')
            setError('Account created, but there was an issue setting up your profile. Please try logging in.')
            setLoading(false)
            return
          }

          const profileData = await profileResponse.json()
          
          // Check if email confirmation is required (session is null)
          if (!data.session) {
            // Email confirmation required
            setError('Account created! Please check your email to confirm your account before logging in.')
            setLoading(false)
            return
          }
          
          // Use the user data returned from create-profile
          if (profileData.user) {
            const user = profileData.user
            
            // Redirect based on role (admin should never be true from signup)
            if (user.is_admin) {
              router.push('/admin')
            } else if (user.is_interviewer) {
              router.push('/dashboard')
            } else {
              // Regular user - redirect to home page
              router.push('/')
            }
            router.refresh()
          } else {
            // Fallback: redirect to home page
            router.push('/')
            router.refresh()
          }
        } catch (err) {
          console.error('Error creating user profile:', err)
          setError('Account created, but there was an error. Please try logging in.')
        } finally {
          setLoading(false)
        }
      } else {
        setError('Failed to create account. Please try again.')
        setLoading(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <Paper 
      elevation={3}
      sx={{ 
        p: { xs: 4, sm: 6, md: 8 },
        borderRadius: 2,
        maxWidth: 480,
        mx: 'auto',
      }}
    >
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom 
          sx={{ 
            textAlign: 'center',
            fontWeight: 600,
            mb: 1,
          }}
        >
          Sign Up
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ 
            textAlign: 'center',
          }}
        >
          Create a new account
        </Typography>
      </Box>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          fullWidth
          label="Full Name"
          type="text"
          value={fullName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
          autoComplete="name"
          variant="outlined"
        />
        <TextField
          fullWidth
          label="Email"
          type="email"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          required
          autoComplete="email"
          variant="outlined"
        />
        <TextField
          fullWidth
          label="Password"
          type="password"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          helperText="Password must be at least 6 characters"
          variant="outlined"
        />
        <Box sx={{ 
          mt: 1, 
          mb: 1,
          p: 2,
          bgcolor: 'action.hover',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
        }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={isInterviewer}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsInterviewer(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                I am an interviewer
              </Typography>
            }
          />
        </Box>
        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          sx={{ 
            mt: 2,
            mb: 2,
            py: 1.5,
            fontSize: '1rem',
            fontWeight: 600,
          }}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Sign Up'}
        </Button>
        <Box sx={{ textAlign: 'center', mt: 1 }}>
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <Typography 
              variant="body2" 
              color="primary"
              sx={{ 
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              Already have an account? Login
            </Typography>
          </Link>
        </Box>
      </Box>
    </Paper>
  )
}

