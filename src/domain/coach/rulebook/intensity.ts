/**
 * HOW HARD HOLT PUSHES — the dial, and the reason a beginner's maximum is not an expert's.
 *
 * ══ THE ASK ══
 *
 * PO: *"Some people want to be pushed and in the middle of a set be told, let's go up 10 lbs. Some
 * people want just a helpful coaching daily 'be sure you feel it in your legs and not your back'."*
 * And then, on how far it should reach: *"If a beginner chooses the highest level of intensity it
 * shouldn't be as high of a level as an expert lifter. And then even some people that are experts don't
 * want a coach that's going to push them like that. Just reminders. So it's a very big range."*
 *
 * ══ ONE DIAL, INDEXED BY TWO THINGS ══
 *
 * The obvious build is to disable `drive` for beginners. It is the wrong one: a greyed-out option reads
 * as *"you're not good enough"*, which is precisely the anxiety posture `Active-Workout-Flow-Spec-W9-W16`
 * §"must never become" forbids, and under CL-D3 it is a silent narrowing of the athlete's world.
 *
 * So everybody sees four levels and picks freely — and the level indexes a matrix that EXPERIENCE also
 * indexes. Same label, materially different behaviour. Read the diagonal: on the three levers that touch
 * training content (`confirmSessions`, `intraSession`, `stepScale`), **`beginner` at `drive` is exactly
 * `intermediate` at `push`, and strictly below `intermediate` at `drive`.** A beginner who asks to be
 * pushed gets a LOUDER coach, never a more aggressive one. That is the PO's sentence as arithmetic
 * rather than as a disabled control.
 *
 * ══ ⚠ `EXPERIENCE_MULTIPLIER` IS NOT THIS DIAL AND MUST NOT BE MULTIPLIED BY IT ══
 *
 * `progression.ts` has `{ beginner: 1.5, intermediate: 1, advanced: 0.5 }` and it is tempting to read it
 * as aggression. It is the opposite: it encodes ADAPTATION RATE — novices genuinely add weight faster —
 * so it already runs the other way. Multiply the two and an aggressive beginner gets `1.5 × 2 = 3×`, a
 * thirty-pound jump on a back squat.
 *
 * That is why **`stepScale` is 1 in every beginner cell.** Their aggression is already inside the
 * multiplier; adding a second one double-counts it. Worked, on a back squat:
 *
 *   beginner@drive       max(10, 10×1.5) = 15, ×1   → 15 lb
 *   intermediate@drive   max(10, 10×1)   = 10, ×1.5 → 15 lb
 *   advanced@drive       max(10, 10×0.5) = 10 (floor), ×2 → 20 lb
 *   advanced@steady      → 10 lb, unchanged from today
 *
 * ══ WHAT THIS FILE MAY NEVER REACH ══
 *
 * Sets, reps, prescriptions and program structure. `assemble()`, `prescribe.ts` and `skeletons.ts` take
 * no intensity argument and must not gain one — those are PAS §10 volume bands re-checked by
 * `validate-program.ts`, and a settings toggle that can push somebody outside a locked band is a
 * settings toggle that can hurt them. Intensity is a coach's MANNER plus one load-decision threshold.
 *
 * And `back_off` is invariant across all twelve cells. `progression.ts`'s stated asymmetry — *"advancing
 * someone too fast costs them a rep, and it is the cheaper mistake to make in the other direction"* — is
 * the moral core of the whole engine. At maximum intensity the rescue behaviour is byte-identical.
 *
 * Pure and node-testable: no React, no RN, no storage, no runtime `@` imports.
 */

import type { Experience } from '../constraints.ts';

/** The four levels, quietest first. Order is meaningful — `LEVELS.indexOf` is the dial's position. */
export type IntensityLevel = 'reminders' | 'steady' | 'push' | 'drive';

export const INTENSITY_LEVELS: readonly IntensityLevel[] = ['reminders', 'steady', 'push', 'drive'];

export const DEFAULT_INTENSITY: IntensityLevel = 'steady';

/**
 * What Holt is willing to raise unprompted.
 *
 * ⚠ `safety` IS IN EVERY CELL, INCLUDING `reminders`. The quietest setting is not "no coach" — it is
 * "the technique cue and nothing else", which is literally the PO's second example. A dial that can
 * switch off *"feel it in your legs, not your back"* is a dial that can switch off the only thing
 * standing between a novice and a rounded back.
 */
