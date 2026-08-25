/**
 * Exercise Picker data + selection logic (W-23, `Forge Exercise Picker.dc.html`).
 *
 * Reads the AUTHORITATIVE 809-exercise dataset (`exercise-relationships/source/*.json`) — the same
 * source the rest of the app uses. It previously carried the design's hand-tagged 26-movement demo set,
 * which silently capped the Program Builder and the Active Workout's add/replace at 26 choices.
 *
 * Two deliberate divergences from the `.dc`, both to match the LOCKED W-23 spec, which the demo set
 * predated:
 *  1. NO "Movement type" (Compound / Isolation) filter — no such field exists on any of the 809 records
 *     and no derivation rule exists in any doc, so it cannot be honestly populated. W-23 §14.2 defines
 *     exactly four filter groups and movement type is not one of them.
 *  2. Browse is category ROWS, not every exercise inlined. At 26 items the `.dc` could render every
 *     category expanded; at 809 that is an unusable scroll. W23-D7 already specifies the behaviour:
 *     "Tapping a category applies an implicit filter chip, showing filtered results inline."
 *
 * The mapping onto the 6 locked browse categories lives in `catalog-core` (pure + unit-tested).
 */

import { CARDIO_ACTIVITIES, CARDIO_SEARCH_ALIASES, cardioKey } from '../workout/conditioning.ts';
import { type MatchResult } from '../program/exercise-match.ts';
import { ALIASES_BY_ID, resolveAgainstCatalog } from './aliases.ts';
import { mergeForSearch } from './custom-core.ts';
import { matchesSearch, rankFor } from './search-core.ts';
import equipmentData from '../exercise-relationships/source/equipment.json';
import exerciseMusclesData from '../exercise-relationships/source/exercise_muscles.json';
import exercisesData from '../exercise-relationships/source/exercises.json';
import musclesData from '../exercise-relationships/source/muscles.json';
import {
  buildEquipFilterGroups,
  buildMuscleFilterGroups,
  buildPickerDb,
  EXERCISE_CATEGORIES,
  type Difficulty,
  type ExerciseCategoryKey,
  type PickerItem,
  type RawEquipment,
  type RawExercise,
  type RawMuscle,
  type RawMuscleLink,
} from './catalog-core';

export { EXERCISE_CATEGORIES, DIFFS, DEFAULT_HOLD_SEC, asUnit } from './catalog-core';
// Re-exported so a screen has one import site for search, not two.
export { matchesSearch, matchesTokens, rankFor, searchFields, searchTokens } from './search-core.ts';
export type { Difficulty, ExerciseCategoryKey, PickerItem, EquipClass, ExerciseUnit } from './catalog-core';

export const PICKER_DB: PickerItem[] = buildPickerDb({
  exercises: exercisesData as RawExercise[],
  exerciseMuscles: exerciseMusclesData as RawMuscleLink[],
  muscles: musclesData as RawMuscle[],
  equipment: equipmentData as RawEquipment[],
});

export const MUSCLE_FILTER_GROUPS = buildMuscleFilterGroups(musclesData as RawMuscle[]);
export const EQUIP_FILTER_GROUPS = buildEquipFilterGroups(equipmentData as RawEquipment[]);

const BY_KEY = new Map(PICKER_DB.map((x) => [x.key, x]));
export function itemByKey(key: string): PickerItem | undefined {
  return BY_KEY.get(key);
}

/**
 * Normalise a display name for matching:
 *  · drop a trailing prescription — warm-ups are stored as prose, e.g. "Bodyweight Squat — 10 reps",
 *    which would otherwise never match the catalog's "Bodyweight Squat";
 *  · squash punctuation and spacing, so "incline pushup" matches "Incline Push-Up".
 * Only em/en dashes and a spaced hyphen split off the detail — a bare hyphen is part of the name.
 */
