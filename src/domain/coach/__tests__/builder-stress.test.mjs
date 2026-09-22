/**
 * builder-stress.test.mjs — the six findings of the 2026-09-21 Holt stress sweep, one test each.
 *
 * ══ WHY THESE ARE HERE AND NOT IN THE MATRIX ══
 *
 * Every one of these passed every existing test while it was broken, because each lived in a corner the
 * matrix does not reach: a row nobody checked the NAME of, a split style the matrix never sends with
 * mobility, a session length it never asked for, a title nobody compared with its own contents, a card
 * nobody read against the sentence above it, and a number that is not a number. Each test below failed
 * on the code before its fix, and states the count the sweep measured so the size of the hole is on
 * record next to the thing that closed it.
 *
 * Real catalogue, like `matrix.test.mjs` — the question is what the rulebook does to real exercises.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/builder-stress.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildPickerDb } from '../../exercise-picker/catalog-core.ts';
import { canDoExercise } from '../../home-gym/equipment.ts';
import { assemble } from '../assemble.ts';
import { validateProgram } from '../validate-program.ts';
import { SPLIT_STYLES } from '../rulebook/skeletons.ts';
import { GOAL_CATEGORY } from '../rulebook/volume.ts';
import { rationaleFor } from '../rulebook/rationale.ts';
import { buildDayWorkout, BODY_PARTS, BODY_PART_LABEL } from '../day.ts';
import { completeFor, preamble, programCardFor, refusalCardFor, weeksBetween } from '../chat-core.ts';

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

const build = (c) => assemble(c, POOL, canDoExercise);
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
const ROOMS = [
  ['full_gym', []],
  ['home', ['dumbbells', 'bench', 'pullup', 'bands', 'mat']],
  ['home', ['dumbbells']],
  ['bodyweight', []],
];
const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

// ─────────────────────────────────────────────────────────────────────────────
// 1 — THE CARDIO FINISHER HAS A NAME
// ─────────────────────────────────────────────────────────────────────────────

test('a cardio finisher is named, so it never renders as a blank row on the card', () => {
  // Sweep: 750 of 750 conditioning and weight-loss builds carried a finisher with no `name`.
  let finishers = 0;
  for (const goal of ['conditioning', 'weight_loss']) {
    for (const [environment, ownedEquipment] of ROOMS) {
      for (const daysPerWeek of [2, 3, 4, 5, 6]) {
        const c = base({ goal, environment, ownedEquipment, daysPerWeek });
        const res = build(c);
        assert.ok(res.ok, res.ok ? '' : res.refusal.message);
        for (const day of res.assembly.structure.weekPlans[0].days) {
          for (const e of day.main.filter((x) => x.kind === 'cardio')) {
            finishers++;
            assert.ok(typeof e.name === 'string' && e.name.trim(), `${goal}/${environment}: a ${e.activity} finisher has no name`);
            assert.equal(e.catalogKey, `cardio:${e.activity}`, 'a bout carries the cardio:<activity> key, like every other one');
          }
        }
        const card = programCardFor(c, res.assembly.structure, [], 'because');
        for (const w of card.weeks) for (const d of w.days) for (const item of d.items) {
          assert.ok(item.name, `${goal}/${environment}: a program-card row rendered with no name`);
        }
      }
    }
  }
  assert.ok(finishers > 0, 'the sweep must actually have met a finisher');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2 — A SPLIT STYLE DOES NOT TURN MOBILITY INTO A BARBELL PROGRAM
// ─────────────────────────────────────────────────────────────────────────────

test('a mobility block stays a mobility block whatever split style arrives with it', () => {
  // Sweep: 225 of 300 styled mobility builds were lifting skeletons prescribed as holds —
  // "Barbell Back Squat 2×45s". `program-guided.tsx` always sends a style, so every guided build.
  for (const [environment, ownedEquipment] of ROOMS) {
    for (const daysPerWeek of [2, 3, 4, 5, 6]) {
      const plain = build(base({ goal: 'mobility', environment, ownedEquipment, daysPerWeek }));
      assert.ok(plain.ok);
      for (const splitStyle of SPLIT_STYLES) {
        const res = build(base({ goal: 'mobility', environment, ownedEquipment, daysPerWeek, splitStyle }));
        assert.ok(res.ok);
        const lifts = res.assembly.structure.weekPlans[0].days
          .flatMap((d) => d.main)
          .filter((e) => {
            const x = BY_KEY.get(e.catalogKey);
            // By PATTERN — the slot the skeleton asked for. (Active Hang is filed Mobility / modality Strength.)
            return x && x.pattern !== 'Mobility' && x.pattern !== 'Core';
          });
        assert.deepEqual(lifts.map((e) => e.name), [], `mobility + ${splitStyle} (${daysPerWeek}d, ${environment}) prescribed lifts as holds`);
        assert.deepEqual(res.assembly.structure, plain.assembly.structure, 'the style is set aside, so the block is the unstyled one');
      }
    }
  }
  // And Holt does not give a reason for a split he did not use.
  const why = rationaleFor({ goal: 'mobility', daysPerWeek: 3, sessionMinutes: 60, weeks: 4, splitStyle: 'ppl', deloadWeeks: [] });
  assert.doesNotMatch(why, /push, pull and legs/i);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3 — THE BUILDER HOLDS ITS OWN VALIDATOR'S SET CEILING
// ─────────────────────────────────────────────────────────────────────────────

test("an advanced 75-minute hypertrophy day stays inside PAS-D11's set ceiling, and keeps its length", () => {
  // Sweep: 75 of 125 advanced 75-minute muscle builds wrote 32 sets against HYPERTROPHY's 30.
  for (const [environment, ownedEquipment] of ROOMS) {
    for (const daysPerWeek of [2, 3, 4, 5, 6]) {
      const res = build(base({ goal: 'muscle', experience: { lifting: 'advanced', running: 'advanced' }, sessionMinutes: 75, environment, ownedEquipment, daysPerWeek }));
      assert.ok(res.ok);
      const v = validateProgram(res.assembly.structure, { knownKeys: KNOWN, patternOf, category: GOAL_CATEGORY.muscle });
      assert.deepEqual(v.failures.filter((f) => f.code === 'volume_ceiling').map((f) => f.message), [], `${environment} ${daysPerWeek}d`);
    }
  }
  const gym = build(base({ goal: 'muscle', experience: { lifting: 'advanced', running: 'advanced' }, sessionMinutes: 75 }));
  assert.equal(gym.assembly.structure.weekPlans[0].days[0].main.length, 8, 'the ceiling trims the tail, it does not shorten the session');
});

// ─────────────────────────────────────────────────────────────────────────────
// 4 — A DAY IS TITLED WITH WHAT IT TRAINS
// ─────────────────────────────────────────────────────────────────────────────

test('a body-part day is titled only with the parts it actually trains', () => {
  // Sweep: 27,486 of 36,126 multi-part days named a part the session did not contain.
  const empty = buildDayWorkout(
    { focus: { kind: 'body_parts', parts: ['chest', 'back'] }, sessionMinutes: 60, experience: 'intermediate', environment: 'home', ownedEquipment: [], limitations: [], goal: 'muscle' },
    POOL,
    canDoExercise,
  );
  assert.ok(empty.missing.includes('back'), 'an empty home has no pulling movement — the premise of this test');
  assert.equal(empty.day.name, 'Chest', 'four push-ups are a chest day, not "Chest & Back"');

  let lies = 0;
  for (let m = 1; m < 1 << BODY_PARTS.length; m++) {
    const parts = BODY_PARTS.filter((_, i) => m & (1 << i));
    if (parts.length < 2) continue;
    for (const [environment, ownedEquipment] of [['home', []], ['full_gym', []]]) {
      const r = buildDayWorkout(
        { focus: { kind: 'body_parts', parts }, sessionMinutes: 30, experience: 'intermediate', environment, ownedEquipment, limitations: [], goal: 'muscle' },
        POOL,
        canDoExercise,
      );
      for (const p of r.missing) if (BODY_PARTS.includes(p) && r.day.name.includes(BODY_PART_LABEL[p])) lies++;
    }
  }
  assert.equal(lies, 0, `${lies} titles named a body part their session did not train`);
});

// ─────────────────────────────────────────────────────────────────────────────
// 5 — THE REFUSAL'S CARD OFFERS THE RACE ITS TEXT DOES, AND THAT RACE BUILDS
// ─────────────────────────────────────────────────────────────────────────────

test("a refusal's card offers the same race its text recommends, and accepting it builds", () => {
  // Sweep: 14,976 of 14,976 cannot-run refusals said "start with the 5K" over a card offering the
  // 10K or the half — each of which refused again when tapped.
  for (const goal of ['run_10k', 'run_half', 'run_marathon']) {
    for (const days of [84, 30, 56]) {
      const c = completeFor({ goal, daysPerWeek: 4, raceDate: inDays(days), currentWeeklyMi: 10, canRunContinuously: false }, 'program');
      const res = build(c);
      assert.equal(res.ok, false);
      const card = refusalCardFor(c.goal, weeksBetween(c.raceDate), c.daysPerWeek, res.refusal.message);
      if (days < 42) {
        assert.equal(card, null, `${goal} with ${Math.floor(days / 7)} weeks: not even a 5K fits, so nothing is offered`);
        assert.doesNotMatch(res.refusal.message, /I'll build the 5K/);
        continue;
      }
      assert.ok(card, `${goal}: a cannot-run refusal with time for a 5K offers it`);
      assert.match(res.refusal.message, /5K/);
      assert.equal(card.altGoal, 'run_5k', `${goal}: the text says the 5K, so the card must too`);
      const accepted = build({ ...c, goal: card.altGoal });
      assert.ok(accepted.ok, `${goal}: accepting the counter-offer refused — ${accepted.ok ? '' : accepted.refusal.message}`);
    }
  }
  // One step down the table is not enough: a 10K with five weeks offered the 5K, which needs six.
  const tooSoon = completeFor({ goal: 'run_10k', daysPerWeek: 4, raceDate: inDays(38), currentWeeklyMi: 10, canRunContinuously: true }, 'program');
  const r = build(tooSoon);
  assert.equal(r.ok, false);
  assert.equal(refusalCardFor(tooSoon.goal, weeksBetween(tooSoon.raceDate), 4, r.refusal.message), null);
});

// ─────────────────────────────────────────────────────────────────────────────
// 6 — A NUMBER THAT IS NOT A NUMBER IS NOT AN ANSWER
// ─────────────────────────────────────────────────────────────────────────────

test('a NaN day count or block length takes the default instead of building nothing or crashing', () => {
  // Sweep: `daysPerWeek: NaN` on a race goal returned ok with 0 sessions and "NaN days" in the preamble;
  // `weeks: NaN` threw on `weekPlans[0].days`.
  for (const goal of ['run_5k', 'run_half']) {
    const c = completeFor({ goal, daysPerWeek: NaN, raceDate: inDays(16 * 7 + 3), currentWeeklyMi: 20, canRunContinuously: true }, 'program');
    const res = build(c);
    assert.ok(res.ok);
    const sessions = res.assembly.structure.weekPlans.reduce((n, w) => n + w.days.length, 0);
    assert.ok(sessions > 0, `${goal}: a plan with zero sessions is not a plan`);
    assert.doesNotMatch(preamble(c, res.assembly.structure.weeks), /NaN/);
  }

  const strength = build(base({ daysPerWeek: NaN }));
  assert.ok(strength.ok, strength.ok ? '' : strength.refusal.message);
  assert.equal(strength.assembly.structure.weekPlans[0].days.length, 4);

  let weeks;
  assert.doesNotThrow(() => { weeks = build(base({ weeks: NaN })); });
  assert.ok(weeks.ok);
  assert.equal(weeks.assembly.structure.weeks, 8, 'NaN weeks is the default length, not an array of length NaN');
});
