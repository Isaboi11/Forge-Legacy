/**
 * holt-marks.test.mjs — "Updated by Holt": which sessions a Holt edit changed, and putting one back.
 *
 * The after-structures here come from the REAL edit ops (`setPrescription`), not hand-written copies,
 * so the marking is tested against exactly what the chat saves.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/holt-marks.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { setPrescription } from '../edit-ops.ts';
import { HOLT_LABEL, describeDayChange, holtNoteAt, holtSpanLabel, markHoltChange, trimAsked, undoHoltChange, withoutNote } from '../holt-marks.ts';
import { totalSessions } from '../../program/progress-core.ts';

const day = (letter, name, lifts) => ({
  letter,
  name,
  warmup: [],
  main: lifts.map((n) => ({ name: n, sets: 3, reps: 5 })),
  cooldown: [],
});
const rest = (letter) => ({ letter, name: 'Rest', warmup: [], main: [], cooldown: [] });

/** Four weeks: Upper A, a rest day, Lower A. Template only, as a freshly built program is. */
const program = () => ({
  name: 'Strength Block',
  weeks: 4,
  daysPerWeek: 2,
  vary: false,
  days: [day('A', 'Upper A', ['Bench Press', 'Row']), rest('B'), day('C', 'Lower A', ['Back Squat'])],
  weekPlans: null,
});

const META = { id: 'n1', at: '2026-02-10T18:00:00Z', what: 'Bench Press to 4 sets', asked: 'Bench has been stuck at 225 for three weeks.' };

test('the label reads "Updated by Holt" (PO 10-01)', () => {
  assert.equal(HOLT_LABEL, 'Updated by Holt');
});

test('a this-week change marks only that session', () => {
  const before = program();
  const res = setPrescription(before, [], { weekIndex: 1, dayIndex: 0, exerciseIndex: 0 }, { sets: 4 }, 'this_week');
  assert.ok(res.ok);
  const marked = markHoltChange(before, res.structure, META);
  const note = holtNoteAt(marked, 1, 0);
  assert.ok(note);
  assert.equal(note.id, 'n1');
  assert.equal(note.what, 'Bench Press to 4 sets');
  assert.equal(note.asked, 'Bench has been stuck at 225 for three weeks.');
  assert.equal(note.was.main[0].sets, 3, 'remembers the session as it was');
  assert.equal(holtNoteAt(marked, 1, 1), null, 'Lower A was not touched');
  assert.equal(holtNoteAt(marked, 0, 0), null, 'week 1 was not touched');
  assert.equal(holtNoteAt(marked, 2, 0), null, 'week 3 was not touched');
  assert.equal(holtSpanLabel(marked, 'n1'), 'Week 2');
});

test('a rest-of-block change marks every remaining week, and says so', () => {
  const before = program();
  const res = setPrescription(before, [], { weekIndex: 1, dayIndex: 0, exerciseIndex: 0 }, { sets: 4 }, 'rest_of_block');
  assert.ok(res.ok);
  const marked = markHoltChange(before, res.structure, META);
  assert.equal(holtNoteAt(marked, 0, 0), null);
  for (const w of [1, 2, 3]) assert.equal(holtNoteAt(marked, w, 0)?.id, 'n1', `week ${w + 1}`);
  assert.equal(holtSpanLabel(marked, 'n1'), 'Weeks 2–4');
});

test('the note is stored on the session itself, so the program never changes size', () => {
  const before = program();
  const res = setPrescription(before, [], { weekIndex: 0, dayIndex: 1, exerciseIndex: 0 }, { sets: 5 }, 'rest_of_block');
  const marked = markHoltChange(before, res.structure, META);
  assert.equal(totalSessions(marked), totalSessions(before));
  assert.equal(marked.days, marked.weekPlans[0].days, 'week 1 plan and the template stay the same object');
});

test('undo puts every untouched session back exactly as it was', () => {
  const before = program();
  const res = setPrescription(before, [], { weekIndex: 1, dayIndex: 0, exerciseIndex: 0 }, { sets: 4 }, 'rest_of_block');
  const marked = markHoltChange(before, res.structure, META);
  const undone = undoHoltChange(marked, 'n1', []);
  assert.ok(undone.ok);
  assert.equal(undone.restored, 3);
  for (const w of [1, 2, 3]) {
    assert.equal(holtNoteAt(undone.structure, w, 0), null);
    assert.equal(undone.structure.weekPlans[w].days[0].main[0].sets, 3);
  }
});

