/**
 * s0-port.test.mjs — the engine's test world is real and repeatable (Holt Listens HL-10, slice S0).
 *
 * Run (from the repo root):  node --test --experimental-strip-types src/domain/coach/engine/__tests__/s0-port.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { editableSessions } from '../../edit-chat.ts';
import { pick, resetVoice } from '../../rulebook/voice.ts';
import { fakePort, recordingSink, seededChooser } from '../testing.ts';
import { benjaminWorld, catalog } from './fixtures.mjs';

test('⭐ Benjamin\'s world matches his screenshots: 8 weeks × 5 days, next open session is Week 4 day 4, 22 left', () => {
  const { active, marks } = benjaminWorld();
  assert.equal(active.structure.weeks, 8);
  assert.equal(active.structure.daysPerWeek, 5);
  const open = editableSessions(active.structure, marks, Number.POSITIVE_INFINITY);
  assert.equal(open.length, 22);
  assert.match(open[0].label, /^Week 4, day 4 — /);
});

test('the seeded chooser repeats exactly, and drives Holt\'s line picker', () => {
  const a = seededChooser(42);
  const b = seededChooser(42);
  const seqA = Array.from({ length: 20 }, () => a(7));
  const seqB = Array.from({ length: 20 }, () => b(7));
  assert.deepEqual(seqA, seqB);
  assert.ok(seqA.every((n) => n >= 0 && n < 7));
  // ⚠ Holt's lines are dealt from decks shared across the process ("never the one he said last"), so a replay must
  // start from fresh decks: the harness calls resetVoice() before every conversation.
  resetVoice();
  const first = pick('ask_edit_session', seededChooser(3));
  resetVoice();
  assert.equal(pick('ask_edit_session', seededChooser(3)), first);
});

test('the fake port reads what it was given, records writes, and a later read sees them', async () => {
  const w = benjaminWorld();
  const { port, world } = fakePort({ ...w, catalog: catalog() });
  const active = await port.programs.active();
  assert.equal(active.name, '8-Week Muscle Block');
  assert.equal((await port.programs.sessions(active.id)).length, 18);
  const changed = { ...active.structure, name: 'changed' };
  await port.programs.update(active.id, changed);
  assert.equal(world.writes.length, 1);
  assert.equal((await port.programs.active()).structure.name, 'changed');
  await port.programs.skip(active.id, 3, 3);
  assert.equal((await port.programs.sessions(active.id)).length, 19);
  const un = await port.programs.unskip(active.id, 3, 3);
  assert.deepEqual(un, { ok: true, removed: true });
});

test('the fake port can drop or hang a read, once', async () => {
  const { port, world } = fakePort(benjaminWorld());
  world.failNext = 'throw';
  await assert.rejects(port.programs.active());
  assert.ok(await port.programs.active());
  world.failNext = 'hang';
  const raced = await Promise.race([port.programs.active(), port.wait(4000).then(() => 'timed-out')]);
  assert.equal(raced, 'timed-out');
});

test('the recording sink keeps Holt\'s lines, the last chips, and the busy log', () => {
  const sink = recordingSink();
  sink.busy('thinking');
  sink.say({ kind: 'holt', text: 'Which session?' }, { kind: 'chips', chips: [{ label: 'A', patch: {} }, { label: 'B', patch: {} }] });
  sink.busy(null);
  assert.deepEqual(sink.holt(), ['Which session?']);
  assert.deepEqual(sink.lastChips(), ['A', 'B']);
  assert.deepEqual(sink.busyLog, ['thinking', null]);
});
