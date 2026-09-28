/**
 * Turn cues — the router's steps turned into our own short phrases (§4.8).
 *
 * ORS's `instruction` strings are written for a car satnav ("Turn slight left onto Oak Street, then
 * continue for 400 m") and are far too long to say to someone mid-stride. So we keep only what the step
 * MEANS — the manoeuvre, the street, and where on the course it happens — and write the words ourselves,
 * in the athlete's units.
 *
 * Two stages, on purpose:
 *   · `stepsToCues` — one cue per meaningful step, with the street it leaves (`from`). Out-and-back
 *     needs that raw list, because mirroring a turn means turning back onto the street you came from.
 *   · `mergeCues` — two turns closer than 20 m become one line. Always the LAST stage, after any mirror.
 */

import type { UnitSystem } from '../run-core.ts';
import { CUE_DROP_STRAIGHT_UNDER_M, CUE_MERGE_UNDER_M } from './constants.ts';

export type CueKind =
  | 'left'
  | 'right'
  | 'sharp-left'
  | 'sharp-right'
  | 'slight-left'
  | 'slight-right'
  | 'keep-left'
  | 'keep-right'
  | 'straight'
  | 'roundabout'
  | 'u-turn'
  | 'turn-around';

export interface Cue {
  /** Metres along the course where the turn IS. The follower fires it a lead distance before. */
  atM: number;
  kind: CueKind;
  /** The street turned onto. Null when the map has no name for it. */
  street: string | null;
  /** The street being left. Raw cues only — needed to mirror the turn on an out-and-back. */
  from?: string | null;
  /** Roundabout exit, when the router gave one. */
  exit?: number;
  /** A second turn merged into this one ("Left, then right onto Pine"). */
  then?: { kind: CueKind; street: string | null };
}

/** The subset of an ORS `segments[].steps[]` entry we read. */
export interface OrsStep {
  distance: number;
  type: number;
  name?: string;
  way_points: [number, number];
  exit_number?: number;
}

/**
 * ORS instruction types (openrouteservice docs, "Instruction Types"). 10 goal, 11 depart and 8 exit
 * roundabout carry nothing to say: the follower owns "course complete", the athlete knows they started,
 * and the roundabout cue already named the exit.
 */
const ORS_KIND: Record<number, CueKind | null> = {
  0: 'left',
  1: 'right',
  2: 'sharp-left',
  3: 'sharp-right',
  4: 'slight-left',
  5: 'slight-right',
  6: 'straight',
  7: 'roundabout',
  8: null,
  9: 'u-turn',
  10: null,
  11: null,
  12: 'keep-left',
  13: 'keep-right',
};

/** OSM leaves plenty of paths nameless; ORS writes those as "-" or "". */
export function cleanStreet(name: string | null | undefined): string | null {
  const s = (name ?? '').trim();
  return s === '' || s === '-' ? null : s;
}

/**
 * One cue per step worth saying, positioned by the step's first way-point on the course.
 * `cumM` is the course's cumulative metres (`prepareCourse(...).cumM`), indexed like ORS's geometry.
 */
export function stepsToCues(steps: readonly OrsStep[], cumM: readonly number[]): Cue[] {
  const out: Cue[] = [];
  let prevStreet: string | null = null;
  for (const step of steps) {
    const street = cleanStreet(step.name);
    const from = prevStreet;
    prevStreet = street;
    const kind = ORS_KIND[step.type] ?? null;
    if (kind == null) continue;
    if (kind === 'straight') {
      // Straight on the same street is no instruction at all; a short one is a kink in the data.
      if (step.distance < CUE_DROP_STRAIGHT_UNDER_M) continue;
      if (street != null && street === from) continue;
    }
    const idx = Math.max(0, Math.min(cumM.length - 1, step.way_points[0]));
    const cue: Cue = { atM: Math.round(cumM[idx] ?? 0), kind, street, from };
    if (kind === 'roundabout' && step.exit_number != null) cue.exit = step.exit_number;
    out.push(cue);
  }
  return out;
}

