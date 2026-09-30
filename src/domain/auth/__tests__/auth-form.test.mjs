/**
 * auth-form.test.mjs — the sign-in route's rules (QA 09-26: auth-03, auth-04, auth-05, auth-13,
 * settings-29).
 *
 * The button was the only guard; Enter in a field bypassed it. These pin the rule both now ask.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { canSubmitAuth, friendlyAuthError, parseAuthStep, signInBlocker, PASSWORD_MIN } from '../auth-form.ts';
import { restorableDestination } from '../pending-destination.ts';

test('auth-03: create and reset refuse a password under the 8-character rule, whatever pressed it', () => {
  assert.equal(PASSWORD_MIN, 8);
  assert.equal(canSubmitAuth('create', 'a@b.co', 'abcdef'), false, 'the 6-character password Supabase accepted');
  assert.equal(canSubmitAuth('create', 'a@b.co', 'abcdefg'), false);
  assert.equal(canSubmitAuth('create', 'a@b.co', 'abcdefgh'), true);
  assert.equal(canSubmitAuth('reset', '', 'abcdef'), false);
  assert.equal(canSubmitAuth('reset', '', 'abcdefgh'), true, 'reset has no email field');
  assert.equal(canSubmitAuth('create', 'bad', 'abcdefgh'), false);
});

test('auth-04: Forgot Password does not "send" to an address that is not one', () => {
  assert.equal(canSubmitAuth('forgot', 'bad', ''), false);
  assert.equal(canSubmitAuth('forgot', '', ''), false);
  assert.equal(canSubmitAuth('forgot', ' a@b.co ', ''), true);
});

test('sign-in never enforces the 8-character rule — older accounts must still get in', () => {
  assert.equal(canSubmitAuth('signin', 'a@b.co', 'abc123'), true);
  assert.equal(canSubmitAuth('signin', '', 'abc123'), false);
  assert.equal(canSubmitAuth('signin', 'a@b.co', ''), false);
});

test('auth-05: an empty Sign In says what is missing, in words', () => {
  assert.equal(signInBlocker('', ''), 'Enter your email and password.');
  assert.match(signInBlocker('', 'x'), /email/);
  assert.match(signInBlocker('a@b.co', ''), /password/);
  assert.equal(signInBlocker('a@b.co', 'x'), null);
});

test('auth-05: Supabase’s raw errors never reach the screen', () => {
  const raws = [
    'missing email or phone',
    'Invalid login credentials',
    'Email not confirmed',
    'User already registered',
    'Password should be at least 6 characters.',
    'Email rate limit exceeded',
    'Failed to fetch',
    'AuthApiError: 500',
  ];
  for (const raw of raws) {
    const out = friendlyAuthError(raw);
    assert.ok(out && out.length > 0, raw);
    assert.notEqual(out, raw, `${raw} passed through untranslated`);
    assert.doesNotMatch(out, /credentials|missing email or phone|AuthApiError/i);
  }
  assert.match(friendlyAuthError('Invalid login credentials'), /don’t match/);
  assert.equal(friendlyAuthError(null), null);
});

test('auth-13: the step is read from the URL, and `reset` never is', () => {
  for (const s of ['create', 'signin', 'forgot', 'sent']) assert.equal(parseAuthStep(s), s);
  assert.equal(parseAuthStep(['signin']), 'signin', 'expo-router can hand an array');
  assert.equal(parseAuthStep('reset'), 'welcome', 'reset needs a live recovery session, not a URL');
  assert.equal(parseAuthStep(undefined), 'welcome');
  assert.equal(parseAuthStep('nonsense'), 'welcome');
});

test('settings-29: a signed-out deep link is remembered as an internal path', () => {
  assert.equal(restorableDestination('https://forgelegacy.expo.app/honors'), '/honors');
  assert.equal(restorableDestination('https://forgelegacy.expo.app/program/abc?tab=2#x'), '/program/abc?tab=2');
  assert.equal(restorableDestination('forgelegacy://activity/123'), '/activity/123');
  assert.equal(restorableDestination('exp://192.168.1.4:8081/--/goals'), '/goals');
  assert.equal(restorableDestination('/squad/s1'), '/squad/s1');
});

test('settings-29: the doors themselves, the invite, and anything off-site are not destinations', () => {
  for (const url of [
    'https://forgelegacy.expo.app/',
    'https://forgelegacy.expo.app',
    'https://forgelegacy.expo.app/sign-in?step=signin',
    'https://forgelegacy.expo.app/onboarding',
    'https://forgelegacy.expo.app/join-squad?code=IRON-4F2A',
    'forgelegacy://join-squad?code=IRON',
    '//evil.example/x',
    'javascript:alert(1)',
    'https://forgelegacy.expo.app//evil.example',
    '/\\evil.example',
    null,
    '',
  ]) {
    assert.equal(restorableDestination(url), null, String(url));
  }
});
