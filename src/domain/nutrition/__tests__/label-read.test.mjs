import test from 'node:test';
import assert from 'node:assert/strict';

import { dvAgrees, readLabel, readNumber, readServing, toRows } from '../label-read.ts';
import { labelServing, servingGrams, toNumber, unitByKey } from '../create-food.ts';

/*
 * ⚠ THESE FIXTURES ARE HAND-BUILT, NOT A REAL VISION DUMP. They follow Vision's documented shape (one
 * observation per text line, box normalised with a top-left origin once the Swift side flips it) and
 * the US 2016 label layout, but the first real iPhone read is the actual test. When one comes back,
 * paste it in here as a fixture — `feedback_test_fixtures_must_be_real_input`.
 */

/** Stack rows down the label. Each row is one string, or several observations on the same line. */
function label(rows, { confidence = 1, h = 0.03 } = {}) {
  const lines = [];
  rows.forEach((row, i) => {
    const parts = Array.isArray(row) ? row : [row];
    parts.forEach((p, j) => {
      const text = typeof p === 'string' ? p : p.text;
      const conf = typeof p === 'string' ? confidence : p.confidence;
      lines.push({ text, confidence: conf, x: 0.05 + j * 0.45, y: 0.05 + i * 0.045, w: 0.4, h });
    });
  });
  return lines;
}

const CEREAL = [
  'Nutrition Facts',
  '8 servings per container',
  ['Serving size', '2/3 cup (55g)'],
  'Amount per serving',
  ['Calories', '230'],
  '% Daily Value*',
  ['Total Fat 8g', '10%'],
  ['Saturated Fat 1g', '5%'],
  'Trans Fat 0g',
  ['Cholesterol 0mg', '0%'],
  ['Sodium 160mg', '7%'],
  ['Total Carbohydrate 37g', '13%'],
  ['Dietary Fiber 4g', '14%'],
  'Total Sugars 12g',
  ['Includes 10g Added Sugars', '20%'],
  'Protein 3g',
  ['Vitamin D 2mcg', '10%'],
  ['Calcium 260mg', '20%'],
  ['Iron 8mg', '45%'],
  ['Potassium 240mg', '6%'],
  '* The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.',
];

test('a clean US label fills every field, confidently', () => {
  const r = readLabel(label(CEREAL));
  const v = Object.fromEntries(Object.entries(r.fields).map(([k, f]) => [k, f.value]));
  assert.deepEqual(v, {
    cal: '230',
    fat: '8',
    satFat: '1',
    cholesterol: '0',
    sodium: '160',
    carb: '37',
    fiber: '4',
    sugar: '12',
    addedSugar: '10',
    protein: '3',
    vitaminD: '2',
    calcium: '260',
    iron: '8',
    potassium: '240',
  });
  assert.deepEqual(r.serving, { amount: '2/3', unitKey: 'cup', unitWeight: '82.5', sure: true });
  assert.equal(r.unsure, 0);
  assert.equal(r.missing, 0);
  assert.equal(r.filled, 15);
  assert.equal(r.outcome, 'scanned');
});

test('the footnote\'s "2,000 calories a day" is never read as calories', () => {
  const rows = CEREAL.filter((row) => !(Array.isArray(row) && row[0] === 'Calories'));
  const r = readLabel(label(rows));
  assert.equal(r.fields.cal, undefined);
});

test('calories printed one row below their word are still found', () => {
  const rows = CEREAL.flatMap((row) => (Array.isArray(row) && row[0] === 'Calories' ? ['Amount per serving Calories', '230'] : [row]));
  assert.equal(readLabel(label(rows)).fields.cal?.value, '230');
});

test('a misread that the %DV contradicts gets a dot — 8g read as 3g against 10%', () => {
  const rows = CEREAL.map((row) => (Array.isArray(row) && row[0] === 'Total Fat 8g' ? ['Total Fat 3g', '10%'] : row));
  const r = readLabel(label(rows));
  assert.equal(r.fields.fat.value, '3');
  assert.equal(r.fields.fat.sure, false);
});

test('a line Vision hedged on is still sure when its %DV agrees', () => {
  const rows = CEREAL.map((row) =>
    Array.isArray(row) && row[0] === 'Sodium 160mg' ? [{ text: 'Sodium 160mg', confidence: 0.5 }, '7%'] : row,
  );
  assert.equal(readLabel(label(rows)).fields.sodium.sure, true);
});

test('a hedged line with no %DV to check it gets a dot', () => {
  const rows = CEREAL.map((row) => (row === 'Protein 3g' ? [{ text: 'Protein 3g', confidence: 0.3 }] : row));
  const r = readLabel(label(rows));
  assert.equal(r.fields.protein.sure, false);
  assert.equal(r.unsure, 1);
});

test('a repaired character gets a dot — "Protein 1O g"', () => {
  const rows = CEREAL.map((row) => (row === 'Protein 3g' ? 'Protein 1Og' : row));
  const r = readLabel(label(rows));
  assert.equal(r.fields.protein.value, '10');
  assert.equal(r.fields.protein.sure, false);
});

test('the label contradicting itself marks the value, never drops it', () => {
  const rows = CEREAL.map((row) => (row === 'Total Sugars 12g' ? 'Total Sugars 52g' : row));
  const r = readLabel(label(rows));
  assert.equal(r.fields.sugar.value, '52');
  assert.equal(r.fields.sugar.sure, false);
});

test('calories the macros cannot explain get a dot', () => {
  const rows = CEREAL.map((row) => (Array.isArray(row) && row[0] === 'Calories' ? ['Calories', '780'] : row));
  assert.equal(readLabel(label(rows)).fields.cal.sure, false);
});

