/**
 * close-quarters.test.mjs — Close Quarters (6-Day) against its Design Record.
 *
 * ══ THE ONE THIS FILE EXISTS FOR ══
 *
 * This is the catalog's first program that claims to be trainable AT HOME, and "at home" is a promise the
 * app can break silently. `programs.test.mjs` checks that a key resolves to a visible exercise; it does
 * not check what that exercise needs. A cable row and a leg press machine resolve perfectly.
 *
 * `HOME_EQUIPMENT` in `starter-templates/core.ts` is the product's existing answer to "what may a home
 * session assume", and it is deliberately NARROWER than `equipment.json`'s "Home Gym" environment —
 * that table calls the barbell home equipment, which is true of a home gym and false of a bedroom. This
 * program is held to the same set, so the two definitions of "home" cannot drift apart.
 *
 * ══ AND THE ONE IT DELIBERATELY DOES NOT ASSERT ══
 *
 * Twelve of these prescriptions need an ADJUSTABLE BENCH, and the equipment table cannot see it: a
 * dumbbell bench press is tagged `dumbbell`, because that is what you load, not what you lie on. So every
 * exercise here passes `HOME_EQUIPMENT` while a third of them are impossible with dumbbells alone.
 *
 * That gap was put to the product owner, who chose to keep the bench and state it. It is stated in
 * `environment` — and `environment` is asserted below, because it is the only place the athlete is told.
 *
 * Run:  node --test src/domain/training/programs/__tests__/close-quarters.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { HOME_EQUIPMENT } from '../../../workout/starter-templates/core.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const p = JSON.parse(readFileSync(join(HERE, '..', 'close-quarters-6day.json'), 'utf8'));
const EXERCISES = JSON.parse(
  readFileSync(join(HERE, '..', '..', '..', 'exercise-relationships', 'source', 'exercises.json'), 'utf8'),
);
const equipById = new Map(EXERCISES.map((e) => [e.id, e.equipmentId]));

const everyWorkout = () => p.blocks.flatMap((b) => b.workouts.map((w) => [w, b]));
const sessionVolume = (w) => w.main.reduce((a, ex) => a + ex.sets * ex.reps, 0);
const sessionSets = (w) => w.main.reduce((a, ex) => a + ex.sets, 0);

/** Block indices. Two deloads is what a 12-week program owes under PAS-D7. */
const DELOAD_1 = 1; // Week 4
const DELOAD_2 = 4; // Week 11
const PEAK = 5; //     Week 12
const WORK = [0, 2, 3]; // the three accumulating blocks, in order

// ── the home promise ────────────────────────────────────────────────────────

test('every exercise is trainable at home — nothing needs a rack, cable, machine or sled', () => {
  const offenders = [];
  for (const [w, b] of everyWorkout()) {
    for (const ex of w.main) {
      const equip = equipById.get(ex.catalogKey);
      assert.ok(equip, `${b.label} ${w.code}: ${ex.catalogKey} is not in exercises.json at all`);
      if (!HOME_EQUIPMENT.has(equip)) offenders.push(`${w.code} → ${ex.catalogKey} (${equip})`);
    }
  }
  assert.deepEqual(offenders, [], 'these need equipment an athlete would have to leave the house for');
});

test('it is a DUMBBELL program, not merely a home-legal one', () => {
  // Bands and kettlebells pass HOME_EQUIPMENT. Neither is what this program says it needs.
  for (const [w, b] of everyWorkout()) {
    for (const ex of w.main) {
      assert.equal(equipById.get(ex.catalogKey), 'dumbbell', `${b.label} ${w.code}: ${ex.catalogKey} is not a dumbbell exercise`);
    }
  }
});

/**
 * The bench is invisible to the equipment table — `dumbbell-bench-press` is tagged `dumbbell` — so the
 * ONLY place an athlete learns they need one is `environment`. If that string loses the word, the program
 * silently starts claiming a spare room is enough.
 */
