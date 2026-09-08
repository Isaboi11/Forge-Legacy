/**
 * milestone-card.test.mjs — the guard that keeps four shapes apart in one untyped jsonb column, and the
 * rule that a rank nobody held is never printed.
 *
 * `squad_posts.layout` now holds FOUR things (0045 transformation · progress card · 0192 posted workout ·
 * milestone card) discriminated only by a `kind` string, and `asTransformationLayout` reads "anything
 * without a known kind is a transformation". That makes `isMilestoneCard` load-bearing in both
 * directions: too loose and a comparison post is drawn as a rank ascension, too strict and a real
 * ascension falls through and is drawn as a photo comparison with no photos.
 *
 * Run:  node --test src/domain/share/__tests__/milestone-card.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { isMilestoneCard, milestoneAckLabel, milestoneLabel, milestoneTransition } from '../milestone-card.ts';

const RANK_UP = {
  kind: 'milestone-card',
  event: 'rank',
  eyebrow: 'Rank Ascended',
  headline: 'Builder I',
  line: 'I’m building habits.',
  rank: { family: 'builder', level: 1, label: 'Builder I' },
  previous: { family: 'foundation', level: 4, label: 'Foundation IV' },
  date: 'Sep 7, 2026',
};

test('a milestone card is recognised', () => {
  assert.equal(isMilestoneCard(RANK_UP), true);
  // The three non-rank ceremonies carry no seal and must still pass — the card is typographic, not absent.
  assert.equal(isMilestoneCard({ ...RANK_UP, event: 'honor', rank: null, previous: null }), true);
});

test('the other three shapes in the same column are NOT milestone cards', () => {
  // 0045 progress card.
  assert.equal(isMilestoneCard({ kind: 'progress-card', format: '4x5', style: 'grid', photos: [] }), false);
  // 0192 posted workout.
  assert.equal(isMilestoneCard({ kind: 'posted-workout', name: 'Squatober D3', exercises: [] }), false);
  // A transformation layout — every row written before `kind` existed has none at all.
  assert.equal(isMilestoneCard({ template: 'slider', pairs: [] }), false);
  assert.equal(isMilestoneCard(null), false);
  assert.equal(isMilestoneCard(undefined), false);
});

test('the tag alone is not enough — the guard is structural', () => {
  // Same reason `isProgressCard` also asks for an array and `isPostedWorkout` does too: a blob that
  // merely carries the right string must not be handed to a renderer that will read fields it lacks.
  assert.equal(isMilestoneCard({ kind: 'milestone-card' }), false);
  assert.equal(isMilestoneCard({ kind: 'milestone-card', headline: '' }), false);
  assert.equal(isMilestoneCard({ kind: 'milestone-card', headline: 42 }), false);
});

test('the transition reads from → to', () => {
  assert.equal(milestoneTransition(RANK_UP), 'Foundation IV → Builder I');
});

test('⚠ no previous rank means NO transition — never a Foundation I nobody held', () => {
  assert.equal(milestoneTransition({ ...RANK_UP, previous: null }), null);
  assert.equal(milestoneTransition({ ...RANK_UP, previous: undefined }), null);
  // A non-rank ceremony has neither half, and must not synthesise one from the headline.
  assert.equal(milestoneTransition({ ...RANK_UP, event: 'honor', rank: null, previous: null }), null);
});

test('only a rank renames the acknowledge control', () => {
  assert.equal(milestoneAckLabel(RANK_UP), 'Acknowledge the Ascension');
  // Null, not a templated "Acknowledge the Honor" — the caller leaves the control alone.
  for (const event of ['honor', 'goal', 'program']) {
    assert.equal(milestoneAckLabel({ ...RANK_UP, event }), null, event);
  }
});

test('the band says something to a screen reader', () => {
  const said = milestoneLabel(RANK_UP);
  assert.match(said, /Rank Ascended/);
  assert.match(said, /Builder I/);
  assert.match(said, /from Foundation IV/);
  assert.match(said, /Sep 7, 2026/);
});

test('an omitted field is omitted from the label, not rendered as a gap', () => {
  const said = milestoneLabel({ ...RANK_UP, previous: null, line: null });
  assert.ok(!said.includes('from '), said);
  assert.ok(!said.includes('..'), said);
  assert.match(said, /^Rank Ascended\. Builder I\. Sep 7, 2026$/);
});
