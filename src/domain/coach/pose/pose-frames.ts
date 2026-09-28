/**
 * BODY POSE — which moments to send Holt. Plan §5.5.
 *
 * Today's read sends ten stills a second apart and hopes some land on a bottom. With the reps found on the
 * phone, the app sends the moments that carry the coaching instead: rep 1's top and bottom (the baseline),
 * the worst rep's bottom and halfway back (the fault), the last rep's bottom and top (where fatigue shows),
 * then other bottoms to fill. **6–10 frames**, in time order — fewer than today's 10–12, so cheaper too.
 *
 * With no reps (`marks` / `off`), the caller keeps today's even spacing (`frameTimestamps`).
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
