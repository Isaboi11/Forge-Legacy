/**
 * require-user-id.test.mjs — offline is not "signed out" (UX-016, launch QA H42).
 *
 * ══ THE FAILURE THIS GUARDS ══
 *
 * Offline, Finish never reached the offline save queue and said "Couldn't save — Not signed in.. Try again." —
 * a regression of the 11-08 "Checked and working: finish and save (and the offline queue)". Writers took the id
 * from `supabase.auth.getUser()`, a NETWORK call that does not throw offline: it RETURNS `user: null`, which each
 * writer threw as a plain 'not signed in', which `isTransportFailure` rightly refuses.
 *
 * ⚠ THE FIXTURES ARE THE REAL LIBRARY. The installed `@supabase/auth-js` client is driven with a fetch that fails
 * the way React Native's does ("Network request failed") and a stored session — so what is asserted is what the
 * phone actually gets, not a tidy imitation of it.
 *
 * Run:  node --test --experimental-strip-types src/lib/__tests__/require-user-id.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { NOT_SIGNED_IN, isAuthNetworkFailure, userIdFromSession } from '../require-user-id-core.ts';
import { isTransportFailure } from '../../domain/workout/pending-save.ts';
import { PLAIN, plainError } from '../plain-error.ts';

const require = createRequire(import.meta.url);
const { GoTrueClient } = require('@supabase/auth-js');

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (rel) => readFileSync(path.join(here, '../../', rel), 'utf8');

const KEY = 'sb-test-auth-token';
const memory = (entries) => {
  const m = new Map(Object.entries(entries));
  return { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => void m.set(k, v), removeItem: async (k) => void m.delete(k), m };
};
const storedSession = (expiresAt) =>
  JSON.stringify({ access_token: 'h.p.s', refresh_token: 'r1', token_type: 'bearer', expires_in: 3600, expires_at: expiresAt, user: { id: 'athlete-1', aud: 'authenticated' } });

/** A phone with no signal: React Native's fetch rejects with exactly this. */
const noSignal = async () => {
  throw new TypeError('Network request failed');
};

/**
 * A real auth client, offline, holding a session that expires `expiresIn` seconds from now. auth-js logs its own
 * retries (muted), and backs off between refresh attempts for up to ~30 s — the same wait the old `getUser()` path
 * had on a phone, so it is not this fix's to remove. Its sleeps are made instant here so the suite stays fast;
 * the number of attempts and the error they end in are unchanged.
 */
async function offlinePhone(expiresIn) {
  const storage = memory({ [KEY]: storedSession(Math.floor(Date.now() / 1000) + expiresIn) });
  const mute = console.error;
  const realSetTimeout = globalThis.setTimeout;
  console.error = () => {};
  globalThis.setTimeout = (fn, _ms, ...args) => realSetTimeout(fn, 0, ...args);
  try {
    const client = new GoTrueClient({ url: 'https://example.supabase.co/auth/v1', storageKey: KEY, storage, fetch: noSignal, autoRefreshToken: false, persistSession: true, detectSessionInUrl: false });
    const user = await client.getUser();
    const session = await client.getSession();
    return { user, session, storage };
  } finally {
    console.error = mute;
    globalThis.setTimeout = realSetTimeout;
  }
}

test('THE DEFECT, from the real client: offline, getUser() RETURNS user:null — it does not throw — while the session is right there', async () => {
  const { user, session } = await offlinePhone(3600);
  assert.equal(user.data.user, null, 'the null every writer read as "signed out"');
  assert.equal(user.error?.name, 'AuthRetryableFetchError');
  assert.equal(isTransportFailure(new Error('not signed in')), false, 'what the writers threw instead — refused by the queue');
  assert.equal(session.data.session?.user?.id, 'athlete-1', 'the phone knows exactly who is signed in');
});

test('offline with a live token: the id is read on the phone, no network needed', async () => {
  const { session } = await offlinePhone(3600);
  assert.equal(userIdFromSession(session), 'athlete-1');
});

