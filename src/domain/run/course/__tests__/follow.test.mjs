/**
 * follow.test.mjs — the course follower against a runner on a street grid.
 *
 * The loop (metres east, north of HOME):
 *
 *        (200,500)━━━━Pine━━━━(400,500)
 *            ┃ Elm                 ┃
 *   (0,300)━━┛ Oak                 ┃ 5th Ave
 *      ┃ Main                      ┃
 *   HOME━━━━━━━━━━━Center━━━━━━(400,0)
 *
 * 1,800 m, five turns. Every scenario the plan names (§13) is here: a clean noisy run, GPS jitter at
 * 35 m that must NOT alert, a real 60 m wrong turn that must alert and clear, a shortcut that rejoins
 * beyond the window, bad-accuracy fixes, an out-and-back and a figure-8 that must never jump legs.
 *
 * ⚠ Synthetic. The numbers these tests prove are the numbers they were tuned on; a real recorded track
 * has to replay through this before the thresholds are trusted (§6, §14).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { courseProgress, initialFollow, prepareFollow, replayFollow, stepFollow } from '../follow.ts';
import { mergeCues, stepsToCues } from '../cues.ts';
import { outAndBack } from '../out-and-back.ts';
import { fromXY, planeAt, prepareCourse } from '../geometry.ts';
import { CUE_LEAD_M, CUE_LEAD_WALK_M, OFF_COURSE_M } from '../constants.ts';
import { HOME, T0, legs, runAlong, shifted } from './fixtures.mjs';

const PLANE = planeAt(HOME);
const at = (x, y) => fromXY(PLANE, x, y);
const path = (...xy) => xy.map(([x, y]) => at(x, y));

const LOOP = path([0, 0], [0, 300], [200, 300], [200, 500], [400, 500], [400, 0], [0, 0]);
const STEPS = [
  { type: 11, name: 'Main Street', distance: 300, way_points: [0, 1] },
  { type: 1, name: 'Oak Street', distance: 200, way_points: [1, 2] },
  { type: 0, name: 'Elm Street', distance: 200, way_points: [2, 3] },
  { type: 1, name: 'Pine Street', distance: 200, way_points: [3, 4] },
  { type: 1, name: '5th Avenue', distance: 500, way_points: [4, 5] },
  { type: 1, name: 'Center Street', distance: 400, way_points: [5, 6] },
  { type: 10, name: '-', distance: 0, way_points: [6, 6] },
];
const CUES = mergeCues(stepsToCues(STEPS, prepareCourse(LOOP).cumM));
const COURSE = prepareFollow(LOOP, CUES);

/** Replay, recording progress after every fix. */
function trace(course, fixes, activity = 'run') {
  let state = initialFollow();
  const rows = [];
  const events = [];
  for (const f of fixes) {
    const r = stepFollow(course, state, f, activity);
    state = r.state;
    rows.push({ f, progressM: state.progressM, offCourse: state.offCourse });
    for (const e of r.events) events.push({ ...e, at: f.at });
  }
  return { state, rows, events };
}

const ofType = (events, type) => events.filter((e) => e.type === type);

test('fixture sanity: 1,800 m loop, five cues where the corners are', () => {
  assert.ok(Math.abs(COURSE.geom.lengthM - 1800) < 0.5);
  assert.deepEqual(CUES.map((c) => c.atM), [300, 500, 700, 900, 1400]);
});

test('a clean run with GPS noise: progress tracks the truth, every cue once and ~50 m early, no alerts', () => {
  const fixes = runAlong(LOOP, { speed: 3, noiseM: 5, seed: 11 });
  const { rows, events } = trace(COURSE, fixes);

  for (const r of rows) assert.ok(Math.abs(r.progressM - r.f.trueM) < 20, `progress ${r.progressM} vs true ${r.f.trueM}`);
  assert.equal(ofType(events, 'off-course').length, 0);

  const cues = ofType(events, 'cue');
  assert.deepEqual(cues.map((c) => c.index), [0, 1, 2, 3, 4]);
  for (const c of cues) assert.ok(c.aheadM > CUE_LEAD_M - 15 && c.aheadM <= CUE_LEAD_M, `cue ${c.index} fired ${c.aheadM} m ahead`);

  const done = ofType(events, 'complete');
  assert.equal(done.length, 1, 'course complete exactly once — not at the start, where the loop also ends');
  assert.ok(done[0].at > fixes.at(-1).at - 30_000, 'and only near the end');
});

test('walking cues come 25 m early, not 50', () => {
  const fixes = runAlong(LOOP, { speed: 1.4, noiseM: 0, seed: 3 });
  const cues = ofType(trace(COURSE, fixes, 'walk').events, 'cue');
  assert.equal(cues.length, 5);
  for (const c of cues) assert.ok(c.aheadM > CUE_LEAD_WALK_M - 2 && c.aheadM <= CUE_LEAD_WALK_M, `${c.aheadM}`);
});

