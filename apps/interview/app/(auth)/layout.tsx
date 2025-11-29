import { Container, Box } from '@mui/material'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Container 
      maxWidth="sm" 
      sx={{ 
        py: { xs: 4, sm: 6, md: 8 },
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box sx={{ width: '100%' }}>
        {children}
      </Box>
    </Container>
  )
}

