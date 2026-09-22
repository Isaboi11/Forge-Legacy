import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';

import { supabase } from '@/lib/supabase';
import {
  capFrames,
  FORM_CLIP_SECONDS,
  FORM_FRAME_COMPRESS,
  FORM_FRAME_MAX_EDGE,
  FORM_FRAMES_DEFAULT,
  FORM_LIFT_CHARS,
  FORM_NOTE_CHARS,
  formClipNotice,
  formResultFrom,
  frameTimestamps,
  type FormCheckResult,
} from '@/domain/coach/form-check';
import { downscaleTarget } from '@/lib/image-downscale-core';

/**
 * FORM CHECK — the device half.
 *
 * An athlete films a set; this turns the clip into a handful of stills and calls the `coach-form-check`
 * Edge Function, which holds the API key, does the metering, and answers with Holt's read of the
 * TECHNIQUE. Four calls, in the order a screen uses them:
 *
 *   · `formCheckAvailable()`  — whether this build can pull frames out of a video at all.
 *   · `pickFormVideo(pick)`   — the clip, through the app's one camera-or-library path.
 *   · `framesFromVideo(...)`  — evenly spaced stills, downscaled, base64.
 *   · `formCheck(...)`        — the read.
 *
 * Every rule about how many frames, which moments, how big and what is allowed back lives in
 * `src/domain/coach/form-check.ts`, which the Edge Function imports too. This file only does I/O.
 *
 * ⚠ **NOTHING HERE HOLDS A KEY.** Same rule as `program-photo-live.ts` and `coach-ask-live.ts`: the Edge
 * Function is the only place Anthropic is called from, because Expo inlines `EXPO_PUBLIC_*` into the
 * bundle and a key in a repo is a key that is gone.
 *
 * ⚠ **AND NOTHING HERE THROWS.** This runs behind a button in a sheet the athlete may have a conversation
 * open in; an exception would take the sheet and their messages with it.
 *
 * ══ ⚠ THE NATIVE MODULE IS OPTIONAL, AND THAT IS WHAT KEEPS AN OLDER BUILD ALIVE ══
 *
 * `expo-video-thumbnails` is a native module, so it exists only in a build made after it was added.
 * Importing the package would call `requireNativeModule`, which THROWS when the module is absent — an OTA
 * to an older binary would crash the sheet on open. So the package is never imported: the module is
 * fetched with `requireOptionalNativeModule`, which returns `null` on a build without it, and
 * `formCheckAvailable()` is false there so the control simply does not render. Same pattern as
 * `hooks/useDictation.ts` and `lib/watch-bridge.ts`.
 *
 * ⚠ **AND IT IS FALSE ON THE WEB, WHICH IS THE SURFACE THE PO TESTS ON.** There is no browser
 * implementation of frame extraction in either Expo package, so a form check on `forgelegacy.expo.app` has
 * to say "this one is on your phone" rather than fail at the picker. `feedback_green_on_web_is_not_working
 * _on_device` is usually the other direction; this is the case where web genuinely cannot do it.
 */

/** The slice of `ExpoVideoThumbnails` this file uses. `getThumbnailAsync` is a one-line JS wrapper on it. */
interface NativeThumbnails {
  getThumbnail(
    sourceFilename: string,
    options: { time?: number; quality?: number },
  ): Promise<{ uri: string; width: number; height: number }>;
}

const thumbnails =
  Platform.OS === 'web' ? null : requireOptionalNativeModule<NativeThumbnails>('ExpoVideoThumbnails');

/**
 * Whether this build can read a video at all. Decides whether the form-check control renders.
 *
 * Read from an event handler or on mount, never during render — the react-compiler rules forbid the impure
 * read, the same way `canUseCamera()` in `useMediaPicker` is.
 */
export function formCheckAvailable(): boolean {
  return thumbnails != null;
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
}) => Promise<ImagePickerAsset | null>;

