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
