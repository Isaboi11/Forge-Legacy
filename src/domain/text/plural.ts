// ONE pluraliser for every count the app prints (QA 09-26 N-22, programs-18, social-27, legacy-24, home-15).
// "1 weeks", "1 DAYS LEFT", "Runs 1 days", "1 comments", "started 1 minutes ago" all came from a hand-written
// `${n} ${word}s` somewhere. Use `countOf(n, 'week')` for "3 weeks" and `pluralWord(n, 'week')` when the
// number is printed separately. Pure and dependency-free, so domain code can import it by relative path.

/** The plural of an English noun: a regular `s`/`es`/`ies`, or the form you pass. */
export function pluralOf(singular: string, plural?: string): string {
  if (plural) return plural;
  if (/[^aeiou]y$/i.test(singular)) return `${singular.slice(0, -1)}${singular.endsWith('Y') ? 'IES' : 'ies'}`;
  if (/(s|x|z|ch|sh)$/i.test(singular)) return `${singular}${singular === singular.toUpperCase() ? 'ES' : 'es'}`;
  return `${singular}${singular.length > 1 && singular === singular.toUpperCase() ? 'S' : 's'}`;
}

/** Singular for exactly one — and for a fraction of one ("0.5 cup", "¾ serving"); plural otherwise, zero included. */
export function isSingularCount(n: number): boolean {
  return Number.isFinite(n) && n !== 0 && Math.abs(n) <= 1;
}

/** Just the word: `pluralWord(1, 'week')` → "week", `pluralWord(3, 'week')` → "weeks". */
export function pluralWord(n: number, singular: string, plural?: string): string {
  return isSingularCount(n) ? singular : pluralOf(singular, plural);
}

/** The number and the word: `countOf(1, 'week')` → "1 week", `countOf(2, 'box')` → "2 boxes". */
export function countOf(n: number, singular: string, plural?: string): string {
  return `${n} ${pluralWord(n, singular, plural)}`;
}
