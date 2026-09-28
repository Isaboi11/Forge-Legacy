/**
 * BODY POSE — from a dense pass to a decision and a set of measured facts. Plan §5.3 and §8.
 *
 * `analysePose()` answers the first question every read asks: can body tracking help with THIS clip?
 *
 *   | Level     | When                                                             | What happens             |
 *   |-----------|------------------------------------------------------------------|--------------------------|
 *   | `full`    | athlete readable in ≥ 60% of samples, at least two clean reps     | pose frames + facts + joint marks |
 *   | `marks`   | athlete found, no clean reps (a single, an isometric, odd lift)  | even frames, joint snapping only  |
 *   | `off`     | no track, ambiguous people, athlete in < 60%, no torso to measure by | exactly today's read   |
 *
 * All three cost the same (6 credits). Partial views narrow the FACTS, not the read: legs cut off means no
 * depth or knee facts, and the rest still goes.
 *
 * `measureFacts()` then turns the reps into the wire shape (`pose-facts.ts`). Each fact is computed only
 * when the joints it needs are confident (≥ 0.5) in that rep, and only from a view that shows it: depth and
 * torso angle from the side or a diagonal, knee track, bar tilt and hip shift from the front or behind.
 *
 * ⚠ THRESHOLDS ARE FIRST GUESSES FROM THE PLAN. They are re-tuned on real Vision output from the PO's 21
 * clips on build 10 (plan P3.2). A synthetic test passing says the logic is right, not that the numbers are.
 */

import { J, POSE_PRESENT, angleAt, jointAt, type PoseTrack, type Pt } from './joints.ts';
import { POSE_COVERAGE_MIN, pickAthlete, surePointOf, type AthleteSeries } from './pose-track.ts';
import { findReps, poseKind, repSignal, type PoseKind, type Rep } from './pose-reps.ts';
import type { PoseDepth, PoseFacts, PoseTag, PoseView } from './pose-facts.ts';

export type PoseLevel = 'full' | 'marks' | 'off';

/** Fewer clean reps than this is `marks`, not `full` (plan §8: "no clean reps (1 rep, isometric, odd lift)"). */
export const POSE_MIN_REPS = 2;

/** Over this the file may be slow motion, where clip seconds are not real seconds: no tempo (plan §9). */
export const POSE_SLOWMO_FPS = 60;

export interface PoseAnalysis {
  level: PoseLevel;
  /** Why it is `off` or `marks` — for the P3.2 device export, never shown to the athlete. */
  reason: string;
  kind: PoseKind;
  series: AthleteSeries | null;
  reps: Rep[];
  view: PoseView | null;
  side: 'left' | 'right' | null;
}

