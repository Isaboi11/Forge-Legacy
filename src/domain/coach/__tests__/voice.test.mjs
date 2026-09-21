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

import {
  VOICE, NAMED_KEYS, pick, pickFrom, pickOnce, pickNamed, resetVoice, oneExclamation, voiceMemory, restoreVoiceMemory,
} from '../rulebook/voice.ts';
import { HELP_TOPICS, OPENERS, fromOpener, nextQuestion, greetReturning, TYPING_ENABLED } from '../chat-core.ts';
import { ENDURANCE_GOALS, GOAL_LABEL } from '../constraints.ts';

const KEYS = Object.keys(VOICE);

/**
 * The cheese list — Holt-Voice-Amendment-001 HV-D2. Encouraging is specific and earned; these are the
 * generic hype, hustle slogans and pet names that make a coach sound like an app pretending to be one.
 * The in-workout and review tests carry the same list.
 */
const CHEESE = /\b(crush(ing|ed)? it|beast( mode)?|let'?s go{3,}|no days off|champ|buddy|king|queen|killing it|slay(ing)?|rock ?star|superstar|legend|great question|you got this bro|grind never stops)\b/i;
const EMOJI = /\p{Extended_Pictographic}/u;

// ─────────────────────────────────────────────────────────────────────────────
// HE VARIES — "should feel new for a very long time" (PO, 2026-09-21)
// ─────────────────────────────────────────────────────────────────────────────

test('every line has several ways of arriving', () => {
  for (const key of KEYS) {
    assert.ok(VOICE[key].length >= 4, `${key} has only ${VOICE[key].length} — that will go stale`);
  }
});

test('⚠ the lines met on every visit carry real volume', () => {
  /* A greeting and the beat between answers are heard every single time he is opened. At ten variants a
     weekly user has heard them all inside a month; these floors are what "new for a very long time"
     means in numbers. */
  const FLOORS = { ack: 20, greet_return: 15, greet_return_anon: 10, greet_return_second: 15 };
  for (const [key, min] of Object.entries(FLOORS)) {
    assert.ok(VOICE[key].length >= min, `${key} has ${VOICE[key].length}, needs ${min}`);
  }
  for (const key of KEYS.filter((k) => k.startsWith('ask_') && !k.startsWith('ask_edit') && k !== 'ask_level_again')) {
    assert.ok(VOICE[key].length >= 8, `${key} has ${VOICE[key].length} — a question asked on every build needs 8`);
  }
});

test('no variant is empty, duplicated, shouted, or cheesy', () => {
  for (const key of KEYS) {
    const seen = new Set();
    for (const line of VOICE[key]) {
      assert.ok(line.trim().length > 0, `${key} has a blank variant`);
      assert.ok(!seen.has(line), `${key} repeats "${line}"`);
      seen.add(line);
      /* HV-D3: an exclamation is for a real win. Nothing in the conversation table is one — greetings,
         questions and handovers are not the athlete's wins. */
      assert.doesNotMatch(line, /!/, `${key}: "${line}" — nothing here is a win, so nothing exclaims`);
      assert.doesNotMatch(line, /^(Great|Awesome|Perfect|Nice|Amazing|Love it)\b/i, `${key}: "${line}" reads as praise for a tap`);
      assert.doesNotMatch(line, CHEESE, `${key}: "${line}" is cheesy (HV-D2)`);
      assert.doesNotMatch(line, EMOJI, `${key}: "${line}" — no emoji`);
    }
  }
});

test('⚠ the beat between answers is never praise — it follows "I have a bad knee" too', () => {
  for (const line of VOICE.ack) {
    assert.doesNotMatch(line, /\b(love|great|awesome|perfect|amazing|nice|excellent|brilliant)\b/i, `ack: "${line}"`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// THE DECK — every variant before any repeat
// ─────────────────────────────────────────────────────────────────────────────

test('⭐ a key deals every variant once before any of them comes round again', () => {
  resetVoice();
  for (const key of KEYS) {
    const n = VOICE[key].length;
    for (let cycle = 0; cycle < 3; cycle++) {
      const dealt = new Set();
      for (let i = 0; i < n; i++) dealt.add(pick(key));
      assert.equal(dealt.size, n, `${key} repeated a line inside one pass of its ${n} variants`);
    }
  }
});

test('⚠ a reshuffle never opens with the line that closed the last pass', () => {
  resetVoice();
  const opts = ['a', 'b', 'c'];
  let previous = null;
  for (let i = 0; i < 300; i++) {
    const line = pickFrom('t:reshuffle', opts);
    assert.notEqual(line, previous, `"${line}" twice running at pick ${i}`);
    previous = line;
  }
});

test('the deck survives a relaunch — he does not go back to the top of every list', () => {
  resetVoice();
  const opts = ['one', 'two', 'three', 'four', 'five'];
  const before = [pickFrom('t:persist', opts), pickFrom('t:persist', opts)];
  const saved = JSON.parse(JSON.stringify(voiceMemory()));

  resetVoice(); // the app closes
  restoreVoiceMemory(saved); // and opens again
  const after = [pickFrom('t:persist', opts), pickFrom('t:persist', opts), pickFrom('t:persist', opts)];
  assert.deepEqual(new Set([...before, ...after]).size, 5, 'the rest of the pass was dealt, not a fresh one');
});

test('a deck dealt from this launch is not overwritten by the stored copy arriving late', () => {
  resetVoice();
  const opts = ['x', 'y'];
  const saved = JSON.parse(JSON.stringify(voiceMemory()));
  const said = pickFrom('t:late', opts);
  restoreVoiceMemory({ v: 1, decks: { 't:late': { l: [], p: null }, ...saved.decks } });
  assert.notEqual(pickFrom('t:late', opts), said, 'the late restore let him repeat himself');
});

test('stored memory that is malformed or foreign is ignored, not half-applied', () => {
  resetVoice();
  for (const bad of [null, 'x', 42, { v: 2 }, { v: 1, decks: 'no' }, { v: 1, decks: { k: { l: 'no' } } }]) {
    assert.doesNotThrow(() => restoreVoiceMemory(bad));
  }
  assert.ok(pick('ack').length > 0);
});

test('⚠ pickOnce holds its line for the moment it describes — a re-render cannot rewrite the coach', () => {
  resetVoice();
  const opts = ['a', 'b', 'c', 'd'];
  const first = pickOnce('bench:2026-09-01', 't:once', opts);
  for (let i = 0; i < 20; i++) assert.equal(pickOnce('bench:2026-09-01', 't:once', opts), first);
  assert.notEqual(pickOnce('bench:2026-09-08', 't:once', opts), first, 'the next session deals a fresh line');
});

test('one exclamation per message — the first stays, the rest become full stops', () => {
  assert.equal(oneExclamation('PR on Bench! 4 sessions! Keep it up!'), 'PR on Bench! 4 sessions. Keep it up.');
  assert.equal(oneExclamation('Nothing to shout about.'), 'Nothing to shout about.');
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
    if (NAMED_KEYS.includes(key)) continue;
    for (const line of VOICE[key]) assert.doesNotMatch(line, /\{name\}/, `${key} should not be personalised`);
  }
  assert.ok(VOICE.greet_return.every((l) => l.includes('{name}')), 'every greeting uses the name');
});

test('⚠ a missing name reads as deliberate, never as broken', () => {
  // Plenty of profiles have no first name. "Hey {name}." leaking to a screen is the worst version of
  // this, and "Hey ." is only marginally better. ⚠ "Good to see you,." shipped for weeks because this
  // test looked for a SPACE before punctuation and not for a comma stranded in front of it.
  for (const key of NAMED_KEYS) {
    for (let i = 0; i < VOICE[key].length * 2; i++) {
      for (const name of [null, undefined, '', '   ']) {
        const line = pickNamed(key, name);
        assert.doesNotMatch(line, /\{name\}/, 'token leaked');
        assert.doesNotMatch(line, /\s[,.?]/, `stranded punctuation: "${line}"`);
        assert.doesNotMatch(line, /,[.?!]/, `a comma left in front of the full stop: "${line}"`);
        assert.doesNotMatch(line, /^[,.]/, `leading punctuation: "${line}"`);
        assert.ok(line.trim().length > 0, 'a nameless greeting must still be a greeting');
      }
    }
  }
});

test('the greeting knows the time of day, and never says "Morning" at night', () => {
  const at = (h, day = 3) => new Date(2026, 8, 16 + (day - 3), h, 0, 0); // 16 Sep 2026 is a Wednesday
  const timeOnly = () => 0.9; // skip the general pool and the day-of-week line
  for (let i = 0; i < 30; i++) {
    resetVoice();
    const morning = greetReturning('Sam', at(7), timeOnly)[0].text;
    assert.ok(VOICE.greet_morning.map((l) => l.replace('{name}', 'Sam')).includes(morning), morning);
    const night = greetReturning('Sam', at(21), timeOnly)[0].text;
    assert.doesNotMatch(night, /morning/i, night);
  }
});

test('a line about the day turns up on that day and no other', () => {
  const wed = new Date(2026, 8, 16, 12);
  const mon = new Date(2026, 8, 14, 12);
  const always = () => 0; // take the day line whenever one is allowed
  resetVoice();
  assert.ok(VOICE.greet_second_monday.includes(greetReturning('Sam', mon, always)[1].text));
  for (let i = 0; i < 20; i++) {
    const second = greetReturning('Sam', wed, always)[1].text;
    assert.ok(VOICE.greet_return_second.includes(second), `a Wednesday got "${second}"`);
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
