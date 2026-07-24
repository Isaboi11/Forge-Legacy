import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLog,
  computeProgress,
  computeStats,
  equipmentOf,
  fmtVolume,
  nextSession,
  sessionsPerWeek,
  totalSessions,
  viewForState,
} from '../progress-core.ts';

const ex = (name, sets = 3, reps = 10, equip = 'Barbell') => ({ name, sets, reps, equip });
const day = (letter, name, main = [], warmup = [], cooldown = []) => ({ letter, name, warmup, main, cooldown });

/** 4-week program, 2 built days a week (a third day exists but is empty — not a session owed). */
const structure = {
  name: 'Winter Block',
  weeks: 4,
  daysPerWeek: 3,
  vary: false,
  days: [
    day('A', 'Push', [ex('Bench Press', 4, 5), ex('Overhead Press')]),
    day('B', 'Pull', [ex('Barbell Row', 3, 8, 'Barbell'), ex('Lat Pulldown', 3, 12, 'Cable Machine')]),
    day('C', ''), // empty — not prescribed
  ],
  weekPlans: null,
};

const logged = (n, startISO, sets = [{ setIndex: 0, weight: 100, reps: 5 }]) => ({
  id: `w${n}`,
  name: `Session ${n}`,
  startedAt: startISO,
  durationSec: 3600,
  exercises: [{ name: 'Bench Press', section: 'main', sets }],
});

// ── shape ────────────────────────────────────────────────────────────────────

test('sessions per week counts BUILT days, not the configured day count', () => {
  assert.equal(sessionsPerWeek(structure), 2, 'the empty Day C is not a session the athlete owes');
  assert.equal(totalSessions(structure), 8, '4 weeks x 2 built days');
});

test('an entirely empty program still reports a sane, non-zero shape', () => {
  const empty = { ...structure, days: [day('A', ''), day('B', '')] };
  assert.equal(sessionsPerWeek(empty), 3, 'nothing built → falls back to the CONFIGURED daysPerWeek, never 0');
  assert.ok(totalSessions(empty) > 0, 'never divides by zero downstream');
});

// ── progress ─────────────────────────────────────────────────────────────────

test('progress derives week and in-week position purely from the completed count', () => {
  const p0 = computeProgress(structure, 0);
  assert.deepEqual([p0.completed, p0.total, p0.week, p0.completedThisWeek, p0.pct], [0, 8, 1, 0, 0]);

  const p3 = computeProgress(structure, 3);
  assert.equal(p3.week, 2, '3 sessions at 2/week puts you in week 2');
  assert.equal(p3.completedThisWeek, 1);
  assert.equal(p3.pct, 38);
});

test('progress clamps at the program length instead of overflowing', () => {
  const over = computeProgress(structure, 99);
  assert.equal(over.completed, 8);
  assert.equal(over.pct, 100);
  assert.equal(over.week, 4, 'never reports week 50 of a 4-week program');
  assert.equal(over.nextWeekIndex, null, 'nothing left to do');
});

test('the next session walks the schedule in order and stops at the end', () => {
  assert.deepEqual(pick(nextSession(structure, 0)), { weekIndex: 0, dayIndex: 0, name: 'Push' });
  assert.deepEqual(pick(nextSession(structure, 1)), { weekIndex: 0, dayIndex: 1, name: 'Pull' });
  assert.deepEqual(pick(nextSession(structure, 2)), { weekIndex: 1, dayIndex: 0, name: 'Push' }, 'wraps into week 2');
  assert.equal(nextSession(structure, 8), null, 'a finished program has no next session');
});

const pick = (s) => (s ? { weekIndex: s.weekIndex, dayIndex: s.dayIndex, name: s.day.name } : null);

test('progress reads the open week plan in Customize mode', () => {
  const vary = {
    ...structure,
    vary: true,
    weeks: 2,
    weekPlans: [
      { days: [day('A', 'Heavy', [ex('Squat')]), day('B', 'Light', [ex('Front Squat')])] },
      { days: [day('A', 'Deload', [ex('Squat')]), day('B', '')] },
    ],
  };
  assert.equal(sessionsPerWeek(vary), 2);
  assert.equal(pick(nextSession(vary, 0)).name, 'Heavy');
  assert.equal(pick(nextSession(vary, 2)).name, 'Deload', 'week 2 uses its own plan, not week 1');
});

// ── the log ──────────────────────────────────────────────────────────────────

