/**
 * past-chats-store.test.mjs — the past-chats store against a fake PostgREST client (Sprint 4b §1.5, 0279).
 *
 *   · ⚠ A FAILED READ IS NEVER AN EMPTY ONE (Brady 11-11): `{ ok: false }`, so the screen offers Try again.
 *   · Before 0279 is applied (PGRST205 / 42P01): an honest empty, quietly; writes are a no-op.
 *   · ⛔ Everything read back — list, one chat, export — goes through today's guard.
 *
 * Run:  node --test src/domain/coach/__tests__/past-chats-store.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { pastChatsStore, isMissingTable } from '../past-chats-store.ts';
import { PAST_CHATS_PAGE, pastChatRow } from '../past-chats.ts';

const PREGNANT = "I'm 20 weeks pregnant";

/** A chainable fake that records every call and resolves to `answer`. */
function fakeClient(answer) {
  const calls = [];
  const q = (start) => {
    const chain = { calls: [start] };
    const self = {
      then: (ok, bad) => Promise.resolve(typeof answer === 'function' ? answer(chain.calls) : answer).then(ok, bad),
    };
    for (const m of ['select', 'eq', 'ilike', 'order', 'range', 'limit', 'maybeSingle']) {
      self[m] = (...args) => {
        chain.calls.push([m, ...args]);
        return self;
      };
    }
    calls.push(chain.calls);
    return self;
  };
  const client = {
    from: (table) => ({
      select: (cols) => q(['from', table, 'select', cols]),
      upsert: (row, opts) => q(['from', table, 'upsert', row, opts]),
      update: (v) => q(['from', table, 'update', v]),
      delete: () => q(['from', table, 'delete']),
    }),
  };
  return { client, calls };
}

const uid = async () => 'athlete-1';
const row = (i, extra = {}) => ({
  id: `c${i}`,
  title: `Chat ${i}`,
  preview: 'Holt said this first.',
  summary: null,
  turn_count: 4,
  started_at: '2026-11-18T09:00:00Z',
  updated_at: '2026-11-18T10:00:00Z',
  ...extra,
});

test('the missing-table codes are recognised', () => {
  assert.ok(isMissingTable({ code: 'PGRST205' }));
  assert.ok(isMissingTable({ code: '42P01' }));
  assert.ok(!isMissingTable({ code: '57014' }));
  assert.ok(!isMissingTable(null));
});

test('list: newest first, 30 a page, one extra row read to know there is more, scoped to the athlete', async () => {
  const rows = Array.from({ length: PAST_CHATS_PAGE + 1 }, (_, i) => row(i));
  const { client, calls } = fakeClient({ data: rows, error: null });
  const s = pastChatsStore(client, uid);
  const r = await s.listPastChats({ page: 1 });
  assert.equal(r.ok, true);
  assert.equal(r.chats.length, PAST_CHATS_PAGE);
  assert.equal(r.more, true);
  assert.deepEqual(r.chats[0], { id: 'c0', title: 'Chat 0', line: 'Holt said this first.', turnCount: 4, startedAt: '2026-11-18T09:00:00Z', updatedAt: '2026-11-18T10:00:00Z' });
  const c = calls[0];
  assert.ok(!c.some((x) => x[0] === 'select' && /turns/.test(String(x[1]))) && !/turns\b/.test(c[0][3].replace('turn_count', '')), 'the list never reads transcripts');
  assert.deepEqual(c.find((x) => x[0] === 'eq'), ['eq', 'athlete_id', 'athlete-1']);
  assert.deepEqual(c.filter((x) => x[0] === 'order'), [['order', 'updated_at', { ascending: false }], ['order', 'id', { ascending: false }]]);
  assert.deepEqual(c.find((x) => x[0] === 'range'), ['range', 30, 60]);
});

test('search: one ilike per word on search_text', async () => {
  const { client, calls } = fakeClient({ data: [], error: null });
  await pastChatsStore(client, uid).listPastChats({ query: 'Push-day bench' });
  assert.deepEqual(calls[0].filter((x) => x[0] === 'ilike'), [['ilike', 'search_text', '%push%'], ['ilike', 'search_text', '%day%'], ['ilike', 'search_text', '%bench%']]);
});

test('⚠ a failed list is { ok: false } — never drawn as "no past chats yet"', async () => {
  for (const answer of [{ data: null, error: { code: '57014', message: 'timeout' } }, () => Promise.reject(new Error('offline'))]) {
    const { client } = fakeClient(answer);
    assert.deepEqual(await pastChatsStore(client, uid).listPastChats(), { ok: false });
  }
  const { client } = fakeClient({ data: [], error: null });
  assert.deepEqual(await pastChatsStore(client, async () => null).listPastChats(), { ok: false }, 'signed out is not "none"');
});

test('before 0279 is applied: list is an honest empty, a save is quietly unavailable', async () => {
  const { client } = fakeClient({ data: null, error: { code: 'PGRST205', message: 'not found' } });
  const s = pastChatsStore(client, uid);
  assert.deepEqual(await s.listPastChats(), { ok: true, chats: [], more: false });
  assert.deepEqual(await s.getPastChat('x'), { ok: true, chat: null });
  const r = pastChatRow({ id: 'x', thread: [{ kind: 'me', text: 'hi' }] });
  assert.equal(await s.savePastChat(r), 'unavailable');
  assert.equal(await s.deleteAllPastChats(), true);
  assert.deepEqual(await s.fetchExportLines(), []);
});

