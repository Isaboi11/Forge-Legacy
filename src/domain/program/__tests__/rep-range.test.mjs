/**
 * rep-range.test.mjs — "4 × 10–12" survives from the catalog to the athlete's Target column.
 *
 * ══ THE DEFECT THIS CLOSES ══
 *
 * `ExercisePrescription.repsMax` existed on the CATALOG side and nowhere else. `structureFromDefinition`
 * did not copy it, `ProgramExercise` had no field for it, and nothing rendered it — a write-only field,
 * which is exactly the failure the schema's deliberately-absent `notes` field exists to warn about.
 *
 * Full Frame authored a range on **105 of 105** prescriptions. Every one reached the athlete as its
 * floor: "4 × 10–12" reading as "4 × 10", in a program whose entire premise is *work the range, add
 * weight when you top it*. Its first draft was rejected for progression that "existed only in prose
 * nobody reads mid-set"; the rebuild had the same defect wearing a different coat.
 *
 * ══ THE INVARIANT THAT MUST NOT BREAK ══
 *
 * `reps` / `targetReps` stay a single number and stay the FLOOR. They are arithmetic input — volume, the
 * e1RM behind PR detection, and the reps column written at save. The range is display only. A test below
 * holds that line, because widening the number is the obvious-looking change that would corrupt history.
 *
 * Run:  node --test src/domain/program/__tests__/rep-range.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { structureFromDefinition } from '../adopt-core.ts';
import { schemeText, plannedSetCount } from '../prescription.ts';
import { sessionSetsFor } from '../../workout/session-core.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const def = (f) => JSON.parse(readFileSync(join(HERE, '..', '..', 'training', 'programs', f), 'utf8'));

/** Every prescription in an adopted structure, however deeply the shape nests it. */
function prescriptions(node, out = []) {
  if (Array.isArray(node)) node.forEach((n) => prescriptions(n, out));
  else if (node && typeof node === 'object') {
    if (typeof node.catalogKey === 'string' && node.sets != null) out.push(node);
    Object.values(node).forEach((n) => prescriptions(n, out));
  }
  return out;
}

// ── the display half ────────────────────────────────────────────────────────

test('a uniform prescription with a range renders as "N × floor-top"', () => {
  assert.equal(schemeText({ name: 'x', sets: 4, reps: 10, repsMax: 12 }), '4 × 10-12');
  assert.equal(schemeText({ name: 'x', sets: 3, reps: 12, repsMax: 15 }), '3 × 12-15');
});

test('no range means exactly what it did before', () => {
  assert.equal(schemeText({ name: 'x', sets: 4, reps: 10 }), '4 × 10');
  assert.equal(schemeText({ name: 'x', sets: 4, reps: 10, repsMax: null }), '4 × 10');
  // A "range" that does not widen anything is not a range.
  assert.equal(schemeText({ name: 'x', sets: 4, reps: 10, repsMax: 10 }), '4 × 10');
});

/**
 * A RANGE AND A LADDER BOTH USE A HYPHEN, AND THEY MEAN OPPOSITE THINGS.
 *
 * "10-12" is one target with slack in it. "6-6-4-4" is four different sets at four different loads. A
 * range rendered over a ladder would read as a fifth thing that is neither, so the ladder always wins.
 */
test('a ladder is never overwritten by a range', () => {
  const ladder = { name: 'x', sets: 4, reps: 6, repsMax: 12, repScheme: [6, 6, 4, 4] };
  assert.equal(schemeText(ladder), '4 × 6-6-4-4');
  assert.deepEqual(sessionSetsFor(ladder).map((s) => s.targetReps), [6, 6, 4, 4]);
  assert.ok(sessionSetsFor(ladder).every((s) => s.targetRepsMax == null), 'a ladder set gained a ceiling');
});

