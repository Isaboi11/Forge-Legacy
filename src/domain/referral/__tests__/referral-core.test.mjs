import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  REFERRAL_ALPHABET,
  REFERRAL_CODE_LENGTH,
  REFERRAL_PARAM,
  attributionMessage,
  isAttributionVerdict,
  isPlausibleReferralCode,
  isReferralSource,
  normalizeReferralCode,
  referralCodeFromParam,
  referralLinkFor,
} from '../referral-core.ts';

/**
 * The referral string rules.
 *
 * Two of these tests exist because the failure they prevent moves somebody's money to the wrong person, and
 * neither is obvious from reading the function: an ambiguous character must not be repaired away (repair
 * shifts the remaining characters and can land on a real code belonging to a stranger), and the alphabet
 * here must stay identical to the one `0145` generates from.
 */

const VALID = 'ABCD2345';

test('the alphabet matches 0145 exactly — I, O, 0 and 1 are absent', () => {
  assert.equal(REFERRAL_ALPHABET, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
  for (const ambiguous of ['I', 'O', '0', '1']) {
    assert.ok(!REFERRAL_ALPHABET.includes(ambiguous), `${ambiguous} must not be generatable`);
  }
  assert.equal(REFERRAL_CODE_LENGTH, 8);
});

test('normalize folds case, whitespace and the separators people read codes aloud with', () => {
  assert.equal(normalizeReferralCode('abcd2345'), VALID);
  assert.equal(normalizeReferralCode('  abcd2345  '), VALID);
  assert.equal(normalizeReferralCode('ABCD-2345'), VALID);
  assert.equal(normalizeReferralCode('ABCD 2345'), VALID);
  assert.equal(normalizeReferralCode('abcd_2345'), VALID);
});

test('normalize survives what a caller can actually hand it', () => {
  assert.equal(normalizeReferralCode(null), '');
  assert.equal(normalizeReferralCode(undefined), '');
  assert.equal(normalizeReferralCode(''), '');
  assert.equal(normalizeReferralCode(42), '');
});

test('⚠ an ambiguous character is REJECTED, never deleted', () => {
  /*
   * The whole point. 'ABCD2O45' contains an O, which no real code can contain. Repairing by deletion would
   * yield 'ABCD245' — seven characters — and a length-tolerant server could match that against somebody
   * else. Rejection gives the athlete a sentence they can act on instead.
   */
  assert.equal(normalizeReferralCode('ABCD2O45'), 'ABCD2O45', 'normalize must not strip it');
  assert.ok(!isPlausibleReferralCode('ABCD2O45'), 'and it must not be considered plausible');

  for (const ambiguous of ['I', 'O', '0', '1']) {
    assert.ok(!isPlausibleReferralCode(`ABCD234${ambiguous}`), `${ambiguous} must fail the charset check`);
  }
});

test('plausibility gates the round trip on length and charset', () => {
  assert.ok(isPlausibleReferralCode(VALID));
  assert.ok(!isPlausibleReferralCode('ABCD234'), 'seven characters');
  assert.ok(!isPlausibleReferralCode('ABCD23456'), 'nine characters');
  assert.ok(!isPlausibleReferralCode(''), 'empty');
  assert.ok(!isPlausibleReferralCode('abcd2345'), 'lower case is normalize’s job, not this one’s');
  assert.ok(!isPlausibleReferralCode('ABCD-234'), 'a separator that normalize would have removed');
});

test('every character the generator can emit is accepted', () => {
  // Guards the pairing directly: if the SQL alphabet grows and this constant does not, a real code is
  // rejected before it ever reaches the server — a failure that would look like "that code doesn't match
  // anyone" and be almost impossible to diagnose from the outside.
  for (const ch of REFERRAL_ALPHABET) {
    assert.ok(isPlausibleReferralCode(ch.repeat(REFERRAL_CODE_LENGTH)), `${ch} must be accepted`);
  }
});

test('the link carries the code, on both link shapes', () => {
  assert.equal(
    referralLinkFor('https://forgelegacy.app/join?code=WXYZ', VALID),
    `https://forgelegacy.app/join?code=WXYZ&${REFERRAL_PARAM}=${VALID}`,
  );
  assert.equal(
    referralLinkFor('https://forgelegacy.app/join', VALID),
    `https://forgelegacy.app/join?${REFERRAL_PARAM}=${VALID}`,
  );
  assert.equal(
    referralLinkFor('forgelegacy://join-squad?code=WXYZ', VALID),
    `forgelegacy://join-squad?code=WXYZ&${REFERRAL_PARAM}=${VALID}`,
  );
});

test('a link is returned untouched when there is no usable code — never with an empty ref', () => {
  /*
   * `?ref=` on a shared link is worse than no parameter: it looks deliberate, so anyone debugging a missing
   * attribution starts by suspecting capture rather than the code that was never read.
   */
  for (const bad of [null, undefined, '', 'ABCD234', 'ABCD2O45']) {
    assert.equal(referralLinkFor('https://forgelegacy.app/join?code=WXYZ', bad), 'https://forgelegacy.app/join?code=WXYZ');
  }
  assert.equal(referralLinkFor('', VALID), '');
});

test('normalization runs before the link is built, so a lower-case code still attaches', () => {
  assert.equal(
    referralLinkFor('forgelegacy://join-squad', 'abcd-2345'),
    `forgelegacy://join-squad?${REFERRAL_PARAM}=${VALID}`,
  );
});

test('a repeated query parameter arrives as an array and the first one wins', () => {
  // Matches 0170's server-side first-wins rule rather than introducing a second, different tie-break.
  assert.equal(referralCodeFromParam([VALID, 'WXYZ2345']), VALID);
  assert.equal(referralCodeFromParam(VALID), VALID);
  assert.equal(referralCodeFromParam('abcd 2345'), VALID);
  assert.equal(referralCodeFromParam(undefined), '');
  assert.equal(referralCodeFromParam('ABCD2O45'), '', 'an implausible code never leaves the client');
  assert.equal(referralCodeFromParam([]), '');
});

test('verdicts off the wire are recognised, and anything else is not', () => {
  for (const v of ['recorded', 'already', 'unknown', 'self']) assert.ok(isAttributionVerdict(v));
  for (const v of ['RECORDED', 'ok', '', null, undefined, 1, {}]) assert.ok(!isAttributionVerdict(v));
});

test('⚠ "already" does not read as a failure', () => {
  /*
   * First-wins means an athlete who taps a second invite has done nothing wrong. Phrasing it as an error
   * invites them to retry something that can never succeed, and quietly tells them the app lost their code.
   */
  const msg = attributionMessage('already');
  for (const word of ['couldn', "can't", 'cannot', 'failed', 'error', 'invalid', 'try again']) {
    assert.ok(!msg.toLowerCase().includes(word), `"already" must not say "${word}": ${msg}`);
  }
  assert.match(msg, /stands/);
});

test('⚠ no message promises a reward — the credit cannot be granted yet', () => {
  /*
   * Guards the decision recorded in `referralLinkFor`'s header. Until §4.2 ships the webhook AND Phase F
   * flips the default tier, a "free month" line is a billing claim nothing can honour — the exact class of
   * claim Phase F exists to retire, and this would be adding a new one to that list.
   */
  for (const v of ['recorded', 'already', 'unknown', 'self']) {
    const msg = attributionMessage(v).toLowerCase();
    for (const claim of ['free', 'month', 'credit', 'reward', 'discount', '%', '$']) {
      assert.ok(!msg.includes(claim), `${v} must not mention "${claim}": ${msg}`);
    }
  }
});

test('every verdict has a message', () => {
  for (const v of ['recorded', 'already', 'unknown', 'self']) {
    const msg = attributionMessage(v);
    assert.equal(typeof msg, 'string');
    assert.ok(msg.length > 0);
  }
});

test('sources match 0170’s check constraint', () => {
  for (const s of ['squad', 'challenge', 'code']) assert.ok(isReferralSource(s));
  for (const s of ['SQUAD', 'friend', '', null, undefined]) assert.ok(!isReferralSource(s));
});
