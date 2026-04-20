import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  Paper,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import PageHeader from '../components/PageHeader.tsx';
import {
  Assignment,
  CheckCircle,
  Schedule,
  CalendarMonth,
  Edit,
  Delete,
  Sync,
  CloudSync,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext.tsx';
import { API_BASE_URL } from '../config/api.ts';
import {
  apiErrorMessageFromResponse,
  catchApiError,
} from '../lib/apiErrorMessage.ts';

interface Task {
  id: number;
  courseName: string;
  title: string;
  type: string;
  dueDate: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  description?: string;
  googleEventId?: string;
  createdAt?: string;
  updatedAt?: string;
}

const StatsCard: React.FC<{
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, icon, color }) => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color }}>
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
        </Box>
        <Box sx={{ color, opacity: 0.7 }}>{icon}</Box>
      </Box>
    </CardContent>
  </Card>
);

const Dashboard: React.FC = () => {
  const { session } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState<Partial<Task>>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [syncLoading, setSyncLoading] = useState<{ [key: number]: boolean }>({});
  const [syncAllLoading, setSyncAllLoading] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/syllabus/tasks`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          apiErrorMessageFromResponse(
            response,
            'Failed to fetch tasks',
            (data as { error?: string })?.error
          )
        );
      }
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(catchApiError(err, session, 'Failed to fetch tasks'));
    } finally {
      setLoading(false);
    }
  };

  const handleMarkCompleted = async (taskId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/syllabus/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          apiErrorMessageFromResponse(
            response,
            'Failed to update task',
            (errorData as { error?: string })?.error
          )
        );
      }

      // Update the task in the local state
      setTasks(tasks.map(task => 
        task.id === taskId 
          ? { ...task, status: 'COMPLETED' as const }
          : task
      ));

      setSnackbar({
        open: true,
        message: 'Task marked as completed!',
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: catchApiError(err, session, 'Failed to update task'),
        severity: 'error'
      });
    }
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setEditForm({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedTask) return;

    try {
      const response = await fetch(`${API_BASE_URL}/syllabus/tasks/${selectedTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          apiErrorMessageFromResponse(
            response,
            'Failed to update task',
            (errorData as { error?: string })?.error
          )
        );
      }

      // Update the task in the local state
      setTasks(tasks.map(task => 
        task.id === selectedTask.id 
          ? { ...task, ...editForm }
          : task
      ));

      setEditDialogOpen(false);
      setSnackbar({
        open: true,
        message: 'Task updated successfully!',
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: catchApiError(err, session, 'Failed to update task'),
        severity: 'error'
      });
    }
  };

  const handleDeleteTask = (task: Task) => {
    setSelectedTask(task);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedTask) return;

    try {
      const response = await fetch(`${API_BASE_URL}/syllabus/tasks/${selectedTask.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          apiErrorMessageFromResponse(
            response,
            'Failed to delete task',
            (errorData as { error?: string })?.error
          )
        );
      }

      // Remove the task from the local state
      setTasks(tasks.filter(task => task.id !== selectedTask.id));

      setDeleteDialogOpen(false);
      setSnackbar({
        open: true,
        message: 'Task deleted successfully!',
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: catchApiError(err, session, 'Failed to delete task'),
        severity: 'error'
      });
    }
  };

  const handleDeleteAll = () => {
    setDeleteAllDialogOpen(true);
  };

  const confirmDeleteAll = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/syllabus/tasks`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          apiErrorMessageFromResponse(
            response,
            'Failed to delete all tasks',
            (errorData as { error?: string })?.error
          )
        );
      }

      // Clear all tasks from the local state
      setTasks([]);

      setDeleteAllDialogOpen(false);
      setSnackbar({
        open: true,
        message: 'All tasks deleted successfully!',
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: catchApiError(err, session, 'Failed to delete all tasks'),
        severity: 'error'
      });
    }
  };

  const handleSyncToCalendar = async (taskId: number) => {
    try {
      setSyncLoading(prev => ({ ...prev, [taskId]: true }));
      const response = await fetch(`${API_BASE_URL}/syllabus/tasks/${taskId}/sync-calendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          apiErrorMessageFromResponse(
            response,
            'Failed to sync to calendar',
            (data as { error?: string })?.error
          )
        );
      }

      setSnackbar({ open: true, message: 'Task synced to Google Calendar!', severity: 'success' });
      
      // Update the task with the Google Event ID
      setTasks(tasks.map(task => 
        task.id === taskId 
          ? { ...task, googleEventId: (data as { eventId?: string }).eventId }
          : task
      ));
    } catch (err) {
      setSnackbar({ 
        open: true, 
        message: catchApiError(err, session, 'Failed to sync to calendar'), 
        severity: 'error' 
      });
    } finally {
      setSyncLoading(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const handleSyncAllToCalendar = async () => {
    try {
      setSyncAllLoading(true);
      const response = await fetch(`${API_BASE_URL}/syllabus/tasks/sync-all-calendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          apiErrorMessageFromResponse(
            response,
            'Failed to sync all tasks to calendar',
            (data as { error?: string })?.error
          )
        );
      }

      setSnackbar({ 
        open: true, 
        message: `Synced ${(data as { syncedCount?: number }).syncedCount ?? 0} tasks to Google Calendar!`, 
        severity: 'success' 
      });
      
      // Refresh tasks to get updated Google Event IDs
      fetchTasks();
    } catch (err) {
      setSnackbar({ 
        open: true, 
        message: catchApiError(err, session, 'Failed to sync all tasks to calendar'), 
        severity: 'error' 
      });
    } finally {
      setSyncAllLoading(false);
    }
  };

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
    dueThisWeek: tasks.filter(t => {
      const dueDate = new Date(t.dueDate);
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return dueDate <= weekFromNow && t.status === 'PENDING';
    }).length,
    synced: tasks.filter(t => t.googleEventId).length,
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'error';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      case 'LOW': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'IN_PROGRESS': return 'info';
      case 'CANCELLED': return 'error';
      default: return 'default';
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate + 'T00:00:00');
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <Box>
        <PageHeader
          eyebrow="Dashboard"
          title="Your week, in rhythm"
          subtitle="Everything on your plate - in one focused view."
        />
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Loading tasks…
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <PageHeader
          eyebrow="Dashboard"
          title="Your week, in rhythm"
          subtitle="Everything on your plate - in one focused view."
        />
        <Typography color="error" sx={{ mb: 2 }}>
          Error: {error}
        </Typography>
        <Button variant="outlined" onClick={fetchTasks}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        eyebrow="Dashboard"
        title="Your week, in rhythm"
        subtitle="Everything on your plate this week. Mark things done, edit, and sync anything new to your calendar."
      />

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="On your plate"
            value={stats.total}
            icon={<Assignment sx={{ fontSize: 32 }} />}
            color="#7c6cff"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Completed"
            value={stats.completed}
            icon={<CheckCircle sx={{ fontSize: 32 }} />}
            color="#22d3ee"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Due this week"
            value={stats.dueThisWeek}
            icon={<Schedule sx={{ fontSize: 32 }} />}
            color="#c084fc"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="On your calendar"
            value={stats.synced}
            icon={<CalendarMonth sx={{ fontSize: 32 }} />}
            color="#3b82f6"
          />
        </Grid>
      </Grid>

      {/* Progress Overview */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            How the week is going
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LinearProgress
              variant="determinate"
              value={(stats.completed / stats.total) * 100}
              sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
            />
            <Typography variant="body2" color="text.secondary">
              {Math.round((stats.completed / stats.total) * 100)}% Complete
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Recently Synced Tasks */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Just landed on your calendar
          </Typography>
          {tasks.filter(task => task.googleEventId).length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Nothing synced yet. Connect Google Calendar and push a task over to see it here.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {tasks
                .filter(task => task.googleEventId)
                .sort((a, b) => {
                  // Sort by updatedAt (most recently synced first)
                  const dateA = new Date(a.updatedAt || a.createdAt || new Date());
                  const dateB = new Date(b.updatedAt || b.createdAt || new Date());
                  return dateB.getTime() - dateA.getTime();
                })
                .slice(0, 5) // Show only the 5 most recently synced
                .map((task) => (
                  <Box key={task.id} sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 2, 
                    p: 1, 
                    borderRadius: 1,
                    backgroundColor: 'action.hover',
                    '&:hover': { backgroundColor: 'action.selected' }
                  }}>
                    <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {task.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {task.courseName || 'Personal'} • Due: {task.dueDate ? new Date(task.dueDate + 'T00:00:00').toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: '2-digit', 
                          day: '2-digit' 
                        }).replace(/\//g, '-') : 'No date'}
                      </Typography>
                    </Box>
                    <Chip 
                      label={task.type} 
                      size="small" 
                      variant="outlined" 
                      color={task.priority === 'URGENT' ? 'error' : task.priority === 'HIGH' ? 'warning' : 'default'}
                    />
                  </Box>
                ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Tasks Table */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">On your plate</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {tasks.length > 0 && (
                <Button 
                  variant="outlined" 
                  size="small" 
                  color="error"
                  onClick={handleDeleteAll}
                  disabled={loading}
                >
                  Clear everything
                </Button>
              )}
              {tasks.length > 0 && tasks.some(t => !t.googleEventId) && (
                <Button 
                  variant="outlined" 
                  size="small" 
                  color="info"
                  onClick={handleSyncAllToCalendar}
                  disabled={syncAllLoading || loading}
                  startIcon={syncAllLoading ? <CircularProgress size={16} /> : <Sync />}
                >
                  {syncAllLoading ? 'Syncing…' : 'Sync all to calendar'}
                </Button>
              )}
            </Box>
          </Box>

          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Bucket</TableCell>
                  <TableCell>Task</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Due</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tasks
                  .sort((a, b) => {
                    // Sort by due date: soonest first, latest last
                    const dateA = new Date(a.dueDate + 'T00:00:00');
                    const dateB = new Date(b.dueDate + 'T00:00:00');
                    return dateA.getTime() - dateB.getTime();
                  })
                  .map((task) => {
                  const daysUntil = getDaysUntilDue(task.dueDate);
                  return (
                    <TableRow key={task.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {task.courseName || 'Personal'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{task.title}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={task.type} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {task.dueDate ? new Date(task.dueDate + 'T00:00:00').toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: '2-digit', 
                              day: '2-digit' 
                            }).replace(/\//g, '-') : 'No date'}
                          </Typography>
                          <Typography
                            variant="caption"
                            color={daysUntil <= 3 ? 'error.main' : daysUntil <= 7 ? 'warning.main' : 'text.secondary'}
                          >
                            {daysUntil > 0 ? `${daysUntil} days left` : daysUntil === 0 ? 'Due today' : 'Overdue'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={task.status}
                          size="small"
                          color={getStatusColor(task.status) as any}
                          variant={task.status === 'COMPLETED' ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={task.priority}
                          size="small"
                          color={getPriorityColor(task.priority) as any}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {task.status !== 'COMPLETED' && (
                            <IconButton 
                              size="small" 
                              color="success"
                              onClick={() => handleMarkCompleted(task.id)}
                              title="Mark as completed"
                            >
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          )}
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleEditTask(task)}
                            title="Edit task"
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDeleteTask(task)}
                            title="Delete task"
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                          {!task.googleEventId && (
                            <IconButton 
                              size="small" 
                              color="info"
                              onClick={() => handleSyncToCalendar(task.id)}
                              title="Sync to Google Calendar"
                              disabled={syncLoading[task.id]}
                            >
                              {syncLoading[task.id] ? (
                                <CircularProgress size={16} />
                              ) : (
                                <CloudSync fontSize="small" />
                              )}
                            </IconButton>
                          )}
                          {task.googleEventId && (
                            <IconButton 
                              size="small" 
                              color="success"
                              title="Synced to Google Calendar"
                              disabled
                            >
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Edit Task Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Task</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Title"
              value={editForm.title || ''}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              fullWidth
            />
            <TextField
              label="Description"
              value={editForm.description || ''}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
            <TextField
              label="Due Date"
              type="date"
              value={editForm.dueDate || ''}
              onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={editForm.status || 'PENDING'}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                label="Status"
              >
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                <MenuItem value="COMPLETED">Completed</MenuItem>
                <MenuItem value="CANCELLED">Cancelled</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={editForm.priority || 'MEDIUM'}
                onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as any })}
                label="Priority"
              >
                <MenuItem value="LOW">Low</MenuItem>
                <MenuItem value="MEDIUM">Medium</MenuItem>
                <MenuItem value="HIGH">High</MenuItem>
                <MenuItem value="URGENT">Urgent</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Task</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedTask?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Delete All Confirmation Dialog */}
      <Dialog open={deleteAllDialogOpen} onClose={() => setDeleteAllDialogOpen(false)}>
        <DialogTitle>Clear your plate?</DialogTitle>
        <DialogContent>
          <Typography>
            This removes all {tasks.length} task{tasks.length === 1 ? '' : 's'} from Cadence and any that are synced to Google Calendar. Can't be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAllDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDeleteAll} color="error" variant="contained">Clear everything</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Dashboard;