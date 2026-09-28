import test from 'node:test';
import assert from 'node:assert/strict';

import { attachChoices, attachErrorLine, attachKind } from '../attach-intent.ts';

/* PO 2026-09-27: "paste a picture at any time and tell him to add it as a program, template, recipe". */

test('the athlete’s own word decides', () => {
  assert.equal(attachKind('add this as a recipe'), 'recipe');
  assert.equal(attachKind('save this as a template'), 'template');
  assert.equal(attachKind('make this my program'), 'program');
  assert.equal(attachKind('Add as a programme please'), 'program');
});

test('explicit nouns beat hints', () => {
  assert.equal(attachKind('recipe for my dinner plan'), 'recipe');
  assert.equal(attachKind('template for leg day of my split'), 'template');
  assert.equal(attachKind('program with one workout a day'), 'program');
});

test('hints: food, then a plan, then one session', () => {
  assert.equal(attachKind('add this to my meals'), 'recipe');
  assert.equal(attachKind('meal plan for the week'), 'recipe', 'meal plan is food');
  assert.equal(attachKind('my coach’s 8 week plan'), 'program');
  assert.equal(attachKind('workout plan'), 'program', 'a workout PLAN is a program');
  assert.equal(attachKind('save today’s workout'), 'template');
  assert.equal(attachKind('leg day'), 'template');
});

test('no word, no guess — Holt asks', () => {
  assert.equal(attachKind(''), null);
  assert.equal(attachKind('   '), null);
  assert.equal(attachKind('add this'), null);
  assert.equal(attachKind('what do you think?'), null);
  assert.equal(attachKind('programming'), null, 'a word that only CONTAINS a noun does not count');
});

test('the recipe chip only appears with Nutrition', () => {
  assert.deepEqual(attachChoices(true).map((c) => c.kind), ['program', 'template', 'recipe']);
  assert.deepEqual(attachChoices(false).map((c) => c.kind), ['program', 'template']);
});

test('a failed read names what was asked for', () => {
  assert.match(attachErrorLine('recipe', 'not_a_recipe'), /doesn’t look like a recipe/);
  assert.match(attachErrorLine('template', 'not_a_program'), /doesn’t look like a workout/);
  assert.match(attachErrorLine('program', 'not_a_program'), /training program/);
  assert.match(attachErrorLine('program', 'out_of_credits'), /credits/);
  assert.match(attachErrorLine('recipe', 'weird_new_kind'), /connection/, 'an unknown failure reads as a connection problem');
});
