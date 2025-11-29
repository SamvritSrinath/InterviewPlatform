'use client'

import { AppBar, Toolbar, Typography, Box, Container } from '@mui/material'
import { UserMenu } from './user-menu'
import Link from 'next/link'

export function Navbar() {
  return (
    <AppBar 
      position="static" 
      elevation={1}
      sx={{
        bgcolor: 'primary.main',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Container maxWidth="xl">
        <Toolbar 
          disableGutters 
          sx={{ 
            justifyContent: 'space-between',
            py: 1.5,
            minHeight: { xs: 56, sm: 64 },
          }}
        >
          <Link 
            href="/" 
            style={{ 
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: 600,
                cursor: 'pointer',
                '&:hover': {
                  opacity: 0.9,
                },
              }}
            >
              291Y Interview Platform
            </Typography>
          </Link>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <UserMenu />
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  )
}

