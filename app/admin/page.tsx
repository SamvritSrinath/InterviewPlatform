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
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {AdminPanelSettings, ExpandMore, Person, Warning} from '@mui/icons-material';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  is_interviewer: boolean;
  is_admin: boolean;
  created_at: string;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
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
    if (activeTab === 0) {
      fetchUsers();
    } else {
      fetchDashboardData();
    }
  }, [activeTab]);

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

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all sessions and cheating attempts (as admin, we get all)
      const [sessionsRes, attemptsRes, usersRes] = await Promise.all([
        fetch('/api/dashboard/sessions'),
        fetch('/api/dashboard/cheating'),
        fetch('/api/admin/users')
      ]);

      if (!sessionsRes.ok || !attemptsRes.ok || !usersRes.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const sessionsData = await sessionsRes.json();
      const attemptsData = await attemptsRes.json();
      const usersData = await usersRes.json();

      const sessions = sessionsData.sessions || [];
      const attempts = attemptsData.attempts || [];
      const allUsers = usersData.users || [];

      // Build lookup map for users
      const userMap = new Map(allUsers.map((u: User) => [u.id, u]));

      // Group by Interviewer -> Interviewee
      const hierarchy: Record<string, any> = {};

      sessions.forEach((session: any) => {
        const interviewerId = session.interviewer_id || 'unassigned';
        const intervieweeId = session.user_id;

        if (!hierarchy[interviewerId]) {
          hierarchy[interviewerId] = {
            interviewer: userMap.get(interviewerId),
            interviewees: {}
          };
        }

        if (!hierarchy[interviewerId].interviewees[intervieweeId]) {
          hierarchy[interviewerId].interviewees[intervieweeId] = {
            user: userMap.get(intervieweeId),
            sessions: [],
            attempts: []
          };
        }

        hierarchy[interviewerId].interviewees[intervieweeId].sessions.push(session);
      });

      // Distribute attempts
      attempts.forEach((attempt: any) => {
        // Find which interviewer this attempt belongs to via session
        // Note: attempting to find session in our hierarchy
        // This is inefficient but works for small data. Better to map session_id -> interviewer_id first.
        const session = sessions.find((s: any) => s.id === attempt.session_id);
        if (session) {
          const interviewerId = session.interviewer_id || 'unassigned';
          const intervieweeId = session.user_id;
          
          if (hierarchy[interviewerId]?.interviewees[intervieweeId]) {
            hierarchy[interviewerId].interviewees[intervieweeId].attempts.push(attempt);
          }
        }
      });

      setDashboardData(hierarchy);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      console.error('Error fetching dashboard data:', err);
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
      <Container maxWidth="xl" sx={{ py: { xs: 8, sm: 12, md: 16 }, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 4, sm: 6, md: 8 } }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <AdminPanelSettings sx={{fontSize: 40}} />
        <Typography variant="h4" component="h1">
          Admin Dashboard
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{mb: 3, borderBottom: 1, borderColor: 'divider'}}>
        <Tab label="User Management" />
        <Tab label="Interview Monitoring" />
      </Tabs>

      {activeTab === 0 ? (
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
      ) : (
        <Box>
          {!dashboardData || Object.keys(dashboardData).length === 0 ? (
             <Paper sx={{ p: 4, textAlign: 'center' }}>
               <Typography color="text.secondary">No interview sessions found.</Typography>
             </Paper>
          ) : (
            Object.entries(dashboardData).map(([interviewerId, data]: [string, any]) => (
              <Accordion key={interviewerId} defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Person color="primary" />
                    <Typography variant="h6">
                      Interviewer: {data.interviewer?.full_name || data.interviewer?.email || (interviewerId === 'unassigned' ? 'Unassigned' : 'Unknown')}
                    </Typography>
                    <Chip label={`${Object.keys(data.interviewees).length} Interviewees`} size="small" />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {Object.values(data.interviewees).map((intervieweeGroup: any) => (
                    <Paper key={intervieweeGroup.user?.id || 'unknown'} variant="outlined" sx={{ p: 2, mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          Interviewee: {intervieweeGroup.user?.full_name || intervieweeGroup.user?.email || intervieweeGroup.sessions[0]?.candidate_name || 'Anonymous Candidate'}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {intervieweeGroup.attempts.length > 0 && (
                            <Chip 
                              icon={<Warning />} 
                              label={`${intervieweeGroup.attempts.length} Cheating Alerts`} 
                              color="error" 
                              size="small" 
                            />
                          )}
                        </Box>
                      </Box>
                      
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Problem</TableCell>
                              <TableCell>Session Status</TableCell>
                              <TableCell>Started At</TableCell>
                              <TableCell>Cheating Alerts</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {intervieweeGroup.sessions.map((session: any) => {
                              // Filter attempts for this specific session
                              const sessionAttempts = intervieweeGroup.attempts.filter((a: any) => a.session_id === session.id);
                              return (
                                <TableRow key={session.id}>
                                  <TableCell>{session.problems?.title || 'Unknown'}</TableCell>
                                  <TableCell>
                                    <Chip 
                                      label={session.session_status} 
                                      size="small" 
                                      color={session.session_status === 'active' ? 'success' : 'default'}
                                    />
                                  </TableCell>
                                  <TableCell>{new Date(session.start_time).toLocaleString()}</TableCell>
                                  <TableCell>
                                    {sessionAttempts.length > 0 ? (
                                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                        {sessionAttempts.slice(0, 3).map((a: any) => (
                                          <Chip 
                                            key={a.id} 
                                            label={a.attempt_type} 
                                            color="error" 
                                            size="small" 
                                            variant="outlined" 
                                          />
                                        ))}
                                        {sessionAttempts.length > 3 && (
                                          <Chip label={`+${sessionAttempts.length - 3} more`} size="small" />
                                        )}
                                      </Box>
                                    ) : (
                                      <Typography variant="caption" color="text.secondary">None</Typography>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                  ))}
                </AccordionDetails>
              </Accordion>
            ))
          )}
        </Box>
      )}

      <Dialog
        open={editDialog.open}
        onClose={() => setEditDialog({open: false, user: null})}>
        <DialogTitle>Edit User Role</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
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
              sx={{ mb: 3, display: 'block' }}
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