function normName(s: string): string {
  return s
    .split(/[—–]|\s-\s/)[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

const BY_NAME = new Map<string, PickerItem>();
for (const x of PICKER_DB) {
  BY_NAME.set(normName(x.name), x);
  for (const a of x.aliases) if (!BY_NAME.has(normName(a))) BY_NAME.set(normName(a), x);
}
// The vernacular, added LAST and never over an existing key: a real name always outranks an alias.
for (const x of PICKER_DB) {
  for (const a of ALIASES_BY_ID.get(x.key) ?? []) if (!BY_NAME.has(normName(a))) BY_NAME.set(normName(a), x);
}

/**
 * Resolve a stored/display name back to a catalog entry — matching on name, then alias, after
 * normalisation. Programs and sessions logged before catalog keys were threaded through carry free-text
 * names, and this is what lets those older rows still open their exercise detail.
 */
export function itemByName(name: string): PickerItem | undefined {
  return BY_NAME.get(normName(name));
}

/** The picker's canonical display name for a raw name (unknown names pass through unchanged). */
export function canonicalName(raw: string): string {
  return itemByName(raw)?.name ?? raw;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTERS — W-23 §14.2: Muscle Group, Equipment, Difficulty. OR within, AND across (§14.3).
// (Source — All / System / Custom / Favorites — is omitted: Favorites and Custom both already lead the
// My Exercises section, so the chip would only ever HIDE the catalogue, which the search field does
// better.)
// ─────────────────────────────────────────────────────────────────────────────

export interface PickerFilters {
  equip: string[]; // equipment ids
  muscle: string[]; // muscle ids
  diff: Difficulty[];
  cat: ExerciseCategoryKey[]; // the implicit chip from tapping a browse category (W23-D7)
}
export const EMPTY_FILTERS: PickerFilters = { equip: [], muscle: [], diff: [], cat: [] };

export function filtersActive(f: PickerFilters): boolean {
  return f.equip.length > 0 || f.muscle.length > 0 || f.diff.length > 0 || f.cat.length > 0;
}
export function filterCount(f: PickerFilters): number {
  return f.equip.length + f.muscle.length + f.diff.length + f.cat.length;
}

/**
 * AND across groups, OR within a group. `excludeName` drops the exercise being replaced.
 *
 * The SEARCH half is `matchesSearch` in `search-core` — token-AND across name, aliases, vernacular,
 * muscles and equipment. It lives there rather than here so `node --test` can load the rule (this file
 * imports the catalogue JSON, which it cannot) and so the Exercise Library can run the identical
 * matcher instead of a second copy that drifts.
 */
export function matchItem(x: PickerItem, search: string, f: PickerFilters, excludeName: string | null): boolean {
  if (excludeName && x.name === excludeName) return false;
  if (f.equip.length && !f.equip.includes(x.equipId)) return false;
  if (f.diff.length && !f.diff.includes(x.difficulty)) return false;
  if (f.cat.length && !f.cat.includes(x.cat)) return false;
  if (f.muscle.length && !f.muscle.some((m) => x.muscleIds.includes(m))) return false;

  return matchesSearch(x, search);
}

/** Search ranking, W-23 §11.3 — the rule lives in `search-core` alongside the matcher it must agree with. */
export function searchRank(x: PickerItem, search: string): number {
  return rankFor(x.name, search);
}

/**
 * Ranked functional substitutes for `targetName`. Shared movement pattern dominates, then shared
 * muscles, then equipment familiarity — a candidate qualifies only on a shared pattern or ≥1 muscle.
 */
export function bestReplacements(targetName: string, candidates: PickerItem[]): PickerItem[] {
  const target = itemByName(targetName);
  if (!target) return [];
  return candidates
    .map((x) => {
      const patMatch = x.pattern === target.pattern;
      const shared = x.muscleIds.filter((m) => target.muscleIds.includes(m)).length;
      const sharedPrimary = x.primaryMuscleIds.filter((m) => target.primaryMuscleIds.includes(m)).length;
      let sc = 0;
      if (patMatch) sc += 100;
      sc += sharedPrimary * 30 + shared * 10;
      if (x.equipId === target.equipId) sc += 15;
      else if (x.equipClass === target.equipClass) sc += 8;
      if (x.difficulty === target.difficulty) sc += 5;
      return { x, sc, ok: patMatch || shared >= 1 };
    })
    .filter((r) => r.ok && r.x.key !== target.key)
    .sort((a, b) => b.sc - a.sc || a.x.name.localeCompare(b.x.name))
    .slice(0, 5)
    .map((r) => r.x);
}

export interface PickerCategoryRow {
  key: ExerciseCategoryKey;
  label: string;
  count: number;
}

export interface PickerSections {
  best: PickerItem[];
  /** Bookmarked + recently-logged, when browsing. The athlete's own shortlist, first. */
  mine: PickerItem[];
  /** Browse mode: the 6 category rows (tap → implicit filter). Empty once searching/filtering. */
  categoryRows: PickerCategoryRow[];
  /** Result mode: the matching exercises, ranked. Empty while browsing. */
  results: PickerItem[];
  browsing: boolean;
  total: number;
  hasResults: boolean;
  /** Custom exercises held back by `MINE_CUSTOM_MAX` while browsing — so the list can say so. */
  customOverflow: number;
}

/**
 * How many of the athlete's own exercises lead My Exercises before the rest are left to search.
 *
 * The cap is a scroll budget, not a policy: `CUSTOM_LIMIT` is 500, and an athlete who has imported a
 * gym's worth of machines must not have to scroll past all of them to reach the category tiles. The
 * overflow is COUNTED and stated (`customOverflow`), never silently dropped.
 */
export const MINE_CUSTOM_MAX = 8;

/**
 * Two modes. Idle → the 6 category rows with live counts. Searching or filtering → a ranked flat list.
 * "Best replacements" still leads in replace mode, since that is the whole point of that entry.
 */
export function buildSections(opts: {
  search: string;
  filters: PickerFilters;
  isReplace: boolean;
  replacingName: string | null;
  /** Bookmarked catalog keys — rank first everywhere, and lead the My Exercises section. */
  favorites?: readonly string[];
  /** Recently-logged catalog keys, most recent first. */
  recents?: readonly string[];
  /**
   * The catalog to search, defaulting to all of it. Passed in rather than filtered here so the gear
   * gate stays where it belongs (`home-gym/equipment`) and this module keeps knowing nothing about
   * what an athlete owns.
   */
  pool?: readonly PickerItem[];
  /**
   * The athlete's OWN exercises, already in picker shape (`customToPickerItem`).
   *
   * Passed in for the same reason `pool` is: they are per-athlete and arrive async, and this module
   * knows nothing about Supabase. Absent = the caller has none or has not asked for them, and every
   * section below reads exactly as it did before they existed.
   */
  customs?: readonly PickerItem[];
}): PickerSections {
  const { search, filters, isReplace, replacingName } = opts;
  const favorites = opts.favorites ?? [];
  const recents = opts.recents ?? [];
  const favSet = new Set(favorites);
  const recentRank = new Map(recents.map((k, i) => [k, i]));
  // W-23 §11.3: within the same match tier, bookmarked first, then recently used, then alphabetical.
  const personalRank = (x: PickerItem) =>
    favSet.has(x.key) ? -1000 : recentRank.has(x.key) ? (recentRank.get(x.key) ?? 0) - 500 : 0;
  const exclude = isReplace ? replacingName : null;
  const searching = search.trim().length > 0;
  const browsing = !searching && !filtersActive(filters);

  /*
   * Tapping CARDIO browses conditioning. The pool widens ONLY for that chip: every other path — search,
   * the other six categories, the equipment and muscle filters — still sees the catalogue alone, so
   * nothing about finding a bench press changes.
   */
  const pool = filters.cat.includes('CARDIO') ? [...(opts.pool ?? PICKER_DB), ...CONDITIONING_ROWS] : (opts.pool ?? PICKER_DB);
  const matched = pool.filter((x) => matchItem(x, search, filters, exclude));

  /*
   * ══ THE ATHLETE'S OWN EXERCISES, AND THE ONE PLACE THEY DO NOT APPEAR ══
   *
   * They are matched by the same `matchItem` as everything else — search, equipment, muscle and
   * difficulty all reach them — with a single exception: a CATEGORY chip. EX-001-D9 makes browsing
   * "Push" mean browsing the shipped catalogue, and the tile counts below are computed from `matched`
   * alone; a tile that reads 120 and then lists 121 is lying about the catalogue it names. They are
   * reachable from that same screen through My Exercises, which is where somebody looking for their own
   * exercise actually looks.
   *
   * The gear gate is NOT applied to them, and that is deliberate: `pool` is already gated by the caller,
   * and an athlete who wrote down their own machine has told us they can do it. Their equipment ids come
   * from the Home Gym vocabulary rather than the catalogue's, so gating them would also be comparing two
   * different alphabets.
   */
  const matchedCustoms = (filters.cat.length ? [] : (opts.customs ?? [])).filter((x) =>
    matchItem(x, search, filters, exclude),
  );

  const best = isReplace && browsing && replacingName ? bestReplacements(replacingName, matched) : [];
  const bestKeys = new Set(best.map((b) => b.key));

  if (browsing) {
    const mineKeys = [...favorites, ...recents.filter((k) => !favSet.has(k))];
    const mine = [
      /* THE ATHLETE'S OWN, FIRST AND WITHOUT BEING SEARCHED FOR. This is the only section that can show
         them while browsing — the six tiles below are the catalogue's — so if they are not here, an
         exercise the athlete wrote down themselves is reachable only by typing its name, which is the
         bug this section closes. */
      ...matchedCustoms.slice(0, MINE_CUSTOM_MAX),
      ...mineKeys
        .map((k) => matched.find((x) => x.key === k))
        .filter((x): x is PickerItem => Boolean(x) && !bestKeys.has((x as PickerItem).key)),
    ];
    /*
     * CARDIO counts its own rows, not the catalogue's.
     *
     * Conditioning deliberately lives outside `PICKER_DB` (see `CONDITIONING_ROWS`), so counting it the
     * same way as the other six would report zero and the filter below would drop the category
     * entirely — a door that exists in the list and opens onto nothing.
     */
    const categoryRows = EXERCISE_CATEGORIES.map((c) => ({
      key: c.key,
      label: c.label,
      count: c.key === 'CARDIO' ? CONDITIONING_ROWS.length : matched.filter((x) => x.cat === c.key).length,
    })).filter((c) => c.count > 0);
    return {
      best,
      mine,
      categoryRows,
      results: [],
      browsing: true,
      // The CATALOGUE's size, matching the tiles it introduces — custom exercises are counted by
      // `customOverflow` and shown above, not folded into a number about the six categories.
      total: matched.length,
      hasResults: categoryRows.length > 0 || mine.length > 0,
      customOverflow: Math.max(0, matchedCustoms.length - MINE_CUSTOM_MAX),
    };
  }

  /* `mergeForSearch` decides only the TIE: two rows with the same name put the athlete's own first.
     The sort below is the real order (W-23 §11.3), and it is stable, so that tie-break survives it. */
  const results = mergeForSearch(matched, matchedCustoms)
    .filter((x) => !bestKeys.has(x.key))
    .sort(
      (a, b) =>
        searchRank(a, search) - searchRank(b, search) ||
        personalRank(a) - personalRank(b) ||
        a.name.localeCompare(b.name),
    );

  return {
    best,
    mine: [],
    categoryRows: [],
    results,
    browsing: false,
    total: results.length + best.length,
    hasResults: results.length > 0 || best.length > 0,
    customOverflow: 0,
  };
}


/**
 * The catalogue as the import matcher wants it — key, name, aliases, nothing else.
 *
 * A narrow view on purpose: `exercise-match` stays pure and dependency-free (it never imports the
 * catalogue, which is 797 entries of JSON), and this is the one place that hands it the real data.
 */
/**
 * Conditioning as picker rows — the CARDIO category's contents.
 *
 * Deliberately NOT in `PICKER_DB`. That list is invariant-tested to come wholly from `exercises.json`,
 * name-sorted, and a run has no muscle map, movement pattern or difficulty because it is a different
 * KIND of exercise. These sit alongside it and are folded in only where a category is being browsed or
 * counted, so search results over the catalogue are unchanged.
 */
export const CONDITIONING_ROWS: PickerItem[] = CARDIO_ACTIVITIES.map((c) => ({
  key: cardioKey(c.key),
  name: c.name,
  cat: 'CARDIO' as ExerciseCategoryKey,
  equipId: 'none',
  equip: c.sub,
  equipClass: 'Bodyweight',
  muscleIds: [],
  muscles: [],
  primaryMuscleIds: [],
  difficulty: 'Beginner',
  pattern: 'Locomotion',
  modality: 'cardio',
  /* What people type. Without these the section answered to `name` alone, and five of the seven
     could not be found by their own name — "bike" missed Ride, "rowing" missed Row. */
  aliases: CARDIO_SEARCH_ALIASES[c.key],
  environments: [],
  /*
   * REPS, and it is not a contradiction. A run is obviously measured by time and distance — but never
   * through `unit`, which decides whether the SET TABLE draws a rep box or a hold timer. A conditioning
   * row never reaches that table: `pickedToExercise` sends it to `cardioExercise`, and the card it gets
   * asks for a distance, a pace and a clock of its own. Marking it 'time' here would offer a 30-second
   * plank timer for a 5K.
   */
  unit: 'reps',
})) as PickerItem[];

export const catalogForMatching = (): { key: string; name: string; aliases?: string[] }[] =>
  PICKER_DB.map((x) => ({ key: x.key, name: x.name, aliases: x.aliases }));

/**
 * Resolve a written exercise name to a catalogue entry — the ONE path, used by import and by anything
 * else that has to turn somebody's words into a real lift.
 *
 * The order is the safety property. The token matcher runs first and the curated aliases are consulted
 * only when it returned nothing, so an alias can rescue a name the catalogue could not reach but can
 * never override, contradict or shadow a name it could. See `aliases.ts` for the bug that ordering
 * makes unwritable.
 */
export const resolveExerciseName = (written: string): MatchResult | null =>
  resolveAgainstCatalog(written, catalogForMatching());
