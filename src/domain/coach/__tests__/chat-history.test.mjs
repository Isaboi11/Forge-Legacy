import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { askHistory, markStopped, CHAT_HISTORY_TURNS } from '../chat-history.ts';
import { stopsForMedical, withoutStoppedTurns } from '../medical-routing.ts';
import { trimHistory, ASK_HISTORY_MAX } from '../ask-wire.ts';
import { narrowHistory } from '../interpret-narrow.ts';

/*
 * ⛔ QA R2-F1 (2026-09-26, Critical): a message the app STOPPED rode along in the history of the next
 * ordinary question, and Holt answered it ("congrats on the pregnancy…"). PO rule 09-22: medical topics stop
 * in the app and never reach a model. These tests pin that a stopped line never appears in a request body —
 * on the phone (`askHistory`) and again on the server (`withoutStoppedTurns`).
 */

const PREGNANT = "I'm 20 weeks pregnant";
const DOCTOR = 'My doctor cleared me to squat again after surgery';
const CRISIS = 'I want to hurt myself';

/** The request body exactly as `coach-ask-live.ts` builds it from a history. */
const askBody = (question, history) => JSON.stringify({ question, history: trimHistory(history, ASK_HISTORY_MAX) });

test('the fixture lines really do stop, and the follow-ups really do not', () => {
  for (const s of [PREGNANT, DOCTOR, CRISIS]) assert.ok(stopsForMedical(s), s);
  for (const s of ['Which exercises should I keep doing?', 'How many sets a week should I do for chest?']) {
    assert.ok(!stopsForMedical(s), s);
  }
});

test('R2-F1 as reported: a stopped message and its stop card never reach the next request', () => {
  let thread = [
    { kind: 'holt', text: "What are we working on?" },
    { kind: 'me', text: PREGNANT },
  ];
  // The sheet's `stopOn`: mark the line and add the card in one update.
  thread = [...markStopped(thread, PREGNANT), { kind: 'stop', text: "That's one for your doctor.", kicker: 'STOP' }];
  thread.push({ kind: 'me', text: 'Which exercises should I keep doing?' });

  const body = askBody('Which exercises should I keep doing?', askHistory(thread));
  assert.ok(!body.includes('pregnant'), body);
  assert.ok(!body.includes('doctor'), 'the stop card must never be sent');
});

test('a MARKED line is dropped even when the words alone would pass the code guard', () => {
  // Premium AI: the model's own routing can stop a line the regex lets through. The mark is what holds it.
  const said = 'my knee has been weird since the fall';
  const thread = markStopped([{ kind: 'me', text: said }, { kind: 'stop', text: 'Physio.' }], said);
  assert.equal(thread[0].stopped, true);
  assert.deepEqual(askHistory(thread), []);
});

test('an UNMARKED medical line (a thread stored before the mark) is dropped by the guard, with Holt’s reply', () => {
  const thread = [
    { kind: 'me', text: 'How many rest days?' },
    { kind: 'holt', text: 'Two is plenty.' },
    { kind: 'me', text: CRISIS },
    { kind: 'holt', text: 'Here is some advice about that.' },
    { kind: 'me', text: DOCTOR },
    { kind: 'holt', text: 'Great, with that clearance let us build a leg day.' },
    { kind: 'me', text: 'Cool.' },
  ];
  const h = askHistory(thread);
  assert.deepEqual(
    h.map((t) => t.text),
    ['How many rest days?', 'Two is plenty.', 'Cool.'],
  );
});

test('the window is cut AFTER the drop, so it stays full', () => {
  const thread = [];
  for (let i = 0; i < 10; i += 1) thread.push({ kind: 'me', text: `set question ${i}` });
  thread.push({ kind: 'me', text: PREGNANT, stopped: true }, { kind: 'stop', text: 'x' });
  const h = askHistory(thread);
  assert.equal(h.length, CHAT_HISTORY_TURNS);
  assert.equal(h.at(-1).text, 'set question 9');
});

test('the end-of-chat summary builder (max Infinity) drops stopped lines too', () => {
  const h = askHistory([{ kind: 'me', text: 'hi' }, { kind: 'me', text: PREGNANT, stopped: true }], Infinity);
  assert.deepEqual(h.map((t) => t.text), ['hi']);
});

