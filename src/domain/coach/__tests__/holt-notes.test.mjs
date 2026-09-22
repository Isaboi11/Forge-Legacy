/**
 * holt-notes.test.mjs — the CA-D2 notes store: one line, no duplicates, twenty at most, fail soft.
 *
 * The store takes its client as an argument precisely so this can run: `@/lib/supabase` does not load
 * under `node --test`. The fake below records every call and answers like PostgREST.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/holt-notes.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HOLT_NOTE_CHARS,
  HOLT_NOTES_MAX,
  cleanNoteText,
  holtNotesStore,
  isCapError,
  isMissingTable,
  planAdd,
} from '../holt-notes.ts';
import { ASK_NOTE_CHARS, ASK_NOTES_MAX } from '../ask-wire.ts';

// ─────────────────────────────────────────────────────────────────────────────
// A fake PostgREST client
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `rows` is the table. `fail` maps an operation ('select' | 'insert' | 'update' | 'delete') to the error
 * it should answer with. `calls` records what was asked.
 */
function fakeClient({ rows = [], fail = {}, capAt = HOLT_NOTES_MAX } = {}) {
  const calls = [];
  let n = rows.length;
  const table = rows.map((r) => ({ ...r }));

  const query = (op, payload) => {
    const filters = [];
    const q = {
      select() {
        return q;
      },
      eq(col, val) {
        filters.push([col, val]);
        return q;
      },
      order() {
        return q;
      },
      then(resolve, reject) {
        calls.push({ op, payload, filters: [...filters] });
        if (fail[op]) return Promise.resolve({ data: null, error: fail[op] }).then(resolve, reject);
        const match = (r) => filters.every(([c, v]) => r[c] === v);
        let data = null;
        if (op === 'select') data = table.filter(match);
        if (op === 'insert') {
          if (table.length + payload.length > capAt) {
            return Promise.resolve({ data: null, error: { code: 'P0001', message: 'holt_notes_cap: at most 20' } }).then(resolve, reject);
          }
          data = payload.map((p) => {
            n += 1;
            const row = { id: `n${n}`, athlete_id: 'u1', created_at: `2026-09-22T00:00:${String(n).padStart(2, '0')}Z`, ...p };
            table.push(row);
            return row;
          });
        }
        if (op === 'update') for (const r of table.filter(match)) Object.assign(r, payload);
        if (op === 'delete') for (const r of table.filter(match)) table.splice(table.indexOf(r), 1);
        return Promise.resolve({ data, error: null }).then(resolve, reject);
      },
    };
    return q;
  };

  const client = {
    from(name) {
      assert.equal(name, 'holt_notes');
      return {
        select: () => query('select'),
        insert: (payload) => query('insert', payload),
        update: (payload) => query('update', payload),
        delete: () => query('delete'),
      };
    },
  };
  return { client, calls, table };
}

const row = (id, text, extra = {}) => ({ id, athlete_id: 'u1', text, created_at: `2026-09-0${id.length}T00:00:00Z`, source: 'ask', ...extra });
const signedIn = async () => 'u1';

// ─────────────────────────────────────────────────────────────────────────────
// Pure rules
// ─────────────────────────────────────────────────────────────────────────────

test('the caps agree everywhere: store, wire and migration', () => {
  assert.equal(HOLT_NOTES_MAX, 20);
  assert.equal(HOLT_NOTE_CHARS, 80);
  assert.equal(ASK_NOTES_MAX, HOLT_NOTES_MAX);
  assert.equal(ASK_NOTE_CHARS, HOLT_NOTE_CHARS);
});

test('cleanNoteText: one line, 2–80 characters, rejected rather than truncated', () => {
  assert.equal(cleanNoteText('  Hates   lunges\n'), 'Hates lunges');
  assert.equal(cleanNoteText('x'), null);
  assert.equal(cleanNoteText('a'.repeat(80)), 'a'.repeat(80));
  assert.equal(cleanNoteText('a'.repeat(81)), null, 'cutting a note changes what the athlete said');
  assert.equal(cleanNoteText(42), null);
});

test('planAdd: dedupes case-insensitively against stored notes and within the batch', () => {
  const p = planAdd(['Hates lunges'], ['hates LUNGES', 'Runs Tue/Thu', 'runs tue/thu', '']);
  assert.deepEqual(p.insert, ['Runs Tue/Thu']);
  assert.deepEqual(
    p.skipped.map((s) => s.reason),
    ['duplicate', 'duplicate', 'invalid'],
  );
});

test('planAdd: at the cap the LATER notes are skipped as `cap`, never dropped silently', () => {
  const existing = Array.from({ length: 18 }, (_, i) => `note ${i}`);
  const p = planAdd(existing, ['a1', 'b2', 'c3', 'd4']);
  assert.deepEqual(p.insert, ['a1', 'b2']);
  assert.deepEqual(p.skipped, [
    { text: 'c3', reason: 'cap' },
    { text: 'd4', reason: 'cap' },
  ]);
  const full = planAdd(Array.from({ length: 20 }, (_, i) => `n${i}`), ['new one']);
  assert.deepEqual(full.insert, []);
  assert.equal(full.skipped[0].reason, 'cap');
});

