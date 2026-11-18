import test from 'node:test';
import assert from 'node:assert/strict';

import { isShortWords, prHighlight, topSetIn } from '../feed-highlights.ts';

/** PO 2026-11-18: each post should say why it mattered — a record line — and a few words should not be a footnote. */

const ex = (name, topSet, isPR) => ({ name, topSet, isPR });

test('no record, no line - a session is never dressed up as one', () => {
  assert.equal(prHighlight([ex('Bench Press', '225 lb × 5', false)], 'imperial'), null);
  assert.equal(prHighlight([], 'imperial'), null);
});

test('one record names the lift and the set', () => {
  assert.equal(prHighlight([ex('Squat', '315 lb × 3', false), ex('Bench Press', '225 lb × 5', true)], 'imperial'), 'New best · Bench Press, 225 lb × 5');
});

test('several records name the first and count the rest', () => {
  const xs = [ex('Bench Press', '225 lb × 5', true), ex('Row', '185 lb × 8', true), ex('Dip', 'BW × 12', true)];
  assert.equal(prHighlight(xs, 'imperial'), '3 new bests · Bench Press, 225 lb × 5 and 2 more');
  assert.equal(prHighlight(xs.slice(0, 2), 'imperial'), '2 new bests · Bench Press, 225 lb × 5 and 1 more');
});

test('a metric viewer reads the set in kilograms - the snapshot is pounds', () => {
  assert.equal(topSetIn('225 lb × 5', 'metric'), '102 kg × 5');
  assert.equal(prHighlight([ex('Bench Press', '225 lb × 5', true)], 'metric'), 'New best · Bench Press, 102 kg × 5');
});

test('bodyweight and cardio sets pass through, and a record with no set still names the lift', () => {
  assert.equal(topSetIn('BW × 12', 'metric'), 'BW × 12');
  assert.equal(prHighlight([ex('Run', null, true)], 'imperial'), 'New best · Run');
});

test('a few words are short; a paragraph is not', () => {
  assert.equal(isShortWords('@Moses Ruiz In da house!!!'), true);
  assert.equal(isShortWords('The one and only @Dallas Mosher has joined the squad! Stoked to have you here!'), true);
  assert.equal(isShortWords('x'.repeat(121)), false);
  assert.equal(isShortWords('a\nb\nc\nd'), false);
  assert.equal(isShortWords('   '), false);
  assert.equal(isShortWords(null), false);
});
