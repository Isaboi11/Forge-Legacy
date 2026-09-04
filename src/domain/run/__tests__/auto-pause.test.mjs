import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AUTO_PAUSE_GRACE_SEC,
  autoResumeStep,
  probeAt,
  shouldAutoPause,
  windowSpeedMph,
} from '../auto-pause.ts';

/**
 * Auto-pause.
 *
 * The asymmetry under test: a MISSED pause costs a few seconds of clock; a FALSE pause costs the athlete's
 * belief in their pace. So every ambiguous case below must resolve to "keep running".
 */

const NOW = Date.parse('2026-09-04T12:00:00.000Z');

/** A track travelling at `mph`, one fix a second, ending `staleSec` before `NOW`. */
const trackAt = (mph, seconds = 30, staleSec = 0) => {
  const miPerSec = mph / 3600;
  const out = [];
  for (let i = seconds; i >= 0; i--) {
    out.push({
      lat: 40 + i * 0.0001,
      lon: -111,
      at: NOW - (i + staleSec) * 1000,
      mi: 0.5 + (seconds - i) * miPerSec,
      gainM: 0,
    });
  }
  return out;
};

const live = (track, extra = {}) => ({
  track,
  nowMs: NOW,
  elapsedSec: 600,
  receivingFixes: true,
  ...extra,
});

/* ── the speed window ──────────────────────────────────────────────────────── */

test('a steady 6 mph reads as 6 mph over the window', () => {
  assert.ok(Math.abs(windowSpeedMph(trackAt(6), NOW) - 6) < 0.2);
});

test('⚠ A STALE TRACK IS ZERO, NOT A DIVISION BY A TINY ELAPSED', () => {
  // The athlete stopped 30s ago; `acceptFix` has been rejecting their jitter ever since, so nothing new
  // has entered the track. Measuring against the last FIX instead of the wall clock is what would make
  // this report a garbage value rather than a stop.
  assert.equal(windowSpeedMph(trackAt(6, 30, 30), NOW), 0);
});

test('an empty track is zero, not a throw', () => {
  assert.equal(windowSpeedMph([], NOW), 0);
});

/* ── pausing ───────────────────────────────────────────────────────────────── */

test('a runner at pace is never paused', () => {
  assert.equal(shouldAutoPause(live(trackAt(6))), false);
});

test('⛔ THE MARGIN CASE: a slow walk is not a stop', () => {
  // ~2.5 mph is a stroll, and a stroll is a session someone deliberately started. The threshold has to
  // sit clearly underneath it.
  assert.equal(shouldAutoPause(live(trackAt(2.5))), false);
});

test('a shuffle is still moving', () => {
  assert.equal(shouldAutoPause(live(trackAt(1.4))), false);
});

test('standing at a light pauses', () => {
  assert.equal(shouldAutoPause(live(trackAt(6, 30, 20))), true);
});

test('⛔ NO FIXES ARRIVING IS NOT STILLNESS — a tunnel must never pause the run', () => {
  // A frozen track looks identical whether the athlete stopped or the device went quiet. Only one of
  // those is a pause, and guessing wrong stops the clock on someone who is still running.
  assert.equal(shouldAutoPause(live(trackAt(6, 30, 20), { receivingFixes: false })), false);
});

test('the opening seconds are exempt — Start is pressed standing still', () => {
  const standing = live(trackAt(6, 30, 20), { elapsedSec: AUTO_PAUSE_GRACE_SEC - 1 });
  assert.equal(shouldAutoPause(standing), false);
  assert.equal(shouldAutoPause({ ...standing, elapsedSec: AUTO_PAUSE_GRACE_SEC + 1 }), true);
});

test('a session that has covered nothing has nothing to pause', () => {
  const nowhere = trackAt(6, 30, 20).map((p) => ({ ...p, mi: 0 }));
  assert.equal(shouldAutoPause(live(nowhere)), false);
});

test('an empty track never pauses', () => {
  assert.equal(shouldAutoPause(live([])), false);
});

/* ── resuming ──────────────────────────────────────────────────────────────── */

const FAR = { lat: 40.0004, lon: -111, accuracy: 8 }; // ~44 m from the anchor
const NEAR = { lat: 40.00002, lon: -111, accuracy: 8 }; // ~2 m — jitter
const anchor = () => probeAt(40, -111);

test('two consecutive far fixes resume the run', () => {
  const one = autoResumeStep(anchor(), FAR);
  assert.equal(one.resume, false); // one is a spike
  const two = autoResumeStep(one.probe, FAR);
  assert.equal(two.resume, true);
  assert.equal(two.probe, null); // the probe is spent
});

test('⛔ a single jitter spike does not resume', () => {
  const spike = autoResumeStep(anchor(), FAR);
  const back = autoResumeStep(spike.probe, NEAR);
  assert.equal(back.resume, false);
  assert.equal(back.probe.away, 0); // and the count went back to zero
});

test('standing still keeps the run paused indefinitely', () => {
  let step = { probe: anchor(), resume: false };
  for (let i = 0; i < 50; i++) {
    step = autoResumeStep(step.probe, NEAR);
    assert.equal(step.resume, false);
  }
});

test('⛔ a sloppy fix is IGNORED, not counted and not held against the athlete', () => {
  // A 60 m-accurate fix can read 60 m from the anchor with nobody moving — the false resume this avoids.
  const sloppy = { lat: 40.0004, lon: -111, accuracy: 60 };
  const first = autoResumeStep(anchor(), FAR);
  const ignored = autoResumeStep(first.probe, sloppy);
  assert.equal(ignored.resume, false);
  // ⚠ The count was NOT reset — a bad fix mid-departure must not hold a running athlete paused.
  assert.equal(ignored.probe.away, 1);
  assert.equal(autoResumeStep(ignored.probe, FAR).resume, true);
});

test('a fix with no accuracy at all is still usable', () => {
  const one = autoResumeStep(anchor(), { lat: 40.0004, lon: -111 });
  assert.equal(autoResumeStep(one.probe, { lat: 40.0004, lon: -111 }).resume, true);
});

test('⛔ A MANUAL PAUSE NEVER AUTO-RESUMES — no probe, no decision', () => {
  // Pressing Pause is a statement. Taking it back for them is worse than not having the feature.
  const step = autoResumeStep(null, FAR);
  assert.equal(step.resume, false);
  assert.equal(step.probe, null);
});
