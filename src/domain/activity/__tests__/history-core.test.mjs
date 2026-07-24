import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIVITY_LABEL,
  ACTIVITY_ORDER,
  emptyMessage,
  fmtDuration,
  fmtRowDate,
  groupByMonth,
  monthKey,
  partnersLabel,
  rowA11y,
  statLine,
} from '../history-core.ts';

const rec = (over = {}) => ({
  id: 'w1',
  type: 'strength',
  title: 'Leg Day A',
  startedAt: '2026-06-10T17:00:00Z',
  durationSec: 3600,
  exerciseCount: 5,
  setCount: 18,
  distance: null,
  distanceUnit: null,
  chapterName: 'Chapter III — The Rebuild',
  pr: false,
  partners: [],
  ...over,
});

// ── duration (design §5.3) ──────────────────────────────────────────────────

test('duration formats across every band', () => {
  assert.equal(fmtDuration(30), '< 1 min', 'under a minute is never rounded to "0 min"');
  assert.equal(fmtDuration(45 * 60), '45 min');
  assert.equal(fmtDuration(60 * 60), '1 hr', 'an exact hour drops the minutes');
  assert.equal(fmtDuration(95 * 60), '1 hr 35 min');
  assert.equal(fmtDuration(null), '—', 'a session with no recorded duration shows a dash, not "0 min"');
  assert.equal(fmtDuration(0), '—');
});

// ── stat line ───────────────────────────────────────────────────────────────

test('strength shows its set count; a session with no sets shows nothing', () => {
  assert.equal(statLine(rec({ setCount: 18 })), '18 sets');
  assert.equal(statLine(rec({ setCount: 1 })), '1 set');
  assert.equal(statLine(rec({ setCount: 0 })), '', 'no invented "0 sets"');
});

test('cardio shows distance in the unit it was stored in', () => {
  assert.equal(statLine(rec({ type: 'running', distance: 5.25, distanceUnit: 'mi' })), '5.3 mi');
  assert.equal(statLine(rec({ type: 'cycling', distance: 12, distanceUnit: 'km' })), '12 km', 'no stray ".0"');
  assert.equal(statLine(rec({ type: 'running', distance: null })), '', 'a run with no distance says nothing');
});

test('mobility and other lean on the duration alone', () => {
  assert.equal(statLine(rec({ type: 'mobility' })), '');
  assert.equal(statLine(rec({ type: 'other' })), '');
});

// ── partners ────────────────────────────────────────────────────────────────

test('partners label uses the first name, and counts the rest', () => {
  assert.equal(partnersLabel([]), '');
  assert.equal(partnersLabel(['Marcus Webb']), 'with Marcus');
  assert.equal(partnersLabel(['Marcus Webb', 'Ada Ridge']), 'with Marcus +1');
  assert.equal(partnersLabel(['Marcus Webb', 'Ada Ridge', 'Jon Vale']), 'with Marcus +2');
});

// ── grouping ────────────────────────────────────────────────────────────────

test('sessions group into months, newest first, order preserved', () => {
  const rows = [
    rec({ id: 'a', startedAt: '2026-06-12T10:00:00Z' }),
    rec({ id: 'b', startedAt: '2026-06-02T10:00:00Z' }),
    rec({ id: 'c', startedAt: '2026-05-28T10:00:00Z' }),
  ];
  const g = groupByMonth(rows, 'all');
  assert.deepEqual(g.map((x) => x.month), ['June 2026', 'May 2026']);
  assert.deepEqual(g[0].rows.map((r) => r.id), ['a', 'b'], 'incoming order is kept, not re-sorted');
  assert.deepEqual(g[1].rows.map((r) => r.id), ['c']);
});

test('the same month in different years never merges', () => {
  const g = groupByMonth(
    [rec({ id: 'a', startedAt: '2026-06-12T10:00:00Z' }), rec({ id: 'b', startedAt: '2025-06-12T10:00:00Z' })],
    'all',
  );
  assert.deepEqual(g.map((x) => x.month), ['June 2026', 'June 2025']);
});

test('filtering by type keeps only that type, and can empty the list', () => {
  const rows = [rec({ id: 'a', type: 'strength' }), rec({ id: 'b', type: 'running' })];
  assert.deepEqual(groupByMonth(rows, 'running')[0].rows.map((r) => r.id), ['b']);
  assert.deepEqual(groupByMonth(rows, 'swimming'), [], 'no matches produces no month headers at all');
});

test('a month group only appears when it still has rows after filtering', () => {
  const rows = [
    rec({ id: 'a', type: 'strength', startedAt: '2026-06-12T10:00:00Z' }),
    rec({ id: 'b', type: 'running', startedAt: '2026-05-12T10:00:00Z' }),
  ];
  assert.deepEqual(groupByMonth(rows, 'strength').map((g) => g.month), ['June 2026'], 'May is gone entirely');
});

// ── chips + copy ────────────────────────────────────────────────────────────

test('the chip order follows the modality enum the app can actually log', () => {
  assert.deepEqual(ACTIVITY_ORDER, ['strength', 'running', 'walking', 'cycling', 'swimming', 'rowing', 'mobility', 'other']);
  assert.ok(!ACTIVITY_ORDER.includes('hiit'), 'no chip for a type the database cannot store');
  assert.ok(!ACTIVITY_ORDER.includes('yoga'));
  for (const t of ACTIVITY_ORDER) assert.ok(ACTIVITY_LABEL[t], `${t} needs a label`);
});

test('empty copy is generic when unfiltered and specific when filtered', () => {
  assert.equal(emptyMessage('all'), 'Your workout history will appear here as you train.');
  assert.equal(emptyMessage('swimming'), 'No Swim sessions yet.');
});

// ── dates + a11y ────────────────────────────────────────────────────────────

test('the row date drops the weekday; the month key keeps the year', () => {
  assert.equal(fmtRowDate('2026-06-10T17:00:00Z'), 'Jun 10');
  assert.equal(monthKey('2026-06-10T17:00:00Z'), 'June 2026');
  assert.equal(fmtRowDate('not-a-date'), '', 'a broken timestamp renders nothing rather than "Invalid Date"');
});

test('the spoken row carries everything the visual row shows', () => {
  const label = rowA11y(rec({ pr: true, partners: ['Marcus Webb'] }));
  for (const part of ['Leg Day A', 'Strength', '1 hr', '18 sets', 'personal record', 'Chapter III', 'with Marcus']) {
    assert.ok(label.includes(part), `expected "${part}" in: ${label}`);
  }
  assert.ok(label.endsWith('Double-tap for detail.'));
});
