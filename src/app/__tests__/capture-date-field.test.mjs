/**
 * capture-date-field.test.mjs — the capture date is a day you pick, not a sentence you type.
 *
 * PO, 2026-09-08: *"On the capture date, we need to make it easier. Default to today's date when putting
 * in a progress pictures, and then put a calendar icon that we can click on if needed to change the date.
 * Calendar drop down to make it easy to select the date."*
 *
 * ══ WHAT WAS ACTUALLY WRONG ══
 *
 * The field was a bare `TextInput` placeheld "e.g. Mar 6, 2026". Leaving it blank does not leave the date
 * empty — `addTransformationEntry` substitutes the literal string `Today`, and `elapsedBetween` resolves
 * `Today` to *now* every time it is read. So the fastest path through the form produced an entry that
 * claims to have been captured this morning, and goes on claiming it forever. The inconvenience and the
 * defect are the same line of code.
 *
 * `transformation-add.tsx` is a screen and pulls in react-native, so it cannot be imported under
 * `node --test`. The rules are short and the cost of losing them is an archive that misdates itself, so
 * they are asserted against the source text. The parsing and ordering behind them is real unit-tested
 * code — see `src/domain/legacy/__tests__/capture-date.test.mjs`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
/** Code only — a comment describing the behaviour a test forbids must not satisfy that test. */
const strip = (src) => src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const ADD = strip(read('../transformation-add.tsx'));
const LIVE = strip(read('../../data/transformation-live.ts'));

test('⭐ a new progress set is already dated today', () => {
  assert.match(
    ADD,
    /useState<string \| null>\(\(\) => \(isEdit \? null : todayYmd\(\)\)\)/,
    'the capture date no longer defaults to today for a new set',
  );
});

test('⭐ the date is picked from a calendar, not typed', () => {
  assert.match(ADD, /<CalendarField/, 'the calendar field is gone');
  assert.doesNotMatch(ADD, /accessibilityLabel="Capture date" \/>/, 'the free-text capture date input is back');
  assert.doesNotMatch(ADD, /placeholder="e\.g\. Mar 6, 2026"/, 'the hand-typed-date placeholder is back');
});

test('⚠ NOT the native picker — it does not render on the web, which is where this is tested', () => {
  assert.doesNotMatch(ADD, /datetimepicker/, 'the native wheel would leave web athletes with no date control at all');
  assert.doesNotMatch(ADD, /ForgeDateInput/, 'ForgeDateInput is the retired library’s wrapper around that same native wheel');
});

test('what gets SAVED is the picked day, on both the create and the edit path', () => {
  assert.match(ADD, /addTransformationEntry\(\{ label: dateLabel,/, 'a new entry no longer stores the picked date');
  assert.match(ADD, /updateTransformationEntry\(String\(editId\), \{ label: dateLabel,/, 'an edited entry no longer stores the picked date');
  assert.doesNotMatch(ADD, /\{ label: date,/, 'the old free-text `date` state is being saved again');
});

test('⚠ a label an athlete typed is never silently rewritten', () => {
  // Rows predate the calendar and hold whatever was in the box — `Today`, `Comp day`, a phrase. If it
  // parses as a day the picker adopts it; if it does not, it is held aside and saved back untouched.
  // Opening someone's entry to fix a typo must not quietly restamp it with a date they never chose.
  assert.match(ADD, /setLegacyLabel\(iso \? '' : existing\.label\)/, 'an unparseable legacy label is no longer preserved on prefill');
  assert.match(ADD, /const dateLabel = dateIso \? prettyDate\(dateIso, 'long'\) \?\? '' : legacyLabel;/, 'the save no longer falls back to the legacy label');
});

test('⚠ the gallery orders by the day captured, now that backdating is two taps', () => {
  assert.match(LIVE, /return sortByCapture\(/, 'entries are ordered by insertion time again, so a backdated set sits above today’s');
  assert.match(LIVE, /\.order\('created_at', \{ ascending: false \}\)/, 'the server order is gone — it is what breaks ties within a day and orders undated labels');
});
