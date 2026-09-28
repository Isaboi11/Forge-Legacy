import { requireOptionalNativeModule } from 'expo';

import {
  FINISHED_DISMISS_SEC,
  chooseContent,
  planLiveActivity,
  runContent,
  strengthContent,
  type LiveActivityAttributes,
  type LiveActivityContent,
  type LiveActivitySent,
  type RunSnapshot,
} from '@/domain/workout/live-activity-plan';
import type { WatchState } from '@/domain/workout/watch-projection';
import { reportError } from '@/lib/diagnostics';

/**
 * ══ THE LOCK-SCREEN CARD — NATIVE HALF ══
 *
 * `Docs/Live-Activities-Build-Plan.md` §3. Same platform-split shape as `watch-bridge.ts`: the web build
 * resolves `live-activity.web.ts`, both expose exactly these calls, and no screen asks which platform it
 * is on.
 *
 * ⚠ INERT WITHOUT THE MODULE. `requireOptionalNativeModule` returns null on the web and on build 9 and
 *   earlier (no `ForgeLiveActivity` in them), so every call below is a no-op there — the same way Watch
 *   Phase 2's TypeScript shipped ahead of its Swift.
 *
 * ══ TWO FEEDERS, ONE CARD ══
 *
 * `workout.tsx` feeds the strength projection (the same `WatchState` the wrist gets); `CardioBlockCard`
 * feeds a live GPS bout. A live run wins the card (`chooseContent`); when it ends the card goes back to
 * the lifting, or away. This module holds the only state — what was last sent — and asks
 * `planLiveActivity` what to do with every change. Every call is wrapped: the card is a convenience, and
 * a phone that cannot draw it still runs the workout.
 */

interface LiveActivityModule {
  isEnabled(): boolean;
  activeId(): string | null;
  start(attrsJson: string, stateJson: string, staleAtMs: number | null): string;
  update(stateJson: string, staleAtMs: number | null): void;
  end(stateJson: string | null, dismissAfterSec: number): void;
  endAll(): void;
}

const native = requireOptionalNativeModule<LiveActivityModule>('ForgeLiveActivity');

/*
 * ══ KILLED-APP RECOVERY — ONCE, AT LAUNCH ══
 *
 * iOS keeps a card up after the app is killed; it goes stale and is removed after its 8-hour cap. This
 * module is evaluated at boot (`_layout.tsx` imports it), before any session could have resumed, so
 * anything up now belongs to a previous process: it is removed. A session that resumes simply starts a
 * fresh card on its first render — one card, never two (plan §7 step 7).
 */
try {
  if (native && native.activeId() != null) native.endAll();
} catch {
  /* best-effort */
}

let sent: LiveActivitySent = { running: false, content: null, sentAtMs: 0 };
let strength: LiveActivityContent | null = null;
let run: LiveActivityContent | null = null;
let attrs: LiveActivityAttributes | null = null;
/** One failure report per process — a refused card would otherwise report on every render. */
let reported = false;
/** After a refusal, do not ask again for a while: the screen re-renders every second during a rest. */
let refusedUntil = 0;
/**
 * The session that was just ended, by its start time.
 *
 * ⚠ A LATCH, BECAUSE THE SCREEN OUTLIVES ITS OWN ENDING BY A RENDER OR TWO. Finish and Discard call
 *   `endLiveActivity` and then navigate; the push effect can still run once more for the old session in
 *   between, and without this it would start a brand-new card for a workout that is over. Pushes for this
 *   session are ignored for a few seconds; a push from a DIFFERENT session clears it at once.
 *
 *   Time-boxed rather than permanent because the back arrow ends the card too, and that session can be
 *   resumed from Home later with the SAME start time — it must get its card back.
 */
let closedStartedAt: number | null = null;
let closedUntil = 0;
const CLOSE_LATCH_MS = 5_000;

/** Still inside the latch for the session that just ended. */
const latched = (): boolean => closedStartedAt != null && Date.now() < closedUntil;

function apply(): void {
  if (!native) return;
  try {
    const next = chooseContent(strength, run);
    const now = Date.now();
    const action = planLiveActivity(sent, next, now);
    switch (action.kind) {
      case 'none':
        return;
      case 'start': {
        /* The athlete's switch in Settings. Off → nothing, and no error either (plan §7 step 8). */
        if (now < refusedUntil || !native.isEnabled()) return;
        const a: LiveActivityAttributes = attrs ?? { workoutName: 'Workout', startedAt: now };
        try {
          native.start(JSON.stringify(a), JSON.stringify(action.content), action.staleAtMs);
          sent = { running: true, content: action.content, sentAtMs: now };
        } catch (e) {
          refusedUntil = now + 30_000;
          if (!reported) {
            reported = true;
            reportError({ name: 'live_activity_start_failed', message: String((e as { message?: string })?.message ?? e) });
          }
        }
        return;
      }
      case 'update':
        native.update(JSON.stringify(action.content), action.staleAtMs);
        sent = { running: true, content: action.content, sentAtMs: now };
        return;
      case 'end':
        native.end(action.content ? JSON.stringify(action.content) : null, action.dismissAfterSec);
        sent = { running: false, content: null, sentAtMs: now };
        return;
    }
  } catch {
    // The card is a convenience. A phone that cannot draw it still runs the workout.
  }
}

/**
 * The strength side: the projection the Watch gets, plus what ActivityKit needs once at start.
 * `workout.tsx` calls this beside `pushWatchState`, from the same memo.
 */
export function pushLiveActivityState(ws: WatchState, meta: { workoutName: string; startedAt: string }): void {
  if (!native) return;
  const parsed = Date.parse(meta.startedAt);
  const startedAt = Number.isFinite(parsed) ? parsed : null;
  if (latched() && startedAt === closedStartedAt) return;
  closedStartedAt = null;
  attrs = { workoutName: meta.workoutName || 'Workout', startedAt: startedAt ?? Date.now() };
  strength = strengthContent(ws);
  apply();
}

/** The run side: a live GPS bout, or null when there is none. `CardioBlockCard` calls this. */
export function pushLiveActivityRun(snapshot: RunSnapshot | null): void {
  if (!native || latched()) return;
  run = snapshot ? runContent(snapshot) : null;
  apply();
}

/**
 * The workout is over. `finished` leaves the Finished card up for five minutes (plan §1); a discard or a
 * walk-away removes it at once. Forgets both feeders, so the next session starts clean.
 */
export function endLiveActivity(how: 'finished' | 'discarded'): void {
  if (!native) return;
  const last = sent.content;
  closedStartedAt = attrs?.startedAt ?? null;
  closedUntil = Date.now() + CLOSE_LATCH_MS;
  strength = null;
  run = null;
  attrs = null;
  try {
    if (sent.running) {
      /* Only a card already showing "Workout complete" stays up. Finishing with sets left undone would
         otherwise leave "Set 4 of 5" on the lock screen for five minutes after the workout ended. */
      const keep = how === 'finished' && last?.phase === 'finished';
      native.end(keep ? JSON.stringify(last) : null, keep ? FINISHED_DISMISS_SEC : 0);
    }
  } catch {
    /* best-effort */
  }
  sent = { running: false, content: null, sentAtMs: Date.now() };
}
