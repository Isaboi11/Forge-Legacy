/**
 * s3-turn.test.mjs — a typed line, end to end through the engine (Holt Listens HL-10, slice S3 — the HL-10 acceptance:
 * Benjamin's conversation replays headless). The model is scripted (`askAloud` → the step coach-ask's action would
 * become, through the engine's real `actOn`); everything after it is the real engine on his real-shaped block.
 *
 * Run (from the repo root):  node --test --experimental-strip-types src/domain/coach/engine/__tests__/s3-turn.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { canDoExercise } from '../../../home-gym/equipment.ts';
import { contextFrom } from '../../candidates.ts';
import { nextQuestion } from '../../chat-core.ts';
import { limitationPatterns } from '../../rulebook/limitations.ts';
import { resetVoice } from '../../rulebook/voice.ts';
import { advance } from '../build.ts';
import { beginEdit, clearEdit } from '../edit.ts';
import { actOn } from '../act.ts';
import { fakePort, recordingSink } from '../testing.ts';
import { alsoSaid, process } from '../turn.ts';
import { freshRefs } from '../types.ts';
import { BENJAMIN_KIT, benjaminWorld, catalog } from './fixtures.mjs';

const UNCAPPED = { outcome: 'allowed', cap: -1, ok: true, showUpsell: false, showRetry: false, left: Infinity, label: '' };
const tick = () => new Promise((r) => setTimeout(r, 5));

/**
 * One sheet's worth of engine: refs, the fake world, a sink, and hooks that do what the sheet's do — with the model
 * scripted: each typed line Holt is asked about answers with the next step in `model`.
 */
function sheet({ premiumAi = true, kitchen = false, world = benjaminWorld() } = {}) {
  resetVoice();
  const { port, world: w } = fakePort({ ...world, catalog: catalog() });
  const sink = recordingSink();
  const refs = { ...freshRefs(), constraints: { experience: { lifting: 'intermediate', running: 'beginner' }, ownedEquipment: BENJAMIN_KIT } };
  const model = [];
  const seen = { asked: [], stops: [], kitchen: [], taps: [] };
  const build = {
    gates: () => UNCAPPED,
    closeSignal: () => new AbortController().signal,
    stop: (route, text) => seen.stops.push({ route, text }),
    lastCard: () => undefined,
    setConstraints: (c) => void (refs.constraints = c),
    setBuilt: (b) => void (refs.built = b),
  };
  const edit = {
    premiumAi,
    entitlementStatus: 'ready',
    ctx: () => contextFrom({ owned: BENJAMIN_KIT, canDo: canDoExercise, experience: 'intermediate', limitations: [], limitationPatterns, excludeExercises: [] }),
    /* The sheet's buildTheNewOne, as it is today. */
    buildTheNewOne: (said, line) => {
      clearEdit(refs);
      refs.askedAboutReplacing = true;
      if (said) alsoSaid(refs, said);
      if (refs.mode !== 'program') refs.mode = 'program';
      void advance(refs, port, sink, build, refs.constraints, 'program', line);
    },
  };
  const hooks = {
    premiumAi,
    nutritionAccess: true,
    kitchen,
    edit,
    build,
    setMode: (m) => void (refs.mode = m),
    setConstraints: (c) => void (refs.constraints = c),
    tapChip: (chip) => void seen.taps.push(chip.label),
    guard: () => true,
    blockDoorRefuses: () => false,
    keepRoom: (env) => void (refs.room = env),
    creditsLine: async () => 'Out of credits.',
    loadNotes: async () => [],
    history: () => [],
    /* coach-ask, scripted: its forwarded TOOL CALLS (what coach-ask streams as `action` events) go through the
       engine's real actOn — planHoltActions, then respondTo — exactly as on the phone after a clean ending. */
    askAloud: async (text, _h, q) => {
      seen.asked.push(text);
      const actions = model.shift();
      if (actions) {
        await actOn(refs, port, sink, { turn: hooks, knownNotes: () => [], cardContext: async () => ({}), showCard: () => undefined }, actions, text, { done: true, stop: null }, true, q, refs.mode ?? 'program');
      }
    },
    runKitchen: async (text) => void seen.kitchen.push(text),
    stops: {
      crisis: (t) => seen.stops.push({ route: 'crisis', text: t }),
      urgent: (t) => seen.stops.push({ route: 'urgent', text: t }),
      care: (t) => seen.stops.push({ route: 'care', text: t }),
      medical: (t) => seen.stops.push({ route: 'medical', text: t }),
    },
  };
  return { refs, port, world: w, sink, hooks, model, seen };
}

const TURN2 =
  'What I’d like is for you to build out some variation. Keep it on the 5 day plan. Add abs (core) and anything else like rear deltoids that you feel like are missing. I’d also like to potentially add cardio. Here is the equipment that I have: Pull up bar, Lat pull down bar, Straight bar, EZ bar, Barbell, Dumbbells, Cable rope, Cables, Bench, Peloton.';
