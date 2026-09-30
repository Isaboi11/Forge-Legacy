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
import { matchesFuzzy, matchesSearch, rankFor } from '../exercise-picker/search-core.ts';
import { isCustomKey } from '../exercise-picker/custom-core.ts';

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

/**
 * Name, alias, vernacular, muscle or equipment — token-AND, exactly as the Picker matches.
 *
 * TWO SEARCH BOXES OVER THE SAME 809 ROWS MUST NOT DISAGREE. This had drifted twice from the Picker's
 * rule: it matched one contiguous substring (so "press incline" found nothing), and it never consulted
 * `ALIASES_BY_ID` at all — so the vernacular names in `aliases.ts` worked in the Picker and silently did
 * not work here, on the screen literally called the Exercise Library.
 *
 * It now delegates to the same matcher rather than restating it, which is the only way the two stay
 * honest as the alias list grows.
 */
export function matchesQuery(x: PickerItem, query: string): boolean {
  return matchesSearch(x, query);
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
 *
 * ══ THE PICKER'S SEARCH, NOT A WEAKER COPY OF IT (B7, QA 09-26) ══
 *
 * The match was shared already; everything around it was not. So the Exercise Library, the screen
 * literally named for finding exercises, found less than the Picker did: no typo pass ("bnech" → nothing),
 * none of the athlete's own exercises, alphabetical order ("plank" put Plank fourth) — and no Run, Ride or
 * Row, because conditioning is not in the catalogue (the caller now passes it in `db`). It now runs the
 * Picker's whole rule (`buildSections`, W-23 §11.3):
 *
 *   · the TYPO PASS, only over an otherwise empty result, and still under the filters;
 *   · the athlete's OWN exercises (`customs`) — in a search or filter over everything, never inside a
 *     category drill (EX-001-D9, the same exception the Picker keeps);
 *   · RANKED while searching: exact name > prefix > contains > metadata, then bookmarked, then recently
 *     used, then A–Z. Without a query the order is the catalogue's own, exactly as before.
 */
export function buildLibrary(
  db: readonly PickerItem[],
  s: LibraryState,
  ctx: {
    favorites: readonly string[];
    recents: readonly string[];
    categoryLabel: (k: ExerciseCategoryKey) => string;
    homeGym?: HomeGymProfile;
    /** The athlete's own exercises in picker shape (`customToPickerItem`). Absent = none. */
    customs?: readonly PickerItem[];
  },
): LibraryResult {
  if (!isFlatMode(s)) return { flat: false, title: '', rows: [] };

  let base: PickerItem[];
  let title: string;
  const view = s.view;
  const customs = ctx.customs ?? [];
  // A bookmark or a recent can be the athlete's own exercise, so those lists resolve against both.
  const byKey = (k: string) => db.find((x) => x.key === k) ?? customs.find((x) => x.key === k);

  if (view?.type === 'category') {
    base = db.filter((x) => x.cat === view.id);
    title = ctx.categoryLabel(view.id);
  } else if (view?.type === 'favorites') {
    base = ctx.favorites.map(byKey).filter((x): x is PickerItem => Boolean(x));
    title = 'Favorites';
  } else if (view?.type === 'recent') {
    base = ctx.recents.map(byKey).filter((x): x is PickerItem => Boolean(x));
    title = 'Recently Used';
  } else {
    // Own exercises join the whole-catalogue list, but not under a category chip (EX-001-D9).
    base = [...db, ...(s.filters.cat.length ? [] : customs)];
    title = s.query.trim() ? 'Results' : 'Filtered';
  }

  const homeGym = ctx.homeGym ?? null;
  const searching = s.query.trim().length > 0;
  const strict = base.filter((x) => matchesQuery(x, s.query) && passFilters(x, s.filters, homeGym));
  const rows = strict.length === 0 && searching ? base.filter((x) => matchesFuzzy(x, s.query) && passFilters(x, s.filters, homeGym)) : strict;
  if (!searching) return { flat: true, title, rows };

  const favSet = new Set(ctx.favorites);
  const recentRank = new Map(ctx.recents.map((k, i) => [k, i] as const));
  const personalRank = (x: PickerItem) =>
    favSet.has(x.key) ? -1000 : recentRank.has(x.key) ? (recentRank.get(x.key) ?? 0) - 500 : 0;
  // Stable sort, so where two rows tie on everything the athlete's own (listed first) stays first.
  const ordered = [...rows.filter((x) => isCustomKey(x.key)), ...rows.filter((x) => !isCustomKey(x.key))].sort(
    (a, b) => rankFor(a.name, s.query) - rankFor(b.name, s.query) || personalRank(a) - personalRank(b) || a.name.localeCompare(b.name),
  );
  return { flat: true, title, rows: ordered };
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
export const liveCount = (
  db: readonly PickerItem[],
  f: LibraryFilters,
  homeGym: HomeGymProfile = null,
  customs: readonly PickerItem[] = [],
) => [...db, ...(f.cat.length ? [] : customs)].filter((x) => passFilters(x, f, homeGym)).length;
