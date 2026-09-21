import test from 'node:test';
import assert from 'node:assert/strict';

import { acceptFix } from '../run-core.ts';
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
  assert.equal(shouldAutoPause(live(trackAt(6, 30, 20), { deviceSpeedMps: 0 })), true);
});

test('⛔ NO FIXES ARRIVING IS NOT STILLNESS — a tunnel must never pause the run', () => {
  // A frozen track looks identical whether the athlete stopped or the device went quiet. Only one of
  // those is a pause, and guessing wrong stops the clock on someone who is still running.
  assert.equal(shouldAutoPause(live(trackAt(6, 30, 20), { receivingFixes: false })), false);
});

test('the opening seconds are exempt — Start is pressed standing still', () => {
  const standing = live(trackAt(6, 30, 20), { elapsedSec: AUTO_PAUSE_GRACE_SEC - 1, deviceSpeedMps: 0 });
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

/* ── the gate-stepped track (the PO's walk, 2026-09-21) ────────────────────── */

/**
 * A walk folded through the REAL `acceptFix`, one fix a second, with seeded GPS scatter. The synthetic
 * `trackAt` above grows smoothly; a real track grows in 10–25 m steps, and that is what paused walkers.
 */
const realWalk = (mph, accM, seconds = 300) => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5);
  const t0 = NOW - seconds * 1000;
  let track = [];
  const ticks = [];
  for (let s = 0; s < seconds; s++) {
    const north = s * mph * 0.44704 + rnd() * accM * 0.6;
    const fix = { lat: 40 + north / 111320, lon: -111 + (rnd() * accM * 0.6) / 85390, accuracy: accM, at: t0 + s * 1000, alt: null, altAccuracy: null };
    track = acceptFix(track, fix, 'walk').track;
    ticks.push({ track, nowMs: fix.at + 500, elapsedSec: s, receivingFixes: true });
  }
  return ticks;
};

test('⛔ REGRESSION: the old 10 s track window DID pause a real walk — the premise of the fix', () => {
  // Proves the fixture reproduces the bug, so the two tests below are evidence and not a tautology.
  const paused = realWalk(3, 35).filter((t) => windowSpeedMph(t.track, t.nowMs) < 0.8 && t.elapsedSec >= AUTO_PAUSE_GRACE_SEC);
  assert.ok(paused.length > 20, `expected the old rule to misfire, got ${paused.length}`);
});

test('⛔ a 3 mph walk under ±35 m sky is never paused when the device reports no speed', () => {
  assert.equal(realWalk(3, 35).filter((t) => shouldAutoPause(t)).length, 0);
});

test('⛔ a 2.2 mph stroll is never paused', () => {
  assert.equal(realWalk(2.2, 15).filter((t) => shouldAutoPause(t)).length, 0);
  assert.equal(realWalk(2.2, 35).filter((t) => shouldAutoPause(t)).length, 0);
});

test('⛔ the device saying they are moving overrules a stalled track', () => {
  // The track reads a dead stop; the phone's Doppler speed reads a walk. The walk wins.
  assert.equal(shouldAutoPause(live(trackAt(6, 30, 20), { deviceSpeedMps: 1.2 })), false);
});

test('a device reading a stop pauses on the short window', () => {
  assert.equal(shouldAutoPause(live(trackAt(6, 30, 12), { deviceSpeedMps: 0.1 })), true);
});

test('with no device speed the track is read over the long window — a 12 s stall is not yet a stop', () => {
  assert.equal(shouldAutoPause(live(trackAt(6, 60, 12))), false);
  assert.equal(shouldAutoPause(live(trackAt(6, 60, 31))), true);
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

test('⛔ a device speed of a walk resumes even when every position is too sloppy to judge', () => {
  // ±50 m sky: position can prove nothing, so without speed a walker stayed paused while walking.
  const walking = { lat: 40.00001, lon: -111, accuracy: 50, speed: 1.3 };
  const one = autoResumeStep(anchor(), walking);
  assert.equal(one.resume, false);
  assert.equal(autoResumeStep(one.probe, walking).resume, true);
});

test('a device speed of standing still does not resume', () => {
  let step = { probe: anchor(), resume: false };
  for (let i = 0; i < 20; i++) step = autoResumeStep(step.probe, { ...NEAR, speed: 0.2 });
  assert.equal(step.resume, false);
});

test('⛔ A MANUAL PAUSE NEVER AUTO-RESUMES — no probe, no decision', () => {
  // Pressing Pause is a statement. Taking it back for them is worse than not having the feature.
  const step = autoResumeStep(null, FAR);
  assert.equal(step.resume, false);
  assert.equal(step.probe, null);
});
