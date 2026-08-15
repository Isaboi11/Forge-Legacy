/**
 * climb.test.mjs — elevation gain, and the noise it has to survive.
 *
 * PO: *"Do we have trail runs that can track time, distance, and climb or elevation gain?"* The fixes
 * always carried `altitude`; the tracker read latitude, longitude and accuracy and dropped it.
 *
 * The whole difficulty is that a phone's altimeter is much noisier vertically than horizontally, and the
 * naive sum only ever errs upward. These tests are mostly about NOT counting things.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ALT_ACCURACY_FLOOR_M,
  CLIMB_THRESHOLD_M,
  acceptFix,
  displayGain,
  hasClimbData,
  totalGainM,
} from '../run-core.ts';

/** Fixes far enough apart to clear the jitter floor but slow enough to never look like a teleport. */
const STEP_DEG = 0.0009; // ~100 m
const fix = (i, alt, altAccuracy = 5) => ({
  lat: 40 + i * STEP_DEG,
  lon: -105,
  accuracy: 5,
  at: 1_700_000_000_000 + i * 60_000, // one fix a minute → ~3.7 mph, a jog
  alt,
  altAccuracy,
});

/**
 * Feed a series of altitudes through the real accept path and return the finished track.
 *
 * ⚠ `altAccuracy` IS FORWARDED. The first draft of this helper took the parameter and dropped it on the
 * floor, so every case ran at the default ±5 m — the unreliable-altimeter test failed loudly (which is
 * how it was found) and the null-accuracy test PASSED without ever passing a null. A fixture that
 * quietly ignores the variable under test is worse than no test.
 */
function run(alts, altAccuracy = 5) {
  let track = [];
  alts.forEach((alt, i) => {
    track = acceptFix(track, fix(i, alt, altAccuracy), 'run').track;
  });
  return track;
}

// ── the thing it must not do ────────────────────────────────────────────────

test('⚠ a noisy altimeter standing on flat ground reports NO climb', () => {
  // ±2 m wander around 100 m — the exact shape that makes a naive max(0, delta) sum invent a mountain.
  const noise = [100, 102, 99, 101, 98.5, 101.5, 100, 99, 101, 100];
  assert.equal(totalGainM(run(noise)), 0);
});

test('and the naive sum it replaces would have invented one', () => {
  const noise = [100, 102, 99, 101, 98.5, 101.5, 100, 99, 101, 100];
  let naive = 0;
  for (let i = 1; i < noise.length; i++) naive += Math.max(0, noise[i] - noise[i - 1]);
  assert.ok(naive > 5, `the guard is guarding something: the naive sum reports ${naive.toFixed(1)} m`);
});

// ── the thing it must do ────────────────────────────────────────────────────

test('a real climb is counted', () => {
  assert.equal(Math.round(totalGainM(run([100, 110, 120, 130]))), 30);
});

test('a descent is not subtracted — gain is climb, not net change', () => {
  assert.equal(Math.round(totalGainM(run([100, 130, 100]))), 30);
});

test('down then up counts the second climb from the BOTTOM, not from the peak', () => {
  // 100 → 60 (reset to 60) → 100 is a real 40 m climb back out of the dip.
  assert.equal(Math.round(totalGainM(run([100, 60, 100]))), 40);
});

test('a long steady grade accumulates even though each step is small', () => {
  // 4 m a fix clears the threshold every time; 25 steps of it is 100 m of hill.
  const grade = Array.from({ length: 26 }, (_, i) => 100 + i * 4);
  assert.equal(Math.round(totalGainM(run(grade))), 100);
});

test('a rise smaller than the threshold is never counted, however many times it happens', () => {
  const under = Array.from({ length: 40 }, (_, i) => 100 + (i % 2) * (CLIMB_THRESHOLD_M - 0.5));
  assert.equal(totalGainM(run(under)), 0);
});

// ── believing the device ────────────────────────────────────────────────────

