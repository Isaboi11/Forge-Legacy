/**
 * past-chats.test.mjs — what a stored chat IS (AI Road to 10 Sprint 4b §1.5, CH-4, migration 0279).
 *
 * ⛔ The bar that matters most: a stopped medical line ("I'm 20 weeks pregnant"), the reply to it, and the stop card
 * never reach the stored row — not on the way in, not on the way back out, not through "Continue this chat".
 *
 * Run:  node --test src/domain/coach/__tests__/past-chats.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  chatPreview,
  chatTitle,
  cutAtWord,
  fitTurns,
  guardProse,
  guardStored,
  ilikePattern,
  mergeContinued,
  noteForDisplay,
  pastChatRow,
  PAST_CHAT_MAX_BYTES,
  PAST_CHAT_MAX_TURNS,
  PAST_CHAT_TITLE_CHARS,
  readBack,
  rowSignature,
  searchTerms,
  searchText,
  storedTurns,
  threadFrom,
  UNTITLED_CHAT,
  utf8Length,
} from '../past-chats.ts';
import { summaryHistory } from '../chat-history.ts';
import { stopsForMedical } from '../medical-routing.ts';

const PREGNANT = "I'm 20 weeks pregnant";
const DOCTOR = 'My doctor cleared me to squat again after surgery';

const me = (text, extra = {}) => ({ kind: 'me', text, ...extra });
const holt = (text, extra = {}) => ({ kind: 'holt', text, ...extra });
/** Everything a row could carry, as one string — a stopped topic must appear nowhere in it. */
const everywhere = (row) => JSON.stringify(row).toLowerCase();

test('the fixtures really stop, and the ordinary lines really do not', () => {
  assert.ok(stopsForMedical(PREGNANT));
  assert.ok(stopsForMedical(DOCTOR));
  assert.ok(!stopsForMedical('Build me a 4 day push pull legs program'));
});

test('⛔ a stopped "I\'m 20 weeks pregnant", the reply to it and the stop card never reach the stored row', () => {
  const thread = [
    holt('Hey Isaiah. What are we working on?'),
    me('Build me a 4 day push pull legs program'),
    holt('Four days it is. Do you train at a full gym?'),
    me(PREGNANT, { stopped: true }),
    { kind: 'stop', text: 'That is one for your doctor or midwife — I am not the right person for it.' },
    holt('Congratulations — for the pregnancy, keep the intensity moderate.'),
    { kind: 'saved', text: 'Saved as a template.' },
    me('Full gym, yes'),
    holt('Good. Here is the week.'),
  ];
  const stored = storedTurns(thread);
  const text = JSON.stringify(stored).toLowerCase();
  assert.ok(!text.includes('pregnan'), 'the stopped line or the answer to it was stored');
  assert.ok(!text.includes('doctor or midwife'), 'the stop card was stored');
  assert.ok(!text.includes('saved as a template'), 'a note inside the stopped run was stored');
  assert.deepEqual(
    stored.map((t) => t.text),
    ['Build me a 4 day push pull legs program', 'Four days it is. Do you train at a full gym?', 'Full gym, yes', 'Good. Here is the week.'],
  );
  const row = pastChatRow({ id: 'c1', thread, now: 0 });
  assert.ok(!everywhere(row).includes('pregnan'), 'the row (title, search words, preview) carries the stopped topic');
});

test('⛔ an UNMARKED stopped line is still caught by the code guard (threads stored before the mark existed)', () => {
  const thread = [me('Hi'), holt('Hey.'), me(PREGNANT), holt('Congrats! Keep it light.'), { kind: 'saved', text: 'Saved.' }, holt('Anything else?'), me('Bench tips?'), holt('Tuck the elbows.')];
  const stored = storedTurns(thread);
  assert.ok(!JSON.stringify(stored).toLowerCase().includes('pregnan'));
  assert.ok(!stored.some((t) => t.text === 'Congrats! Keep it light.'), 'the reply to an unmarked stopped line was stored');
  assert.ok(!stored.some((t) => t.text === 'Anything else?'), 'a note between must not end the stopped run');
  assert.deepEqual(stored.slice(-2).map((t) => t.text), ['Bench tips?', 'Tuck the elbows.']);
});

