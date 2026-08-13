import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  CAP_KEYS,
  UNLIMITED,
  capAllows,
  gateFor,
  m7Benefits,
  m7Content,
  remaining,
  usageLabel,
} from '../caps-core.ts';

/**
 * The cap arithmetic.
 *
 * Nine gates, each with an off-by-one that is invisible until an athlete hits it: whether 75 means "the
 * 75th photo is the last one allowed" or "the 75th is the first one refused". These tests pin that, and
 * pin the three rules that are easy to break by accident later — `unknown` is not `blocked`, in-workout
 * Holt is a switch and not a quantity, and no cap number is ever written as a literal.
 */

const FREE = {
  programs: 3,
  short_programs: 3,
  photos: 75,
  videos: 5,
  squads: 1,
  templates: 5,
  imports: 1,
  holt_programs: 1,
  holt_days_per_month: 2,
  holt_in_workout: 0,
};

const PAID = {
  programs: 500,
  short_programs: UNLIMITED,
  photos: 1000,
  videos: 100,
  squads: 5,
  templates: UNLIMITED,
  imports: UNLIMITED,
  holt_programs: UNLIMITED,
  holt_days_per_month: UNLIMITED,
  holt_in_workout: UNLIMITED,
};

const usage = (over = {}) => ({
  programs: 0,
  shortPrograms: 0,
  photos: 0,
  videos: 0,
  squads: 0,
  templates: 0,
  imports: 0,
  holtPrograms: 0,
  holtDays: 0,
  ...over,
});

// ── the boundary ─────────────────────────────────────────────────────────────

test('the cap is the number that may EXIST, so the attempt at n+1 is what is refused', () => {
  // 74 photos: room for the 75th.
  assert.equal(capAllows(74, 75), true);
  // 75 photos: the 76th is refused. This is the whole off-by-one, and M-7's trigger table says "76th".
  assert.equal(capAllows(75, 75), false);
  assert.equal(capAllows(76, 75), false);
});

test('a cap of 1 refuses the second, which is the squad case', () => {
  assert.equal(capAllows(0, 1), true);
  assert.equal(capAllows(1, 1), false);
});

test('-1 is unlimited and nothing else is', () => {
  assert.equal(capAllows(10_000, UNLIMITED), true);
  assert.equal(remaining(10_000, UNLIMITED), Number.POSITIVE_INFINITY);
  // 0 is a real cap meaning "none", NOT unlimited. In-workout Holt on Free is exactly this, and reading
  // 0 as unlimited would hand the whole feature away.
  assert.equal(capAllows(0, 0), false);
});

test('a malformed count cannot open every gate at once', () => {
  // A negative from a bad payload would pass `-1 < 75` and allow everything. Clamped at the boundary.
  assert.equal(capAllows(-5, 0), false);
  assert.equal(capAllows(Number.NaN, 3), true, 'NaN clamps to 0, which legitimately has room');
  assert.equal(remaining(Number.NaN, 3), 3);
});

test('remaining never goes negative for an athlete already over a lowered cap', () => {
  // Downgrade, or a cap tuned DOWN after the metered run. Amendment 001 §2: they keep everything, they
  // simply cannot add. "-25 left" would be both wrong and alarming.
  assert.equal(remaining(100, 75), 0);
});

// ── the three outcomes ───────────────────────────────────────────────────────

test('unknown is a third outcome and never collapses into blocked', () => {
  // M-7 §10: entitlement that cannot be verified must NOT produce an upsell.
  assert.equal(gateFor('photos', null, usage()).outcome, 'unknown');
  assert.equal(gateFor('photos', FREE, null).outcome, 'unknown');
  // A cap key missing from the config is also unknown, not "allowed by default".
  assert.equal(gateFor('photos', { ...FREE, photos: undefined }, usage()).outcome, 'unknown');
});

test('every cap key resolves for both tiers', () => {
  for (const key of CAP_KEYS) {
    assert.notEqual(gateFor(key, FREE, usage()).outcome, 'unknown', `free: ${key}`);
    assert.notEqual(gateFor(key, PAID, usage()).outcome, 'unknown', `paid: ${key}`);
  }
});

test('in-workout Holt is a switch, not a quantity', () => {
  // 0 means never — and it must stay blocked at zero usage, which a use-count comparison would allow.
  assert.equal(gateFor('holt_in_workout', FREE, usage()).outcome, 'blocked');
  assert.equal(gateFor('holt_in_workout', PAID, usage()).outcome, 'allowed');
});

test('Free hits every wall at the documented number', () => {
  assert.equal(gateFor('programs', FREE, usage({ programs: 3 })).outcome, 'blocked');
  assert.equal(gateFor('programs', FREE, usage({ programs: 2 })).outcome, 'allowed');
  assert.equal(gateFor('photos', FREE, usage({ photos: 75 })).outcome, 'blocked');
  assert.equal(gateFor('squads', FREE, usage({ squads: 1 })).outcome, 'blocked');
  assert.equal(gateFor('videos', FREE, usage({ videos: 5 })).outcome, 'blocked');
  assert.equal(gateFor('templates', FREE, usage({ templates: 5 })).outcome, 'blocked');
  assert.equal(gateFor('short_programs', FREE, usage({ shortPrograms: 3 })).outcome, 'blocked');
  assert.equal(gateFor('short_programs', FREE, usage({ shortPrograms: 2 })).outcome, 'allowed');
});

