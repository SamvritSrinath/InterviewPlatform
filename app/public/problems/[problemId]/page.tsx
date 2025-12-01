import { Metadata } from 'next';
import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { Database } from '@/lib/supabase/types';
import { marked } from 'marked';
import { notFound } from 'next/navigation';
import {
  Container,
  Box,
  Typography,
  Paper,
  Chip,
  Link as MuiLink,
  Grid,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

type Problem = Database['public']['Tables']['problems']['Row'];
type Session = Database['public']['Tables']['sessions']['Row'];

interface PageProps {
  params: Promise<{
    problemId: string;
  }>;
}

async function getProblemData(problemId: string) {
  const serviceClient = createServiceClient();

  // Fetch problem
  const { data: problem, error: problemError } = await serviceClient
    .from('problems')
    .select('*')
    .eq('id', problemId)
    .single();

  if (problemError || !problem) {
    return null;
  }

  // Fetch all active sessions using this problem
  const { data: sessions } = await serviceClient
    .from('sessions')
    .select('id, honeypot_token, interviewer_id, client_ip, created_at')
    .eq('problem_id', problemId)
    .is('end_time', null) // Only active interviews
    .order('created_at', { ascending: false });

  return {
    problem: problem as Problem,
    sessions: (sessions || []) as Session[],
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { problemId } = await params;
  const data = await getProblemData(problemId);

  if (!data) {
    return {
      title: 'Problem Not Found',
    };
  }

  const { problem } = data;
  const title = `Problem Documentation: ${problem.title}`;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const canonicalUrl = `${baseUrl}/public/problems/${problemId}`;

  return {
    title,
    description: `Complete documentation for ${problem.title}. ${problem.difficulty} difficulty problem. Includes problem description, constraints, and related interview sessions with configuration endpoints.`,
    keywords: [
      problem.title,
      problem.difficulty || 'programming',
      problem.category || 'coding',
      'interview problem',
      'coding challenge',
      'algorithm',
    ],
    openGraph: {
      title,
      description: `Complete documentation for ${problem.title}. ${problem.difficulty} difficulty problem.`,
      type: 'website',
      url: canonicalUrl,
    },
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export default async function ProblemDocumentationPage({
  params,
}: PageProps) {
  const { problemId } = await params;
  const data = await getProblemData(problemId);

  if (!data) {
    notFound();
  }

  const { problem, sessions } = data;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';

  // JSON-LD Structured Data
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Problem Documentation: ${problem.title}`,
    description: `Complete documentation for ${problem.title}. ${problem.difficulty} difficulty problem.`,
    url: `/public/problems/${problemId}`,
    mainEntity: {
      '@type': 'Question',
      name: problem.title,
      text: problem.description,
      about: {
        '@type': 'Thing',
        name: problem.category || 'Programming',
      },
    },
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, sm: 4, md: 6 } }}>
      {/* Back Link */}
      <MuiLink
        component={Link}
        href="/public/interviews"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          mb: 3,
          textDecoration: 'none',
          color: 'text.secondary',
          '&:hover': {
            color: 'text.primary',
          },
        }}
      >
        <ArrowBack sx={{ mr: 1, fontSize: '1.25rem' }} />
        Back to All Interviews
      </MuiLink>

      {/* Problem Card */}
      <Paper
        elevation={2}
        sx={{
          mb: 3,
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: { xs: 3, sm: 4, md: 5 },
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 600, mb: 3 }}
          >
            {problem.title}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            <Chip
              label={`${problem.difficulty || 'Unknown'} Difficulty`}
              size="small"
              color={
                problem.difficulty?.toLowerCase() === 'easy'
                  ? 'success'
                  : problem.difficulty?.toLowerCase() === 'medium'
                  ? 'warning'
                  : problem.difficulty?.toLowerCase() === 'hard'
                  ? 'error'
                  : 'default'
              }
              sx={{ fontSize: '0.75rem' }}
            />
            {problem.category && (
              <Chip
                label={problem.category}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
          </Box>
        </Box>

        {/* Problem Description */}
        <Box sx={{ p: { xs: 3, sm: 4, md: 5 } }}>
          <Typography
            variant="h5"
            component="h2"
            sx={{ fontWeight: 600, mb: 3 }}
          >
            Problem Description
          </Typography>
          <Box
            sx={{
              '& p': { mb: 2 },
              '& ul, & ol': { mb: 2, pl: 3 },
              '& code': {
                bgcolor: 'grey.100',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontSize: '0.875rem',
              },
            }}
            dangerouslySetInnerHTML={{
              __html: marked.parse(problem.description || '') as string,
            }}
          />
        </Box>
      </Paper>

      {/* Active Interview Sessions */}
      {sessions.length > 0 && (
        <Paper
          elevation={2}
          sx={{
            mb: 3,
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              p: { xs: 3, sm: 4, md: 5 },
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 1 }}>
              Active Interview Sessions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {sessions.length} active session{sessions.length !== 1 ? 's' : ''} using this problem
            </Typography>
          </Box>

          <Box sx={{ p: { xs: 3, sm: 4, md: 5 } }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {sessions.map(session => (
                <Paper
                  key={session.id}
                  elevation={0}
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    '&:hover': {
                      bgcolor: 'grey.50',
                    },
                    transition: 'background-color 0.2s',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <Box component="span" sx={{ fontWeight: 600 }}>
                          Session:
                        </Box>{' '}
                        <Box
                          component="code"
                          sx={{
                            fontSize: '0.875rem',
                            bgcolor: 'grey.100',
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 1,
                          }}
                        >
                          {session.id.slice(0, 8)}...
                        </Box>
                      </Typography>
                      {session.client_ip && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          <Box component="span" sx={{ fontWeight: 600 }}>
                            Client IP:
                          </Box>{' '}
                          {session.client_ip}
                        </Typography>
                      )}
                      {session.created_at && (
                        <Typography variant="body2" color="text.secondary">
                          Created: {new Date(session.created_at).toLocaleString()}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, ml: 2 }}>
                      <MuiLink
                        component={Link}
                        href={`/public/interviews/${session.honeypot_token}`}
                        sx={{
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          textDecoration: 'none',
                          '&:hover': {
                            textDecoration: 'underline',
                          },
                        }}
                      >
                        View Documentation →
                      </MuiLink>
                      <MuiLink
                        href={`${baseUrl}/docs/v1/${session.honeypot_token}/${problemId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          textDecoration: 'none',
                          '&:hover': {
                            textDecoration: 'underline',
                          },
                        }}
                      >
                        Configuration API →
                      </MuiLink>
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Box>
          </Box>
        </Paper>
      )}

      {/* Problem Metadata */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: 'grey.50',
          borderLeft: '4px solid',
          borderColor: 'grey.400',
          borderRadius: '0 4px 4px 0',
          p: { xs: 3, sm: 4 },
        }}
      >
        <Typography variant="h6" component="h3" sx={{ fontWeight: 600, mb: 2 }}>
          Problem Information
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Problem ID
            </Typography>
            <Box
              component="code"
              sx={{
                bgcolor: 'white',
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                fontSize: '0.875rem',
              }}
            >
              {problem.id}
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Difficulty
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {problem.difficulty || 'N/A'}
            </Typography>
          </Grid>
          {problem.category && (
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Category
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {problem.category}
              </Typography>
            </Grid>
          )}
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Active Sessions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {sessions.length}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />
    </Container>
  );
}

