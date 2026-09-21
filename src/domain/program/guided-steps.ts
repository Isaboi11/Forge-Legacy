/**
 * WHICH QUESTIONS THE GUIDED BUILDER ASKS, AND THE SMALL RULES AROUND THEM.
 *
 * ══ WHY THIS IS A DOMAIN MODULE AND NOT LINES IN THE SCREEN ══
 *
 * The same argument `domain/coach/intake-steps.ts` makes for Holt's wizard, and it applies here for the
 * same reason: skipping a question the profile already answers is the one edit that produces a
 * *plausible* wizard. The flow still runs, the program still builds, and the athlete simply never gets
 * asked something the engine then assumes. That failure is invisible on screen and `tsc` cannot see it.
 * It can be caught by a test, so it lives somewhere `node --test` can reach.
 *
 * ⚠ TYPE-ONLY IMPORTS, RELATIVE, WITH THE EXTENSION — `domain/**` runs under `node --test`, which
 *   type-strips but does not resolve the `@/` alias. This module deliberately imports nothing at all.
 */

/** Every card the guided builder can draw. The order in `stepsFor` IS the order on screen. */
export type GuidedStep = 'goal' | 'days' | 'weeks' | 'style' | 'remind' | 'name' | 'review';

/**
 * ⚠ THE SAME RANGE THE DENSE BUILDER OFFERS, and it must stay the same number.
 *
 * `program-builder.tsx` hints "1–52 weeks — a single week, or a multi-month block", and
 * `constraints.ts`'s `normalise()` clamps to the same pair. Three places, one range: a guided flow that
 * capped at 12 would make the presets a ceiling, which is exactly what the PO removed on 2026-09-20 —
 * *"With the weeks they need to be able to pick any number."*
 */
export const GUIDED_MIN_WEEKS = 1;
export const GUIDED_MAX_WEEKS = 52;

export const clampWeeks = (n: number): number =>
  Math.max(GUIDED_MIN_WEEKS, Math.min(GUIDED_MAX_WEEKS, Math.round(n)));

/**
 * The three lengths worth a tap, in the order a first-timer should weigh them.
 *
 * ⚠ THESE ARE A SHORTCUT, NEVER A CEILING. The stepper beside them reaches the full 1–52; these exist
 * so the common answers cost one tap rather than eight presses of `+`.
 */
export const weekPresets = (): readonly number[] => [4, 8, 12];

/**
 * ⚠ 2–6 AND NOT 1–7, because that is the range the rulebook can actually build.
 *
 * `STYLE_SPLITS` in `rulebook/skeletons.ts` authors every style at 2 through 6 days and nothing outside
 * it, and `constraints.ts`'s `normalise()` clamps `daysPerWeek` to the same pair. Offering seven would
 * be offering a number the engine silently rewrites.
 */
export const dayCountOptions = (): readonly number[] => [2, 3, 4, 5, 6];

/**
 * What each day count buys, in the athlete's terms rather than the engine's.
 *
 * Every option says what it GETS you, so the choice is a trade-off someone can weigh rather than
 * arithmetic they have to do. The wording stays deliberately short — these sit under a number on a
 * phone, not in a paragraph.
 */
export function daysBlurb(days: number): string {
  /* The PO's mockup copy (2026-09-21), under each tile's title — see `daysTitle`. */
  switch (days) {
    case 2:
      return 'Great if you’re short on time.';
    case 3:
      return 'A great starting point for most people.';
    case 4:
      return 'Builds strength and muscle effectively.';
    case 5:
      return 'More training, more progress.';
    case 6:
      return 'Best for experienced lifters.';
    default:
      return '';
  }
}

/** The tile's headline for each day count — the PO's mockup (2026-09-21). Pairs with `daysBlurb`. */
export function daysTitle(days: number): string {
  switch (days) {
    case 2:
      return 'Full-body focus';
    case 3:
      return 'Balanced training';
    case 4:
      return 'More training volume';
    case 5:
      return 'Higher frequency';
    case 6:
      return 'Advanced schedule';
    default:
      return '';
  }
}

/**
 * Which weekdays to pre-tick for a given training frequency.
 *
 * ⚠ THIS IS A REMINDER SCHEDULE AND NOTHING ELSE. `briefing_schedule` (migration `0159`) states the
 * rule in its own header — *"`days` IS WHEN THE BRIEFING FIRES, NOT WHEN THE ATHLETE TRAINS"* — and a
 * Forge program carries no weekday at all (`Program-Authoring-Standard` §2.2: *"Programs are
 * sequential, not calendar-based"*). So nothing derived here ever reaches `ProgramStructure`; it exists
 * to pick sensible days for a notification, and the screen says so above the chips.
 *
 * ⚠ SPREAD, NOT THE FIRST N. Mon/Wed/Fri rather than Mon/Tue/Wed: a rest day between sessions is the
 * spacing people hold onto longest, and pre-ticking three consecutive days would quietly recommend the
 * arrangement most likely to be abandoned. Six days is the one case with no gap to give.
 */
export function remindDefault(days: number): (1 | 2 | 3 | 4 | 5 | 6 | 7)[] {
  const byCount: Record<number, (1 | 2 | 3 | 4 | 5 | 6 | 7)[]> = {
    1: [1],
    2: [1, 4],
    3: [1, 3, 5],
    4: [1, 2, 4, 5],
    5: [1, 2, 3, 5, 6],
    6: [1, 2, 3, 4, 5, 6],
  };
  return byCount[Math.max(1, Math.min(6, Math.round(days)))] ?? [1, 3, 5];
}

export interface GuidedStepsInput {
  /**
   * Whether the goal still has to be asked.
   *
   * ⚠ FALSE MEANS THE PROFILE ANSWERED IT, NOT THAT IT DOES NOT MATTER. `coach-profile-live.ts` resolves
   * a failed read to an empty profile, so a network failure asks one more question rather than guessing
   * a goal — which is the direction this repo's standing lesson about defaults points.
   */
  askGoal: boolean;
}

/**
 * The cards, in order.
 *
 * ⚠ THE OPTIONAL STEP IS SPREAD IN PLACE, NEVER FILTERED OUT AFTERWARDS — the rule `intake-steps.ts`
 * states for the same reason: a `.filter()` over a fixed list produces the same array today and quietly
 * permits a future edit that reorders it. Spreading means a shorter flow, never a rearranged one.
 *
 * `review` is last and is not a question — it is the only screen that can save, which is what keeps the
 * flow from ever writing a program the athlete has not seen.
 */
export function stepsFor(input: GuidedStepsInput): GuidedStep[] {
  const goalStep: GuidedStep[] = input.askGoal ? ['goal'] : [];
  return [...goalStep, 'days', 'weeks', 'style', 'remind', 'name', 'review'];
}
