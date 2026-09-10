import test from 'node:test';
import assert from 'node:assert/strict';

import { calendarDaysBetween, earlyLabel, goalDraft, goalLengthDays, goalState, localYmd, mergePastGoals, parseGoalEditMode, raisedTarget } from '../goal-state.ts';

/**
 * Amendment 006 — a squad goal is live, met or closed, and the card must never say "live" about the
 * other two. PO: *"it still looks like it's going right now."*
 */

const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h);
const iso = (y, m, d, h = 12) => at(y, m, d, h).toISOString();
const base = { target: 500, progress: 0, endsAt: null, closedAt: null, outcome: null, now: at(2026, 9, 10) };

test('a goal under target before its deadline is live, with days left', () => {
  const s = goalState({ ...base, progress: 312, endsAt: iso(2026, 9, 18, 23) });
  assert.equal(s.phase, 'live');
  assert.equal(s.daysLeft, 9);
});

test('THE REPORTED CASE: past the deadline under target is CLOSED, not live', () => {
  const s = goalState({ ...base, progress: 412, endsAt: iso(2026, 9, 7, 23) });
  assert.equal(s.phase, 'closed');
  assert.equal(s.daysLeft, null);
});

test('met before the deadline is MET the moment it is met — it used to stay "Current Goal" at 100%', () => {
  const s = goalState({ ...base, progress: 500, endsAt: iso(2026, 9, 30, 23) });
  assert.equal(s.phase, 'met');
});

test('met, then the deadline passed, is still met — never "ended" (SQ-D3.5)', () => {
  assert.equal(goalState({ ...base, progress: 540, endsAt: iso(2026, 9, 1, 23) }).phase, 'met');
});

test('no deadline and under target stays live forever, with no countdown', () => {
  const s = goalState({ ...base, progress: 10 });
  assert.equal(s.phase, 'live');
  assert.equal(s.daysLeft, null);
});

test("the server's close wins over the clock and the total", () => {
  // Closed by the job; a workout backdated into the window since must not reopen it on one phone.
  const s = goalState({ ...base, progress: 520, endsAt: iso(2026, 9, 7, 23), closedAt: iso(2026, 9, 7, 23), outcome: 'closed' });
  assert.equal(s.phase, 'closed');
  assert.equal(s.closedAt, iso(2026, 9, 7, 23));
});

test('a met close knows how early it was, in calendar days', () => {
  const s = goalState({ ...base, progress: 500, endsAt: iso(2026, 9, 30, 23), closedAt: iso(2026, 9, 22, 8), outcome: 'met' });
  assert.equal(s.daysEarly, 8);
  assert.equal(earlyLabel(s.daysEarly), '8 days early');
  assert.equal(earlyLabel(1), 'a day early');
  assert.equal(earlyLabel(0), 'on the final day');
  assert.equal(earlyLabel(null), null);
});

test('a met close with no deadline claims no timing at all', () => {
  const s = goalState({ ...base, progress: 500, closedAt: iso(2026, 9, 22), outcome: 'met' });
  assert.equal(s.daysEarly, null);
});

test('calendar days are counted between local dates, not 24-hour blocks', () => {
  assert.equal(calendarDaysBetween(at(2026, 9, 10, 23), at(2026, 9, 11, 1)), 1);
  assert.equal(calendarDaysBetween(at(2026, 9, 10, 1), at(2026, 9, 10, 23)), 0);
});

// ── the owner's next goal ──────────────────────────────────────────────────────

const goal = {
  goal: '500 workouts in September',
  goalTarget: 500,
  goalMetricKind: 'workout_count',
  goalMetricKey: null,
  goalStartedAt: at(2026, 9, 1, 0).toISOString(),
  goalEndsAt: at(2026, 9, 30, 23).toISOString(),
};
const today = at(2026, 10, 2, 9);

test('?editGoal=1 is still an edit — Squad Goal Detail has always sent it', () => {
  assert.equal(parseGoalEditMode('1'), 'edit');
  assert.equal(parseGoalEditMode('again'), 'again');
  assert.equal(parseGoalEditMode('raise'), 'raise');
  assert.equal(parseGoalEditMode('new'), 'new');
  assert.equal(parseGoalEditMode(undefined), null);
  assert.equal(parseGoalEditMode('nonsense'), null);
});