test('offline with an EXPIRED token: the refresh cannot reach the server, and that is thrown AS a network failure — queued, never "signed out"', async () => {
  const { session, storage } = await offlinePhone(-60);
  assert.equal(session.data.session, null);
  assert.ok(storage.m.has(KEY), 'auth-js keeps the session on disk — the athlete is still signed in');
  let thrown;
  try {
    userIdFromSession(session);
  } catch (e) {
    thrown = e;
  }
  assert.ok(thrown, 'no id without a session');
  assert.equal(isAuthNetworkFailure(thrown), true);
  assert.equal(isTransportFailure(thrown), true, 'the W-9 §13.4 offline queue takes it');
  assert.equal(plainError(thrown), PLAIN.network, 'and every other writer says "check your connection"');
});

test('genuinely signed out is still "Not signed in", and still NOT a transport failure', () => {
  for (const read of [{ data: { session: null }, error: null }, { data: null }, { data: { session: { user: null } }, error: null }]) {
    assert.throws(() => userIdFromSession(read), (e) => e.message === NOT_SIGNED_IN && !isTransportFailure(e));
  }
});

test('a refresh token the server REJECTED is signed out, not offline', () => {
  const rejected = Object.assign(new Error('Invalid Refresh Token: Refresh Token Not Found'), { name: 'AuthApiError', status: 400, code: 'refresh_token_not_found' });
  assert.throws(() => userIdFromSession({ data: { session: null }, error: rejected }), (e) => e.message === NOT_SIGNED_IN);
});

/* ── Wiring: the save path and the writers the sweep names use it; the boot identity does not ── */

test('saveWorkout, continueWorkout and saveActivity read the id on the phone — no getUser() before the first write', () => {
  const save = src('domain/workout/save.ts');
  for (const fn of ['saveWorkout', 'saveActivity', 'continueWorkout']) {
    const start = save.indexOf(`export async function ${fn}(`);
    assert.ok(start >= 0, `${fn} is where it was`);
    const body = save.slice(start, save.indexOf('\nexport ', start + 10));
    assert.ok(body.includes('await requireUserId()'), `${fn} uses requireUserId`);
    assert.ok(!body.includes('auth.getUser()'), `${fn} no longer asks the network who is signed in`);
  }
});

test('Finish still queues a transport failure, and still says so', () => {
  const logger = src('app/workout.tsx');
  assert.match(logger, /if \(!session\.continuingWorkoutId && isTransportFailure\(e\)\) \{/);
  assert.ok(logger.includes('Workout saved. It’ll sync when you’re back online.'));
});

test('the writers the sweep names — invites, posts, comments, post media, Holt’s Save for later — use it', () => {
  const uses = {
    'data/train-together-live.ts': ['sendWorkoutInvite', 'requestToJoinWorkout', 'inviteToLiveSession'],
    'data/squad-feed-live.ts': ['addSquadPost', 'uploadPostMedia', 'addSquadComment'],
    'data/friends-feed-live.ts': ['createFriendPost', 'addPostComment', 'uploadFeedMedia', 'uploadFeedImageData'],
    'data/templates-live.ts': ['saveTemplate'],
    'data/week-templates-live.ts': ['saveWeekTemplate'],
  };
  for (const [file, fns] of Object.entries(uses)) {
    const text = src(file);
    for (const fn of fns) {
      const start = text.indexOf(`export async function ${fn}(`);
      assert.ok(start >= 0, `${fn} is in ${file}`);
      const body = text.slice(start, text.indexOf('\nexport ', start + 10));
      assert.ok(body.includes('await requireUserId()'), `${file} ${fn} uses requireUserId`);
      assert.ok(!body.includes('auth.getUser()'), `${file} ${fn} no longer asks the network`);
    }
  }
});

test('the launch/boot identity is left alone — it deliberately asks the SERVER (5ffccf67)', () => {
  assert.ok(src('domain/profile/live.ts').includes('auth.getUser()'), 'the boot profile read still uses getUser');
  assert.ok(!src('lib/auth.tsx').includes('requireUserId'));
  assert.ok(!src('domain/profile/live.ts').includes('requireUserId'));
});
