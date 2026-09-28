import './harness/hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

/*
 * "Fix it with AI" on the device: the function's answer is only ever offered when it is faithful to the card.
 * The function is faked; the check is the real one, with the real catalogue.
 */

const { supabase, db, ATHLETE } = await import('@/lib/supabase');
const { CONSENT_POLICY_VERSION } = await import('@/domain/consent/consent');
const { tidyWrittenWorkout } = await import('@/data/workout-tidy-live');
const { refreshConsents } = await import('@/lib/consent');
const { resolveExerciseName } = await import('@/domain/exercise-picker/data');
const resolveKey = (n) => resolveExerciseName(n)?.key;

const CARD = 'Squat day\nSquat - work up then 3 x 3 @ 80%, 2 min rest\nBench 5x5 at 70%';
const FAITHFUL = '"Squat day"\n1. Back Squat 3 sets of 3 reps @ 80%\nrest 2:00\n2. Bench Press 5 sets of 5 reps @ 70%';

let calls = 0;
const answer = (body, status = 200) => {
  supabase.functions.invoke = async () => {
    calls += 1;
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

test('a faithful rewrite comes back to go in the box', async () => {
  answer({ ok: true, text: FAITHFUL });
  const r = await tidyWrittenWorkout(CARD, resolveKey);
  assert.deepEqual(r, { kind: 'ok', text: FAITHFUL });
});

test('the same card again is free: no second call', async () => {
  answer({ ok: true, text: FAITHFUL });
  const before = calls;
  const r = await tidyWrittenWorkout(CARD, resolveKey);
  assert.equal(r.kind, 'ok');
  assert.equal(calls, before, 'answered from this session');
});

test('a rewrite that changed a number is refused, and says which', async () => {
  answer({ ok: true, text: FAITHFUL.replace('80%', '85%') });
  const r = await tidyWrittenWorkout(CARD.replace('Squat day', 'Squat day two'), resolveKey);
  assert.equal(r.kind, 'unfaithful');
  assert.match(r.problems.join(' '), /85/);
});

test('a rewrite that invented a lift is refused', async () => {
  answer({ ok: true, text: FAITHFUL + '\n3. Face Pulls 3 sets of 3 reps' });
  const r = await tidyWrittenWorkout('Other day\nSquat 3 x 3 @ 80%, 2 min rest\nBench 5x5 at 70%', resolveKey);
  assert.equal(r.kind, 'unfaithful');
  assert.match(r.problems.join(' '), /Face Pulls/);
});

test('the reasons the function gives are passed through; an outage is not a verdict on the card', async () => {
  for (const reason of ['not_entitled', 'out_of_credits', 'daily_limit', 'not_a_workout', 'too_long', 'unreadable']) {
    answer({ ok: false, reason });
    assert.equal((await tidyWrittenWorkout(`card for ${reason} 5x5`, resolveKey)).kind, reason);
  }
  answer({ ok: false, reason: 'meter_unavailable' }, 503);
  assert.equal((await tidyWrittenWorkout('card for 503 5x5', resolveKey)).kind, 'unavailable');
  supabase.functions.invoke = async () => ({ data: null, error: { message: 'Failed to fetch' } });
  assert.equal((await tidyWrittenWorkout('card offline 5x5', resolveKey)).kind, 'offline');
});

test('no consent: nothing is sent', async () => {
  db.reset();
  await refreshConsents();
  answer({ ok: true, text: FAITHFUL });
  const before = calls;
  const r = await tidyWrittenWorkout('no consent card 5x5', resolveKey);
  assert.equal(r.kind, 'no_consent');
  assert.equal(calls, before);
});
