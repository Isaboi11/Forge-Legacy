import test from 'node:test';
import assert from 'node:assert/strict';

import { photoResultFrom, sniffMediaType } from '../photo-read-result.ts';

/*
 * The photo reader's answer → what the athlete is told. Brief §6: an outage must be visibly different
 * from a verdict on the photo — and, found by the stress test (2026-09-21), a FORMAT problem or a SERVER
 * problem must not be told as "check your connection" either. Every 400/503 body the function sends is
 * listed here against the kind it must become.
 */

test('each function reason becomes its own outcome', () => {
  const cases = [
    [{ ok: true, tsv: 'Exercise\tSets\nSquat\t5', rows: 1, remaining: 40 }, 'ok'],
    [{ ok: false, reason: 'not_a_program' }, 'not_a_program'],
    [{ ok: false, reason: 'unreadable' }, 'unreadable'],
    [{ ok: false, reason: 'too_large' }, 'too_large'],
    [{ ok: false, reason: 'bad_request' }, 'unsupported_format'],
    [{ ok: false, reason: 'daily_limit', limit: 60 }, 'daily_limit'],
    [{ ok: false, reason: 'out_of_credits', remaining: 0, allowance: 60 }, 'out_of_credits'],
    [{ ok: false, reason: 'unconfigured' }, 'unavailable'],
    [{ ok: false, reason: 'meter_unavailable' }, 'unavailable'],
    [{ ok: false, reason: 'upstream_error' }, 'unavailable'],
    [{ ok: false, reason: 'upstream_unreachable' }, 'unavailable'],
  ];
  for (const [body, kind] of cases) assert.equal(photoResultFrom(body).kind, kind, JSON.stringify(body));
});

test('⚠ the Premium AI gate (allowance 0) is not "out of credits"', () => {
  // 0203 refuses a non-Premium-AI account with (allowed false, 0, 0, 0). "You're out of credits for this
  // month" said to somebody who never had any is the wrong sentence.
  assert.equal(photoResultFrom({ ok: false, reason: 'out_of_credits', remaining: 0, allowance: 0 }).kind, 'not_entitled');
});

test('no reason at all is the server failing, never the connection', () => {
  assert.equal(photoResultFrom(null).kind, 'unavailable');
  assert.equal(photoResultFrom({}).kind, 'unavailable');
  assert.equal(photoResultFrom({ ok: true, tsv: '' }).kind, 'unavailable');
});

test('the image type comes from its bytes, not its label', () => {
  const b64 = (bytes) => Buffer.from(bytes, 'latin1').toString('base64');
  assert.equal(sniffMediaType(b64('\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01')), 'image/jpeg');
  assert.equal(sniffMediaType(b64('\x89PNG\r\n\x1a\n\x00\x00\x00\x0d')), 'image/png');
  assert.equal(sniffMediaType(b64('GIF89a\x01\x00\x01\x00\x00\x00')), 'image/gif');
  assert.equal(sniffMediaType(b64('RIFF\x24\x00\x00\x00WEBPVP8 ')), 'image/webp');
  // An iPhone HEIC the browser could not convert — named, so it is refused as a format and not sent.
  assert.equal(sniffMediaType(b64('\x00\x00\x00\x18ftypheic\x00\x00')), 'image/heic');
  assert.equal(sniffMediaType(b64('\x00\x00\x00\x1cftypavif\x00\x00')), 'image/avif');
  assert.equal(sniffMediaType('not base64 at all!!'), null);
});
