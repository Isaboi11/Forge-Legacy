import test from 'node:test';
import assert from 'node:assert/strict';

import { cleanPoseTrack, cleanPoseFrames, MARK_POINT_NAMES, POSE_JOINTS, resolveMarkJoint } from '../pose/joints.ts';
import { pickAthlete, fillGaps, smooth, pickStillAthlete, anchorAt } from '../pose/pose-track.ts';
import { poseKind, findReps, repSignal } from '../pose/pose-reps.ts';
import { analysePose, measureFacts, measureReps, measuredForSave, worstRep } from '../pose/pose-measure.ts';
import { poseFrameChoice, POSE_FRAMES_MAX } from '../pose/pose-frames.ts';
import { snapMarks, skeletonBones, SNAP_REACH } from '../pose/pose-marks.ts';
import { FORM_MARK_JOINTS } from '../form-check.ts';
import { timeline, sideSquatter, frontSquatter, sideDeadlifter, sidePresser, track, person, W, H } from './pose-synth.mjs';

/*
 * BODY POSE ENGINE — `src/domain/coach/pose/`, on synthetic `track()` output (`pose-synth.mjs`).
 * `Docs/Form-Check-Body-Pose-Build-Plan.md` §5 and §8: clean reps, pause reps, half reps, gaps, a second
 * person walking through, a mirror, cut-off legs, a deadlift from the floor, a slow-motion clip.
 *
 * ⚠ These prove the logic. The thresholds are the plan's first guesses and are re-tuned on real Vision
 * output from the PO's clips on build 10 (P3.2).
 */

const SQUAT = 'Squat / Knee Dominant';
const squat = (opts = {}, tlOpts = {}, trackOpts = {}) =>
  track(timeline({ reps: 5, ...tlOpts }), (s) => sideSquatter(s.f, { phase: s.phase, ...(typeof opts === 'function' ? opts(s) : opts) }), trackOpts);

// ── The joints ──────────────────────────────────────────────────────────────

test('the joint order is Vision\'s 19, as the Swift writes them', () => {
  assert.equal(POSE_JOINTS.length, 19);
  assert.deepEqual(POSE_JOINTS.slice(0, 6), ['nose', 'leftEye', 'rightEye', 'leftEar', 'rightEar', 'neck']);
  assert.equal(POSE_JOINTS[12], 'root');
});

test('the mark joints the function accepts are exactly the ones the app can resolve', () => {
  assert.deepEqual([...FORM_MARK_JOINTS].sort(), [...MARK_POINT_NAMES].sort());
});

test('native output is narrowed: malformed people and NaN times are dropped, never trusted', () => {
  const good = new Array(57).fill(0.5);
  const frames = cleanPoseFrames([
    { t: 0, people: [good, [1, 2, 3], good.map((v, i) => (i === 4 ? NaN : v))] },
    { t: NaN, people: [good] },
    { t: 100, people: 'nope' },
    null,
  ]);
  assert.equal(frames.length, 2);
  assert.equal(frames[0].people.length, 1, 'short and NaN-poisoned people are dropped');
  assert.deepEqual(frames[1].people, []);
  assert.equal(cleanPoseTrack({ width: 0, height: 10, frames: [] }), null);
  assert.equal(cleanPoseTrack(null), null);
  const clamped = cleanPoseFrames([{ t: 0, people: [good.map(() => 3)] }]);
  assert.ok(clamped[0].people[0].every((v) => v === 1), 'coordinates are clamped into the frame');
});

test('poseKind reads the catalogue pattern first, then the name', () => {
  assert.equal(poseKind(SQUAT, 'Back Squat'), 'squat');
  assert.equal(poseKind('Hinge / Hip Dominant', 'Romanian Deadlift'), 'hinge');
  assert.equal(poseKind('Horizontal Push', 'Bench Press'), 'bench');
  assert.equal(poseKind('Horizontal Push', 'Push-Up'), 'pushup');
  assert.equal(poseKind('Vertical Push', 'Overhead Press'), 'press');
  assert.equal(poseKind('Vertical Pull', 'Pull-Up'), 'pull');
  assert.equal(poseKind('Elbow Flexion', 'Curl'), 'curl');
  assert.equal(poseKind(null, 'my deadlift'), 'hinge');
  assert.equal(poseKind(null, 'Front Squat'), 'squat');
  assert.equal(poseKind('Carry', 'Farmer Carry'), 'auto');
});

