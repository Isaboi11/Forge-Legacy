/**
 * PO 11-19: "He's asking me where I train — I already answered that. If I say home gym it should prompt me to add the
 * equipment, or show me the equipment I have in there already — and build workouts and programs just around that."
 *
 *   · home with nothing on file → he asks what is in it (+ the Home Gym screen); nothing is built from a guess
 *   · the typed answer is read free, saved to the home gym, and the build uses only that kit
 *   · home with a kit on file → he names it once, with a way to edit it, and builds from it
 *   · a kit named for TODAY ("hotel, just dumbbells") is not called "your home gym" and is not saved
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { canDoExercise } from '../../../home-gym/equipment.ts';
import { typedEquipment } from '../../typed-equipment.ts';
import { resetVoice } from '../../rulebook/voice.ts';
import { advance, EDIT_HOME_GYM, SET_UP_HOME_GYM } from '../build.ts';
import { fakePort, recordingSink } from '../testing.ts';
import { freshRefs } from '../types.ts';
import { catalog } from './fixtures.mjs';

const UNCAPPED = { outcome: 'allowed', cap: -1, ok: true, showUpsell: false, showRetry: false, left: Infinity, label: '' };

function setup({ typed = [] } = {}) {
  resetVoice();
  const { port, world } = fakePort({ catalog: catalog() });
  const sink = recordingSink();
  const refs = { ...freshRefs(), typed };
  const hooks = {
    gates: () => UNCAPPED,
    closeSignal: () => new AbortController().signal,
    stop: () => undefined,
    lastCard: () => undefined,
    setConstraints: (c) => {
      refs.constraints = c;
    },
    setBuilt: (b) => {
      refs.built = b;
    },
  };
  return { port, world, sink, refs, hooks };
}

const ask = { goal: 'muscle', experience: { lifting: 'intermediate', running: 'beginner' }, daysPerWeek: 3, sessionMinutes: 60, weeks: 4, limitations: [], environment: 'home' };
const byKey = new Map(catalog().map((e) => [e.key, e]));
const allRows = (s) => (s.weekPlans?.length ? s.weekPlans.flatMap((w) => w.days) : s.days).flatMap((d) => d.main);
const chips = (sink) => sink.turns.filter((t) => t.kind === 'chips').flatMap((t) => t.chips);

test('home, nothing on file: he asks what is in it, offers the Home Gym screen, builds nothing — both lanes', async () => {
  for (const lane of ['tap', 'ai']) {
    const s = setup();
    await advance(s.refs, s.port, s.sink, { ...s.hooks, lane }, ask, 'program');
    assert.equal(s.refs.kitAsked, true, lane);
    assert.ok(chips(s.sink).some((c) => c.label === SET_UP_HOME_GYM && c.goTo === '/home-gym'), lane);
    if (lane === 'ai') assert.equal(chips(s.sink).length, 1, 'the AI lane gets the screen, not a chip flow');
    assert.equal(s.refs.built, null);
  }
});

test('the typed answer is the kit: saved to the home gym, named once, and the program uses only it', async () => {
  const s = setup();
  await advance(s.refs, s.port, s.sink, s.hooks, ask, 'program');
  const said = 'dumbbells up to 50, a bench and a pull up bar';
  await advance(s.refs, s.port, s.sink, s.hooks, { ...s.refs.constraints, ...typedEquipment(said) }, 'program');
  assert.deepEqual(s.world.writes.find((w) => w.kind === 'kit')?.ids.sort(), ['bench', 'dumbbells', 'pullup']);
  assert.match(s.sink.holt().join(' '), /Building around your home gym: dumbbells, pull-up bar and (a )?bench|Building around your home gym:/i);
  assert.ok(s.refs.built?.structure, 'built');
  const bad = allRows(s.refs.built.structure).filter((e) => e.catalogKey && byKey.get(e.catalogKey) && !canDoExercise(byKey.get(e.catalogKey), ['dumbbells', 'bench', 'pullup']));
  assert.deepEqual(bad.map((e) => e.catalogKey), [], 'nothing outside their home gym');
});

test('home with a kit on file: named once with "Edit my home gym", built from it, nothing asked', async () => {
  const s = setup();
  await advance(s.refs, s.port, s.sink, s.hooks, { ...ask, ownedEquipment: ['dumbbells', 'bench', 'cable'] }, 'program');
  const said = s.sink.holt().join(' ');
  assert.match(said, /Building around your home gym: dumbbells, bench and cable machine/i);
  assert.doesNotMatch(said, /What's in your home gym/);
  assert.ok(chips(s.sink).some((c) => c.label === EDIT_HOME_GYM && c.goTo === '/home-gym'));
  assert.equal(s.world.writes.filter((w) => w.kind === 'kit').length, 0, 'nothing re-saved');
  assert.ok(s.refs.built?.structure);
});

test('a kit named for today ("hotel, just dumbbells") is not "your home gym" and is not saved', async () => {
  const said = 'I am at a hotel today, just dumbbells up to 50';
  const s = setup({ typed: [said] });
  await advance(s.refs, s.port, s.sink, s.hooks, { goal: 'muscle', experience: { lifting: 'intermediate', running: 'beginner' }, dayFocus: { kind: 'split', split: 'full_body' }, sessionMinutes: 45, limitations: [], ...typedEquipment(said) }, 'day');
  assert.doesNotMatch(s.sink.holt().join(' '), /your home gym/);
  assert.equal(s.world.writes.filter((w) => w.kind === 'kit').length, 0);
});

test('the reader knows the whole Home Gym list the way people say it', () => {
  const ids = (t) => (typedEquipment(t)?.ownedEquipment ?? []).sort();
  assert.deepEqual(ids('cable machine and dumbbells'), ['cable', 'dumbbells']);
  assert.deepEqual(ids('smith machine, cables, leg press'), ['cable', 'legpress', 'smith']);
  assert.deepEqual(ids('a peloton and an ez bar'), ['bike', 'ezbar']);
  assert.equal(typedEquipment('I bike to work'), null);
  assert.equal(typedEquipment('I go to the gym'), null);
});
