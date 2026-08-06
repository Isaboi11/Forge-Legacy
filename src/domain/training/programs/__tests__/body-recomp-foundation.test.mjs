/**
 * body-recomp-foundation.test.mjs — Body Recomposition Foundation against its LOCKED Blueprint.
 *
 * `programs.test.mjs` already validates every definition in the directory generically: enums in range,
 * no dangling catalogKeys, warm-ups that resolve, cardio targets that are never a zero standing in for
 * null. None of that is repeated here.
 *
 * What IS here is the half a generic validator cannot know: that this program still says what
 * `Docs/Body-Recomposition-Foundation-Blueprint-v1.0.md` locked it to say. The Blueprint fixes duration,
 * frequency, the volume envelope, the deload week and the progression model. A program can drift from
 * every one of those while remaining perfectly well-formed — which is the whole failure mode, since the
 * Blueprint is a document nobody re-reads once the JSON exists.
 *
 * Run:  node --test src/domain/training/programs/__tests__/body-recomp-foundation.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const p = JSON.parse(readFileSync(join(HERE, '..', 'body-recomposition-foundation.json'), 'utf8'));

const isCardio = (ex) => ex.kind === 'cardio';
const lifts = (w) => w.main.filter((ex) => !isCardio(ex));
const everyWorkout = () => p.blocks.flatMap((b) => b.workouts.map((w) => [w, b]));

/** Total prescribed reps in one session's resistance work — the number Volume Accumulation moves. */
const sessionVolume = (w) => lifts(w).reduce((a, ex) => a + ex.sets * ex.reps, 0);
/** One block's volume, read off day A. Every day in a block shares the block's dose. */
const blockVolume = (b) => sessionVolume(b.workouts[0]);

// ── the Blueprint's locked metadata ─────────────────────────────────────────

test('metadata matches the LOCKED Blueprint exactly', () => {
  assert.equal(p.id, 'body-recomposition-foundation');
  assert.equal(p.name, 'Body Recomposition Foundation');
  assert.equal(p.family, 'Conditioning');
  assert.equal(p.difficulty, 'Beginner');
  assert.equal(p.durationWeeks, 8);
  assert.equal(p.frequencyPerWeek, 4);
  assert.equal(p.environment, 'Commercial Gym');
  assert.equal(p.successorName, 'Body Recomposition Intermediate');
  // Upper/Lower ×2 is declared, which is also what makes the `lower` split legal (schema.ts, spec §08).
  assert.equal(p.structure, 'upper_lower');
  assert.ok(p.name.length <= 60, 'PAS-D1 hard limit');
});

/**
 * ⚠ THIS TEST WAS INVERTED ON 2026-08-06, AND THE INVERSION IS THE POINT.
 *
 * It asserted `status !== 'LOCKED'` — the guard against this repo forging a signature it cannot give
 * itself. The product owner then gave it. So the guard now protects the opposite fact: that a program
 * carrying a real Lock Approval does not silently drift back to draft, and that the Lock Record which
 * records what was signed still exists beside it.
 *
 * The lock was granted with **three items open and accepted, not resolved** — see Lock-Record.md §What
 * was accepted. One of them (the PAS-D9 cool-down) was resolved hours later by amending the rule rather
 * than the program; two remain open. That is a materially different thing from a clean lock, and the
 * Lock Record is where it is written down.
 */
test('it is LOCKED, and the Lock Record beside it says what was signed', () => {
  assert.equal(p.status, 'LOCKED');
  assert.ok(p.sourceFile.endsWith('.md'), 'authored in-repo — cites a Design Record, not a .docx');
  assert.equal(p.source, 'forge');

  // A lock with no Lock Record is a status string nobody can audit.
  const lockRecord = join(HERE, '..', '..', '..', '..', '..', 'Programs', 'Conditioning', 'Body Recomposition Foundation', 'Lock-Record.md');
  const text = readFileSync(lockRecord, 'utf8');
  assert.match(text, /Lock approved by/i, 'the Lock Record carries no approval line');
  // The lock was signed over a recommendation to hold. A record that stops saying so is a clean-looking
  // lock that never was — so the section naming what was accepted has to survive.
  assert.match(text, /accepted, not resolved/i, 'the Lock Record no longer says the items were accepted rather than resolved');
  assert.match(text, /nobody has trained it/i, 'the Lock Record must still name the items left open');
});

