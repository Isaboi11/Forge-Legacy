import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  AI_APP_TIMEOUT_MS,
  aiFailureOf,
  ranOutOfTime,
  reasonOf,
  refundedBy,
  refundedResult,
  serverSaysNoConsent,
  upstreamOf,
  withNotCharged,
} from '../ai-call.ts';
import { NOT_CHARGED, aiFailureName, aiFailureMessage } from '../ai-failure.ts';
import { AUTHOR_TIMEOUT_MS } from '../../coach/author-deadline.ts';

/* AI Road to 10, Sprint 1 — PL-3 / PL-4 (audit P-G1, P-G3). Contract: Docs/AI-Sprint-1-Build-Notes.md §3, §4. */

const answer = (over = {}) => ({ fn: 'meal-photo-read', body: null, status: null, offline: false, timedOut: false, cancelled: false, latencyMs: 1234, ...over });

test('every non-chat AI function has the contract §3 app timeout', () => {
  assert.deepEqual(AI_APP_TIMEOUT_MS, {
    'meal-photo-read': 90_000,
    'recipe-photo-read': 90_000,
    'program-photo-read': 90_000,
    'workout-card-read': 90_000,
    'coach-form-check': 90_000,
    'coach-kitchen': 60_000,
    'coach-interpret': 60_000,
    'workout-tidy': 60_000,
    'coach-author': 30_000,
    'recipe-link-read': 30_000,
    'bug-plain': 90_000,
  });
  // The chat's streamed ask keeps its own Sprint 0 clock (another branch's), so it is not here.
  assert.equal('coach-ask' in AI_APP_TIMEOUT_MS, false);
});

test('coach-author keeps Sprint 0’s 30 s (B-D8): the deadline and the call agree', () => {
  assert.equal(AI_APP_TIMEOUT_MS['coach-author'], AUTHOR_TIMEOUT_MS);
  assert.equal(AUTHOR_TIMEOUT_MS, 30_000);
});

test('the body is read for its reason, its upstream hint and its refund — never anything else', () => {
  const body = { ok: false, reason: ' upstream_error ', upstream: 'timeout', refunded: true, detail: 'secret' };
  assert.equal(reasonOf(body), 'upstream_error');
  assert.equal(upstreamOf(body), 'timeout');
  assert.equal(refundedBy({ body }), true);
  assert.equal(refundedBy({ body: { refunded: 'true' } }), false, 'only a real true');
  assert.equal(reasonOf(null), null);
  assert.equal(reasonOf('text'), null);
  assert.equal(reasonOf({ reason: 42 }), null);
});

test('either clock running out counts as slow — the app’s, or the function’s own upstream abort', () => {
  assert.equal(ranOutOfTime(answer({ timedOut: true })), true);
  assert.equal(ranOutOfTime(answer({ body: { reason: 'upstream_error', upstream: 'timeout' }, status: 503 })), true);
  assert.equal(ranOutOfTime(answer({ body: { reason: 'upstream_error' }, status: 503 })), false);
});

test('the server’s consent refusal is recognised by its reason (P-G9)', () => {
  assert.equal(serverSaysNoConsent({ body: { ok: false, reason: 'no_consent' } }), true);
  assert.equal(serverSaysNoConsent({ body: { ok: false, reason: 'not_entitled' } }), false);
  assert.equal(serverSaysNoConsent({ body: null }), false);
});

test('a failure becomes one AiFailure: fn, kind, reason, status, latency, refunded', () => {
  const f = aiFailureOf(answer({ body: { ok: false, reason: 'upstream_error', refunded: true }, status: 503 }), 'unavailable');
  assert.deepEqual(f, { fn: 'meal-photo-read', kind: 'upstream', reason: 'upstream_error', status: 503, latencyMs: 1234, refunded: true });
  assert.equal(aiFailureName(f), 'ai.meal-photo-read.upstream');
  assert.equal(aiFailureMessage(f), 'fn=meal-photo-read kind=upstream reason=upstream_error status=503 ms=1234 refunded=true');
});

test('the module’s own outcome stands in for a reason only when the function gave none', () => {
  // A 2xx the device's guard refused (a card with no sets, a rewrite that changed a number).
  assert.equal(aiFailureOf(answer({ body: { ok: true, text: 'x' }, status: 200 }), 'not_a_workout').kind, 'unreadable');
  assert.equal(aiFailureOf(answer({ body: { ok: true }, status: 200 }), 'bad_output').reason, 'bad_output');
  // The function's reason wins.
  assert.equal(aiFailureOf(answer({ body: { reason: 'too_large' }, status: 400 }), 'unavailable').reason, 'too_large');
  // `ok` is never a reason.
  assert.equal(aiFailureOf(answer({ status: 200, body: {} }), 'ok').reason, null);
});

test('timeout, offline and cancel are told apart, and a cancel is the athlete’s own act', () => {
  assert.equal(aiFailureOf(answer({ timedOut: true })).kind, 'timeout');
  assert.equal(aiFailureOf(answer({ body: { reason: 'upstream_error', upstream: 'timeout' }, status: 503 })).kind, 'timeout');
  assert.equal(aiFailureOf(answer({ offline: true }), 'offline').kind, 'offline');
  assert.equal(aiFailureOf(answer({ cancelled: true })).kind, 'cancelled');
  assert.equal(aiFailureOf(answer({ body: { ok: false, reason: 'no_consent' }, status: 403 })).kind, 'no_consent');
});

test('"Not charged." goes at the end of the line, once, and only when refunded', () => {
  assert.equal(NOT_CHARGED, 'Not charged.');
  assert.equal(withNotCharged('Photo reading isn’t working right now.', true), 'Photo reading isn’t working right now. Not charged.');
  assert.equal(withNotCharged('Photo reading isn’t working right now.', false), 'Photo reading isn’t working right now.');
  assert.equal(withNotCharged('That broke.', undefined), 'That broke.');
  assert.equal(withNotCharged('That broke. Not charged.', true), 'That broke. Not charged.', 'never twice');
  assert.equal(withNotCharged('Trailing space  ', true), 'Trailing space Not charged.');
});

test('a refund rides on a failed result, never on a success, and a missing one adds nothing', () => {
  assert.deepEqual(refundedResult({ kind: 'unavailable' }, { body: { refunded: true } }), { kind: 'unavailable', refunded: true });
  assert.deepEqual(refundedResult({ kind: 'unavailable' }, { body: { ok: false } }), { kind: 'unavailable' });
  const ok = { kind: 'ok', text: 'x' };
  assert.equal(refundedResult(ok, { body: { refunded: true } }), ok);
});