export type FormVideo =
  | {
      kind: 'ok';
      uri: string;
      /** From the picker; null when the platform did not report one. */
      durationMs: number | null;
      /**
       * What to tell the athlete before the read, or null. Non-null means the clip is longer than the
       * window and only its first {@link FORM_CLIP_SECONDS} seconds will be looked at.
       */
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
 *
 * Reused rather than reimplemented for the reasons that file's header gives at length: iOS refuses to
 * present a picker over a modal that is still dismissing, the chooser sheet and the system picker each
 * need their own wait, and the video is transcoded to 720p on the way out. A second picker in this file
 * would have to learn all of that again, and would be the one that forgot.
 *
 * ⚠ THE CALLER MUST CLOSE ITS OWN SHEET AND `await callerModalGone()` FIRST if it lives in a modal. Holt's
 * chat is a sheet, so this applies to it — the same rule the squad composer and Edit Identity follow.
 *
 * `videoMaxDuration` asks the CAMERA for ten seconds, which is a real limit on a clip that is being
 * recorded now. A clip chosen from the library can be any length, so the cap is applied by reading only
 * the first ten seconds and `notice` says so.
 */
export async function pickFormVideo(pick: MediaPick): Promise<FormVideo> {
  if (!formCheckAvailable()) return { kind: 'unavailable' };
  let asset: ImagePickerAsset | null = null;
  try {
    asset = await pick({
      kind: 'videos',
      title: 'Form check',
      hint: `Film one set from the side, whole body in frame. ${FORM_CLIP_SECONDS} seconds is plenty.`,
      videoMaxDuration: FORM_CLIP_SECONDS,
    });
  } catch {
    return { kind: 'cancelled' };
  }
  if (!asset?.uri) return { kind: 'cancelled' };
  // `type` is absent on some web picks; only an explicit 'image' is a wrong file.
  if (asset.type === 'image') return { kind: 'not_a_video' };

  const durationMs = typeof asset.duration === 'number' && asset.duration > 0 ? asset.duration : null;
  return { kind: 'ok', uri: asset.uri, durationMs, notice: formClipNotice(durationMs) };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The frames
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** One still, downscaled and re-encoded, as base64 JPEG — or null if either step failed. */
async function frameAt(uri: string, timeMs: number): Promise<string | null> {
  if (!thumbnails) return null;
  try {
    const shot = await thumbnails.getThumbnail(uri, { time: timeMs, quality: 1 });
    // CA-D5, *"photos resized on the device"*: a thumbnail comes out at the video's own resolution, which
    // on a modern phone is 720p or 4K. `downscaleTarget` is the same sizing rule every photo in the app
    // goes through, called with the smaller edge a model read needs (see `FORM_FRAME_MAX_EDGE`).
    const target = downscaleTarget(shot.width, shot.height, FORM_FRAME_MAX_EDGE);
    const context = ImageManipulator.manipulate(shot.uri);
    const rendered = await (target ? context.resize(target) : context).renderAsync();
    const saved = await rendered.saveAsync({
      format: SaveFormat.JPEG,
      compress: FORM_FRAME_COMPRESS,
      base64: true,
    });
    return saved.base64 ?? null;
  } catch {
    // One frame we could not decode is not a failed read — `framesFromVideo` carries on and the function
    // still gets the rest, as long as there are enough of them.
    return null;
  }
}

/**
 * Evenly spaced stills from the clip, in time order, as base64 JPEGs. `[]` when there is no usable read.
 *
 * `durationMs` is what the picker reported. When it is unknown the timestamps are spread across a
 * full-length window instead — see `frameTimestamps`, which also clamps the count and the window, so a
 * caller cannot ask for two frames or for a minute of video.
 *
 * ⚠ SEQUENTIAL, NOT `Promise.all`. Each thumbnail decodes a video frame into a full-resolution bitmap;
 * six of those in flight at once on a 4K clip is tens of megabytes of native memory for no wall-clock
 * gain, because the decode is what takes the time and it is not parallel on the device anyway.
 *
 * ⚠ NEVER THROWS, and never returns fewer frames than the function accepts: a partial read is refused
 * here rather than sent, so the athlete is not charged a credit for three frames that were all black.
 */
export async function framesFromVideo(
  uri: string,
  count: number = FORM_FRAMES_DEFAULT,
  durationMs?: number | null,
): Promise<string[]> {
  if (!thumbnails || !uri) return [];
  const out: string[] = [];
  for (const timeMs of frameTimestamps(durationMs, count)) {
    const frame = await frameAt(uri, timeMs);
    if (frame) out.push(frame);
  }
  // The same narrowing the function runs on the way in, so a short or oversized set is caught before the
  // round trip rather than after the credit.
  return capFrames(out) ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The read
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Holt's read of the set.
 *
 * ⚠ THE MEDICAL GUARD IS THE FUNCTION'S, NOT THIS FILE'S. `medicalRoute()` runs server-side on the lift
 * and the note before a credit is reserved or the model is called, so a note that mentions pain or an
 * injury stops the whole thing and comes back as `{ kind: 'stopped', route }` — which is also why this
 * file does not pre-filter the note: one classifier, on the side of the wire that cannot be skipped.
 *
 * ⚠ NEVER THROWS. Every failure is a `kind`, and an outage is never dressed up as a verdict on the clip
 * (brief §6): `offline` is the app failing, `unavailable` is the server failing, `unreadable` is a read we
 * genuinely could not get out of those frames.
 */
export async function formCheck(lift: string, frames: string[], note?: string): Promise<FormCheckResult> {
  const cleanLift = (lift ?? '').replace(/\s+/g, ' ').trim().slice(0, FORM_LIFT_CHARS);
  const cleanNote = (note ?? '').replace(/\s+/g, ' ').trim().slice(0, FORM_NOTE_CHARS);
  if (!cleanLift) return { kind: 'bad_frames' };
  if (!formCheckAvailable()) return { kind: 'unavailable_here' };

  const capped = capFrames(frames);
  // Refused by the function before any model call; saying so here saves the round trip and a credit.
  if (!capped) return { kind: 'bad_frames' };

  try {
    const { data, error } = await supabase.functions.invoke('coach-form-check', {
      body: { lift: cleanLift, frames: capped, note: cleanNote || undefined },
    });

    /*
     * ⚠ A NON-2xx IS NOT "OFFLINE" — the bug `program-photo-live.ts` records in the same place. The
     * function answers `bad_request` with a 400 and `unconfigured` / `meter_unavailable` /
     * `upstream_error` with a 503, and `functions.invoke` hands every one of those back as an `error`
     * with `data` null. Treated as offline, a request that was too big told the athlete to check their
     * connection. The body is still there, on the error's `context` (the Response); only a request that
     * never got an answer is offline.
     */
    let body: unknown = data;
    if (error) {
      const ctx = (error as { context?: unknown }).context;
      if (!(ctx instanceof Response)) return { kind: 'offline' };
      body = await ctx.json().catch(() => null);
      if (!body) return { kind: 'unavailable' };
    }
    if (!body) return { kind: 'offline' };

    return formResultFrom(body, cleanLift);
  } catch {
    return { kind: 'offline' };
  }
}
