import test from 'node:test';
import assert from 'node:assert/strict';

import {
  creditsInWindow,
  mergePartnerCredits,
  resolvePartnerNames,
  MAX_PARTNERS,
  PARTNER_CREDIT_WINDOW_MS,
} from '../partner-credit.ts';

const T0 = Date.parse('2026-08-11T17:00:00.000Z');
const at = (msAgo) => new Date(T0 - msAgo).toISOString();
const credit = (athleteId, athleteName, msAgo) => ({ athleteId, athleteName, acceptedAt: at(msAgo) });

const MIN = 60_000;
const HOUR = 60 * MIN;

// ─────────────────────────────────────────────────────────────────────────────
// THE WINDOW — an accepted invite is never consumed, so it must expire
// ─────────────────────────────────────────────────────────────────────────────

test('an invite accepted this morning claims this evening’s session', () => {
  const got = creditsInWindow([credit('selene', 'Selene', 9 * HOUR)], {
    fromMs: T0 - PARTNER_CREDIT_WINDOW_MS,
    toMs: T0,
  });
  assert.deepEqual(got.map((c) => c.athleteId), ['selene']);
});

test('yesterday’s session does not name today’s workout', () => {
  const got = creditsInWindow([credit('selene', 'Selene', 30 * HOUR)], {
    fromMs: T0 - PARTNER_CREDIT_WINDOW_MS,
    toMs: T0,
  });
  assert.deepEqual(got, []);
});

test('an accept that lands mid-session is inside the window Finish asks for', () => {
  const startedMs = T0 - 90 * MIN;
  const got = creditsInWindow([credit('moses', 'Moses', 45 * MIN)], {
    fromMs: startedMs - PARTNER_CREDIT_WINDOW_MS,
    toMs: T0,
  });
  assert.deepEqual(got.map((c) => c.athleteId), ['moses']);
});

test('an unparseable timestamp is dropped rather than treated as now', () => {
  const got = creditsInWindow([{ athleteId: 'x', athleteName: 'X', acceptedAt: 'not a date' }], {
    fromMs: T0 - PARTNER_CREDIT_WINDOW_MS,
    toMs: T0,
  });
  assert.deepEqual(got, []);
});

// ─────────────────────────────────────────────────────────────────────────────
// MERGING — the cap, the order, and the refusal
// ─────────────────────────────────────────────────────────────────────────────

test('a credit is added to a session that had no tags', () => {
  assert.deepEqual(mergePartnerCredits([], [credit('selene', 'Selene', MIN)]), ['selene']);
});

test('someone already tagged is not added twice', () => {
  assert.deepEqual(mergePartnerCredits(['selene'], [credit('selene', 'Selene', MIN)]), ['selene']);
});

test('⚠ someone the athlete took OFF stays off — the second pass must not undo a removal', () => {
  assert.deepEqual(mergePartnerCredits([], [credit('selene', 'Selene', MIN)], ['selene']), []);
});

test('a hand-picked partner is never displaced by an inferred one', () => {
  const current = ['a', 'b', 'c'];
  assert.deepEqual(mergePartnerCredits(current, [credit('selene', 'Selene', MIN)]), current);
});

test('the cap holds at three', () => {
  const got = mergePartnerCredits(['a'], [credit('b', 'B', MIN), credit('c', 'C', MIN), credit('d', 'D', MIN)]);
  assert.equal(got.length, MAX_PARTNERS);
  assert.deepEqual(got, ['a', 'b', 'c']);
});

test('existing tags keep their order and credits follow them', () => {
  assert.deepEqual(mergePartnerCredits(['a'], [credit('b', 'B', 2 * MIN), credit('c', 'C', MIN)]), ['a', 'b', 'c']);
});

// ─────────────────────────────────────────────────────────────────────────────
// NAMES — the roster used to be the only source, and it fails to []
// ─────────────────────────────────────────────────────────────────────────────

test('the live roster names the partner', () => {
  assert.deepEqual(resolvePartnerNames(['selene'], [{ id: 'selene', name: 'Selene Kahale' }], []), ['Selene Kahale']);
});

test('⚠ a dropped roster read no longer costs the tag — the invite carries the name', () => {
  // `training_partners()` returns [] on ANY failure by design. That used to mean no partner at all.
  assert.deepEqual(resolvePartnerNames(['selene'], [], [credit('selene', 'Selene', MIN)]), ['Selene']);
});

test('the roster wins over the invite when both answer — it is the live name', () => {
  assert.deepEqual(
    resolvePartnerNames(['selene'], [{ id: 'selene', name: 'Selene K.' }], [credit('selene', 'Selene', MIN)]),
    ['Selene K.'],
  );
});

test('an id nothing can name is dropped, never guessed at', () => {
  assert.deepEqual(resolvePartnerNames(['ghost', 'selene'], [{ id: 'selene', name: 'Selene' }], []), ['Selene']);
});

test('names keep the order of the ids they were resolved from', () => {
  const roster = [
    { id: 'b', name: 'Bea' },
    { id: 'a', name: 'Ana' },
  ];
  assert.deepEqual(resolvePartnerNames(['a', 'b'], roster, []), ['Ana', 'Bea']);
});
