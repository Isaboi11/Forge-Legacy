import { Video, getVideoMetaData } from 'react-native-compressor';

import {
  COMPRESS_BITRATE,
  COMPRESS_MAX_SIZE,
  keepCompressed,
  savingsText,
  shouldCompress,
} from './video-compress-core';

/**
 * Shrink a picked video before anybody tries to upload it — native.
 *
 * ══ WHY THIS IS ON THE DEVICE AND NOT ON A SERVER ══
 *
 * The wall is hit DURING the upload. A 120 MB clip is refused by the client's own pre-flight guard and,
 * if that were removed, by the bucket's 50 MB `file_size_limit`. Server-side transcoding cannot help
 * with a file that never arrives — it would need the cap raised first, and the athlete would still spend
 * two minutes pushing 120 MB over a gym's wifi to produce a 5 MB clip. Compressing first fixes the
 * refusal, the wait, and the playback, in that order.
 *
 * The cost is a native module, which means **a new build — this cannot ship over the air.**
 *
 * ══ FAILURE RETURNS THE ORIGINAL, ALWAYS ══
 *
 * Same principle as `downscalePhoto`, and it matters more here: losing an athlete's check-in to a
 * storage optimisation would be a far worse outcome than uploading one clip at full size. Every failure
 * path — the module throwing, a metadata read failing, an output that came back bigger — resolves to the
 * URI that came in. The upload guard downstream is still there to catch the ones that stay too large,
 * and its message already tells the athlete what to do.
 */

export interface CompressResult {
  uri: string;
  /** True when the returned URI is a NEW file — the caller must not reuse the original's `fileSize`. */
  compressed: boolean;
  /** Human-readable summary, or null when nothing was done. */
  savings: string | null;
}

async function sizeOf(uri: string): Promise<number | null> {
  try {
    const meta = await getVideoMetaData(uri);
    return typeof meta?.size === 'number' && meta.size > 0 ? meta.size : null;
  } catch {
    return null;
  }
}

/**
 * @param onProgress 0→1. Called often; the caller is expected to throttle its own rendering.
 */
export async function compressVideoForUpload(
  asset: { uri: string; type?: string | null; fileSize?: number | null },
  onProgress?: (progress: number) => void,
): Promise<CompressResult> {
  const decision = shouldCompress(asset);
  if (!decision.compress) return { uri: asset.uri, compressed: false, savings: null };

  try {
    /*
     * `manual`, not `auto`. The library's auto mode picks its own target from the source dimensions,
     * which is fine in general and wrong here: a check-in has one destination — a feed card on a phone,
     * behind a 50 MB ceiling — so the output size is a product decision, not something to infer from
     * whatever the athlete's camera happened to be set to.
     */
    const outUri = await Video.compress(
      asset.uri,
      { compressionMethod: 'manual', maxSize: COMPRESS_MAX_SIZE, bitrate: COMPRESS_BITRATE },
      (p) => onProgress?.(p),
    );
    if (!outUri) return { uri: asset.uri, compressed: false, savings: null };

    const before = asset.fileSize ?? (await sizeOf(asset.uri));
    const after = await sizeOf(outUri);

    if (!keepCompressed(before, after)) {
      // Re-encoding an already-efficient clip can produce a LARGER file. Keeping the original is the
      // honest answer, and it is why this branch exists rather than trusting the output.
      return { uri: asset.uri, compressed: false, savings: null };
    }
    return {
      uri: outUri,
      compressed: true,
      savings: before != null && after != null ? savingsText(before, after) : null,
    };
  } catch {
    return { uri: asset.uri, compressed: false, savings: null };
  }
}