test('the bench requirement is stated where the athlete can read it', () => {
  assert.match(p.environment, /bench/i, 'environment no longer mentions the bench this program requires');
  assert.match(p.environment, /home/i, 'environment no longer says this is a home program');
});

// ── shape ───────────────────────────────────────────────────────────────────

test('metadata is what the Design Record says it is', () => {
  assert.equal(p.id, 'close-quarters-6day');
  assert.equal(p.family, 'Muscle Building');
  assert.equal(p.difficulty, 'Intermediate');
  assert.equal(p.durationWeeks, 12);
  assert.equal(p.frequencyPerWeek, 6);
  assert.equal(p.theme, 'hypertrophy');
  // Genuinely push/pull/legs twice through — the first program in the catalog that can honestly say so.
  assert.equal(p.structure, 'ppl');
  assert.ok(p.name.length <= 60, 'PAS-D1 hard limit');
  assert.equal(p.successorName, null, 'standalone block, outside the locked 24');
});

/**
 * ⚠ INVERTED 2026-08-06. This asserted `status !== 'LOCKED'` — the guard against this repo forging a
 * signature it cannot give itself. The product owner gave it, and unlike Body Recomposition Foundation
 * he closed the blocking item first: the Program screen now shows gear coverage before Start, so a
 * benchless athlete is told rather than finding out on day 1.
 *
 * What remains open is recorded in the Lock Record, and the guard now protects the record's existence
 * rather than the lock's absence.
 */
test('it is LOCKED, and the Lock Record beside it says what was signed', () => {
  assert.equal(p.status, 'LOCKED');
  assert.ok(p.sourceFile.endsWith('.md'), 'authored in-repo — cites a Design Record, not a .docx');
  assert.equal(p.source, 'forge');

  const lockRecord = join(HERE, '..', '..', '..', '..', '..', 'Programs', 'Hypertrophy', 'Close Quarters', 'Lock-Record.md');
  const text = readFileSync(lockRecord, 'utf8');
  assert.match(text, /Lock approved by/i, 'the Lock Record carries no approval line');
  // The bench is the whole reason this program mattered beyond itself. A record that stops naming it
  // loses the only account of why the gear model grew an AND.
  assert.match(text, /bench/i, 'the Lock Record no longer names the bench requirement');
  assert.match(text, /nobody has trained it/i, 'the Lock Record must still name what stayed open');
});

test('72 sessions across 12 weeks, no gap or overlap', () => {
  const sorted = [...p.blocks].sort((a, b) => a.weekStart - b.weekStart);
  assert.equal(sorted[0].weekStart, 1);
  assert.equal(sorted.at(-1).weekEnd, 12);
  for (let i = 1; i < sorted.length; i += 1) {
    assert.equal(sorted[i].weekStart, sorted[i - 1].weekEnd + 1, `gap or overlap before ${sorted[i].label}`);
  }
  for (const b of sorted) assert.equal(b.workouts.length, 6, `${b.label} day count`);
  assert.equal(sorted.reduce((a, b) => a + (b.weekEnd - b.weekStart + 1) * b.workouts.length, 0), 72);
});

test('push/pull/legs really runs twice through, in that order', () => {
  for (const b of p.blocks) {
    assert.deepEqual(b.workouts.map((w) => w.code), ['A', 'B', 'C', 'D', 'E', 'F'], `${b.label} day codes`);
    assert.deepEqual(
      b.workouts.map((w) => w.split),
      ['push', 'pull', 'legs', 'push', 'pull', 'legs'],
      `${b.label} is no longer push/pull/legs twice`,
    );
  }
});

test('every session sits inside the HYPERTROPHY envelope — 5–8 exercises, 18–30 sets', () => {
  for (const [w, b] of everyWorkout()) {
    const where = `${b.label} ${w.code}`;
    assert.ok(w.main.length >= 5 && w.main.length <= 8, `${where} has ${w.main.length} exercises`);
    const sets = sessionSets(w);
    assert.ok(sets >= 18 && sets <= 30, `${where} has ${sets} sets (envelope 18–30)`);
  }
});

