/**
 * BODY POSE — pick the athlete, clean the signal. `Docs/Form-Check-Body-Pose-Build-Plan.md` §5.1 and §8.
 *
 * A gym clip has other people in it: a spotter, somebody walking past, the athlete twice in a mirror.
 * Vision returns everyone. This file decides which one is the athlete, follows them frame to frame, fills
 * short gaps, and puts everything on one ruler (the athlete's torso) so no threshold downstream depends on
 * how far away the phone was.
 *
 * ⚠ AMBIGUITY IS A FALLBACK, NEVER A GUESS. Two people of similar size and centrality for more than a
 * fifth of the clip (the mirror case, plan §11.4) switches pose OFF and the read runs exactly as it did
 * before body tracking existed. A measurement of the wrong person is worse than no measurement.
 *
 * ⚠ ONLY THE ATHLETE IS MEASURED (plan §7). Everyone else is dropped here, before anything is computed.
 *
 * Coordinates in an {@link AthleteSeries} are in LONG-EDGE units (x·w/L, y·h/L with L the longer side), so
 * a distance means the same thing across and down a portrait frame. `anchorAt` turns one back into 0–1.
 */

import { J, POSE_CONFIDENT, POSE_PRESENT, POSE_VALUES, dist, jointAt, midOf, type PoseFrame, type PoseTrack, type Pt } from './joints.ts';

/** Gaps up to this long are bridged by a straight line; longer ones split the series (plan §5.1). */
export const POSE_GAP_MS = 300;

/** The athlete must be readable in at least this share of samples, or pose is off (plan §8). */
export const POSE_COVERAGE_MIN = 0.6;

/** Two similar people in more than this share of samples = ambiguous (plan §5.1). */
export const POSE_AMBIGUOUS_SHARE = 0.2;

/** The athlete, frame by frame, gaps filled, on one ruler. */
export interface AthleteSeries {
  /** Sample times, ms into the clip. */
  t: number[];
  /** The athlete's 57 numbers per sample in long-edge units, or null where they could not be followed. */
  joints: (number[] | null)[];
  /** Median neck-to-root length, long-edge units. The internal ruler — never sent, never stored (§7). */
  torso: number;
  /** Share of samples with a hip, a knee and a shoulder present (plan §8's test, for lifts that use the legs). */
  coverage: number;
  /**
   * Share with a shoulder, an elbow and a wrist present. An upper-body lift filmed from the waist up has
   * no knees in it and is still perfectly readable — partial views narrow the facts, not the read (§8).
   */
  upperCoverage: number;
  /** Two similar-sized, similarly central people for too much of the clip. */
  ambiguous: boolean;
  /** Long-edge scale per axis: 0–1 × this = long-edge units. */
  sx: number;
  sy: number;
  nominalFps: number;
}

interface Candidate {
  person: number[];
  area: number;
  /** Box centre, long-edge units. */
  cx: number;
  cy: number;
  /** Root (or mid-hip, or box centre), long-edge units — what "follow" means. */
  anchor: { x: number; y: number };
}

/** Everyone in a frame, with a box made of their present joints. People with fewer than four are noise. */
function candidates(frame: PoseFrame, sx: number, sy: number): Candidate[] {
  const out: Candidate[] = [];
  for (const person of frame.people) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let n = 0;
    for (let j = 0; j < POSE_VALUES / 3; j += 1) {
      const p = jointAt(person, j);
      if (p.c < POSE_PRESENT) continue;
      n += 1;
      minX = Math.min(minX, p.x * sx);
      maxX = Math.max(maxX, p.x * sx);
      minY = Math.min(minY, p.y * sy);
      maxY = Math.max(maxY, p.y * sy);
    }
    if (n < 4) continue;
    const root = jointAt(person, J.root);
    const hips = midOf(jointAt(person, J.leftHip), jointAt(person, J.rightHip));
    const a = root.c >= POSE_PRESENT ? root : hips;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    out.push({
      person,
      area: (maxX - minX) * (maxY - minY),
      cx,
      cy,
      anchor: a ? { x: a.x * sx, y: a.y * sy } : { x: cx, y: cy },
    });
  }
  return out;
}