/**
 * ⚠ ADDED AFTER A MUTATION FAILED TO BITE. The case above uses a DESCENDING ladder, which the `uniform`
 * check already rejects — so removing the `repScheme` guard from `schemeText` changed nothing and the
 * suite stayed green. A UNIFORM ladder is the shape that guard actually exists for.
 *
 * `repScheme` is authoritative and per-set; a range authored beside it is contradictory input, and the
 * ladder wins. Rendering "3 × 10-12" here would invent slack the per-set list did not grant.
 */
test('a UNIFORM ladder still beats a range — the case the descending one cannot test', () => {
  const flatLadder = { name: 'x', sets: 3, reps: 10, repsMax: 12, repScheme: [10, 10, 10] };
  assert.equal(schemeText(flatLadder), '3 × 10');
  assert.ok(sessionSetsFor(flatLadder).every((s) => s.targetRepsMax == null), 'a uniform ladder gained a ceiling');
});

test('a to-failure set never gains a ceiling — that is the point of it', () => {
  const f = { name: 'x', sets: 3, reps: 0, repsMax: 12, repScheme: ['F', 'F', 'F'] };
  assert.equal(schemeText(f), '3 × F');
  const sets = sessionSetsFor(f);
  assert.ok(sets.every((s) => s.toFailure), 'lost its to-failure flag');
  assert.ok(sets.every((s) => s.targetRepsMax == null), 'a to-failure set was given a ceiling');
});

// ── the session half ────────────────────────────────────────────────────────

test('every set in the live session carries the range beside the floor', () => {
  const sets = sessionSetsFor({ name: 'x', sets: 3, reps: 10, repsMax: 12 });
  assert.equal(sets.length, 3);
  for (const s of sets) {
    assert.equal(s.targetReps, 10, 'the floor is what feeds volume and the record');
    assert.equal(s.targetRepsMax, 12);
  }
});

/**
 * THE LINE THAT MUST NOT MOVE. `targetReps` is arithmetic input; widening it to a range or seeding it
 * with the top would put reps the athlete never performed into volume, into the e1RM behind PR
 * detection, and into their history.
 */
test('the range never becomes the number anything counts', () => {
  const [s] = sessionSetsFor({ name: 'x', sets: 1, reps: 10, repsMax: 12 });
  assert.equal(typeof s.targetReps, 'number');
  assert.equal(s.targetReps, 10, 'the floor, never the top and never a string');
  assert.equal(s.actualReps, null, 'nothing is claimed until the athlete says so');
  // Set counts are unaffected — a range is not extra sets.
  assert.equal(plannedSetCount([{ name: 'x', sets: 4, reps: 10, repsMax: 12 }]), 4);
});

// ── the program that exposed it ─────────────────────────────────────────────

test('Full Frame’s ranges survive adoption — all of them', () => {
  const source = def('full-frame-5day.json');
  const authored = source.blocks.flatMap((b) => b.workouts).flatMap((w) => w.main).filter((x) => x.repsMax != null);
  assert.ok(authored.length > 100, `expected Full Frame to author ~105 ranges, found ${authored.length}`);

  const adopted = prescriptions(structureFromDefinition(source));
  const kept = adopted.filter((x) => x.repsMax != null);
  assert.ok(kept.length > 100, `only ${kept.length} of ${adopted.length} adopted prescriptions kept a range`);
  assert.equal(schemeText(kept[0]).includes('-'), true, 'the first adopted range does not render as one');
});

test('a program that authors no ranges is completely unchanged', () => {
  // Body Recomposition Foundation is flat reps throughout — the regression case for every edit above.
  const adopted = prescriptions(structureFromDefinition(def('body-recomposition-foundation.json')));
  assert.ok(adopted.length > 0);
  assert.ok(adopted.every((x) => x.repsMax == null), 'a range appeared in a program that authored none');
  const strength = adopted.filter((x) => x.kind !== 'cardio');
  assert.ok(strength.every((x) => !schemeText(x).includes('-')), 'a hyphen appeared in a flat prescription');
});
