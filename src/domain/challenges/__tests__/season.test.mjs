import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DAY_SEGMENT_MAX, seasonClock } from '../season.ts';

/**
 * THE SEASON CLOCK — the picture of a competition, which was the actual defect.
 *
 * PO, 2026-08-19: *"look at my competition with @kingmo. It doesn't look like the days have progressed
 * and it should've been done by now from when it started."*
 *
 * The database was healthy. `Yiiiiiiip` — a FRIENDS duel, roster 2, `state = ACTIVE`, Aug 17 → Aug 20 —
 * was exactly where it should be, two days into a three-day run. What was broken was every number the
 * screen drew about it, and the failure was that the screen could not be wrong LOUDLY: a bar that will
 * not move and a caption that will not change read as a frozen competition, not as a rendering bug.
 *
 * The first block below is that competition, hour by hour. If any of it regresses, the report comes back
 * word for word.
 */

const DAY = 24 * 60 * 60 * 1000;

/* The real row, from the 2026-08-19 report. Local midnight boundaries, UTC-6. */
const YIIIIIIIP = { start: '2026-08-17T06:00:00+00:00', end: '2026-08-20T06:00:00+00:00' };
const at = (iso) => new Date(iso).getTime();

test('a three-day duel is drawn in days, not as one seventh-full week', () => {
  const s = seasonClock(YIIIIIIIP.start, YIIIIIIIP.end, 'ACTIVE', at('2026-08-19T18:00:00+00:00'));
  assert.equal(s.totalDays, 3);
  assert.equal(s.byDay, true, 'a 3-day run must segment by day');
  assert.equal(s.totalUnits, 3, 'three days is three segments — it used to be ONE, because ceil(3/7) is 1');
});

/**
 * THE REGRESSION THAT WOULD REPRODUCE THE REPORT.
 *
 * On a week grid this competition's single segment reaches `elapsed / 7 days`. Two and a half days in,
 * that is 36% — and it can never exceed 43% however long the season runs. The athlete watches a bar
 * that has barely left the wall while the competition finishes underneath it.
 */
test('the timeline actually reaches the end of the season', () => {
  // A minute before it closes: last segment, essentially full.
  const s = seasonClock(YIIIIIIIP.start, YIIIIIIIP.end, 'ACTIVE', at('2026-08-20T05:59:00+00:00'));
  assert.equal(s.currentUnit, 3, 'the final day must be the final segment');
  assert.ok(s.unitFill > 0.99, `the last segment must fill — it was ${s.unitFill}`);
});

test('the caption changes every day instead of reading "Week 1 of 1" for the whole run', () => {
  const day = (n) => seasonClock(YIIIIIIIP.start, YIIIIIIIP.end, 'ACTIVE', at(YIIIIIIIP.start) + (n - 1) * DAY + 12 * 60 * 60 * 1000).label;
  assert.equal(day(1), 'Day 1 of 3 • 2 days remaining');
  assert.equal(day(2), 'Day 2 of 3 • 1 day remaining');
  assert.equal(day(3), 'Day 3 of 3 • final day');

  const labels = new Set([day(1), day(2), day(3)]);
  assert.equal(labels.size, 3, 'every day of the season must read differently — one unchanging caption IS the bug report');
});

/**
 * "final day" was tested as `ceil((end - now) / DAY) === 0`, true only in the instant of expiry — by
 * which point the state has flipped to COMPLETED and the line is not drawn. The branch never ran once.
 */
test('the last day says "final day" rather than "1 days remaining"', () => {
  for (const hour of [0, 6, 12, 23]) {
    const s = seasonClock(YIIIIIIIP.start, YIIIIIIIP.end, 'ACTIVE', at('2026-08-19T06:00:00+00:00') + hour * 60 * 60 * 1000);
    assert.equal(s.finalDay, true, `hour ${hour} of the final day was not recognised as the final day`);
    assert.match(s.label, /final day$/, `hour ${hour}: ${s.label}`);
  }
});

test('a single remaining day is singular', () => {
  const s = seasonClock(YIIIIIIIP.start, YIIIIIIIP.end, 'ACTIVE', at('2026-08-18T12:00:00+00:00'));
  assert.equal(s.daysRemaining, 1);
  assert.match(s.label, /1 day remaining$/, 'plural "1 days remaining" is back');
});

/* ══ THE LONGER PRESETS THE DESIGN WAS DRAWN AGAINST — unchanged by any of this ══ */

test('the 4-week and 8-week presets still segment by week', () => {
  const four = seasonClock('2026-08-01T00:00:00Z', '2026-08-29T00:00:00Z', 'ACTIVE', at('2026-08-10T00:00:00Z'));
  assert.equal(four.totalDays, 28);
  assert.equal(four.byDay, false);
  assert.equal(four.totalUnits, 4);
  assert.equal(four.label, 'Week 2 of 4 • 18 days remaining');

  const season = seasonClock('2026-08-01T00:00:00Z', '2026-09-26T00:00:00Z', 'ACTIVE', at('2026-08-02T00:00:00Z'));
  assert.equal(season.totalDays, 56);
  assert.equal(season.totalUnits, 8, 'a 56-day season must stay 8 week-segments, not 56 hairlines');
});

