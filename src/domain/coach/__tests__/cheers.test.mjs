import test from 'node:test';
import assert from 'node:assert/strict';

import { CHEER_MAX, cheerLine, cleanCheer, nextCheer } from '../cheers.ts';
import { coachLine } from '../coach-says.ts';

const c = (id, body, fromName = 'Isaiah') => ({ id, body, fromName, fromId: 'u', createdAt: '2026-09-28T10:00:00Z' });

test('Holt carries the words verbatim, with the sender’s name', () => {
  assert.equal(cheerLine(c('1', 'let’s go Jordan! Kill this workout')), 'Isaiah says: “let’s go Jordan! Kill this workout”');
  assert.equal(cheerLine(c('1', '  a   pasted\n\nparagraph  ')), 'Isaiah says: “a pasted paragraph”');
  assert.equal(cheerLine(c('1', 'hi', '  ')), 'A squad-mate says: “hi”');
  assert.equal(cheerLine(c('1', '   ')), null, 'an empty message is no line');
});

test('messages are capped at 140 characters', () => {
  assert.equal(cleanCheer('x'.repeat(300)).length, CHEER_MAX);
  assert.equal(cleanCheer(null), null);
});

test('oldest unclosed message first; closed ones never come back', () => {
  const list = [c('a', 'first'), c('b', 'second')];
  assert.equal(nextCheer(list, new Set()).id, 'a');
  assert.equal(nextCheer(list, new Set(['a'])).id, 'b');
  assert.equal(nextCheer(list, new Set(['a', 'b'])), null);
});

test('a squad-mate’s message outranks every coaching line, including the start announcement', () => {
  const says = coachLine({
    cheer: 'Isaiah says: “go”',
    announce: 'Your squad knows you started.',
    setsDoneThisSession: 0,
    live: 'Go up to 95.',
    progression: 'Start at 85.',
    planCue: 'Brace.',
  });
  assert.deepEqual(says, { text: 'Isaiah says: “go”', source: 'cheer' });
});

test('and it does NOT retire when sets are logged — only when the athlete closes it', () => {
  const says = coachLine({ cheer: 'Isaiah says: “go”', setsDoneThisSession: 12, setsDoneThisExercise: 4 });
  assert.equal(says?.source, 'cheer');
  assert.equal(coachLine({ cheer: null, planCue: 'Brace.' })?.source, 'plan');
});
