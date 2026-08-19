import assert from 'node:assert/strict';
import { test } from 'node:test';

import { referralCodeFromUrl, referralSourceFromUrl } from '../referral-link.ts';

/**
 * Parsing an incoming link for the referral it carries.
 *
 * The capture runs outside the router, on a raw URL, at the one moment the app cannot use a route param —
 * so every edge case here is one the athlete would experience as "my friend's invite never counted", with
 * no error anywhere and nothing to look at.
 */

const CODE = 'ABCD2345';

test('reads the code off both link shapes the invites carry', () => {
  assert.equal(
    referralCodeFromUrl(`https://forgelegacy.expo.app/join-squad?code=IRON4F2A&ref=${CODE}`),
    CODE,
  );
  assert.equal(referralCodeFromUrl(`forgelegacy://join-squad?code=IRON4F2A&ref=${CODE}`), CODE);
  assert.equal(referralCodeFromUrl(`forgelegacy://join-squad?ref=${CODE}`), CODE);
});

test('⚠ the path is NOT required — unlike the squad parser', () => {
  /*
   * The deliberate divergence, and the one most likely to be "fixed" by someone reading the two parsers
   * side by side. `ref` is not route-specific: MA3-D21 attaches it to squad invites, challenge invites and
   * a bare code. Requiring a known path would silently drop whichever surface is added next.
   */
  assert.equal(referralCodeFromUrl(`https://forgelegacy.app/anything?ref=${CODE}`), CODE);
  assert.equal(referralCodeFromUrl(`forgelegacy://challenge/42?ref=${CODE}`), CODE);
  assert.equal(referralCodeFromUrl(`https://forgelegacy.app/?ref=${CODE}`), CODE);
});

test('a fragment is not folded into the value', () => {
  assert.equal(referralCodeFromUrl(`https://forgelegacy.app/join-squad?ref=${CODE}#/somewhere`), CODE);
});

test('the parameter is matched case-insensitively, the value is normalized', () => {
  assert.equal(referralCodeFromUrl(`forgelegacy://join-squad?REF=${CODE}`), CODE);
  assert.equal(referralCodeFromUrl('forgelegacy://join-squad?ref=abcd2345'), CODE);
  assert.equal(referralCodeFromUrl('forgelegacy://join-squad?ref=abcd-2345'), CODE);
  assert.equal(referralCodeFromUrl(`forgelegacy://join-squad?ref=${encodeURIComponent(CODE)}`), CODE);
});

test('⚠ an implausible code is dropped rather than stashed', () => {
  /*
   * It would otherwise occupy the single first-wins slot with something that can never resolve, so a real
   * invite tapped a minute later would lose to a typo — and both the device and the server would be
   * behaving exactly as designed.
   */
  assert.equal(referralCodeFromUrl('forgelegacy://join-squad?ref=ABC'), '');
  assert.equal(referralCodeFromUrl('forgelegacy://join-squad?ref=ABCD2O45'), '', 'contains an O');
  assert.equal(referralCodeFromUrl('forgelegacy://join-squad?ref='), '');
});

test('no referral in the link is an empty string, never a throw', () => {
  assert.equal(referralCodeFromUrl('https://forgelegacy.app/join-squad?code=IRON4F2A'), '');
  assert.equal(referralCodeFromUrl('https://forgelegacy.app/join-squad'), '');
  assert.equal(referralCodeFromUrl(null), '');
  assert.equal(referralCodeFromUrl(undefined), '');
  assert.equal(referralCodeFromUrl(''), '');
  assert.equal(referralCodeFromUrl('not a url at all'), '');
});

test('a parameter merely CONTAINING ref is not the referral', () => {
  // `referrer=` and `preference=` both contain "ref"; a substring match would read either as a code.
  assert.equal(referralCodeFromUrl(`forgelegacy://join-squad?referrer=${CODE}`), '');
  assert.equal(referralCodeFromUrl(`forgelegacy://join-squad?preference=${CODE}`), '');
});

test('the channel is read from the path, and an unknown path is an honest "code"', () => {
  assert.equal(referralSourceFromUrl(`forgelegacy://join-squad?ref=${CODE}`), 'squad');
  assert.equal(referralSourceFromUrl(`https://forgelegacy.app/join-squad?ref=${CODE}`), 'squad');
  assert.equal(referralSourceFromUrl(`forgelegacy://challenge/42?ref=${CODE}`), 'challenge');
  assert.equal(referralSourceFromUrl(`https://forgelegacy.app/competitions?ref=${CODE}`), 'challenge');
  assert.equal(referralSourceFromUrl(`https://forgelegacy.app/?ref=${CODE}`), 'code');
  assert.equal(referralSourceFromUrl(null), 'code');
});

test('every source returned is one 0170’s check constraint accepts', () => {
  // A source outside the enum raises 22023 from the RPC and loses the attribution entirely.
  const urls = [
    'forgelegacy://join-squad?ref=X',
    'forgelegacy://challenge/1',
    'https://forgelegacy.app/competitions',
    'https://forgelegacy.app/whatever',
    '',
    null,
    undefined,
  ];
  for (const u of urls) {
    assert.ok(['squad', 'challenge', 'code'].includes(referralSourceFromUrl(u)), `bad source for ${u}`);
  }
});
