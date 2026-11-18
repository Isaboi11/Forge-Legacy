/**
 * BODY POSE — what the athlete SEES of their reps (PO 2026-11-17, form check step 1: "see it in your video").
 *
 * The phone already finds every rep and measures it (`pose-measure.ts`), and until now only Holt saw the result.
 * This turns it into what the screens draw:
 *
 *   · the TRIM (design 02, "Later version"): a tick per rep, the window wrapped around the reps it found, and one
 *     rep on its own when its tick is tapped ("Just rep 3");
 *   · the READ (design 04, "Each rep, at the bottom"): one card per rep — the sent frame nearest its turnaround,
 *     what was measured, and a note on a rep that differs from the rest;
 *   · "Show me": where a slow replay starts before the moment Holt marked.
 *
 * ⛔ MOVEMENT ONLY (Body-Pose plan §7). Every word here is a fixed string about a position or a time — nothing
 * about risk, injury, a body or a load. The same vocabulary as `poseFactLines`, shorter.
 *
 * Pure: no React, no native module, `node --test` runs it as-is.
 */

import type { FormMark } from '../form-check.ts';
import type { PoseDepth, PoseFacts } from './pose-facts.ts';
import { snapMarks } from './pose-marks.ts';

/**
 * The working half of a rep, by kind: its tempo slot and its word — the same as `pose-facts.ts`'s `KIND_WORDS`
 * (`lift` and `phase[lift]`), held equal by a test. Kept here rather than exported from there because the
 * function's paste copy carries `pose-facts.ts`, and an app-only edit would make the deployed function look stale.
 */
export const WORK_PHASE: Record<PoseFacts['kind'], { slot: 0 | 2; word: string }> = {
  squat: { slot: 2, word: 'up' },
  hinge: { slot: 2, word: 'up' },
  bench: { slot: 2, word: 'up' },
  pushup: { slot: 2, word: 'up' },
  press: { slot: 2, word: 'up' },
  pull: { slot: 0, word: 'up' },
  row: { slot: 0, word: 'pull' },
  curl: { slot: 0, word: 'up' },
  extension: { slot: 0, word: 'extend' },
  auto: { slot: 2, word: 'back' },
};

/** A rep's moments, ms into the clip — all the screens need of `Rep`. */
export interface RepSpan {
  startMs: number;
  /** The bottom of a squat, the top of a pull-up: the rep's turnaround. */
  turnMs: number;
  endMs: number;
}

type Win = { start: number; end: number };

/** Room left each side when the trim wraps the reps, so the first descent and the last lockout are both in. */
export const REP_WRAP_PAD_MS = 600;
/** Room each side of one rep ("Just rep 3"). */
export const REP_ONE_PAD_MS = 300;
/** "Show me" starts this long before the marked moment… */
export const SHOW_ME_LEAD_MS = 1500;
/** …and plays at this speed, so 1.5 s of lifting takes ~3.75 s to watch. */
export const SHOW_ME_RATE = 0.4;

const isMs = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/** Reps narrowed to sane spans, in time order. Anything malformed is dropped, never repaired. */
export function repSpans(reps: readonly Partial<RepSpan>[] | null | undefined): RepSpan[] {
  if (!Array.isArray(reps)) return [];
  return reps
    .filter(
      (r): r is RepSpan =>
        !!r && isMs(r.startMs) && isMs(r.turnMs) && isMs(r.endMs) && r.startMs <= r.turnMs && r.turnMs <= r.endMs && r.endMs > r.startMs,
    )
    .map((r) => ({ startMs: r.startMs, turnMs: r.turnMs, endMs: r.endMs }))
    .sort((a, b) => a.startMs - b.startMs);
}

/** A window made valid: inside the clip, at least `minMs`, at most `maxMs` (a long one keeps its start). */
function fit(start: number, end: number, durMs: number, minMs: number, maxMs: number): Win {
  let s = Math.max(0, Math.min(start, durMs));
  let e = Math.max(0, Math.min(end, durMs));
  if (e - s < minMs) {
    const mid = (s + e) / 2;
    s = Math.max(0, mid - minMs / 2);
    e = Math.min(durMs, s + minMs);
    s = Math.max(0, e - minMs);
  }
  if (e - s > maxMs) e = s + maxMs;
  return { start: s, end: e };
}

/** The trim around every rep found, with a little room each side. Null with none. */
export function wrapReps(reps: readonly RepSpan[], durMs: number, minMs: number, maxMs: number): Win | null {
  if (!reps.length || !(durMs > 0)) return null;
  return fit(reps[0].startMs - REP_WRAP_PAD_MS, reps[reps.length - 1].endMs + REP_WRAP_PAD_MS, durMs, minMs, maxMs);
}

/** The trim around one rep ("Just rep 3"). */
export function oneRep(rep: RepSpan, durMs: number, minMs: number, maxMs: number): Win {
  return fit(rep.startMs - REP_ONE_PAD_MS, rep.endMs + REP_ONE_PAD_MS, durMs, minMs, maxMs);
}

/** How many reps a window holds — a rep counts when its turnaround is inside. */
export function repsInside(reps: readonly RepSpan[], w: Win): number {
  return reps.filter((r) => r.turnMs >= w.start && r.turnMs <= w.end).length;
}

/** Where a "Show me" replay starts for a moment at `atMs`: a little before it, never before the part Holt read. */
export function showMeFrom(atMs: number, windowStartMs: number): number {
  return Math.max(0, windowStartMs, atMs - SHOW_ME_LEAD_MS);
}

