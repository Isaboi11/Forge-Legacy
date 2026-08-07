import type { ActiveSession, SessionSet } from './types';

/**
 * Pure active-workout metrics (W-9). Volume + PR detection are computed domain-side (unit-tested), not
 * in SQL or over a display string — then the finish commit persists them. PR = Epley e1RM (W-17 owns the
 * celebration; this just decides what's a record). Only DONE sets with a weight count.
 */

/** Epley estimated 1RM. */
export function e1rm(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

/** Effective reps for volume/e1RM — the entered actual, else the prescribed target. */
export function effectiveReps(s: SessionSet): number {
  return s.actualReps ?? s.targetReps;
}

/** Session volume = Σ weight × effectiveReps over done, weighted sets (rounded). */
export function sessionVolume(session: ActiveSession): number {
  let v = 0;
  for (const ex of session.exercises) {
    for (const s of ex.sets) {
      if (s.done && s.weight != null) v += s.weight * effectiveReps(s);
    }
  }
  return Math.round(v);
}

/** Count of completed sets. */
export function doneSetCount(session: ActiveSession): number {
  let n = 0;
  for (const ex of session.exercises) for (const s of ex.sets) if (s.done) n += 1;
  return n;
}

/** True once at least one set is logged — the strength minimum-to-save gate. */
export function hasLoggedSet(session: ActiveSession): boolean {
  return doneSetCount(session) > 0;
}

/** The shape a persisted set arrives in when a finished workout is read back. */
export interface PersistedSet {
  weight?: number | null;
  reps?: number | null;
  distance?: number | null;
  durationSec?: number | null;
}

/**
 * How many sets a finished exercise reports on The Record and in Activity History.
 *
 * A CONDITIONING BOUT counts as the one bout it is — a run is one unit of work, not the four rows some
 * future importer might split it into. Everything else counts every persisted row.
 *
 * It does NOT filter on weight, and that is the whole point of it living here with a test around it.
 * The Record screen used to count only sets with both a weight and a rep count, so three unweighted
 * warm-up sets rendered as "0 sets" beside a header that said 3. A row exists because a set was logged;
 * the load is a property of the set, not a licence for it to be counted.
 */
export function completionSetCount(sets: readonly PersistedSet[]): number {
  const isBout = sets.some((s) => (s.distance ?? 0) > 0 || (s.durationSec ?? 0) > 0);
  return isBout ? 1 : sets.length;
}

export interface DetectedPR {
  exercise: string;
  weight: number;
  reps: number;
  /** Exercise catalog id, so honors match the exercise rather than its display name (0078). */
  catalogKey?: string | null;
  /**
   * True when this is the athlete's FIRST mark on this lift.
   *
   * It is still written — there has to be something for the next session to beat — but it is not a
   * record and nothing announces it. Every surface that says the words "personal record" checks this.
   */
  isFirst: boolean;
}

/**
 * PRs for the session: per exercise, the best done set by e1RM; a PR if its e1RM beats the athlete's
 * current best for that exercise. `currentBestE1rm` maps exercise name → current best e1RM (0 if none).
 */
/**
 * The heaviest rep count that can set a strength record.
 *
 * A PR is a FACT — the most weight you have ever put on the bar and moved for a real set. Above five
 * reps you are training something else, and calling a heavier 12-rep set a record would mean comparing
 * two different efforts by arithmetic rather than by what happened. Improvements above this band are
 * still shown, on the Record's "How You Improved" — they are just not records.
 */
export const PR_MAX_REPS = 5;

/** The heaviest weight moved for 1–{@link PR_MAX_REPS} reps in these sets. Null when there was no such set. */
export function bestRecordWeight(sets: readonly SessionSet[]): number | null {
  let best: number | null = null;
  for (const s of sets) {
    /*
     * A BODYWEIGHT SET SETS NO WEIGHT RECORD. `weight: 0` is a real answer — the athlete marked the set
     * as carrying nothing — but a record measured in pounds cannot be 0 of them. Without this, the first
     * chin-up anyone logged wrote "Pull-Up — 0 lb" into their personal records and announced it.
     * The same reasoning as the cardio and warm-up exclusions in `detectPRs`: no load, no load record.
     */
    if (!s.done || s.weight == null || s.weight <= 0) continue;
    const reps = effectiveReps(s);
    if (reps < 1 || reps > PR_MAX_REPS) continue;
    if (best == null || s.weight > best) best = s.weight;
  }
  return best;
}

/**
 * What this session set as a record, and what merely established a mark.
 *
 * ══ NO ESTIMATED MAX, ANYWHERE ══
 *
 * This compared estimated 1RMs (Epley) across any rep count. Two problems, and the second is the one
 * that matters. An estimate is not a fact: an athlete told they set a 330 lb record never lifted 330 lb.
 * And the estimate inflates badly with reps — 60 lb × 25 computes to 110, which would beat a genuine
 * 80 lb triple. A record is now the heaviest weight actually moved for 1–5 reps, full stop.
 *
 * ══ THE FIRST TIME IS A BASELINE, NOT A RECORD ══
 *
 * Against a prior best of zero, every set a beginner performs is a "record" — which is exactly what an
 * athlete's real history showed: 3 lb, then 35, then 90, three records in a day, on a lift they had just
 * met. You cannot break a record you have never set. The first mark on an exercise is written (there has
 * to be something to beat) and announced to nobody.
 *
 * `priorBest` therefore uses UNDEFINED, not 0, for "never done this" — the whole distinction lives in
 * that difference, and a `?? 0` anywhere in here brings the flood straight back.
 */
export function detectPRs(
  session: ActiveSession,
  priorBest: Record<string, number | undefined>,
): DetectedPR[] {
  const prs: DetectedPR[] = [];
  /*
   * WHAT THIS SESSION HAS ALREADY SET, carried forward as we go.
   *
   * One lift can appear twice in a session — a program that lists it in two blocks, an athlete who adds
   * it again, a superset. `priorBest` is a snapshot taken before the session and never moves, so the
   * second entry was compared against the same old number as the first. Squat 310 then 300, against a
   * prior of 295, announced BOTH as records: the 300 is not a record, they had just done 310.
   *
   * A record is the heaviest thing you have done, including the thing you did twenty minutes ago.
   */
  const setThisSession: Record<string, number> = {};
  for (const ex of session.exercises) {
    /*
     * A PERSONAL RECORD IS A CLAIM ABOUT THE ATHLETE, so two classes of row never qualify.
     *
     * A REAL ONE FROM THE RECORD: "Light treadmill walk — 2 minutes" sat in an athlete's personal
     * records at 40 lb. A warm-up row, a weight typed into it, and the app told them they had set a
     * record on a walk.
     *
     *   · CARDIO blocks have no load. A weight on one is noise by definition.
     *   · WARM-UP and COOL-DOWN are deliberately submaximal. You do not set a record warming up.
     */
    if (ex.kind === 'cardio') continue;
    if (ex.section !== 'main') continue;

    const weight = bestRecordWeight(ex.sets);
    if (weight == null) continue; // nothing in the record band — a 4×12 day sets no records

    /*
     * WHICH LIFT THIS IS — the catalogue key when the app knows it, the written name when it does not.
     *
     * Identity used to be the display name alone, and a lift can carry two of those. An imported program
     * keeps the athlete's words on purpose ("Bench press"), while the picker writes the catalogue's name
     * ("Barbell Bench Press") — the same lift, the same `catalogKey`, two different strings. History was
     * split down the middle, so the second name began from nothing and then announced a 190 lb record to
     * an athlete who had already benched 225.
     *
     * The key is the honest identity: it is what every other part of the app already keys off — the
     * detail page, substitutions, equipment, honors. The name stays what the athlete wrote.
     */
    const id = ex.catalogKey ?? ex.name;
    const before = priorBest[id];
    const earlierToday = setThisSession[id];
    // The bar to beat is whichever is higher — history, or what they already lifted today.
    const prior = earlierToday == null ? before : before == null ? earlierToday : Math.max(before, earlierToday);
    // Undefined = first time on this lift, ever. Written as the mark, never announced as a record.
    const isFirst = before == null && earlierToday == null;
    if (!isFirst && weight <= (prior as number)) continue;
    setThisSession[id] = Math.max(earlierToday ?? 0, weight);

    const from = ex.sets.find((s) => s.done && s.weight === weight && effectiveReps(s) <= PR_MAX_REPS);
    prs.push({
      exercise: ex.name,
      weight,
      reps: from ? effectiveReps(from) : 1,
      catalogKey: ex.catalogKey ?? null,
      isFirst,
    });
  }
  return prs;
}


// ─────────────────────────────────────────────────────────────────────────────
// THE SEAL SCREEN'S HEADLINE — which one moment a finished session gets to claim
// ─────────────────────────────────────────────────────────────────────────────

/** The three things a finished session can lead with, in the order they outrank each other. */
export type CompletionHeroKind = 'pr' | 'milestone' | 'consistency' | null;

/**
 * Which headline a finished session earns — or none.
 *
 * ══ WHY THIS IS A FUNCTION AND NOT AN `if` CHAIN IN THE DATA LAYER ══
 *
 * It was an `if` chain, and it told a tester finishing his FIRST EVER workout
 * **"Consistency · Another one down"** — under "The first page is written", beside a note reading
 * "Your 1st session this chapter".
 *
 * The first session is the one case where every other branch is unreachable:
 *   · `pr` — the first time you lift something is a BASELINE, not a record (a deliberate rule that
 *     lives in the data layer's `hasHistory` check). A first session can never produce one.
 *   · `milestone` — every 10th session, and 1 is not a multiple of 10.
 *   · `consistency` — the catch-all, written for a repeat, inherited by the one session that is not.
 *
 * And it landed on the exact screen forbidden to say it. The first-run face in `workout-complete.tsx`
 * is gated on `isFirstWorkout` and cites the rule in its own comment: **ONB-D18 — "Arrival, not
 * achievement — no reward/rank/honor/streak language."** "Another one down" is streak language.
 *
 * Pure, so `node --test` can hold the rule directly instead of it living inside an async Supabase call
 * where nothing could reach it.
 */
export function completionHeroKind(input: {
  /** Did this session set a real record — a lift with history behind it? */
  hasPR: boolean;
  /** "Your Nth session this chapter", 1-based. Null when the session has no chapter. */
  chapterOrdinal: number | null;
  /** Is this the earliest saved workout in its chapter? */
  isFirstWorkout: boolean;
}): CompletionHeroKind {
  if (input.hasPR) return 'pr';
  /*
   * ARRIVAL, NOT ACHIEVEMENT (ONB-D18) — and checked BEFORE the ordinal branches, not after.
   *
   * Ordering it after `milestone` left "Milestone · 10th Session" reachable on a first workout. That
   * combination is impossible while `chapterOrdinal` and `isFirstWorkout` agree (the earliest session
   * in a chapter is its 1st), which is exactly why it should not be load-bearing: the rule is "a first
   * session claims nothing", not "a first session claims nothing as long as the arithmetic holds".
   *
   * Suppressed rather than reworded: the first-run face already says the arrival — "Your Chapter
   * begins", the medallion, "The first page is written", and two honest stats. A fourth line
   * congratulating them on consistency they have not had yet is what the decision rules out.
   *
   * A PR deliberately still wins, above — see the test that pins it.
   */
  if (input.isFirstWorkout) return null;
  if (input.chapterOrdinal && input.chapterOrdinal % 10 === 0) return 'milestone';
  if (input.chapterOrdinal) return 'consistency';
  return null;
}
