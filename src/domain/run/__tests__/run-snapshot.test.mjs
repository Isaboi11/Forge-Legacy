/**
 * run-snapshot.test.mjs — an outdoor bout under way survives a reload (workout-13, QA 09-26).
 *
 * Run:  node --test src/domain/run/__tests__/run-snapshot.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { restoreRun, runSnapshot } from '../run-snapshot.ts';

const pt = (mi, at) => ({ lat: 40 + mi / 100, lon: -105, at, mi });

test('a live walk comes back with its route, and its clock counts the reload', () => {
  const track = [pt(0, 1000), pt(0.4, 400_000)];
  const raw = JSON.stringify(runSnapshot('live', 600, track, 1_000_000));
  const back = restoreRun(raw, 1_012_000);
  assert.equal(back.phase, 'live');
  assert.equal(back.elapsedSec, 612, 'twelve seconds of reload are twelve seconds of walking');
  assert.deepEqual(back.track, track, 'the route resumes where it was written — no distance invented for the gap');
});

test('a paused walk stays paused, and its clock does not move', () => {
  const back = restoreRun(JSON.stringify(runSnapshot('paused', 600, [], 1_000_000)), 1_900_000);
  assert.deepEqual([back.phase, back.elapsedSec], ['paused', 600]);
});

test('a clock set backwards adds nothing; unreadable state restores nothing', () => {
  assert.equal(restoreRun(JSON.stringify(runSnapshot('live', 60, [], 5_000)), 1_000).elapsedSec, 60);
  for (const raw of [null, '', 'not json', '{}', JSON.stringify({ v: 1, phase: 'idle', elapsedSec: 1, savedAt: 1 }), JSON.stringify({ v: 1, phase: 'live', elapsedSec: -5, savedAt: 1 })]) {
    assert.equal(restoreRun(raw, 10), null, String(raw));
  }
  const junk = JSON.stringify({ v: 1, phase: 'live', elapsedSec: 5, savedAt: 10, track: [null, { lat: 'x' }, pt(0.1, 1)] });
  assert.equal(restoreRun(junk, 10).track.length, 1, 'a malformed point is dropped, not drawn');
});