test('undo never rewrites a session already trained', () => {
  const before = program();
  const res = setPrescription(before, [], { weekIndex: 1, dayIndex: 0, exerciseIndex: 0 }, { sets: 4 }, 'rest_of_block');
  const marked = markHoltChange(before, res.structure, META);
  const trainedWeek2 = [{ weekIndex: 1, dayIndex: 0, state: 'completed', workoutId: 'w' }];
  const undone = undoHoltChange(marked, 'n1', trainedWeek2);
  assert.ok(undone.ok);
  assert.equal(undone.restored, 2);
  assert.equal(undone.structure.weekPlans[1].days[0].main[0].sets, 4, 'week 2 keeps what it was trained as');
  assert.equal(undone.structure.weekPlans[2].days[0].main[0].sets, 3);
});

test('undo with nothing left to put back says so instead of saving', () => {
  const before = program();
  const res = setPrescription(before, [], { weekIndex: 1, dayIndex: 0, exerciseIndex: 0 }, { sets: 4 }, 'this_week');
  const marked = markHoltChange(before, res.structure, META);
  const undone = undoHoltChange(marked, 'n1', [{ weekIndex: 1, dayIndex: 0, state: 'completed', workoutId: 'w' }]);
  assert.equal(undone.ok, false);
});

test('a second change to the same session keeps the first one underneath, one level deep', () => {
  const before = program();
  const first = markHoltChange(before, setPrescription(before, [], { weekIndex: 1, dayIndex: 0, exerciseIndex: 0 }, { sets: 4 }, 'this_week').structure, META);
  const second = markHoltChange(
    first,
    setPrescription(first, [], { weekIndex: 1, dayIndex: 0, exerciseIndex: 0 }, { sets: 5 }, 'this_week').structure,
    { ...META, id: 'n2', what: 'Bench Press to 5 sets' },
  );
  const note = holtNoteAt(second, 1, 0);
  assert.equal(note.id, 'n2');
  assert.equal(note.was.holtNote.id, 'n1', 'undoing the second brings back the first');
  assert.equal(note.was.holtNote.was.holtNote, undefined, 'and no deeper');
  const undone = undoHoltChange(second, 'n2', []);
  assert.equal(holtNoteAt(undone.structure, 1, 0)?.id, 'n1');
  assert.equal(undone.structure.weekPlans[1].days[0].main[0].sets, 4);
});

test('an unchanged structure marks nothing', () => {
  const before = program();
  const res = setPrescription(before, [], { weekIndex: 0, dayIndex: 0, exerciseIndex: 0 }, { sets: 4 }, 'this_week');
  const marked = markHoltChange(res.structure, res.structure, META);
  for (let w = 0; w < 4; w++) for (const d of [0, 1]) assert.equal(holtNoteAt(marked, w, d), null);
});

test('the note is ignored when comparing, so re-saving does not re-mark', () => {
  const before = program();
  const res = setPrescription(before, [], { weekIndex: 1, dayIndex: 0, exerciseIndex: 0 }, { sets: 4 }, 'this_week');
  const marked = markHoltChange(before, res.structure, META);
  assert.deepEqual(withoutNote(marked.weekPlans[1].days[0]).main, res.structure.weekPlans[1].days[0].main);
});

test('what the athlete asked is kept to one line', () => {
  assert.equal(trimAsked('  bench\n is   stuck  '), 'bench is stuck');
  assert.equal(trimAsked(''), null);
  assert.equal(trimAsked(null), null);
  const long = trimAsked('x'.repeat(400));
  assert.ok(long.length <= 160 && long.endsWith('…'));
});

test('without a confirm to quote, each session describes its own change', () => {
  const before = program();
  const res = setPrescription(before, [], { weekIndex: 1, dayIndex: 0, exerciseIndex: 0 }, { sets: 4 }, 'this_week');
  const marked = markHoltChange(before, res.structure, { id: 'n3', at: META.at });
  assert.equal(holtNoteAt(marked, 1, 0).what, 'Bench Press: 3 × 5 → 4 × 5');
  assert.equal(holtNoteAt(marked, 1, 0).asked, null);
});

test('describeDayChange names swaps, adds and removals, and calls a big change a rebuild', () => {
  const a = day('A', 'Upper A', ['Bench Press', 'Row']);
  assert.equal(describeDayChange(a, day('A', 'Upper A', ['Paused Bench Press', 'Row'])), 'Bench Press → Paused Bench Press');
  assert.equal(describeDayChange(a, day('A', 'Upper A', ['Bench Press', 'Row', 'Curl'])), 'Curl added');
  assert.equal(describeDayChange(a, day('A', 'Upper A', ['Bench Press'])), 'Row removed');
  assert.equal(describeDayChange(a, day('A', 'Upper A', ['Dip', 'Pull-up', 'Curl'])), 'Upper A rebuilt');
});
