import React from 'react';
import { Box, Typography } from '@mui/material';

type CardProps = {
  children: React.ReactNode;
  sx?: Record<string, unknown>;
  id?: string;
};

export const Card: React.FC<CardProps> = ({ children, sx, id }) => (
  <Box
    id={id}
    sx={{
      borderRadius: 3,
      border: '1px solid rgba(139, 92, 246, 0.24)',
      background:
        'linear-gradient(180deg, rgba(26,23,51,0.78) 0%, rgba(20,17,39,0.52) 100%)',
      backdropFilter: 'blur(10px)',
      ...sx,
    }}
  >
    {children}
  </Box>
);

export const CardHeader: React.FC<{ children: React.ReactNode; sx?: Record<string, unknown> }> = ({
  children,
  sx,
}) => (
  <Box
    sx={{
      px: { xs: 2, md: 2.5 },
      pt: { xs: 2, md: 2.5 },
      pb: 1.25,
      ...sx,
    }}
  >
    {children}
  </Box>
);

export const CardTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography sx={{ fontSize: 18, fontWeight: 700 }}>{children}</Typography>
);

export const CardDescription: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography sx={{ fontSize: 13, color: 'var(--ss-text-mute)', mt: 0.5 }}>
    {children}
  </Typography>
);

export const CardContent: React.FC<{ children: React.ReactNode; sx?: Record<string, unknown> }> = ({
  children,
  sx,
}) => <Box sx={{ p: { xs: 2, md: 2.5 }, pt: 0, ...sx }}>{children}</Box>;
