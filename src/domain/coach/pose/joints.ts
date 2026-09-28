/**
 * BODY POSE — the joints, in the order the native module sends them, and the few shapes every other file
 * in `pose/` shares. `Docs/Form-Check-Body-Pose-Build-Plan.md` §3.
 *
 * ══ WHAT COMES OFF THE PHONE ══
 *
 * `modules/body-pose` (`ForgeBodyPose`, Apple Vision's `VNDetectHumanBodyPoseRequest`) returns RAW joints
 * and nothing else: per sampled frame, up to `maxPeople` people, each a flat run of 19 joints × `[x, y,
 * confidence]` (57 numbers). Coordinates are 0–1 from the TOP-left of the upright frame (Swift flips
 * Vision's bottom-left origin, as label-reader does). A joint Vision did not find is confidence 0. Left and
 * right are the athlete's own, not the camera's.
 *
 * Every rule — which person is the athlete, which reps, what a number means — lives in TypeScript beside
 * this file, where `node --test` runs it on Windows. The Swift stays tiny on purpose: its first compile is
 * the EAS build.
 *
 * ⚠ JOINTS NEVER LEAVE THE PHONE AND ARE NEVER STORED (PO decision 3, 09-28). What leaves is a handful of
 * measured numbers (`pose-facts.ts`), and what is saved is reps, depth and tempo (`measuredForSave` in `pose-measure.ts`).
 *
 * Import-free apart from types, like the rest of `src/domain` (`@/` is type-only here).
 */

/** Vision's 19 joints, in the order `ForgeBodyPoseModule.swift` writes them. Changing this changes the wire. */
export const POSE_JOINTS = [
  'nose',
  'leftEye',
  'rightEye',
  'leftEar',
  'rightEar',
  'neck',
  'leftShoulder',
  'rightShoulder',
  'leftElbow',
  'rightElbow',
  'leftWrist',
  'rightWrist',
  'root',
  'leftHip',
  'rightHip',
  'leftKnee',
  'rightKnee',
  'leftAnkle',
  'rightAnkle',
] as const;
export type PoseJoint = (typeof POSE_JOINTS)[number];

/** Numbers per person: 19 joints × `[x, y, confidence]`. */
export const POSE_VALUES = POSE_JOINTS.length * 3;

/** Index of each joint in {@link POSE_JOINTS}. */
export const J = Object.fromEntries(POSE_JOINTS.map((n, i) => [n, i])) as Record<PoseJoint, number>;

/**
 * Below this a joint is not there at all (plan §5.1: gaps are anything under 0.3). Coverage, gap filling
 * and the athlete's box use it.
 */
export const POSE_PRESENT = 0.3;

/** A FACT is only computed from joints at least this sure (plan §5.3). */
export const POSE_CONFIDENT = 0.5;

/** One sampled frame: when (ms into the clip) and everyone Vision found. */
export interface PoseFrame {
  t: number;
  people: number[][];
}

/** A dense pass over a clip (`track()`), or the stills pass (`detect()`, one frame per image, `t` 0). */
export interface PoseTrack {
  /** The upright (orientation-applied) frame size in pixels. */
  width: number;
  height: number;
  /** The file's own frame rate. Over 60 may be slow motion, where clip time is not real time (§9). */
  nominalFps: number;
  frames: PoseFrame[];
}

export interface Pt {
  x: number;
  y: number;
  c: number;
}

/** Joint `j` of one person. Missing or malformed reads as confidence 0. */
export function jointAt(person: ArrayLike<number> | null | undefined, j: number): Pt {
  if (!person || person.length < POSE_VALUES) return { x: 0, y: 0, c: 0 };
  const x = person[j * 3];
  const y = person[j * 3 + 1];
  const c = person[j * 3 + 2];
  return { x, y, c: Number.isFinite(c) ? c : 0 };
}

/** The midpoint of two joints when both are at least `min` sure; otherwise the surer one alone, or null. */
export function midOf(a: Pt, b: Pt, min = POSE_PRESENT): Pt | null {
  const okA = a.c >= min;
  const okB = b.c >= min;
  if (okA && okB) return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, c: Math.min(a.c, b.c) };
  if (okA) return a;
  if (okB) return b;
  return null;
}

/** Straight-line distance between two points. */
export const dist = (a: { x: number; y: number }, b: { x: number; y: number }): number => Math.hypot(a.x - b.x, a.y - b.y);

