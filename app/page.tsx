'use client';

import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  useTheme,
  alpha,
} from '@mui/material';
import {Code, Assessment, Security, ArrowForward} from '@mui/icons-material';
import {LinkButton} from '@/components/interview/link-button';
import {useAuth} from '@/lib/supabase/auth-context';

export default function HomePage() {
  const {user, loading} = useAuth();
  const theme = useTheme();

  return (
    <Box sx={{overflow: 'hidden'}}>
      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${alpha(
            theme.palette.primary.dark,
            0.95,
          )} 0%, ${alpha(theme.palette.primary.main, 0.8)} 100%)`,
          color: 'white',
          pt: {xs: 12, md: 20},
          pb: {xs: 12, md: 16},
          position: 'relative',
          clipPath: 'polygon(0 0, 100% 0, 100% 85%, 0 100%)',
        }}>
        <Container maxWidth="lg">
          <Box sx={{maxWidth: 800, mx: 'auto', textAlign: 'center'}}>
            <Typography
              variant="h1"
              component="h1"
              sx={{
                fontWeight: 800,
                fontSize: {xs: '2.5rem', md: '4rem'},
                mb: 3,
                textShadow: '0 4px 20px rgba(0,0,0,0.2)',
              }}>
              The Future of Technical Interviews
            </Typography>
            <Typography
              variant="h5"
              sx={{
                mb: 6,
                opacity: 0.9,
                fontWeight: 400,
                lineHeight: 1.6,
              }}>
              Advanced cheating detection, real-time monitoring, and a seamless
              coding environment. Ensure integrity in your hiring process.
            </Typography>
            {!loading && !user && (
              <Box sx={{display: 'flex', gap: 2, justifyContent: 'center'}}>
                <Button
                  variant="contained"
                  size="large"
                  href="/signup"
                  sx={{
                    bgcolor: 'white',
                    color: 'primary.main',
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    '&:hover': {
                      bgcolor: 'grey.100',
                    },
                  }}>
                  Get Started
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  href="/login"
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    '&:hover': {
                      borderColor: 'grey.100',
                      bgcolor: 'rgba(255,255,255,0.1)',
                    },
                  }}>
                  Login
                </Button>
              </Box>
            )}
            {user && (
              <Button
                variant="contained"
                size="large"
                href="/dashboard"
                endIcon={<ArrowForward />}
                sx={{
                  bgcolor: 'white',
                  color: 'primary.main',
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  '&:hover': {
                    bgcolor: 'grey.100',
                  },
                }}>
                Go to Dashboard
              </Button>
            )}
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{py: {xs: 10, md: 14}}}>
        <Grid container spacing={4}>
          {[
            {
              icon: <Assessment sx={{fontSize: 40}} />,
              title: 'Live Interviews',
              desc: 'Conduct real-time interviews with collaborative coding and video.',
              href: '/interview',
              action: 'Start Interview',
            },
            {
              icon: <Security sx={{fontSize: 40}} />,
              title: 'Advanced Security',
              desc: 'Detect AI usage, tab switching, and copy-pasting with our proprietary engine.',
              href: '/dashboard',
              action: 'View Dashboard',
            },
          ].map((feature, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 4,
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.08)',
                    borderColor: 'primary.light',
                  },
                }}>
                <CardContent sx={{flexGrow: 1, p: 4}}>
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: 3,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 3,
                    }}>
                    {feature.icon}
                  </Box>
                  <Typography
                    variant="h5"
                    component="h2"
                    gutterBottom
                    sx={{fontWeight: 700}}>
                    {feature.title}
                  </Typography>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{lineHeight: 1.7}}>
                    {feature.desc}
                  </Typography>
                </CardContent>
                <CardActions sx={{p: 4, pt: 0}}>
                  <LinkButton
                    href={feature.href}
                    endIcon={<ArrowForward />}
                    sx={{
                      fontWeight: 600,
                      '&:hover': {bgcolor: 'transparent', ml: 1},
                      transition: 'margin 0.2s',
                    }}>
                    {feature.action}
                  </LinkButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
