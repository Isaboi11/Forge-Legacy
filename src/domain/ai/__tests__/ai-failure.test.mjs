import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  NOT_CHARGED,
  aiFailureMessage,
  aiFailureName,
  classifyAiFailure,
  isReportableAiFailure,
  wasRefunded,
} from '../ai-failure.ts';

test('the athlete cancelling wins over everything, then our own timeout', () => {
  assert.equal(classifyAiFailure({ cancelled: true, timedOut: true, reason: 'upstream_error' }), 'cancelled');
  assert.equal(classifyAiFailure({ timedOut: true, reason: 'upstream_error' }), 'timeout');
  // The function's own upstream abort arrives as upstream_error + upstream: 'timeout' (contract §1.2).
  assert.equal(classifyAiFailure({ reason: 'upstream_error', upstream: 'timeout', status: 503 }), 'timeout');
});

test("every reason a function sends today maps to a kind, and old reason names keep their meaning", () => {
  const cases = {
    upstream_error: 'upstream',
    upstream_unreachable: 'upstream',
    meter_unavailable: 'meter',
    unconfigured: 'meter',
    unreadable: 'unreadable',
    not_a_program: 'unreadable',
    not_a_workout: 'unreadable',
    bad_request: 'rejected',
    too_long: 'rejected',
    too_large: 'rejected',
    no_consent: 'no_consent',
    out_of_credits: 'out_of_credits',
    not_entitled: 'not_entitled',
    daily_limit: 'daily_limit',
  };
  for (const [reason, kind] of Object.entries(cases)) assert.equal(classifyAiFailure({ reason }), kind, reason);
});

test('with no reason, the status decides; with no status, the request never left the phone', () => {
  assert.equal(classifyAiFailure({ status: 529 }), 'upstream');
  assert.equal(classifyAiFailure({ status: 429 }), 'upstream');
  assert.equal(classifyAiFailure({ status: 502 }), 'upstream');
  assert.equal(classifyAiFailure({ status: 400 }), 'rejected');
  assert.equal(classifyAiFailure({ offline: true }), 'offline');
  assert.equal(classifyAiFailure({}), 'unknown');
  assert.equal(classifyAiFailure({ reason: 'something_new' }), 'unknown');
});

test("the athlete's own state is not reported as an error; real failures are", () => {
  for (const k of ['out_of_credits', 'not_entitled', 'daily_limit', 'cancelled']) assert.equal(isReportableAiFailure(k), false, k);
  for (const k of ['timeout', 'offline', 'upstream', 'meter', 'unreadable', 'rejected', 'no_consent', 'unknown'])
    assert.equal(isReportableAiFailure(k), true, k);
});

test('the name is a grouping key with no spaces, and the message carries no free text', () => {
  const name = aiFailureName({ fn: 'meal-photo-read', kind: 'timeout' });
  assert.equal(name, 'ai.meal-photo-read.timeout');
  assert.doesNotMatch(name, /\s/);
  const msg = aiFailureMessage({
    fn: 'coach-kitchen',
    kind: 'upstream',
    reason: 'upstream error with spaces',
    status: 503,
    model: 'claude-sonnet-5',
    latencyMs: 4210.6,
    refunded: true,
  });
  assert.equal(msg, 'fn=coach-kitchen kind=upstream reason=upstream_error_with_spaces status=503 model=claude-sonnet-5 ms=4211 refunded=true');
});

test('refunded is read only from an explicit true', () => {
  assert.equal(wasRefunded({ ok: false, reason: 'upstream_error', refunded: true }), true);
  assert.equal(wasRefunded({ ok: false, refunded: 'true' }), false);
  assert.equal(wasRefunded(null), false);
  assert.equal(NOT_CHARGED, 'Not charged.');
});
