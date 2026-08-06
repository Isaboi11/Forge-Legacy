/**
 * What people CALL the lifts, as opposed to what the catalogue calls them.
 *
 * ══ WHY THIS EXISTS ══
 *
 * A real six-day split imported and thirteen of its forty-three exercises resolved to nothing. Not one of
 * them was missing. Every single one is in the catalogue, fully specified, under a formal name: "Military
 * press" is a Barbell Overhead Press, "Peckdek fly" is a Pec Deck Fly, "Legs press" is a Machine Leg
 * Press. The catalogue had no idea those were the same thing, because 3 of its 797 entries carried an
 * alias. An unmatched name has no detail page, no substitutions, no equipment and no honors.
 *
 * ══ WHY THIS IS NOT THIRTEEN NEW CATALOGUE ENTRIES ══
 *
 * The obvious response to "these aren't in the list" is to add them, and it would have been wrong. A
 * second "Leg Press" record splits an athlete's history in half — some sessions filed against one id,
 * some against the other — and then neither one tells the truth about what they lift. There is one Leg
 * Press. It already has its equipment, its movement pattern, its difficulty and its coaching. It just
 * answers to several names, and only one of them was written down.
 *
 * ══ WHY AN OVERLAY AND NOT AN EDIT ══
 *
 * `exercises.json` is authoritative and append/annotate-only by standing rule. Aliases live here instead,
 * consulted at resolution time, so the source of truth is never rewritten and this entire file can be
 * deleted without touching a single exercise. Reviewing 60 lines of naming also beats reviewing a diff
 * spread across 797 entries.
 *
 * ══ THE SAFETY PROPERTY: AN ALIAS MAY ONLY RESCUE A MISS ══
 *
 * `resolveExerciseName` runs the token matcher FIRST and consults this file only when the matcher
 * returned nothing. That ordering is the whole guarantee, and it is structural rather than a rule anyone
 * has to remember: an alias cannot override, contradict or shadow a real catalogue name, because by the
 * time it is read the matcher has already declined.
 *
 * It caught a live bug. A first draft mapped "calf raise" to the Standing Calf Raise Machine — while the
 * catalogue holds an entry named exactly "Calf Raise". That alias would have quietly redirected an exact
 * name to a different lift. Under this ordering it is not merely fixed, it is unwritable. Four more
 * (`shoulder press`, `reverse fly`, `tricep extension`, `calf raises`) were the same shape and were
 * dropped for the same reason, and 43 others were deleted for doing nothing the matcher didn't already
 * do correctly. Every line below was measured, and changes an answer.
 *
 * ══ WHAT DOES NOT GET AN ALIAS ══
 *
 * Anything genuinely ambiguous. "Lunges" spans walking, reverse, lateral and curtsy — four different
 * movements, no default — so it stays unmatched and the athlete keeps their own words, which always
 * works. "Press" is bench, overhead or leg. "Row", "curl" and "fly" name families, not lifts. An
 * unmatched name is survivable; a confidently wrong one is invisible and permanent.
 */

import { matchExercise, tokenize, type CatalogEntry, type MatchResult } from '../program/exercise-match.ts';

/**
 * A different name for exactly this lift. Nothing is being chosen on the athlete's behalf.
 *
 * alias → catalogue id, compared case- and punctuation-insensitively.
 */