// ── Reps ────────────────────────────────────────────────────────────────────

test('five clean squats from the side: full, five reps, side view, the right side toward the camera', () => {
  const a = analysePose(squat(), SQUAT, 'Back Squat');
  assert.equal(a.level, 'full');
  assert.equal(a.reps.length, 5);
  assert.equal(a.view, 'side');
  assert.equal(a.side, 'right');
  for (const r of a.reps) {
    assert.ok(r.startMs < r.turnMs && r.turnMs < r.midMs && r.midMs < r.endMs);
    assert.ok(r.down > 0.5 && r.down < 1.4, `down ${r.down}`);
    assert.ok(r.up > 0.4 && r.up < 1.2, `up ${r.up}`);
  }
  const f = measureReps(a);
  assert.deepEqual(f.map((x) => x.depth), ['below', 'below', 'below', 'below', 'below']);
  assert.deepEqual(f.map((x) => x.torso), [40, 40, 40, 40, 40]);
  assert.ok(f.every((x) => x.lockoutShort === false));
});

test('depth classes: below, about level, above — from the side only', () => {
  for (const [y, want] of [[0.78, 'below'], [0.735, 'level'], [0.69, 'above']]) {
    const a = analysePose(squat({ bottomHipY: y }), SQUAT, 'Squat');
    assert.equal(a.level, 'full', `depth ${y}`);
    assert.ok(measureReps(a).every((x) => x.depth === want), `${y} → ${want}`);
  }
});

test('shallower, hips-first reps 4-5 are found, and rep 4 is the one worth two frames', () => {
  const a = analysePose(squat((s) => ({ bottomHipY: s.rep >= 3 ? 0.735 : 0.78, hipsFirst: s.rep >= 3 })), SQUAT, 'Squat');
  const f = measureReps(a);
  assert.deepEqual(f.map((x) => x.depth), ['below', 'below', 'below', 'level', 'level']);
  assert.deepEqual(f.map((x) => x.hipsFirst), [false, false, false, true, true]);
  assert.equal(worstRep(f), 3);
});

test('a pause rep: the pause is measured, and it is still one rep', () => {
  const a = analysePose(squat({}, { perRep: (r) => (r === 2 ? { pause: 1.5 } : {}) }), SQUAT, 'Pause Squat');
  assert.equal(a.reps.length, 5);
  const pauses = a.reps.map((r) => r.pause);
  assert.ok(pauses[2] > 1.4 && pauses[2] > pauses[1] + 1, `pauses ${pauses}`);
});

test('half reps and a walk-out never cross the threshold and are not reps', () => {
  // A swing of ~0.15 torso lengths (hips drop 0.03 of the frame) is under the 0.25 rule.
  const a = analysePose(squat({ bottomHipY: 0.57 }), SQUAT, 'Squat');
  assert.equal(a.reps.length, 0);
  assert.equal(a.level, 'marks', 'the athlete is there, so the marks can still snap');
});

test('a single rep is marks-only, not full (plan §8)', () => {
  const a = analysePose(squat({}, { reps: 1 }), SQUAT, 'Squat');
  assert.equal(a.reps.length, 1);
  assert.equal(a.level, 'marks');
});

test('a short gap (< 0.3 s) is bridged; a long one splits the series and loses only that rep', () => {
  const tl = timeline({ reps: 5 });
  const lost = (from, to) => (i, t) => t >= from && t < to;
  // 200 ms in the middle of rep 2's descent.
  const short = analysePose(track(tl, (s) => sideSquatter(s.f), { drop: lost(4400, 4600) }), SQUAT, 'Squat');
  assert.equal(short.reps.length, 5);
  // 1.2 s across rep 3's bottom.
  const long = analysePose(track(tl, (s) => sideSquatter(s.f), { drop: lost(7600, 8800) }), SQUAT, 'Squat');
  assert.equal(long.reps.length, 4);
});

