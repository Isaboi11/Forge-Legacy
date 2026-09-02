import type { ActiveSession } from './types.ts';

/**
 * ══ THE THREE THINGS THE WRIST CAN ASK THE PHONE TO DO ══
 *
 * `Docs/Apple-Watch-Companion-Build-Plan.md` §3. All active-workout state is `useState` inside the
 * 5,364-line `workout.tsx`, so nothing outside that component can say "this set is done". This module is
 * the seam: the screen REGISTERS its handlers while mounted, and the watch bridge calls
 * `dispatchWatchCommand`. It is a registration, not a state-management rewrite — the screen keeps every
 * piece of state it has and simply lends four functions out.
 *
 * ⚠ WHY THE GUARDS LIVE HERE AND NOT IN THE SCREEN. The screen is the one file in this repo nobody can
 *   unit-test. Every refusal below — no session, unknown index, a set already logged, an absurd rest
 *   delta — is therefore decided in this file, where `watch-commands.test.mjs` can prove it. The screen
 *   is only ever handed a command that has already been checked.
 *
 * ⚠ IDEMPOTENCY IS THE POINT OF `setDone` CARRYING INDICES. The wrist can double-tap, WatchConnectivity
 *   can redeliver, and a watch holding stale state can ask for a set logged a minute ago. All three
 *   collapse to one log because the dispatcher re-reads the live session and refuses a set that is
 *   already `done`. A set that lands twice is worse than a tap the athlete has to repeat — the same
 *   rule that stops the watch queueing a log it cannot verify.
 *
 * ⚠ NO `@/` IMPORTS — loaded under `node --test`. `import type` is erased, so `./types.ts` is free.
 */

export type WatchCommand =
  | { type: 'setDone'; exerciseIndex: number; setIndex: number }
  | { type: 'restSkip' }
  | { type: 'restAdjust'; deltaSec: number }
  | { type: 'restToggle' };

export type WatchRefusal =
  /** Nothing is registered — no workout screen is mounted. The wrist shows Idle. */
  | 'not-mounted'
  /** The screen is up but holds no session. */
  | 'no-session'
  | 'unknown-exercise'
  | 'unknown-set'
  /** The set was already logged. The commonest refusal, and the one that makes a double tap harmless. */
  | 'already-done'
  /** A cardio block has no set to log from a wrist. */
  | 'not-strength'
  /** A rest adjustment that is not a sane number of seconds. */
  | 'bad-delta'
  /** The payload did not decode to a command at all. */
  | 'malformed';

export type WatchCommandResult = { ok: true } | { ok: false; reason: WatchRefusal };

const OK: WatchCommandResult = { ok: true };
const no = (reason: WatchRefusal): WatchCommandResult => ({ ok: false, reason });

/**
 * What the workout screen lends out while it is mounted.
 *
 * `session()` is read at dispatch time rather than passed at registration, because the screen re-renders
 * constantly and a session captured once would be stale within a set.
 */
export interface WatchCommandPort {
  session(): ActiveSession | null;
  setDone(exerciseIndex: number, setIndex: number): void;
  restSkip(): void;
  restAdjust(deltaSec: number): void;
  restToggle(): void;
}

let mounted: WatchCommandPort | null = null;

/**
 * Called from the workout screen's mount effect. Returns its own unregister.
 *
 * ⚠ THE UNREGISTER CHECKS IDENTITY. Under React 18 StrictMode an effect mounts, unmounts and remounts;
 * a blind `mounted = null` on the first teardown would unregister the SECOND registration and leave the
 * wrist talking to nothing for the rest of the session.
 */
export function registerWatchCommands(port: WatchCommandPort): () => void {
  mounted = port;
  return () => {
    if (mounted === port) mounted = null;
  };
}

/** Test seam and a truthful answer for `isReachable`-style checks. */
export const watchCommandsMounted = (): boolean => mounted !== null;

/** ±1s to ±5min. The UI sends ±15 and the Digital Crown steps in 15s, but the guard is about sanity. */
const MIN_DELTA = 1;
const MAX_DELTA = 300;

/**
 * The reader's guard, for a payload that crossed WatchConnectivity and was decoded from JSON.
 *
 * Same posture as `isLiveSnapshot`: anything that is not exactly this shape is not a command. A watch on
 * an older build sending a command this phone has never heard of must read as `malformed`, not throw.
 */
export function isWatchCommand(x: unknown): x is WatchCommand {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  switch (o.type) {
    case 'setDone':
      return Number.isInteger(o.exerciseIndex) && Number.isInteger(o.setIndex);
    case 'restSkip':
    case 'restToggle':
      return true;
    case 'restAdjust':
      return Number.isInteger(o.deltaSec);
    default:
      return false;
  }
}

/**
 * Route one command to the mounted screen, or refuse it with a reason the watch can show.
 *
 * `port` is injectable so the tests never touch module state — and so a future second caller (Live
 * Activities needs the identical surface, §3) can drive it without registering.
 */
export function dispatchWatchCommand(cmd: WatchCommand, port: WatchCommandPort | null = mounted): WatchCommandResult {
  if (!port) return no('not-mounted');

  switch (cmd.type) {
    case 'setDone': {
      const session = port.session();
      if (!session) return no('no-session');

      const exercise = session.exercises[cmd.exerciseIndex];
      if (!exercise) return no('unknown-exercise');
      if (exercise.kind === 'cardio') return no('not-strength');

      const set = exercise.sets[cmd.setIndex];
      if (!set) return no('unknown-set');
      if (set.done) return no('already-done');

      port.setDone(cmd.exerciseIndex, cmd.setIndex);
      return OK;
    }

    case 'restSkip':
      port.restSkip();
      return OK;

    case 'restToggle':
      port.restToggle();
      return OK;

    case 'restAdjust': {
      const d = Math.abs(cmd.deltaSec);
      if (!Number.isInteger(cmd.deltaSec) || d < MIN_DELTA || d > MAX_DELTA) return no('bad-delta');
      port.restAdjust(cmd.deltaSec);
      return OK;
    }

    default:
      return no('malformed');
  }
}

/** Decode-and-dispatch, for the bridge: one call from Swift's JSON to a result it can render. */
export function handleWatchPayload(payload: unknown, port: WatchCommandPort | null = mounted): WatchCommandResult {
  if (!isWatchCommand(payload)) return no('malformed');
  return dispatchWatchCommand(payload, port);
}
