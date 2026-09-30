/**
 * holt-chat-lows.test.mjs — the Holt chat sheet and Holt's Kitchen lows from the 2026-09-26 QA pass
 * (`Docs/QA/Full-App-QA-2026-09-26.md`): kitchen-14 / holt-20, kitchen-19, kitchen-20, kitchen-06, holt-22,
 * holtai-21, holtai-22.
 *
 * Run:  node --test src/domain/coach/__tests__/holt-chat-lows.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { greetReturning, isHomeTurn, withoutStaleHome } from '../chat-core.ts';
import { greetKitchen, leftTodayLine } from '../kitchen.ts';
import { VOICE } from '../rulebook/voice.ts';

const src = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
const SHEET = src('../../../components/forge/CoachChatSheet.tsx');
const DICTATION = src('../../../hooks/useDictation.ts');

const at = new Date(2026, 8, 26, 11, 58);
const roll = () => 0;
/** What the sheet does on arrival: the stored thread, cleaned, with a fresh greeting under it. */
const reopen = (stored, greet = greetReturning) => [...withoutStaleHome(stored), ...greet('Claude', at, roll)];

test('kitchen-14 / holt-20: every reopen greets ONCE — no second hello, no second set of doors', () => {
  const me = { kind: 'me', text: 'Grocery list' };
  const answer = { kind: 'holt', text: 'Here it is.' };
  let thread = [...greetKitchen('Claude', at, roll), me, answer];
  for (let i = 0; i < 4; i += 1) thread = reopen([...thread, { ...me }], greetKitchen);
  assert.equal(thread.filter(isHomeTurn).length, 1, 'one set of doors');
  assert.ok(isHomeTurn(thread[thread.length - 1]), 'the doors are the newest thing');
  assert.equal(thread.filter((t) => t.kind === 'me').length, 5, 'what the athlete said is all kept');
  assert.equal(thread.filter((t) => t === answer || (t.kind === 'holt' && t.text === 'Here it is.')).length, 1, "and his answer is kept");
});

test('kitchen-14: a stored answer just above the greeting stays conversation, not a greeting line', () => {
  const stored = [{ kind: 'me', text: 'what can I make?' }, { kind: 'holt', text: 'Chicken and rice.' }];
  const thread = reopen(stored);
  assert.deepEqual(withoutStaleHome(thread), stored);
});

test('kitchen-14: the sheet cleans the stored thread before greeting, and does not chase the end past Home', () => {
  assert.match(SHEET, /const kept = stored \? withoutStaleHome\(stored\) : \[\]/);
  assert.match(SHEET, /if \(isHomeTurn\(thread\[thread\.length - 1\]\)\) return;/);
  assert.match(SHEET, /onLayout=\{b\.key === freshGreeting \? greetingAtTop : undefined\}/);
});

test('kitchen-19: an implausible diary leaves "Left today" out; over is said as none left', () => {
  assert.equal(leftTodayLine({ kcal: 99_999_999, protein: 50 }, { kcal: 2400, protein: 180 }), null);
  assert.equal(leftTodayLine({ kcal: 1200, protein: 99_999 }, { kcal: 2400, protein: 180 }), null);
  assert.equal(leftTodayLine({ kcal: -50, protein: 10 }, { kcal: 2400, protein: 180 }), null);
  const over = leftTodayLine({ kcal: 2700, protein: 200 }, { kcal: 2400, protein: 180 });
  assert.match(over, /no calories left \(300 kcal over the target\)/);
  assert.match(leftTodayLine({ kcal: 1420, protein: 96 }, { kcal: 2400, protein: 180 }), /980 kcal, 84 g protein/);
});

test('kitchen-20: Enter sends on the web, and the composer counts toward what the server accepts', () => {
  assert.match(SHEET, /maxLength=\{COMPOSER_MAX\}/);
  assert.match(SHEET, /const COMPOSER_MAX = ASK_QUESTION_CHARS;/);
  assert.match(SHEET, /onKeyPress=\{Platform\.OS === 'web' \? sendOnEnter : undefined\}/);
  assert.match(SHEET, /k\.key !== 'Enter' \|\| k\.shiftKey \|\| k\.isComposing/);
});

test('kitchen-06: a dish writer that fails says so and offers Try again — no silent recipe-book answer', () => {
  const run = SHEET.slice(SHEET.indexOf('const runKitchen = async'), SHEET.indexOf('const askAloud = async'));
  assert.doesNotMatch(run, /askAloud\(/);
  assert.match(run, /label: 'Try again', patch: \{\}, kitchen: 'go'/);
});

test('holt-22: "Training question" asks for a typed question; without typing the row says what it opens', () => {
  assert.match(SHEET, /label=\{canType \? 'Training question' : 'How do I…\?'\}/);
});

test('holtai-21: a recogniser that cannot hear hides the mic and says to type', () => {
  assert.match(DICTATION, /available: available && !broken/);
  assert.match(SHEET, /dictation\.problem === 'unavailable'/);
});

test('holtai-22 / holt-20: no lifting-only level question, no sleeping-in at noon, no thanks for a decision', () => {
  assert.ok(!VOICE.ask_experience.some((l) => /lifting/i.test(l)));
  assert.ok(!VOICE.greet_second_weekend.some((l) => /sleeps? in/i.test(l)));
  assert.ok(!VOICE.ack.includes('Helpful. Thanks.'));
  assert.match(SHEET, /void advance\(constraints, mode \?\? 'program', 'Okay\.'\)/);
});
