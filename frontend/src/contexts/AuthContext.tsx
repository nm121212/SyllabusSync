import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.ts';

/**
 * Auth state for the app. Sourced from Supabase (`supabase.auth`), which is
 * the single source of truth: it does the Google OAuth dance, stores the
 * access token, refreshes it, and emits change events we subscribe to here.
 *
 * Consumers (AppShell, LandingPage, API client) read `session.access_token`
 * to authenticate calls to our Spring backend, which validates the JWT via
 * {@link com.syllabussync.security.SupabaseJwtFilter}.
 */
export interface AuthContextValue {
  /** `true` while the initial session fetch is in flight. */
  loading: boolean;
  /** Current Supabase session, or null when signed out. */
  session: Session | null;
  user: User | null;
  /** True iff the Supabase env vars are present; used to gate UI. */
  configured: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [session, setSession] = useState<Session | null>(null);

  /* Hydrate session on mount + subscribe to future changes. When the app
     boots after a Google redirect, supabase-js reads the fragment, clears
     it, and the `onAuthStateChange` callback fires with the new session. */
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<void> => {
    if (!supabase) {
      // eslint-disable-next-line no-alert
      window.alert(
        'Sign-in is not configured yet. Ask an admin to set REACT_APP_SUPABASE_URL + REACT_APP_SUPABASE_ANON_KEY.'
      );
      return;
    }
    const redirectTo = `${window.location.origin}/`;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        // Ask Google for a refresh token so Supabase can keep the session
        // alive without forcing the user through the consent screen again.
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      configured: isSupabaseConfigured,
      signInWithGoogle,
      signOut,
    }),
    [loading, session, signInWithGoogle, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>');
  }
  return ctx;
};
