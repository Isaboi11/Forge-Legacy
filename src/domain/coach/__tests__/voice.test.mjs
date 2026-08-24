/**
 * voice.test.mjs — Holt has more than one way of saying everything, and none of them change the training.
 *
 * ══ THE TWO THINGS UNDER TEST ══
 *
 * **THAT HE VARIES.** The PO's ask was volume: *"write a bunch of different things he can say even with
 * the same answer, that way it's not stale."* A key with one line is a key nobody finished, and the same
 * sentence twice running is the specific thing that makes a character read as a script.
 *
 * ⚠ **AND THAT VARIATION STAYS PRESENTATION.** This is the assertion that matters. The engine is
 * deterministic on purpose — same answers, same program — and a voice module is the obvious place for
 * that to quietly stop being true. So: voice may never reach a constraint, and the help menu may never
 * point at a screen that does not exist.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/voice.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { VOICE, pick, pickNamed, resetVoice } from '../rulebook/voice.ts';
import { HELP_TOPICS, OPENERS, fromOpener, nextQuestion, greetReturning, TYPING_ENABLED } from '../chat-core.ts';
import { ENDURANCE_GOALS, GOAL_LABEL } from '../constraints.ts';

const KEYS = Object.keys(VOICE);

// ─────────────────────────────────────────────────────────────────────────────
// HE VARIES
// ─────────────────────────────────────────────────────────────────────────────

test('every line has several ways of arriving', () => {
  for (const key of KEYS) {
    assert.ok(VOICE[key].length >= 3, `${key} has only ${VOICE[key].length} — that will go stale`);
  }
});

test('no variant is empty, duplicated, or shouted', () => {
  for (const key of KEYS) {
    const seen = new Set();
    for (const line of VOICE[key]) {
      assert.ok(line.trim().length > 0, `${key} has a blank variant`);
      assert.ok(!seen.has(line), `${key} repeats "${line}"`);
      seen.add(line);
      // He is warm by taking you seriously, not by being enthusiastic at you.
      assert.doesNotMatch(line, /!/, `${key}: "${line}" — Holt does not exclaim`);
      assert.doesNotMatch(line, /^(Great|Awesome|Perfect|Nice|Amazing)\b/i, `${key}: "${line}" reads as praise for a tap`);
    }
  }
});

test('⚠ he never says the same thing twice in a row', () => {
  resetVoice();
  for (const key of KEYS) {
    if (VOICE[key].length < 2) continue;
    let previous = null;
    for (let i = 0; i < 40; i++) {
      const line = pick(key);
      assert.notEqual(line, previous, `${key} repeated "${line}" back to back`);
      previous = line;
    }
  }
});

test('over many picks he actually uses the whole list', () => {
  resetVoice();
  const seen = new Set();
  for (let i = 0; i < 400; i++) seen.add(pick('ack'));
  assert.ok(seen.size >= Math.min(5, VOICE.ack.length), `only ${seen.size} of ${VOICE.ack.length} acks ever appear`);
});

// ─────────────────────────────────────────────────────────────────────────────
// THE NAME
// ─────────────────────────────────────────────────────────────────────────────

test('{name} appears only where a name belongs', () => {
  for (const key of KEYS) {
    if (key === 'greet_return') continue;
    for (const line of VOICE[key]) assert.doesNotMatch(line, /\{name\}/, `${key} should not be personalised`);
  }
  assert.ok(VOICE.greet_return.every((l) => l.includes('{name}')), 'every greeting uses the name');
});

test('⚠ a missing name reads as deliberate, never as broken', () => {
  // Plenty of profiles have no first name. "Hey {name}." leaking to a screen is the worst version of
  // this, and "Hey ." is only marginally better.
  for (let i = 0; i < 60; i++) {
    for (const name of [null, undefined, '', '   ']) {
      const line = pickNamed('greet_return', name);
      assert.doesNotMatch(line, /\{name\}/, 'token leaked');
      assert.doesNotMatch(line, /\s[,.]/, `stranded punctuation: "${line}"`);
      assert.doesNotMatch(line, /^[,.]/, `leading punctuation: "${line}"`);
      assert.ok(line.trim().length > 0, 'a nameless greeting must still be a greeting');
    }
  }
});

test('a name that exists is used verbatim', () => {
  const line = pickNamed('greet_return', 'Isaiah');
  assert.match(line, /Isaiah/);
  assert.doesNotMatch(line, /\{name\}/);
});

// ─────────────────────────────────────────────────────────────────────────────
// ⭐ VARIATION MUST NOT REACH THE TRAINING
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ greeting the athlete produces conversation, never a constraint', () => {
  const turns = greetReturning('Isaiah');
  for (const t of turns) {
    assert.ok(['holt', 'chips'].includes(t.kind), `a greeting emitted a ${t.kind} turn`);
  }
  // The chips it ends with are the openers, and openers carry no training decisions of their own.
  const chips = turns.find((t) => t.kind === 'chips');
  assert.deepEqual(chips.chips.map((c) => c.label), OPENERS);
  for (const c of chips.chips) assert.deepEqual(c.patch, {}, 'an opener chip must not pre-answer anything');
});

// ─────────────────────────────────────────────────────────────────────────────
// THE FRONT DOOR
// ─────────────────────────────────────────────────────────────────────────────

test('every opener means something', () => {
  for (const label of OPENERS) assert.ok(fromOpener(label), `"${label}" leads nowhere`);
  assert.equal(fromOpener('45 minutes and dumbbells'), null, 'the retired opener must not still resolve');
});

test('the openers are the real reasons to open him', () => {
  const kinds = OPENERS.map((l) => fromOpener(l).kind);
  assert.ok(kinds.includes('build'), 'build a program');
  assert.ok(kinds.includes('import'), 'bring one you already have');
  assert.ok(kinds.includes('edit'), 'change the one you are already running');
  assert.ok(kinds.includes('help'), 'ask how the app works');
  /* ⚠ THE ONE THAT ENDS IN SOMEBODY ELSE'S WORK. Added 2026-08-24 for the athlete stood in front of the
     catalogue who does not know which of fourteen to take — the one question Holt could not answer, and
     could only ever respond to by offering to replace it with something he wrote. */
  assert.ok(kinds.includes('pick'), 'have him choose one off the shelf');
});