test('fillGaps draws a straight line across a short gap, at the lower confidence', () => {
  const p = (x, c) => { const a = new Array(57).fill(0); a[0] = x; a[1] = x; a[2] = c; return a; };
  const out = fillGaps([0, 100, 200], [p(0.2, 0.9), p(0, 0), p(0.4, 0.6)]);
  assert.ok(Math.abs(out[1][0] - 0.3) < 1e-9);
  assert.equal(out[1][2], 0.6);
  const wide = fillGaps([0, 200, 400], [p(0.2, 0.9), p(0, 0), p(0.4, 0.6)]);
  assert.equal(wide[1][2], 0, 'a 400 ms gap is not bridged');
});

test('smooth never averages across a gap', () => {
  const v = smooth([1, 1, NaN, 5, 5], [0, 70, 140, 210, 280], 200);
  assert.ok(Number.isNaN(v[2]));
  assert.equal(v[1], 1);
  assert.equal(v[3], 5);
});

test('a deadlift from the floor: the first pull counts (edge rep) — three reps, not two', () => {
  const tl = timeline({ reps: 3, startAt: 1, down: 1.0, up: 1.0, pause: 0.3, rest: 0.5 });
  const a = analysePose(track(tl, (s) => sideDeadlifter(s.f)), 'Hinge / Hip Dominant', 'Deadlift');
  assert.equal(a.reps.length, 3);
  assert.equal(a.reps[0].edge, true);
  assert.equal(a.reps[0].down, null);
  assert.equal(a.reps[1].edge, false);
});

test('a press framed from the hips up is readable (no knees needed for an upper-body lift)', () => {
  const tl = timeline({ reps: 4, startAt: 1, down: 1.0, up: 1.0, pause: 0.3, rest: 0.5 });
  const a = analysePose(track(tl, (s) => sidePresser(s.f)), 'Vertical Push', 'Overhead Press');
  assert.equal(a.level, 'full');
  assert.equal(a.reps.length, 4);
  const facts = measureFacts(a, []);
  assert.equal(facts.depth, null, 'no depth fact for a press');
});

test('legs cut off on a SQUAT: the athlete is not readable enough and pose is off (plan §8)', () => {
  const noLegs = (s) => {
    const p = sideSquatter(s.f);
    for (const j of [13, 14, 15, 16, 17, 18]) p[j * 3 + 2] = 0;
    return p;
  };
  const a = analysePose(track(timeline({ reps: 5 }), noLegs), SQUAT, 'Squat');
  assert.equal(a.level, 'off');
});

test('ankles cut off only: still full, depth still measured, lockout (needs the ankle) is not', () => {
  const noAnkles = (s) => {
    const p = sideSquatter(s.f);
    for (const j of [17, 18]) p[j * 3 + 2] = 0;
    return p;
  };
  const a = analysePose(track(timeline({ reps: 5 }), noAnkles), SQUAT, 'Squat');
  assert.equal(a.level, 'full');
  const facts = measureFacts(a, []);
  assert.ok(facts.depth.every((d) => d === 'below'));
  assert.equal(facts.lockoutShort, null);
});

// ── Who is the athlete ─────────────────────────────────────────────────────

test('a smaller person walking through the back of the shot does not swap in', () => {
  const tl = timeline({ reps: 5 });
  const walker = (i, t) => {
    const x = 0.05 + (t / 17000) * 0.5;
    // Smaller (further away) and higher in the frame.
    const p = sideSquatter(0, { x });
    for (let j = 0; j < 19; j += 1) {
      p[j * 3] = p[j * 3] * 0.5 + 0.1;
      p[j * 3 + 1] = p[j * 3 + 1] * 0.5;
    }
    return t > 3000 && t < 12000 ? [p] : [];
  };
  const a = analysePose(track(tl, (s) => sideSquatter(s.f), { extra: walker }), SQUAT, 'Squat');
  assert.equal(a.level, 'full');
  assert.equal(a.reps.length, 5);
});

