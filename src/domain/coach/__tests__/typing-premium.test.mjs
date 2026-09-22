/**
 * typing-premium.test.mjs — typing to Holt, for the Premium AI add-on only.
 *
 * `interpretTyped` had no caller: the composer, when shown, ran only the literal chip matcher. Now a
 * Premium AI athlete's sentence goes guard → local matcher → model, and the model's day focus (the
 * athlete's own words) is folded into the same `DayFocus` the taps produce.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/typing-premium.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { focusFromText, TYPING_ENABLED } from '../chat-core.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const sheet = readFileSync(path.join(here, '../../../components/forge/CoachChatSheet.tsx'), 'utf8');

test('a day focus said in words becomes the same focus the taps make', () => {
  assert.deepEqual(focusFromText('back and bis'), { kind: 'body_parts', parts: ['back', 'biceps'] });
  assert.deepEqual(focusFromText('chest and arms'), { kind: 'body_parts', parts: ['chest', 'biceps', 'triceps'] });
  assert.deepEqual(focusFromText('abs and cardio'), { kind: 'body_parts', parts: ['core'], cardio: true });
  assert.deepEqual(focusFromText('full body'), { kind: 'split', split: 'full_body' });
  // Said in order, the last split wins — exactly like the last split tapped.
  assert.deepEqual(focusFromText('pull no wait legs'), { kind: 'split', split: 'legs' });
  // Voice dictation of "biceps"/"triceps".
  assert.deepEqual(focusFromText('back and by sips'), { kind: 'body_parts', parts: ['back', 'biceps'] });
});

test('nothing recognisable is null, never a silent full body', () => {
  assert.equal(focusFromText('something quick'), null);
  assert.equal(focusFromText(''), null);
});

test('⚠ the public switch stays off; the composer shows for Premium AI only', () => {
  assert.equal(TYPING_ENABLED, false);
  assert.match(sheet, /const premiumAi = usePremiumAi\(\);/);
  assert.match(sheet, /const canType = TYPING_ENABLED \|\| premiumAi;/);
  assert.match(sheet, /\{preview \|\| !canType \? null : \(/);
});

test('⚠ a Premium AI sentence reaches the model, and the broad word list no longer blocks swaps there', () => {
  assert.match(sheet, /const r = await interpretTyped\(/);
  assert.match(sheet, /if \(premiumAi\) \{\s*void understand\(text\);/);
  assert.match(sheet, /if \(!premiumAi && isMedical\(text\)\)/);
  // Every route the function can return has an answer — an unhandled one would be silence.
  const understand = sheet.slice(sheet.indexOf('const understand = async'), sheet.indexOf('const process = (text'));
  for (const route of ['crisis', 'urgent', 'care', 'medical', 'out_of_credits', 'offline', 'unclear', 'answer', 'door', 'patch'])
    assert.match(understand, new RegExp(`case '${route}':`), route);
});

test('⚠ a sentence that opens a build passes the same allowance gate as the door, from the athlete facts', () => {
  const understand = sheet.slice(sheet.indexOf('const understand = async'), sheet.indexOf('const process = (text'));
  assert.match(understand, /guard\(opens === 'day' \? 'holt_days_per_month' : 'holt_programs'\)/);
  assert.match(understand, /advance\(\{ \.\.\.athleteFacts\(constraints\), \.\.\.patch \}, opens\)/);
});

// ─────────────────────────────────────────────────────────────────────────────
// TALK TO HOLT — the mic (PO 2026-09-21, the phone's own speech recognition)
// ─────────────────────────────────────────────────────────────────────────────

const hook = readFileSync(path.join(here, '../../../hooks/useDictation.ts'), 'utf8');

test('⚠ the speech package is never imported — an older binary without it must not crash on open', () => {
  assert.doesNotMatch(hook, /from ['"]expo-speech-recognition['"]/);
  assert.doesNotMatch(sheet, /expo-speech-recognition/);
  assert.match(hook, /requireOptionalNativeModule<NativeSpeech>\('ExpoSpeechRecognition'\)/);
});

test('spoken words take the typed path, so every guard and the model see them the same way', () => {
  assert.match(sheet, /const dictation = useDictation\(sendText\);/);
  // The mic replaces the empty send button only where the device can hear.
  assert.match(sheet, /const micShown = dictation\.available && !draft\.trim\(\);/);
  assert.match(sheet, /\{micShown \? \(/);
});

test('a refused mic permission is said in plain words, not a silent dead button', () => {
  assert.match(hook, /code === 'not-allowed'/);
  assert.match(sheet, /The mic is off for Forge — turn it on in Settings/);
});

test('a week described day by day is not asked "how many days a week?"', async () => {
  const { nextQuestion } = await import('../chat-core.ts');
  const days = [{ kind: 'lift' }, { kind: 'run', runMi: 3 }, { kind: 'lift' }, { kind: 'rest' }];
  const s = { goal: 'strength', experience: { lifting: 'beginner', running: 'beginner' }, days, weeks: 4, environment: 'full_gym', sessionMinutes: 60, limitations: [] };
  assert.equal(nextQuestion(s, 'program'), null);
  assert.equal(nextQuestion({ ...s, days: undefined }, 'program')?.id, 'days', 'control: without a week, it asks');
});

// ─────────────────────────────────────────────────────────────────────────────
// ASK vs PARSE, streaming answers, typed edits
// ─────────────────────────────────────────────────────────────────────────────

test('a question streams from coach-ask; a request — even phrased as a question — is parsed', async () => {
  const { looksLikeQuestion } = await import('../chat-core.ts');
  for (const q of ['how much should I bench?', 'what is RPE', 'is it ok to train sore?', 'why is lunges in my plan', 'tips for sleep?'])
    assert.equal(looksLikeQuestion(q), true, q);
  for (const r of ['can you make me a 4 day program?', 'could you build me a glute focused plan?', 'swap bench for db press', '4 days', 'legs today, 45 min', 'could you swap my squats for leg press?'])
    assert.equal(looksLikeQuestion(r), false, r);
});

test('⚠ the streamed reply is ONE growing turn, cleared of `streaming` when it ends', () => {
  const ask = sheet.slice(sheet.indexOf('const askAloud = async'), sheet.indexOf('const understand = async'));
  assert.match(ask, /say\(\{ kind: 'holt', text: acc, streaming: true \}\)/);
  assert.match(ask, /last\?\.kind === 'holt' && last\.streaming \? \[\.\.\.t\.slice\(0, i\), \{ \.\.\.last, text: acc \}\] : t/);
  assert.match(ask, /x\.kind === 'holt' && x\.streaming \? \{ \.\.\.x, streaming: undefined \}/);
  for (const route of ['answer', 'crisis', 'urgent', 'care', 'medical', 'out_of_credits', 'offline'])
    assert.match(ask, new RegExp(`case '${route}':`), route);
});

test('⚠ conversation memory is this conversation, eight turns, into both AI jobs', () => {
  assert.match(sheet, /\.slice\(-8\)/);
  assert.match(sheet, /interpretTyped\(text, q, m === 'day' \? 'day' : 'program', constraints, history\)/);
  assert.match(sheet, /askHolt\(text, history, context,/);
});

test('⚠ a typed edit is resolved, confirmed, and applied only on a tap — never saved on its own', () => {
  const edit = sheet.slice(sheet.indexOf('const editByWords = async'), sheet.indexOf('const finishTypedEdit = async'));
  assert.match(edit, /resolveEditIntent\(intent, active\.structure, marks, PICKER_DB/);
  assert.doesNotMatch(edit, /updateProgram\(/, 'resolving must not save');
  const finish = sheet.slice(sheet.indexOf('const finishTypedEdit = async'), sheet.indexOf('const tapChip = (chip'));
  assert.match(finish, /pe\.plan\.apply\(scope\)/);
  assert.match(finish, /await updateProgram\(pe\.programId, res\.structure\)/);
  assert.match(finish, /That change went stale/, 'a chip restored after a reload says so instead of doing nothing');
});
