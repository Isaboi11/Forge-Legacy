import { supabase } from '@/lib/supabase';
import type { HistorySession } from '@/domain/coach/progression';
import { PR_MAX_REPS } from '@/domain/workout/metrics';

/**
 * What the athlete has actually lifted — the ONE lift-history read in the app.
 *
 * ══ WHY ONE MODULE AND NOT THREE READS ══
 *
 * Four separate surfaces want the same two facts about a lift ("what did I do last time" and "what is the
 * most I have ever done"), and before this they were answered by three different queries that disagreed
 * with each other:
 *
 *   · `fetchRecentSetsFor` (Coach wizard)  — matched by NAME only
 *   · `fetchPriorRecords`  (PR detection)  — matched by NAME only, and threw away reps and the date
 *   · `fetchLastNotes`     (Active Workout)— matched by CATALOG KEY, name as fallback
 *
 * Two answers to "which lift is this" on one screen is how surfaces drift, and here the drift is visible:
 * a "Best" that disagrees with the note printed directly beneath it. So the identity rule is settled in
 * one place — `catalog_key` when there is one, the exact name for rows written before 0078 added the
 * column — and everything reads through it.
 *
 * ══ EXACT MATCHES ONLY ══
 *
 * Never fuzzy. A near match would be worse than no match, because the whole point of this data is to tell
 * the athlete to add weight, and doing that off a movement they never performed is the one failure mode
 * that costs more than staying silent.
 *
 * ⚠ A CATALOGUE RENAME ORPHANS HISTORY written before 0078 (no key, name no longer matches). The athlete's
 * record survives — it is their workout, unchanged — but the coach stops recognising it and falls back to
 * "first time on this". That is the safe direction to fail in. Worth knowing before anyone renames.
 *
 * ══ TWO SESSIONS, NOT TWENTY ══
 *
 * `progressionFor` reads at most the last two: enough to tell a bad Tuesday from a real regression, and
 * few enough that a good month three weeks ago cannot argue with a bad week now. Fetching more would be
 * data nobody looks at, on a screen somebody is standing in a gym waiting for.
 */

/** A lift to ask about, in the shape both the logger and the coach already carry. */
export interface LiftRef {
  catalogKey?: string | null;
  name: string;
}

/** The athlete's standing mark on a lift: heaviest load for 1–{@link PR_MAX_REPS} reps. */
export interface LiftBest {
  weight: number;
  reps: number;
  /** ISO date. Null on rows saved before the column was populated — render the mark without a date. */
  achievedOn: string | null;
}

export interface LiftHistory {
  /** Past sessions of this lift, newest first, at most two. Empty = never done it. */
  sessions: HistorySession[];
  /** Null = no record on file. NEVER coerce to zero — see the warning on {@link fetchLiftHistory}. */
  best: LiftBest | null;
}

/**
 * The key a lift is filed under. Catalogue key when there is one, the display name otherwise — the same
 * identity `fetchLastNotes` uses, so a card's Last, Best and note all describe the same movement.
 */
export const liftId = (l: LiftRef): string => l.catalogKey ?? l.name;

/** PostgREST `in.(…)` takes a bare list; a name can contain a comma, so every one is quoted. */
const inList = (vals: readonly string[]): string =>
  `(${vals.map((v) => `"${v.replace(/"/g, '')}"`).join(',')})`;

/**
 * `catalog_key.in.(…),name.in.(…)` — the identity rule as a PostgREST filter. Omits the empty half.
 *
 * `nameColumn` is a parameter because the two tables spell it differently: `workout_exercises` calls it
 * `name`, `personal_records` calls it `exercise`. Passing the column beats string-rewriting one filter
 * into the other, which is the kind of clever that works until an exercise is named something awkward.
 */
function identityFilter(lifts: readonly LiftRef[], nameColumn: 'name' | 'exercise'): string {
  const keys = [...new Set(lifts.map((l) => l.catalogKey).filter((k): k is string => !!k))];
  const names = [...new Set(lifts.map((l) => l.name))];
  const byName = `${nameColumn}.in.${inList(names)}`;
  return keys.length ? `catalog_key.in.${inList(keys)},${byName}` : byName;
}

/** Does this row describe this lift? Key first, name only where the row predates the key. */
const matches = (lift: LiftRef, row: { catalog_key: string | null; name: string }): boolean =>
  lift.catalogKey
    ? row.catalog_key === lift.catalogKey || (row.catalog_key == null && row.name === lift.name)
    : row.name === lift.name;

/**
 * Everything the logger and the coach need to know about these lifts, in two round trips.
 *
 * ⚠ AN ABSENT KEY MEANS "NEVER DONE IT", NOT "NOTHING KNOWN", and an empty `sessions` or a null `best`
 * means the same. The caller must render an em-dash, never a zero: a zero reads as "you lifted nothing",
 * and worse, a zero prior best would make the athlete's first ever set a personal record.
 *
 * Fails SILENT, like every history read on this path. A history we cannot reach is not an error worth
 * surfacing between two sets — the screen simply shows what it showed before anyone had a history.
 */
