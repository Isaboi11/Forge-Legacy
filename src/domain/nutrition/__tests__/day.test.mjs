import test from 'node:test';
import assert from 'node:assert/strict';

import {
  toLocalIso,
  calorieCaption,
  calorieHeadline,
  canGoForward,
  dayDateLine,
  dayLabel,
  groupByMeal,
  mealTitle,
  remaining,
  ringDash,
  ringFraction,
  shiftDay,
  totals,
} from '../day.ts';

const e = (over = {}) => ({
  id: 'e1',
  meal: 'breakfast',
  name: 'Oats',
  quantity: 1,
  kcal: 100,
  protein: 5,
  carb: 20,
  fat: 2,
  ...over,
});

test('totals sum a day and round once', () => {
  const day = [e({ kcal: 100.4 }), e({ kcal: 100.4 }), e({ kcal: 100.4 })];
  // Rounding each entry first would give 300; rounding the sum gives 301.
  assert.equal(totals(day).kcal, 301);
});

test('totals of an empty day are zero, not NaN', () => {
  assert.deepEqual(totals([]), { kcal: 0, protein: 0, carb: 0, fat: 0 });
});

test('groupByMeal always returns all four slots in order', () => {
  const groups = groupByMeal([e({ meal: 'dinner' })]);
  assert.deepEqual(
    groups.map((g) => g.meal),
    ['breakfast', 'lunch', 'dinner', 'snacks'],
  );
  assert.equal(groups[0].entries.length, 0);
  assert.equal(groups[2].kcal, 100);
});

test('a meal card names one food, counts several', () => {
  const [breakfast] = groupByMeal([e({ name: 'Oats' })]);
  assert.equal(mealTitle(breakfast), 'Oats');

  const [two] = groupByMeal([e({ name: 'Oats' }), e({ name: 'Banana', id: 'e2' })]);
  assert.equal(mealTitle(two), '2 items');
  assert.equal(two.summary, 'Oats, Banana');

  const [empty] = groupByMeal([]);
  assert.equal(mealTitle(empty), 'Nothing logged yet');
});

test('remaining goes negative rather than lying', () => {
  const left = remaining({ kcal: 2620, protein: 200, carb: 260, fat: 90 }, { kcal: 2500, protein: 190, carb: 250, fat: 80 });
  assert.equal(left.kcal, -120);
});

test('the ring clamps instead of wrapping', () => {
  assert.equal(ringFraction(1850, 2500), 0.74);
  assert.equal(ringFraction(3000, 2500), 1); // over target draws a full ring, never a second lap
  assert.equal(ringFraction(-50, 2500), 0);
  assert.equal(ringFraction(500, 0), 0); // no target set yet
  assert.equal(ringFraction(Number.NaN, 2500), 0);
});

test('ringDash draws the arc then the remainder of the circumference', () => {
  const dash = ringDash(0.5, 98);
  const [drawn, rest] = dash.split(' ').map(Number);
  assert.equal(rest.toFixed(1), (2 * Math.PI * 98).toFixed(1));
  assert.ok(Math.abs(drawn - rest / 2) < 0.1);
});

test('over target the caption says over, never a minus sign', () => {
  assert.equal(calorieCaption(1850, 2500, 'eaten'), 'of 2,500 · 650 left');
  assert.equal(calorieCaption(2620, 2500, 'eaten'), 'of 2,500 · 120 over');
  assert.equal(calorieCaption(1850, 2500, 'remaining'), '1,850 of 2,500 eaten');
});

test('the headline flips label instead of showing a negative', () => {
  assert.deepEqual(calorieHeadline(1850, 2500, 'eaten'), { value: '1,850', label: 'Calories' });
  assert.deepEqual(calorieHeadline(1850, 2500, 'remaining'), { value: '650', label: 'Calories left' });
  assert.deepEqual(calorieHeadline(2620, 2500, 'remaining'), { value: '120', label: 'Calories over' });
});

test('day labels and date line', () => {
  assert.equal(dayLabel('2026-09-16', '2026-09-16'), 'Today');
  assert.equal(dayLabel('2026-09-15', '2026-09-16'), 'Yesterday');
  assert.equal(dayLabel('2026-09-12', '2026-09-16'), 'Sat, Sep 12');
  assert.equal(dayDateLine('2026-09-16'), 'SEP 16, 2026');
});

test('shiftDay crosses months, years and a DST boundary without drifting', () => {
  assert.equal(shiftDay('2026-09-16', -1), '2026-09-15');
  assert.equal(shiftDay('2026-03-01', -1), '2026-02-28');
  assert.equal(shiftDay('2026-12-31', 1), '2027-01-01');
  // US DST ends 2026-11-01. Local-time arithmetic here lands on Oct 31 in some zones.
  assert.equal(shiftDay('2026-11-01', -1), '2026-10-31');
  assert.equal(shiftDay('2026-11-01', 1), '2026-11-02');
});

test('you cannot log the future', () => {
  assert.equal(canGoForward('2026-09-15', '2026-09-16'), true);
  assert.equal(canGoForward('2026-09-16', '2026-09-16'), false);
});

/* ── the day key ──────────────────────────────────────────────────────────── */

test('⚠ the day key is the ATHLETE’S calendar day, not UTC’s', () => {
  /* 6pm on 22 Sep in California is 01:00 on 23 Sep UTC. `toISOString().slice(0,10)` — what every
     nutrition surface used to call — filed that dinner on the 23rd, a day that had not started. */
  const evening = new Date(2026, 8, 22, 18, 30);
  assert.equal(toLocalIso(evening), '2026-09-22');

  /* TZ-independent statement of the same rule: the key always matches the LOCAL parts, whatever zone
     the runner is in. West of Greenwich in the evening, UTC disagrees — and UTC is the one that is wrong. */
  for (const hour of [0, 6, 12, 18, 23]) {
    const d = new Date(2026, 8, 22, hour, 30);
    assert.equal(toLocalIso(d), `${d.getFullYear()}-09-${String(d.getDate()).padStart(2, '0')}`);
  }
});

test('and it pads, so September is 09 and the 3rd is 03', () => {
  assert.equal(toLocalIso(new Date(2026, 8, 3, 9, 0)), '2026-09-03');
  assert.equal(toLocalIso(new Date(2026, 11, 31, 23, 59)), '2026-12-31');
});

test('midnight and one second before it land on the days they belong to', () => {
  assert.equal(toLocalIso(new Date(2026, 8, 22, 0, 0, 0)), '2026-09-22');
  assert.equal(toLocalIso(new Date(2026, 8, 22, 23, 59, 59)), '2026-09-22');
});
