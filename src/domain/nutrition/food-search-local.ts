/**
 * ══ SEARCH LOCALLY WHILE TYPING; THE FOOD SERVICES ON A PAUSE (AI Road to 10 Sprint 3a, NU-2) ══
 *
 * `food-search` takes 1.7–4.9 s (USDA, FatSecret and Open Food Facts). While it is out — and before it is even
 * asked, during the pause the screen waits for — the list is filled from what the phone already holds:
 *   1. the athlete's own foods that match every word typed: My Foods, then Recent, then Favourites;
 *   2. the answer to a SHORTER query asked in the last ten minutes ("chicken" while typing "chicken b"),
 *      narrowed to the words typed so far.
 * The service's own answer replaces all of it when it lands. Nothing here calls anything.
 */
import type { CatalogFood } from './serving.ts';

/** How long typing must pause before the food services are asked (they are paid / rate-limited). */
export const FOOD_SEARCH_PAUSE_MS = 500;
/** At most this many of the athlete's own foods above the earlier answer. */
export const OWN_MATCHES_MAX = 5;

const wordsOf = (q: string) => q.toLowerCase().split(/\s+/).filter(Boolean);

/** Every typed word appears in the name or brand ("chick bre" finds "Chicken Breast"). */
export function matchesTyped(q: string, name: string, brand?: string | null): boolean {
  const words = wordsOf(q);
  if (!words.length) return false;
  const text = `${name} ${brand ?? ''}`.toLowerCase();
  return words.every((w) => text.includes(w));
}

/**
 * The answer to a shorter query already held (`peek` = the screen's ten-minute memory), narrowed to what is typed
 * now. The LONGEST held prefix wins. Null when none is held or nothing in it fits — then "Searching…" stands
 * alone rather than a list that says "nothing".
 */
export function narrowEarlierSearch(q: string, peek: (q: string) => CatalogFood[] | null): CatalogFood[] | null {
  const typed = q.trim();
  for (let n = typed.length - 1; n >= 2; n -= 1) {
    const held = peek(typed.slice(0, n));
    if (!held) continue;
    const fit = held.filter((f) => matchesTyped(typed, f.name, f.brand));
    return fit.length ? fit : null;
  }
  return null;
}

type Keyed = { key: string; name: string; brand?: string | null };

export type LocalHit<M, R, F> =
  | { from: 'mine'; item: M }
  | { from: 'recent'; item: R }
  | { from: 'favorite'; item: F }
  | { from: 'earlier'; item: CatalogFood };

/** What the list shows while the service is out: own foods first (one row per food), then the earlier answer. */
export function localWhileSearching<M extends Keyed, R extends Keyed, F extends Keyed>(
  q: string,
  lists: {
    mine?: readonly M[] | null;
    recents?: readonly R[] | null;
    favorites?: readonly F[] | null;
    earlier?: readonly CatalogFood[] | null;
  },
): LocalHit<M, R, F>[] {
  const seen = new Set<string>();
  const own: LocalHit<M, R, F>[] = [];
  const take = <T extends Keyed>(items: readonly T[] | null | undefined, wrap: (item: T) => LocalHit<M, R, F>) => {
    for (const item of items ?? []) {
      if (own.length >= OWN_MATCHES_MAX) return;
      if (seen.has(item.key) || !matchesTyped(q, item.name, item.brand)) continue;
      seen.add(item.key);
      own.push(wrap(item));
    }
  };
  take(lists.mine, (item) => ({ from: 'mine', item }));
  take(lists.recents, (item) => ({ from: 'recent', item }));
  take(lists.favorites, (item) => ({ from: 'favorite', item }));
  const earlier: LocalHit<M, R, F>[] = [];
  for (const item of lists.earlier ?? []) {
    if (seen.has(item.key)) continue;
    seen.add(item.key);
    earlier.push({ from: 'earlier', item });
  }
  return [...own, ...earlier];
}
