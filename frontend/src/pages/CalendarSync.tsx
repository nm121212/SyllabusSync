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

const CalendarSync: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [reminders, setReminders] = useState({
    sevenDays: true,
    threeDays: true,
    oneDay: true,
  });

  const handleConnect = () => {
    // Mock Google OAuth flow
    setConnected(true);
  };

  const handleSync = () => {
    // Mock sync operation
    console.log('Syncing tasks to calendar...');
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Calendar Sync
      </Typography>

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
          >
            {connected ? 'Disconnect Calendar' : 'Connect Google Calendar'}
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
            >
              Sync Now
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