test('a mirror (a second athlete the same size, all clip long) is AMBIGUOUS → off, never a guess', () => {
  const tl = timeline({ reps: 5 });
  const mirror = (i, t) => [sideSquatter(tl[i].f, { x: 0.42 })];
  const a = analysePose(track(tl, (s) => sideSquatter(s.f, { x: 0.18 }), { extra: mirror }), SQUAT, 'Squat');
  assert.equal(a.level, 'off');
  assert.match(a.reason, /two similar/);
});

test('nobody, or a handful of samples, is off', () => {
  assert.equal(analysePose(null, SQUAT, 'Squat').level, 'off');
  assert.equal(analysePose({ width: W, height: H, nominalFps: 30, frames: [{ t: 0, people: [] }] }, SQUAT, 'Squat').level, 'off');
});

test('pickAthlete measures only the athlete: torso is the athlete\'s, coverage near 1', () => {
  const s = pickAthlete(squat());
  assert.ok(Math.abs(s.torso - 0.2) < 0.02, `torso ${s.torso}`);
  assert.ok(s.coverage > 0.95);
  assert.equal(s.ambiguous, false);
});

// ── Front view facts ───────────────────────────────────────────────────────

test('from the front: knees moving inward on reps 4-5, and no depth (not visible from here)', () => {
  const tl = timeline({ reps: 5 });
  const a = analysePose(track(tl, (s) => frontSquatter(s.f, { kneesIn: s.rep >= 3, phase: s.phase })), SQUAT, 'Squat');
  assert.equal(a.view, 'front');
  const facts = measureFacts(a, []);
  assert.deepEqual(facts.kneesIn, [4, 5]);
  assert.equal(facts.depth, null);
  assert.equal(facts.torso, null);
  assert.deepEqual(facts.shift, []);
});

test('from the front: a hip shift toward the athlete\'s left is named as their left', () => {
  const tl = timeline({ reps: 3 });
  const a = analysePose(track(tl, (s) => frontSquatter(s.f, { shift: 0.04 })), SQUAT, 'Squat');
  const facts = measureFacts(a, []);
  assert.deepEqual(facts.shift, [1, 2, 3]);
  assert.equal(facts.shiftSide, 'left');
});

test('slow motion (> 60 fps file): positions stay, tempo is omitted (plan §9)', () => {
  const a = analysePose(squat({}, {}, { nominalFps: 240 }), SQUAT, 'Squat');
  const facts = measureFacts(a, []);
  assert.equal(facts.tempo, null);
  assert.ok(facts.depth);
});

// ── Frame choice ───────────────────────────────────────────────────────────

test('frames: rep 1 top + bottom, the worst rep\'s bottom + halfway up, the last rep\'s bottom + top, in time order', () => {
  const a = analysePose(squat((s) => ({ bottomHipY: s.rep >= 3 ? 0.735 : 0.78 })), SQUAT, 'Squat');
  const c = poseFrameChoice(a.reps, 3);
  assert.ok(c.times.length >= 6 && c.times.length <= POSE_FRAMES_MAX, `${c.times.length} frames`);
  const has = (rep, at) => c.tags.some((t) => t.rep === rep && t.at === at);
  assert.ok(has(1, 'start') && has(1, 'turn'));
  assert.ok(has(4, 'turn') && has(4, 'mid'));
  assert.ok(has(5, 'turn') && has(5, 'end'));
  assert.deepEqual(c.times, [...c.times].sort((x, y) => x - y));
  assert.equal(poseFrameChoice([], 0), null);
});

