import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ACTIVITY,
  acceptFix,
  averagePaceSec,
  clampStep,
  currentPaceSec,
  cueLabel,
  fmtClock,
  fmtPace,
  goalMet,
  goalProgress,
  haversineMi,
  paceCue,
  personalBests,
  routePath,
  speedCue,
  sustainedCue,
  toDistance,
  toPace,
  signalNote,
  totalMiles,
} from '../run-core.ts';

// A degree of latitude is ~69 miles; these helpers build tracks with known distances.
const MI_PER_DEG_LAT = 69.0546;
const at0 = 1_700_000_000_000;
const pt = (lat, lon, at, accuracy = 5) => ({ lat, lon, accuracy, at });

/** Walk north from (40, -105) accumulating `n` fixes each `stepMi` apart, `stepSec` apart in time. */
function buildTrack(n, stepMi, stepSec, kind = 'run') {
  let track = [];
  for (let i = 0; i < n; i++) {
    const res = acceptFix(track, pt(40 + (i * stepMi) / MI_PER_DEG_LAT, -105, at0 + i * stepSec * 1000), kind);
    track = res.track;
  }
  return track;
}

// ── haversine ────────────────────────────────────────────────────────────────
test('haversineMi: a degree of latitude is ~69 miles', () => {
  const d = haversineMi({ lat: 40, lon: -105 }, { lat: 41, lon: -105 });
  assert.ok(Math.abs(d - 69.05) < 0.1, `got ${d}`);
});

test('haversineMi: zero for the same point, and symmetric', () => {
  const a = { lat: 40, lon: -105 };
  const b = { lat: 40.01, lon: -105.01 };
  assert.equal(haversineMi(a, a), 0);
  assert.ok(Math.abs(haversineMi(a, b) - haversineMi(b, a)) < 1e-12);
});

// ── acceptFix: the three rejections ──────────────────────────────────────────
test('acceptFix: the first fix starts the track at zero miles', () => {
  const { track, rejected } = acceptFix([], pt(40, -105, at0), 'run');
  assert.equal(rejected, null);
  assert.equal(track.length, 1);
  assert.equal(track[0].mi, 0);
});

test('acceptFix: a low-accuracy fix is rejected and does not move the track', () => {
  const seed = acceptFix([], pt(40, -105, at0), 'run').track;
  const { track, rejected } = acceptFix(seed, pt(40.001, -105, at0 + 5000, 140), 'run');
  assert.equal(rejected, 'accuracy');
  assert.equal(track, seed, 'the same array is returned, unchanged');
  assert.equal(totalMiles(track), 0);
});

/*
 * The floor moved 25 m → 65 m, and these two lock why.
 *
 * 25 m was chosen for a phone under open sky. It is WRONG for a browser geolocating off wi-fi, which
 * routinely reports 30–80 m — so on the web preview every single fix was rejected and the distance sat
 * at 0.00 while the athlete walked, with nothing on screen to say why. The replacement defence is that
 * movement must clear the device's own error bars, which is a claim these tests have to hold to.
 */
/** Walk `n` steps of 0.02 mi, one fix every 20 s, all at the given accuracy. */
function walkAt(accuracy, n) {
  let track = [];
  for (let i = 0; i <= n; i++) {
    track = acceptFix(track, pt(40 + (i * 0.02) / MI_PER_DEG_LAT, -105, at0 + i * 20_000, accuracy), 'run').track;
  }
  return totalMiles(track);
}

/*
 * ⚠ THIS USED TO BE TWO POINTS, and two points is no longer a fair question to ask.
 *
 * `acceptFix` smooths, so it deliberately trails the newest measurement — most of all on a wide fix,
 * where it has least reason to believe any single reading. That trailing is a FIXED distance, paid once:
 * the estimate settles a constant way behind and then tracks. So the right test is not a tolerance on one
 * length, it is that the SAME deficit shows up whatever the distance — a lag, not a rate error. If it
 * ever became proportional, the filter would be losing a percentage of every run and this would catch it.
 *
 * (Tuning note: `DRIFT_MPS` trades this lag against noise. Raising it 3 → 8 recovers 0.44 → 0.48 here and
 * costs a measured 3.01-mile run at ±10 m going 3.05 → 3.27, with standing-still drift 0.021 → 0.161 mi.
 * The lag is the cheaper error, so it stays.)
 */
