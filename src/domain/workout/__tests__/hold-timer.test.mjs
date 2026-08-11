import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { clockText, holdProgress, holdRemaining, holdResult, MIN_HOLD_SEC } from '../hold-timer.ts';
import { asUnit, buildPickerDb, DEFAULT_HOLD_SEC } from '../../exercise-picker/catalog-core.ts';
import { GOAL_SEC_DEFAULT } from '../set-goal.ts';

/**
 * The countdown for a timed set, and the catalogue field that decides a set gets one.
 *
 * PO review: *"There are some workouts we should have with a countdown time. Like planks for example."*
 */

// ── what gets written down ───────────────────────────────────────────────────

test('a hold that ran out records the TARGET, not the jitter', () => {
  // The ticker fires every 250ms, so "finished" is always discovered slightly late. Reporting the raw
  // elapsed time would log 60s planks as 60 and 61 at random, and an athlete comparing weeks would read
  // interval scheduling as progress.
  assert.equal(holdResult({ targetSec: 60, elapsedMs: 60_240, expired: true }), 60);
  assert.equal(holdResult({ targetSec: 60, elapsedMs: 60_000, expired: true }), 60);
  assert.equal(holdResult({ targetSec: 45, elapsedMs: 45_499, expired: true }), 45);
});

test('a hold the athlete stopped records what they actually held', () => {
  // The most useful number in the session: forty of a prescribed sixty is a forty-second set, not a
  // failure and not a lie. It is also the one that will move next week.
  assert.equal(holdResult({ targetSec: 60, elapsedMs: 40_000, expired: false }), 40);
  assert.equal(holdResult({ targetSec: 60, elapsedMs: 40_400, expired: false }), 40);
  assert.equal(holdResult({ targetSec: 60, elapsedMs: 40_600, expired: false }), 41);
});

test('a mis-tap is not a set', () => {
  // Start and stop in the same gesture — a thumb catching the button on the way past. Recording
  // "Plank — 0s" as completed puts something that did not happen into the athlete's history.
  assert.equal(holdResult({ targetSec: 30, elapsedMs: 0, expired: false }), null);
  assert.equal(holdResult({ targetSec: 30, elapsedMs: 200, expired: false }), null);
  assert.equal(holdResult({ targetSec: 30, elapsedMs: 1000, expired: false }), MIN_HOLD_SEC);
});

test('a hold that expires always records something, even a one-second one', () => {
  // The floor applies to the expiry path too, so a nonsense 0s prescription cannot complete as 0.
  assert.equal(holdResult({ targetSec: 0, elapsedMs: 400, expired: true }), MIN_HOLD_SEC);
});

// ── the clock on screen ──────────────────────────────────────────────────────

test('the countdown reads as a clock, and rounds UP while the second is still being spent', () => {
  const endsAt = 1_000_000;
  assert.equal(holdRemaining(endsAt, endsAt - 30_000), 30);
  assert.equal(holdRemaining(endsAt, endsAt - 1), 1, 'not yet zero — the athlete is still holding');
  assert.equal(holdRemaining(endsAt, endsAt), 0);
  assert.equal(holdRemaining(endsAt, endsAt + 5_000), 0, 'never negative');
  assert.equal(holdRemaining(null, endsAt), 0);
});

test('clock digits, not prescription prose', () => {
  // `durText` says "1m 30s" — right for reading an ask in a sentence, wrong for a face being watched.
  assert.equal(clockText(90), '1:30');
  assert.equal(clockText(45), '0:45');
  assert.equal(clockText(5), '0:05');
  assert.equal(clockText(600), '10:00');
  assert.equal(clockText(0), '0:00');
});

test('the ring fills forwards and cannot overfill', () => {
  assert.equal(holdProgress(60, 60), 0);
  assert.equal(holdProgress(60, 30), 0.5);
  assert.equal(holdProgress(60, 0), 1);
  assert.equal(holdProgress(60, -5), 1, 'a late tick must not push the ring past full');
  assert.equal(holdProgress(0, 0), 0, 'a zero-length hold has no progress to show');
});

// ── the catalogue field that turns the timer on ──────────────────────────────