test('GPS jitter at 35 m does not alert: a sustained 35 m bias, and isolated 50 m spikes', () => {
  // An urban-canyon bias: every fix on 5th Ave pulled 35 m east — inside the 25–40 m dead band.
  const biased = runAlong(LOOP, { noiseM: 1, seed: 5 }).map((f) =>
    f.trueM > 950 && f.trueM < 1350 ? { ...f, ...at(435, (1400 - f.trueM)) } : f,
  );
  const a = trace(COURSE, biased);
  assert.equal(ofType(a.events, 'off-course').length, 0);
  assert.ok(a.rows.every((r) => !r.offCourse));

  // Spikes of 70 m to the north-east (~50 m off any street here), never three in a row: two on, one off, all the way round.
  const spiky = runAlong(LOOP, { noiseM: 3, seed: 6 }).map((f, i) =>
    i % 3 === 0 ? f : shifted(f, 45, 70),
  );
  const b = trace(COURSE, spiky);
  assert.equal(ofType(b.events, 'off-course').length, 0);
});

test('a wrong turn of 120 m and back: one alert soon after 40 m, one "back on", and the next cue still speaks', () => {
  // Miss the right onto Pine at (200,500): carry on north up Elm 120 m, realise, come back, carry on.
  const detour = path([0, 0], [0, 300], [200, 300], [200, 500], [200, 620], [200, 500], [400, 500], [400, 0], [0, 0]);
  const fixes = runAlong(detour, { speed: 3, noiseM: 4, seed: 21 });
  const { events, rows } = trace(COURSE, fixes);

  const off = ofType(events, 'off-course');
  const back = ofType(events, 'back-on-course');
  assert.equal(off.length, 1);
  assert.equal(back.length, 1);
  assert.ok(off[0].distM > OFF_COURSE_M);
  assert.ok(back[0].at > off[0].at);

  // Alert latency: from the first fix truly beyond 40 m (trueM on the detour path 740) to the alert.
  const crossedAt = fixes.find((f) => f.trueM >= 740).at;
  assert.ok(off[0].at - crossedAt <= 15_000, `alert ${(off[0].at - crossedAt) / 1000} s after leaving`);

  // Progress held at the corner the whole time they were away — it never ran on without them.
  for (const r of rows) if (r.f.trueM > 700 && r.f.trueM < 940) assert.ok(r.progressM < 740, `${r.progressM}`);

  // The right onto 5th Ave and the right onto Center still fire, once each.
  assert.deepEqual(ofType(events, 'cue').map((c) => c.index), [0, 1, 2, 3, 4]);
  assert.equal(ofType(events, 'complete').length, 1);
});

test('a shortcut through the park rejoins beyond the window: rejoin, stale cue silent, next cue speaks', () => {
  // At (200,500) cut diagonally to 5th Ave at (400,200) — along 1,200, past the +400 m window.
  const cut = path([0, 0], [0, 300], [200, 300], [200, 500], [400, 200], [400, 0], [0, 0]);
  const fixes = runAlong(cut, { speed: 3, noiseM: 3, seed: 31 });
  const { events, rows, state } = trace(COURSE, fixes);

  assert.equal(ofType(events, 'off-course').length, 1);
  assert.equal(ofType(events, 'back-on-course').length, 1);
  // The right onto 5th Ave (index 3) was never reached on course, so it is never spoken late.
  assert.deepEqual(ofType(events, 'cue').map((c) => c.index), [0, 1, 2, 4]);
  // After the rejoin, progress is on 5th Ave south of (400,200), not back at Pine.
  const late = rows.filter((r) => r.f.trueM > 1090 && r.f.trueM < 1200);
  assert.ok(late.length > 0 && late.every((r) => r.progressM > 1200), `${late.map((r) => Math.round(r.progressM))}`);
  assert.ok(state.complete);
});

test('bad accuracy: a >65 m fix is rejected outright; 30–65 m fixes cannot raise an alert', () => {
  const on = runAlong(LOOP, { noiseM: 0, seed: 2 }).slice(0, 40); // up Main St to y=117
  let state = replayFollow(COURSE, on, 'run').state;
  const t = on.at(-1).at;

  // The tracker's floor: 80 m accuracy, 500 m away — not a position at all.
  const wild = stepFollow(COURSE, state, { ...at(500, 100), accuracy: 80, at: t + 1000 }, 'run');
  assert.equal(wild.rejected, 'accuracy');
  assert.equal(wild.state, state);

  // Five vague fixes (±45 m) 70 m off: counted neither way.
  const vague = [1, 2, 3, 4, 5].map((i) => ({ ...at(70, 117 + i * 3), accuracy: 45, at: t + i * 1000 }));
  const v = replayFollow(COURSE, vague, 'run', state);
  assert.equal(v.events.length, 0);
  assert.equal(v.state.offCourse, false);
  assert.equal(v.state.farStreak, 0);

  // The same three fixes at ±20 m are believed.
  const sharp = [6, 7, 8].map((i) => ({ ...at(70, 117 + i * 3), accuracy: 20, at: t + i * 1000 }));
  state = replayFollow(COURSE, sharp, 'run', v.state).state;
  assert.equal(state.offCourse, true);

  // Out-of-order fixes are ignored.
  assert.equal(stepFollow(COURSE, state, { ...at(0, 140), accuracy: 5, at: t }, 'run').rejected, 'stale');
});