test('markStopped marks every unmarked copy of the words, and nothing else', () => {
  const t = [
    { kind: 'me', text: PREGNANT },
    { kind: 'me', text: 'other' },
    { kind: 'holt', text: PREGNANT },
    { kind: 'me', text: ` ${PREGNANT} ` },
  ];
  const m = markStopped(t, PREGNANT);
  assert.equal(m[0].stopped, true);
  assert.equal(m[1].stopped, undefined);
  assert.equal(m[2].stopped, undefined);
  assert.equal(m[3].stopped, true);
  assert.equal(markStopped(m, PREGNANT), m, 'no change → same array');
});

test('SERVER: withoutStoppedTurns drops a stopping turn in either voice (a client is not a boundary)', () => {
  const raw = [
    { role: 'athlete', text: PREGNANT },
    { role: 'holt', text: 'Congrats! Here is a pregnancy plan.' },
    { role: 'athlete', text: 'Rep range for size?' },
    { role: 'holt', text: 'Ask your doctor.' }, // a spoofed / leaked holt line that stops is dropped too
    { role: 'holt', text: '8 to 12.' },
  ];
  assert.deepEqual(withoutStoppedTurns(trimHistory(raw, 32)).map((t) => t.text), ['Rep range for size?', '8 to 12.']);
  assert.deepEqual(withoutStoppedTurns(narrowHistory(raw)).map((t) => t.text), ['Rep range for size?', '8 to 12.']);
});

// ── Wiring (source-level: the .tsx and the Deno functions cannot be imported by node --test) ─────────────
const read = (rel) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8').replace(/\r\n/g, '\n');

test('every stop card in the sheet goes through stopOn, which marks the line', () => {
  const sheet = read('src/components/forge/CoachChatSheet.tsx');
  assert.match(sheet, /const stopOn = \(said: string, card: Turn\) => setThread\(\(t\) => \[\.\.\.markStopped\(t, said\), \.\.\.stamped\(\[card\]\)\]\);/);
  // Only the four helpers build a stop card; nothing says one directly.
  const direct = sheet.match(/kind: 'stop'/g) ?? [];
  const viaStopOn = sheet.match(/stopOn\(text, \{ kind: 'stop'/g) ?? [];
  assert.equal(direct.length, viaStopOn.length, 'a stop card was added without marking the line it stopped');
  assert.doesNotMatch(sheet, /careStop\(\)/);
  // The one history builder, used by every caller.
  assert.doesNotMatch(sheet, /x\.kind === 'me' \|\| x\.kind === 'holt'/, 'a second history builder is back');
  assert.match(sheet, /summarizeChat\(askHistory\(turns, Infinity\)\)/);
});

test('the Edge Functions guard every history turn, and the paste bundles carry it', () => {
  const ask = read('supabase/functions/coach-ask/index.ts');
  assert.match(ask, /withoutStoppedTurns\(trimHistory\(body\.history, ASK_HISTORY_MAX \* 4\)\)/);
  const interp = read('supabase/functions/coach-interpret/index.ts');
  assert.match(interp, /const history = withoutStoppedTurns\(narrowHistory\(body\.history\)\);/);
  for (const b of ['supabase/apply/deploy-coach-ask.ts', 'supabase/apply/deploy-coach-interpret.ts']) {
    assert.match(read(b), /withoutStoppedTurns/, `${b} is stale — regenerate it`);
  }
});

// ── QA R2-F5: two answers in flight never write into each other ────────────────────────────────────────
test('each coach-ask stream writes and closes ONLY its own turn, and the queue waits for the stream', () => {
  const sheet = read('src/components/forge/CoachChatSheet.tsx');
  assert.match(sheet, /say\(\{ kind: 'holt', text: acc, streaming: true, sid \}\)/);
  // The per-sid writes live in chat-core (`streamInto` / `streamEnded`) — run with fake streams in stream-turns.test.mjs.
  assert.match(sheet, /setThread\(\(t\) => streamInto\(t, sid, acc\)\)/);
  assert.match(sheet, /setThread\(\(t\) => streamEnded\(t, sid\)\)/);
  assert.doesNotMatch(sheet, /const last = t\[i\];\s*return last\?\.kind === 'holt' && last\.streaming/);
  assert.match(sheet, /const streamingNow = answerArriving\(thread\);/);
  assert.match(sheet, /const holding = busy != null \|\| streamingNow;/);
  assert.match(sheet, /if \(holding\) \{\s*queued\.current\.push\(text\);/);
  assert.match(sheet, /if \(holding \|\| queued\.current\.length === 0\) return;/);
  // A reply saved mid-stream must not restore as "still arriving" and hold the queue forever.
  assert.match(read('src/lib/coach-thread.ts'), /streaming: undefined, sid: undefined/);
});
