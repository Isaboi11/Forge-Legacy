import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CHAPTER_I_PREFIX,
  CHAPTER_SUGGESTIONS,
  CHAPTER_TITLE_MAX,
  chapterNameFrom,
  chapterOrdinal,
  DEFAULT_CHAPTER_I_TITLE,
  isValidChapterTitle,
  sanitizeChapterTitle,
  splitChapterName,
} from '../chapter-name.ts';

/**
 * Chapter naming — now that the athlete types it.
 *
 * From the PO: *"Be able to name your first chapter and not have it be 'building foundation' right off
 * the bat."* Every athlete's Chapter I was the same hard-coded string, and no chapter could ever be
 * renamed — the only writers on that table touch `is_active`, `sealed_at` and `reflection`.
 *
 * ⚠ THE TESTS THAT MATTER MOST ARE THE DELIMITER ONES. A chapter name is parsed in two places by two
 * different rules — `splitChapterTitle` (Home hero) splits on an em-dash, `detail-core` on an em-dash
 * OR a middle dot — and the column is a bare `text not null` with nothing enforcing either. A typed
 * name carrying one of those characters would be cut in half by one parser and not the other, so the
 * Home hero and the activity detail would disagree about what a chapter is called.
 */

/**
 * ⚠ THE SECOND CHAPTER — added 2026-08-14 with L-5 (`src/app/chapter/new.tsx`).
 *
 * Until then no athlete could HAVE one: the only `insert into chapters` in the repo was the onboarding
 * RPC, which `0066` guards so a second call is a retry. `createChapter` now derives the prefix from the
 * count of chapters the athlete has ever had, so the numbering behaviour finally has a caller — and it
 * only ever ran on 1 before, where every off-by-one looks identical.
 */
test('the ordinal follows the count of chapters ever had, sealed ones included', () => {
  // Chapter III follows Chapter II even though II is closed — the count is lifetime, not active.
  const nameFor = (existing) => chapterNameFrom('The Rebuild', `Chapter ${chapterOrdinal(existing + 1)}`);
  assert.equal(nameFor(0), 'Chapter I — The Rebuild');
  assert.equal(nameFor(1), 'Chapter II — The Rebuild');
  assert.equal(nameFor(2), 'Chapter III — The Rebuild');
  assert.equal(nameFor(11), 'Chapter XII — The Rebuild');
});

test('past twelve it degrades to a number rather than breaking', () => {
  // `chapterOrdinal` has twelve Roman numerals and falls back. Nobody is expected to reach it, but a
  // thirteenth chapter must still be creatable — an `undefined` prefix would write "Chapter undefined".
  assert.equal(chapterOrdinal(13), '13');
  assert.equal(chapterNameFrom('Year Two', `Chapter ${chapterOrdinal(13)}`), 'Chapter 13 — Year Two');
});

test('a name typed into L-5 survives the round trip the two parsers disagree about', () => {
  // The suggestions are offered as taps in L-5a, so they are the most likely titles in existence and
  // must survive their own sanitiser unchanged.
  for (const s of CHAPTER_SUGGESTIONS) {
    assert.equal(sanitizeChapterTitle(s), s, `${s} must not be altered by sanitising`);
    assert.equal(splitChapterName(chapterNameFrom(s, 'Chapter II')).title, s);
  }
});

test('a typed title is prefixed, never typed with its own number', () => {
  assert.equal(chapterNameFrom('The Comeback'), 'Chapter I — The Comeback');
});

test('an em-dash in a typed title cannot reach the stored name', () => {
  // Otherwise `splitChapterTitle` would take everything before it as the chapter NUMBER, and the Home
  // hero would render "Chapter I — Rebuild" as number "Chapter I — Rebuild" and title "the long way".
  assert.equal(chapterNameFrom('Rebuild — the long way'), 'Chapter I — Rebuild the long way');
});

test('a middle dot cannot reach it either — the two parsers disagree about that one', () => {
  // `detail-core.ts` splits on `[·—]`; the Home hero does not. A name with a `·` would render one way
  // on Home and another on the activity detail.
  assert.equal(chapterNameFrom('Winter · 2027'), 'Chapter I — Winter 2027');
});

test('an ordinary hyphen survives — it is not a delimiter either parser reads', () => {
  assert.equal(chapterNameFrom('Post-Injury'), 'Chapter I — Post-Injury');
});

test('whitespace is collapsed rather than stored as the athlete fat-fingered it', () => {
  assert.equal(sanitizeChapterTitle('  The   Comeback  '), 'The Comeback');
});

test('a blank title falls back to the default — "skip" and "never asked" write the same row', () => {
  assert.equal(chapterNameFrom(''), `${CHAPTER_I_PREFIX} — ${DEFAULT_CHAPTER_I_TITLE}`);
  assert.equal(chapterNameFrom('   '), `${CHAPTER_I_PREFIX} — ${DEFAULT_CHAPTER_I_TITLE}`);
  assert.equal(chapterNameFrom('—'), `${CHAPTER_I_PREFIX} — ${DEFAULT_CHAPTER_I_TITLE}`);
});

test('the title is capped, so the Home hero and the Legacy card still fit it on one line', () => {
  const long = 'x'.repeat(200);
  assert.equal(sanitizeChapterTitle(long).length, CHAPTER_TITLE_MAX);
});

test('validity is judged on what would be STORED, not on what was typed', () => {
  assert.equal(isValidChapterTitle('The Comeback'), true);
  assert.equal(isValidChapterTitle('   '), false);
  assert.equal(isValidChapterTitle('·—·'), false); // sanitises away to nothing
  assert.equal(isValidChapterTitle('A'), false); // one character is a slip, not a name
});

test('a rename keeps the chapter number it already had', () => {
  // The ordinal is a client convention with no column behind it, so re-deriving it on rename would
  // silently renumber a chapter. The prefix is read back off the existing name instead.
  assert.equal(chapterNameFrom('Peak Season', 'Chapter IV'), 'Chapter IV — Peak Season');
});

test('splitChapterName round-trips what chapterNameFrom builds', () => {
  for (const title of ['The Comeback', 'Year One', 'Post-Injury']) {
    const full = chapterNameFrom(title, 'Chapter III');
    assert.deepEqual(splitChapterName(full), { prefix: 'Chapter III', title });
  }
});

test('splitChapterName survives a legacy name with no dash at all', () => {
  assert.deepEqual(splitChapterName('Getting Started'), { prefix: CHAPTER_I_PREFIX, title: 'Getting Started' });
});

test('the suggestions are offerable as-is — none of them sanitises to something different', () => {
  for (const s of CHAPTER_SUGGESTIONS) {
    assert.equal(sanitizeChapterTitle(s), s, `"${s}" would be altered on save`);
    assert.ok(isValidChapterTitle(s));
  }
});

test('the first suggestion is the old default, so the previous behaviour is still one tap away', () => {
  assert.equal(CHAPTER_SUGGESTIONS[0], DEFAULT_CHAPTER_I_TITLE);
});

test('ordinals are roman, and a number past the table degrades rather than throwing', () => {
  assert.equal(chapterOrdinal(1), 'I');
  assert.equal(chapterOrdinal(4), 'IV');
  assert.equal(chapterOrdinal(12), 'XII');
  assert.equal(chapterOrdinal(13), '13');
});