test('an edge rep has no "start" frame of its own', () => {
  const tl = timeline({ reps: 3, startAt: 1, down: 1.0, up: 1.0, pause: 0.3, rest: 0.5 });
  const a = analysePose(track(tl, (s) => sideDeadlifter(s.f)), 'Hinge / Hip Dominant', 'Deadlift');
  const c = poseFrameChoice(a.reps, worstRep(measureReps(a)));
  assert.ok(!c.tags.some((t) => t.rep === 1 && t.at === 'start'));
  assert.ok(c.tags.some((t) => t.rep === 1 && t.at === 'turn'));
});

// ── Marks ──────────────────────────────────────────────────────────────────

const still = sideSquatter(1); // at the bottom, 0–1 coordinates
const size = [432, 768];
const knee = resolveMarkJoint(still, 'right_knee');
const mark = (m) => ({ fix: 0, frame: 0, kind: 'dot', x: 0.5, y: 0.5, rep: null, shows: '', ...m });

test('a named joint puts the dot ON it', () => {
  const [m] = snapMarks([mark({ joint: 'right_knee', x: 0.9, y: 0.1 })], [still], [size]);
  assert.equal(m.x, knee.x);
  assert.equal(m.y, knee.y);
});

test('a bare x/y within reach snaps to the nearest joint; one out of reach is left where Holt put it', () => {
  const near = { x: knee.x + 0.02, y: knee.y + 0.01 };
  const [a] = snapMarks([mark(near)], [still], [size]);
  assert.equal(a.x, knee.x);
  assert.equal(a.y, knee.y);
  const far = { x: 0.95, y: 0.05 };
  const [b] = snapMarks([mark(far)], [still], [size]);
  assert.deepEqual([b.x, b.y], [far.x, far.y]);
  assert.ok(SNAP_REACH === 0.12);
});

test('no joints for that frame: the mark is untouched (today\'s behaviour)', () => {
  const m = mark({ x: 0.3, y: 0.4 });
  assert.deepEqual(snapMarks([m], [null], [size]), [m]);
});

test('a depth line near the hips goes to the measured hip height, with a tick at the knee', () => {
  const hip = resolveMarkJoint(still, 'mid_hip');
  const [m] = snapMarks([mark({ kind: 'line', y: hip.y + 0.02 })], [still], [size]);
  assert.ok(Math.abs(m.y - hip.y) < 0.05);
  assert.ok(typeof m.tick === 'number' && Math.abs(m.tick - resolveMarkJoint(still, 'mid_knee').y) < 0.05);
});

test('the skeleton is drawn only between joints that are present', () => {
  const bones = skeletonBones(still);
  assert.ok(bones.length >= 8);
  assert.deepEqual(skeletonBones(null), []);
  assert.deepEqual(skeletonBones(person({ neck: [0.2, 0.3] })), []);
});

test('the athlete in a still is the one nearest where the dense pass saw them', () => {
  const s = pickAthlete(squat());
  const hint = anchorAt(s, 2266);
  const other = sideSquatter(1, { x: 0.5 });
  const frame = { t: 0, people: [other, sideSquatter(1)] };
  assert.equal(pickStillAthlete(frame, hint), frame.people[1]);
  assert.equal(pickStillAthlete({ t: 0, people: [] }, hint), null);
});

// ── What is saved ──────────────────────────────────────────────────────────

test('⛔ what is saved is numbers only — reps, depth, tempo — never joints (PO decision 3)', () => {
  const a = analysePose(squat(), SQUAT, 'Squat');
  const saved = measuredForSave(measureFacts(a, []));
  assert.deepEqual(Object.keys(saved).sort(), ['depth', 'kind', 'reps', 'tempo', 'v', 'view']);
  const flat = JSON.stringify(saved);
  assert.ok(flat.length < 800, 'a handful of numbers');
  assert.ok(!/torso|x"|y"|joint/i.test(flat));
  assert.equal(measuredForSave(null), null);
});

test('repSignal needs a ruler', () => {
  assert.equal(repSignal({ torso: NaN, joints: [], t: [] }, 'squat'), null);
  assert.deepEqual(findReps({ kind: 'squat', values: [], swing: 0.25 }, []), []);
});
