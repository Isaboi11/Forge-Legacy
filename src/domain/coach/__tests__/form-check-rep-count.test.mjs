// node --test src/domain/coach/__tests__/form-check-rep-count.test.mjs
//
// PO 2026-11-17: "it said I did 2-3 reps and it was just one rep." A rep count is shown only when the phone counted it.
import test from 'node:test';
import assert from 'node:assert/strict';

import { repsClaimed, trustRepCount } from '../form-check-view.ts';

const read = (over = {}) => ({
  lift: 'Barbell Bench Press',
  looksGood: ['Bar path stays over the shoulder.'],
  fix: ['Pause the bar on the chest.'],
  cue: 'Touch and hold',
  encourage: 'Good set.',
  view: 'diagonal',
  viewLine: 'From this angle, three reps.',
  reps: 3,
  marks: [{ fix: 0, frame: 4, kind: 'dot', x: 0.5, y: 0.5, rep: 3, shows: 'bar on chest' }],
  drill: '',
  ...over,
});

test('repsClaimed reads one number, flags a range, and says nothing when no reps are named', () => {
  assert.equal(repsClaimed('From the side, three reps.'), 3);
  assert.equal(repsClaimed('From the front, 5 reps.'), 5);
  assert.equal(repsClaimed('From this angle, a single rep.'), 1);
  assert.equal(repsClaimed('From this angle, one rep.'), 1);
  assert.equal(repsClaimed('From the side, two or three reps.'), null);
  assert.equal(repsClaimed('From the side, 2-3 reps.'), null);
  assert.equal(repsClaimed('From the side, a few reps.'), null);
  assert.equal(repsClaimed('From the side.'), undefined);
});

test("the PO's bench set: the phone counted nothing, so no count is shown or saved, and Holt's '3 reps' line goes", () => {
  const r = trustRepCount(read(), null);
  assert.equal(r.reps, null);
  assert.equal(r.viewLine, '', 'the screen opens on the line built from the view instead');
  assert.equal(r.marks[0].rep, null, 'no "Rep 3" tag on the frame');
  assert.deepEqual(r.fix, read().fix, "Holt's own sentences are not rewritten");
});

test('the phone counted one rep: one rep is shown, a mark on "rep 3" loses its number', () => {
  const r = trustRepCount(read(), 1);
  assert.equal(r.reps, 1);
  assert.equal(r.viewLine, '');
  assert.equal(r.marks[0].rep, null);
});

test('when Holt agrees with the phone, his line and his rep tags stay', () => {
  const r = trustRepCount(read(), 3);
  assert.equal(r.reps, 3);
  assert.equal(r.viewLine, 'From this angle, three reps.');
  assert.equal(r.marks[0].rep, 3);
});

test('a line that names no count always stays; a range never does', () => {
  assert.equal(trustRepCount(read({ viewLine: 'From this angle.' }), null).viewLine, 'From this angle.');
  assert.equal(trustRepCount(read({ viewLine: 'From the side, two or three reps.' }), 3).viewLine, '');
});

test('nonsense phone counts are no count', () => {
  for (const bad of [0, -1, 1.5, NaN, undefined]) assert.equal(trustRepCount(read(), bad).reps, null);
});
