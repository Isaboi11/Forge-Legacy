/**
 * Launch QA 11-08, B8 — a "lower is better" goal (get to 180 lb, a 5K under 25 min) was marked ACHIEVED by its
 * first progress number, irreversibly. `updateProgress` passed the direction flag alone ('up' on every manual
 * goal), so 195 ≥ 180 read as done.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { meetsTarget } from '../goals.ts';

test('with its baseline, a cut is not met by a number above the target', () => {
  assert.equal(meetsTarget({ target: 180, current: 195, metricDir: 'up', metricStartValue: 195 }), false);
  assert.equal(meetsTarget({ target: 180, current: 186, metricDir: 'up', metricStartValue: 195 }), false);
  assert.equal(meetsTarget({ target: 180, current: 180, metricDir: 'up', metricStartValue: 195 }), true);
  // …and a climb still completes the ordinary way.
  assert.equal(meetsTarget({ target: 225, current: 230, metricDir: 'up', metricStartValue: 185 }), true);
});

test('updateProgress passes the baseline, and a baseline-less manual goal above its target seeds one instead of achieving', () => {
  const src = readFileSync(new URL('../../../data/goals-live.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const body = src.slice(src.indexOf('export async function updateProgress'), src.indexOf('export async function fetchGoalHistory'));
  assert.match(body, /metricStartValue: before\.metricStartValue \}\)/);
  assert.match(body, /before\.metricKind === 'manual'/);
  assert.match(body, /if \(seedBaseline\) patch\.metric_start_value = current;/);
  assert.match(body, /!seedBaseline &&/);
});
