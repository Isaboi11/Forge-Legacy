import test from 'node:test';
import assert from 'node:assert/strict';

import { barPct, milestones, PACE_WEEKS, pctOf, projectedClose, recentPace, sharePct } from '../goal-progress.ts';

/**
 * Squad Goal Detail's derived numbers.
 *
 * The rule under all of these: a screen may not assert something the data does not support. Pace,
 * projection and milestone dates each return null rather than a plausible placeholder, because a
 * confident, specific, wrong number is worse than an em dash — the standing lesson from the 2026-08-01
 * audit, where a column that was only ever its default told athletes they had earned zero honors.
 */

const wk = (i, value) => ({ weekStart: `2026-0${1 + Math.floor(i / 4)}-${String(1 + (i % 4) * 7).padStart(2, '0')}T00:00:00Z`, value });

test('pace excludes the CURRENT week, which is always partial', () => {
  // Four full weeks of 20, then a Monday with 2 logged. Including it would report 16.4 and slip the
  // projection a week further out every time somebody opened the screen.
  const weeks = [wk(0, 20), wk(1, 20), wk(2, 20), wk(3, 20), wk(4, 2)];
  assert.equal(recentPace(weeks), 20);
});

test('pace looks back a bounded window, not over all time', () => {
  // A squad that has sped up should read as fast NOW. Averaging in a slow month would understate them.
  const weeks = [wk(0, 2), wk(1, 2), wk(2, 20), wk(3, 20), wk(4, 20), wk(5, 20), wk(6, 0)];
  assert.equal(PACE_WEEKS, 4);
  assert.equal(recentPace(weeks), 20, 'the four completed weeks before the current one');
});

test('a squad with no completed week has NO pace, not a pace of zero', () => {
  assert.equal(recentPace([]), null);
  assert.equal(recentPace([wk(0, 5)]), null, 'one week, and it is the current one');
});

test('a quiet stretch gives a real pace of zero — which is different from no pace', () => {
  assert.equal(recentPace([wk(0, 0), wk(1, 0), wk(2, 3)]), 0);
});

test('projection is absent when nothing honest can be said', () => {
  const now = new Date('2026-08-03T00:00:00Z');
  assert.equal(projectedClose(500, 500, 20, now), null, 'already met');
  assert.equal(projectedClose(300, 500, null, now), null, 'no measurable pace');
  // The one that matters: a squad that logged nothing has an infinite projection, and rendering
  // "Projected close: never" at people is the opposite of what this product does.
  assert.equal(projectedClose(300, 500, 0, now), null, 'a pace of zero projects nothing');
});

test('projection reads forward at the current rate', () => {
  const now = new Date('2026-08-03T00:00:00Z');
  // 188 to go at 20 a week is 9.4 weeks → 66 days, rounded up to whole weeks of days.
  const d = projectedClose(312, 500, 20, now);
  assert.ok(d instanceof Date);
  assert.equal(Math.round((d.getTime() - now.getTime()) / 86400000), 66);
});

test('milestones are FIFTHS of the target, so a small goal gets a rail too', () => {
  const m = milestones(500, 312, []);
  assert.deepEqual(m.map((x) => x.value), [100, 200, 300, 400, 500]);
  // A 30-workout goal would get 6/12/18/24/30 rather than nothing — hard-coded hundreds serve one goal.
  assert.deepEqual(milestones(30, 0, []).map((x) => x.value), [6, 12, 18, 24, 30]);
});

test('the last milestone is the target itself', () => {
  const m = milestones(500, 0, []);
  assert.equal(m[m.length - 1].isTarget, true);
  assert.equal(m[m.length - 1].value, 500);
  assert.ok(m.slice(0, -1).every((x) => !x.isTarget));
});

test('reached is decided by the total, crossed-when by the weekly series', () => {
  const weeks = [wk(0, 60), wk(1, 60), wk(2, 60)]; // running: 60, 120, 180
  const m = milestones(500, 312, weeks);
  assert.equal(m[0].reached, true, '100 is behind 312');
  assert.equal(m[0].crossedAt, weeks[1].weekStart, 'crossed during the second week');
  assert.equal(m[2].reached, true, '300 is behind 312');
  // 300 is NOT in the eight-week window (the series only totals 180), so there is no date to give.
  assert.equal(m[2].crossedAt, null, 'reached, but crossed before the window — no invented date');
  assert.equal(m[3].reached, false);
});

test('percentage floors — 99.6% has not been met', () => {
  assert.equal(pctOf(498, 500), 99);
  assert.equal(pctOf(500, 500), 100);
  assert.equal(pctOf(600, 500), 100, 'clamped, never 120%');
  assert.equal(pctOf(0, 500), 0);
  assert.equal(pctOf(5, 0), 0, 'no target is no percentage, not a division by zero');
});

test('a share is of the work DONE, not of the target', () => {
  // "18% of the goal" while the squad is halfway there reads as a fraction of a thing that has not
  // happened. 71 of 312 done is 23% of the work so far.
  assert.equal(sharePct(71, 312), 23);
  assert.equal(sharePct(0, 312), 0);
  assert.equal(sharePct(5, 0), 0);
});

test('bars are scaled to the top contributor, so the list is legible at any scale', () => {
  assert.equal(barPct(78, 78), 100);
  assert.equal(barPct(39, 78), 50);
  assert.equal(barPct(0, 78), 0);
  assert.equal(barPct(5, 0), 0);
});
