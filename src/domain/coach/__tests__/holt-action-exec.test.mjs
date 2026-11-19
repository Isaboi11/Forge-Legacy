/**
 * holt-action-exec.test.mjs — the training executors behind Holt's cards (AI Road to 10 Sprint 4a §1.2, lane C).
 *
 * For each: a failed apply leaves nothing behind, and Undo undoes only its own write (holtai-08).
 * Every database and device call is a fake that records what was written.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/holt-action-exec.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { doorExecutor, noteExecutor, sameJson, startExecutor, swapExecutor, swapOpenExercise, targetsExecutor } from '../holt-action-exec.ts';
import { plannedDays, trainingDays } from '../../program/progress-core.ts';

const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));

/* ── a fake world ─────────────────────────────────────────────────────────────────────────────────────────── */

function world(over = {}) {
  const w = {
    session: null,
    launch: null,
    programs: {},
    marks: {},
    targetRows: [],
    notes: [],
    writes: [],
    failPersist: false,
    failUpdate: false,
    failSave: false,
    failLaunch: false,
    consent: true,
    ...over,
  };
  const deps = {
    now: () => new Date('2026-11-18T16:00:00.000Z'),
    loadSession: async () => clone(w.session),
    persistSession: async (s) => {
      w.writes.push('persistSession');
      if (!w.failPersist) w.session = clone(s);
    },
    clearSession: async () => {
      w.writes.push('clearSession');
      w.session = null;
    },
    hasLoggedWork: (s) => !!s?.exercises?.some((e) => e.sets?.some((x) => x.done)),
    writeLaunch: async (ctx) => {
      w.writes.push('writeLaunch');
      if (!w.failLaunch) w.launch = clone(ctx);
    },
    readLaunch: async () => clone(w.launch),
    clearLaunch: async () => {
      w.writes.push('clearLaunch');
      w.launch = null;
    },
    fetchProgram: async (id) => (w.programs[id] ? { id, structure: clone(w.programs[id]) } : null),
    fetchMarks: async (id) => clone(w.marks[id] ?? []),
    updateProgram: async (id, structure) => {
      w.writes.push('updateProgram');
      if (w.failUpdate) throw new Error('Failed to fetch');
      w.programs[id] = clone(structure);
    },
    catalogByKey: (key) => CATALOG.find((c) => c.key === key) ?? null,
    fetchTemplate: async (id) => (id === 't1' ? { id: 't1', name: 'Push Day', exercises: [{ name: 'Bench', sets: 3, targetReps: 8 }] } : null),
    fetchPlanned: async () => ({ name: 'Hotel Gym', exercises: [{ name: 'Goblet Squat', sets: 3, targetReps: 10 }], brief: null }),
    readTargetRows: async (day) => clone(w.targetRows.filter((r) => r.effectiveFrom <= day)),
    saveTargets: async (t, weightLb) => {
      w.writes.push('saveTargets');
      if (w.failSave) throw new Error('boom');
      const row = { effectiveFrom: '2026-11-18', method: 'recommended', ...t, weightLb };
      w.targetRows = [...w.targetRows.filter((r) => r.effectiveFrom !== row.effectiveFrom), row].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
    },
    restoreTargetRow: async (row) => {
      w.writes.push('restoreTargetRow');
      w.targetRows = [...w.targetRows.filter((r) => r.effectiveFrom !== row.effectiveFrom), clone(row)].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
    },
    addNotes: async (texts) => {
      w.writes.push('addNotes');
      if (w.notesFail) return { added: [], skipped: texts.map((text) => ({ text, reason: w.notesFail })) };
      const added = texts.map((text, i) => ({ id: `n${w.notes.length + i + 1}`, text, createdAt: 'x', source: 'ask' }));
      w.notes.push(...added);
      return { added, skipped: [] };
    },
    deleteNote: async (id) => {
      w.writes.push(`deleteNote:${id}`);
      const before = w.notes.length;
      w.notes = w.notes.filter((n) => n.id !== id);
      return w.notes.length < before;
    },
    consentForRoute: async () => w.consent,
  };
  return { w, deps };
}

const CATALOG = [
  { key: 'barbell-bench-press', name: 'Barbell Bench Press', equipId: 'barbell', pattern: 'horizontal_push', difficulty: 'Intermediate', primaryMuscleIds: ['chest'], muscleIds: ['chest'] },
  { key: 'dumbbell-bench-press', name: 'Dumbbell Bench Press', equipId: 'dumbbell', pattern: 'horizontal_push', difficulty: 'Beginner', primaryMuscleIds: ['chest'], muscleIds: ['chest'] },
];

