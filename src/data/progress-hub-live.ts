import { supabase } from '@/lib/supabase';
import { countActiveWeeks, mondayWeekKey } from '@/domain/rank/rank';
import { buildLiftSeries, prDayKey, type LoggedSet, type MetricSeries } from '@/domain/progress/lift-series';
import { fetchStoredRank } from '@/data/rank-live';
import { fetchMyPrograms, fetchProgramCompletedCount } from '@/data/programs-live';
import { dayLabel, nextSession } from '@/domain/program/progress-core';
import type { RankFamily } from '@/domain/rank-artwork/resolver';

/**
 * P-2 Progress Hub aggregation — one read that assembles the hub's real sections from live activity:
 * rank (for the hero + journey), identity facts, the pinned PR, the strength series behind the
 * sparklines and the metric chart, consistency stats, and the active program for "What's Next". Honors
 * and body metrics come from their own fetchers. Read-only.
 *
 * ── THE STRENGTH SERIES NOW COMES FROM LOGGED SETS, NOT FROM `personal_records` ───────────────────
 *
 * It used to read `personal_records` and plot Epley e1RM per PR row. That table only gains a row when a
 * set BEATS the standing best, so the chart was a plot of record days with every ordinary session
 * missing — see `domain/progress/lift-series.ts` for the full reasoning and what replaced it. The PR
 * table is still read, for two jobs it is genuinely the authority on: the pinned headline, and marking
 * WHICH days on the line were records.
 */

export type { MetricPoint, MetricSeries } from '@/domain/progress/lift-series';
export interface ConsistencyStats {
  lifetime: number;
  hoursForged: number;
  thisMonth: number;
  hoursPerMonth: number;
  avgPerWeek: number; // 1 decimal
  bestStreakWeeks: number;
}
export interface NextProgram {
  id: string;
  title: string;
  sub: string; // "Week 3 of 8 · Next: Push Day A"
}
export interface ProgressHubData {
  rankFamily: RankFamily;
  rankSubTier: number;
  chapter: string | null;
  forgingSince: string; // year, e.g. "2024"
  lifetime: number;
  pinned: string | null; // "Deadlift 495 lb · Personal Record" or null
  metrics: MetricSeries[]; // all the athlete's tracked lifts, dated — sorted most-recent first
  consistency: ConsistencyStats;
  next: NextProgram | null;
}

interface WorkoutRow {
  saved_at: string | null;
  started_at: string;
  duration_sec: number | null;
}
interface PRRow {
  exercise: string;
  achieved_on: string | null;
  created_at: string;
  load_value: number | null;
  load_reps: number | null;
}
/** The set-level read behind every lift chart. Its own query — see `fetchLoggedSets`. */
interface SetSourceRow {
  started_at: string;
  workout_exercises:
    | { name: string; workout_sets: { weight: number | null; weight_unit: string | null; reps: number | null }[] | null }[]
    | null;
}

/** Pounds are canonical everywhere in this app; a kg row would otherwise plot below every lb one. */
const toLb = (v: number | null, unit: string | null): number | null =>
  v == null ? null : unit === 'kg' ? v * 2.2046226 : v;

/**
 * Every set the athlete has logged, flattened for `buildLiftSeries`.
 *
 * ITS OWN QUERY, not an embed on the consistency read above, because the two want different shapes and
 * different limits: consistency counts sessions and needs all of them, this needs the sets inside a
 * bounded recent window. `SESSION_WINDOW` caps how far back a chart reaches — a five-year log is a lot
 * of rows to pull to draw a line whose x-axis has four ticks on it.
 *
 * A failure here degrades to NO metrics rather than taking the hub down: the rank hero, consistency and
 * "what's next" are all independent of it, and a Progress screen with no charts still says plenty.
 */
const SESSION_WINDOW = 300;

async function fetchLoggedSets(uid: string): Promise<LoggedSet[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('started_at, workout_exercises(name, workout_sets(weight, weight_unit, reps))')
    .eq('athlete_id', uid)
    .eq('state', 'saved')
    .order('started_at', { ascending: false })
    .limit(SESSION_WINDOW);
  if (error) return [];

  const out: LoggedSet[] = [];
  for (const w of (data ?? []) as unknown as SetSourceRow[]) {
    const date = (w.started_at ?? '').slice(0, 10);
    if (!date) continue;
    for (const ex of w.workout_exercises ?? []) {
      const name = ex.name?.trim();
      if (!name) continue;
      for (const s of ex.workout_sets ?? []) {
        out.push({ date, exercise: name, weightLb: toLb(s.weight, s.weight_unit), reps: s.reps });
      }
    }
  }
  return out;
}

