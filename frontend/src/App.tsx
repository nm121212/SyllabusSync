import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, Container } from '@mui/material';
import AppShell from './components/AppShell.tsx';
import UploadStatusBar from './components/UploadStatusBar.tsx';
import LandingPage from './pages/LandingPage.tsx';
import CalendarSync from './pages/CalendarSync.tsx';
import { UploadProvider } from './contexts/UploadContext.tsx';
import { TasksProvider } from './contexts/TasksContext.tsx';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7c6cff',
      light: '#a08fff',
      dark: '#5b4ce0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#c084fc',
      light: '#d8b4fe',
      dark: '#9333ea',
    },
    info: { main: '#3b82f6' },
    success: { main: '#22d3ee' },
    warning: { main: '#fbbf24' },
    error: { main: '#f472b6' },
    background: {
      default: '#07060d',
      paper: '#141127',
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255,255,255,0.72)',
    },
    divider: 'rgba(139, 92, 246, 0.18)',
  },
  typography: {
    fontFamily:
      '"Inter", "Space Grotesk", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.03em' },
    h2: { fontWeight: 800, letterSpacing: '-0.025em' },
    h3: { fontWeight: 700, letterSpacing: '-0.02em' },
    h4: { fontWeight: 700, letterSpacing: '-0.015em' },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 600, letterSpacing: '0.01em' },
  },
  shape: { borderRadius: 14 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: '#07060d' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 999,
          fontWeight: 600,
          paddingInline: 22,
          paddingBlock: 10,
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #7c6cff 0%, #6366f1 100%)',
          boxShadow: '0 10px 30px -12px rgba(124,108,255,0.7)',
          '&:hover': {
            background: 'linear-gradient(135deg, #8b7dff 0%, #6f73ff 100%)',
            boxShadow: '0 12px 34px -10px rgba(124,108,255,0.85)',
          },
        },
        outlined: {
          borderColor: 'rgba(139, 92, 246, 0.35)',
          color: '#ffffff',
          '&:hover': {
            borderColor: 'rgba(139, 92, 246, 0.7)',
            backgroundColor: 'rgba(124, 108, 255, 0.08)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          backgroundColor: 'rgba(20, 17, 39, 0.7)',
          backgroundImage: 'none',
          border: '1px solid rgba(139, 92, 246, 0.18)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 10px 40px -20px rgba(0,0,0,0.6)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(20, 17, 39, 0.7)',
          backgroundImage: 'none',
          border: '1px solid rgba(139, 92, 246, 0.14)',
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          backgroundColor: 'transparent',
          border: '1px solid rgba(139, 92, 246, 0.14)',
          borderRadius: 16,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(139, 92, 246, 0.12)',
        },
        head: {
          color: 'rgba(255,255,255,0.6)',
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          fontSize: 12,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 999, fontWeight: 500 },
        outlined: {
          borderColor: 'rgba(139, 92, 246, 0.35)',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          backgroundColor: 'rgba(10, 9, 20, 0.6)',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(139, 92, 246, 0.25)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(139, 92, 246, 0.5)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#7c6cff',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#141127',
          backgroundImage: 'none',
          border: '1px solid rgba(139, 92, 246, 0.25)',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          backgroundColor: 'rgba(139, 92, 246, 0.12)',
        },
        bar: {
          borderRadius: 999,
          background: 'linear-gradient(90deg, #7c6cff 0%, #3b82f6 100%)',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#1a1733',
          border: '1px solid rgba(139, 92, 246, 0.25)',
        },
      },
    },
  },
});

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <UploadProvider>
        <TasksProvider>
          <Router>
            <Box className="ss-app-bg">
              <AppShell>
                <Routes>
                    {/* Everything lives on the landing page except Settings
                        (Google Calendar connection + sync controls), which
                        stays as its own discrete surface. */}
                    <Route path="/" element={<LandingPage />} />
                    <Route
                      path="/settings"
                      element={
                        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
                          <CalendarSync />
                        </Container>
                      }
                    />
                    {/* Back-compat: old deep links redirect to the landing */}
                    <Route path="/dashboard" element={<Navigate to="/" replace />} />
                    <Route path="/upload" element={<Navigate to="/#capture" replace />} />
                    <Route path="/chatbot" element={<Navigate to="/#chat" replace />} />
                    <Route path="/calendar" element={<Navigate to="/settings" replace />} />
                </Routes>
              </AppShell>
              <UploadStatusBar />
            </Box>
          </Router>
        </TasksProvider>
      </UploadProvider>
    </ThemeProvider>
  );
};

export default App;
