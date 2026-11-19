/**
 * undo-typed.test.mjs — "undo that", typed, undoes Holt's last change; a sentence that merely contains "undo" does not
 * (live run 11-19: the model answered "leaving it as it is" about a change that had already SAVED).
 *
 * Run (from the repo root):  node --test --experimental-strip-types src/domain/coach/engine/__tests__/undo-typed.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { isUndoAsk } from '../turn.ts';

test('asks to take back the last change', () => {
  for (const t of ['Actually never mind, undo that.', 'undo', 'Undo it', 'put it back', 'change it back please', 'never mind', 'revert the change', 'can you undo what you just did', 'take that back', 'go back to how it was'])
    assert.equal(isUndoAsk(t), true, t);
});

test('sentences that only contain the word are NOT an undo', () => {
  for (const t of ['I want to undo my squat depth issues by adding box squats', 'take it back to 4 days', 'never mind the cardio, add more core', 'how do I undo a missed session?', 'add face pulls'])
    assert.equal(isUndoAsk(t), false, t);
});
