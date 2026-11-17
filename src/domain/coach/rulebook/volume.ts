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
// WEEKLY SETS PER MUSCLE — the PB-2 volume model (PAS §11.2, PAS-A4 LOCKED, and the evidence base)
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/*
 * ══ WHY A WEEKLY MODEL, AND WHY IT IS A TABLE ══
 *
 * PAS-D11 above is per SESSION, and a four-day "Muscle Block" shipped chest at 3–7 sets a week with every
 * session inside 18–30 (AI audit 11-16, B-D2), because one muscle was missing from half the sessions. The
 * per-session band cannot see that; only a weekly count per muscle can (B-G3).
 *
 * The bands are DATA, one row per goal category × experience × muscle — no goal has a code branch. The
 * builder (`volume-balance.ts`) reads this table, and `matrix.test.mjs` holds every build it can make to it.
 * Change a number here and both move.
 *
 * ══ HOW A SET COUNTS — PAS-A4-D1 (LOCKED) ══
 *
 * 1.0 for each PRIMARY muscle of the exercise, 0.5 for each SECONDARY, from `exercise_muscles.json`. It is
 * also the counting that fit the evidence best: Pelland et al. (2024, "The Resistance Training Dose
 * Response", meta-regression of ~67 studies) compared direct-only, total and fractional (indirect = 0.5)
 * set counts and found the fractional count predicted hypertrophy and strength best. The tags it reads are
 * held to `coherence.ts`'s muscle-tag rules, because a wrong tag is now a wrong dose.
 *
 * ══ THE TWELVE GROUPS — PAS-A4-D2 (LOCKED) ══
 *
 * The twelve the Muscle Building Intermediate Blueprint calls major (and its test asserts), with the delts as
 * three heads, never one "Shoulders" row: pressing feeds the front head whatever you do, and nothing but
 * direct work feeds the lateral or rear head. Back is two groups — lats (vertical pulling) and upper back
 * (rows) — for the same reason: one total hides a program that only ever pulls down.
 */

/** A muscle the weekly model counts. Each is a catalogue muscle id (`muscles.json`). */
export type VolumeGroup =
  | 'chest'
  | 'lats'
  | 'upper_back'
  | 'front_deltoids'
  | 'lateral_deltoids'
  | 'rear_deltoids'
  | 'biceps'
  | 'triceps'
  | 'quadriceps'
  | 'hamstrings'
  | 'glutes'
  | 'calves';

export const VOLUME_GROUPS: readonly VolumeGroup[] = [
  'chest',
  'lats',
  'upper_back',
  'front_deltoids',
  'lateral_deltoids',
  'rear_deltoids',
  'biceps',
  'triceps',
  'quadriceps',
  'hamstrings',
  'glutes',
  'calves',
];

/**
 * The movement patterns that train a group DIRECTLY — where the builder looks when a group needs another
 * exercise, and how it decides a group is trainable in this room at all (a primary mover exists in one of
 * them). An upper group is never fed from a leg pattern, so a lateral raise can never be the answer for a
 * hamstring.
 */
export const GROUP_PATTERNS: Readonly<Record<VolumeGroup, readonly string[]>> = {
  chest: ['Horizontal Push'],
  lats: ['Vertical Pull'],
  upper_back: ['Horizontal Pull'],
  front_deltoids: ['Vertical Push', 'Shoulder Isolation'],
  lateral_deltoids: ['Shoulder Isolation'],
  rear_deltoids: ['Shoulder Isolation', 'Horizontal Pull'],
  biceps: ['Elbow Flexion'],
  triceps: ['Elbow Extension'],
  quadriceps: ['Squat / Knee Dominant'],
  hamstrings: ['Hinge / Hip Dominant'],
  glutes: ['Hinge / Hip Dominant', 'Hip Isolation'],
  calves: ['Calf / Ankle'],
};

/** PAS-A4-D1 — a set counts 1.0 for the exercise's PRIMARY muscles and 0.5 for each SECONDARY. */
export const PRIMARY_SET_WEIGHT = 1;
export const SECONDARY_SET_WEIGHT = 0.5;

export interface WeeklyBand {
  /** Sets a WORKING week must give the group (PAS-A4-D3: a deload sits under it on purpose). */
  min: number;
  /** Sets no week may exceed — recoverable volume, held in every week. */
  max: number;
}

type Level = 'beginner' | 'intermediate' | 'advanced';

export interface CategoryVolume {
  /**
   * The weekly frequency the floors are written for. Below it, a floor scales with the days actually
   * trained (`weeklyBandFor`); the ceiling never does.
   */
  referenceDays: number;
  bands: Readonly<Record<Level, Readonly<Record<VolumeGroup, WeeklyBand>>>>;
}

