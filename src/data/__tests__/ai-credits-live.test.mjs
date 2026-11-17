import './harness/hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

/*
 * THE CREDITS CHIP'S ONE READ (AI Road to 10 Sprint 2 — UX-2; 0272), with the meter faked at `supabase.rpc`:
 *   · coach_ai_credits() is the read; a server without 0272 answers coach_ai_balance() instead;
 *   · a failed read is null — never a 0 — and keeps the last good one for the same athlete;
 *   · one athlete's read is never another's;
 *   · an answer's `remaining` replaces the cached number, and one that lands on 0 reads the meter again.
 */

const { db } = await import('@/lib/supabase');
const { aiCreditsNow, fetchAiCredits, noteAiRemaining, refreshAiCredits } = await import('@/data/ai-credits-live');

const A = '00000000-0000-4000-8000-0000000000aa';
const B = '00000000-0000-4000-8000-0000000000bb';
const ROW = {
  entitled: true, remaining: 112, allowance: 150, spent: 38, period: '2026-11-01', resets_on: '2026-12-01',
  low_at: 20, floor_per_day: 5, floor_used_today: 0, floor_left_today: 5, on_floor: false,
};
const reset = () => {
  db.offline = false;
  db.rpcs = {};
};

test('coach_ai_credits() is the read; a server without 0272 answers coach_ai_balance() — the balance only', async () => {
  reset();
  db.rpcs.coach_ai_credits = () => [ROW];
  const r = await fetchAiCredits(true);
  assert.equal(r.remaining, 112);
  assert.equal(r.floorPerDay, 5);
  assert.equal(r.lowAt, 20);
  delete db.rpcs.coach_ai_credits; // PGRST202, as before 0272 is pasted
  db.rpcs.coach_ai_balance = () => [{ remaining: 40, allowance: 150, spent: 110, period: '2026-11-01' }];
  const old = await fetchAiCredits(true);
  assert.deepEqual(old, { entitled: true, remaining: 40, allowance: 150, period: '2026-11-01', resetsOn: null, lowAt: null, floorPerDay: 0, floorLeftToday: 0 });
  assert.equal((await fetchAiCredits(false)).entitled, false, 'coach_ai_balance answers anybody — only Premium AI is a chip');
});

test('a failed read is null, never a zero', async () => {
  reset();
  db.offline = true;
  assert.equal(await fetchAiCredits(true), null);
  reset();
  assert.equal(await fetchAiCredits(true), null, 'neither function there');
});

test('the cache: keyed by athlete, a failed read keeps the last good one, an answer’s remaining folds in, 0 reads again', async () => {
  reset();
  let reads = 0;
  db.rpcs.coach_ai_credits = () => {
    reads += 1;
    return [ROW];
  };
  await refreshAiCredits(A, true, 0);
  assert.equal(aiCreditsNow(A).remaining, 112);
  assert.equal(aiCreditsNow(B), null, '⛔ one athlete’s balance is never another’s');
  await refreshAiCredits(A, true);
  assert.equal(reads, 1, 'fresh enough: no second round trip');

  noteAiRemaining({ ok: true, remaining: 109 });
  assert.equal(aiCreditsNow(A).remaining, 109, 'the answer’s number, no round trip');
  assert.equal(reads, 1);
  noteAiRemaining({ ok: false, reason: 'not_entitled', remaining: 0 });
  assert.equal(aiCreditsNow(A).remaining, 109, 'a not-entitled refusal says nothing about a balance');

  db.rpcs.coach_ai_credits = () => {
    reads += 1;
    return [{ ...ROW, remaining: 0, floor_used_today: 1, floor_left_today: 4, on_floor: true }];
  };
  noteAiRemaining({ ok: true, remaining: 0 });
  assert.equal(aiCreditsNow(A).remaining, 0);
  await new Promise((r) => setTimeout(r, 0));
  await refreshAiCredits(A, true); // joins the read the 0 started, if it is still going
  assert.equal(reads, 2, 'landing on 0 read the meter again');
  assert.equal(aiCreditsNow(A).floorLeftToday, 4, '…to learn where today’s floor stands');

  db.offline = true;
  await refreshAiCredits(A, true, 0);
  assert.equal(aiCreditsNow(A).remaining, 0, 'a failed read keeps the last good one');
  db.offline = false;

  await refreshAiCredits(B, true, 0);
  assert.equal(aiCreditsNow(A), null, 'another athlete signed in: the first one’s read is gone');
  assert.equal(aiCreditsNow(B).remaining, 0);
  await refreshAiCredits(null, false);
  assert.equal(aiCreditsNow(B), null, 'nobody signed in: nothing kept');
});
