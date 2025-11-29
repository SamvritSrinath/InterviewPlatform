import {Container, CircularProgress} from '@mui/material';

export default function Loading() {
  return (
    <Container maxWidth="lg" className="py-8 text-center">
      <CircularProgress />
    </Container>
  );
}
