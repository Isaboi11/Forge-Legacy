/**
 * chat-core.test.mjs — the coach as a conversation.
 *
 * ══ WHAT THIS GUARDS ══
 *
 * The chat is the wizard re-clothed. Its whole claim to being shippable before any model exists is that
 * it asks the SAME questions and calls the SAME engine — so the failure worth catching is **drift**: the
 * chat offering a goal the engine cannot build, asking for equipment on a marathon plan, or deciding it
 * has enough to build when it does not.
 *
 * The second thing it guards is the seam. `interpret` is the one function the paid tier replaces, and its
 * contract — text in, `Partial<CoachConstraints>` out, `null` when unsure — is what stops a model ever
 * gaining the power to author training. If it starts returning something richer, the architecture has
 * quietly changed.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/chat-core.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FREE_EXCHANGES,
  WALL,
  NOT_UNDERSTOOD,
  OPENERS,
  dayCardFor,
  fromOpener,
  interpret,
  isMedical,
  nextQuestion,
  programCardFor,
  readyToBuild,
  refusalCardFor,
} from '../chat-core.ts';
import { AUTHORED_GOALS, isAuthored } from '../rulebook/skeletons.ts';
import { isEnduranceGoal } from '../constraints.ts';

/** Walk the conversation by always taking the first chip, as a fast tapper would. */
function walk(seed = {}, maxTurns = 20) {
  let c = { ...seed };
  const asked = [];
  for (let i = 0; i < maxTurns; i += 1) {
    const q = nextQuestion(c);
    if (!q) return { c, asked, finished: true };
    asked.push(q.id);
    assert.ok(q.chips.length > 0, `${q.id} offered no way to answer it`);
    c = { ...c, ...q.chips[0].patch };
  }
  return { c, asked, finished: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// IT TERMINATES, AND IT ASKS THE RIGHT THINGS
// ─────────────────────────────────────────────────────────────────────────────

test('every goal reaches a buildable set of answers', () => {
  for (const goal of AUTHORED_GOALS) {
    const { asked, finished, c } = walk({ goal });
    assert.ok(finished, `${goal} never stopped asking — asked: ${asked.join(', ')}`);
    assert.ok(readyToBuild(c), `${goal} finished without being ready`);
  }
});

test('a race is asked about the race; a lifting block is asked about the room', () => {
  for (const goal of AUTHORED_GOALS) {
    const { asked } = walk({ goal });
    if (isEnduranceGoal(goal)) {
      assert.ok(asked.includes('race_when'), `${goal} never asked when the race is`);
      assert.ok(asked.includes('race_base'), `${goal} never asked what they run now`);
      // ⚠ Asking a marathon runner what equipment they own is the coach not listening. A long run is
      // also as long as it is, so a session budget would be a question whose answer changes nothing.
      assert.ok(!asked.includes('where'), `${goal} asked about equipment`);
      assert.ok(!asked.includes('time'), `${goal} asked for a session length`);
    } else {
      assert.ok(asked.includes('where'), `${goal} never asked where they train`);
      assert.ok(asked.includes('time'), `${goal} never asked how long they have`);
      assert.ok(!asked.includes('race_when'), `${goal} asked about a race`);
    }
  }
});

test('one question at a time, and never the same one twice', () => {
  for (const goal of AUTHORED_GOALS) {
    const { asked } = walk({ goal });
    assert.equal(new Set(asked).size, asked.length, `${goal} repeated a question: ${asked.join(', ')}`);
  }
});

test('the goal question only offers goals the engine can build', () => {
  /*
   * ⚠ THE GOAL QUESTION NOW HAS TWO KINDS OF CHIP, and the distinction is the point: one ANSWERS the
   * question, the other NARROWS it. "Run a race" deliberately sets no goal — there is no such goal, and
   * defaulting it to a distance would have the engine build for a race nobody entered.
   */
  const q = nextQuestion({});
  assert.equal(q.id, 'goal');
  assert.ok(q.chips.length > 0);
  for (const chip of q.chips) {
    if (chip.picksRace) {
      assert.deepEqual(chip.patch, {}, 'the narrowing chip must not answer anything');
      continue;
    }
    assert.ok(chip.patch.goal, 'a goal chip must set a goal');
    assert.ok(isAuthored(chip.patch.goal), `${chip.patch.goal} is offered but cannot be built`);
  }

  // And behind it, every distance is one the engine can actually build.
  for (const chip of nextQuestion({ pickingRace: true }).chips) {
    assert.ok(isAuthored(chip.patch.goal), `${chip.patch.goal} is offered but cannot be built`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// THE SEAM — the one function the paid tier replaces
// ─────────────────────────────────────────────────────────────────────────────

test('a typed answer resolves to the same patch as tapping the chip', () => {
  const q = nextQuestion({ goal: 'strength' });
  assert.equal(q.id, 'days');
  // Typing what you can see is the common case, and it must land identically.
  assert.deepEqual(interpret('4 days', q), q.chips.find((c) => c.label === '4 days').patch);
  assert.deepEqual(interpret('4', q), { daysPerWeek: 4 });
});

test('a number means what the question on the table says it means', () => {
  // ⚠ SCOPED ON PURPOSE. "4" is four days on one turn and would be four miles on the next; a parser that
  // answered globally would put the right number in the wrong field and never say a word about it.
  const days = nextQuestion({ goal: 'strength' });
  assert.deepEqual(interpret('4', days), { daysPerWeek: 4 });

  const base = nextQuestion({ goal: 'run_half', raceDate: '2026-12-01' });
  assert.equal(base.id, 'race_base');
  assert.deepEqual(interpret('12', base), { currentWeeklyMi: 12 });
});

test('anything it cannot place returns null rather than a guess', () => {
  const q = nextQuestion({ goal: 'strength' });
  for (const text of ['', '   ', 'whatever you think', 'purple', '🙂']) {
    assert.equal(interpret(text, q), null, `"${text}" should not have resolved`);
  }
  assert.ok(NOT_UNDERSTOOD.length > 0, 'and there must be something to say when it does not');
});

test('an out-of-range number is not forced into range', () => {
  const q = nextQuestion({ goal: 'strength' });
  // 9 days a week is not an answer. Clamping it silently would be the app deciding it knew better.
  assert.equal(interpret('9', q), null);
  assert.equal(interpret('0', q), null);
});

test('interpret only ever returns constraint fields', () => {
  /*
   * The architectural guarantee in one assertion: this function's whole output is a patch to
   * `CoachConstraints`. When a model takes over its body, that is still all it can produce — so the AI
   * cannot emit an invalid program, because it is not the thing writing one.
   */
  const allowed = new Set([
    'goal', 'experience', 'daysPerWeek', 'sessionMinutes', 'environment', 'ownedEquipment',
    'limitations', 'excludeExercises', 'raceDate', 'currentWeeklyMi', 'weeks', 'splitStyle',
    'recentRaceMi', 'recentRaceSec', 'canRunContinuously',
  ]);
  const seen = new Set();
  for (const goal of AUTHORED_GOALS) {
    let c = { goal };
    for (let i = 0; i < 12; i += 1) {
      const q = nextQuestion(c);
      if (!q) break;
      for (const chip of q.chips) {
        const patch = interpret(chip.label, q) ?? chip.patch;
        Object.keys(patch).forEach((k) => seen.add(k));
      }
      c = { ...c, ...q.chips[0].patch };
    }
  }
  const stray = [...seen].filter((k) => !allowed.has(k));
  assert.deepEqual(stray, [], 'the chat produced something that is not a constraint');
});

// ─────────────────────────────────────────────────────────────────────────────
// THE OPENING
// ─────────────────────────────────────────────────────────────────────────────

test('every opener is a real thing Holt can do', () => {
  assert.ok(OPENERS.length >= 3, 'a blank field is the hardest thing in software to answer');
  for (const label of OPENERS) {
    const r = fromOpener(label);
    assert.ok(r, `"${label}" is offered but leads nowhere`);
    assert.ok(['build', 'import', 'help'].includes(r.kind), `"${label}" has no action`);
    if (r.kind === 'build') assert.ok(r.mode === 'program' || r.mode === 'day');
  }
});

test('an opener that pre-answers something does not ask it again', () => {
  /*
   * ⚠ THE OPENER THIS ORIGINALLY TESTED IS GONE. "45 minutes and dumbbells" stated a room and a time,
   * and the assertion was that Holt would not then ask for either. The PO could not tell what the chip
   * MEANT — it was an example of what typing could do, wearing the clothes of an option — so it was
   * retired.
   *
   * The property it protected is still real and still worth holding: any patch an opener carries must
   * remove the question it answers. So it is asserted directly against the mechanism rather than
   * against a label that no longer exists.
   */
  assert.equal(fromOpener('45 minutes and dumbbells'), null, 'the retired opener must not still resolve');

  const { asked } = walk({ goal: 'strength', sessionMinutes: 45, environment: 'home', ownedEquipment: ['dumbbells'] });
  assert.ok(!asked.includes('time'), 'it asked for a session length that was already given');
  assert.ok(!asked.includes('where'), 'it asked where they train after being told');
});

// ─────────────────────────────────────────────────────────────────────────────
// THE CARDS — every figure is read from the engine, never composed
// ─────────────────────────────────────────────────────────────────────────────

const raceConstraints = {
  goal: 'run_half',
  experience: { lifting: 'intermediate', running: 'intermediate' },
  daysPerWeek: 4,
  sessionMinutes: 60,
  environment: 'outdoor',
  ownedEquipment: [],
  limitations: [],
  excludeExercises: [],
  raceDate: '2026-11-15',
  currentWeeklyMi: 15,
};

test('the program card reports the volume it was given, not a number of its own', () => {
  const volume = [
    { mileage: 15, longRunMi: 6 },
    { mileage: 16.5, longRunMi: 6.6 },
    { mileage: 22, longRunMi: 9 },
    { mileage: 12, longRunMi: 5 },
  ];
  const card = programCardFor(raceConstraints, { name: '14-Week Half Marathon Plan', weeks: 14, daysPerWeek: 4 }, volume, 'because');

  assert.equal(card.title, '14-Week Half Marathon Plan');
  assert.deepEqual(card.ribbon, [15, 16.5, 22, 12], 'the ribbon IS the volume curve');

  const peak = card.stats.find((s) => s.label === 'PEAK WEEK');
  assert.equal(peak.value, '22 mi', 'peak week must be the real peak');
  const longest = card.stats.find((s) => s.label === 'LONGEST RUN');
  assert.equal(longest.value, '9 mi');
  assert.match(card.ribbonCaption, /week 3/, 'the caption must name the week the peak actually lands on');
});

test('a stat the engine cannot answer is left out rather than invented', () => {
  // ⚠ THE POINT OF THE GRID BEING A LIST. A strength block has no race day, no peak mileage and no
  // longest run; filling those with a plausible figure would be the card making training up.
  const strength = { ...raceConstraints, goal: 'strength', raceDate: null, currentWeeklyMi: null };
  const card = programCardFor(strength, { name: '8-Week Strength Block', weeks: 8, daysPerWeek: 4 }, [], 'because');
  const labels = card.stats.map((s) => s.label);
  assert.ok(!labels.includes('RACE DAY'));
  assert.ok(!labels.includes('PEAK WEEK'));
  assert.ok(!labels.includes('LONGEST RUN'));
  assert.deepEqual(card.ribbon, [], 'a flat block gets no ribbon rather than a flat one');

  // §11.1.7 gives the non-race build its OWN six cells — the things that actually shaped the block.
  for (const want of ['WEEKS', 'DAYS / WEEK', 'GOAL', 'EQUIPMENT', 'SESSION', 'LEVEL']) {
    assert.ok(labels.includes(want), want + ' is missing from a non-race card');
  }
  // And no cell is ever blank — a hole in the grid reads as a number that failed to load.
  for (const st of card.stats) {
    assert.ok(st.value && String(st.value).trim().length > 0, st.label + ' rendered empty');
  }
});

test('the day card prescribes what the row actually says', () => {
  const card = dayCardFor(
    { sessionMinutes: 45, ownedEquipment: ['dumbbells'] },
    {
      name: 'Upper — push',
      main: [
        { name: 'Incline Dumbbell Press', sets: 4, reps: 8 },
        { name: 'Half-Kneeling Single-Arm Press', sets: 3, reps: 10, per: 'side' },
        { name: 'Easy Run', targetMi: 3 },
        { name: 'Tempo', targetSec: 1200 },
      ],
    },
  );
  assert.equal(card.rows[0].prescription, '4 × 8');
  assert.equal(card.rows[1].prescription, '3 × 10 per side', 'per-side must survive onto the card');
  assert.equal(card.rows[2].prescription, '3 mi');
  assert.equal(card.rows[3].prescription, '20 min');
  assert.match(card.kicker, /45 MIN/);
});

test('a refusal card always names the race it is offering instead', () => {
  const card = refusalCardFor('run_marathon', 7, 4, "A marathon build is about sixteen weeks and you've got seven.");
  assert.ok(card);
  assert.match(card.title, /Half marathon/i);
  assert.match(card.primary, /Build the half marathon/i);
  assert.match(card.meta, /7 weeks/);
  assert.ok(card.body.length > 30, 'the reasoning travels with it');
});

test('a goal with nowhere to fall back to offers no card, and Holt just says it', () => {
  // A 5k is the shortest thing there is — there is no smaller race to counter-offer, so the honest
  // answer is words alone rather than a card pointing at nothing.
  assert.equal(refusalCardFor('run_5k', 2, 3, 'msg'), null);
  assert.equal(refusalCardFor('strength', 2, 3, 'msg'), null);
});

// ─────────────────────────────────────────────────────────────────────────────
// THE STOP — the one failure with a cost outside the app
// ─────────────────────────────────────────────────────────────────────────────

test('anything medical stops', () => {
  for (const text of [
    "My knee's been hurting for three weeks",
    'I have pain in my shoulder',
    'I think I tore something',
    'my back is really sore for days',
    'is this a strain?',
    'my foot goes numb when I run',
  ]) {
    assert.ok(isMedical(text), `"${text}" must stop`);
  }
});

test('ordinary training talk does not trip the stop', () => {
  // A false positive costs one unnecessary "see someone"; a false negative is the app improvising about
  // an injury. But tripping on every sentence would make the coach useless, so this bounds it.
  for (const text of ['Build me a program', '4 days', 'I want to squat more', '45 minutes and dumbbells', 'Half marathon in October']) {
    assert.ok(!isMedical(text), `"${text}" must not stop`);
  }
});

test('the chat is unlimited, and stays that way while it costs nothing to serve', () => {
  /*
   * PO decision 2026-08-09. The design proposed a wall at ten exchanges and flagged the number as an
   * assumption; the answer was no wall, because v1 makes no model call and therefore has no marginal
   * cost to recover.
   *
   * This asserts the DECISION, not an implementation detail — if someone sets a ceiling later, they
   * should have to come here and say why the cost model changed.
   */
  assert.equal(FREE_EXCHANGES, null, 'a ceiling reappeared without the cost model changing');
});

test('the wall copy survives even though nothing renders it', () => {
  // Kept on purpose for the day the paid tier is real — and the line that matters is that the free
  // wizard is named as a real option rather than quietly hidden behind the ask.
  assert.match(WALL.body, /wizard is free and stays free/i);
  assert.match(WALL.secondary, /wizard/i);
});
