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
import { IS_PAPER } from '@/constants/foundation';

/** The `sex` enum on `profiles` (0001). `unspecified` is the default and the most common value. */
export type AthleteSex = 'male' | 'female' | 'unspecified';

const BUCKET = 'exercise-media';

/**
 * Which theme's render to ask for.
 *
 *     <sex>/<id>.webp              Forge — saturated bronze, brightness LIFTED to glow on near-black
 *     paper/<sex>/<id>.webp        Alabaster — #836A3E, brightness CUT so it does not read as highlighter
 *
 * ⚠ A THEME IS NOT A TINT YOU CAN APPLY AT THE EDGE. These are separate renders from the source MP4
 * because the Forge pass is LOSSY — it clamps saturation into [110,150] and lifts V by 1.12, which
 * clips at 255 differently on every clip. Re-grading the Forge object was tried and landed within 2
 * channel values on one clip and 29 on the next, so no filter here could stand in for the second
 * render. See scripts/animation-processing/deliver_alabaster.py.
 *
 * ⚠ AND THE PREFIX IS ONLY SAFE BECAUSE THE OBJECTS ARE THERE. Nothing below asks whether a file
 * exists — that is the derive-don't-ask contract this whole file is built on — so pointing at
 * `paper/` before the upload had run would have turned every Alabaster demo into an empty frame
 * with no error to explain it. All 1,134 slots were uploaded and spot-checked live first.
 *
 * `ACTIVE_THEME` resolves once at bundle load (Alabaster is reload-not-toggle), so this is a
 * constant, not a per-render branch.
 */
const THEME_PREFIX = IS_PAPER ? 'paper/' : '';

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
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(`${THEME_PREFIX}${demoVariant(sex)}/${id}.webp`);
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
  // ⚠ `poster/` OUTSIDE, theme INSIDE — `poster/paper/male/x.webp`, not `paper/poster/...`.
  // That is the layout the uploader writes; reversing the two 404s every still in Alabaster.
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(`poster/${THEME_PREFIX}${demoVariant(sex)}/${id}.webp`);
  return data.publicUrl || null;
}
