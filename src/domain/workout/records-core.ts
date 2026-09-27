import { PR_MAX_REPS } from './metrics.ts';

/**
 * PERSONAL RECORDS — the one definition, and which workout set each one (QA F9, 2026-09-26).
 *
 * ══ WHAT WENT WRONG ══
 *
 * Every screen answered "what is my best bench?" and "did this session set a record?" its own way:
 *
 *   · Activity History / Detail put a PR chip on EVERY session trained that UTC day that contained the
 *     lift, because `personal_records` carries a date and a name but no workout id. A session that
 *     benched 135×8 wore the trophy for "150 lb Barbell Bench Press" — a weight it never lifted.
 *   · The completion screen matched on "today" by the device clock and on the display name only.
 *   · Legacy listed EVERY row as a PR — including the first-ever mark on a lift, which `detectPRs`
 *     deliberately writes as a baseline and announces to nobody — and listed each one twice, once from
 *     `personal_records` and once from the `ACCOMPLISHMENT` timeline event `save_workout` also writes.
 *   · Progress's pinned headline took the heaviest row at ANY rep count, while the Active Workout's Best
 *     card and PR detection took 1–{@link PR_MAX_REPS} reps.
 *
 * ══ THE ONE DEFINITION ══
 *
 *   · A lift's BEST is the heaviest load moved for 1–{@link PR_MAX_REPS} reps (`metrics.ts` settled why);
 *     a tie goes to the one done for more reps. {@link bestMark} is the only function that computes it.
 *   · A row is a RECORD when an earlier mark on the same lift exists and this one is strictly heavier.
 *     The first mark is a baseline. {@link annotateRecords} decides it from the rows themselves, so it
 *     also holds for rows written before the client learned the rule.
 *   · A record belongs to the SESSION THAT LIFTED IT: a workout on that day (or the day before — the
 *     row's date is the server's `current_date` at SAVE time, and a session started before midnight UTC
 *     saves after it) that contains a main-section set of that lift at exactly that weight, 1–5 reps.
 *     Of several, the same-day one, then the earliest — the first session to lift a weight is the one
 *     that broke the record; a later equal lift did not beat anything. See {@link recordsByWorkout}.
 *
 * No migration: the sets are already the evidence. Pure, so `node --test` holds every rule here.
 */

/** A `personal_records` row, as the client reads it. Only load rows are records of a lift. */
export interface RecordRow {
  id?: string | null;
  exercise: string;
  catalog_key?: string | null;
  load_value: number | string | null;
  load_reps: number | null;
  achieved_on: string | null;
  created_at?: string | null;
}

/** A lift, as the logger and the reads carry it. */
export interface LiftIdentity {
  catalogKey?: string | null;
  name: string;
}

/** The standing mark on a lift: heaviest load for 1–{@link PR_MAX_REPS} reps. Pounds. */
export interface LiftMark {
  weight: number;
  reps: number;
  /** ISO date. Null on rows saved without one — render the mark without a date. */
  achievedOn: string | null;
}

export interface AnnotatedRecord {
  row: RecordRow;
  /** The lift this row is filed under — catalogue key, or the name for rows that predate keys. */
  lift: string;
  weight: number;
  reps: number;
  /** The first mark ever on this lift: stored as a baseline, never announced as a record. */
  isFirst: boolean;
  /** Strictly heavier than every earlier mark on the lift — a record worth the word. */
  isRecord: boolean;
}

/** A record, attributed to the session that set it. `exercise` is that session's name for the lift. */
export interface WorkoutRecord {
  exercise: string;
  catalogKey: string | null;
  weight: number;
  reps: number;
  achievedOn: string | null;
}

/** One saved session in the shape attribution needs. Sets are the persisted (done) sets. */
export interface AttributionWorkout {
  id: string;
  startedAt: string;
  exercises: {
    name: string;
    catalogKey?: string | null;
    section?: string | null;
    sets: { weight: number | string | null; reps: number | null }[];
  }[];
}

/** 1–{@link PR_MAX_REPS} reps: the band a record can be set in. */
export const inRecordBand = (reps: number | null | undefined): reps is number =>
  reps != null && Number.isFinite(reps) && reps >= 1 && reps <= PR_MAX_REPS;

