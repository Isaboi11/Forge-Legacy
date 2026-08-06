/**
 * svg-color.test.mjs — the alpha survives the trip into `react-native-svg`.
 *
 * The source guard in `svg-gradient-stops.test.mjs` says which shapes are forbidden. This says the
 * replacement is correct: a `.dc`-transcribed rgba string splits into the two props `<Stop>` wants,
 * and everything alpha-free passes through untouched.
 *
 * Run:  node --test --experimental-strip-types src/lib/__tests__/svg-color.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { svgStop } from '../svg-color.ts';

test('an rgba string splits into an alpha-free colour and its alpha', () => {
  // The real one: ScreenBackground's cool apex haze, which was painting as a solid slab on device.
  assert.deepEqual(svgStop('rgba(88,124,160,0.06)'), { color: 'rgb(88,124,160)', opacity: 0.06 });
  // The bronze screen radials, whose `.dc` transcription carries spaces after the commas.
  assert.deepEqual(svgStop('rgba(186, 134, 84,0.05)'), { color: 'rgb(186,134,84)', opacity: 0.05 });
  assert.deepEqual(svgStop('rgba(150,110,60,0.06)'), { color: 'rgb(150,110,60)', opacity: 0.06 });
});

test('an alpha-free colour passes through at full opacity', () => {
  // Safe to wrap around EVERY stop, which is what makes the fix impossible to half-apply.
  assert.deepEqual(svgStop('#BA8654'), { color: '#BA8654', opacity: 1 });
  assert.deepEqual(svgStop('rgb(88,124,160)'), { color: 'rgb(88,124,160)', opacity: 1 });
  assert.deepEqual(svgStop('white'), { color: 'white', opacity: 1 });
});

test('a fully-transparent stop keeps its zero — it is an instruction, not an absence', () => {
  const s = svgStop('rgba(0,0,0,0)');
  assert.equal(s.opacity, 0, 'a 0 alpha coerced to 1 would paint the very slab this module prevents');
});

test('an unparseable or out-of-range alpha fails toward the colour the author wrote', () => {
  // Never a blank gradient: the wrong-but-visible failure is investigable, an invisible one is not.
  assert.deepEqual(svgStop('rgba(1,2,3,abc)'), { color: 'rgba(1,2,3,abc)', opacity: 1 });
  assert.equal(svgStop('rgba(1,2,3,1.5)').opacity, 1, 'clamped — a hand-transcribed .dc can say 1.5');
  assert.deepEqual(svgStop(''), { color: '', opacity: 1 });
});

test('alpha is read exactly, not rounded to something visible', () => {
  // 0.06 must stay 0.06. The whole defect was a 6% haze arriving as 100%.
  assert.equal(svgStop('rgba(88,124,160,0.06)').opacity, 0.06);
  assert.notEqual(svgStop('rgba(88,124,160,0.06)').opacity, 1);
});