/**
 * PAS-A3-D4 — a cool-down is never faked by appending a stretch to `main`.
 *
 * COOL_DOWN stopped being required on 2026-08-06 (PAS Amendment 003), and this program is the reason the
 * rule was found unsatisfiable. The amendment removed the requirement; it did NOT license the workaround.
 * A stretch in `main` is counted by `setCount` as working volume and rendered and logged by W-9 as a
 * working set, which inflates every volume figure §5 of the Design Record reports.
 *
 * The tempting later edit is "the rule is gone, so we can put the stretch back in". This is what stops it.
 */
test('no cool-down is smuggled into main as a working set', () => {
  const COOLDOWN_ISH = /stretch|cool.?down|foam roll|breath/i;
  for (const [w, b] of everyWorkout()) {
    for (const ex of lifts(w)) {
      assert.doesNotMatch(ex.displayName, COOLDOWN_ISH, `${b.label} ${w.code}: "${ex.displayName}" is cool-down work counted as a working set (PAS-A3-D4)`);
    }
  }
});

test('the 32 sessions are really there — 8 weeks covered with no gap or overlap', () => {
  const sorted = [...p.blocks].sort((a, b) => a.weekStart - b.weekStart);
  assert.equal(sorted[0].weekStart, 1);
  assert.equal(sorted.at(-1).weekEnd, p.durationWeeks);
  for (let i = 1; i < sorted.length; i += 1) {
    assert.equal(sorted[i].weekStart, sorted[i - 1].weekEnd + 1, `gap or overlap before ${sorted[i].label}`);
  }
  for (const b of sorted) assert.equal(b.workouts.length, p.frequencyPerWeek, `${b.label} day count`);

  const total = sorted.reduce((a, b) => a + (b.weekEnd - b.weekStart + 1) * b.workouts.length, 0);
  assert.equal(total, 32, 'the Blueprint fixes 32 total workouts');
});

// ── §3 session structure, §4 resistance emphasis ────────────────────────────

test('every session is resistance-led and closes with exactly one conditioning finisher', () => {
  for (const [w, b] of everyWorkout()) {
    const where = `${b.label} ${w.code}`;
    const bouts = w.main.filter(isCardio);
    assert.equal(bouts.length, 1, `${where} should carry exactly one bout`);
    assert.ok(isCardio(w.main.at(-1)), `${where} does not END with its finisher`);
    assert.ok(!isCardio(w.main[0]), `${where} opens with conditioning — the emphasis inversion is backwards`);
    // Resistance is the MAJORITY (Blueprint §4), not merely present.
    assert.ok(lifts(w).length >= 4, `${where} has only ${lifts(w).length} resistance exercises`);
  }
});

test('MAIN volume sits inside the PAS-D11 CONDITIONING envelope, every session', () => {
  for (const [w, b] of everyWorkout()) {
    const where = `${b.label} ${w.code}`;
    const count = w.main.length;
    const sets = lifts(w).reduce((a, ex) => a + ex.sets, 0);
    assert.ok(count >= 4 && count <= 8, `${where} has ${count} MAIN exercises (envelope 4–8)`);
    assert.ok(sets >= 12 && sets <= 24, `${where} has ${sets} MAIN sets (envelope 12–24)`);
  }
});

test('resistance is prescribed at beginner hypertrophy — 8–15 reps, 60–90 s rest, always stated', () => {
  for (const [w, b] of everyWorkout()) {
    for (const ex of lifts(w)) {
      const where = `${b.label} ${w.code} ${ex.displayName}`;
      assert.ok(ex.reps >= 8 && ex.reps <= 15, `${where} prescribes ${ex.reps} reps (beginner hypertrophy 8–15)`);
      assert.equal(typeof ex.restSec, 'number', `${where} has no restSec (PAS §11.3)`);
      assert.ok(ex.restSec >= 60 && ex.restSec <= 90, `${where} rests ${ex.restSec}s (PAS §10.3 beginner 60–90)`);
    }
  }
});

/**
 * PAS §11.3's complex-barbell caution, read strictly — see Design Record §4.
 *
 * A beginner in a caloric deficit is the worst-placed athlete in the catalog to be acquiring barbell
 * technique. The squat and hinge patterns are trained here on a leg press, a goblet squat, a machine hip
 * thrust and a dumbbell RDL. The tempting later edit is "add a back squat, it's the better exercise" —
 * which is true in general and wrong for this athlete, so the rule is asserted rather than written down.
 */