const set = (done = false) => ({ setIndex: 0, weight: done ? 135 : null, targetReps: 8, actualReps: done ? 8 : null, done });
const SESSION = {
  workoutName: 'Push Day',
  activityType: 'strength',
  startedAt: '2026-11-18T15:00:00.000Z',
  exercises: [
    { name: 'Barbell Bench Press', catalogKey: 'barbell-bench-press', section: 'main', position: 0, sets: [set(), set()], note: 'grip' },
    { name: 'Lat Pulldown', catalogKey: 'lat-pulldown', section: 'main', position: 1, sets: [set(true)] },
  ],
};
const openPlan = { source: 'open', at: 0, fromName: 'Barbell Bench Press', fromKey: 'barbell-bench-press', toKey: 'dumbbell-bench-press', toName: 'Dumbbell Bench Press', startedAt: SESSION.startedAt };

const ex = (key, name) => ({ catalogKey: key, name, sets: 3, reps: 8 });
const day = (letter, name, main) => ({ letter, name, warmup: [], main, cooldown: [] });
const PROGRAM = {
  name: 'Strength Block',
  weeks: 2,
  daysPerWeek: 2,
  vary: false,
  days: [day('A', 'Upper A', [ex('barbell-bench-press', 'Barbell Bench Press'), ex('lat-pulldown', 'Lat Pulldown')]), day('B', 'Lower B', [ex('back-squat', 'Back Squat')])],
  weekPlans: null,
};
const programPlan = { source: 'program', at: 0, fromName: 'Barbell Bench Press', fromKey: 'barbell-bench-press', toKey: 'dumbbell-bench-press', toName: 'Dumbbell Bench Press', programId: 'p1', weekIndex: 1, dayIndex: 0 };

/* ── swap, open workout ───────────────────────────────────────────────────────────────────────────────────── */

test('swapOpenExercise: the movement changes, the set shape stays, the swap is recorded, the old note goes', () => {
  const out = swapOpenExercise(SESSION.exercises[0], { key: 'dumbbell-bench-press', name: 'Dumbbell Bench Press' });
  assert.equal(out.name, 'Dumbbell Bench Press');
  assert.equal(out.prescribedName, 'Barbell Bench Press');
  assert.equal(out.prescribedCatalogKey, 'barbell-bench-press');
  assert.equal(out.note, null);
  assert.equal(out.sets.length, 2);
  const twice = swapOpenExercise(out, { key: 'barbell-bench-press', name: 'Barbell Bench Press' });
  assert.equal(twice.prescribedName, 'Barbell Bench Press', 'the first substitution wins');
});

test('swap (open): applies to that one exercise; Undo puts it back exactly', async () => {
  const { w, deps } = world({ session: clone(SESSION) });
  const exec = swapExecutor(deps);
  const res = await exec.apply(openPlan);
  assert.equal(res.ok, true);
  assert.equal(w.session.exercises[0].catalogKey, 'dumbbell-bench-press');
  assert.deepEqual(w.session.exercises[1], SESSION.exercises[1], 'the other exercise is untouched');
  assert.equal(await exec.undo(res.undo), true);
  assert.deepEqual(w.session, SESSION);
});

test('swap (open): a failed write leaves the workout as it was', async () => {
  const { w, deps } = world({ session: clone(SESSION), failPersist: true });
  const res = await swapExecutor(deps).apply(openPlan);
  assert.deepEqual(res, { ok: false, reason: 'failed' });
  assert.deepEqual(w.session, SESSION);
});

test('swap (open): a different workout, a moved exercise, or sets logged since → gone, nothing written', async () => {
  for (const session of [
    { ...clone(SESSION), startedAt: '2026-11-18T17:00:00.000Z' },
    { ...clone(SESSION), exercises: [...clone(SESSION.exercises)].reverse() },
    { ...clone(SESSION), exercises: [{ ...clone(SESSION.exercises[0]), sets: [set(true)] }, clone(SESSION.exercises[1])] },
    null,
  ]) {
    const { w, deps } = world({ session });
    assert.deepEqual(await swapExecutor(deps).apply(openPlan), { ok: false, reason: 'gone' });
    assert.deepEqual(w.writes, []);
  }
});

