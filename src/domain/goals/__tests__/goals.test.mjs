import test from 'node:test';
import assert from 'node:assert/strict';
import {
  goalSections,
  historyDate,
  isQuantifiable,
  meetsTarget,
  orderedUnits,
  parseTarget,
  progressEntryLine,
  progressLabel,
  progressPct,
  UNIT_CHIPS,
  validateGoal,
} from '../goals.ts';

const g = (over = {}) => ({
  id: 'g1',
  chapterId: 'ch-1',
  name: 'Squat 405 lb',
  target: 405,
  unit: 'lb',
  current: 225,
  isPrimary: false,
  targetDate: null,
  achievedAt: null,
  createdAt: '2026-06-01T00:00:00Z',
  ...over,
});

// ── quantifiable vs narrative ──────────────────────────────────────────────────

test('a goal is quantifiable when it has a target, narrative otherwise', () => {
  assert.equal(isQuantifiable(g()), true);
  assert.equal(isQuantifiable(g({ target: null })), false);
});

test('progress is a clamped percentage for quantifiable, 0/100 for narrative', () => {
  assert.equal(progressPct(g({ current: 225, target: 405 })), 56);
  assert.equal(progressPct(g({ current: 500, target: 405 })), 100, 'never over 100');
  assert.equal(progressPct(g({ current: -5, target: 405 })), 0, 'never below 0');
  assert.equal(progressPct(g({ target: null, achievedAt: null })), 0, 'narrative in progress');
  assert.equal(progressPct(g({ target: null, achievedAt: '2026-06-02T00:00:00Z' })), 100, 'narrative achieved');
});

test('meetsTarget fires only when a real target is reached', () => {
  assert.equal(meetsTarget(g({ current: 405, target: 405 })), true);
  assert.equal(meetsTarget(g({ current: 404, target: 405 })), false);
  assert.equal(meetsTarget(g({ target: null, current: 999 })), false, 'a narrative goal is never auto-complete');
});

test('the progress line reads the way the design shows it, and trims trailing zeros', () => {
  assert.equal(progressLabel(g({ current: 225, target: 405, unit: 'lb' })), '225 / 405 lb');
  assert.equal(progressLabel(g({ current: 5.5, target: 26.2, unit: 'mi' })), '5.5 / 26.2 mi');
  assert.equal(progressLabel(g({ target: null, achievedAt: null })), 'In progress');
  assert.equal(progressLabel(g({ target: null, achievedAt: '2026-01-01T00:00:00Z' })), 'Achieved');
});

// ── G-1 sections ────────────────────────────────────────────────────────────────

test('sections put the primary on top, split secondary into active and achieved', () => {
  const goals = [
    g({ id: 'p', isPrimary: true, achievedAt: '2026-07-01T00:00:00Z' }), // achieved primary STAYS primary
    g({ id: 's1', createdAt: '2026-06-10T00:00:00Z' }),
    g({ id: 's2', createdAt: '2026-06-20T00:00:00Z' }),
    g({ id: 's3', achievedAt: '2026-06-15T00:00:00Z', createdAt: '2026-06-05T00:00:00Z' }),
  ];
  const s = goalSections(goals);
  assert.equal(s.primary.id, 'p', 'the achieved primary is still the primary, pinned — not moved to Achieved');
  assert.deepEqual(s.active.map((x) => x.id), ['s2', 's1'], 'active secondary, newest first');
  assert.deepEqual(s.achieved.map((x) => x.id), ['s3'], 'achieved secondary');
});

test('no primary is a valid state (a fresh chapter)', () => {
  const s = goalSections([g({ id: 'a', isPrimary: false })]);
  assert.equal(s.primary, null);
  assert.equal(s.active.length, 1);
});

// ── form ──────────────────────────────────────────────────────────────────────

test('parseTarget yields a positive number or null for a narrative goal', () => {
  assert.equal(parseTarget('405'), 405);
  assert.equal(parseTarget('26.2'), 26.2);
  assert.equal(parseTarget(''), null, 'blank = narrative');
  assert.equal(parseTarget('  '), null);
  assert.equal(parseTarget('0'), null, 'zero is not a target');
  assert.equal(parseTarget('-5'), null);
  assert.equal(parseTarget('abc'), null);
});

test('a goal needs a name; a present target must be a positive number', () => {
  assert.equal(validateGoal({ name: 'Run a marathon', target: '' }).ok, true, 'narrative is fine');
  assert.equal(validateGoal({ name: 'Squat', target: '405' }).ok, true);
  assert.equal(validateGoal({ name: '', target: '' }).ok, false);
  assert.equal(validateGoal({ name: '  ', target: '405' }).ok, false);
  assert.equal(validateGoal({ name: 'x'.repeat(61), target: '' }).ok, false);
  assert.equal(validateGoal({ name: 'ok', target: 'lots' }).ok, false, 'a garbage target is rejected, not silently dropped');
});

test('a history row reads "from → to unit", trimming zeros, and dates compactly', () => {
  assert.equal(progressEntryLine({ fromValue: 365, toValue: 405 }, 'lb'), '365 → 405 lb');
  assert.equal(progressEntryLine({ fromValue: 5, toValue: 5.5 }, 'mi'), '5 → 5.5 mi');
  assert.equal(progressEntryLine({ fromValue: 0, toValue: 3 }, null), '0 → 3', 'no unit, no trailing space');
  assert.equal(historyDate('2026-06-14T10:00:00Z'), 'Jun 14');
  assert.equal(historyDate('nope'), '');
});

test('unit chips smart-order by goal name and always offer the full set', () => {
  assert.equal(orderedUnits('Run a 5K')[0], 'mi', 'running surfaces distance first');
  assert.equal(orderedUnits('Squat 405')[0], 'lb', 'lifting surfaces load first');
  for (const chips of [orderedUnits('Run'), orderedUnits('anything')]) {
    assert.equal(new Set(chips).size, UNIT_CHIPS.length, 'every unit stays available, no duplicates');
  }
});
