import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, Typography, Container, Paper } from '@mui/material';

// Theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
  },
});

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h1" color="primary" gutterBottom>
              📚 SyllabusSync
            </Typography>
            <Typography variant="h3" color="text.secondary" gutterBottom>
              Intelligent Academic Task Management
            </Typography>
            <Typography variant="body1" sx={{ mt: 3, mb: 4 }}>
              Welcome to SyllabusSync! Your intelligent academic task management system is running successfully.
            </Typography>
            <Box sx={{ mt: 4, p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
              <Typography variant="h6" color="white">
                ✅ Backend API: Running on port 8080
              </Typography>
              <Typography variant="h6" color="white">
                ✅ Frontend UI: Running on port 3000
              </Typography>
              <Typography variant="h6" color="white">
                ✅ Database: H2 embedded database
              </Typography>
            </Box>
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Backend API: <a href="http://localhost:8080/api/health" target="_blank" rel="noopener noreferrer">http://localhost:8080/api/health</a>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                H2 Console: <a href="http://localhost:8080/h2-console" target="_blank" rel="noopener noreferrer">http://localhost:8080/h2-console</a>
              </Typography>
            </Box>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default App;
