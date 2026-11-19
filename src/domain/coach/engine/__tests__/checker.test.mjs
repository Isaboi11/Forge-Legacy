/**
 * checker.test.mjs — "AI rewrites, the app checks" (PO D12, 2026-11-19). The rewrites below are written the way Holt
 * would return them; the checker decides what may reach the athlete. Checked on the RESULT structure.
 *
 * Run (from the repo root):  node --test --experimental-strip-types src/domain/coach/engine/__tests__/checker.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { canDoExercise } from '../../../home-gym/equipment.ts';
import { plannedDays, totalSessions, trainingDays } from '../../../program/progress-core.ts';
import { assemble } from '../../assemble.ts';
import { checkRewrite } from '../checker.ts';
import { BENJAMIN_KIT, benjaminWorld, catalog } from './fixtures.mjs';

const benjaminAthlete = { experience: 'intermediate', environment: 'home', ownedEquipment: BENJAMIN_KIT, limitations: [] };
const cx = (athlete, race = false) => ({ athlete, catalog: catalog(), canDo: canDoExercise, race });

/** Holt's rewrite, as he'd return it: every remaining week, each session's rows, with his additions. */
function rewriteFrom(structure, fromWeek, edit) {
  const weeks = [];
  for (let w = fromWeek; w < structure.weeks; w += 1) {
    const days = trainingDays(plannedDays(structure, w)).map((d) => ({
      name: d.name,
      rows: d.main.map((e) => (e.kind === 'cardio' ? { key: `cardio-${e.activity}`, miles: e.targetMi ?? undefined, seconds: e.targetSec ?? undefined } : { key: e.catalogKey, sets: e.sets ?? 3, reps: e.reps ?? 10 })),
    }));
    weeks.push({ week: w + 1, days: edit(days, w) });
  }
  return { weeks };
}

test('⭐ Benjamin / P3 — rear delts + core added across his remaining block; trained sessions untouched; kit he lacks dropped and SAID', () => {
  const { active, marks } = benjaminWorld();
  const s = active.structure;
  const rw = rewriteFrom(s, 3, (days) =>
    days.map((d) => {
      if (d.name === 'Pull') return { ...d, rows: [...d.rows, { key: 'cable-face-pull', sets: 3, reps: 15 }, { key: 'hanging-leg-raise', sets: 3, reps: 12 }] };
      if (d.name === 'Upper') return { ...d, rows: [...d.rows, { key: 'cable-rear-delt-fly', sets: 3, reps: 15 }, { key: 'cable-crunch', sets: 3, reps: 12 }] };
      if (d.name === 'Lower') return { ...d, rows: [...d.rows, { key: 'smith-machine-back-squat', sets: 3, reps: 10 }] };
      return d;
    }),
  );
  const r = checkRewrite(s, marks, rw, cx(benjaminAthlete));
  assert.ok(r.ok, r.ok ? '' : r.reason);

  // Weeks 1–3 and week 4's first three sessions (trained) are exactly as they were.
  for (let w = 0; w < 3; w += 1) assert.deepEqual(plannedDays(r.structure, w), plannedDays(s, w));
  for (let d = 0; d < 3; d += 1) assert.deepEqual(trainingDays(plannedDays(r.structure, 3))[d], trainingDays(plannedDays(s, 3))[d]);
  // Later Pull and Upper sessions carry the additions.
  const w6 = trainingDays(plannedDays(r.structure, 5));
  assert.ok(w6.find((d) => d.name === 'Pull').main.some((e) => e.catalogKey === 'cable-face-pull'));
  assert.ok(w6.find((d) => d.name === 'Pull').main.some((e) => e.catalogKey === 'hanging-leg-raise'));
  assert.ok(w6.find((d) => d.name === 'Upper').main.some((e) => e.catalogKey === 'cable-rear-delt-fly'));
  // No leg press at home: dropped, and the reason is kept to be said.
  assert.ok(!w6.find((d) => d.name === 'Lower').main.some((e) => e.catalogKey === 'smith-machine-back-squat'));
  assert.ok(r.dropped.some((d) => /smith/i.test(d.name) && d.why === 'gear'));
  assert.equal(totalSessions(r.structure), totalSessions(s), 'same length');
});

