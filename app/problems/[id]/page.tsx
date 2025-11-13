'use client';

import {useState, useEffect} from 'react';
import {useParams} from 'next/navigation';
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
} from '@mui/material';
import {PlayArrow} from '@mui/icons-material';
import {Problem} from '@/types/database';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
});

export default function ProblemDetailPage() {
  const params = useParams();
  const problemId = params.id as string;

  const [problem, setProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<string>('');

  useEffect(() => {
    if (problemId) {
      fetchProblem();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemId]);

  const fetchProblem = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/problems/${problemId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch problem');
      }

      setProblem(data.problem);
      setCode(data.problem.default_code || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load problem');
    } finally {
      setLoading(false);
    }
  };

  const handleRunCode = async () => {
    if (!problem || !code) return;

    try {
      setExecuting(true);
      setError(null);
      setOutput('');

      const response = await fetch('/api/code/execute', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          code,
          problemId: problem.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute code');
      }

      if (data.output) {
        setOutput(data.output);
      } else if (data.results) {
        const passedCount = data.results.filter(
          (r: {passed: boolean}) => r.passed,
        ).length;
        const totalCount = data.results.length;
        setOutput(
          `Tests passed: ${passedCount}/${totalCount}\n\n${JSON.stringify(
            data.results,
            null,
            2,
          )}`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute code');
    } finally {
      setExecuting(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'success';
      case 'medium':
        return 'warning';
      case 'hard':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" className="py-16 text-center">
        <CircularProgress />
      </Container>
    );
  }

  if (error && !problem) {
    return (
      <Container maxWidth="xl" className="py-16">
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!problem) {
    return (
      <Container maxWidth="xl" className="py-16">
        <Alert severity="info">Problem not found</Alert>
      </Container>
    );
  }

  // JSON-LD structured data for SEO and LLM discovery
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Code',
    name: problem.title,
    description: problem.description.replace(/<[^>]*>/g, '').substring(0, 200),
    programmingLanguage: 'Python',
    difficulty: problem.difficulty,
    category: problem.category || 'Programming',
    codeRepository: typeof window !== 'undefined' ? window.location.href : '',
    about: {
      '@type': 'Thing',
      name: 'Coding Problem',
      description: problem.description
        .replace(/<[^>]*>/g, '')
        .substring(0, 200),
    },
  };

  return (
    <Container maxWidth="xl" className="py-8">
      {/* JSON-LD structured data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{__html: JSON.stringify(structuredData)}}
      />

      <Box className="mb-6">
        <Typography variant="h4" component="h1" gutterBottom>
          {problem.title}
        </Typography>
        <Box className="flex gap-2 mb-4">
          <Chip
            label={problem.difficulty}
            color={
              getDifficultyColor(problem.difficulty) as
                | 'success'
                | 'warning'
                | 'error'
                | 'default'
            }
            size="small"
          />
          {problem.category && (
            <Chip label={problem.category} variant="outlined" size="small" />
          )}
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Problem Description */}
        <Grid item xs={12} md={4}>
          <Paper className="p-6 h-full overflow-auto max-h-[80vh]">
            <Box
              dangerouslySetInnerHTML={{__html: problem.description}}
              sx={{
                '& pre': {
                  backgroundColor: 'grey.100',
                  p: 2,
                  borderRadius: 1,
                  overflow: 'auto',
                },
              }}
            />
          </Paper>
        </Grid>

        {/* Code Editor */}
        <Grid item xs={12} md={8}>
          <Paper className="p-6 h-full flex flex-col">
            <Box className="mb-4 flex justify-between items-center">
              <Typography variant="h6">Code Editor</Typography>
              <Button
                variant="contained"
                startIcon={<PlayArrow />}
                onClick={handleRunCode}
                disabled={executing || !code}>
                {executing ? 'Running...' : 'Run Code'}
              </Button>
            </Box>

            <Box className="flex-grow mb-4 border border-divider rounded">
              <MonacoEditor
                height="400px"
                language="python"
                value={code}
                onChange={value => setCode(value || '')}
                theme="vs-dark"
                options={{
                  minimap: {enabled: true},
                  fontSize: 14,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </Box>

            {error && (
              <Alert severity="error" className="mb-4">
                {error}
              </Alert>
            )}

            {output && (
              <Paper className="p-4 bg-grey-900 text-green-400">
                <Typography
                  variant="body2"
                  component="pre"
                  className="font-mono whitespace-pre-wrap">
                  {output}
                </Typography>
              </Paper>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
