import test from 'node:test';
import assert from 'node:assert/strict';

import { downscaleTarget, MAX_EDGE } from '../image-downscale-core.ts';

/**
 * Photo downscaling — the rule that decides what gets stored forever.
 *
 * Uploads previously kept full camera resolution, so the cost of a photo was set by the phone that took
 * it rather than by anything the app displays. These guard the two ways that could go wrong in the
 * expensive direction (a big photo left alone) and the two ways it could go wrong in the destructive
 * direction (a small photo re-encoded for nothing, or an unknown-size photo resized to a guess).
 */

test('an iPhone photo is capped on its long edge, aspect ratio preserved', () => {
  const out = downscaleTarget(4032, 3024);
  assert.deepEqual(out, { width: 1600, height: 1200 });
});

test('portrait is capped on height — the long edge is whichever one is longer', () => {
  const out = downscaleTarget(3024, 4032);
  assert.deepEqual(out, { width: 1200, height: 1600 });
});

test('an image already within the cap is left alone, not re-encoded', () => {
  assert.equal(downscaleTarget(1600, 1200), null);
  assert.equal(downscaleTarget(800, 600), null);
});

test('exactly at the cap is within it', () => {
  assert.equal(downscaleTarget(MAX_EDGE, MAX_EDGE), null);
});

test('one pixel over the cap does resize', () => {
  assert.deepEqual(downscaleTarget(MAX_EDGE + 1, MAX_EDGE + 1), { width: 1600, height: 1600 });
});

test('unknown or nonsensical dimensions pass the original through rather than guess', () => {
  for (const [w, h] of [
    [undefined, undefined],
    [null, 3024],
    [4032, null],
    [NaN, 3024],
    [Infinity, 3024],
    [0, 3024],
    [-4032, 3024],
    ['4032', '3024'],
  ]) {
    assert.equal(downscaleTarget(w, h), null, `${String(w)}x${String(h)} should not resize`);
  }
});

test('an extreme panorama still yields at least one pixel on the short edge', () => {
  const out = downscaleTarget(20000, 3);
  assert.ok(out);
  assert.equal(out.width, 1600);
  assert.ok(out.height >= 1, 'short edge never rounds to zero');
});

test('the cap is a parameter, so a caller can be stricter', () => {
  assert.deepEqual(downscaleTarget(4032, 3024, 800), { width: 800, height: 600 });
  assert.equal(downscaleTarget(4032, 3024, 0), null);
});

test('the saving is the point: bytes scale with pixel count, not with the JPEG quality flag', () => {
  const target = downscaleTarget(4032, 3024);
  const before = 4032 * 3024;
  const after = target.width * target.height;
  assert.ok(before / after > 6, `expected a >6x pixel reduction, got ${(before / after).toFixed(1)}x`);
});
