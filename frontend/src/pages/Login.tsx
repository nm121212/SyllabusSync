import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Container,
  Grid,
} from '@mui/material';
import { Google } from '@mui/icons-material';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={6}>
            <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, justifyContent: { xs: 'center', md: 'flex-start' } }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                  }}
                >
                  📚
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  SyllabusSync
                </Typography>
              </Box>

              <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
                Upload your syllabus.
                <br />
                Never miss a deadline again.
              </Typography>

              <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary', fontSize: '1.1rem' }}>
                Automatically extract assignments, exams, and projects from your course syllabi
                and sync them directly to your Google Calendar with smart reminders.
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap', justifyContent: { xs: 'center', md: 'flex-start' } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
                  <Typography variant="body2">PDF & DOCX Support</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
                  <Typography variant="body2">Google Calendar Sync</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
                  <Typography variant="body2">Smart Reminders</Typography>
                </Box>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Card sx={{ maxWidth: 400, width: '100%' }}>
                <CardContent sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
                    Get Started
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 4, color: 'text.secondary' }}>
                    Sign in with your Google account to sync with Google Calendar
                  </Typography>

                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    startIcon={<Google />}
                    onClick={onLogin}
                    sx={{
                      py: 1.5,
                      bgcolor: 'primary.main',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      },
                    }}
                  >
                    Sign in with Google
                  </Button>

                  <Typography variant="caption" sx={{ mt: 3, display: 'block', color: 'text.secondary' }}>
                    By signing in, you agree to our Terms of Service and Privacy Policy
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Grid>
        </Grid>

        {/* Illustration */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            right: '10%',
            transform: 'translateY(-50%)',
            opacity: 0.1,
            fontSize: '200px',
            display: { xs: 'none', lg: 'block' },
          }}
        >
          📅
        </Box>
      </Container>
    </Box>
  );
};

export default Login;