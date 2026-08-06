/**
 * frame-by-frame.test.mjs — Frame by Frame (5-Day) against its Design Record.
 *
 * `programs.test.mjs` already covers the generic contract for every definition in the directory. What is
 * here is the half a generic validator cannot know.
 *
 * ══ THE ONE THIS FILE EXISTS FOR ══
 *
 * Full Frame's first draft was rejected for reproducing five supplied tables verbatim across six weeks:
 * 35 prescriptions, 25 of which never changed, with "add weight when you can" living only in prose. The
 * app renders SETS and REPS — the load is whatever the athlete decides — so week 6 rendered identically
 * to week 1 and the progression did not exist. The source PDF behind THIS program has the same defect:
 * one table, ten weeks, "move up in weight when possible".
 *
 * A transcription passes every generic check in `programs.test.mjs`. It has real catalog keys, real
 * units, real warm-ups, and a well-formed block structure. The only thing wrong with it is that nothing
 * changes — and that is invisible unless a test compares blocks to each other. So that is what this does.
 *
 * Run:  node --test src/domain/training/programs/__tests__/frame-by-frame.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const p = JSON.parse(readFileSync(join(HERE, '..', 'frame-by-frame-5day.json'), 'utf8'));

const everyWorkout = () => p.blocks.flatMap((b) => b.workouts.map((w) => [w, b]));
/** A to-failure set has no rep number; count it at 10 so it contributes without inventing a target. */
const repsOf = (ex) => (ex.repScheme ? 10 : ex.reps);
const sessionVolume = (w) => w.main.reduce((a, ex) => a + ex.sets * repsOf(ex), 0);
const sessionSets = (w) => w.main.reduce((a, ex) => a + ex.sets, 0);

const DELOAD = 4; // block index — Week 9
const PEAK = 5; //   block index — Week 10

test('metadata is what the Design Record says it is', () => {
  assert.equal(p.id, 'frame-by-frame-5day');
  assert.equal(p.family, 'Muscle Building');
  assert.equal(p.difficulty, 'Intermediate');
  assert.equal(p.durationWeeks, 10);
  assert.equal(p.frequencyPerWeek, 5);
  assert.equal(p.theme, 'bodybuilding');
  assert.ok(p.name.length <= 60, 'PAS-D1 hard limit');
  assert.notEqual(p.status, 'LOCKED', 'claims a lock nobody signed');
  assert.equal(p.successorName, null, 'standalone block, outside the locked 24');
});

/**
 * `structure` must stay OMITTED. The vocabulary is `upper_lower | ppl | full_body` and a body-part split
 * is none of them — claiming one misdescribes the program to the artwork resolver, and `upper_lower` in
 * particular would also make a `lower` split legal in a program that should never use one.
 */
test('structure is omitted rather than guessed, and no day claims a lower split', () => {
  assert.equal(p.structure, undefined);
  for (const [w, b] of everyWorkout()) {
    assert.notEqual(w.split, 'lower', `${b.label} ${w.code}: 'lower' needs a declared upper_lower structure`);
  }
});

test('50 sessions across 10 weeks, no gap or overlap', () => {
  const sorted = [...p.blocks].sort((a, b) => a.weekStart - b.weekStart);
  assert.equal(sorted[0].weekStart, 1);
  assert.equal(sorted.at(-1).weekEnd, 10);
  for (let i = 1; i < sorted.length; i += 1) {
    assert.equal(sorted[i].weekStart, sorted[i - 1].weekEnd + 1, `gap or overlap before ${sorted[i].label}`);
  }
  for (const b of sorted) assert.equal(b.workouts.length, 5, `${b.label} day count`);
  const total = sorted.reduce((a, b) => a + (b.weekEnd - b.weekStart + 1) * b.workouts.length, 0);
  assert.equal(total, 50);
});

test('the five body-part days are the same five days in every block', () => {
  for (const b of p.blocks) {
    assert.deepEqual(b.workouts.map((w) => w.code), ['A', 'B', 'C', 'D', 'E'], `${b.label} day codes`);
    assert.deepEqual(
      b.workouts.map((w) => w.split),
      ['pull', 'push', 'legs', 'push', 'upper'],
      `${b.label} splits`,
    );
  }
});

// ── PAS-D11 HYPERTROPHY envelope, and PAS §10.3 rest ────────────────────────

test('every session sits inside the HYPERTROPHY envelope — 5–8 exercises, 18–30 sets', () => {
  for (const [w, b] of everyWorkout()) {
    const where = `${b.label} ${w.code}`;
    assert.ok(w.main.length >= 5 && w.main.length <= 8, `${where} has ${w.main.length} exercises`);
    const sets = sessionSets(w);
    assert.ok(sets >= 18 && sets <= 30, `${where} has ${sets} sets (envelope 18–30)`);
  }
});