test('isMissingTable / isCapError read the codes the database actually sends', () => {
  assert.ok(isMissingTable({ code: 'PGRST205' }));
  assert.ok(isMissingTable({ code: '42P01' }));
  assert.ok(!isMissingTable({ code: '42501' }));
  assert.ok(!isMissingTable(null));
  assert.ok(isCapError({ code: 'P0001', message: 'holt_notes_cap: an athlete keeps at most 20 notes' }));
  assert.ok(!isCapError({ message: 'something else' }));
});

// ─────────────────────────────────────────────────────────────────────────────
// The store over a fake client
// ─────────────────────────────────────────────────────────────────────────────

test('fetchNotes: the athlete’s notes, filtered on athlete_id explicitly', async () => {
  const { client, calls } = fakeClient({ rows: [row('a', 'Hates lunges'), row('b', 'Runs Tue/Thu', { athlete_id: 'u2' })] });
  const notes = await holtNotesStore(client, signedIn).fetchNotes();
  assert.deepEqual(notes.map((n) => n.text), ['Hates lunges']);
  assert.deepEqual(Object.keys(notes[0]).sort(), ['createdAt', 'id', 'source', 'text']);
  assert.deepEqual(calls[0].filters, [['athlete_id', 'u1']], 'not left to RLS alone');
});

test('fetchNotes: before 0204 is applied (PGRST205 / 42P01) it is quietly empty', async () => {
  for (const code of ['PGRST205', '42P01']) {
    const { client } = fakeClient({ fail: { select: { code, message: 'relation does not exist' } } });
    assert.deepEqual(await holtNotesStore(client, signedIn).fetchNotes(), []);
  }
});

test('fetchNotes: signed out, or any other failure, is [] — never a throw', async () => {
  const { client, calls } = fakeClient({ rows: [row('a', 'Hates lunges')] });
  assert.deepEqual(await holtNotesStore(client, async () => null).fetchNotes(), []);
  assert.equal(calls.length, 0, 'no read without an athlete');
  const boom = { from: () => { throw new Error('offline'); } };
  assert.deepEqual(await holtNotesStore(boom, signedIn).fetchNotes(), []);
});

test('addNotes: inserts only new, valid notes, with the source; reports the rest', async () => {
  const { client, calls, table } = fakeClient({ rows: [row('a', 'Hates lunges')] });
  const res = await holtNotesStore(client, signedIn).addNotes(['HATES LUNGES', 'Runs Tue/Thu', 'x'], 'ask');
  assert.deepEqual(res.added.map((n) => n.text), ['Runs Tue/Thu']);
  assert.deepEqual(res.skipped.map((s) => s.reason), ['duplicate', 'invalid']);
  const insert = calls.find((c) => c.op === 'insert');
  assert.deepEqual(insert.payload, [{ text: 'Runs Tue/Thu', source: 'ask' }]);
  assert.equal(table.length, 2);
});

test('addNotes: at the cap it inserts nothing and returns what was skipped', async () => {
  const rows = Array.from({ length: 20 }, (_, i) => row(`r${i}`, `note ${i}`));
  const { client, calls } = fakeClient({ rows });
  const res = await holtNotesStore(client, signedIn).addNotes(['one more']);
  assert.deepEqual(res.added, []);
  assert.deepEqual(res.skipped, [{ text: 'one more', reason: 'cap' }]);
  assert.ok(!calls.some((c) => c.op === 'insert'), 'no insert attempted when nothing fits');
});

test('addNotes: a race that trips the database trigger comes back as `cap`', async () => {
  // The client counts 19, but another device landed one first: the trigger rejects the insert.
  const rows = Array.from({ length: 19 }, (_, i) => row(`r${i}`, `note ${i}`));
  const { client } = fakeClient({ rows, capAt: 19 });
  const res = await holtNotesStore(client, signedIn).addNotes(['late one']);
  assert.deepEqual(res.added, []);
  assert.deepEqual(res.skipped, [{ text: 'late one', reason: 'cap' }]);
});

test('addNotes: before 0204 every note is `unavailable`, and nothing throws', async () => {
  const { client } = fakeClient({ fail: { select: { code: 'PGRST205' } } });
  const res = await holtNotesStore(client, signedIn).addNotes(['Hates lunges']);
  assert.deepEqual(res, { added: [], skipped: [{ text: 'Hates lunges', reason: 'unavailable' }] });
});

test('updateNote: validates, cleans and targets one id', async () => {
  const { client, calls, table } = fakeClient({ rows: [row('a', 'Hates lunges')] });
  const store = holtNotesStore(client, signedIn);
  assert.equal(await store.updateNote('a', '  Hates   walking lunges '), true);
  assert.equal(table[0].text, 'Hates walking lunges');
  assert.deepEqual(calls.at(-1).filters, [['id', 'a']]);
  assert.equal(await store.updateNote('a', 'x'), false, 'too short never reaches the database');
  assert.equal(await store.updateNote('a', 'y'.repeat(81)), false);
  assert.equal(calls.length, 1);
});

test('deleteNote: removes one; a failure is false, not a throw', async () => {
  const { client, table } = fakeClient({ rows: [row('a', 'Hates lunges'), row('bb', 'Runs Tue/Thu')] });
  assert.equal(await holtNotesStore(client, signedIn).deleteNote('a'), true);
  assert.deepEqual(table.map((r) => r.id), ['bb']);
  const failing = fakeClient({ fail: { delete: { code: '42501', message: 'denied' } } });
  assert.equal(await holtNotesStore(failing.client, signedIn).deleteNote('a'), false);
});
