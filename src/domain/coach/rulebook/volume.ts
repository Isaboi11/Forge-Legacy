/**
 * The volume guardrails, transcribed from `Docs/Program-Authoring-Standard-v1.0.md` §10.
 *
 * ══ THESE ARE NOT INVENTED, AND THAT IS THE POINT ══
 *
 * PAS-D11 (LOCKED) already states what a session of each category may contain, and Forge's own authored
 * programs are held to it by a human reviewer. The coach is a program author like any other, so it is
 * held to the same numbers — read from the doc, not re-derived. If the doc changes, this file changes,
 * and `validate-program.ts` starts failing the plans that no longer comply. That is the intended
 * relationship: the standard is upstream of the generator.
 *
 * ⚠ MAIN SECTION ONLY. Warm-up and cool-down are explicitly not counted (PAS §10.1).
 */

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** The PAS category vocabulary, restricted to the ones the coach can currently author. */
export type PasCategory =
  | 'STRENGTH'
  | 'HYPERTROPHY'
  | 'CONDITIONING'
  | 'FULL_BODY'
  | 'RUNNING'
  | 'MOBILITY';

export interface VolumeBand {
  /** Exercises in MAIN. */
  minExercises: number;
  maxExercises: number;
  /** Sets in MAIN. `null` for duration-based categories, where PAS states no set band. */
  minSets: number | null;
  maxSets: number | null;
  /** PAS §10.1 "Notes" column, where it carries a rule rather than a remark. */
  minCompounds?: number;
}

/**
 * PAS-D11 §10.1, verbatim.
 *
 *   | STRENGTH     | 4–6  | 15–25 | Minimum 3 compound movements per session |
 *   | HYPERTROPHY  | 5–8  | 18–30 | Higher end permissible at ADVANCED level |
 *   | CONDITIONING | 4–8  | 12–24 | Circuit rounds may count as sets         |
 *   | FULL_BODY    | 4–7  | 12–20 | HOME may use higher reps, lower weights  |
 *   | RUNNING      | 1–3  | n/a   | duration- or distance-based              |
 *   | MOBILITY     | 5–10 | n/a   | all holds use durationSeconds            |
 */
export const VOLUME_BANDS: Record<PasCategory, VolumeBand> = {
  STRENGTH: { minExercises: 4, maxExercises: 6, minSets: 15, maxSets: 25, minCompounds: 3 },
  HYPERTROPHY: { minExercises: 5, maxExercises: 8, minSets: 18, maxSets: 30 },
  CONDITIONING: { minExercises: 4, maxExercises: 8, minSets: 12, maxSets: 24 },
  FULL_BODY: { minExercises: 4, maxExercises: 7, minSets: 12, maxSets: 20 },
  RUNNING: { minExercises: 1, maxExercises: 3, minSets: null, maxSets: null },
  MOBILITY: { minExercises: 5, maxExercises: 10, minSets: null, maxSets: null },
};

/**
 * ⚠ PAS-A6 (LOCKED): a deload week is exempt from the FLOOR; the CEILING still applies.
 *
 * Not a convenience. PAS-D7 makes a deload mandatory at 7+ weeks and PAS-D8 cuts primary-compound sets
 * by 40–50%, which for a HYPERTROPHY session at the middle of its own band lands around 14 against a
 * floor of 18 — so obeying D7 and D8 breached D11 **by construction, every time**. Seven sessions across
 * two shipped programs were live examples of exactly that. The floor exists to guarantee a stimulus; a
 * deload's entire purpose is to remove one.
 */
export function bandFor(category: PasCategory, isDeload: boolean): VolumeBand {
  const b = VOLUME_BANDS[category];
  if (!isDeload) return b;
  return { ...b, minExercises: 0, minSets: null, minCompounds: undefined };
}

/**
 * ⚠ AN OPEN PRODUCT DECISION THE COACH INHERITS, NOT ONE IT SETTLES.
 *
 * PAS §10.1 flags it against itself: the guardrail is per-SESSION, but four shipped programs train five
 * and six days a week and sit below the floor because 14 sets × 5 sessions is more weekly work than 22
 * sets × 3. *"PAS-D11 is a per-session rule being applied to programs whose training reality is
 * per-week, and it silently penalises frequency."*
 *
 * The coach hits this the moment it builds a 5- or 6-day split, and it does not get to invent an answer.
 * It obeys the rule as written and reports the deviation, which is what PAS §10.1 asks any author to do
 * ("a written deviation note"). When the product decision lands, this is where it lands.
 */
export const PER_SESSION_FLOOR_IS_OPEN_FOR_HIGH_FREQUENCY = true;

/** Above this many sessions a week, a below-floor session is a known-open question, not a defect. */
export const HIGH_FREQUENCY_DAYS = 5;

