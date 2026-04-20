import React from 'react';
import { Button, CircularProgress } from '@mui/material';
import { useAuth } from '../contexts/AuthContext.tsx';

/** Inline SVG of the Google "G" mark so we don't pull in an extra icon pkg. */
const GoogleG: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    aria-hidden
    focusable="false"
  >
    <path
      fill="#FFC107"
      d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
    />
    <path
      fill="#FF3D00"
      d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.2 0 9.9-1.9 13.4-5.1l-6.2-5.2C29.3 35.5 26.8 36.5 24 36.5c-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.7l6.2 5.2C40.6 35.9 44 30.4 44 24c0-1.2-.1-2.3-.4-3.5z"
    />
  </svg>
);

export interface GoogleSignInButtonProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'contained' | 'outlined';
  fullWidth?: boolean;
  label?: string;
}

/**
 * Single source of truth for the "Sign in with Google" CTA. When signed
 * out, clicking hands control to Supabase's OAuth flow; when signed in
 * the caller should render something else (we return null here so the
 * button can't accidentally be shown twice).
 */
const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  size = 'large',
  variant = 'contained',
  fullWidth = false,
  label = 'Sign up with Google',
}) => {
  const { session, loading, signInWithGoogle, configured } = useAuth();
  const [clicking, setClicking] = React.useState(false);

  if (session) return null;

  const disabled = loading || !configured || clicking;

  const handleClick = async () => {
    setClicking(true);
    try {
      await signInWithGoogle();
    } finally {
      setClicking(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled}
      size={size}
      variant={variant}
      fullWidth={fullWidth}
      startIcon={
        clicking ? (
          <CircularProgress size={16} sx={{ color: 'inherit' }} />
        ) : (
          <GoogleG />
        )
      }
      sx={{
        fontWeight: 600,
        borderRadius: 999,
        px: 2.5,
        ...(variant === 'contained' && {
          background: 'linear-gradient(135deg,#7c6cff 0%,#3b82f6 100%)',
          color: '#fff',
          '&:hover': {
            background: 'linear-gradient(135deg,#8b7cff 0%,#4e90ff 100%)',
          },
        }),
        ...(variant === 'outlined' && {
          borderColor: 'rgba(139, 92, 246, 0.45)',
          color: '#fff',
          '&:hover': {
            borderColor: 'rgba(139, 92, 246, 0.85)',
            background: 'rgba(124,108,255,0.08)',
          },
        }),
      }}
    >
      {configured ? label : 'Sign-in unavailable'}
    </Button>
  );
};

export default GoogleSignInButton;