export const EXERCISE_SYNONYMS: Record<string, string> = {
  dip: 'parallel-bar-dip',
  'barbell row': 'barbell-bent-over-row',
  'tbar row': 'machine-t-bar-row',
  'cable row': 'cable-seated-row',
  'flat dumbbell fly': 'dumbbell-chest-fly',
  'pec deck': 'pec-deck-fly',
  'peck deck': 'pec-deck-fly',
  peckdek: 'pec-deck-fly',
  'peckdek fly': 'pec-deck-fly',
  'pec dec': 'pec-deck-fly',
  'military press': 'barbell-overhead-press',
  'strict press': 'barbell-overhead-press',
  'standing press': 'barbell-overhead-press',
  /*
   * ── "SHOULDER PRESS" — THE WORD THE CATALOGUE FILES UNDER "OVERHEAD" ──────────────────────────
   *
   * Reported from a real session: the PO went looking for a barbell shoulder press and the app had
   * nothing. It has one. It is `barbell-overhead-press`, and the reason 723 rows read as empty is
   * that search is token-AND — every word must appear somewhere — and "shoulder" appears in NONE of
   * this row's fields. Not the name ("Barbell Overhead Press"), not its aliases (military · strict ·
   * standing), not its equipment, and not its muscles, because the muscle is called "Front Deltoids"
   * and no muscle in the vocabulary is named "Shoulders".
   *
   * So the catalogue is split down a vocabulary line nobody chose: the MACHINE and DUMBBELL versions
   * are named "… Shoulder Press" and answer, and the BARBELL and BAND versions are named "…
   * Overhead Press" and do not. Typing the plainest possible name for the most common barbell press
   * in the world returned zero.
   *
   * Only the misses are listed. A bare `shoulder press` is deliberately absent for the reason given
   * in the header — four real catalogue rows are named that, and an alias must never shadow a real
   * name — and every entry below was verified to return 0 results before it was added.
   */
  'barbell shoulder press': 'barbell-overhead-press',
  'seated barbell shoulder press': 'barbell-seated-overhead-press',
  'band shoulder press': 'band-overhead-press',
  'single arm band shoulder press': 'single-arm-band-overhead-press',
  'single arm dumbbell shoulder press': 'single-arm-dumbbell-overhead-press',
  /*
   * NOT LISTED, on purpose: a bare `dumbbell shoulder press`. It is tempting — it currently returns
   * only the SEATED variant, and the standing `dumbbell-overhead-press` arguably belongs beside it —
   * but "Seated Dumbbell Shoulder Press" is a real, visible catalogue name, so an alias here would be
   * one the matcher already answers. That is the shape this file forbids, and the invariant test
   * rejects it. Widening that result is a SEARCH change, and it belongs in the matcher, not here.
   */
  'side lateral raise': 'dumbbell-lateral-raise',
  'side laterals': 'dumbbell-lateral-raise',
  'side raise': 'dumbbell-lateral-raise',
  'leg extension': 'leg-extension-machine',
  'seated leg extension': 'leg-extension-machine',
  'quad extension': 'leg-extension-machine',
  'leg press': 'machine-leg-press',
  bench: 'barbell-bench-press',
  'flat bench': 'barbell-bench-press',
  deads: 'barbell-deadlift',
  'conventional deadlift': 'barbell-deadlift',
  chins: 'chin-up',
  pullups: 'pull-up',
  pushups: 'push-up',
  'press ups': 'push-up',
  'barbell curl': 'barbell-biceps-curl',
  'dumbbell curl': 'dumbbell-biceps-curl',
  pushdown: 'cable-triceps-pushdown',
  pulldown: 'cable-lat-pulldown',
  /*
   * The one name in this file that used to be a real catalogue entry. `cable-reverse-fly` was the
   * duplicate half of a pair and is now hidden (`HIDDEN_EXERCISE_IDS`), which is exactly what makes
   * this alias legal under the ordering rule — the matcher can no longer answer it, so this rescues a
   * miss rather than shadowing a name. It also means the athletes who logged sets under the old name
   * still land on a real exercise instead of nothing.
   */
  'cable reverse fly': 'cable-rear-delt-fly',
  /*
   * NO ALIAS FOR "squat jump", and the tests are why. Hiding `squat-jump` (PO ruling 2026-08-05) left
   * the obvious follow-up — alias the retired ordering onto the survivor — and both invariants above
   * rejected it: `aliasKey` SORTS tokens, so "squat jump" and "Jump Squat" normalise to the identical
   * key. The alias would have been a duplicate of a real catalogue name and something the matcher
   * already answers, in one line.
   *
   * Which is the point: word order was never the problem here. The tokenizer discards it, so the
   * retired name has resolved to the surviving row since before either was written down. This pair
   * needed the hide and nothing else — unlike `cable reverse fly` above, which is genuinely different
   * words and does need its line.
   */
};