/**
 * PAS-A7-D2 — at or below this many weeks, a block is a REPRESENTATIVE week, not an OPENING one.
 *
 * ══ WHY A SHORT BLOCK CANNOT BE AUTHORED BY THE ORDINARY RULE ══
 *
 * A periodised block ramps: week 1 sits at the BOTTOM of its rep range and later weeks climb it. That is
 * double progression, it is what `prescribeReps` implements, and it is why an opening week is deliberately
 * the easiest week — it is the entry point of a staircase.
 *
 * A one-week block has no later weeks to climb into. Authored by that rule it ships the introductory week
 * of a mesocycle that does not exist: the easiest week of a program the athlete will never see the rest
 * of. That is not a truncated block, it is the WRONG PRESCRIPTION — and the failure is silent, because
 * the output looks like a perfectly ordinary week 1.
 *
 * So at or below this length the prescription anchors at the MIDPOINT of the range and does not ramp. A
 * deload week, a travel week and a test week are all self-contained pieces of work an athlete could run
 * in isolation and be trained by, which is exactly what a short block is for.
 *
 * 3 is the boundary because PAS-D7's own first band already declines to require periodisation structure,
 * and because four weeks is where the Standard begins describing a program rather than a stretch of
 * training — the same line D-RCM-30 draws for rank credit, for the same reason.
 */
export const SHORT_BLOCK_WEEKS = 3;

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// DELOADS — PAS-D7 and PAS-D8
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * PAS-D7 — which weeks are deloads, by program length.
 *
 *   · 4–6 weeks   — none mandatory (optional, author's discretion; the coach declines the option)
 *   · 7–10 weeks  — one, at the PENULTIMATE week, leaving the final week as peak
 *   · 11–14 weeks — two: week 4 (closing the opening mesocycle) and the penultimate week
 *
 * Returned zero-based, because everything downstream indexes weeks from 0. PAS counts from 1, so
 * "week 4" is index 3 and "penultimate" is `weeks - 2`.
 *
 * Beyond 14 weeks PAS says nothing. The coach extends the 11–14 rule rather than inventing a third
 * regime: a deload closing each mesocycle, plus the penultimate week. Flagged as an extrapolation
 * because it is one.
 */
export function deloadWeeks(weeks: number): number[] {
  if (weeks <= 6) return [];
  if (weeks <= 10) return [weeks - 2];
  if (weeks <= 14) return [3, weeks - 2];

  // > 14 weeks: EXTRAPOLATED beyond the standard. Every fourth week closes a mesocycle, and the
  // penultimate week is always a deload so the final week can peak.
  const out: number[] = [];
  for (let w = 3; w < weeks - 2; w += 4) out.push(w);
  out.push(weeks - 2);
  return [...new Set(out)].sort((a, b) => a - b);
}

export const isDeloadWeek = (weekIndex: number, weeks: number): boolean =>
  deloadWeeks(weeks).includes(weekIndex);

/**
 * PAS-D8 — how a deload is encoded.
 *
 *   1. `[DELOAD]` in every slot name for that week
 *   2. sets on primary compounds cut 40–50% vs the preceding week
 *   3. the same `workoutsPerWeek` as every other week
 *   4. the same exercises as the preceding week — no new introductions
 *
 * (3) and (4) are the assembler's job; this is (2), and the 45% midpoint is chosen so the result sits
 * inside the stated range after rounding in either direction.
 */
export const DELOAD_SET_MULTIPLIER = 0.55;

/** The `[DELOAD]` marker PAS-D8 requires in the slot name. Matched by the validator, so it lives here. */
export const DELOAD_MARKER = '[DELOAD]';

export const deloadSets = (sets: number): number => Math.max(1, Math.round(sets * DELOAD_SET_MULTIPLIER));

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// GOAL → CATEGORY
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Which PAS category a goal is authored against.
 *
 * `weight_loss` maps to CONDITIONING rather than a category of its own, following the repo's own
 * precedent: `body-recomposition-foundation` is a Conditioning-family program. Losing weight is a
 * nutrition outcome with a conditioning-and-retain-muscle training plan attached, and pretending
 * otherwise would be the app's first dishonest claim.
 */
export const GOAL_CATEGORY = {
  strength: 'STRENGTH',
  muscle: 'HYPERTROPHY',
  weight_loss: 'CONDITIONING',
  conditioning: 'CONDITIONING',
  mobility: 'MOBILITY',
  run_5k: 'RUNNING',
  run_10k: 'RUNNING',
  run_half: 'RUNNING',
  run_marathon: 'RUNNING',
  triathlon: 'RUNNING',
} as const satisfies Record<string, PasCategory>;
