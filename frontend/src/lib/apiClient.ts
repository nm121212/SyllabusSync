import { API_BASE_URL } from '../config/api.ts';

const TOKEN_KEY = 'syllabussync_token';

/**
 * Install a one-time fetch interceptor that injects the stored JWT as a
 * Bearer header on every request to the backend. Non-backend fetches pass
 * through untouched. Call once from src/index.tsx before the React tree mounts.
 */
export function installAuthFetch(): void {
  if (typeof window === 'undefined') return;
  const w = window as unknown as { __syllabusAuthFetchInstalled?: boolean };
  if (w.__syllabusAuthFetchInstalled) return;
  w.__syllabusAuthFetchInstalled = true;

  const originalFetch = window.fetch.bind(window);

  const isBackendUrl = (input: RequestInfo | URL): boolean => {
    try {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
          ? input.toString()
          : input.url;
      if (!url) return false;
      if (url.startsWith(API_BASE_URL)) return true;
      if (url.startsWith('/api/')) return true;
      return false;
    } catch {
      return false;
    }
  };

  window.fetch = async (input, init) => {
    if (!isBackendUrl(input)) {
      return originalFetch(input as RequestInfo, init);
    }

    let token: string | null = null;
    try {
      token = localStorage.getItem(TOKEN_KEY);
    } catch {}

    if (!token) {
      return originalFetch(input as RequestInfo, init);
    }

    const headers = new Headers(init?.headers || (input as Request).headers);
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return originalFetch(input as RequestInfo, { ...(init || {}), headers });
  };
}
