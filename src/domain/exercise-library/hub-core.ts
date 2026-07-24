/**
 * W-21 Exercise Library — the browse model. Pure, so the mode switching and filter logic are testable.
 *
 * Two modes off one state, exactly as the design describes:
 *   HUB  — curated shortcuts (Favourites, Recently Used) + the category grid.
 *   FLAT — a single filtered list, entered by searching, filtering, or drilling a category/shortcut.
 *
 * Favourites and recents are REAL here (`exercise_favorites` + the athlete's logged `workout_exercises`),
 * not the design's demo seeds — which means the hub's shortcuts start empty for a new athlete and the
 * sections hide rather than showing fabricated rows.
 */

import type { Difficulty, ExerciseCategoryKey, PickerItem } from '@/domain/exercise-picker/catalog-core';
// Relative + explicit extension: this is a VALUE import, and `hub-core` has to stay runnable under
// `node --test`, where the `@/` alias doesn't resolve.
import { canDoExercise } from '../home-gym/equipment.ts';

/** The athlete's owned equipment, or `null` when they've never set a Home Gym up. */
export type HomeGymProfile = readonly string[] | null;

export interface LibraryFilters {
  env: string[];
  diff: Difficulty[];
  equip: string[];
  cat: ExerciseCategoryKey[];
}

export const EMPTY_LIBRARY_FILTERS: LibraryFilters = { env: [], diff: [], equip: [], cat: [] };

export const filterCount = (f: LibraryFilters) => f.env.length + f.diff.length + f.equip.length + f.cat.length;
export const filtersActive = (f: LibraryFilters) => filterCount(f) > 0;

/** Which shortcut the athlete drilled into, if any. */
export type LibraryView =
  | { type: 'category'; id: ExerciseCategoryKey }
  | { type: 'favorites' }
  | { type: 'recent' }
  | null;

/**
 * An exercise passes when it satisfies EVERY non-empty group (AND across groups, OR within one).
 *
 * Environment normally comes from the equipment's own `environments` list — a Commercial Gym has
 * everything, a Home Gym only what fits in one.
 *
 * "Home Gym" is the exception: once the athlete has built a Home Gym profile it stops meaning "gear
 * that fits in a garage" and starts meaning THEIR garage, resolved through `canDoExercise`. Until they
 * set one up (`homeGym === null`) it falls back to the generic environment, so the filter still works
 * for someone who never opens the editor. Other selected environments keep their generic meaning and
 * OR alongside it, so "Home Gym or Outdoors" behaves.
 */
export function passFilters(x: PickerItem, f: LibraryFilters, homeGym: HomeGymProfile = null): boolean {
  if (f.env.length) {
    const ownedHome = homeGym != null && f.env.includes('Home Gym');
    const passesEnv =
      f.env.some((e) => e !== 'Home Gym' && x.environments.includes(e)) ||
      (f.env.includes('Home Gym') &&
        (ownedHome ? canDoExercise(x, homeGym) : x.environments.includes('Home Gym')));
    if (!passesEnv) return false;
  }
  if (f.diff.length && !f.diff.includes(x.difficulty)) return false;
  if (f.equip.length && !f.equip.includes(x.equipId)) return false;
  if (f.cat.length && !f.cat.includes(x.cat)) return false;
  return true;
}

/** Name, muscle, equipment or category — the design's four search fields. */
export function matchesQuery(x: PickerItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    x.name.toLowerCase().includes(q) ||
    x.aliases.some((a) => a.toLowerCase().includes(q)) ||
    x.muscles.some((m) => m.toLowerCase().includes(q)) ||
    x.equip.toLowerCase().includes(q)
  );
}

export interface LibraryState {
  query: string;
  filters: LibraryFilters;
  view: LibraryView;
}

/** Flat mode whenever there's something to narrow by — a drill, a search, or a filter. */
export const isFlatMode = (s: LibraryState) => s.view != null || s.query.trim().length > 0 || filtersActive(s.filters);

export interface LibraryResult {
  flat: boolean;
  title: string;
  rows: PickerItem[];
}

/**
 * The list for flat mode: pick a base by whatever was drilled into, then narrow by query and filters.
 * A search or filter applied ON TOP of a category keeps the category as the base, so "press" inside
 * Push searches only Push — narrowing, never silently widening back to the whole catalog.
 */
export function buildLibrary(
  db: readonly PickerItem[],
  s: LibraryState,
  ctx: {
    favorites: readonly string[];
    recents: readonly string[];
    categoryLabel: (k: ExerciseCategoryKey) => string;
    homeGym?: HomeGymProfile;
  },
): LibraryResult {
  if (!isFlatMode(s)) return { flat: false, title: '', rows: [] };

  let base: PickerItem[];
  let title: string;
  const view = s.view;

  if (view?.type === 'category') {
    base = db.filter((x) => x.cat === view.id);
    title = ctx.categoryLabel(view.id);
  } else if (view?.type === 'favorites') {
    base = ctx.favorites.map((k) => db.find((x) => x.key === k)).filter((x): x is PickerItem => Boolean(x));
    title = 'Favorites';
  } else if (view?.type === 'recent') {
    base = ctx.recents.map((k) => db.find((x) => x.key === k)).filter((x): x is PickerItem => Boolean(x));
    title = 'Recently Used';
  } else {
    base = [...db];
    title = s.query.trim() ? 'Results' : 'Filtered';
  }

  const rows = base.filter((x) => matchesQuery(x, s.query) && passFilters(x, s.filters, ctx.homeGym ?? null));
  return { flat: true, title, rows };
}

export interface CategoryCard {
  key: ExerciseCategoryKey;
  label: string;
  count: number;
}

/** Category cards with live counts — a category with nothing behind it is not offered. */
export function categoryCards(
  db: readonly PickerItem[],
  categories: readonly { key: ExerciseCategoryKey; label: string }[],
): CategoryCard[] {
  return categories
    .map((c) => ({ key: c.key, label: c.label, count: db.filter((x) => x.cat === c.key).length }))
    .filter((c) => c.count > 0);
}

/** Resolve a key list to catalog items, capped for a hub preview row. */
export function preview(db: readonly PickerItem[], keys: readonly string[], limit = 3): PickerItem[] {
  return keys
    .map((k) => db.find((x) => x.key === k))
    .filter((x): x is PickerItem => Boolean(x))
    .slice(0, limit);
}

/** The count of exercises the current filters would show — the sheet's live "Show N" label. */
export const liveCount = (db: readonly PickerItem[], f: LibraryFilters, homeGym: HomeGymProfile = null) =>
  db.filter((x) => passFilters(x, f, homeGym)).length;
