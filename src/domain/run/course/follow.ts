/**
 * Following a course — the state machine behind the map line, the off-course banner and the turn cues
 * (§5). Pure: state in, fix in, state and events out. That is what lets the SAME code run in
 * `useRunTracker` in the foreground and inside the background location task with the phone locked, and
 * what lets any saved track be replayed through it to see what the athlete would have heard.
 *
 * The three hard parts, each named where it is handled:
 *
 *   · WHICH LEG. An out-and-back is one street twice and a figure-8 crosses itself, so "the nearest point
 *     on the course" is often two points, and a global nearest-point would teleport the athlete onto the
 *     wrong leg. Progress is matched only in a window around where they were (`WINDOW_BACK_M`…
 *     `WINDOW_AHEAD_M`, narrowed to how far they could have got since — `REACH_SLACK_M`), and a tie
 *     between two legs goes to the smaller jump forward.
 *   · FLICKER. GPS wanders 5–35 m. A single threshold would raise and clear "off course" all run long, so
 *     going off needs 3 fixes beyond 40 m and coming back needs 2 within 25 m — the gap between those is
 *     the hysteresis — and fixes too vague to tell (`COURSE_ACCURACY_GATE_M`) count neither way.
 *   · STALE CUES. A cue whose turn is already behind the athlete (they rejoined past it) is consumed
 *     silently; one still ahead waits out an off-course spell and is spoken on rejoining. Saying "turn
 *     left" 30 m after the corner is worse than saying nothing.
 */

import { ACCURACY_FLOOR_M, MAX_MPH, type ActivityKind } from '../run-core.ts';
import {
  ALERT_MIN_GAP_MS,
  COURSE_ACCURACY_GATE_M,
  CUE_LEAD_M,
  CUE_LEAD_WALK_M,
  FINISH_FRACTION,
  FINISH_RADIUS_M,
  LEG_SEPARATION_M,
  LEG_TIE_M,
  M_PER_MI,
  OFF_COURSE_FIXES,
  OFF_COURSE_M,
  ON_COURSE_FIXES,
  REACH_SLACK_M,
  ON_COURSE_M,
  REJOIN_AFTER_MS,
  WINDOW_AHEAD_M,
  WINDOW_BACK_M,
} from './constants.ts';
import type { Cue } from './cues.ts';
import { distM, prepareCourse, projectOnto, projectionCandidates, type Course, type CoursePoint, type Projection } from './geometry.ts';

export interface FollowCourse {
  geom: Course;
  /** Merged cues, sorted by `atM`. */
  cues: Cue[];
}

export const prepareFollow = (points: readonly CoursePoint[], cues: readonly Cue[]): FollowCourse => ({
  geom: prepareCourse(points),
  cues: cues.slice().sort((a, b) => a.atM - b.atM),
});

/**
 * One position for the follower. Feed it the tracker's ACCEPTED points (the smoothed position) with the
 * raw fix's `accuracy` — the follower never runs a second GPS stream (§1).
 */
export interface CourseFix {
  lat: number;
  lon: number;
  at: number;
  accuracy?: number | null;
}

export interface FollowState {
  /** Metres along the course of the athlete's matched position. */
  progressM: number;
  /** The furthest progress matched so far — what a tie between legs is judged against. */
  bestM: number;
  /** Time of the last fix that matched the course; the rejoin search starts `REJOIN_AFTER_MS` after it. */
  lastMatchAt: number | null;
  lastAt: number | null;
  /** First accepted fix — the rejoin clock for an athlete who has not touched the course yet. */
  startedAt: number | null;
  /** Metres from the course at the last counted fix — the banner's "60 m from the route". */
  offByM: number | null;
  offCourse: boolean;
  farStreak: number;
  nearStreak: number;
  lastAlertAt: number | null;
  /** Whether the current off-course spell was announced; only an announced one gets a "back on". */
  offAnnounced: boolean;
  /** Index of the next cue that has not fired or been consumed. */
  nextCue: number;
  complete: boolean;
}

export type FollowEvent =
  | { type: 'cue'; cue: Cue; index: number; aheadM: number }
  | { type: 'off-course'; distM: number }
  | { type: 'back-on-course' }
  | { type: 'complete' };

export interface FollowStep {
  state: FollowState;
  events: FollowEvent[];
  /** Why the fix was ignored, or null. An ignored fix returns the state untouched. */
  rejected: 'accuracy' | 'stale' | null;
}

export const initialFollow = (): FollowState => ({
  progressM: 0,
  bestM: 0,
  lastMatchAt: null,
  lastAt: null,
  startedAt: null,
  offByM: null,
  offCourse: false,
  farStreak: 0,
  nearStreak: 0,
  lastAlertAt: null,
  offAnnounced: false,
  nextCue: 0,
  complete: false,
});

