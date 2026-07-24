import { supabase } from '@/lib/supabase';
import { meetsTarget, type Goal, type ProgressEntry } from '@/domain/goals/goals';

/**
 * Goals persistence (`goals`, 0025) — chapter-scoped, athlete-owned.
 *
 * No delete (GD-D5). Setting a goal primary unsets the chapter's previous primary first, so there is
 * never more than one (the DB's partial unique index is the safety net). A missing table (pre-0025)
 * resolves to an empty list, so the consumers that preview a goal never break.
 */

const ROW = 'id, chapter_id, name, target, unit, current, is_primary, target_date, achieved_at, created_at';

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

  const fields = {
    name: input.name.trim(),
    target: input.target,
    unit: input.target != null ? input.unit : null, // a unit is meaningless without a target
    is_primary: input.isPrimary,
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
  const nowAchieved = before != null && before.achievedAt == null && meetsTarget({ target: before.target, current });
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
