/**
 * hybrid-race.test.mjs — a race plan that keeps lifting, and the time the athlete is chasing.
 *
 * ══ THE TWO THINGS THE ENGINE COULD NOT SAY ══
 *
 * 1. **"Strong AND run a sub-25 5K."** The corpus is full of it — *"marathons and bench 3 plates"*,
 *    *"half marathon in Nov, also lift 3x"* — and only 5 of 18 casual hybrids landed in the live run. A
 *    race goal built a running-only block and a `days` week built flat easy runs with no race progression
 *    in them at all. Now they are ONE block: the run days come off the race plan's own volume curve, phases,
 *    taper and race week (`enduranceBlock`), and the rest are the strength rulebook's days
 *    (`planLifts` → `buildDay`), arranged by `INTERFERENCE_RULES`.
 *
 * 2. **A time.** "Sub-25 5K", "3:30 marathon". EPS-D10 allowed a pace only from a measured result; a target
 *    is the athlete's own number and now sets the paces when there is no result to beat it. A target beyond
 *    today's fitness is still built (PO 2026-09-21) with ONE sentence naming the gap in real numbers.
 *
 * Every test here fails on the engine before those existed: `liftDays` was ignored, `goalTimeSec` did not
 * exist, and a race build carried no lifting day at any day count.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/hybrid-race.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildPickerDb } from '../../exercise-picker/catalog-core.ts';
import { canDoExercise } from '../../home-gym/equipment.ts';
import { effectiveEquipment } from '../constraints.ts';
import { assemble } from '../assemble.ts';
import { validateProgram, explain } from '../validate-program.ts';
import {
  equipmentAfterLimitations,
  limitationExcludeKeys,
  limitationKeepKeys,
  limitationPatterns,
} from '../rulebook/limitations.ts';
import { LOWER_HEAVY_LEADS, LOWER_PATTERNS, MIN_ENDURANCE_DAYS } from '../rulebook/hybrid.ts';
import { RACE_SPEC, saidPace } from '../rulebook/endurance.ts';

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
  goal: 'run_half',
  experience: { lifting: 'intermediate', running: 'intermediate' },
  daysPerWeek: 6,
  sessionMinutes: 60,
  environment: 'full_gym',
  ownedEquipment: [],
  limitations: [],
  excludeExercises: [],
  currentWeeklyMi: 12,
  weeks: 12,
  ...over,
});
const build = (over) => assemble(base(over), POOL, canDoExercise);
const ok = (res) => {
  assert.ok(res.ok, res.ok ? '' : res.refusal.message);
  return res.assembly;
};
const validate = (a) => validateProgram(a.structure, { knownKeys: KNOWN, patternOf, category: a.category });

const weekOf = (a, i) => a.structure.weekPlans[i].days;
const lastWeek = (a) => weekOf(a, a.structure.weeks - 1);
const lifts = (day) => day.main.filter((e) => e.kind !== 'cardio');
const isRun = (day) => day.main.length > 0 && day.main.every((e) => e.kind === 'cardio');
const runMiles = (days) => days.flatMap((d) => d.main).reduce((n, e) => n + (e.targetMi ?? 0), 0);

/** What an endurance day asks of the legs, read off the name the rulebook gave it (`RUN_DEMAND`). */
const demandOf = (day) => {
  const name = day.name.replace(' [DELOAD]', '');
  if (name === 'Long Run' || name === 'Race Day' || name === 'Brick') return 'long';
  if (name === 'Tempo Run' || name === 'Intervals') return 'quality';
  return 'easy';
};

/** A lift day is heavy on the legs when it LEADS with a squat or a hinge — `isLowerHeavy`, from outside. */
const leadPattern = (day) => patternOf(lifts(day)[0]?.catalogKey ?? '') ?? '';
const isHeavyLower = (day) => LOWER_HEAVY_LEADS.includes(leadPattern(day));
const touchesLower = (day) => lifts(day).some((e) => LOWER_PATTERNS.includes(patternOf(e.catalogKey) ?? ''));

/**
 * The week as seven calendar days — `weekShape` filled with that week's built sessions.
 *
 * ⚠ THE REST DAYS ARE WHY THIS EXISTS. Walking the session list makes a rest day invisible, and a rest day
 * between a leg day and a long run is the whole answer to the interference rule.
 */
