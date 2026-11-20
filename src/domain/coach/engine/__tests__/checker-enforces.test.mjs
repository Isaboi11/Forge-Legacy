/**
 * checker-enforces.test.mjs — AI re-audit 2026-11-20: the checker ENFORCES what it used to only measure. Each test is
 * one of the reviewers' probes, replayed through the real `checkRewrite` (and `isRacePlan`).
 *
 * Run (from the repo root):  node --test --experimental-strip-types src/domain/coach/engine/__tests__/checker-enforces.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { canDoExercise } from '../../../home-gym/equipment.ts';
import { plannedDays, trainingDays } from '../../../program/progress-core.ts';
import { assemble } from '../../assemble.ts';
import { checkRewrite } from '../checker.ts';
import { typedOverCeiling } from '../../typed-block.ts';
import { isRacePlan } from '../change.ts';
import { benjaminWorld, BENJAMIN_KIT, catalog } from './fixtures.mjs';

const runner = { experience: 'intermediate', environment: 'full_gym', ownedEquipment: [], limitations: [] };
const benjamin = { experience: 'intermediate', environment: 'home', ownedEquipment: BENJAMIN_KIT, limitations: [] };
const cx = (athlete, extra = {}) => ({ athlete, catalog: catalog(), canDo: canDoExercise, ...extra });

function plan(goal, extra = {}) {
  const res = assemble(
    { goal, experience: { lifting: 'beginner', running: 'intermediate' }, daysPerWeek: 4, sessionMinutes: 60, environment: 'full_gym', ownedEquipment: [], limitations: [], excludeExercises: [], raceInWeeks: 12, currentWeeklyMi: 20, ...extra },
    catalog(),
    canDoExercise,
  );
  assert.ok(res.ok);
  return res.assembly.structure;
}
const doneThrough = (weeks, days = 4) => {
  const marks = [];
  for (let w = 0; w < weeks; w += 1) for (let d = 0; d < days; d += 1) marks.push({ weekIndex: w, dayIndex: d, state: 'completed' });
  return marks;
};
/** Running in a week, a timed run at 10 min a mile — the checker's own count. */
const runEq = (s, w) => trainingDays(plannedDays(s, w)).reduce((t, d) => t + d.main.reduce((u, e) => u + (e.activity === 'run' ? e.targetMi ?? (e.targetSec ?? 0) / 600 : 0), 0), 0);

/** Holt's rewrite of every remaining week: each session's rows as they are, then `edit`. */
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

test('⛔ an extra 20-mile run appended to every run day is held to the week cap (probe: 18.7 → 98.7 mi, accepted)', () => {
  const s = plan('run_marathon', { raceInWeeks: 20 });
  const marks = doneThrough(4);
  const rw = rewriteFrom(s, 4, (days) => days.map((d) => (d.rows.some((r) => r.key === 'cardio-run') ? { ...d, rows: [...d.rows, { key: 'cardio-run', miles: 20 }] } : d)));
  const r = checkRewrite(s, marks, rw, cx(runner, { race: true }));
  assert.ok(r.ok, r.ok ? '' : r.reason);
  for (let w = 4; w < s.weeks - 1; w += 1) {
    assert.ok(runEq(r.structure, w) <= runEq(s, w) * 1.1 + 0.6, `week ${w + 1}: ${runEq(r.structure, w).toFixed(1)} vs plan ${runEq(s, w).toFixed(1)}`);
  }
  assert.ok(r.said.some((l) => /eased a few runs back/.test(l)));
});

test('⛔ asking again and again cannot ratchet a week up (probe: +56% over five asks)', () => {
  let s = plan('run_marathon', { raceInWeeks: 20 });
  const marks = doneThrough(4);
  const start = runEq(s, 6);
  for (let i = 0; i < 5; i += 1) {
    const r = checkRewrite(s, marks, rewriteFrom(s, 4, (days) => days.map((d) => ({ ...d, rows: d.rows.map((x) => (x.miles ? { ...x, miles: x.miles * 1.5 } : x)) }))), cx(runner, { race: true }));
    assert.ok(r.ok, r.ok ? '' : r.reason);
    s = r.structure;
  }
  assert.ok(runEq(s, 6) <= start * 1.1 + 0.6, `week 7 after five asks: ${runEq(s, 6).toFixed(1)} vs ${start.toFixed(1)} at the start`);
});

test('⛔ a 5K plan\'s race week is a race week (probe: 8.3 → 27 mi, accepted) — and it is never rewritten', () => {
  const s = plan('run_5k');
  assert.equal(isRacePlan(s), true);
  const last = s.weeks - 1;
  const rw = rewriteFrom(s, 2, (days) => days.map((d) => ({ ...d, rows: d.rows.map((x) => (x.miles ? { ...x, miles: x.miles * 3 } : x)) })));
  const r = checkRewrite(s, doneThrough(2), rw, cx(runner, { race: isRacePlan(s) }));
  assert.ok(r.ok, r.ok ? '' : r.reason);
  assert.deepEqual(plannedDays(r.structure, last), plannedDays(s, last), 'race week untouched');
});

