import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isMacroShown,
  MACRO_KEYS,
  macroRowInset,
  sanitizeHiddenMacros,
  setMacroShown,
  shownMacros,
} from '../macro-display.ts';
import { homeNutritionView } from '../home-card.ts';

/* Nutrition-Architecture-Amendment-007 (PO 2026-11-16): show only the macros you want. Calories always show. */

test('absence shows all three, in the one order', () => {
  assert.deepEqual(shownMacros([]), ['protein', 'carb', 'fat']);
  assert.deepEqual(shownMacros(sanitizeHiddenMacros(undefined)), MACRO_KEYS);
  assert.deepEqual(shownMacros(sanitizeHiddenMacros(null)), MACRO_KEYS);
});

test('the hidden list is sanitised: known keys, once, canonical order', () => {
  assert.deepEqual(sanitizeHiddenMacros(['fat', 'protein', 'fat', 'sugar', null]), ['protein', 'fat']);
  assert.deepEqual(sanitizeHiddenMacros({ carb: true }), []);
});

test('calories-only is allowed: all three can be off', () => {
  assert.deepEqual(shownMacros(['protein', 'carb', 'fat']), []);
});

test('flipping a switch', () => {
  assert.deepEqual(setMacroShown([], 'carb', false), ['carb']);
  assert.deepEqual(setMacroShown(['carb'], 'fat', false), ['carb', 'fat']);
  assert.deepEqual(setMacroShown(['fat', 'carb'], 'protein', false), ['protein', 'carb', 'fat']);
  assert.deepEqual(setMacroShown(['carb', 'fat'], 'carb', true), ['fat']);
  // Idempotent both ways.
  assert.deepEqual(setMacroShown(['carb'], 'carb', false), ['carb']);
  assert.deepEqual(setMacroShown([], 'carb', true), []);
  assert.equal(isMacroShown(['carb'], 'carb'), false);
  assert.equal(isMacroShown(['carb'], 'protein'), true);
});

test('one or two rings keep their three-up width, centred', () => {
  assert.equal(macroRowInset(3), '0%');
  assert.equal(macroRowInset(2), '16.667%');
  assert.equal(macroRowInset(1), '33.333%');
});

const eaten = { kcal: 1200, protein: 90, carb: 120, fat: 40 };
const target = { kcal: 2400, protein: 180, carb: 250, fat: 70 };

test('Home card: shows only the chosen macros, in order', () => {
  const v = homeNutritionView(eaten, true, target, ['protein', 'fat']);
  assert.deepEqual(v.macros.map((m) => m.key), ['protein', 'fat']);
  assert.ok(!v.a11y.includes('Carbs'));
  assert.ok(v.a11y.includes('Protein 90 of 180 grams'));
});

test('Home card: every macro still shows when nothing is passed (old callers)', () => {
  assert.deepEqual(homeNutritionView(eaten, true, target).macros.map((m) => m.key), ['protein', 'carb', 'fat']);
});

test('Home card: calories only', () => {
  const v = homeNutritionView(eaten, true, target, []);
  assert.deepEqual(v.macros, []);
  assert.equal(v.kcal, '1,200');
  assert.ok(!/gram/.test(v.a11y));
});

test('Home card: nothing logged yet never names a hidden protein target', () => {
  const v = homeNutritionView({ kcal: 0, protein: 0, carb: 0, fat: 0 }, false, target, ['carb']);
  assert.deepEqual(v.macros.map((m) => m.key), ['carb']);
  assert.ok(!v.a11y.includes('protein'));
  assert.ok(v.a11y.includes('250 grams of carbs'));
});

test('Home card: no target, macros filtered too', () => {
  const v = homeNutritionView(eaten, true, null, ['fat']);
  assert.deepEqual(v.macros.map((m) => m.key), ['fat']);
});
