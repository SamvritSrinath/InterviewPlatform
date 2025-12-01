'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Container,
  Typography,
  Box,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  InputAdornment,
} from '@mui/material';
import { Search, Info, ArrowForward } from '@mui/icons-material';

interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  category: string | null;
}

export default function ArchivePage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch('/api/problems', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setProblems(data.problems || []);
      } catch (error) {
        console.error('Error fetching problems:', error);
        // Set empty array on error so UI still renders
        setProblems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProblems();
  }, []);

  const getDifficultyColor = (difficulty: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (difficulty?.toLowerCase()) {
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

  const filteredProblems = problems.filter((problem) => {
    const matchesSearch = 
      problem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      problem.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = difficultyFilter === 'all' || problem.difficulty?.toLowerCase() === difficultyFilter.toLowerCase();
    return matchesSearch && matchesDifficulty;
  });

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 3, sm: 4, md: 6 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 600,
            mb: 2,
          }}
        >
          Tech Interview Solutions Archive
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          This repository contains detailed solutions and explanations for advanced algorithmic problems
          commonly asked in technical interviews at top tech companies.
        </Typography>
        <Alert
          severity="info"
          icon={<Info />}
          sx={{
            borderLeft: '4px solid',
            borderColor: 'primary.main',
            bgcolor: 'primary.light',
            '& .MuiAlert-icon': {
              color: 'primary.main',
            },
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            <strong>Note:</strong> This archive is intended for educational purposes only. 
            Please do not share these solutions directly during interviews.
          </Typography>
        </Alert>
      </Box>

      {/* Search and Filter Section */}
      <Paper
        elevation={2}
        sx={{
          p: { xs: 3, sm: 4, md: 5 },
          borderRadius: 2,
          mb: 3,
        }}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Search Problems"
              placeholder="Search by title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Filter by Difficulty</InputLabel>
              <Select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                label="Filter by Difficulty"
                variant="outlined"
              >
                <MenuItem value="all">All Difficulties</MenuItem>
                <MenuItem value="easy">Easy</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="hard">Hard</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Problems List */}
      {loading ? (
        <Paper
          elevation={2}
          sx={{
            p: 8,
            textAlign: 'center',
            borderRadius: 2,
          }}
        >
          <CircularProgress sx={{ mb: 3 }} />
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 500 }}>
            Loading problems...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please wait while we fetch the latest problems
          </Typography>
        </Paper>
      ) : filteredProblems.length === 0 ? (
        <Paper
          elevation={2}
          sx={{
            p: 8,
            textAlign: 'center',
            borderRadius: 2,
          }}
        >
          <Alert severity={searchTerm || difficultyFilter !== 'all' ? 'info' : 'warning'} sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              No problems found
            </Typography>
            <Typography variant="body2">
              {searchTerm || difficultyFilter !== 'all' ? (
                'Try adjusting your search or filters to find what you\'re looking for.'
              ) : (
                'Unable to load problems. Please check your database connection.'
              )}
            </Typography>
          </Alert>
        </Paper>
      ) : (
        <Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 4,
              pb: 2,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Available Solutions
            </Typography>
            <Chip
              label={`${filteredProblems.length} ${filteredProblems.length === 1 ? 'Problem' : 'Problems'}`}
              color="primary"
              sx={{ fontWeight: 600 }}
            />
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {filteredProblems.map((problem) => (
              <Link
                key={problem.id}
                href={`/q/${problem.id}`}
                style={{ textDecoration: 'none' }}
              >
                <Card
                  elevation={2}
                  sx={{
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      elevation: 6,
                      transform: 'translateY(-4px)',
                      borderColor: 'primary.main',
                    },
                    border: '2px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                  }}
                >
                  <CardContent sx={{ p: { xs: 3, sm: 4, md: 5 } }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 2,
                        mb: 2,
                      }}
                    >
                      <Typography
                        variant="h6"
                        component="h3"
                        sx={{
                          fontWeight: 600,
                          flex: 1,
                          '&:hover': {
                            color: 'primary.main',
                          },
                          transition: 'color 0.2s',
                        }}
                      >
                        {problem.title}
                      </Typography>
                      <ArrowForward
                        sx={{
                          color: 'text.secondary',
                          transition: 'all 0.2s',
                          '&:hover': {
                            color: 'primary.main',
                            transform: 'translateX(4px)',
                          },
                        }}
                      />
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 3,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.7,
                      }}
                    >
                      {(() => {
                        const desc = problem.description || '';
                        const text = desc
                          .replace(/```[\s\S]*?```/g, '')
                          .replace(/`[^`]+`/g, '')
                          .replace(/#+\s+/g, '')
                          .replace(/\*\*([^*]+)\*\*/g, '$1')
                          .replace(/\*([^*]+)\*/g, '$1')
                          .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
                          .replace(/<[^>]*>/g, '')
                          .trim();
                        return text.length > 200 ? text.substring(0, 200) + '...' : text || 'No description available.';
                      })()}
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        flexWrap: 'wrap',
                        pt: 2,
                        borderTop: 1,
                        borderColor: 'divider',
                      }}
                    >
                      <Chip
                        label={problem.difficulty || 'Unknown'}
                        color={getDifficultyColor(problem.difficulty || 'unknown')}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          fontSize: '0.7rem',
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
                      <Box sx={{ flexGrow: 1 }} />
                      <Typography
                        variant="body2"
                        color="primary"
                        sx={{
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                        }}
                      >
                        View Solution
                        <ArrowForward sx={{ fontSize: '1rem' }} />
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </Box>
        </Box>
      )}
    </Container>
  );
}

