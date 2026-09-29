/**
 * holtai-04.test.mjs — "Dumbbells only at home" (QA 2026-09-26).
 *
 * The tester typed "dumbbells only at home", knees to look after, three days. Holt built from their EMPTY
 * home gym without asking — three days of push-ups and squats, no dumbbell, no row — promised "I'll keep
 * your knees out of it" over two squat days, and coached a push-up with "shoulder blades pinned to the
 * bench" and a bodyweight squat with "be violent out of the bottom". The Builder then showed "3-5" as "3".
 *
 * Every link of that chain is asserted here against the REAL catalogue (the visible `PICKER_DB` shape).
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/holtai-04.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildPickerDb } from '../../exercise-picker/catalog-core.ts';
import { canDoExercise } from '../../home-gym/equipment.ts';
import { assemble } from '../assemble.ts';
import { buildDayWorkout } from '../day.ts';
import { nextQuestion, needsGear } from '../chat-core.ts';
import { typedEquipment } from '../typed-equipment.ts';
import { cueFor } from '../rulebook/cues.ts';
import { CONCERN } from '../rulebook/hybrid.ts';
import { repsText, stepReps } from '../../../lib/program-draft-model.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (f) => JSON.parse(readFileSync(path.join(here, '../../exercise-relationships/source', f), 'utf8'));
const POOL = buildPickerDb({
  exercises: src('exercises.json'),
  exerciseMuscles: src('exercise_muscles.json'),
  muscles: src('muscles.json'),
  equipment: src('equipment.json'),
});
const BY_KEY = new Map(POOL.map((e) => [e.key, e]));
const isPull = (k) => /Pull$/.test(BY_KEY.get(k)?.pattern ?? '');

const strength = (over = {}) => ({
  goal: 'strength',
  experience: { lifting: 'beginner', running: 'beginner' },
  daysPerWeek: 3,
  sessionMinutes: 45,
  environment: 'home',
  ownedEquipment: ['dumbbells'],
  limitations: ['knees'],
  excludeExercises: [],
  ...over,
});
const keysOf = (res) => res.assembly.structure.weekPlans.flatMap((w) => w.days.flatMap((d) => d.main.map((e) => e.catalogKey)));

// ── 1. The sentence is heard ────────────────────────────────────────────────────────────────────────

test('"dumbbells only" is dumbbells, at home', () => {
  assert.deepEqual(typedEquipment('Dumbbells only at home'), { environment: 'home', ownedEquipment: ['dumbbells'] });
  assert.deepEqual(typedEquipment('just DBs'), { environment: 'home', ownedEquipment: ['dumbbells'] });
  assert.deepEqual(typedEquipment('I have dumbbells and a bench').ownedEquipment, ['dumbbells', 'bench']);
  assert.deepEqual(typedEquipment('no bench, just dumbbells').ownedEquipment, ['dumbbells'], 'a negated item is left out');
  assert.deepEqual(typedEquipment('a couple of mini bands').ownedEquipment, ['minibands'], 'a loop band is not a long band');
  assert.deepEqual(typedEquipment('no equipment at all'), { environment: 'bodyweight' });
  assert.equal(typedEquipment('I train at a commercial gym, dumbbells up to 50'), null, 'a gym they train AT is the model\'s call');
  assert.equal(typedEquipment('3 days a week, 45 minutes'), null);
});

// ── 2. An empty home gym is asked about ─────────────────────────────────────────────────────────────

const walk = (start) => {
  let c = { ...start };
  const seen = [];
  for (let i = 0; i < 20; i++) {
    const q = nextQuestion(c, 'program');
    if (!q) break;
    seen.push(q.id);
    const pickChip = q.id === 'gear' ? q.chips[q.chips.length - 1] : q.chips[0];
    c = { ...c, ...pickChip.patch };
  }
  return { seen, c };
};

test('"My home gym" with nothing on file asks what is in it — and "Nothing" ends the question', () => {
  for (const owned of [undefined, []]) {
    const { seen, c } = walk({ goal: 'strength', environment: 'home', ...(owned ? { ownedEquipment: owned } : {}) });
    assert.ok(seen.includes('gear'), `home with ${JSON.stringify(owned)} on file must ask`);
    assert.equal(seen.filter((id) => id === 'gear').length, 1, 'asked once');
    assert.equal(c.environment, 'bodyweight');
  }
  assert.ok(!walk({ goal: 'strength', environment: 'home', ownedEquipment: ['dumbbells'] }).seen.includes('gear'));
  assert.ok(!walk({ goal: 'strength', environment: 'full_gym' }).seen.includes('gear'));
  assert.equal(needsGear({ environment: 'home', ownedEquipment: ['kettlebells'] }), false);
});

test('the day flow asks too', () => {
  const q = nextQuestion({ dayFocus: { kind: 'split', split: 'full_body' }, goal: 'strength', sessionMinutes: 45, environment: 'home', ownedEquipment: [] }, 'day');
  assert.equal(q?.id, 'gear');
});

// ── 3. The block ─────────────────────────────────────────────────────────────────────────────────────

test('the tester\'s ask builds with dumbbells and a pull on the plan', () => {
  const res = assemble(strength(), POOL, canDoExercise);
  assert.ok(res.ok);
  const keys = keysOf(res);
  assert.ok(keys.some((k) => BY_KEY.get(k)?.equipId === 'dumbbell'), 'dumbbells were the whole point');
  assert.ok(keys.some(isPull), 'a strength block with dumbbells has a row in it');
});

test('never a strength block without pulling unless nothing owned can pull — and then Holt says so', () => {
  const rooms = [
    ['home', ['dumbbells']],
    ['home', ['kettlebells']],
    ['home', ['bands']],
    ['home', ['dumbbells', 'bench', 'pullup', 'bands', 'mat']],
    ['full_gym', []],
    ['bodyweight', []],
    ['home', []],
  ];
  const wrong = [];
  for (const goal of ['strength', 'muscle', 'weight_loss', 'health']) {
    for (const [environment, ownedEquipment] of rooms) {
      for (const daysPerWeek of [2, 3, 4, 5]) {
        for (const limitations of [[], ['knees'], ['shoulders'], ['lower_back']]) {
          const res = assemble(strength({ goal, environment, ownedEquipment, daysPerWeek, limitations }), POOL, canDoExercise);
          if (!res.ok) continue;
          const pulls = keysOf(res).some(isPull);
          const reachable = environment !== 'bodyweight' && POOL.some((e) => /Pull$/.test(e.pattern) && canDoExercise(e, environment === 'full_gym' ? ['dumbbells', 'cable', 'latpulldown', 'barbell', 'plates'] : ownedEquipment));
          const said = (res.assembly.concerns ?? []).includes(CONCERN.noPulling());
          if (reachable && !pulls) wrong.push(`${goal}/${environment}/${ownedEquipment}/${daysPerWeek}/${limitations}: no pull though one is reachable`);
          if (!pulls && !said) wrong.push(`${goal}/${environment}/${ownedEquipment}/${daysPerWeek}/${limitations}: no pull and Holt said nothing`);
          if (pulls && said) wrong.push(`${goal}/${environment}/${ownedEquipment}/${daysPerWeek}/${limitations}: says no pull over a block that has one`);
        }
      }
    }
  }
  assert.deepEqual(wrong, []);
});

test('a single full-body day with dumbbells has a pull (the day builder is the other fill path)', () => {
  const r = buildDayWorkout(
    { focus: { kind: 'split', split: 'full_body' }, goal: 'strength', sessionMinutes: 45, experience: 'beginner', environment: 'home', ownedEquipment: ['dumbbells'], limitations: ['knees'] },
    POOL,
    canDoExercise,
  );
  assert.ok(r.day.main.some((e) => isPull(e.catalogKey)));
});

test('knees: Holt says what the flag did, instead of promising the knees are out of it', () => {
  const res = assemble(strength(), POOL, canDoExercise);
  const squats = keysOf(res).some((k) => BY_KEY.get(k)?.pattern === 'Squat / Knee Dominant');
  assert.equal((res.assembly.concerns ?? []).includes(CONCERN.kneesKeptSquats()), squats);
  const none = assemble(strength({ limitations: [] }), POOL, canDoExercise);
  assert.ok(!(none.assembly.concerns ?? []).includes(CONCERN.kneesKeptSquats()), 'no knee line without the knee flag');
});

// ── 4. The words on each exercise ────────────────────────────────────────────────────────────────────

test('cues fit the exercise, not just its pattern', () => {
  const on = (key, goal = 'strength', isPrimary = false) => {
    const ex = BY_KEY.get(key);
    assert.ok(ex, key);
    return cueFor({ pattern: ex.pattern, goal, experience: 'beginner', isPrimary, name: ex.name, equipId: ex.equipId }) ?? '';
  };
  assert.doesNotMatch(on('push-up'), /bench/i, 'a push-up has no bench');
  assert.match(on('barbell-bench-press'), /bench/i);
  assert.doesNotMatch(on('glute-bridge'), /\bbar\b/i, 'a glute bridge has no bar');
  assert.doesNotMatch(on('walking-lunge'), /out of the hole/i);
  assert.doesNotMatch(on('bodyweight-squat', 'strength', true), /violent/i, 'nothing to be violent against at bodyweight');
  assert.match(on('barbell-back-squat', 'strength', true), /violent|mean it/i, 'a loaded strength lift keeps its intent');

  // And across every Holt-built day of the tester's ask, no push-up hears about a bench.
  const res = assemble(strength({ ownedEquipment: [] }), POOL, canDoExercise);
  for (const d of res.assembly.structure.days) {
    for (const e of d.main) {
      if (/push-?up/i.test(e.name)) assert.doesNotMatch(e.coachNote ?? '', /bench/i, e.name);
      if (BY_KEY.get(e.catalogKey)?.equipId === 'bodyweight') assert.doesNotMatch(e.coachNote ?? '', /violent/i, e.name);
    }
  }
});

// ── 5. The Builder keeps the range ───────────────────────────────────────────────────────────────────

test('"3–5" stays "3–5" in the Builder, and stepping moves the range', () => {
  assert.equal(repsText({ reps: 3, repsMax: 5 }), '3–5');
  assert.equal(repsText({ reps: 8, repsMax: null }), '8');
  assert.equal(repsText({ reps: 12, repsMax: 12 }), '12');
  assert.deepEqual(stepReps({ reps: 3, repsMax: 5 }, 1), { reps: 4, repsMax: 6 });
  assert.deepEqual(stepReps({ reps: 8 }, -1), { reps: 7 });
  assert.deepEqual(stepReps({ reps: 1, repsMax: 2 }, -1), { reps: 1, repsMax: null }, 'a range squeezed to one number becomes that number');
});
