/**
 * BODY POSE — which moments to send Holt. Plan §5.5, and AI Road to 10 Sprint 2 (FC-1 · audit V-D4).
 *
 * ══ DENSE, AND TAGGED (Sprint 2) ══
 *
 * The PO's 09-29 rule is ~3 stills a second, up to 40, so Holt can follow every rep (`FORM_FRAMES_PER_SECOND`). Build
 * 11's body tracking undid it: with reps found on the phone it sent 6–10 hand-picked moments instead
 * ({@link poseFrameChoice}), and the prompt still said the frames were a third of a second apart. Now
 * {@link densePoseFrames} keeps the dense, even frames and moves the one nearest each rep's key moment ONTO that
 * moment — the bottom first, then halfway up, the start, the end — and tags it ("rep 3 bottom"). Holt gets the
 * density AND the tags; the spacing he is told is computed from what was sent (`formSpacingLine`).
 *
 * {@link poseFrameChoice} (the 6–10 picks) stays for its tests and for a later "cheap read" option; the app no longer
 * sends it. With no reps (`marks` / `off`), the even frames go untagged, as before.
 */

import type { PoseAt, PoseTag } from './pose-facts.ts';
import type { Rep } from './pose-reps.ts';

export const POSE_FRAMES_MIN = 6;
export const POSE_FRAMES_MAX = 10;

/** Two picks closer than this are the same moment; the higher-priority one is kept. */
const SAME_MOMENT_MS = 120;

export interface PoseFrameChoice {
  /** Ms into the clip, ascending. */
  times: number[];
  /** Same order: which rep and moment each one is. */
  tags: PoseTag[];
}

/** Dense frames: one time per frame, ascending, and the tag of the frames that sit on a rep's moment. */
export interface PoseDenseFrames {
  times: number[];
  tags: (PoseTag | null)[];
}

/**
 * The even frames, with the frame nearest each rep's key moment moved onto it and tagged. A frame moves at most
 * half a frame-gap (never past a neighbour, so the order stays strictly ascending — `capFrameTimes` drops a list that
 * is not), and each frame takes at most one tag. Priority: every rep's bottom, then halfway back, then start and end
 * (an edge rep — one the clip opened on — has no start of its own). `times` are the app's own `frameTimestamps`.
 */
export function densePoseFrames(times: readonly number[], reps: readonly Rep[]): PoseDenseFrames {
  const out = times.map((t) => ({ ms: Math.round(t), tag: null as PoseTag | null }));
  const done = (): PoseDenseFrames => ({ times: out.map((o) => o.ms), tags: out.map((o) => o.tag) });
  if (out.length < 2 || !reps.length) return done();
  const gaps = out.slice(1).map((o, i) => o.ms - out[i].ms).sort((a, b) => a - b);
  const reach = Math.max(SAME_MOMENT_MS, gaps[Math.floor(gaps.length / 2)] / 2);
  const order: PoseAt[] = ['turn', 'mid', 'start', 'end'];
  const moments: { ms: number; tag: PoseTag }[] = [];
  for (const at of order) {
    reps.forEach((r, i) => {
      if (at === 'start' && r.edge) return;
      const ms = at === 'start' ? r.startMs : at === 'turn' ? r.turnMs : at === 'mid' ? r.midMs : r.endMs;
      if (Number.isFinite(ms)) moments.push({ ms, tag: { rep: i + 1, at } });
    });
  }
  for (const m of moments) {
    let best = -1;
    let dist = Infinity;
    for (let j = 0; j < out.length; j += 1) {
      if (out[j].tag) continue;
      const d = Math.abs(out[j].ms - m.ms);
      if (d < dist) {
        dist = d;
        best = j;
      }
    }
    if (best < 0 || dist > reach) continue;
    const ms = Math.round(m.ms);
    const prev = best > 0 ? out[best - 1].ms : -Infinity;
    const next = best + 1 < out.length ? out[best + 1].ms : Infinity;
    if (ms <= prev || ms >= next) continue;
    out[best] = { ms, tag: m.tag };
  }
  return done();
}

/** The moments to send, or null when there are no reps to choose from. `worst` is a 0-based rep index. */
export function poseFrameChoice(reps: Rep[], worst: number): PoseFrameChoice | null {
  if (!reps.length) return null;
  const at = (i: number, where: PoseAt): { ms: number; tag: PoseTag } | null => {
    const r = reps[i];
    if (!r) return null;
    // An edge rep opened at the extreme: it has no "start" of its own.
    if (where === 'start' && r.edge) return null;
    const ms = where === 'start' ? r.startMs : where === 'turn' ? r.turnMs : where === 'mid' ? r.midMs : r.endMs;
    return { ms, tag: { rep: i + 1, at: where } };
  };
  const last = reps.length - 1;
  const w = Math.min(Math.max(0, worst), last);
  const wanted = [
    at(0, 'start'),
    at(0, 'turn'),
    at(w, 'turn'),
    at(w, 'mid'),
    at(last, 'turn'),
    at(last, 'end'),
    ...reps.map((_, i) => at(i, 'turn')),
    ...reps.map((_, i) => at(i, 'mid')),
    at(0, 'end'),
  ];
  const kept: { ms: number; tag: PoseTag }[] = [];
  for (const c of wanted) {
    if (!c || kept.length >= POSE_FRAMES_MAX) continue;
    if (kept.some((k) => Math.abs(k.ms - c.ms) < SAME_MOMENT_MS)) continue;
    kept.push(c);
  }
  kept.sort((a, b) => a.ms - b.ms);
  return { times: kept.map((k) => Math.round(k.ms)), tags: kept.map((k) => k.tag) };
}
