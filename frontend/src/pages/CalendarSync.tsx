import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
} from '@mui/material';
import {
  CalendarMonth,
  CheckCircle,
  Error,
  Sync,
  Settings,
  Notifications,
} from '@mui/icons-material';

// Type declaration for process.env
declare const process: {
  env: {
    REACT_APP_API_BASE_URL?: string;
  };
};

const CalendarSync: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reminders, setReminders] = useState({
    sevenDays: true,
    threeDays: true,
    oneDay: true,
  });

  // Check calendar connection status on component mount
  React.useEffect(() => {
    checkCalendarStatus();
  }, []);

  const checkCalendarStatus = async () => {
    try {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api';
      const response = await fetch(`${apiBaseUrl}/syllabus/calendar/status`);
      const data = await response.json();
      setConnected(data.connected);
    } catch (err) {
      console.error('Failed to check calendar status:', err);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api';
      const response = await fetch(`${apiBaseUrl}/syllabus/auth/google/url`);
      const data = await response.json();
      
      if (data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      } else {
        setError('Failed to get Google OAuth URL');
      }
    } catch (err) {
      setError('Failed to connect to Google Calendar');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!connected) {
      setError('Please connect your Google Calendar first');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Get all tasks
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api';
      const tasksResponse = await fetch(`${apiBaseUrl}/syllabus/tasks`);
      const tasks = await tasksResponse.json();
      
      if (tasks.length === 0) {
        setError('No tasks found to sync');
        return;
      }
      
      // Group tasks by course
      const tasksByCourse = tasks.reduce((acc: any, task: any) => {
        const courseName = task.courseName || 'Unknown Course';
        if (!acc[courseName]) {
          acc[courseName] = [];
        }
        acc[courseName].push(task);
        return acc;
      }, {});
      
      // Sync each course's tasks
      for (const [courseName, courseTasks] of Object.entries(tasksByCourse)) {
        const syncResponse = await fetch(`${apiBaseUrl}/syllabus/generate-calendar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tasks: courseTasks,
            courseName: courseName,
          }),
        });
        
        if (!syncResponse.ok) {
          const errorData = await syncResponse.json();
          throw new (Error as any)((errorData as any).error || 'Failed to sync tasks');
        }
      }
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? (err as Error).message : 'Failed to sync tasks');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Calendar Sync
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Connection Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CalendarMonth sx={{ fontSize: 32, color: connected ? 'success.main' : 'grey.400' }} />
              <Box>
                <Typography variant="h6">
                  Google Calendar
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {connected ? 'Connected and ready to sync' : 'Not connected'}
                </Typography>
              </Box>
            </Box>
            {connected ? (
              <CheckCircle sx={{ color: 'success.main', fontSize: 32 }} />
            ) : (
              <Error sx={{ color: 'error.main', fontSize: 32 }} />
            )}
          </Box>

          {!connected ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              Connect your Google Calendar to automatically sync your academic tasks and deadlines.
            </Alert>
          ) : (
            <Alert severity="success" sx={{ mb: 2 }}>
              Your Google Calendar is connected! Tasks will be automatically synced.
            </Alert>
          )}

          <Button
            variant={connected ? 'outlined' : 'contained'}
            onClick={handleConnect}
            startIcon={<CalendarMonth />}
            color={connected ? 'error' : 'primary'}
            disabled={loading}
          >
            {loading ? 'Connecting...' : connected ? 'Disconnect Calendar' : 'Connect Google Calendar'}
          </Button>
        </CardContent>
      </Card>

      {/* Sync Settings */}
      {connected && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Settings />
              Sync Preferences
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                />
              }
              label="Automatically sync new tasks"
              sx={{ mb: 2 }}
            />

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Notifications />
              Default Reminders
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={reminders.sevenDays}
                    onChange={(e) => setReminders({ ...reminders, sevenDays: e.target.checked })}
                  />
                }
                label="7 days before due date"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={reminders.threeDays}
                    onChange={(e) => setReminders({ ...reminders, threeDays: e.target.checked })}
                  />
                }
                label="3 days before due date"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={reminders.oneDay}
                    onChange={(e) => setReminders({ ...reminders, oneDay: e.target.checked })}
                  />
                }
                label="1 day before due date"
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Sync Now */}
      {connected && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Manual Sync
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Sync all pending tasks to your Google Calendar now.
            </Typography>
            <Button
              variant="contained"
              onClick={handleSync}
              startIcon={<Sync />}
              disabled={loading}
            >
              {loading ? 'Syncing...' : 'Sync Now'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Sync Activity */}
      {connected && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Recent Sync Activity
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <CheckCircle sx={{ color: 'success.main' }} />
                </ListItemIcon>
                <ListItemText
                  primary="CS 3510 - Homework 1"
                  secondary="Synced 2 hours ago"
                />
                <Chip label="Synced" color="success" size="small" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircle sx={{ color: 'success.main' }} />
                </ListItemIcon>
                <ListItemText
                  primary="MUSI 3630 - Midterm Exam"
                  secondary="Synced 1 day ago"
                />
                <Chip label="Synced" color="success" size="small" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircle sx={{ color: 'success.main' }} />
                </ListItemIcon>
                <ListItemText
                  primary="HIST 2111 - Research Paper"
                  secondary="Synced 3 days ago"
                />
                <Chip label="Synced" color="success" size="small" />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default CalendarSync;