/** Longest run of consecutive Mon–Sun weeks in a set of active-week Monday keys. */
function bestStreak(weekKeys: string[]): number {
  const set = new Set(weekKeys);
  const days = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
  let best = 0;
  for (const k of set) {
    // start of a run only if the previous week is absent
    const prev = new Date(days(k) - 7 * 86_400_000).toISOString().slice(0, 10);
    if (set.has(prev)) continue;
    let run = 1;
    let cur = k;
    for (;;) {
      const next = new Date(days(cur) + 7 * 86_400_000).toISOString().slice(0, 10);
      if (!set.has(next)) break;
      run++;
      cur = next;
    }
    if (run > best) best = run;
  }
  return best;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export async function fetchProgressHub(): Promise<ProgressHubData> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('not signed in');
  const uid = user.id;
  const now = new Date();
  const nowMonth = now.toISOString().slice(0, 7);

  const [rank, workoutsRes, prRes, chapterRes, myPrograms, loggedSets] = await Promise.all([
    fetchStoredRank(),
    supabase.from('workouts').select('saved_at, started_at, duration_sec').eq('athlete_id', uid).eq('state', 'saved'),
    supabase.from('personal_records').select('exercise, achieved_on, created_at, load_value, load_reps').eq('athlete_id', uid).eq('measure_kind', 'load'),
    supabase.from('chapters').select('name, is_active').eq('athlete_id', uid).eq('is_active', true).maybeSingle(),
    fetchMyPrograms(),
    fetchLoggedSets(uid),
  ]);

  const workouts = (workoutsRes.data ?? []) as WorkoutRow[];
  const dates = workouts.map((w) => (w.saved_at ?? w.started_at ?? '').slice(0, 10)).filter(Boolean);
  const lifetime = workouts.length;
  const hoursForged = Math.round(workouts.reduce((s, w) => s + (w.duration_sec ?? 0), 0) / 3600);
  const thisMonth = dates.filter((d) => d.slice(0, 7) === nowMonth).length;
  const monthsActive = new Set(dates.map((d) => d.slice(0, 7))).size || 1;
  const weekKeys = [...new Set(dates.map((d) => mondayWeekKey(d)))];
  const weeksActive = countActiveWeeks(dates) || 1;
  const earliestYear = dates.length ? dates.reduce((a, b) => (a < b ? a : b)).slice(0, 4) : String(now.getUTCFullYear());

  // ── metrics: one point per day trained, per lift, from the sets themselves ──
  const prs = (prRes.data ?? []) as PRRow[];
  // Which days were records, so the chart can mark them. `personal_records` stays the authority on
  // what a record IS; the series only asks it which days had one.
  const prDays = new Set(
    prs.map((p) => prDayKey(p.exercise, (p.achieved_on ?? p.created_at ?? '').slice(0, 10))),
  );
  const metrics: MetricSeries[] = buildLiftSeries(loggedSets, prDays);

  // ── pinned: the heaviest weight ACTUALLY MOVED among the big three ──
  // Was the highest Epley e1RM, which put a weight on the athlete's own Progress hero that they had
  // never lifted. `metrics.ts` settled this for records and the same reasoning applies to displaying one.
  let pinned: string | null = null;
  let best = 0;
  for (const p of prs) {
    if (p.load_value == null) continue;
    if (!/dead\s*lift|squat|bench/i.test(p.exercise)) continue;
    if (p.load_value > best) {
      best = p.load_value;
      pinned = `${p.exercise} ${Math.round(p.load_value)} lb · Personal Record`;
    }
  }

  // Active program → "What's Next" with real progress: "Week 3 of 8 · Next: Push Day A".
  const active = myPrograms.filter((p) => p.state === 'active')[0];
  let next: NextProgram | null = null;
  if (active) {
    const completed = await fetchProgramCompletedCount(active.id, active.structure);
    const ns = nextSession(active.structure, completed);
    const sub = ns ? `Week ${ns.weekIndex + 1} of ${active.structure.weeks} · Next: ${dayLabel(ns.day, ns.dayIndex)}` : 'Program complete';
    next = { id: active.id, title: active.name, sub };
  }

  // "Chapter III — The Rebuild" → "The Rebuild" (the tile shows the title, like the .dc).
  const rawChapter = (chapterRes.data as { name: string } | null)?.name ?? null;
  const chapter = rawChapter ? (rawChapter.split('—')[1]?.trim() || rawChapter.trim()) : null;

  return {
    rankFamily: rank.family,
    rankSubTier: rank.subTier,
    chapter,
    forgingSince: earliestYear,
    lifetime,
    pinned,
    metrics,
    consistency: {
      lifetime,
      hoursForged,
      thisMonth,
      hoursPerMonth: Math.round(hoursForged / monthsActive),
      avgPerWeek: round1(lifetime / weeksActive),
      bestStreakWeeks: bestStreak(weekKeys),
    },
    next,
  };
}
