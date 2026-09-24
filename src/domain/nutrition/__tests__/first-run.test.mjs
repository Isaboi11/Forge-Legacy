import test from 'node:test';
import assert from 'node:assert/strict';

import { isFirstRun } from '../first-run.ts';

const fresh = { startedBefore: false, heldWrites: 0, anyEntry: false, anyTarget: false };

test('a clean read of nothing ever is a first run', () => {
  assert.equal(isFirstRun(fresh), true);
});

test('any food or any target ends it', () => {
  assert.equal(isFirstRun({ ...fresh, anyEntry: true }), false);
  assert.equal(isFirstRun({ ...fresh, anyTarget: true }), false);
});

test('food held offline counts as started', () => {
  assert.equal(isFirstRun({ ...fresh, heldWrites: 1 }), false);
});

test('once started on this device, deleting everything does not bring the welcome back', () => {
  assert.equal(isFirstRun({ ...fresh, startedBefore: true }), false);
});

test('a failed read fails toward Home, never toward the welcome', () => {
  assert.equal(isFirstRun({ ...fresh, anyEntry: null }), false);
  assert.equal(isFirstRun({ ...fresh, anyTarget: null }), false);
});
