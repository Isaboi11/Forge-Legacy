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
/* The typed edit flow moved into the engine (Holt Listens HL-10 S2) — same code, reads/writes through the port. */
const engineEdit = readFileSync(path.join(here, '../engine/edit.ts'), 'utf8');
const finishOf = () => engineEdit.slice(engineEdit.indexOf('export async function finishTypedEdit('), engineEdit.indexOf('export function clearEdit('));

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
  // Sprint 4a (PO 11-18): coach-interpret is retired from this app — every typed line goes to Holt's chat with the caps.
  assert.doesNotMatch(sheet, /interpretTyped\(/);
  assert.match(sheet, /return askAloud\(text, history, q, \{ building: buildingLine\(q, m\) \}\);/);
  assert.match(sheet, /if \(premiumAi\) \{\s*void understand\(text\);/);
  assert.match(sheet, /if \(!premiumAi && isMedical\(text\)\)/);
  // Every route the function can return has an answer — an unhandled one would be silence.
  const understand = sheet.slice(sheet.indexOf('const respondTo = async'), sheet.indexOf('const process = (text'));
  for (const route of ['crisis', 'urgent', 'care', 'medical', 'out_of_credits', 'offline', 'unclear', 'answer', 'door', 'patch'])
    assert.match(understand, new RegExp(`case '${route}':`), route);
});

test('⚠ a sentence that opens a build passes the same allowance gate as the door, from the athlete facts', () => {
  const understand = sheet.slice(sheet.indexOf('const respondTo = async'), sheet.indexOf('const process = (text'));
  assert.match(understand, /if \(opens === 'day' && !guard\('holt_days_per_month'\)\)/);
  // A block asks by its length (MA4-D5): a typed one-week deload asks for a training week.
  assert.match(understand, /if \(opens === 'program' && blockDoorRefuses\(patch\.weeks\)\) return;/);
  assert.match(understand, /const request: ChatState = \{ \.\.\.athleteFacts\(constraints\), \.\.\.patch \};/);
  assert.match(understand, /advance\(request, opens\)/);
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
  // ...and while the composer holds only Kitchen Mode's "What can I make with " seed (2026-09-25).
  // ...and never while a picture waits to be sent — then the button is Send (PO 2026-09-27).
  assert.match(sheet, /const micShown = dictation\.available && !picture && \(!draft\.trim\(\) \|\| draft === KITCHEN_MAKE_SEED\);/);
  // CH-6 (Sprint 3a): Stop takes the button first while an ask runs and the composer is empty; then the mic.
  assert.match(sheet, /\{stoppable \? \([\s\S]{0,600}?\) : micShown \? \(/);
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
  // By stream id (`sid`), never "the last streaming turn" — two answers in flight wrote into each other (QA R2-F5).
  assert.match(ask, /say\(\{ kind: 'holt', text: acc, streaming: true, sid \}\)/);
  assert.match(ask, /setThread\(\(t\) => streamInto\(t, sid, acc\)\)/);
  assert.match(ask, /setThread\(\(t\) => streamEnded\(t, sid\)\)/);
  for (const route of ['answer', 'crisis', 'urgent', 'care', 'medical', 'out_of_credits', 'offline'])
    assert.match(ask, new RegExp(`case '${route}':`), route);
});

test('⚠ conversation memory is this conversation, eight turns, into both AI jobs', () => {
  // The eight-turn window (and the stopped-line drop, QA R2-F1) lives in the one builder, `askHistory`.
  assert.match(sheet, /const historyFrom = \(t: Turn\[\]\): AskTurn\[\] => askHistory\(rewound\.current \?\? t\);/);
  assert.match(readFileSync(path.join(here, '../chat-history.ts'), 'utf8'), /export const CHAT_HISTORY_TURNS = 8;/);
  // Sprint 4a: the notes are read before the ask (the build's coach-author write carries them as `heardNotes`).
  assert.match(sheet, /await within\(ASK_CONTEXT_MS, loadNotes\(\), \[\]\);/);
  assert.match(sheet, /streamCoachAsk\(\s*text,\s*history,\s*context,/);
});

test('⚠ a typed edit is resolved, confirmed, and applied only on a tap — never saved on its own', () => {
  const edit = engineEdit.slice(engineEdit.indexOf('export async function editByWords('), engineEdit.indexOf('export async function finishTypedEdit('));
  // `wanted` since Sprint 2 (C-I7): the sheet's `intent` prop is in scope, and no name shadows another.
  assert.match(edit, /resolveEditIntent\(wanted, active\.structure, marks, port\.catalog/);
  assert.doesNotMatch(edit, /programs\.update\(/, 'resolving must not save');
  const finish = finishOf();
  assert.match(finish, /pe\.plan\.apply\(scope\)/);
  // What the athlete confirmed is what saves — stamped "Updated by Holt" on the way (PO 2026-10-01).
  assert.match(finish, /const saved = markHoltChange\(pe\.before, res\.structure, \{/);
  assert.match(finish, /await port\.programs\.update\(pe\.programId, saved\)/);
  assert.match(finish, /That change went stale/, 'a chip restored after a reload says so instead of doing nothing');
});

test('⚠ several things in one message run in order; a skip saves as skip marks; what they said is remembered', () => {
  const u = sheet.slice(sheet.indexOf('const understand = async'), sheet.indexOf('const process = (text'));
  // Sprint 4a: several things are several actions, run in order by `actOn` (one build/door/edit, then cards); a fact
  // they told him is a remember_note CARD now — offered, never saved silently.
  const act = sheet.slice(sheet.indexOf('const actOn = async ('), sheet.indexOf('return { shown, flow };'));
  assert.match(act, /for \(const step of plan\.steps\) \{/);
  assert.match(act, /const cards = held \? await hold\.release\(end, await liveCardContext\(\{ units, nutritionAccess \}\)\) : \[\];/);
  assert.doesNotMatch(sheet, /rememberSaid\(/);
  void u;
  const finish = finishOf();
  assert.match(finish, /if \(pe\.plan\.kind === 'skip'\) \{\s*for \(const at of pe\.plan\.sessions\) await port\.programs\.skip\(pe\.programId, at\.weekIndex, at\.dayIndex\);/);
  // Loaded in parallel with the program and the recipe book since 2026-09-25 (`Promise.all`).
  assert.match(sheet, /askBriefLive\(text, units\)/);
});

test('a picture for Holt is Premium AI only, and is read before any screen opens (PO 2026-09-27)', () => {
  // The button exists only for the add-on: every read spends Premium AI credits.
  assert.match(sheet, /\{premiumAi && !dictation\.listening \? \(\s*<Pressable\s*onPress=\{\(\) => void attach\(\)\}/);
  // A web paste is listened for only with the add-on too.
  assert.match(sheet, /if \(Platform\.OS !== 'web' \|\| !premiumAi \|\| typeof window === 'undefined'\) return;/);
  // Program and template reads go through the same caps as the other import doors, before anything is spent.
  assert.match(sheet, /if \(!guard\('imports'\)\) return;\s*if \(!guard\(kind === 'program' \? 'programs' : 'templates'\)\) return;\s*\}\s*setBusy\('reading'\);/);
  // A recipe needs Nutrition; the reader refuses without it anyway, but no credit-spending call is made.
  assert.match(sheet, /if \(kind === 'recipe' && !nutritionAccess\) \{/);
});
