/**
 * Golden vectors for the transcription:  node --test scripts/bridger-logan/program.test.mjs
 *
 * A transcription has no compiler. The only thing standing between "32 sessions typed from screenshots"
 * and a quietly wrong training block is a list of things somebody checked against the source, so this
 * asserts the facts that were verified by eye — the week shape, the peak week's triples, the intensity
 * wave on the opening lift, and the handful of structures that only one session in the program has.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { STRUCTURE } from './program.mjs';
import { scheduleSlots, totalSessions, weekSizes, nextSession } from '../../src/domain/program/progress-core.ts';
import { deriveBlocks, isAmrap, repTargets, schemeText } from '../../src/domain/program/prescription.ts';

const dayAt = (w, d) => STRUCTURE.weekPlans[w - 1].days[d - 1];
const items = (day) => [...day.warmup, ...day.main, ...day.cooldown];
const named = (day, name) => items(day).find((i) => i.name === name);

// ── shape ────────────────────────────────────────────────────────────────────

test('six weeks, ragged, 32 sessions', () => {
  assert.deepEqual(weekSizes(STRUCTURE), [6, 6, 5, 5, 5, 5]);
  assert.equal(totalSessions(STRUCTURE), 32);
});

test('every session is reachable, in order, with no dead slot', () => {
  assert.ok(scheduleSlots(STRUCTURE).every((s) => s.day));
  const walk = Array.from({ length: 32 }, (_, i) => nextSession(STRUCTURE, i));
  assert.equal(walk.filter(Boolean).length, 32);
  assert.equal(walk[0].day.name, 'PUSH');
  assert.equal(walk[31].day.name, 'LOWER');
  assert.equal(nextSession(STRUCTURE, 32), null);
});

test('the day titles are the ones on the cards', () => {
  assert.deepEqual(STRUCTURE.weekPlans.map((w) => w.days.map((d) => d.name)), [
    ['PUSH', 'PULL', 'LEGS', 'UPPER', 'LOWER or RUN', 'OPTIONAL FULL BODY HIIT'],
    ['PUSH', 'PULL', 'LEGS', 'UPPER or RUN', 'LOWER', 'OPTIONAL FULL BODY HIIT'],
    ['PUSH', 'PULL', 'LEGS / HITT', 'UPPER', 'LOWER'],
    ['UPPER', 'LOWER', 'ATHLETIC CONDITIONING', 'UPPER PUMP', 'ATHLETIC TRAINING'],
    ['UPPER', 'PULL', 'LEGS', 'UPPER', 'LOWER AND CONDITIONER'],
    ['PUSH', 'PULL', 'LEGS', 'UPPER', 'LOWER'],
  ]);
});

test('week 4 changes the split — deliberate, not a mis-sort', () => {
  const w4 = STRUCTURE.weekPlans[3].days.map((d) => d.name);
  assert.ok(!w4.includes('PUSH') && !w4.includes('PULL'), 'week 4 abandons Push/Pull entirely');
});

// ── the intensity wave, which is what says the weeks are in the right order ──

test('the opening lift waves down to a max-effort triple', () => {
  assert.deepEqual(repTargets(named(dayAt(1, 1), 'Incline Bench Press')), [6, 6, 4, 4]);
  assert.deepEqual(repTargets(named(dayAt(2, 1), 'Incline Bench Press')), [5, 5, 5, 5, 5]);
  assert.deepEqual(repTargets(named(dayAt(5, 4), 'Incline Bench Press')), [12, 12, 12, 12]);
  assert.deepEqual(repTargets(named(dayAt(6, 1), 'Bench Press - Max Effort')), [3, 3, 3, 3, 3]);
  assert.deepEqual(repTargets(named(dayAt(6, 3), 'Barbell Squat - Max Effort')), [3, 3, 3, 3]);
});

test('ladders keep every rung', () => {
  assert.equal(schemeText(named(dayAt(1, 3), 'Barbell Squat')), '4 × 10-8-6-4');
  assert.equal(schemeText(named(dayAt(1, 5), 'Barbell Hip Thrust')), '4 × 8-8-6-6');
  assert.equal(schemeText(named(dayAt(1, 1), 'EZ-Bar Skull Crushers')), '3 × 10-8-6');
});

test('to-failure sets are prescriptions, not blanks', () => {
  assert.deepEqual(repTargets(named(dayAt(1, 1), 'Dips')), ['F', 'F', 'F']);
  assert.deepEqual(repTargets(named(dayAt(2, 1), 'EZ-Bar Upright Row')), [10, 10, 10, 'F']);
  assert.deepEqual(repTargets(named(dayAt(2, 4), 'Push Ups')), ['F', 'F']);
});

// ── the structures only one session has ─────────────────────────────────────

test('both OPTIONAL FULL BODY HIIT days are exactly two AMRAPs and nothing else', () => {
  for (const day of [dayAt(1, 6), dayAt(2, 6)]) {
    const blocks = deriveBlocks(items(day));
    assert.equal(blocks.length, 2);
    assert.ok(blocks.every(isAmrap), 'both blocks are bounded by a clock, not a round count');
  }
});

test('the two HIIT days carry their own caps — 8+8 and 10+10, not one shared number', () => {
  /**
   * The cards both say 20m; the WORK is 16 minutes in week 1 and 20 in week 2. The card is wall-clock
   * including the changeover, the cap is the clock you actually run, and flattening the two together
   * would prescribe four minutes nobody wrote.
   */
  assert.deepEqual(deriveBlocks(items(dayAt(1, 6))).map((b) => b.capSec), [8 * 60, 8 * 60]);
  assert.deepEqual(deriveBlocks(items(dayAt(2, 6))).map((b) => b.capSec), [10 * 60, 10 * 60]);
});

