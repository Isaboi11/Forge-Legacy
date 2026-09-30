// A US-evening clock is the case that broke (QA 09-26 B14). Pin the zone BEFORE any Date is made.
process.env.TZ = 'America/Los_Angeles';

import test from 'node:test';
import assert from 'node:assert/strict';

import { calendarDaysBetween, dayNumberSince, isDateOnly, localYmd, shiftYmd, todayYmd, toLocalDate } from '../local-date.ts';
import { milestones } from '../../squad/goal-progress.ts';

// 8:30pm Pacific on Sep 25 is already 03:30 UTC on Sep 26.
const usEvening = new Date('2026-09-26T03:30:00Z');

test('the zone pin took (otherwise every case below is testing UTC)', () => {
  assert.equal(usEvening.getHours(), 20);
  assert.equal(usEvening.getDate(), 25);
});

test('today in a US evening is still today, not the UTC tomorrow (add-photo, legacy-06)', () => {
  assert.equal(usEvening.toISOString().slice(0, 10), '2026-09-26', 'the old way said tomorrow');
  assert.equal(todayYmd(usEvening), '2026-09-25');
  assert.equal(localYmd(usEvening), '2026-09-25');
});

test('a DATE column reads as that local day, not the day before (timeline, squad records)', () => {
  assert.equal(new Date('2026-09-01').getDate(), 31, 'the old way: UTC midnight is Aug 31 here');
  const d = toLocalDate('2026-09-01');
  assert.equal(d.getMonth(), 8);
  assert.equal(d.getDate(), 1);
  assert.equal(d.getHours(), 0);
});

test('a timestamp stays an instant — its local day is the athlete day', () => {
  const d = toLocalDate('2026-09-26T06:59:00Z'); // 11:59pm Sep 25 Pacific
  assert.equal(localYmd(d), '2026-09-25');
});

test('isDateOnly tells a calendar day from an instant', () => {
  assert.equal(isDateOnly('2026-09-25'), true);
  assert.equal(isDateOnly('2026-09-25T00:00:00Z'), false);
});

test('shiftYmd moves whole calendar days, across a DST change and month ends', () => {
  assert.equal(shiftYmd('2026-11-01', 1), '2026-11-02'); // DST ends Nov 1 in the US
  assert.equal(shiftYmd('2026-03-08', -1), '2026-03-07'); // DST starts Mar 8
  assert.equal(shiftYmd('2026-09-30', 1), '2026-10-01');
});

test('Day N: Day 1 on the day it began, evening included (Home vs Legacy, visualB-07)', () => {
  assert.equal(dayNumberSince('2026-09-25', usEvening), 1);
  assert.equal(dayNumberSince('2026-09-24', usEvening), 2);
  assert.equal(dayNumberSince('2026-09-30', usEvening), 1, 'never Day 0 or negative');
  assert.equal(calendarDaysBetween(toLocalDate('2026-03-07'), toLocalDate('2026-03-09')), 2, 'DST-safe');
});

test('a squad milestone is never "crossed" before the goal began (social-05)', () => {
  // Goal started Sat Sep 26 local; its first week bucket is the UTC Monday Sep 21.
  const startedAt = new Date(2026, 8, 26).toISOString();
  const weeks = [{ weekStart: '2026-09-21T00:00:00+00:00', value: 5 }];
  const m = milestones(3, 5, weeks, startedAt);
  assert.equal(m[0].crossedAt, '2026-09-26');
  // Without a start, the bucket's own calendar day — Monday Sep 21, not Sunday Sep 20.
  assert.equal(milestones(3, 5, weeks)[0].crossedAt, '2026-09-21');
});
