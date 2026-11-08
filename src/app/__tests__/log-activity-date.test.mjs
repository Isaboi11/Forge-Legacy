/** Launch QA 11-08, H26 — "Log an activity you already did" had no date: yesterday's run was filed as today. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('the day is chosen on the form and moves started_at by whole days', () => {
  assert.match(read('../log-activity.tsx'), /saveActivity\(\{ activityType: activity, distanceMi, durationSec: durationSec \|\| undefined, notes, daysAgo \}\)/);
  const save = read('../../domain/workout/save.ts');
  assert.match(save, /const daysAgo = Math\.max\(0, Math\.min\(6, Math\.floor\(input\.daysAgo \?\? 0\)\)\);/);
  assert.match(save, /new Date\(Date\.now\(\) - daysAgo \* 86_400_000 - dur \* 1000\)/);
});
