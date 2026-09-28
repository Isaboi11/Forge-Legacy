/**
 * BODY POSE — which signal to watch for a lift, and where its reps are. Plan §5.2.
 *
 * ══ ONE SHAPE FOR EVERY LIFT ══
 *
 * Each lift is reduced to one number per sample, oriented so the REST position (standing, arms long, the
 * hang) is LOW and the working extreme (the bottom of a squat, the bar at the chest, chin over the bar) is
 * HIGH. A rep is then always rest → extreme → rest: `start`, `turn`, `end`. The words the athlete and Holt
 * see ("bottom", "top", "hang") come from the kind, in `pose-facts.ts`.
 *
 * ══ THE RULES (plan §5.2) ══
 *
 *   · Extrema with hysteresis: a swing counts only when it is at least 0.25 torso lengths (30° for an angle).
 *   · A rep lasts 0.4–8 s. Extrema closer than 0.35 s are jitter and are dropped as a pair.
 *   · Phases: DOWN starts when the signal leaves the rest by 10% of that rep's range; PAUSE is the time
 *     within 5% of the extreme; UP ends back within 10% of the rest.
 *   · A half rep or a walk-out that never crosses the threshold is not a rep.
 *
 * ⚠ A DEADLIFT AND A PRESS START AT THE EXTREME. The bar begins on the floor or in the rack, so the clip
 * opens on the working end of the first rep. For those two kinds only, a clip that opens at the extreme
 * gets a leading EDGE rep (turn → end, no down phase); without it a three-rep deadlift counts two.
 */

import { J, angleAt, dist, type PoseJoint } from './joints.ts';
import { pointOf, smooth, type AthleteSeries } from './pose-track.ts';

export type PoseKind = 'squat' | 'hinge' | 'bench' | 'pushup' | 'press' | 'pull' | 'row' | 'curl' | 'extension' | 'auto';

/** Minimum swing for a rep: torso lengths for a distance signal, degrees for an angle. */
export const REP_SWING_TORSO = 0.25;
export const REP_SWING_DEG = 30;
export const REP_MIN_MS = 400;
export const REP_MAX_MS = 8000;
export const REP_MERGE_MS = 350;

/**
 * The kind of lift, from the catalogue's `movementPattern` (the exercise's own record), else from its
 * name, else `auto`. Push-ups are told apart from the bench by name — both are "Horizontal Push".
 */
export function poseKind(pattern: string | null | undefined, name: string | null | undefined): PoseKind {
  const n = (name ?? '').toLowerCase();
  switch (pattern) {
    case 'Squat / Knee Dominant':
      return 'squat';
    case 'Hinge / Hip Dominant':
      return 'hinge';
    case 'Horizontal Push':
      return /push[- ]?up|press[- ]?up/.test(n) ? 'pushup' : 'bench';
    case 'Vertical Push':
      return 'press';
    case 'Vertical Pull':
      return 'pull';
    case 'Horizontal Pull':
      return 'row';
    case 'Elbow Flexion':
      return 'curl';
    case 'Elbow Extension':
      return 'extension';
  }
  if (/squat|lunge|split squat|step[- ]?up|leg press/.test(n)) return 'squat';
  if (/deadlift|rdl|good morning|hinge|hip thrust|swing/.test(n)) return 'hinge';
  if (/push[- ]?up|press[- ]?up/.test(n)) return 'pushup';
  if (/bench/.test(n)) return 'bench';
  if (/overhead|ohp|military|shoulder press|press/.test(n)) return 'press';
  if (/pull[- ]?up|chin[- ]?up|pulldown/.test(n)) return 'pull';
  if (/row/.test(n)) return 'row';
  if (/curl/.test(n)) return 'curl';
  if (/extension|pushdown|skull/.test(n)) return 'extension';
  return 'auto';
}

/** Whether a kind's clip starts at the working extreme (the floor, the rack). See the header. */
export const startsAtExtreme = (kind: PoseKind): boolean => kind === 'hinge' || kind === 'press';

/** Elbow angle, the better-seen side. */
function elbowAngle(p: number[] | null): number {
  const l = angleAt(pointOf(p, J.leftShoulder), pointOf(p, J.leftElbow), pointOf(p, J.leftWrist));
  const r = angleAt(pointOf(p, J.rightShoulder), pointOf(p, J.rightElbow), pointOf(p, J.rightWrist));
  if (Number.isFinite(l) && Number.isFinite(r)) return (l + r) / 2;
  return Number.isFinite(l) ? l : r;
}

const yOf = (p: number[] | null, a: PoseJoint, b: PoseJoint): number => pointOf(p, J[a], J[b])?.y ?? NaN;