test('one off-course alert per 60 s across the run, and a held-back spell is announced when the gap passes', () => {
  const fixes = [];
  let sec = 0;
  const put = (x, n) => {
    for (let i = 0; i < n; i++, sec++) fixes.push({ ...at(x, 10 + sec * 2), accuracy: 5, at: T0 + sec * 1000 });
  };
  put(0, 5); // on Main St
  put(60, 4); // off → alert
  put(0, 3); // back on
  put(60, 60); // off again straight away, and stays off
  const { events } = replayFollow(COURSE, fixes, 'run');
  const offs = ofType(events, 'off-course');
  assert.equal(offs.length, 2);
  assert.ok(offs[1].at - offs[0].at >= 60_000, `${(offs[1].at - offs[0].at) / 1000} s between alerts`);
  assert.equal(ofType(events, 'back-on-course').length, 1);
});

test('out-and-back: the outbound and return legs are one street, and progress never jumps between them', () => {
  const loop = legs(HOME, [['N', 400], ['E', 400], ['S', 400], ['W', 400]]);
  const steps = [
    { type: 11, name: 'Main Street', distance: 400, way_points: [0, 1] },
    { type: 1, name: 'Oak Street', distance: 400, way_points: [1, 2] },
    { type: 1, name: 'Pine Street', distance: 400, way_points: [2, 3] },
    { type: 1, name: 'Center Street', distance: 400, way_points: [3, 4] },
  ];
  const ob = outAndBack({ points: loop, cues: stepsToCues(steps, prepareCourse(loop).cumM) }, 1500);
  const course = prepareFollow(ob.points, ob.cues);
  const fixes = runAlong(ob.points, { speed: 3, noiseM: 6, seed: 41 });
  const { rows, events } = trace(course, fixes);

  // A wrong-leg jump would be hundreds of metres. Within 40 m of the turn the two legs are the same
  // spot, so along-course there is honestly ambiguous by up to twice that distance.
  for (const r of rows) {
    const nearTurn = Math.abs(r.f.trueM - ob.turnM) < 40;
    const err = Math.abs(r.progressM - r.f.trueM);
    assert.ok(err < (nearTurn ? 60 : 25), `progress ${r.progressM} vs true ${r.f.trueM}`);
  }
  assert.equal(ofType(events, 'off-course').length, 0);
  assert.deepEqual(ofType(events, 'cue').map((c) => c.cue.kind), ['right', 'turn-around', 'left']);
  assert.equal(ofType(events, 'complete').length, 1);
});

test('figure-8: the crossing is inside the window on the first pass, and the tie still goes to the right leg', () => {
  // Crosses itself at (0,100): along 100 northbound, along 500 westbound — exactly +400 m apart.
  const eight = path([0, 0], [0, 200], [100, 200], [100, 100], [-100, 100], [-100, 0], [0, 0]);
  const course = prepareFollow(eight, []);
  assert.ok(Math.abs(course.geom.lengthM - 800) < 0.5);
  for (const seed of [51, 52, 53]) {
    const { rows } = trace(course, runAlong(eight, { speed: 3, noiseM: 5, seed }));
    // Corner-cutting noise can put progress ~30 m out; the wrong leg would put it ~400 m out.
    for (const r of rows) assert.ok(Math.abs(r.progressM - r.f.trueM) < 35, `seed ${seed}: ${r.progressM} vs ${r.f.trueM}`);
  }
});

test('replay is deterministic, and a batch split (the background task) equals one pass', () => {
  const fixes = runAlong(LOOP, { noiseM: 5, seed: 61 });
  const once = replayFollow(COURSE, fixes, 'run');
  const again = replayFollow(COURSE, fixes, 'run');
  assert.deepEqual(again, once);
  const half = Math.floor(fixes.length / 2);
  const a = replayFollow(COURSE, fixes.slice(0, half), 'run');
  const b = replayFollow(COURSE, fixes.slice(half), 'run', a.state);
  assert.deepEqual(b.state, once.state);
  assert.deepEqual([...a.events, ...b.events], once.events);
});

test('course progress: the "course 62%" fraction and the next-turn strip', () => {
  const fixes = runAlong(LOOP, { noiseM: 0, seed: 7 }).filter((f) => f.trueM <= 800);
  const { state } = replayFollow(COURSE, fixes, 'run');
  const p = courseProgress(COURSE, state);
  assert.ok(Math.abs(p.fraction - 800 / 1800) < 0.01);
  assert.ok(Math.abs(p.remainingM - 1000) < 5);
  assert.equal(p.nextCue.street, '5th Avenue');
  assert.ok(Math.abs(p.nextCueInM - 100) < 5);
});
