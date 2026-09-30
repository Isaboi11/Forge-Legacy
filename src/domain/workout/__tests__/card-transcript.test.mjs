import test from 'node:test';
import assert from 'node:assert/strict';

import { cleanCardTranscript, MAX_CARD_CHARS, MAX_CARD_LINES } from '../card-transcript.ts';
import { S12_DAY1_CARD } from './fixtures/squatober-2026-day1.mjs';

/*
 * The guard on a photographed card's text. `program-photo-read`'s guard is "no tab, no line"; a card is read line
 * by line, so that rule cannot stand here. This one can: no sets or reps in the answer means it is not a workout.
 */

test('the real card read (Season 12 Day 1) is accepted, whole', () => {
  const r = cleanCardTranscript(S12_DAY1_CARD);
  assert.equal(r.ok, true);
  assert.match(r.text, /"DEEP End Diving"/);
  assert.match(r.text, /1\. BACK SQUAT 5 reps 60%, 65%, 70%/);
  assert.match(r.text, /8\+ hrs of DEEP sleep/);
});

test('a description of a photograph, or of a person in one, is refused — it has no sets or reps in it', () => {
  for (const prose of [
    'The image shows a man standing in a gym next to a squat rack. He is wearing a grey shirt and appears to be resting.',
    'A handwritten note on white paper with a drawing of a pumpkin and three bats.',
    'Sorry, I can’t help with that.',
  ]) {
    assert.deepEqual(cleanCardTranscript(prose), { ok: false, reason: 'not_a_program' }, prose);
  }
});

test('the model’s own "not a workout" is a refusal, never text for the box', () => {
  assert.deepEqual(cleanCardTranscript('NOT_A_WORKOUT'), { ok: false, reason: 'not_a_program' });
  assert.deepEqual(cleanCardTranscript('NOT_A_WORKOUT\n1. Squat 5 sets of 5 reps'), { ok: false, reason: 'not_a_program' });
});

test('nothing, or not text, is unreadable — and never a throw', () => {
  for (const v of ['', '   \n  ', null, undefined, 42, {}]) assert.deepEqual(cleanCardTranscript(v), { ok: false, reason: 'unreadable' });
});

test('code fences and trailing space come off; the card’s own lines stay as they are', () => {
  const r = cleanCardTranscript('```\n1. Back Squat 5 sets of 5 reps @ 75%   \r\n\n\n\n* 2 min rest\n```');
  assert.deepEqual(r, { ok: true, text: '1. Back Squat 5 sets of 5 reps @ 75%\n\n* 2 min rest' });
});

test('it is capped, in lines and in characters', () => {
  const long = Array.from({ length: 400 }, (_, i) => `${i + 1}. Squat 5 sets of 5 reps`).join('\n');
  const r = cleanCardTranscript(long);
  assert.equal(r.ok, true);
  assert.ok(r.text.split('\n').length <= MAX_CARD_LINES);
  const wide = cleanCardTranscript(`1. Squat 5 sets of 5 reps ${'x'.repeat(20000)}`);
  assert.ok(wide.text.length <= MAX_CARD_CHARS);
});
