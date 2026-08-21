import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

/*
 * ⚠ THE ONLY IMPORT THIS FILE MAY TAKE FROM `lib/`, AND IT IS DIRECTIONAL.
 *
 * `lib/diagnostics` deliberately imports NOTHING that reaches back here — see its header. If it ever
 * does, these two modules deadlock at init on Hermes and the app does not launch. The error REPORT path
 * gets here the long way round, through `data/errors-live.ts` registering a sink.
 */
import { breadcrumb } from '@/lib/diagnostics';

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

/**
 * A request path reduced to its SHAPE, for a breadcrumb.
 *
 * ⚠ THE QUERY STRING IS DROPPED, AND THAT IS NOT COSMETIC. PostgREST puts filters there —
 * `?handle=eq.<what they typed>`, `?name=ilike.*<search term>*` — so a raw URL in a breadcrumb would
 * carry athlete-authored text straight into `client_errors`, breaking the same promise
 * `domain/analytics/props-core.ts` exists to keep. Path only, ids reduced.
 */
const requestShape = (url: string): string => {
  try {
    const path = url.split('?')[0].replace(/^https?:\/\/[^/]+/i, '');
    return path
      .split('/')
      .map((seg) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg) ? '[id]' : seg,
      )
      .join('/')
      .slice(0, 60);
  } catch {
    return '';
  }
};

/**
 * Leave a `net` crumb when a request FAILS. Successes are not recorded — a trail of 200s is noise, and
 * the 40-crumb window is small on purpose.
 *
 * ══ WHY THIS IS HERE AND NOT IN A `useQuery` WRAPPER ══
 *
 * Two thirds of this app's real failures are asynchronous: a query that 401s, an RPC that 42501s, a
 * request that never settles. None of those throw anywhere an error boundary can see them — they resolve
 * into an `error` string that a screen renders as an empty state. This is the one chokepoint every
 * database call in the app passes through, so instrumenting it catches all of them at once, including
 * the ones nobody remembered to handle.
 *
 * ⚠ The `report_client_error` RPC is excluded. A failure to deliver a report is not a step the athlete
 *   took, and letting it into the trail would make every subsequent report describe the reporter.
 */
const noteFailure = (url: string, status: number | string): void => {
  try {
    const shape = requestShape(url);
    if (!shape || shape.includes('report_client_error')) return;
    breadcrumb('net', 'request_failed', `${status}:${shape}`);
  } catch {
    /* a crumb is never worth an exception */
  }
};

const withCrumb = (url: string, p: Promise<Response>): Promise<Response> =>
  p.then(
    (res) => {
      if (!res.ok) noteFailure(url, res.status);
      return res;
    },
    (err: unknown) => {
      // A rejected fetch is the offline / DNS / aborted case, which never has a status code and is the
      // single most common cause of "the app is broken" reports.
      noteFailure(url, (err as { name?: string })?.name === 'AbortError' ? 'abort' : 'neterr');
      throw err;
    },
  );

const timedFetch: typeof fetch = (input, init) => {
  const url = urlOf(input);
  if (!url.includes('/auth/v1/')) return withCrumb(url, fetch(input, init));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
  // A caller's own signal still has to work — ours replaces it on the request, so forward its abort.
  const caller = init?.signal;
  if (caller) {
    if (caller.aborted) controller.abort();
    else caller.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return withCrumb(url, fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer)));
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
