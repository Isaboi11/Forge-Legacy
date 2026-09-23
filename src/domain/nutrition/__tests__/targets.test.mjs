import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ACTIVITY_LEVELS,
  activityByKey,
  ageFrom,
  basisLine,
  blockerFor,
  burnFor,
  checkManual,
  FLOOR,
  FLOOR_UNKNOWN,
  floorFor,
  heldLine,
  historyRows,
  macroSumLine,
  maxPace,
  methodRows,
  paceLabel,
  paceOptions,
  recommend,
  sameAsCurrent,
  saveNote,
} from '../targets.ts';

const TODAY = '2026-09-23';
const moderate = activityByKey('moderate');

/** A 32-year-old man, 5′10″, 196 lb, training 3–5 days a week. */
const MAN = { sex: 'male', weightLb: 196, birthYear: 1994, heightIn: 70, activity: moderate };
/** A 32-year-old woman, 5′4″, 150 lb, training 1–3 days a week. */
const WOMAN = { sex: 'female', weightLb: 150, birthYear: 1994, heightIn: 64, activity: activityByKey('light') };

const burn = (facts) => burnFor(facts, TODAY);
const rec = (facts, goal, rate) => recommend(facts, burn(facts), goal, rate, TODAY);

/* ══ ⛔ THE THREE RULES THAT MUST NEVER QUIETLY BREAK ══ */

test('⛔ NOTHING IS RECOMMENDED TO ANYONE UNDER 18 — not a lower number, nothing', () => {
  const kid = { ...MAN, birthYear: 2010 }; // 16
  const blocker = blockerFor(kid, TODAY);
  assert.equal(blocker.kind, 'under-age');
  assert.equal(blocker.age, 16);
  assert.equal(blocker.unlockYear, 2028);
  assert.equal(recommend(kid, burn(kid), 'lose', 1, TODAY), null);
});

test('⛔ and 18 exactly is an adult — the gate opens on the year, not a day later', () => {
  const eighteen = { ...MAN, birthYear: 2008 };
  assert.equal(ageFrom(2008, TODAY), 18);
  assert.equal(blockerFor(eighteen, TODAY), null);
  assert.ok(recommend(eighteen, burn(eighteen), 'lose', 1, TODAY));
});

test('⛔ NO RECOMMENDATION BELOW THE FLOOR, and the pace is restated rather than left as a lie', () => {
  /* A small, sedentary woman asking to lose 2 lb a week: the arithmetic wants ~370 cal. */
  const small = { ...WOMAN, weightLb: 110, heightIn: 60, activity: activityByKey('sedentary') };
  const r = rec(small, 'lose', 2);
  assert.equal(r.kcal, FLOOR.female);
  assert.equal(r.held, 'floor');
  /* She asked for 2 lb a week and will not get it — the effective pace says what she WILL get. */
  assert.equal(r.requestedRate, 2);
  assert.ok(r.effectiveRate < 2);
  assert.match(heldLine(r, 'female'), /lowest target Forge sets for women/);
});

test('⛔ NO DEFICIT STEEPER THAN 1% OF BODYWEIGHT A WEEK', () => {
  /* 196 lb caps at 1.9 lb a week. Asking for 2.5 is accepted as a wish and held. */
  const r = rec(MAN, 'lose', 2.5);
  assert.equal(r.burn.lossCap, 1.9);
  assert.equal(r.held, 'cap');
  assert.equal(r.effectiveRate, 1.9);
  assert.equal(r.requestedRate, 2.5);
  assert.match(heldLine(r, 'male'), /Forge keeps loss to 1% of bodyweight, 1\.9 lb for you/);
});

test('⚠ A HELD TARGET IS NEVER SILENT — an unclamped one says nothing, a clamped one always does', () => {
  assert.equal(rec(MAN, 'lose', 1).held, null);
  assert.equal(heldLine(rec(MAN, 'lose', 1), 'male'), null);
  assert.ok(heldLine(rec(MAN, 'lose', 2.5), 'male'));
});

/* ── who we can calculate for ─────────────────────────────────────────────── */

test('⚠ sex is asked for, never guessed — Mifflin–St Jeor has no neutral term', () => {
  const unknown = { ...MAN, sex: 'unspecified' };
  assert.deepEqual(blockerFor(unknown, TODAY), { kind: 'no-sex' });
  assert.equal(burnFor(unknown, TODAY), null);
});

test('⚠ the unknown-sex floor is the HIGHER of the two, because a floor protects somebody', () => {
  assert.equal(FLOOR_UNKNOWN, FLOOR.male);
  assert.equal(floorFor('unspecified'), 1500);
  assert.equal(floorFor('female'), 1200);
  assert.equal(floorFor('male'), 1500);
});