test('swap (open): Undo leaves it alone once a set is logged on the new exercise, or the workout changed', async () => {
  const { w, deps } = world({ session: clone(SESSION) });
  const exec = swapExecutor(deps);
  const res = await exec.apply(openPlan);
  w.session.exercises[0].sets[0].done = true;
  const before = clone(w.session);
  assert.equal(await exec.undo(res.undo), false);
  assert.deepEqual(w.session, before);
  w.session = null;
  assert.equal(await exec.undo(res.undo), false);
});

/* ── swap, the program's next session ─────────────────────────────────────────────────────────────────────── */

test('swap (program): only that one session changes, marked "Updated by Holt"; Undo restores the structure', async () => {
  const { w, deps } = world({ programs: { p1: clone(PROGRAM) } });
  const exec = swapExecutor(deps);
  const res = await exec.apply(programPlan);
  assert.equal(res.ok, true);
  const after = w.programs.p1;
  const wk = (s, i) => trainingDays(plannedDays(s, i));
  assert.equal(wk(after, 1)[0].main[0].catalogKey, 'dumbbell-bench-press');
  assert.equal(wk(after, 1)[0].main[0].sets, 3, 'same dose');
  assert.equal(wk(after, 0)[0].main[0].catalogKey, 'barbell-bench-press', 'week 1 untouched');
  assert.ok(wk(after, 1)[0].holtNote, 'the changed session says Holt changed it');
  assert.equal(wk(after, 0)[0].holtNote, undefined);
  assert.equal(await exec.undo(res.undo), true);
  assert.deepEqual(w.programs.p1, PROGRAM);
});

test('swap (program): a failed save writes nothing else; a trained session or a changed row → gone, no write', async () => {
  {
    const { w, deps } = world({ programs: { p1: clone(PROGRAM) }, failUpdate: true });
    assert.deepEqual(await swapExecutor(deps).apply(programPlan), { ok: false, reason: 'offline' });
    assert.deepEqual(w.writes, ['updateProgram']);
    assert.deepEqual(w.programs.p1, PROGRAM);
  }
  {
    const { w, deps } = world({ programs: { p1: clone(PROGRAM) }, marks: { p1: [{ weekIndex: 1, dayIndex: 0, state: 'completed' }] } });
    assert.deepEqual(await swapExecutor(deps).apply(programPlan), { ok: false, reason: 'gone' });
    assert.deepEqual(w.writes, []);
  }
  {
    const { w, deps } = world({ programs: { p1: clone(PROGRAM) } });
    assert.deepEqual(await swapExecutor(deps).apply({ ...programPlan, fromKey: 'lat-pulldown' }), { ok: false, reason: 'gone' });
    assert.deepEqual(await swapExecutor(deps).apply({ ...programPlan, toKey: 'not-in-catalog' }), { ok: false, reason: 'gone' });
    assert.deepEqual(await swapExecutor(deps).apply({ ...programPlan, programId: 'nope' }), { ok: false, reason: 'gone' });
    assert.deepEqual(w.writes, []);
  }
});

test('swap (program): Undo leaves a program that changed since', async () => {
  const { w, deps } = world({ programs: { p1: clone(PROGRAM) } });
  const exec = swapExecutor(deps);
  const res = await exec.apply(programPlan);
  w.programs.p1.name = 'Renamed since';
  const now = clone(w.programs.p1);
  assert.equal(await exec.undo(res.undo), false);
  assert.deepEqual(w.programs.p1, now);
});

test('sameJson ignores key order (jsonb sorts keys) but not values', () => {
  assert.equal(sameJson({ a: 1, b: [1, { c: 2, d: null }] }, { b: [1, { d: null, c: 2 }], a: 1 }), true);
  assert.equal(sameJson({ a: 1 }, { a: 2 }), false);
  assert.equal(sameJson({ a: 1, x: undefined }, { a: 1 }), true);
  assert.equal(sameJson([1, 2], [2, 1]), false);
});

/* ── start a workout ──────────────────────────────────────────────────────────────────────────────────────── */

test("start: writes the program's launch as its Train button does, and hands off to the workout", async () => {
  const { w, deps } = world();
  const res = await startExecutor(deps).apply({ kind: 'program', programId: 'p1', weekIndex: 1, dayIndex: 2, name: 'Upper A', next: true });
  assert.equal(res.ok, true);
  assert.equal(res.go, '/workout');
  assert.deepEqual(w.launch, { programId: 'p1' });
  const picked = await startExecutor(deps).apply({ kind: 'program', programId: 'p1', weekIndex: 1, dayIndex: 3, name: 'Lower B', next: false });
  assert.equal(picked.ok, true);
  assert.deepEqual(w.launch, { programId: 'p1', programWeek: 1, programDay: 3 });
  await startExecutor(deps).apply({ kind: 'template', templateId: 't1', name: 'Push Day' });
  assert.equal(w.launch.templateId, 't1');
  assert.ok(Array.isArray(w.launch.templateFallback));
});