export async function fetchLiftHistory(lifts: readonly LiftRef[]): Promise<Map<string, LiftHistory>> {
  const out = new Map<string, LiftHistory>();
  if (lifts.length === 0) return out;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return out;

  const [sessions, bests] = await Promise.all([
    fetchSessions(user.id, lifts, identityFilter(lifts, 'name')),
    fetchBests(user.id, lifts, identityFilter(lifts, 'exercise')),
  ]);

  for (const lift of lifts) {
    const id = liftId(lift);
    if (out.has(id)) continue;
    out.set(id, { sessions: sessions.get(id) ?? [], best: bests.get(id) ?? null });
  }
  return out;
}

/** The last two sessions of each lift, newest first, sets in logged order. */
async function fetchSessions(
  athleteId: string,
  lifts: readonly LiftRef[],
  filter: string,
): Promise<Map<string, HistorySession[]>> {
  const out = new Map<string, HistorySession[]>();

  /* ⚠ `athlete_id` IS FILTERED EXPLICITLY, not left to RLS. `workout_exercises` carries no athlete
     column, so without this the only thing scoping the read to this athlete is the policy — and a read
     whose correctness depends on a policy being right is one migration away from showing somebody else's
     training. `fetchLastNotes` already filters this way; the Coach's old read did not. */
  const { data, error } = await supabase
    .from('workouts')
    .select('started_at, workout_exercises!inner(name, catalog_key, section, workout_sets(set_index, weight, reps))')
    .eq('athlete_id', athleteId)
    .eq('state', 'saved')
    .or(filter, { referencedTable: 'workout_exercises' })
    // Newest first, and generously capped: one workout can carry several of the lifts we asked about, so
    // this bounds the round trip rather than how far back the answer reaches.
    .order('started_at', { ascending: false })
    .limit(60);
  if (error || !data) return out;

  type Row = {
    started_at: string;
    workout_exercises:
      | {
          name: string;
          catalog_key: string | null;
          section: string | null;
          workout_sets: { set_index: number; weight: number | null; reps: number | null }[] | null;
        }[]
      | null;
  };

  for (const w of data as Row[]) {
    const rows = w.workout_exercises ?? [];
    for (const lift of lifts) {
      const id = liftId(lift);
      const list = out.get(id) ?? [];
      if (list.length >= 2) continue; // two is what the caller reads; more is weight on the wire

      /* ONE ENTRY PER LIFT PER WORKOUT, AND IT IS THE MAIN-SECTION ONE.
         A lift can appear twice in a session — the same movement as a warm-up and then as the work. Taking
         whichever row came back first would sometimes describe the session by its empty-bar warm-up and
         then tell the athlete to add weight to that. */
      const hits = rows.filter((r) => matches(lift, r));
      const hit = hits.find((r) => r.section === 'main') ?? hits[0];
      if (!hit) continue;

      const sets = [...(hit.workout_sets ?? [])]
        .sort((a, b) => a.set_index - b.set_index)
        .map((s) => ({ weight: s.weight, reps: s.reps }));
      if (sets.length === 0) continue; // an exercise row with nothing logged under it says nothing

      list.push({ startedAt: w.started_at, sets });
      out.set(id, list);
    }
  }

  return out;
}

/** The standing mark on each lift — heaviest load at 1–{@link PR_MAX_REPS} reps, with its reps and date. */
async function fetchBests(
  athleteId: string,
  lifts: readonly LiftRef[],
  filter: string,
): Promise<Map<string, LiftBest>> {
  const out = new Map<string, LiftBest>();

  const { data, error } = await supabase
    .from('personal_records')
    .select('exercise, catalog_key, load_value, load_reps, achieved_on')
    .eq('athlete_id', athleteId)
    .eq('measure_kind', 'load')
    .lte('load_reps', PR_MAX_REPS)
    .or(filter);
  if (error || !data) return out;

  type Row = {
    exercise: string;
    catalog_key: string | null;
    load_value: number | null;
    load_reps: number | null;
    achieved_on: string | null;
  };

  for (const r of data as Row[]) {
    const weight = Number(r.load_value);
    if (!Number.isFinite(weight)) continue;
    const row = { catalog_key: r.catalog_key, name: r.exercise };
    for (const lift of lifts) {
      if (!matches(lift, row)) continue;
      const id = liftId(lift);
      const held = out.get(id);
      // Heaviest wins; a tie goes to the one done for more reps, which is the better lift.
      if (!held || weight > held.weight || (weight === held.weight && (r.load_reps ?? 1) > held.reps)) {
        out.set(id, { weight, reps: r.load_reps ?? 1, achievedOn: r.achieved_on });
      }
    }
  }

  return out;
}