const TURN4 = 'I want to edit the entire workout to include what I’ve mentioned above.';
const TURN5 = 'I want to replace the entire program';

test('⭐ HL-10 acceptance — Benjamin 11-18, replayed headless through the engine on his block', async () => {
  const s = sheet();

  // Turn 2: typed → Holt (propose_program) → the active-program question, carrying his words.
  s.model.push([{ name: 'propose_program', input: { goal: 'muscle', daysPerWeek: 5 } }]);
  process(s.refs, s.port, s.sink, s.hooks, TURN2);
  await tick();
  assert.deepEqual(s.seen.asked, [TURN2], 'his sentence went to Holt');
  assert.deepEqual(s.refs.typed, [TURN2], 'and is kept whole for the build');
  assert.match(s.sink.holt().at(-1), /^You're already running 8-Week Muscle Block\. I can build a new program with everything you just told me/);
  assert.deepEqual(s.sink.lastChips(), ['Build the new one', 'Just a week instead', 'Keep it and change it']);
  assert.equal(s.refs.constraints.daysPerWeek, 5, 'the request is in state before the question (R2-F8)');

  // Turn 3: "Keep it and change it" (the sheet's tapChip → beginEdit).
  await beginEdit(s.refs, s.port, s.sink, s.hooks.edit);
  assert.match(s.sink.holt().at(-1), /one session at a time/);
  assert.equal(s.sink.lastChips().length, 10, 'not 22');

  // Turn 4: typed → Holt (propose_program_edit, no day) → told plainly, not "Which session?".
  s.model.push([{ name: 'propose_program_edit', input: { op: 'add', exercise: 'abs' } }]);
  process(s.refs, s.port, s.sink, s.hooks, TURN4);
  await tick();
  assert.match(s.sink.holt().at(-1), /isn't something I can do yet/);
  assert.deepEqual(s.sink.lastChips(), ['Build the new one', 'One session at a time']);

  // Turn 5: typed → Holt (propose_program_edit) → builds the new one from everything he said.
  s.model.push([{ name: 'propose_program_edit', input: { op: 'rebuild' } }]);
  process(s.refs, s.port, s.sink, s.hooks, TURN5);
  await tick();
  assert.equal(s.sink.holt().filter((l) => /Which session should change\?/.test(l)).length, 0, 'never the loop');
  assert.deepEqual(s.refs.typed, [TURN2, TURN5], 'his words carried into the new build');
  assert.equal(s.world.writes.filter((w) => w.kind === 'update').length, 0, 'his running program was never touched');
  // ⚠ What the TAP lane still does today: the build asks its remaining questions with chips. Step 2's AI lane (S7)
  // replaces this with Holt asking in words — this assertion is the "before" the S7 test will flip.
  assert.ok(s.sink.lastChips().length > 0, 'today: a wizard question with chips');
});

test('⛔ a person in danger is stopped before anything else — no model, no kitchen', async () => {
  const s = sheet({ kitchen: true });
  process(s.refs, s.port, s.sink, s.hooks, 'I want to kill myself');
  await tick();
  assert.equal(s.seen.stops[0]?.route, 'crisis');
  assert.equal(s.seen.asked.length, 0);
  assert.equal(s.seen.kitchen.length, 0);
});

test('⛔ in the kitchen, "I have an eating disorder" stops before the dish writer (R2-F6)', async () => {
  const s = sheet({ kitchen: true });
  process(s.refs, s.port, s.sink, s.hooks, 'I have an eating disorder');
  await tick();
  assert.ok(s.seen.stops.length === 1);
  assert.equal(s.seen.kitchen.length, 0);
});

test('without Premium AI a sentence never reaches the model: placed by the free matcher, or "didn\'t catch that" + chips', async () => {
  const s = sheet({ premiumAi: false });
  s.refs.mode = 'program';
  s.refs.constraints = { goal: 'muscle' };
  process(s.refs, s.port, s.sink, s.hooks, 'blah blah');
  await tick();
  assert.equal(s.seen.asked.length, 0);
  assert.ok(s.sink.lastChips().length > 0);
});

test('a typed answer to the question on the table is placed for free — no model call', async () => {
  const s = sheet();
  s.refs.mode = 'program';
  s.refs.constraints = { goal: 'muscle', experience: { lifting: 'intermediate', running: 'beginner' } };
  const q = nextQuestion(s.refs.constraints, 'program');
  assert.ok(q && q.chips.length, 'a question is on the table');
  const before = JSON.stringify(s.refs.constraints);
  // Typed exactly as one of its answers reads.
  process(s.refs, s.port, s.sink, s.hooks, q.chips[0].label);
  await tick();
  assert.equal(s.seen.asked.length, 0, 'the local matcher answered it');
  assert.notEqual(JSON.stringify(s.refs.constraints), before, 'and the answer landed');
});
