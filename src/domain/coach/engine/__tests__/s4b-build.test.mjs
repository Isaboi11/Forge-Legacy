/**
 * s4b-build.test.mjs — the build, run for real against a world (Holt Listens HL-10, slice S4b). Checks the RESULT:
 * what was drafted, what was spent, what Holt was told, what card went up.
 *
 * Run (from the repo root):  node --test --experimental-strip-types src/domain/coach/engine/__tests__/s4b-build.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { resetVoice } from '../../rulebook/voice.ts';
import { advance } from '../build.ts';
import { fakePort, recordingSink } from '../testing.ts';
import { freshRefs } from '../types.ts';
import { BENJAMIN_KIT, catalog } from './fixtures.mjs';

const UNCAPPED = { outcome: 'allowed', cap: -1, ok: true, showUpsell: false, showRetry: false, left: Infinity, label: '' };

function setup({ typed = [], gates = UNCAPPED } = {}) {
  resetVoice();
  const { port, world } = fakePort({ catalog: catalog() });
  const sink = recordingSink();
  const refs = { ...freshRefs(), typed };
  const seen = { stops: [], cards: [], built: [], constraints: [] };
  const hooks = {
    gates: () => gates,
    closeSignal: () => new AbortController().signal,
    stop: (route, text) => seen.stops.push({ route, text }),
    lastCard: (c) => seen.cards.push(c),
    setConstraints: (c) => {
      refs.constraints = c;
      seen.constraints.push(c);
    },
    setBuilt: (b) => {
      refs.built = b;
      seen.built.push(b);
    },
  };
  return { port, world, sink, refs, hooks, seen };
}

/** Benjamin's request, every question answered — as the chat holds it after his words or his taps. */
const benjamin = {
  goal: 'muscle',
  experience: { lifting: 'intermediate', running: 'beginner' },
  daysPerWeek: 5,
  sessionMinutes: 60,
  weeks: 8,
  environment: 'home',
  ownedEquipment: BENJAMIN_KIT,
  /* "Anything you want left out?" — answered "Nothing — build it". Without it the build (rightly) asks. */
  limitations: [],
};

test('a question still open → the next question with its chips, nothing built, nothing spent (the tap lane today)', async () => {
  const s = setup();
  await advance(s.refs, s.port, s.sink, s.hooks, { goal: 'muscle' }, 'program');
  assert.ok(s.sink.lastChips().length > 0, 'a question with answers to tap');
  assert.equal(s.seen.built.length, 0);
  assert.equal(s.world.writes.filter((w) => w.kind === 'spend' || w.kind === 'draft').length, 0);
  assert.deepEqual(s.sink.busyLog.at(-1), null, 'busy always clears');
});

test('⭐ a TAPPED complete program request → rulebook block: card shown, Builder draft written, nobody asked to write, nothing spent', async () => {
  const s = setup();
  await advance(s.refs, s.port, s.sink, s.hooks, benjamin, 'program');
  assert.equal(s.world.authorAsks.length, 0, 'a tapped build never calls the model');
  assert.equal(s.refs.built?.kind, 'program');
  assert.equal(s.refs.built.structure.daysPerWeek, 5);
  assert.ok(s.sink.turns.some((t) => t.kind === 'program'), 'the program card went up');
  assert.ok(s.seen.cards.at(-1)?.program, 'the card on screen is the program');
  assert.equal(s.world.writes.filter((w) => w.kind === 'draft' && w.what === 'program').length, 1, 'uncapped → drafted now');
  assert.equal(s.world.writes.filter((w) => w.kind === 'spend').length, 0, 'a block pays at the keep, never at the build (B-D1)');
  assert.deepEqual(s.sink.busyLog.at(-1), null);
});

test('⭐ a TYPED request → Holt is asked to write it, with every word they said; unreachable → rulebook builds and he says so', async () => {
  const said = 'Build out some variation. Keep it on the 5 day plan. Add abs (core) and rear delts. Peloton for cardio.';
  const s = setup({ typed: [said] });
  await advance(s.refs, s.port, s.sink, s.hooks, benjamin, 'program');
  assert.equal(s.world.authorAsks.length, 1);
  const ask = s.world.authorAsks[0];
  assert.deepEqual(ask.said, [said], 'his words, whole');
  assert.equal(ask.kind, 'program');
  assert.equal(ask.days, 5);
  assert.equal(s.refs.built?.kind, 'program', 'the rulebook still built it');
  assert.ok(s.sink.holt().some((l) => l.length > 0));
});

test('a typed ask Holt routes to a stop → the stop helper runs with their line, nothing built', async () => {
  const s = setup({ typed: ['my knee is swollen, build me legs'] });
  s.world.authorReplies.push({ kind: 'stop', route: 'care' });
  await advance(s.refs, s.port, s.sink, s.hooks, benjamin, 'program');
  assert.deepEqual(s.seen.stops, [{ route: 'care', text: 'my knee is swollen, build me legs' }]);
  assert.equal(s.seen.built.length, 0);
});

test('⭐ a DAY pays once it exists (B-D4): one spend, then the workout draft; a refused spend builds nothing', async () => {
  const day = { ...benjamin, dayFocus: { kind: 'split', split: 'full_body' } };
  const s = setup();
  await advance(s.refs, s.port, s.sink, s.hooks, day, 'day');
  const kinds = s.world.writes.map((w) => (w.kind === 'draft' ? `draft:${w.what}` : w.kind));
  assert.deepEqual(kinds.filter((k) => k === 'spend' || k.startsWith('draft')), ['spend', 'draft:workout']);
  assert.equal(s.refs.built?.kind, 'day');

  const r = setup();
  r.world.spendReply = { allowed: false, used: 2, allowance: 2 };
  await advance(r.refs, r.port, r.sink, r.hooks, day, 'day');
  assert.equal(r.seen.built.length, 0, 'refused → nothing built');
  assert.ok(r.world.writes.every((w) => w.kind !== 'draft'), 'refused → no draft');
  assert.ok(r.sink.lastChips().includes('See Premium'));
});

test('an assumed room is answered from memory and said out loud', async () => {
  const s = setup();
  s.refs.room = 'home';
  const { environment: _e, ...noRoom } = benjamin;
  await advance(s.refs, s.port, s.sink, s.hooks, noRoom, 'program');
  assert.equal(s.refs.roomAssumed, true);
  assert.equal(s.refs.constraints.environment, 'home');
});
