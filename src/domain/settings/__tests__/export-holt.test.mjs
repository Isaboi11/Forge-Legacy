/**
 * Export My Data — Holt's memory (AI Road to 10 Sprint 4b §1.7): holt-memory.csv, holt-chat-summaries.csv,
 * holt-chats.csv in the ZIP whenever any is present, and the toast counts them.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { hasHolt, holtChatCount, holtCsvFiles, holtToastPart } from '../export-holt.ts';

const EMPTY = { notes: [], summaries: [], chats: [] };
const FULL = {
  notes: [
    { kind: 'dislike', text: 'Hates burpees', createdAt: '2026-11-18T10:00:00Z', source: 'chat' },
    { kind: null, text: 'Runs Tue/Thu, long run Sunday', createdAt: '2026-10-01T10:00:00Z', source: 'ask' },
  ],
  summaries: [{ createdAt: '2026-11-18T10:05:00Z', summary: 'You asked for no burpees, "ever".' }],
  chats: [
    { chatId: 'c1', title: 'Never give me burpees', startedAt: '2026-11-18T09:58:00Z', who: 'athlete', text: 'Never give me burpees, ok?' },
    { chatId: 'c1', title: 'Never give me burpees', startedAt: '2026-11-18T09:58:00Z', who: 'holt', text: 'Noted.' },
    { chatId: 'c2', title: 'Bench', startedAt: '2026-11-17T09:00:00Z', who: 'note', text: '[The app: Saved "Bench Block".]' },
  ],
};

test('nothing Holt keeps → no files, and the export stays what it was', () => {
  assert.equal(hasHolt(EMPTY), false);
  assert.deepEqual(holtCsvFiles(EMPTY), []);
  assert.equal(holtToastPart(EMPTY), '');
});

test('the three files, with their headings, escaped like every export CSV', () => {
  assert.equal(hasHolt(FULL), true);
  const files = holtCsvFiles(FULL);
  assert.deepEqual(files.map((f) => f.name), ['holt-memory.csv', 'holt-chat-summaries.csv', 'holt-chats.csv']);
  const [mem, sums, chats] = files.map((f) => f.text.split('\r\n'));
  assert.equal(mem[0], 'Kind,What Holt keeps,Kept,Source');
  assert.match(mem[1], /^dislike,Hates burpees,2026-11-18 \d\d:\d\d,Kept from a chat$/);
  assert.match(mem[2], /^other,"Runs Tue\/Thu, long run Sunday",2026-10-0\d \d\d:\d\d,You confirmed it in a chat$/);
  assert.equal(sums[0], 'Date,Summary');
  assert.match(sums[1], /,"You asked for no burpees, ""ever""\."$/);
  assert.equal(chats[0], 'Chat,Started,Who,Text');
  assert.match(chats[1], /^Never give me burpees,2026-11-1\d \d\d:\d\d,You,"Never give me burpees, ok\?"$/);
  assert.match(chats[3], /,App,"\[The app: Saved ""Bench Block""\.\]"$/);
  for (const f of files) assert.ok(f.text.endsWith('\r\n'));
});

test('only the files that have rows', () => {
  assert.deepEqual(holtCsvFiles({ ...EMPTY, notes: FULL.notes }).map((f) => f.name), ['holt-memory.csv']);
  assert.deepEqual(holtCsvFiles({ ...EMPTY, chats: FULL.chats }).map((f) => f.name), ['holt-chats.csv']);
});

test('the toast counts them: things kept, and chats (distinct chats, else the summaries)', () => {
  assert.equal(holtChatCount(FULL), 2);
  assert.equal(holtToastPart(FULL), ' · 2 things Holt kept · 2 chats with Holt');
  assert.equal(holtToastPart({ ...EMPTY, notes: [FULL.notes[0]], summaries: FULL.summaries }), ' · 1 thing Holt kept · 1 chat with Holt');
});

test('Account → Export My Data: Holt’s memory is read, any of it means the ZIP, and the toast carries it', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'src/app/account-settings.tsx'), 'utf8');
  assert.match(src, /fetchExportHolt\(\)/);
  assert.match(src, /const res = withFood \|\| withHolt/);
  assert.match(src, /\.\.\.holtCsvFiles\(holt\)/);
  assert.match(src, /holtToastPart\(holt\)/);
  const live = fs.readFileSync(path.join(process.cwd(), 'src/data/export-live.ts'), 'utf8');
  assert.match(live, /from\('holt_notes'\)/);
  assert.match(live, /from\('holt_chat_summaries'\)/);
  assert.match(live, /fetchExportChats\(\)/);
});