export type Volunteerable = 'safety' | 'load_down' | 'load_up' | 'range';

export interface IntensityProfile {
  /** Hard cap on unprompted lines per session. 0 = he answers when asked and otherwise stays quiet. */
  volunteered: 0 | 1 | 2 | 3;
  speaks: readonly Volunteerable[];
  /** Which wording table the in-workout line is drawn from. Presentation only — never a different answer. */
  register: 'quiet' | 'plain' | 'direct';
  /**
   * Consecutive sessions topping the rep range before `add_weight` is offered.
   *
   * This is the honest meaning of "pushed": at 1 he takes a single good session as proof, at 2 he wants
   * it twice. It never invents readiness — both values still require the athlete to have topped the
   * range on every working set.
   */
  confirmSessions: 1 | 2;
  /** May offer a heavier next set DURING the exercise, off the set just logged. */
  intraSession: boolean;
  /** Multiplier on `incrementFor`. ⚠ Ceiling-capped there; 1 in every beginner cell. */
  stepScale: 1 | 1.5 | 2;
}

const p = (
  volunteered: IntensityProfile['volunteered'],
  speaks: readonly Volunteerable[],
  register: IntensityProfile['register'],
  confirmSessions: IntensityProfile['confirmSessions'],
  intraSession: boolean,
  stepScale: IntensityProfile['stepScale'],
): IntensityProfile => ({ volunteered, speaks, register, confirmSessions, intraSession, stepScale });

const SAFETY: readonly Volunteerable[] = ['safety'];
const DOWN: readonly Volunteerable[] = ['safety', 'load_down'];
const BOTH: readonly Volunteerable[] = ['safety', 'load_down', 'load_up'];
const ALL: readonly Volunteerable[] = ['safety', 'load_down', 'load_up', 'range'];

/**
 * The matrix. Twelve cells, and the diagonal is the whole design — see the header.
 *
 * ⚠ `reminders` is identical across all three experiences on every content lever, deliberately. Somebody
 * who asks for quiet gets quiet whoever they are; there is no version of "quiet, but for an expert".
 */
export const INTENSITY: Record<Experience, Record<IntensityLevel, IntensityProfile>> = {
  beginner: {
    reminders: p(0, SAFETY, 'quiet', 2, false, 1),
    steady: p(1, DOWN, 'plain', 2, false, 1),
    push: p(2, BOTH, 'plain', 1, false, 1),
    // ⚠ THE CLAMP. Louder than `push` (register + one more line) and identical on all three content
    // levers. A beginner at maximum equals an intermediate at `push`.
    drive: p(2, BOTH, 'direct', 1, false, 1),
  },
  intermediate: {
    reminders: p(0, SAFETY, 'quiet', 2, false, 1),
    steady: p(2, BOTH, 'plain', 1, false, 1),
    push: p(2, BOTH, 'direct', 1, true, 1),
    drive: p(3, ALL, 'direct', 1, true, 1.5),
  },
  advanced: {
    reminders: p(0, SAFETY, 'quiet', 2, false, 1),
    steady: p(2, BOTH, 'plain', 1, false, 1),
    push: p(3, ALL, 'direct', 1, true, 1.5),
    drive: p(3, ALL, 'direct', 1, true, 2),
  },
};

/**
 * The profile in force.
 *
 * ⚠ AN UNKNOWN EXPERIENCE RESOLVES TO `beginner`, NOT `intermediate` — and this is the one place that
 * rule differs from the rest of the app. `incrementFor` defaults an absent experience to the middle
 * because it is only sizing a jump. Here experience BOUNDS the dial, so an absent value has to fall to
 * the safest row: experience is device-local (`coach-memory.ts`), so "absent" is what every new phone
 * looks like, and the alternative is a fresh install quietly unlocking a harder coach.
 */
export function profileFor(level: IntensityLevel | null | undefined, experience: Experience | null | undefined): IntensityProfile {
  const row = INTENSITY[experience ?? 'beginner'] ?? INTENSITY.beginner;
  return row[level ?? DEFAULT_INTENSITY] ?? row[DEFAULT_INTENSITY];
}

/** Does this profile volunteer that kind of line at all? */
export const willSay = (profile: IntensityProfile, what: Volunteerable): boolean => profile.speaks.includes(what);

/** ⚠ There is no level above `drive` — see `CI-D7`. True when the athlete is already at the ceiling. */
export const atCeiling = (level: IntensityLevel): boolean => level === 'drive';
