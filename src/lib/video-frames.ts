import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { downscaleTarget } from '@/lib/image-downscale-core';

/**
 * VIDEO FRAMES — one still out of a clip, on the device. The native half (`video-frames.web.ts` is the
 * browser's). Used by the form check (`src/data/form-check-live.ts`): the frames Holt reads, the trim
 * filmstrip, and the frame he marks.
 *
 * ══ ⚠ THE NATIVE MODULE IS OPTIONAL, AND THAT IS WHAT KEEPS AN OLDER BUILD ALIVE ══
 *
 * `expo-video-thumbnails` is a native module, so it exists only in a build made after it was added
 * (build 9). Importing the package would call `requireNativeModule`, which THROWS when the module is
 * absent — an OTA to build 8 would crash the screen on open. So the package is never imported: the module
 * is fetched with `requireOptionalNativeModule`, which returns `null` on a build without it, and
 * `videoFramesAvailable()` is false there. Same pattern as `hooks/useDictation.ts` and
 * `lib/watch-bridge.ts`.
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

/** Whether this build can read a video at all. Read from a handler or on mount, never during render. */
export function videoFramesAvailable(): boolean {
  return thumbnails != null;
}

/** A still: base64 JPEG for the wire (when asked for), a local `uri` for the screen, and its size. */
export interface VideoFrame {
  base64: string | null;
  uri: string;
  width: number;
  height: number;
}

/**
 * One frame at `timeMs`, downscaled so its long edge is at most `maxEdge`, re-encoded as JPEG. Null if the
 * decode or the re-encode failed — one bad frame is not a failed read, the caller carries on.
 *
 * `downscaleTarget` is the same sizing rule every photo in the app goes through (CA-D5, *"photos resized
 * on the device"*): a thumbnail comes out at the video's own resolution, 720p or 4K.
 */
export async function grabFrame(
  uri: string,
  timeMs: number,
  maxEdge: number,
  compress: number,
  withBase64: boolean,
): Promise<VideoFrame | null> {
  if (!thumbnails || !uri) return null;
  try {
    const shot = await thumbnails.getThumbnail(uri, { time: Math.max(0, Math.round(timeMs)), quality: 1 });
    const target = downscaleTarget(shot.width, shot.height, maxEdge);
    const context = ImageManipulator.manipulate(shot.uri);
    const rendered = await (target ? context.resize(target) : context).renderAsync();
    const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress, base64: withBase64 });
    return { base64: saved.base64 ?? null, uri: saved.uri, width: saved.width, height: saved.height };
  } catch {
    return null;
  }
}

/**
 * The clip's length, when the picker did not report one. Native pickers always do, so this only answers
 * on the web; here it is null and callers fall back to what the picker said.
 */
export async function probeDurationMs(_uri: string): Promise<number | null> {
  return null;
}
