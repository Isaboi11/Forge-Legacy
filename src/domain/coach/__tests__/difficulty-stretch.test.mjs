/**
 * difficulty-stretch.test.mjs — ⚠ **"I put in to build me a program, home gym with dumbbells and a mat
 * and a bench, and lower back pain, and he gave me two exercises throughout the whole workout."**
 * (PO, 2026-08-17)
 *
 * ══ IT WAS NOT THE EQUIPMENT, AND IT WAS NOT THE BAD BACK ══
 *
 * Both were suspects and both are innocent. That room reaches **214** of the 733 movements the app shows,
 * and `lower_back` costs 18 of them. What emptied the program was the DIFFICULTY FILTER meeting a
 * catalogue whose difficulty field does not mean what the filter assumed:
 *
 *   Intermediate  590        Beginner  121        Advanced  22
 *
 * `Intermediate` is the catalogue's default bucket, not a claim about the athlete — **Push-Up, Plank,
 * Bodyweight Squat and Dumbbell Biceps Curl all carry it.** `difficultyRank` barred anything above the
 * athlete's level outright, so `beginner` cut 214 reachable movements to 19, and those 19 held no
 * horizontal push, no pull of either kind, no curls, no triceps, no calves and no shoulder isolation.
 * Every one of those slots was dropped and the block came out as the same three movements every day.
 *
 * ══ WHAT THE FIX IS ALLOWED TO DO, AND WHAT IT IS NOT ══
 *
 * `Advanced` stays a hard gate — those 22 records are muscle-ups, levers and one-arm work, where the
 * original reasoning is exactly right. Only the floor of the ceiling moves, and only on a SECOND pass:
 * a beginner is still offered every beginner-tagged movement first and reaches past their level only for
 * a pattern that has nothing at their level at all. Both halves are asserted below.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/difficulty-stretch.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildPickerDb } from '../../exercise-picker/catalog-core.ts';
import { canDoExercise } from '../../home-gym/equipment.ts';
import { candidatesFor, contextFrom, fillSlot } from '../candidates.ts';
import { limitationPatterns } from '../rulebook/limitations.ts';
import { assemble } from '../assemble.ts';
import { buildDayWorkout, MIN_DAY_MOVEMENTS } from '../day.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (f) => JSON.parse(readFileSync(path.join(here, '../../exercise-relationships/source', f), 'utf8'));

const POOL = buildPickerDb({
  exercises: src('exercises.json'),
  exerciseMuscles: src('exercise_muscles.json'),
  muscles: src('muscles.json'),
  equipment: src('equipment.json'),
});

/** ⚠ THE PO'S ACTUAL ROOM. Not a tidied version of it — dumbbells, a mat, and a bench. */
const OWNED = ['dumbbells', 'mat', 'bench'];

const program = (over = {}) =>
  assemble(
    {
      goal: 'strength',
      experience: { lifting: 'beginner', running: 'beginner' },
      daysPerWeek: 3,
      sessionMinutes: 60,
      environment: 'home',
      ownedEquipment: OWNED,
      limitations: ['lower_back'],
      excludeExercises: [],
      ...over,
    },
    POOL,
    canDoExercise,
  );

const ctx = (over = {}) =>
  contextFrom({
    owned: over.owned ?? OWNED,
    canDo: canDoExercise,
    experience: over.experience ?? 'beginner',
    limitations: over.limitations ?? ['lower_back'],
    limitationPatterns,
    excludeExercises: [],
  });

// ─────────────────────────────────────────────────────────────────────────────
// ⭐ THE REPORT
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ the reported program is a real week, not three movements repeated', () => {
  const res = program();
  assert.ok(res.ok, res.ok ? '' : `refused: ${res.refusal?.message}`);
  for (const day of res.assembly.structure.days) {
    assert.ok(day.main.length >= 5, `${day.name} came back with ${day.main.length} movements`);
  }
});

test('⚠ and the days are different sessions, which is what "throughout the whole workout" meant', () => {
  const days = program().assembly.structure.days;
  const signatures = days.map((d) => d.main.map((m) => m.catalogKey).join('|'));
  assert.equal(new Set(signatures).size, days.length, 'two days prescribe the identical list');
});

test('the movements are the ones anybody would name for that room', () => {
  const names = program().assembly.structure.days.flatMap((d) => d.main.map((m) => m.name));
  for (const want of ['Dumbbell Bench Press', 'Dumbbell Bent-Over Row', 'Dumbbell Biceps Curl']) {
    assert.ok(names.includes(want), `no ${want} anywhere in the block`);
  }
});

