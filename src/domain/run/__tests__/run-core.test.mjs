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
  const { track, rejected } = acceptFix(seed, pt(40.001, -105, at0 + 5000, 60), 'run');
  assert.equal(rejected, 'accuracy');
  assert.equal(track, seed, 'the same array is returned, unchanged');
  assert.equal(totalMiles(track), 0);
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
  const seed = acceptFix([], pt(40, -105, at0), 'bike').track;
  // 30 mph — absurd running, ordinary cycling.
  const mi = 30 / 3600;
  const { rejected } = acceptFix(seed, pt(40 + mi / MI_PER_DEG_LAT, -105, at0 + 1000), 'bike');
  assert.equal(rejected, null);
  const onFoot = acceptFix(acceptFix([], pt(40, -105, at0), 'run').track, pt(40 + mi / MI_PER_DEG_LAT, -105, at0 + 1000), 'run');
  assert.equal(onFoot.rejected, 'teleport');
});

test('acceptFix: an accumulated track sums to the distance walked', () => {
  const track = buildTrack(21, 0.05, 20); // 20 steps of 0.05 mi
  assert.ok(Math.abs(totalMiles(track) - 1.0) < 0.005, `got ${totalMiles(track)}`);
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
  assert.ok(cur < 400, `window should see the faster finish, got ${cur}`);
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
