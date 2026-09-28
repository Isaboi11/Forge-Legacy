/*
 * SYNTHETIC BODY-POSE CLIPS for the pose tests — what `ForgeBodyPose.track()` would return for a clean
 * set, built from a stick figure so every expected number is known.
 *
 * ⚠ SYNTHETIC ≠ REAL (`feedback_test_fixtures_must_be_real_input`). These prove the LOGIC (which rep is
 * which, what a gap does, who the athlete is). The thresholds are re-tuned on real Vision output from the
 * PO's clips on build 10 (plan P3.2) — a green run here says nothing about those numbers.
 *
 * Frame: 1080 x 1920 portrait. Positions are built in long-edge units (x·w/L, y·h/L) and converted to the
 * 0–1 the native module sends.
 */

export const W = 1080;
export const H = 1920;
const SX = W / H; // long-edge scale across
const SY = 1;

const ORDER = [
  'nose', 'leftEye', 'rightEye', 'leftEar', 'rightEar', 'neck', 'leftShoulder', 'rightShoulder', 'leftElbow', 'rightElbow',
  'leftWrist', 'rightWrist', 'root', 'leftHip', 'rightHip', 'leftKnee', 'rightKnee', 'leftAnkle', 'rightAnkle',
];

/** A person from `{ joint: [X, Y, c] }` in long-edge units; unnamed joints are missing. */
export function person(pts) {
  const out = [];
  for (const name of ORDER) {
    const p = pts[name];
    if (!p) out.push(0, 0, 0);
    else out.push(Math.min(1, Math.max(0, p[0] / SX)), Math.min(1, Math.max(0, p[1] / SY)), p[2] ?? 0.9);
  }
  return out;
}

const ease = (u) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, u)))) / 2;

/**
 * A timeline of `f` (0 = rest, 1 = the working extreme) sampled at `fps`. Each rep: down, pause, up, rest.
 * `lead` seconds at rest before the first rep, `tail` after the last. `startAt: 1` opens AT the extreme
 * (a deadlift from the floor): the first rep then begins with its up.
 */
export function timeline({ reps = 5, down = 1.2, pause = 0.2, up = 1.0, rest = 0.6, lead = 1, tail = 1, fps = 15, startAt = 0, perRep = () => ({}) }) {
  const seg = [];
  if (startAt === 1) seg.push({ f0: 1, f1: 1, s: lead, rep: 0 });
  else seg.push({ f0: 0, f1: 0, s: lead, rep: -1 });
  for (let r = 0; r < reps; r += 1) {
    const o = { down, pause, up, rest, ...perRep(r) };
    if (!(startAt === 1 && r === 0)) seg.push({ f0: 0, f1: 1, s: o.down, rep: r, phase: 'down' });
    seg.push({ f0: 1, f1: 1, s: o.pause, rep: r, phase: 'pause' });
    seg.push({ f0: 1, f1: 0, s: o.up, rep: r, phase: 'up' });
    // A deadlift's next "down" is the bar going back to the floor, pushed at the top of the next rep.
    seg.push({ f0: 0, f1: 0, s: o.rest, rep: r, phase: 'rest' });
  }
  if (startAt === 1) seg.push({ f0: 0, f1: 1, s: 1, rep: reps - 1, phase: 'set-down' });
  seg.push({ f0: startAt === 1 ? 1 : 0, f1: startAt === 1 ? 1 : 0, s: tail, rep: reps, phase: 'tail' });

  const total = seg.reduce((a, s) => a + s.s, 0);
  const out = [];
  for (let t = 0; t <= total * 1000; t += 1000 / fps) {
    let acc = 0;
    for (const s of seg) {
      if (t / 1000 <= acc + s.s || s === seg[seg.length - 1]) {
        const u = s.s > 0 ? (t / 1000 - acc) / s.s : 1;
        out.push({ t, f: s.f0 + (s.f1 - s.f0) * ease(u), rep: s.rep, phase: s.phase ?? null });
        break;
      }
      acc += s.s;
    }
  }
  return out;
}

/**
 * A squatter from the SIDE, facing +x, athlete's RIGHT side toward the camera (right joints surer).
 * `bottomHipY` sets depth: knee sits at ~0.73 at the bottom, so 0.78 is below, 0.735 level, 0.69 above.
 * `hipsFirst` makes the hips rise ahead of the shoulders on the way up.
 */
