import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

import { cleanPoseFrames, cleanPoseTrack, type PoseFrame, type PoseTrack } from '@/domain/coach/pose/joints';

/**
 * BODY POSE — the optional native half (`modules/body-pose`, `ForgeBodyPose`: Apple Vision's body pose on
 * the phone). `Docs/Form-Check-Body-Pose-Build-Plan.md` §3.
 *
 * ⚠ **OPTIONAL, AND THAT IS WHAT KEEPS BUILD 9 AND THE WEB ALIVE.** The module exists only in build 10 and
 * later. `requireOptionalNativeModule` returns `null` on an older binary and on the web, so
 * `bodyPoseAvailable()` is false there, every pose path is skipped, and the form check reads exactly as it
 * did before body tracking — the same shape as `label-scan.ts` and `video-frames.ts`. Never import the
 * module any other way.
 *
 * ⚠ **NOTHING HERE THROWS.** A track that fails, is cancelled or runs past {@link POSE_TIMEOUT_MS} is
 * `null`, which is the `off` fallback (plan §8) — never an error screen, never a charged read.
 *
 * What comes back is narrowed by `cleanPoseTrack` / `cleanPoseFrames` before anything uses it: a native
 * module is a peer, not a boundary.
 */

interface NativeBodyPose {
  track(uri: string, opts: { startMs: number; endMs: number; fps: number; maxPeople: number }): Promise<unknown>;
  detect(uris: string[]): Promise<unknown>;
  cancel(): void;
}

const native = Platform.OS === 'ios' ? requireOptionalNativeModule<NativeBodyPose>('ForgeBodyPose') : null;

/** The whole dense pass may take this long, then it is cancelled and the read falls back (plan §8, §11.3). */
export const POSE_TIMEOUT_MS = 20_000;

/** The most samples one pass decodes, whatever the window (plan §4). The Swift caps it too. */
export const POSE_MAX_SAMPLES = 300;

/** How many people per frame are asked for: the athlete plus whoever is behind them. */
const MAX_PEOPLE = 4;

/** Whether this build can track a body. Read from a handler or on mount, never during render. */
export function bodyPoseAvailable(): boolean {
  return native != null;
}

/** 15 fps for a trim of 10 s or less, else 10, and never more than {@link POSE_MAX_SAMPLES} samples. */
export function poseFps(windowMs: number): number {
  const secs = Math.max(0.5, windowMs / 1000);
  return Math.min(secs <= 10 ? 15 : 10, POSE_MAX_SAMPLES / secs);
}

/**
 * `work`, or null after `ms` — having asked the native pass to stop. The timer is cleared when the work
 * wins, so a late cancel can never land on the NEXT pass.
 */
async function withTimeout<T>(work: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      cancelPose();
      resolve(null);
    }, ms);
  });
  try {
    return await Promise.race([work, late]);
  } finally {
    clearTimeout(timer);
  }
}

/** The dense pass over the trimmed window, or null (no module, failed, cancelled, too slow). */
export async function trackPose(uri: string, startMs: number, endMs: number): Promise<PoseTrack | null> {
  if (!native || !uri || !(endMs > startMs)) return null;
  try {
    const raw = await withTimeout(
      native.track(uri, { startMs: Math.round(startMs), endMs: Math.round(endMs), fps: poseFps(endMs - startMs), maxPeople: MAX_PEOPLE }),
      POSE_TIMEOUT_MS,
    );
    return cleanPoseTrack(raw);
  } catch {
    return null;
  }
}

/** Joints on the exact stills that are sent and drawn, one entry per URI (null where one failed). */
export async function detectPose(uris: string[]): Promise<(PoseFrame | null)[] | null> {
  if (!native || !uris.length) return null;
  try {
    const raw = await withTimeout(native.detect(uris), POSE_TIMEOUT_MS / 2);
    if (!Array.isArray(raw) || raw.length !== uris.length) return null;
    // One entry per image, in order; each cleaned on its own so one bad still does not lose the rest.
    return raw.map((f) => cleanPoseFrames([f])[0] ?? null);
  } catch {
    return null;
  }
}

/** Stop a pass in flight (design 03's Cancel). Safe to call with nothing running. */
export function cancelPose(): void {
  try {
    native?.cancel();
  } catch {
    /* nothing to stop */
  }
}
