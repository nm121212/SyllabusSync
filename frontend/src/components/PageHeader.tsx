import React from 'react';
import { Box, Typography } from '@mui/material';

interface PageHeaderProps {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}

/**
 * Shared dark/purple page header used by every internal app page so they all
 * blend into the landing page's visual language.
 */
const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  subtitle,
  actions,
}) => (
  <Box
    sx={{
      position: 'relative',
      mb: { xs: 4, md: 6 },
      display: 'flex',
      flexDirection: { xs: 'column', md: 'row' },
      alignItems: { xs: 'flex-start', md: 'flex-end' },
      justifyContent: 'space-between',
      gap: 3,
    }}
  >
    <Box>
      <span className="ss-eyebrow">
        <span className="ss-eyebrow-dot" aria-hidden />
        {eyebrow}
      </span>
      <Typography
        variant="h3"
        sx={{
          mt: 2,
          fontSize: { xs: 36, md: 48 },
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
        }}
        className="ss-gradient-text"
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography
          sx={{
            mt: 1.5,
            color: 'rgba(255,255,255,0.72)',
            fontSize: { xs: 14, md: 16 },
            maxWidth: 620,
            lineHeight: 1.6,
          }}
        >
          {subtitle}
        </Typography>
      )}
    </Box>
    {actions && (
      <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>{actions}</Box>
    )}
  </Box>
);

export default PageHeader;