test('no weigh-in, no target — a body needs a weight before it has a burn', () => {
  assert.deepEqual(blockerFor({ ...MAN, weightLb: null }, TODAY), { kind: 'no-weight' });
});

test('missing details are one blocker, and age is checked FIRST so the gate is never bypassed', () => {
  assert.deepEqual(blockerFor({ ...MAN, activity: null }, TODAY), { kind: 'incomplete' });
  /* A 16-year-old with nothing else filled in still reads as under-age, not as incomplete. */
  const kid = { sex: 'unspecified', weightLb: null, birthYear: 2012, heightIn: null, activity: null };
  assert.equal(blockerFor(kid, TODAY).kind, 'under-age');
});

/* ── the arithmetic ───────────────────────────────────────────────────────── */

test('Mifflin–St Jeor, then the activity multiplier', () => {
  const b = burn(MAN);
  /* 10(88.9) + 6.25(177.8) − 5(32) + 5 = 1,845 → rounded to ten. */
  assert.equal(b.bmr, 1850);
  assert.equal(b.tdee, 2870); // 1850 × 1.55
  assert.equal(b.age, 32);
});

test('the female constant is −161, not +5', () => {
  /* 10(68.04) + 6.25(162.56) − 5(32) − 161 = 1,375.4 → 1,380. The male constant would give 1,710. */
  assert.equal(burn(WOMAN).bmr, 1380);
});

test('maintenance takes no adjustment, and reports no pace', () => {
  const r = rec(MAN, 'maintain', 1);
  assert.equal(r.kcal, burn(MAN).tdee);
  assert.equal(r.effectiveRate, 0);
  assert.equal(r.held, null);
});

test('a pound a week is about 500 calories a day, each way', () => {
  assert.equal(rec(MAN, 'lose', 1).kcal, 2370); // 2870 − 500
  assert.equal(rec(MAN, 'gain', 0.5).kcal, 3120); // 2870 + 250
});

test('protein comes from bodyweight, fat from calories, carbs from what is left', () => {
  const r = rec(MAN, 'lose', 1);
  assert.equal(r.protein, 175); // 196 × 0.9 = 176.4 → nearest 5
  assert.equal(r.fat, 70); // 2370 × 0.27 / 9 = 71.1 → nearest 5
  assert.equal(r.carb, 260); // (2370 − 700 − 630) / 4 = 260
});

test('⚠ carbohydrate never goes negative, however tight the target', () => {
  const heavy = { ...MAN, weightLb: 400, activity: activityByKey('sedentary') };
  const r = rec(heavy, 'lose', 4);
  assert.ok(r.carb >= 0);
});

/* ── pace ─────────────────────────────────────────────────────────────────── */

test('gaining tops out sooner than losing — a pound a week is already fast to add', () => {
  assert.deepEqual(paceOptions('gain'), [0.25, 0.5, 0.75, 1]);
  assert.deepEqual(paceOptions('lose'), [0.25, 0.5, 0.75, 1, 1.5, 2]);
  assert.equal(maxPace('gain'), 1);
  assert.equal(maxPace('lose'), 2.5);
});

test('a pace keeps one decimal, and the quarters keep two — the `.dc`’s own formatting', () => {
  assert.equal(paceLabel(1), '1.0 lb / week');
  assert.equal(paceLabel(2), '2.0 lb / week');
  assert.equal(paceLabel(0.5), '0.5 lb / week');
  assert.equal(paceLabel(1.5), '1.5 lb / week');
  assert.equal(paceLabel(0.25), '0.25 lb / week');
  assert.equal(paceLabel(0.75), '0.75 lb / week');
});

/* ── what the screen says ─────────────────────────────────────────────────── */

test('the basis line shows the whole sum, not just the answer', () => {
  assert.equal(
    basisLine(rec(MAN, 'lose', 1)),
    'Maintenance is about 2,870. Minus 500 for 1.0 lb a week. Protein set from bodyweight.',
  );
});

test('the method sheet traces every figure back to the equation that made it', () => {
  const rows = methodRows(rec(MAN, 'lose', 1), MAN, 'male');
  assert.deepEqual(rows.map((r) => r.label), [
    'Resting burn',
    'Activity',
    'Maintenance',
    'Deficit',
    'Protein',
    'Fat',
    'Carbs',
  ]);
  assert.match(rows[0].note, /Mifflin–St Jeor equation, from age 32, 5′10″, 196 lb, male\./);
  assert.match(rows[3].note, /capped at 1% of bodyweight \(1\.9 lb\), and targets never go below 1,500 for men/);
});

