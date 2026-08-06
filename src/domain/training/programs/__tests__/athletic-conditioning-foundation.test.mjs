/**
 * athletic-conditioning-foundation.test.mjs — Sort 12 against its LOCKED Blueprint.
 *
 * ══ THE PART WORTH READING ══
 *
 * This program's Blueprint set a four-part CONVERGENCE TEST, and Body Recomposition Foundation (Sort 13)
 * was written to pass it. Both share CONDITIONING / BEGINNER / GYM. The question the test exists to
 * answer is whether they are two programs or one program with two names — and until today it could only
 * be answered on paper, because only one of them existed.
 *
 * Both now ship, so the verdict is asserted against the other program's actual JSON rather than against
 * a claim in a document. If a later edit drifts one toward the other, this goes red.
 *
 * Run:  node --test src/domain/training/programs/__tests__/athletic-conditioning-foundation.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { plannedSetCount } from '../../../program/prescription.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const load = (f) => JSON.parse(readFileSync(join(HERE, '..', f), 'utf8'));
const p = load('athletic-conditioning-foundation.json');
const sibling = load('body-recomposition-foundation.json');

const everyWorkout = () => p.blocks.flatMap((b) => b.workouts.map((w) => [w, b]));
const isCardio = (ex) => ex.kind === 'cardio';
const DELOAD = 3; // Week 7
const PEAK = 4; //  Week 8
const WORK = [0, 1, 2];

// ── the Blueprint's locked metadata ─────────────────────────────────────────

test('metadata matches the LOCKED Blueprint exactly', () => {
  assert.equal(p.id, 'athletic-conditioning-foundation');
  assert.equal(p.family, 'Conditioning');
  assert.equal(p.difficulty, 'Beginner');
  assert.equal(p.durationWeeks, 8);
  assert.equal(p.frequencyPerWeek, 3, 'the family’s only 3-day program');
  assert.equal(p.successorName, 'Conditioning Intermediate');
  assert.ok(p.name.length <= 60, 'PAS-D1 hard limit');
  assert.notEqual(p.status, 'LOCKED', 'claims a lock nobody signed');
  // Not upper_lower / ppl / full_body — a conditioning session is none of them, so it stays omitted.
  assert.equal(p.structure, undefined);
});

test('24 sessions across 8 weeks, deload week 7, peak week 8', () => {
  const sorted = [...p.blocks].sort((a, b) => a.weekStart - b.weekStart);
  assert.equal(sorted[0].weekStart, 1);
  assert.equal(sorted.at(-1).weekEnd, 8);
  for (let i = 1; i < sorted.length; i += 1) {
    assert.equal(sorted[i].weekStart, sorted[i - 1].weekEnd + 1, `gap or overlap before ${sorted[i].label}`);
  }
  for (const b of sorted) assert.equal(b.workouts.length, 3, `${b.label} day count`);
  assert.equal(sorted.reduce((a, b) => a + (b.weekEnd - b.weekStart + 1) * b.workouts.length, 0), 24);
  assert.equal(p.blocks[DELOAD].weekStart, 7);
  assert.match(p.blocks[DELOAD].label, /deload/i);
  assert.equal(p.blocks[PEAK].weekStart, 8);
});

/**
 * Measured with `plannedSetCount`, NOT a naive sum. A circuit member carries `sets: 1` and is performed
 * once per ROUND — a three-move circuit run five times is fifteen working sets, not three. Counting the
 * raw field would report this program at less than half its real size and pass an envelope it fails.
 */
test('every session sits inside the CONDITIONING envelope — 4–8 exercises, 12–24 planned sets', () => {
  for (const [w, b] of everyWorkout()) {
    const where = `${b.label} ${w.code}`;
    assert.ok(w.main.length >= 4 && w.main.length <= 8, `${where} has ${w.main.length} exercises`);
    const n = plannedSetCount(w.main);
    assert.ok(n >= 12 && n <= 24, `${where} plans ${n} sets (envelope 12–24)`);
  }
});

test('restSeconds is populated on every prescription — PAS §11.3 requires it for CONDITIONING', () => {
  for (const [w, b] of everyWorkout()) {
    for (const ex of w.main) {
      assert.equal(typeof ex.restSec, 'number', `${b.label} ${w.code} ${ex.displayName} has no restSec`);
    }
  }
});

/** PAS §11.3's complex-barbell caution, in full: this athlete may have no strength background at all. */
test('no barbell anywhere — the beginner conditioning athlete has no strength base', () => {
  for (const [w, b] of everyWorkout()) {
    for (const ex of w.main) {
      assert.doesNotMatch(ex.catalogKey, /barbell/, `${b.label} ${w.code} prescribes ${ex.catalogKey}`);
    }
  }
});

// ── work-capacity accumulation ──────────────────────────────────────────────

