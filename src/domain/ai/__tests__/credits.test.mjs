// node --experimental-strip-types --test src/domain/ai/__tests__/credits.test.mjs
//
// The credits chip's brain (AI Road to 10 Sprint 2 — UX-2; migration 0272; Monetization Amendment 012): the server's
// read → normal / low / floor / out, the reset date on the meter's clock, and an answer's `remaining` folded in.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  aiCreditsChip,
  aiCreditsFromBalanceRow,
  aiCreditsFromRow,
  aiFloorUsedLine,
  creditsResetLabel,
  creditsResetOn,
  creditsResetShort,
  remainingFrom,
  withRemaining,
} from '../credits.ts';
import { aiCreditsBackOn } from '../../coach/ask-outcome.ts';

/** `coach_ai_credits()`'s row, as PostgREST returns it (0272). */
const row = (over = {}) => ({
  entitled: true,
  remaining: 112,
  allowance: 150,
  spent: 38,
  period: '2026-11-01',
  resets_on: '2026-12-01',
  low_at: 20,
  floor_per_day: 5,
  floor_used_today: 0,
  floor_left_today: 5,
  on_floor: false,
  ...over,
});
const NOW = new Date('2026-11-17T13:00:00Z');
const chipOf = (over) => aiCreditsChip(aiCreditsFromRow(row(over)), NOW);

test('normal: the balance in neutral words, the reset date for VoiceOver', () => {
  const c = chipOf();
  assert.equal(c.kind, 'normal');
  assert.equal(c.label, '112 credits');
  assert.equal(c.short, '112 credits');
  assert.equal(c.a11y, '112 Premium AI credits left this month. They reset on December 1.');
  assert.equal(chipOf({ remaining: 21 }).kind, 'normal', '21 is above the line');
});

test('low: at the server’s line (20) or under, with the reset date on the chip itself', () => {
  const c = chipOf({ remaining: 20 });
  assert.equal(c.kind, 'low');
  assert.equal(c.label, '20 left · resets December 1');
  assert.equal(c.short, '20 left · resets Dec 1');
  const one = chipOf({ remaining: 1 });
  assert.equal(one.kind, 'low');
  assert.equal(one.a11y, '1 Premium AI credit left this month. They reset on December 1.');
  assert.equal(chipOf({ remaining: 30, low_at: 40 }).kind, 'low', 'the line is the server’s, not a constant here (MA3-D16)');
});

test('floor: the month used, chats and meal photos still work — "5 a day until December 1"', () => {
  const c = chipOf({ remaining: 0, on_floor: true, floor_used_today: 2, floor_left_today: 3 });
  assert.equal(c.kind, 'floor');
  assert.equal(c.label, '5 a day until December 1');
  assert.equal(c.short, '5 a day until Dec 1');
  assert.equal(c.a11y, "This month's Premium AI credits are used. Chats with Holt and meal photos still work, 5 a day, until December 1. 3 left today.");
  assert.equal(chipOf({ remaining: 0, floor_per_day: 3, floor_left_today: 3 }).label, '3 a day until December 1', 'the number is the server’s');
});

test('out: today’s floor used — back tomorrow; no floor at all — out until the 1st', () => {
  const today = chipOf({ remaining: 0, floor_used_today: 5, floor_left_today: 0 });
  assert.equal(today.kind, 'out');
  assert.equal(today.label, "Today's 5 used · back tomorrow");
  assert.equal(today.short, "Today's 5 used");
  assert.match(today.a11y, /More tomorrow, and your Premium AI credits reset on December 1\./);
  const none = chipOf({ remaining: 0, floor_per_day: 0, floor_left_today: 0 });
  assert.equal(none.kind, 'out');
  assert.equal(none.label, 'Out until December 1');
  assert.equal(none.short, 'Out until Dec 1');
});

test('no chip: no read, no Premium AI, no allowance — and never a "0" from a read that failed', () => {
  assert.equal(aiCreditsChip(null, NOW), null);
  assert.equal(chipOf({ entitled: false, remaining: 0, allowance: 0 }), null, '⛔ AI is paid-only: nothing to show without it');
  assert.equal(chipOf({ allowance: 0, remaining: 0 }), null);
  assert.equal(aiCreditsFromRow(null), null);
  assert.equal(aiCreditsFromRow({ remaining: 3 }), null, 'a row without the entitlement answer is not a read');
  assert.equal(aiCreditsFromRow({ entitled: true, remaining: 'x', allowance: 150 }), null);
});

