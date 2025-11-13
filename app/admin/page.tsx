'use client';

import {useState, useEffect} from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {AdminPanelSettings} from '@mui/icons-material';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  is_interviewer: boolean;
  is_admin: boolean;
  created_at: string;
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    user: User | null;
  }>({
    open: false,
    user: null,
  });
  const [editForm, setEditForm] = useState({
    is_interviewer: false,
    is_admin: false,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/users');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users');
      }

      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditForm({
      is_interviewer: user.is_interviewer,
      is_admin: user.is_admin,
    });
    setEditDialog({open: true, user});
  };

  const handleSaveUser = async () => {
    if (!editDialog.user) return;

    try {
      setUpdating(editDialog.user.id);
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          userId: editDialog.user.id,
          is_interviewer: editForm.is_interviewer,
          is_admin: editForm.is_admin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user');
      }

      setEditDialog({open: false, user: null});
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
      console.error('Error updating user:', err);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" className="py-16 text-center">
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" className="py-8">
      <Box className="mb-8 flex items-center gap-4">
        <AdminPanelSettings sx={{fontSize: 40}} />
        <Typography variant="h4" component="h1">
          Admin Dashboard
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" className="mb-6" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Full Name</TableCell>
                <TableCell>Interviewer</TableCell>
                <TableCell>Admin</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map(user => (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.full_name || 'N/A'}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.is_interviewer ? 'Yes' : 'No'}
                      color={user.is_interviewer ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.is_admin ? 'Yes' : 'No'}
                      color={user.is_admin ? 'error' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleEditUser(user)}
                      disabled={updating === user.id}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog
        open={editDialog.open}
        onClose={() => setEditDialog({open: false, user: null})}>
        <DialogTitle>Edit User Role</DialogTitle>
        <DialogContent>
          <Box className="pt-4">
            <Typography variant="body2" color="text.secondary" className="mb-4">
              {editDialog.user?.email}
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={editForm.is_interviewer}
                  onChange={e =>
                    setEditForm({...editForm, is_interviewer: e.target.checked})
                  }
                />
              }
              label="Interviewer"
              className="mb-4 block"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={editForm.is_admin}
                  onChange={e =>
                    setEditForm({...editForm, is_admin: e.target.checked})
                  }
                />
              }
              label="Admin"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({open: false, user: null})}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveUser}
            variant="contained"
            disabled={updating !== null}>
            {updating ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
