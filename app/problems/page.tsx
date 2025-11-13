'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Container,
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
} from '@mui/material'
import { Problem } from '@/types/database'

export default function ProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  useEffect(() => {
    fetchProblems()
  }, [difficultyFilter, categoryFilter])

  const fetchProblems = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (difficultyFilter !== 'all') {
        params.append('difficulty', difficultyFilter)
      }
      if (categoryFilter !== 'all') {
        params.append('category', categoryFilter)
      }

      const response = await fetch(`/api/problems?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch problems')
      }

      setProblems(data.problems || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load problems')
    } finally {
      setLoading(false)
    }
  }

  const filteredProblems = problems.filter((problem) => {
    const matchesSearch = problem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      problem.description.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'success'
      case 'medium':
        return 'warning'
      case 'hard':
        return 'error'
      default:
        return 'default'
    }
  }

  if (loading) {
    return (
      <Container maxWidth="lg" className="py-8 text-center">
        <CircularProgress />
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, sm: 6, md: 8 } }}>
      <Typography 
        variant="h4" 
        component="h1" 
        gutterBottom
        sx={{ 
          mb: 4,
          fontWeight: 600,
        }}
      >
        Problem Repository
      </Typography>

      <Paper 
        elevation={2}
        sx={{ 
          p: 3,
          mb: 4,
          borderRadius: 2,
        }}
      >
        <Box 
          sx={{ 
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            alignItems: { xs: 'stretch', sm: 'center' },
          }}
        >
          <TextField
            label="Search problems"
            variant="outlined"
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            sx={{ 
              flexGrow: 1,
              minWidth: { xs: '100%', sm: 200 },
            }}
            placeholder="Search by title or description..."
          />
          <FormControl 
            sx={{ 
              minWidth: { xs: '100%', sm: 150 },
            }}
          >
            <InputLabel>Difficulty</InputLabel>
            <Select
              value={difficultyFilter}
              label="Difficulty"
              onChange={(e: any) => setDifficultyFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="easy">Easy</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="hard">Hard</MenuItem>
            </Select>
          </FormControl>
          <FormControl 
            sx={{ 
              minWidth: { xs: '100%', sm: 150 },
            }}
          >
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryFilter}
              label="Category"
              onChange={(e: any) => setCategoryFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 4 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <List sx={{ p: 0 }}>
          {filteredProblems.length === 0 ? (
            <ListItem>
              <ListItemText 
                primary="No problems found"
                sx={{ textAlign: 'center', py: 4 }}
              />
            </ListItem>
          ) : (
            filteredProblems.map((problem, index) => (
              <Link
                key={problem.id}
                href={`/problems/${problem.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <ListItem
                  sx={{
                    borderBottom: index < filteredProblems.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    py: 2,
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="h6" sx={{ fontWeight: 500, mb: 0.5 }}>
                        {problem.title}
                      </Typography>
                    }
                    secondary={
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ 
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {problem.description.replace(/<[^>]*>/g, '').substring(0, 150)}
                        {problem.description.length > 150 ? '...' : ''}
                      </Typography>
                    }
                    sx={{ flex: 1 }}
                  />
                  <Box sx={{ ml: 2, display: 'flex', gap: 1, flexShrink: 0 }}>
                    <Chip
                      label={problem.difficulty}
                      color={getDifficultyColor(problem.difficulty) as any}
                      size="small"
                      sx={{ fontWeight: 500 }}
                    />
                    {problem.category && (
                      <Chip
                        label={problem.category}
                        variant="outlined"
                        size="small"
                      />
                    )}
                  </Box>
                </ListItem>
              </Link>
            ))
          )}
        </List>
      </Paper>
    </Container>
  )
}

