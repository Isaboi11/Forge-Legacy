/**
 * s2-edit.test.mjs — changing a running program, run for real against Benjamin's world (Holt Listens HL-10, slice S2).
 * Every check reads the RESULT (what was written, what Undo put back), not only the words.
 *
 * Run (from the repo root):  node --test --experimental-strip-types src/domain/coach/engine/__tests__/s2-edit.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { canDoExercise } from '../../../home-gym/equipment.ts';
import { plannedDays, trainingDays } from '../../../program/progress-core.ts';
import { contextFrom } from '../../candidates.ts';
import { limitationPatterns } from '../../rulebook/limitations.ts';
import { resetVoice } from '../../rulebook/voice.ts';
import { beginEdit, editByWords, finishTypedEdit, stepEdit } from '../edit.ts';
import { fakePort, recordingSink } from '../testing.ts';
import { freshRefs } from '../types.ts';
import { BENJAMIN_KIT, benjaminWorld, catalog } from './fixtures.mjs';

const ctx = () =>
  contextFrom({ owned: BENJAMIN_KIT, canDo: canDoExercise, experience: 'intermediate', limitations: [], limitationPatterns, excludeExercises: [] });

function setup({ premiumAi = true, typed = [] } = {}) {
  resetVoice();
  const w = benjaminWorld();
  const { port, world } = fakePort({ ...w, catalog: catalog() });
  const sink = recordingSink();
  const refs = { ...freshRefs(), typed };
  const built = [];
  const hooks = { premiumAi, entitlementStatus: 'ready', ctx, buildTheNewOne: (said, line) => built.push({ said, line }) };
  return { w, port, world, sink, refs, hooks, built };
}

const dayAt = (structure, w, d) => trainingDays(plannedDays(structure, w))[d];
const chipNamed = (sink, label) => {
  const c = [...sink.turns].reverse().find((t) => t.kind === 'chips');
  return c?.chips.find((x) => x.label === label || x.label.startsWith(label));
};

test('⭐ Benjamin turn 3 — "Keep it and change it" with his request waiting: honest line, 7 sessions + later weeks (not 22 chips)', async () => {
  const s = setup({ typed: ['Build out some variation… add abs, rear delts, cardio'] });
  await beginEdit(s.refs, s.port, s.sink, s.hooks);
  assert.match(s.sink.holt()[0], /one session at a time/);
  const chips = s.sink.lastChips();
  assert.equal(chips.length, 10);
  assert.match(chips[0], /^Week 4, day 4 — /);
  assert.deepEqual(chips.slice(-3), ['Week 6', 'Week 7', 'Week 8']);
  assert.equal(s.world.writes.length, 0);
});

test('a later week opens to its own sessions', async () => {
  const s = setup();
  await beginEdit(s.refs, s.port, s.sink, s.hooks);
  stepEdit(s.refs, s.port, s.sink, s.hooks, chipNamed(s.sink, 'Week 7').edit);
  assert.equal(s.sink.holt().at(-1), 'Which session in week 7?');
  assert.equal(s.sink.lastChips().length, 5);
  assert.ok(s.sink.lastChips().every((l) => l.startsWith('Week 7, day ')));
});

test('⭐ Benjamin turn 4 — "edit the entire workout to include what I\'ve mentioned" → told plainly, not "Which session?"', async () => {
  const s = setup({ typed: ['…add abs…'] });
  await editByWords(s.refs, s.port, s.sink, s.hooks, { op: 'add', exercise: 'abs' }, 'I want to edit the entire workout to include what I’ve mentioned above.');
  const said = s.sink.holt().join(' ');
  assert.match(said, /Reworking every session of 8-Week Muscle Block in one go isn't something I can do yet/);
  assert.doesNotMatch(said, /Which session/);
  // AI lane (S7, PO D10): said, not tapped — the answer is typed.
  assert.match(s.sink.holt().at(-1), /Which do you want\?$/);
  assert.equal(s.sink.turns.filter((t) => t.kind === 'chips').length, 0, 'no buttons in an AI conversation');
  assert.equal(s.refs.askedAboutReplacing, true, '"build the new one" next builds without asking again');
  assert.equal(s.world.writes.length, 0);
});

test('⭐ Benjamin turn 5 — "replace the entire program" → builds the new one, no question', async () => {
  const s = setup({ typed: ['…add abs…'] });
  await editByWords(s.refs, s.port, s.sink, s.hooks, { op: 'rebuild' }, 'I want to replace the entire program');
  assert.equal(s.built.length, 1);
  assert.equal(s.built[0].said, 'I want to replace the entire program');
  assert.match(s.built[0].line, /building you a new one/);
  assert.equal(s.sink.holt().filter((l) => /Which session/.test(l)).length, 0);
});

test('the loop breaker: the same question typed-at twice is not asked a second time', async () => {
  const s = setup();
  await editByWords(s.refs, s.port, s.sink, s.hooks, { op: 'rebuild' }, 'rebuild it');
  const first = s.sink.holt().at(-1);
  await editByWords(s.refs, s.port, s.sink, s.hooks, { op: 'rebuild' }, 'rebuild that one');
  const second = s.sink.holt().at(-1);
  assert.notEqual(second, first);
  assert.match(second, /I still need to know which session/);
  assert.doesNotMatch(second, /tap one/, 'AI lane: nothing to tap');
  assert.equal(s.sink.turns.filter((t) => t.kind === 'chips').length, 0, 'no buttons in an AI conversation');
});

test('⭐ tapped edit end to end: sets on a Week 5 session for the rest of the block → saved; Undo puts it back exactly', async () => {
  const s = setup();
  const before = s.w.active.structure;
  await beginEdit(s.refs, s.port, s.sink, s.hooks);
  stepEdit(s.refs, s.port, s.sink, s.hooks, chipNamed(s.sink, 'Week 5, day 2').edit);
  stepEdit(s.refs, s.port, s.sink, s.hooks, s.sink.turns.at(-1).chips.find((c) => c.edit?.change === 'sets').edit);
  stepEdit(s.refs, s.port, s.sink, s.hooks, s.sink.turns.at(-1).chips[0].edit);
  stepEdit(s.refs, s.port, s.sink, s.hooks, s.sink.turns.at(-1).chips[0].edit);
  const scope = s.sink.turns.at(-1).chips.find((c) => c.edit?.scope === 'rest_of_block');
  stepEdit(s.refs, s.port, s.sink, s.hooks, scope.edit);
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(s.world.writes.length, 1, 'one save');
  assert.notDeepEqual(s.world.active.structure, before, 'the program changed');
  // finished sessions are untouched
  assert.deepEqual(dayAt(s.world.active.structure, 0, 0).main.map((e) => [e.catalogKey, e.sets]), dayAt(before, 0, 0).main.map((e) => [e.catalogKey, e.sets]));
  const undo = chipNamed(s.sink, 'Undo');
  await finishTypedEdit(s.refs, s.port, s.sink, s.hooks, undo);
  assert.equal(s.sink.holt().at(-1), 'Put it back the way it was.');
  assert.deepEqual(s.world.active.structure, before, 'Undo restores the structure exactly');
});

test('typed swap with the day named → confirm names the program → applied only on the tap → Undo', async () => {
  const s = setup();
  const pull = dayAt(s.w.active.structure, 4, 1);
  const row = pull.main.find((e) => e.kind !== 'cardio');
  const replacement = catalog().find((e) => e.key !== row.catalogKey && e.name && /curl/i.test(e.name) && canDoExercise(e, BENJAMIN_KIT));
  await editByWords(s.refs, s.port, s.sink, s.hooks, { op: 'swap', exercise: row.name, to: replacement.name, day: 'week 5 day 2' }, `swap ${row.name} for ${replacement.name} on week 5 day 2`);
  const confirm = s.sink.holt().at(-1);
  assert.match(confirm, /^In 8-Week Muscle Block: /);
  assert.equal(s.world.writes.length, 0, 'nothing saved before the tap');
  const go = s.sink.lastChips().includes('Do it') ? 'Do it' : 'Just this week';
  await finishTypedEdit(s.refs, s.port, s.sink, s.hooks, chipNamed(s.sink, go));
  assert.equal(s.world.writes.length, 1);
  await finishTypedEdit(s.refs, s.port, s.sink, s.hooks, chipNamed(s.sink, 'Undo'));
  assert.deepEqual(s.world.active.structure, s.w.active.structure);
});

test('Premium AI gate: no AI plan → told, offered Premium, nothing read or written', async () => {
  const s = setup({ premiumAi: false });
  await beginEdit(s.refs, s.port, s.sink, s.hooks);
  assert.match(s.sink.holt()[0], /part of Premium AI/);
  assert.deepEqual(s.sink.lastChips(), ['See Premium AI']);
  assert.deepEqual(s.sink.busyLog, []);
});

test('no program running → says so, offers to build', async () => {
  resetVoice();
  const { port } = fakePort({ active: null, catalog: catalog() });
  const sink = recordingSink();
  await beginEdit(freshRefs(), port, sink, { premiumAi: true, entitlementStatus: 'ready', ctx, buildTheNewOne: () => undefined });
  assert.deepEqual(sink.lastChips(), ['Build me something']);
});