export function sideSquatter(f, { bottomHipY = 0.78, lean = 40, x = 0.3, hipsFirst = false, phase = null, far = 0.45 } = {}) {
  const early = hipsFirst && phase === 'up';
  // On a hips-first rep the hips rise faster (f²) and the shoulders slower (√f) out of the bottom.
  const fh = early ? f * f : f;
  const fs = early ? Math.sqrt(f) : f;
  const hip = [x - 0.08 * fh, 0.54 + fh * (bottomHipY - 0.54)];
  const hipN = [x - 0.08 * fs, 0.54 + fs * (bottomHipY - 0.54)];
  const th = (lean * fs * Math.PI) / 180;
  const neck = [hipN[0] + 0.2 * Math.sin(th), hipN[1] - 0.2 * Math.cos(th)];
  const knee = [x + 0.05 * f, 0.72 + 0.01 * f];
  const ankle = [x, 0.9];
  const sh = [neck[0], neck[1] + 0.02];
  const n = (p, c = 0.9) => [p[0], p[1], c];
  return person({
    nose: [neck[0] + 0.03, neck[1] - 0.05, 0.8],
    rightEye: [neck[0] + 0.035, neck[1] - 0.06, 0.8],
    rightEar: [neck[0] + 0.01, neck[1] - 0.055, 0.8],
    neck: n(neck),
    rightShoulder: n(sh),
    leftShoulder: n(sh, far),
    rightElbow: n([sh[0] - 0.03, sh[1] + 0.06]),
    leftElbow: n([sh[0] - 0.03, sh[1] + 0.06], far),
    rightWrist: n([sh[0], sh[1] + 0.01]),
    leftWrist: n([sh[0], sh[1] + 0.01], far),
    root: n(hip),
    rightHip: n(hip),
    leftHip: n(hip, far),
    rightKnee: n(knee),
    leftKnee: n(knee, far),
    rightAnkle: n(ankle),
    leftAnkle: n(ankle, far),
  });
}

/**
 * A squatter from the FRONT. Athlete's left is image right (+x). `kneesIn` narrows the knees on the way up.
 * `shift` moves the hips toward the athlete's left (+x) at the bottom.
 */
export function frontSquatter(f, { bottomHipY = 0.78, x = 0.3, kneesIn = false, phase = null, shift = 0 } = {}) {
  const hipY = 0.54 + f * (bottomHipY - 0.54);
  const cx = x + shift * f;
  const kneeHalf = kneesIn && phase === 'up' ? 0.05 - 0.03 * f : 0.05 + 0.02 * f;
  const neckY = hipY - 0.2;
  return person({
    nose: [x, neckY - 0.05, 0.9],
    leftEye: [x + 0.015, neckY - 0.06, 0.9],
    rightEye: [x - 0.015, neckY - 0.06, 0.9],
    neck: [x, neckY],
    leftShoulder: [x + 0.08, neckY + 0.02],
    rightShoulder: [x - 0.08, neckY + 0.02],
    leftElbow: [x + 0.11, neckY + 0.06],
    rightElbow: [x - 0.11, neckY + 0.06],
    leftWrist: [x + 0.09, neckY + 0.02],
    rightWrist: [x - 0.09, neckY + 0.02],
    root: [cx, hipY],
    leftHip: [cx + 0.05, hipY],
    rightHip: [cx - 0.05, hipY],
    leftKnee: [x + kneeHalf, 0.72 + 0.01 * f],
    rightKnee: [x - kneeHalf, 0.72 + 0.01 * f],
    leftAnkle: [x + 0.06, 0.9],
    rightAnkle: [x - 0.06, 0.9],
  });
}

/** A deadlifter from the side: wrists at the floor (0.80) when f = 1, at the hips (0.55) when f = 0. */
export function sideDeadlifter(f, { x = 0.3 } = {}) {
  const hip = [x - 0.06 * f, 0.54 + 0.1 * f];
  const th = (70 * f * Math.PI) / 180;
  const neck = [hip[0] + 0.2 * Math.sin(th), hip[1] - 0.2 * Math.cos(th)];
  const wrist = [x + 0.02, 0.55 + 0.25 * f];
  return person({
    nose: [neck[0] + 0.03, neck[1] - 0.04],
    neck,
    rightShoulder: [neck[0], neck[1] + 0.02],
    leftShoulder: [neck[0], neck[1] + 0.02, 0.45],
    rightElbow: [(neck[0] + wrist[0]) / 2, (neck[1] + wrist[1]) / 2],
    rightWrist: wrist,
    leftWrist: [wrist[0], wrist[1], 0.45],
    root: hip,
    rightHip: hip,
    rightKnee: [x + 0.03 * f, 0.72],
    rightAnkle: [x, 0.9],
  });
}

/** An overhead presser from the side, framed from the hips up (no knees, no ankles). Rack 0.36 → lockout 0.12. */
export function sidePresser(f, { x = 0.3 } = {}) {
  const wristY = 0.12 + 0.24 * f;
  return person({
    nose: [x + 0.03, 0.29],
    neck: [x, 0.34],
    rightShoulder: [x, 0.36],
    leftShoulder: [x, 0.36, 0.45],
    rightElbow: [x + 0.02 + 0.03 * f, 0.36 - 0.12 * (1 - f) + 0.04 * f],
    rightWrist: [x + 0.01, wristY],
    leftWrist: [x + 0.01, wristY, 0.45],
    root: [x, 0.54],
    rightHip: [x, 0.54],
  });
}

/** A `track()` result from a timeline and a figure. `extra(i, t)` may add more people to a frame. */
export function track(tl, figure, { nominalFps = 30, extra = () => [], drop = () => false } = {}) {
  return {
    width: W,
    height: H,
    nominalFps,
    frames: tl.map((s, i) => ({ t: s.t, people: drop(i, s.t) ? [...extra(i, s.t)] : [figure(s), ...extra(i, s.t)] })),
  };
}