test('a single workout for that athlete is a session too', () => {
  for (const split of ['full_body', 'push', 'pull', 'legs', 'upper', 'lower']) {
    const r = buildDayWorkout(
      { focus: { kind: 'split', split }, goal: 'muscle', sessionMinutes: 60, experience: 'beginner',
        environment: 'home', ownedEquipment: OWNED, limitations: ['lower_back'] },
      POOL,
      canDoExercise,
    );
    assert.ok(r.day.main.length >= MIN_DAY_MOVEMENTS, `${split} came back with ${r.day.main.length}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠ THE STRETCH IS BOUNDED — the half that keeps this safe
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ Advanced is still barred outright for a beginner', () => {
  // The 22 Advanced records are muscle-ups, front and back levers and one-arm work. The original
  // reasoning — "a failed rep at best" — holds for exactly these, and nothing here may reach them.
  const reached = new Set();
  for (const res of [program(), program({ ownedEquipment: ['dumbbells', 'bench', 'pullup', 'rings', 'dip'] })]) {
    if (!res.ok) continue;
    for (const w of res.assembly.structure.weekPlans ?? [])
      for (const d of w.days) for (const m of d.main) reached.add(m.catalogKey);
  }
  const byKey = new Map(POOL.map((e) => [e.key, e]));
  const advanced = [...reached].filter((k) => byKey.get(k)?.difficulty === 'Advanced');
  assert.deepEqual(advanced, [], `a beginner was prescribed ${advanced.join(', ')}`);
});

test('⚠ the strict pass still wins — a beginner is not silently upgraded', () => {
  /*
   * Squat is the pattern where this bites: the room holds beginner-tagged squats (Box Squat to Bench,
   * Step-Up, Walking Lunge) AND the canonical Dumbbell Goblet Squat, which is tagged Intermediate. If
   * the stretch were one wider pass rather than a second one, preference would hand the beginner the
   * goblet squat and the beginner-tagged movements would never be reached at all.
   */
  const got = fillSlot('Squat / Knee Dominant', POOL, ctx());
  assert.equal(got.stretched, false, 'the pattern has beginner work; the stretch must not have run');
  assert.equal(POOL.find((e) => e.key === got.exercise.key).difficulty, 'Beginner');
});

test('the stretch runs only where the pattern is genuinely empty, and says so', () => {
  // Horizontal Push has nothing tagged Beginner that this room can reach — 0 of them.
  assert.equal(candidatesFor('Horizontal Push', POOL, ctx()).length, 0, 'precondition: the measured gap');
  const got = fillSlot('Horizontal Push', POOL, ctx());
  assert.equal(got.stretched, true, 'and it must be reported, not swallowed');
  assert.equal(got.pattern, 'Horizontal Push', 'reaching a tier up beats answering a different question');
  assert.equal(got.relaxed, false);
});

test('⚠ a stretched slot is a note the athlete gets to read', () => {
  const notes = program().assembly.notes.filter((n) => n.kind === 'stretched');
  assert.ok(notes.length > 0, 'the block reached above the athlete and never mentioned it');
  assert.ok(notes.every((n) => n.day && n.wanted && n.got), 'a note that cannot be rendered is not a note');
});

test('nothing changes for an intermediate or an advanced athlete', () => {
  // The stretch ceiling for those two is their own ceiling, so both passes are identical and the second
  // one never runs. Asserted because "it only affects beginners" is the whole safety argument.
  for (const experience of ['intermediate', 'advanced']) {
    for (const pattern of ['Horizontal Push', 'Squat / Knee Dominant', 'Core', 'Vertical Pull']) {
      const got = fillSlot(pattern, POOL, ctx({ experience }));
      if (got) assert.equal(got.stretched, false, `${experience} stretched on ${pattern}`);
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠ THE ASSEMBLER'S OWN FLOOR — it must never fire on a room that can be built
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ no room in the sweep is refused, and no day ships under the floor', () => {
  const rooms = [
    { environment: 'full_gym', ownedEquipment: [] },
    { environment: 'home', ownedEquipment: OWNED },
    { environment: 'home', ownedEquipment: ['dumbbells'] },
    { environment: 'home', ownedEquipment: ['mat'] },
    { environment: 'bodyweight', ownedEquipment: [] },
  ];
  const bad = [];
  for (const room of rooms)
    for (const goal of ['strength', 'muscle', 'conditioning', 'mobility'])
      for (const daysPerWeek of [2, 3, 4, 5, 6])
        for (const experience of ['beginner', 'intermediate', 'advanced'])
          for (const limitations of [[], ['lower_back'], ['shoulders', 'lower_back']]) {
            const res = program({ goal, daysPerWeek, limitations, ...room,
              experience: { lifting: experience, running: experience } });
            const label = `${room.environment}:${room.ownedEquipment.join('+') || 'none'}/${goal}/${daysPerWeek}d/${experience}`;
            if (!res.ok) { bad.push(`REFUSED ${label}`); continue; }
            for (const w of res.assembly.structure.weekPlans ?? [])
              for (const d of w.days)
                if (d.main.length < MIN_DAY_MOVEMENTS) bad.push(`THIN ${label} ${d.name}=${d.main.length}`);
          }
  assert.deepEqual(bad.slice(0, 10), [], `${bad.length} bad combinations`);
});
