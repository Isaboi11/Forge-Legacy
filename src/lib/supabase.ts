import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

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

/*
 * ══ A PASSWORD-RESET LINK IS READ ON THE WEB (PO 11-08 launch QA, B6) ══
 *
 * The emailed reset link opens a BROWSER (the phone app cannot receive it), and lands with the recovery session in
 * the URL hash. `detectSessionInUrl` was false everywhere, so nothing read it: the athlete landed on Welcome and the
 * "Choose a new password" step never appeared — a forgotten password was a dead end. On the web the client now
 * reads the hash; on the phone there is no URL to read, so it stays off there.
 *
 * `openedFromRecoveryLink` is read HERE, before the client consumes the hash, because the client's own
 * PASSWORD_RECOVERY event fires once at start-up and can land before `AuthProvider` has subscribed.
 */
const onWeb = !isServer && Platform.OS === 'web';
export const openedFromRecoveryLink: boolean =
  onWeb && typeof window.location?.hash === 'string' && /(^|[#&])type=recovery(&|$)/.test(window.location.hash);
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

/**
 * ══ SIGNED IN, BUT ABOUT TO ASK AS NOBODY — HOLD THE REQUEST BACK (PO 11-11, Brady) ══
 *
 * "His squad was gone and the templates he built were deleted." Nothing was: the server still had both. His
 * phone had lost signal at the gym, and the app drew the failure as "you have nothing".
 *
 * One road to that is here. supabase-js stamps every data request with the athlete's token — and when it
 * has none to give, it sends the request with the PUBLIC key instead (`_getAccessToken` falls back to
 * `supabaseKey`). That happens to a signed-in phone whenever the stored token has expired and the refresh
 * fails, which is exactly a phone waking up somewhere with bad signal. The server then answers as if
 * nobody were asking: every own-rows policy filters to nothing and `auth.uid()` is null, so "my squads" and
 * "my templates" come back as EMPTY LISTS WITH NO ERROR. No screen can tell that from a brand-new account.
 *
 * So: a data request that would go out as nobody, while this device holds a session, is refused with a
 * network error. The screen shows "Couldn't connect — try again", and the next try (after the refresh
 * succeeds) carries the token. A device with no stored session is signed out for real and is untouched —
 * sign-in, sign-up and the boot crash report all still go through as before.
 *
 * ⚠ The check costs one storage read, and ONLY on a request already headed out anonymously — the
 *   healthy signed-in path never reaches it.
 * ⚠ `report_client_error` is exempt: it accepts anonymous reports by design (0176), and a phone in this
 *   state is exactly the one whose report we want.
 */
const authStorage = isServer ? noopStorage : AsyncStorage;
/** supabase-js's own default key (`sb-<project ref>-auth-token`). Never pass `storageKey` — it would sign everyone out. */
const SESSION_KEY = `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;
const ANON_BEARER = `Bearer ${anonKey}`;

/** The raw text is for diagnostics; `plainError` turns it into "Couldn't connect…" (it says "offline"). */
export const HELD_SIGNED_OUT_REQUEST =
  'Offline: this phone is signed in but its session could not be refreshed, so the request was held back instead of being sent signed-out.';

const goesOutAsNobody = (init?: RequestInit): boolean => {
  try {
    const auth = new Headers(init?.headers).get('Authorization');
    return !auth || auth === ANON_BEARER;
  } catch {
    return false;
  }
};

const deviceHoldsASession = async (): Promise<boolean> => {
  try {
    const raw = await authStorage.getItem(SESSION_KEY);
    return typeof raw === 'string' && raw.includes('refresh_token');
  } catch {
    return false;
  }
};

const timedFetch: typeof fetch = (input, init) => {
  const url = urlOf(input);
  if (!url.includes('/auth/v1/')) {
    if (url.includes('/rpc/report_client_error') || !goesOutAsNobody(init)) return withCrumb(url, fetch(input, init));
    return deviceHoldsASession().then((signedIn) => {
      if (!signedIn) return withCrumb(url, fetch(input, init));
      noteFailure(url, 'nosession');
      throw new Error(HELD_SIGNED_OUT_REQUEST);
    });
  }

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
    storage: authStorage,
    autoRefreshToken: !isServer,
    persistSession: !isServer,
    detectSessionInUrl: onWeb,
  },
  // Not `auth.fetch` — supabase-js reads the auth client's fetch from `global.fetch` and drops
  // `auth.fetch` on the floor (`_initSupabaseAuthClient` destructures a fixed option list). The URL
  // check above is what keeps the deadline off the data and storage paths.
  global: { fetch: timedFetch },
});

/**
 * The signed-in athlete's id for a "list MY things" read — `null` only when nobody is signed in.
 *
 * ⚠ A FAILED CHECK IS AN ERROR, NOT "NOBODY" (PO 11-11, Brady). `getUser()` is a NETWORK call. With no
 * signal it answers `user: null` plus an error, and the old pattern — `if (!user) return []` — turned
 * that into an empty list: the Squads tab told a member of a 7-person squad to create or join one. Here
 * only "no session at all" (`AuthSessionMissingError`) means nobody; anything else is thrown, so the
 * screen shows "Couldn't connect — try again" and the data is still there when it does.
 */
export async function signedInUserId(): Promise<string | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (user) return user.id;
  if (error && error.name !== 'AuthSessionMissingError') throw error;
  return null;
}
