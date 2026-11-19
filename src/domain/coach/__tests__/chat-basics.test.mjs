// node --experimental-strip-types --test src/domain/coach/__tests__/chat-basics.test.mjs
//
// CH-6 (AI Road to 10 Sprint 3a): Stop, Regenerate, Edit and resend on Holt's replies — the thread rules, and the
// wiring in CoachChatSheet that must not drift from them (the sheet is too big to render in a node test).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { afterStop, lastReplySid, questionOf, withoutReply } from '../chat-basics.ts';

const me = (text, extra = {}) => ({ kind: 'me', text, ...extra });
const holt = (text, extra = {}) => ({ kind: 'holt', text, ...extra });
const chips = { kind: 'chips', chips: [{ label: 'Build me something', patch: {} }] };
const LONG = 'Progressive overload means adding a little weight or a rep each week, so the body keeps adapting.';

test('Stop keeps the words so far — unless they say nothing yet', () => {
  assert.equal(afterStop(LONG, 'what is progressive overload?'), 'keep');
  assert.equal(afterStop('Sure — so', 'what is progressive overload?'), 'drop');
  assert.equal(afterStop('   ', 'anything'), 'drop');
});

test('⛔ Stop never freezes words the output scan would have taken back (the scan only runs on a finished reply)', () => {
  const dose = 'For that kind of pain you could take 800 mg of ibuprofen every six hours and keep training through it.';
  assert.equal(afterStop(dose, 'my knee hurts, what should I take?'), 'retract');
});

test('Regenerate / Edit act only on the LAST AI reply', () => {
  const t = [holt('Hi'), me('what is RPE?'), holt(LONG, { sid: 1 }), me('and RIR?'), holt(LONG, { sid: 2 })];
  assert.equal(lastReplySid(t), 2);
  // Holt's scripted line and chips under it are re-said by the new answer — still the last reply.
  assert.equal(lastReplySid([...t, holt('How many days a week?'), chips]), 2);
  // The athlete spoke after it — no.
  assert.equal(lastReplySid([...t, me('thanks')]), null);
  // A card stands under it (a change to confirm, an error) — no.
  assert.equal(lastReplySid([...t, { kind: 'error', text: 'x', sub: 'y', action: 'z' }]), null);
  // Still arriving — no.
  assert.equal(lastReplySid([me('q'), holt('part', { sid: 3, streaming: true })]), null);
  // A rulebook-only thread — no.
  assert.equal(lastReplySid([holt('Hi'), chips]), null);
});

test('Regenerate drops that reply and everything after it', () => {
  const t = [me('what is RPE?'), holt(LONG, { sid: 1 }), holt('How many days?'), chips];
  assert.deepEqual(withoutReply(t, 1), [me('what is RPE?')]);
  assert.equal(withoutReply(t, 9), null);
});

test('Edit and resend: the question that reply answered, and the thread from before it', () => {
  const t = [holt('Hi'), me('what is RPE?'), holt(LONG, { sid: 1 })];
  assert.deepEqual(questionOf(t, 1), { text: 'what is RPE?', before: [holt('Hi')] });
  // A picture went with it — the picture is not kept, so it cannot be resent.
  assert.equal(questionOf([me('read this', { picture: true }), holt(LONG, { sid: 1 })], 1), null);
  // A Try again after an outage card — no typed question right above it.
  assert.equal(questionOf([me('q'), { kind: 'error', text: 'x', sub: 'y', action: 'z' }, holt(LONG, { sid: 2 })], 2), null);
  assert.equal(questionOf(t, 9), null);
});

/* ── the wiring in the sheet ─────────────────────────────────────────────────────────────────────── */

const SHEET = readFileSync(new URL('../../../components/forge/CoachChatSheet.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('Stop goes through the same abort as closing the sheet (coach-ask settles it `cancelled`, charged)', () => {
  assert.match(SHEET, /const stopAsks = \(\) => \{[\s\S]{0,200}stopped\.current\.add\(c\);[\s\S]{0,40}c\.abort\(\);/);
  // The controller exists before the context reads, so Stop works while the dots show.
  const ask = SHEET.slice(SHEET.indexOf('const askAloud = async ('), SHEET.indexOf('const onChip = (chip: Chip)'));
  assert.ok(ask.indexOf('const ctl = new AbortController();') < ask.indexOf('await within(ASK_CONTEXT_MS, Promise.all(['));
  // A Stop before the call left the phone never calls coach-ask.
  assert.ok(ask.indexOf('if (ctl.signal.aborted)') < ask.indexOf('await streamCoachAsk('));
  // A stopped reply is scanned before it stays.
  assert.match(ask, /afterStop\(shown, text\)/);
});

test('the reply controls: Copy on every finished AI reply, Regenerate + Edit only on the last', () => {
  assert.match(SHEET, /Clipboard\.setStringAsync\(holtPlainText\(text\)\)/); // HL-1a: the words as read, no `**`
  assert.match(SHEET, /lastReplySid\(thread\)/);
  assert.match(SHEET, /accessibilityLabel="Stop Holt's reply"/);
});

/* ── telemetry (CH-6) ────────────────────────────────────────────────────────────────────────────── */

test('every way an ask ends is one enum; Stop and a close are told apart', async () => {
  const { askEndResult, askEndedWell } = await import('../chat-basics.ts');
  assert.equal(askEndResult({ kind: 'answer', complete: true, cut: false }, false), 'answer');
  assert.equal(askEndResult({ kind: 'answer', complete: true, cut: true }, false), 'cut');
  assert.equal(askEndResult({ kind: 'answer', complete: false }, false), 'dropped');
  assert.equal(askEndResult({ kind: 'offline', aborted: true }, true), 'stopped');
  assert.equal(askEndResult({ kind: 'offline', aborted: true }, false), 'closed');
  assert.equal(askEndResult({ kind: 'offline', timedOut: true, aborted: false }, false), 'timeout');
  assert.equal(askEndResult({ kind: 'offline', timedOut: false, aborted: false }, false), 'offline');
  for (const k of ['refused', 'retracted', 'crisis', 'urgent', 'care', 'medical', 'out_of_credits', 'no_consent']) {
    assert.equal(askEndResult({ kind: k }, false), k);
  }
  assert.equal(askEndedWell('answer'), true);
  assert.equal(askEndedWell('cut'), true);
  assert.equal(askEndedWell('stopped'), false);
});

test('⛔ chat telemetry carries only allowlisted keys — never the words', async () => {
  const { ALLOWED_PROP_KEYS } = await import('../../analytics/props-core.ts');
  const calls = [...SHEET.matchAll(/track\('holt_ask_[a-z_]+', \{([^}]*)\}\)/g)];
  assert.equal(calls.length >= 3, true, 'sent, first word and ended are all tracked');
  for (const [, body] of calls) {
    for (const key of body.split(',').map((p) => p.split(':')[0].replace('...', '').trim()).filter(Boolean)) {
      assert.ok(ALLOWED_PROP_KEYS.has(key), `${key} is allowlisted`);
    }
  }
});

test('VoiceOver reads a finished reply (streamed words are not announced as they land)', () => {
  assert.match(SHEET, /AccessibilityInfo\.announceForAccessibility\(`Holt: \$\{r\.text\}`\)/);
});
