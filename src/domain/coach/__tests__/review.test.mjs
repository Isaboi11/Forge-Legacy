import test from 'node:test';
import assert from 'node:assert/strict';

import { REVIEW_LINES, formatWeekRange, reviewNote, shapeOf } from '../rulebook/review.ts';
import { resetVoice } from '../rulebook/voice.ts';

const first = () => 0;

const week = (over = {}) => ({
  workouts: 3,
  days_trained: 3,
  volume_lb: 24000,
  duration_sec: 10800,
  prs: [],
  honors: [],
  top_lift: null,
  ...over,
});

// ─────────────────────────────────────────────────────────────────────────────
// SHAPE — frequency only
// ─────────────────────────────────────────────────────────────────────────────

test('the week is described by how often, not how much', () => {
  assert.equal(shapeOf({ workouts: 1 }), 'single');
  assert.equal(shapeOf({ workouts: 3 }), 'steady');
  assert.equal(shapeOf({ workouts: 5 }), 'full');
  assert.equal(shapeOf({ workouts: 6 }), 'heavy');
});

test('⚠ volume never moves the shape — a heavy two-session week is still two sessions', () => {
  assert.equal(shapeOf({ workouts: 2, volume_lb: 999999 }), 'steady');
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠ THE LINE IT MUST NOT CROSS
// ─────────────────────────────────────────────────────────────────────────────

test('no line grades the week or compares it to another', () => {
  /* A review is the easiest surface in the app to turn into a scoreboard, which §6.2 and DNA §8/§10
     both bar. The migration deliberately stores no prior-week figure; this guards the prose. */
  const BANNED = /\b(only|just|barely|down from|up from|last week|better|worse|worst|best week|behind|fell off|missed)\b/i;
  for (const [name, table] of Object.entries(REVIEW_LINES)) {
    const lines = Array.isArray(table) ? table : Object.values(table).flat();
    for (const line of lines) assert.doesNotMatch(line, BANNED, `${name}: "${line}"`);
  }
});

test('no exclamation marks — the same rule the rest of his voice holds', () => {
  for (const table of Object.values(REVIEW_LINES)) {
    const lines = Array.isArray(table) ? table : Object.values(table).flat();
    for (const line of lines) assert.ok(!line.includes('!'), line);
  }
});

test('every table has at least three variants', () => {
  for (const [name, table] of Object.entries(REVIEW_LINES)) {
    const groups = Array.isArray(table) ? [table] : Object.values(table);
    for (const g of groups) assert.ok(g.length >= 3, `${name} has ${g.length}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// WHAT HE PICKS OUT
// ─────────────────────────────────────────────────────────────────────────────

test('an honor outranks a PR — it names the least ordinary true thing', () => {
  resetVoice();
  const note = reviewNote(week({ honors: [{ honor: 'Century Club' }], prs: [{ exercise: 'Bench Press', value: 225 }] }), first);
  assert.ok(note.includes('Century Club'), note);
  assert.ok(!note.includes('Bench Press'), note);
});

test('a single PR is named; several are counted', () => {
  resetVoice();
  assert.ok(reviewNote(week({ prs: [{ exercise: 'Back Squat', value: 315 }] }), first).includes('Back Squat'));
  resetVoice();
  const many = reviewNote(week({ prs: [{ exercise: 'A', value: 1 }, { exercise: 'B', value: 2 }] }), first);
  assert.ok(many.includes('2'), many);
});

test('with nothing rarer to say, the heaviest set stands in', () => {
  resetVoice();
  const note = reviewNote(week({ top_lift: { name: 'Deadlift', weight: 405, reps: 3 } }), first);
  assert.ok(note.includes('Deadlift') && note.includes('405 lb'), note);
});

test('⚠ the coach speaks POUNDS here too — the screen converts', () => {
  resetVoice();
  const note = reviewNote(week({ top_lift: { name: 'Deadlift', weight: 405, reps: 3 } }), first);
  assert.ok(note.includes('lb'));
  assert.ok(!note.toLowerCase().includes('kg'));
});

test('a plain week still gets an opening and a close, and nothing invented', () => {
  resetVoice();
  const note = reviewNote(week(), first);
  assert.ok(note.length > 20, note);
  assert.ok(!note.includes('{'), 'an unfilled token reached the athlete');
});

test('every shape produces a complete sentence with no stray tokens', () => {
  for (const n of [1, 2, 4, 7]) {
    resetVoice();
    const note = reviewNote(week({ workouts: n, days_trained: Math.min(n, 7) }), first);
    assert.ok(!note.includes('{'), `${n}: ${note}`);
    assert.ok(note.trim().length > 0, String(n));
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// WHICH WEEK IT WAS
// ─────────────────────────────────────────────────────────────────────────────

test('a week inside one month names the month once', () => {
  assert.equal(formatWeekRange('2026-08-03', '2026-08-09'), '3 – 9 August 2026');
});

test('a week that crosses a month names both', () => {
  assert.equal(formatWeekRange('2026-07-27', '2026-08-02'), '27 July – 2 August 2026');
});

test('a week that crosses a year carries both years', () => {
  assert.equal(formatWeekRange('2025-12-29', '2026-01-04'), '29 December 2025 – 4 January 2026');
});

test('the year can be dropped where the surface already says "last week"', () => {
  assert.equal(formatWeekRange('2026-08-03', '2026-08-09', { year: false }), '3 – 9 August');
});

test('⚠ the date is NOT parsed as UTC — the first of a month stays the first', () => {
  /* `new Date('2026-08-01')` is UTC midnight, which is 31 July for every athlete west of Greenwich.
     0140 buckets the week in `profiles.tz` so it is THEIR week; a UTC parse here would undo that at the
     very last step. This fails loudly if anyone "simplifies" the parser back to a Date constructor. */
  assert.equal(formatWeekRange('2026-08-01', '2026-08-07'), '1 – 7 August 2026');
  assert.equal(formatWeekRange('2026-03-01', '2026-03-07'), '1 – 7 March 2026');
});

test('a malformed date degrades to the raw pair instead of throwing', () => {
  assert.equal(formatWeekRange('not-a-date', '2026-08-09'), 'not-a-date — 2026-08-09');
  assert.equal(formatWeekRange('2026-13-01', '2026-13-07'), '2026-13-01 — 2026-13-07');
});