test('⚠ a week and a program spend DIFFERENT allowances', () => {
  // The reason `short_programs` exists at all (MA4-D1). `programs` is 3 LIFETIME and never reopens, so
  // if three throwaway deload weeks spent it, a free athlete could never build a real block again.
  const spentWeeks = usage({ shortPrograms: 3, programs: 0 });
  assert.equal(gateFor('short_programs', FREE, spentWeeks).outcome, 'blocked');
  assert.equal(gateFor('programs', FREE, spentWeeks).outcome, 'allowed', 'weeks must not eat program slots');

  const spentPrograms = usage({ programs: 3, shortPrograms: 0 });
  assert.equal(gateFor('programs', FREE, spentPrograms).outcome, 'blocked');
  assert.equal(gateFor('short_programs', FREE, spentPrograms).outcome, 'allowed');
});

test('the week wall borrows the Programs row rather than inventing a seventh', () => {
  // M-7 §6.2 v1.1 locks CANONICAL at six and renders four; a seventh row would push a locked one off.
  const { feature, reason } = m7Content('short_programs', 3);
  assert.equal(feature, 'Unlimited programs');
  assert.match(reason, /3 free training weeks/, 'the number is interpolated from config, never a literal');
  assert.match(m7Content('short_programs', 1).reason, /1 free training week\b/, 'singular at one');
});

test('Premium is not blocked by anything an athlete could plausibly reach', () => {
  const heavy = usage({ programs: 400, photos: 900, videos: 90, squads: 4, templates: 5000 });
  for (const key of CAP_KEYS) {
    assert.equal(gateFor(key, PAID, heavy).outcome, 'allowed', key);
  }
});

// ── the lifetime counters ────────────────────────────────────────────────────

test('the free import is a boolean wearing a counter', () => {
  assert.equal(gateFor('imports', FREE, usage({ imports: 0 })).outcome, 'allowed');
  assert.equal(gateFor('imports', FREE, usage({ imports: 1 })).outcome, 'blocked');
});

test('the Holt lifetime program and the monthly days are separate counters', () => {
  // An athlete who has spent their one lifetime program still has both days this month. Wiring both to
  // one counter would take the days away with the program, which is the opposite of MA3-D4's intent —
  // the monthly refill is what keeps the free tier alive after the program wall lands.
  const spent = usage({ holtPrograms: 1, holtDays: 0 });
  assert.equal(gateFor('holt_programs', FREE, spent).outcome, 'blocked');
  assert.equal(gateFor('holt_days_per_month', FREE, spent).outcome, 'allowed');

  const outOfDays = usage({ holtPrograms: 0, holtDays: 2 });
  assert.equal(gateFor('holt_days_per_month', FREE, outOfDays).outcome, 'blocked');
  assert.equal(gateFor('holt_programs', FREE, outOfDays).outcome, 'allowed');
});

test('a received program consumes the same counter as a built one', () => {
  // MA3-D10. Two built and one received is three, and the fourth is refused whatever its origin — the
  // counter has no notion of where a program came from, which is what makes that true.
  assert.equal(gateFor('programs', FREE, usage({ programs: 3 })).outcome, 'blocked');
});

// ── the copy ─────────────────────────────────────────────────────────────────

test('M-7 renders the cap from config, never a literal', () => {
  // M7-D14. The proof is that a different config produces different copy from the same code path.
  assert.equal(m7Content('photos', 75).reason, "You've reached your 75-photo limit.");
  assert.equal(m7Content('photos', 40).reason, "You've reached your 40-photo limit.");
  assert.equal(m7Content('squads', 1).reason, "You've reached your 1-squad limit.");
});

test('the squad benefit row promises 5 squads, not unlimited', () => {
  // M7-D15. Premium's squad ceiling is genuinely 5, and a benefits row on a purchase surface promising
  // something the tier does not deliver is a false claim, not loose copy.
  const rows = m7Benefits('squads');
  assert.equal(rows[0], '5 squads');
  assert.ok(!rows.some((r) => /unlimited squads/i.test(r)));
});

test('M-7 shows exactly four rows, triggered feature first, for every trigger', () => {
  for (const key of CAP_KEYS) {
    const rows = m7Benefits(key);
    assert.equal(rows.length, 4, key);
    assert.equal(new Set(rows).size, 4, `${key}: duplicate row`);
    assert.equal(rows[0], m7Content(key, 0).feature, key);
  }
});

test('Coach AI appears nowhere on M-7', () => {
  // MA3-D2 / M7-D16. Coach AI raises no cap in this table, so offering it as the answer to one would be
  // selling the wrong thing to solve the athlete's actual problem.
  for (const key of CAP_KEYS) {
    for (const row of m7Benefits(key)) {
      assert.ok(!/\bAI\b/i.test(row), `${key}: "${row}" mentions AI`);
    }
    assert.ok(!/\bAI\b/i.test(m7Content(key, 3).reason), key);
  }
});

test('the Holt rows say Coach Holt, never AI, because Holt is a rules engine', () => {
  assert.match(m7Content('holt_programs', 1).feature, /Coach Holt/);
  assert.match(m7Content('holt_days_per_month', 2).feature, /Coach Holt/);
});

test('the usage label reads "n of cap", and never exposes the -1 sentinel', () => {
  assert.equal(usageLabel(38, 75), '38 of 75');
  assert.equal(usageLabel(38, UNLIMITED), '38');
  assert.ok(!usageLabel(38, UNLIMITED).includes('-1'));
});
