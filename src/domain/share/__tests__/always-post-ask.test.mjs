import test from 'node:test';
import assert from 'node:assert/strict';

import { alwaysPostAsk, answerAlwaysPost, sanitizeAutoPost } from '../auto-post.ts';

/* The PO's real pref on 11-18, before the fix: auto-post saved in August with two squads, then a third
   squad (Til' Valhalla) created 11-12 that was ticked by hand on every workout since. */
const DA_BOIS = 'e3ec430d-3166-4261-b4a0-29176d2cd61f';
const MOCH_1 = '1fe9ea46-21b6-4fa6-8b32-919573dafe7f';
const VALHALLA = 'f205dd9c-6090-4fcc-bba2-c0c5ded7daae';
const REAL = sanitizeAutoPost({ asked: true, friends: true, squadIds: [DA_BOIS, MOCH_1] });
const MEMBER = [MOCH_1, DA_BOIS, VALHALLA];

test('asks about the newest squad when it is ticked by hand and not in auto-post', () => {
  assert.equal(alwaysPostAsk(REAL, [DA_BOIS, MOCH_1, VALHALLA], MEMBER), VALHALLA);
});

test('never asks when the selection is only auto-post squads', () => {
  assert.equal(alwaysPostAsk(REAL, [DA_BOIS, MOCH_1], MEMBER), null);
});

test('never asks while auto-post is off — that is the first-post prompt’s job', () => {
  const off = sanitizeAutoPost({ asked: true, friends: false, squadIds: [] });
  assert.equal(alwaysPostAsk(off, [VALHALLA], MEMBER), null);
});

test('auto-post that pruned to nothing counts as off', () => {
  const gone = sanitizeAutoPost({ asked: true, friends: false, squadIds: ['left-this-one'] });
  assert.equal(alwaysPostAsk(gone, [VALHALLA], MEMBER), null);
});

test('never asks about a squad they are no longer in', () => {
  assert.equal(alwaysPostAsk(REAL, [VALHALLA], [DA_BOIS, MOCH_1]), null);
});

test('Yes adds the squad; it is not asked again', () => {
  const yes = answerAlwaysPost(REAL, VALHALLA, true);
  assert.deepEqual(yes.squadIds, [DA_BOIS, MOCH_1, VALHALLA]);
  assert.equal(alwaysPostAsk(yes, [DA_BOIS, MOCH_1, VALHALLA], MEMBER), null);
});

test('No is remembered across a save round-trip; it is not asked again and does not post there', () => {
  const no = sanitizeAutoPost(JSON.parse(JSON.stringify(answerAlwaysPost(REAL, VALHALLA, false))));
  assert.deepEqual(no.squadIds, [DA_BOIS, MOCH_1]);
  assert.deepEqual(no.declined, [VALHALLA]);
  assert.equal(alwaysPostAsk(no, [DA_BOIS, MOCH_1, VALHALLA], MEMBER), null);
});

test('after one squad is answered, the next unanswered one is asked', () => {
  const no = answerAlwaysPost(REAL, VALHALLA, false);
  assert.equal(alwaysPostAsk(no, [VALHALLA, 'sq-4'], [...MEMBER, 'sq-4']), 'sq-4');
});

test('a pref that never met the question reads back without a declined key', () => {
  assert.equal('declined' in REAL, false);
  assert.equal('declined' in sanitizeAutoPost({ friends: true, squadIds: [], declined: [3, ''] }), false);
});

test('answering twice changes nothing', () => {
  const yes = answerAlwaysPost(REAL, VALHALLA, true);
  assert.equal(answerAlwaysPost(yes, VALHALLA, true), yes);
  const no = answerAlwaysPost(REAL, VALHALLA, false);
  assert.equal(answerAlwaysPost(no, VALHALLA, false), no);
});
