import type { ImagePickerAsset } from 'expo-image-picker';

import { supabase } from '@/lib/supabase';
import {
  capFrames,
  FORM_ACTION,
  FORM_CLIP_SECONDS,
  FORM_FRAME_COMPRESS,
  FORM_FRAME_MAX_EDGE,
  FORM_LIFT_CHARS,
  FORM_NOTE_CHARS,
  type FormFocus,
  type FormLast,
} from '@/domain/coach/form-check';
import {
  formClipNotice,
  formFrameCount,
  formResultFrom,
  frameTimestamps,
  trimWindow,
  type FormCheckResult,
} from '@/domain/coach/form-check-view';
import { grabFrame, probeDurationMs, videoFramesAvailable } from '@/lib/video-frames';

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
 *   · `framesFromVideo(...)`  — evenly spaced stills across the trimmed window; 03 shows them land.
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
}

/**
 * Evenly spaced stills across the trimmed window, in time order. `frames: []` when there is no usable read.
 *
 * ⚠ SEQUENTIAL, NOT `Promise.all`. Each still decodes a video frame into a full-resolution bitmap; ten of
 * those in flight at once on a 4K clip is a lot of native memory for no wall-clock gain.
 *
 * ⚠ NEVER THROWS, and never returns fewer frames than the function accepts: a partial read is refused
 * here rather than sent.
 */
export async function framesFromVideo(uri: string, opts: FrameOptions = {}): Promise<FormFrames> {
  const none: FormFrames = { frames: [], times: [], uris: [], sizes: [] };
  if (!formCheckAvailable() || !uri) return none;
  const dur = opts.durationMs && opts.durationMs > 0 ? opts.durationMs : FORM_CLIP_SECONDS * 1000;
  const { start, end } = trimWindow(dur, opts.startMs, opts.endMs);
  const count = formFrameCount(end - start);

  const out: string[] = [];
  const at: number[] = [];
  const uris: string[] = [];
  const sizes: [number, number][] = [];
  for (const timeMs of frameTimestamps(dur, count, start, end)) {
    if (opts.cancelled?.()) return none;
    const f = await grabFrame(uri, timeMs, FORM_FRAME_MAX_EDGE, FORM_FRAME_COMPRESS, true);
    if (f?.base64) {
      out.push(f.base64);
      at.push(timeMs);
      uris.push(f.uri);
      sizes.push([f.width, f.height]);
      opts.onFrame?.(f.uri, timeMs);
    }
  }
  // The same narrowing the function runs on the way in. It keeps order and only ever cuts from the end,
  // so the times and URIs are cut to match.
  const frames = capFrames(out) ?? [];
  return { frames, times: at.slice(0, frames.length), uris: uris.slice(0, frames.length), sizes: sizes.slice(0, frames.length) };
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
 */
export async function formCheck(req: FormRequest): Promise<FormCheckResult> {
  const cleanLift = (req.lift ?? '').replace(/\s+/g, ' ').trim().slice(0, FORM_LIFT_CHARS);
  const cleanNote = (req.note ?? '').replace(/\s+/g, ' ').trim().slice(0, FORM_NOTE_CHARS);
  if (!cleanLift) return { kind: 'bad_frames' };
  if (!formCheckAvailable()) return { kind: 'unavailable_here' };

  const capped = capFrames(req.frames);
  // Refused by the function before any model call; saying so here saves the round trip.
  if (!capped) return { kind: 'bad_frames' };

  try {
    const { data, error } = await supabase.functions.invoke('coach-form-check', {
      body: {
        lift: cleanLift,
        frames: capped,
        times: req.times?.slice(0, capped.length),
        sizes: req.sizes?.slice(0, capped.length),
        note: cleanNote || undefined,
        focus: req.focus?.length ? req.focus : undefined,
        known: req.known || undefined,
        last: req.last ?? undefined,
      },
    });

    /*
     * ⚠ A NON-2xx IS NOT "OFFLINE" — the bug `program-photo-live.ts` records in the same place. The
     * function answers `bad_request` with a 400 and `unconfigured` / `meter_unavailable` /
     * `upstream_error` with a 503, and `functions.invoke` hands every one of those back as an `error`
     * with `data` null. The body is still there, on the error's `context` (the Response); only a request
     * that never got an answer is offline.
     */
    let body: unknown = data;
    if (error) {
      const ctx = (error as { context?: unknown }).context;
      if (!(ctx instanceof Response)) return { kind: 'offline' };
      body = await ctx.json().catch(() => null);
      if (!body) return { kind: 'unavailable' };
    }
    if (!body) return { kind: 'offline' };

    return formResultFrom(body, cleanLift, capped.length);
  } catch {
    return { kind: 'offline' };
  }
}
