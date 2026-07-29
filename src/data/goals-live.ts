import { supabase } from '@/lib/supabase';
import { isAutoTracked, isCumulativeMetric, meetsTarget, usesBaseline, type Goal, type MetricDir, type MetricKind, type ProgressEntry } from '@/domain/goals/goals';

/**
 * Goals persistence (`goals`, 0025) — chapter-scoped, athlete-owned.
 *
 * No delete (GD-D5). Setting a goal primary unsets the chapter's previous primary first, so there is
 * never more than one (the DB's partial unique index is the safety net). A missing table (pre-0025)
 * resolves to an empty list, so the consumers that preview a goal never break.
 */

const ROW = 'id, chapter_id, name, target, unit, current, is_primary, target_date, achieved_at, created_at, metric_kind, metric_key, metric_started_at, metric_dir, metric_start_value';

interface Row {
  id: string;
  chapter_id: string;
  name: string;
  target: number | null;
  unit: string | null;
  current: number;
  is_primary: boolean;
  target_date: string | null;
  achieved_at: string | null;
  created_at: string;
  metric_kind: MetricKind | null;
  metric_key: string | null;
  metric_started_at: string | null;
  metric_dir: MetricDir | null;
  metric_start_value: number | null;
}

const toModel = (r: Row): Goal => ({
  id: r.id,
  chapterId: r.chapter_id,
  name: r.name,
  target: r.target,
  unit: r.unit,
  current: r.current,
  isPrimary: r.is_primary,
  targetDate: r.target_date,
  achievedAt: r.achieved_at,
  createdAt: r.created_at,
  metricKind: r.metric_kind ?? 'manual', // pre-0035 rows read as manual
  metricKey: r.metric_key ?? null,
  metricStartedAt: r.metric_started_at ?? null,
  metricDir: r.metric_dir ?? 'up',
  metricStartValue: r.metric_start_value ?? null,
});

