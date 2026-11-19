/**
 * rewrite-expand.test.mjs — Holt writes a session ONCE; the app applies it to every remaining week, keeping each kept
 * movement's own progression; run days keep their warm-up, cool-down, notes and pace (live run 11-19 findings).
 *
 * Run (from the repo root):  node --test --experimental-strip-types src/domain/coach/engine/__tests__/rewrite-expand.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { canDoExercise } from '../../../home-gym/equipment.ts';
import { plannedDays, totalSessions, trainingDays } from '../../../program/progress-core.ts';
import { assemble } from '../../assemble.ts';
import { expandRewrite, rewriteFromModelText } from '../../rewrite.ts';
import { checkRewrite } from '../checker.ts';
import { BENJAMIN_KIT, benjaminWorld, catalog } from './fixtures.mjs';

const athlete = { experience: 'intermediate', environment: 'home', ownedEquipment: BENJAMIN_KIT, limitations: [] };

test('⭐ a session written once lands in every remaining week, kept movements keep THAT week\'s sets and reps', () => {
  const { active, marks } = benjaminWorld();
  const s = active.structure;
  const pull = trainingDays(plannedDays(s, 4)).find((d) => d.name === 'Pull');
  const rows = pull.main.map((e) => ({ key: e.catalogKey, part: 'main', sets: 9, reps: 9, repsTo: 0, seconds: 0, miles: 0, group: '' }));
  const text = JSON.stringify({
    say: 'Face pulls on every Pull day.',
    sessions: [{ name: 'Pull', rows: [...rows, { key: 'cable-face-pull', part: 'main', sets: 3, reps: 15, repsTo: 0, seconds: 0, miles: 0, group: 'A' }] }],
    weeks: [],
    rest: [],
    unmet: [],
  });
  const parsed = rewriteFromModelText(text);
  const r = checkRewrite(s, marks, expandRewrite(s, 3, parsed), { athlete, catalog: catalog(), canDo: canDoExercise });
  assert.ok(r.ok, r.ok ? '' : r.reason);
  for (let w = 4; w < s.weeks; w += 1) {
    const before = trainingDays(plannedDays(s, w)).find((d) => d.name.startsWith('Pull'));
    const after = trainingDays(plannedDays(r.structure, w)).find((d) => d.name.startsWith('Pull'));
    assert.ok(after.main.some((e) => e.catalogKey === 'cable-face-pull'), `week ${w + 1} has face pulls`);
    // The 9×9 he wrote for kept movements is ignored: each keeps its own week's prescription (progression/deload).
    for (const e of before.main) {
      const now = after.main.find((x) => x.catalogKey === e.catalogKey);
      assert.equal(now?.sets, e.sets, `week ${w + 1} ${e.catalogKey} sets`);
      assert.equal(now?.reps, e.reps, `week ${w + 1} ${e.catalogKey} reps`);
    }
    // Sessions he did not write are untouched.
    assert.deepEqual(trainingDays(plannedDays(r.structure, w)).find((d) => d.name.startsWith('Legs')), trainingDays(plannedDays(s, w)).find((d) => d.name.startsWith('Legs')));
    if (/DELOAD/.test(after.name)) assert.equal(after.main.find((e) => e.catalogKey === 'cable-face-pull').sets, 2, 'new work is a set lighter in the deload week');
  }
  assert.equal(totalSessions(r.structure), totalSessions(s));
});

test('⭐ a run day keeps its warm-up, cool-down, stretches, names, notes — only the distance/time moves', () => {
  const res = assemble(
    { goal: 'run_marathon', experience: { lifting: 'beginner', running: 'intermediate' }, daysPerWeek: 4, sessionMinutes: 60, environment: 'full_gym', ownedEquipment: [], limitations: [], excludeExercises: [], raceInWeeks: 20, currentWeeklyMi: 20 },
    catalog(),
    canDoExercise,
  );
  const s = res.assembly.structure;
  const marks = [];
  for (let w = 0; w < 8; w += 1) for (let d = 0; d < 4; d += 1) marks.push({ weekIndex: w, dayIndex: d, state: 'completed' });
  const text = JSON.stringify({
    say: 'Easing off.',
    sessions: [],
    weeks: [{ week: 10, days: [{ day: 2, name: 'Tempo Run', rows: [
      { key: 'cardio-run', part: 'warmup', sets: 1, reps: 0, repsTo: 0, seconds: 600, miles: 0, group: '' },
      { key: 'cardio-run', part: 'main', sets: 1, reps: 0, repsTo: 0, seconds: 1500, miles: 0, group: '' },
      { key: 'cardio-walk', part: 'cooldown', sets: 1, reps: 0, repsTo: 0, seconds: 300, miles: 0, group: '' },
    ] }] }],
    rest: [],
    unmet: [],
  });
  const r = checkRewrite(s, marks, expandRewrite(s, 8, rewriteFromModelText(text)), { athlete: { experience: 'intermediate', environment: 'full_gym', ownedEquipment: [], limitations: [] }, catalog: catalog(), canDo: canDoExercise, race: true });
  assert.ok(r.ok, r.ok ? '' : r.reason);
  const before = trainingDays(plannedDays(s, 9))[1];
  const after = trainingDays(plannedDays(r.structure, 9))[1];
  assert.equal(after.name, 'Tempo Run');
  assert.deepEqual(after.warmup, before.warmup, 'warm-up kept');
  assert.deepEqual(after.cooldown, before.cooldown, 'cool-down + stretches kept');
  assert.equal(after.main[0].name, before.main[0].name);
  assert.equal(after.main[0].coachNote, before.main[0].coachNote, 'the tempo note kept');
  assert.equal(after.main[0].targetSec, 1500, '35 → 25 minutes');
  assert.equal(r.said.length, 0, 'nothing "kept as it was" — it went in');
});