test('a week that came back with a different number of sessions is kept and SAID — fewer days is rest, not deletion', () => {
  const { active, marks } = benjaminWorld();
  const s = active.structure;
  const rw = rewriteFrom(s, 4, (days, w) => (w === 5 ? days.slice(0, 4) : days));
  const r = checkRewrite(s, marks, rw, cx(benjaminAthlete));
  assert.ok(r.ok);
  assert.deepEqual(plannedDays(r.structure, 5), plannedDays(s, 5));
  assert.ok(r.said.some((l) => /kept week 6/.test(l) && /rest day, not a deleted one/.test(l)));
});

test('rest marks: only sessions not yet trained', () => {
  const { active, marks } = benjaminWorld();
  const r = checkRewrite(active.structure, marks, { weeks: [], rest: [{ week: 2, day: 1 }, { week: 6, day: 2 }] }, cx(benjaminAthlete));
  assert.ok(r.ok);
  assert.deepEqual(r.rest, [{ weekIndex: 5, dayIndex: 1 }]);
});

function marathon() {
  const res = assemble(
    { goal: 'run_marathon', experience: { lifting: 'beginner', running: 'intermediate' }, daysPerWeek: 4, sessionMinutes: 60, environment: 'full_gym', ownedEquipment: [], limitations: [], excludeExercises: [], raceInWeeks: 20, currentWeeklyMi: 20 },
    catalog(),
    canDoExercise,
  );
  assert.ok(res.ok);
  return res.assembly.structure;
}
const runner = { experience: 'intermediate', environment: 'full_gym', ownedEquipment: [], limitations: [] };
const miles = (s, w) => trainingDays(plannedDays(s, w)).reduce((t, d) => t + d.main.reduce((u, e) => u + (e.activity === 'run' ? e.targetMi ?? 0 : 0), 0), 0);

test('⛔ running safety: a rewrite that doubles the mileage is held to ~10% over the engine plan, week by week, and SAID', () => {
  const s = marathon();
  const marks = [];
  for (let w = 0; w < 4; w += 1) for (let d = 0; d < 4; d += 1) marks.push({ weekIndex: w, dayIndex: d, state: 'completed' });
  const rw = rewriteFrom(s, 4, (days) => days.map((d) => ({ ...d, rows: d.rows.map((r) => (r.miles ? { ...r, miles: r.miles * 2 } : r)) })));
  const r = checkRewrite(s, marks, rw, cx(runner, true));
  assert.ok(r.ok, r.ok ? '' : r.reason);
  for (let w = 4; w < s.weeks - 1; w += 1) assert.ok(miles(r.structure, w) <= miles(s, w) * 1.1 + 0.6, `week ${w + 1}: ${miles(r.structure, w)} vs plan ${miles(s, w)}`);
  // Training runs cap at 22 mi; race week (the marathon itself) is the plan's, untouched.
  for (let w = 4; w < s.weeks - 1; w += 1) for (const d of trainingDays(plannedDays(r.structure, w))) for (const e of d.main) if (e.activity === 'run') assert.ok((e.targetMi ?? 0) <= 22);
  assert.ok(r.said.some((l) => /eased a few runs back/.test(l)));
  // The week keeps its shape: the long run is still the longest run, and never shorter than the plan's.
  for (let w = 4; w < s.weeks - 1; w += 1) {
    const longOf = (st) => Math.max(...trainingDays(plannedDays(st, w)).flatMap((d) => d.main.map((e) => e.targetMi ?? 0)));
    assert.ok(longOf(r.structure) >= longOf(s), `week ${w + 1}: long run ${longOf(r.structure)} vs plan ${longOf(s)}`);
  }
  assert.deepEqual(plannedDays(r.structure, s.weeks - 1), plannedDays(s, s.weeks - 1), 'race week is never rewritten');
});

test('a rewrite with nothing usable changes nothing', () => {
  const { active, marks } = benjaminWorld();
  const r = checkRewrite(active.structure, marks, { weeks: [] }, cx(benjaminAthlete));
  assert.equal(r.ok, false);
});
