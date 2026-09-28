import { fmtPace, toDistance, toPace, type ActivityKind } from '../run/run-core.ts';
import type { WatchState, WatchTheme } from './watch-projection.ts';

/**
 * ══ WHAT THE LOCK SCREEN IS SHOWN, AND WHEN THE CARD STARTS, CHANGES AND ENDS ══
 *
 * `Docs/Live-Activities-Build-Plan.md` §1–§3 (Rest-Timer Amendment 002 once signed off). The Live Activity
 * is a SECOND LISTENER for the projection the Watch already gets (`projectWatchState`) — plus, by PO
 * decision 2026-09-28, runs: distance, pace and elapsed while a GPS bout is live.
 *
 * Pure, like the projection: no ActivityKit, no clock of its own. `lib/live-activity.ts` holds the one
 * piece of state (what was last sent) and does what this file says.
 *
 * ══ THIS FILE IS ALSO THE PROTOCOL ══
 *
 * `LiveActivityContent` is decoded by Swift as `ForgeWorkoutAttributes.ContentState`, in TWO places that
 * must stay byte-identical (`modules/live-activity/ios/` and `targets/live-activity/`; guarded by
 * `live-activity-plan.test.mjs`). Field names here ARE the Swift property names. Every field except
 * `phase` is optional on the Swift side, so a build-11 phone never breaks a build-10 extension: add
 * fields, never repurpose one. Dates cross as EPOCH MILLISECONDS (Swift decodes `.millisecondsSince1970`).
 *
 * ⚠ NO `@/` RUNTIME IMPORTS — this runs under `node --test`. `run-core.ts` has no imports of its own.
 */

/** Which layout the card draws. `run` is the PO's 09-28 addition; unknown values draw as `active`. */
export type LiveActivityPhase = 'active' | 'rest' | 'finished' | 'run';

export interface LiveActivityContent {
  phase: LiveActivityPhase;
  theme: WatchTheme;

  // ── strength (active + rest) ─────────────────────────────────────────────
  exercise?: string;
  setLabel?: string;
  target?: string;
  perLabel?: string;
  setsDone?: number;
  setsTotal?: number;

  // ── rest ─────────────────────────────────────────────────────────────────
  /** Epoch ms. A RUNNING rest is drawn natively with `Text(timerInterval: restStart...restEnd)`. */
  restStart?: number;
  restEnd?: number;
  /** A PAUSED rest: static seconds, no timer. */
  restPausedSec?: number;
  nextExercise?: string;
  nextTarget?: string;
  exerciseComplete?: boolean;

  // ── finished ─────────────────────────────────────────────────────────────
  totalSets?: number;
  elapsedSec?: number;

  // ── run ──────────────────────────────────────────────────────────────────
  /** "Run" / "Walk" / "Ride" — the header. */
  runLabel?: string;
  /** A finished display string in the athlete's unit, two decimals: "3.12". */
  distance?: string;
  distanceUnit?: 'mi' | 'km';
  /** "8:42", or absent before there is a pace to show. */
  pace?: string;
  /** "/mi" or "/km". */
  paceUnit?: string;
  /**
   * Epoch ms the MOVING clock would have started at if it had never paused — `now − elapsed`. The card
   * counts up from it with `Text(timerInterval:)`, so it keeps running with the app asleep.
   */
  clockStart?: number;
  /** A PAUSED run: the frozen moving seconds, drawn as static text. */
  clockPausedSec?: number;
  /** Auto-pause vs the athlete's pause — the card says which, like the in-app card. */
  autoPaused?: boolean;
}

/** Set once at start; ActivityKit cannot change it afterwards. */
export interface LiveActivityAttributes {
  workoutName: string;
  /** Epoch ms the session began — the small elapsed clock on the strength layout. */
  startedAt: number;
}

// ── strength ────────────────────────────────────────────────────────────────

/**
 * The Watch's projection, re-cut for ActivityKit. `idle` → null: nothing to show, which is also the rule
 * that a cardio-only session never gets a strength card (the projection stays idle for cardio).
 */
export function strengthContent(ws: WatchState): LiveActivityContent | null {
  if (ws.phase === 'idle') return null;
  if (ws.phase === 'finished') {
    return { phase: 'finished', theme: ws.theme, totalSets: ws.totalSets, elapsedSec: ws.elapsedSec };
  }
  const base: LiveActivityContent = {
    phase: ws.phase,
    theme: ws.theme,
    exercise: ws.exercise,
    setLabel: ws.setLabel,
    target: ws.target,
    perLabel: ws.perLabel,
    setsDone: ws.setsDone,
    setsTotal: ws.setsTotal,
  };
  if (ws.phase === 'active') return base;

  /* Rest. Running → a native timer between two dates. Paused → frozen seconds. */
  const rest: LiveActivityContent = {
    ...base,
    nextExercise: ws.nextExercise,
    nextTarget: ws.nextTarget,
    exerciseComplete: ws.exerciseComplete,
  };
  if (ws.restEndsAt != null) {
    rest.restEnd = ws.restEndsAt;
    rest.restStart = ws.restEndsAt - Math.max(0, ws.restTotalSec ?? 0) * 1000;
  } else if (ws.restRemainingSec != null) {
    rest.restPausedSec = Math.max(0, Math.round(ws.restRemainingSec));
  }
  return rest;
}

// ── run ─────────────────────────────────────────────────────────────────────

export interface RunSnapshot {
  kind: ActivityKind;
  /** Credited miles — `totalMiles(track)`. */
  miles: number;
  /** MOVING seconds. */
  elapsedSec: number;
  /** Current pace, seconds per MILE, or null before there is one. */
  paceSecPerMi: number | null;
  paused: boolean;
  autoPaused: boolean;
  metric: boolean;
  theme: WatchTheme;
  nowMs: number;
}