/** One band for a list of groups — the table below is written group by group through this. */
const bandRows = (groups: readonly VolumeGroup[], band: WeeklyBand): Partial<Record<VolumeGroup, WeeklyBand>> =>
  Object.fromEntries(groups.map((g) => [g, band]));

const LARGE: readonly VolumeGroup[] = ['chest', 'lats', 'upper_back', 'front_deltoids', 'quadriceps', 'hamstrings', 'glutes'];
const ARMS: readonly VolumeGroup[] = ['biceps', 'triceps'];
const SMALL: readonly VolumeGroup[] = ['lateral_deltoids', 'rear_deltoids', 'calves'];
const ALL = VOLUME_GROUPS;

const levelOf = (parts: Partial<Record<VolumeGroup, WeeklyBand>>[]): Record<VolumeGroup, WeeklyBand> =>
  Object.assign({}, ...parts) as Record<VolumeGroup, WeeklyBand>;

/**
 * ══ THE BANDS — sets per muscle per working week, PAS-A4-D1 counting ══
 *
 * HYPERTROPHY (the `muscle` goal) — written for 4 days, PAS §11.2's default frequency:
 *   · intermediate / advanced: 10–20 for the seven large groups (chest, lats, upper back, front delt, quads,
 *     hamstrings, glutes). PAS §11.2 / PAS-A4-D4 make 10–20 the governing band, and Schoenfeld, Ogborn &
 *     Krieger (2017, J Sports Sci) found 10+ weekly sets beat fewer.
 *   · ⚠ THE ARMS (8) AND THE LATERAL DELT, REAR DELT AND CALF (6) SIT BELOW 10 — A WRITTEN DEVIATION
 *     (PAS §10.1), NOT A TRANSCRIPTION. ✅ PO approved 2026-11-17 (with the frequency scaling below). The Muscle Building Intermediate program
 *     already needed one for the same three small groups (its test's BAND_EXEMPT: 8 / 9 / 8 — reaching 10
 *     "took six sets of raises a session, which no coach would prescribe"), and that program runs up to
 *     eight movements a session. Holt's hour is six: twelve groups at 10 do not fit six-exercise upper
 *     days, measured over the whole matrix. 8 for the arms holds because every press and pull already feeds
 *     them half a set; 6 for the small three is the Foundation Blueprint's own floor for calves and the arms
 *     (6–10) and the practitioner minimum-effective dose for those heads (Israetel et al., RP volume
 *     landmarks). A 75-minute session reaches higher on its own.
 *   · advanced keeps the same band. PAS-D11 lets an ADVANCED session run to its ceiling; the weekly ceiling
 *     stays 20 because above ~20 the returns flatten sharply (Pelland et al. 2024) while the recovery bill
 *     does not.
 *   · beginner: 8 for the large groups, 6 for the arms, 4 for the small three, ceiling 16 — the Muscle
 *     Building Foundation Blueprint §4 ("the low end of each band": chest 8–12, biceps / triceps 6–10,
 *     shoulders 8–12 for all three heads together). A novice grows on less (ACSM 2009 progression position
 *     stand: 1–3 sets per exercise), so the ceiling sits below the intermediate one.
 *
 * STRENGTH (`strength`, `health`) — written for 3 days, PAS §11.1's Foundation frequency:
 *   · the seven large groups 6–20 (beginner 4–16). Strength is built by the main lifts at low reps;
 *     Ralston et al. (2017, Sports Med) found useful strength gains from as little as ~5 weekly sets, with
 *     more helping only modestly. The arms, lateral and rear delts and calves are accessories in a strength
 *     block: floor 0 (no direct work is owed), ceiling held.
 *
 * CONDITIONING (`conditioning`, `weight_loss`) — written for 3 days:
 *   · the six large movers other than the front delt 4–16 (beginner 3–16), everything else 0–16. The goal is
 *     the conditioning; the lifting is there to keep the muscle while the weight comes off, and maintenance
 *     needs about a third of the volume that built it (Bickel, Cross & Bamman 2011, MSSE). The ceiling is
 *     16, not 20, for the reason PAS-D11 caps a conditioning session at 24 sets against hypertrophy's 30 —
 *     someone in a deficit recovers from less (`skeletons.ts`, "the hypertrophy SHAPE at the conditioning
 *     DOSE").
 *
 * MOBILITY and RUNNING have no row: their work is holds and miles, not sets of a muscle.
 *
 * ⚠ A FLOOR IS OWED ONLY WHERE THE GROUP CAN BE TRAINED. A bodyweight room with no bar has no vertical
 * pull, and a shoulders limitation removes the raises — `trainableGroups` in `volume-balance.ts` decides,
 * with the same gates every slot fill uses, and Holt already says what a limitation took out.
 */
