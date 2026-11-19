/**
 * listens.test.mjs — Holt hears "the whole program" and "replace it", and never asks the same question twice
 * (Holt Listens step 1, tester report 2026-11-18).
 *
 * Run (from the repo root):  node --test --experimental-strip-types src/domain/coach/__tests__/listens.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { sameAskAgain, splitSessionPicker, wholeProgramAsk } from '../listens.ts';

test('⭐ the tester\'s own words, verbatim (2026-11-18)', () => {
  assert.equal(wholeProgramAsk('I want to edit the entire workout to include what I’ve mentioned above.'), 'whole');
  assert.equal(wholeProgramAsk('I want to replace the entire program'), 'replace');
});

test('replace / start over, in the ways people say it', () => {
  for (const s of [
    'replace my program',
    'scrap the whole plan and redo it',
    "let's start over",
    'start from scratch',
    'just give me a brand new program',
    'I want a new plan with all of that',
    'ditch this block',
    'get rid of the current routine',
  ]) assert.equal(wholeProgramAsk(s), 'replace', s);
});

test('whole-program changes', () => {
  for (const s of [
    'change the whole program',
    'add abs to the entire block',
    'put face pulls in every pull day',
    'add core to every session',
    'all of the sessions should have cardio',
    'do it across the program',
    'apply it to all of them',
    'more cable work overall',
    'the full program needs rear delts',
  ]) assert.equal(wholeProgramAsk(s), 'whole', s);
});

test('one-session changes are NOT program-wide — the edit flow runs as before', () => {
  for (const s of [
    'swap bench for dumbbell press on Monday',
    'change the whole workout today',
    'make tomorrow shorter',
    'add a set of curls to Week 5 Pull',
    'take out lunges on leg day',
    '',
    null,
  ]) assert.equal(wholeProgramAsk(s), null, String(s));
});

test('a "new day/session" is not a new program', () => {
  assert.equal(wholeProgramAsk('give me a new session for legs'), null);
});

test('the loop breaker: same question, same words → true; anything different → false', () => {
  const ask = { ask: 'which_day', message: 'Which session should change?' };
  assert.equal(sameAskAgain(null, ask), false);
  assert.equal(sameAskAgain(ask, { ...ask }), true);
  assert.equal(sameAskAgain(ask, { ask: 'which_exercise', message: 'Which session should change?' }), false);
  assert.equal(sameAskAgain(ask, { ask: 'which_day', message: 'Which session in week 5?' }), false);
});

const S = (weekIndex, dayIndex) => ({ at: { weekIndex, dayIndex }, label: `W${weekIndex + 1}D${dayIndex + 1}` });

test('⭐ the 22-chip wall: week 4 day 4 → week 8 → this week and next as chips, weeks 6–8 one tap away', () => {
  const sessions = [S(3, 3), S(3, 4)];
  for (let w = 4; w < 8; w += 1) for (let d = 0; d < 5; d += 1) sessions.push(S(w, d));
  assert.equal(sessions.length, 22);
  const { now, laterWeeks } = splitSessionPicker(sessions);
  assert.deepEqual(now.map((s) => s.label), ['W4D4', 'W4D5', 'W5D1', 'W5D2', 'W5D3', 'W5D4', 'W5D5']);
  assert.deepEqual(laterWeeks, [5, 6, 7]);
});

test('a short list stays whole', () => {
  const sessions = [S(0, 0), S(0, 1), S(1, 0)];
  assert.deepEqual(splitSessionPicker(sessions), { now: sessions, laterWeeks: [] });
});

// ── The sheet uses them (source pins, like the other chat-sheet tests) ──
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SHEET = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../components/forge/CoachChatSheet.tsx'), 'utf8').replace(/\r\n/g, '\n');

test('sheet: a TYPED request meets the active-program question with its words carried, not the canned line', () => {
  // The guard lives in the engine since HL-10 S1; engine/__tests__/s1-guards.test.mjs runs it for real.
  const GUARDS = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../engine/guards.ts'), 'utf8').replace(/\r\n/g, '\n');
  assert.match(GUARDS, /if \(refs\.typed\.length\) \{\n\s+sink\.say\(\n\s+\{ kind: 'holt', text: typedGuardLine\(active\.name\), live: true \}/);
  assert.match(GUARDS, /\{ label: BUILD_THE_NEW_ONE, patch: \{\} \},\n\s+\{ label: JUST_A_WEEK, patch: \{ weeks: 1 \} \},\n\s+\{ label: KEEP_AND_CHANGE, patch: \{\} \},/);
  assert.match(SHEET, /engineGuard\(engine\.current, port, sink, request\)/);
});

// The edit flow is the engine's since HL-10 S2 (engine/__tests__/s2-edit.test.mjs runs it for real).
const EDIT = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../engine/edit.ts'), 'utf8').replace(/\r\n/g, '\n');

test('engine: the edit flow hears "replace" and "the whole program" before it asks for a session', () => {
  assert.match(EDIT, /if \(!res\.ok && res\.ask === 'which_day'\) \{\n\s+const whole = wholeProgramAsk\(said\);/);
  assert.match(EDIT, /return void hooks\.buildTheNewOne\(said, REPLACE_LINE\);/);
  assert.match(EDIT, /if \(whole === 'whole' && !rowChange\) \{/);
});

test('engine: the loop breaker runs before the question is asked again', () => {
  const loop = EDIT.indexOf('sameAskAgain(refs.lastEditAsk');
  const ask = EDIT.indexOf("refs.lastEditAsk = res.ask === 'not_editable' ? null");
  assert.ok(loop > 0 && ask > loop);
});

test('engine: the session picker is split, and a later week opens to its sessions', () => {
  assert.match(EDIT, /const \{ now, laterWeeks \} = splitSessionPicker\(sessions\);/);
  assert.match(EDIT, /if \(pickStep\.step === 'week'\) \{/);
});
