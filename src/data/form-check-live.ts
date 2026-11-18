import type { ImagePickerAsset } from 'expo-image-picker';

import { supabase } from '@/lib/supabase';
import { ensureConsent, NO_AI_CONSENT, type NoAiConsent } from '@/lib/consent';
import { invokeAi, reportAiCall } from '@/lib/ai-invoke';
import { refundedResult, serverSaysNoConsent, type Refundable } from '@/domain/ai/ai-call';
import {
  capFrames,
  FORM_ACTION,
  FORM_CLIP_SECONDS,
  FORM_FRAME_COMPRESS,
  FORM_FRAME_MAX_EDGE,
  FORM_FRAMES_MIN,
  FORM_LIFT_CHARS,
  FORM_NOTE_CHARS,
  type FormFocus,
  type FormLast,
} from '@/domain/coach/form-check';
import type { PoseFacts, PoseTag } from '@/domain/coach/pose/pose-facts';
import { densePoseFrames } from '@/domain/coach/pose/pose-frames';
import { analysePose, measureFacts, type PoseAnalysis, type PoseLevel } from '@/domain/coach/pose/pose-measure';
import { anchorAt, pickStillAthlete } from '@/domain/coach/pose/pose-track';
import { repSpans, type RepSpan } from '@/domain/coach/pose/pose-rep-view';
import type { PoseTrack } from '@/domain/coach/pose/joints';
import {
  formClipNotice,
  formFrameCount,
  formResultFrom,
  frameTimestamps,
  trimWindow,
  type FormCheckResult,
} from '@/domain/coach/form-check-view';
import { grabFrame, probeDurationMs, videoFramesAvailable } from '@/lib/video-frames';
import { bodyPoseAvailable, cancelPose, detectPose, poseFps, trackPose } from '@/lib/body-pose';

/**
 * FORM CHECK — the device half.
 *
 * An athlete films a set; this turns the clip into a handful of stills and calls the `coach-form-check`
 * Edge Function, which holds the API key, does the metering, and answers with Holt's read of the
 * TECHNIQUE. In the order `Coach Holt Form Check.dc.html` uses them:
 *
 *   · `formCheckAvailable()`  — whether this build can pull frames out of a video at all.
 *   · `fetchFormQuote()`      — 01's "Uses 6 of your N AI credits this month".
 *   · `pickFormVideo(pick)`   — the clip, through the app's one camera-or-library path.
 *   · `filmstrip(...)`        — 02's scrubber thumbnails.
 *   · `framesFromVideo(...)`  — the stills across the trimmed window; 03 shows them land. On a build with
 *                               body tracking (10+), the reps are found on the phone first and the dense stills
 *                               are tagged with each rep's key moments (`densePoseFrames`, Sprint 2 FC-1 —
 *                               before it, 6–10 hand-picked moments; `Docs/Form-Check-Body-Pose-Build-Plan.md`).
 *   · `formCheck(...)`        — the read (04).
 *
 * Every rule about how many frames, which moments, how big and what is allowed back lives in
 * `src/domain/coach/form-check.ts`, which the Edge Function imports too. The pixels come from
 * `src/lib/video-frames` (a native and a web half). This file only does I/O.
 *
 * ⚠ **NOTHING HERE HOLDS A KEY.** Same rule as `program-photo-live.ts` and `coach-ask-live.ts`: the Edge
 * Function is the only place Anthropic is called from, because Expo inlines `EXPO_PUBLIC_*` into the
 * bundle and a key in a repo is a key that is gone.
 *
 * ⚠ **AND NOTHING HERE THROWS.** Every failure is a value the screen has copy for.
 */