test('⛔ list lines go through the guard: a summary sentence that stops is not shown', async () => {
  const { client } = fakeClient({ data: [row(1, { summary: `${PREGNANT}. Wants a 4 day split.` }), row(2, { summary: PREGNANT, preview: 'Here is your plan.' })], error: null });
  const r = await pastChatsStore(client, uid).listPastChats();
  assert.equal(r.chats[0].line, 'Wants a 4 day split.');
  assert.equal(r.chats[1].line, 'Here is your plan.');
});

test('⛔ one chat is read back through today\'s guard, with its recap', async () => {
  const turns = [
    { role: 'athlete', text: 'Hi' },
    { role: 'holt', text: 'Hey' },
    { role: 'athlete', text: PREGNANT },
    { role: 'holt', text: 'Congrats' },
    { role: 'athlete', text: 'Bench?' },
  ];
  const { client, calls } = fakeClient({ data: { ...row(1), turns, recap: 'Trains Mondays.', recap_through: 6 }, error: null });
  const r = await pastChatsStore(client, uid).getPastChat('c1');
  assert.equal(r.ok, true);
  assert.deepEqual(r.chat.turns.map((t) => t.text), ['Hi', 'Hey', 'Bench?']);
  assert.deepEqual(r.chat.recap, { text: 'Trains Mondays.', through: 6 });
  assert.deepEqual(calls[0].find((x) => x[0] === 'eq'), ['eq', 'id', 'c1']);
  const missing = fakeClient({ data: null, error: null });
  assert.deepEqual(await pastChatsStore(missing.client, uid).getPastChat('gone'), { ok: true, chat: null });
  const failed = fakeClient({ data: null, error: { code: '08006' } });
  assert.deepEqual(await pastChatsStore(failed.client, uid).getPastChat('c1'), { ok: false });
});

test('save upserts on id; the summary is guarded and written by itself', async () => {
  const { client, calls } = fakeClient({ data: null, error: null });
  const s = pastChatsStore(client, uid);
  const r = pastChatRow({ id: 'c9', thread: [{ kind: 'me', text: 'hi' }] });
  assert.equal(await s.savePastChat(r), 'saved');
  assert.deepEqual(calls[0][0].slice(0, 3), ['from', 'holt_chats', 'upsert']);
  assert.deepEqual(calls[0][0][4], { onConflict: 'id' });
  assert.equal(await s.writePastChatSummary('c9', `${PREGNANT}. Wants to squat 3 days.`), true);
  assert.deepEqual(calls[1][0][3], { summary: 'Wants to squat 3 days.' });
  assert.equal(await s.writePastChatSummary('c9', PREGNANT), false, 'nothing left to write');
  assert.equal(calls.length, 2);
  const bad = fakeClient({ data: null, error: { code: '23514', message: 'holt_chats_turns_size' } });
  assert.equal(await pastChatsStore(bad.client, uid).savePastChat(r), 'failed');
});

test('delete one / delete all', async () => {
  const { client, calls } = fakeClient({ data: null, error: null });
  const s = pastChatsStore(client, uid);
  assert.equal(await s.deletePastChat('c1'), true);
  assert.deepEqual(calls[0].find((x) => x[0] === 'eq'), ['eq', 'id', 'c1']);
  assert.equal(await s.deleteAllPastChats(), true);
  assert.deepEqual(calls[1].find((x) => x[0] === 'eq'), ['eq', 'athlete_id', 'athlete-1']);
  const failed = fakeClient({ data: null, error: { code: '42501' } });
  assert.equal(await pastChatsStore(failed.client, uid).deleteAllPastChats(), false);
});

test('⛔ export: one line per stored turn, oldest chat first, through today\'s guard', async () => {
  const data = [
    { id: 'a', title: 'A', started_at: '2026-11-01T00:00:00Z', turns: [{ role: 'athlete', text: 'Hi' }, { role: 'note', text: '[The app: Saved.]' }] },
    { id: 'b', title: 'B', started_at: '2026-11-02T00:00:00Z', turns: [{ role: 'athlete', text: PREGNANT }, { role: 'holt', text: 'Congrats' }, { role: 'athlete', text: 'ok' }] },
  ];
  const { client, calls } = fakeClient({ data, error: null });
  const lines = await pastChatsStore(client, uid).fetchExportLines();
  assert.deepEqual(lines, [
    { chatId: 'a', title: 'A', startedAt: '2026-11-01T00:00:00Z', who: 'athlete', text: 'Hi' },
    { chatId: 'a', title: 'A', startedAt: '2026-11-01T00:00:00Z', who: 'note', text: '[The app: Saved.]' },
    { chatId: 'b', title: 'B', startedAt: '2026-11-02T00:00:00Z', who: 'athlete', text: 'ok' },
  ]);
  assert.deepEqual(calls[0].find((x) => x[0] === 'order'), ['order', 'started_at', { ascending: true }]);
});
