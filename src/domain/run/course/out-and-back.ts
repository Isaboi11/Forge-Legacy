/**
 * Out and back — half of a passing loop, run there and back again (§4.6).
 *
 * Costs no extra provider call: cut the loop at `goal / 2` along its length, then append the same half
 * reversed. The athlete stays on ground they have just seen, which is part of why it is offered (§12).
 *
 * The cues are the fiddly part. On the way out they are the loop's own. At the cut there is a new
 * "Turn around here". On the way back every turn happens again at the mirrored distance, in the
 * opposite hand, and onto the street it originally LEFT — which is why this takes the RAW cues from
 * `stepsToCues` (they carry `from`) and merging happens afterwards.
 */

import type { Cue, CueKind } from './cues.ts';
import { mergeCues } from './cues.ts';
import { pointAtM, prepareCourse, type CoursePoint } from './geometry.ts';

const MIRROR: Record<CueKind, CueKind | null> = {
  left: 'right',
  right: 'left',
  'sharp-left': 'sharp-right',
  'sharp-right': 'sharp-left',
  'slight-left': 'slight-right',
  'slight-right': 'slight-left',
  'keep-left': 'keep-right',
  'keep-right': 'keep-left',
  straight: 'straight',
  roundabout: 'roundabout',
  // A U-turn reversed is not a manoeuvre anyone can describe. Drop it rather than say something wrong.
  'u-turn': null,
  'turn-around': null,
};

export interface OutAndBack {
  points: CoursePoint[];
  /** Merged, ready to follow and to save. */
  cues: Cue[];
  /** Where the turn-around is, in metres along the out-and-back. */
  turnM: number;
  lengthM: number;
}

/**
 * @param loop    a passing loop's points and its RAW cues (`stepsToCues`, not merged)
 * @param goalM   the athlete's goal; the cut is at half of it, or half the loop if the loop is shorter
 */
export function outAndBack(loop: { points: readonly CoursePoint[]; cues: readonly Cue[] }, goalM: number): OutAndBack {
  const course = prepareCourse(loop.points);
  const halfM = Math.min(goalM / 2, course.lengthM);

  // The outbound leg: every point before the cut, then the cut point itself, interpolated.
  const out: CoursePoint[] = [];
  for (let i = 0; i < course.points.length && course.cumM[i] < halfM; i++) out.push({ ...course.points[i] });
  out.push(pointAtM(course, halfM));
  const back = out.slice(0, -1).reverse().map((p) => ({ ...p }));
  const points = [...out, ...back];

  // Measured on the new geometry so `turnM` and `lengthM` agree with what the follower will compute.
  const whole = prepareCourse(points);
  const turnM = whole.cumM[out.length - 1];

  const outbound = loop.cues.filter((c) => c.atM < halfM);
  const turn: Cue = { atM: Math.round(turnM), kind: 'turn-around', street: null };
  const inbound: Cue[] = [];
  for (let i = outbound.length - 1; i >= 0; i--) {
    const c = outbound[i];
    const kind = MIRROR[c.kind];
    if (kind == null) continue;
    // Returning past the turn, you head back onto the street it left. A straight-on is still straight.
    const cue: Cue = { atM: Math.round(2 * turnM - c.atM), kind, street: c.from ?? null, from: c.street };
    if (c.kind === 'roundabout') delete cue.exit; // the exit count from the other side is not known
    inbound.push(cue);
  }

  return {
    points,
    cues: mergeCues([...outbound.map((c) => ({ ...c })), turn, ...inbound]),
    turnM,
    lengthM: whole.lengthM,
  };
}