const RUN_LABEL: Record<ActivityKind, string> = { run: 'Run', walk: 'Walk', bike: 'Ride' };

export function runContent(r: RunSnapshot): LiveActivityContent {
  const u = r.metric ? 'metric' : 'imperial';
  const c: LiveActivityContent = {
    phase: 'run',
    theme: r.theme,
    runLabel: RUN_LABEL[r.kind],
    distance: toDistance(Math.max(0, r.miles), u).toFixed(2),
    distanceUnit: r.metric ? 'km' : 'mi',
    paceUnit: r.metric ? '/km' : '/mi',
  };
  /* A bike reads speed in the app, not pace; the lock screen shows distance and time only for it. */
  if (r.kind !== 'bike' && r.paceSecPerMi != null && r.paceSecPerMi > 0 && !r.paused) {
    c.pace = fmtPace(toPace(r.paceSecPerMi, u));
  }
  const elapsed = Math.max(0, Math.floor(r.elapsedSec));
  if (r.paused) {
    c.clockPausedSec = elapsed;
    c.autoPaused = r.autoPaused;
  } else {
    c.clockStart = r.nowMs - elapsed * 1000;
  }
  return c;
}

/** A live run wins the card; when it ends the card goes back to the lifting, or away. */
export const chooseContent = (strength: LiveActivityContent | null, run: LiveActivityContent | null): LiveActivityContent | null =>
  run ?? strength;

// ── lifecycle ───────────────────────────────────────────────────────────────

/**
 * The run clock's origin is `now − floor(elapsed)`, so it wobbles by up to a second between renders
 * without anything having changed. Differences inside this are the same clock.
 */
export const CLOCK_SLACK_MS = 2_500;

/**
 * The fewest ms between two updates that differ ONLY in run numbers (distance, pace). Distance at two
 * decimals ticks every ~16 m; sending each one would be an update every few seconds for an hour, and
 * the card is read at a glance. Phase changes and anything strength-side always go at once.
 */
export const RUN_UPDATE_MIN_MS = 5_000;

/** Removed this long after a finished workout — the plan's "gone about 5 minutes later". */
export const FINISHED_DISMISS_SEC = 300;

export type LiveActivityAction =
  | { kind: 'none' }
  | { kind: 'start'; content: LiveActivityContent; staleAtMs: number | null }
  | { kind: 'update'; content: LiveActivityContent; staleAtMs: number | null }
  | { kind: 'end'; content: LiveActivityContent | null; dismissAfterSec: number };

export interface LiveActivitySent {
  /** A card is up (started by this process, or adopted from a previous one). */
  running: boolean;
  /** What it last showed, or null before the first send. */
  content: LiveActivityContent | null;
  sentAtMs: number;
}

/** Equal for the card's purposes: identical, except for a run clock origin that only jittered. */
export function sameContent(a: LiveActivityContent | null, b: LiveActivityContent | null): boolean {
  if (a == null || b == null) return a === b;
  const { clockStart: ca, ...ra } = a;
  const { clockStart: cb, ...rb } = b;
  if (JSON.stringify(ra) !== JSON.stringify(rb)) return false;
  if (ca == null || cb == null) return ca === cb;
  return Math.abs(ca - cb) <= CLOCK_SLACK_MS;
}

/** Only the run numbers moved — the change the throttle is allowed to hold back. */
function onlyRunNumbersMoved(a: LiveActivityContent, b: LiveActivityContent): boolean {
  if (a.phase !== 'run' || b.phase !== 'run') return false;
  const strip = ({ distance: _d, pace: _p, clockStart: _c, ...rest }: LiveActivityContent) => rest;
  if (JSON.stringify(strip(a)) !== JSON.stringify(strip(b))) return false;
  const ca = a.clockStart;
  const cb = b.clockStart;
  return ca != null && cb != null && Math.abs(ca - cb) <= CLOCK_SLACK_MS;
}

/**
 * When the card should go stale on its own — iOS redraws it as stale with the app asleep. A running rest
 * goes stale when it ends ("Rest done · Set 3 of 5 next"); nothing else has a known end.
 */
export const staleAtFor = (c: LiveActivityContent): number | null => (c.phase === 'rest' && c.restEnd != null ? c.restEnd : null);

/**
 * THE decision. `next` null means "nothing to show" (no session, or a cardio-only session with no bout
 * live).
 *
 *   · nothing up, something to show → start. EXCEPT a Finished card: nobody needs a card started only to
 *     say the workout they did not see on the lock screen is over.
 *   · up, nothing to show → end, removed at once.
 *   · up, something different → update, unless it is only the run numbers and the last send was less
 *     than `RUN_UPDATE_MIN_MS` ago (the next render sends it).
 */
export function planLiveActivity(sent: LiveActivitySent, next: LiveActivityContent | null, nowMs: number): LiveActivityAction {
  if (!sent.running) {
    if (next == null || next.phase === 'finished') return { kind: 'none' };
    return { kind: 'start', content: next, staleAtMs: staleAtFor(next) };
  }
  if (next == null) return { kind: 'end', content: null, dismissAfterSec: 0 };
  if (sameContent(sent.content, next)) return { kind: 'none' };
  if (sent.content && onlyRunNumbersMoved(sent.content, next) && nowMs - sent.sentAtMs < RUN_UPDATE_MIN_MS) {
    return { kind: 'none' };
  }
  return { kind: 'update', content: next, staleAtMs: staleAtFor(next) };
}