export const cueLeadM = (activity: ActivityKind): number => (activity === 'walk' ? CUE_LEAD_WALK_M : CUE_LEAD_M);

/**
 * Pick the athlete's leg from the window's candidates (one per segment).
 *
 *   1. Everything within `LEG_TIE_M` of the nearest candidate is a tie — GPS can't tell those apart.
 *   2. Of the tied, prefer those FORWARD of the high-water mark `bestM` (less `LEG_TIE_M` of noise).
 *      This is what turns an out-and-back round: past the turn, the outbound spot under the athlete
 *      is behind the mark and the return spot is ahead of it. Judged against the last progress instead,
 *      the outbound leg would always be the smaller jump, and progress would walk back down it a few
 *      metres a fix while the athlete ran home.
 *   3. Group what is left by along-course position (`LEG_SEPARATION_M`); each group's nearest point is
 *      a leg, and the leg with the smallest jump from the last progress wins — the figure-8 rule.
 *      Grouping first is what stops a segment's end vertex, just behind the athlete, being "the
 *      smallest jump" on an ordinary straight.
 */
function pickLeg(cands: Projection[], progressM: number, bestM: number): Projection | null {
  if (cands.length === 0) return null;
  const nearest = Math.min(...cands.map((c) => c.distM));
  const tied = cands.filter((c) => c.distM <= nearest + LEG_TIE_M);
  const forward = tied.filter((c) => c.alongM >= bestM - LEG_TIE_M);
  const pool = (forward.length > 0 ? forward : tied).sort((a, b) => a.distM - b.distM);
  const legs: Projection[] = [];
  for (const c of pool) {
    if (!legs.some((l) => Math.abs(l.alongM - c.alongM) <= LEG_SEPARATION_M)) legs.push(c);
  }
  return legs.reduce((a, b) => (Math.abs(b.alongM - progressM) < Math.abs(a.alongM - progressM) ? b : a));
}

/**
 * The rejoin search: the whole course, but a tie still prefers ahead of where they left it over behind —
 * a detour almost always rejoins further on.
 */
function rejoin(course: Course, fix: CourseFix, progressM: number): Projection | null {
  const cands = projectionCandidates(course, fix).filter((c) => c.distM < ON_COURSE_M);
  if (cands.length === 0) return null;
  const cost = (c: Projection) => (c.alongM >= progressM - WINDOW_BACK_M ? c.alongM - progressM : 1e9 + progressM - c.alongM);
  return cands.reduce((a, b) => (cost(b) < cost(a) ? b : a));
}

