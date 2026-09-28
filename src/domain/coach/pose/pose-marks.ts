/**
 * BODY POSE — Holt's mark, moved onto a real joint. Plan §5.6 and §6.
 *
 * The 09-25 eval: Holt picks the right frame about 17 times in 19, but his dot lands ON the body part only
 * 6 in 18. A vision model's pointing is the ceiling; Vision's joints are the fix. So after the read, each
 * mark is placed from `detect()` on the exact still it names (the JPEG Holt and the athlete both see —
 * no timestamp drift):
 *
 *   1. Holt named a `joint` (`left_knee`, `mid_wrist` for the bar, …) and it is there → the dot goes on it.
 *   2. Only x/y → snap to the nearest confident joint within 12% of the frame's long edge.
 *   3. Nothing near → his point stands (exactly today's behaviour).
 *
 * A `line` mark near the hips or knees becomes the DEPTH line: drawn at the measured hip height, with a
 * short second tick at knee height, so the athlete sees the two heights the fix is about.
 *
 * ⚠ A MARK THAT CANNOT BE PLACED BETTER IS LEFT ALONE, never dropped — the snapping only ever improves a
 * position, and a mark on the wrong frame is still a mark on the frame Holt chose.
 */

import type { FormMark } from '../form-check.ts';
import { J, POSE_CONFIDENT, POSE_PRESENT, jointAt, midOf, resolveMarkJoint, type Pt } from './joints.ts';

/** How far a bare x/y may be moved onto a joint: this share of the frame's long edge (plan §5.6). */
export const SNAP_REACH = 0.12;

/** The points a bare dot may snap to: every joint, plus the bar (mid-wrist) and mid-hip. */
function snapTargets(person: number[]): Pt[] {
  const out: Pt[] = [];
  for (let j = 0; j < 19; j += 1) {
    const p = jointAt(person, j);
    if (p.c >= POSE_CONFIDENT) out.push(p);
  }
  for (const [a, b] of [
    [J.leftWrist, J.rightWrist],
    [J.leftHip, J.rightHip],
  ]) {
    const m = midOf(jointAt(person, a), jointAt(person, b), POSE_CONFIDENT);
    if (m) out.push(m);
  }
  return out;
}

/**
 * The marks, placed. `stills[i]` is the athlete's joints in frame i (0–1, from `detect()`), or null;
 * `sizes[i]` is that frame's `[width, height]` in pixels, for a distance that means the same across and
 * down a portrait frame.
 */
export function snapMarks(marks: FormMark[], stills: (number[] | null)[], sizes: ([number, number] | null)[]): FormMark[] {
  return marks.map((m) => {
    const person = stills[m.frame] ?? null;
    if (!person) return m;
    const [w, h] = sizes[m.frame] ?? [1, 1];
    const L = Math.max(w, h) || 1;

    if (m.kind === 'line') {
      const hip = midOf(jointAt(person, J.leftHip), jointAt(person, J.rightHip), POSE_CONFIDENT);
      const knee = midOf(jointAt(person, J.leftKnee), jointAt(person, J.rightKnee), POSE_CONFIDENT);
      const named = m.joint ? resolveMarkJoint(person, m.joint) : null;
      const aboutDepth = /hip|knee/.test(m.joint ?? '') || (!m.joint && !!hip && (Math.abs(m.y - hip.y) * h <= SNAP_REACH * L || (!!knee && Math.abs(m.y - knee.y) * h <= SNAP_REACH * L)));
      if (hip && knee && aboutDepth) return { ...m, y: hip.y, tick: knee.y };
      if (named) return { ...m, y: named.y };
      return m;
    }

    if (m.joint) {
      const p = resolveMarkJoint(person, m.joint);
      if (p) return { ...m, x: p.x, y: p.y };
    }
    let best: Pt | null = null;
    let d = Infinity;
    for (const p of snapTargets(person)) {
      const dd = Math.hypot((p.x - m.x) * w, (p.y - m.y) * h);
      if (dd < d) {
        d = dd;
        best = p;
      }
    }
    return best && d <= SNAP_REACH * L ? { ...m, x: best.x, y: best.y } : m;
  });
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The faint skeleton (full screen only — PO decision 2)
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

const BONES: [number, number][] = [
  [J.neck, J.root],
  [J.leftShoulder, J.rightShoulder],
  [J.leftHip, J.rightHip],
  [J.leftShoulder, J.leftElbow],
  [J.leftElbow, J.leftWrist],
  [J.rightShoulder, J.rightElbow],
  [J.rightElbow, J.rightWrist],
  [J.leftHip, J.leftKnee],
  [J.leftKnee, J.leftAnkle],
  [J.rightHip, J.rightKnee],
  [J.rightKnee, J.rightAnkle],
];

/** Bones as `[x1, y1, x2, y2]` in 0–1 of the frame, only where both ends are present. Drawn, never sent. */
export function skeletonBones(person: number[] | null | undefined): [number, number, number, number][] {
  if (!person) return [];
  const out: [number, number, number, number][] = [];
  for (const [a, b] of BONES) {
    const p = jointAt(person, a);
    const q = jointAt(person, b);
    if (p.c >= POSE_PRESENT && q.c >= POSE_PRESENT) out.push([p.x, p.y, q.x, q.y]);
  }
  return out;
}