const median = (xs: number[]): number => {
  if (!xs.length) return NaN;
  const s = xs.slice().sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * Which way the camera faces the athlete, from the pose itself: shoulder width over torso length is small
 * from the side and large from the front or behind; face joints tell front from behind; between the two
 * is a diagonal. From the side, the surer side is the one toward the camera.
 */
export function poseView(series: AthleteSeries): { view: PoseView | null; side: 'left' | 'right' | null } {
  const ratios: number[] = [];
  const face: number[] = [];
  let left = 0;
  let right = 0;
  for (const p of series.joints) {
    if (!p) continue;
    const ls = jointAt(p, J.leftShoulder);
    const rs = jointAt(p, J.rightShoulder);
    if (ls.c >= POSE_PRESENT && rs.c >= POSE_PRESENT) ratios.push(Math.abs(ls.x - rs.x) / series.torso);
    face.push(Math.max(jointAt(p, J.nose).c, jointAt(p, J.leftEye).c, jointAt(p, J.rightEye).c));
    for (const [l, r] of [
      [J.leftShoulder, J.rightShoulder],
      [J.leftElbow, J.rightElbow],
      [J.leftHip, J.rightHip],
      [J.leftKnee, J.rightKnee],
      [J.leftAnkle, J.rightAnkle],
    ]) {
      left += jointAt(p, l).c;
      right += jointAt(p, r).c;
    }
  }
  const ratio = ratios.length ? median(ratios) : 0;
  let view: PoseView | null;
  if (!ratios.length || ratio < 0.3) view = 'side';
  else if (ratio >= 0.6) view = median(face) >= 0.4 ? 'front' : 'behind';
  else view = 'diagonal';
  const side = view !== 'side' ? null : left > right * 1.1 ? 'left' : right > left * 1.1 ? 'right' : null;
  return { view, side };
}

/** Can body tracking help with this clip, and if so, where are the reps? Never throws. */
export function analysePose(track: PoseTrack | null, pattern: string | null | undefined, name: string | null | undefined): PoseAnalysis {
  const kind = poseKind(pattern, name);
  const off = (reason: string, series: AthleteSeries | null = null): PoseAnalysis => ({ level: 'off', reason, kind, series, reps: [], view: null, side: null });
  if (!track || track.frames.length < 5) return off('no track');
  const series = pickAthlete(track);
  if (!series) return off('nobody found');
  if (series.ambiguous) return off('two similar people', series);
  const upperBody = kind !== 'squat' && kind !== 'hinge' && kind !== 'auto';
  if ((upperBody ? series.upperCoverage : series.coverage) < POSE_COVERAGE_MIN) return off('athlete not readable enough', series);
  if (!(series.torso > 0)) return off('no torso to measure by', series);
  const { view, side } = poseView(series);
  const signal = repSignal(series, kind);
  const reps = signal ? findReps(signal, series.t) : [];
  if (reps.length < POSE_MIN_REPS) return { level: 'marks', reason: `${reps.length} clean reps`, kind, series, reps, view, side };
  return { level: 'full', reason: '', kind, series, reps, view, side };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Per-rep measurement
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** One rep's facts. `undefined` = not measurable in this rep; a value = measured. */
export interface RepFacts {
  depth?: PoseDepth;
  torso?: number;
  hipsFirst?: boolean;
  kneesIn?: boolean;
  tilt?: boolean;
  shift?: 'left' | 'right' | null;
  lockoutShort?: boolean;
  tempo: [number | null, number | null, number];
}

/** Index of the sample nearest `ms`. */
function indexAt(t: number[], ms: number): number {
  let best = 0;
  for (let i = 1; i < t.length; i += 1) if (Math.abs(t[i] - ms) < Math.abs(t[best] - ms)) best = i;
  return best;
}

/** The hip / knee / … of the side toward the camera when known, else the midpoint, confident only. */
function near(p: number[] | null, side: 'left' | 'right' | null, l: number, r: number): Pt | null {
  if (side === 'left') return surePointOf(p, l) ?? surePointOf(p, l, r);
  if (side === 'right') return surePointOf(p, r) ?? surePointOf(p, l, r);
  return surePointOf(p, l, r);
}

export function measureReps(a: PoseAnalysis): RepFacts[] {
  const s = a.series;
  if (!s) return [];
  const u = s.torso;
  const sideOn = a.view === 'side' || a.view === 'diagonal';
  const frontOn = a.view === 'front' || a.view === 'behind';
  const legs = a.kind === 'squat' || a.kind === 'hinge';
  return a.reps.map((rep) => {
    const top = s.joints[rep.edge ? rep.end : rep.start];
    const bottom = s.joints[rep.turn];
    const end = s.joints[rep.end];
    const f: RepFacts = { tempo: [rep.down == null ? null : round1(rep.down), rep.pause == null ? null : round1(rep.pause), round1(rep.up)] };

    if (a.kind === 'squat' && sideOn) {
      const hip = near(bottom, a.side, J.leftHip, J.rightHip);
      const knee = near(bottom, a.side, J.leftKnee, J.rightKnee);
      if (hip && knee) {
        const d = (hip.y - knee.y) / u;
        f.depth = d > 0.05 ? 'below' : d < -0.05 ? 'above' : 'level';
      }
    }

    if (legs && sideOn) {
      const neck = surePointOf(bottom, J.neck);
      const base = surePointOf(bottom, J.root) ?? surePointOf(bottom, J.leftHip, J.rightHip);
      if (neck && base) f.torso = Math.round((Math.atan2(Math.abs(neck.x - base.x), Math.abs(neck.y - base.y)) * 180) / Math.PI / 5) * 5;

      // Out of the bottom: how far the hips and the shoulders have risen over the first 30% of the way up
      // (the up phase starts where the pause ends, `up` seconds before the rep does).
      const upFrom = rep.endMs - rep.up * 1000;
      const k0 = indexAt(s.t, upFrom);
      const k = indexAt(s.t, upFrom + 0.3 * rep.up * 1000);
      const h0 = surePointOf(s.joints[k0], J.leftHip, J.rightHip);
      const h1 = surePointOf(s.joints[k], J.leftHip, J.rightHip);
      const s0 = surePointOf(s.joints[k0], J.leftShoulder, J.rightShoulder);
      const s1 = surePointOf(s.joints[k], J.leftShoulder, J.rightShoulder);
      if (h0 && h1 && s0 && s1 && k > k0) {
        const hipRise = (h0.y - h1.y) / u;
        const shRise = (s0.y - s1.y) / u;
        f.hipsFirst = hipRise - shRise > 0.1 && hipRise > 1.5 * Math.max(shRise, 0);
      }
    }

    if (a.kind === 'squat' && frontOn) {
      // Knee spacing over ankle spacing, standing vs the narrowest point from the bottom back to the top.
      const ratio = (p: number[] | null) => {
        const lk = surePointOf(p, J.leftKnee);
        const rk = surePointOf(p, J.rightKnee);
        const la = surePointOf(p, J.leftAnkle);
        const ra = surePointOf(p, J.rightAnkle);
        if (!lk || !rk || !la || !ra) return NaN;
        const ankles = Math.abs(la.x - ra.x);
        return ankles > 0.01 ? Math.abs(lk.x - rk.x) / ankles : NaN;
      };
      const r0 = ratio(top);
      let low = Infinity;
      for (let i = rep.turn; i <= rep.end; i += 1) {
        const r = ratio(s.joints[i]);
        if (Number.isFinite(r)) low = Math.min(low, r);
      }
      if (Number.isFinite(r0) && Number.isFinite(low)) f.kneesIn = low < r0 * 0.85;
    }

    if ((a.kind === 'press' || a.kind === 'bench') && frontOn) {
      const lw = surePointOf(end, J.leftWrist);
      const rw = surePointOf(end, J.rightWrist);
      if (lw && rw) f.tilt = Math.abs(lw.y - rw.y) / u > 0.08;
    }

    if (legs && frontOn) {
      const hip = surePointOf(bottom, J.leftHip, J.rightHip);
      const la = surePointOf(bottom, J.leftAnkle);
      const ra = surePointOf(bottom, J.rightAnkle);
      if (hip && la && ra) {
        const off = (hip.x - (la.x + ra.x) / 2) / u;
        // Toward whichever ankle the hips moved to — the athlete's own left or right, whatever the camera.
        f.shift = Math.abs(off) > 0.12 ? (Math.sign(off) === Math.sign(la.x - ra.x) ? 'left' : 'right') : null;
      }
    }

    if (sideOn) {
      let angle = NaN;
      let need = 0;
      if (a.kind === 'squat') {
        angle = angleAt(near(end, a.side, J.leftHip, J.rightHip), near(end, a.side, J.leftKnee, J.rightKnee), near(end, a.side, J.leftAnkle, J.rightAnkle));
        need = 165;
      } else if (a.kind === 'hinge') {
        angle = angleAt(near(end, a.side, J.leftShoulder, J.rightShoulder), near(end, a.side, J.leftHip, J.rightHip), near(end, a.side, J.leftKnee, J.rightKnee));
        need = 170;
      } else if (a.kind === 'press' || a.kind === 'bench' || a.kind === 'pushup') {
        angle = angleAt(near(end, a.side, J.leftShoulder, J.rightShoulder), near(end, a.side, J.leftElbow, J.rightElbow), near(end, a.side, J.leftWrist, J.rightWrist));
        need = a.kind === 'press' ? 160 : 155;
      }
      if (need && Number.isFinite(angle)) f.lockoutShort = angle < need;
    }
    return f;
  });
}

const round1 = (x: number) => Math.round(x * 10) / 10;

/**
 * Which rep differs most from rep 1 — the one worth two frames (plan §5.5). Depth changing class, the
 * torso tipping, hips leading, knees moving in, a missed lockout and a slower way up all count.
 */
export function worstRep(facts: RepFacts[]): number {
  if (facts.length < 2) return 0;
  const a = facts[0];
  let best = facts.length - 1;
  let most = -1;
  facts.forEach((f, i) => {
    if (i === 0) return;
    let d = 0;
    if (f.depth && a.depth && f.depth !== a.depth) d += 1;
    if (f.torso != null && a.torso != null) d += Math.abs(f.torso - a.torso) / 10;
    for (const k of ['hipsFirst', 'kneesIn', 'tilt', 'lockoutShort'] as const) if (f[k] && !a[k]) d += 1;
    if (f.shift && !a.shift) d += 1;
    if (a.tempo[2] > 0) d += Math.max(0, f.tempo[2] / a.tempo[2] - 1);
    if (d > most) {
      most = d;
      best = i;
    }
  });
  return best;
}

/** Rep numbers where `pick` is true; null when no rep could measure it at all. */
function repsWhere(facts: RepFacts[], pick: (f: RepFacts) => boolean | undefined): number[] | null {
  const measured = facts.filter((f) => pick(f) !== undefined);
  if (!measured.length) return null;
  return facts.map((f, i) => (pick(f) ? i + 1 : 0)).filter(Boolean);
}

/**
 * The wire shape for a `full` read: what `coach-form-check` narrows with `capPose` and Holt reads as
 * fixed lines. Null for any other level — `marks` sends no facts, only snaps.
 */
export function measureFacts(a: PoseAnalysis, frames: (PoseTag | null)[]): PoseFacts | null {
  if (a.level !== 'full' || !a.series) return null;
  const facts = measureReps(a);
  const per = <T>(pick: (f: RepFacts) => T | undefined): (T | null)[] | null =>
    facts.some((f) => pick(f) !== undefined) ? facts.map((f) => pick(f) ?? null) : null;
  const shifts = facts.map((f) => f.shift).filter((x): x is 'left' | 'right' => !!x);
  const lefts = shifts.filter((x) => x === 'left').length;
  return {
    kind: a.kind,
    view: a.view,
    side: a.side,
    reps: a.reps.length,
    frames,
    tempo: a.series.nominalFps > POSE_SLOWMO_FPS ? null : facts.map((f) => f.tempo),
    depth: per((f) => f.depth),
    torso: per((f) => f.torso),
    hipsFirst: repsWhere(facts, (f) => f.hipsFirst),
    kneesIn: repsWhere(facts, (f) => f.kneesIn),
    tilt: repsWhere(facts, (f) => f.tilt),
    shift: repsWhere(facts, (f) => (f.shift === undefined ? undefined : !!f.shift)),
    shiftSide: shifts.length ? (lefts * 2 >= shifts.length ? 'left' : 'right') : null,
    lockoutShort: repsWhere(facts, (f) => f.lockoutShort),
  };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// What is saved (PO decision 3)
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** The saved numbers: `form_checks.measured` (0235). */
export interface PoseMeasured {
  v: 1;
  kind: PoseFacts['kind'];
  view: PoseView | null;
  reps: number;
  depth: (PoseDepth | null)[] | null;
  tempo: [number | null, number | null, number][] | null;
}

/**
 * ⛔ NUMBERS ONLY, NEVER JOINTS (PO decision 3, 09-28): reps, depth and tempo, so a later read can say
 * "rep 5 was shallower than in August". No coordinates, no torso length, nothing that describes a body —
 * this function's output type has no field that could carry one.
 */
export function measuredForSave(p: PoseFacts | null): PoseMeasured | null {
  if (!p) return null;
  return { v: 1, kind: p.kind, view: p.view, reps: p.reps, depth: p.depth, tempo: p.tempo };
}