test('"<1g" becomes 0.5, not 1 and not a blank', () => {
  const rows = CEREAL.map((row) => (Array.isArray(row) && row[0] === 'Dietary Fiber 4g' ? ['Dietary Fiber <1g', '2%'] : row));
  assert.equal(readLabel(label(rows)).fields.fiber.value, '0.5');
});

test('"rng" is read as mg — a common misread', () => {
  const rows = CEREAL.map((row) => (Array.isArray(row) && row[0] === 'Sodium 160mg' ? ['Sodium 160rng', '7%'] : row));
  assert.equal(readLabel(label(rows)).fields.sodium.value, '160');
});

test('a sodium row in grams is refused rather than read as milligrams', () => {
  const rows = CEREAL.map((row) => (Array.isArray(row) && row[0] === 'Sodium 160mg' ? ['Sodium 0.16g', '7%'] : row));
  assert.equal(readLabel(label(rows)).fields.sodium, undefined);
});

test('Saturated Fat is not read from the Polyunsaturated row, and Total Fat not from Saturated', () => {
  const rows = ['Serving size 1 tbsp (14g)', 'Calories 120', ['Total Fat 14g', '18%'], 'Polyunsaturated Fat 10g', ['Saturated Fat 2g', '10%']];
  const r = readLabel(label(rows));
  assert.equal(r.fields.fat.value, '14');
  assert.equal(r.fields.satFat.value, '2');
});

test('older labels: vitamin D in IU becomes mcg', () => {
  const r = readLabel(label(['Calories 100', 'Total Fat 1g', 'Vitamin D 400IU']));
  assert.equal(r.fields.vitaminD.value, '10');
});

test('missing values are blanks, and the read says partial', () => {
  const r = readLabel(label(['Serving size 28g', 'Calories 150', 'Total Fat 9g', 'Protein 2g', 'Total Carbohydrate 15g']));
  assert.equal(r.outcome, 'partial');
  assert.equal(r.fields.fiber, undefined);
  assert.equal(r.filled + r.unsure + r.missing, 15);
  assert.equal(r.missing, 10);
});

test('a photo of something else is unreadable', () => {
  assert.equal(readLabel(label(['Ingredients: whole grain oats, sugar, honey', 'Best by 2027'])).outcome, 'unreadable');
  assert.equal(readLabel([]).outcome, 'unreadable');
});

test('rows: a value observation on the same line joins its name, left to right', () => {
  const rows = toRows([
    { text: '10%', confidence: 1, x: 0.8, y: 0.2, w: 0.1, h: 0.03 },
    { text: 'Total Fat 8g', confidence: 0.9, x: 0.05, y: 0.205, w: 0.4, h: 0.03 },
    { text: 'Sodium 160mg', confidence: 1, x: 0.05, y: 0.26, w: 0.4, h: 0.03 },
  ]);
  assert.deepEqual(rows, [
    { text: 'Total Fat 8g 10%', confidence: 0.9 },
    { text: 'Sodium 160mg', confidence: 1 },
  ]);
});

test('numbers: repairs are flagged; words are not numbers', () => {
  assert.deepEqual(readNumber('8'), { n: 8, repaired: false });
  assert.deepEqual(readNumber('o.5'), { n: 0.5, repaired: true });
  assert.deepEqual(readNumber('0,5'), { n: 0.5, repaired: false });
  assert.equal(readNumber('oil'), null);
});

test('%DV agreement tolerates FDA rounding and catches a wrong digit', () => {
  assert.equal(dvAgrees('fat', 8, 10), true);
  assert.equal(dvAgrees('sodium', 160, 7), true);
  assert.equal(dvAgrees('fat', 3, 10), false);
  assert.equal(dvAgrees('sugar', 12, 5), null); // total sugar has no DV
});

test('servings: household measures keep their word, a printed weight is used when there is one', () => {
  assert.deepEqual(readServing('2/3 cup (55g)', true), { amount: '2/3', unitKey: 'cup', unitWeight: '82.5', sure: true });
  assert.deepEqual(readServing('1 cup (240mL)', true), { amount: '240', unitKey: 'ml', unitWeight: '', sure: true });
  assert.deepEqual(readServing('28g', true), { amount: '28', unitKey: 'g', unitWeight: '', sure: true });
  assert.deepEqual(readServing('1 bar (40g)', false), { amount: '1', unitKey: 'piece', unitWeight: '40', sure: false });
  assert.deepEqual(readServing('About 13 chips (28g)', true), { amount: '13', unitKey: 'piece', unitWeight: '2.15', sure: true });
  assert.deepEqual(readServing('2 tbsp (32g)', true), { amount: '2', unitKey: 'tbsp', unitWeight: '16', sure: true });
  assert.deepEqual(readServing('1 1/2 cups', true), { amount: '1 1/2', unitKey: 'cup', unitWeight: '', sure: true });
  assert.deepEqual(readServing('3 crackers', true), null); // a piece with no weight cannot be scaled
});

test('Create Food reads the fraction a scan fills in', () => {
  assert.ok(Math.abs(toNumber('2/3') - 0.6667) < 0.001);
  assert.equal(toNumber('1 1/2'), 1.5);
  assert.equal(toNumber('80'), 80);
  assert.equal(toNumber('3/0'), 0);
  const cup = unitByKey('cup');
  assert.equal(servingGrams('2/3', cup, '82.5'), 55);
  assert.equal(labelServing('2/3', cup, 55).label, '2/3 cup');
  assert.equal(labelServing('2', cup, 480).label, '2 cups');
});
