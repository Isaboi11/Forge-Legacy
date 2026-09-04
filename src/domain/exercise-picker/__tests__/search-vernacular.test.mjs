/**
 * search-vernacular.test.mjs — the catalogue answers to what people SAY, not only to how it is filed.
 *
 * PO (2026-09-04): *"Romanian deadlift does not come up when you search RDL, which is how a lot of
 * people know it. So we need to make sure that we have a fuzzy match and option match."*
 *
 * ══ WHAT THE SWEEP ACTUALLY FOUND ══
 *
 * The RDL report was the visible corner of a matcher problem, not a missing-data problem. `rdl` had
 * been sitting in `ABBREVIATIONS` the whole time — reachable from `tokenize()`, which serves PROGRAM
 * IMPORT, and invisible to the search box, which runs `search-core`. Measured against the real 733-row
 * catalogue, before any of this:
 *
 *   · "rdl" returned THREE HURDLE DRILLS and no Romanian Deadlift — `includes()` matched hu·RDL·e.
 *     "gm" returned Supine Diaphragma·GM·atic Breathing. "bb" returned 92 rows, nearly all DUMBBELL.
 *   · **Every plural returned zero.** squats · curls · rows · presses · deadlifts · lunges · dips ·
 *     shrugs · crunches · planks. `singular()` also already existed, and search had never heard of it.
 *   · Compound names split in the gym and joined in the catalogue found nothing: "pull down",
 *     "push down", "dead lift", "kick back", "over head press".
 *
 * So of 102 vernacular candidates hand-written for `aliases.ts`, **64 needed no alias at all** once the
 * matcher was fixed. These guard the rules; `aliases.ts` guards the words that are genuinely different.
 *
 * Field lists are written out the way `searchFields` assembles them, so this runs the real rule without
 * the catalogue JSON `node --test` cannot load.
 *
 * Run:  node --test src/domain/exercise-picker/__tests__/search-vernacular.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { matchesFuzzy, matchesTokens, searchTokens } from '../search-core.ts';

const row = (name, muscles = [], equip = '') => ({ key: `test-${name}`, name, aliases: [], muscles, equip });
const fields = (x) => [x.name, ...x.aliases, ...x.muscles, x.equip];
const finds = (x, q) => matchesTokens(searchTokens(q), fields(x));

const RDL = row('Barbell Romanian Deadlift', ['Hamstrings', 'Glutes'], 'Barbell');
const HURDLE = row('Forward Hurdle Hop', ['Quads'], 'Bodyweight');
const DB_CURL = row('Dumbbell Biceps Curl', ['Biceps'], 'Dumbbell');
const BB_ROW = row('Barbell Bent-Over Row', ['Lats'], 'Barbell');
const PULLDOWN = row('Cable Lat Pulldown', ['Lats'], 'Cable');
const THROW = row('Medicine Ball Throw', ['Chest'], 'Medicine Ball');
const BSS = row('Barbell Bulgarian Split Squat', ['Quads'], 'Barbell');
const OHS = row('Barbell Overhead Squat', ['Quads'], 'Barbell');
const CALF = row('Standing Calf Raise Machine', ['Calves'], 'Machine');

/* ── 1 · THE REPORT ITSELF ───────────────────────────────────────────────────────────────────────── */

test('⭐ RDL finds the Romanian Deadlift — the report that started this', () => {
  assert.ok(finds(RDL, 'rdl'));
  assert.ok(finds(RDL, 'RDL'), 'case cannot matter');
  assert.ok(finds(RDL, 'db rdl') === false, 'a barbell RDL is not a dumbbell one');
});

test('⚠ …and STOPS finding hurdle drills, which is the half nobody reported', () => {
  // `includes()` matched hu·RDL·e. Three confident wrong answers is worse than an empty screen:
  // an empty screen makes you rephrase, three wrong ones look like the search worked.
  assert.equal(finds(HURDLE, 'rdl'), false, 'rdl must not match the MIDDLE of "hurdle"');
  assert.equal(finds(DB_CURL, 'bb'), false, 'bb must not match the middle of "dumbbell"');
  assert.equal(finds(THROW, 'row'), false, 'row must not match the end of "throw"');
  // The boundary rule must not cost the progressive typing the old rule allowed.
  assert.ok(finds(RDL, 'roman'), 'a prefix of a word still counts — typing is expensive mid-set');
  assert.ok(finds(BB_ROW, 'bar bent'), 'still token-AND, still any order');
});

/* ── 2 · PLURALS — THE LARGEST FAILURE, AND NOBODY HAD REPORTED IT ───────────────────────────────── */

