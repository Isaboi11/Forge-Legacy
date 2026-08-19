/**
 * WHICH QUESTIONS THE WIZARD STILL HAS TO ASK.
 *
 * ══ WHY THIS IS A DOMAIN MODULE AND NOT A LINE IN THE SCREEN ══
 *
 * It was a line in the screen — a nested ternary over `mode`, `endurance` and `focusKind` — and that was
 * survivable while every athlete answered every question. Skipping questions the profile already answers
 * makes this the one place where a wrong boolean produces a *plausible* wizard: the flow still runs, the
 * program still builds, and the athlete simply never gets asked something the engine then invents. That
 * failure is invisible on screen and cannot be caught by `tsc`. It can be caught by a test, so it lives
 * somewhere a test can reach it.
 *
 * `missingFor()` in `constraints.ts` answers the same question for the ENGINE — which fields it cannot
 * proceed without. This answers it for the SCREEN — which cards to draw, in which order. They are
 * deliberately separate: the screen asks about things the engine has defaults for (split style) and skips
 * things the engine requires but the profile supplies (goal, experience, environment).
 */

/** Every card the wizard can draw. The order within a flow below IS the order on screen. */
export type StepId =
  | 'goal'
  | 'race_when'
  | 'race_base'
  | 'race_can_run'
  | 'race_result'
  | 'days'
  | 'style'
  | 'focus'
  | 'muscles'
  | 'where'
  | 'gear'
  | 'time'
  | 'experience'
  | 'limits';

export interface IntakeStepsInput {
  /** A full block, or one session. `null` is the chooser, which draws no steps at all. */
  mode: 'program' | 'day' | null;
  /** Whether the resolved goal is a race goal — a different flow, not a variation of one. */
  endurance: boolean;
  /** Day mode only: a named split, or a hand-picked set of muscles (which needs a second card). */
  focusKind: 'split' | 'body_parts' | null;
  /**
   * Whether the athlete chose "Limited Equipment" and is naming their gear for this build.
   *
   * ⚠ TRUE MEANS "THE GRID IS OPEN", NOT "THEY OWN SOMETHING". It follows `pickedGear != null`, so an
   * athlete who opened the grid and ticked nothing still gets the card — that is how "nothing but me and
   * the floor" is stated rather than assumed.
   */
  namingGear: boolean;
  /** What they run in a normal week, once asked. Decides whether the run/walk question is worth asking. */
  weeklyMi: number | null;

  // ── What onboarding already answered (see `data/coach-profile-live.ts`) ──────────────────────────
  askGoal: boolean;
  askWhere: boolean;
  askExperience: boolean;
}

/**
 * ⚠ THE THREE SKIPPABLE STEPS ARE SPREAD IN PLACE, NEVER FILTERED OUT AFTERWARDS.
 *
 * A `.filter()` over a fixed list would produce the same array today and would quietly permit a future
 * edit that reorders it. Building each flow with the optional cards spread at their own position means
 * the remaining questions arrive in exactly the order they always have — a shorter flow, not a
 * rearranged one — and the diff of any future change to the order is visible here.
 */
export function intakeSteps(input: IntakeStepsInput): StepId[] {
  const { mode, endurance, focusKind, namingGear, weeklyMi, askGoal, askWhere, askExperience } = input;
  if (mode == null) return [];

  const gear: StepId[] = namingGear ? ['gear'] : [];
  const whereSteps: StepId[] = askWhere ? ['where', ...gear] : [];
  const experienceStep: StepId[] = askExperience ? ['experience'] : [];

  if (mode === 'program' && endurance) {
    /* `race_can_run` only appears for someone whose mileage has not already answered it — asking a
       30-mile-a-week runner whether they can run for twenty minutes is the wizard not listening.
       ⚠ `?? 99` and not `?? 0`: an unanswered mileage must not look like zero, which is the one value
       that WOULD make the question necessary. */
    const canRunStep: StepId[] = (weeklyMi ?? 99) <= 3 ? ['race_can_run'] : [];
    return [
      /* ⚠ NEVER SKIPPED, even when the profile named a goal. `coachGoalForGoalId` resolves the coarse
         `endurance` bucket to null precisely because five race goals sit behind it, so an athlete only
         reaches this flow by having picked the race here. There is no path where this is redundant. */
      'goal',
      'race_when',
      'race_base',
      ...canRunStep,
      'race_result',
      'days',
      ...experienceStep,
      'limits',
    ];
  }

  if (mode === 'program') {
    return [...(askGoal ? (['goal'] as StepId[]) : []), 'days', 'style', ...whereSteps, 'time', ...experienceStep, 'limits'];
  }

  /* A single session never asks the goal — `buildDayWorkout` does not take one. It asks what is being
     trained today, which is a different question with a different answer most days. */
  return focusKind === 'body_parts'
    ? ['focus', 'muscles', ...whereSteps, 'time', ...experienceStep, 'limits']
    : ['focus', ...whereSteps, 'time', ...experienceStep, 'limits'];
}
