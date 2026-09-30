import test from 'node:test';
import assert from 'node:assert/strict';

import { CHEER_MAX, cheerLine, cleanCheer, nextCheer, sentCheerStatus } from '../cheers.ts';
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

// ── PO 2026-09-30: "don't know if he got it. There was no feedback after I sent the message." ──

test('a sent message says SENT — and does not claim the recipient has seen it', () => {
  const s = sentCheerStatus({ seenAt: null, replyLabel: null }, 'Brady');
  assert.equal(s.text, 'Sent · Coach Holt will tell Brady during the workout');
  assert.equal(s.done, false);
  assert.doesNotMatch(s.text, /saw|delivered|read/i);
});

test('closed by the recipient reads as seen; an answer wins over seen', () => {
  assert.deepEqual(sentCheerStatus({ seenAt: '2026-09-30T18:00:00Z', replyLabel: null }, 'Brady'), { text: 'Brady saw it', done: true });
  assert.deepEqual(sentCheerStatus({ seenAt: '2026-09-30T18:00:00Z', replyLabel: '🔥 Let’s go' }, 'Brady'), { text: 'Brady replied 🔥 Let’s go', done: true });
});

test('a recipient whose name never loaded is "they", never a blank or "undefined"', () => {
  assert.equal(sentCheerStatus({ seenAt: null, replyLabel: null }, null).text, 'Sent · Coach Holt will tell them during the workout');
  assert.equal(sentCheerStatus({ seenAt: 'x', replyLabel: null }, '  ').text, 'They saw it');
});

test('⚠ the join screen gives instant feedback: keyboard down, a toast, and the message stays with its status', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../../../app/workout-join.tsx', import.meta.url), 'utf8');
  const send = src.slice(src.indexOf('const sendMessage = async'));
  assert.ok(send.indexOf('await sendCheer(hostId, text)') < send.indexOf('showToast(`Message sent.'), 'the toast must follow a send that landed, not precede it');
  assert.match(send, /Keyboard\.dismiss\(\)/, 'the confirmation sits under the box — behind an open keyboard it is invisible');
  assert.match(src, /sentCheerStatus\(c, /);
  // A failed status read must not wipe the "Sent" just drawn.
  assert.match(src, /fetchSentCheers\(hostId\)\.then\(\(c\) => c && setSent\(c\)\)/);
});