test('no barbell is prescribed anywhere in the program', () => {
  for (const [w, b] of everyWorkout()) {
    for (const ex of lifts(w)) {
      assert.doesNotMatch(ex.catalogKey, /barbell/, `${b.label} ${w.code} prescribes a barbell lift: ${ex.catalogKey}`);
    }
  }
});

test('the upper/lower split really alternates, four distinct sessions', () => {
  for (const b of p.blocks) {
    assert.deepEqual(b.workouts.map((w) => w.code), ['A', 'B', 'C', 'D'], `${b.label} day codes`);
    assert.deepEqual(b.workouts.map((w) => w.split), ['upper', 'lower', 'upper', 'lower'], `${b.label} splits`);
    // Resistance-led sessions are 'strength' sessions, whatever closes them.
    for (const w of b.workouts) assert.equal(w.modality, 'strength', `${b.label} ${w.code} modality`);
  }
});

test('every session opens with catalogue-backed pattern prep', () => {
  for (const [w, b] of everyWorkout()) {
    assert.equal(w.warmup.length, 3, `${b.label} ${w.code} warm-up length`);
  }
});

// ── §6 progression: Volume Accumulation, one deload, a peak ─────────────────

const DELOAD = 3; // block index — Week 7
const PEAK = 4; //   block index — Week 8

test('volume accumulates across the block, and the deload is the one week it does not', () => {
  const vols = p.blocks.map(blockVolume);

  for (let i = 1; i <= 2; i += 1) {
    assert.ok(vols[i] > vols[i - 1], `${p.blocks[i].label} does not accumulate (${vols[i - 1]} → ${vols[i]})`);
  }
  assert.ok(vols[DELOAD] < vols[DELOAD - 1], `Week 7 is not a deload (${vols[DELOAD - 1]} → ${vols[DELOAD]})`);
  assert.equal(Math.min(...vols), vols[DELOAD], 'Week 7 should be the lightest week in the program');
  assert.equal(Math.max(...vols), vols[PEAK], 'Week 8 should be the heaviest week in the program');
});

test('the deload reduces volume while HOLDING four sessions (PAS-D8)', () => {
  const d = p.blocks[DELOAD];
  assert.equal(d.weekStart, 7);
  assert.equal(d.weekEnd, 7);
  assert.match(d.label, /deload/i, 'the deload week should say so in its label');
  assert.equal(d.workouts.length, 4, 'a deload drops volume, never frequency');

  // It keeps the compounds and drops the isolation — the same four days, less of them.
  for (const w of d.workouts) {
    assert.equal(lifts(w).length, 4, `${w.code} deload should keep four resistance exercises`);
  }
});

test('the conditioning finisher progresses with the block and eases at the deload', () => {
  const secs = p.blocks.map((b) => b.workouts[0].main.at(-1).targetSec);
  for (let i = 1; i <= 2; i += 1) {
    assert.ok(secs[i] > secs[i - 1], `${p.blocks[i].label} finisher does not lengthen`);
  }
  assert.equal(Math.min(...secs), secs[DELOAD], 'the deload should carry the shortest finisher');
  assert.equal(Math.max(...secs), secs[PEAK], 'the peak should carry the longest finisher');
});

/**
 * Blueprint §5: the conditioning is deficit-oriented steady-state for caloric output — NOT work-capacity
 * development. Intervals, AMRAPs and circuits belong to Athletic Conditioning Foundation and to the
 * Conditioning ladder, and are how this program would quietly become one of them.
 */
test('conditioning is steady-state — no circuits, no AMRAPs, no intervals', () => {
  for (const [w, b] of everyWorkout()) {
    for (const ex of w.main) {
      const where = `${b.label} ${w.code} ${ex.displayName}`;
      assert.equal(ex.groupId, undefined, `${where} is in a circuit block`);
      assert.equal(ex.groupCapSec, undefined, `${where} carries an AMRAP cap`);
    }
    const bout = w.main.at(-1);
    assert.ok(bout.targetSec > 0, `${b.label} ${w.code} finisher prescribes no bout`);
    assert.equal(bout.targetMi, null, `${b.label} ${w.code} finisher should be timed, not a distance`);
  }
});

test('no percentage-of-max loading — this program has no gate and tests nothing', () => {
  for (const [w, b] of everyWorkout()) {
    for (const ex of w.main) {
      const where = `${b.label} ${w.code} ${ex.displayName}`;
      assert.equal(ex.percentOfMax, undefined, `${where} loads from a max a beginner has not tested`);
      assert.equal(ex.percentScheme, undefined, `${where} loads from a max a beginner has not tested`);
    }
  }
});
