import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';
import { breadcrumb, reportError } from '@/lib/diagnostics';
import { track } from '@/lib/analytics';
import { findCommittedWorkout, saveWorkout } from '@/domain/workout/save';
import { doneSetCount } from '@/domain/workout/metrics';
import {
  addPending,
  dropPending,
  isTransportFailure,
  ownedBy,
  readable,
  type PendingSave,
} from '@/domain/workout/pending-save';

/**
 * The offline save queue — the live half (W-9 §13.4).
 *
 * The pure half (`domain/workout/pending-save.ts`) holds the queue shape and the transport-failure guard,
 * and carries the full rationale. This file is storage plus the drain.
 *
 * ══ ⚠ THE ONE RULE ══
 *
 * **Never replay a queued save without asking `findCommittedWorkout` first.** `save_workout` has no
 * idempotency key and `workouts` has no unique index, so a lost response that is blindly retried writes a
 * second workout, a second chapter bump, a second set of records, a second honors pass and a second
 * program-session claim. `save.ts` documents this at length; this file is the place most likely to cause
 * it, because it retries by design.
 *
 * ══ SILENT, PER THE SPEC ══
 *
 * §13.4: *"The athlete sees no error state · Sync completes silently when connection is restored · No
 * 'saving to cloud' indicators."* Nothing here renders. There is no badge, no spinner and no toast on
 * success — the drain either works or waits, and either way the athlete is not told about plumbing.
 */

const KEY = 'forge.pendingSaves.v1';

/** One drain at a time. Mount and an AppState change can both fire within the same tick on a cold start. */
let draining = false;

async function read(): Promise<PendingSave[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? readable(JSON.parse(raw)) : [];
  } catch {
    /* A store we cannot read is an empty queue, never a throw — see `readable`. */
    return [];
  }
}

async function write(list: PendingSave[]): Promise<void> {
  try {
    if (list.length === 0) await AsyncStorage.removeItem(KEY);
    else await AsyncStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* best-effort. A queue that cannot be written is the status quo ante: the session is still in the
       autosave, and Home still offers Continue Workout. */
  }
}

/**
 * Hold a session that could not reach the server.
 *
 * Returns `false` when the queue could not be written, so the caller can surface the original error
 * rather than telling the athlete their workout is safe when nothing recorded it.
 */
export async function queueSave(entry: Omit<PendingSave, 'v' | 'queuedAt'>): Promise<boolean> {
  /* No owner, no queue. `readable` would discard it on the next read anyway, and returning false here
     surfaces the original error instead of promising the athlete a save that was never held. */
  if (!entry.athleteId) return false;
  const full: PendingSave = { ...entry, v: 1, queuedAt: new Date().toISOString() };
  try {
    const next = addPending(await read(), full);
    await write(next);
    /* Confirm by reading back. `write` swallows its own failure by design, and the whole promise this
       makes to the athlete — "you can walk away" — is only true if the entry is actually on disk. */
    const back = await read();
    const landed = back.some((p) => p.athleteId === full.athleteId && p.session.startedAt === full.session.startedAt);
    breadcrumb('state', 'workout.save.queued', { queued: back.length, landed });
    return landed;
  } catch {
    return false;
  }
}

/** How many sessions are waiting. Diagnostics only — §13.4 forbids showing this to the athlete. */
export async function pendingSaveCount(): Promise<number> {
  return (await read()).length;
}

/**
 * Replay everything waiting. Safe to call on every launch and every foreground.
 *
 * Ordering is oldest-first, and a transport failure STOPS the pass rather than working through the rest:
 * if one save cannot reach the server, neither can the next, and hammering a dead connection is a battery
 * complaint (`analytics.ts`'s rule, for the same reason).
 */
export async function drainPendingSaves(): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    let list = await read();
    if (list.length === 0) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    /* No user reachable — offline, or genuinely signed out. Either way the queue waits. It is the
       athlete's own work and it is keyed to their account at replay time, not at queue time. */
    if (!user) return;

    /*
     * ⚠ ONLY THIS ATHLETE'S WORK. Anything queued by whoever was signed in before is left on disk,
     * untouched, for them to sign back in and drain. Replaying it here would write their session into
     * this account's history, records and honors — and nothing downstream would ever flag it, because a
     * saved workout looks exactly like a saved workout.
     */
    for (const entry of ownedBy(list, user.id)) {
      const { startedAt } = entry.session;

      /*
       * ⚠ THE IDEMPOTENCY CHECK. Not an optimisation — the correctness of this whole file.
       *
       * The overwhelmingly likely reason a save is in this queue is that it never left the phone. But the
       * expensive case is the other one: the RPC committed and the reply was lost. Asking first costs one
       * indexed read and is the difference between a replay and a duplicate.
       */
      const already = await findCommittedWorkout(user.id, startedAt);
      if (already) {
        list = dropPending(list, user.id, startedAt);
        await write(list);
        breadcrumb('state', 'workout.save.drained', { startedAt, outcome: 'already-committed' });
        continue;
      }

      try {
        await saveWorkout(entry.session, entry.partners, entry.signals, entry.system);
        list = dropPending(list, user.id, startedAt);
        await write(list);
        /*
         * ⭐ THE ACTIVATION EVENT, FIRED HERE AND NOT AT QUEUE TIME.
         *
         * `workout.tsx` calls this line "every retention number this product quotes is a ratio over
         * this line". A queued session has not saved yet and might never — tracking it at queue time
         * would inflate the one metric the product is steered by. `state: 'queued'` is what makes a
         * late arrival visible as a late arrival rather than blending into the normal path.
         */
        track('workout_saved', {
          source: entry.session.programId
            ? 'program'
            : entry.session.templateId
              ? 'template'
              : entry.session.templated
                ? 'starter'
                : 'freestyle',
          activity_type: entry.session.activityType,
          state: 'queued',
          count: doneSetCount(entry.session),
          duration_ms: Math.max(0, Date.parse(entry.queuedAt) - Date.parse(startedAt)),
        });
        breadcrumb('state', 'workout.save.drained', { startedAt, outcome: 'saved' });
      } catch (e) {
        if (isTransportFailure(e)) {
          /* Still offline. Everything after this one is too — stop, keep the queue intact, try again on
             the next foreground. */
          breadcrumb('state', 'workout.save.drain-deferred', { startedAt, waiting: list.length });
          return;
        }
        /*
         * ⚠ A REAL REJECTION, ON A REPLAY. Retrying forever would be worse than dropping: an RLS denial
         * or a missing function will answer the same way tomorrow, and a queue that never empties keeps
         * hitting the network on every foreground for the life of the install.
         *
         * So it is dropped — and REPORTED, because a session the athlete believes is saved has just
         * stopped existing, and that must not be silent to us even though §13.4 keeps it silent to them.
         */
        list = dropPending(list, user.id, startedAt);
        await write(list);
        /* The breadcrumb carries the session; `reportError` takes only `screen` for context. */
        breadcrumb('state', 'workout.save.drain-rejected', { startedAt });
        reportError(e, { screen: 'pending-save.drain' });
      }
    }
  } catch (e) {
    /* The drain itself is best-effort. It must never be able to take the app down on launch — that is
       the failure mode `_layout`'s header warns about at length. */
    reportError(e, { screen: 'pending-save.drain' });
  } finally {
    draining = false;
  }
}
