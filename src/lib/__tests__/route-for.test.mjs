import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routeFor } from '../route-for.ts';

// The three routing states the PO named for Gate A, plus the loading holds.
test('routeFor — no session → auth', () => {
  assert.equal(routeFor({ authLoading: false, hasSession: false, profileLoading: false, onboardedAt: null }), 'auth');
});

test('routeFor — session, not onboarded → onboarding (fresh signup + returning-not-onboarded)', () => {
  assert.equal(routeFor({ authLoading: false, hasSession: true, profileLoading: false, onboardedAt: null }), 'onboarding');
  assert.equal(routeFor({ authLoading: false, hasSession: true, profileLoading: false, onboardedAt: undefined }), 'onboarding');
});

test('routeFor — session, onboarded → app (returning-onboarded)', () => {
  assert.equal(routeFor({ authLoading: false, hasSession: true, profileLoading: false, onboardedAt: '2026-07-16T00:00:00Z' }), 'app');
});

test('routeFor — holds on splash while auth or profile is loading (no wrong-destination flash)', () => {
  assert.equal(routeFor({ authLoading: true, hasSession: false, profileLoading: false, onboardedAt: null }), 'splash');
  assert.equal(routeFor({ authLoading: false, hasSession: true, profileLoading: true, onboardedAt: null }), 'splash');
});

test('routeFor — auth wins over an unresolved profile when there is no session', () => {
  assert.equal(routeFor({ authLoading: false, hasSession: false, profileLoading: true, onboardedAt: undefined }), 'auth');
});

/**
 * ⚠ A PASSWORD-RESET LINK SIGNS YOU IN, AND THAT IS WHY RECOVERY HAS TO OUTRANK EVERY SESSION RULE.
 *
 * Supabase mints a real session when the emailed link is opened. Judged on session alone, the athlete
 * is "signed in and onboarded" and lands on Home — the one screen that cannot change a password. They
 * came unable to sign in and would leave still unable to, having been shown the app on the way past.
 */
test('routeFor — recovery holds the auth route up over a live session', () => {
  const onboarded = { authLoading: false, hasSession: true, profileLoading: false, onboardedAt: '2026-07-16T00:00:00Z' };
  assert.equal(routeFor(onboarded), 'app', 'the same athlete without recovery');
  assert.equal(routeFor({ ...onboarded, recovering: true }), 'auth', 'so they can actually set a password');
  // Also true before onboarding, and while the profile read is still in flight.
  assert.equal(routeFor({ ...onboarded, onboardedAt: null, recovering: true }), 'auth');
  assert.equal(routeFor({ ...onboarded, profileLoading: true, recovering: true }), 'auth');
});

test('routeFor — recovery never jumps the splash, which would flash the wrong screen mid-boot', () => {
  assert.equal(
    routeFor({ authLoading: true, hasSession: true, profileLoading: false, onboardedAt: null, recovering: true }),
    'splash',
  );
});

test('routeFor — an absent recovering flag routes exactly as before', () => {
  assert.equal(routeFor({ authLoading: false, hasSession: true, profileLoading: false, onboardedAt: '2026-07-16T00:00:00Z' }), 'app');
  assert.equal(routeFor({ authLoading: false, hasSession: false, profileLoading: false, onboardedAt: null, recovering: false }), 'auth');
});