test('acceptFix: an ordinary browser fix (±45 m) is USABLE, not thrown away', () => {
  const half = walkAt(45, 25); // 0.5 mi
  assert.ok(half > 0.42, `a run on ±45 m fixes must still produce distance, got ${half}`);

  const threeMi = walkAt(45, 150); // 3.0 mi, identical conditions
  const shortfallHalf = 0.5 - half;
  const shortfallLong = 3.0 - threeMi;
  assert.ok(
    Math.abs(shortfallLong - shortfallHalf) < 0.02,
    `the deficit must be a fixed lag, not a rate: ${shortfallHalf.toFixed(3)} over half a mile vs ${shortfallLong.toFixed(3)} over three`,
  );
});

test('acceptFix: on a poor signal, movement smaller than the error bars still counts as noise', () => {
  const seed = acceptFix([], pt(40, -105, at0, 60), 'run').track;
  // ~11 m apart. Real at ±5 m; indistinguishable from drift at ±60 m, so it must NOT be credited.
  const { track, rejected } = acceptFix(seed, pt(40.0001, -105, at0 + 8000, 60), 'run');
  assert.equal(rejected, 'jitter');
  assert.equal(totalMiles(track), 0, 'a wide fix must not manufacture distance from its own uncertainty');
});

/*
 * The gate DEFERS a step, it does not discard one.
 *
 * This is the half of the rule that is easy to get wrong and easy to test wrong. A step under the gate
 * credits nothing — but the anchor does not move either, so the ground is still there to be claimed by
 * the next fix. Distance is measured anchor-to-here, never fix-to-fix, and that is the whole reason a
 * 1 Hz stream stopped being able to lose (or invent) miles.
 */
test('acceptFix: a step under the gate is not lost — the next fix claims the ground', () => {
  let track = acceptFix([], pt(40, -105, at0, 6), 'run').track;
  // ~11 m at ±6 m: real movement, but inside the 10 m floor once smoothed.
  const first = acceptFix(track, pt(40.0001, -105, at0 + 8000, 6), 'run');
  assert.equal(first.rejected, 'jitter');
  assert.equal(totalMiles(first.track), 0);
  // Keep walking the same line. The anchor never moved, so the distance arrives intact.
  track = first.track;
  for (let i = 2; i <= 6; i++) {
    track = acceptFix(track, pt(40 + i * 0.0001, -105, at0 + i * 8000, 6), 'run').track;
  }
  // Six steps of ~11 m is ~66 m = 0.041 mi.
  assert.ok(totalMiles(track) > 0.03, `the deferred metres must still arrive, got ${totalMiles(track)}`);
});

test('acceptFix: standing-still drift is rejected as jitter, so a traffic light adds no distance', () => {
  let track = acceptFix([], pt(40, -105, at0), 'run').track;
  // Ten fixes wandering under a metre each — the classic parked-phone signature.
  for (let i = 1; i <= 10; i++) {
    const res = acceptFix(track, pt(40 + 0.000005 * (i % 2), -105, at0 + i * 3000), 'run');
    assert.equal(res.rejected, 'jitter');
    track = res.track;
  }
  assert.equal(totalMiles(track), 0);
});

test('acceptFix: a teleport re-anchors the position but credits no distance', () => {
  const seed = acceptFix([], pt(40, -105, at0), 'run').track;
  // Half a mile in one second — a recovered signal, not a journey.
  const { track, rejected } = acceptFix(seed, pt(40.00724, -105, at0 + 1000), 'run');
  assert.equal(rejected, 'teleport');
  assert.equal(track.length, 2, 'the new position is kept');
  assert.equal(totalMiles(track), 0, 'but the jump is not distance');
});

