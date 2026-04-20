import { API_BASE_URL } from '../config/api.ts';
import { supabase } from './supabaseClient.ts';

/**
 * Install a one-time `fetch` interceptor that injects the current Supabase
 * access token as a Bearer header on every request to our backend.
 *
 * Done as a global wrap (rather than touching every `fetch(...)` call site)
 * so existing code keeps working unchanged and *any* future fetch that hits
 * `API_BASE_URL` is automatically authenticated. Non-backend fetches (CDN
 * assets, third-party APIs) are passed through untouched.
 *
 * Call this once from `src/index.tsx` before the React tree mounts.
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
      // Relative /api/... calls also hit the backend via the dev proxy.
      if (url.startsWith('/api/')) return true;
      return false;
    } catch {
      return false;
    }
  };

  window.fetch = async (input, init) => {
    if (!isBackendUrl(input) || !supabase) {
      return originalFetch(input as RequestInfo, init);
    }

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
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