/** Advance the follower by one fix. */
export function stepFollow(course: FollowCourse, prev: FollowState, fix: CourseFix, activity: ActivityKind): FollowStep {
  // The tracker's own rule, reused: a fix it would reject is not a position at all.
  if (fix.accuracy != null && fix.accuracy > ACCURACY_FLOOR_M) return { state: prev, events: [], rejected: 'accuracy' };
  if (prev.lastAt != null && fix.at <= prev.lastAt) return { state: prev, events: [], rejected: 'stale' };

  const s: FollowState = { ...prev, lastAt: fix.at, startedAt: prev.startedAt ?? fix.at };
  const events: FollowEvent[] = [];
  const g = course.geom;
  const vague = fix.accuracy != null && fix.accuracy > COURSE_ACCURACY_GATE_M;

  // ── where on the course ──
  const sinceS = (fix.at - (s.lastMatchAt ?? s.startedAt ?? fix.at)) / 1000;
  const reachM = REACH_SLACK_M + (MAX_MPH[activity] * M_PER_MI * sinceS) / 3600;
  const aheadM = Math.min(WINDOW_AHEAD_M, reachM);
  // Ahead of the high-water mark, not just of progress: past an out-and-back's turn the return spot is
  // ahead of the mark, and it has to be IN the window to be chosen (see `pickLeg`).
  const win = projectionCandidates(g, fix, s.progressM - WINDOW_BACK_M, Math.max(s.progressM, s.bestM) + aheadM);
  const leg = pickLeg(win, s.progressM, s.bestM);
  let offBy = leg?.distM ?? Number.POSITIVE_INFINITY;
  if (leg != null && leg.distM <= OFF_COURSE_M) {
    s.progressM = leg.alongM;
    s.bestM = Math.max(s.bestM, leg.alongM);
    s.lastMatchAt = fix.at;
  } else if (!vague && fix.at - (s.lastMatchAt ?? s.startedAt ?? fix.at) >= REJOIN_AFTER_MS) {
    const back = rejoin(g, fix, s.progressM);
    if (back != null) {
      s.progressM = back.alongM;
      s.bestM = back.alongM; // a rejoin re-anchors: the old mark belongs to where they left
      s.lastMatchAt = fix.at;
      offBy = back.distM;
    }
  }

  // ── off course, with hysteresis ──
  if (!vague) {
    s.offByM = offBy;
    if (offBy > OFF_COURSE_M) {
      s.farStreak = prev.farStreak + 1;
      s.nearStreak = 0;
    } else if (offBy < ON_COURSE_M) {
      s.nearStreak = prev.nearStreak + 1;
      s.farStreak = 0;
    } else {
      // The dead band: neither streak survives a reading that can't decide.
      s.farStreak = 0;
      s.nearStreak = 0;
    }
    if (!s.offCourse && s.farStreak >= OFF_COURSE_FIXES) {
      s.offCourse = true;
      s.offAnnounced = false;
    } else if (s.offCourse && s.nearStreak >= ON_COURSE_FIXES) {
      s.offCourse = false;
      if (s.offAnnounced) events.push({ type: 'back-on-course' });
      s.offAnnounced = false;
    }
  }
  // One alert per `ALERT_MIN_GAP_MS` across the run. A spell held back by the limit is announced once the
  // gap has passed, if the athlete is still off by then.
  if (s.offCourse && !s.offAnnounced && (s.lastAlertAt == null || fix.at - s.lastAlertAt >= ALERT_MIN_GAP_MS)) {
    s.offAnnounced = true;
    s.lastAlertAt = fix.at;
    events.push({ type: 'off-course', distM: Math.round(s.offByM ?? offBy) });
  }

  // ── cues ──
  // Nothing is consumed while off course: the turn they need to rejoin by must still be there to say
  // when they are back. Once on course, every cue passed is consumed, but only the latest can be
  // spoken, and only if its turn is still ahead — the rest are stale and go without a word.
  if (!s.offCourse) {
    const lead = cueLeadM(activity);
    let due: number | null = null;
    while (s.nextCue < course.cues.length && s.progressM >= course.cues[s.nextCue].atM - lead) {
      due = s.nextCue;
      s.nextCue++;
    }
    if (due != null) {
      const cue = course.cues[due];
      const aheadM = cue.atM - s.progressM;
      if (aheadM >= 0) events.push({ type: 'cue', cue, index: due, aheadM });
    }
  }

  // ── finish ──
  if (
    !s.complete &&
    s.progressM >= FINISH_FRACTION * g.lengthM &&
    distM(fix, g.points[g.points.length - 1]) <= FINISH_RADIUS_M
  ) {
    s.complete = true;
    events.push({ type: 'complete' });
  }

  return { state: s, events, rejected: null };
}

/** Run a whole track through the follower — for the background task's batch, and for replaying a run. */
export function replayFollow(
  course: FollowCourse,
  fixes: readonly CourseFix[],
  activity: ActivityKind,
  from: FollowState = initialFollow(),
): { state: FollowState; events: (FollowEvent & { at: number })[] } {
  let state = from;
  const events: (FollowEvent & { at: number })[] = [];
  for (const f of fixes) {
    const r = stepFollow(course, state, f, activity);
    state = r.state;
    for (const e of r.events) events.push({ ...e, at: f.at });
  }
  return { state, events };
}

export interface CourseProgress {
  /** 0–1 of the course covered — the "course 62%" line. Goal progress stays on MEASURED distance (`goalProgress`). */
  fraction: number;
  doneM: number;
  remainingM: number;
  /** The next cue that has not fired, and how far ahead its turn is — the "↱ Oak St · 400 ft" strip. */
  nextCue: Cue | null;
  nextCueInM: number | null;
}

export function courseProgress(course: FollowCourse, state: FollowState): CourseProgress {
  const len = course.geom.lengthM;
  const doneM = Math.max(0, Math.min(len, state.progressM));
  // The strip shows the next turn still ahead, including one already spoken but not yet reached.
  const next = course.cues.find((c) => c.atM >= doneM) ?? null;
  return {
    fraction: len > 0 ? doneM / len : 0,
    doneM,
    remainingM: len - doneM,
    nextCue: next,
    nextCueInM: next ? next.atM - doneM : null,
  };
}

/** Nearest-point distance to the whole course — for a start-point check before the run ("you're 300 m away"). */
export const distanceToCourseM = (course: FollowCourse, p: { lat: number; lon: number }): number =>
  projectOnto(course.geom, p)?.distM ?? Number.POSITIVE_INFINITY;