interface SignalSpec {
  /** One number per sample, rest LOW. */
  at: (p: number[] | null, torso: number) => number;
  /** Degrees, not torso lengths — decides the swing threshold. */
  angle: boolean;
}

const SPECS: Record<Exclude<PoseKind, 'auto'>, SignalSpec> = {
  squat: { at: (p, u) => yOf(p, 'leftHip', 'rightHip') / u, angle: false },
  hinge: { at: (p, u) => yOf(p, 'leftWrist', 'rightWrist') / u, angle: false },
  bench: { at: (p, u) => yOf(p, 'leftWrist', 'rightWrist') / u, angle: false },
  pushup: { at: (p, u) => yOf(p, 'leftShoulder', 'rightShoulder') / u, angle: false },
  press: { at: (p, u) => yOf(p, 'leftWrist', 'rightWrist') / u, angle: false },
  // Hanging: neck far below the wrists (rest, low). Chin over the bar: the gap closes (high).
  pull: { at: (p, u) => (yOf(p, 'leftWrist', 'rightWrist') - yOf(p, 'neck', 'neck')) / u, angle: false },
  // Arms long: wrist far from the shoulder (rest). Pulled in: close.
  row: {
    at: (p, u) => {
      const w = pointOf(p, J.leftWrist, J.rightWrist);
      const s = pointOf(p, J.leftShoulder, J.rightShoulder);
      return w && s ? -dist(w, s) / u : NaN;
    },
    angle: false,
  },
  curl: { at: (p) => -elbowAngle(p), angle: true },
  extension: { at: (p) => elbowAngle(p), angle: true },
};

export interface RepSignal {
  kind: PoseKind;
  /** Smoothed, rest low; NaN where the athlete is missing. */
  values: number[];
  /** The minimum swing for this signal. */
  swing: number;
}

/** A robust swing: 90th minus 10th percentile of the finite values. */
function spread(values: number[]): number {
  const s = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (s.length < 5) return 0;
  return s[Math.floor(s.length * 0.9)] - s[Math.floor(s.length * 0.1)];
}

/**
 * The signal for a kind, smoothed. For `auto`, the candidate with the biggest repeated swing relative to
 * its own threshold — hips, wrists, shoulders, then elbow angle — and the kind stays `auto` so the facts
 * stay limited to reps and tempo.
 */