test('LEGS / HITT is the only leg day carrying two AMRAP-named blocks', () => {
  const names = deriveBlocks(items(dayAt(3, 3))).map((b) => b.name);
  assert.ok(names.includes('AMRAP #1') && names.includes('AMRAP #2'));
});

test('UPPER PUMP is the day with the Arm pump circuit', () => {
  assert.ok(deriveBlocks(items(dayAt(4, 4))).some((b) => b.name === 'Arm pump'));
});

test('ATHLETIC CONDITIONING has no barbell work at all', () => {
  const names = items(dayAt(4, 3)).map((i) => i.name).join(' | ');
  assert.ok(!/Barbell|Bench Press|Deadlift|Squat/.test(names), names);
});

test('ATHLETIC TRAINING is built on a single 25-minute AMRAP', () => {
  const amraps = deriveBlocks(items(dayAt(4, 5))).filter(isAmrap);
  assert.equal(amraps.length, 1);
  assert.equal(amraps[0].capSec, 25 * 60);
  assert.equal(amraps[0].items.length, 5);
});

test('LOWER AND CONDITIONER is lower lifts plus a 20-minute AMRAP', () => {
  const day = dayAt(5, 5);
  assert.ok(named(day, 'Conventional Deadlift') && named(day, 'Barbell Hip Thrust'));
  assert.equal(deriveBlocks(items(day)).filter(isAmrap)[0].capSec, 20 * 60);
});

// ── circuits ─────────────────────────────────────────────────────────────────

test('every circuit knows how many times through it goes', () => {
  for (const [wi, wp] of STRUCTURE.weekPlans.entries()) {
    for (const [di, d] of wp.days.entries()) {
      for (const b of deriveBlocks(items(d))) {
        if (!b.groupId) continue;
        assert.ok(b.rounds || b.capSec, `W${wi + 1}D${di + 1} "${b.name}" has neither rounds nor a cap`);
      }
    }
  }
});

test('the standing warm-ups are two-round circuits, and lower days open with the optional Stairmaster', () => {
  const push = deriveBlocks(dayAt(1, 1).warmup)[0];
  assert.equal(push.rounds, 2);
  assert.equal(push.items.length, 4);
  assert.ok(push.items.every((i) => i.durationSec === 30));

  const lower = dayAt(1, 3).warmup;
  assert.equal(lower[0].name, 'Stairmaster');
  assert.equal(lower[0].optional, true, 'prescribed, but the athlete owes nothing by skipping it');
});

test('cardio bouts are prescribed by the clock', () => {
  assert.equal(schemeText(named(dayAt(1, 2), 'Treadmill Run')), '15 min');
  assert.equal(schemeText(named(dayAt(1, 4), 'Row')), '10 min');
  assert.equal(schemeText(named(dayAt(3, 4), 'Easy Row')), '5 min');
});
