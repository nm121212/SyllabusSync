import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Avatar,
  Alert,
} from '@mui/material';
import {
  Person,
  Notifications,
  Download,
  Upload,
  Delete,
} from '@mui/icons-material';

const Settings: React.FC = () => {
  const [profile, setProfile] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
  });
  
  const [notifications, setNotifications] = useState({
    emailReminders: true,
    pushNotifications: true,
    weeklyDigest: false,
  });

  const [darkMode, setDarkMode] = useState(false);

  const handleSaveProfile = () => {
    console.log('Saving profile:', profile);
  };

  const handleExportData = () => {
    console.log('Exporting data...');
  };

  const handleImportData = () => {
    console.log('Importing data...');
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Settings
      </Typography>

      {/* Profile Settings */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Person />
            Profile Information
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
            <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: '2rem' }}>
              {profile.firstName[0]}{profile.lastName[0]}
            </Avatar>
            <Box>
              <Typography variant="h6">
                {profile.firstName} {profile.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {profile.email}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              label="First Name"
              value={profile.firstName}
              onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
              fullWidth
            />
            <TextField
              label="Last Name"
              value={profile.lastName}
              onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
              fullWidth
            />
          </Box>

          <TextField
            label="Email"
            value={profile.email}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            fullWidth
            sx={{ mb: 3 }}
            disabled
            helperText="Email cannot be changed as it's linked to your Google account"
          />

          <Button variant="contained" onClick={handleSaveProfile}>
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Notifications />
            Notification Preferences
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={notifications.emailReminders}
                  onChange={(e) => setNotifications({ ...notifications, emailReminders: e.target.checked })}
                />
              }
              label="Email reminders for upcoming deadlines"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={notifications.pushNotifications}
                  onChange={(e) => setNotifications({ ...notifications, pushNotifications: e.target.checked })}
                />
              }
              label="Browser push notifications"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={notifications.weeklyDigest}
                  onChange={(e) => setNotifications({ ...notifications, weeklyDigest: e.target.checked })}
                />
              }
              label="Weekly digest email"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3 }}>
            Appearance
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
              />
            }
            label="Dark mode"
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
            Switch between light and dark themes
          </Typography>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3 }}>
            Data Management
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExportData}
            >
              Export Data
            </Button>
            <Button
              variant="outlined"
              startIcon={<Upload />}
              onClick={handleImportData}
            >
              Import Data
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary">
            Export your tasks and settings as JSON, or import from a previous backup.
          </Typography>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card sx={{ border: '1px solid', borderColor: 'error.main' }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, color: 'error.main' }}>
            Danger Zone
          </Typography>

          <Alert severity="warning" sx={{ mb: 2 }}>
            These actions cannot be undone. Please be careful.
          </Alert>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
            >
              Delete All Tasks
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<Delete />}
            >
              Delete Account
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Settings;