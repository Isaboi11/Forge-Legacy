import test from 'node:test';
import assert from 'node:assert/strict';

import { aboutMinutes, canRunIntervals, clock, defaultRounds, intervalPlan, planSeconds, timedMoves } from '../interval-plan.ts';

/* PO 2026-09-27: the 40-on / 20-off "15 min Chest & Back Strength", run for you. */

const timed = (name, sec, rest, sets = 1, done = []) => ({
  name,
  kind: 'strength',
  restAfterSec: rest,
  sets: Array.from({ length: sets }, (_, i) => ({ setIndex: i, targetReps: 0, targetSec: sec, done: done.includes(i) })),
});
const lift = (name) => ({ name, kind: 'strength', sets: [{ setIndex: 0, targetReps: 8, done: false }] });
const ride = { name: 'Ride', kind: 'cardio', sets: [{ setIndex: 0, targetReps: 0, targetSec: 1200, done: false }] };

const PO = ['Chest Fly', 'Dumbbell Lat Pull Over', 'T Push Up', 'Wide Grip Bent Over Row', 'Chest Press'].map((n) => timed(n, 40, 20));

test('the PO’s circuit: 40 on, 20 off, five moves, three rounds = 15 minutes', () => {
  const steps = intervalPlan(PO, 3);
  assert.equal(steps.filter((s) => s.kind === 'work').length, 15);
  assert.equal(steps.filter((s) => s.kind === 'rest').length, 14, 'no rest after the very last move');
  assert.equal(planSeconds(steps), 15 * 40 + 14 * 20);
  assert.equal(aboutMinutes(planSeconds(steps)), 'About 15 min');
  assert.deepEqual(steps.slice(0, 3).map((s) => [s.kind, s.name, s.sec, s.next]), [
    ['work', 'Chest Fly', 40, 'Rest'],
    ['rest', 'Rest', 20, 'Dumbbell Lat Pull Over'],
    ['work', 'Dumbbell Lat Pull Over', 40, 'Rest'],
  ]);
  const last = steps[steps.length - 1];
  assert.deepEqual([last.kind, last.name, last.round, last.next], ['work', 'Chest Press', 3, null]);
});

test('round r of a move is its set r', () => {
  const steps = intervalPlan(PO, 2).filter((s) => s.kind === 'work');
  assert.deepEqual(steps.map((s) => [s.ei, s.si, s.round]).slice(4, 6), [[4, 0, 1], [0, 1, 2]]);
});

test('a done set is skipped — a resumed workout picks up where it stopped', () => {
  const half = [timed('A', 30, 10, 2, [0]), timed('B', 30, 10, 2, [0])];
  const steps = intervalPlan(half, 2);
  assert.deepEqual(steps.map((s) => [s.kind, s.name, s.si]), [['work', 'A', 1], ['rest', 'Rest', 1], ['work', 'B', 1]]);
});

test('no rest written → straight through', () => {
  const steps = intervalPlan([timed('A', 30, 0), timed('B', 45, null)], 1);
  assert.deepEqual(steps.map((s) => [s.kind, s.name, s.next]), [['work', 'A', 'B'], ['work', 'B', null]]);
});

test('only timed moves run; lifts and cardio bouts stay on the list', () => {
  const mixed = [lift('Bench'), timed('Plank', 60, 30), ride, timed('Side Plank', 30, 0)];
  assert.deepEqual(timedMoves(mixed), [1, 3]);
  assert.equal(canRunIntervals(mixed), true);
  assert.equal(canRunIntervals([lift('Bench'), timed('Plank', 60, 0)]), false, 'one plank is not a timed workout');
});

test('rounds default to what the workout has, and are capped', () => {
  assert.equal(defaultRounds(PO), 1);
  assert.equal(defaultRounds([timed('A', 30, 0, 3), timed('B', 30, 0, 2)]), 3);
  assert.equal(intervalPlan(PO, 99).filter((s) => s.kind === 'work').length, 50);
});

test('clock text', () => {
  assert.equal(clock(40), '0:40');
  assert.equal(clock(39.2), '0:40', 'a running countdown rounds up, so 0:00 means done');
  assert.equal(clock(725), '12:05');
  assert.equal(clock(-3), '0:00');
});
