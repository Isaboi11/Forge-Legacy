import test from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyStatus,
  extensionFor,
  formatBytes,
  MAX_UPLOAD_ATTEMPTS,
  messageFor,
  retryDelayMs,
  shouldRetry,
  tooLargeMessage,
} from '../storage-upload-core.ts';

/**
 * Upload failure classification — the rules that decide whether a check-in actually posted.
 *
 * ══ THE DEFECT THESE CLOSE ══
 *
 * Reported from the tester build: *"Check ins taking long to post or not even posting."* Two of the
 * three causes were memory and the missing stall detection, which live in `storage-upload.ts` and need
 * a device. The third is here, and it is the one that made a failure look like a success:
 * `UploadTask.uploadAsync()` resolves for non-2xx responses, and `expo-file-system`'s WEB stub resolves
 * with `status: 0` after doing nothing at all. Anything that treats "the promise resolved" as "the file
 * is stored" is wrong on both counts.
 */

test('a 2xx is the only success', () => {
  assert.equal(classifyStatus(200), null);
  assert.equal(classifyStatus(201), null);
  assert.equal(classifyStatus(299), null);
});

test('the bucket size limit is a size failure, not a server one — the athlete can act on it', () => {
  assert.equal(classifyStatus(413), 'too_large');
});

test('an RLS refusal is named as such rather than reported as a network blip', () => {
  assert.equal(classifyStatus(401), 'denied');
  assert.equal(classifyStatus(403), 'denied');
});

test('5xx is the server, and is worth another attempt', () => {
  assert.equal(classifyStatus(500), 'server');
  assert.equal(classifyStatus(503), 'server');
  assert.equal(shouldRetry('server'), true);
});

test("status 0 — the web stub's resolved non-answer — is never a success", () => {
  // ExpoFileSystem.web.ts: `start()` returns `Promise.resolve({ body: '', status: 0, headers: {} })`
  // after a console warning. If this ever classified as null, every web upload would report as stored.
  assert.notEqual(classifyStatus(0), null);
  assert.equal(classifyStatus(0), 'network');
});

test('a 4xx decision is never retried — three slow failures are worse than one clear one', () => {
  assert.equal(shouldRetry('too_large'), false);
  assert.equal(shouldRetry('denied'), false);
});

test("a cancel is the athlete's own choice and is never second-guessed", () => {
  assert.equal(shouldRetry('cancelled'), false);
});

test('a stall is retryable — bytes stopping is not the same as being refused', () => {
  assert.equal(shouldRetry('stalled'), true);
  assert.equal(shouldRetry('network'), true);
});

test('backoff is short, because somebody is watching a progress bar', () => {
  assert.equal(retryDelayMs(1), 0);
  assert.equal(retryDelayMs(2), 1000);
  assert.equal(retryDelayMs(MAX_UPLOAD_ATTEMPTS), 3000);
});

test('every kind has a sentence, and none of them is an error code', () => {
  for (const kind of ['too_large', 'network', 'stalled', 'cancelled', 'denied', 'server']) {
    const m = messageFor(kind);
    assert.ok(m.length > 0, `${kind} has no message`);
    assert.ok(!/\d{3}/.test(m), `${kind} leaks a status code: ${m}`);
  }
});

test('the too-large message names the real size, so "too big" is actionable', () => {
  const m = tooLargeMessage(78 * 1024 * 1024, 50 * 1024 * 1024);
  assert.match(m, /78 MB/);
  assert.match(m, /50 MB/);
});

test('sizes read like numbers a person would say', () => {
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(2048), '2 KB');
  assert.equal(formatBytes(1.5 * 1024 * 1024), '1.5 MB');
  assert.equal(formatBytes(120 * 1024 * 1024), '120 MB');
});

test('a QuickTime recording stays a .mov — expo-video reads the extension', () => {
  assert.equal(extensionFor('video/quicktime', 'mp4'), 'mov');
  assert.equal(extensionFor('video/mp4', 'mp4'), 'mp4');
});

test('an unknown or missing type falls back rather than inventing an extension', () => {
  assert.equal(extensionFor(null, 'mp4'), 'mp4');
  assert.equal(extensionFor(undefined, 'jpg'), 'jpg');
  assert.equal(extensionFor('application/octet-stream', 'mp4'), 'mp4');
});

test('image types are preserved so a PNG is not served as a JPEG', () => {
  assert.equal(extensionFor('image/png', 'jpg'), 'png');
  assert.equal(extensionFor('image/webp', 'jpg'), 'webp');
  assert.equal(extensionFor('image/jpeg', 'jpg'), 'jpg');
});
