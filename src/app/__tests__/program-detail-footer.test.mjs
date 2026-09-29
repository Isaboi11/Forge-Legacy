/**
 * Program Detail — what is pinned, and what each session row offers (QA 2026-09-26 B5, F3, F12).
 *
 * B5: the pinned footer carried seven controls and a three-line explainer (43–60% of an iPhone), and
 * every session row carried four pills. Only the main button is pinned now; the rest sit at the end of
 * the scroll, and each row has one ⋯. "Swap" there meant move the day, so it says "Move day".
 *
 * Source-level wiring checks on ONE named file, like the other program-detail guards.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '../program/[id].tsx'), 'utf8').replace(/\r\n/g, '\n');

/** The pinned footer: from `<View style={styles.cta}>` to its close, which is right before ScreenTour. */
function pinnedFooter() {
  const a = src.indexOf('<View style={styles.cta}>');
  const b = src.indexOf('<ScreenTour screenKey="program-detail" />');
  assert.ok(a > 0 && b > a, 'the pinned footer is a plain View that ends before the tour');
  return src.slice(a, b);
}

test('only the main button is pinned', () => {
  const footer = pinnedFooter();
  assert.equal((footer.match(/<Button\b/g) ?? []).length, 1, 'one Button in the pinned footer');
  assert.match(footer, /onPress=\{onPrimary\}/);
  for (const gone of ['Duplicate', 'Share Card', 'Send Program', 'End Program', 'Remove from Planned', 'Add to Planned', 'styles.editNote']) {
    assert.ok(!footer.includes(gone), `${gone} is still pinned`);
  }
});

test('the other actions sit in the scroll, after the schedule, still anchored for the tour', () => {
  const scrollEnd = src.indexOf('</ScrollView>');
  const schedule = src.indexOf('<TourAnchor id="program-schedule">');
  const actions = src.indexOf('<TourAnchor id="program-actions"');
  assert.ok(schedule > 0 && actions > schedule && actions < scrollEnd, 'program-actions follows the schedule inside the ScrollView');
  const block = src.slice(actions, scrollEnd);
  for (const kept of ['Duplicate', 'Share Card', 'Send Program', 'End Program', 'Remove from Planned']) {
    assert.ok(block.includes(kept), `${kept} was lost in the move`);
  }
});

test('Send Program needs a saved row; Remove is never offered on the running program (F12, F3)', () => {
  assert.match(src, /\{program \? \(\s*<View style=\{styles\.ctaHalf\}>\s*<Button[\s\S]{0,200}\/send-program/);
  assert.match(src, /\{terminal \|\| !program \|\| state === 'active' \? null : \(/);
  assert.match(src, /kind === 'remove' && state !== 'active'/);
});

test('each session row has one ⋯, and moving a day is called Move day', () => {
  assert.doesNotMatch(src, /styles\.dayAction\b/, 'the four pills are back');
  assert.match(src, /<Glyph name="more"/);
  assert.match(src, /accessibilityLabel=\{`More for \$\{d\.name\}`\}/);
  assert.match(src, />Move day</);
  assert.doesNotMatch(src, />Swap</);
  for (const label of ['Train this', 'Ask Holt', 'Skip', 'Undo skip']) {
    assert.ok(src.includes(`>${label}</Text>`), `${label} is missing from the session menu`);
  }
});

test('an action picked from the menu waits for the menu to leave on native', () => {
  assert.match(src, /onDismiss=\{\(\) => afterMenu\.current\?\.\(\)\}/);
  assert.match(src, /setTimeout\(once,/, 'Android never fires onDismiss, so there must be a fallback');
});
