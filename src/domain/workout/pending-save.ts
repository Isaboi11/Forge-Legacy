import type { UnitSystem } from '@/domain/settings/units';

import type { IntensitySignalRow } from './save.ts';
import type { ActiveSession } from './types';

/**
 * The offline save queue — the pure half (W-9 §13.4).
 *
 * ══ WHAT §13.4 ACTUALLY ASKS FOR ══
 *
 * *"Local storage is the source of truth during a session. Cloud sync occurs after session save when a
 * connection is available … The athlete sees no error state · Sync completes silently when connection is
 * restored · No 'saving to cloud' indicators."*
 *
 * Today the Finish handler catches, shows "Couldn't save", and returns to `phase: 'active'`. The session
 * is NOT lost — the autosave still holds it and Home still offers Continue Workout — but the athlete is
 * standing in the gym tapping Finish at a screen that will not let them leave. This queue is what turns
 * that into the silent sync the spec describes.
 *
 * ══ ⚠ THE HAZARD THIS FILE EXISTS TO NOT CAUSE ══
 *
 * `save.ts` states it plainly: *"A LOST RESPONSE IS NOT A FAILED SAVE — AND RETRYING ONE MAKES A SECOND
 * WORKOUT. `save_workout` takes no idempotency key and there is no unique index on `workouts`."* A blind
 * retry queue is therefore the single most destructive thing that could be built here: a second workout
 * row, a second `chapters.workout_count` bump, a second set of `personal_records`, a second
 * `evaluate_honors` pass, and a second `program_sessions` claim against the same slot.
 *
 * The drain (`data/pending-save-live.ts`) MUST ask `findCommittedWorkout(userId, startedAt)` before every
 * retry. `startedAt` is fixed when the session begins and is identical across retries, which is what makes
 * it a fingerprint. Nothing in this file may be used to retry without that check.
 *
 * ══ WHY THIS HALF IS PURE ══
 *
 * No AsyncStorage, no Supabase, no React — so `node --test` can load it and prove `isTransportFailure`
 * against real error shapes. The guard is the risky part of this feature, and a guard that cannot be
 * tested is a guard nobody has checked.
 */

/** One session that could not reach the server, held until it can. */
export interface PendingSave {
  /** Bumped if the shape changes; an entry from an older build is dropped rather than guessed at. */
  v: 1;
  /**
   * ⚠ WHOSE WORKOUT THIS IS — LOAD-BEARING, NOT BOOKKEEPING.
   *
   * The queue is a device-local file and sign-in is not. Without this, an athlete who queues a session
   * offline and then hands the phone over — or signs out and a second tester signs in, which is routine
   * on this project — would have their workout drained into **somebody else's account**, complete with
   * that person's chapter bump, records and honors. The drain matches on this and replays nothing else.
   *
   * Captured from the CACHED auth session, which is readable with no network — the one identity fact
   * still available at the moment a save is failing for want of a connection.
   */
  athleteId: string;
  session: ActiveSession;
  partners: string[];
  signals: IntensitySignalRow[];
  system: UnitSystem;
  /** When it was queued — for the drain's ordering and for aging entries out. */
  queuedAt: string;
}

/**
 * A ceiling, so a device that is offline for a week cannot grow this without bound. Twenty sessions is
 * far past any real offline stretch; the OLDEST is dropped first, because the newest workout is the one
 * the athlete remembers finishing.
 */
export const MAX_PENDING = 20;

/**
 * Messages that mean "this never reached a server".
 *
 * ⚠ THESE ARE THE REAL STRINGS, not idealised ones. React Native's fetch fails with "Network request
 * failed"; the web build's fails with "Failed to fetch"; iOS URLSession surfaces "The Internet connection
 * appears to be offline"; Safari uses "Load failed". `postgrest-js` prefixes each with the error's own
 * `name`, so what arrives is e.g. `"TypeError: Network request failed"`.
 */
const FETCH_MESSAGE =
  /network request failed|failed to fetch|load failed|network error|internet connection appears to be offline|timed? ?out|aborted/i;

