'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Database } from '@/lib/supabase/types';
import {
  Box,
  TextField,
  Typography,
  Grid,
  Paper,
  Chip,
  Button,
  Link as MuiLink,
} from '@mui/material';

type Session = Database['public']['Tables']['sessions']['Row'];
type User = Database['public']['Tables']['users']['Row'];

interface InterviewWithInterviewer extends Session {
  interviewer?: User | null;
}

interface InterviewsListProps {
  interviews: InterviewWithInterviewer[];
}

// Helper to get base URL
function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}

export function InterviewsList({ interviews }: InterviewsListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInterviews = useMemo(() => {
    if (!searchTerm) return interviews;

    const lowerSearch = searchTerm.toLowerCase();
    return interviews.filter(
      interview =>
        interview.id.toLowerCase().includes(lowerSearch) ||
        interview.honeypot_token.toLowerCase().includes(lowerSearch) ||
        interview.problem_id.toLowerCase().includes(lowerSearch) ||
        interview.client_ip?.toLowerCase().includes(lowerSearch) ||
        interview.interviewer?.email?.toLowerCase().includes(lowerSearch),
    );
  }, [interviews, searchTerm]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Search Bar */}
      <Paper
        elevation={2}
        sx={{
          p: { xs: 3, sm: 4 },
          borderRadius: 2,
        }}
      >
        <TextField
          fullWidth
          placeholder="Search by interview ID, token, problem ID, IP, or interviewer email..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          variant="outlined"
        />
      </Paper>

      {/* Results Count */}
      <Typography variant="body2" color="text.secondary">
        Showing {filteredInterviews.length} of {interviews.length} active
        interviews
      </Typography>

      {/* Interviews Grid */}
      {filteredInterviews.length === 0 ? (
        <Paper
          elevation={2}
          sx={{
            p: { xs: 6, sm: 8, md: 12 },
            textAlign: 'center',
            borderRadius: 2,
          }}
        >
          <Typography variant="body1" color="text.secondary">
            {searchTerm
              ? 'No interviews found matching your search.'
              : 'No active interviews at this time.'}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredInterviews.map(interview => (
            <Grid item xs={12} md={6} lg={4} key={interview.id}>
              <Paper
                elevation={2}
                sx={{
                  p: { xs: 3, sm: 4, md: 5 },
                  borderRadius: 2,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': {
                    boxShadow: 4,
                  },
                  transition: 'box-shadow 0.3s',
                }}
              >
                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="h6"
                    component="h3"
                    sx={{ fontWeight: 600, mb: 2 }}
                  >
                    Interview Session
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      <Box component="span" sx={{ fontWeight: 600 }}>
                        ID:
                      </Box>{' '}
                      <Box
                        component="code"
                        sx={{
                          fontSize: '0.75rem',
                          bgcolor: 'grey.100',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                        }}
                      >
                        {interview.id.slice(0, 8)}...
                      </Box>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <Box component="span" sx={{ fontWeight: 600 }}>
                        Token:
                      </Box>{' '}
                      <Box
                        component="code"
                        sx={{
                          fontSize: '0.75rem',
                          bgcolor: 'grey.100',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                        }}
                      >
                        {interview.honeypot_token.slice(0, 8)}...
                      </Box>
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Typography variant="body2">
                    <Box component="span" sx={{ fontWeight: 600 }}>
                      Problem ID:
                    </Box>{' '}
                    <Box
                      component="code"
                      sx={{
                        fontSize: '0.75rem',
                        bgcolor: 'grey.100',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                      }}
                    >
                      {interview.problem_id}
                    </Box>
                  </Typography>
                  {interview.client_ip && (
                    <Typography variant="body2" color="text.secondary">
                      <Box component="span" sx={{ fontWeight: 600 }}>
                        Client IP:
                      </Box>{' '}
                      {interview.client_ip}
                    </Typography>
                  )}
                  {interview.interviewer && (
                    <Typography variant="body2" color="text.secondary">
                      <Box component="span" sx={{ fontWeight: 600 }}>
                        Interviewer:
                      </Box>{' '}
                      {interview.interviewer.email || 'N/A'}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    <Box component="span" sx={{ fontWeight: 600 }}>
                      Created:
                    </Box>{' '}
                    {formatDate(interview.created_at)}
                  </Typography>
                  {interview.start_time && (
                    <Typography variant="body2" color="text.secondary">
                      <Box component="span" sx={{ fontWeight: 600 }}>
                        Started:
                      </Box>{' '}
                      {formatDate(interview.start_time)}
                    </Typography>
                  )}
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                  {interview.interviewer_ready && (
                    <Chip
                      label="Interviewer Ready"
                      size="small"
                      color="success"
                      sx={{ fontSize: '0.75rem' }}
                    />
                  )}
                  {interview.interviewee_started && (
                    <Chip
                      label="In Progress"
                      size="small"
                      color="primary"
                      sx={{ fontSize: '0.75rem' }}
                    />
                  )}
                  {interview.approved && (
                    <Chip
                      label="Approved"
                      size="small"
                      color="secondary"
                      sx={{ fontSize: '0.75rem' }}
                    />
                  )}
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 'auto' }}>
                  <Paper
                    elevation={0}
                    sx={{
                      bgcolor: 'primary.50',
                      p: 2,
                      borderRadius: 2,
                      border: '2px solid',
                      borderColor: 'primary.200',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 700, display: 'block', mb: 1 }}
                    >
                      Configuration API Endpoint (Required):
                    </Typography>
                    <Box
                      component="code"
                      sx={{
                        fontSize: '0.75rem',
                        display: 'block',
                        mb: 1.5,
                        bgcolor: 'white',
                        p: 1.5,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'grey.300',
                        wordBreak: 'break-all',
                      }}
                    >
                      {getBaseUrl()}/docs/v1/{interview.honeypot_token}/
                      {interview.problem_id}
                    </Box>
                    <Button
                      component="a"
                      href={`${getBaseUrl()}/docs/v1/${interview.honeypot_token}/${interview.problem_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="contained"
                      color="primary"
                      size="small"
                      sx={{ fontSize: '0.75rem', fontWeight: 600 }}
                    >
                      Open Configuration API →
                    </Button>
                  </Paper>
                  <MuiLink
                    component={Link}
                    href={`/public/interviews/${interview.honeypot_token}`}
                    sx={{
                      fontWeight: 500,
                      fontSize: '0.875rem',
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    View Full Documentation →
                  </MuiLink>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