const loadOf = (v: number | string | null | undefined): number | null => {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Two loads are the same lift when they agree to the hundredth — canonical pounds carry kg fractions. */
const sameLoad = (a: number, b: number) => Math.abs(a - b) < 0.01;

/**
 * Does this row describe this lift? Catalogue key first; the exact name only where the row predates the
 * key (0078). The rule `lift-history-live` and `save.ts` have always used — it lives here now.
 */
export function sameLift(lift: LiftIdentity, row: { catalog_key?: string | null; name: string }): boolean {
  return lift.catalogKey
    ? row.catalog_key === lift.catalogKey || (row.catalog_key == null && row.name === lift.name)
    : row.name === lift.name;
}

/** Symmetric form for two logged things neither of which is "the" lift: keys when both have one. */
const sameLiftEither = (a: LiftIdentity, b: LiftIdentity): boolean =>
  a.catalogKey && b.catalogKey ? a.catalogKey === b.catalogKey : a.name === b.name;

/**
 * THE best mark on a lift: heaviest load at 1–{@link PR_MAX_REPS} reps, more reps on a tie. Null = no mark.
 * Rows outside the band, without a load, or of another lift are ignored.
 */
export function bestMark(rows: readonly RecordRow[], lift: LiftIdentity): LiftMark | null {
  let best: LiftMark | null = null;
  for (const r of rows) {
    const weight = loadOf(r.load_value);
    if (weight == null || !inRecordBand(r.load_reps)) continue;
    if (!sameLift(lift, { catalog_key: r.catalog_key ?? null, name: r.exercise })) continue;
    if (!best || weight > best.weight || (weight === best.weight && r.load_reps > best.reps)) {
      best = { weight, reps: r.load_reps, achievedOn: r.achieved_on };
    }
  }
  return best;
}

/** The day a row belongs to: `achieved_on`, else the day it was written. */
const rowDay = (r: RecordRow): string => r.achieved_on ?? (r.created_at ?? '').slice(0, 10);

/**
 * Every usable load row, oldest first, marked first-mark / record.
 *
 * Identity: a keyless row (pre-0078) is filed under the key its name carries on any keyed row, so a lift
 * that gained a key mid-history is still one lift.
 */
export function annotateRecords(rows: readonly RecordRow[]): AnnotatedRecord[] {
  const keyByName = new Map<string, string>();
  for (const r of rows) if (r.catalog_key && !keyByName.has(r.exercise)) keyByName.set(r.exercise, r.catalog_key);

  const usable = rows
    .map((row) => ({ row, weight: loadOf(row.load_value) }))
    .filter((x): x is { row: RecordRow; weight: number } => x.weight != null && inRecordBand(x.row.load_reps))
    .sort(
      (a, b) =>
        rowDay(a.row).localeCompare(rowDay(b.row)) || (a.row.created_at ?? '').localeCompare(b.row.created_at ?? ''),
    );

  const held = new Map<string, number>();
  return usable.map(({ row, weight }) => {
    const lift = row.catalog_key ?? keyByName.get(row.exercise) ?? row.exercise;
    const prior = held.get(lift);
    const isFirst = prior == null;
    const isRecord = !isFirst && weight > prior;
    if (isFirst || weight > prior) held.set(lift, weight);
    return { row, lift, weight, reps: row.load_reps as number, isFirst, isRecord };
  });
}

/** `YYYY-MM-DD` in UTC — the calendar `current_date` wrote `achieved_on` in. */
export function utcDay(iso: string): string {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : iso.slice(0, 10);
}

/** The UTC day before `day` (`YYYY-MM-DD`). */
export function dayBefore(day: string): string {
  const t = Date.parse(`${day}T00:00:00Z`);
  return Number.isFinite(t) ? new Date(t - 86_400_000).toISOString().slice(0, 10) : day;
}

/**
 * Which session set each RECORD (first marks excluded), keyed by workout id.
 *
 * A record none of `workouts` could have lifted is attributed to nothing — better no chip than one on
 * the wrong session. Pass every saved session that could hold the record (its day and the day before);
 * a partial list can only lose chips, never misplace them onto a session without the lift.
 */
export function recordsByWorkout(
  records: readonly AnnotatedRecord[],
  workouts: readonly AttributionWorkout[],
): Map<string, WorkoutRecord[]> {
  const out = new Map<string, WorkoutRecord[]>();
  const days = workouts.map((w) => ({ w, day: utcDay(w.startedAt), t: Date.parse(w.startedAt) }));

  for (const rec of records) {
    if (!rec.isRecord) continue;
    const day = rowDay(rec.row);
    if (!day) continue;
    const prev = dayBefore(day);
    const recLift: LiftIdentity = { catalogKey: rec.row.catalog_key ?? null, name: rec.row.exercise };

    let pick: { w: AttributionWorkout; sameDay: boolean; t: number; ex: AttributionWorkout['exercises'][number] } | null = null;
    for (const { w, day: wd, t } of days) {
      if (wd !== day && wd !== prev) continue;
      const ex = w.exercises.find(
        (e) =>
          (e.section == null || e.section === 'main') &&
          sameLiftEither({ catalogKey: e.catalogKey ?? null, name: e.name }, recLift) &&
          e.sets.some((s) => {
            const lw = loadOf(s.weight);
            return lw != null && sameLoad(lw, rec.weight) && inRecordBand(s.reps);
          }),
      );
      if (!ex) continue;
      const sameDay = wd === day;
      const better = !pick || (sameDay && !pick.sameDay) || (sameDay === pick.sameDay && t < pick.t);
      if (better) pick = { w, sameDay, t, ex };
    }
    if (!pick) continue;

    const entry: WorkoutRecord = {
      exercise: pick.ex.name,
      catalogKey: pick.ex.catalogKey ?? null,
      weight: rec.weight,
      reps: rec.reps,
      achievedOn: rec.row.achieved_on,
    };
    const list = out.get(pick.w.id) ?? [];
    // One record per lift per session — a session that broke it twice keeps the heavier.
    const i = list.findIndex((x) =>
      sameLiftEither({ catalogKey: x.catalogKey, name: x.exercise }, { catalogKey: entry.catalogKey, name: entry.exercise }),
    );
    if (i < 0) list.push(entry);
    else if (entry.weight > list[i].weight) list[i] = entry;
    out.set(pick.w.id, list);
  }
  return out;
}

/** "Barbell Bench Press · 150 lb × 5" — stored pounds; screens convert with `convertMeasure`. */
export function recordLine(r: Pick<WorkoutRecord, 'exercise' | 'weight' | 'reps'>): string {
  const w = Math.round(r.weight * 100) / 100;
  return `${r.exercise} · ${w} lb × ${r.reps}`;
}
