/**
 * s1-guards.test.mjs — the questions before a build, run for real against a world (Holt Listens HL-10, slice S1).
 *
 * Run (from the repo root):  node --test --experimental-strip-types src/domain/coach/engine/__tests__/s1-guards.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { guardActiveProgram, offerProgramSession } from '../guards.ts';
import { fakePort, recordingSink } from '../testing.ts';
import { freshRefs } from '../types.ts';
import { benjaminWorld } from './fixtures.mjs';

const program = { goal: 'muscle', daysPerWeek: 5 };

test('⭐ Benjamin, turn 2: a TYPED request with his block running → his words are carried, three honest choices', async () => {
  const { port } = fakePort(benjaminWorld());
  const sink = recordingSink();
  const refs = { ...freshRefs(), typed: ['Build out some variation. Keep it on the 5 day plan. Add abs…'] };
  assert.equal(await guardActiveProgram(refs, port, sink, program), false);
  assert.equal(sink.holt().length, 1);
  assert.match(sink.holt()[0], /^You're already running 8-Week Muscle Block\. I can build a new program with everything you just told me/);
  assert.doesNotMatch(sink.holt()[0], /behind your back/);
  assert.deepEqual(sink.lastChips(), ['Build the new one', 'Just a week instead', 'Keep it and change it']);
  assert.deepEqual(sink.busyLog, ['thinking', null], 'the wait is shown, then cleared');
  assert.equal(refs.askedAboutReplacing, true);
});

test('a TAPPED build keeps the old line and chips', async () => {
  const { port } = fakePort(benjaminWorld());
  const sink = recordingSink();
  assert.equal(await guardActiveProgram(freshRefs(), port, sink, program), false);
  assert.match(sink.holt()[0], /behind your back/);
  assert.deepEqual(sink.lastChips(), ['Replace it', 'Just a week instead', 'Change the one I have']);
});

test('asked once per request: the second build goes straight through', async () => {
  const { port } = fakePort(benjaminWorld());
  const refs = freshRefs();
  await guardActiveProgram(refs, port, recordingSink(), program);
  const sink = recordingSink();
  assert.equal(await guardActiveProgram(refs, port, sink, program), true);
  assert.equal(sink.turns.length, 0);
});

test('a single week is never refused (it ends nothing)', async () => {
  const { port } = fakePort(benjaminWorld());
  const sink = recordingSink();
  assert.equal(await guardActiveProgram(freshRefs(), port, sink, { ...program, weeks: 1 }), true);
  assert.equal(sink.turns.length, 0);
});

test('no program running → straight through', async () => {
  const { port } = fakePort({ active: null });
  assert.equal(await guardActiveProgram(freshRefs(), port, recordingSink(), program), true);
});

test('fail-open, bounded: a dropped read or a hung one builds rather than stalls (nothing is started here)', async () => {
  for (const fail of ['throw', 'hang']) {
    const { port, world } = fakePort(benjaminWorld());
    world.failNext = fail;
    const sink = recordingSink();
    assert.equal(await guardActiveProgram(freshRefs(), port, sink, program), true, fail);
    assert.deepEqual(sink.busyLog, ['thinking', null], fail);
  }
});

test('"What should I train today?" with his block running → offers its next session, Week 4 day 4', async () => {
  const w = benjaminWorld();
  const { port } = fakePort(w);
  const sink = recordingSink();
  assert.equal(await offerProgramSession(port, sink), true);
  const said = sink.holt().join(' ');
  assert.match(said, /8-Week Muscle Block/);
  assert.ok(sink.lastChips().length > 0);
});

test('no program → no offer (the day is built as before)', async () => {
  const { port } = fakePort({ active: null });
  const sink = recordingSink();
  assert.equal(await offerProgramSession(port, sink), false);
  assert.equal(sink.turns.length, 0);
});
