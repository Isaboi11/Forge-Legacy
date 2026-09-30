import './harness/hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

/*
 * Reading a photographed card on the device. The function is faked; the guard (`cleanCardTranscript`) is the real
 * one, and so is the answer that matters most before the function is deployed: `not_deployed`, which sends the
 * screen to the table read instead of telling the poster their photo was bad.
 */

const { supabase, db, ATHLETE } = await import('@/lib/supabase');
const { CONSENT_POLICY_VERSION } = await import('@/domain/consent/consent');
const { readWorkoutCard } = await import('@/data/workout-card-read-live');
const { refreshConsents } = await import('@/lib/consent');
const { S12_DAY1_CARD } = await import('../../domain/workout/__tests__/fixtures/squatober-2026-day1.mjs');

/* `readAsBase64` reads the picked uri with the browser's FileReader, which node does not have. */
globalThis.FileReader ??= class {
  readAsDataURL(blob) {
    blob.arrayBuffer().then(
      (b) => {
        this.result = `data:${blob.type};base64,${Buffer.from(b).toString('base64')}`;
        this.onload?.();
      },
      () => this.onerror?.(),
    );
  }
};

/* A JPEG's first bytes, so the media sniff says image/jpeg. A different tail per test = a different picture. */
let n = 0;
const photo = () => {
  n += 1;
  return `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, n, n, n, n]).toString('base64')}`;
};

let calls = 0;
const answer = (body, status = 200) => {
  supabase.functions.invoke = async (name) => {
    calls += 1;
    assert.equal(name, 'workout-card-read');
    if (status === 200) return { data: body, error: null };
    return { data: null, error: { message: 'non-2xx', context: new Response(JSON.stringify(body), { status }) } };
  };
};
const consent = () => db.rows('health_consents').push({ athlete_id: ATHLETE, kind: 'ai_sharing', action: 'granted', policy_version: CONSENT_POLICY_VERSION.ai_sharing, created_at: new Date().toISOString() });

test.beforeEach(async () => {
  db.reset();
  consent();
  await refreshConsents();
  calls = 0;
});

test('the card’s text comes back for the box', async () => {
  answer({ ok: true, text: S12_DAY1_CARD });
  const r = await readWorkoutCard(photo());
  assert.equal(r.kind, 'ok');
  assert.match(r.text, /"DEEP End Diving"/);
});

test('the same picture again is free: no second call', async () => {
  answer({ ok: true, text: S12_DAY1_CARD });
  const p = photo();
  await readWorkoutCard(p);
  const before = calls;
  assert.equal((await readWorkoutCard(p)).kind, 'ok');
  assert.equal(calls, before);
});

test('a function that is not deployed yet is its own answer, so the screen can fall back', async () => {
  answer({ code: 'NOT_FOUND', message: 'Requested function was not found' }, 404);
  assert.deepEqual(await readWorkoutCard(photo()), { kind: 'not_deployed' });
});

test('an answer with no sets or reps in it is refused on the device, whatever the function said', async () => {
  answer({ ok: true, text: 'The image shows a man standing next to a squat rack.' });
  assert.deepEqual(await readWorkoutCard(photo()), { kind: 'not_a_program' });
});

test('refusals keep their own names: not a workout, no Premium AI, out of credits, the day’s limit', async () => {
  answer({ ok: false, reason: 'not_a_program' });
  assert.equal((await readWorkoutCard(photo())).kind, 'not_a_program');
  answer({ ok: false, reason: 'out_of_credits', remaining: 0, allowance: 0 });
  assert.equal((await readWorkoutCard(photo())).kind, 'not_entitled');
  answer({ ok: false, reason: 'out_of_credits', remaining: 0, allowance: 200 });
  assert.equal((await readWorkoutCard(photo())).kind, 'out_of_credits');
  answer({ ok: false, reason: 'daily_limit' }, 429);
  assert.equal((await readWorkoutCard(photo())).kind, 'daily_limit');
  answer({ ok: false, reason: 'upstream_error' }, 503);
  assert.equal((await readWorkoutCard(photo())).kind, 'unavailable');
});

test('no answer at all is offline, never a verdict on the photo', async () => {
  supabase.functions.invoke = async () => ({ data: null, error: { message: 'Failed to fetch' } });
  assert.deepEqual(await readWorkoutCard(photo()), { kind: 'offline' });
});

test('without consent nothing is sent', async () => {
  db.reset();
  await refreshConsents();
  answer({ ok: true, text: S12_DAY1_CARD });
  const r = await readWorkoutCard(photo());
  assert.equal(r.kind, 'no_consent');
  assert.equal(calls, 0);
});
