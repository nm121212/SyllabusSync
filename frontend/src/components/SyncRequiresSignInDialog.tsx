import React, { useCallback, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext.tsx';

/**
 * Shown when a signed-out user tries calendar sync. Supabase session is
 * required before Google Calendar OAuth and task push endpoints work.
 */
export const SyncRequiresSignInDialog: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const { signInWithGoogle, configured } = useAuth();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="sync-requires-signin-title"
      PaperProps={{ sx: { maxWidth: 420 } }}
    >
      <DialogTitle id="sync-requires-signin-title">Sign in to sync</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ lineHeight: 1.6 }}>
          {configured ? (
            <>
              Sign in with Google first. Then connect Calendar in Settings if
              you haven&rsquo;t already, and you can push tasks to your
              calendar.
            </>
          ) : (
            <>
              Google sign-in isn&rsquo;t configured in this environment yet.
              Ask an admin to set the Supabase environment variables.
            </>
          )}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} color="inherit">
          Not now
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            void signInWithGoogle();
            onClose();
          }}
          disabled={!configured}
        >
          Sign in with Google
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * Returns a guard: if the user has a Supabase session, runs `fn`;
 * otherwise opens the sign-in dialog. Skips while auth is still loading.
 */
export function useSyncSignInPrompt() {
  const { session, loading } = useAuth();
  const [open, setOpen] = useState(false);

  const guardOr = useCallback(
    async (fn: () => void | Promise<void>): Promise<boolean> => {
      if (loading) return false;
      if (!session) {
        setOpen(true);
        return false;
      }
      await fn();
      return true;
    },
    [session, loading]
  );

  return {
    guardOr,
    promptOpen: open,
    setPromptOpen: setOpen,
    /** True while the initial Supabase session fetch is in flight. */
    authLoading: loading,
  };
}