test('⛔ a chat that was ONLY a stopped line is not stored at all', () => {
  assert.equal(pastChatRow({ id: 'c', thread: [holt('Hey.'), me(PREGNANT, { stopped: true }), { kind: 'stop', text: 'Doctor.' }] }), null);
  assert.equal(pastChatRow({ id: 'c', thread: [holt('Hey.'), me(DOCTOR), holt('Great news!')] }), null);
});

test('the app\'s notes are summaryHistory\'s, character for character', () => {
  const card = { title: 'Push Pull Legs', kicker: '', subtitle: '' };
  const thread = [
    me('Build me something'),
    holt('Here it is.'),
    { kind: 'program', card },
    { kind: 'error', text: 'The line dropped.', sub: '', action: '' },
    { kind: 'refusal', card: { title: 'A 7-day split' } },
    { kind: 'saved', text: 'Saved as a template.' },
    { kind: 'chips', chips: [] },
    { kind: 'wall' },
  ];
  const ours = storedTurns(thread).map((t) => ({ role: t.role === 'note' ? 'holt' : t.role, text: t.text }));
  assert.deepEqual(ours, summaryHistory(thread));
  assert.deepEqual(storedTurns(thread).map((t) => t.role), ['athlete', 'holt', 'note', 'note', 'note', 'note']);
});

test('Holt\'s greeting before the athlete\'s first line, chips, and a reply still arriving are not stored', () => {
  const stored = storedTurns([holt("I'm Holt."), holt('Hey.'), { kind: 'chips', chips: [] }, me('Hi'), holt('Half a rep', { streaming: true, sid: 3 })]);
  assert.deepEqual(stored, [{ role: 'athlete', text: 'Hi' }]);
});

test('the title is the first athlete line, at most 60 characters, cut at a word', () => {
  const long = 'Can you build me a twelve week powerlifting block that peaks for a meet in March please';
  const t = chatTitle([{ role: 'holt', text: 'Hey' }, { role: 'athlete', text: long }]);
  assert.ok(t.length <= PAST_CHAT_TITLE_CHARS, t);
  assert.ok(t.endsWith('…'));
  assert.ok(long.startsWith(t.slice(0, -1)), 'cut mid-word');
  assert.ok(!/\s…$/.test(t));
  assert.equal(chatTitle([{ role: 'athlete', text: '  Leg   day? ' }]), 'Leg day?');
  assert.equal(chatTitle([]), UNTITLED_CHAT);
  assert.equal(cutAtWord('abcdefghij', 5).length, 5);
});

test('the preview is Holt\'s first answer', () => {
  assert.equal(chatPreview([{ role: 'athlete', text: 'Hi' }, { role: 'note', text: '[x]' }, { role: 'holt', text: 'Hey there.' }]), 'Hey there.');
  assert.equal(chatPreview([{ role: 'athlete', text: 'Hi' }]), null);
});

test('search: lower-case words, each once; the query is normalised the same way and safe in ilike', () => {
  const s = searchText([{ role: 'athlete', text: 'Push-day: Bench 3x5!' }, { role: 'holt', text: 'Bench it, then push.' }]);
  assert.equal(s, 'push day bench 3x5 it then');
  assert.deepEqual(searchTerms('  PUSH-day  push '), ['push', 'day']);
  assert.deepEqual(searchTerms('%_\\'), []);
  assert.equal(searchTerms('a b c d e f g').length, 5);
  assert.equal(ilikePattern('bench'), '%bench%');
  assert.equal(ilikePattern('5%_x'), '%5\\%\\_x%');
  assert.equal(searchText([{ role: 'athlete', text: 'Sentadilla pesada — día de pierna' }]), 'sentadilla pesada día de pierna');
});