function calendar(a, weekIndex) {
  const days = weekOf(a, weekIndex);
  let k = 0;
  return (a.weekShape ?? []).map((s) => (s === 'rest' ? null : (days[k++] ?? null)));
}

/** Would the rulebook itself allow this movement for this athlete? The same gates `candidatesFor` applies. */
function allowed(key, c) {
  const ex = BY_KEY.get(key);
  if (!ex) return false;
  if (!canDoExercise(ex, equipmentAfterLimitations(effectiveEquipment(c), c.limitations))) return false;
  if (c.excludeExercises.includes(key)) return false;
  for (const l of c.limitations) {
    if (limitationExcludeKeys(l).includes(key)) return false;
    if (limitationPatterns(l).includes(ex.pattern) && !c.limitations.some((k) => limitationKeepKeys(k).includes(key))) return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. ONE BLOCK, TWO RULEBOOKS
// ─────────────────────────────────────────────────────────────────────────────

test('"half marathon in 12 weeks, lift 3x, currently 12 miles a week" — three runs, three lifts, one block', () => {
  const a = ok(build({ liftDays: 3 }));
  assert.equal(a.structure.weeks, 12);
  assert.equal(a.structure.daysPerWeek, 6);
  const shape = (kind) => a.weekShape.filter((s) => s === kind).length;
  assert.deepEqual([shape('run'), shape('lift'), shape('rest')], [3, 3, 1], a.weekShape.join(','));
  const w1 = weekOf(a, 0);
  assert.equal(w1.filter(isRun).length, 3, 'three running days');
  assert.equal(w1.filter((d) => !isRun(d)).length, 3, 'three lifting days');
  assert.match(a.structure.name, /Half marathon & Lifting Plan$/);
  const v = validate(a);
  assert.ok(v.ok, explain(v));
});

test('the run days ARE the race plan: same curve, same phases, same taper, same race week', () => {
  const hybrid = ok(build({ liftDays: 3 }));
  const pure = ok(build({ daysPerWeek: 3 }));
  assert.equal(hybrid.structure.weeks, pure.structure.weeks);
  for (let w = 0; w < pure.structure.weeks - 1; w += 1) {
    const mine = runMiles(weekOf(hybrid, w).filter(isRun));
    const theirs = runMiles(weekOf(pure, w));
    assert.ok(Math.abs(mine - theirs) < 0.01, `week ${w + 1}: ${mine} miles against the pure plan's ${theirs}`);
    assert.deepEqual(
      weekOf(hybrid, w).filter(isRun).map((d) => d.name.replace(' [DELOAD]', '')),
      weekOf(pure, w).map((d) => d.name.replace(' [DELOAD]', '')),
      `week ${w + 1}: the same sessions`,
    );
  }
  // The long run climbs — the same thing the pure plan does, and the thing a flat hybrid week never did.
  const long = (a) => a.structure.weekPlans.flatMap((w) => w.days).filter((d) => demandOf(d) === 'long').map((d) => d.main[0].targetMi ?? 0);
  assert.ok(Math.max(...long(hybrid)) > long(hybrid)[0], 'the long run is a progression, not a fixed distance');
  assert.equal(Math.max(...long(hybrid)), Math.max(...long(pure)), 'and it tops out where the pure plan does');
});

test('race week: the race is the last session of the last week, and nothing heavy is near it', () => {
  for (const liftDays of [1, 2, 3, 4]) {
    const a = ok(build({ goal: 'run_marathon', weeks: 16, currentWeeklyMi: 20, liftDays, buildAnyway: true }));
    const week = lastWeek(a);
    assert.equal(week[week.length - 1].name, 'Race Day', `${liftDays} lift days: the block does not end on the race`);
    for (const d of week.filter((x) => !isRun(x))) {
      assert.ok(!touchesLower(d), `${liftDays} lift days: ${d.name} trains the legs in race week`);
      assert.ok(lifts(d).length <= 3, `${liftDays} lift days: race week's lifting is not short`);
    }
  }
});

test('lifting days come out of the week, never on top of it, and every week is the same length', () => {
  const a = ok(build({ daysPerWeek: 5, liftDays: 2 }));
  assert.equal(a.structure.daysPerWeek, 5);
  for (let w = 0; w < a.structure.weeks; w += 1) {
    assert.equal(weekOf(a, w).length, 5, `week ${w + 1} is not five days`);
  }
});

test('liftDays: 0 is the pure race plan, untouched', () => {
  const plain = ok(build({ daysPerWeek: 4 }));
  const zero = ok(build({ daysPerWeek: 4, liftDays: 0 }));
  assert.equal(zero.structure.name, plain.structure.name);
  assert.deepEqual(weekOf(zero, 0).map((d) => d.name), weekOf(plain, 0).map((d) => d.name));
  assert.equal(zero.weekShape, undefined, 'no week shape where there is nothing to arrange');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. INTERFERENCE — advice when Holt arranges, one sentence when the athlete does
// ─────────────────────────────────────────────────────────────────────────────

test('Holt arranges: no heavy leg day the day before a long or quality run, and nothing to say about it', () => {
  for (const daysPerWeek of [3, 4, 5, 6]) {
    for (const liftDays of [1, 2, 3, 4]) {
      const a = ok(build({ daysPerWeek, liftDays }));
      const tag = `${daysPerWeek}d/${liftDays} lifts`;
      const week = calendar(a, 0);
      for (let i = 0; i < week.length; i += 1) {
        const today = week[i];
        const tomorrow = week[(i + 1) % week.length];
        if (!today || !tomorrow) continue;
        if (!isRun(today) && isRun(tomorrow) && demandOf(tomorrow) !== 'easy') {
          assert.ok(!isHeavyLower(today), `${tag}: ${today.name} the day before ${tomorrow.name}`);
        }
      }
      assert.ok(
        !a.concerns.some((s) => /day before/.test(s)),
        `${tag}: Holt chose the order, so there is nothing to warn about — ${a.concerns.join(' | ')}`,
      );
    }
  }
});

test('the day after the long run is upper or rest — never the legs again', () => {
  for (const daysPerWeek of [4, 5, 6]) {
    for (const liftDays of [1, 2, 3]) {
      const a = ok(build({ daysPerWeek, liftDays }));
      const week = calendar(a, 0);
      for (let i = 0; i < week.length; i += 1) {
        const today = week[i];
        const tomorrow = week[(i + 1) % week.length];
        if (!today || !tomorrow) continue;
        if (isRun(today) && demandOf(today) === 'long' && !isRun(tomorrow)) {
          assert.ok(!touchesLower(tomorrow), `${daysPerWeek}d/${liftDays}: ${tomorrow.name} the day after the long run`);
        }
      }
    }
  }
});

test('the athlete fixed the order: it is kept exactly, and the conflict is one sentence (CA-D12)', () => {
  const days = [
    { kind: 'lift', focus: 'legs' },
    { kind: 'run' },
    { kind: 'lift' },
    { kind: 'run' },
    { kind: 'lift' },
    { kind: 'run' },
    { kind: 'rest' },
  ];
  const a = ok(build({ weeks: null, raceDate: raceIn(12), days, daysAsGiven: true, currentWeeklyMi: 14 }));
  assert.deepEqual(a.weekShape, ['lift', 'run', 'lift', 'run', 'lift', 'run', 'rest'], 'their week, as they wrote it');
  const w1 = weekOf(a, 0);
  assert.deepEqual(w1.map(isRun), [false, true, false, true, false, true], 'their order, kept');
  assert.match(w1[0].name, /^Legs/, 'the day they named "legs" is a leg day');
  // Their own order puts a full-body lift the day before the long run. Holt says so once and builds it.
  const said = a.concerns.filter((s) => /day before your long run/.test(s));
  assert.equal(said.length, 1, `one sentence, not none and not two: ${a.concerns.join(' | ')}`);
  assert.ok(isHeavyLower(w1[4]) && demandOf(w1[5]) === 'long', 'the sentence is about a real clash');
  const v = validate(a);
  assert.ok(v.ok, explain(v));
});

test('a days week with a race date IS a race build; without one it stays a run-and-lift week', () => {
  const days = [{ kind: 'run' }, { kind: 'lift' }, { kind: 'run' }, { kind: 'lift' }, { kind: 'run' }];
  const dated = ok(build({ weeks: null, raceDate: raceIn(14), days, currentWeeklyMi: 14 }));
  const undated = ok(build({ weeks: null, days, currentWeeklyMi: 14 }));

  const longest = (a) => Math.max(...a.structure.weekPlans.flatMap((w) => w.days).map((d) => d.main[0]?.targetMi ?? 0));
  assert.ok(longest(dated) > 12, 'the dated week builds to the race — the half is 13.1 miles');
  assert.ok(longest(undated) < 12, 'the undated week is maintenance, as it always was');
  assert.ok(dated.structure.weekPlans.at(-1).days.some((d) => d.name === 'Race Day'), 'and it ends on the race');
  assert.ok(undated.concerns.some((s) => /not a race build/.test(s)), 'and the undated one still says so');
});

test('one running day is not a race block, whatever the date says', () => {
  const days = [{ kind: 'run' }, { kind: 'lift' }, { kind: 'lift' }];
  const a = ok(build({ weeks: null, raceDate: raceIn(14), days, currentWeeklyMi: 14 }));
  assert.ok(a.concerns.some((s) => /second running day/.test(s)), a.concerns.join(' | '));
  assert.ok(!a.structure.weekPlans.at(-1).days.some((d) => d.name === 'Race Day'));
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. TOTAL LOAD — fewer lifting days as the running peaks, said once
// ─────────────────────────────────────────────────────────────────────────────

test('a marathon block off 30 miles a week keeps fewer lifting days than asked, and says so once', () => {
  const a = ok(build({ goal: 'run_marathon', weeks: 16, currentWeeklyMi: 30, daysPerWeek: 6, liftDays: 4 }));
  const built = a.weekShape.filter((s) => s === 'lift').length;
  assert.ok(built < 4 && built >= 1, `${built} lifting days`);
  const said = a.concerns.filter((s) => /lifting day/.test(s));
  assert.equal(said.length, 1, a.concerns.join(' | '));
  assert.match(said[0], /miles a week/, 'the sentence names the mileage that caused it');
  const v = validate(a);
  assert.ok(v.ok, explain(v));
});

test('a 5K off twelve miles a week keeps all four, because that week can carry them', () => {
  const a = ok(build({ goal: 'run_5k', weeks: 8, currentWeeklyMi: 12, daysPerWeek: 6, liftDays: 4 }));
  assert.equal(a.weekShape.filter((s) => s === 'lift').length, 4);
  assert.ok(!a.concerns.some((s) => /lifting day/.test(s)), a.concerns.join(' | '));
});

test('the running keeps its floor: a marathon never drops below four running days for the barbell', () => {
  const a = ok(build({ goal: 'run_marathon', weeks: 16, currentWeeklyMi: 15, daysPerWeek: 6, liftDays: 4 }));
  assert.ok(a.weekShape.filter((s) => s === 'run').length >= 4, a.weekShape.join(','));
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. THE LIFTING IS THE STRENGTH RULEBOOK'S
// ─────────────────────────────────────────────────────────────────────────────

test('the lift days default to strength, and take the goal the athlete gives instead', () => {
  const strong = ok(build({ liftDays: 3 }));
  assert.equal(strong.category, 'STRENGTH');
  const big = ok(build({ liftDays: 3, strengthGoal: 'muscle' }));
  assert.equal(big.category, 'HYPERTROPHY');
  assert.notDeepEqual(
    weekOf(big, 0).filter((d) => !isRun(d)).map((d) => d.name),
    weekOf(strong, 0).filter((d) => !isRun(d)).map((d) => d.name),
  );
});

test('focus, pins, limitations and the room all reach the lift days of a race build', () => {
  const c = base({
    liftDays: 3,
    focusMuscles: ['glutes'],
    pinned: [{ name: 'bench', sets: 5, reps: 5 }, { name: 'no such lift' }],
    environment: 'home',
    ownedEquipment: ['dumbbells', 'bench', 'pullup', 'mat'],
    // ⚠ NOT `knees` — that one forbids running outright, and a race goal with it refuses (`forbidsRunning`).
    limitations: ['shoulders', 'no_overhead'],
  });
  const a = ok(assemble(c, POOL, canDoExercise));
  const rows = weekOf(a, 0).flatMap(lifts);
  assert.ok(rows.length > 0, 'there is lifting in it');
  for (const e of rows) assert.ok(allowed(e.catalogKey, c), `${e.name} is not allowed for this athlete`);
  assert.ok(rows.some((e) => e.catalogKey === 'dumbbell-bench-press' || /Bench Press/.test(e.name)), 'their bench is in it');
  assert.deepEqual(a.unresolved, ['no such lift'], 'a name nobody could match is asked back, never dropped');
  const v = validate(a);
  assert.ok(v.ok, explain(v));
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. RACE TIME GOALS — EPS-D10 extended
// ─────────────────────────────────────────────────────────────────────────────

const paceRows = (a) => a.structure.weekPlans.flatMap((w) => w.days).flatMap((d) => d.main).filter((e) => e.targetPaceSec != null);

test('"sub-25 5K in 8 weeks, 12 miles a week": paces from the target, and the gap named in real numbers', () => {
  const a = ok(build({ goal: 'run_5k', weeks: 8, currentWeeklyMi: 12, goalTimeSec: 25 * 60 }));
  assert.ok(paceRows(a).length > 0, 'the target is written as paces');
  const said = a.concerns.filter((s) => /stretch by the date/.test(s));
  assert.equal(said.length, 1, a.concerns.join(' | '));
  assert.equal(
    said[0],
    'A 25-minute 5K is 8:03 per mile; off 12 miles a week that is a stretch by the date — here is the plan that gets you closest.',
  );
  // ⚠ IT NEVER SHRINKS THE GOAL. The same plan, with and without the target on it (PO 2026-09-21).
  const quiet = ok(build({ goal: 'run_5k', weeks: 8, currentWeeklyMi: 12 }));
  assert.equal(a.structure.weeks, quiet.structure.weeks);
  assert.equal(runMiles(weekOf(a, 0)).toFixed(2), runMiles(weekOf(quiet, 0)).toFixed(2));
});

test('a 3:30 marathon is 8:00 per mile, and the sentence says so', () => {
  const a = ok(build({ goal: 'run_marathon', weeks: 16, currentWeeklyMi: 15, goalTimeSec: 3 * 3600 + 30 * 60, buildAnyway: true }));
  const said = a.concerns.filter((s) => /stretch by the date/.test(s));
  assert.equal(said.length, 1, a.concerns.join(' | '));
  assert.match(said[0], /^A 3:30 marathon is 8:00 per mile/);
});

test('a recent result beats a target — it is what they have actually run', () => {
  const target = ok(build({ goal: 'run_10k', weeks: 10, currentWeeklyMi: 20, goalTimeSec: 45 * 60 }));
  const both = ok(build({ goal: 'run_10k', weeks: 10, currentWeeklyMi: 20, goalTimeSec: 45 * 60, recentRaceMi: 3.1, recentRaceSec: 22 * 60 }));
  const easyOf = (a) => paceRows(a).find((e) => e.targetPaceSec != null).targetPaceSec;
  assert.notEqual(easyOf(target), easyOf(both), 'the result changes the paces');
  const result = ok(build({ goal: 'run_10k', weeks: 10, currentWeeklyMi: 20, recentRaceMi: 3.1, recentRaceSec: 22 * 60 }));
  assert.equal(easyOf(both), easyOf(result), 'and the target does not move them once there is one');
});

test('a target inside reach carries no concern; one far beyond a real result does', () => {
  // A 22-minute 5K is about a 46-minute 10K on Riegel; 50 minutes asks for nothing.
  const fine = ok(build({ goal: 'run_10k', weeks: 10, currentWeeklyMi: 20, recentRaceMi: 3.1, recentRaceSec: 22 * 60, goalTimeSec: 50 * 60 }));
  assert.ok(!fine.concerns?.some((s) => /stretch by the date/.test(s)), (fine.concerns ?? []).join(' | '));
  const far = ok(build({ goal: 'run_10k', weeks: 10, currentWeeklyMi: 20, recentRaceMi: 3.1, recentRaceSec: 22 * 60, goalTimeSec: 36 * 60 }));
  const said = far.concerns.filter((s) => /stretch by the date/.test(s));
  assert.equal(said.length, 1, far.concerns.join(' | '));
  assert.match(said[0], new RegExp(`is ${saidPace((36 * 60) / 6.2)} per mile`), said[0]);
});

test('no result and no target means no number anywhere — EPS-D10 is not weakened', () => {
  for (const liftDays of [0, 2]) {
    const a = ok(build({ goal: 'run_half', weeks: 12, currentWeeklyMi: 12, liftDays }));
    assert.equal(paceRows(a).length, 0, `${liftDays} lift days: a pace was invented`);
  }
});

test('a triathlon target time is not a pace, because the race has no distance in miles', () => {
  const a = ok(build({ goal: 'triathlon', weeks: 16, currentWeeklyMi: 10, liftDays: 2, goalTimeSec: 3 * 3600 }));
  assert.equal(paceRows(a).length, 0);
  assert.ok(!(a.concerns ?? []).some((s) => /stretch by the date/.test(s)));
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. THE SWEEP
// ─────────────────────────────────────────────────────────────────────────────

const RACES = ['run_5k', 'run_10k', 'run_half', 'run_marathon', 'triathlon'];
const WEEKS = [8, 12, 16];
const LIFT_DAYS = [0, 1, 2, 3, 4];
const DAYS = [3, 4, 5, 6];
const EXPERIENCES = ['beginner', 'intermediate', 'advanced'];
const ROOMS = [
  { environment: 'full_gym', ownedEquipment: [] },
  { environment: 'home', ownedEquipment: ['dumbbells', 'bench', 'pullup', 'bands', 'mat'] },
  { environment: 'bodyweight', ownedEquipment: [] },
];
const LIMITS = [[], ['knees'], ['lower_back'], ['no_barbell'], ['shoulders', 'no_overhead']];
const BASES = [0, 12, 25, 40];

const raceIn = (weeks) => new Date(Date.now() + weeks * 7 * 864e5).toISOString().slice(0, 10);

test('the sweep’s own wall check can fail — it is not a guard that passes everything', () => {
  assert.equal(allowed('barbell-back-squat', base({ limitations: ['no_barbell'] })), false);
  assert.equal(allowed('barbell-back-squat', base({ environment: 'bodyweight' })), false);
  assert.equal(allowed('barbell-deadlift', base({ limitations: ['lower_back'] })), false);
  assert.equal(allowed('barbell-back-squat', base()), true);
});

/*
 * ⚠ EVERY RACE × LENGTH × LIFT DAYS × WEEK SIZE × EXPERIENCE, with the room, the limitations, the base
 * mileage and the target time ROTATED across them rather than multiplied by them. The full cross-product is
 * 36,000 builds of multi-week programs; rotating keeps every room and every limitation set meeting every
 * race and every day count, at 900. `buildAnyway` is on throughout because that is what the chat sends for
 * a race (CA-D12) — nothing here is allowed to refuse.
 */
test('sweep: every race × length × lifting × week size builds, honestly, inside every gate', () => {
  const pure = new Map();
  const broken = [];
  let built = 0;
  let combo = 0;
  let withLifting = 0;
  let trimmed = 0;

  for (const goal of RACES) {
    for (const weeks of WEEKS) {
      for (const liftDays of LIFT_DAYS) {
        for (const daysPerWeek of DAYS) {
          for (const experience of EXPERIENCES) {
            combo += 1;
            const room = ROOMS[combo % ROOMS.length];
            const limitations = LIMITS[combo % LIMITS.length];
            const currentWeeklyMi = BASES[combo % BASES.length];
            // Every third build carries a target time — a sane one for the distance, and a stretch.
            const goalTimeSec = combo % 3 === 0 ? Math.round((RACE_SPEC[goal].raceMi ?? 0) * 420) || null : null;
            const c = base({
              goal,
              weeks,
              liftDays,
              daysPerWeek,
              experience: { lifting: experience, running: experience },
              ...room,
              limitations,
              currentWeeklyMi,
              goalTimeSec,
              buildAnyway: true,
            });
            const tag = `${goal}/${weeks}w/${liftDays}lift/${daysPerWeek}d/${experience}/${room.environment}/${limitations.join('+') || 'none'}/${currentWeeklyMi}mi`;

            let res;
            try {
              res = assemble(c, POOL, canDoExercise);
            } catch (e) {
              broken.push(`${tag}: THREW ${e.message}`);
              continue;
            }
            if (!res.ok) {
              broken.push(`${tag}: REFUSED ${res.refusal.reason} — ${res.refusal.message}`);
              continue;
            }
            built += 1;
            const a = res.assembly;

            // ── it builds, and it ends on the race ──
            if (a.structure.weekPlans.length !== a.structure.weeks) broken.push(`${tag}: weekPlans ≠ weeks`);
            const last = lastWeek(a);
            if (!last.some((d) => d.name === 'Race Day')) broken.push(`${tag}: the final week has no Race Day`);
            for (const [w, week] of a.structure.weekPlans.entries()) {
              if (week.days.length === 0) broken.push(`${tag}: week ${w + 1} has no sessions`);
              for (const d of week.days) if (d.main.length === 0) broken.push(`${tag}: week ${w + 1} "${d.name}" is empty`);
            }

            // ── a pace exists only where a target or a result does (EPS-D10) ──
            const paced = paceRows(a).length > 0;
            const canPace = goalTimeSec != null && RACE_SPEC[goal].raceMi != null;
            if (paced !== canPace) broken.push(`${tag}: paces ${paced ? 'written' : 'absent'} with target ${goalTimeSec ?? 'none'}`);

            // ── the walls, on week 1 and on race week ──
            for (const d of [...weekOf(a, 0), ...last]) {
              for (const e of lifts(d)) {
                if (!allowed(e.catalogKey, c)) broken.push(`${tag}: ${e.name} on ${d.name} is not allowed`);
              }
            }

            if (liftDays === 0 || !a.weekShape) {
              /* ⚠ THE PURE RACE PLAN IS NOT HELD TO `validateProgram` HERE, AND THAT IS PRE-EXISTING. Its
                 weeks do not carry PAS-D8's `[DELOAD]` marker and its race week is shorter than its other
                 weeks at five and six days — which is why `matrix.test.mjs` sweeps the split goals only. A
                 race block that keeps lifting has both (the marker comes from the lift days, the length from
                 `keepDaysInRaceWeek`), so the gate is asserted for every one of those below. */
              continue;
            }
            withLifting += 1;

            // ── the week is rectangular, and the shape agrees with the sessions ──
            const runs = a.weekShape.filter((s) => s === 'run').length;
            const written = a.weekShape.filter((s) => s === 'lift').length;
            if (runs < MIN_ENDURANCE_DAYS) broken.push(`${tag}: ${runs} running days`);
            if (written > liftDays) broken.push(`${tag}: ${written} lifting days, more than the ${liftDays} asked for`);
            if (written < liftDays) trimmed += 1;
            if (written < liftDays && !a.concerns.some((s) => /lifting day/.test(s))) {
              broken.push(`${tag}: ${written} of ${liftDays} lifting days and nothing said about it`);
            }
            if (runs + written !== a.structure.daysPerWeek) broken.push(`${tag}: shape ≠ daysPerWeek`);
            for (const [w, week] of a.structure.weekPlans.entries()) {
              if (week.days.length !== a.structure.daysPerWeek) broken.push(`${tag}: week ${w + 1} is ${week.days.length} days`);
            }

            // ── the volume curve is the pure plan's ──
            const key = `${goal}/${weeks}/${runs}/${experience}/${currentWeeklyMi}/${goalTimeSec}`;
            if (!pure.has(key)) {
              const r = assemble(base({ ...c, liftDays: 0, daysPerWeek: runs }), POOL, canDoExercise);
              pure.set(key, r.ok ? r.assembly : null);
            }
            const mirror = pure.get(key);
            if (mirror && mirror.structure.weeks === a.structure.weeks) {
              for (let w = 0; w < a.structure.weeks - 1; w += 1) {
                const mine = runMiles(weekOf(a, w).filter(isRun));
                const theirs = runMiles(weekOf(mirror, w));
                if (Math.abs(mine - theirs) > 0.05) {
                  broken.push(`${tag}: week ${w + 1} runs ${mine} miles against the pure plan's ${theirs}`);
                  break;
                }
              }
            }

            // ── interference: Holt's order obeys the rules; there is no athlete order in this sweep ──
            const week1 = calendar(a, 0);
            for (let i = 0; i < week1.length; i += 1) {
              const today = week1[i];
              const tomorrow = week1[(i + 1) % week1.length];
              if (!today || !tomorrow) continue;
              if (!isRun(today) && isRun(tomorrow) && demandOf(tomorrow) !== 'easy' && isHeavyLower(today)) {
                broken.push(`${tag}: ${today.name} the day before ${tomorrow.name}`);
              }
            }

            // ── and the gates the wizard runs before anybody sees it ──
            const v = validate(a);
            if (!v.ok) broken.push(`${tag}: ${explain(v).split('\n')[0]}`);
          }
        }
      }
    }
  }

  assert.equal(broken.length, 0, `${broken.length} of ${built} builds broke:\n${broken.slice(0, 12).join('\n')}`);
  assert.equal(built, RACES.length * WEEKS.length * LIFT_DAYS.length * DAYS.length * EXPERIENCES.length);
  assert.ok(withLifting > 600, `${withLifting} builds carried lifting`);
  assert.ok(trimmed > 0, 'the load rule never bit — the sweep is not reaching it');
});
