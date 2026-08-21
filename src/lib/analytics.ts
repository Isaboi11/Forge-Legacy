import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';

import { sanitizeKind, sanitizeProps, sanitizeScreen, type Props } from '@/domain/analytics/props-core';
import { inviteEvent, type InviteProps, type InviteStage } from '@/domain/analytics/invite-funnel';
import { supabase } from '@/lib/supabase';
import { currentAppSession, endAppSession, noteBackgrounded, sessionStartedMs } from '@/lib/app-session';
import { breadcrumb, setTrailEnabled } from '@/lib/diagnostics';

/**
 * First-party product-usage events (migration 0131, `P-6-Amendment-001-Product-Analytics`).
 *
 * ══ A MODULE SINGLETON, NOT A REACT CONTEXT ══
 *
 * Nothing about recording that a screen was opened should be able to re-render that screen. `track()`
 * is synchronous, returns void, never throws, and is never awaited. If this file were deleted the app
 * would behave identically.
 *
 * ══ SILENT DEGRADATION IS A REQUIREMENT, NOT A COURTESY (P6-A1-D11) ══
 *
 * Every path is wrapped. A missing table (0131 not yet applied → `PGRST205`) disables the emitter for
 * the life of the process rather than retrying forever. A failed batch is dropped after two attempts.
 * Analytics failing must be indistinguishable, from the athlete's side, from analytics succeeding —
 * measuring the product may never degrade using it.
 *
 * ══ WHAT MAY BE SENT ══
 *
 * `domain/analytics/props-core` owns that, as an ALLOWLIST, tested. The privacy policy promises a usage
 * record never contains anything the athlete wrote or lifted; that promise is kept there, not here. If
 * you are tempted to add a field to an event, read that module's header first.
 *
 * ══ CONSENT IS CHECKED SYNCHRONOUSLY ══
 *
 * The opt-out lives in `profiles.app_prefs` (server truth) and is MIRRORED to AsyncStorage. The mirror
 * is not a speed optimisation: it is what lets `track()` decide before queueing. Consent that is only
 * known after a round trip is consent that gets ignored for the first seconds of every launch, which is
 * exactly when the interesting events happen.
 */

const QUEUE_MAX = 200;
const FLUSH_AT = 20;
const FLUSH_EVERY_MS = 30_000;
const MAX_ATTEMPTS = 2;

const OPT_OUT_KEY = 'fl.analytics.optOut';
const QUEUE_KEY = 'fl.analytics.queue';

interface QueuedEvent {
  kind: string;
  screen: string | null;
  props: Props;
  occurred_at: string;
  session_id: string;
}

let queue: QueuedEvent[] = [];
let disabled = false;
let optedOut = false;
let timer: ReturnType<typeof setInterval> | null = null;
let flushing = false;
let started = false;

const APP_VERSION = Constants.expoConfig?.version ?? null;
const PLATFORM: 'ios' | 'android' | 'web' | null =
  Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : Platform.OS === 'web' ? 'web' : null;

/**
 * The sitting this event belongs to.
 *
 * ⚠ DELEGATES TO `lib/app-session` AND MUST KEEP DOING SO. `client_errors.session_id` (0176) is the same
 *   value, which is what lets a crash report join back to the usage trail that led to it. A local id
 *   here would compile, pass every test, and silently break that join forever.
 */
const currentSession = currentAppSession;

// ── consent ──────────────────────────────────────────────────────────────────

export function isAnalyticsEnabled(): boolean {
  return !optedOut;
}

/**
 * Called by the privacy screen and by the prefs load on boot.
 *
 * Turning it OFF drops whatever is queued. Flushing a queue collected before the athlete said no would
 * be sending data they just declined, which is the whole thing the toggle exists to prevent.
 */
export function setAnalyticsEnabled(on: boolean): void {
  optedOut = !on;
  /*
   * ⚠ THE SAME SWITCH GOVERNS THE BREADCRUMB TRAIL (0176), AND IT MUST.
   *
   * A route trail IS product usage. Continuing to collect one after the athlete said no — merely
   * writing it to a different table — is exactly the back door `0176`'s header refuses.
   *
   * ⭐ IT DOES NOT TURN OFF ERROR REPORTING. The two are deliberately split: turning this off drops the
   *   trail and keeps the fault, so we still learn the app broke, where, and on which build. That is a
   *   defect in our software, not a record of their behaviour. See `lib/diagnostics`' header.
   */
  setTrailEnabled(on);
  if (optedOut) queue = [];
  void AsyncStorage.setItem(OPT_OUT_KEY, optedOut ? '1' : '0').catch(() => {});
  if (optedOut) void AsyncStorage.removeItem(QUEUE_KEY).catch(() => {});
}

// ── emit ─────────────────────────────────────────────────────────────────────

export function track(kind: string, props?: Record<string, unknown>): void {
  try {
    if (disabled || optedOut) return;
    const k = sanitizeKind(kind);
    if (!k) return;

    /*
     * ⭐ EVERY EXISTING `track()` CALL IS NOW ALSO A BREADCRUMB, AT NO CALL-SITE COST (0176).
     *
     * This one line is why the trail is worth reading. The app already reports its meaningful actions —
     * `sign_in_submitted`, `onboarding_continue`, `workout_saved` — and each is precisely the kind of
     * "what did they tap" a crash report needs and normally has to be instrumented for separately.
     * Routing them through here means the trail stays current as the product grows, instead of decaying
     * into whatever somebody remembered to annotate.
     *
     * `breadcrumb()` is synchronous, cannot throw, and re-sanitises its own input.
     */
    breadcrumb('action', k);

    queue.push({
      kind: k,
      screen: null,
      props: sanitizeProps(props),
      occurred_at: new Date().toISOString(),
      session_id: currentSession(),
    });

    // Drop the OLDEST beyond the cap. A queue that grows without bound is a memory leak wearing a
    // feature's clothes, and the newest events are the ones still worth having.
    if (queue.length > QUEUE_MAX) queue = queue.slice(queue.length - QUEUE_MAX);
    if (queue.length >= FLUSH_AT) void flushAnalytics();
  } catch {
    /* never let a measurement break a screen */
  }
}

