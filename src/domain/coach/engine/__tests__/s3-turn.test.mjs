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
import { clearEdit } from '../edit.ts';
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
    lane: premiumAi ? 'ai' : 'tap',
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
      const reply = model.shift();
      /* A reply is his words, his tool calls, or both — as coach-ask streams them. */
      const actions = Array.isArray(reply) ? reply : reply?.actions;
      if (reply?.say) sink.say({ kind: 'holt', text: reply.say });
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

const TURN3 = 'Change the one I have';

test('⭐ HL-10 + S7 acceptance — Benjamin 11-18 on the AI lane: he types, Holt talks, ZERO buttons, his program safe', async () => {
  const s = sheet();

  // Turn 2: typed → Holt (propose_program) → the active-program question, IN WORDS, carrying his words.
  s.model.push([{ name: 'propose_program', input: { goal: 'muscle', daysPerWeek: 5 } }]);
  process(s.refs, s.port, s.sink, s.hooks, TURN2);
  await tick();
  assert.deepEqual(s.seen.asked, [TURN2], 'his sentence went to Holt');
  assert.deepEqual(s.refs.typed, [TURN2], 'and is kept whole for the build');
  assert.match(s.sink.holt().at(-1), /^You're already running 8-Week Muscle Block\. I can build a new program with everything you just told me to replace it, build just a week instead, or keep 8-Week Muscle Block and change it\. Which do you want\?$/);
  assert.equal(s.refs.constraints.daysPerWeek, 5, 'the request is in state before the question (R2-F8)');

  // Turn 3: he TYPES "Change the one I have" → Holt answers in words (no tool: there is nothing specific to change yet).
  s.model.push({ say: "Got it — we keep 8-Week Muscle Block. What do you want to change: add core and rear delts, bring in the Peloton, or something else?" });
  process(s.refs, s.port, s.sink, s.hooks, TURN3);
  await tick();
  assert.match(s.sink.holt().at(-1), /What do you want to change/);

  // Turn 4: "edit the entire workout…" → told plainly what he can do today, and asked which — in words.
  s.model.push([{ name: 'propose_program_edit', input: { op: 'add', exercise: 'abs' } }]);
  process(s.refs, s.port, s.sink, s.hooks, TURN4);
  await tick();
  assert.match(s.sink.holt().at(-1), /isn't something I can do yet.*Which do you want\?$/);

  // Turn 5: "replace the entire program" → builds the new one from everything he said; the build asks only what it
  // must, in words (where he trains), having assumed the small things.
  s.model.push([{ name: 'propose_program_edit', input: { op: 'rebuild' } }]);
  process(s.refs, s.port, s.sink, s.hooks, TURN5);
  await tick();
  assert.deepEqual(s.refs.typed, [TURN2, TURN5], 'his words carried into the new build');
  assert.equal(s.refs.constraints.sessionMinutes, 60, 'assumed: about an hour');
  assert.deepEqual(s.refs.constraints.limitations, [], 'assumed: nothing to work around');
  // Everything a build needs is known (his goal, days, level, kit) — so he says what he assumed and BUILDS.
  for (let i = 0; i < 100 && !s.refs.built; i += 1) await tick();
  assert.ok(s.sink.holt().some((l) => /^I've gone with .*about an hour a session.*nothing to work around/.test(l)), 'the assumptions are said');
  assert.deepEqual(s.world.authorAsks[0]?.said, [TURN2, TURN5], 'Holt was asked to write it from BOTH of his messages');
  assert.equal(s.refs.built?.kind, 'program', 'a new program exists to look at');
  assert.ok(s.sink.turns.some((t) => t.kind === 'program'), 'its card is on screen (Start / Save belong to the card, they are not questions)');

  // The bar (plan §12, PO D10): no button flows in an AI conversation, never the loop, his program never written.
  assert.equal(s.sink.turns.filter((t) => t.kind === 'chips').length, 0, 'ZERO buttons from start to finish');
  assert.equal(s.sink.holt().filter((l) => /Which session should change\?/.test(l)).length, 0, 'never the loop');
  assert.equal(s.world.writes.filter((w) => w.kind === 'update').length, 0, 'his running program was never touched');
});

test('the tap lane (free users, AI down) keeps today\'s chips — nothing about it changed', async () => {
  const s = sheet({ premiumAi: false });
  s.refs.mode = 'program';
  s.refs.constraints = { goal: 'muscle', experience: { lifting: 'intermediate', running: 'beginner' } };
  await advance(s.refs, s.port, s.sink, s.hooks.build, s.refs.constraints, 'program');
  assert.ok(s.sink.lastChips().length > 0, 'a question with chips');
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
