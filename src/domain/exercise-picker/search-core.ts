import { ALIASES_BY_ID } from './aliases.ts';
import { ABBREVIATIONS, singular } from '../program/exercise-match.ts';
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

/**
 * One string → the comparable words in it. THE QUERY AND THE CATALOGUE BOTH COME THROUGH HERE, and
 * that symmetry is what makes the two rules below safe.
 *
 * ── SPLIT ON ANYTHING THAT IS NOT A LETTER OR A DIGIT, not just whitespace. "pull-up" is a single
 * whitespace-token and no word in "Archer Pull-Up" begins with the string `pull-up`, so a
 * boundary-aware matcher would otherwise have lost a query the old substring rule happened to answer.
 *
 * ── FOLD TO THE SINGULAR. ⚠ **Every plural query in the app used to return nothing** — "squats",
 * "curls", "rows", "presses", "deadlifts", "lunges", "dips", "shrugs", "crunches", "planks", all zero
 * on a 733-row catalogue, under the old substring rule and under its replacement alike. Not a
 * shorthand and not a regionalism: just how anyone names a movement they are about to do several sets
 * of. `singular()` had existed in `exercise-match.ts` the whole time, serving program import.
 *
 * Folding the QUERY alone would fix "curls" and leave "Calves" unreachable from "calf". Folding both
 * sides means a word matches whichever side happens to carry the plural, and the irregulars come out
 * right by symmetry rather than by being enumerated — `calves` and `Calves` both land on `calve`.
 * Safe under prefix matching because the fold only ever SHORTENS a word, so anything that matched a
 * stem still matches it.
 */
const words = (s: string): string[] =>
  s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    /* ⚠ AN ABBREVIATION IS NEVER FOLDED, because the fold would destroy it before anything got to look
       it up. `ohs` ends in an s, so `singular()` cheerfully returned `oh` — a token no expansion is
       keyed on — and "ohs" was the one entry in the whole vernacular pass that still found nothing
       after it was added. Anything ending in a letter s is exposed to this; the shorthand is a name,
       not a plural, so it is left exactly as typed. */
    .map((w) => (w in ABBREVIATIONS ? w : singular(w)));

export function searchTokens(search: string): string[] {
  return words(search);
}

/**
 * ⚠ A TOKEN MATCHES AT THE START OF A WORD, NOT ANYWHERE INSIDE THE STRING ══
 *
 * This was `f.includes(t)`, and on a 733-row catalogue that is not a small imprecision — it is the
 * reason short queries returned confident nonsense:
 *
 *   "rdl" → Forward Hurdle Hop · Hurdle Jump · Lateral Hurdle Hop   (hu·RDL·e)
 *   "gm"  → Supine Diaphragmatic Breathing                          (diaphra·GM·atic)
 *   "bb"  → 92 rows, almost all DUMBBELL                            (du·BB·ell)
 *
 * Not one Romanian Deadlift appeared for "rdl"; three hurdle drills did. An empty result is survivable
 * — the athlete rephrases. Three wrong answers look like a working search that has decided you meant
 * something else, and there are eight Romanian Deadlifts in the catalogue it never showed you.
 *
 * ⚠ STILL A PREFIX, NOT A WHOLE WORD, and that is load-bearing: `inc bench` has to keep reaching
 * "Incline Barbell Bench Press" because typing is expensive mid-set. Only the MIDDLE of a word stops
 * counting.
 */
const hits = (token: string, hay: readonly string[]): boolean => hay.some((w) => w.startsWith(token));

/** One token, on its own terms: literally, or as the abbreviation it spells out. */
function matchesOne(token: string, hay: readonly string[]): boolean {
  if (hits(token, hay)) return true;
  /* An abbreviation stands in for the words it spells out — `rdl` for romanian + deadlift, `ohp`
     for overhead + press. Tried only AFTER the literal token has failed, so this can only ever add
     answers; nothing that matched before stops matching because a query happened to look like an
     abbreviation. Every expanded word must land, exactly as if the athlete had typed them. */
  const expanded = ABBREVIATIONS[token];
  return expanded ? words(expanded).every((w) => hits(w, hay)) : false;
}

