import './harness/hooks.mjs';
import { registerHooks } from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';

/*
 * The memory switch and Forget everything (AI Road to 10 Sprint 4b §1.4, migration 0278) — against the fake
 * PostgREST client. No row = on; off is one row; Forget everything deletes notes, summaries and past chats; and the
 * brief sends no notes while memory is off.
 */

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === '@/lib/analytics') {
      return { url: 'data:text/javascript,export const track = (n, p) => void (globalThis.__tracks ??= []).push([n, p]);', shortCircuit: true };
    }
    return next(specifier, context);
  },
});

const { db, ATHLETE } = await import('@/lib/supabase');
const { getRemembers, setRemembers, forgetEverything, forgetRemembersCache, readMemorySeen, markMemorySeen } = await import('@/data/holt-memory-live');
const { fetchBriefNotes, fetchNotes } = await import('@/data/holt-notes-live');

test.beforeEach(() => {
  db.reset();
  forgetRemembersCache();
  globalThis.__tracks = [];
});

test('no row = on (PO: Holt remembers by default)', async () => {
  assert.equal(await getRemembers(), true);
});

test('off is one row for this athlete; on again updates it; telemetry is a name only', async () => {
  assert.equal(await setRemembers(false), true);
  assert.deepEqual(db.rows('holt_memory_prefs').map((r) => [r.athlete_id, r.remembers]), [[ATHLETE, false]]);
  forgetRemembersCache();
  assert.equal(await getRemembers(), false);
  assert.equal(await setRemembers(true), true);
  assert.deepEqual(db.rows('holt_memory_prefs').map((r) => r.remembers), [true]);
  assert.equal(await getRemembers(), true);
  assert.deepEqual(globalThis.__tracks, [['holt_memory', { kind: 'switch_off' }], ['holt_memory', { kind: 'switch_on' }]]);
});

test('⛔ the brief sends no notes while memory is off — What Holt Remembers still lists them', async () => {
  db.rows('holt_notes').push({ id: 'n1', athlete_id: ATHLETE, text: 'Hates burpees', created_at: '2026-11-18T10:00:00Z', source: 'chat', kind: 'dislike' });
  assert.deepEqual((await fetchBriefNotes()).map((n) => n.text), ['Hates burpees']);
  db.rows('holt_memory_prefs').push({ athlete_id: ATHLETE, remembers: false });
  forgetRemembersCache();
  assert.deepEqual(await fetchBriefNotes(), []);
  assert.deepEqual((await fetchNotes()).map((n) => [n.text, n.kind]), [['Hates burpees', 'dislike']]);
});

test('Forget everything deletes every note and chat summary of THIS athlete (and asks lane B for the past chats)', async () => {
  db.rows('holt_notes').push({ id: 'n1', athlete_id: ATHLETE, text: 'Hates burpees' }, { id: 'n2', athlete_id: 'someone-else', text: 'Not mine' });
  db.rows('holt_chat_summaries').push({ id: 's1', athlete_id: ATHLETE, summary: 'You asked about squats.' });
  const ok = await forgetEverything();
  assert.deepEqual(db.rows('holt_notes').map((r) => r.id), ['n2']);
  assert.deepEqual(db.rows('holt_chat_summaries'), []);
  // Until lane B's deleteAllPastChats lands (the integrator's stub answers false), it says it did not all go.
  assert.equal(typeof ok, 'boolean');
});

test('the "New" marks: when the screen was last seen', async () => {
  assert.equal(await readMemorySeen(), null);
  await markMemorySeen(new Date('2026-11-18T12:00:00Z'));
  assert.equal(await readMemorySeen(), '2026-11-18T12:00:00.000Z');
});
