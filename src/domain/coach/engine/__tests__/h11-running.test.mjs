/**
 * h11-running.test.mjs — PO scenario P2 (2026-11-19): a marathon block, halfway through: "I'm really sore. Less miles,
 * less running, more rest days." Checked on the RESULT — the structure that would be saved and the rest marks.
 *
 * Run (from the repo root):  node --test --experimental-strip-types src/domain/coach/engine/__tests__/h11-running.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { canDoExercise } from '../../../home-gym/equipment.ts';
import { plannedDays, totalSessions, trainingDays } from '../../../program/progress-core.ts';
import { assemble } from '../../assemble.ts';
import { planRunningChange } from '../change-running.ts';
import { catalog } from './fixtures.mjs';

/** The PO's marathon, built by the app's own engine: 20 weeks out, four days a week, a 20-mile base. */
function marathon() {
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
    },
    catalog(),
    canDoExercise,
  );
  assert.ok(res.ok, res.ok ? '' : res.refusal.message);
  return res.assembly.structure;
}

/** Halfway: weeks 1–8 trained. */
const halfway = (s) => {
  const marks = [];
  for (let w = 0; w < 8; w += 1) for (let d = 0; d < s.daysPerWeek; d += 1) marks.push({ weekIndex: w, dayIndex: d, state: 'completed', workoutId: null });
  return marks;
};
const miles = (s, w) => trainingDays(plannedDays(s, w)).reduce((t, d) => t + d.main.filter((e) => e.activity === 'run').reduce((u, e) => u + (e.targetMi ?? 0), 0), 0);

test('⭐ P2 — "less miles, less running, more rest days" halfway through a marathon block', () => {
  const s = marathon();
  const marks = halfway(s);
  const last = s.weeks - 1;
  const r = planRunningChange(s, marks, { runVolume: { direction: 'less', amount: 'a_little' }, restDays: 1 });
  assert.ok(r.ok, r.ok ? '' : r.message);

  // Mileage down from the next session on…
  for (let w = 8; w < last; w += 1) assert.ok(miles(r.structure, w) < miles(s, w), `week ${w + 1} has less running`);
  // …trained weeks and race week exactly as they were.
  for (let w = 0; w < 8; w += 1) assert.deepEqual(plannedDays(r.structure, w), plannedDays(s, w), `week ${w + 1} (trained) untouched`);
  assert.deepEqual(plannedDays(r.structure, last), plannedDays(s, last), 'race week untouched');
  // The program is the same length — the database's own guard would refuse anything else.
  assert.equal(totalSessions(r.structure), totalSessions(s));

  // One easy run a week becomes rest (a mark), never the long run.
  const restWeeks = new Set(r.rest.map((x) => x.weekIndex));
  assert.equal(restWeeks.size, last - 8, 'one rest day in every remaining week before race week');
  for (const x of r.rest) {
    const days = trainingDays(plannedDays(s, x.weekIndex));
    const longest = Math.max(...days.map((d) => d.main.reduce((t, e) => t + (e.targetMi ?? 0), 0)));
    const thisOne = days[x.dayIndex].main.reduce((t, e) => t + (e.targetMi ?? 0), 0);
    assert.ok(thisOne < longest, `week ${x.weekIndex + 1}: the rest day is an easy run, not the long run`);
  }
  assert.ok(r.lines.some((l) => /Running down about 15% from week 9/.test(l)));
  assert.ok(r.lines.some((l) => /becomes a rest day/.test(l)));
  assert.ok(r.lines.includes('Race week stays exactly as planned.'));
});

test('"a lot less" is a bigger cut; distances never drop under a mile', () => {
  const s = marathon();
  const little = planRunningChange(s, halfway(s), { runVolume: { direction: 'less', amount: 'a_little' } });
  const lot = planRunningChange(s, halfway(s), { runVolume: { direction: 'less', amount: 'a_lot' } });
  assert.ok(little.ok && lot.ok);
  assert.ok(miles(lot.structure, 10) < miles(little.structure, 10));
  for (let w = 8; w < s.weeks; w += 1)
    for (const d of trainingDays(plannedDays(lot.structure, w))) for (const e of d.main) if (e.activity === 'run') assert.ok((e.targetMi ?? 1) >= 1);
});

test('PO P1/HL-15 seed: one easy run a week becomes an easy bike ride of about the same time', () => {
  const s = marathon();
  const r = planRunningChange(s, halfway(s), { runToBike: 1 });
  assert.ok(r.ok);
  const wk = trainingDays(plannedDays(r.structure, 10));
  const bikes = wk.filter((d) => d.main.some((e) => e.activity === 'bike'));
  assert.equal(bikes.length, 1);
  assert.ok(bikes[0].main[0].targetSec >= 20 * 60, 'minutes, from the engine');
  assert.equal(totalSessions(r.structure), totalSessions(s));
});

test('never leaves fewer than two runs a week, and refuses in race week', () => {
  const s = marathon();
  const r = planRunningChange(s, halfway(s), { restDays: 2, runToBike: 2 });
  assert.ok(r.ok);
  for (let w = 8; w < s.weeks - 1; w += 1) {
    const runs = trainingDays(plannedDays(r.structure, w)).filter((d) => d.main.some((e) => e.activity === 'run')).length;
    const rested = r.rest.filter((x) => x.weekIndex === w).length;
    assert.ok(runs - rested >= 2, `week ${w + 1} keeps two runs`);
  }
  const marks = [];
  for (let w = 0; w < s.weeks - 1; w += 1) for (let d = 0; d < s.daysPerWeek; d += 1) marks.push({ weekIndex: w, dayIndex: d, state: 'completed' });
  const late = planRunningChange(s, marks, { runVolume: { direction: 'less' } });
  assert.equal(late.ok, false);
});