/**
 * Does every token hit these fields? Empty query matches everything.
 *
 * ══ ADJACENT TOKENS MAY BE JOINED, BECAUSE THE CATALOGUE COMPOUNDS ITS WORDS AND PEOPLE DO NOT ══
 *
 * "Lat Pulldown" is one word in the catalogue and two words in the gym, and the same seam runs through
 * Pushdown, Deadlift, Kickback, Pullover and Overhead. Under a boundary rule "pull down" matches
 * nothing: "pull" prefixes `pulldown` happily and then "down" has nowhere to land, because the middle
 * of a word no longer counts. Measured before this existed — `pull down`, `push down`, `dead lift`,
 * `kick back` and `over head press` ALL returned zero.
 *
 * ⚠ IT BACKTRACKS RATHER THAN SCANNING GREEDILY. On "lat pull down" a greedy pass takes "lat", then
 * takes "pull" (it does prefix `pulldown`), then fails on "down" having already spent the token that
 * would have joined with it. The first workable reading of a token is not always the one that lets the
 * REST of the query land, so it has to be able to change its mind. Queries are a handful of tokens, so
 * the search is trivially small.
 *
 * ⚠ A JOIN IS PREFIX-CHECKED LIKE ANY OTHER TOKEN, which is what stops this quietly undoing the
 * boundary rule above: `throw` ends with "row" but does not begin with it, so "row" still refuses to
 * return Medicine Ball Throw.
 */
export function matchesTokens(tokens: readonly string[], fields: readonly string[]): boolean {
  if (!tokens.length) return true;
  const hay = fields.flatMap(words);

  const from = (i: number): boolean => {
    if (i >= tokens.length) return true;
    if (matchesOne(tokens[i], hay) && from(i + 1)) return true;
    let joined = tokens[i];
    for (let k = i + 1; k < tokens.length; k++) {
      joined += tokens[k];
      if (hits(joined, hay) && from(k + 1)) return true;
    }
    return false;
  };
  return from(0);
}

/**
 * ══ TYPO TOLERANCE — AND WHY IT IS A SEPARATE PREDICATE RATHER THAN A LOOSER ONE ══
 *
 * PO: *"we need to make sure that we have a fuzzy match."* Right, and the trap is doing it in
 * `matchesTokens`. Every catalogue that gets fuzzy matching folded into its ONE predicate ends up
 * answering "row" with Hollow Rock: fuzziness that is always on spends its precision on the queries
 * that were already working, which is most of them.
 *
 * So this is a strictly worse matcher that only runs when the good one has found NOTHING. That
 * ordering is the same guarantee `aliases.ts` relies on — a fallback can only ever rescue a miss, so
 * it cannot reorder, dilute or shadow a real result, because by the time it runs there are none.
 *
 * ⚠ THE EDIT BUDGET SCALES WITH THE WORD, and short tokens get none. At distance 1, "row" reaches
 * `rot`, `bow`, `raw` and `low`; at distance 2 a three-letter query reaches most of the dictionary.
 * Misspellings are a long-word problem in the first place — nobody types "bulgarain" and "squat"
 * wrong in the same way — so the budget starts at 4 characters and only widens at 8.
 */
const editBudget = (token: string): number => (token.length >= 8 ? 2 : token.length >= 4 ? 1 : 0);

/**
 * Damerau-Levenshtein (optimal string alignment), abandoned as soon as it cannot come in under budget.
 *
 * ⚠ TRANSPOSITION COUNTS AS ONE EDIT, NOT TWO, and that is the difference between this being useful
 * and being theatre. Swapping two adjacent letters is the single most common way a real person
 * mistypes a word, and plain Levenshtein charges 2 for it — so "tricpes pushdown" (the only failure in
 * the first measured pass) sat one point outside a budget that already tolerated a wrong letter, a
 * missing letter and an extra one. Raising the budget to 2 instead would have bought that one typo by
 * letting every 8-letter query reach half the catalogue.
 */
function withinEdits(a: string, b: string, max: number): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > max) return false;
  let twoBack: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let k = 1; k <= b.length; k++) {
      const cost = a[i - 1] === b[k - 1] ? 0 : 1;
      let v = Math.min(prev[k] + 1, row[k - 1] + 1, prev[k - 1] + cost);
      // …and the two letters are simply the wrong way round.
      if (i > 1 && k > 1 && a[i - 1] === b[k - 2] && a[i - 2] === b[k - 1]) v = Math.min(v, twoBack[k - 2] + 1);
      row[k] = v;
      if (v < best) best = v;
    }
    if (best > max) return false; // no completion of this row can recover
    twoBack = prev;
    prev = row;
  }
  return prev[b.length] <= max;
}

/**
 * The same token-AND rule, with each token allowed to be slightly misspelled.
 *
 * ⚠ COMPARED AGAINST A PREFIX OF THE FIELD WORD, not the whole of it, so the tolerance composes with
 * the progressive typing the strict matcher already allows: "roman" must keep reaching "Romanian"
 * without spending its entire budget on the four letters it has not typed yet.
 */
export function matchesFuzzy(x: PickerItem, search: string): boolean {
  const tokens = searchTokens(search);
  if (!tokens.length) return false;
  const hay = searchFields(x).flatMap(words);
  return tokens.every((t) => {
    const max = editBudget(t);
    if (max === 0) return hits(t, hay);
    return hay.some((w) => withinEdits(t, w.slice(0, t.length + max), max));
  });
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
