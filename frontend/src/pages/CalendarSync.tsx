import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  CalendarMonth,
  CheckCircle,
  Error as ErrorIcon,
  Sync,
} from '@mui/icons-material';
import PageHeader from '../components/PageHeader.tsx';
import { API_BASE_URL } from '../config/api.ts';

/**
 * Settings surface - formerly "Calendar" with a giant duplicate month
 * grid already present on the landing page. Now focused entirely on the
 * connection lifecycle:
 *   1. Connect / disconnect Google
 *   2. One-click sync everything
 *   3. A short "recently on your calendar" summary
 *
 * If you want to see the actual month grid, that lives on the landing
 * page (`/#calendar`).
 */

interface SyncedTask {
  id: number;
  title: string;
  courseName?: string;
  updatedAt?: string;
  createdAt?: string;
}

const CalendarSync: React.FC = () => {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [totalTasks, setTotalTasks] = useState(0);
  const [syncedTasks, setSyncedTasks] = useState<SyncedTask[]>([]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthErr = params.get('calendar_error');
    if (oauthErr) {
      setError(decodeURIComponent(oauthErr));
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('calendar_connected') === '1') {
      setSuccess('Google Calendar connected. New tasks will flow through.');
      window.history.replaceState({}, '', window.location.pathname);
    }
    checkCalendarStatus();
    fetchSyncedTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSyncedTasks = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/syllabus/tasks`);
      const tasks = await response.json();
      if (!Array.isArray(tasks)) return;
      setTotalTasks(tasks.length);
      const synced = tasks.filter((task: any) => task.googleEventId);
      setSyncedTasks(synced);
    } catch {
      /* non-fatal */
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)} min ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)} h ago`;
    return `${Math.floor(diffInSeconds / 86400)} d ago`;
  };

  const checkCalendarStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/syllabus/calendar/status`);
      const data = await response.json();
      setConnected(!!data.connected);
    } catch {
      setConnected(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      /* /api/auth/google/url is served by AuthController — it reads the
         current Supabase user from the JWT (via our fetch interceptor)
         and returns an authUrl whose `state` param is a signed JWT
         carrying that user id. The legacy `/syllabus/auth/google/url`
         endpoint was removed in the per-user refactor. */
      const response = await fetch(`${API_BASE_URL}/auth/google/url`);
      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setError('Couldn\u2019t get the Google sign-in link. Try again.');
      }
    } catch {
      setError(
        'Network error - check that the backend is running, then try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!connected) {
      setError('Connect Google Calendar first.');
      return;
    }
    setSyncing(true);
    setError(null);
    setSuccess(null);
    try {
      const tasksResponse = await fetch(`${API_BASE_URL}/syllabus/tasks`);
      const tasks = await tasksResponse.json();
      if (!Array.isArray(tasks) || tasks.length === 0) {
        setError('Nothing to sync yet - add a task first.');
        return;
      }

      const tasksByCourse = tasks.reduce((acc: any, task: any) => {
        const key = task.courseName || 'Personal';
        (acc[key] ||= []).push(task);
        return acc;
      }, {});

      for (const [bucket, bucketTasks] of Object.entries(tasksByCourse)) {
        const syncResponse = await fetch(
          `${API_BASE_URL}/syllabus/generate-calendar`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tasks: bucketTasks, courseName: bucket }),
          }
        );
        if (!syncResponse.ok) {
          const errorData = await syncResponse.json().catch(() => ({}));
          throw new Error(
            (errorData as any)?.error || 'Couldn\u2019t sync. Try again.'
          );
        }
      }

      setSuccess('Everything pushed to Google Calendar.');
      fetchSyncedTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn\u2019t sync.');
    } finally {
      setSyncing(false);
    }
  };

  const unsyncedCount = Math.max(totalTasks - syncedTasks.length, 0);

  return (
    <Box>
      <PageHeader
        eyebrow="Settings"
        title="Google Calendar"
        subtitle="Connect once. Every task Cadence adds - through chat, capture, or the + button - lands on your real calendar with reminders and colour coding."
      />

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}
      {success && (
        <Alert
          severity="success"
          sx={{ mb: 3 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      {/* Connection card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              mb: 2,
              flexWrap: 'wrap',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CalendarMonth
                sx={{
                  fontSize: 32,
                  color: connected ? 'success.main' : 'primary.light',
                }}
              />
              <Box>
                <Typography variant="h6">Google Calendar</Typography>
                <Typography
                  variant="body2"
                  sx={{ color: 'var(--ss-text-mute)' }}
                >
                  {connected === null
                    ? 'Checking connection\u2026'
                    : connected
                      ? 'Connected and ready to sync'
                      : 'Not connected'}
                </Typography>
              </Box>
            </Box>
            {connected === null ? (
              <CircularProgress size={24} />
            ) : connected ? (
              <CheckCircle sx={{ color: 'success.main', fontSize: 32 }} />
            ) : (
              <ErrorIcon sx={{ color: 'warning.main', fontSize: 32 }} />
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Button
              variant={connected ? 'outlined' : 'contained'}
              onClick={handleConnect}
              startIcon={<CalendarMonth />}
              color={connected ? 'primary' : 'primary'}
              disabled={loading}
            >
              {loading
                ? 'Connecting\u2026'
                : connected
                  ? 'Reconnect'
                  : 'Connect Google Calendar'}
            </Button>
            {connected && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleSync}
                startIcon={
                  syncing ? (
                    <CircularProgress size={18} sx={{ color: '#fff' }} />
                  ) : (
                    <Sync />
                  )
                }
                disabled={syncing || totalTasks === 0}
              >
                {syncing
                  ? 'Syncing\u2026'
                  : unsyncedCount > 0
                    ? `Sync ${unsyncedCount} pending`
                    : 'Re-sync everything'}
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Recent sync activity - only meaningful once connected */}
      {connected && (
        <Card>
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                mb: 2,
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Typography variant="h6">Recently on your calendar</Typography>
              <Typography
                variant="body2"
                sx={{ color: 'var(--ss-text-mute)' }}
              >
                {syncedTasks.length} of {totalTasks} synced
              </Typography>
            </Box>

            {syncedTasks.length === 0 ? (
              <Typography
                variant="body2"
                sx={{ color: 'var(--ss-text-mute)' }}
              >
                Nothing synced yet. Push a task from your plate and it will
                show up here.
              </Typography>
            ) : (
              <List dense>
                {syncedTasks
                  .sort((a, b) => {
                    const dateA = new Date(a.updatedAt || a.createdAt || 0);
                    const dateB = new Date(b.updatedAt || b.createdAt || 0);
                    return dateB.getTime() - dateA.getTime();
                  })
                  .slice(0, 8)
                  .map((task) => {
                    const syncTime = new Date(
                      task.updatedAt || task.createdAt || Date.now()
                    );
                    return (
                      <ListItem key={task.id} disableGutters>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <CheckCircle
                            sx={{ color: 'success.main', fontSize: 20 }}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={task.title}
                          secondary={`${task.courseName || 'Personal'} \u00b7 Synced ${getTimeAgo(syncTime)}`}
                        />
                        <Chip label="Synced" color="success" size="small" />
                      </ListItem>
                    );
                  })}
              </List>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default CalendarSync;
