/**
 * HL-15 — biking in a race plan (PO voice dump, 2026-11-19: "I'm running a marathon in April… I want running in it
 * and I also want biking in it"). Holt's chat fills `crossTrain: 'bike'`; the rulebook swaps one easy run a week for
 * an easy ride. The long run, the quality sessions and race week never move.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { canDoExercise } from '../../../home-gym/equipment.ts';
import { plannedDays, trainingDays } from '../../../program/progress-core.ts';
import { assemble } from '../../assemble.ts';
import { planHoltActions } from '../../ask-outcome.ts';
import { withCrossTraining } from '../../rulebook/endurance.ts';
import { catalog } from './fixtures.mjs';

const marathon = (extra = {}, base = {}) => {
  const res = assemble(
    {
      goal: 'run_marathon',
      experience: { lifting: 'beginner', running: 'intermediate' },
      daysPerWeek: 4,
      sessionMinutes: 60,
      environment: 'full_gym',
      ownedEquipment: [],
      limitations: [],
      excludeExercises: [],
      raceInWeeks: 20,
      currentWeeklyMi: 20,
      ...base,
      ...extra,
    },
    catalog(),
    canDoExercise,
  );
  assert.ok(res.ok, res.ok ? '' : res.refusal.message);
  return res.assembly.structure;
};
const rows = (s, w) => trainingDays(plannedDays(s, w)).flatMap((d) => d.main);
const rides = (s, w) => rows(s, w).filter((e) => e.activity === 'bike').length;
const longRun = (s, w) => trainingDays(plannedDays(s, w)).find((d) => d.name === 'Long Run')?.main[0].targetMi;

test('one easy run a week becomes an easy ride; race week is left as it is', () => {
  const plain = marathon();
  const bike = marathon({ crossTrain: 'bike' });
  const last = bike.weeks - 1;
  for (let w = 0; w < last; w++) {
    assert.equal(rides(bike, w), 1, `week ${w + 1} has one ride`);
    assert.equal(rides(plain, w), 0);
    assert.equal(longRun(bike, w), longRun(plain, w), `week ${w + 1}: the long run did not move`);
    assert.equal(trainingDays(plannedDays(bike, w)).length, trainingDays(plannedDays(plain, w)).length, 'same number of days');
  }
  assert.equal(rides(bike, last), 0, 'race week keeps its runs');
  assert.deepEqual(rows(bike, last), rows(plain, last));
});

test('a beginner who cannot run yet swaps a shorter run/walk, never the longest', () => {
  const s = marathon({ crossTrain: 'bike' }, { experience: { lifting: 'beginner', running: 'beginner' }, currentWeeklyMi: 0, daysPerWeek: 4, buildAnyway: true });
  const week = trainingDays(plannedDays(s, 0));
  assert.equal(week.filter((d) => d.main.some((e) => e.activity === 'bike')).length, 1);
  assert.ok(!week[week.length - 1].main.some((e) => e.activity === 'bike'), 'the longest session is still a run/walk');
});

test('the rule itself: quality and long sessions never swap; under three sessions nothing does', () => {
  assert.deepEqual(withCrossTraining(['tempo', 'easy', 'easy', 'long'], 'bike', false), ['tempo', 'cross_bike', 'easy', 'long']);
  assert.deepEqual(withCrossTraining(['tempo', 'intervals', 'long'], 'bike', false), ['tempo', 'intervals', 'long']);
  assert.deepEqual(withCrossTraining(['easy', 'long'], 'bike', false), ['easy', 'long']);
  assert.deepEqual(withCrossTraining(['easy', 'easy', 'long'], 'bike', true), ['easy', 'easy', 'long']);
  assert.deepEqual(withCrossTraining(['easy', 'easy', 'long'], null, false), ['easy', 'easy', 'long']);
});

test('Holt’s propose_program carries crossTrain: bike through to the build; anything else is dropped', () => {
  const plan = (input) => planHoltActions([{ name: 'propose_program', input }], { clean: true, todayISO: '2026-11-19', building: false });
  const yes = plan({ goal: 'run_marathon', crossTrain: 'bike' });
  assert.equal(yes.steps[0].kind, 'patch');
  assert.equal(yes.steps[0].patch.crossTrain, 'bike');
  const no = plan({ goal: 'run_marathon', crossTrain: 'rowing' });
  assert.equal(no.steps[0].patch.crossTrain, undefined);
});