/* ── manual ───────────────────────────────────────────────────────────────── */

test('⚠ the manual minimum is the STRICTER of the floor and the 1%-a-week pace', () => {
  /* This man's cap-derived minimum is 2870 − 1.9×500 = 1,920 — above the 1,500 floor, so it binds. */
  const check = checkManual(1600, MAN, burn(MAN));
  assert.equal(check.minimum, 1920);
  assert.equal(check.floorBinds, false);
  assert.equal(check.tooLow, true);
  assert.match(check.message, /more than 1% of your bodyweight a week/);
  assert.equal(check.useLabel, 'Use 1,920');
});

test('and when the floor is the stricter one, the message says THAT', () => {
  const small = { ...WOMAN, weightLb: 110, heightIn: 60, activity: activityByKey('sedentary') };
  const check = checkManual(900, small, burn(small));
  assert.equal(check.floorBinds, true);
  assert.equal(check.minimum, FLOOR.female);
  assert.match(check.message, /lowest daily target Forge sets for women/);
});

test('a figure at or above the minimum passes without comment', () => {
  const check = checkManual(2400, MAN, burn(MAN));
  assert.equal(check.tooLow, false);
  assert.equal(check.message, null);
});

test('an athlete with no burn yet is still held to the clinical floor', () => {
  const check = checkManual(1000, { ...MAN, activity: null }, null);
  assert.equal(check.minimum, FLOOR.male);
  assert.equal(check.tooLow, true);
});

test('the macro line stays quiet inside 5% and speaks up beyond it', () => {
  /* 150×4 + 200×4 + 60×9 = 1,940 — 3% under 2,000, which is honest rounding. */
  assert.equal(macroSumLine(2000, 150, 200, 60).off, false);
  /* 55 g of fat instead drops it to 1,895 — 5.25%, and past the line. */
  assert.equal(macroSumLine(2000, 150, 200, 55).off, true);
  const off = macroSumLine(2000, 150, 200, 100);
  assert.equal(off.off, true);
  assert.match(off.text, /so one of these may need adjusting/);
});

/* ── history ──────────────────────────────────────────────────────────────── */

test('⚠ every old target keeps the span it governed — that IS the never-overwrite rule, made visible', () => {
  const rows = historyRows(
    [
      { from: '2026-02-02', targets: { kcal: 2850, protein: 185, carb: 320, fat: 90 } },
      { from: '2026-05-10', targets: { kcal: 2700, protein: 190, carb: 290, fat: 85 } },
      { from: '2026-08-04', targets: { kcal: 2500, protein: 190, carb: 250, fat: 80 } },
    ],
    TODAY,
  );
  assert.deepEqual(rows.map((r) => r.range), ['Since Aug 4', 'May 10 – Aug 3', 'Feb 2 – May 9']);
  assert.deepEqual(rows.map((r) => r.current), [true, false, false]);
  assert.equal(rows[0].kcal, '2,500');
  assert.equal(rows[0].macros, 'P 190 · C 250 · F 80');
});

test('a target set today says so', () => {
  const rows = historyRows([{ from: TODAY, targets: { kcal: 2500, protein: 190, carb: 250, fat: 80 } }], TODAY);
  assert.equal(rows[0].range, 'From today');
});

/* ── saving ───────────────────────────────────────────────────────────────── */

test('saving the same numbers is refused, because it would write a row that changes nothing', () => {
  const t = { kcal: 2500, protein: 190, carb: 250, fat: 80 };
  assert.equal(sameAsCurrent(t, { ...t }), true);
  assert.equal(sameAsCurrent(t, { ...t, fat: 81 }), false);
  assert.equal(sameAsCurrent(null, t), false);
});

test('the save note says what pressing it will do', () => {
  assert.equal(saveNote({ blocked: null, same: false, replacesToday: false }), 'Effective today · Previous days remain unchanged.');
  assert.equal(saveNote({ blocked: null, same: false, replacesToday: true }), 'Replaces the change you made earlier today.');
  assert.equal(saveNote({ blocked: null, same: true, replacesToday: false }), 'This is the target already in effect.');
  assert.equal(saveNote({ blocked: 'Enter a calorie target.', same: false, replacesToday: false }), 'Enter a calorie target.');
});

test('the four activity levels carry the standard multipliers', () => {
  assert.deepEqual(ACTIVITY_LEVELS.map((a) => a.multiplier), [1.2, 1.375, 1.55, 1.725]);
  assert.equal(activityByKey('nope'), null);
});
