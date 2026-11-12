import test from 'node:test';
import assert from 'node:assert/strict';

import { APP_STORE_URL, inviteHandoff, isIosBrowser } from '../open-in-app.ts';
import { inviteCodeFromUrl } from '../invite-link.ts';
import { referralCodeFromUrl } from '../../referral/referral-link.ts';

/**
 * "Open in Forge Legacy" on the web join page (PO 2026-11-12). The button hands the invite to the app
 * through `forgelegacy://`, so whatever it builds has to read back as the SAME invite on the app side.
 */

const SHARED = 'https://forgelegacy.expo.app/join-squad?code=TILV-JYFN&ref=53ZQRGBV';

test('the shared invite becomes the same invite as an app link, code and referral both', () => {
  const h = inviteHandoff(SHARED);
  assert.deepEqual(h, { code: 'TILV-JYFN', appUrl: 'forgelegacy://join-squad?code=TILV-JYFN&ref=53ZQRGBV' });
});

test('⚠ round trip: the app reads back exactly what the web page read', () => {
  // The app side is `inviteCodeFromUrl` + `referralCodeFromUrl` over the incoming URL (pending-invite.tsx).
  const { appUrl } = inviteHandoff(SHARED);
  assert.equal(inviteCodeFromUrl(appUrl), 'TILV-JYFN');
  assert.equal(referralCodeFromUrl(appUrl), '53ZQRGBV');
});

test('an invite with no referral still opens — it just carries no ref', () => {
  assert.deepEqual(inviteHandoff('https://forgelegacy.expo.app/join-squad?code=iron-4f2a'), {
    code: 'IRON-4F2A',
    appUrl: 'forgelegacy://join-squad?code=IRON-4F2A',
  });
});

test('an implausible referral is dropped rather than forwarded', () => {
  assert.equal(
    inviteHandoff('https://forgelegacy.expo.app/join-squad?code=TILV-JYFN&ref=nope').appUrl,
    'forgelegacy://join-squad?code=TILV-JYFN',
  );
});

test('not an invite → no button', () => {
  assert.equal(inviteHandoff('https://forgelegacy.expo.app/'), null);
  assert.equal(inviteHandoff('https://forgelegacy.expo.app/join-squad'), null);
  assert.equal(inviteHandoff('https://forgelegacy.expo.app/program/abc?code=TILV-JYFN'), null);
  assert.equal(inviteHandoff(null), null);
});

test('iPhone and iPad count; desktop and Android do not', () => {
  const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
  const ipadDesktopMode = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15';
  const android = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
  const windows = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

  assert.equal(isIosBrowser(iphone), true);
  // iPadOS reports itself as a Mac; the touch screen is the tell.
  assert.equal(isIosBrowser(ipadDesktopMode, 5), true);
  assert.equal(isIosBrowser(ipadDesktopMode, 0), false);
  assert.equal(isIosBrowser(android, 5), false);
  assert.equal(isIosBrowser(windows), false);
  assert.equal(isIosBrowser(undefined), false);
});

test('the store link is Forge Legacy (eas.json ascAppId)', () => {
  assert.equal(APP_STORE_URL, 'https://apps.apple.com/app/id6798436104');
});