test('⛔ a muscle\'s weekly ceiling is ENFORCED: 36 chest sets a session is trimmed back, and SAID (probe: 144 chest sets a week, nothing said)', () => {
  const { active, marks } = benjaminWorld();
  const s = active.structure;
  const chest = ['barbell-bench-press', 'dumbbell-bench-press', 'incline-dumbbell-bench-press', 'dumbbell-fly', 'push-up', 'dip'];
  const known = new Set(catalog().map((c) => c.key));
  const rows = chest.filter((k) => known.has(k)).map((key) => ({ key, sets: 6, reps: 10 }));
  assert.ok(rows.length >= 3, 'the fixture catalogue has chest movements');
  const rw = rewriteFrom(s, 3, (days) => days.map((d) => ({ ...d, rows })));
  const r = checkRewrite(s, marks, rw, cx(benjamin, { goal: 'muscle' }));
  assert.ok(r.ok, r.ok ? '' : r.reason);
  // Week 5 on is wholly ahead of him (week 4 is part-trained): every week inside the ceilings.
  const byKey = new Map(catalog().map((c) => [c.key, c]));
  for (let w = 4; w < s.weeks; w += 1) {
    const over = typedOverCeiling(trainingDays(plannedDays(r.structure, w)), 'muscle', 'intermediate', (k) => byKey.get(k));
    assert.deepEqual(over, [], `week ${w + 1}`);
  }
  assert.ok(r.said.some((l) => /trimmed some sets of/.test(l) && /chest/.test(l)), r.said.join(' | '));
});

test('⛔ no goal known: no weekly ceiling, but the SESSION envelope still holds', () => {
  const { active, marks } = benjaminWorld();
  const s = active.structure;
  const keys = catalog().filter((c) => c.modality !== 'Mobility' && c.modality !== 'Cardio' && canDoExercise(c, BENJAMIN_KIT)).slice(0, 12).map((c) => c.key);
  const rw = rewriteFrom(s, 3, (days) => days.map((d) => ({ ...d, rows: keys.map((key) => ({ key, sets: 6, reps: 10 })) })));
  const r = checkRewrite(s, marks, rw, cx(benjamin));
  assert.ok(r.ok, r.ok ? '' : r.reason);
  for (const d of trainingDays(plannedDays(r.structure, 3))) {
    const sets = d.main.filter((e) => e.kind !== 'cardio' && e.durationSec == null).reduce((t, e) => t + (e.sets ?? 0), 0);
    assert.ok(sets <= 30, `${d.name}: ${sets} sets in one session`);
  }
});

test('a rewritten session keeps each movement\'s rest, and a new movement takes the session\'s usual rest', () => {
  const { active, marks } = benjaminWorld();
  const s = active.structure;
  const rw = rewriteFrom(s, 3, (days) => days.map((d) => (d.name === 'Pull' ? { ...d, rows: [...d.rows, { key: 'cable-face-pull', sets: 3, reps: 15 }] } : d)));
  const r = checkRewrite(s, marks, rw, cx(benjamin, { goal: 'muscle' }));
  assert.ok(r.ok, r.ok ? '' : r.reason);
  // Week 5: week 4's Pull is already trained.
  const before = trainingDays(plannedDays(s, 4)).find((d) => d.name.startsWith('Pull'));
  const after = trainingDays(plannedDays(r.structure, 4)).find((d) => d.name.startsWith('Pull'));
  for (const e of before.main) {
    if (e.restSec == null) continue;
    assert.equal(after.main.find((x) => x.catalogKey === e.catalogKey)?.restSec, e.restSec, `${e.name} keeps its rest`);
  }
  assert.ok(before.main.some((e) => e.restSec != null), 'the fixture session has rests');
  {
    assert.ok(after.main.find((x) => x.catalogKey === 'cable-face-pull')?.restSec > 0, 'the new movement has a rest');
  }
});

test('⛔ a deload written at full volume comes back down to a deload (probe: week 7 came back at full volume)', () => {
  const { active, marks } = benjaminWorld();
  const s = active.structure;
  const deloadWeek = Array.from({ length: s.weeks }, (_, w) => w).find((w) => trainingDays(plannedDays(s, w)).some((d) => /deload/i.test(d.name)));
  assert.ok(deloadWeek != null && deloadWeek > 3, 'the fixture block has a deload week ahead');
  const normal = trainingDays(plannedDays(s, deloadWeek - 1));
  // Only the deload week is written — as a copy of the week before it (full volume).
  const days = normal.map((d) => ({ name: d.name, rows: d.main.filter((e) => e.kind !== 'cardio').map((e) => ({ key: e.catalogKey, sets: e.sets ?? 3, reps: e.reps ?? 10 })) }));
  const r = checkRewrite(s, marks, { weeks: [{ week: deloadWeek + 1, days }] }, cx(benjamin, { goal: 'muscle' }));
  assert.ok(r.ok, r.ok ? '' : r.reason);
  const sets = (st, w) => trainingDays(plannedDays(st, w)).reduce((t, d) => t + d.main.reduce((u, e) => u + (e.kind === 'cardio' || e.durationSec != null ? 0 : e.sets ?? 0), 0), 0);
  assert.ok(sets(r.structure, deloadWeek) <= sets(s, deloadWeek), `deload week: ${sets(r.structure, deloadWeek)} sets vs the plan's ${sets(s, deloadWeek)}`);
  assert.ok(sets(r.structure, deloadWeek) < sets(s, deloadWeek - 1), 'still lighter than the week before');
  assert.ok(r.said.some((l) => /deload week light/.test(l)));
});