export function repSignal(series: AthleteSeries, kind: PoseKind): RepSignal | null {
  const u = series.torso;
  if (!(u > 0)) return null;
  const build = (spec: SignalSpec) => smooth(series.joints.map((p) => spec.at(p, u)), series.t);
  if (kind !== 'auto') {
    const spec = SPECS[kind];
    return { kind, values: build(spec), swing: spec.angle ? REP_SWING_DEG : REP_SWING_TORSO };
  }
  let best: RepSignal | null = null;
  let score = 0;
  for (const k of ['squat', 'hinge', 'pushup', 'curl'] as const) {
    const spec = SPECS[k];
    const values = build(spec);
    const swing = spec.angle ? REP_SWING_DEG : REP_SWING_TORSO;
    const sc = spread(values) / swing;
    if (sc > score) {
      score = sc;
      best = { kind: 'auto', values, swing };
    }
  }
  return best;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Reps
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

export interface Rep {
  /** Sample indices into the series. `start === turn` for an edge rep. */
  start: number;
  turn: number;
  end: number;
  /** Times, ms into the clip. */
  startMs: number;
  turnMs: number;
  endMs: number;
  /** Halfway back from the extreme (the concentric of a squat), ms. */
  midMs: number;
  /** Seconds. `down` and `pause` are null on an edge rep (the clip opened at the extreme). */
  down: number | null;
  pause: number | null;
  up: number;
  /** The clip opened at the extreme: a deadlift from the floor, a press from the rack. */
  edge: boolean;
}

type Ext = { i: number; hi: boolean };

/** Hysteresis zigzag on one finite run of samples. Alternating extrema, the last one pending. */
function zigzag(v: number[], from: number, to: number, h: number): Ext[] {
  const out: Ext[] = [];
  let lo = from;
  let hi = from;
  let dir = 0;
  for (let i = from; i <= to; i += 1) {
    const x = v[i];
    if (dir !== -1 && x > v[hi]) hi = i;
    if (dir !== 1 && x < v[lo]) lo = i;
    if (dir === 0) {
      if (v[hi] - v[lo] >= h) {
        if (hi > lo) {
          out.push({ i: lo, hi: false });
          dir = 1;
        } else {
          out.push({ i: hi, hi: true });
          dir = -1;
          lo = i;
        }
      }
    } else if (dir === 1) {
      if (v[hi] - x >= h) {
        out.push({ i: hi, hi: true });
        dir = -1;
        lo = i;
      }
    } else if (v[i] - v[lo] >= h) {
      out.push({ i: lo, hi: false });
      dir = 1;
      hi = i;
    }
  }
  if (dir === 1) out.push({ i: hi, hi: true });
  else if (dir === -1) out.push({ i: lo, hi: false });
  return out;
}

/**
 * Phase timing inside one rep (plan §5.2), and where the rep really starts and ends: the extrema either
 * side of a rep sit anywhere in the rest between reps (a flat stretch has no single lowest point), so the
 * rep is cut to where it LEAVES the rest and where it gets BACK to it.
 */
function phases(
  v: number[],
  t: number[],
  s: number,
  b: number,
  e: number,
  edge: boolean,
): Pick<Rep, 'down' | 'pause' | 'up' | 'midMs'> & { from: number; to: number } {
  const peak = v[b];
  const downRange = peak - v[s];
  const upRange = peak - v[e];
  let downStart = s;
  if (!edge) for (let i = s; i <= b; i += 1) if (v[i] > v[s] + 0.1 * downRange) { downStart = i; break; }
  let pauseStart = b;
  if (!edge) for (let i = downStart; i <= b; i += 1) if (v[i] >= peak - 0.05 * downRange) { pauseStart = i; break; }
  let pauseEnd = b;
  for (let i = b; i <= e; i += 1) {
    if (v[i] >= peak - 0.05 * upRange) pauseEnd = i;
    else break;
  }
  let upEnd = e;
  for (let i = pauseEnd; i <= e; i += 1) if (v[i] <= v[e] + 0.1 * upRange) { upEnd = i; break; }
  let mid = pauseEnd;
  for (let i = pauseEnd; i <= e; i += 1) if (v[i] <= peak - 0.5 * upRange) { mid = i; break; }
  const sec = (a: number, z: number) => Math.max(0, (t[z] - t[a]) / 1000);
  return {
    down: edge ? null : sec(downStart, pauseStart),
    pause: edge ? null : sec(pauseStart, pauseEnd),
    up: sec(pauseEnd, upEnd),
    midMs: t[mid],
    // The last sample still at rest before the descent, and the first one back at rest.
    from: edge ? b : Math.max(s, downStart - 1),
    to: upEnd,
  };
}

/** Every clean rep in the signal, in order. */
export function findReps(signal: RepSignal, t: number[]): Rep[] {
  const v = signal.values;
  // Finite runs: a gap longer than the fill (NaN) splits the series, so no rep straddles it.
  const runs: [number, number][] = [];
  let a = -1;
  for (let i = 0; i <= v.length; i += 1) {
    const ok = i < v.length && Number.isFinite(v[i]);
    if (ok && a < 0) a = i;
    if (!ok && a >= 0) {
      runs.push([a, i - 1]);
      a = -1;
    }
  }
  const reps: Rep[] = [];
  for (const [from, to] of runs) {
    let ext = zigzag(v, from, to, signal.swing);
    // Jitter: two extrema closer than REP_MERGE_MS go as a pair, which keeps the sequence alternating.
    for (let k = 0; k + 1 < ext.length; ) {
      if (t[ext[k + 1].i] - t[ext[k].i] < REP_MERGE_MS) ext = [...ext.slice(0, k), ...ext.slice(k + 2)];
      else k += 1;
    }
    let k = 0;
    if (startsAtExtreme(signal.kind) && ext.length >= 2 && ext[0].hi && !ext[1].hi) {
      const b = ext[0].i;
      const { from, to, ...ph } = phases(v, t, b, b, ext[1].i, true);
      const ms = t[to] - t[b];
      if (ms >= REP_MIN_MS / 2 && ms <= REP_MAX_MS) {
        reps.push({ start: from, turn: b, end: to, startMs: t[from], turnMs: t[b], endMs: t[to], edge: true, ...ph });
      }
      k = 1;
    }
    for (; k + 2 < ext.length; k += 1) {
      const [s, b, e] = [ext[k], ext[k + 1], ext[k + 2]];
      if (s.hi || !b.hi || e.hi) continue;
      const { from, to, ...ph } = phases(v, t, s.i, b.i, e.i, false);
      // Timed from leaving the rest to getting back to it, so a long breather between reps is not "a slow rep".
      const ms = t[to] - t[from];
      if (ms < REP_MIN_MS || ms > REP_MAX_MS) continue;
      reps.push({ start: from, turn: b.i, end: to, startMs: t[from], turnMs: t[b.i], endMs: t[to], edge: false, ...ph });
      k += 1; // the end of this rep is the start of the next
    }
  }
  return reps;
}
