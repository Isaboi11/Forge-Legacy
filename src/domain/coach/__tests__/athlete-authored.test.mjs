/**
 * athlete-authored.test.mjs — CA-D3 and CA-D12: the program the athlete describes, built as described.
 *
 * ══ WHAT THIS COVERS ══
 *
 * Coach-AI Amendment 001 §4 items 1, 2, 3 and 5, against the real catalogue:
 *
 *   · muscle focus      — "glute focus", "bigger arms" (69 of 705 real requests)
 *   · pinned exercises  — "bench 5×5, rows 4×8, pull-ups, curls" (56)
 *   · hybrid weeks      — "run twice, lift three days" (38), and the PO's own seven-day example
 *   · 1- and 7-day weeks when the athlete set them (§4.5)
 *
 * Every test here fails on the engine before these fields existed: it ignored all four, so a focus
 * changed nothing, a pinned bench never appeared, a `days` week built an ordinary four-day block, and a
 * seven came back as six without a word.
 *
 * The sweep at the bottom is the promise: every combination of the new fields builds without throwing,
 * respects limitations and equipment, stays inside the validator's caps, and never drops a pinned name
 * without listing it.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/athlete-authored.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildPickerDb } from '../../exercise-picker/catalog-core.ts';
import { canDoExercise } from '../../home-gym/equipment.ts';
import { effectiveEquipment, missingFor, normalise, STRENGTH_GOALS } from '../constraints.ts';
import { assemble } from '../assemble.ts';
import { validateProgram, explain } from '../validate-program.ts';
import {
  equipmentAfterLimitations,
  forbidsRunning,
  limitationExcludeKeys,
  limitationKeepKeys,
  limitationPatterns,
} from '../rulebook/limitations.ts';
import { FOCUS_SPEC } from '../rulebook/focus.ts';
import { resolveAgainstCatalog } from '../../exercise-picker/aliases.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (f) => JSON.parse(readFileSync(path.join(here, '../../exercise-relationships/source', f), 'utf8'));
const POOL = buildPickerDb({
  exercises: src('exercises.json'),
  exerciseMuscles: src('exercise_muscles.json'),
  muscles: src('muscles.json'),
  equipment: src('equipment.json'),
});
const BY_KEY = new Map(POOL.map((e) => [e.key, e]));
const KNOWN = new Set(POOL.map((e) => e.key));
const patternOf = (k) => BY_KEY.get(k)?.pattern;

const base = (over = {}) => ({
  goal: 'strength',
  experience: { lifting: 'intermediate', running: 'intermediate' },
  daysPerWeek: 4,
  sessionMinutes: 60,
  environment: 'full_gym',
  ownedEquipment: [],
  limitations: [],
  excludeExercises: [],
  ...over,
});
const build = (over) => assemble(base(over), POOL, canDoExercise);
const ok = (res) => {
  assert.ok(res.ok, res.ok ? '' : res.refusal.message);
  return res.assembly;
};
const validate = (a) => validateProgram(a.structure, { knownKeys: KNOWN, patternOf, category: a.category });
const week1 = (a) => a.structure.weekPlans[0].days;
const lifts = (day) => day.main.filter((e) => e.kind !== 'cardio');

/** Weekly working sets whose primary mover is one of `muscles`, in week 1. */
const weeklySets = (a, muscles) =>
  week1(a)
    .flatMap(lifts)
    .filter((e) => BY_KEY.get(e.catalogKey)?.primaryMuscleIds.some((m) => muscles.includes(m)))
    .reduce((n, e) => n + (e.sets ?? 0), 0);

// ─────────────────────────────────────────────────────────────────────────────
// 1. MUSCLE FOCUS
// ─────────────────────────────────────────────────────────────────────────────

test('glute focus, 4 days: same goal and split, more glute work, still valid', () => {
  const plain = ok(build({}));
  const focused = ok(build({ focusMuscles: ['glutes'] }));
  assert.deepEqual(week1(focused).map((d) => d.name), week1(plain).map((d) => d.name), 'the split does not change');
  assert.equal(focused.category, plain.category, 'the goal does not change');
  assert.ok(
    weeklySets(focused, ['glutes']) > weeklySets(plain, ['glutes']),
    `glute sets ${weeklySets(focused, ['glutes'])} vs ${weeklySets(plain, ['glutes'])}`,
  );
  const v = validate(focused);
  assert.ok(v.ok, explain(v));
});

