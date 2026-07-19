import { supabase } from '@/lib/supabase';
import { athleteTypeForGoal, firstNameOf, initialsOf } from './derive';
import type { GoalId } from './derive';

/** Canonical Chapter I title (ONB-D14; PO-ruled over the design's "Building your Legacy"). */
export const CHAPTER_I_NAME = 'Chapter I — Building Your Foundation';

/** Live username uniqueness (profiles.handle is citext → case-insensitive). ≥3 chars, [a-z0-9_]. */
export async function isHandleAvailable(handle: string): Promise<boolean> {
  const clean = handle.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
  if (clean.length < 3) return false;
  const { data, error } = await supabase.from('profiles').select('id').eq('handle', clean).limit(1);
  if (error) throw error;
  return (data?.length ?? 0) === 0;
}

async function uploadAvatar(uid: string, uri: string): Promise<string> {
  const res = await fetch(uri);
  const bytes = await res.arrayBuffer();
  const ext = (uri.split('.').pop() ?? 'jpg').toLowerCase().split('?')[0];
  const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const path = `${uid}/avatar.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(path, bytes, { contentType, upsert: true });
  if (error) throw error;
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}

export interface OnboardingInput {
  name: string;
  handle: string | null; // null when "Skip for now"
  sex: 'male' | 'female';
  photoUri: string | null;
  primaryGoal: GoalId | null;
}

/**
 * The finish transaction. Avatar upload first (storage, not transactional — an orphan is harmless), then
 * the atomic `complete_onboarding` RPC: profile update + Chapter I insert + onboarded_at, all-or-nothing.
 * athlete_type derives from the primary goal here (pure); environment is written null — equipment moved to
 * the post-Home Find-Your-Program flow (ONB-Amendment-002 / ONB-A2-D3), which fills it in later.
 */
export async function completeOnboarding(input: OnboardingInput): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('not signed in');

  const avatarUrl = input.photoUri ? await uploadAvatar(user.id, input.photoUri) : null;

  const { error } = await supabase.rpc('complete_onboarding', {
    p_name: input.name.trim(),
    p_first_name: firstNameOf(input.name),
    p_handle: input.handle,
    p_initials: initialsOf(input.name),
    p_sex: input.sex,
    p_avatar_url: avatarUrl,
    p_athlete_type: athleteTypeForGoal(input.primaryGoal),
    p_environment: null, // unknown until Find-Your-Program captures equipment (ONB-A2-D3)
    p_chapter_name: CHAPTER_I_NAME,
  });
  if (error) throw error;
}
