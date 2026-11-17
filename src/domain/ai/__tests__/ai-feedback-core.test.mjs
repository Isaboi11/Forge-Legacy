// node --experimental-strip-types --test src/domain/ai/__tests__/ai-feedback-core.test.mjs
//
// "Was this helpful?" — the vocabulary and the control's states (0269 `ai_feedback`).
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AI_FEEDBACK_FEATURES,
  AI_FEEDBACK_FEATURE_LABEL,
  AI_FEEDBACK_IDLE,
  HELPFUL_LABEL,
  NOT_HELPFUL_LABEL,
  aiFeedbackA11y,
  aiFeedbackStep,
  aiFeedbackWrites,
  isAiRef,
  shownVote,
  turnRef,
} from '../ai-feedback-core.ts';

const step = (s, ...events) => events.reduce(aiFeedbackStep, s);

test('the eight features, each with a label', () => {
  assert.deepEqual([...AI_FEEDBACK_FEATURES], ['chat', 'kitchen', 'meal_photo', 'form_check', 'import', 'author', 'interpret', 'recipe_photo']);
  for (const f of AI_FEEDBACK_FEATURES) assert.ok(AI_FEEDBACK_FEATURE_LABEL[f], f);
});

test('refs: what the table accepts, and one made once per chat turn from its stamp', () => {
  assert.equal(isAiRef('chat-1731800000000'), true);
  assert.equal(isAiRef('0b5a6c1e-2f43-4c1d-9a1e-6f3c2d1b0a99'), true);
  assert.equal(isAiRef(''), false);
  assert.equal(isAiRef('has space'), false);
  assert.equal(isAiRef('x'.repeat(121)), false);
  assert.equal(isAiRef(42), false);
  assert.equal(turnRef('chat', 1731800000000.4), 'chat-1731800000000');
  assert.equal(turnRef('kitchen', 1731800000000), 'kitchen-1731800000000');
  assert.equal(turnRef('author', undefined), null, 'a thread stored before v2 has no stamp — no control');
  assert.equal(turnRef('chat', NaN), null);
  assert.equal(turnRef('chat', 0), null);
  assert.equal(isAiRef(turnRef('author', Date.now())), true);
});

test('idle → tap Helpful → saved: chosen at once, then held', () => {
  const sending = step(AI_FEEDBACK_IDLE, { type: 'tap', rating: 1 });
  assert.deepEqual(sending, { vote: null, pending: 1, failed: false });
  assert.equal(shownVote(sending), 1, 'optimistic');
  assert.deepEqual(aiFeedbackA11y(sending, 1), { label: HELPFUL_LABEL, selected: true, busy: true });
  assert.deepEqual(aiFeedbackA11y(sending, -1), { label: NOT_HELPFUL_LABEL, selected: false, busy: false });
  const saved = step(sending, { type: 'saved', rating: 1 });
  assert.deepEqual(saved, { vote: 1, pending: null, failed: false });
  assert.deepEqual(aiFeedbackA11y(saved, 1), { label: 'Helpful', selected: true, busy: false });
});

test('a re-tap on the other one changes the vote; on the same one it does nothing (never withdrawn)', () => {
  const helpful = step(AI_FEEDBACK_IDLE, { type: 'tap', rating: 1 }, { type: 'saved', rating: 1 });
  assert.equal(aiFeedbackWrites(helpful, 1), false, 'the same vote again writes nothing');
  assert.equal(step(helpful, { type: 'tap', rating: 1 }), helpful);
  assert.equal(aiFeedbackWrites(helpful, -1), true);
  const changed = step(helpful, { type: 'tap', rating: -1 }, { type: 'saved', rating: -1 });
  assert.deepEqual(changed, { vote: -1, pending: null, failed: false });
});

test('a failed write goes back to what was saved and says so; the next tap clears the line', () => {
  const helpful = step(AI_FEEDBACK_IDLE, { type: 'tap', rating: 1 }, { type: 'saved', rating: 1 });
  const failed = step(helpful, { type: 'tap', rating: -1 }, { type: 'failed', rating: -1 });
  assert.deepEqual(failed, { vote: 1, pending: null, failed: true });
  assert.equal(shownVote(failed), 1, 'the selection returns to the saved vote');
  const retry = step(failed, { type: 'tap', rating: -1 });
  assert.equal(retry.failed, false);
  assert.equal(retry.pending, -1);
  // From idle, a failed first vote shows nothing chosen.
  assert.equal(shownVote(step(AI_FEEDBACK_IDLE, { type: 'tap', rating: -1 }, { type: 'failed', rating: -1 })), null);
});

test('one write at a time: a tap while one is out is ignored, and a stray answer changes nothing', () => {
  const sending = step(AI_FEEDBACK_IDLE, { type: 'tap', rating: 1 });
  assert.equal(aiFeedbackWrites(sending, -1), false);
  assert.equal(step(sending, { type: 'tap', rating: -1 }), sending);
  assert.equal(step(sending, { type: 'saved', rating: -1 }), sending, 'not the write in flight');
  assert.equal(step(AI_FEEDBACK_IDLE, { type: 'saved', rating: 1 }), AI_FEEDBACK_IDLE);
  assert.equal(step(AI_FEEDBACK_IDLE, { type: 'failed', rating: 1 }), AI_FEEDBACK_IDLE);
});