test('rest is stated on every prescription and sits inside PAS §10.3 INTERMEDIATE', () => {
  for (const [w, b] of everyWorkout()) {
    for (const [i, ex] of w.main.entries()) {
      const where = `${b.label} ${w.code} ${ex.displayName}`;
      assert.equal(typeof ex.restSec, 'number', `${where} has no restSec`);
      // 90–180s for compounds, 60–90s for accessories — so 60–180 overall, and the primary at the top.
      assert.ok(ex.restSec >= 60 && ex.restSec <= 180, `${where} rests ${ex.restSec}s`);
      if (i === 0) assert.ok(ex.restSec >= 90, `${where} is the primary and rests only ${ex.restSec}s`);
    }
  }
});

// ── THE PROGRESSION TESTS — the reason this file exists ─────────────────────

/**
 * The direct answer to "week 6 rendered identically to week 1". Blocks must differ in what the app draws.
 */
test('no two blocks prescribe an identical session — a transcription would fail here', () => {
  for (const code of ['A', 'B', 'C', 'D', 'E']) {
    const rendered = p.blocks.map((b) => {
      const w = b.workouts.find((x) => x.code === code);
      return JSON.stringify(w.main.map((ex) => [ex.catalogKey, ex.sets, ex.reps, ex.repScheme ?? null]));
    });
    assert.equal(new Set(rendered).size, rendered.length, `day ${code} renders two blocks identically`);
  }
});

test('volume accumulates every block up to the deload, then peaks', () => {
  for (const code of ['A', 'B', 'C', 'D', 'E']) {
    const vols = p.blocks.map((b) => sessionVolume(b.workouts.find((x) => x.code === code)));
    for (let i = 1; i <= 3; i += 1) {
      assert.ok(vols[i] > vols[i - 1], `day ${code}: ${p.blocks[i].label} does not accumulate (${vols[i - 1]} → ${vols[i]})`);
    }
    assert.equal(Math.min(...vols), vols[DELOAD], `day ${code}: week 9 is not the lightest week`);
    assert.equal(Math.max(...vols), vols[PEAK], `day ${code}: week 10 is not the heaviest week`);
  }
});

test('the primary lift never gets easier except at the deload', () => {
  for (const code of ['A', 'B', 'C', 'D', 'E']) {
    const work = p.blocks.map((b) => {
      const ex = b.workouts.find((x) => x.code === code).main[0];
      return ex.sets * repsOf(ex);
    });
    for (let i = 1; i <= 3; i += 1) {
      assert.ok(work[i] >= work[i - 1], `day ${code}: the primary drops in ${p.blocks[i].label}`);
    }
    assert.ok(work[PEAK] > work[0], `day ${code}: the primary at peak is no harder than week 1`);
  }
});

test('week 9 deloads on volume, never on frequency (PAS-D8)', () => {
  const d = p.blocks[DELOAD];
  assert.equal(d.weekStart, 9);
  assert.equal(d.weekEnd, 9);
  assert.match(d.label, /deload/i, 'the deload week should say so in its label');
  assert.equal(d.workouts.length, 5, 'a deload drops volume, not sessions');
  // And it must stay inside the envelope rather than falling out the bottom of it.
  for (const w of d.workouts) {
    const sets = sessionSets(w);
    assert.ok(sets >= 18, `deload ${w.code} fell to ${sets} sets, below the PAS-D11 floor`);
  }
});

// ── things the source did that must not creep back ──────────────────────────

/**
 * PAS §2.2: `dayOfWeek` is always null; Forge programs are sequential, not calendar-based. The source
 * PDF's entire hook is Monday-to-Friday, and the tempting edit is to put the weekdays back in the day
 * names because they read nicely. An athlete who trains Tuesday through Saturday runs the same program.
 */
test('no session is named after a day of the week', () => {
  const WEEKDAY = /\b(mon|tues|wednes|thurs|fri|satur|sun)day\b/i;
  for (const [w, b] of everyWorkout()) {
    assert.doesNotMatch(w.name, WEEKDAY, `${b.label} ${w.code} is named "${w.name}"`);
  }
});

test('a to-failure set is a real ladder, not a zero pretending to be a prescription', () => {
  let found = 0;
  for (const [w, b] of everyWorkout()) {
    for (const ex of w.main) {
      if (!ex.repScheme) continue;
      found += 1;
      assert.equal(ex.sets, ex.repScheme.length, `${b.label} ${w.code} ${ex.displayName}: sets disagree with the ladder`);
      assert.ok(ex.repScheme.every((r) => r === 'F'), `${b.label} ${w.code} ${ex.displayName}: mixed ladder`);
    }
  }
  assert.ok(found > 0, 'the to-failure push-up set has disappeared from the program');
});