/**
 * Two turns closer together than `CUE_MERGE_UNDER_M` are said as one line at the first turn. Never a
 * chain of three — "left, then right, then left" is a sentence nobody can follow at a run.
 */
export function mergeCues(cues: readonly Cue[]): Cue[] {
  const out: Cue[] = [];
  for (let i = 0; i < cues.length; i++) {
    const cur = cues[i];
    const next = cues[i + 1];
    const mergeable = (c: Cue) => c.kind !== 'turn-around' && c.kind !== 'roundabout' && c.then == null;
    if (next && next.atM - cur.atM < CUE_MERGE_UNDER_M && mergeable(cur) && mergeable(next)) {
      out.push({ ...cur, then: { kind: next.kind, street: next.street } });
      i++;
      continue;
    }
    out.push({ ...cur });
  }
  return out;
}

/** What gets saved in `run_courses.cues`: no `from`, which only the out-and-back mirror needs. */
export const compactCues = (cues: readonly Cue[]): Cue[] =>
  cues.map(({ from: _from, ...rest }) => rest);

// ── words ───────────────────────────────────────────────────────────────────

const VERB: Record<CueKind, string> = {
  left: 'turn left',
  right: 'turn right',
  'sharp-left': 'turn sharp left',
  'sharp-right': 'turn sharp right',
  'slight-left': 'bear left',
  'slight-right': 'bear right',
  'keep-left': 'keep left',
  'keep-right': 'keep right',
  straight: 'continue straight',
  roundabout: 'take the roundabout',
  'u-turn': 'make a U-turn',
  'turn-around': 'turn around',
};

/** The second half of a merged line: "then right", not "then turn right". */
const THEN: Record<CueKind, string> = {
  ...VERB,
  left: 'left',
  right: 'right',
  'sharp-left': 'sharp left',
  'sharp-right': 'sharp right',
};

const ordinal = (n: number): string => {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${s}`;
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The manoeuvre in words, without the distance: "turn left, then right onto Pine Street". */
function action(cue: Cue): string {
  if (cue.kind === 'turn-around') return 'turn around';
  let s = VERB[cue.kind];
  if (cue.kind === 'roundabout' && cue.exit != null) s = `at the roundabout, take the ${ordinal(cue.exit)} exit`;
  if (cue.then) {
    const street = cue.then.street;
    return `${s}, then ${THEN[cue.then.kind]}${street ? ` onto ${street}` : ''}`;
  }
  return `${s}${cue.street ? ` onto ${cue.street}` : ''}`;
}

/** The on-screen strip, no distance (the UI prints that from the follower): "Left, then right onto Pine". */
export function cueText(cue: Cue): string {
  if (cue.kind === 'turn-around') return 'Turn around here';
  const a = action(cue);
  // "turn left onto Oak" reads as "Left onto Oak" on a strip; the other verbs stand as they are.
  return cap(a.startsWith('turn ') ? a.slice(5) : a);
}

/**
 * A spoken distance, rounded the way a person says it. Imperial: feet to the nearest 50 under
 * 1,000 ft, then tenths of a mile. Metric: meters to the nearest 10 under 1 km, then tenths of a km.
 */
export function distanceWords(m: number, units: UnitSystem): string {
  if (units === 'metric') {
    if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} meters`;
    const km = Math.round(m / 100) / 10;
    return `${km} ${km === 1 ? 'kilometer' : 'kilometers'}`;
  }
  const ft = m * 3.28084;
  if (ft < 1000) return `${Math.max(50, Math.round(ft / 50) * 50)} feet`;
  const mi = Math.round(m / 160.9344) / 10;
  return `${mi} ${mi === 1 ? 'mile' : 'miles'}`;
}

/** The spoken line: "In 150 feet, turn left onto Oak Street." */
export function cueSpeech(cue: Cue, aheadM: number, units: UnitSystem): string {
  if (aheadM < 10) return `${cap(action(cue))} now.`;
  return `In ${distanceWords(aheadM, units)}, ${action(cue)}.`;
}