test('the log fills completed slots with real sets and future slots with the prescription', () => {
  const weeks = buildLog(structure, [logged(1, '2026-07-01T10:00:00Z'), logged(2, '2026-07-03T10:00:00Z')]);
  assert.equal(weeks.length, 4);

  const w1 = weeks[0];
  assert.equal(w1.complete, true, 'both of week 1’s sessions are logged');
  assert.equal(w1.days[0].completed, true);
  assert.deepEqual(w1.days[0].exercises[0].sets, [{ label: 'Set 1', value: '100 lb × 5' }]);

  const w2 = weeks[1];
  assert.equal(w2.complete, false);
  assert.equal(w2.days[0].completed, false);
  assert.equal(w2.days[0].name, 'Push', 'unlogged slots show the planned day');
  assert.equal(w2.days[0].exercises[0].planned, '4 × 5', 'and its prescription');
  assert.deepEqual(w2.days[0].exercises[0].sets, [], 'with no invented set data');
});

test('workouts fill slots in the order they were trained, regardless of input order', () => {
  const weeks = buildLog(structure, [
    { ...logged(2, '2026-07-03T10:00:00Z'), name: 'Second' },
    { ...logged(1, '2026-07-01T10:00:00Z'), name: 'First' },
  ]);
  assert.deepEqual([weeks[0].days[0].name, weeks[0].days[1].name], ['First', 'Second']);
});

test('a set logged without weight reads as reps, never as a fake load', () => {
  const weeks = buildLog(structure, [
    logged(1, '2026-07-01T10:00:00Z', [
      { setIndex: 0, weight: null, reps: 12 },
      { setIndex: 1, weight: 0, reps: 10 },
    ]),
  ]);
  assert.deepEqual(
    weeks[0].days[0].exercises[0].sets.map((s) => s.value),
    ['12 reps', '10 reps'],
  );
});

test('the log spans the whole program even with nothing logged', () => {
  const weeks = buildLog(structure, []);
  assert.equal(weeks.length, 4);
  assert.ok(weeks.every((w) => w.days.length === 2 && !w.complete));
  assert.ok(weeks.every((w) => w.days.every((d) => !d.completed)));
});

// ── stats ────────────────────────────────────────────────────────────────────

test('stats total real volume and find the heaviest set', () => {
  const s = computeStats([
    logged(1, '2026-07-01T10:00:00Z', [
      { setIndex: 0, weight: 100, reps: 5 },
      { setIndex: 1, weight: 135, reps: 3 },
    ]),
    logged(2, '2026-07-03T10:00:00Z', [{ setIndex: 0, weight: 95, reps: 10 }]),
  ]);
  assert.equal(s.workouts, 2);
  assert.equal(s.sets, 3);
  assert.equal(s.volume, 100 * 5 + 135 * 3 + 95 * 10);
  assert.equal(s.heaviest, 135);
});

test('bodyweight sets count toward sets but never toward volume or heaviest', () => {
  const s = computeStats([logged(1, '2026-07-01T10:00:00Z', [{ setIndex: 0, weight: null, reps: 20 }])]);
  assert.deepEqual([s.sets, s.volume, s.heaviest], [1, 0, 0]);
});

test('volume formats compactly and shows an em dash rather than a zero', () => {
  assert.equal(fmtVolume(0), '—');
  assert.equal(fmtVolume(850), '850 lb');
  assert.equal(fmtVolume(1000), '1k lb', 'no pointless ".0"');
  assert.equal(fmtVolume(12800), '12.8k lb');
  assert.equal(fmtVolume(120000), '120k lb', 'the decimal stops carrying information up here');
});

// ── the five states ──────────────────────────────────────────────────────────

test('each lifecycle state gets its own CTA, and only owned programs can be ended', () => {
  assert.deepEqual(viewForState('future', true), { pill: 'Planned', cta: 'Start Program', secondary: 'Remove from Planned' });
  assert.deepEqual(viewForState('active', true), { pill: 'Active', cta: 'Continue Training', secondary: 'End Program' });
  assert.equal(viewForState('graduated', true).cta, 'Run Again');
  assert.equal(viewForState('ended_early', true).cta, 'Restart Program');
  assert.deepEqual(viewForState('active', false), { pill: 'Preview', cta: 'Start Program', secondary: null });
});

test('equipment is deduped across the whole program', () => {
  assert.deepEqual(equipmentOf(structure), ['Barbell', 'Cable Machine']);
});

test('equipment scans every week plan in Customize mode, not just the template', () => {
  const vary = {
    ...structure,
    vary: true,
    days: [],
    weekPlans: [{ days: [day('A', 'W1', [ex('Swing', 3, 10, 'Kettlebell')])] }],
  };
  assert.deepEqual(equipmentOf(vary), ['Kettlebell']);
});
