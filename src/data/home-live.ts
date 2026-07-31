import { supabase } from '@/lib/supabase';

/**
 * The H-1 "awaiting first workout" check (ONB-D17, minimal). A just-onboarded athlete has one active
 * chapter with zero workouts — Home shows a purpose-built awaiting hero instead of the static content,
 * so a fresh user never lands on someone else's data or a blank screen. Returns null once they've trained.
 */
export async function fetchAwaitingChapter(): Promise<{ chapterName: string } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('chapters')
    .select('name, workout_count')
    .eq('athlete_id', user.id)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  if (data && (data.workout_count ?? 0) === 0) return { chapterName: data.name };
  return null;
}

/**
 * The athlete's own chapter, for Home's title block.
 *
 * Home used to fall back to `HOME_CHAPTER` — the literal "Chapter III · The Rebuild · Week 6 · Day 2" —
 * for anybody past their first workout. Every athlete in the app was shown the same invented chapter,
 * ordinal and week, on the first screen they land on.
 *
 * The ordinal is COUNTED (chapters ordered by start date, this one's position), not stored, because there
 * is no chapter-number column and inventing one would be the same mistake at a different layer. Week and
 * day are elapsed time inside the chapter, which is a fact about it rather than a claim about progress.
 */
export interface HomeChapter {
  number: string;
  name: string;
  weekDay: string;
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export async function fetchHomeChapter(): Promise<HomeChapter | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('chapters')
    .select('id, name, start_date, is_active')
    .eq('athlete_id', user.id)
    .order('start_date', { ascending: true });
  const rows = (data ?? []) as { id: string; name: string; start_date: string; is_active: boolean }[];
  const idx = rows.findIndex((c) => c.is_active);
  if (idx < 0) return null;
  const c = rows[idx];

  const days = Math.max(0, Math.floor((Date.now() - new Date(`${c.start_date}T00:00:00`).getTime()) / 86_400_000));
  const n = idx + 1;
  return {
    number: `Chapter ${ROMAN[n] ?? n}`,
    name: c.name,
    weekDay: `Week ${Math.floor(days / 7) + 1} · Day ${(days % 7) + 1}`,
  };
}