/**
 * One stage of the invite funnel (sent → accepted → installed → converted).
 *
 * A thin wrapper over `track()` rather than a second emitter: the whole point is that acquisition events
 * obey exactly the same consent, allowlist and never-throw rules as everything else. The vocabulary lives
 * in `domain/analytics/invite-funnel` so it is testable and so no call site can invent a channel name.
 *
 * ⚠ The 20 testers × 5 people each plan is unmeasurable without these four events, so they matter more
 * than most — but not more than the athlete's workout. Same silent degradation as every other track call.
 */
export function trackInvite(stage: InviteStage, props: InviteProps): void {
  try {
    const e = inviteEvent(stage, props);
    track(e.kind, e.props);
  } catch {
    /* never let a measurement break a screen */
  }
}

export function trackScreen(path: string): void {
  try {
    if (disabled || optedOut) return;
    const screen = sanitizeScreen(path);
    if (!screen) return;
    queue.push({
      kind: 'screen_view',
      screen,
      props: {},
      occurred_at: new Date().toISOString(),
      session_id: currentSession(),
    });
    if (queue.length > QUEUE_MAX) queue = queue.slice(queue.length - QUEUE_MAX);
    if (queue.length >= FLUSH_AT) void flushAnalytics();
  } catch {
    /* as above */
  }
}

// ── flush ────────────────────────────────────────────────────────────────────

export async function flushAnalytics(): Promise<void> {
  if (disabled || optedOut || flushing || queue.length === 0) return;
  flushing = true;
  const batch = queue;
  queue = [];

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      // Signed out mid-flight. These events belong to nobody the table would accept, so drop them.
      return;
    }

    const rows = batch.map((e) => ({
      user_id: user.id,
      session_id: e.session_id,
      kind: e.kind,
      screen: e.screen,
      props: e.props,
      occurred_at: e.occurred_at,
      platform: PLATFORM,
      app_version: APP_VERSION,
    }));

    let attempt = 0;
    for (;;) {
      const { error } = await supabase.from('app_events').insert(rows);
      if (!error) return;

      // 0131 not applied yet. Stop for the life of the process — retrying a table that does not exist
      // on every flush, forever, is how a disabled feature becomes a battery complaint.
      if ((error as { code?: string }).code === 'PGRST205') {
        disabled = true;
        return;
      }
      attempt += 1;
      if (attempt >= MAX_ATTEMPTS) return; // dropped, deliberately — see the header
    }
  } catch {
    /* dropped */
  } finally {
    flushing = false;
  }
}

// ── lifecycle ────────────────────────────────────────────────────────────────

/** Persist across a cold kill, capped. Fire-and-forget both ways. */
async function persistQueue(): Promise<void> {
  try {
    if (optedOut || queue.length === 0) return;
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-QUEUE_MAX)));
  } catch {
    /* ignore */
  }
}

async function restoreQueue(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return;
    await AsyncStorage.removeItem(QUEUE_KEY);
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    const restored = parsed.filter(
      (e): e is QueuedEvent =>
        !!e && typeof e === 'object' && typeof (e as QueuedEvent).kind === 'string' && typeof (e as QueuedEvent).session_id === 'string',
    );
    queue = [...restored, ...queue].slice(-QUEUE_MAX);
  } catch {
    /* ignore */
  }
}

/**
 * Start the emitter. Idempotent; called once from the root layout.
 *
 * Reads the mirrored opt-out FIRST, before anything can be queued.
 */
export function startAnalytics(): void {
  if (started) return;
  started = true;

  void (async () => {
    try {
      const stored = await AsyncStorage.getItem(OPT_OUT_KEY);
      optedOut = stored === '1';
      if (!optedOut) await restoreQueue();
      if (!optedOut) void flushAnalytics();
    } catch {
      /* default stays opted-in, which is the disclosed default (P6-A1-D5) */
    }
  })();

  timer = setInterval(() => void flushAnalytics(), FLUSH_EVERY_MS);

  AppState.addEventListener('change', (state) => {
    try {
      if (state === 'background' || state === 'inactive') {
        noteBackgrounded();
        // "It broke right after I came back to it" is a real and otherwise invisible pattern — a
        // remount against state restored from a session that has since expired.
        breadcrumb('state', 'backgrounded');
        // The session's own length, recorded once, so "how long do people stay" needs no reconstruction.
        const startedAt = sessionStartedMs();
        if (startedAt) {
          track('session_end', { duration_ms: Math.max(0, Date.now() - startedAt) });
        }
        void flushAnalytics();
        void persistQueue();
      }
    } catch {
      /* ignore */
    }
  });
}

/** Called from `signOut()` — the last chance to send what this session collected. */
export async function stopAnalytics(): Promise<void> {
  try {
    await flushAnalytics();
  } catch {
    /* ignore */
  } finally {
    queue = [];
    endAppSession();
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    started = false;
  }
}
