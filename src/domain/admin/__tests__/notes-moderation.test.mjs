import test from 'node:test';
import assert from 'node:assert/strict';

import { daysSince, moderationNote, moderationSummary, waitingTag } from '../notes/moderation.ts';

test('note + summary: normal', () => {
  const i = { open: 2, actioned: 14, dismissed: 5, oldestOpenDays: 3, hiddenFoods: 1 };
  assert.equal(moderationNote(i), '2 reports waiting, the oldest waiting 3 days. 1 shared food is hidden by reports.');
  assert.equal(moderationSummary(i), '2 open · oldest 3 days · 14 actioned · 5 dismissed');
});

test('empty: nothing ever reported', () => {
  const i = { open: 0, actioned: 0, dismissed: 0, oldestOpenDays: null, hiddenFoods: 0 };
  assert.equal(moderationNote(i), 'All clear. Nothing has been reported yet.');
  assert.equal(moderationSummary(i), 'None open · 0 actioned · 0 dismissed');
});

test('edge: all handled, one filed today, age tags', () => {
  assert.equal(moderationNote({ open: 0, actioned: 3, dismissed: 1, oldestOpenDays: null, hiddenFoods: 0 }), 'All clear. Nothing reported is waiting on you.');
  assert.equal(moderationNote({ open: 1, actioned: 0, dismissed: 0, oldestOpenDays: 0, hiddenFoods: 0 }), '1 report waiting, filed today.');
  assert.deepEqual(waitingTag(0), { text: 'Today', late: false });
  assert.deepEqual(waitingTag(1), { text: '1 day waiting', late: false });
  assert.deepEqual(waitingTag(3), { text: '3 days waiting', late: true });
  const now = Date.parse('2026-09-28T12:00:00Z');
  assert.equal(daysSince('2026-09-25T11:00:00Z', now), 3);
  assert.equal(daysSince(null, now), null);
});
