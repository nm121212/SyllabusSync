import React from 'react';
import {
  Avatar,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Typography,
} from '@mui/material';
import { LogoutOutlined, PersonOutline } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext.tsx';
import GoogleSignInButton from './GoogleSignInButton.tsx';

/**
 * Top-right auth widget used in the app shell. Two states:
 *   • Signed out → compact "Sign up / Sign in" Google OAuth button.
 *   • Signed in  → avatar menu (Settings + Sign out).
 *
 * We deliberately render nothing while the first session fetch is in
 * flight so there's no flicker from the auth button → avatar on every reload.
 */
const UserMenu: React.FC = () => {
  const { session, user, loading, signOut, configured } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

  if (loading) {
    return <Box sx={{ width: 40, height: 40 }} aria-hidden />;
  }

  if (!session) {
    return (
      <GoogleSignInButton
        size="small"
        variant="outlined"
        label={configured ? 'Sign up / Sign in' : 'Sign-in unavailable'}
      />
    );
  }

  const name =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email ??
    'You';
  const email = user?.email ?? '';
  const avatarUrl =
    (user?.user_metadata?.avatar_url as string | undefined) ??
    (user?.user_metadata?.picture as string | undefined);
  const initial = (name[0] || 'U').toUpperCase();

  const open = Boolean(anchorEl);
  const handleClose = () => setAnchorEl(null);

  return (
    <>
      <IconButton
        onClick={(e) => setAnchorEl(e.currentTarget)}
        size="small"
        sx={{
          p: 0.25,
          border: '1px solid rgba(139, 92, 246, 0.35)',
          '&:hover': { borderColor: 'rgba(139, 92, 246, 0.65)' },
        }}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar
          src={avatarUrl}
          alt={name}
          sx={{
            width: 32,
            height: 32,
            bgcolor: 'linear-gradient(135deg,#7c6cff,#3b82f6)',
            background: 'linear-gradient(135deg,#7c6cff,#3b82f6)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          {initial}
        </Avatar>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 240,
            background:
              'linear-gradient(180deg, rgba(26,23,51,0.96) 0%, rgba(20,17,39,0.96) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.22)',
            backdropFilter: 'blur(10px)',
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{name}</Typography>
          {email && email !== name && (
            <Typography
              sx={{
                fontSize: 12,
                color: 'var(--ss-text-mute)',
                wordBreak: 'break-all',
              }}
            >
              {email}
            </Typography>
          )}
        </Box>
        <Divider sx={{ borderColor: 'rgba(139, 92, 246, 0.12)' }} />
        <MenuItem
          onClick={() => {
            handleClose();
            window.location.href = '/settings';
          }}
        >
          <PersonOutline sx={{ mr: 1.25, fontSize: 20 }} />
          Settings
        </MenuItem>
        <MenuItem
          onClick={async () => {
            handleClose();
            await signOut();
          }}
          sx={{ color: '#ffb4b4' }}
        >
          <LogoutOutlined sx={{ mr: 1.25, fontSize: 20 }} />
          Sign out
        </MenuItem>
      </Menu>
    </>
  );
};

export default UserMenu;