test('start: a launch that did not land, or a template that is gone → failed/gone, nothing left behind', async () => {
  {
    const { w, deps } = world({ failLaunch: true });
    assert.deepEqual(await startExecutor(deps).apply({ kind: 'program', programId: 'p1', name: 'Upper A', next: true }), { ok: false, reason: 'failed' });
    assert.equal(w.launch, null);
  }
  {
    const { w, deps } = world();
    assert.deepEqual(await startExecutor(deps).apply({ kind: 'template', templateId: 'gone', name: 'Old' }), { ok: false, reason: 'gone' });
    assert.deepEqual(await startExecutor(deps).apply({ kind: 'planned', name: 'Something else' }), { ok: false, reason: 'gone' });
    assert.deepEqual(w.writes, []);
  }
});

test('start: Undo takes back the launch before it opened; after, discards the workout only if nothing is logged', async () => {
  {
    const { w, deps } = world();
    const exec = startExecutor(deps);
    const res = await exec.apply({ kind: 'program', programId: 'p1', name: 'Upper A', next: true });
    assert.equal(await exec.undo(res.undo), true);
    assert.equal(w.launch, null);
  }
  {
    const { w, deps } = world();
    const exec = startExecutor(deps);
    const res = await exec.apply({ kind: 'program', programId: 'p1', name: 'Upper A', next: true });
    w.launch = null; // the logger consumed it…
    w.session = { ...clone(SESSION), startedAt: '2026-11-18T16:00:05.000Z', exercises: [clone(SESSION.exercises[0])] }; // …and started it, nothing logged
    assert.equal(await exec.undo(res.undo), true);
    assert.equal(w.session, null);
  }
  {
    const { w, deps } = world();
    const exec = startExecutor(deps);
    const res = await exec.apply({ kind: 'program', programId: 'p1', name: 'Upper A', next: true });
    w.launch = null;
    w.session = { ...clone(SESSION), startedAt: '2026-11-18T16:00:05.000Z' }; // a set logged
    assert.equal(await exec.undo(res.undo), false);
    assert.ok(w.session, 'logged work is never discarded');
  }
  {
    const { w, deps } = world();
    const exec = startExecutor(deps);
    const res = await exec.apply({ kind: 'program', programId: 'p1', name: 'Upper A', next: true });
    w.launch = null;
    w.session = { ...clone(SESSION), exercises: [clone(SESSION.exercises[0])] }; // an OLDER workout, resumed instead
    assert.equal(await exec.undo(res.undo), true);
    assert.ok(w.session, 'a workout this card did not start is not touched');
    assert.ok(!w.writes.includes('clearSession'));
  }
});

/* ── targets ──────────────────────────────────────────────────────────────────────────────────────────────── */

const T = { kcal: 2400, protein: 180, carb: 250, fat: 70 };
const plan = { ...T, weightLb: 200, today: '2026-11-18' };
const row = (from, kcal, method = 'manual', weightLb = 205) => ({ effectiveFrom: from, method, kcal, protein: 170, carb: 300, fat: 80, weightLb });

test("targets: writes the Targets screen's row; Undo puts back today's earlier row exactly", async () => {
  const { w, deps } = world({ targetRows: [row('2026-11-01', 2600), row('2026-11-18', 2500, 'manual', 201)] });
  const exec = targetsExecutor(deps);
  const res = await exec.apply(plan);
  assert.equal(res.ok, true);
  assert.equal(res.noUndo, undefined);
  assert.equal(w.targetRows.at(-1).kcal, 2400);
  assert.equal(await exec.undo(res.undo), true);
  assert.deepEqual(w.targetRows, [row('2026-11-01', 2600), row('2026-11-18', 2500, 'manual', 201)]);
});

test('targets: with no row today, Undo writes the earlier target back as today (no delete policy) — in force exactly as before', async () => {
  const { w, deps } = world({ targetRows: [row('2026-11-01', 2600)] });
  const exec = targetsExecutor(deps);
  const res = await exec.apply(plan);
  assert.equal(await exec.undo(res.undo), true);
  const inForce = w.targetRows.at(-1);
  assert.deepEqual({ ...inForce, effectiveFrom: '2026-11-01' }, row('2026-11-01', 2600));
});

