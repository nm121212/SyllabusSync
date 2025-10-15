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
    mode: 'dark',
    primary: {
      main: '#FF6B35', // Orange 600
      light: '#FF8A65', // Orange 300
      dark: '#E65100', // Orange 800
    },
    secondary: {
      main: '#FFB74D', // Orange 300
      light: '#FFCC80', // Orange 200
      dark: '#F57C00', // Orange 700
    },
    success: { main: '#4CAF50' },
    warning: { main: '#FF9800' },
    error: { main: '#F44336' },
    background: {
      default: '#121212', // Dark background
      paper: '#1E1E1E', // Slightly lighter for cards
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#B0B0B0',
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
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -1px rgb(0 0 0 / 0.2)',
          border: '1px solid rgba(255, 107, 53, 0.1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#1E1E1E',
          border: '1px solid rgba(255, 107, 53, 0.1)',
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          backgroundColor: '#1E1E1E',
          border: '1px solid rgba(255, 107, 53, 0.1)',
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