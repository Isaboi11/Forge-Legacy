import test from 'node:test';
import assert from 'node:assert/strict';

import {
  WELCOME_BACK_COPY,
  breakKey,
  builtLine,
  isBreak,
  isFirstSessionBack,
  shouldWelcomeBack,
} from '../welcome-back.ts';

const NOW = new Date('2026-03-16T08:00:00Z');
const daysBefore = (n, hours = 0) => new Date(NOW.getTime() - (n * 24 + hours) * 3600_000).toISOString();

test('a break is 7 or more days, measured from the last saved workout', () => {
  assert.equal(isBreak(daysBefore(7), NOW), true);
  assert.equal(isBreak(daysBefore(10), NOW), true);
  assert.equal(isBreak(daysBefore(6, 23), NOW), false);
  assert.equal(isBreak(daysBefore(1), NOW), false);
});

test('unparseable dates are never a break', () => {
  assert.equal(isBreak('not a date', NOW), false);
});

test('greets someone back after a missed week', () => {
  assert.equal(shouldWelcomeBack({ lastWorkoutAt: daysBefore(10), now: NOW, dismissedBreak: null }), true);
});

test('never greets a brand-new account: nothing to come back to', () => {
  assert.equal(shouldWelcomeBack({ lastWorkoutAt: null, now: NOW, dismissedBreak: null }), false);
});

test('not after a short gap', () => {
  assert.equal(shouldWelcomeBack({ lastWorkoutAt: daysBefore(3), now: NOW, dismissedBreak: null }), false);
});

test('not while a workout is in progress — they are already back', () => {
  assert.equal(shouldWelcomeBack({ lastWorkoutAt: daysBefore(10), now: NOW, dismissedBreak: null, inProgress: true }), false);
});

test('once per break: closing it ends THIS break, and the next break greets again', () => {
  const last = daysBefore(10);
  assert.equal(shouldWelcomeBack({ lastWorkoutAt: last, now: NOW, dismissedBreak: breakKey(last) }), false);
  const nextBreak = daysBefore(9);
  assert.equal(shouldWelcomeBack({ lastWorkoutAt: nextBreak, now: NOW, dismissedBreak: breakKey(last) }), true);
});

test('logging a workout ends the break: the newest workout is recent again', () => {
  assert.equal(shouldWelcomeBack({ lastWorkoutAt: daysBefore(0, 1), now: NOW, dismissedBreak: null }), false);
});

test('first session back: the workout before this one was 7+ days earlier', () => {
  const thisOne = NOW.toISOString();
  assert.equal(isFirstSessionBack(daysBefore(8), thisOne), true);
  assert.equal(isFirstSessionBack(daysBefore(2), thisOne), false);
  assert.equal(isFirstSessionBack(null, thisOne), false, 'a first-ever workout is not a comeback');
});

test('the copy never counts days away', () => {
  const all = [WELCOME_BACK_COPY.eyebrow, WELCOME_BACK_COPY.title('Jordan'), WELCOME_BACK_COPY.body, WELCOME_BACK_COPY.firstSessionBack].join(' ');
  assert.doesNotMatch(all, /\d/);
  assert.doesNotMatch(all, /days?|since|streak|missed/i);
});

test('greets by first name when known, plainly when not', () => {
  assert.equal(WELCOME_BACK_COPY.title('Jordan'), 'Good to see you, Jordan.');
  assert.equal(WELCOME_BACK_COPY.title(null), 'Good to see you.');
});

test('the built line shows only what exists', () => {
  assert.equal(builtLine('Builder II', 31, 4), 'Builder II · 31 workouts · 4 honors');
  assert.equal(builtLine('Builder II', 1, 1), 'Builder II · 1 workout · 1 honor');
  assert.equal(builtLine(null, 12, 0), '12 workouts');
  assert.equal(builtLine('Foundation I', 0, 0), 'Foundation I');
});
