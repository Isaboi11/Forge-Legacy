/**
 * bodyweight-foundation.test.mjs — Sort 18 against its LOCKED Blueprint.
 *
 * One of only TWO featured programs (with Strength Foundation I), and the plan calls the featured pair
 * "the launch front door". Its promise is the lowest possible barrier: **no equipment, train anywhere.**
 *
 * ══ THE PROMISE IS THE THING TO GUARD ══
 *
 * "No equipment" is not a description here, it is the product. And it is exactly the kind of claim that
 * erodes one well-meaning exercise at a time — a pull-up because pulling matters, a bench dip because
 * everyone has a chair. The first test below is the one that stops that, and it uses the app's own
 * `canDoExercise` against an EMPTY gym rather than a list of names someone has to keep current.
 *
 * Run:  node --test src/domain/training/programs/__tests__/bodyweight-foundation.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { canDoExercise } from '../../../home-gym/equipment.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const p = JSON.parse(readFileSync(join(HERE, '..', 'bodyweight-foundation.json'), 'utf8'));
const EXERCISES = JSON.parse(
  readFileSync(join(HERE, '..', '..', '..', 'exercise-relationships', 'source', 'exercises.json'), 'utf8'),
);
const equipById = new Map(EXERCISES.map((e) => [e.id, e.equipmentId]));

const everyWorkout = () => p.blocks.flatMap((b) => b.workouts.map((w) => [w, b]));
const sessionSets = (w) => w.main.reduce((a, ex) => a + ex.sets, 0);
const trainableWithNothing = (key) => canDoExercise({ key, equipId: equipById.get(key) }, []);

// ── the featured promise ────────────────────────────────────────────────────

test('every REQUIRED exercise is trainable owning absolutely nothing', () => {
  const offenders = [];
  for (const [w, b] of everyWorkout()) {
    for (const ex of w.main) {
      if (ex.optional) continue;
      if (!trainableWithNothing(ex.catalogKey)) offenders.push(`${b.label} ${w.code} → ${ex.catalogKey}`);
    }
  }
  assert.deepEqual(offenders, [], 'these require gear, in the program whose whole promise is that none is needed');
});

test('nothing is loaded — no external resistance anywhere', () => {
  for (const [w, b] of everyWorkout()) {
    for (const ex of w.main) {
      const equip = equipById.get(ex.catalogKey);
      assert.equal(equip, 'bodyweight', `${b.label} ${w.code}: ${ex.catalogKey} is ${equip}, not bodyweight`);
      assert.equal(ex.percentOfMax, undefined, `${b.label} ${w.code}: ${ex.displayName} carries a load percentage`);
    }
  }
});

/**
 * THE ONE THING A ZERO-EQUIPMENT PROGRAM CANNOT DO.
 *
 * Every pull in the catalogue needs gear — 4 horizontal and 11 vertical, all of them requiring a bar,
 * rings, straps or a rack. Omitting the pattern entirely would ship a push-dominant beginner program;
 * requiring it would break the featured promise. So the pull is prescribed and marked `optional`, which
 * the model defines as "prescribed, but the athlete owes nothing by skipping it".
 *
 * Both halves are asserted: the pull must BE there, and it must be the ONLY thing needing gear.
 */
test('the pull is prescribed, and it is the only thing that needs equipment', () => {
  for (const [w, b] of everyWorkout()) {
    const pulls = w.main.filter((ex) => ex.optional);
    assert.equal(pulls.length, 1, `${b.label} ${w.code} should carry exactly one optional pull`);
    assert.ok(/row|pull/.test(pulls[0].catalogKey), `${b.label} ${w.code}: the optional item is not a pull`);
    // Anything else needing gear would be a second silent requirement.
    const gated = w.main.filter((ex) => !ex.optional && !trainableWithNothing(ex.catalogKey));
    assert.deepEqual(gated, [], `${b.label} ${w.code} has a required exercise that needs gear`);
  }
});

// ── the Blueprint's locked metadata ─────────────────────────────────────────

test('metadata matches the LOCKED Blueprint exactly', () => {
  assert.equal(p.id, 'bodyweight-foundation');
  assert.equal(p.name, 'Bodyweight Foundation');
  assert.equal(p.family, 'Full Body & Home');
  assert.equal(p.difficulty, 'Beginner');
  assert.equal(p.durationWeeks, 6);
  assert.equal(p.frequencyPerWeek, 3);
  assert.equal(p.structure, 'full_body');
  assert.equal(p.successorName, 'Bodyweight Strength');
  assert.notEqual(p.status, 'LOCKED', 'claims a lock nobody signed');
});