test('rounds and bout duration accumulate, reset at the deload, and peak in week 8', () => {
  const rounds = (i) => p.blocks[i].workouts[0].main.find((x) => x.groupId).groupRounds;
  const bout = (i) => p.blocks[i].workouts[0].main.find(isCardio).targetSec;
  for (let k = 1; k < WORK.length; k += 1) {
    assert.ok(rounds(WORK[k]) > rounds(WORK[k - 1]), `${p.blocks[WORK[k]].label} adds no rounds`);
    assert.ok(bout(WORK[k]) > bout(WORK[k - 1]), `${p.blocks[WORK[k]].label} adds no bout time`);
  }
  const allR = p.blocks.map((_, i) => rounds(i));
  const allB = p.blocks.map((_, i) => bout(i));
  assert.equal(Math.min(...allR), rounds(DELOAD), 'week 7 is not the lightest on rounds');
  assert.equal(Math.min(...allB), bout(DELOAD), 'week 7 is not the shortest bout');
  assert.equal(Math.max(...allR), rounds(PEAK), 'week 8 is not the heaviest on rounds');
});

test('the deload cuts work, never sessions (PAS-D8)', () => {
  assert.equal(p.blocks[DELOAD].workouts.length, 3);
  for (const code of ['A', 'B', 'C']) {
    const before = plannedSetCount(p.blocks[2].workouts.find((w) => w.code === code).main);
    const during = plannedSetCount(p.blocks[DELOAD].workouts.find((w) => w.code === code).main);
    assert.ok(during < before, `day ${code}: week 7 is not lighter than weeks 5–6`);
  }
});

/**
 * NOT Double Progression — that arrives at Conditioning Intermediate, and its absence here is a
 * model-level distinction between the two rungs (Blueprint §6). A rep range on these prescriptions would
 * quietly promote a beginner program to its own successor's model.
 */
test('no rep ranges — Double Progression belongs to the next rung', () => {
  for (const [w, b] of everyWorkout()) {
    for (const ex of w.main) {
      assert.equal(ex.repsMax, undefined, `${b.label} ${w.code} ${ex.displayName} carries a rep range`);
    }
  }
});

// ══ THE CONVERGENCE TEST, ASSERTED AGAINST THE SIBLING THAT SHIPS ══════════

/**
 * Part A — EMPHASIS INVERSION. Body Recomposition Foundation is resistance-led and closes on a steady
 * bout; this is conditioning-led and OPENS on one. That inversion is the pair's entire justification,
 * and it lives in the order of `main` — which is exactly the kind of thing a later edit "tidies".
 */
test('convergence A: this opens on conditioning, its sibling opens on resistance', () => {
  for (const [w, b] of everyWorkout()) {
    assert.ok(isCardio(w.main[0]), `${b.label} ${w.code} does not open on the bout`);
  }
  for (const b of sibling.blocks) {
    for (const w of b.workouts) {
      assert.ok(!isCardio(w.main[0]), `sibling ${b.label} ${w.code} now opens on conditioning too`);
      assert.ok(isCardio(w.main.at(-1)), `sibling ${b.label} ${w.code} no longer closes on its finisher`);
    }
  }
});

/** Part C — this program's resistance is a supporting MINORITY; the sibling's is the majority. */
test('convergence C: resistance is the minority here and the majority there', () => {
  for (const [w, b] of everyWorkout()) {
    const loose = w.main.filter((ex) => !ex.groupId && !isCardio(ex));
    assert.ok(loose.length <= 2, `${b.label} ${w.code} carries ${loose.length} standalone lifts — that is a strength day`);
  }
  for (const b of sibling.blocks) {
    for (const w of b.workouts) {
      const lifts = w.main.filter((ex) => !isCardio(ex));
      assert.ok(lifts.length >= 4, `sibling ${b.label} ${w.code} has thinned to ${lifts.length} lifts`);
    }
  }
});

/**
 * Part D — NON-DERIVABILITY. A reviewer must be able to tell them apart from authored structure alone.
 * Frequency, total sessions, session modality, and whether a circuit exists at all: four independent
 * axes, and the pair survives only while they keep disagreeing.
 */
test('convergence D: the two are distinguishable on four independent axes', () => {
  assert.notEqual(p.frequencyPerWeek, sibling.frequencyPerWeek, 'same weekly frequency');
  assert.equal(p.frequencyPerWeek, 3);
  assert.equal(sibling.frequencyPerWeek, 4);

  const total = (d) => d.blocks.reduce((a, b) => a + (b.weekEnd - b.weekStart + 1) * b.workouts.length, 0);
  assert.equal(total(p), 24);
  assert.equal(total(sibling), 32);

  // Session modality: a conditioning day and a strength day are different things and say so.
  assert.ok(everyWorkout().every(([w]) => w.modality === 'conditioning'), 'sessions no longer declare themselves conditioning');
  assert.ok(
    sibling.blocks.every((b) => b.workouts.every((w) => w.modality === 'strength')),
    'the sibling has become a conditioning program',
  );

  // Circuits are this program's method and appear nowhere in the sibling.
  assert.ok(everyWorkout().every(([w]) => w.main.some((ex) => ex.groupId)), 'a session lost its circuit');
  assert.ok(
    sibling.blocks.every((b) => b.workouts.every((w) => w.main.every((ex) => !ex.groupId))),
    'the sibling has grown circuits — the method distinction is gone',
  );
});