/** The rep strip's label: where each picture is in the rep, by the kind of lift (a pull-up's turnaround is its top). */
export function repStripLabel(kind: PoseFacts['kind'] | null | undefined): string {
  switch (kind) {
    case 'pull':
    case 'curl':
      return 'EACH REP, AT THE TOP';
    case 'row':
      return 'EACH REP, PULLED IN';
    case 'extension':
      return 'EACH REP, AT LOCKOUT';
    case 'auto':
    case null:
    case undefined:
      return 'EACH REP, AT THE TURN';
    default:
      return 'EACH REP, AT THE BOTTOM';
  }
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The read's rep cards
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

export interface RepCard {
  /** 1-based. */
  n: number;
  /** The sent frame nearest this rep's turnaround — the one tagged for it when there is one. */
  frame: number;
  atMs: number;
  /** What was measured, quiet: "Below parallel", "1.4 s up". */
  measured: string[];
  /** This rep against the rest, in bronze: "Shallower". '' when it is like the others. */
  note: string;
  /** The depth line (hip, with a knee tick) on this rep's frame, when depth is its note. */
  mark: FormMark | null;
}

const DEPTH_LABEL: Record<PoseDepth, string> = { below: 'Below parallel', level: 'At parallel', above: 'Above parallel' };
/** Deeper is lower. */
const DEPTH_ORDER: Record<PoseDepth, number> = { below: 0, level: 1, above: 2 };
/** The working half is "slowest" only when it is this much over the set's median — not a tenth of a second. */
const SLOW_OVER_MEDIAN = 1.35;

/** A rep-number list's note for rep `n` — only when it happened on SOME reps; on every rep it is the set, not an odd one. */
const onSome = (list: number[] | null, n: number, reps: number) => !!list && list.includes(n) && list.length < reps;

function mode(ds: PoseDepth[]): PoseDepth {
  const count = new Map<PoseDepth, number>();
  for (const d of ds) count.set(d, (count.get(d) ?? 0) + 1);
  let best: PoseDepth = ds[0];
  for (const [d, c] of count) if (c > (count.get(best) ?? 0)) best = d;
  return best;
}

function median(xs: number[]): number {
  const s = xs.slice().sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * One card per rep, for the read. Empty unless body tracking measured the set (`facts`, two reps or more) and the
 * reps line up with it. `times` / `stills` / `sizes` are the sent frames' (same order).
 */
export function repCards(
  facts: PoseFacts | null,
  reps: readonly RepSpan[],
  times: readonly number[],
  stills: readonly (number[] | null)[] = [],
  sizes: readonly ([number, number] | null)[] = [],
): RepCard[] {
  if (!facts || facts.reps < 2 || reps.length !== facts.reps || !times.length) return [];
  const { slot, word } = WORK_PHASE[facts.kind];
  const depths = (facts.depth ?? []).filter((d): d is PoseDepth => !!d);
  const usual = depths.length >= 2 ? mode(depths) : null;
  const work = reps.map((_, i) => facts.tempo?.[i]?.[slot] ?? null);
  const worked = work.filter((v): v is number => v != null);
  const slowAt = reps.length >= 3 && worked.length >= 3 ? work.indexOf(Math.max(...worked)) : -1;
  const slowIsOdd = slowAt >= 0 && (work[slowAt] as number) > SLOW_OVER_MEDIAN * median(worked);

  return reps.map((r, i) => {
    const n = i + 1;
    let frame = facts.frames.findIndex((f) => f?.rep === n && f.at === 'turn');
    if (frame < 0 || frame >= times.length) {
      frame = 0;
      for (let k = 1; k < times.length; k += 1) if (Math.abs(times[k] - r.turnMs) < Math.abs(times[frame] - r.turnMs)) frame = k;
    }

    const depth = facts.depth?.[i] ?? null;
    const tempo = work[i];
    const measured = [depth ? DEPTH_LABEL[depth] : '', tempo != null ? `${tempo.toFixed(1)} s ${word}` : ''].filter(Boolean);

    let note = '';
    if (depth && usual && DEPTH_ORDER[depth] > DEPTH_ORDER[usual]) note = 'Shallower';
    else if (onSome(facts.kneesIn, n, facts.reps)) note = 'Knees moved in';
    else if (onSome(facts.hipsFirst, n, facts.reps)) note = 'Hips rose first';
    else if (onSome(facts.lockoutShort, n, facts.reps)) note = 'Short of lockout';
    else if (onSome(facts.tilt, n, facts.reps)) note = 'Bar tilted';
    else if (onSome(facts.shift, n, facts.reps)) note = 'Hips shifted';
    else if (slowIsOdd && slowAt === i) note = `Slowest ${word}`;

    let mark: FormMark | null = null;
    if (note === 'Shallower' && stills[frame]) {
      const line: FormMark = { fix: -1, frame, kind: 'line', x: 0.5, y: 0.5, rep: n, shows: '', joint: 'left_hip' };
      const placed = snapMarks([line], stills as (number[] | null)[], sizes as ([number, number] | null)[])[0];
      // Only a line that found BOTH heights is drawn — a guessed one is worse than none.
      mark = typeof placed.tick === 'number' ? placed : null;
    }
    return { n, frame, atMs: r.turnMs, measured, note, mark };
  });
}
