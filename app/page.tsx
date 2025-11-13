'use client';

import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import {Code, Assessment, Security} from '@mui/icons-material';
import {LinkButton} from '@/components/link-button';
import {useAuth} from '@/lib/supabase/auth-context';

export default function HomePage() {
  const {user, loading} = useAuth();

  return (
    <Container maxWidth="lg" sx={{py: {xs: 6, sm: 8, md: 10}}}>
      <Box sx={{textAlign: 'center', mb: {xs: 8, sm: 10, md: 12}}}>
        <Typography
          variant="h2"
          component="h1"
          gutterBottom
          sx={{
            fontWeight: 700,
            mb: 2,
          }}>
          291Y Interview Platform
        </Typography>
        <Typography
          variant="h5"
          color="text.secondary"
          paragraph
          sx={{
            maxWidth: 700,
            mx: 'auto',
          }}>
          Modern LeetCode-style platform with cheating detection for interview
          environments
        </Typography>
      </Box>

      <Grid container spacing={4} sx={{mb: {xs: 8, sm: 10, md: 12}}}>
        <Grid item xs={12} sm={6} md={4}>
          <Card
            elevation={2}
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4,
              },
            }}>
            <CardContent sx={{flexGrow: 1}}>
              <Code sx={{fontSize: 48, color: 'primary.main', mb: 2}} />
              <Typography
                variant="h5"
                component="h2"
                gutterBottom
                sx={{fontWeight: 600}}>
                Problem Repository
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Browse and solve coding problems. Practice with Python code
                editor and test your solutions.
              </Typography>
            </CardContent>
            <CardActions sx={{px: 2, pb: 2}}>
              <LinkButton size="small" href="/problems">
                View Problems
              </LinkButton>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card
            elevation={2}
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4,
              },
            }}>
            <CardContent sx={{flexGrow: 1}}>
              <Assessment sx={{fontSize: 48, color: 'primary.main', mb: 2}} />
              <Typography
                variant="h5"
                component="h2"
                gutterBottom
                sx={{fontWeight: 600}}>
                Interview Platform
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Conduct or participate in coding interviews with real-time
                monitoring and cheating detection.
              </Typography>
            </CardContent>
            <CardActions sx={{px: 2, pb: 2}}>
              <LinkButton size="small" href="/interview">
                Start Interview
              </LinkButton>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card
            elevation={2}
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4,
              },
            }}>
            <CardContent sx={{flexGrow: 1}}>
              <Security sx={{fontSize: 48, color: 'primary.main', mb: 2}} />
              <Typography
                variant="h5"
                component="h2"
                gutterBottom
                sx={{fontWeight: 600}}>
                Security & Monitoring
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Advanced cheating detection with real-time alerts, IP tracking,
                and behavior analysis.
              </Typography>
            </CardContent>
            <CardActions sx={{px: 2, pb: 2}}>
              <LinkButton size="small" href="/dashboard">
                Dashboard
              </LinkButton>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      {/* Only show Login and Signup buttons if user is not logged in */}
      {!loading && !user && (
        <Box sx={{textAlign: 'center', mt: {xs: 6, sm: 8}}}>
          <LinkButton
            variant="contained"
            size="large"
            href="/login"
            sx={{mr: 2, mb: {xs: 2, sm: 0}}}>
            Login
          </LinkButton>
          <LinkButton variant="outlined" size="large" href="/signup">
            Sign Up
          </LinkButton>
        </Box>
      )}
    </Container>
  );
}
