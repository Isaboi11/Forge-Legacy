/**
 * per-side.test.mjs — "3 × 10 per leg" survives from the catalog to the athlete's Target column.
 *
 * ══ THE DEFECT THIS CLOSES ══
 *
 * `ExercisePrescription.per` existed on the CATALOG side and nowhere else. `structureFromDefinition`
 * did not copy it, `ProgramExercise` had no field for it, and nothing rendered it — the third write-only
 * field found in this model, after `repsMax` and the rep ranges before it.
 *
 * **142 prescriptions across all thirteen programs author it.** Every Bulgarian split squat, every
 * walking lunge, every dead bug, every single-arm row. Each reached the athlete as "3 × 10".
 *
 * ══ WHY IT IS WORSE THAN THE RANGE THAT PRECEDED IT ══
 *
 * A dropped range shows LESS than was asked for: "4 × 10" where "4 × 10–12" was written, and an athlete
 * who does ten has done something the author would recognise. A dropped side shows a DIFFERENT, complete
 * prescription: thirty reps where sixty were prescribed, with nothing on screen hinting at the other
 * half. There is no reading of "3 × 10" that recovers it.
 *
 * ══ THE INVARIANT THAT MUST NOT BREAK ══
 *
 * `reps` / `targetReps` stay PER SIDE — the number the athlete logs. Doubling them for a per-side item
 * is the obvious-looking fix and it would write twenty into the reps column for a set of ten-a-side,
 * corrupting volume, the e1RM behind PR detection, and every history row. `per` is display only. Tests
 * below hold that line from both directions.
 *
 * Run:  node --test --experimental-strip-types src/domain/program/__tests__/per-side.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { structureFromDefinition } from '../adopt-core.ts';
import { schemeText, plannedSetCount, setCount } from '../prescription.ts';
import { sessionSetsFor } from '../../workout/session-core.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROGRAMS = join(HERE, '..', '..', 'training', 'programs');
const def = (f) => JSON.parse(readFileSync(join(PROGRAMS, f), 'utf8'));
/** The directory, never a hand-kept array — a program authored in parallel is covered the day it lands. */
const allDefs = () => readdirSync(PROGRAMS).filter((f) => f.endsWith('.json')).map(def);

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

test('a per-side prescription says which side, in every shape the model has', () => {
  assert.equal(schemeText({ name: 'x', sets: 3, reps: 10, per: 'leg' }), '3 × 10 per leg');
  assert.equal(schemeText({ name: 'x', sets: 3, reps: 8, repsMax: 12, per: 'side' }), '3 × 8-12 per side');
  assert.equal(schemeText({ name: 'x', sets: 2, durationSec: 30, per: 'side' }), '2 × 30s per side');
  assert.equal(schemeText({ name: 'x', durationSec: 45, per: 'leg' }), '45s per leg');
  // A ladder and a side are compatible statements — unlike a ladder and a range.
  assert.equal(schemeText({ name: 'x', sets: 4, reps: 6, repScheme: [8, 8, 6, 6], per: 'leg' }), '4 × 8-8-6-6 per leg');
});

test('no side means byte-for-byte what it rendered before', () => {
  assert.equal(schemeText({ name: 'x', sets: 4, reps: 10 }), '4 × 10');
  assert.equal(schemeText({ name: 'x', sets: 4, reps: 10, per: null }), '4 × 10');
  assert.equal(schemeText({ name: 'x', sets: 2, durationSec: 30 }), '2 × 30s');
});

/**
 * A circuit member states its reps alone — "12", not "1 × 12" — and it must still state its side. This
 * is the branch that returns early, so it is the one a naive suffix would miss.
 */
test('a circuit member keeps its side despite dropping its set count', () => {
  const member = { name: 'x', groupId: 'g1', reps: 12, per: 'leg' };
  assert.equal(schemeText(member), '12 per leg');
  assert.equal(setCount(member), 1, 'a member is performed once per round; the block counts the rounds');
});

test('silence is still silence — a side is not a prescription', () => {
  // Nothing was written against this item. A bare "per leg" would claim an ask the author never made.
  assert.equal(schemeText({ name: 'x', per: 'leg' }), '');
});

test('a cardio bout never gains a side', () => {
  // `per` is meaningless on a run and the cardio branch returns before the suffix — asserted so that
  // moving the suffix later in the function cannot quietly start printing "15 min per leg".
  assert.equal(schemeText({ name: 'x', kind: 'cardio', targetSec: 900, per: 'leg' }), '15 min');
});

// ── the arithmetic half: the line that must not move ────────────────────────

test('the side never becomes the number anything counts', () => {
  const ex = { name: 'x', sets: 3, reps: 10, per: 'leg' };
  const sets = sessionSetsFor(ex);
  assert.equal(sets.length, 3, 'a side is not extra sets');
  for (const s of sets) {
    assert.equal(s.targetReps, 10, 'ten a side is logged as ten — doubling it would corrupt every PR');
    assert.equal(s.actualReps, null, 'nothing is claimed until the athlete says so');
  }
  assert.equal(plannedSetCount([ex]), 3);
});

// ── the crossing, on the real catalog ───────────────────────────────────────

test('every authored side survives adoption, in every program that authors one', () => {
  let authoredTotal = 0;
  let keptTotal = 0;
  for (const source of allDefs()) {
    const authored = source.blocks.flatMap((b) => b.workouts).flatMap((w) => w.main).filter((x) => x.per);
    if (!authored.length) continue;
    const kept = prescriptions(structureFromDefinition(source)).filter((x) => x.per);
    /*
     * A multi-block program's structure holds one copy of a day PER WEEK, so the adopted count is a
     * multiple of the authored one — never less. Equality is the wrong assertion here; the floor is the
     * right one, and zero is the failure that actually happened.
     */
    assert.ok(kept.length >= authored.length, `${source.id}: ${authored.length} authored, ${kept.length} adopted`);
    authoredTotal += authored.length;
    keptTotal += kept.length;
  }
  assert.ok(authoredTotal > 100, `expected ~142 per-side prescriptions across the catalog, found ${authoredTotal}`);
  assert.ok(keptTotal >= authoredTotal);
});

test('the split squat an athlete actually opens says "per leg"', () => {
  // The end of the chain, on a real program: definition → adopted structure → rendered line.
  const adopted = prescriptions(structureFromDefinition(def('close-quarters-6day.json')));
  const split = adopted.find((x) => x.catalogKey === 'dumbbell-bulgarian-split-squat');
  assert.ok(split, 'Close Quarters no longer prescribes the Bulgarian split squat');
  assert.equal(split.per, 'leg');
  assert.match(schemeText(split), /per leg$/);
});

test('a program that authors no sides is completely unchanged', () => {
  /*
   * The control. Full Frame is a body-part split with no unilateral prescription carrying a side, so a
   * suffix appearing anywhere in it means the rule leaked out of the field that governs it.
   */
  const adopted = prescriptions(structureFromDefinition(def('full-frame-5day.json')));
  assert.ok(adopted.length > 0);
  assert.ok(adopted.every((x) => x.per == null), 'a side appeared in a program that authored none');
  assert.ok(adopted.every((x) => !schemeText(x).includes('per ')), 'a side was rendered where none exists');
});