test('acceptFix: what a teleport re-anchors to becomes the base for the next real step', () => {
  let track = acceptFix([], pt(40, -105, at0), 'run').track;
  track = acceptFix(track, pt(40.00724, -105, at0 + 1000), 'run').track; // teleport, mi stays 0
  // A normal step from the NEW position, 10 minutes later.
  track = acceptFix(track, pt(40.00724 + 0.01 / MI_PER_DEG_LAT, -105, at0 + 601_000), 'run').track;
  assert.ok(Math.abs(totalMiles(track) - 0.01) < 0.0005, `got ${totalMiles(track)}`);
});

test('acceptFix: a bike tolerates a speed that would be a teleport on foot', () => {
  // 30 mph — absurd running, ordinary cycling. Measured over TEN SECONDS rather than one: the speed
  // test now judges the smoothed step across the anchor's baseline, so a one-second fixture no longer
  // clears the movement gate and both activities would read `jitter` without ever reaching the question.
  const mi = (30 * 10) / 3600; // 30 mph for 10 s
  const step = (kind) =>
    acceptFix(acceptFix([], pt(40, -105, at0), kind).track, pt(40 + mi / MI_PER_DEG_LAT, -105, at0 + 10_000), kind).rejected;
  assert.equal(step('bike'), null, '30 mph is a bicycle going downhill');
  assert.equal(step('run'), 'teleport', 'and nobody runs it');
});

test('acceptFix: an accumulated track sums to the distance walked', () => {
  const track = buildTrack(21, 0.05, 20); // 20 steps of 0.05 mi
  /*
   * ⚠ THE TOLERANCE WIDENED FROM 0.005 TO 0.01, and the reason is inherent rather than sloppy.
   *
   * A smoothing filter always trails the newest measurement by a fraction of one step — that lag IS the
   * smoothing. Here it costs ~9 m out of a mile (0.6%), it does not accumulate, and it is the price of
   * not counting the several metres a second that a parked phone wanders. A tighter bound would only be
   * satisfiable by trusting every raw fix, which is what reported 0.0 mi on a real three-mile run.
   */
  assert.ok(Math.abs(totalMiles(track) - 1.0) < 0.01, `got ${totalMiles(track)}`);
});

// ── ⚠ THE RUN THAT REPORTED 0.0 MILES ────────────────────────────────────────
//
// PO, on a real 3.01-mile run measured against a watch: *"It didn't track any of his miles or log them."*
// Forge said 0.0 mi over 34:37 — and drew a route while saying it, which is the tell: the fixes were
// arriving and being kept as POSITIONS while every one of them was refused as DISTANCE.
//
// The old rule judged each fix against the one a second before it. GPS noise alone moves a stationary
// phone 5–10 m between consecutive fixes, which reads as 11–22 mph — past the 20 mph "teleport" ceiling —
// so on a poor signal nearly every fix was classed as a jump and credited nothing.
//
// These replay that run against a noisy fix stream at each accuracy an iPhone actually reports. The old
// pipeline scored 3.76 / 2.33 / 1.56 / 0.86 / 0.10 mi down this range. There is no unit test that could
// have caught it, because every test in this file fed it CLEAN coordinates.

/** A run of `miles` at `mps`, one fix a second, each displaced by gaussian noise scaled to `accM`. */
function noisyRun(miles, mps, accM, seedN = 42) {
  let s = seedN;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd());
  const M_PER_DEG_LAT = 111_320;
  let track = [];
  for (let t = 0; t <= (miles * 1609.344) / mps; t++) {
    track = acceptFix(track, {
      lat: 40 + (t * mps + gauss() * accM * 0.5) / M_PER_DEG_LAT,
      lon: -105 + (gauss() * accM * 0.5) / (M_PER_DEG_LAT * Math.cos(rad40)),
      accuracy: accM,
      at: at0 + t * 1000,
    }, 'run').track;
  }
  return track;
}
const rad40 = (40 * Math.PI) / 180;

