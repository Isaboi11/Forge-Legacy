import test from 'node:test';
import assert from 'node:assert/strict';

import { isNutritionQuestion, NUTRITION_SUMMARY_CHARS, summariseNutrition } from '../holt-summary.ts';

const base = {
  week: [],
  target: { kcal: 2500, protein: 190, carb: 250, fat: 80 },
  todaySoFar: 1180,
  average: { kcal: 2320, protein: 165, carb: 240, fat: 78 },
  counted: 6,
  missed: 1,
  inRange: 2,
};

/* ── when it rides along ──────────────────────────────────────────────────── */

test('a question about food is a nutrition question', () => {
  for (const q of [
    'am I eating enough protein',
    'how many calories should I have',
    'is my carb intake too low',
    'what did I eat this week',
    'should I be bulking or cutting',
    'was my dinner too big',
  ]) {
    assert.equal(isNutritionQuestion(q), true, q);
  }
});

test('an ordinary question is not, so it pays neither the read nor the tokens', () => {
  for (const q of ['how much should I bench', 'am I getting stronger', 'when is my next session', '']) {
    assert.equal(isNutritionQuestion(q), false, q);
  }
});

test('⚠ the training words that only LOOK like food words do not trigger it', () => {
  /* "cut" and "fat" live in both vocabularies — a bare match would attach the diary to a question
     about rest times or a piece of equipment. */
  for (const q of ['should I cut the last set', 'do you like fat grip bars', 'cut my rest times down?']) {
    assert.equal(isNutritionQuestion(q), false, q);
  }
});

/* ── what it says ─────────────────────────────────────────────────────────── */

test('it states the average, the days behind it, and the target', () => {
  const line = summariseNutrition(base);
  assert.match(line, /2,320 cal\/day over 6 logged days \(1 unlogged\), today excluded\./);
  assert.match(line, /Target 2,500 — in range on 2 of 6\./);
  assert.match(line, /Avg protein 165 g, carbs 240 g, fat 78 g\./);
});

test('⚠ today is stated SEPARATELY as "so far", never folded into the average', () => {
  const line = summariseNutrition(base);
  assert.match(line, /Today so far: 1,180 cal\./);
  /* The average sentence must carry its own disclaimer, so a half-eaten day cannot read as a light one. */
  assert.match(line, /today excluded/);
});

test('⚠ it carries NO judgement — the verdict is Holt’s to make, not the context’s', () => {
  const starving = summariseNutrition({
    ...base,
    average: { kcal: 900, protein: 40, carb: 90, fat: 30 },
    inRange: 0,
  });
  assert.match(starving, /900 cal\/day/);
  assert.doesNotMatch(starving, /low|under-?eat|too little|concern|worry|should/i);
});

test('no unlogged days means no parenthetical', () => {
  const line = summariseNutrition({ ...base, missed: 0, counted: 7 });
  assert.doesNotMatch(line, /unlogged/);
  assert.match(line, /over 7 logged days, today excluded/);
});

test('one logged day reads as a day, not as days', () => {
  assert.match(summariseNutrition({ ...base, counted: 1, missed: 0 }), /over 1 logged day,/);
});

test('with no target it says so rather than inventing a range', () => {
  const line = summariseNutrition({ ...base, target: null });
  assert.match(line, /No daily target set\./);
  assert.doesNotMatch(line, /in range/);
});

/* ── when it says nothing ─────────────────────────────────────────────────── */

test('⚠ a week with nothing logged and nothing today gives Holt NOTHING', () => {
  /* "You ate nothing" is a claim the diary cannot support — an empty diary means an unused feature. */
  assert.equal(summariseNutrition({ ...base, counted: 0, missed: 7, todaySoFar: 0 }), null);
  assert.equal(summariseNutrition({ ...base, counted: 0, missed: 7, todaySoFar: null }), null);
});

test('a first day of logging still reaches him, without a phantom average', () => {
  const line = summariseNutrition({ ...base, counted: 0, missed: 6, todaySoFar: 740 });
  assert.match(line, /nothing logged in the last 7 days before today/);
  assert.match(line, /Today so far: 740 cal\./);
});

test('it stays inside the wire ceiling', () => {
  const line = summariseNutrition({ ...base, average: { kcal: 12345, protein: 999, carb: 999, fat: 999 } });
  assert.ok(line.length <= NUTRITION_SUMMARY_CHARS, `${line.length} chars`);
});
