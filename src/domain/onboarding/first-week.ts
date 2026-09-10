/**
 * Turn what onboarding collected into the constraints `assemble()` needs — or refuse.
 *
 * ══ WHY THIS IS A MODULE AND NOT A FUNCTION IN `onboarding.tsx` ══
 *
 * The screen decides whether a brand-new athlete leaves setup holding a real program or holding the
 * "How do you want to start?" chooser, and that decision is made by a handful of conditions over six
 * answers. Those conditions cannot be reached by `node --test` inside a 1,000-line React component, and
 * the failure they guard against is the quiet kind: a mapping that produces *plausible* constraints
 * builds a plausible program for the wrong athlete, and nothing on screen says so.
 *
 * So the rule lives here, where a test can hold it to the two things that matter — that a buildable
 * answer set is genuinely complete by the engine's own `isComplete()`, and that an unbuildable one
 * returns null rather than something that merely compiles.
 *
 * ══ ⚠ REFUSING IS A FEATURE, NOT A GAP ══
 *
 * `coachGoalForGoalId` maps `endurance` and `athletic` to null. A race plan is built backwards from a
 * date this flow never asks for, and the rulebook has no Running family to fill one from — so those two
 * goals finish on the chooser exactly as they always did. Returning null here is the whole mechanism.
 * Do not "fix" it by substituting a strength goal: a runner handed a push/pull split is a worse first
 * week than no first week, and it is the kind of wrong nobody reports, they just leave.
 *
 * ⚠ TYPE-ONLY IMPORTS, RELATIVE, WITH THE EXTENSION — the rule `derive.ts` states in its own header.
 *   `domain/**` runs under `node --test`, which type-strips but does not resolve the `@/` alias.
 */
import type { CoachConstraints, Experience, SessionMinutes } from '../coach/constraints.ts';
import type { EquipmentId, GoalId } from './derive.ts';
import { coachEnvironmentFor, coachGoalForGoalId, environmentForEquipment, homeGymForEquipment } from './derive.ts';
import { CARDIO_ACTIVITIES } from '../workout/conditioning.ts';

/** Exactly what the onboarding screen holds by the time the finish runs. */
export interface FirstWeekAnswers {
  /** Up to 3; `goals[0]` is the primary and the only one that decides the block. */
  goals: readonly GoalId[];
  experience: Experience | null;
  equipment: readonly EquipmentId[];
  gear: readonly string[] | null;
  daysPerWeek: number | null;
  sessionMinutes: SessionMinutes | null;
}

/**
 * The constraints for this athlete's first program, or `null` when one cannot honestly be built.
 *
 * Null means: no primary goal, a goal the rulebook does not author a block for, or an unanswered
 * schedule. Every one of those is a refusal the caller turns into "finish on the chooser".
 */
export function constraintsForFirstWeek(a: FirstWeekAnswers): CoachConstraints | null {
  const goal = coachGoalForGoalId(a.goals[0] ?? null);
  if (!goal) return null;
  if (a.daysPerWeek == null || a.sessionMinutes == null) return null;

  /*
   * ⚠ NO `?? 'beginner'` FALLBACK ON EXPERIENCE, DELIBERATELY.
   *
   * Experience is a required step, so null here means something upstream changed — and guessing
   * `beginner` for an advanced lifter silently halves their first block's intensity. `intensity`'s own
   * test asserts a DIAGONAL invariant across those cells precisely because the difference is large.
   * Refusing sends them to the chooser, where they choose knowingly.
   */
  if (!a.experience) return null;

  /*
   * ⚠ TWO `Environment` ENUMS, KEPT APART ON PURPOSE (see `derive.ts` §coachEnvironmentFor). The profile
   *   enum has `dumbbells_only`; the coach's does not, and expresses it as `home` plus an owned list.
   *   `commercial_gym` is the default for an unanswered bucket because full-gym access is what the
   *   rulebook assumes when nothing narrows it — and equipment is a required step, so it is unreachable.
   */
  const environment = coachEnvironmentFor(
    a.equipment.length > 0 ? environmentForEquipment(a.equipment) : 'commercial_gym',
  );

  return {
    goal,
    // One answer covers both; nothing on this path builds a race plan (see the header).
    experience: { lifting: a.experience, running: a.experience },
    daysPerWeek: a.daysPerWeek,
    sessionMinutes: a.sessionMinutes,
    environment,
    ownedEquipment: homeGymForEquipment(a.equipment, a.gear) ?? [],
    /*
     * Both left for the goal's own defaults. `constraints.ts` documents `splitStyle: null` as "take the
     * goal's default" and calls the defaults good; limitations are per-build and Holt asks for them when
     * they matter. Asking either here would spend the step budget this whole change exists to protect.
     */
    limitations: [],
    excludeExercises: [],
    splitStyle: null,
  };
}

/**
 * One display line per entry in a built day.
 *
 * ══ ⚠ NOT EVERY ROW IN `main` IS A LIFT, AND `.name` IS UNDEFINED ON THE ONES THAT AREN'T ══
 *
 * A conditioning or weight-loss skeleton earns a CARDIO FINISHER — `skeletons.ts` calls the finisher
 * "the goal rather than a feature of the split" — and `prescribeCardio()` returns a different shape
 * entirely: `{ kind: 'cardio', activity, modality, targetSec }`, with **no `name` field**, pushed into
 * the same `main` array behind an `as ProgramExercise` cast. The cast is why `tsc` says nothing.
 *
 * So `main.map(e => e.name)` yields `undefined` for the last row of every fat-loss day, which renders as
 * a blank line on the one screen whose whole job is to make a first session look doable. Every reader of
 * `main` has to handle both shapes; this is that handling, in one tested place.
 */
export function dayLines(main: readonly unknown[]): string[] {
  const out: string[] = [];
  for (const raw of main) {
    const e = raw as { kind?: string; name?: string; activity?: string; targetSec?: number | null };
    if (e.kind === 'cardio') {
      const label = CARDIO_ACTIVITIES.find((a) => a.key === e.activity)?.name ?? 'Cardio';
      // Minutes, because that is what was prescribed — `prescribeCardio` deliberately doses a finisher in
      // time rather than distance so a slower athlete does not work longer for the same line.
      const mins = e.targetSec != null ? Math.round(e.targetSec / 60) : null;
      out.push(mins ? `${label} · ${mins} min` : label);
      continue;
    }
    // A lift with no name is not a thing this should invent a label for — drop it rather than render a
    // blank row or the word "Exercise".
    if (typeof e.name === 'string' && e.name.trim()) out.push(e.name.trim());
  }
  return out;
}