test('⚠ an altitude the device says is unreliable is not used', () => {
  const bad = ALT_ACCURACY_FLOOR_M + 10;
  assert.equal(totalGainM(run([100, 140, 180], bad)), 0, 'a ±25 m reading cannot resolve a 3 m step');
});

test('a null vertical accuracy is ACCEPTED — plenty of devices simply do not report one', () => {
  assert.equal(Math.round(totalGainM(run([100, 110, 120], null))), 20);
});

test('fixes with no altitude at all carry the gain forward rather than resetting it', () => {
  let track = [];
  [100, 110, null, null, 120].forEach((alt, i) => {
    track = acceptFix(track, fix(i, alt), 'run').track;
  });
  assert.equal(Math.round(totalGainM(track)), 20, 'the 110→120 climb survives the gap');
});

test('a track with no altitude anywhere is distinguishable from a flat one', () => {
  assert.equal(hasClimbData(run([null, null, null])), false, '"we could not tell" is not "0 ft"');
  assert.equal(hasClimbData(run([100, 100, 100])), true);
  assert.equal(totalGainM(run([null, null])), 0);
});

// ── it rides the same rejections the distance does ──────────────────────────

test('⚠ a teleport credits no climb — a signal that jumped a block also jumped a floor', () => {
  let track = acceptFix([], fix(0, 100), 'run').track;
  // Same instant, 2 degrees away and 300 m up: a correction, not a journey.
  track = acceptFix(track, { lat: 42, lon: -105, accuracy: 5, at: fix(0, 0).at + 1000, alt: 400, altAccuracy: 5 }, 'run').track;
  assert.equal(totalGainM(track), 0);
  assert.equal(track.length, 2, 'the position is still re-anchored');
});

test('a fix inside the movement gate cannot sneak climb in either', () => {
  let track = acceptFix([], fix(0, 100), 'run').track;
  // A centimetre away, 10 m up. Refused horizontally; its altitude must not be credited.
  const res = acceptFix(track, { lat: 40.0000001, lon: -105, accuracy: 5, at: fix(0, 0).at + 5000, alt: 110, altAccuracy: 5 }, 'run');
  assert.equal(res.rejected, 'jitter');
  assert.equal(totalGainM(res.track), 0, 'climb accrues only where distance does');
  assert.equal(res.track[res.track.length - 1].mi, 0, 'and no ground was covered either');
});

/*
 * ⚠ THIS TEST USED TO ASSERT `track.length` DID NOT CHANGE, and that assertion is gone on purpose.
 *
 * Under the old accept rule a jittered fix was discarded outright, so "the track did not grow" was a fair
 * proxy for "nothing was credited". `acceptFix` now keeps a PROVISIONAL head — a fix inside the gate
 * still improves the estimate of where the athlete is standing, it just isn't travel — so the array does
 * change, by replacement rather than growth. What must not change is the climb and the distance, and
 * those are what the test above now reads directly instead of inferring from a length.
 */
test('a run of gate-inside fixes replaces the head rather than piling up', () => {
  let track = acceptFix([], fix(0, 100), 'run').track;
  for (let i = 1; i <= 20; i++) {
    track = acceptFix(track, { lat: 40 + i * 1e-7, lon: -105, accuracy: 5, at: fix(0, 0).at + i * 1000, alt: 100, altAccuracy: 5 }, 'run').track;
  }
  assert.equal(track.length, 2, 'the seed, plus one provisional head — not twenty-one points of standing still');
  assert.equal(totalGainM(track), 0);
});

// ── presentation ────────────────────────────────────────────────────────────

test('climb reads in the athlete’s unit', () => {
  assert.deepEqual(displayGain(0, false), { value: 0, unit: 'ft' });
  assert.deepEqual(displayGain(100, true), { value: 100, unit: 'm' });
  assert.deepEqual(displayGain(100, false), { value: 328, unit: 'ft' });
  assert.deepEqual(displayGain(304.8, false), { value: 1000, unit: 'ft' });
});
