import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import Sidebar from './components/Sidebar.tsx';
import TopBar from './components/TopBar.tsx';
import UploadStatusBar from './components/UploadStatusBar.tsx';
import Dashboard from './pages/Dashboard.tsx';
import UploadSyllabus from './pages/UploadSyllabus.tsx';
import CalendarSync from './pages/CalendarSync.tsx';
import { UploadProvider } from './contexts/UploadContext.tsx';

const theme = createTheme({
  palette: {
    primary: {
      main: '#4F46E5', // Indigo 600
      light: '#EEF2FF', // Indigo 50
    },
    success: { main: '#22C55E' },
    warning: { main: '#FACC15' },
    error: { main: '#EF4444' },
    background: {
      default: '#F8FAFC',
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        },
      },
    },
  },
});

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <UploadProvider>
        <Router>
          <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
              <Box component="main" sx={{ flexGrow: 1, p: 3, bgcolor: 'background.default' }}>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/upload" element={<UploadSyllabus />} />
                  <Route path="/calendar" element={<CalendarSync />} />
                </Routes>
              </Box>
            </Box>
            <UploadStatusBar />
          </Box>
        </Router>
      </UploadProvider>
    </ThemeProvider>
  );
};

export default App;