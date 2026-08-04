import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ceremonyDetails } from '../details.ts';
import { ceremonyCopy } from '../copy.ts';

const grad = (over = {}) => ({
  id: 'g1',
  kind: 'programGraduated',
  programName: 'Strength Foundation I',
  startedAt: '2026-01-06T00:00:00Z',
  graduatedAt: '2026-02-17T00:00:00Z',
  workouts: 18,
  ...over,
});

test('M-4 shows four rows, with the locked labels in the locked order', () => {
  const rows = ceremonyDetails(grad());
  assert.deepEqual(rows.map((r) => r.label), ['Started', 'Graduated', 'Workouts', 'Duration']);
  assert.deepEqual(rows.map((r) => r.value), ['January 6, 2026', 'February 17, 2026', '18 completed', '6 weeks']);
});

/** Duration is derived from the two dates, never carried — one less thing that can arrive wrong. */
test('Duration is computed from Started and Graduated', () => {
  const rows = ceremonyDetails(grad({ graduatedAt: '2026-01-06T00:00:00Z' }));
  assert.equal(rows.find((r) => r.label === 'Duration').value, '1 day');
});

/**
 * A row whose source datum is missing is OMITTED. The alternative is a modal that states a date the
 * database does not hold, on the screen that announces a permanent record.
 */
test('a missing datum drops its row rather than filling one in', () => {
  const noStart = ceremonyDetails(grad({ startedAt: null }));
  assert.deepEqual(noStart.map((r) => r.label), ['Graduated', 'Workouts'], 'Duration goes with Started');

  const noCount = ceremonyDetails(grad({ workouts: undefined }));
  assert.deepEqual(noCount.map((r) => r.label), ['Started', 'Graduated', 'Duration']);

  const bare = ceremonyDetails({ id: 'g', kind: 'programGraduated', programName: 'X' });
  assert.deepEqual(bare, [], 'the dev harness passes only a name, and gets no invented record');
});

test('no other ceremony has context rows — they are statements, not record cards', () => {
  const others = [
    { id: 'r', kind: 'rankUp', rank: { family: 'architect', level: 2 } },
    { id: 'g', kind: 'goalAchieved', goalName: 'Squat 315' },
    { id: 'h', kind: 'honorEarned', honorName: 'Initiative' },
    { id: 'p', kind: 'premiumUpsell' },
  ];
  for (const e of others) assert.deepEqual(ceremonyDetails(e), [], `${e.kind} grew rows`);
});

/**
 * M4-D5 locks this copy. The rows added beside it must not have quietly become a reason to reword it —
 * if this fails, the amendment was violated rather than the test being stale.
 */
test('the M-4 copy is still M4-D5, verbatim', () => {
  const copy = ceremonyCopy(grad());
  assert.equal(copy.eyebrow, 'Program Graduated');
  assert.equal(copy.title, 'Strength Foundation I');
  assert.equal(copy.body, 'Finished what you started. A permanent mark in your legacy.');
  assert.equal(copy.primary, 'Continue');
  assert.equal(copy.secondary, 'Share this graduation');
});