export const WEEKLY_SET_BANDS: Partial<Record<PasCategory, CategoryVolume>> = {
  HYPERTROPHY: {
    referenceDays: 4,
    bands: {
      beginner: levelOf([bandRows(LARGE, { min: 8, max: 16 }), bandRows(ARMS, { min: 6, max: 16 }), bandRows(SMALL, { min: 4, max: 16 })]),
      intermediate: levelOf([bandRows(LARGE, { min: 10, max: 20 }), bandRows(ARMS, { min: 8, max: 20 }), bandRows(SMALL, { min: 6, max: 20 })]),
      advanced: levelOf([bandRows(LARGE, { min: 10, max: 20 }), bandRows(ARMS, { min: 8, max: 20 }), bandRows(SMALL, { min: 6, max: 20 })]),
    },
  },
  STRENGTH: {
    referenceDays: 3,
    bands: {
      beginner: levelOf([bandRows(ALL, { min: 0, max: 16 }), bandRows(LARGE, { min: 4, max: 16 })]),
      intermediate: levelOf([bandRows(ALL, { min: 0, max: 20 }), bandRows(LARGE, { min: 6, max: 20 })]),
      advanced: levelOf([bandRows(ALL, { min: 0, max: 20 }), bandRows(LARGE, { min: 6, max: 20 })]),
    },
  },
  CONDITIONING: {
    referenceDays: 3,
    bands: {
      beginner: levelOf([bandRows(ALL, { min: 0, max: 16 }), bandRows(LARGE.filter((g) => g !== 'front_deltoids'), { min: 3, max: 16 })]),
      intermediate: levelOf([bandRows(ALL, { min: 0, max: 16 }), bandRows(LARGE.filter((g) => g !== 'front_deltoids'), { min: 4, max: 16 })]),
      advanced: levelOf([bandRows(ALL, { min: 0, max: 16 }), bandRows(LARGE.filter((g) => g !== 'front_deltoids'), { min: 4, max: 16 })]),
    },
  },
};

/**
 * The band one group is held to this week, or null where the category states none.
 *
 * ⚠ THE FLOOR SCALES WITH FREQUENCY BELOW THE REFERENCE, AND THAT IS A CHOICE, NOT A TRANSCRIPTION. PAS
 * states no band for a two- or three-day hypertrophy week. Two full-body sessions cannot carry ten sets for
 * twelve groups (the session ceiling is 30), so a two-day week owes half the four-day floor: each group is
 * still trained every week at a dose the evidence calls effective (Schoenfeld 2017's lowest bracket still
 * grew muscle). Rounded down to the whole set — a 4.5 calf floor at three days would demand a fifth set
 * of the only calf raise in the week. ✅ PO approved 2026-11-17, as part of the PAS §10.1 deviation above.
 */
export function weeklyBandFor(
  category: PasCategory,
  experience: Level,
  group: VolumeGroup,
  daysPerWeek: number,
): WeeklyBand | null {
  const table = WEEKLY_SET_BANDS[category];
  if (!table) return null;
  const band = table.bands[experience][group];
  const share = Math.min(1, daysPerWeek / table.referenceDays);
  return { min: Math.floor(band.min * share), max: band.max };
}

/** What one set of an exercise credits each group — 1 primary, 0.5 secondary, nothing otherwise. */
export function creditOf(ex: { primaryMuscleIds: readonly string[]; muscleIds: readonly string[] }, group: VolumeGroup): number {
  if (ex.primaryMuscleIds.includes(group)) return PRIMARY_SET_WEIGHT;
  if (ex.muscleIds.includes(group)) return SECONDARY_SET_WEIGHT;
  return 0;
}

/** A week's sets per group, PAS-A4-D1 counting. Rows without muscles (cardio, an unknown key) count nothing. */
export function weeklyMuscleSets(
  rows: readonly { sets: number; primaryMuscleIds: readonly string[]; muscleIds: readonly string[] }[],
): Record<VolumeGroup, number> {
  const out = Object.fromEntries(VOLUME_GROUPS.map((g) => [g, 0])) as Record<VolumeGroup, number>;
  for (const r of rows) for (const g of VOLUME_GROUPS) out[g] += r.sets * creditOf(r, g);
  return out;
}

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
  /* ⚠ STRENGTH, NOT CONDITIONING — and the catalogue already made this call. Its own answer for a
     health goal at a gym is `fbh-full-body-3`, which resolves to Strength Foundation I: a full-body
     3-day in the Strength family. "Feel good, move well, stay strong for life" is built by pressing,
     pulling, squatting and hinging at a sustainable volume, not by circuits — routing it to
     CONDITIONING would have made it a gentler `weight_loss`, which is not what anybody means by it. */
  health: 'STRENGTH',
  run_5k: 'RUNNING',
  run_10k: 'RUNNING',
  run_half: 'RUNNING',
  run_marathon: 'RUNNING',
  triathlon: 'RUNNING',
} as const satisfies Record<string, PasCategory>;
