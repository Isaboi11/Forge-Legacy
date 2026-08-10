/**
 * chat-build-path.test.mjs — the sheet must never freeze, for any athlete.
 *
 * ══ THE BUG THIS EXISTS FOR ══
 *
 * `CoachChatSheet` disables its composer while `busy` is set — correctly, you cannot answer a question
 * Holt has not finished asking. But `busy` was cleared only on the paths that succeeded, so a throw
 * anywhere in assembly left it set forever: typing bubble pulsing, input dead, no error, no way out but
 * to kill the app. The PO reported it as "stalled or frozen", which is exactly what it was.
 *
 * ⚠ THE `try/finally` IN THE SHEET IS THE SAFETY NET, NOT THE FIX. A caught exception still means the
 * athlete asked for a program and got an apology. This file is the fix: it drives the REAL build path —
 * the same calls in the same order the sheet makes them — across every combination the chat can produce,
 * and fails if any of them throws.
 *
 * ⚠ AND IT COVERS THE HELPERS THAT USED TO BE UNREACHABLE. `completeFor`, `volumeFor` and `weeksBetween`
 * were defined inside the component file, which meant no test could import them, which meant the three
 * functions standing between a tapped chip and a finished program had zero coverage. They live in
 * `chat-core.ts` now for exactly this reason.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/chat-build-path.test.mjs
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
import { AUTHORED_GOALS } from '../rulebook/skeletons.ts';
import { rationaleFor } from '../rulebook/rationale.ts';
import {
  completeFor,
  volumeFor,
  weeksBetween,
  programCardFor,
  dayCardFor,
  refusalCardFor,
  nextQuestion,
  readyToBuild,
  preamble,
} from '../chat-core.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (f) => JSON.parse(readFileSync(path.join(here, '../../exercise-relationships/source', f), 'utf8'));

const POOL = buildPickerDb({
  exercises: src('exercises.json'),
  exerciseMuscles: src('exercise_muscles.json'),
  muscles: src('muscles.json'),
  equipment: src('equipment.json'),
});

/**
 * Everything `advance()` does between the last tapped chip and a rendered card, in that order.
 *
 * It deliberately mirrors the sheet rather than importing it — the component cannot be imported under
 * `node --test` — so if the sheet's order of operations changes, this must change with it.
 */
function runBuildPath(partial, mode) {
  // The mode decides which questions exist at all — a day never asks a program's questions.
  if (!readyToBuild(partial, mode)) return { outcome: 'asked', question: nextQuestion(partial, mode) };

  const c = completeFor(partial, mode);

  if (mode === 'day') {
    const r = buildDayWorkout(
      {
        focus: partial.dayFocus ?? { kind: 'split', split: 'full_body' },
        /* The goal decides the prescription AND the cue — 5 × 5 heavy or 3 × 12, and what he says about it. */
        goal: c.goal,
        sessionMinutes: c.sessionMinutes,
        experience: c.experience.lifting,
        environment: c.environment,
        ownedEquipment: c.ownedEquipment,
        limitations: c.limitations,
      },
      POOL,
      canDoExercise,
    );
    if (r.day.main.length === 0) return { outcome: 'empty-day' };
    return { outcome: 'day', card: dayCardFor(partial, r.day) };
  }

  const res = assemble(c, POOL, canDoExercise);
  if (!res.ok) {
    // The refusal path builds a card too, and a throw here freezes the sheet just as hard.
    refusalCardFor(c.goal, weeksBetween(c.raceDate), c.daysPerWeek, res.refusal.message);
    return { outcome: 'refused' };
  }

  const structure = res.assembly.structure;
  const volume = volumeFor(c, structure.weeks);
  const reason = rationaleFor({
    goal: c.goal,
    daysPerWeek: c.daysPerWeek,
    sessionMinutes: c.sessionMinutes,
    weeks: structure.weeks,
    splitStyle: c.splitStyle ?? null,
    deloadWeeks: res.assembly.deloadWeeks,
    restructuredBecause: res.assembly.restructured?.because,
  });
  preamble(c, structure.weeks);
  return { outcome: 'built', card: programCardFor(c, structure, volume, reason) };
}

// A race far enough out that every distance is reachable, so refusals in this file are rulebook
// decisions rather than an artefact of the date.
const RACE = new Date(Date.now() + 300 * 24 * 3600 * 1000).toISOString().slice(0, 10);

const ENVIRONMENTS = ['full_gym', 'home', 'bodyweight', 'outdoor'];
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const LIMITATIONS = [[], ['knees'], ['shoulders'], ['lower_back'], ['no_jumping'], ['no_barbell'], ['knees', 'shoulders', 'lower_back']];

