import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_PREFS,
  duplicateReasonLine,
  lastCheckedLine,
  parsePrefs,
  prefsKey,
  resolveReview,
  serializePrefs,
  SYNC_THROTTLE_MS,
  syncDue,
} from '../sync-state.ts';

test('prefs round-trip; defaults are disconnected with write-back on', () => {
  assert.deepEqual(parsePrefs(null), DEFAULT_PREFS);
  assert.equal(DEFAULT_PREFS.writeBack, true);
  const p = { connected: true, writeBack: false, anchor: 'YnBsaXN0MDA=', lastCheckedAt: '2026-09-28T10:00:00.000Z' };
  assert.deepEqual(parsePrefs(serializePrefs(p)), p);
});

test('parsePrefs keeps ONLY the four fields — a smuggled sample is dropped on read', () => {
  const raw = JSON.stringify({ connected: true, anchor: 'abc', workouts: [{ uuid: 'x', distance: 5 }], lastCheckedAt: 'garbage' });
  const p = parsePrefs(raw);
  assert.deepEqual(Object.keys(p).sort(), ['anchor', 'connected', 'lastCheckedAt', 'writeBack']);
  assert.equal(p.lastCheckedAt, null);
  assert.ok(!serializePrefs(p).includes('uuid'));
});

test('parsePrefs survives junk', () => {
  for (const raw of ['', '{', '[]', '42', 'null', JSON.stringify({ anchor: 'x'.repeat(5000) })]) {
    const p = parsePrefs(raw);
    assert.equal(p.connected, false);
    assert.equal(p.anchor, null);
  }
});

test('prefs are per athlete', () => {
  assert.notEqual(prefsKey('a'), prefsKey('b'));
});

test('throttle: 10 minutes, Check now forces, skewed clock is due', () => {
  const now = Date.parse('2026-09-28T12:00:00Z');
  assert.equal(syncDue(null, now), true);
  assert.equal(syncDue(new Date(now - SYNC_THROTTLE_MS + 1000).toISOString(), now), false);
  assert.equal(syncDue(new Date(now - SYNC_THROTTLE_MS).toISOString(), now), true);
  assert.equal(syncDue(new Date(now - 1000).toISOString(), now, true), true);
  assert.equal(syncDue(new Date(now + 3600_000).toISOString(), now), true);
});

test('review: Skip is the default; Keep moves a row to the import', () => {
  const dup = (id) => ({ row: { externalId: id }, reason: 'matches_manual_log', forgeWorkoutId: 'f', otherExternalId: null });
  const out = resolveReview([dup('a'), dup('b'), dup('c')], new Set(['b']));
  assert.deepEqual(
    out.keep.map((r) => r.externalId),
    ['b'],
  );
  assert.deepEqual(out.skipIds, ['a', 'c']);
});

test('last checked words', () => {
  const now = Date.parse('2026-09-28T12:00:00Z');
  const ago = (ms) => new Date(now - ms).toISOString();
  assert.equal(lastCheckedLine(null, now), 'Not checked yet');
  assert.equal(lastCheckedLine(ago(20_000), now), 'Last checked just now');
  assert.equal(lastCheckedLine(ago(2 * 60_000), now), 'Last checked 2 min ago');
  assert.equal(lastCheckedLine(ago(3 * 3600_000), now), 'Last checked 3 h ago');
  assert.equal(lastCheckedLine(ago(26 * 3600_000), now), 'Last checked 1 day ago');
});

test('every duplicate reason has a line', () => {
  for (const r of ['matches_manual_log', 'overlaps_forge_other_type', 'same_effort_other_source', 'overlaps_existing_import']) {
    assert.ok(duplicateReasonLine(r).length > 10);
  }
});