test('⚠ acceptFix: the PO’s 3.01-mile run measures 3.01, at every accuracy a phone reports', () => {
  for (const acc of [3, 5, 8, 10, 12, 16, 20, 30, 40, 50, 65]) {
    const mi = totalMiles(noisyRun(3.01, 2.596, acc)); // 10:20/mi
    assert.ok(
      Math.abs(mi - 3.01) < 0.25,
      `±${acc} m: got ${mi.toFixed(2)} mi for a 3.01-mile run (this range used to read 3.76 down to 0.10)`,
    );
  }
});

test('⚠ acceptFix: a phone standing still for ten minutes travels nowhere', () => {
  // The same defect pointing the other way: drift that happened to clear the old jitter floor was
  // credited in full, so a parked phone at ±10 m accumulated 1.23 miles in ten minutes.
  let s = 7;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd());
  let track = [];
  for (let t = 0; t < 600; t++) {
    track = acceptFix(track, {
      lat: 40 + (gauss() * 5) / 111_320,
      lon: -105 + (gauss() * 5) / (111_320 * Math.cos(rad40)),
      accuracy: 10,
      at: at0 + t * 1000,
    }, 'run').track;
  }
  assert.ok(totalMiles(track) < 0.05, `a parked phone reported ${totalMiles(track).toFixed(3)} mi (was 1.227)`);
});

// ── ⚠ THE FIX THAT ARRIVES TWICE ─────────────────────────────────────────────
//
// A run has two location streams — the foreground watcher and the background task — and on iOS the task
// keeps delivering while the app is on screen. So the durable buffer accumulates fixes the foreground has
// already folded in, and draining it replays them. Replayed, they are older than the head, and
// `Math.max(1e-9, …)` on a negative interval turned each one into an implied speed of millions of miles
// an hour: a teleport, which re-anchored the track to where the athlete had been minutes before.

test('⚠ acceptFix: a replayed fix is refused as stale rather than counted twice', () => {
  const track = buildTrack(11, 0.05, 20); // 0.5 mi
  const before = totalMiles(track);
  const head = track[track.length - 1];

  // Exactly the head's own timestamp, and one from the middle of the run: both already spent.
  assert.equal(acceptFix(track, pt(head.lat, head.lon, head.at), 'run').rejected, 'stale');
  const old = acceptFix(track, pt(40, -105, at0 + 3 * 20_000), 'run');
  assert.equal(old.rejected, 'stale');
  assert.equal(old.track, track, 'a stale fix leaves the array untouched');
  assert.equal(totalMiles(old.track), before);
});

test('⚠ acceptFix: draining a buffer that overlaps the foreground does not double the distance', () => {
  // Sixty seconds watched, then the screen locks; the buffer holds the WHOLE run including that minute.
  const fixes = [];
  for (let i = 0; i <= 90; i++) fixes.push(pt(40 + (i * 0.01) / MI_PER_DEG_LAT, -105, at0 + i * 20_000));

  let track = [];
  for (const f of fixes.slice(0, 30)) track = acceptFix(track, f, 'run').track;
  let stale = 0;
  for (const f of fixes) {
    const r = acceptFix(track, f, 'run');
    if (r.rejected === 'stale') stale++;
    track = r.track;
  }
  assert.equal(stale, 30, 'every already-spent fix should be recognised');
  assert.ok(Math.abs(totalMiles(track) - 0.9) < 0.02, `0.9 mi walked, got ${totalMiles(track)}`);
});

test('acceptFix: the track does not grow a point per fix', () => {
  // The provisional head is REPLACED, not appended to. Without that a half-hour run holds ~1,800 points,
  // every one of them re-rendered into an SVG path string on every tick of the clock.
  const track = noisyRun(3.01, 2.596, 10);
  assert.ok(track.length < 900, `1,866 fixes should not be 1,866 points, got ${track.length}`);
  assert.ok(track.length > 100, `but the route still needs its shape, got ${track.length}`);
});

