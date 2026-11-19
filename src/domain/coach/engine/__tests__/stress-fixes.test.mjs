/**
 * Fixes from the stress run (PO 11-19, 135 live conversations, 123 passed). Each is a GENERAL behaviour the live run
 * showed missing — the conversations themselves stay tests in scripts/holt-corpus, never code:
 *   1. New gear said in a change ("I bought a cable machine") — Holt names it, the change may use it, Do it saves it.
 *   2. "Scrap it and build me a new one" / "a 10k instead" — the athlete already answered "replace?"; no second ask.
 *   3. A bare "something easy today" on the AI lane builds the day — no "What should I train today?" chip.
 *   4. A change the checker emptied says why, never "tell me a bit more".
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { canDoExercise, HOME_GYM_EQUIPMENT } from '../../../home-gym/equipment.ts';
import { plannedDays, trainingDays } from '../../../program/progress-core.ts';
import { CHANGE_EQUIPMENT_IDS } from '../../ask-tools.ts';
import { planHoltActions } from '../../ask-outcome.ts';
import { resetVoice } from '../../rulebook/voice.ts';
import { actOn } from '../act.ts';
import { finishTypedEdit } from '../edit.ts';
import { guardActiveProgram } from '../guards.ts';
import { fakePort, recordingSink } from '../testing.ts';
import { freshRefs } from '../types.ts';
import { benjaminWorld, catalog } from './fixtures.mjs';

const ROW = (key, sets = 3, reps = 12) => ({ key, part: 'main', sets, reps, repsTo: 0, seconds: 0, miles: 0, group: '' });
const EDIT = { premiumAi: true, entitlementStatus: 'ready', ctx: () => ({}), buildTheNewOne: () => undefined };
const KIT = ['dumbbells', 'bench'];

function setup() {
  resetVoice();
  const w = benjaminWorld();
  const { port, world } = fakePort({ ...w, catalog: catalog() });
  const sink = recordingSink();
  const refs = { ...freshRefs(), lane: 'ai', constraints: { experience: { lifting: 'intermediate', running: 'beginner' }, ownedEquipment: KIT, environment: 'home', goal: 'muscle' } };
  const hooks = { turn: { premiumAi: true, nutritionAccess: true, kitchen: false }, knownNotes: () => [], cardContext: async () => ({}), showCard: () => undefined, canDo: canDoExercise };
  return { w, port, world, sink, refs, hooks };
}
const pullRows = (s) => trainingDays(plannedDays(s.w.active.structure, 4)).find((d) => d.name === 'Pull').main.map((e) => ROW(e.catalogKey, e.sets, e.reps));
const change = (s, input, said) => actOn(s.refs, s.port, s.sink, s.hooks, [{ name: 'propose_program_change', input }], said, { done: true, stop: null }, true, null, 'program');

test('the change tool’s equipment list IS the home-gym list', () => {
  assert.deepEqual([...CHANGE_EQUIPMENT_IDS].sort(), HOME_GYM_EQUIPMENT.map((e) => e.id).sort());
});

test('⭐ "I bought a cable machine": the change uses it, the card says it joins their home gym, Do it saves it', async () => {
  const s = setup();
  s.world.rewriteReplies.push(JSON.stringify({ say: 'Cable face pulls on Pull.', sessions: [{ name: 'Pull', rows: [...pullRows(s), ROW('cable-face-pull')] }], weeks: [], rest: [], unmet: [] }));
  await change(s, { brief: 'They bought a cable machine — face pulls on Pull.', newEquipment: ['cable', 'nonsense'] }, 'I bought a cable machine! Use it.');
  const card = s.sink.holt().join('\n');
  assert.match(card, /Adds to your home gym: Cable machine/);
  assert.match(card, /adds Cable Face Pull/);
  assert.doesNotMatch(card, /left out[^.]*Cable Face Pull/, 'the new gear unlocks it');
  assert.match(s.world.rewriteAsks[0].athlete.equipment.join(','), /cable/, 'the rewriter was told they own it');
  await finishTypedEdit(s.refs, s.port, s.sink, EDIT, { label: 'Do it', patch: {}, typedEdit: 'apply' });
  assert.deepEqual(s.world.writes.find((x) => x.kind === 'kit')?.ids, ['cable'], 'saved to their home gym — only the real id');
  assert.ok(trainingDays(plannedDays(s.world.active.structure, 6)).find((d) => d.name.startsWith('Pull')).main.some((e) => e.catalogKey === 'cable-face-pull'));
  assert.ok(s.refs.constraints.ownedEquipment.includes('cable'));
});

test('without the new gear named, a cable row is still taken out — and when that empties the change, he says why', async () => {
  const s = setup();
  const pull = pullRows(s);
  s.world.rewriteReplies.push(JSON.stringify({ say: 'Swapped a row for cable face pulls.', sessions: [{ name: 'Pull', rows: [...pull.slice(0, -1), ROW('cable-face-pull')] }], weeks: [], rest: [], unmet: [] }));
  await change(s, { brief: 'face pulls' }, 'add face pulls');
  const said = s.sink.holt().join('\n');
  assert.doesNotMatch(said, /tell me a bit more/);
  assert.equal(s.world.writes.filter((x) => x.kind === 'kit').length, 0);
});

test('"scrap it and build a new one": the AI lane does not ask again — it says what it replaces and builds', async () => {
  const s = setup();
  const sink = recordingSink();
  const ok = await guardActiveProgram({ ...freshRefs(), typed: ['scrap it'] }, s.port, sink, { goal: 'strength', replacesCurrent: true }, 'ai');
  assert.equal(ok, true);
  assert.match(sink.holt().join(' '), /replaces 8-Week Muscle Block/);
  const asks = await guardActiveProgram({ ...freshRefs(), typed: ['new program'] }, s.port, recordingSink(), { goal: 'strength' }, 'ai');
  assert.equal(asks, false, 'without it, he still asks');
});

test('propose_program carries replacesCurrent; propose_program_change carries only real equipment ids', () => {
  const plan = (a) => planHoltActions([a], { clean: true, todayISO: '2026-11-19', building: false });
  assert.equal(plan({ name: 'propose_program', input: { goal: 'strength', replacesCurrent: true } }).steps[0].patch.replacesCurrent, true);
  assert.equal(plan({ name: 'propose_program', input: { goal: 'strength', replacesCurrent: 'yes' } }).steps[0].patch.replacesCurrent, undefined);
  assert.deepEqual(plan({ name: 'propose_program_change', input: { brief: 'x', newEquipment: ['pullup', 'laser', 'pullup'] } }).steps[0].newEquipment, ['pullup']);
});

test('"15 minutes of cardio after every workout": a ride written on a lifting day (any part) is its finisher, not dropped', async () => {
  const s = setup();
  s.refs.constraints = { experience: { lifting: 'intermediate', running: 'beginner' }, environment: 'full_gym', goal: 'muscle' };
  s.world.rewriteReplies.push(JSON.stringify({ say: 'Easy bike after Pull.', sessions: [{ name: 'Pull', rows: [...pullRows(s), { key: 'cardio-bike', part: 'cooldown', sets: 1, reps: 0, repsTo: 0, seconds: 900, miles: 0, group: '' }] }], weeks: [], rest: [], unmet: [] }));
  await change(s, { brief: '15 min cardio after each session' }, 'Add 15 minutes of cardio after every workout.');
  await finishTypedEdit(s.refs, s.port, s.sink, EDIT, { label: 'Do it', patch: {}, typedEdit: 'apply' });
  const pull = trainingDays(plannedDays(s.world.active.structure, 6)).find((d) => d.name.startsWith('Pull'));
  const ride = pull.main.find((e) => e.activity === 'bike');
  assert.ok(ride, 'the ride is on Pull');
  assert.equal(ride.targetSec, 900);
  assert.ok(pull.main.some((e) => e.kind !== 'cardio'), 'the lifts are still there');
});

test('"scratch that change": undo_last_change puts it back (free); with nothing to undo, he says so', async () => {
  const s = setup();
  s.hooks.turn.edit = EDIT;
  const start = JSON.stringify(s.w.active.structure);
  s.world.rewriteReplies.push(JSON.stringify({ say: 'Face pulls on Pull.', sessions: [{ name: 'Pull', rows: [...pullRows(s), ROW('cable-face-pull')] }], weeks: [], rest: [], unmet: [] }));
  await change(s, { brief: 'face pulls', newEquipment: ['cable'] }, 'I got a cable machine, add face pulls');
  await finishTypedEdit(s.refs, s.port, s.sink, EDIT, { label: 'Do it', patch: {}, typedEdit: 'apply' });
  assert.notEqual(JSON.stringify(s.world.active.structure), start);
  await actOn(s.refs, s.port, s.sink, s.hooks, [{ name: 'undo_last_change', input: {} }], 'scratch that change', { done: true, stop: null }, true, null, 'program');
  assert.equal(JSON.stringify(s.world.active.structure), start, 'put back exactly');
  assert.equal(s.world.rewriteAsks.length, 1, 'no second rewrite');

  const t = setup();
  t.hooks.turn.edit = EDIT;
  await actOn(t.refs, t.port, t.sink, t.hooks, [{ name: 'undo_last_change', input: {} }], 'undo', { done: true, stop: null }, true, null, 'program');
  assert.match(t.sink.holt().join(' '), /no change of mine to undo/);
  assert.equal(t.world.writes.filter((x) => x.kind === 'update').length, 0);
});
