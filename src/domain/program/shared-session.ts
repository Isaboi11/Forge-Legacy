/**
 * DOES A SHARED WORKOUT COUNT AS ONE OF MY PROGRAM'S SESSIONS?
 *
 * ══ THE BUG THIS EXISTS TO FIX ══
 *
 * An invite SNAPSHOTS its workout rather than pointing at one, and for a very good reason (0093):
 * "the person you ask may not own the program, and 'next session' resolves from each athlete's own
 * completed count, so a pointer would open a different workout for each of you."
 *
 * That reasoning is right about the SENDER's program. It went one step too far and dropped the GUEST's
 * as well. So `writeWorkoutLaunch` carried a shape, a name, a partner and a start index — and no
 * `programId` at all — which meant a session trained with a friend saved with `program_id = null`,
 * `save_workout` wrote no `program_sessions` row, and Home went on offering the same day it had already
 * been trained. Reported from the field: two athletes finished Week 2 · Day 1 "Legs" together, and Home
 * still said Week 2 · Day 1 "Legs — Start Workout" afterwards. One of them re-logged the entire session
 * by hand because the app told him it had not happened.
 *
 * ══ WHAT COUNTS AS "THAT SESSION" ══
 *
 * We cannot ask the sender's program, and we must not: the guest's schedule is their own. So the shape
 * is matched against the GUEST's own open slots, and a slot is satisfied when EVERY main lift it
 * prescribes was in the workout they just did. Coverage, not equality — the shared shape often carries
 * more than the day's main work (a live session snapshots warm-ups too), and doing extra alongside your
 * prescribed lifts does not make it a different day.
 *
 * ⚠ OPEN SLOTS ARE WALKED IN SCHEDULE ORDER and the first covered one wins. It is deliberately not
 * restricted to the single next-owed session: 0119 built swapping precisely so that training Day D
 * instead of Day C credits Day D. Ties therefore resolve the same way `nextOpenSlot` resolves them,
 * which is the answer the progress bar and the server both already give.
 *
 * ⚠ NO MATCH IS A PERFECTLY GOOD ANSWER. It means the session saves unattributed — exactly what happens
 * today — so a guest on no program, or on a different one, is never credited with a day they don't have.
 *
 * Pure and node-testable: no React, no RN, no storage, no runtime `@` imports.
 */

import type { ProgramExercise, ProgramStructure } from '@/data/programs-live';
import { slotStates, type SessionMark } from './progress-core.ts';

/** The two fields an invite's snapshot carries that say WHICH lift this is. */
export interface SharedShapeExercise {
  catalogKey?: string | null;
  name: string;
}

/** A slot of the athlete's own program, 0-based — what `save_workout` needs to mark it done. */
export interface MatchedSlot {
  weekIndex: number;
  dayIndex: number;
}

const norm = (s: string | undefined | null): string => (s ?? '').trim().toLowerCase();

/**
 * Is this the same lift? — the identity rule this codebase already holds everywhere else.
 *
 * Catalogue key when BOTH sides have one, the exact name otherwise. It matters here more than usual:
 * a program day keeps the words its author wrote ("Bench press") while the invite's snapshot is built
 * through `exerciseNameFor(catalogKey)` and says "Barbell Bench Press". Same lift, same key, two
 * strings — and a name-only comparison would find nothing to credit.
 *
 * Mirrors `saveWorkout`'s `sameLift` and `fetchLastNotes` on purpose. Two answers to "which lift is
 * this" inside one app is how two surfaces drift apart.
 */
const sameLift = (a: { catalogKey?: string | null; name: string }, b: SharedShapeExercise): boolean =>
  a.catalogKey && b.catalogKey ? a.catalogKey === b.catalogKey : norm(a.name) === norm(b.name);

/**
 * The athlete's own program slot this shared workout satisfies, or null when it satisfies none.
 *
 * `marks` is `program_sessions` — every slot already trained OR skipped, which is what makes a slot
 * "open". Passing an empty list is the honest reading of a failed read: it means "nothing is known to be
 * done", so the first prescribed session is the candidate, which is what the schedule would offer anyway.
 */
export function matchSharedShapeToSlot(
  structure: ProgramStructure,
  marks: readonly SessionMark[],
  shape: readonly SharedShapeExercise[],
): MatchedSlot | null {
  if (!shape.length) return null;

  for (const slot of slotStates(structure, marks)) {
    // Touched already, or a rest day with nothing prescribed — neither is a session to credit.
    if (slot.state !== null || !slot.day) continue;
    const main: ProgramExercise[] = slot.day.main;
    // A day whose main work is empty cannot be "covered" by anything — `every` on an empty list is true,
    // and that would credit the first rest-shaped slot to any workout at all.
    if (!main.length) continue;

    if (main.every((prescribed) => shape.some((did) => sameLift(prescribed, did)))) {
      return { weekIndex: slot.weekIndex, dayIndex: slot.dayIndex };
    }
  }
  return null;
}
