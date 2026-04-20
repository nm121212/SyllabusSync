import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Shared Supabase client for the browser. The URL + anon key live in
 * `REACT_APP_SUPABASE_URL` / `REACT_APP_SUPABASE_ANON_KEY` Vercel env vars.
 * If either is missing we return `null` rather than throwing — the UI reads
 * this and renders a "sign-in unavailable" fallback instead of a white
 * screen, which is what you want during the first-deploy window before
 * Supabase has been linked.
 */
const url = process.env.REACT_APP_SUPABASE_URL;
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        // We want the session to survive reloads (localStorage) but *not*
        // silently outlive an explicit sign-out across tabs.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null;