// ── pace ─────────────────────────────────────────────────────────────────────
test('averagePaceSec: null under a tenth of nothing, real once there is distance', () => {
  assert.equal(averagePaceSec(0.01, 60), null, 'too short to divide by honestly');
  assert.equal(averagePaceSec(1, 480), 480);
});

test('currentPaceSec: reads the trailing window, not the whole session', () => {
  // 10 minutes at 8:00/mi (0.05 mi per 24s), then 5 fixes at 6:00/mi.
  let track = buildTrack(26, 0.05, 24); // 8:00/mi
  let t = track[track.length - 1].at;
  let mi = 0.05;
  for (let i = 0; i < 5; i++) {
    t += 18_000; // 0.05 mi per 18s = 6:00/mi
    const lastLat = track[track.length - 1].lat;
    track = acceptFix(track, pt(lastLat + mi / MI_PER_DEG_LAT, -105, t), 'run').track;
  }
  const cur = currentPaceSec(track, 30);
  const avg = averagePaceSec(totalMiles(track), (t - at0) / 1000);
  /*
   * ⚠ ASSERTED AS A COMPARISON, not against a bare number. This read `cur < 400`, which was really a
   * claim about how closely the track reproduces its input — and a smoothed track trails it slightly, so
   * a 6:00/mi finish reads a little over 400 and the test failed while measuring exactly what it should.
   * What the window has to prove is that it sees the FINISH and the average does not; that is a
   * relationship between the two numbers, and it holds regardless of the filter's lag.
   */
  assert.ok(cur < avg - 50, `window should see the faster finish: window ${cur}, average ${avg}`);
  assert.ok(avg > 400, `average should still be dragged by the slow start, got ${avg}`);
});

test('currentPaceSec: null while the window holds too little to be meaningful', () => {
  assert.equal(currentPaceSec([]), null);
  assert.equal(currentPaceSec(buildTrack(2, 0.001, 2)), null);
});

// ── the cue, and its hysteresis ──────────────────────────────────────────────
test('paceCue: on target, ahead, and behind', () => {
  assert.equal(paceCue(480, 480, null), 'on');
  assert.equal(paceCue(400, 480, null), 'ahead', 'fewer seconds per mile is faster');
  assert.equal(paceCue(560, 480, null), 'behind');
  assert.equal(paceCue(null, 480, 'on'), null);
});

test('paceCue: hysteresis — it is harder to lose "on pace" than to earn it', () => {
  // 28s off: outside the 20s entry band, inside the 35s exit band.
  assert.equal(paceCue(508, 480, null), 'behind', 'not close enough to claim on-pace');
  assert.equal(paceCue(508, 480, 'on'), 'on', 'but close enough to keep it');
});

test('paceCue: the on-pace band is wider than GPS noise, or the cue is useless', () => {
  // 7:40–8:20 against an 8:00 target is what a coach means by "on pace".
  assert.equal(paceCue(460, 480, null), 'on');
  assert.equal(paceCue(500, 480, null), 'on');
  assert.equal(paceCue(440, 480, null), 'ahead', 'but 7:20 is genuinely faster');
});

test('paceCue: a run sitting on the boundary does not flicker', () => {
  // The exact failure the design had: the label changed roughly every two seconds.
  let cue = null;
  const samples = [486, 474, 487, 473, 488, 472];
  const seen = new Set();
  for (const s of samples) {
    cue = paceCue(s, 480, cue);
    seen.add(cue);
  }
  assert.deepEqual([...seen], ['on'], 'it should never have left "on pace"');
});

test('sustainedCue: a steadily-held target reads on-pace', () => {
  // 0.05 mi every 24s = 8:00/mi, held for four minutes.
  const track = buildTrack(11, 0.05, 24);
  assert.equal(sustainedCue(track, 480, false), 'on');
});

