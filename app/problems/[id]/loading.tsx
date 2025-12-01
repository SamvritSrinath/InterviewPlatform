import {Container, CircularProgress, Box} from '@mui/material';

export default function Loading() {
  return (
    <Container maxWidth="xl" sx={{ py: { xs: 8, sm: 12, md: 16 }, textAlign: 'center' }}>
      <CircularProgress />
    </Container>
  );
}
