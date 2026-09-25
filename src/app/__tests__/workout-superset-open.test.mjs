/**
 * workout-superset-open.test.mjs — a superset member's sets open IN the pairing card (W9-Amendment-014).
 *
 * PO (2026-09-12), mid-superset: *"I would like to be able to touch one of the workouts and it expands
 * into the full card like it shows on just a regular exercise screen. That way I can see and adjust all
 * sets."* Then, asked whether to expand in place or open a separate card: expand in place.
 *
 * What was there before, and why each assertion below exists:
 *
 *   · only the member's NAME text was a target, with nothing on screen saying it was one
 *   · it navigated to the member's own card — which showed the hero and NO SET TABLE, because the
 *     table's guard was still `isSuperset` (4fb0ae4, Aug 3) when the hero's had moved to `ssFused`
 *   · the table was 250 lines of inline JSX, so a second one in the card would have been a copy
 *
 * None of this is visible to `tsc`. Same shape as `workout-plinth-and-row.test.mjs`.
 *
 * Run:  node --test src/app/__tests__/workout-superset-open.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
/** Comments explain this at length; they must never be able to SATISFY a test about it. */
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const WORKOUT = strip(read('../workout.tsx'));

/** The fused card's JSX, from its opening guard to the round chips. */
const card = (() => {
  const a = WORKOUT.indexOf('{block && ssFused ? (');
  const b = WORKOUT.indexOf('styles.ssRounds', a);
  assert.ok(a > 0 && b > a, 'the fused superset card is gone');
  return WORKOUT.slice(a, b);
})();

/** The member row's own tap target — the Pressable that carries `ssOpenHit`. */
const hit = (() => {
  const end = card.indexOf('styles.ssOpenHit');
  const start = card.lastIndexOf('<Pressable', end);
  const close = card.indexOf('</Pressable>', end);
  assert.ok(end > 0 && start > 0 && close > end, 'the member row has no tap target');
  return card.slice(start, close);
})();

/* ── 1 · ONE TABLE, TWO PLACES ───────────────────────────────────────────────────────────────────── */

