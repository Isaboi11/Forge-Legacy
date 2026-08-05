/**
 * image-downscale-core — the sizing rule, with no I/O, so `node --test` can run it.
 *
 * Every photo in this app used to upload at full camera resolution: an iPhone shoots 4032 × 3024, and
 * the picker's `quality` only re-encodes the JPEG — it never changes the pixel count. That is roughly
 * 3 MB a photo to store forever, to render a picture that is never displayed above ~1200 px on the
 * widest surface in the app. Capping the long edge at 1600 px is invisible on a phone and cuts the
 * stored bytes by something like 8×, which is the difference between storage being a rounding error
 * and storage being the bill.
 *
 * 1600 rather than 1200: the Transformation Gallery's compare view puts two photos side by side and a
 * 3× phone screen can ask for more than the single-photo case, so this leaves headroom rather than
 * sitting exactly on the requirement.
 *
 * The rule lives here and the file I/O lives in `useMediaPicker`, which is the app's ONLY capture path.
 */

/** Longest edge, in pixels, that an uploaded photo is allowed to keep. */
export const MAX_EDGE = 1600;

/** JPEG quality for the re-encode. The resize is where the bytes go; this only stops it compounding. */
export const DOWNSCALE_COMPRESS = 0.85;

export interface Size {
  width: number;
  height: number;
}

/**
 * The box to resize into, or `null` when the image should be left exactly as it is.
 *
 * `null` covers two different cases on purpose, and both mean "don't touch it": the image is already
 * within the cap (re-encoding it would cost quality and save nothing), or its dimensions are unknown /
 * nonsensical, in which case guessing is worse than passing the original through.
 */
export function downscaleTarget(width: unknown, height: unknown, maxEdge: number = MAX_EDGE): Size | null {
  if (typeof width !== 'number' || typeof height !== 'number') return null;
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width <= 0 || height <= 0) return null;
  if (!Number.isFinite(maxEdge) || maxEdge <= 0) return null;

  const longest = Math.max(width, height);
  if (longest <= maxEdge) return null;

  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