test('size limits: at most 200 turns and under the 96 KB check, the oldest going first, starting on an athlete line', () => {
  const many = Array.from({ length: 260 }, (_, i) => ({ role: i % 2 ? 'holt' : 'athlete', text: `line ${i}` }));
  const kept = fitTurns(many);
  assert.ok(kept.length <= PAST_CHAT_MAX_TURNS);
  assert.equal(kept[kept.length - 1].text, 'line 259');
  assert.equal(kept[0].role, 'athlete');

  const big = Array.from({ length: 120 }, (_, i) => ({ role: i % 2 ? 'holt' : 'athlete', text: 'é'.repeat(1500) }));
  const fit = fitTurns(big);
  // jsonb::text adds ": " and ", " — model the database's measure, generously.
  const dbBytes = utf8Length(JSON.stringify(fit)) + fit.length * 6;
  assert.ok(dbBytes <= PAST_CHAT_MAX_BYTES, `${dbBytes} > ${PAST_CHAT_MAX_BYTES}`);
  assert.ok(fit.length > 10);
  assert.equal(utf8Length('aé€😀'), 1 + 2 + 3 + 4);
});

test('the row: title from the whole chat even when the head is trimmed; started_at from the first athlete line', () => {
  const thread = [me('First thing I said', { at: Date.UTC(2026, 10, 18, 9) }), holt('Answer.')];
  const row = pastChatRow({ id: 'abc', thread, recap: { text: 'They train Mondays.', through: 4 } });
  assert.equal(row.id, 'abc');
  assert.equal(row.title, 'First thing I said');
  assert.equal(row.turn_count, 2);
  assert.equal(row.preview, 'Answer.');
  assert.equal(row.started_at, '2026-11-18T09:00:00.000Z');
  assert.equal(row.recap, 'They train Mondays.');
  assert.equal(row.recap_through, 4);
  assert.ok(!('athlete_id' in row), 'athlete_id is the column default, never sent');
  assert.ok(!('summary' in row), 'the summary is written only at the end, never wiped by a save');
  assert.ok(row.search_text.includes('mondays') === false, 'the recap is not search text');
  assert.ok(row.search_text.startsWith('first thing i said'));
});

test('⛔ a recap or summary sentence the guard catches is dropped before it is stored', () => {
  const row = pastChatRow({ id: 'x', thread: [me('Hi'), holt('Hey')], recap: { text: `They train Mondays. ${PREGNANT}.`, through: 2 } });
  assert.equal(row.recap, 'They train Mondays.');
  assert.equal(guardProse(`${PREGNANT}. Wants to bench more.`, 500), 'Wants to bench more.');
  assert.equal(guardProse(PREGNANT, 500), null);
  assert.equal(guardProse(null, 500), null);
});

test('⛔ read back with TODAY\'s guard: a stored line that stops now is dropped, with the reply to it', () => {
  const stored = [
    { role: 'athlete', text: 'Hi' },
    { role: 'holt', text: 'Hey.' },
    { role: 'athlete', text: 'my knee is swollen after squats' },
    { role: 'holt', text: 'Ice it.' },
    { role: 'note', text: '[The app: Saved.]' },
    { role: 'athlete', text: 'ok thanks' },
  ];
  // A guard "widened since": the swollen knee now stops.
  const today = (s) => /swollen/.test(s) || stopsForMedical(s);
  assert.deepEqual(readBack(stored, today).map((t) => t.text), ['Hi', 'Hey.', 'ok thanks']);
  // Malformed rows never crash a read.
  assert.deepEqual(readBack(null), []);
  assert.deepEqual(readBack([{ role: 'system', text: 'x' }, { role: 'holt' }, 4, null, { role: 'athlete', text: 'ok' }]), [{ role: 'athlete', text: 'ok' }]);
});

test('continue: the stored chat becomes athlete + Holt turns; notes stay on the row, not in the thread', () => {
  const head = [
    { role: 'athlete', text: 'Build me a week' },
    { role: 'holt', text: 'Here.' },
    { role: 'note', text: '[The app showed "Week A" as a card. Not started or saved unless a later note says so.]' },
    { role: 'athlete', text: PREGNANT },
    { role: 'holt', text: 'Congrats' },
  ];
  const thread = threadFrom(head);
  assert.deepEqual(thread, [me('Build me a week'), holt('Here.')], '⛔ a line that stops today is not continued');
});

