/**
 * What a chapter is called, and the one rule that keeps it readable everywhere it is shown.
 *
 * ══ WHY THIS IS A MODULE AND NOT A STRING ══
 *
 * Every athlete's first chapter was `'Chapter I — Building Your Foundation'`, hard-coded, and the
 * athlete was never asked. The PO's note: *"Be able to name your first chapter and not have it be
 * 'building foundation' right off the bat. This makes it more personal."* The RPC has taken the name
 * as a parameter since 0008, so nothing in the database had to change — the ask was only ever missing
 * from the screen.
 *
 * There was also no way to rename ANY chapter, ever: the only `insert into chapters` in the repo is the
 * onboarding RPC, and the only two writers touch `is_active`/`sealed_at`/`reflection`. So a name chosen
 * in the first sixty seconds of using the app would have been permanent. That is the second half of
 * what this supports.
 *
 * ══ THE DELIMITER RULE ══
 *
 * ⚠ A chapter name is parsed in two places, by two DIFFERENT rules, neither of which is enforced by the
 * database (the column is a bare `text not null`):
 *   · `splitChapterTitle` (Home hero) splits on an EM-DASH and nothing else.
 *   · `detail-core.ts` splits on an em-dash OR a middle dot.
 * A typed name containing either character would be silently cut in half by one parser and not the
 * other, so the athlete types the TITLE ONLY and the `Chapter N — ` prefix stays machine-generated.
 * `sanitizeChapterTitle` strips the delimiters as a second line of defence, because a paste is not a
 * keystroke and nobody reads placeholder text.
 */

/** Roman ordinal for chapter N. Beyond twelve is not a realistic number of chapters; it falls back. */
export function chapterOrdinal(n: number): string {
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  return ROMAN[n - 1] ?? String(n);
}

export const CHAPTER_I_PREFIX = 'Chapter I';

/** What Chapter I is called when the athlete does not choose (ONB-D14's title, now a default). */
export const DEFAULT_CHAPTER_I_TITLE = 'Building Your Foundation';

/**
 * Long enough for a real phrase, short enough for the Home hero and the Legacy card, both of which
 * render it on one line at display weight.
 */
export const CHAPTER_TITLE_MAX = 40;

/**
 * Offered, not imposed. Four shapes rather than four synonyms — a beginning, a return, a span of time,
 * and a stated intention — so the list reads as a prompt for the athlete's own words rather than a menu
 * to pick from. The first is the old hard-coded default, kept because plenty of people will want it.
 */
export const CHAPTER_SUGGESTIONS: readonly string[] = [
  DEFAULT_CHAPTER_I_TITLE,
  'The Comeback',
  'Year One',
  'Stronger Than Last Year',
];

/** Strip the two delimiters the name parsers split on, collapse whitespace, and cap the length. */
export function sanitizeChapterTitle(raw: string): string {
  return raw
    .replace(/[—–·|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, CHAPTER_TITLE_MAX);
}

/** A typed title is usable if it survives sanitising with something left. */
export const isValidChapterTitle = (raw: string): boolean => sanitizeChapterTitle(raw).length >= 2;

/** `Chapter I — Building Your Foundation`. The prefix is never the athlete's to type. */
export function chapterNameFrom(title: string, prefix: string = CHAPTER_I_PREFIX): string {
  const clean = sanitizeChapterTitle(title);
  return clean ? `${prefix} — ${clean}` : `${prefix} — ${DEFAULT_CHAPTER_I_TITLE}`;
}

/**
 * Split a stored name back into its prefix and title so a rename sheet can offer the title alone.
 *
 * Mirrors `splitChapterTitle`'s em-dash rule deliberately: if the Home hero would show a given string
 * as the title, this returns that same string, and a rename cannot make the hero say something the
 * editor did not show.
 */
export function splitChapterName(full: string): { prefix: string; title: string } {
  const i = full.indexOf('—');
  if (i < 0) return { prefix: CHAPTER_I_PREFIX, title: full.trim() };
  return { prefix: full.slice(0, i).trim() || CHAPTER_I_PREFIX, title: full.slice(i + 1).trim() };
}
