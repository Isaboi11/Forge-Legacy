import { test } from 'node:test';
import assert from 'node:assert/strict';
import { articleFor, withArticle } from '../article.ts';
import { nameNearLimit, PROGRAM_NAME_MAX, WORKOUT_NAME_MAX } from '../name-limits.ts';

test('a/an by sound (programs-18: "Add a elliptical")', () => {
  assert.equal(withArticle('elliptical'), 'an elliptical');
  assert.equal(withArticle('run'), 'a run');
  assert.equal(withArticle('outdoor ride'), 'an outdoor ride');
  assert.equal(articleFor('unilateral row'), 'a');
  assert.equal(articleFor('hour-long ride'), 'an');
});

test('one cap per kind of name, and the count shows only near it (library-23)', () => {
  assert.equal(PROGRAM_NAME_MAX, 40);
  assert.equal(WORKOUT_NAME_MAX, 60);
  assert.equal(nameNearLimit(5, WORKOUT_NAME_MAX), false);
  assert.equal(nameNearLimit(50, WORKOUT_NAME_MAX), true);
  assert.equal(nameNearLimit(40, PROGRAM_NAME_MAX), true);
});
