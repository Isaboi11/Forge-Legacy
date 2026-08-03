import { supabase } from './supabase';

/**
 * Upload an athlete's avatar to the `avatars` bucket and return its public URL.
 *
 * Lifted out of `domain/onboarding/service.ts`, where it was a private helper, when P-1.1 Edit Profile
 * became the second caller. Both paths must write the SAME object path (`<uid>/avatar.<ext>`, upsert) —
 * if they diverged, editing a photo would leave the onboarding original orphaned in the bucket and the
 * two screens would disagree about which file is "the" avatar.
 *
 * Storage is not transactional. The caller uploads first and persists the returned URL second, so a
 * failure between the two leaves an unreferenced object — harmless, and preferable to a profile row
 * pointing at a file that was never written.
 *
 * The returned URL carries a `?v=` stamp. A fixed path plus `upsert` means the public URL never changes
 * when the image does, so every layer that caches by URL — the browser, `expo-image`'s disk cache — would
 * keep serving the PREVIOUS photo after an edit. The athlete would pick a new picture, be told it saved,
 * and go on seeing the old one: a save that reports success and shows the opposite. The stamp is part of
 * the stored value, so it travels with the row and every reader gets the same fresh URL.
 */
export async function uploadAvatar(uid: string, uri: string): Promise<string> {
  const res = await fetch(uri);
  const bytes = await res.arrayBuffer();
  const ext = (uri.split('.').pop() ?? 'jpg').toLowerCase().split('?')[0];
  const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const path = `${uid}/avatar.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(path, bytes, { contentType, upsert: true });
  if (error) throw error;
  const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  return `${url}?v=${Date.now()}`;
}
