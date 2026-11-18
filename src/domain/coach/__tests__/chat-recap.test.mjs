/**
 * chat-recap.test.mjs — the rolling recap's planning (chat-history.ts, Sprint 4b §1.2) and What Holt Remembers' pure
 * rules (holt-memory-screen.ts, §1.3/§1.4). No network, no React.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { askHistory, CHAT_HISTORY_TURNS, earlierFor, liveRecap, markStopped, planRecap } from '../chat-history.ts';
import { RECAP_BATCH, RECAP_WIRE_CHARS } from '../holt-memory.ts';
import { FULL_LINE, groupNotes, isFull, keptLine, noteOrigin, SWITCH_COPY } from '../holt-memory-screen.ts';

/** A thread of `n` spoken turns, athlete first, alternating. */
const chat = (n) => Array.from({ length: n }, (_, i) => (i % 2 === 0 ? { kind: 'me', text: `athlete line ${i}`, at: 1000 + i } : { kind: 'holt', text: `holt line ${i}` }));

test('planRecap: nothing until RECAP_BATCH turns have fallen out of the window', () => {
  assert.equal(CHAT_HISTORY_TURNS, 8);
  assert.equal(planRecap(chat(8), null), null);
  assert.equal(planRecap(chat(8 + RECAP_BATCH - 1), null), null);
  const p = planRecap(chat(8 + RECAP_BATCH), null);
  assert.deepEqual(p.turns.map((t) => t.text), ['athlete line 0', 'holt line 1', 'athlete line 2', 'holt line 3']);
  assert.equal(p.through, RECAP_BATCH);
});

test('planRecap: only the turns the recap does not cover yet; then nothing until the next batch', () => {
  const recap = { text: 'The athlete said things.', through: 4 };
  assert.equal(planRecap(chat(15), recap), null, '3 uncovered');
  const p = planRecap(chat(16), recap);
  assert.deepEqual(p.turns.map((t) => t.text), ['athlete line 4', 'holt line 5', 'athlete line 6', 'holt line 7']);
  assert.equal(p.through, 8);
});

test('planRecap: never while a reply is still arriving; a long restored chat folds its newest 40 uncovered', () => {
  const t = chat(14);
  t.push({ kind: 'holt', text: 'still typ', streaming: true, sid: 3 });
  assert.equal(planRecap(t, null), null);
  const long = planRecap(chat(100), null);
  assert.equal(long.turns.length, 40);
  assert.equal(long.through, 92);
  assert.equal(long.turns.at(-1).text, 'holt line 91');
});

test('⛔ planRecap folds only what askHistory would send: a stopped line and the reply to it never reach the recap', () => {
  let t = chat(13);
  t.splice(1, 0, { kind: 'me', text: "I'm 20 weeks pregnant, can I squat?" }, { kind: 'holt', text: 'That one is for your doctor.' });
  t = markStopped(t, "I'm 20 weeks pregnant, can I squat?");
  const p = planRecap(t, null);
  assert.ok(p);
  assert.ok(!JSON.stringify(p.turns).includes('pregnant'));
  assert.equal(askHistory(t, Infinity).length, 13, 'the stopped line and the reply to it are both gone');
});

test('liveRecap / earlierFor: a recap belongs to its chat; nothing is sent until something fell out of the window', () => {
  const recap = { text: 'The athlete trains Mondays.', through: 4 };
  assert.equal(liveRecap(chat(3), recap), null, 'a new chat never inherits it');
  assert.deepEqual(liveRecap(chat(12), recap), recap);
  assert.equal(liveRecap(chat(12), { text: ' ', through: 4 }), null);
  assert.equal(liveRecap(chat(12), { text: 'x', through: 0 }), null);
  assert.equal(earlierFor(chat(8), recap), undefined, 'every covered turn is in the window anyway');
  assert.equal(earlierFor(chat(12), recap), 'The athlete trains Mondays.');
  assert.equal(earlierFor(chat(12), { text: 'a'.repeat(2000), through: 4 }).length, RECAP_WIRE_CHARS);
});

// ─────────────────────────────────────────────────────────────────────────────
// What Holt Remembers
// ─────────────────────────────────────────────────────────────────────────────

const note = (id, kind, source = 'chat', createdAt = '2026-11-18T10:00:00Z') => ({ id, text: `note ${id}`, createdAt, source, kind });

test('groupNotes: by kind in FACT_KINDS order, a note with no kind is "Other things", empty groups left out', () => {
  const g = groupNotes([note('a', 'goal'), note('b', null, 'ask'), note('c', 'schedule'), note('d', 'goal'), note('e', 'nonsense')]);
  assert.deepEqual(g.map((x) => [x.kind, x.heading, x.notes.map((n) => n.id)]), [
    ['schedule', 'When you train', ['c']],
    ['goal', 'Your goals', ['a', 'd']],
    ['other', 'Other things', ['b', 'e']],
  ]);
});

test('noteOrigin: "New · from a chat on <date>" until seen; a note from a card or the builder has no line', () => {
  const d = () => 'Nov 18';
  assert.deepEqual(noteOrigin(note('a', 'like'), null, d), { isNew: true, line: 'New · from a chat on Nov 18' });
  assert.deepEqual(noteOrigin(note('a', 'like'), '2026-11-18T09:00:00Z', d), { isNew: true, line: 'New · from a chat on Nov 18' });
  assert.deepEqual(noteOrigin(note('a', 'like'), '2026-11-18T11:00:00Z', d), { isNew: false, line: 'From a chat on Nov 18' });
  assert.equal(noteOrigin(note('a', 'like', 'ask'), null, d), null);
});

test('the full state, the kept line, and the switch copy that says what off does and does not do', () => {
  assert.equal(isFull(19, 20), false);
  assert.equal(isFull(20, 20), true);
  assert.equal(FULL_LINE, 'Full — delete one to let Holt keep new things.');
  assert.equal(keptLine(1), 'Holt kept 1 thing from your last chat');
  assert.equal(keptLine(2), 'Holt kept 2 things from your last chat');
  assert.match(SWITCH_COPY.off, /keeps nothing new and reads nothing old/);
  assert.match(SWITCH_COPY.off, /stays here until you delete it/);
});

test('the sheet mounts the memory hook with a few lines only (shared with lane B) — and the screen links Past chats', () => {
  const sheet = fs.readFileSync(path.join(process.cwd(), 'src/components/forge/CoachChatSheet.tsx'), 'utf8');
  assert.match(sheet, /const chatRecap = useChatRecap\(thread, \{ enabled: premiumAi \}\);/);
  assert.match(sheet, /void saveThread\(thread, \{ mode, constraints, \.\.\.\(chatRecap\.recap \? \{ recap: chatRecap\.recap \} : \{\}\) \}\);/);
  assert.match(sheet, /earlier: chatRecap\.earlier,/);
  assert.match(sheet, /<HoltKeptLine count=\{chatRecap\.kept\}/);
  assert.equal((sheet.match(/chatRecap\./g) ?? []).length, 8, 'the stored place (3), earlier, the kept line (4)');
  assert.match(sheet, /fetchBriefNotes\(\)/);
  assert.doesNotMatch(sheet, /\bfetchNotes\(/, 'the brief never reads notes past the switch');
  const screen = fs.readFileSync(path.join(process.cwd(), 'src/app/holt-memory.tsx'), 'utf8');
  assert.match(screen, /router\.push\(PAST_CHATS_ROUTE/);
  assert.match(screen, /forgetEverything\(\)/);
  assert.match(screen, /<SettingsToggle value=\{remembers\}/);
});