/** The angle at `b` in the chain a-b-c, in degrees (180 = straight). NaN when any point is missing. */
export function angleAt(a: Pt | null, b: Pt | null, c: Pt | null): number {
  if (!a || !b || !c) return NaN;
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const n = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  if (!(n > 0)) return NaN;
  const cos = Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / n));
  return (Math.acos(cos) * 180) / Math.PI;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Narrowing what the native module returned
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * One person, narrowed: exactly {@link POSE_VALUES} finite numbers, coordinates clamped into the frame.
 * Null for anything else — a native module is a peer, not a boundary, and a NaN in here would poison every
 * median downstream.
 */
function cleanPerson(raw: unknown): number[] | null {
  if (!Array.isArray(raw) || raw.length !== POSE_VALUES) return null;
  const out: number[] = new Array(POSE_VALUES);
  for (let i = 0; i < POSE_VALUES; i += 1) {
    const v = raw[i];
    if (typeof v !== 'number' || !Number.isFinite(v)) return null;
    out[i] = Math.min(1, Math.max(0, v));
  }
  return out;
}

/** Frames narrowed: finite times, people cleaned, at most `maxPeople` each, in time order. */
export function cleanPoseFrames(raw: unknown, maxPeople = 4): PoseFrame[] {
  if (!Array.isArray(raw)) return [];
  const out: PoseFrame[] = [];
  for (const f of raw) {
    if (!f || typeof f !== 'object') continue;
    const r = f as { t?: unknown; people?: unknown };
    const t = typeof r.t === 'number' && Number.isFinite(r.t) ? r.t : NaN;
    if (!Number.isFinite(t)) continue;
    const people = Array.isArray(r.people) ? r.people.map(cleanPerson).filter((p): p is number[] => !!p).slice(0, maxPeople) : [];
    out.push({ t, people });
  }
  return out.sort((a, b) => a.t - b.t);
}

/** A `track()` result narrowed, or null when it is not one. */
export function cleanPoseTrack(raw: unknown): PoseTrack | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as { width?: unknown; height?: unknown; nominalFps?: unknown; frames?: unknown };
  const width = typeof r.width === 'number' && r.width >= 16 ? r.width : 0;
  const height = typeof r.height === 'number' && r.height >= 16 ? r.height : 0;
  if (!width || !height) return null;
  const nominalFps = typeof r.nominalFps === 'number' && Number.isFinite(r.nominalFps) ? r.nominalFps : 0;
  return { width, height, nominalFps, frames: cleanPoseFrames(r.frames) };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The joints Holt may name for a mark
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The names a mark's `joint` resolves to. The list itself is `FORM_MARK_JOINTS` in `form-check.ts` (the
 * function validates against it and cannot import this file); this is how each name finds a point. The
 * `mid_*` names are the midpoint of both sides — `mid_wrist` is the bar.
 */
const MARK_POINTS: Record<string, [PoseJoint, PoseJoint?]> = {
  head: ['nose'],
  neck: ['neck'],
  left_shoulder: ['leftShoulder'],
  right_shoulder: ['rightShoulder'],
  mid_shoulder: ['leftShoulder', 'rightShoulder'],
  left_elbow: ['leftElbow'],
  right_elbow: ['rightElbow'],
  left_wrist: ['leftWrist'],
  right_wrist: ['rightWrist'],
  mid_wrist: ['leftWrist', 'rightWrist'],
  left_hip: ['leftHip'],
  right_hip: ['rightHip'],
  mid_hip: ['leftHip', 'rightHip'],
  left_knee: ['leftKnee'],
  right_knee: ['rightKnee'],
  mid_knee: ['leftKnee', 'rightKnee'],
  left_ankle: ['leftAnkle'],
  right_ankle: ['rightAnkle'],
  mid_ankle: ['leftAnkle', 'rightAnkle'],
};

/** The names {@link resolveMarkJoint} knows. A test holds it equal to `FORM_MARK_JOINTS`. */
export const MARK_POINT_NAMES = Object.keys(MARK_POINTS);

/**
 * Where a named joint is on one person (0–1 of the frame), or null when it is not there to at least
 * {@link POSE_PRESENT}. `mid_*` falls back to the one side that is visible — from the side, the far knee is
 * usually hidden and the near one IS the knee.
 */
export function resolveMarkJoint(person: ArrayLike<number> | null | undefined, name: string): Pt | null {
  const spec = MARK_POINTS[name];
  if (!spec || !person) return null;
  const a = jointAt(person, J[spec[0]]);
  if (!spec[1]) return a.c >= POSE_PRESENT ? a : null;
  return midOf(a, jointAt(person, J[spec[1]]));
}
