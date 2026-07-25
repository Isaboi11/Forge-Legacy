import { supabase } from '@/lib/supabase';
import { countActiveWeeks, mondayWeekKey } from '@/domain/rank/rank';
import { e1rm } from '@/domain/workout/metrics';
import { fetchStoredRank } from '@/data/rank-live';
import type { RankFamily } from '@/domain/rank-artwork/resolver';

/**
 * P-2 Progress Hub aggregation (Slice A) — one read that assembles the hub's real sections from live
 * activity: rank (for the hero + journey), identity facts, the pinned PR, strength cards (personal-best
 * series → sparklines), consistency stats, and the active program for "What's Next". Honors + body come
 * from their own fetchers / a later slice. Read-only.
 */

export interface SparkPoint {
  value: number;
}
export interface StrengthCard {
  id: string;
  category: string; // 'Strength'
  name: string;
  value: string; // "225 lb"
  improving: boolean;
  series: number[]; // best-e1RM progression, for the sparkline
}
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
  strength: StrengthCard[];
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

  const [rank, workoutsRes, prRes, chapterRes, programsRes] = await Promise.all([
    fetchStoredRank(),
    supabase.from('workouts').select('saved_at, started_at, duration_sec').eq('athlete_id', uid).eq('state', 'saved'),
    supabase.from('personal_records').select('exercise, achieved_on, created_at, load_value, load_reps').eq('athlete_id', uid).eq('measure_kind', 'load'),
    supabase.from('chapters').select('name, is_active').eq('athlete_id', uid).eq('is_active', true).maybeSingle(),
    supabase.from('programs').select('id, name, state').eq('athlete_id', uid).eq('state', 'active').order('updated_at', { ascending: false }).limit(1),
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

  // ── strength cards: personal-best e1RM progression per exercise, top 4 by recency ──
  const prs = (prRes.data ?? []) as PRRow[];
  const byExercise = new Map<string, { date: string; e: number }[]>();
  for (const p of prs) {
    if (p.load_value == null) continue;
    const date = (p.achieved_on ?? p.created_at ?? '').slice(0, 10);
    const arr = byExercise.get(p.exercise) ?? [];
    arr.push({ date, e: e1rm(p.load_value, p.load_reps ?? 1) });
    byExercise.set(p.exercise, arr);
  }
  const strength: StrengthCard[] = [...byExercise.entries()]
    .map(([name, pts]) => {
      const sorted = pts.sort((a, b) => a.date.localeCompare(b.date));
      const series = sorted.map((p) => Math.round(p.e));
      const last = series[series.length - 1] ?? 0;
      const prev = series[series.length - 2] ?? last;
      return { id: name, category: 'Strength', name, value: `${last} lb`, improving: last > prev, series, lastDate: sorted[sorted.length - 1]?.date ?? '' };
    })
    .sort((a, b) => b.lastDate.localeCompare(a.lastDate))
    .slice(0, 4)
    .map(({ lastDate: _lastDate, ...c }) => c);

  // ── pinned: highest e1RM among the big three ──
  let pinned: string | null = null;
  let best = 0;
  for (const p of prs) {
    if (p.load_value == null) continue;
    if (!/dead\s*lift|squat|bench/i.test(p.exercise)) continue;
    const e = e1rm(p.load_value, p.load_reps ?? 1);
    if (e > best) {
      best = e;
      pinned = `${p.exercise} ${Math.round(p.load_value)} lb · Personal Record`;
    }
  }

  const program = (programsRes.data ?? [])[0] as { id: string; name: string } | undefined;

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
    strength,
    consistency: {
      lifetime,
      hoursForged,
      thisMonth,
      hoursPerMonth: Math.round(hoursForged / monthsActive),
      avgPerWeek: round1(lifetime / weeksActive),
      bestStreakWeeks: bestStreak(weekKeys),
    },
    next: program ? { id: program.id, title: program.name, sub: 'Continue your program' } : null,
  };
}