test('⭐ plural queries work, in both directions', () => {
  assert.ok(finds(BSS, 'squats'), '"squats" returned ZERO rows across the whole catalogue');
  assert.ok(finds(DB_CURL, 'curls'));
  assert.ok(finds(BB_ROW, 'rows'));
  assert.ok(finds(RDL, 'deadlifts'));
  assert.ok(finds(DB_CURL, 'bicep curls'), 'singular query, plural muscle field');
  // Folded on BOTH sides, which is how the irregulars come out right without being listed.
  assert.ok(finds(CALF, 'calves'), 'plural query, plural field');
  assert.ok(finds(CALF, 'calf raises'), 'mixed');
});

/* ── 3 · COMPOUND WORDS — THE CATALOGUE JOINS THEM, THE GYM DOES NOT ─────────────────────────────── */

test('a name the catalogue writes as one word answers to two', () => {
  assert.ok(finds(PULLDOWN, 'pull down'));
  assert.ok(finds(PULLDOWN, 'lat pull down'), '⚠ needs backtracking: "pull" alone matches, then "down" strands');
  assert.ok(finds(RDL, 'dead lift'));
  assert.ok(finds(OHS, 'over head squat'));
  // …and the reverse, via ABBREVIATIONS.
  assert.ok(finds(PULLDOWN, 'latpulldown'));
});

/* ── 4 · ABBREVIATIONS ───────────────────────────────────────────────────────────────────────────── */

test('the shorthand people actually say resolves', () => {
  assert.ok(finds(BSS, 'bss'));
  assert.ok(finds(OHS, 'ohs'));
  assert.ok(finds(RDL, 'dl'), 'dl expands to the WORD, so it finds every deadlift rather than one');
  assert.ok(finds(DB_CURL, 'db curl'));
  assert.ok(finds(BB_ROW, 'bb row'));
});

test('⚠ an abbreviation ending in "s" is not eaten by the plural fold', () => {
  // `singular('ohs')` is 'oh' — a token no expansion is keyed on. This was the one entry in the whole
  // vernacular pass that still found nothing AFTER being added, and the cause was ordering, not data.
  assert.deepEqual(searchTokens('ohs'), ['ohs'], 'must survive tokenisation intact');
  assert.ok(finds(OHS, 'ohs'));
});

test('an abbreviation only ever ADDS answers — it is tried after the literal token fails', () => {
  // A row that legitimately contains the letters wins on its own terms first.
  const EZ = row('EZ-Bar Biceps Curl', ['Biceps'], 'EZ Bar');
  assert.ok(finds(EZ, 'ez'));
});

/* ── 5 · FUZZY — A WORSE MATCHER, RUN ONLY OVER AN EMPTY SCREEN ──────────────────────────────────── */

test('⭐ misspellings resolve', () => {
  assert.ok(matchesFuzzy(RDL, 'romainian deadlift'), 'transposed vowels');
  assert.ok(matchesFuzzy(BSS, 'bulgarain split squat'));
  assert.ok(matchesFuzzy(RDL, 'deadlfit'), 'transposition');
  assert.ok(matchesFuzzy(DB_CURL, 'dumbell curl'), 'dropped letter');
  assert.ok(matchesFuzzy(BSS, 'squuat'), 'doubled letter');
});

test('⚠ a transposition costs ONE edit, not two', () => {
  // "tricpes" → "triceps" is 2 plain-Levenshtein edits and 1 Damerau edit. It was the only failure in
  // the first measured pass, and the wrong fix — raising the budget to 2 — would have let every
  // 8-letter query reach half the catalogue.
  const PUSHDOWN = row('Cable Triceps Pushdown', ['Triceps'], 'Cable');
  assert.ok(matchesFuzzy(PUSHDOWN, 'tricpes pushdown'));
});

test('⚠ SHORT tokens get no edit budget at all', () => {
  // At distance 1 "row" reaches rot, bow, raw and low. Misspelling is a long-word problem.
  assert.equal(matchesFuzzy(THROW, 'row'), false);
  assert.equal(matchesFuzzy(BB_ROW, 'raw'), false, 'a 3-letter query must be exact');
  assert.equal(matchesFuzzy(RDL, 'rdl x'), false);
});

test('gibberish still finds nothing — fuzzy is not "match anything"', () => {
  for (const junk of ['zzzzzz', 'qwertyuiop', 'xkcd']) {
    assert.equal(matchesFuzzy(RDL, junk), false, `${junk} must not match`);
    assert.equal(matchesFuzzy(BSS, junk), false);
  }
});

test('an empty query is not a fuzzy match for everything', () => {
  // `matchesTokens` treats no tokens as "match all" (browse). The fallback must not inherit that, or
  // an empty search would route every row through the worse matcher.
  assert.equal(matchesFuzzy(RDL, ''), false);
  assert.equal(matchesFuzzy(RDL, '   '), false);
});
