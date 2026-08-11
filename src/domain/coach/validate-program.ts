/**
 * Three gates every generated program passes before anyone sees it.
 *
 *   1. **Catalogue** — every exercise is one the app can actually open
 *   2. **Structure** — the schedule walks cleanly and the counts agree
 *   3. **Policy** — PAS-D11 volume, PAS-D8 deload encoding, the Builder's own clamps
 *
 * ══ WHY A GENERATOR NEEDS A VALIDATOR AT ALL ══
 *
 * The assembler and this file are written against the same rulebook, so in principle it should be
 * impossible for one to produce something the other rejects. That is exactly why it is worth having: a
 * failure here means a table drifted, and a table that drifts silently produces a *consistently* wrong
 * program for everyone who asks. The tests run this over the whole goal × equipment × limitation matrix,
 * so drift fails in CI rather than in someone's week 3.
 *
 * It is also the seam the AI layer will land on. When the model hands over a constraint object, the
 * program it produces comes through here on the same terms as the wizard's — the AI never gets a path
 * that skips a gate.
 *
 * ══ FAILURES VS DEVIATIONS ══
 *
 * A failure means do not ship this. A deviation means PAS §10.1's own escape hatch applies — *"programs
 * authored outside these ranges require a written deviation note"* — and the note is the returned
 * object. The distinction exists because of one real, documented, unresolved thing: PAS-D11 is a
 * per-session rule and a 5- or 6-day program breaks its floor by construction, which the standard itself
 * flags against itself. Failing those would mean the coach cannot build a 6-day split at all, and
 * silently passing them would hide a known compliance gap. It reports.
 */

import type { ProgramDay, ProgramExercise, ProgramStructure } from '@/data/programs-live';
import { scheduleSlots, totalSessions } from '../program/progress-core.ts';

import {
  MAX_DAYS_PER_WEEK,
  MAX_WEEKS,
  MIN_DAYS_PER_WEEK,
  MIN_WEEKS,
} from './constraints.ts';
import { isCompound } from './candidates.ts';
import {
  bandFor,
  DELOAD_MARKER,
  deloadWeeks,
  HIGH_FREQUENCY_DAYS,
  type PasCategory,
} from './rulebook/volume.ts';

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// RESULT
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

export type FailureCode =
  | 'unknown_exercise'
  | 'empty_day'
  | 'schedule_mismatch'
  | 'weeks_out_of_range'
  | 'days_out_of_range'
  | 'sets_out_of_range'
  | 'reps_out_of_range'
  | 'volume_ceiling'
  | 'too_few_compounds'
  | 'deload_not_marked'
  | 'deload_not_lighter'
  | 'duplicate_exercise'
  | 'mileage_jump';

export interface Failure {
  code: FailureCode;
  message: string;
  weekIndex?: number;
  dayIndex?: number;
}

export interface Deviation {
  code: 'volume_floor_high_frequency' | 'volume_floor';
  message: string;
  weekIndex: number;
  dayIndex: number;
}