test('sustainedCue: a sustained slowdown does turn the cue', () => {
  // Four minutes at 8:00/mi, then two at ~12:00/mi — long enough that both windows see it.
  let track = buildTrack(11, 0.05, 24);
  let t = track[track.length - 1].at;
  for (let i = 0; i < 8; i++) {
    t += 36_000; // 0.05 mi per 36s = 12:00/mi
    const lastLat = track[track.length - 1].lat;
    track = acceptFix(track, pt(lastLat + 0.05 / MI_PER_DEG_LAT, -105, t), 'run').track;
  }
  assert.equal(sustainedCue(track, 480, false), 'behind');
});

test('sustainedCue: a brief surge the long window has not seen does NOT flip the label', () => {
  // Realistic fix density — `distanceInterval: 3` metres means a fix every few seconds, not every 24.
  // Three minutes at 8:00/mi (0.00625 mi per 3s), then six seconds quick. That surge is a fortieth of
  // the long window, which is exactly the case that used to flicker.
  let track = buildTrack(61, 0.00625, 3);
  let t = track[track.length - 1].at;
  for (let i = 0; i < 2; i++) {
    t += 2000; // 0.00625 mi per 2s ≈ 5:20/mi, briefly
    const lastLat = track[track.length - 1].lat;
    track = acceptFix(track, pt(lastLat + 0.00625 / MI_PER_DEG_LAT, -105, t), 'run').track;
  }
  assert.equal(sustainedCue(track, 480, false), 'on', 'a six-second surge is not a change of pace');
});

test('sustainedCue: null before there is enough track to judge', () => {
  assert.equal(sustainedCue([], 480, false), null);
  // One point is a position, not a pace.
  assert.equal(sustainedCue(buildTrack(1, 0.05, 24), 480, false), null);
});

test('sustainedCue: is pure — the same track always gives the same answer', () => {
  const track = buildTrack(11, 0.05, 24);
  const a = sustainedCue(track, 480, false);
  const b = sustainedCue(track, 480, false);
  const c = sustainedCue(track, 480, false);
  assert.equal(a, b);
  assert.equal(b, c);
});

test('speedCue: higher speed is AHEAD, the inverse of pace', () => {
  assert.equal(speedCue(18, 17, null), 'ahead');
  assert.equal(speedCue(15, 17, null), 'behind');
  assert.equal(speedCue(17.3, 17, null), 'on');
});

test('cueLabel: a ride speaks speed, a run speaks pace', () => {
  assert.equal(cueLabel('on', false), 'On pace');
  assert.equal(cueLabel('on', true), 'On target speed');
  assert.equal(cueLabel('ahead', true), 'Above target speed');
  assert.equal(cueLabel(null, false), '');
});

// ── formatting ───────────────────────────────────────────────────────────────
test('fmtPace: floors seconds so a pace never renders as ":60"', () => {
  assert.equal(fmtPace(495), '8:15');
  assert.equal(fmtPace(479.99), '7:59');
  assert.equal(fmtPace(null), '--:--');
  assert.equal(fmtPace(0), '--:--');
});

test('fmtClock: hides the hour under one, never hides it over', () => {
  assert.equal(fmtClock(0), '0:00');
  assert.equal(fmtClock(64), '1:04');
  assert.equal(fmtClock(3600), '1:00:00');
  assert.equal(fmtClock(3725), '1:02:05');
});

test('unit conversion: metric distance and pace move in opposite directions', () => {
  assert.ok(Math.abs(toDistance(1, 'metric') - 1.609344) < 1e-9, 'a mile is more kilometres');
  assert.equal(toDistance(1, 'imperial'), 1);
  assert.ok(toPace(480, 'metric') < 480, 'but a per-km pace is a SMALLER number than per-mile');
});

// ── goal progress ────────────────────────────────────────────────────────────
test('goalProgress: fills toward a target and clamps at one', () => {
  assert.equal(goalProgress(0, 5), 0);
  assert.equal(goalProgress(2.5, 5), 0.5);
  assert.equal(goalProgress(7, 5), 1, 'overshooting does not overflow the ring');
});

