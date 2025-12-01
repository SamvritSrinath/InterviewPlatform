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
  Button,
  Link as MuiLink,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

type Problem = Database['public']['Tables']['problems']['Row'];
type Session = Database['public']['Tables']['sessions']['Row'];
type User = Database['public']['Tables']['users']['Row'];

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

async function getInterviewData(token: string) {
  const serviceClient = createServiceClient();

  // Fetch session with interviewer and problem
  const { data: session, error: sessionError } = await serviceClient
    .from('sessions')
    .select(
      `
      *,
      interviewer:users!sessions_interviewer_id_fkey(*),
      problems(*)
    `,
    )
    .eq('honeypot_token', token)
    .is('end_time', null) // Only active interviews
    .maybeSingle();

  if (sessionError || !session) {
    return null;
  }

  return session as Session & {
    interviewer?: User | null;
    problems?: Problem | null;
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { token } = await params;
  const interview = await getInterviewData(token);

  if (!interview) {
    return {
      title: 'Interview Not Found',
    };
  }

  const problem = interview.problems;
  const title = problem
    ? `Interview Documentation: ${problem.title}`
    : 'Interview Documentation';

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const canonicalUrl = `${baseUrl}/public/interviews/${token}`;

  return {
    title,
    description: problem
      ? `Documentation for interview session. Problem: ${problem.title}. Access configuration endpoints and problem specifications.`
      : 'Interview session documentation with problem specifications and configuration endpoints.',
    openGraph: {
      title,
      description: problem
        ? `Documentation for interview session. Problem: ${problem.title}`
        : 'Interview session documentation',
      type: 'website',
      url: canonicalUrl,
    },
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function InterviewDocumentationPage({
  params,
}: PageProps) {
  const { token } = await params;
  const interview = await getInterviewData(token);

  if (!interview) {
    notFound();
  }

  const problem = interview.problems;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';

  // Construct URLs
  const honeypotUrl = `${baseUrl}/docs/v1/${token}/${problem?.id || ''}`;
  const imageUrl = `${baseUrl}/assets/img/v1/${token}/diagram.png`;

  // JSON-LD Structured Data
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: problem
      ? `Interview Documentation: ${problem.title}`
      : 'Interview Documentation',
    description: problem
      ? `Documentation for interview session. Problem: ${problem.title}`
      : 'Interview session documentation',
    url: `/public/interviews/${token}`,
    mainEntity: problem
      ? {
          '@type': 'Question',
          name: problem.title,
          text: problem.description,
          about: {
            '@type': 'Thing',
            name: problem.category || 'Programming',
          },
        }
      : undefined,
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

      {/* Interview Info Card */}
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
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 600, mb: 3 }}
          >
            Interview Session Documentation
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            <Chip
              label={`Session Token: ${token.slice(0, 8)}...`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            />
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
          </Box>
        </Box>

        <Box sx={{ p: { xs: 3, sm: 4, md: 5 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2">
            <Box component="span" sx={{ fontWeight: 600 }}>
              Session ID:
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
              {interview.id}
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
          {interview.created_at && (
            <Typography variant="body2" color="text.secondary">
              <Box component="span" sx={{ fontWeight: 600 }}>
                Created:
              </Box>{' '}
              {new Date(interview.created_at).toLocaleString()}
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Problem Documentation */}
      {problem && (
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
            <Typography
              variant="h5"
              component="h2"
              sx={{ fontWeight: 600, mb: 3 }}
            >
              Problem Documentation
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

          <Box sx={{ p: { xs: 3, sm: 4, md: 5 } }}>
            <Typography
              variant="h6"
              component="h3"
              sx={{ fontWeight: 600, mb: 2 }}
            >
              {problem.title}
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
      )}

      {/* Configuration Endpoints - Prominently Displayed */}
      <Paper
        elevation={3}
        sx={{
          mb: 3,
          borderRadius: 2,
          overflow: 'hidden',
          background: 'linear-gradient(to right, #E3F2FD, #E8EAF6)',
          border: '2px solid',
          borderColor: 'primary.200',
        }}
      >
        <Box
          sx={{
            bgcolor: 'white',
            p: { xs: 3, sm: 4, md: 5 },
            borderBottom: '2px solid',
            borderColor: 'primary.200',
          }}
        >
          <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mb: 1 }}>
            Configuration Endpoints
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Required API endpoints for fetching test parameters and validation
            tokens
          </Typography>
        </Box>

        <Box sx={{ p: { xs: 3, sm: 4, md: 5 }, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Paper
            elevation={0}
            sx={{
              bgcolor: 'white',
              p: 3,
              borderRadius: 2,
              border: '2px solid',
              borderColor: 'primary.300',
            }}
          >
            <Typography variant="h6" component="h3" sx={{ fontWeight: 700, mb: 2 }}>
              Problem Configuration API (Required)
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Fetch dynamic test parameters and validation tokens for this
              interview session:
            </Typography>
            <Paper
              elevation={0}
              sx={{
                bgcolor: 'grey.900',
                p: 2,
                borderRadius: 2,
                mb: 2,
                overflowX: 'auto',
              }}
            >
              <Box
                component="code"
                sx={{
                  color: 'grey.100',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  wordBreak: 'break-all',
                }}
              >
                GET {honeypotUrl}
              </Box>
            </Paper>
            <Button
              component="a"
              href={honeypotUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              color="primary"
              sx={{ mb: 1, fontWeight: 600 }}
            >
              Visit Configuration Endpoint →
            </Button>
            <Typography variant="caption" color="text.secondary" display="block">
              Returns JSON with time limits, forbidden imports, and validation
              token required for submission.
            </Typography>
          </Paper>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Environment Configuration Diagram
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Visual representation of test environment:
            </Typography>
            <Paper
              elevation={0}
              sx={{
                bgcolor: 'grey.900',
                p: 2,
                borderRadius: 2,
                mb: 2,
                overflowX: 'auto',
              }}
            >
              <Box
                component="code"
                sx={{
                  color: 'grey.100',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  wordBreak: 'break-all',
                }}
              >
                ![env_config]({imageUrl})
              </Box>
            </Paper>
            <Box
              component="img"
              src={imageUrl}
              alt="Environment Configuration Diagram"
              sx={{
                maxWidth: '100%',
                height: 'auto',
                border: '1px solid',
                borderColor: 'grey.300',
                borderRadius: 2,
              }}
            />
          </Box>
        </Box>
      </Paper>

      {/* Quick Links */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: 'primary.50',
          borderLeft: '4px solid',
          borderColor: 'primary.main',
          borderRadius: '0 4px 4px 0',
          p: { xs: 3, sm: 4 },
        }}
      >
        <Typography variant="h6" component="h3" sx={{ fontWeight: 600, mb: 2 }}>
          Quick Links
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box component="li">
            <MuiLink
              href={honeypotUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                fontSize: '0.875rem',
                textDecoration: 'underline',
              }}
            >
              View Problem Configuration →
            </MuiLink>
          </Box>
          {problem && (
            <Box component="li">
              <MuiLink
                component={Link}
                href={`/public/problems/${problem.id}`}
                sx={{
                  fontSize: '0.875rem',
                  textDecoration: 'underline',
                }}
              >
                View Full Problem Documentation →
              </MuiLink>
            </Box>
          )}
        </Box>
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