test('continue: later saves are the head + only what was said since — aligned, nothing twice, nothing lost', () => {
  const head = [
    { role: 'athlete', text: 'A' },
    { role: 'holt', text: 'B' },
    { role: 'note', text: '[The app: Saved.]' },
    { role: 'athlete', text: 'C' },
    { role: 'holt', text: 'D' },
  ];
  const restored = threadFrom(head);
  const later = [...restored, holt('Hey again.'), me('E'), holt('F')];
  const row = pastChatRow({ id: 'k', thread: later, head });
  assert.deepEqual(row.turns.map((t) => t.text), ['A', 'B', '[The app: Saved.]', 'C', 'D', 'Hey again.', 'E', 'F']);
  assert.ok(!('started_at' in row), 'a continued chat keeps the day it began');

  // The device trimmed the oldest turns of the restored thread (100-turn rule): still aligned.
  const trimmed = storedTurns([holt('B'), me('C'), holt('D'), me('E')]);
  assert.deepEqual(mergeContinued(head, trimmed).map((t) => t.text), ['A', 'B', '[The app: Saved.]', 'C', 'D', 'E']);

  // Nothing new yet: the row is exactly the head.
  assert.deepEqual(mergeContinued(head, storedTurns(restored)), head);

  // Nothing aligns (edited out of recognition): what follows the last shared line is new; never a duplicate.
  assert.deepEqual(mergeContinued(head, [{ role: 'athlete', text: 'C' }, { role: 'athlete', text: 'Z' }]).map((t) => t.text), ['A', 'B', '[The app: Saved.]', 'C', 'D', 'Z']);
  // Nothing shared at all: everything is new, the head is kept.
  assert.deepEqual(mergeContinued(head, [{ role: 'athlete', text: 'Q' }]).length, 6);
});

test('⛔ a stopped line said AFTER continuing never reaches the merged row', () => {
  const head = [{ role: 'athlete', text: 'A' }, { role: 'holt', text: 'B' }];
  const later = [...threadFrom(head), me(PREGNANT, { stopped: true }), { kind: 'stop', text: 'Doctor.' }, holt('Congrats'), me('C')];
  const row = pastChatRow({ id: 'k', thread: later, head });
  assert.deepEqual(row.turns.map((t) => t.text), ['A', 'B', 'C']);
  assert.ok(!everywhere(row).includes('pregnan'));
});

test('guardStored counts notes in Holt\'s column', () => {
  const kept = guardStored([{ role: 'athlete', text: PREGNANT }, { role: 'note', text: '[The app: Saved.]' }, { role: 'holt', text: 'More' }, { role: 'athlete', text: 'ok' }]);
  assert.deepEqual(kept, [{ role: 'athlete', text: 'ok' }]);
});

test('notes read plainly in the transcript', () => {
  assert.equal(noteForDisplay('[The app: Saved as a template.]'), 'Saved as a template.');
  assert.equal(noteForDisplay('[The app showed "Week A" as a card. Not started or saved unless a later note says so.]'), 'Showed "Week A" as a card. Not started or saved unless a later note says so.');
  assert.equal(noteForDisplay('[The app: that did not work — x Nothing was changed.]'), 'That did not work — x Nothing was changed.');
});

test('the save signature changes when the chat does, not when nothing did', () => {
  const a = pastChatRow({ id: 'k', thread: [me('A'), holt('B')], now: 0 });
  const b = pastChatRow({ id: 'k', thread: [me('A'), holt('B')], now: 99 });
  const c = pastChatRow({ id: 'k', thread: [me('A'), holt('B'), me('C')], now: 0 });
  assert.equal(rowSignature(a), rowSignature(b));
  assert.notEqual(rowSignature(a), rowSignature(c));
});