const median = (xs: number[]): number => {
  if (!xs.length) return NaN;
  const s = xs.slice().sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * The athlete out of a dense pass, or null when there is nobody to follow.
 *
 * Seeded on the single largest confident box in the clip (the lifter is almost always the biggest person
 * in their own video), then followed forwards and backwards by the nearest anchor, so a passer-by crossing
 * in front does not swap in. A jump bigger than {@link maxJump} is "lost" for that sample rather than a
 * switch to somebody else.
 */
export function pickAthlete(track: PoseTrack): AthleteSeries | null {
  const L = Math.max(track.width, track.height);
  if (!(L > 0) || !track.frames.length) return null;
  const sx = track.width / L;
  const sy = track.height / L;
  const all = track.frames.map((f) => candidates(f, sx, sy));

  let seedF = -1;
  let seedC = -1;
  let best = 0;
  all.forEach((cs, f) =>
    cs.forEach((c, i) => {
      if (c.area > best) {
        best = c.area;
        seedF = f;
        seedC = i;
      }
    }),
  );
  if (seedF < 0) return null;

  const chosen: (Candidate | null)[] = new Array(all.length).fill(null);
  chosen[seedF] = all[seedF][seedC];
  // About half the largest box's side, a good fraction of a body: a real athlete does not move that far between
  // two samples a tenth of a second apart.
  const maxJump = Math.sqrt(best) * 0.5;
  const follow = (from: number, to: number, step: 1 | -1) => {
    let last = chosen[from]!;
    let lastF = from;
    for (let f = from + step; step > 0 ? f <= to : f >= to; f += step) {
      let pick: Candidate | null = null;
      let d = Infinity;
      for (const c of all[f]) {
        const dd = dist(c.anchor, last.anchor);
        if (dd < d) {
          d = dd;
          pick = c;
        }
      }
      // Allowed to drift further the longer they have been lost.
      const allowance = maxJump * Math.max(1, Math.abs(f - lastF) * 0.5);
      if (pick && d <= allowance) {
        chosen[f] = pick;
        last = pick;
        lastF = f;
      }
    }
  };
  follow(seedF, all.length - 1, 1);
  follow(seedF, 0, -1);

  // Ambiguity: somebody else about the athlete's size and about as central, in too many samples.
  let similar = 0;
  all.forEach((cs, f) => {
    const me = chosen[f];
    if (!me) return;
    const myCentral = Math.hypot(me.cx - sx / 2, me.cy - sy / 2);
    for (const c of cs) {
      if (c === me) continue;
      const sizeClose = c.area >= me.area * 0.7 && c.area <= me.area / 0.7;
      const centralClose = Math.abs(Math.hypot(c.cx - sx / 2, c.cy - sy / 2) - myCentral) < 0.15;
      if (sizeClose && centralClose) {
        similar += 1;
        return;
      }
    }
  });

  const t = track.frames.map((f) => f.t);
  const scaled: (number[] | null)[] = chosen.map((c) => {
    if (!c) return null;
    const out = c.person.slice();
    for (let j = 0; j < POSE_VALUES / 3; j += 1) {
      out[j * 3] *= sx;
      out[j * 3 + 1] *= sy;
    }
    return out;
  });
  const joints = fillGaps(t, scaled);

  const torsos: number[] = [];
  let covered = 0;
  let upper = 0;
  for (const p of joints) {
    if (!p) continue;
    const neck = jointAt(p, J.neck);
    const root = jointAt(p, J.root);
    const base = root.c >= POSE_PRESENT ? root : midOf(jointAt(p, J.leftHip), jointAt(p, J.rightHip));
    if (neck.c >= POSE_PRESENT && base) torsos.push(dist(neck, base));
    const any = (a: number, b: number) => jointAt(p, a).c >= POSE_PRESENT || jointAt(p, b).c >= POSE_PRESENT;
    if (any(J.leftHip, J.rightHip) && any(J.leftKnee, J.rightKnee) && any(J.leftShoulder, J.rightShoulder)) covered += 1;
    if (any(J.leftShoulder, J.rightShoulder) && any(J.leftElbow, J.rightElbow) && any(J.leftWrist, J.rightWrist)) upper += 1;
  }

  return {
    t,
    joints,
    torso: median(torsos),
    coverage: joints.length ? covered / joints.length : 0,
    upperCoverage: joints.length ? upper / joints.length : 0,
    ambiguous: all.length > 0 && similar / all.length > POSE_AMBIGUOUS_SHARE,
    sx,
    sy,
    nominalFps: track.nominalFps,
  };
}

/**
 * Short gaps bridged, joint by joint: a joint under {@link POSE_PRESENT} between two present samples no
 * more than {@link POSE_GAP_MS} apart gets the straight line between them, at the lower of their two
 * confidences. Longer gaps stay missing and split the signal downstream.
 */
export function fillGaps(t: number[], series: (number[] | null)[]): (number[] | null)[] {
  const out = series.map((p) => (p ? p.slice() : null));
  const n = out.length;
  for (let j = 0; j < POSE_VALUES / 3; j += 1) {
    let prev = -1;
    for (let i = 0; i < n; i += 1) {
      const p = out[i];
      if (!p || p[j * 3 + 2] < POSE_PRESENT) continue;
      if (prev >= 0 && i - prev > 1 && t[i] - t[prev] <= POSE_GAP_MS) {
        const a = out[prev]!;
        for (let k = prev + 1; k < i; k += 1) {
          const f = (t[k] - t[prev]) / (t[i] - t[prev]);
          const q = out[k] ?? (out[k] = new Array(POSE_VALUES).fill(0));
          q[j * 3] = a[j * 3] + (p[j * 3] - a[j * 3]) * f;
          q[j * 3 + 1] = a[j * 3 + 1] + (p[j * 3 + 1] - a[j * 3 + 1]) * f;
          q[j * 3 + 2] = Math.min(a[j * 3 + 2], p[j * 3 + 2]);
        }
      }
      prev = i;
    }
  }
  return out;
}

/**
 * Centred moving average over about `windowMs` (plan: ~0.2 s), an odd number of samples. Applied to a
 * SIGNAL, never to the joints that are drawn. NaN stays NaN and is not averaged across, so a gap still
 * splits the series.
 */
export function smooth(values: number[], t: number[], windowMs = 200): number[] {
  if (values.length < 3) return values.slice();
  const dt = median(t.slice(1).map((x, i) => x - t[i]).filter((d) => d > 0));
  let k = Number.isFinite(dt) && dt > 0 ? Math.round(windowMs / dt) : 1;
  if (k % 2 === 0) k += 1;
  const half = Math.max(0, (k - 1) / 2);
  return values.map((v, i) => {
    if (!Number.isFinite(v)) return NaN;
    let sum = 0;
    let n = 0;
    for (let d = -half; d <= half; d += 1) {
      const u = values[i + d];
      if (u === undefined) continue;
      // Do not average across a gap.
      if (!Number.isFinite(u)) {
        if (d < 0) {
          sum = 0;
          n = 0;
          continue;
        }
        break;
      }
      sum += u;
      n += 1;
    }
    return n ? sum / n : v;
  });
}

/** A point of the athlete in one sample (long-edge units) when present to `min`; the mid of both sides for pairs. */
export function pointOf(p: number[] | null, a: number, b?: number, min = POSE_PRESENT): Pt | null {
  if (!p) return null;
  const pa = jointAt(p, a);
  if (b === undefined) return pa.c >= min ? pa : null;
  return midOf(pa, jointAt(p, b), min);
}

/** The same, requiring {@link POSE_CONFIDENT} — what facts are made from. */
export const surePointOf = (p: number[] | null, a: number, b?: number): Pt | null => pointOf(p, a, b, POSE_CONFIDENT);

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The stills
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** Where the athlete's anchor was at time `ms` in the dense pass, as 0–1 of the frame, or null. */
export function anchorAt(series: AthleteSeries, ms: number): { x: number; y: number } | null {
  let best = -1;
  let d = Infinity;
  series.t.forEach((t, i) => {
    if (!series.joints[i]) return;
    const dd = Math.abs(t - ms);
    if (dd < d) {
      d = dd;
      best = i;
    }
  });
  if (best < 0 || d > 1000) return null;
  const p = series.joints[best]!;
  const a = pointOf(p, J.root) ?? pointOf(p, J.leftHip, J.rightHip);
  return a ? { x: a.x / series.sx, y: a.y / series.sy } : null;
}

/**
 * The athlete in one still (`detect()` on a JPEG we send), as 0–1 joints, or null.
 *
 * With a hint from the dense pass, the person whose anchor is nearest it (within a quarter of the frame);
 * without one, the largest box. Either way, one person or nobody — a mark is never snapped onto a spotter.
 */
export function pickStillAthlete(frame: PoseFrame | null | undefined, hint: { x: number; y: number } | null): number[] | null {
  if (!frame) return null;
  const cs = candidates(frame, 1, 1);
  if (!cs.length) return null;
  if (hint) {
    let pick: Candidate | null = null;
    let d = Infinity;
    for (const c of cs) {
      const dd = dist(c.anchor, hint);
      if (dd < d) {
        d = dd;
        pick = c;
      }
    }
    return pick && d <= 0.25 ? pick.person : null;
  }
  return cs.reduce((a, b) => (b.area > a.area ? b : a)).person;
}