test('targets: a first-ever target says there is nothing to go back to', async () => {
  const { deps } = world();
  const res = await targetsExecutor(deps).apply(plan);
  assert.equal(res.ok, true);
  assert.match(res.noUndo, /first target/);
});

test('targets: a failed save leaves the rows as they were; a bad plan writes nothing', async () => {
  const rows = [row('2026-11-01', 2600)];
  {
    const { w, deps } = world({ targetRows: clone(rows), failSave: true });
    assert.deepEqual(await targetsExecutor(deps).apply(plan), { ok: false, reason: 'failed' });
    assert.deepEqual(w.targetRows, rows);
  }
  {
    const { w, deps } = world({ targetRows: clone(rows) });
    assert.deepEqual(await targetsExecutor(deps).apply({ ...plan, kcal: 'lots' }), { ok: false, reason: 'failed' });
    assert.deepEqual(w.writes, []);
  }
});

test('targets: Undo leaves a target changed since (the athlete set another)', async () => {
  const { w, deps } = world({ targetRows: [row('2026-11-01', 2600)] });
  const exec = targetsExecutor(deps);
  const res = await exec.apply(plan);
  await deps.saveTargets({ kcal: 2200, protein: 160, carb: 220, fat: 70 }, 199);
  const now = clone(w.targetRows);
  assert.equal(await exec.undo(res.undo), false);
  assert.deepEqual(w.targetRows, now);
});

/* ── notes ────────────────────────────────────────────────────────────────────────────────────────────────── */

test('remember_note: saves one note; Undo deletes exactly that note', async () => {
  const { w, deps } = world({ notes: [{ id: 'n0', text: 'Bad left knee', createdAt: 'x', source: 'ask' }] });
  const exec = noteExecutor(deps);
  const res = await exec.apply({ text: 'I train at 6am' });
  assert.equal(res.ok, true);
  assert.equal(await exec.undo(res.undo), true);
  assert.deepEqual(w.notes.map((n) => n.id), ['n0']);
});

test('remember_note: a failed or full save leaves nothing and has nothing to undo', async () => {
  for (const [why, reason] of [['failed', 'failed'], ['unavailable', 'failed'], ['cap', 'not_allowed']]) {
    const { w, deps } = world({ notesFail: why });
    assert.deepEqual(await noteExecutor(deps).apply({ text: 'I train at 6am' }), { ok: false, reason });
    assert.deepEqual(w.notes, []);
    assert.ok(!w.writes.some((x) => x.startsWith('deleteNote')));
  }
  const { w, deps } = world({ notesFail: 'duplicate' });
  const dup = await noteExecutor(deps).apply({ text: 'I train at 6am' });
  assert.equal(dup.ok, true);
  assert.ok(dup.noUndo);
  assert.equal(await noteExecutor(deps).undo(dup.undo), true);
  assert.ok(!w.writes.some((x) => x.startsWith('deleteNote')), 'nothing of its own to delete');
});

/* ── doors ────────────────────────────────────────────────────────────────────────────────────────────────── */

test('open_door: navigation only, after the Nutrition consent for a nutrition screen; a strange route is refused', async () => {
  const { deps } = world();
  const res = await doorExecutor(deps).apply({ go: '/nutrition-targets' });
  assert.equal(res.ok, true);
  assert.equal(res.go, '/nutrition-targets');
  assert.equal(res.noUndo, '');
  assert.deepEqual(await doorExecutor(deps).apply({ go: '/admin' }), { ok: false, reason: 'failed' });
  const { deps: noConsent } = world({ consent: false });
  assert.deepEqual(await doorExecutor(noConsent).apply({ go: '/nutrition-targets' }), { ok: false, reason: 'not_allowed' });
});

test('⛔ Sprint 4b §1.4: memory switched off — a confirmed note keeps nothing ("That changed since I looked"); on, it saves', async () => {
  const off = world();
  const res = await noteExecutor({ ...off.deps, remembers: async () => false }).apply({ text: 'I train at 6am' });
  assert.deepEqual(res, { ok: false, reason: 'gone' });
  assert.deepEqual(off.w.notes, []);
  const on = world();
  assert.equal((await noteExecutor({ ...on.deps, remembers: async () => true }).apply({ text: 'I train at 6am' })).ok, true);
  assert.equal(on.w.notes.length, 1);
});