/**
 * The words name a FAMILY, and one member of it is what people overwhelmingly mean.
 *
 * Separated from the synonyms above because these are conventions rather than facts, and the athlete is
 * told so — a match from this map is flagged `byPreference`, which surfaces in the import preview before
 * any program is created. Nobody writing "Squats" on a leg day means a front squat, but they did not say
 * "back", and the app should not pretend they did.
 */
export const EXERCISE_CONVENTIONS: Record<string, string> = {
  squat: 'barbell-back-squat',
  'leg curl': 'seated-leg-curl-machine', // lying vs seated is a real split; seated is the common machine
  'hamstring curl': 'seated-leg-curl-machine',
  'incline bench': 'barbell-incline-bench-press',
  'incline press': 'barbell-incline-bench-press',
  'good morning': 'barbell-good-morning',
  'hack squat': 'hack-squat-machine', // the catalogue also holds a Barbell Hack Squat
  skullcrushers: 'barbell-skull-crusher',
};

/**
 * The lookup key for a written name.
 *
 * Deliberately the matcher's OWN tokenizer rather than a private normalisation: lower-cased, punctuation
 * dropped, abbreviations expanded, plurals folded, word order discarded. A first draft compared raw
 * strings and "Leg curls" missed the "leg curl" alias over a single letter — every plural in the file was
 * dead. Sharing the tokenizer means an alias is written once, in the singular, and answers to every form
 * an athlete might type.
 */
export const aliasKey = (s: string): string => [...tokenize(s)].sort().join(' ');

const index = (rows: Record<string, string>, byPreference: boolean) =>
  Object.entries(rows).map(([alias, key]) => [aliasKey(alias), { key, byPreference }] as const);

/** Both maps, keyed for lookup. Conventions carry the flag that tells the athlete a choice was made. */
export const ALIAS_INDEX: ReadonlyMap<string, { key: string; byPreference: boolean }> = new Map([
  ...index(EXERCISE_SYNONYMS, false),
  ...index(EXERCISE_CONVENTIONS, true),
]);

/**
 * The same names, turned around: catalogue id → everything it answers to.
 *
 * This feeds the picker's SEARCH box and its name index, so typing "peckdek" or "military press" into the
 * exercise library finds the entry that already exists rather than nothing. Deliberately NOT folded into
 * `catalogForMatching()`: the token matcher must keep seeing only the catalogue's own aliases, or it
 * would start answering names the resolver is supposed to hand to this file — which would both break the
 * ordering guarantee above and report a convention like "Squats" as though it were exact.
 */
export const ALIASES_BY_ID: ReadonlyMap<string, readonly string[]> = (() => {
  const out = new Map<string, string[]>();
  for (const [alias, id] of [...Object.entries(EXERCISE_SYNONYMS), ...Object.entries(EXERCISE_CONVENTIONS)]) {
    const list = out.get(id);
    if (list) list.push(alias);
    else out.set(id, [alias]);
  }
  return out;
})();

/**
 * Resolve a written name against a catalogue — matcher first, aliases only on a miss.
 *
 * Pure and catalogue-injected so the ordering above is testable on the real 797 entries. `data.ts` wraps
 * this with the live catalogue; nothing else should re-implement it.
 */
export function resolveAgainstCatalog(written: string, catalog: readonly CatalogEntry[]): MatchResult | null {
  const matched = matchExercise(written, catalog);
  if (matched) return matched;

  const alias = ALIAS_INDEX.get(aliasKey(written));
  if (!alias) return null;

  // An alias points at an id; the athlete is shown the catalogue's own name for it, never the alias.
  const entry = catalog.find((x) => x.key === alias.key);
  return entry ? { key: entry.key, name: entry.name, byPreference: alias.byPreference } : null;
}
