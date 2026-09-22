/**
 * What "glute focus", "bigger arms" and "calves" mean to a block — CA-D3's *Focus given* state.
 *
 * ══ THE BLOCK KEEPS ITS GOAL AND ITS SPLIT ══
 *
 * 69 of 705 real requests named a muscle group. None of them asked for a different kind of program: the
 * athlete who says "strength, four days, glute focus" wants the strength block, upper/lower, with more
 * glute work in it. So a focus never picks the split and never changes the goal. It does two things, both
 * inside the caps `validate-program.ts` enforces:
 *
 *   1. **An extra slot** for the group, early in the days that already train it — early because a slot
 *      past the session's budget is a slot that never gets built. What it displaces is the tail of the
 *      day (usually the second core or isolation movement), which is exactly the trade a focus is.
 *   2. **An extra set** on every movement whose PRIMARY mover is the group, within the session's set
 *      ceiling. Never in a deload week — a deload is lighter by definition (PAS-D8), and a focus that
 *      survived into it would make the deload heavier than the check allows.
 *
 * ══ WHICH DAYS ══
 *
 * A big group is brought up on the days that already train it: glutes get their extra slot on a lower or
 * full-body day, never on a push day, because a hip thrust bolted onto a bench session is not a glute
 * focus, it is a mislabelled push day. Small, fast-recovering groups — calves and core — are the
 * exception, and get their slot on every day: that is how they are actually trained, often and short.
 *
 * ══ PATTERNS AND MUSCLES FROM THE CATALOGUE, NOT A LIST OF EXERCISES ══
 *
 * `slots` are catalogue `movementPattern` values and `muscles` are catalogue `primaryMuscleIds`, measured
 * against the 733 visible rows: glute-primary work lives under Hinge (49) and Hip Isolation (9);
 * hamstring-primary rows exist only under Elbow Flexion (the leg curls `coherence.ts` keeps out of a
 * biceps slot), so a hamstring focus is honestly an extra hinge. The slot's exercise is chosen from the
 * group's own primary movers first, then any movement that works the group at all, then the pattern's
 * usual answer — so a glute slot that can reach a hip thrust gets one, and a room that cannot still gets
 * a hinge rather than nothing.
 */

import type { FocusMuscle, Goal } from '../constraints.ts';

export interface FocusSpec {
  /** Movement patterns an extra slot may use, best first. One slot per pattern listed. */
  slots: readonly string[];
  /** Catalogue `primaryMuscleIds` that count as this group — for the extra set and the slot's pick. */
  muscles: readonly string[];
  /** Small and quick to recover: a slot on EVERY day, not only on days that already train the group. */
  everyDay: boolean;
}

export const FOCUS_SPEC: Record<FocusMuscle, FocusSpec> = {
  glutes: { slots: ['Hip Isolation', 'Hinge / Hip Dominant'], muscles: ['glutes'], everyDay: false },
  arms: { slots: ['Elbow Flexion', 'Elbow Extension'], muscles: ['biceps', 'triceps'], everyDay: false },
  biceps: { slots: ['Elbow Flexion'], muscles: ['biceps'], everyDay: false },
  triceps: { slots: ['Elbow Extension'], muscles: ['triceps'], everyDay: false },
  shoulders: {
    slots: ['Shoulder Isolation'],
    muscles: ['front_deltoids', 'lateral_deltoids', 'rear_deltoids'],
    everyDay: false,
  },
  chest: { slots: ['Horizontal Push'], muscles: ['chest'], everyDay: false },
  back: { slots: ['Horizontal Pull', 'Vertical Pull'], muscles: ['lats', 'upper_back'], everyDay: false },
  legs: {
    slots: ['Squat / Knee Dominant', 'Hinge / Hip Dominant'],
    muscles: ['quadriceps', 'hamstrings', 'glutes', 'calves'],
    everyDay: false,
  },
  quads: { slots: ['Squat / Knee Dominant'], muscles: ['quadriceps'], everyDay: false },
  hamstrings: { slots: ['Hinge / Hip Dominant'], muscles: ['hamstrings'], everyDay: false },
  calves: { slots: ['Calf / Ankle'], muscles: ['calves'], everyDay: true },
  core: { slots: ['Core'], muscles: ['rectus_abdominis', 'obliques'], everyDay: true },
};

/** Sets added to a primary mover of a focused group, per exercise, per non-deload week. */
export const FOCUS_EXTRA_SETS = 1;

/**
 * Where the extra slot goes in the day's list: after the lead two. The first movements are the day's
 * main lifts and the focus should not displace them; much later and a 30-minute session never reaches it.
 */
export const FOCUS_SLOT_INDEX = 2;

/**
 * Goals a focus shapes. ⚠ MOBILITY IS OUT: a mobility block prescribes holds under the `Mobility`
 * pattern, and "glute focus" there would bolt hip thrusts held for 45 seconds onto a stretching session —
 * the same failure `GOAL_STYLE_USE` exists to prevent. A goal missing from here takes the focus.
 */
export const FOCUS_APPLIES: Partial<Record<Goal, boolean>> = { mobility: false };

export const focusApplies = (goal: Goal): boolean => FOCUS_APPLIES[goal] ?? true;

/**
 * The extra slots one day gets, in order, for the athlete's focus list.
 *
 * A day earns a group's slots when it already lists one of the group's patterns anywhere in its slot
 * list (or when the group is `everyDay`). A pattern two focuses share is added once.
 */
export function focusSlotsFor(daySlots: readonly string[], focus: readonly FocusMuscle[]): string[] {
  const out: string[] = [];
  for (const f of focus) {
    const spec = FOCUS_SPEC[f];
    if (!spec) continue;
    if (!spec.everyDay && !spec.slots.some((p) => daySlots.includes(p))) continue;
    for (const p of spec.slots) if (!out.includes(p)) out.push(p);
  }
  return out;
}

/** Every primary-muscle id the focus list covers — the extra set's test. */
export const focusMuscleIds = (focus: readonly FocusMuscle[]): ReadonlySet<string> =>
  new Set(focus.flatMap((f) => FOCUS_SPEC[f]?.muscles ?? []));

/** The muscles an extra slot's pick should favour: the focused groups that list this pattern. */
export const focusMusclesForSlot = (pattern: string, focus: readonly FocusMuscle[]): ReadonlySet<string> =>
  new Set(focus.filter((f) => FOCUS_SPEC[f]?.slots.includes(pattern)).flatMap((f) => FOCUS_SPEC[f].muscles));
