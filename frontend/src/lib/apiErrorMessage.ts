import type { Session } from '@supabase/supabase-js';

/** Standard copy when the backend rejects the request for auth reasons. */
export const MESSAGE_SIGN_IN_FIRST = 'Sign in with Google first.';

/**
 * Maps a failed API response to user-facing text. Always prefers sign-in
 * messaging for 401/403 so logged-out users are never told to "connect
 * Calendar" etc. before signing in.
 */
export function apiErrorMessageFromResponse(
  res: Response,
  fallback: string,
  bodyError?: string | null
): string {
  if (res.status === 401 || res.status === 403) {
    return MESSAGE_SIGN_IN_FIRST;
  }
  const trimmed = bodyError?.trim();
  if (trimmed) return trimmed;
  return fallback;
}

/**
 * Use in catch blocks for backend calls. If there is no session, every
 * failure is explained as needing sign-in first (per product request).
 */
export function catchApiError(
  err: unknown,
  session: Session | null,
  fallback: string
): string {
  if (!session) {
    return MESSAGE_SIGN_IN_FIRST;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}
