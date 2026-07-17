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