export interface ValidationResult {
  ok: boolean;
  failures: Failure[];
  deviations: Deviation[];
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// GATE 1 — CATALOGUE
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

const isCardio = (ex: ProgramExercise): boolean => ex.kind === 'cardio';

/**
 * Every prescribed movement must be one the athlete can reach.
 *
 * ⚠ THE POOL IS THE VISIBLE CATALOGUE, NOT THE FILE. `exercises.json` holds 809 records; the app shows
 * 733. Validating against the file would pass a program containing movements that cannot be opened,
 * searched for, or swapped — a dead row in a plan someone trusted, discovered mid-set.
 *
 * Cardio blocks are exempt: they carry an `activity`, not a `catalogKey`, and their vocabulary lives in
 * `conditioning.ts` rather than the exercise catalogue.
 */
function checkCatalogue(structure: ProgramStructure, known: ReadonlySet<string>, out: Failure[]): void {
  eachDay(structure, (day, weekIndex, dayIndex) => {
    for (const ex of day.main) {
      if (isCardio(ex)) continue;
      if (!ex.catalogKey || !known.has(ex.catalogKey)) {
        out.push({
          code: 'unknown_exercise',
          message: `"${ex.name}" is not in the visible catalogue`,
          weekIndex,
          dayIndex,
        });
      }
    }

    const keys = day.main.filter((e) => !isCardio(e)).map((e) => e.catalogKey);
    const dupes = keys.filter((k, i) => k != null && keys.indexOf(k) !== i);
    for (const d of new Set(dupes)) {
      // PAS §10.3: "No duplicate exercises per section." Two rows for one movement also split its volume
      // across two prescriptions, so neither reads as what the athlete is actually being asked to do.
      out.push({ code: 'duplicate_exercise', message: `${d} appears twice in one day`, weekIndex, dayIndex });
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// GATE 2 — STRUCTURE
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The schedule must walk, and the counts must agree.
 *
 * `scheduleSlots` is the function that already caught the ragged-week bug which killed Continue Training
 * at session 18 — a stride over weeks of unequal length, asking a five-day week for its sixth day. Running
 * it here means a generated program is held to the same walk the app will do to it.
 *
 * An empty day is a failure and not a curiosity: `trainingDays` filters days with no exercises, so a
 * program containing one is silently shorter than it says it is, and its graduation threshold moves.
 */
function checkStructure(structure: ProgramStructure, out: Failure[]): void {
  if (structure.weeks < MIN_WEEKS || structure.weeks > MAX_WEEKS) {
    out.push({
      code: 'weeks_out_of_range',
      message: `${structure.weeks} weeks is outside the Builder's ${MIN_WEEKS}–${MAX_WEEKS}`,
    });
  }
  if (structure.daysPerWeek < MIN_DAYS_PER_WEEK || structure.daysPerWeek > MAX_DAYS_PER_WEEK) {
    out.push({
      code: 'days_out_of_range',
      message: `${structure.daysPerWeek} days a week is outside the Builder's ${MIN_DAYS_PER_WEEK}–${MAX_DAYS_PER_WEEK}`,
    });
  }

  eachDay(structure, (day, weekIndex, dayIndex) => {
    if (day.main.length === 0) {
      out.push({
        code: 'empty_day',
        message: `${day.name} has no exercises — an empty day is dropped from the schedule, not shown as a rest day`,
        weekIndex,
        dayIndex,
      });
    }
  });

  let slots: ReturnType<typeof scheduleSlots>;
  try {
    slots = scheduleSlots(structure);
  } catch (e) {
    out.push({ code: 'schedule_mismatch', message: `the schedule could not be walked: ${String(e)}` });
    return;
  }

  const total = totalSessions(structure);
  if (slots.length !== total) {
    out.push({
      code: 'schedule_mismatch',
      message: `the schedule walks ${slots.length} sessions but the program counts ${total}`,
    });
  }
  const expected = structure.weeks * structure.daysPerWeek;
  if (total !== expected) {
    out.push({
      code: 'schedule_mismatch',
      message: `${structure.weeks} × ${structure.daysPerWeek} should be ${expected} sessions, not ${total}`,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// GATE 3 — POLICY
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

const setsOf = (day: ProgramDay): number =>
  day.main.reduce((n, ex) => n + (isCardio(ex) ? 0 : (ex.sets ?? 0)), 0);

const compoundsOf = (day: ProgramDay, patternOf: (key: string) => string | undefined): number =>
  day.main.filter((ex) => !isCardio(ex) && ex.catalogKey && isCompound(patternOf(ex.catalogKey) ?? '')).length;

/**
 * PAS-D11 volume, PAS-D7/D8 deloads, and the Builder's per-exercise clamps.
 *
 * The floor is the only band that ever becomes a deviation rather than a failure, and only in the two
 * documented cases: a deload week (PAS-A6 exempts it outright — obeying D7 and D8 breaks D11 by
 * construction, which is why the amendment exists) and a high-frequency program (PAS §10.1 flags its own
 * per-session rule as wrong for 5- and 6-day training and leaves the question open). The ceiling is never
 * relaxed anywhere, per PAS-A6-D2.
 */
function checkPolicy(
  structure: ProgramStructure,
  category: PasCategory,
  patternOf: (key: string) => string | undefined,
  out: Failure[],
  deviations: Deviation[],
): void {
  const deloads = deloadWeeks(structure.weeks);
  const highFrequency = structure.daysPerWeek >= HIGH_FREQUENCY_DAYS;

  eachDay(structure, (day, weekIndex, dayIndex) => {
    const isDeload = deloads.includes(weekIndex);
    const band = bandFor(category, isDeload);
    const exercises = day.main.length;
    const sets = setsOf(day);

    // ── Builder clamps: a program the Builder cannot render is a program the athlete cannot edit ──
    for (const ex of day.main) {
      if (isCardio(ex)) continue;
      if (ex.sets != null && (ex.sets < 1 || ex.sets > 8)) {
        out.push({ code: 'sets_out_of_range', message: `${ex.name}: ${ex.sets} sets is outside 1–8`, weekIndex, dayIndex });
      }
      if (ex.reps != null && (ex.reps < 1 || ex.reps > 60)) {
        out.push({ code: 'reps_out_of_range', message: `${ex.name}: ${ex.reps} reps is outside 1–60`, weekIndex, dayIndex });
      }
    }

    // ── Ceiling: never relaxed, not even in a deload (PAS-A6-D2) ──
    if (exercises > band.maxExercises) {
      out.push({
        code: 'volume_ceiling',
        message: `${day.name}: ${exercises} exercises exceeds ${category}'s ${band.maxExercises}`,
        weekIndex,
        dayIndex,
      });
    }
    if (band.maxSets != null && sets > band.maxSets) {
      out.push({
        code: 'volume_ceiling',
        message: `${day.name}: ${sets} sets exceeds ${category}'s ${band.maxSets}`,
        weekIndex,
        dayIndex,
      });
    }

    // ── Floor: a deviation, never a failure — see the doc comment ──
    if (!isDeload) {
      const underExercises = exercises < band.minExercises;
      const underSets = band.minSets != null && sets < band.minSets;
      if (underExercises || underSets) {
        deviations.push({
          code: highFrequency ? 'volume_floor_high_frequency' : 'volume_floor',
          message: highFrequency
            ? `${day.name}: below ${category}'s per-session floor (${exercises} exercises, ${sets} sets). PAS §10.1 flags this rule as unresolved for ${structure.daysPerWeek}-day training — the weekly total is higher, not lower.`
            : `${day.name}: below ${category}'s floor (${exercises} exercises, ${sets} sets) — usually the room, not the plan.`,
          weekIndex,
          dayIndex,
        });
      }

      if (band.minCompounds != null) {
        const compounds = compoundsOf(day, patternOf);
        if (compounds < band.minCompounds) {
          // Also a deviation: a bodyweight-only athlete cannot reach three compounds in some days, and
          // failing them would mean the coach refuses to serve anyone without equipment.
          deviations.push({
            code: 'volume_floor',
            message: `${day.name}: ${compounds} compound movements, ${category} asks for ${band.minCompounds}`,
            weekIndex,
            dayIndex,
          });
        }
      }
    }

    // ── PAS-D8 (1): the marker is the encoding, so its absence is a real defect ──
    if (isDeload && !day.name.includes(DELOAD_MARKER)) {
      out.push({
        code: 'deload_not_marked',
        message: `week ${weekIndex + 1} is a deload but "${day.name}" carries no ${DELOAD_MARKER}`,
        weekIndex,
        dayIndex,
      });
    }
    if (!isDeload && day.name.includes(DELOAD_MARKER)) {
      out.push({
        code: 'deload_not_marked',
        message: `"${day.name}" is marked ${DELOAD_MARKER} but week ${weekIndex + 1} is not a deload week`,
        weekIndex,
        dayIndex,
      });
    }
  });

  // ── PAS-D8 (2): a deload must actually be lighter than the week before it ──
  for (const w of deloads) {
    if (w === 0) continue;
    const before = weekDays(structure, w - 1);
    const during = weekDays(structure, w);
    const setsBefore = before.reduce((n, d) => n + setsOf(d), 0);
    const setsDuring = during.reduce((n, d) => n + setsOf(d), 0);
    if (setsDuring >= setsBefore) {
      out.push({
        code: 'deload_not_lighter',
        message: `week ${w + 1} is marked a deload but carries ${setsDuring} sets against week ${w}'s ${setsBefore}`,
        weekIndex: w,
      });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// WALKING
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

const weekDays = (s: ProgramStructure, weekIndex: number): ProgramDay[] =>
  (s.vary && s.weekPlans?.[weekIndex]?.days) || s.days;

function eachDay(
  s: ProgramStructure,
  fn: (day: ProgramDay, weekIndex: number, dayIndex: number) => void,
): void {
  for (let w = 0; w < s.weeks; w++) {
    const days = weekDays(s, w);
    for (let d = 0; d < days.length; d++) fn(days[d], w, d);
  }
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE GATE
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

export interface ValidateOptions {
  /** Every catalogue key the athlete can actually reach — built from `PICKER_DB`, never from the file. */
  knownKeys: ReadonlySet<string>;
  /** Movement pattern by key, for the compound count. Missing is treated as not-a-compound. */
  patternOf: (key: string) => string | undefined;
  category: PasCategory;
}

/**
 * Run all three gates.
 *
 * Never throws: a malformed structure is a result with failures in it, because the caller is a wizard
 * that has to say something to a person, not a script that can crash.
 */
export function validateProgram(structure: ProgramStructure, opts: ValidateOptions): ValidationResult {
  const failures: Failure[] = [];
  const deviations: Deviation[] = [];

  checkCatalogue(structure, opts.knownKeys, failures);
  checkStructure(structure, failures);
  checkPolicy(structure, opts.category, opts.patternOf, failures, deviations);

  return { ok: failures.length === 0, failures, deviations };
}

/** One line per problem, for a log or a developer-facing surface. Never shown to an athlete verbatim. */
export const explain = (r: ValidationResult): string =>
  [
    ...r.failures.map((f) => `FAIL ${f.code}: ${f.message}`),
    ...r.deviations.map((d) => `note ${d.code}: ${d.message}`),
  ].join('\n');
