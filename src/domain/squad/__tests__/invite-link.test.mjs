import test from 'node:test';
import assert from 'node:assert/strict';

import { inviteCodeFromUrl, normalizeInviteCode } from '../invite-link.ts';

/**
 * ⚠ AN INVITE MUST SURVIVE NOT HAVING AN ACCOUNT YET.
 *
 * A stranger taps a squad link, has no session, and `routeFor` sends them to `'auth'` — where
 * `_layout.tsx` declares only `sign-in`, so expo-router strips `join-squad` from the tree and the
 * `?code=` disappears with it. They sign up, onboard, and land on Home in no squad.
 *
 * The whole year-one plan is 20 testers inviting five people each, and the funnel being instrumented
 * (sent → accepted → installed → converted) could not structurally complete: every invite to somebody who
 * did not already have the app ended on Home.
 *
 * The capture has to read the raw URL, because the route that would have parsed it does not exist at that
 * moment. These are the shapes that URL actually arrives in.
 */

test('both forms the invite carries are accepted', () => {
  // squad-invite.tsx:52 — for anyone, including a laptop or someone without the app
  assert.equal(inviteCodeFromUrl('https://forgelegacy.expo.app/join-squad?code=IRON-4F2A'), 'IRON-4F2A');
  // squad-invite.tsx:64 — the custom scheme, for a phone that already has it
  assert.equal(inviteCodeFromUrl('forgelegacy://join-squad?code=IRON-4F2A'), 'IRON-4F2A');
});

test('the code is normalised the way join-squad expects it', () => {
  assert.equal(inviteCodeFromUrl('forgelegacy://join-squad?code=iron-4f2a'), 'IRON-4F2A');
  assert.equal(normalizeInviteCode('  iron-4f2a  '), 'IRON-4F2A');
  // Percent-encoded, because `squad-invite.tsx` builds the link with encodeURIComponent.
  assert.equal(inviteCodeFromUrl('https://forgelegacy.expo.app/join-squad?code=IRON%2D4F2A'), 'IRON-4F2A');
});

test('⚠ only join-squad counts — a stray ?code= on another route is not an invite', () => {
  // Hijacking a link that meant something else would be worse than missing one.
  assert.equal(inviteCodeFromUrl('https://forgelegacy.expo.app/program/abc?code=IRON-4F2A'), null);
  assert.equal(inviteCodeFromUrl('forgelegacy://workout?code=IRON-4F2A'), null);
  assert.equal(inviteCodeFromUrl('https://forgelegacy.expo.app/?code=IRON-4F2A'), null);
});

test('a link with nothing to redeem is not stashed', () => {
  assert.equal(inviteCodeFromUrl('https://forgelegacy.expo.app/join-squad'), null, 'no query at all');
  assert.equal(inviteCodeFromUrl('https://forgelegacy.expo.app/join-squad?code='), null, 'empty code');
  assert.equal(inviteCodeFromUrl('https://forgelegacy.expo.app/join-squad?code=AB'), null, 'below the 4-char floor');
  assert.equal(inviteCodeFromUrl('https://forgelegacy.expo.app/join-squad?other=x'), null, 'a different param');
  assert.equal(inviteCodeFromUrl(null), null);
  assert.equal(inviteCodeFromUrl(undefined), null);
  assert.equal(inviteCodeFromUrl(''), null);
});

test('a fragment does not fold into the value', () => {
  // Web routers append fragments; "IRON-4F2A#/home" is not a squad code.
  assert.equal(inviteCodeFromUrl('https://forgelegacy.expo.app/join-squad?code=IRON-4F2A#/home'), 'IRON-4F2A');
});

test('the code survives company in the query string, in either order', () => {
  assert.equal(inviteCodeFromUrl('https://forgelegacy.expo.app/join-squad?utm=tester&code=IRON-4F2A'), 'IRON-4F2A');
  assert.equal(inviteCodeFromUrl('https://forgelegacy.expo.app/join-squad?code=IRON-4F2A&utm=tester'), 'IRON-4F2A');
});

test('trailing slashes and mixed case in the path still resolve', () => {
  assert.equal(inviteCodeFromUrl('https://forgelegacy.expo.app/join-squad/?code=IRON-4F2A'), 'IRON-4F2A');
  assert.equal(inviteCodeFromUrl('https://forgelegacy.expo.app/Join-Squad?code=IRON-4F2A'), 'IRON-4F2A');
});

test('a malformed URL is not an invite, and never throws', () => {
  // This runs at boot, before anything else. A throw here would be a launch crash on a bad link.
  for (const bad of ['not a url', 'join-squad?code=', '://join-squad?code=ABCD', '%%%']) {
    assert.doesNotThrow(() => inviteCodeFromUrl(bad));
  }
  assert.equal(inviteCodeFromUrl('not a url'), null);
});
