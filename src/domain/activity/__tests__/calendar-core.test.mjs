import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addMonths,
  buildMonthGrid,
  chapterMarksFrom,
  chapterRowFor,
  dayA11y,
  dayTitle,
  fmtHours,
  FIRST_SESSION_LINE,
  MAX_MARKS,
  monthRange,
  monthSummary,
  monthTitle,
  sessionsInMonth,
  sessionsOnDay,
  weeksOf,
} from '../calendar-core.ts';

// Local-time ISO strings (no Z) so the day under test is the same day in every timezone the suite runs in.
const at = (y, m, d, h = 9) => new Date(y, m, d, h).toISOString();
let n = 0;
const rec = (over = {}) => ({
  id: `w${++n}`,
  type: 'strength',
  title: 'Leg Day A',
  startedAt: at(2026, 5, 10),
  durationSec: 3600,
  exerciseCount: 5,
  setCount: 18,
  distance: null,
  distanceUnit: null,
  chapterName: null,
  pr: false,
  partners: [],
  ...over,
});
const JUNE = { y: 2026, m: 5 };
const NOW = new Date(2026, 5, 11, 12);

test('weeks start Monday: June 2026 opens on a Monday, so no lead blanks; whole weeks only', () => {
  const cells = buildMonthGrid([], JUNE, NOW);
  assert.equal(cells[0].day, 1);
  assert.equal(cells.length % 7, 0);
  // May 2026 opens on a Friday — four blanks (Mon–Thu) before the 1st.
  const may = buildMonthGrid([], { y: 2026, m: 4 }, NOW);
  assert.deepEqual(may.slice(0, 5).map((c) => c && c.day), [null, null, null, null, 1]);
  assert.equal(weeksOf(may).every((w) => w.length === 7), true);
});

test('⛔ an empty day carries nothing and is not a control', () => {
  const cells = buildMonthGrid([rec()], JUNE, NOW);
  const empty = cells.filter((c) => c && c.day !== 10);
  for (const c of empty) {
    assert.deepEqual(c.marks, []);
    assert.equal(c.sessions, 0);
    assert.equal(c.pr, false);
    assert.equal(c.tappable, false);
  }
});

test('one mark per session, by group, in training order, capped at three', () => {
  const day = [
    rec({ type: 'mobility', startedAt: at(2026, 5, 10, 20) }),
    rec({ type: 'running', startedAt: at(2026, 5, 10, 12) }),
    rec({ type: 'strength', startedAt: at(2026, 5, 10, 7) }),
  ]; // newest first, as the read returns them
  const c = buildMonthGrid(day, JUNE, NOW).find((x) => x?.day === 10);
  assert.deepEqual(c.marks, ['lift', 'cardio', 'other']);
  const busy = Array.from({ length: 5 }, (_, i) => rec({ startedAt: at(2026, 5, 10, 6 + i) }));
  const b = buildMonthGrid(busy, JUNE, NOW).find((x) => x?.day === 10);
  assert.equal(b.marks.length, MAX_MARKS);
  assert.equal(b.sessions, 5);
});

test('record day, today, and a chapter day (All only — the caller passes no chapters otherwise)', () => {
  const marks = chapterMarksFrom([{ id: 'c3', name: 'Chapter III — The Rebuild', start_date: '2026-06-03', end_date: null, sealed_at: null }]);
  const cells = buildMonthGrid([rec({ pr: true })], JUNE, NOW, marks);
  assert.equal(cells.find((c) => c?.day === 10).pr, true);
  assert.equal(cells.find((c) => c?.day === 11).today, true);
  const ch = cells.find((c) => c?.day === 3);
  assert.equal(ch.chapter, true);
  assert.equal(ch.tappable, true);
  assert.equal(ch.marks.length, 0);
  assert.equal(buildMonthGrid([], { y: 2026, m: 4 }, NOW).some((c) => c?.today), false);
});

test('months: back to the first session, never past this one; a truncated read drops its partial oldest month', () => {
  const recs = [rec({ startedAt: at(2026, 5, 1) }), rec({ startedAt: at(2026, 2, 20) })];
  assert.deepEqual(monthRange(recs, NOW).map(monthTitle), ['March 2026', 'April 2026', 'May 2026', 'June 2026']);
  assert.deepEqual(monthRange(recs, NOW, true).map(monthTitle), ['April 2026', 'May 2026', 'June 2026']);
  assert.deepEqual(monthRange([], NOW).map(monthTitle), ['June 2026']);
  // A future-dated row (clock skew) never opens a month after this one.
  assert.deepEqual(monthRange([rec({ startedAt: at(2026, 8, 1) })], NOW).map(monthTitle), ['June 2026']);
  assert.deepEqual(addMonths({ y: 2026, m: 0 }, -1), { y: 2025, m: 11 });
});

test('the filter narrows the month, including cardio carried inside a lifting day', () => {
  const recs = [rec(), rec({ type: 'running' }), rec({ contains: ['rowing'] }), rec({ startedAt: at(2026, 4, 30) })];
  assert.equal(sessionsInMonth(recs, 'all', JUNE).length, 3);
  assert.equal(sessionsInMonth(recs, 'running', JUNE).length, 1);
  assert.equal(sessionsInMonth(recs, 'rowing', JUNE).length, 1);
  assert.equal(sessionsOnDay(sessionsInMonth(recs, 'all', JUNE), 10).length, 3);
});

test('summary: this month only, never a comparison', () => {
  const s = [rec({ pr: true, durationSec: 5400 }), rec({ pr: true, durationSec: 1800 }), rec({ durationSec: 2700 })];
  assert.equal(monthSummary(s, 'all', false), '3 sessions · 2 new records · 2 h 45 min');
  assert.equal(monthSummary([rec({ durationSec: 39600 })], 'all', false), '1 session · 11 h');
  assert.equal(monthSummary([rec({ durationSec: null })], 'all', false), '1 session');
  assert.equal(monthSummary([], 'all', false), 'No sessions this month.');
  assert.equal(monthSummary([], 'running', false), 'No Run sessions this month.');
  assert.equal(monthSummary([], 'all', true), FIRST_SESSION_LINE);
  assert.equal(fmtHours(45), '45 min');
  for (const line of [monthSummary(s, 'all', false), monthSummary([], 'all', false)]) {
    assert.doesNotMatch(line, /last month|streak|since|missed|vs/i);
  }
});

test('chapter row: the day a chapter was sealed and the next began leads with the new one', () => {
  const marks = chapterMarksFrom([
    { id: 'c2', name: 'Chapter II — Base Building', start_date: '2026-03-01', end_date: '2026-05-11', sealed_at: '2026-05-11T20:00:00Z' },
    { id: 'c3', name: 'Chapter III — The Rebuild', start_date: '2026-05-11', end_date: null, sealed_at: null },
  ]);
  const row = chapterRowFor(marks, { y: 2026, m: 4 }, 11);
  assert.deepEqual(row, { chapterId: 'c3', title: 'Chapter III — The Rebuild began', sub: 'Chapter II — Base Building sealed' });
  assert.equal(chapterRowFor(marks, { y: 2026, m: 4 }, 12), null);
  assert.equal(chapterRowFor(marks, { y: 2026, m: 2 }, 1).sub, '');
});

test('labels', () => {
  assert.equal(dayTitle(JUNE, 10), 'Wednesday, Jun 10');
  const c = buildMonthGrid([rec({ pr: true }), rec()], JUNE, NOW).find((x) => x?.day === 10);
  assert.equal(dayA11y(JUNE, c), 'June 10, 2 sessions, new record');
});
