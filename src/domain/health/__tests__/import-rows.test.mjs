import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_ROWS_PER_CALL,
  addButtonLabel,
  chunkPayload,
  foundSummary,
  historyHonorsLine,
  needsLookBadge,
  notImportedLine,
  toPayloadRow,
} from '../import-rows.ts';

const cand = (i) => ({
  externalId: `hk-${i}`,
  activityType: 'running',
  name: 'Run',
  indoor: false,
  startedAt: new Date(Date.UTC(2026, 6, 1) + i * 3_600_000).toISOString(),
  endedAt: new Date(Date.UTC(2026, 6, 1) + i * 3_600_000 + 1_800_000).toISOString(),
  durationSec: 1800,
  distanceMi: 3.107,
  sourceLabel: 'Garmin Connect',
  sourceRank: 2,
});

test('payload row field names are pinned (the 0234 RPC must read these)', () => {
  assert.deepEqual(toPayloadRow(cand(0)), {
    external_id: 'hk-0',
    activity_type: 'running',
    workout_name: 'Run',
    started_at: '2026-07-01T00:00:00.000Z',
    ended_at: '2026-07-01T00:30:00.000Z',
    duration_sec: 1800,
    distance: 3.107,
    distance_unit: 'mi',
    indoor: false,
    source_label: 'Garmin Connect',
  });
});

test('chunks at 200 rows per call, oldest first', () => {
  assert.equal(MAX_ROWS_PER_CALL, 200);
  const rows = Array.from({ length: 401 }, (_, i) => cand(400 - i)); // newest first, as Health often returns
  const chunks = chunkPayload(rows);
  assert.deepEqual(chunks.map((c) => c.length), [200, 200, 1]);
  assert.equal(chunks[0][0].external_id, 'hk-0');
  assert.equal(chunks[2][0].external_id, 'hk-400');
  assert.deepEqual(chunkPayload([]), []);
  assert.deepEqual(chunkPayload([cand(0)]).map((c) => c.length), [1]);
});

test('summary copy, singular and plural, and the honest "none found"', () => {
  assert.equal(foundSummary(23, 90), 'Found 23 workouts from the last 90 days.');
  assert.equal(foundSummary(1, 90), 'Found 1 workout from the last 90 days.');
  assert.match(foundSummary(0, 90), /^No workouts found\. .*Health app → Sharing → Apps → Forge Legacy\.$/);
  assert.equal(notImportedLine(4), '4 other workouts not imported');
  assert.equal(notImportedLine(1), '1 other workout not imported');
  assert.equal(notImportedLine(0), null);
  assert.equal(historyHonorsLine(3), '3 honors from your history');
  assert.equal(historyHonorsLine(1), '1 honor from your history');
  assert.equal(historyHonorsLine(0), null);
  assert.equal(addButtonLabel(12), 'Add 12 workouts');
  assert.equal(needsLookBadge(1), '1 workout needs a look');
  assert.equal(needsLookBadge(2), '2 workouts need a look');
  assert.equal(needsLookBadge(0), null);
});