test('rest is stated everywhere and sits inside PAS §10.3 INTERMEDIATE', () => {
  for (const [w, b] of everyWorkout()) {
    for (const [i, ex] of w.main.entries()) {
      const where = `${b.label} ${w.code} ${ex.displayName}`;
      assert.equal(typeof ex.restSec, 'number', `${where} has no restSec`);
      assert.ok(ex.restSec >= 60 && ex.restSec <= 180, `${where} rests ${ex.restSec}s`);
      if (i === 0) assert.ok(ex.restSec >= 90, `${where} is the primary and rests only ${ex.restSec}s`);
    }
  }
});

// ── progression: TWO deloads, because twelve weeks owes two ─────────────────

/**
 * PAS-D7, 11–14 weeks: two mandatory deloads — week 4 closing the opening mesocycle, and the penultimate
 * week, leaving the final week as peak. The source prescribes none across all twelve weeks, and the
 * tempting edit is to drop one back out because six days a week already feels like a lot.
 */
test('a 12-week program carries TWO deloads, at weeks 4 and 11', () => {
  const deloads = p.blocks.filter((b) => /deload/i.test(b.label));
  assert.equal(deloads.length, 2, 'PAS-D7 requires two deloads for an 11–14 week program');
  assert.deepEqual(deloads.map((b) => b.weekStart), [4, 11]);
  assert.equal(p.blocks[PEAK].weekStart, 12, 'the final week must be the peak, not a deload');
  // Frequency is never what a deload cuts (PAS-D8).
  for (const d of deloads) assert.equal(d.workouts.length, 6, `${d.label} dropped a session instead of volume`);
});

test('both deloads really are lighter, and stay inside the volume envelope', () => {
  for (const code of ['A', 'B', 'C', 'D', 'E', 'F']) {
    const vol = (i) => sessionVolume(p.blocks[i].workouts.find((w) => w.code === code));
    assert.ok(vol(DELOAD_1) < vol(0), `day ${code}: week 4 is not lighter than weeks 1–3`);
    assert.ok(vol(DELOAD_2) < vol(3), `day ${code}: week 11 is not lighter than weeks 8–10`);
  }
  for (const i of [DELOAD_1, DELOAD_2]) {
    for (const w of p.blocks[i].workouts) {
      assert.ok(sessionSets(w) >= 18, `${p.blocks[i].label} ${w.code} fell below the PAS-D11 floor`);
    }
  }
});

test('volume accumulates across the three work blocks, and week 12 is the heaviest', () => {
  for (const code of ['A', 'B', 'C', 'D', 'E', 'F']) {
    const vol = (i) => sessionVolume(p.blocks[i].workouts.find((w) => w.code === code));
    for (let n = 1; n < WORK.length; n += 1) {
      assert.ok(vol(WORK[n]) > vol(WORK[n - 1]), `day ${code}: ${p.blocks[WORK[n]].label} does not accumulate`);
    }
    const all = p.blocks.map((_, i) => vol(i));
    assert.equal(Math.max(...all), vol(PEAK), `day ${code}: week 12 is not the heaviest week`);
  }
});

/**
 * The same guard Frame by Frame carries, and for the same reason: a verbatim transcription passes every
 * generic check, because the only thing wrong with it is that nothing changes between blocks. The source
 * PDF is one table for twelve weeks.
 */
test('no two blocks prescribe an identical session — a transcription would fail here', () => {
  for (const code of ['A', 'B', 'C', 'D', 'E', 'F']) {
    const rendered = p.blocks.map((b) => {
      const w = b.workouts.find((x) => x.code === code);
      return JSON.stringify(w.main.map((ex) => [ex.catalogKey, ex.sets, ex.reps]));
    });
    assert.equal(new Set(rendered).size, rendered.length, `day ${code} renders two blocks identically`);
  }
});
