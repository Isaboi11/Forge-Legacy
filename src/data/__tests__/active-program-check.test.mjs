import './harness/hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Launch QA B14 / UX-006 — HOLT'S START IT NOW ENDED A RUNNING PROGRAM WITHOUT ASKING.
 *
 * Its "is a program running?" read swallowed a failure AND a >4 s answer to "no program", and started — which ends
 * whatever is running, permanently (the harm of 09-26 F1). `fetchActiveProgram` also read a failed `getUser()` (what
 * no signal looks like) as "nobody signed in" → "no program". `checkActiveProgram` answers `known: true` ONLY when the
 * server answered; a failure, a signed-out-looking `getUser()` or a slow read is `known: false`, and the caller asks.
 *
 * The REAL `programs-live.ts`, against the in-memory database.
 */

const { db, supabase, ATHLETE } = await import('./harness/fake-supabase.mjs');
const live = await import('../programs-live.ts');

const realGetUser = supabase.auth.getUser;
const TIMEOUT = { code: '57014', message: 'canceling statement due to statement timeout', details: null, hint: null };

function putRunning(name = '8-Week Muscle Block') {
  db.rows('programs').push({
    id: 'p-running',
    athlete_id: ATHLETE,
    name,
    structure: { name, weeks: [] },
    state: 'active',
    started_at: '2026-11-01T00:00:00Z',
    ended_at: null,
    created_at: '2026-11-01T00:00:00Z',
  });
}

test.beforeEach(() => {
  db.reset();
  supabase.auth.getUser = realGetUser;
});
test.after(() => {
  supabase.auth.getUser = realGetUser;
});

test('a running program is known, by name — the caller asks "This ends your current program"', async () => {
  putRunning();
  const check = await live.checkActiveProgram(1000);
  assert.equal(check.known, true);
  assert.equal(check.program?.name, '8-Week Muscle Block');
});

test('only a read that ANSWERED "nothing is running" is known-empty — the one case that may start unasked', async () => {
  const check = await live.checkActiveProgram(1000);
  assert.deepEqual(check, { known: true, program: null });
});

test('a failed read is UNKNOWN, never "no program"', async () => {
  putRunning();
  db.fail = (table, mode) => (table === 'programs' && mode === 'select' ? TIMEOUT : null);
  assert.deepEqual(await live.checkActiveProgram(1000), { known: false });
});

test('no signal is UNKNOWN', async () => {
  putRunning();
  db.offline = true;
  assert.deepEqual(await live.checkActiveProgram(1000), { known: false });
});

test('a failed getUser() (no signal answers user: null WITH an error) is UNKNOWN — the lenient read still says null', async () => {
  putRunning();
  supabase.auth.getUser = async () => ({ data: { user: null }, error: { name: 'AuthRetryableFetchError', message: 'Failed to fetch' } });
  assert.deepEqual(await live.checkActiveProgram(1000), { known: false });
  await assert.rejects(() => live.fetchActiveProgram({ strict: true }));
  assert.equal(await live.fetchActiveProgram(), null, 'every other caller sees what it always did');
});

test('a read still out at the timeout is UNKNOWN — and the check does not wait for it', async () => {
  putRunning();
  supabase.auth.getUser = () => new Promise((resolve) => setTimeout(() => resolve({ data: { user: { id: ATHLETE } }, error: null }), 300));
  const t0 = Date.now();
  assert.deepEqual(await live.checkActiveProgram(20), { known: false });
  assert.ok(Date.now() - t0 < 250, 'answered at the timeout, not when the slow read landed');
});