async function uid(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export interface ChapterGoals {
  chapterId: string | null;
  chapterName: string | null;
  goals: Goal[];
}

/** All goals in the athlete's ACTIVE chapter (the G-1 hub is always the current chapter, GD-D2). */
export async function fetchActiveChapterGoals(): Promise<ChapterGoals> {
  const id = await uid();
  if (!id) return { chapterId: null, chapterName: null, goals: [] };

  const { data: ch } = await supabase
    .from('chapters')
    .select('id, name')
    .eq('athlete_id', id)
    .eq('is_active', true)
    .maybeSingle();
  const chapter = ch as { id: string; name: string } | null;
  if (!chapter) return { chapterId: null, chapterName: null, goals: [] };

  const { data, error } = await supabase
    .from('goals')
    .select(ROW)
    .eq('athlete_id', id)
    .eq('chapter_id', chapter.id)
    .order('created_at', { ascending: false });
  return {
    chapterId: chapter.id,
    chapterName: chapter.name,
    goals: error ? [] : ((data ?? []) as Row[]).map(toModel),
  };
}

/** Every goal in a SPECIFIC chapter (active or sealed), newest first — for the Chapter Detail outcomes. */
export async function fetchChapterGoals(chapterId: string): Promise<Goal[]> {
  const id = await uid();
  if (!id) return [];
  const { data, error } = await supabase
    .from('goals')
    .select(ROW)
    .eq('athlete_id', id)
    .eq('chapter_id', chapterId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return ((data ?? []) as Row[]).map(toModel);
}

export async function fetchGoal(goalId: string): Promise<Goal | null> {
  const id = await uid();
  if (!id) return null;
  const { data, error } = await supabase.from('goals').select(ROW).eq('id', goalId).eq('athlete_id', id).maybeSingle();
  if (error || !data) return null;
  return toModel(data as Row);
}

export interface SaveGoalInput {
  id?: string;
  chapterId: string;
  name: string;
  target: number | null;
  unit: string | null;
  isPrimary: boolean;
  /** 'manual' (default) or an auto-tracking metric. Auto metrics only apply to quantifiable goals. */
  metricKind?: MetricKind;
  metricKey?: string | null;
}

/** Insert or update. When `isPrimary`, the chapter's previous primary is cleared first (GD-D1). */
export async function saveGoal(input: SaveGoalInput): Promise<Goal> {
  const id = await uid();
  if (!id) throw new Error('Not signed in');

  if (input.isPrimary) {
    await supabase
      .from('goals')
      .update({ is_primary: false })
      .eq('athlete_id', id)
      .eq('chapter_id', input.chapterId)
      .eq('is_primary', true)
      .neq('id', input.id ?? '00000000-0000-0000-0000-000000000000');
  }

  // Auto-tracking only makes sense on a quantifiable goal; a narrative goal is always manual.
  const metricKind: MetricKind = input.target != null ? input.metricKind ?? 'manual' : 'manual';
  const metricKey = metricKind === 'exercise_max' || metricKind === 'distance_total' || metricKind === 'body_measure' ? input.metricKey ?? null : null;

  const before = input.id ? await fetchGoal(input.id) : null;
  const sameMetric = before != null && before.metricKind === metricKind && (before.metricKey ?? null) === metricKey;

  // Cumulative metrics count from an anchor: stamp it now on a fresh assignment, keep it when the metric is
  // unchanged (so editing the name doesn't reset the window), null it otherwise.
  let metricStartedAt: string | null = null;
  if (isCumulativeMetric(metricKind)) {
    metricStartedAt = sameMetric && before?.metricStartedAt ? before.metricStartedAt : new Date().toISOString();
  }

  // Level metrics (body) carry a baseline + inferred direction. Keep them when the metric is unchanged;
  // otherwise read the current value now as the baseline (back-filled later if there's no reading yet).
  let metricDir: MetricDir = 'up';
  let metricStartValue: number | null = null;
  if (usesBaseline(metricKind)) {
    if (sameMetric && before?.metricStartValue != null) {
      metricStartValue = before.metricStartValue;
      metricDir = before.metricDir;
    } else {
      const { data: mv } = await supabase.rpc('goal_metric_value', { p_metric_kind: metricKind, p_metric_key: metricKey, p_started_at: null });
      const baseline = Number(mv ?? 0);
      if (baseline > 0) {
        metricStartValue = baseline;
        metricDir = input.target != null && input.target < baseline ? 'down' : 'up';
      }
    }
  }

  const fields = {
    name: input.name.trim(),
    target: input.target,
    unit: input.target != null ? input.unit : null, // a unit is meaningless without a target
    is_primary: input.isPrimary,
    metric_kind: metricKind,
    metric_key: metricKey,
    metric_started_at: metricStartedAt,
    metric_dir: metricDir,
    metric_start_value: metricStartValue,
  };

  if (input.id) {
    const { data, error } = await supabase.from('goals').update(fields).eq('id', input.id).eq('athlete_id', id).select(ROW).single();
    if (error) throw error;
    return toModel(data as Row);
  }
  const { data, error } = await supabase
    .from('goals')
    .insert({ ...fields, athlete_id: id, chapter_id: input.chapterId })
    .select(ROW)
    .single();
  if (error) throw error;
  return toModel(data as Row);
}

/**
 * Update a quantifiable goal's current value; auto-marks achieved once it meets the target (GD-D4).
 * Returns the saved goal plus whether THIS update crossed into achievement (for the primary ceremony).
 */
export async function updateProgress(goalId: string, current: number): Promise<{ goal: Goal; newlyAchieved: boolean }> {
  const id = await uid();
  if (!id) throw new Error('Not signed in');
  const before = await fetchGoal(goalId);
  const patch: { current: number; achieved_at?: string } = { current };
  const nowAchieved = before != null && before.achievedAt == null && meetsTarget({ target: before.target, current, metricDir: before.metricDir });
  if (nowAchieved) patch.achieved_at = new Date().toISOString();

  const { data, error } = await supabase.from('goals').update(patch).eq('id', goalId).eq('athlete_id', id).select(ROW).single();
  if (error) throw error;

  // Log the change to the immutable history (0026) — the G-2 "365 → 405 lb" list. Best-effort: a missing
  // table (pre-0026) must not fail the update itself.
  if (before && before.current !== current) {
    await supabase.from('goal_progress').insert({ goal_id: goalId, athlete_id: id, from_value: before.current, to_value: current });
  }
  return { goal: toModel(data as Row), newlyAchieved: nowAchieved };
}

/** The goal's progress log, newest first. Empty (never an error) before its migration lands. */
export async function fetchGoalHistory(goalId: string): Promise<ProgressEntry[]> {
  const id = await uid();
  if (!id) return [];
  const { data, error } = await supabase
    .from('goal_progress')
    .select('id, from_value, to_value, created_at')
    .eq('goal_id', goalId)
    .eq('athlete_id', id)
    .order('created_at', { ascending: false });
  if (error) return [];
  return ((data ?? []) as { id: string; from_value: number; to_value: number; created_at: string }[]).map((r) => ({
    id: r.id,
    fromValue: r.from_value,
    toValue: r.to_value,
    createdAt: r.created_at,
  }));
}

/**
 * Reconcile every auto-tracked, in-progress goal against live workout data — the Hybrid Progress Model.
 * Computes each metric via the `goal_metric_value` RPC and, when it differs from the stored value, writes
 * it through the SAME `updateProgress` path (so history + auto-achieve + the M-3 ceremony all still work).
 * Returns whether anything changed (the caller refetches) and any goals this pass newly achieved (ceremony).
 */
export async function syncAutoGoals(goals: Goal[]): Promise<{ changed: boolean; achieved: Goal[] }> {
  const id = await uid();
  const auto = goals.filter((g) => isAutoTracked(g) && g.achievedAt == null && g.target != null);
  let changed = false;
  const achieved: Goal[] = [];
  for (const g of auto) {
    const { data, error } = await supabase.rpc('goal_metric_value', {
      p_metric_kind: g.metricKind,
      p_metric_key: g.metricKey,
      p_started_at: g.metricStartedAt,
    });
    if (error) continue;
    const value = Number(data ?? 0);
    if (!Number.isFinite(value)) continue;

    // First real reading of a level goal → capture the baseline + infer direction (target vs baseline).
    if (id && usesBaseline(g.metricKind) && g.metricStartValue == null && value > 0) {
      const dir: MetricDir = g.target != null && g.target < value ? 'down' : 'up';
      await supabase.from('goals').update({ metric_start_value: value, metric_dir: dir }).eq('id', g.id).eq('athlete_id', id);
      changed = true;
    }

    if (value === g.current) continue;
    changed = true;
    try {
      const res = await updateProgress(g.id, value);
      if (res.newlyAchieved) achieved.push(res.goal);
    } catch {
      // a single goal's sync failure never blocks the rest
    }
  }
  return { changed, achieved };
}

/** Mark a narrative goal achieved (or, rarely, an under-target one the athlete calls done). */
export async function markAchieved(goalId: string): Promise<{ goal: Goal; newlyAchieved: boolean }> {
  const id = await uid();
  if (!id) throw new Error('Not signed in');
  const before = await fetchGoal(goalId);
  const newlyAchieved = before != null && before.achievedAt == null;
  const { data, error } = await supabase
    .from('goals')
    .update({ achieved_at: new Date().toISOString() })
    .eq('id', goalId)
    .eq('athlete_id', id)
    .select(ROW)
    .single();
  if (error) throw error;
  return { goal: toModel(data as Row), newlyAchieved };
}