test('typing is off, and that is a decision rather than an accident', () => {
  // If this ever flips to true, the model behind `interpret()` had better exist.
  assert.equal(TYPING_ENABLED, false);
});

// ─────────────────────────────────────────────────────────────────────────────
// ONE CHIP FOR FIVE RACES
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ the goal question offers "Run a race", not five distances', () => {
  const q = nextQuestion({});
  assert.equal(q.id, 'goal');
  const labels = q.chips.map((c) => c.label);
  assert.ok(labels.includes('Run a race'), 'the one race chip is missing');
  for (const g of ENDURANCE_GOALS) {
    assert.ok(!labels.includes(GOAL_LABEL[g]), `${GOAL_LABEL[g]} should be behind "Run a race"`);
  }
});

test('"Run a race" narrows to the distances without choosing one', () => {
  const chip = nextQuestion({}).chips.find((c) => c.label === 'Run a race');
  assert.deepEqual(chip.patch, {}, '⚠ it must not answer the goal — nobody picked a distance yet');
  assert.equal(chip.picksRace, true);

  const q = nextQuestion({ pickingRace: true });
  assert.equal(q.id, 'race_distance');
  const labels = q.chips.map((c) => c.label);
  for (const g of ENDURANCE_GOALS) assert.ok(labels.includes(GOAL_LABEL[g]), `${g} is unreachable`);
});

test('picking a distance sets a real goal and moves on', () => {
  const chip = nextQuestion({ pickingRace: true }).chips[0];
  assert.ok(ENDURANCE_GOALS.includes(chip.patch.goal), 'the distance chips answer the goal');
  assert.notEqual(nextQuestion({ goal: chip.patch.goal }).id, 'race_distance', 'it must not ask again');
});

// ─────────────────────────────────────────────────────────────────────────────
// HELP THAT GOES SOMEWHERE
// ─────────────────────────────────────────────────────────────────────────────

const here = path.dirname(fileURLToPath(import.meta.url));
const APP = path.join(here, '../../../app');

/** `/program-builder?o=import` → `src/app/program-builder.tsx`. */
const fileFor = (route) => {
  const clean = route.split('?')[0].replace(/^\//, '');
  // A group with no screen named after it resolves to its index: `/(tabs)` is `(tabs)/index.tsx`.
  const direct = path.join(APP, `${clean}.tsx`);
  return existsSync(direct) ? direct : path.join(APP, clean, 'index.tsx');
};

test('⚠ every help topic points at a screen that exists', () => {
  // A help answer that lands nowhere is worse than no help answer: it is the app confidently giving
  // directions to a room it does not have.
  for (const t of HELP_TOPICS) {
    assert.ok(existsSync(fileFor(t.route)), `"${t.q}" points at ${t.route}, which is not a screen`);
  }
});

test('every help topic is a real question with a real answer', () => {
  const seen = new Set();
  for (const t of HELP_TOPICS) {
    assert.ok(!seen.has(t.q), `duplicate topic "${t.q}"`);
    seen.add(t.q);
    assert.ok(t.a.length > 40, `"${t.q}" is answered too thinly to be worth tapping`);
    assert.ok(t.cta.length > 0, `"${t.q}" has no way through`);
    assert.doesNotMatch(t.a, /!/, `"${t.q}" — help is still Holt talking`);
  }
  assert.ok(HELP_TOPICS.length >= 8, 'too few topics to feel like an answer to "how do I…"');
});