/** Whether this build can read a video. False on build 8 (no native module); true on build 9 and web. */
export function formCheckAvailable(): boolean {
  return videoFramesAvailable();
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The credit line
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

export interface FormQuote {
  allowed: boolean;
  cost: number;
  remaining: number;
  allowance: number;
}

/**
 * What a read costs and what is left, WITHOUT spending (`coach_ai_quote`, 0221). The weight lives in
 * `coach_ai_config` (MA3-D16), so the screen never states a number of its own.
 *
 * ⚠ FAILS TO `null`, NOT TO ZERO — the rule `fetchCoachAiBalance` states: a failed read is not an athlete
 * who is out. Also null before 0221 is pasted; the screen then simply omits the line.
 */
export async function fetchFormQuote(): Promise<FormQuote | null> {
  try {
    const { data, error } = await supabase.rpc('coach_ai_quote', { p_action: FORM_ACTION }).maybeSingle();
    if (error || !data) return null;
    const d = data as FormQuote;
    return { allowed: !!d.allowed, cost: d.cost, remaining: d.remaining, allowance: d.allowance };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The clip
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** The chooser this file borrows: `useMediaPicker().pick`, passed in because a hook cannot be called here. */
export type MediaPick = (config: {
  kind: 'videos';
  title?: string;
  hint?: string;
  videoMaxDuration?: number;
  localOnly?: boolean;
  directCamera?: boolean;
  directLibrary?: boolean;
}) => Promise<ImagePickerAsset | null>;

export type FormVideo =
  | {
      kind: 'ok';
      uri: string;
      /** From the picker (or probed, on the web); null when nothing could tell. */
      durationMs: number | null;
      /** Said on the trim screen when the clip is longer than the window a read can cover. */
      notice: string | null;
    }
  /** They backed out, or the permission was refused. `useMediaPicker` has already said so in a toast. */
  | { kind: 'cancelled' }
  /** This build cannot read a video (see `formCheckAvailable`). Not a failure of the clip. */
  | { kind: 'unavailable' }
  /** The picker handed back something that is not a video. */
  | { kind: 'not_a_video' };

/**
 * The clip, through `useMediaPicker` — the app's ONE camera-or-library path (`project_media_capture_picker`).
 * `source` is which of design 01's two buttons was pressed, so no chooser sheet appears in between.
 *
 * `videoMaxDuration` asks the CAMERA for {@link FORM_CLIP_SECONDS}, a real limit on a clip being recorded
 * now. A clip from the library can be any length; the trim screen then covers at most that much of it.
 * `localOnly` is what makes that true: the clip is only read here, never uploaded, so the picker neither caps a
 * library clip's length nor transcodes it.
 */
export async function pickFormVideo(pick: MediaPick, source: 'camera' | 'library'): Promise<FormVideo> {
  if (!formCheckAvailable()) return { kind: 'unavailable' };
  let asset: ImagePickerAsset | null = null;
  try {
    asset = await pick({
      kind: 'videos',
      title: 'Form check',
      hint: 'Film one set from any angle, whole body in frame.',
      videoMaxDuration: FORM_CLIP_SECONDS,
      localOnly: true,
      directCamera: source === 'camera',
      directLibrary: source === 'library',
    });
  } catch {
    return { kind: 'cancelled' };
  }
  if (!asset?.uri) return { kind: 'cancelled' };
  // `type` is absent on some web picks; only an explicit 'image' is a wrong file.
  if (asset.type === 'image') return { kind: 'not_a_video' };

  let durationMs = typeof asset.duration === 'number' && asset.duration > 0 ? asset.duration : null;
  if (durationMs == null) durationMs = await probeDurationMs(asset.uri);
  return { kind: 'ok', uri: asset.uri, durationMs, notice: formClipNotice(durationMs) };
}

/**
 * The trim screen's filmstrip (design 02): `count` small stills spread across the whole clip, as local
 * URIs, in order. Missing frames come back as null so the strip keeps its slots.
 */
export async function filmstrip(uri: string, durationMs: number | null, count = 8): Promise<(string | null)[]> {
  const dur = durationMs && durationMs > 0 ? durationMs : FORM_CLIP_SECONDS * 1000;
  const out: (string | null)[] = [];
  for (let i = 0; i < count; i += 1) {
    const f = await grabFrame(uri, (dur / count) * (i + 0.5), 160, 0.6, false);
    out.push(f?.uri ?? null);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The frames
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** The stills, the moment each came from, and a local URI for each so the screen can show them. */
export interface FormFrames {
  frames: string[];
  /** Milliseconds into the clip, one per frame, same order. */
  times: number[];
  /** Local (native) or data (web) URIs, one per frame — for design 03's strip and 04's marked frame. */
  uris: string[];
  /** `[width, height]` of each frame as sent, so Holt's marks can come back in pixels. */
  sizes: [number, number][];
  /** Body tracking's part, or null on a build without it (build 9, the web) — then nothing changes. */
  pose: FormPose | null;
}

/**
 * What body tracking contributed to one read (plan §8). `level` is `off` when the module is there but
 * could not help (ambiguous people, athlete not readable, too slow) — the read is then exactly today's.
 */
export interface FormPose {
  level: PoseLevel;
  /** The measured numbers sent with the read — `full` only. */
  facts: PoseFacts | null;
  /**
   * The athlete's joints in each still (0–1), one per frame, for placing marks and the full-screen
   * skeleton. ⛔ Never sent, never stored (PO decision 3).
   */
  stills: (number[] | null)[];
  /**
   * Each rep's moments, ms into the clip — for the read's rep strip and its video timeline (PO 11-17). `[]` when
   * none were found. ⛔ Like `stills`: drawn, never sent, never stored.
   */
  reps: RepSpan[];
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The rep scan (the trim screen's ticks)
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** The most of a clip the trim screen scans for reps. Past it the ticks cover the start only. */
export const REP_SCAN_MAX_MS = 60_000;

/**
 * Body tracking over the clip as it opens on the trim screen (PO 11-17: "the clip opens already wrapped around your
 * reps, with Rep 1, 2, 3 marked"). It is the SAME dense pass a read runs, started early: when the trim the athlete
 * sends sits inside it and it sampled at least as finely as a pass over that trim would, the read slices it instead
 * of tracking again ({@link scanCovers}) — so the wait after Send gets shorter, not longer.
 */
export interface RepScan {
  uri: string;
  startMs: number;
  endMs: number;
  fps: number;
  track: PoseTrack;
  reps: RepSpan[];
}

/**
 * The span a scan covers, known before it finishes (the read decides with it whether to wait): the clip up to a
 * minute, or — a longer clip (PO's gym videos run over one; library clips reach the trim at any length, 11-17) — the
 * window the athlete has the handles on, at the density a read of that window would use.
 */
export function repScanSpan(durationMs: number | null, win?: { start: number; end: number } | null): { startMs: number; endMs: number; fps: number } {
  if (win && win.end > win.start) return { startMs: win.start, endMs: win.end, fps: poseFps(win.end - win.start) };
  const dur = durationMs && durationMs > 0 ? durationMs : FORM_CLIP_SECONDS * 1000;
  const endMs = Math.min(dur, REP_SCAN_MAX_MS);
  return { startMs: 0, endMs, fps: poseFps(endMs) };
}

/** Whether a scan can stand in for a fresh pass over `[start, end]`: it covers it, at least as densely. */
export function scanCovers(scan: { startMs: number; endMs: number; fps: number }, start: number, end: number): boolean {
  return scan.startMs <= start && scan.endMs >= end && scan.fps >= poseFps(end - start) - 1e-6;
}

/** The reps in a clip, or null (no body tracking on this build, nothing found, cancelled, too slow). Never throws. */
export async function scanReps(
  uri: string,
  durationMs: number | null,
  pattern: string | null,
  lift: string | null,
  win?: { start: number; end: number } | null,
): Promise<RepScan | null> {
  if (!bodyPoseAvailable() || !uri) return null;
  const span = repScanSpan(durationMs, win);
  try {
    const track = await trackPose(uri, span.startMs, span.endMs);
    if (!track) return null;
    const analysis = analysePose(track, pattern, lift);
    return { uri, ...span, track, reps: analysis.level === 'off' ? [] : repSpans(analysis.reps) };
  } catch {
    return null;
  }
}

export interface FrameOptions {
  durationMs?: number | null;
  /** The trim, in ms. Omitted = the whole clip, up to the window a read covers. */
  startMs?: number | null;
  endMs?: number | null;
  /** Called as each still lands, so design 03 can show them arrive one by one. */
  onFrame?: (uri: string, timeMs: number) => void;
  /** Checked between stills; true stops the work (design 03's Cancel). */
  cancelled?: () => boolean;
  /** The exercise's catalogue `movementPattern` and name: which signal body tracking watches. */
  pattern?: string | null;
  lift?: string | null;
  /** The trim screen's scan of this clip — sliced instead of tracking again when it covers the trim (`scanCovers`). */
  scan?: RepScan | null;
}

/**
 * The stills across the trimmed window, in time order. `frames: []` when there is no usable read.
 *
 * Evenly spaced — ~3 a second, the PO's 09-29 density — and, when this build has body tracking and it found clean
 * reps, the still nearest each rep's key moment is moved onto it and tagged (`densePoseFrames`, Sprint 2 FC-1:
 * the hand-picked 6–10 undid the density). `detect()` runs on the very JPEGs that are sent, so the joints drawn are
 * the joints of the image Holt and the athlete see. Any failure along that path is the `off` level — even frames.
 *
 * ⚠ SEQUENTIAL, NOT `Promise.all`. Each still decodes a video frame into a full-resolution bitmap; ten of
 * those in flight at once on a 4K clip is a lot of native memory for no wall-clock gain.
 *
 * ⚠ NEVER THROWS, and never returns fewer frames than the function accepts: a partial read is refused
 * here rather than sent.
 */
export async function framesFromVideo(uri: string, opts: FrameOptions = {}): Promise<FormFrames> {
  const none: FormFrames = { frames: [], times: [], uris: [], sizes: [], pose: null };
  if (!formCheckAvailable() || !uri) return none;
  const dur = opts.durationMs && opts.durationMs > 0 ? opts.durationMs : FORM_CLIP_SECONDS * 1000;
  const { start, end } = trimWindow(dur, opts.startMs, opts.endMs);
  const count = formFrameCount(end - start);

  // ── Body tracking, when this build has it ────────────────────────────────────
  let wanted = frameTimestamps(dur, count, start, end);
  let wantedTags: (PoseTag | null)[] = wanted.map(() => null);
  let analysis: PoseAnalysis | null = null;
  const tracking = bodyPoseAvailable();
  if (tracking) {
    const scan = opts.scan && opts.scan.uri === uri && scanCovers(opts.scan, start, end) ? opts.scan : null;
    const track = scan
      ? { ...scan.track, frames: scan.track.frames.filter((f) => f.t >= start && f.t <= end) }
      : await trackPose(uri, start, end);
    if (opts.cancelled?.()) return none;
    analysis = analysePose(track, opts.pattern, opts.lift);
    if (analysis.level === 'full') {
      // FC-1 (Sprint 2): the dense frames stay; the ones on a rep's moment are nudged onto it and tagged.
      const dense = densePoseFrames(wanted, analysis.reps);
      if (dense.times.length >= FORM_FRAMES_MIN && dense.tags.some(Boolean)) {
        wanted = dense.times;
        wantedTags = dense.tags;
      } else {
        // Reps, but no frame landed on one of their moments: coach from even frames, still snap the marks.
        analysis = { ...analysis, level: 'marks' };
      }
    }
  }

  const out: string[] = [];
  const at: number[] = [];
  const uris: string[] = [];
  const sizes: [number, number][] = [];
  const tags: (PoseTag | null)[] = [];
  for (let i = 0; i < wanted.length; i += 1) {
    const timeMs = wanted[i];
    if (opts.cancelled?.()) return none;
    const f = await grabFrame(uri, timeMs, FORM_FRAME_MAX_EDGE, FORM_FRAME_COMPRESS, true);
    if (f?.base64) {
      out.push(f.base64);
      at.push(timeMs);
      uris.push(f.uri);
      sizes.push([f.width, f.height]);
      tags.push(wantedTags[i] ?? null);
      opts.onFrame?.(f.uri, timeMs);
    }
  }
  // The same narrowing the function runs on the way in. It keeps order and only ever cuts from the end,
  // so the times and URIs are cut to match.
  const frames = capFrames(out) ?? [];
  const kept = frames.length;
  const base = { frames, times: at.slice(0, kept), uris: uris.slice(0, kept), sizes: sizes.slice(0, kept) };
  if (!tracking) return { ...base, pose: null };
  if (!analysis || analysis.level === 'off' || !kept) return { ...base, pose: { level: 'off', facts: null, stills: base.uris.map(() => null), reps: [] } };

  // The joints of the exact stills, the athlete picked in each by where the dense pass last saw them.
  const detected = await detectPose(base.uris);
  if (opts.cancelled?.()) return none;
  const series = analysis.series;
  const stills = base.uris.map((_, i) => pickStillAthlete(detected?.[i] ?? null, series ? anchorAt(series, base.times[i]) : null));
  return { ...base, pose: { level: analysis.level, facts: measureFacts(analysis, tags.slice(0, kept)), stills, reps: repSpans(analysis.reps) } };
}

/** Stop body tracking mid-pass (design 03's Cancel). The frames loop stops on its own flag. */
export function cancelFormTracking(): void {
  cancelPose();
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The read
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

export interface FormRequest {
  lift: string;
  frames: string[];
  times?: number[];
  sizes?: [number, number][];
  note?: string;
  focus?: FormFocus[];
  /** The lift's coaching notes (`knownFromCoaching`), when it is a catalogue exercise. */
  known?: string;
  /** The last saved read of this lift, for the trend. */
  last?: FormLast | null;
  /** What body tracking measured (build 10+, `full` only). Numbers and fixed words; the function re-narrows it. */
  pose?: PoseFacts | null;
}

/**
 * Holt's read of the set.
 *
 * ⚠ THE MEDICAL GUARD IS THE FUNCTION'S, NOT THIS FILE'S. `medicalRoute()` runs server-side on the lift
 * and the note before anything is quoted or the model is called, so a note that mentions pain stops the
 * whole thing and comes back as `{ kind: 'stopped', route }`.
 *
 * ⚠ NEVER THROWS. `offline` is the app failing, `unavailable` is the server failing, `unreadable` is a
 * read we genuinely could not get out of those frames (and was not charged for).
 *
 * ⏱ 90 s (contract §3), aborted when `signal` fires (the screen closed). Failures are reported (P-G1); a refund
 * rides on the result.
 */
export async function formCheck(req: FormRequest, signal?: AbortSignal): Promise<Refundable<FormCheckResult> | NoAiConsent> {
  const cleanLift = (req.lift ?? '').replace(/\s+/g, ' ').trim().slice(0, FORM_LIFT_CHARS);
  const cleanNote = (req.note ?? '').replace(/\s+/g, ' ').trim().slice(0, FORM_NOTE_CHARS);
  if (!cleanLift) return { kind: 'bad_frames' };
  if (!formCheckAvailable()) return { kind: 'unavailable_here' };

  const capped = capFrames(req.frames);
  // Refused by the function before any model call; saying so here saves the round trip.
  if (!capped) return { kind: 'bad_frames' };

  /* Consent before sharing (MHMDA / Nevada SB 370): nothing goes to the AI provider without a stored yes. */
  if (!(await ensureConsent('ai_sharing'))) return NO_AI_CONSENT;
  const a = await invokeAi(
    'coach-form-check',
    {
      lift: cleanLift,
      frames: capped,
      times: req.times?.slice(0, capped.length),
      sizes: req.sizes?.slice(0, capped.length),
      note: cleanNote || undefined,
      focus: req.focus?.length ? req.focus : undefined,
      known: req.known || undefined,
      last: req.last ?? undefined,
      pose: req.pose ?? undefined,
    },
    { signal },
  );
  if (serverSaysNoConsent(a)) return NO_AI_CONSENT;

  /*
   * ⚠ A NON-2xx IS NOT "OFFLINE" — the bug `program-photo-live.ts` records in the same place. The
   * function answers `bad_request` with a 400 and `unconfigured` / `meter_unavailable` /
   * `upstream_error` with a 503, and `functions.invoke` hands every one of those back as an `error`
   * with `data` null. The body is still there, on the error's `context` (the Response) — `invokeAi` reads
   * it; only a request that never got an answer is offline.
   */
  const r = ((): FormCheckResult => {
    if (a.offline || a.cancelled) return { kind: 'offline' };
    if (a.timedOut) return { kind: 'unavailable' };
    if (!a.body) return a.status === 200 ? { kind: 'offline' } : { kind: 'unavailable' };
    return formResultFrom(a.body, cleanLift, capped.length);
  })();
  /* A code-guard stop is the guard working, not a failure. */
  if (r.kind === 'ok' || r.kind === 'stopped') return r;
  /* So are the age floor and the output scan (Sprint 2): not reported, and their refund rides on the result. */
  if (r.kind === 'held' || r.kind === 'under_18' || r.kind === 'age_unknown') return refundedResult(r, a);
  reportAiCall(a, r.kind);
  return refundedResult(r, a);
}
