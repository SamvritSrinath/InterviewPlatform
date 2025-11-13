import {Container, CircularProgress} from '@mui/material';

export default function Loading() {
  return (
    <Container maxWidth="xl" className="py-16 text-center">
      <CircularProgress />
    </Container>
  );
}
