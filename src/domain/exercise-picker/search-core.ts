import { ALIASES_BY_ID } from './aliases.ts';
import type { PickerItem } from './catalog-core.ts';

/**
 * ══ EXERCISE SEARCH IS TOKEN-AND, NOT ONE CONTIGUOUS SUBSTRING ══
 *
 * Every token the athlete typed must appear SOMEWHERE in the row — the name, an alias, the vernacular
 * list, a muscle, or the equipment — but they no longer have to appear together, in that order, in one
 * field. This is a strict superset of the old rule: anything a single-word query matched still matches.
 *
 * It exists because the old rule failed on the way people actually type. "Incline Barbell Bench Press"
 * did not answer to **"press incline"** (wrong order) or **"bench incline"** (right words, not
 * adjacent), and "Dumbbell Biceps Curl" did not answer to **"db curl"** — where "db" is a vernacular
 * alias and "curl" is in the name, so the answer sat in two fields that were never consulted together.
 * A catalogue of 809 exercises reads as empty when it will not answer to plain speech.
 *
 * ══ WHY IT LIVES IN ITS OWN FILE ══
 *
 * `data.ts` imports the catalogue JSON, which `node --test` cannot load — so nothing that imports it can
 * be unit-tested, and the Exercise Library could not share its matcher without dragging the whole
 * dataset in. The RULE lives here, pure and loadable; the DATA stays there. That split is also what
 * lets the Picker and the Library run the identical matcher instead of two drifting copies of it — they
 * had already drifted twice, the Library's missing the vernacular aliases entirely.
 */

export function searchTokens(search: string): string[] {
  return search.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/** Does every token hit at least one of these fields? Empty query matches everything. */
export function matchesTokens(tokens: readonly string[], fields: readonly string[]): boolean {
  if (!tokens.length) return true;
  const hay = fields.map((f) => f.toLowerCase());
  return tokens.every((t) => hay.some((f) => f.includes(t)));
}

/** Everything about a row that search is allowed to look at. */
export function searchFields(x: PickerItem): string[] {
  return [
    x.name,
    ...x.aliases,
    // What people call it, which is often not what the catalogue calls it — see `aliases.ts`.
    ...(ALIASES_BY_ID.get(x.key) ?? []),
    ...x.muscles,
    x.equip,
  ];
}

/** The one search predicate. Both the Picker and the Library run exactly this. */
export function matchesSearch(x: PickerItem, search: string): boolean {
  return matchesTokens(searchTokens(search), searchFields(x));
}

/**
 * Search ranking, W-23 §11.3: exact name > prefix > contains > scattered-in-name > metadata, then
 * alphabetical. Widening what is ELIGIBLE must not reorder what was already the best answer, so a row
 * carrying the whole phrase still outranks one that merely contains all the words.
 */
export function rankFor(name: string, search: string): number {
  const q = search.trim().toLowerCase();
  if (!q) return 3;
  const n = name.toLowerCase();
  if (n === q) return 0;
  if (n.startsWith(q)) return 1;
  if (n.includes(q)) return 2;
  const tokens = searchTokens(search);
  if (tokens.length > 1 && matchesTokens(tokens, [n])) return 2.5;
  return 3;
}
