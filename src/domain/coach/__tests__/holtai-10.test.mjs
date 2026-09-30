/**
 * QA holtai-10 — the stop card's words fit what stopped it.
 *
 * Pregnancy and "my doctor cleared me" were told "That's a physio's job, not mine. Get it looked at": the wrong
 * person, and a checked athlete told to get checked. An under-18 food question in the kitchen lost its recipe
 * door. The wording is draft (PO and legal pick it); what is held here is WHICH line each sentence gets.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { isClinicianStop, CLINICIAN_STOP, MEDICAL_STOP } from '../chat-core.ts';
import { medicalRoute } from '../medical-routing.ts';
import { medicalStopIsDietitian } from '../kitchen.ts';

const DOCTOR = [
  "I'm pregnant, can I still squat?",
  'I’m 20 weeks pregnant, build me a week',
  'my doctor cleared me to lift again, build me a program',
  'my surgeon said I can train again, build me a week',
  'I have epilepsy, is that ok for HIIT?',
  "I'm on blood pressure medication, build me a week",
];
const PHYSIO = ['I tore my ACL last week', 'I sprained my ankle, swap my leg day', 'my shoulder has a pinched nerve'];

test('pregnancy, conditions and a clearance stop — and name the doctor, not a physio', () => {
  for (const t of DOCTOR) {
    assert.notEqual(medicalRoute(t), 'clear', `still stops: ${t}`);
    assert.equal(isClinicianStop(t), true, t);
    assert.equal(medicalStopIsDietitian(t, false), false, `training chat, not the dietitian line: ${t}`);
  }
  assert.doesNotMatch(CLINICIAN_STOP, /looked at|physio/i, 'never "get it looked at" to somebody who has been');
});

test('an injury keeps the physio line', () => {
  for (const t of PHYSIO) {
    assert.notEqual(medicalRoute(t), 'clear', t);
    assert.equal(isClinicianStop(t), false, t);
  }
  assert.match(MEDICAL_STOP, /physio/);
});

test('the sheet picks the line, and an under-18 kitchen stop keeps a recipe door', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const sheet = readFileSync(path.join(here, '../../../components/forge/CoachChatSheet.tsx'), 'utf8');
  assert.match(sheet, /isClinicianStop\(text\) \? CLINICIAN_STOP : MEDICAL_STOP/);
  assert.match(sheet, /if \(kitchen && MINOR_AGE\.test\(text\)\) \{[\s\S]{0,200}kitchenAsk\.current\.ask = '';[\s\S]{0,200}kitchen: 'go'/);
  assert.equal(medicalRoute("I'm 16, what macros should I eat to cut?"), 'care', 'the stop itself is unchanged');
});

/* ── QA holtai-11: the crisis and emergency cards have something to tap ─────────────────────────────── */

test('holtai-11 — crisis offers Call and Text 988, an emergency Call 911, every other stop nothing', async () => {
  const { stopCalls, CRISIS_KICKER, CRISIS_STOP, URGENT_KICKER, URGENT_STOP, CARE_KICKER, STOP_KICKER } = await import('../chat-core.ts');
  assert.deepEqual(stopCalls(CRISIS_KICKER).map((c) => c.url), ['tel:988', 'sms:988']);
  assert.deepEqual(stopCalls(URGENT_KICKER).map((c) => c.url), ['tel:911']);
  // Each button's number is one its own line already names — the buttons add no number of their own.
  assert.match(CRISIS_STOP, /988/);
  assert.match(URGENT_STOP, /911/);
  for (const k of [CARE_KICKER, STOP_KICKER, undefined]) assert.deepEqual(stopCalls(k), []);
  const here = path.dirname(fileURLToPath(import.meta.url));
  const read = (f) => readFileSync(path.join(here, f), 'utf8');
  assert.match(read('../../../components/forge/CoachChatSheet.tsx'), /<StopCalls kicker=\{turn\.kicker\} \/>/);
  assert.match(read('../../../app/form-check.tsx'), /<StopCalls kicker=\{stage\.kicker\} \/>/);
});
