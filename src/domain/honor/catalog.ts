/**
 * Code honor catalog — the app-side slice of the canonical Honors catalog (Design `forge-honors.js`,
 * project b029488a). The design's catalog is DATA for 167 honors across 13 categories; this file carries
 * the category model (id · name · glyph) verbatim from the map, plus metadata for the honors the app can
 * actually GRANT today (mapped from their DB `honor_type` slugs). It exists because the app has no code
 * honor catalog — the Honors Hub (L-10/L-11) needs categories + glyphs + triggers to render earned honors.
 *
 * Extend `CATALOG` as more honors become grantable. Categories/glyphs mirror the map exactly, with ONE
 * app-specific addition: `origin` (flame) — the home for the LOCKED `initiative` honor, which isn't in the
 * map's 167 and whose flame we froze with the First Honor Ceremony. Everything else follows the map.
 */

export type HonorGlyphName =
  | 'flame'
  | 'shield'
  | 'book'
  | 'dumbbell'
  | 'spark'
  | 'banner'
  | 'train'
  | 'laurel'
  | 'shoe'
  | 'swords'
  | 'explore'
  | 'squads'
  | 'trophy';

export interface HonorCategory {
  id: string;
  name: string;
  glyph: HonorGlyphName;
}

/** Display order: Origin (the beginning) first, then the map's canonical category order. */
export const HONOR_CATEGORIES: HonorCategory[] = [
  { id: 'origin', name: 'Origin', glyph: 'flame' },
  { id: 'strength', name: 'Strength', glyph: 'shield' },
  { id: 'chapters', name: 'Chapters', glyph: 'book' },
  { id: 'training', name: 'Training', glyph: 'dumbbell' },
  { id: 'goals', name: 'Goals', glyph: 'spark' },
  { id: 'programs', name: 'Programs', glyph: 'banner' },
  { id: 'partnership', name: 'Partnership', glyph: 'train' },
  { id: 'longevity', name: 'Longevity', glyph: 'laurel' },
  { id: 'endurance', name: 'Endurance', glyph: 'shoe' },
  { id: 'competition', name: 'Competition', glyph: 'swords' },
  { id: 'communities', name: 'Communities', glyph: 'explore' },
  { id: 'squad', name: 'Squad', glyph: 'squads' },
  { id: 'prestige', name: 'Prestige', glyph: 'trophy' },
  { id: 'hidden', name: 'Hidden', glyph: 'flame' },
];

const CATEGORY_BY_ID: Record<string, HonorCategory> = Object.fromEntries(HONOR_CATEGORIES.map((c) => [c.id, c]));

export interface HonorMeta {
  slug: string;
  name: string;
  category: string;
  trigger: string;
}

/**
 * Grantable honors (DB `honor_type` slug → metadata). Names/triggers from the map; `initiative` is ours.
 *
 * ⚠ EVERY `trigger` HERE IS ATHLETE-FACING PROSE, and has to be. Three of these read as rule notation
 * — *"Total sessions ≥ 1"* — which was harmless only while nothing rendered them: the DB catalog holds
 * a row for all three, so `honors.tsx` and the Hub always took the derived-sentence branch. That stopped
 * being true the moment this map became the ceremony's fallback for an honor with no catalog row, which
 * is a path a failed catalog read puts EVERY honor on. A card announcing "Total sessions ≥ 25" to
 * somebody who just trained is worse than the generic line it replaced.
 *
 * The wording matches `triggerText`'s output for the same metric and threshold, so an honor reads the
 * same sentence whichever branch produced it.
 */
const CATALOG: Record<string, HonorMeta> = {
  initiative: {
    slug: 'initiative',
    name: 'Initiative',
    category: 'origin',
    trigger: 'Made your first move — built or chose your first program.',
  },
  first_workout_logged: {
    slug: 'first_workout_logged',
    name: 'First Workout Logged',
    category: 'training',
    trigger: 'Log your first workout.',
  },
  workouts_logged_25: {
    slug: 'workouts_logged_25',
    name: '25 Workouts Logged',
    category: 'training',
    trigger: 'Log 25 workouts.',
  },
  workouts_in_chapter_10: {
    slug: 'workouts_in_chapter_10',
    name: '10 Workouts in a Chapter',
    category: 'chapters',
    trigger: 'Log 10 workouts inside a single chapter.',
  },
};

/** Metadata for an earned honor. Unknown slugs degrade to the Training category with the DB display name. */
export function honorMeta(slug: string, fallbackName?: string): HonorMeta {
  return CATALOG[slug] ?? { slug, name: fallbackName ?? slug, category: 'training', trigger: '' };
}

export function categoryMeta(id: string): HonorCategory | undefined {
  return CATEGORY_BY_ID[id];
}

export function categoryGlyph(id: string): HonorGlyphName {
  return CATEGORY_BY_ID[id]?.glyph ?? 'flame';
}
