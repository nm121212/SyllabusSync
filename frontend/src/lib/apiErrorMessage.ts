/** Standard copy when the backend rejects the request for auth reasons. */
export const MESSAGE_SIGN_IN_FIRST = 'Sign in with Google first.';

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

export function catchApiError(
  err: unknown,
  session: object | null | undefined,
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
