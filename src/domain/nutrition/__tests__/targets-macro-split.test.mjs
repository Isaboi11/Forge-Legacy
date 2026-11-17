/**
 * targets-macro-split.test.mjs — the recommended macro split at every body size (AI audit 2026-11-16, N-D4).
 *
 * The `.dc`'s split (protein 0.9 g × TOTAL bodyweight, fat 27%, carbs = what's left, floored at 0) gave a sedentary
 * 330-lb woman losing 2 lb a week P 295 / C 0 / F 45 on 1,580 kcal, and a 380-lb man C 45. The rule now
 * (`targets.ts` header): protein from adjusted body weight at BMI ≥ 30, capped at 35% of calories; fat 27%, never
 * under 20%; carbs at least 130 g when the target allows — fat gives way first, then protein down to 30%.
 * Pending dietitian review.
 *
 * Run:  node --test --experimental-strip-types src/domain/nutrition/__tests__/targets-macro-split.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ACTIVITY_LEVELS,
  activityByKey,
  burnFor,
  CARB_FLOOR_G,
  FLOOR,
  idealWeightLb,
  macroSplit,
  macroSumLine,
  methodRows,
  paceOptions,
  proteinWeightLb,
  recommend,
} from '../targets.ts';

/* The auditor's probe date and cases (scratchpad targets-probe.mjs, 11-16). */
const TODAY = '2026-11-16';
const sedentary = ACTIVITY_LEVELS[0];
const facts = (sex, weightLb, heightIn, birthYear, activity = sedentary) => ({ sex, weightLb, heightIn, birthYear, activity });
const rec = (f, goal, rate) => recommend(f, burnFor(f, TODAY), goal, rate, TODAY);
const share = (g, perG, kcal) => (g * perG) / kcal;

/** The `.dc`'s split, as it was — what a normal-sized athlete must still get. */
const round5 = (n) => Math.round(n / 5) * 5;
const dcSplit = (kcal, lb) => {
  const protein = round5(lb * 0.9);
  const fat = round5((kcal * 0.27) / 9);
  return { protein, fat, carb: Math.max(0, round5((kcal - protein * 4 - fat * 9) / 4)) };
};

const WOMAN_330 = facts('female', 330, 64, 1985);
const MAN_380 = facts('male', 380, 70, 1980);

test('⛔ the 330-lb probe: no more 0 g carbs — P 135 / C 160 / F 45 on 1,580 (was P 295 / C 0 / F 45)', () => {
  const r = rec(WOMAN_330, 'lose', 2);
  assert.equal(r.kcal, 1580);
  assert.deepEqual([r.protein, r.carb, r.fat], [135, 160, 45]);
  assert.equal(r.split.adjusted, true);
  assert.equal(r.split.proteinLb, 204, 'Devine 120.6 lb + 0.4 × (330 − 120.6)');
  assert.equal(r.split.proteinCapped, true);
  assert.ok(share(r.protein, 4, r.kcal) <= 0.35);
  assert.ok(r.carb >= CARB_FLOOR_G);
  assert.ok(share(r.fat, 9, r.kcal) >= 0.2);
});

test('⛔ the 380-lb probe: C 200, not 45 — P 185 / C 200 / F 65 on 2,130', () => {
  const r = rec(MAN_380, 'lose', 2);
  assert.equal(r.kcal, 2130);
  assert.deepEqual([r.protein, r.carb, r.fat], [185, 200, 65]);
  assert.equal(r.split.adjusted, true);
  assert.equal(r.split.proteinLb, 249);
  assert.ok(share(r.protein, 4, r.kcal) <= 0.35);
});

test('a normal case is unchanged: 180-lb man at maintenance gets the `.dc` numbers exactly', () => {
  const f = facts('male', 180, 70, 1995);
  const r = rec(f, 'maintain', 0);
  assert.deepEqual([r.protein, r.carb, r.fat], [160, 230, 65]);
  assert.deepEqual({ protein: r.protein, carb: r.carb, fat: r.fat }, dcSplit(r.kcal, 180));
  assert.equal(r.split.adjusted, false);
  assert.equal(r.split.proteinCapped || r.split.fatEased || r.split.proteinEased, false);
});

test('⭐ under BMI 30, whenever the `.dc` split already sat inside the guards, the numbers are identical', () => {
  let compared = 0;
  for (const sex of ['male', 'female']) {
    for (let lb = 110; lb <= 240; lb += 10) {
      for (let inch = 60; inch <= 76; inch += 2) {
        if ((703 * lb) / (inch * inch) >= 30) continue;
        for (const activity of ACTIVITY_LEVELS) {
          for (const [goal, rate] of [['maintain', 0], ['gain', 0.5], ['lose', 0.5], ['lose', 1]]) {
            const f = facts(sex, lb, inch, 1990, activity);
            const r = rec(f, goal, rate);
            const old = dcSplit(r.kcal, lb);
            const inside = old.protein * 4 <= r.kcal * 0.35 && old.carb >= CARB_FLOOR_G;
            if (!inside) continue;
            compared += 1;
            assert.deepEqual({ protein: r.protein, carb: r.carb, fat: r.fat }, old, `${sex} ${lb} lb ${inch}" ${activity.key} ${goal}@${rate}`);
          }
        }
      }
    }
  }
  assert.ok(compared > 500, `only ${compared} cases compared`);
});

