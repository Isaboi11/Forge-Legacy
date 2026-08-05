/**
 * Where an exercise's demonstration loop lives.
 *
 * ONE PLACE, on purpose. This is the only file that knows how a catalog id becomes a URL, so the
 * convention can be changed — or swapped for a manifest — without touching the screen.
 *
 * ── THE CONVENTION ───────────────────────────────────────────────────────────────────────────────
 *
 *     exercise-media/male/<exerciseId>.webp
 *     exercise-media/female/<exerciseId>.webp
 *
 * `<exerciseId>` is the catalog id (`barbell-bench-press`), NOT the animation library's source
 * filename (`Barbell-Bench-Press_Chest_.webp`). The rename happens at upload, off
 * `catalog_match_review.csv`, which already carries `exercise_id` alongside `male_file`/`female_file`
 * and is reviewed by hand anyway (`scripts/animation-processing/README.md`: token matching is fuzzy
 * and *will* mis-pick).
 *
 * Keying on the id is what lets the app DERIVE the URL from something it already has: no manifest in
 * the bundle, nothing to keep in step with the library, and no 800-row table shipped to every athlete
 * so that one screen can look up one string.
 *
 * ── WHY WE DON'T ASK WHETHER THE FILE EXISTS ─────────────────────────────────────────────────────
 *
 * A HEAD request per exercise detail open would cost a round trip to answer a question the image load
 * answers for free. The screen renders the design's empty demo frame, points `expo-image` at the URL,
 * and lets `onError` fall back to that same frame. A missing clip is an ordinary state — the library
 * doesn't cover strongman or most mobility work, and a catalog entry can always land before its clip.
 */

import { supabase } from '@/lib/supabase';

/** The `sex` enum on `profiles` (0001). `unspecified` is the default and the most common value. */
export type AthleteSex = 'male' | 'female' | 'unspecified';

const BUCKET = 'exercise-media';

/**
 * Which variant to show.
 *
 * `unspecified` gets the male render. Not a statement about anybody — it is the larger, more complete
 * half of the library, and showing SOMETHING beats showing an empty frame to every athlete who never
 * answered an optional onboarding question. An athlete who did answer gets what they answered.
 */
export function demoVariant(sex: AthleteSex | null | undefined): 'male' | 'female' {
  return sex === 'female' ? 'female' : 'male';
}

/**
 * The public URL for an exercise's demonstration loop, or null when there is nothing to ask for.
 *
 * Never throws and never awaits: `getPublicUrl` is pure string-building in supabase-js, so this is
 * safe to call during render.
 */
export function exerciseDemoUrl(exerciseId: string | null | undefined, sex: AthleteSex | null | undefined): string | null {
  const id = (exerciseId ?? '').trim();
  if (!id) return null;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(`${demoVariant(sex)}/${id}.webp`);
  return data.publicUrl || null;
}

/**
 * The public URL for an exercise's POSTER — one still frame of the same clip, for list rows and the
 * small thumbnail slots that name an exercise.
 *
 *     exercise-media/poster/male/<exerciseId>.webp
 *     exercise-media/poster/female/<exerciseId>.webp
 *
 * A row is not a demo. Pointing dozens of list rows at the animated loop would pull ~1MB apiece to
 * play movement nobody is watching in a 40px square; the poster is a ~15KB still that says which
 * exercise this is at a glance. Same id, same variant rule, same derive-don't-ask contract as
 * `exerciseDemoUrl` — a missing poster is an ordinary state the caller falls back from.
 */
export function exercisePosterUrl(exerciseId: string | null | undefined, sex: AthleteSex | null | undefined): string | null {
  const id = (exerciseId ?? '').trim();
  if (!id) return null;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(`poster/${demoVariant(sex)}/${id}.webp`);
  return data.publicUrl || null;
}
