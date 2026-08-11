import type { CompressResult } from './video-compress';

/**
 * Video compression on the web — deliberately a no-op, and stated rather than faked.
 *
 * `react-native-compressor` is a Nitro module wrapping AVFoundation and MediaCodec. Neither exists in a
 * browser, and the only browser-side transcoders are multi-megabyte WASM builds of ffmpeg that would be
 * downloaded by every athlete on every page load to serve the minority of check-ins recorded on a
 * laptop. That is a worse trade than not compressing.
 *
 * ══ WHY THIS IS NOT A GAP ══
 *
 * The problem is a phone problem. A 4K60 clip out of a camera roll is what blows past the 50 MB ceiling;
 * a clip captured through a desktop browser's `getUserMedia` is a fraction of that, and web is not the
 * surface athletes check in from. When a web upload IS too large, the size guard in `storage-upload`
 * still catches it before the request and names the actual size — which is the same answer this file
 * would eventually reach, arrived at without downloading ffmpeg.
 *
 * ⚠ The mobile WEB preview at forgelegacy.expo.app therefore keeps the old behaviour. That is the
 * surface the PO tests on, so a check-in that fails there with "that clip is too large" is not evidence
 * the compression is broken — it is evidence it is native-only, which needs a new build to see.
 */
export async function compressVideoForUpload(
  asset: { uri: string; type?: string | null; fileSize?: number | null },
): Promise<CompressResult> {
  return { uri: asset.uri, compressed: false, savings: null };
}
