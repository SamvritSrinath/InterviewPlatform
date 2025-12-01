import {Container, CircularProgress} from '@mui/material';

export default function Loading() {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, sm: 6, md: 8 }, textAlign: 'center' }}>
      <CircularProgress />
    </Container>
  );
}
