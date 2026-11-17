import './harness/hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

/*
 * KEEPING A HOLT BLOCK IN ONE STEP (0270 `keep_holt_program`, AI Road to 10 Sprint 1 — the Sprint 0 leftover
 * "Holt programs are counted on the device only"). The RPC is faked at `db.rpcs`; the two-step fallback runs the real
 * `consumeHoltAllowance` and `createProgram` against the fake tables.
 */

const { db } = await import('@/lib/supabase');
const { keepHoltProgram } = await import('@/data/programs-live');

const BLOCK = { name: '8-Week Strength', weeks: 8, daysPerWeek: 4, vary: false, days: [], weekPlans: null };

let calls = [];
test.beforeEach(() => {
  db.reset();
  calls = [];
});
const rpc = (name, fn) => {
  db.rpcs[name] = (args) => {
    calls.push(name);
    return fn(args);
  };
};

test('kept: ONE call charges and saves — the app writes no row of its own and spends nothing separately', async () => {
  rpc('keep_holt_program', (args) => {
    assert.deepEqual(args, { p_structure: BLOCK });
    return [{ allowed: true, used: 1, allowance: 1, program_id: 'prog-1' }];
  });
  rpc('consume_holt_allowance', () => assert.fail('no separate spend once 0270 is in'));
  assert.deepEqual(await keepHoltProgram(BLOCK), { kind: 'kept', programId: 'prog-1', used: 1, allowance: 1 });
  assert.deepEqual(calls, ['keep_holt_program']);
  assert.equal(db.rows('programs').length, 0, 'the row is the server’s, written in the same transaction');
});

test('refused: the allowance is used — nothing was written', async () => {
  rpc('keep_holt_program', () => [{ allowed: false, used: 1, allowance: 1, program_id: null }]);
  assert.deepEqual(await keepHoltProgram(BLOCK), { kind: 'refused', used: 1, allowance: 1 });
  assert.equal(db.rows('programs').length, 0);
});

test('unread: no answer means nothing kept AND nothing spent — the caller applies the fail-closed rule', async () => {
  rpc('keep_holt_program', () => [{ allowed: true, used: 1, allowance: 1, program_id: 'p' }]);
  db.offline = true;
  assert.deepEqual(await keepHoltProgram(BLOCK), { kind: 'unread' });
  db.offline = false;
  rpc('keep_holt_program', () => []);
  assert.deepEqual(await keepHoltProgram(BLOCK), { kind: 'unread' }, 'an empty answer is not a yes');
  rpc('keep_holt_program', () => [{ allowed: true, used: 1, allowance: 1, program_id: null }]);
  assert.deepEqual(await keepHoltProgram(BLOCK), { kind: 'unread' }, 'a yes with no program is not a keep');
});

test('a Postgres refusal (the programs cap, a bad structure) throws, so "That didn’t save" names it', async () => {
  rpc('keep_holt_program', () => {
    throw new Error('Program limit reached: 3 of 3 used.');
  });
  // Thrown as PostgREST's own error (as `createProgram` throws), code and message intact.
  await assert.rejects(keepHoltProgram(BLOCK), { code: 'P0001', message: /Program limit reached/ });
});

test('before 0270 is pasted: Sprint 0’s two steps, unchanged — so the app can ship first', async () => {
  // No `keep_holt_program` → the fake answers PGRST202, as PostgREST does for a function it has not cached.
  rpc('consume_holt_allowance', (args) => {
    assert.deepEqual(args, { p_kind: 'program' });
    return [{ allowed: true, used: 1, allowance: 1 }];
  });
  const r = await keepHoltProgram(BLOCK);
  assert.equal(r.kind, 'kept');
  assert.deepEqual(calls, ['consume_holt_allowance']);
  assert.equal(db.rows('programs').length, 1);
  assert.equal(db.rows('programs')[0].name, '8-Week Strength');

  db.reset();
  rpc('consume_holt_allowance', () => [{ allowed: false, used: 1, allowance: 1 }]);
  assert.deepEqual(await keepHoltProgram(BLOCK), { kind: 'refused', used: 1, allowance: 1 });
  assert.equal(db.rows('programs').length, 0, 'refused: nothing written');

  db.reset();
  assert.deepEqual(await keepHoltProgram(BLOCK), { kind: 'unread' }, 'neither RPC there: unread, never a free keep');
  assert.equal(db.rows('programs').length, 0);
});