test('absent means reps, and so does anything unrecognised', () => {
  // The safe direction: a typo degrades to the behaviour that shipped before this field, which still
  // records something. The other way round hands an athlete a stopwatch for a set of curls.
  assert.equal(asUnit(undefined), 'reps');
  assert.equal(asUnit('reps'), 'reps');
  assert.equal(asUnit('Time'), 'reps', 'the value is exact — a near-miss is not a guess');
  assert.equal(asUnit('seconds'), 'reps');
  assert.equal(asUnit('time'), 'time');
});

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..', '..', 'exercise-relationships', 'source');
const load = (f) => JSON.parse(readFileSync(join(SRC, f), 'utf8'));
const DB = buildPickerDb({
  exercises: load('exercises.json'),
  exerciseMuscles: load('exercise_muscles.json'),
  muscles: load('muscles.json'),
  equipment: load('equipment.json'),
});
const unitOf = (name) => DB.find((x) => x.name === name)?.unit;

test('the movements that are obviously held say so', () => {
  for (const n of ['Plank', 'Side Plank', 'RKC Plank', 'Wall Sit', 'Dead Hang', 'Hollow Body Hold', 'L-Sit', 'Bear Crawl']) {
    assert.equal(unitOf(n), 'time', `${n} is measured by the clock`);
  }
});

test('every carry in the catalogue is timed — a carry has never been counted in reps', () => {
  const carries = DB.filter((x) => /carry/i.test(x.name));
  assert.ok(carries.length >= 20, 'the carries should still be here');
  for (const c of carries) assert.equal(c.unit, 'time', `${c.name} is a carry and must be timed`);
});

test('a stretch you sit in is timed; a drill you move through is not', () => {
  for (const n of ["Child's Pose", 'Pigeon Stretch', 'Couch Stretch', 'Foam Roll Quadriceps']) {
    assert.equal(unitOf(n), 'time', `${n} is held`);
  }
  // CARs are counted rotations, Cat-Cow is a rep, and World's Greatest Stretch is a flow you move
  // through rather than a position you settle into.
  for (const n of ['Hip CAR', 'Shoulder CAR', 'Cat-Cow', "World's Greatest Stretch", 'Wall Angel']) {
    assert.equal(unitOf(n), 'reps', `${n} is counted, not timed`);
  }
});

test('the lifts are untouched — this field must not have leaked across the catalogue', () => {
  for (const n of ['Barbell Back Squat', 'Barbell Bench Press', 'EZ-Bar Biceps Curl', 'Push-Up', 'Dumbbell Row']) {
    const item = DB.find((x) => x.name === n);
    if (item) assert.equal(item.unit, 'reps', `${n} must stay rep-based`);
  }
  /*
   * ⚠ 74 VISIBLE, 82 ANNOTATED, and the gap is the point rather than a discrepancy.
   *
   * Eight timed rows sit in `HIDDEN_EXERCISE_IDS` — the advanced-gymnastics holds (planche, both levers,
   * handstand hold and walk) and the strongman carries (yoke, keg). They are annotated because the file
   * is the authoritative catalogue and an athlete who logged one before it was hidden must still read
   * back correctly; they are not counted here because this asserts what the app can actually OFFER.
   *
   * Counting the file instead would be the exact mistake this repo keeps catching: a guard that passes
   * on exercises nobody can reach.
   */
  const timed = DB.filter((x) => x.unit === 'time');
  assert.ok(timed.length >= 70 && timed.length <= 90, `${timed.length} timed movements visible — expected roughly 74`);
});

test('an athlete-added hold gets a sane default length', () => {
  // Nothing prescribed it, so the app has to choose. Thirty seconds is a real plank and a real carry.
  assert.ok(DEFAULT_HOLD_SEC >= 15 && DEFAULT_HOLD_SEC <= 60);
});

test('⚠ THE APP HAS ONE ANSWER TO "HOW LONG IS A HOLD", NOT TWO', () => {
  /*
   * These are set in different modules for different jobs — `DEFAULT_HOLD_SEC` is the length a Plank
   * ARRIVES with when added from the picker, `GOAL_SEC_DEFAULT` is what the goal editor opens on for a
   * lift that has never had a time goal — and they drifted apart the moment the first was introduced
   * (30 vs 45). The athlete saw both: a card reading 30s, and a field that opened on 45.
   *
   * Asserted rather than merged into one constant because the two really are different questions; they
   * just have to have the same answer.
   */
  assert.equal(DEFAULT_HOLD_SEC, GOAL_SEC_DEFAULT);
});
