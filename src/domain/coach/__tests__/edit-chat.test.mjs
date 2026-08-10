/**
 * edit-chat.test.mjs — everything Holt OFFERS must be something `edit-ops` ALLOWS.
 *
 * ══ THE PROPERTY THIS FILE EXISTS FOR ══
 *
 * `edit-ops.test.mjs` proves the guard refuses the wrong edits. This file proves the guard is never asked:
 * that the conversation only ever puts legal changes in front of the athlete.
 *
 * ⚠ THE TWO FILES CAN BOTH PASS AND THE FEATURE STILL BE WRONG — a chat that offers last Tuesday and a
 * guard that refuses it are individually correct and together are an app that does not know its own rules.
 * So the test below does not check the offers *look* right; it takes every offer the chat makes, applies
 * it for real, and asserts the guard accepted it and the program survived.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/edit-chat.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildPickerDb } from '../../exercise-picker/catalog-core.ts';
import { canDoExercise } from '../../home-gym/equipment.ts';
import { totalSessions, scheduleSlots } from '../../program/progress-core.ts';
import { assemble } from '../assemble.ts';
import { contextFrom } from '../candidates.ts';
import { setCardioTarget, setPrescription, swapExercise } from '../edit-ops.ts';
import { limitationPatterns } from '../rulebook/limitations.ts';
import {
  changesFor,
  editableSessions,
  describe as describeRow,
  replacementsFor,
  rowsFor,
  valuesFor,
  SCOPE_CHOICES,
} from '../edit-chat.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (f) => JSON.parse(readFileSync(path.join(here, '../../exercise-relationships/source', f), 'utf8'));

const POOL = buildPickerDb({
  exercises: src('exercises.json'),
  exerciseMuscles: src('exercise_muscles.json'),
  muscles: src('muscles.json'),
  equipment: src('equipment.json'),
});

const program = (over = {}) => {
  const res = assemble(
    {
      goal: 'strength',
      experience: { lifting: 'intermediate', running: 'intermediate' },
      daysPerWeek: 4,
      sessionMinutes: 60,
      environment: 'full_gym',
      ownedEquipment: [],
      limitations: [],
      excludeExercises: [],
      ...over,
    },
    POOL,
    canDoExercise,
  );
  assert.ok(res.ok, res.ok ? '' : res.refusal.message);
  return res.assembly.structure;
};

function iso(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const runProgram = () =>
  program({
    goal: 'run_marathon',
    raceDate: iso(300),
    currentWeeklyMi: 25,
    canRunContinuously: true,
    environment: 'outdoor',
    daysPerWeek: 5,
  });

const mark = (weekIndex, dayIndex, state = 'completed') => ({ weekIndex, dayIndex, state });

const ctx = contextFrom({
  owned: [],
  canDo: canDoExercise,
  experience: 'intermediate',
  limitations: [],
  limitationPatterns,
  excludeExercises: [],
});

const slotKeys = (s) => new Set(scheduleSlots(s).map((x) => `${x.weekIndex}:${x.dayIndex}`));

// ─────────────────────────────────────────────────────────────────────────────
// ⭐ THE ONE THAT MATTERS
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ every change the chat offers is accepted by the guard, and the program survives it', () => {
  const structure = program();
  const marks = [mark(0, 0), mark(0, 1), mark(0, 2, 'skipped')];
  const before = totalSessions(structure);
  const beforeSlots = slotKeys(structure);
  let applied = 0;

  for (const session of editableSessions(structure, marks, 6)) {
    for (const change of changesFor(session.day)) {
      if (change.id === 'rebuild') continue; // covered by edit-ops.test.mjs; needs a limitation to mean anything
      for (const row of rowsFor(session.day, change.id)) {
        const at = { ...session.at, exerciseIndex: row.index };

        const values =
          change.id === 'swap'
            ? replacementsFor(session.day.main[row.index], POOL, ctx)
            : valuesFor(session.day, change.id, row.index);

        for (const v of values) {
          for (const { scope } of SCOPE_CHOICES) {
            const res =
              change.id === 'swap'
                ? swapExercise(structure, marks, at, v.replacement, scope)
                : change.id === 'sets'
                  ? setPrescription(structure, marks, at, { sets: v.sets }, scope)
                  : setCardioTarget(structure, marks, at, { targetMi: v.targetMi, targetSec: v.targetSec }, scope);

            assert.ok(res.ok, `offered "${change.label} → ${v.label}" and the guard refused it`);
            assert.equal(totalSessions(res.structure), before, 'an offered edit changed the number of sessions');
            assert.deepEqual(slotKeys(res.structure), beforeSlots, 'an offered edit moved a slot');
            applied += 1;
          }
        }
      }
    }
  }

  assert.ok(applied > 20, `only ${applied} edits were exercised — the offers are too thin to trust`);
});

test('⚠ an offered edit never touches a session already trained', () => {
  const structure = program();
  const marks = [mark(0, 0), mark(0, 1, 'skipped')];
  for (const s of editableSessions(structure, marks, 20)) {
    assert.ok(
      !marks.some((m) => m.weekIndex === s.at.weekIndex && m.dayIndex === s.at.dayIndex),
      `week ${s.at.weekIndex} day ${s.at.dayIndex} is done and was still offered`,
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// WHAT IS OFFERED, AND WHAT IS NOT
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ the options are read off the day, not a fixed menu', () => {
  const lifting = editableSessions(program(), [], 1)[0];
  const ids = changesFor(lifting.day).map((c) => c.id);
  assert.ok(ids.includes('swap'), 'a lifting day can have an exercise swapped');
  assert.ok(!ids.includes('distance'), '⚠ a bench day must not offer to change the distance');

  const running = editableSessions(runProgram(), [], 1)[0];
  const runIds = changesFor(running.day).map((c) => c.id);
  assert.ok(runIds.includes('distance') || runIds.includes('duration'), 'a run must be adjustable');
});

test('rebuilding is always on the table', () => {
  // "My shoulder's off, redo Thursday" applies to any session, and it is the ask most likely to be urgent.
  for (const structure of [program(), runProgram()]) {
    for (const s of editableSessions(structure, [], 3)) {
      assert.ok(changesFor(s.day).some((c) => c.id === 'rebuild'), `${s.label} cannot be rebuilt`);
    }
  }
});

test('⚠ no value chip is the value it already has', () => {
  // A chip that changes nothing costs a tap and then looks broken when the plan comes back identical.
  for (const structure of [program(), runProgram()]) {
    for (const s of editableSessions(structure, [], 4)) {
      for (const change of changesFor(s.day)) {
        if (change.id === 'rebuild' || change.id === 'swap') continue;
        for (const row of rowsFor(s.day, change.id)) {
          const e = s.day.main[row.index];
          for (const v of valuesFor(s.day, change.id, row.index)) {
            if (v.sets != null) assert.notEqual(v.sets, e.sets);
            if (v.targetMi != null) assert.notEqual(v.targetMi, Math.round(e.targetMi * 10) / 10);
            if (v.targetSec != null) assert.notEqual(v.targetSec, e.targetSec);
          }
        }
      }
    }
  }
});

test('distance steps scale with the run', () => {
  // ±1 mile is a big change to a 3-mile run and noise on a 20-mile one.
  const day = {
    name: 'x',
    letter: 'A',
    warmup: [],
    cooldown: [],
    main: [{ name: 'Long Run', kind: 'cardio', activity: 'run', targetMi: 20 }],
  };
  const big = valuesFor(day, 'distance', 0).map((v) => v.targetMi);
  const small = valuesFor({ ...day, main: [{ ...day.main[0], targetMi: 3 }] }, 'distance', 0).map((v) => v.targetMi);
  assert.ok(Math.max(...big) - 20 >= 2, 'a 20-miler should move in bigger steps');
  assert.ok(Math.max(...small) - 3 <= 1.5, 'a 3-miler should move in smaller ones');
  assert.ok(small.every((mi) => mi >= 0.5), 'never offer a run of nothing');
});

test('a swap offers real alternatives and never the same movement', () => {
  const s = editableSessions(program(), [], 1)[0];
  const row = s.day.main.find((e) => e.kind !== 'cardio');
  const options = replacementsFor(row, POOL, ctx);
  assert.ok(options.length > 0, 'a lift with no alternatives is a dead end');
  for (const o of options) {
    assert.notEqual(o.replacement.key, row.catalogKey, 'offered the exercise it is replacing');
    assert.ok(o.label.length > 0);
  }
});

test('an exercise the catalogue no longer knows offers nothing rather than guessing', () => {
  // Better a dead end than five alternatives that train something else entirely.
  assert.deepEqual(replacementsFor({ name: 'Ghost', catalogKey: 'nope:not-real' }, POOL, ctx), []);
});

test('⚠ "just this week" is the default and comes first', () => {
  // Both scopes are safe; one is surprising. Silently rewriting the whole block to match a bad Thursday
  // is a much larger change than the athlete asked for.
  assert.equal(SCOPE_CHOICES[0].scope, 'this_week');
});

test('a row describes what it currently asks for, so the athlete knows what they are changing', () => {
  assert.match(describeRow({ name: 'Back Squat', sets: 4, reps: 8 }), /4 × 8/);
  assert.match(describeRow({ name: 'Long Run', kind: 'cardio', targetMi: 12 }), /12 mi/);
  assert.match(describeRow({ name: 'Ride', kind: 'cardio', targetSec: 2700 }), /45 min/);
});