test('a big group is brought up on the days that train it, never bolted onto a push day', () => {
  const a = ok(build({ goal: 'muscle', daysPerWeek: 3, focusMuscles: ['glutes'] })); // push / pull / legs
  const [push, pull, legs] = week1(a);
  const gluteKeys = (d) => lifts(d).filter((e) => BY_KEY.get(e.catalogKey)?.pattern === 'Hip Isolation');
  assert.equal(gluteKeys(push).length, 0, 'no hip isolation on the push day');
  assert.equal(gluteKeys(pull).length, 0, 'no hip isolation on the pull day');
  assert.ok(gluteKeys(legs).length >= 1, 'the leg day carries the extra glute slot');
});

test('calves are small and quick to recover — the focus reaches an upper day too', () => {
  const a = ok(build({ focusMuscles: ['calves'] })); // upper / lower
  const upper = week1(a)[0];
  assert.match(upper.name, /^Upper/);
  assert.ok(lifts(upper).some((e) => BY_KEY.get(e.catalogKey)?.pattern === 'Calf / Ankle'), 'a calf movement on Upper');
  const v = validate(a);
  assert.ok(v.ok, explain(v));
});

test('arms focus raises biceps and triceps volume inside every session ceiling', () => {
  for (const goal of ['strength', 'muscle', 'weight_loss', 'health']) {
    const plain = ok(build({ goal }));
    const a = ok(build({ goal, focusMuscles: ['arms'] }));
    assert.ok(weeklySets(a, FOCUS_SPEC.arms.muscles) > weeklySets(plain, FOCUS_SPEC.arms.muscles), goal);
    const v = validate(a);
    assert.ok(v.ok, `${goal}: ${explain(v)}`);
  }
});

test('a deload week carries no focus bonus — it stays lighter than the week before it', () => {
  const a = ok(build({ goal: 'muscle', focusMuscles: ['glutes', 'arms'] }));
  assert.ok(a.deloadWeeks.length > 0);
  const v = validate(a);
  assert.ok(!v.failures.some((f) => f.code === 'deload_not_lighter'), explain(v));
});

