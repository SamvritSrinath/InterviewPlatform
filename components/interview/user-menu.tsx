'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Typography,
  Box,
  Divider,
  Chip,
  CircularProgress,
} from '@mui/material'
import {
  AccountCircle,
  Logout,
  Dashboard,
  AdminPanelSettings,
  Code,
} from '@mui/icons-material'
import { useAuth } from '@/lib/supabase/auth-context'
import Link from 'next/link'

export function UserMenu() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleNavigation = (path: string) => {
    handleClose()
    router.push(path)
  }

  const handleSignOut = async () => {
    handleClose()
    await signOut()
    router.push('/')
    router.refresh()
  }

  if (loading) {
    return (
      <IconButton color="inherit" disabled>
        <CircularProgress size={24} />
      </IconButton>
    )
  }

  // Only show login/signup if user is definitely not logged in
  // Check both user state and ensure we're not in a loading state
  if (!user && !loading) {
    // Hide auth links on interview pages to prevent distraction/confusion
    if (pathname?.startsWith('/interview/')) {
      return null
    }

    return (
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <Link 
          href="/login" 
          style={{ 
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <Typography 
            variant="body2" 
            sx={{ 
              px: 2,
              py: 1,
              borderRadius: 1,
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            Login
          </Typography>
        </Link>
        <Link 
          href="/signup" 
          style={{ 
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <Typography 
            variant="body2" 
            sx={{ 
              px: 2,
              py: 1,
              borderRadius: 1,
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            Sign Up
          </Typography>
        </Link>
      </Box>
    )
  }

  // If loading or user is null but we're still checking, show nothing or loading
  if (!user) {
    return null
  }

  return (
    <>
      <IconButton
        onClick={handleClick}
        size="small"
        sx={{ 
          ml: 2,
          border: '2px solid',
          borderColor: 'rgba(255, 255, 255, 0.3)',
          '&:hover': {
            borderColor: 'rgba(255, 255, 255, 0.5)',
            bgcolor: 'rgba(255, 255, 255, 0.1)',
          },
        }}
        aria-controls={open ? 'user-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
      >
        <Avatar 
          sx={{ 
            width: 36, 
            height: 36, 
            bgcolor: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            fontWeight: 600,
            border: '2px solid',
            borderColor: 'rgba(255, 255, 255, 0.3)',
          }}
        >
          {user.email?.[0]?.toUpperCase() || 'U'}
        </Avatar>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        id="user-menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        disableScrollLock
        PaperProps={{
          sx: {
            mt: 1.5,
            minWidth: 220,
            boxShadow: 3,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5, minWidth: 200 }}>
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600 }}>
            {user.full_name || user.email}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {user.email}
          </Typography>
          <Box sx={{ mt: 1.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {user.is_admin && (
              <Chip label="Admin" size="small" color="error" />
            )}
            {user.is_interviewer && (
              <Chip label="Interviewer" size="small" color="primary" />
            )}
          </Box>
        </Box>
        <Divider />
        <MenuItem
          onClick={() => {
            handleClose();
            window.open('/archive', '_blank');
          }}
          sx={{ py: 1.5 }}
        >
          <Code sx={{ mr: 1.5 }} fontSize="small" />
          Question Archive
        </MenuItem>
        {user.is_interviewer && (
          <MenuItem onClick={() => handleNavigation('/dashboard')} sx={{ py: 1.5 }}>
            <Dashboard sx={{ mr: 1.5 }} fontSize="small" />
            Dashboard
          </MenuItem>
        )}
        {user.is_admin && (
          <MenuItem onClick={() => handleNavigation('/admin')} sx={{ py: 1.5 }}>
            <AdminPanelSettings sx={{ mr: 1.5 }} fontSize="small" />
            Admin
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={handleSignOut} sx={{ py: 1.5 }}>
          <Logout sx={{ mr: 1.5 }} fontSize="small" />
          Logout
        </MenuItem>
      </Menu>
    </>
  )
}