test('edit opens holding the goal as it stands — the editor used to open BLANK from Goal Detail', () => {
  const d = goalDraft('edit', goal, today, 'workout_count');
  assert.deepEqual(d, { title: '500 workouts in September', target: '500', metricKind: 'workout_count', metricKey: null, start: '2026-09-01', end: '2026-09-30' });
});

test('try again keeps the goal and its length, starting today', () => {
  const d = goalDraft('again', goal, today, 'workout_count');
  assert.equal(d.title, '500 workouts in September');
  assert.equal(d.target, '500');
  assert.equal(d.start, '2026-10-02');
  assert.equal(d.end, '2026-10-31', '29 days, the same length as Sep 1 → Sep 30');
});

test('raise the bar suggests a round, higher target and drops the title that named the old number', () => {
  const d = goalDraft('raise', goal, today, 'workout_count');
  assert.equal(d.target, '600');
  assert.equal(d.title, '');
  assert.equal(d.metricKind, 'workout_count');
  assert.equal(d.end, '2026-10-31');
});

test('a new goal starts blank, today, with no deadline', () => {
  assert.deepEqual(goalDraft('new', goal, today, 'workout_count'), { title: '', target: '', metricKind: 'workout_count', metricKey: null, start: '2026-10-02', end: '' });
});

test('a goal with no deadline tries again with no deadline', () => {
  assert.equal(goalDraft('again', { ...goal, goalEndsAt: null }, today, 'workout_count').end, '');
  assert.equal(goalLengthDays(goal.goalStartedAt, null), null);
});

test('raised targets are round and always higher', () => {
  assert.equal(raisedTarget(500), 600);
  assert.equal(raisedTarget(100), 120);
  assert.equal(raisedTarget(12), 15);
  assert.equal(raisedTarget(3), 4);
  assert.equal(raisedTarget(1), 2);
  for (const t of [1, 2, 7, 19, 20, 99, 250, 999, 25000]) assert.ok(raisedTarget(t) > t, `${t} → ${raisedTarget(t)}`);
});

// ── past goals ─────────────────────────────────────────────────────────────────

test('Past Goals holds every ended goal — closed and removed, not only met (§7)', () => {
  const closures = [
    { startedAt: '2026-08-01T06:00:00+00:00', completedAt: '2026-08-31T06:00:00+00:00', outcome: 'closed' },
    { startedAt: '2026-07-01T06:00:00+00:00', completedAt: '2026-07-20T06:00:00+00:00', outcome: 'removed' },
  ];
  // A met goal banked before 0200 exists only as a completion.
  const completions = [{ startedAt: '2026-06-01T06:00:00+00:00', completedAt: '2026-06-25T06:00:00+00:00', outcome: 'met' }];
  const out = mergePastGoals(closures, completions, null);
  assert.deepEqual(out.map((g) => g.outcome), ['closed', 'removed', 'met']);
});

test('one goal in both tables appears once — the log wins, even when the timestamp is spelled differently', () => {
  const closures = [{ startedAt: '2026-08-01T06:00:00+00:00', completedAt: '2026-08-20T06:00:00+00:00', outcome: 'met', finalTotal: 512 }];
  const completions = [{ startedAt: '2026-08-01T06:00:00Z', completedAt: '2026-08-20T06:05:00Z', outcome: 'met', finalTotal: null }];
  const out = mergePastGoals(closures, completions, null);
  assert.equal(out.length, 1);
  assert.equal(out[0].finalTotal, 512);
});

test('the goal still on the card is not listed as a past goal, even once it has closed', () => {
  const closures = [{ startedAt: '2026-09-01T06:00:00+00:00', completedAt: '2026-09-30T06:00:00+00:00', outcome: 'closed' }];
  assert.equal(mergePastGoals(closures, [], '2026-09-01T06:00:00Z').length, 0);
  assert.equal(mergePastGoals(closures, [], null).length, 1, 'with no goal on the card, every close is history');
});

test('local dates are local — a Sydney start is not the day before', () => {
  assert.equal(localYmd(at(2026, 9, 1, 0)), '2026-09-01');
});