test('⚠ a small body at the 1,200 floor: protein held to 35%, fat eases toward 20%, carbs reach 130 g', () => {
  /* The audit probe's 140-lb woman, 1 lb a week. The `.dc` gave P 125 / C 95 / F 35 (42% protein). */
  const r = rec(facts('female', 140, 64, 1995), 'lose', 1);
  assert.equal(r.kcal, FLOOR.female);
  assert.equal(r.held, 'floor');
  assert.deepEqual([r.protein, r.carb, r.fat], [105, 130, 30]);
  assert.ok(r.split.proteinCapped && r.split.fatEased);
  assert.equal(r.split.proteinEased, false, 'at 1,200 the fat alone makes room');
  assert.ok(share(r.protein, 4, r.kcal) <= 0.35);
  assert.ok(share(r.fat, 9, r.kcal) >= 0.2);
});

test('below what any recommendation reaches, protein gives way next — but never under 30% of calories', () => {
  const s = macroSplit(1000, { sex: 'female', weightLb: 140, heightIn: 64 });
  assert.deepEqual([s.protein, s.carb, s.fat], [75, 120, 25]);
  assert.ok(s.fatEased && s.proteinEased);
  assert.ok(share(s.protein, 4, 1000) >= 0.3);
  assert.ok(share(s.fat, 9, 1000) >= 0.2);
});

test('⛔ the 1,200 / 1,500 floors still hold at every body size and pace, and every guard holds with them', () => {
  for (const [sex, inch] of [['female', 62], ['female', 66], ['male', 68], ['male', 74]]) {
    for (let lb = 110; lb <= 500; lb += 15) {
      for (const activity of ACTIVITY_LEVELS) {
        for (const rate of paceOptions('lose')) {
          const f = facts(sex, lb, inch, 1985, activity);
          const r = rec(f, 'lose', rate);
          const where = `${sex} ${lb} lb ${inch}" ${activity.key} lose@${rate}`;
          assert.ok(r.kcal >= FLOOR[sex], `${where}: ${r.kcal} under the floor`);
          assert.ok(share(r.protein, 4, r.kcal) <= 0.35 + 1e-9, `${where}: protein ${r.protein}`);
          assert.ok(share(r.fat, 9, r.kcal) >= 0.2 - 1e-9, `${where}: fat ${r.fat}`);
          assert.ok(r.carb >= CARB_FLOOR_G, `${where}: carbs ${r.carb}`);
          assert.equal(macroSumLine(r.kcal, r.protein, r.carb, r.fat).off, false, `${where}: macros don't add up`);
        }
      }
    }
  }
});

test('⛔ still nothing under 18 — however the split works, a 330-lb 16-year-old gets no recommendation', () => {
  const kid = facts('female', 330, 64, 2010);
  assert.equal(recommend(kid, burnFor(kid, TODAY), 'lose', 1, TODAY), null);
  assert.equal(recommend(kid, burnFor(kid, TODAY), 'maintain', 0, TODAY), null);
});

test('the reference weight: actual below BMI 30 or with no height; adjusted at 30 and above', () => {
  assert.deepEqual(proteinWeightLb({ sex: 'male', weightLb: 196, heightIn: 70 }), { lb: 196, adjusted: false });
  assert.deepEqual(proteinWeightLb({ sex: 'female', weightLb: 330, heightIn: null }), { lb: 330, adjusted: false });
  const atThirty = proteinWeightLb({ sex: 'male', weightLb: 210, heightIn: 70 }); // BMI 30.1
  assert.equal(atThirty.adjusted, true);
  assert.ok(atThirty.lb < 210 && atThirty.lb > 160);
});

test('Devine ideal weight; an unspecified sex takes the higher (men’s) figure', () => {
  assert.equal(Math.round(idealWeightLb(64, 'female')), 121); // 54.7 kg
  assert.equal(Math.round(idealWeightLb(70, 'male')), 161); // 73 kg
  assert.equal(idealWeightLb(66, 'unspecified'), idealWeightLb(66, 'male'));
  assert.ok(idealWeightLb(66, 'unspecified') > idealWeightLb(66, 'female'));
});

test('a calorie target too small for every floor still never goes negative', () => {
  const s = macroSplit(900, { sex: 'female', weightLb: 300, heightIn: 60 });
  assert.ok(s.carb >= 0 && s.protein > 0 && s.fat > 0);
});

test('"How we calculated this" says which rule moved each number — and says nothing new when none did', () => {
  const heavy = rec(WOMAN_330, 'lose', 2);
  const rows = Object.fromEntries(methodRows(heavy, WOMAN_330, 'female').map((r) => [r.label, r.note]));
  assert.match(rows.Protein, /^0\.9 g per lb of an adjusted bodyweight, 204 lb\./);
  assert.match(rows.Protein, /Held to 35% of calories\./);
  assert.equal(rows.Fat, '27% of calories.');

  const small = facts('female', 140, 64, 1995);
  const eased = Object.fromEntries(methodRows(rec(small, 'lose', 1), small, 'female').map((r) => [r.label, r.note]));
  assert.equal(eased.Protein, '0.9 g per lb of bodyweight. Held to 35% of calories.');
  assert.equal(eased.Fat, '23% of calories, down from 27% so carbs can reach 130 g.');
  assert.equal(eased.Carbs, 'The calories left after protein and fat, with at least 130 g.');

  const man = facts('male', 196, 70, 1994, activityByKey('moderate'));
  const plain = Object.fromEntries(methodRows(rec(man, 'lose', 1), man, 'male').map((r) => [r.label, r.note]));
  assert.equal(plain.Protein, '0.9 g per lb of bodyweight.');
  assert.equal(plain.Fat, '27% of calories.');
  assert.equal(plain.Carbs, 'The calories left after protein and fat.');
});