function* everyAthlete() {
  for (const goal of AUTHORED_GOALS) {
    for (const environment of ENVIRONMENTS) {
      for (const level of LEVELS) {
        for (const daysPerWeek of [2, 3, 4, 5, 6]) {
          for (const sessionMinutes of [30, 45, 60, 75]) {
            for (const limitations of LIMITATIONS) {
              yield {
                goal,
                environment,
                daysPerWeek,
                sessionMinutes,
                limitations,
                experience: { lifting: level, running: level },
                ownedEquipment: environment === 'home' ? ['dumbbells', 'bench'] : [],
                raceDate: RACE,
                currentWeeklyMi: 12,
                canRunContinuously: true,
              };
            }
          }
        }
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// THE ASSERTION THAT WOULD HAVE CAUGHT THE FREEZE
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ no athlete the chat can describe makes the build path throw', () => {
  const failures = [];
  let ran = 0;

  for (const athlete of everyAthlete()) {
    ran++;
    try {
      runBuildPath(athlete, 'program');
    } catch (e) {
      const who = `${athlete.goal}/${athlete.environment}/${athlete.experience.lifting}/${athlete.daysPerWeek}d/${athlete.sessionMinutes}m/[${athlete.limitations}]`;
      failures.push(`${who} → ${e.message}`);
    }
  }

  assert.ok(ran > 1000, `expected a real cross-product, ran ${ran}`);
  assert.deepEqual(failures.slice(0, 10), [], `${failures.length} of ${ran} threw`);
});

test('⚠ the single-day path throws for nobody either', () => {
  const failures = [];
  for (const athlete of everyAthlete()) {
    try {
      runBuildPath(athlete, 'day');
    } catch (e) {
      failures.push(`${athlete.goal}/${athlete.environment}/${athlete.experience.lifting} → ${e.message}`);
    }
  }
  assert.deepEqual(failures.slice(0, 10), []);
});

test('a half-answered conversation asks rather than throws', () => {
  // Every prefix of the questionnaire must survive being handed to the build path, because the athlete
  // can tap a chip at any point and `advance` runs on every one of them.
  const fields = ['goal', 'daysPerWeek', 'sessionMinutes', 'environment', 'experience', 'limitations'];
  const full = {
    goal: 'strength', daysPerWeek: 4, sessionMinutes: 60, environment: 'full_gym',
    experience: { lifting: 'intermediate', running: 'intermediate' }, limitations: [],
  };
  for (let i = 0; i <= fields.length; i++) {
    const partial = Object.fromEntries(fields.slice(0, i).map((f) => [f, full[f]]));
    const r = runBuildPath(partial, 'program');
    if (r.outcome === 'asked') assert.ok(r.question, 'an incomplete constraint set must yield a question');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// THE HELPERS THAT USED TO BE UNTESTABLE
// ─────────────────────────────────────────────────────────────────────────────

test('completeFor sends an endurance goal outdoors and a lifting goal to the gym', () => {
  assert.equal(completeFor({ goal: 'run_marathon' }, 'program').environment, 'outdoor');
  assert.equal(completeFor({ goal: 'strength' }, 'program').environment, 'full_gym');
  // A single day is never assumed to be outdoors — "what should I train today" is a gym question.
  assert.equal(completeFor({ goal: 'run_marathon' }, 'day').environment, 'full_gym');
});

test('completeFor never invents a race date or a starting mileage', () => {
  // Both are refusal inputs. Defaulting either would let the engine build a marathon plan for someone
  // who never said when the race is, or assume mileage they never claimed.
  const c = completeFor({ goal: 'run_marathon' }, 'program');
  assert.equal(c.raceDate, null);
  assert.equal(c.currentWeeklyMi, null);
});

test('volumeFor is empty for lifting and a real curve for running', () => {
  assert.deepEqual(volumeFor(completeFor({ goal: 'strength' }, 'program'), 8), []);
  const curve = volumeFor({ ...completeFor({ goal: 'run_marathon' }, 'program'), currentWeeklyMi: 20 }, 16);
  assert.equal(curve.length, 16, 'one entry per week');
  assert.ok(curve.every((w) => w.mileage > 0 && w.longRunMi > 0), 'every week has a real number');
});

test('weeksBetween counts down and floors at zero', () => {
  const now = Date.parse('2026-01-01');
  assert.equal(weeksBetween('2026-01-29', now), 4);
  assert.equal(weeksBetween('2025-06-01', now), 0, 'a race in the past is zero weeks away, not negative');
  assert.equal(weeksBetween(null, now), 0);
  assert.equal(weeksBetween('not a date', now), 0, 'garbage must not become NaN on the card');
});
