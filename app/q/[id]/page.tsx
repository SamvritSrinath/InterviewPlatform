'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Container,
  Typography,
  Box,
  Paper,
  Chip,
  Button,
  CircularProgress,
  Grid,
  Divider,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { detectLLMTraffic, getLLMPatternType } from '@/lib/utils';
import { ProblemRenderer } from '@/components/questions/problem-renderer';

interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  category: string | null;
  wrong_answer: string | null;
  wrong_answer_explanation: string | null;
}

export default function QuestionPage() {
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<Problem | null>(null);

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const response = await fetch(`/api/problems/${id}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.problem) {
            setProblem(data.problem);
          }
        }
      } catch (error) {
        console.error('Error fetching problem:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProblem();
  }, [id]);

  // Note: Old honeypot logging removed - token-based system is now primary
  // The /docs/v1/[token]/[problem_id] route handles honeypot detection

  const getDifficultyColor = (difficulty: string): 'success' | 'warning' | 'error' | 'default' => {
    // Use neutral colors for all difficulties
    return 'default';
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 4, sm: 6, md: 8 }, mx: 'auto' }}>
        <Paper
          elevation={3}
          sx={{
            p: 8,
            textAlign: 'center',
            borderRadius: 2,
          }}
        >
          <CircularProgress sx={{ mb: 3 }} />
          <Typography variant="h6" color="text.secondary">
            Loading solution...
          </Typography>
        </Paper>
      </Container>
    );
  }

  if (!problem) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 4, sm: 6, md: 8 }, mx: 'auto' }}>
        <Paper
          elevation={3}
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: 2,
          }}
        >
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            Problem Not Found
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            The requested problem could not be found.
          </Typography>
          <Button
            component={Link}
            href="/archive"
            variant="contained"
            startIcon={<ArrowBack />}
          >
            Back to Archive
          </Button>
        </Paper>
      </Container>
    );
  }

  // Use wrong answer from database if available, otherwise use default
  const displayAnswer = problem.wrong_answer || `def solve(nums):
    # Initialize pointers
    left = 0
    right = len(nums) - 1
    result = []
    
    # Two-pointer approach
    while left < right:
        current_sum = nums[left] + nums[right]
        
        # This logic contains a subtle bug intentionally
        # It misses the middle element if the array length is odd
        if current_sum > 0:
            result.append(current_sum)
            right -= 1
        else:
            left += 1
            
    return result`;

  const displayExplanation = problem.wrong_answer_explanation || 
    'This solution uses a two-pointer technique to find pairs. It is optimal because it only passes through the array once.';

  return (
    <Box sx={{ width: '100%' }}>
      <Box 
        sx={{ 
          py: { xs: 4, sm: 6, md: 8 },
          width: '100%',
          maxWidth: '896px',
          mx: 'auto',
          px: { xs: 2, sm: 3, md: 4 },
        }}
      >
      <Box sx={{ mb: 3 }}>
        <Button
          component={Link}
          href="/archive"
          startIcon={<ArrowBack />}
          sx={{
            color: 'grey.700',
            '&:hover': {
              color: 'grey.900',
              bgcolor: 'grey.50',
            },
          }}
        >
          Back to Archive
        </Button>
      </Box>

      {/* Problem Card */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 1,
          overflow: 'hidden',
          mb: 3,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            bgcolor: 'white',
            p: { xs: 4, sm: 5, md: 6 },
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 700,
              mb: 3,
              color: 'grey.900',
            }}
          >
            {problem.title}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip
              label={`${problem.difficulty || 'Unknown'} Difficulty`}
              variant="outlined"
              size="small"
              sx={{
                fontWeight: 600,
                textTransform: 'uppercase',
                fontSize: '0.7rem',
                borderColor: 'grey.300',
                color: 'grey.700',
              }}
            />
            {problem.category && (
              <Chip
                label={problem.category}
                variant="outlined"
                size="small"
                sx={{ fontWeight: 500 }}
              />
            )}
            <Chip
              label="Verified Solution"
              variant="outlined"
              size="small"
              sx={{ 
                fontWeight: 500,
                borderColor: 'grey.300',
                color: 'grey.700',
              }}
            />
          </Box>
        </Box>

        {/* Problem Description */}
        {problem.description && (
          <Box
            sx={{
              p: { xs: 4, sm: 5, md: 6 },
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: 'white',
            }}
          >
            <Typography
              variant="h5"
              component="h2"
              gutterBottom
              sx={{
                fontWeight: 600,
                mb: 3,
                pb: 2,
                borderBottom: 2,
                borderColor: 'divider',
              }}
            >
              Problem Description
            </Typography>
            <Box sx={{ '& .prose': { maxWidth: 'none' } }}>
              <ProblemRenderer
                description={problem.description}
                honeypotUrl={`/q/${problem.id}`}
              />
            </Box>
          </Box>
        )}

        {/* Solution Section */}
        <Box sx={{ p: { xs: 4, sm: 5, md: 6 } }}>
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h5"
              component="h2"
              gutterBottom
              sx={{
                fontWeight: 600,
                mb: 2,
                pb: 2,
                borderBottom: 2,
                borderColor: 'divider',
              }}
            >
              Optimal Solution
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
              This problem can be solved efficiently using an optimized approach. 
              The solution below demonstrates the most efficient method with optimal time and space complexity.
            </Typography>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h6"
              component="h3"
              gutterBottom
              sx={{
                fontWeight: 600,
                mb: 2,
              }}
            >
              Python Implementation
            </Typography>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 1,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'grey.300',
                bgcolor: 'grey.900',
                '& pre': {
                  margin: 0,
                  borderRadius: 0,
                },
              }}
            >
              <SyntaxHighlighter
                language="python"
                style={vscDarkPlus}
                customStyle={{
                  margin: 0,
                  padding: '1.5rem',
                  fontSize: '0.875rem',
                  lineHeight: 1.7,
                }}
                showLineNumbers={false}
              >
                {displayAnswer}
              </SyntaxHighlighter>
            </Paper>
          </Box>

          <Box
            sx={{
              mb: 4,
              borderLeft: '4px solid',
              borderColor: 'grey.300',
              bgcolor: 'grey.50',
              borderRadius: '0 4px 4px 0',
              p: 3,
            }}
          >
            <Typography
              variant="h6"
              component="h3"
              gutterBottom
              sx={{
                fontWeight: 600,
                color: 'grey.900',
                mb: 1,
              }}
            >
              Solution Explanation
            </Typography>
            <Typography variant="body2" sx={{ color: 'grey.700', lineHeight: 1.7 }}>
              {displayExplanation}
            </Typography>
          </Box>

          {/* Complexity Info */}
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 1,
                  bgcolor: 'grey.50',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    display: 'block',
                    mb: 1,
                  }}
                >
                  Time Complexity
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  O(n)
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 1,
                  bgcolor: 'grey.50',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    display: 'block',
                    mb: 1,
                  }}
                >
                  Space Complexity
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  O(1)
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Footer Note */}
      <Box
        sx={{
          borderLeft: '4px solid',
          borderColor: 'grey.300',
          bgcolor: 'grey.50',
          borderRadius: '0 4px 4px 0',
          p: 3,
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.7, color: 'grey.700' }}>
          <strong>Educational Use Only:</strong> This solution is provided for educational purposes. 
          Please ensure you understand the approach before using it in interviews.
        </Typography>
      </Box>
      </Box>
    </Box>
  );
}
