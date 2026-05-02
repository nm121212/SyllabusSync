import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { API_BASE_URL } from '../config/api.ts';

const TOKEN_KEY = 'syllabussync_token';

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    picture?: string;
  };
}

export interface AuthContextValue {
  loading: boolean;
  /** Non-null when the user is signed in. Used as a truthy "is authenticated" check. */
  session: AuthUser | null;
  user: AuthUser | null;
  configured: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {}
}

function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    // 1. Check if Google just redirected back with a token in the URL.
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      storeToken(urlToken);
      // Remove ?token= from the address bar without a page reload.
      params.delete('token');
      const newSearch = params.toString();
      const newUrl = window.location.pathname + (newSearch ? '?' + newSearch : '') + window.location.hash;
      window.history.replaceState({}, '', newUrl);
    }

    // 2. Validate whichever token we now have (from URL or localStorage).
    const token = urlToken ?? getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }

    fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setUser({
            id: data.id,
            email: data.email,
            user_metadata: {
              full_name: data.name,
              name: data.name,
              avatar_url: data.avatar,
              picture: data.avatar,
            },
          });
        } else {
          clearToken();
        }
      })
      .catch(() => {
        clearToken();
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<void> => {
    window.location.href = `${API_BASE_URL}/auth/google/login`;
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session: user,
      user,
      configured: true,
      signInWithGoogle,
      signOut,
    }),
    [loading, user, signInWithGoogle, signOut]
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