test('goalProgress: an open session cycles once per mile', () => {
  assert.ok(Math.abs(goalProgress(0.25, null) - 0.25) < 1e-9);
  assert.ok(Math.abs(goalProgress(3.25, null) - 0.25) < 1e-9, 'the fourth mile looks like the first');
});

test('goalMet: only a distance goal can be met', () => {
  assert.equal(goalMet(5, 5), true);
  assert.equal(goalMet(4.9, 5), false);
  assert.equal(goalMet(99, null), false);
});

// ── the route ────────────────────────────────────────────────────────────────
test('routePath: empty track draws nothing rather than a fake line', () => {
  const r = routePath([], 120, 84);
  assert.equal(r.d, '');
  assert.equal(r.head, null);
});

test('routePath: the head is the LATEST point, not the first', () => {
  const track = buildTrack(10, 0.05, 20);
  const r = routePath(track, 120, 84);
  assert.ok(r.head && r.start);
  assert.notDeepEqual(r.head, r.start, 'the marker must ride the line, not sit at its start');
});

test('routePath: fits inside the box with padding', () => {
  const track = buildTrack(12, 0.05, 20);
  const r = routePath(track, 120, 84, 10);
  const nums = r.d.match(/-?\d+(\.\d+)?/g).map(Number);
  const xs = nums.filter((_, i) => i % 2 === 0);
  const ys = nums.filter((_, i) => i % 2 === 1);
  assert.ok(Math.min(...xs) >= -0.01 && Math.max(...xs) <= 120.01, 'x within the box');
  assert.ok(Math.min(...ys) >= -0.01 && Math.max(...ys) <= 84.01, 'y within the box');
});

test('routePath: north is up — running north moves the head UP the box', () => {
  const track = buildTrack(10, 0.05, 20); // heading north
  const r = routePath(track, 120, 84);
  assert.ok(r.head.y < r.start.y, `head y ${r.head.y} should be above start y ${r.start.y}`);
});

// ── personal bests ───────────────────────────────────────────────────────────
test('personalBests: a first-ever session claims nothing', () => {
  assert.deepEqual(personalBests(5, 2400, [], 'run', 'imperial'), []);
});

test('personalBests: a token distance never earns a record', () => {
  const priors = [{ distanceMi: 3, durationSec: 1800 }];
  assert.deepEqual(personalBests(0.02, 10, priors, 'run', 'imperial'), []);
});

test('personalBests: an OPEN session can earn one — the design gated this behind a distance goal', () => {
  const priors = [{ distanceMi: 3, durationSec: 1800 }];
  const out = personalBests(4, 2400, priors, 'run', 'imperial');
  assert.ok(out.some((p) => p.kind === 'distance'), 'four miles beats a three-mile best regardless of goal');
});

test('personalBests: the margin is computed, not asserted', () => {
  const priors = [{ distanceMi: 3, durationSec: 1800 }]; // 10:00/mi
  const out = personalBests(3, 1620, priors, 'run', 'imperial'); // 9:00/mi
  const pace = out.find((p) => p.kind === 'pace');
  assert.ok(pace, 'a faster pace at the same distance is a best');
  assert.match(pace.detail, /60 sec faster/, `got: ${pace.detail}`);
});

test('personalBests: a short fast interval does not make every long run look slow', () => {
  // A blistering half-mile in the history must not become the bar for a 5-mile run.
  const priors = [
    { distanceMi: 0.5, durationSec: 150 }, // 5:00/mi
    { distanceMi: 5, durationSec: 2700 }, // 9:00/mi
  ];
  const out = personalBests(5, 2640, priors, 'run', 'imperial'); // 8:48/mi
  assert.ok(out.some((p) => p.kind === 'pace'), 'it beats the comparable 5-mile effort');
});

test('personalBests: no claim when nothing was beaten', () => {
  const priors = [{ distanceMi: 10, durationSec: 4800 }];
  assert.deepEqual(personalBests(3, 1800, priors, 'run', 'imperial'), []);
});