/**
 * The competition the PO MEANT to create. *"I made a 2 day competition for me and king mo"* — the row
 * says three days, because Create Challenge's custom field floored at 3 and rewrote it silently. The
 * floor is 1 now (the spec's own minimum), so these two lengths have to read correctly.
 */
test('a two-day competition reads as two days', () => {
  const two = (now) => seasonClock('2026-08-17T06:00:00+00:00', '2026-08-19T06:00:00+00:00', 'ACTIVE', now);
  assert.equal(two(at('2026-08-17T12:00:00+00:00')).label, 'Day 1 of 2 • 1 day remaining');
  assert.equal(two(at('2026-08-18T12:00:00+00:00')).label, 'Day 2 of 2 • final day');
  assert.equal(two(at('2026-08-17T12:00:00+00:00')).totalUnits, 2);
});

test('a one-day competition is a single segment on its final day, not a broken one', () => {
  const s = seasonClock('2026-08-19T06:00:00+00:00', '2026-08-20T06:00:00+00:00', 'ACTIVE', at('2026-08-19T18:00:00+00:00'));
  assert.equal(s.totalDays, 1);
  assert.equal(s.totalUnits, 1);
  assert.equal(s.finalDay, true);
  assert.equal(s.label, 'Day 1 of 1 • final day');
});

test('the day/week cutoff is where DAY_SEGMENT_MAX says it is', () => {
  const days = (n) => seasonClock('2026-08-01T00:00:00Z', new Date(at('2026-08-01T00:00:00Z') + n * DAY).toISOString(), 'ACTIVE', at('2026-08-01T00:00:00Z'));
  assert.equal(days(DAY_SEGMENT_MAX).byDay, true);
  assert.equal(days(DAY_SEGMENT_MAX).totalUnits, DAY_SEGMENT_MAX);
  assert.equal(days(DAY_SEGMENT_MAX + 1).byDay, false);
  // The minimum Create Challenge allows.
  assert.equal(days(3).totalUnits, 3);
});

/* ══ THE STATES WHERE THE CLOCK AND THE LIFECYCLE DISAGREE ══ */

/**
 * There is no scheduler: `advance_challenges()` runs when a screen calls it. So a competition can sit in
 * ENROLLMENT with its start date behind it, and the line used to read "Starts in 0 days" indefinitely —
 * the same frozen-caption failure from the other end.
 */
test('a competition whose start has passed but is still ENROLLMENT says so', () => {
  const s = seasonClock(YIIIIIIIP.start, YIIIIIIIP.end, 'ENROLLMENT', at('2026-08-19T18:00:00+00:00'));
  assert.equal(s.overdueStart, true);
  assert.equal(s.label, 'Starting now · 3 day run');
  assert.doesNotMatch(s.label, /Starts in 0 days/, '"Starts in 0 days" is back — it never changes and it never explains itself');
});

test('a competition past its end but still ACTIVE says the season is over', () => {
  const s = seasonClock(YIIIIIIIP.start, YIIIIIIIP.end, 'ACTIVE', at('2026-08-22T00:00:00Z'));
  assert.equal(s.overdueEnd, true);
  assert.match(s.label, /The season is over/);
});

test('a season that has not started counts down to it, singular on the last day', () => {
  const soon = seasonClock('2026-08-20T06:00:00+00:00', '2026-08-27T06:00:00+00:00', 'ENROLLMENT', at('2026-08-19T12:00:00+00:00'));
  assert.equal(soon.overdueStart, false);
  assert.equal(soon.label, 'Starts in 1 day · 7 day run');
});

test('a finished season states its length rather than a countdown', () => {
  const s = seasonClock(YIIIIIIIP.start, YIIIIIIIP.end, 'COMPLETED', at('2026-08-21T00:00:00Z'));
  assert.equal(s.label, 'Season complete · 3 days');
  assert.equal(s.overdueEnd, false, 'COMPLETED is not overdue — it is done');
});

/* ══ DEGENERATE WINDOWS ══ */

test('an unreadable window cannot produce NaN segments', () => {
  for (const [start, end] of [
    ['nonsense', '2026-08-20T06:00:00+00:00'],
    ['2026-08-20T06:00:00+00:00', 'nonsense'],
    ['2026-08-20T06:00:00+00:00', '2026-08-17T06:00:00+00:00'], // end before start
  ]) {
    const s = seasonClock(start, end, 'ACTIVE', at('2026-08-19T18:00:00+00:00'));
    assert.ok(Number.isFinite(s.totalUnits) && s.totalUnits >= 1, `totalUnits was ${s.totalUnits} — Array.from({length: NaN}) throws`);
    assert.ok(Number.isFinite(s.unitFill), `unitFill was ${s.unitFill} — a NaN width crashes the layout`);
    assert.ok(Number.isFinite(s.currentUnit) && s.currentUnit >= 1);
    assert.equal(typeof s.label, 'string');
  }
});

test('the clock never runs past the end of the season', () => {
  const s = seasonClock(YIIIIIIIP.start, YIIIIIIIP.end, 'ACTIVE', at('2026-09-30T00:00:00Z'));
  assert.equal(s.currentUnit, s.totalUnits, 'a long-overdue season must not report segment 45 of 3');
  assert.equal(s.dayIndex, s.totalDays);
  assert.equal(s.daysRemaining, 0);
});
