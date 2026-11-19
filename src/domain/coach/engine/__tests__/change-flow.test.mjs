/**
 * change-flow.test.mjs — any change through the chat, end to end (PO D12): typed → Holt's `propose_program_change` →
 * rewriter (scripted) → checker → Holt's words + the app's FACTS + Do it / Leave it → saved → Undo puts it all back.
 *
 * Run (from the repo root):  node --test --experimental-strip-types src/domain/coach/engine/__tests__/change-flow.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { canDoExercise } from '../../../home-gym/equipment.ts';
import { plannedDays, trainingDays } from '../../../program/progress-core.ts';
import { resetVoice } from '../../rulebook/voice.ts';
import { actOn } from '../act.ts';
import { finishTypedEdit } from '../edit.ts';
import { fakePort, recordingSink } from '../testing.ts';
import { freshRefs } from '../types.ts';
import { BENJAMIN_KIT, benjaminWorld, catalog } from './fixtures.mjs';

const ROW = (key, sets = 3, reps = 15, group = '') => ({ key, part: 'main', sets, reps, repsTo: 0, seconds: 0, miles: 0, group });

function setup() {
  resetVoice();
  const w = benjaminWorld();
  const { port, world } = fakePort({ ...w, catalog: catalog() });
  const sink = recordingSink();
  const refs = {
    ...freshRefs(),
    constraints: { experience: { lifting: 'intermediate', running: 'beginner' }, ownedEquipment: BENJAMIN_KIT, environment: 'home', goal: 'muscle' },
  };
  const hooks = {
    turn: { premiumAi: true, nutritionAccess: true, kitchen: false },
    knownNotes: () => [],
    cardContext: async () => ({}),
    showCard: () => undefined,
    canDo: canDoExercise,
  };
  return { w, port, world, sink, refs, hooks };
}

const P3 = 'I really want to implement more shoulders — rear delts, the back of my shoulders. What can we add? A lot more during the week.';

test('⭐ P3 through the chat: Holt\'s words, then the app\'s facts of the change, then Do it → saved → Undo → back exactly', async () => {
  const s = setup();
  const pull = trainingDays(plannedDays(s.w.active.structure, 4)).find((d) => d.name === 'Pull');
  const upper = trainingDays(plannedDays(s.w.active.structure, 4)).find((d) => d.name === 'Upper');
  const keep = (d) => d.main.map((e) => ROW(e.catalogKey, e.sets, e.reps));
  // What the rewriter returns (the shape of the live run's answer, 11-19).
  s.world.rewriteReplies.push(
    JSON.stringify({
      say: 'I added cable face pulls on Pull and a rear delt fly on Upper — rear delts three times a week now.',
      sessions: [
        { name: 'Pull', rows: [...keep(pull).filter((r) => r.key !== 'dumbbell-lateral-raise'), ROW('cable-face-pull')] },
        { name: 'Upper', rows: [...keep(upper).filter((r) => r.key !== 'barbell-biceps-curl'), ROW('cable-rear-delt-fly')] },
      ],
      weeks: [],
      rest: [],
      unmet: [],
    }),
  );
  const flow = await actOn(s.refs, s.port, s.sink, s.hooks, [{ name: 'propose_program_change', input: { brief: 'More rear delts: face pulls on Pull, rear delt fly on Upper.' } }], P3, { done: true, stop: null }, true, null, 'program');
  assert.deepEqual(flow, { shown: true, flow: true });
  assert.equal(s.world.rewriteAsks.length, 1);
  assert.match(s.world.rewriteAsks[0], /rear delts/i, 'the rewriter was told what he asked');
  assert.match(s.world.rewriteAsks[0], /Week 4:/, 'and handed the weeks still ahead');

  const lines = s.sink.holt();
  assert.match(lines[0], /face pulls/, 'Holt\'s words first');
  const facts = lines[1];
  assert.match(facts, /^In 8-Week Muscle Block:/);
  assert.match(facts, /\*\*Pull\*\* — adds Cable Face Pull; drops Dumbbell Lateral Raise \(from week 5\)/, 'the facts come from the change itself');
  assert.match(facts, /\*\*Upper\*\* — adds Cable Rear Delt Fly; drops Barbell Biceps Curl/i);
  assert.deepEqual(s.sink.lastChips(), ['Do it', 'Leave it'], 'the confirm — the only buttons');
  assert.equal(s.world.writes.filter((x) => x.kind === 'update').length, 0, 'nothing saved before the tap');

  const before = s.w.active.structure;
  await finishTypedEdit(s.refs, s.port, s.sink, { premiumAi: true, entitlementStatus: 'ready', ctx: () => ({}), buildTheNewOne: () => undefined }, { label: 'Do it', patch: {}, typedEdit: 'apply' });
  assert.equal(s.world.writes.filter((x) => x.kind === 'update').length, 1, 'saved once');
  assert.ok(trainingDays(plannedDays(s.world.active.structure, 6)).find((d) => d.name.startsWith('Pull')).main.some((e) => e.catalogKey === 'cable-face-pull'));
  const undo = [...s.sink.turns].reverse().find((t) => t.kind === 'chips').chips.find((c) => c.label === 'Undo');
  await finishTypedEdit(s.refs, s.port, s.sink, { premiumAi: true, entitlementStatus: 'ready', ctx: () => ({}), buildTheNewOne: () => undefined }, undo);
  assert.deepEqual(s.world.active.structure, before, 'Undo puts the program back exactly');
});

test('"Leave it" changes nothing', async () => {
  const s = setup();
  s.world.rewriteReplies.push(JSON.stringify({ say: 'Core on Upper.', sessions: [{ name: 'Upper', rows: [ROW('cable-crunch')] }], weeks: [], rest: [], unmet: [] }));
  await actOn(s.refs, s.port, s.sink, s.hooks, [{ name: 'propose_program_change', input: { brief: 'core' } }], 'add abs', { done: true, stop: null }, true, null, 'program');
  await finishTypedEdit(s.refs, s.port, s.sink, { premiumAi: true }, { label: 'Leave it', patch: {}, typedEdit: 'cancel' });
  assert.equal(s.sink.holt().at(-1), 'Left it as it was.');
  assert.equal(s.world.writes.length, 0);
});

test('the rewriter unreachable → said plainly, program unchanged', async () => {
  const s = setup();
  await actOn(s.refs, s.port, s.sink, s.hooks, [{ name: 'propose_program_change', input: { brief: 'more variety' } }], 'more variety please', { done: true, stop: null }, true, null, 'program');
  assert.match(s.sink.holt().at(-1), /couldn't rework it just now/);
  assert.equal(s.world.writes.length, 0);
});

test('a change that touches nothing is said, not offered', async () => {
  const s = setup();
  s.world.rewriteReplies.push(JSON.stringify({ say: '', sessions: [], weeks: [], rest: [], unmet: ['a leg press — no machine at home'] }));
  await actOn(s.refs, s.port, s.sink, s.hooks, [{ name: 'propose_program_change', input: { brief: 'leg press' } }], 'add leg press', { done: true, stop: null }, true, null, 'program');
  assert.match(s.sink.holt().at(-1), /couldn't make that change: a leg press/);
  assert.equal(s.sink.lastChips().length, 0);
});