// ── config ───────────────────────────────────────────────────────────────────
test('ACTIVITY: a ride speaks speed, a run and a walk speak pace', () => {
  assert.equal(ACTIVITY.bike.speed, true);
  assert.equal(ACTIVITY.run.speed, false);
  assert.equal(ACTIVITY.walk.speed, false);
});

test('ACTIVITY: the run ceiling is the marathon', () => {
  assert.equal(ACTIVITY.run.maxMi, 26.2);
});

test('clampStep: holds bounds and kills float drift', () => {
  assert.equal(clampStep(5 + 0.30000000000000004, 1, 26.2), 5.3);
  assert.equal(clampStep(0.4, 1, 26.2), 1);
  assert.equal(clampStep(99, 1, 26.2), 26.2);
});

// ── the signal note ──────────────────────────────────────────────────────────
//
// The bug this locks was SILENCE. A walk around the block reported 0.00 and neither run surface said
// why — one showed "Finding you…" only while the track was empty, the other showed nothing at all.
// The state that actually needed words is "we have a fix and it is not good enough to move you".
test('signalNote: a weak signal says so, with the number that makes it weak', () => {
  const n = signalNote(false, true, 48);
  assert.match(n, /Weak signal/);
  assert.match(n, /48 m/, 'the athlete should be able to see what the device is claiming');
});

test('signalNote: never returns an empty string in any state', () => {
  const states = [
    [false, true, null], [false, true, 40],
    [false, false, null], [false, false, 9],
    [true, false, 12], [true, true, null],
  ];
  for (const [paused, weak, acc] of states) {
    const n = signalNote(paused, weak, acc);
    assert.ok(n.length > 0, `silent in state ${JSON.stringify([paused, weak, acc])}`);
  }
});

test('signalNote: paused outranks everything — the clock stopping is the headline', () => {
  assert.match(signalNote(true, true, 90), /Paused/);
});

test('signalNote: an AUTO pause is named differently, because it ends by itself', () => {
  const auto = signalNote('auto', true, 90);
  assert.match(auto, /Auto-paused/);
  // The athlete must not be left waiting to press something.
  assert.match(auto, /starts again/);
  assert.notEqual(auto, signalNote(true, true, 90));
});

test('signalNote: the old boolean shape still means what it always meant', () => {
  assert.match(signalNote(true, true, 90), /^Paused/);
  assert.doesNotMatch(signalNote(false, false, 10), /Paused/);
});

test('signalNote: a good fix reports its accuracy rather than claiming precision', () => {
  assert.equal(signalNote(false, false, 6), 'Tracking · ±6 m');
  assert.equal(signalNote(false, false, null), 'Tracking');
});

/*
 * The unmeasured run.
 *
 * Pressing Start used to await a permission request and refuse the run on anything short of a grant —
 * and on the web that was the NORMAL path, because `requestForegroundPermissionsAsync` reports the
 * current state there rather than raising the browser prompt. A first-time athlete is in "prompt",
 * which is not "granted", so the run was refused before the browser had been asked. The card offered
 * "Enter it myself" and nothing else: no clock, no way to end anything.
 *
 * The run now starts regardless and the clock is the measurement. These lock the words for that.
 */
test('signalNote: a refused permission describes the RUN, not the radio', () => {
  const n = signalNote(false, true, null, 'denied');
  assert.match(n, /Timing only/);
  assert.doesNotMatch(n, /satellites|Weak/, 'nothing is being looked for — that search is over');
});

test('signalNote: no provider still leaves a run in progress, not an error', () => {
  const n = signalNote(false, true, null, 'unavailable');
  assert.match(n, /timing only/i);
  assert.match(n, /distance/i, 'it must say where the distance is going to come from');
});

test('signalNote: paused still outranks a dead signal', () => {
  assert.match(signalNote(true, true, null, 'denied'), /Paused/);
});

test('signalNote: an unmeasured run is never described as broken', () => {
  for (const g of ['denied', 'unavailable']) {
    const n = signalNote(false, true, null, g);
    assert.doesNotMatch(n, /error|failed|can.t track|unable/i, `"${n}" reads as a failure`);
  }
});