test('18 sessions across 6 weeks, and NO deload', () => {
  const sorted = [...p.blocks].sort((a, b) => a.weekStart - b.weekStart);
  assert.equal(sorted[0].weekStart, 1);
  assert.equal(sorted.at(-1).weekEnd, 6);
  for (let i = 1; i < sorted.length; i += 1) {
    assert.equal(sorted[i].weekStart, sorted[i - 1].weekEnd + 1, `gap or overlap before ${sorted[i].label}`);
  }
  for (const b of sorted) assert.equal(b.workouts.length, 3, `${b.label} day count`);
  assert.equal(sorted.reduce((a, b) => a + (b.weekEnd - b.weekStart + 1) * b.workouts.length, 0), 18);
  // PAS-D7: under 7 weeks carries no mandatory deload, and inventing one would shorten the block.
  for (const b of p.blocks) assert.doesNotMatch(b.label, /deload/i, `${b.label} — a 6-week program owes no deload`);
});

test('every session sits inside the FULL_BODY envelope — 4–7 exercises, 12–20 sets', () => {
  for (const [w, b] of everyWorkout()) {
    const where = `${b.label} ${w.code}`;
    assert.ok(w.main.length >= 4 && w.main.length <= 7, `${where} has ${w.main.length} exercises`);
    const n = sessionSets(w);
    assert.ok(n >= 12 && n <= 20, `${where} has ${n} sets (envelope 12–20)`);
  }
});

// ── progression: reps then variation, and NOT volume ────────────────────────

/**
 * Blueprint §4: the progressed variable is reps, THEN variation difficulty. There is no external load,
 * so a slot that never changes its movement across six weeks has nowhere left to go once the rep ceiling
 * is reached — which is the whole mechanic.
 */
test('slots climb a variation ladder — most movements change across the six weeks', () => {
  for (const code of ['A', 'B', 'C']) {
    const perSlot = p.blocks.map((b) => b.workouts.find((w) => w.code === code).main.map((ex) => ex.catalogKey));
    const changed = perSlot[0].filter((_, i) => new Set(perSlot.map((r) => r[i])).size > 1).length;
    assert.ok(changed >= 4, `day ${code}: only ${changed} of ${perSlot[0].length} slots progress their variation`);
  }
});

test('the rep range rises block over block, and the ceiling rises with it', () => {
  for (const code of ['A', 'B', 'C']) {
    const repped = p.blocks.map((b) =>
      b.workouts.find((w) => w.code === code).main.filter((ex) => ex.repsMax != null),
    );
    for (let i = 1; i < repped.length; i += 1) {
      const lo = Math.min(...repped[i].map((ex) => ex.reps));
      const loPrev = Math.min(...repped[i - 1].map((ex) => ex.reps));
      const hi = Math.max(...repped[i].map((ex) => ex.repsMax));
      const hiPrev = Math.max(...repped[i - 1].map((ex) => ex.repsMax));
      assert.ok(lo > loPrev, `day ${code}: ${p.blocks[i].label} rep floor did not rise`);
      assert.ok(hi > hiPrev, `day ${code}: ${p.blocks[i].label} rep ceiling did not rise`);
    }
  }
});

/**
 * ⚠ SETS STAY AT 3 ON PURPOSE. The Blueprint prescribes Linear rep progression (§2, §4), NOT Volume
 * Accumulation — that is Muscle Building Intermediate's model, one family over. Raising sets here would
 * quietly run a second progression model the Blueprint never asked for, and it is the obvious-looking
 * edit for anyone who has just read the other program.
 */
test('sets never change — this is rep progression, not volume accumulation', () => {
  const counts = new Set(everyWorkout().flatMap(([w]) => w.main.map((ex) => ex.sets)));
  assert.deepEqual([...counts], [3], `set counts vary: ${[...counts].join(', ')}`);
});

/**
 * A 45-second plank written as `reps: 45` reaches the athlete as FORTY-FIVE PLANKS — `workout.tsx`
 * renders targetReps flat, and only the preview surfaces ever read a high rep count as seconds. The
 * starter-template library was corrected for exactly this; a held position must carry `durationSec`.
 */
test('a held position is timed, never written as a high rep count', () => {
  let holds = 0;
  for (const [w, b] of everyWorkout()) {
    for (const ex of w.main) {
      const where = `${b.label} ${w.code} ${ex.displayName}`;
      if (ex.durationSec != null) {
        holds += 1;
        assert.equal(ex.unit, 'seconds', `${where} is timed but its unit is ${ex.unit}`);
        assert.equal(ex.reps, 0, `${where} is timed and also claims ${ex.reps} reps`);
      } else {
        assert.ok(ex.reps < 30, `${where} prescribes ${ex.reps} reps — a hold must use durationSec`);
      }
    }
  }
  assert.ok(holds > 0, 'the timed holds have disappeared from the program');
});

test('every session covers the whole body — squat, push, hinge and brace, every time', () => {
  const PATTERNS = {
    squat: /squat|lunge|wall-sit|step-down/,
    push: /push-up|wall-slide|dip/,
    hinge: /glute-bridge|good-morning|back-extension|superman/,
    brace: /plank|dead-bug|bird-dog|crunch|hollow|v-up/,
  };
  for (const [w, b] of everyWorkout()) {
    for (const [pattern, re] of Object.entries(PATTERNS)) {
      assert.ok(
        w.main.some((ex) => re.test(ex.catalogKey)),
        `${b.label} ${w.code} trains no ${pattern} pattern — it is not a full-body session`,
      );
    }
  }
});
