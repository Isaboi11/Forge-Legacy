import test from 'node:test';
import assert from 'node:assert/strict';

import {
  COMPRESS_MIN_BYTES,
  keepCompressed,
  savingsText,
  shouldCompress,
} from '../video-compress-core.ts';
import { MAX_CHECKIN_BYTES } from '../storage-upload-core.ts';

/**
 * PO review: *"Check ins take really long to load and it said that it was too big but I only did a 16
 * second video. Are we condensing the videos? We should to make it better."*
 *
 * We were not. Nothing in the stack transcoded video — the app had a duration cap and an iOS-only
 * RECORDING quality, neither of which touches a clip picked from the camera roll.
 */

const MB = 1024 * 1024;
const video = (fileSize) => ({ type: 'video', fileSize });

test('a big clip is compressed', () => {
  // The reported case: 16 seconds of iPhone 4K60 is roughly 120 MB.
  assert.deepEqual(shouldCompress(video(120 * MB)), { compress: true, reason: 'over-threshold' });
  assert.equal(shouldCompress(video(COMPRESS_MIN_BYTES)).compress, true, 'the threshold itself compresses');
});

test('a small clip is left alone — the wait would cost more than it saves', () => {
  assert.deepEqual(shouldCompress(video(2 * MB)), { compress: false, reason: 'small-enough' });
  assert.equal(shouldCompress(video(COMPRESS_MIN_BYTES - 1)).compress, false);
});

test('⚠ an UNKNOWN size compresses, and that direction is the whole point', () => {
  // `ImagePicker` frequently omits `fileSize` for videos on Android — and the enormous library clip is
  // the one most likely to arrive unmeasured. Skipping on "unknown" would skip the exact case this
  // feature exists for.
  assert.deepEqual(shouldCompress(video(null)), { compress: true, reason: 'size-unknown' });
  assert.deepEqual(shouldCompress(video(undefined)), { compress: true, reason: 'size-unknown' });
  assert.deepEqual(shouldCompress(video(0)), { compress: true, reason: 'size-unknown' });
});

test('a photo is never sent to the video compressor', () => {
  // Photos have their own path (`downscalePhoto`), which resizes rather than transcodes.
  assert.deepEqual(shouldCompress({ type: 'image', fileSize: 90 * MB }), { compress: false, reason: 'not-video' });
  assert.equal(shouldCompress({ fileSize: 90 * MB }).compress, false, 'an untyped asset is not a video');
});

test('the threshold sits well below the cap it protects', () => {
  // If these ever crossed, a clip could be too large to upload and too small to be compressed — the
  // failure would present as "that clip is too large" with no way for the athlete to act on it.
  assert.ok(COMPRESS_MIN_BYTES < MAX_CHECKIN_BYTES / 4, 'leave real room between "worth compressing" and "refused"');
});

// ── keeping the result, or throwing it away ──────────────────────────────────

test('a genuinely smaller file is kept', () => {
  assert.equal(keepCompressed(120 * MB, 5 * MB), true);
});

test('⚠ a BIGGER result is discarded — re-encoding can inflate a file', () => {
  // Not hypothetical: an already-efficient clip (one that has been through a messaging app, or HEVC
  // re-encoded to H.264) routinely comes out larger. Trusting the output would mean a feature that
  // shrinks the huge clips and quietly inflates the small ones.
  assert.equal(keepCompressed(5 * MB, 7 * MB), false);
  assert.equal(keepCompressed(5 * MB, 5 * MB), false, 'no change is not an improvement');
});

test('a marginal saving is discarded — quality is not worth trading for 3%', () => {
  assert.equal(keepCompressed(10 * MB, 9.7 * MB), false);
  assert.equal(keepCompressed(10 * MB, 9 * MB), true, '10% is the line');
});

test('a result with no measurable size is never taken on faith', () => {
  assert.equal(keepCompressed(10 * MB, null), false);
  assert.equal(keepCompressed(10 * MB, 0), false);
});

test('an unmeasurable ORIGINAL still accepts a real output', () => {
  // Nothing to compare against, and the unmeasured source is usually the library file most in need of
  // this. Refusing here would silently disable compression on the platform that needs it most.
  assert.equal(keepCompressed(null, 5 * MB), true);
});

test('the savings read as a sentence a person would write', () => {
  assert.equal(savingsText(120 * MB, 4.8 * MB), '120 MB → 4.8 MB (96% smaller)');
  assert.equal(savingsText(10 * MB, 5 * MB), '10 MB → 5 MB (50% smaller)');
  assert.ok(!savingsText(10 * MB, 11 * MB).includes('-'), 'never reports a negative saving');
});