test('the set table is ONE component, drawn by the exercise card and by the superset card', () => {
  assert.match(WORKOUT, /function SetTable\(/, 'SetTable is gone');
  const uses = WORKOUT.match(/<SetTable\b/g) ?? [];
  assert.equal(uses.length, 2, `expected the exercise card and the superset card to draw SetTable, found ${uses.length}`);
  assert.equal((WORKOUT.match(/styles\.headRow/g) ?? []).length, 1, 'a second copy of the table header crept back in — the two tables will drift');
  assert.match(card, /<SetTable\s+inline\s+exercise=\{mex\}\s+ei=\{mi\}/, 'the superset card does not draw the member\'s own table');
  assert.match(WORKOUT, /<SetTable exercise=\{ex\} ei=\{exIdx\}/, 'the exercise card no longer draws SetTable');
});

test('⚠ an opened member\'s FULL card still shows its set table — hidden only while the card is FUSED', () => {
  assert.match(WORKOUT, /\{ssFused \? null : isCardio \? \(/, 'the set table is not guarded by ssFused');
  assert.ok(!/\{isSuperset \? null : isCardio \? \(/.test(WORKOUT), 'the set table is hidden for every superset member again — an opened one shows no sets');
  assert.match(WORKOUT, /\{isCardio \|\| ssFused \? null : heroExpanded \? \(/, 'the hero guard moved');
});

test('the inline table drops the tour anchors — the walkthrough points at ONE table', () => {
  const fn = WORKOUT.slice(WORKOUT.indexOf('function SetTable('), WORKOUT.indexOf('function AddSetButton('));
  assert.match(fn, /return inline \? \(\s*<View style=\{styles\.tableInline\}>\{body\}<\/View>\s*\) : \(\s*<TourAnchor id="workout-sets"/, 'the inline table registers the tour anchor too');
  assert.match(fn, /inline \? \(\s*<View style=\{styles\.setBtns\}>[\s\S]*?\) : \(\s*<TourAnchor id="workout-addset"/, 'the inline Add Set registers the tour anchor too');
  assert.equal((WORKOUT.match(/id="workout-sets"/g) ?? []).length, 1, 'workout-sets is registered twice');
});

test('⚠ the table keys everything by ITS exercise, never the pager\'s', () => {
  const fn = WORKOUT.slice(WORKOUT.indexOf('function SetTable('), WORKOUT.indexOf('function AddSetButton('));
  assert.ok(!/\bexIdx\b/.test(fn), 'SetTable reads exIdx — a superset member\'s row would log against whichever lift the pager is on');
  for (const call of ["onEdit(ei, si, 'weight')", "onEdit(ei, si, 'reps')", 'onComplete(ei, si)', 'onUncomplete(ei, si)', 'onRemove(ei, si)', 'onAdd(ei)', 'onHold(ei, si, held)']) {
    assert.ok(fn.includes(call), `SetTable no longer calls ${call}`);
  }
});

/* ── 2 · THE TAP ─────────────────────────────────────────────────────────────────────────────────── */

test('the whole member row toggles its sets open, in place, with a chevron that turns', () => {
  assert.match(hit, /onPress=\{\(\) => setSsSetsOpen\(setsOpen \? null : mi\)\}/, 'the row no longer toggles the member\'s sets');
  assert.ok(!/setSsOpen\(/.test(hit), 'the row navigates away to the full card again — the PO asked for it to expand in place');
  assert.match(hit, /styles\.ssTag\b/, 'the A1/A2 tag is outside the tap target');
  assert.match(hit, /styles\.ssName\b/, 'the name is outside the tap target');
  assert.match(hit, /styles\.ssSet\b/, 'the goal line is outside the tap target');
  assert.match(hit, /name=\{setsOpen \? 'chevron-down' : 'chevron-right'\}/, 'the chevron no longer says which way the row goes');
  assert.match(hit, /accessibilityState=\{\{ expanded: setsOpen \}\}/, 'a screen reader cannot tell the row is open');
});

test('Log Set stays its own tap — opening a member must not swallow logging', () => {
  assert.ok(!/openSheet\(/.test(hit), 'Log Set was nested inside the open-member target');
  assert.match(card, /onPress=\{\(\) => openSheet\(mi, round, 'weight'\)\}/, 'Log Set no longer logs the member');
});

test('the full card is still one link further in — and its way back is still drawn', () => {
  assert.match(card, /onPress=\{\(\) => \{\s*goExercise\(mi\);\s*setSsOpen\(mi\);\s*\}\}[\s\S]{0,500}?>Open full card</, '"Open full card" is gone from the opened section');
  assert.match(WORKOUT, /\{isSuperset && !ssFused \? \(\s*<Pressable\s+onPress=\{\(\) => setSsOpen\(null\)\}/, 'the "Back to the superset" bar is gone');
});

test('leaving the pairing closes the opened sets, as it closes the full card', () => {
  const go = WORKOUT.slice(WORKOUT.indexOf('const goExercise ='), WORKOUT.indexOf('const onPagerSettle ='));
  assert.match(go, /setSsOpen\(null\);\s*setSsSetsOpen\(null\);/, 'walking away and back reopens a member\'s table you left');
});

/* ── 3 · THE COUNTS ──────────────────────────────────────────────────────────────────────────────── */

test('⚠ Add Set and the trash keep the SAVED round count in step with one member\'s sets', () => {
  const add = WORKOUT.slice(WORKOUT.indexOf('const addSet ='), WORKOUT.indexOf('const removeSet ='));
  const rm = WORKOUT.slice(WORKOUT.indexOf('const removeSet ='), WORKOUT.indexOf('const removeSet =') + 900);
  assert.match(add, /syncSupersetRounds\(added\.exercises, ei\)/, 'Add Set inside a superset saves a stale group_rounds');
  assert.match(rm, /syncSupersetRounds\(next\.exercises, ei\)/, 'removing a set inside a superset saves a stale group_rounds');
});

test('the inline table fits a 360pt phone: it borrows the card\'s padding and has no side padding of its own', () => {
  const RAW = read('../workout.tsx');
  assert.match(RAW, /ssSets: \{ marginHorizontal: -10/, 'the opened section no longer borrows the card padding — six cells will not fit at 375pt');
  assert.match(RAW, /tableInline: \{ paddingTop: \d+ \}/, 'the inline table gained side padding or a border');
  // The fixed cells the math in the `ssSets` comment is built on.
  const w = (k) => Number(RAW.match(new RegExp(`  ${k}: \\{ width: (\\d+)`))[1]);
  const cells = ['cSet', 'cPrev', 'cWeight', 'cReps', 'cCheck', 'cTrash'].reduce((n, k) => n + w(k), 0);
  const need = cells + 5 * 4 /* rowCells gap */ + 2 * 4 /* row padding */ + 2 /* row border */;
  const have = 360 - 2 * 18 /* scroll gutter */ - 2 /* card border */ - 2 * 14 /* card padding */ + 2 * 10 /* borrowed */;
  assert.ok(need <= have, `the six cells need ${need}pt and a 360pt phone has ${have}pt inside the card`);
});