test('mobility sets a focus aside, and says so once', () => {
  const plain = ok(build({ goal: 'mobility' }));
  const a = ok(build({ goal: 'mobility', focusMuscles: ['glutes'] }));
  assert.deepEqual(week1(a), week1(plain), 'a mobility block does not grow hip thrusts');
  assert.equal(a.concerns.length, 1);
  assert.match(a.concerns[0], /mobility block/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. PINNED EXERCISES
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLE_PINS = [
  { name: 'bench', sets: 5, reps: 5 },
  { name: 'rows', sets: 4, reps: 8 },
  { name: 'pull-ups' },
  { name: 'curls' },
];

test('"bench 5×5, rows 4×8, pull-ups, curls, 3 days" — all four in, verbatim where given', () => {
  const a = ok(build({ daysPerWeek: 3, pinned: SAMPLE_PINS }));
  const all = week1(a).flatMap(lifts);
  const find = (key) => all.find((e) => e.catalogKey === key);

  assert.deepEqual([find('barbell-bench-press')?.sets, find('barbell-bench-press')?.reps], [5, 5], 'bench 5×5 verbatim');
  assert.equal(find('barbell-bench-press')?.repsMax, undefined, 'a verbatim rep count is not a range');
  const row = all.find((e) => e.catalogKey === 'barbell-bent-over-row' && e.sets === 4 && e.reps === 8);
  assert.ok(row, 'rows 4×8, as a real row');
  assert.ok(find('pull-up'), 'pull-ups');
  assert.ok(all.some((e) => BY_KEY.get(e.catalogKey)?.pattern === 'Elbow Flexion' && /curl/i.test(e.name)), 'a curl');

  assert.deepEqual(a.unresolved, []);
  assert.deepEqual(a.chosen.map((c) => c.asked), ['rows', 'curls'], 'family picks are reported, not silent');
  const v = validate(a);
  assert.ok(v.ok, explain(v));
});

test('placed first, ordered compounds-first — a pinned curl never leads a squat', () => {
  // The first build led Full Body A with Bench · Barbell Curl · Back Squat. Compounds lead, always.
  const COMPOUND = new Set(['Horizontal Push', 'Vertical Push', 'Horizontal Pull', 'Vertical Pull', 'Squat / Knee Dominant', 'Hinge / Hip Dominant']);
  const a = ok(build({ daysPerWeek: 3, pinned: SAMPLE_PINS }));
  for (const d of week1(a)) {
    const rows = lifts(d);
    const curl = rows.findIndex((e) => /curl/i.test(e.name));
    const lastCompound = rows.findLastIndex((e) => COMPOUND.has(BY_KEY.get(e.catalogKey)?.pattern));
    if (curl >= 0) assert.ok(curl > lastCompound, `${d.name}: ${rows.map((e) => e.name).join(' · ')}`);
  }
});

test('a pin with a day goes on that day, and the day the pattern fits otherwise', () => {
  const a = ok(build({ pinned: [{ name: 'Barbell Hip Thrust', day: 2 }, { name: 'bench' }] }));
  const [upperA, lowerA, upperB] = week1(a);
  assert.ok(lifts(upperB).some((e) => e.catalogKey === 'barbell-hip-thrust'), 'day 2 as asked, even an upper day');
  assert.ok(lifts(upperA).some((e) => e.catalogKey === 'barbell-bench-press'), 'bench on the day a horizontal push leads');
  assert.ok(!lifts(lowerA).some((e) => e.catalogKey === 'barbell-bench-press'));
});

test('a name nothing matches is asked back — unresolved, never silently dropped', () => {
  const a = ok(build({ pinned: [{ name: 'zercher flumph' }, { name: 'press' }, { name: 'bench' }] }));
  assert.deepEqual(a.unresolved, ['zercher flumph', 'press'], '"press" names three patterns — not guessed');
  assert.ok(week1(a).flatMap(lifts).some((e) => e.catalogKey === 'barbell-bench-press'));
});

test('a pin a limitation rules out is held and named — unless the athlete confirms it', () => {
  // `lower_back` takes the hinge pattern — the athlete's deadlift runs straight into it.
  const held = ok(build({ limitations: ['lower_back'], pinned: [{ name: 'deadlift' }] }));
  assert.equal(held.held.length, 1);
  assert.deepEqual([held.held[0].reason, held.held[0].asked, held.held[0].catalogKey], ['limitation', 'deadlift', 'barbell-deadlift']);
  assert.match(held.concerns.join(' '), /lower back you told me about/);
  assert.ok(!week1(held).flatMap(lifts).some((e) => e.catalogKey === 'barbell-deadlift'));

  const kept = ok(build({ limitations: ['lower_back'], pinned: [{ name: 'deadlift', confirmed: true }] }));
  assert.deepEqual(kept.held, []);
  assert.ok(week1(kept).flatMap(lifts).some((e) => e.catalogKey === 'barbell-deadlift'), 'confirmed stays');
});

test('a pin the room cannot do is held for kit; one the athlete excluded is held as excluded', () => {
  const room = ok(build({ environment: 'bodyweight', pinned: [{ name: 'Barbell Back Squat' }] }));
  assert.deepEqual(room.held.map((h) => h.reason), ['equipment']);
  const bar = ok(build({ limitations: ['no_barbell'], pinned: [{ name: 'Barbell Back Squat' }] }));
  assert.deepEqual(bar.held.map((h) => h.reason), ['limitation'], 'no_barbell is the athlete’s limitation, not missing kit');
  const ex = ok(build({ excludeExercises: ['barbell-back-squat'], pinned: [{ name: 'Barbell Back Squat' }] }));
  assert.deepEqual(ex.held.map((h) => h.reason), ['excluded']);
});

test('a race plan has no lift day — its pins come back held, not lost', () => {
  const a = ok(build({ goal: 'run_5k', daysPerWeek: 4, raceDate: '2027-03-01', currentWeeklyMi: 10, pinned: [{ name: 'bench' }, { name: 'blorp' }] }));
  assert.deepEqual(a.held.map((h) => h.reason), ['no_lift_day']);
  assert.deepEqual(a.unresolved, ['blorp']);
});

test('a verbatim 5×5 drops in the deload week, and Holt says so once', () => {
  const a = ok(build({ daysPerWeek: 3, pinned: [{ name: 'bench', sets: 5, reps: 5 }] }));
  const w = a.deloadWeeks[0];
  const inDeload = a.structure.weekPlans[w].days.flatMap(lifts).find((e) => e.catalogKey === 'barbell-bench-press');
  assert.ok(inDeload.sets < 5);
  assert.equal(a.concerns.filter((c) => /lighter week/.test(c)).length, 1);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. HYBRID WEEKS
// ─────────────────────────────────────────────────────────────────────────────

const MWF_TT = [{ kind: 'lift' }, { kind: 'run' }, { kind: 'lift' }, { kind: 'run' }, { kind: 'lift' }, { kind: 'rest' }, { kind: 'rest' }];

test('"run Tue/Thu, lift Mon/Wed/Fri, strength" — built in their order, the concern said once', () => {
  const a = ok(build({ days: MWF_TT, daysAsGiven: true, currentWeeklyMi: 10 }));
  const names = week1(a).map((d) => d.name);
  assert.equal(a.structure.daysPerWeek, 5, 'rest days are not sessions');
  assert.deepEqual(names.map((n) => (/Run/.test(n) ? 'run' : 'lift')), ['lift', 'run', 'lift', 'run', 'lift'], 'the athlete’s order, kept');
  const runs = week1(a).filter((d) => /Run/.test(d.name)).map((d) => d.main[0]);
  assert.ok(runs.every((r) => r.kind === 'cardio' && r.activity === 'run'), 'run days are endurance-shaped run rows');
  assert.ok(Math.abs(runs.reduce((n, r) => n + r.targetMi, 0) - 10) < 0.01, 'sized from their weekly miles');
  assert.equal(a.concerns.length, 1);
  assert.match(a.concerns[0], /day before your long run/);
  const v = validate(a);
  assert.ok(v.ok, explain(v));
});

test('"run twice, lift three days" — Holt arranges it, and no heavy leg day lands before the long run', () => {
  const a = ok(build({ days: [{ kind: 'run' }, { kind: 'run' }, { kind: 'lift' }, { kind: 'lift' }, { kind: 'lift' }], currentWeeklyMi: 10 }));
  const days = week1(a);
  const k = days.findIndex((d) => d.name === 'Long Run');
  assert.ok(k >= 0, 'the week has a long run');
  const before = days[(k - 1 + days.length) % days.length];
  const lead = before.main[0]?.catalogKey;
  assert.ok(!['Squat / Knee Dominant', 'Hinge / Hip Dominant'].includes(patternOf(lead)), `${before.name} before the long run`);
  assert.deepEqual(a.concerns, [], 'Holt chose the order, so there is nothing to warn about');
});

test('"run 1 mile a day and lift Wednesday" — seven days, built as asked (CA-D12)', () => {
  const days = Array.from({ length: 7 }, (_, i) => (i === 2 ? { kind: 'lift' } : { kind: 'run', runMi: 1 }));
  const a = ok(build({ days, daysAsGiven: true }));
  assert.equal(a.structure.daysPerWeek, 7);
  const d = week1(a);
  assert.match(d[2].name, /Full Body|Upper|Lower/, 'Wednesday is the lift');
  for (const [i, day] of d.entries()) {
    if (i === 2) continue;
    assert.equal(day.main[0].targetMi, 1, 'a mile is a mile');
    assert.deepEqual(day.warmup, [], 'no ten-minute jog in front of their mile');
  }
  assert.ok(a.concerns.some((c) => /Seven days with no rest day/.test(c)));
  assert.ok(!a.concerns.some((c) => /long run/.test(c)), 'seven equal miles have no long run to protect');
  const v = validate(a);
  assert.ok(v.ok, explain(v));
});

test('no running → the run days become low-impact cardio, and Holt says how to undo it', () => {
  const a = ok(build({ days: MWF_TT, daysAsGiven: true, limitations: ['no_running'] }));
  const cardio = week1(a).flatMap((d) => d.main).filter((e) => e.kind === 'cardio');
  assert.ok(cardio.length >= 2);
  assert.ok(!cardio.some((e) => e.activity === 'run'), 'no run rows');
  assert.ok(a.concerns.some((c) => /no running/.test(c)));

  const anyway = ok(build({ days: MWF_TT, daysAsGiven: true, limitations: ['no_running'], buildAnyway: true }));
  assert.ok(week1(anyway).flatMap((d) => d.main).some((e) => e.activity === 'run'), 'buildAnyway keeps the runs');
  assert.ok(anyway.concerns.some((c) => /asked for the runs anyway/.test(c)));
});

test('a day named "legs" or "upper" takes that shape; a run-only week validates at 8 weeks', () => {
  const a = ok(build({ days: [{ kind: 'lift', focus: 'upper' }, { kind: 'run' }, { kind: 'lift', focus: 'Legs' }], daysAsGiven: true }));
  const d = week1(a);
  assert.match(d[0].name, /^Upper/);
  assert.match(d[2].name, /^Legs/);

  const runs = ok(build({ goal: 'run_10k', days: [{ kind: 'run' }, { kind: 'rest' }, { kind: 'run', runMin: 45 }], currentWeeklyMi: 8 }));
  assert.equal(runs.category, 'RUNNING');
  assert.ok(runs.concerns.some((c) => /not a race build/.test(c)));
  const v = validate(runs);
  assert.ok(v.ok, explain(v));
});

test('a week of nothing but rest is refused in words', () => {
  const r = build({ days: [{ kind: 'rest' }, { kind: 'rest' }] });
  assert.equal(r.ok, false);
  assert.equal(r.refusal.reason, 'empty_week');
});

test('missingFor: a days week needs no day count, and a run-only week no session length', () => {
  assert.deepEqual(missingFor({ goal: 'strength', days: [{ kind: 'run' }, { kind: 'lift' }] }), ['sessionMinutes']);
  assert.deepEqual(missingFor({ goal: 'run_marathon', days: [{ kind: 'run' }, { kind: 'run', runMi: 3 }] }), []);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. ONE AND SEVEN DAYS
// ─────────────────────────────────────────────────────────────────────────────

test('an athlete’s 7 and 1 are honoured with a sentence; Holt’s own clamp is said, not silent', () => {
  const seven = ok(build({ goal: 'muscle', daysPerWeek: 7, athleteSetDays: true }));
  assert.equal(seven.structure.daysPerWeek, 7);
  assert.equal(week1(seven).length, 7);
  assert.ok(seven.concerns.some((c) => /Seven days/.test(c)));
  assert.ok(validate(seven).ok, explain(validate(seven)));

  const one = ok(build({ daysPerWeek: 1, athleteSetDays: true }));
  assert.equal(week1(one).length, 1);
  assert.ok(one.concerns.some((c) => /One day a week/.test(c)));
  assert.ok(validate(one).ok, explain(validate(one)));

  const clamped = ok(build({ daysPerWeek: 7 }));
  assert.equal(clamped.structure.daysPerWeek, 6, 'Holt’s own builds keep 2–6');
  assert.match(clamped.concerns.join(' '), /6 days rather than 7/);
  assert.equal(normalise(base({ daysPerWeek: 7 })).daysPerWeek, 6);
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. THE SWEEP
// ─────────────────────────────────────────────────────────────────────────────

const ROOMS = {
  full_gym: { environment: 'full_gym', ownedEquipment: [] },
  home: { environment: 'home', ownedEquipment: ['dumbbells', 'bench', 'pullup', 'bands', 'mat'] },
  dumbbells_only: { environment: 'home', ownedEquipment: ['dumbbells'] },
  bodyweight: { environment: 'bodyweight', ownedEquipment: [] },
};
const LIMITS = [[], ['knees'], ['lower_back'], ['shoulders', 'no_overhead'], ['no_barbell', 'no_running'], ['shoulders', 'knees', 'lower_back', 'no_jumping', 'no_overhead', 'no_barbell', 'no_running']];
const FOCI = [null, ['glutes'], ['arms', 'calves'], ['back', 'core', 'chest']];
const PINS = [
  null,
  SAMPLE_PINS,
  [{ name: 'Barbell Back Squat', day: 0, sets: 5, reps: 5 }, { name: 'lunges' }, { name: 'no such lift' }, { name: 'Push-Up', day: 9 }],
];
const SHAPES = [
  {},
  { days: MWF_TT, daysAsGiven: true, currentWeeklyMi: 12 },
  { days: [{ kind: 'run' }, { kind: 'lift', focus: 'lower' }, { kind: 'cardio', focus: 'bike' }, { kind: 'lift' }] },
  { days: Array.from({ length: 7 }, (_, i) => (i === 2 ? { kind: 'lift' } : { kind: 'run', runMi: 1 })), daysAsGiven: true },
  { daysPerWeek: 7, athleteSetDays: true },
  { daysPerWeek: 1, athleteSetDays: true },
];

/** Would the rulebook itself allow this movement for this athlete? The same gates `candidatesFor` applies. */
function allowed(key, c) {
  const ex = BY_KEY.get(key);
  if (!ex) return false;
  const owned = equipmentAfterLimitations(effectiveEquipment(c), c.limitations);
  if (!canDoExercise(ex, owned)) return false;
  if (c.excludeExercises.includes(key)) return false;
  for (const l of c.limitations) {
    if (limitationExcludeKeys(l).includes(key)) return false;
    if (limitationPatterns(l).includes(ex.pattern) && !c.limitations.some((k) => limitationKeepKeys(k).includes(key))) return false;
  }
  return true;
}

test('the sweep’s own wall check can fail — it is not a guard that passes everything', () => {
  assert.equal(allowed('barbell-back-squat', base({ limitations: ['no_barbell'] })), false);
  assert.equal(allowed('barbell-back-squat', base({ environment: 'bodyweight' })), false);
  assert.equal(allowed('barbell-deadlift', base({ limitations: ['lower_back'] })), false);
  assert.equal(allowed('barbell-back-squat', base()), true);
});

/*
 * ⚠ EVERY COMBINATION OF THE NEW FIELDS, NOT THE WHOLE CROSS-PRODUCT. Focus × pins × week shape is 72
 * combinations and every one is built in every room. Goal and limitation set rotate across them rather
 * than multiplying them — each goal and each limitation set still meets every new field, and the sweep
 * stays at ~900 builds instead of 10,000 (the full product took 85 s, most of the suite's budget). The
 * old fields' own cross-product is `matrix.test.mjs`'s job, and it still runs in full.
 */
test('sweep: every combination builds, respects the walls, stays in the caps, and loses no pin', () => {
  const catalog = POOL.map((e) => ({ key: e.key, name: e.name, aliases: e.aliases }));
  const resolved = new Map();
  const keyOf = (name) => {
    if (!resolved.has(name)) resolved.set(name, resolveAgainstCatalog(name, catalog)?.key ?? null);
    return resolved.get(name);
  };
  let built = 0;
  let refused = 0;
  let combo = 0;
  const broken = [];
  for (const focusMuscles of FOCI) {
    for (const pinned of PINS) {
      for (const shape of SHAPES) {
        for (const [room, r] of Object.entries(ROOMS)) {
          for (let k = 0; k < 3; k++) {
            combo++;
            const goal = STRENGTH_GOALS[combo % STRENGTH_GOALS.length];
            const limitations = LIMITS[(combo + k * 2) % LIMITS.length];
            const c = base({ goal, ...r, limitations, focusMuscles, pinned, ...shape });
            const tag = `${goal}/${room}/${limitations.join('+') || 'none'}/${focusMuscles?.join('+') ?? '-'}/${pinned ? pinned.length : 0}pins/${shape.days ? `${shape.days.length}d-week` : (shape.daysPerWeek ?? 4)}`;
            let res;
            try {
              res = assemble(c, POOL, canDoExercise);
            } catch (e) {
              broken.push(`${tag}: THREW ${e.message}`);
              continue;
            }
            if (!res.ok) {
              refused++;
              continue;
            }
            built++;
            const a = res.assembly;
            const v = validate(a);
            if (!v.ok) broken.push(`${tag}: ${explain(v).split('\n')[0]}`);

            for (const e of a.structure.weekPlans.flatMap((w) => w.days).flatMap((d) => d.main)) {
              if (e.kind === 'cardio') {
                if (e.activity === 'run' && forbidsRunning(limitations)) broken.push(`${tag}: a run despite ${limitations}`);
                continue;
              }
              if (!allowed(e.catalogKey, c)) {
                broken.push(`${tag}: ${e.catalogKey} breaks a limitation or the room`);
                break;
              }
            }

            // Every pin is on a day, unresolved, or held — there is no fourth place.
            const placed = new Set(a.structure.weekPlans[0].days.flatMap((d) => d.main.map((e) => e.catalogKey)));
            const chosen = new Map(a.chosen.map((x) => [x.asked, x.catalogKey]));
            for (const p of pinned ?? []) {
              const key = chosen.get(p.name) ?? keyOf(p.name);
              const accounted = a.unresolved.includes(p.name) || a.held.some((h) => h.asked === p.name) || (key && placed.has(key));
              if (!accounted) broken.push(`${tag}: pin "${p.name}" vanished`);
            }
          }
        }
      }
    }
  }
  assert.ok(built > 800, `built ${built}`);
  assert.deepEqual(broken.slice(0, 20), [], `${broken.length} broken of ${built} built (${refused} refused)`);
});
