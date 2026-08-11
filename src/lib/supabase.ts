import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

/**
 * The ONE Supabase client for the app (Phase 1 of the Supabase pivot).
 *
 * Reads `EXPO_PUBLIC_SUPABASE_URL` / `_ANON_KEY` — the publishable (RLS-scoped) key, inlined into the
 * client bundle by Expo. The service_role key is NEVER referenced here. Sessions persist via
 * AsyncStorage so "self" survives reloads as a real `auth.uid()` (retiring the `?as=` demo override).
 *
 * `detectSessionInUrl` is off — there's no web OAuth redirect flow; auth is email/password (Phase 1).
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fail loud in dev rather than silently pointing at nothing — copy .env.example → .env.
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY — see .env.example');
}

// Expo static rendering evaluates this module in Node (no `window`). The auth client's initialize()
// eagerly reads storage → AsyncStorage(web) → `window.localStorage`, which throws server-side. So on
// the server give it a no-op storage and skip persistence; the real client (browser/native) gets full
// AsyncStorage persistence. An environment guard, not a preview shim.
const isServer = typeof window === 'undefined';
const noopStorage = {
  getItem: async () => null,
  setItem: async () => undefined,
  removeItem: async () => undefined,
};

/**
 * ⚠ AUTH REQUESTS GET A DEADLINE. NOTHING ELSE DOES.
 *
 * This is the fix for "tapped a push and the app sat on the boot spinner forever" (PO, 2026-08-10).
 *
 * `getSession()` does not read storage and return — it awaits `initializePromise`, which awaits
 * `_recoverAndRefresh()`, which awaits `POST /auth/v1/token` whenever the stored access token is inside
 * its expiry margin. auth-js passes NO timeout to fetch, and its retry loop is bounded by ELAPSED time,
 * so a request that never settles is never retried and never abandoned — it just hangs, holding
 * `initializePromise` and therefore every later auth call behind it.
 *
 * `AuthProvider` maps that to `loading`, and `routeFor` maps `loading` to 'splash' — a screen with no
 * escape hatch. So one stalled socket = a permanently frozen app that cannot recover even when the
 * network comes back. A push tap is the reliable way to hit it: the phone has been asleep long enough
 * for the token to expire, and the very first request goes out over a radio that is still coming up.
 *
 * SCOPED TO `/auth/v1/` ON PURPOSE. `global.fetch` is shared with PostgREST and Storage (supabase-js
 * hands the same wrapper to all three), and a blanket deadline here would abort long video check-in and
 * transformation-photo uploads mid-flight. Every auth endpoint is a small POST; nothing legitimate on
 * that path needs ten seconds.
 *
 * With a deadline, a stalled refresh becomes an ordinary retryable fetch error: `_recoverAndRefresh`
 * carries on, `initializePromise` resolves, and boot proceeds to sign-in instead of to a spinner.
 */
const AUTH_TIMEOUT_MS = 10_000;

const urlOf = (input: RequestInfo | URL): string =>
  typeof input === 'string' ? input : typeof (input as Request).url === 'string' ? (input as Request).url : String(input);

const timedFetch: typeof fetch = (input, init) => {
  if (!urlOf(input).includes('/auth/v1/')) return fetch(input, init);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
  // A caller's own signal still has to work — ours replaces it on the request, so forward its abort.
  const caller = init?.signal;
  if (caller) {
    if (caller.aborted) controller.abort();
    else caller.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
};

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: isServer ? noopStorage : AsyncStorage,
    autoRefreshToken: !isServer,
    persistSession: !isServer,
    detectSessionInUrl: false,
  },
  // Not `auth.fetch` — supabase-js reads the auth client's fetch from `global.fetch` and drops
  // `auth.fetch` on the floor (`_initSupabaseAuthClient` destructures a fixed option list). The URL
  // check above is what keeps the deadline off the data and storage paths.
  global: { fetch: timedFetch },
});
