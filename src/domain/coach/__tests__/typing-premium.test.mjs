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
  for (const route of ['crisis', 'urgent', 'care', 'medical', 'out_of_credits', 'offline', 'unclear', 'patch'])
    assert.match(understand, new RegExp(`case '${route}':`), route);
});

test('⚠ a sentence that opens a build passes the same allowance gate as the door, from the athlete facts', () => {
  const understand = sheet.slice(sheet.indexOf('const understand = async'), sheet.indexOf('const process = (text'));
  assert.match(understand, /guard\(opens === 'day' \? 'holt_days_per_month' : 'holt_programs'\)/);
  assert.match(understand, /advance\(\{ \.\.\.athleteFacts\(constraints\), \.\.\.patch \}, opens\)/);
});
