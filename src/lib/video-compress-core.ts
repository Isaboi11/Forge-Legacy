/**
 * video-compress-core — the decisions a video compression makes, with no native module in them.
 *
 * Split from `video-compress.ts` for the same reason `image-downscale-core` is split from the picker
 * and `storage-upload-core` from the upload: the rules are the part worth a test, and they cannot be
 * tested through a Nitro module that only exists on a device.
 *
 * ══ WHAT THIS EXISTS TO FIX ══
 *
 * PO review: *"Check ins take really long to load and it said that it was too big but I only did a 16
 * second video."*
 *
 * Both halves were one cause: **nothing in this stack transcoded video.** The app had exactly two
 * levers — a 30-second duration cap, and `videoQuality: IFrame1280x720`, which is iOS-only and applies
 * only to what the app RECORDS. A clip picked from the camera roll arrived at whatever the phone saved
 * it as, and a modern iPhone saves 4K60. Sixteen seconds of that is ~120 MB against a 50 MB ceiling
 * enforced at both the client (`MAX_CHECKIN_BYTES`) and the bucket (0122) — so the upload was refused,
 * and the ones that squeaked under the cap were slow to post and slow to play for everyone else.
 */

/**
 * The longest edge of a compressed check-in.
 *
 * 720p, matching the `videoQuality` already applied to in-app recording — so a clip recorded here and a
 * clip picked from the library finally end up the same size instead of differing by a factor of thirty.
 * A check-in is watched in a feed card on a phone; 4K buys nothing there and costs everything.
 */
export const COMPRESS_MAX_SIZE = 1280;

/**
 * Target bitrate. 2 Mbps at 720p is comfortably transparent for handheld gym footage — a form check is
 * a person moving in front of a static background, which is the easy case for an encoder.
 */
export const COMPRESS_BITRATE = 2_000_000;

/**
 * Below this, compressing is not worth the athlete's time.
 *
 * Transcoding costs seconds of staring at a spinner. A clip already under four megabytes uploads in one
 * breath and plays instantly, so the compression would buy latency nobody was waiting on and spend
 * latency they now are. The cap this protects is 50 MB — there is a lot of room between the two.
 */
export const COMPRESS_MIN_BYTES = 4 * 1024 * 1024;

export interface CompressDecision {
  compress: boolean;
  /** Why — surfaced in the caller's log line, and the thing a test asserts on. */
  reason: 'over-threshold' | 'size-unknown' | 'small-enough' | 'not-video';
}

/**
 * Should this asset be transcoded before upload?
 *
 * ⚠ AN UNKNOWN SIZE COMPRESSES. `ImagePicker` populates `fileSize` inconsistently — it is frequently
 * absent for videos on Android, and `downscalePhoto` deliberately clears it on the photo path. Skipping
 * on "unknown" would mean skipping exactly the case this feature exists for, because the enormous
 * library clip is the one most likely to arrive without a measurement. The cost of being wrong here is
 * a few seconds spent on a clip that did not need it; the cost of being wrong the other way is the
 * failed upload we started from.
 */
export function shouldCompress(asset: { type?: string | null; fileSize?: number | null }): CompressDecision {
  if (asset.type !== 'video') return { compress: false, reason: 'not-video' };
  if (asset.fileSize == null || !(asset.fileSize > 0)) return { compress: true, reason: 'size-unknown' };
  return asset.fileSize >= COMPRESS_MIN_BYTES
    ? { compress: true, reason: 'over-threshold' }
    : { compress: false, reason: 'small-enough' };
}

/**
 * Keep the compressed file, or throw it away and upload the original?
 *
 * ⚠ COMPRESSION CAN MAKE A FILE BIGGER, and this is not a hypothetical. Re-encoding something already
 * efficiently encoded — a clip that has been through a messaging app, or HEVC re-encoded to H.264 —
 * routinely produces a larger file. Taking the output on faith would mean a feature that shrinks the
 * huge clips and quietly inflates the small ones.
 *
 * A result is kept only when it is a MEANINGFUL improvement. Trading real quality for three per cent of
 * the bytes is a bad deal for the athlete, so the margin is 10%.
 */
export function keepCompressed(originalBytes: number | null | undefined, compressedBytes: number | null | undefined): boolean {
  if (compressedBytes == null || !(compressedBytes > 0)) return false;
  // Unknown original: the compressor ran and produced something, and we have nothing to compare against.
  // Take it — the whole reason the size is unknown is usually that the source was a library file, which
  // is the case most in need of this.
  if (originalBytes == null || !(originalBytes > 0)) return true;
  return compressedBytes <= originalBytes * 0.9;
}

/** "120 MB → 4.8 MB (96% smaller)" — the line written to the log, and shown if a caller wants it. */
export function savingsText(originalBytes: number, compressedBytes: number): string {
  const mb = (b: number) => `${Math.round((b / (1024 * 1024)) * 10) / 10} MB`;
  const pct = Math.max(0, Math.round((1 - compressedBytes / originalBytes) * 100));
  return `${mb(originalBytes)} → ${mb(compressedBytes)} (${pct}% smaller)`;
}
