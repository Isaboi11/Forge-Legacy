import test from 'node:test';
import assert from 'node:assert/strict';

import { INVITE_CODE_MAX, INVITE_CODE_ROW_CHROME, inviteCodeFontSize, inviteCodeWidth } from '../invite-code-fit.ts';

/**
 * visualB-02 (QA 09-26): on an iPhone SE (320pt web) the invite code drew at a fixed 38pt and was cut to
 * "QASQ-56…". `adjustsFontSizeToFit` does nothing on web. The size must now fit the row it lives in.
 */
const fits = (w, len) => inviteCodeWidth(inviteCodeFontSize(w, len), len) <= w - INVITE_CODE_ROW_CHROME;

test('a normal 9-character code fits an iPhone SE row', () => {
  assert.ok(fits(320, 9));
  assert.ok(inviteCodeFontSize(320, 9) < INVITE_CODE_MAX);
});

test('the widened 11-character code fits too', () => {
  assert.ok(fits(320, 11));
  assert.ok(fits(375, 11));
});

test('the design size holds wherever it already fits', () => {
  assert.equal(inviteCodeFontSize(1200, 9), INVITE_CODE_MAX);
});

test('the old fixed 38pt did NOT fit on an SE — the bug this guards', () => {
  assert.ok(inviteCodeWidth(INVITE_CODE_MAX, 9) > 320 - INVITE_CODE_ROW_CHROME);
});

test('degenerate inputs fall back to the design size', () => {
  assert.equal(inviteCodeFontSize(0, 9), INVITE_CODE_MAX);
  assert.equal(inviteCodeFontSize(320, 0), INVITE_CODE_MAX);
});