/**
 * Did this failure happen BEFORE the server ruled on the save?
 *
 * ══ ⚠ THE DIRECTION THIS GUARD ERRS IN IS DELIBERATE ══
 *
 * Two ways to be wrong, and they are not symmetrical:
 *
 *  · **Queue something the server actually REJECTED** — the athlete is told it saved, the drain retries
 *    forever against a rejection that will never change, and the workout silently never exists. That is
 *    data loss wearing a success message.
 *  · **Surface a transport failure as an error** — the athlete sees exactly what they see today and taps
 *    Finish again. No worse than the current build.
 *
 * So this returns `true` only on a POSITIVE signal of transport failure. Anything unrecognised — a bare
 * `new Error('not signed in')` included — falls through to `false` and surfaces.
 *
 * ══ WHY `code === ''` IS THE DISCRIMINATOR, AND NOT A GUESS ══
 *
 * Read from `@supabase/postgrest-js/dist/index.cjs` (the installed copy, not from memory). Its fetch
 * `.catch` builds the error object with `let code = ""` and only ever re-assigns `""` — so **every error
 * produced on the fetch-rejection path carries an empty-string code**. An error PostgREST actually
 * adjudicated carries a real code instead, taken from the response body: a Postgres SQLSTATE (`42501` for
 * an RLS denial, `23505` for a unique violation) or a PostgREST code (`PGRST116`). The two sets do not
 * overlap, and an empty string is not reachable from an adjudicated response.
 *
 * A plain `Error` has no `code` property at all — `undefined`, not `''` — so it does not match, which is
 * why the check is `=== ''` and never a falsy test.
 */
export function isTransportFailure(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const err = e as { name?: unknown; message?: unknown; code?: unknown };

  /* Supabase Auth's own network failure, which it names on itself (`auth-js` errors.js:238). This is the
     one that fires when `getUser()` cannot reach the server, and it is the FIRST await in `saveWorkout` —
     so offline, it is the error the athlete actually gets. */
  if (err.name === 'AuthRetryableFetchError') return true;

  /* postgrest-js's fetch-rejection shape. The empty-string code is the signal; see the note above. */
  if (err.code === '') return true;

  /* A fetch rejection that never reached postgrest-js at all — thrown straight out of `fetch`. */
  const message = typeof err.message === 'string' ? err.message : '';
  if (err.name === 'TypeError' && FETCH_MESSAGE.test(message)) return true;

  return false;
}

/**
 * Enqueue a session, replacing any entry for the same session rather than adding a second.
 *
 * ⚠ KEYED ON `startedAt`, THE SAME FINGERPRINT THE DRAIN USES. An athlete who taps Finish, fails, and
 * taps Finish again must not end up with two queue entries that both retry — that is the duplicate this
 * whole file is written to avoid, arriving by a different road.
 */
export function addPending(list: PendingSave[], entry: PendingSave): PendingSave[] {
  const without = list.filter((p) => !sameEntry(p, entry.athleteId, entry.session.startedAt));
  const next = [...without, entry];
  /* Oldest out first — see MAX_PENDING. */
  return next.length > MAX_PENDING ? next.slice(next.length - MAX_PENDING) : next;
}

/** Remove a session from the queue — because it landed, or because it was already there. */
export function dropPending(list: PendingSave[], athleteId: string, startedAt: string): PendingSave[] {
  return list.filter((p) => !sameEntry(p, athleteId, startedAt));
}

/**
 * ⚠ IDENTITY IS `(athleteId, startedAt)`, NOT `startedAt` ALONE.
 *
 * `save.ts` uses the start instant as a session fingerprint because "an athlete cannot begin two sessions
 * in the same millisecond" — true, and it is scoped to one athlete there because the query already filters
 * by `athlete_id`. This queue holds more than one athlete's work, so the pair is what `findCommittedWorkout`
 * is actually keyed on and the pair is what identifies an entry here.
 */
function sameEntry(p: PendingSave, athleteId: string, startedAt: string): boolean {
  return p.athleteId === athleteId && p.session.startedAt === startedAt;
}

/**
 * Drop anything this build cannot safely replay.
 *
 * A queue entry is a snapshot of arguments to `saveWorkout`. If that shape ever changes, an entry written
 * by an older build would be replayed with fields the new signature does not mean — so it is discarded
 * instead. Losing an unsynced workout is bad; writing a corrupted one is worse, and unlike the first it
 * cannot be noticed.
 */
export function readable(list: unknown): PendingSave[] {
  if (!Array.isArray(list)) return [];
  return list.filter(
    (p): p is PendingSave =>
      !!p &&
      typeof p === 'object' &&
      (p as PendingSave).v === 1 &&
      /* No owner, no replay. An entry that cannot say whose it is could only be saved by guessing, and
         the wrong guess writes a stranger's workout into this athlete's Legacy. */
      typeof (p as PendingSave).athleteId === 'string' &&
      !!(p as PendingSave).athleteId &&
      !!(p as PendingSave).session?.startedAt,
  );
}

/** Just this athlete's queued sessions. The rest stay untouched — they belong to somebody who may sign back in. */
export function ownedBy(list: PendingSave[], athleteId: string): PendingSave[] {
  return list.filter((p) => p.athleteId === athleteId);
}
