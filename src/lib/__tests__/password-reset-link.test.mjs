/**
 * Launch QA 11-08, B6 — the emailed reset link must reach "Choose a new password". It opens a browser with the
 * recovery session in the URL hash; with `detectSessionInUrl: false` nothing read it, so the athlete landed on
 * Welcome. Source assertions: the auth client cannot run here.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const client = read('../supabase.ts');
const auth = read('../auth.tsx');

test('the web reads the recovery session from the link; the phone (no URL) does not', () => {
  assert.match(client, /const onWeb = !isServer && Platform\.OS === 'web';/);
  assert.match(client, /detectSessionInUrl: onWeb,/);
  assert.equal(/detectSessionInUrl: false/.test(client), false);
});

test('recovery is known from the URL itself, not only from an event that can fire before anyone listens', () => {
  assert.match(client, /\/\(\^\|\[#&\]\)type=recovery\(&\|\$\)\/\.test\(window\.location\.hash\)/);
  assert.match(auth, /useState\(openedFromRecoveryLink\)/);
  const re = /(^|[#&])type=recovery(&|$)/;
  assert.ok(re.test('#access_token=x&refresh_token=y&type=recovery'));
  assert.ok(!re.test('#access_token=x&type=signup'));
});

test('the reset email is told where to land', () => {
  assert.match(auth, /resetPasswordForEmail\(email, \{ redirectTo \}\)/);
  assert.match(auth, /'https:\/\/forgelegacy\.expo\.app\/sign-in'/);
});
