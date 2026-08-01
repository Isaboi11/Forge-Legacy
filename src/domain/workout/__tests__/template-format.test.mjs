import test from 'node:test';
import assert from 'node:assert/strict';

import {
  copyName,
  durationText,
  estimatedMinutes,
  groupBySection,
  historyDate,
  schemeText,
  statDate,
} from '../template-format.ts';

// ── estimatedMinutes ─────────────────────────────────────────────────────────
test('estimatedMinutes: sets × 3, rounded to the nearest 5', () => {
  // 16 sets × 3 = 48 → 50
  assert.equal(estimatedMinutes([{ sets: 4, targetReps: 8 }, { sets: 4, targetReps: 8 }, { sets: 4, targetReps: 8 }, { sets: 4, targetReps: 8 }]), 50);
  // 5 sets × 3 = 15, already a multiple of 5
  assert.equal(estimatedMinutes([{ sets: 5, targetReps: 5 }]), 15);
});

test('estimatedMinutes: never reads below 5, even for an empty or zero-set template', () => {
  assert.equal(estimatedMinutes([]), 5);
  assert.equal(estimatedMinutes([{ sets: 0, targetReps: 0 }]), 5);
});

test('estimatedMinutes: a negative set count cannot subtract time', () => {
  assert.equal(estimatedMinutes([{ sets: -4, targetReps: 8 }, { sets: 10, targetReps: 8 }]), 30);
});

// ── schemeText ───────────────────────────────────────────────────────────────
test('schemeText: an ordinary set reads as reps', () => {
  assert.equal(schemeText({ sets: 3, targetReps: 8 }), '3 × 8');
  assert.equal(schemeText({ sets: 3, targetReps: 8, section: 'main' }), '3 × 8');
});

test('schemeText: a long cool-down hold reads as seconds', () => {
  assert.equal(schemeText({ sets: 2, targetReps: 30, section: 'cooldown' }), '2 × 30s');
  assert.equal(schemeText({ sets: 1, targetReps: 60, section: 'cooldown' }), '1 × 60s');
});

test('schemeText: a genuine 20-rep cool-down set stays reps — the design mislabelled it as seconds', () => {
  assert.equal(schemeText({ sets: 2, targetReps: 20, section: 'cooldown' }), '2 × 20');
});

test('schemeText: 30 reps in the MAIN block is still reps — only cool-down infers time', () => {
  assert.equal(schemeText({ sets: 2, targetReps: 30, section: 'main' }), '2 × 30');
});

// ── copyName ─────────────────────────────────────────────────────────────────
test('copyName: first copy, then numbered', () => {
  assert.equal(copyName('Leg Day'), 'Leg Day (copy)');
  assert.equal(copyName('Leg Day (copy)'), 'Leg Day (copy 2)');
  assert.equal(copyName('Leg Day (copy 2)'), 'Leg Day (copy 3)');
  assert.equal(copyName('Leg Day (copy 9)'), 'Leg Day (copy 10)');
});

test('copyName: a name that merely contains "copy" is not treated as one', () => {
  assert.equal(copyName('Copy Machine Day'), 'Copy Machine Day (copy)');
});

test('copyName: stays inside the 60-character column limit', () => {
  const long = 'x'.repeat(60);
  assert.ok(copyName(long).length <= 60);
});

// ── dates ────────────────────────────────────────────────────────────────────
test('statDate: drops the year in the current year, keeps it otherwise', () => {
  const now = new Date('2026-07-31T12:00:00Z');
  assert.equal(statDate('2026-07-14T10:00:00Z', now), 'Jul 14');
  assert.equal(statDate('2025-11-03T10:00:00Z', now), 'Nov 3 ’25');
});

test('statDate: an absent date is an em dash, never a fabricated one', () => {
  assert.equal(statDate(null), '—');
  assert.equal(statDate('not-a-date'), '—');
});

test('historyDate: always carries the year, so no two rows can look like the same day', () => {
  assert.equal(historyDate('2026-07-14T10:00:00Z'), 'Jul 14, 2026');
  assert.equal(historyDate('2025-07-14T10:00:00Z'), 'Jul 14, 2025');
});

test('durationText: a zero or missing duration renders nothing rather than "0 min"', () => {
  assert.equal(durationText(null), '');
  assert.equal(durationText(0), '');
  assert.equal(durationText(2880), '48 min');
  // Under a minute still reads as a minute — a logged session is never "0 min".
  assert.equal(durationText(20), '1 min');
});

// ── groupBySection ───────────────────────────────────────────────────────────
test('groupBySection: fixed order, empty blocks dropped', () => {
  const out = groupBySection([
    { sets: 3, targetReps: 8, section: 'cooldown' },
    { sets: 3, targetReps: 8, section: 'main' },
  ]);
  assert.deepEqual(out.map((s) => s.key), ['main', 'cooldown']);
  assert.deepEqual(out.map((s) => s.label), ['Main', 'Cool-down']);
});

test('groupBySection: an exercise with no section is main — what a pre-0095 template was', () => {
  const out = groupBySection([{ sets: 3, targetReps: 8 }]);
  assert.equal(out.length, 1);
  assert.equal(out[0].key, 'main');
});

test('groupBySection: every exercise survives the grouping', () => {
  const items = [
    { sets: 1, targetReps: 10, section: 'warmup' },
    { sets: 4, targetReps: 5, section: 'main' },
    { sets: 4, targetReps: 5 },
    { sets: 2, targetReps: 30, section: 'cooldown' },
  ];
  const total = groupBySection(items).reduce((n, s) => n + s.items.length, 0);
  assert.equal(total, items.length);
});