test('the reset date: the server’s, else the month after its period, else the device’s UTC month — always the 1st, in UTC', () => {
  assert.equal(creditsResetLabel(creditsResetOn({ period: '2026-11-01', resetsOn: '2026-12-01' }, NOW)), 'December 1');
  assert.equal(creditsResetLabel(creditsResetOn({ period: '2026-12-01', resetsOn: null }, NOW)), 'January 1', 'December rolls the year');
  assert.equal(creditsResetOn({ period: '2026-12-01', resetsOn: null }).toISOString(), '2027-01-01T00:00:00.000Z');
  assert.equal(creditsResetLabel(creditsResetOn(null, new Date('2026-11-30T23:30:00Z'))), 'December 1');
  // 6:30 pm in Denver on the 30th is already December in UTC — the meter's month; the label never says "November 30".
  assert.equal(creditsResetLabel(creditsResetOn(null, new Date('2026-12-01T01:30:00Z'))), 'January 1');
  assert.equal(creditsResetShort(new Date(Date.UTC(2027, 0, 1))), 'Jan 1');
  // The same arithmetic as Holt's out-of-credits line (ask-outcome.ts), so the chip and Holt never disagree.
  for (const p of ['2026-01-01', '2026-11-01', '2026-12-01', null]) {
    assert.equal(creditsResetOn({ period: p, resetsOn: null }, NOW).toISOString(), aiCreditsBackOn(p, NOW).toISOString(), String(p));
  }
});

test('an answer’s remaining replaces the cached number; a refusal for no Premium AI or no consent says nothing about a balance', () => {
  const read = aiCreditsFromRow(row());
  assert.equal(remainingFrom({ ok: true, remaining: 109 }), 109);
  assert.equal(remainingFrom({ route: 'out_of_credits', remaining: 0, allowance: 150 }), 0);
  assert.equal(remainingFrom({ ok: false, reason: 'out_of_credits', remaining: 0 }), 0);
  assert.equal(remainingFrom({ ok: false, reason: 'not_entitled', remaining: 0 }), null);
  assert.equal(remainingFrom({ ok: false, reason: 'no_consent' }), null);
  assert.equal(remainingFrom({ ok: true }), null);
  assert.equal(remainingFrom(null), null);
  assert.equal(remainingFrom({ remaining: 3.7 }), 3);
  const next = withRemaining(read, 109);
  assert.equal(next.remaining, 109);
  assert.equal(next.allowance, 150);
  assert.equal(withRemaining(read, 112), read, 'nothing changed → the same object (no re-render)');
  assert.equal(aiCreditsChip(withRemaining(read, 0), NOW).kind, 'floor', 'landing on 0 with a floor → the floor');
});

test('a server without 0272 (coach_ai_balance): the balance only — no warning line, no floor — and only for Premium AI', () => {
  const old = aiCreditsFromBalanceRow({ remaining: 12, allowance: 150, spent: 138, period: '2026-11-01' }, true);
  const c = aiCreditsChip(old, NOW);
  assert.equal(c.kind, 'normal', 'no low_at from the server → no warning state');
  assert.equal(c.label, '12 credits');
  assert.equal(aiCreditsChip(aiCreditsFromBalanceRow({ remaining: 0, allowance: 150, period: '2026-11-01' }, true), NOW).label, 'Out until December 1');
  // coach_ai_balance answers 150 to anybody — without Premium AI it is no chip.
  assert.equal(aiCreditsChip(aiCreditsFromBalanceRow({ remaining: 150, allowance: 150, period: '2026-11-01' }, false), NOW), null);
});

test('the refusal line on the floor says today, not the month', () => {
  assert.equal(
    aiFloorUsedLine(aiCreditsFromRow(row({ remaining: 0, floor_left_today: 0 })), NOW),
    "That's today's 5 chats and meal photos. More tomorrow, and your Premium AI credits come back on December 1.",
  );
  assert.equal(aiFloorUsedLine(aiCreditsFromRow(row({ floor_per_day: 0 })), NOW), null, 'no floor → the screen keeps its own line');
  assert.equal(aiFloorUsedLine(null, NOW), null);
});

test('the module stays import-free (functions and node --test read it)', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../credits.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /^import /m);
  assert.doesNotMatch(src, /\b(6|six) credits\b/i);
});
