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
  HOME_CARDS,
  HOME_ROWS,
  dayCardFor,
  fromOpener,
  greetReturning,
  interpret,
  isHomeTurn,
  isMedical,
  LEVEL_CHIPS,
  nextQuestion,
  programCardFor,
  readyToBuild,
  refusalCardFor,
  runningExperienceFor,
  startingLoadLine,
  sizeQuestion,
} from '../chat-core.ts';
import { AUTHORED_GOALS, isAuthored } from '../rulebook/skeletons.ts';
import { isEnduranceGoal } from '../constraints.ts';
import { VOICE } from '../rulebook/voice.ts';

/**
 * An athlete who has already given a level, so a test about a LATER question is not answered by the
 * level question instead. Intermediate on purpose: `beginner` skips the length question (see
 * `isNewToTraining`), which several of these are specifically about.
 */
const LIFTER = { lifting: 'intermediate', running: 'intermediate' };

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
  // `weeks` is seeded because the length question now sits between the goal and the days.
  const q = nextQuestion({ goal: 'strength', weeks: 8, experience: LIFTER });
  assert.equal(q.id, 'days');
  // Typing what you can see is the common case, and it must land identically.
  assert.deepEqual(interpret('4 days', q), q.chips.find((c) => c.label === '4 days').patch);
  assert.deepEqual(interpret('4', q), { daysPerWeek: 4 });
});

test('a number means what the question on the table says it means', () => {
  // ⚠ SCOPED ON PURPOSE. "4" is four days on one turn and would be four miles on the next; a parser that
  // answered globally would put the right number in the wrong field and never say a word about it.
  const days = nextQuestion({ goal: 'strength', weeks: 8, experience: LIFTER });
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
  const q = nextQuestion({ goal: 'strength', weeks: 8, experience: LIFTER });
  assert.equal(q.id, 'days');
  // 9 days a week is not an answer. Clamping it silently would be the app deciding it knew better.
  assert.equal(interpret('9', q), null);
  assert.equal(interpret('0', q), null);
});

test('⚠ a bare "1" on the length question is one week, not twelve', () => {
  /*
   * The chip loop matches by containment, which is right for words and catastrophic for a bare number
   * here: "1" is not in "One week" but IS in "12 weeks", so it fell through to a twelve-week block from
   * an athlete who asked for one. Snapped to the nearest rung, ahead of the loop.
   */
  const q = nextQuestion({ goal: 'strength', experience: LIFTER });
  assert.equal(q.id, 'size');
  assert.deepEqual(interpret('1', q), { weeks: 1 });
  assert.deepEqual(interpret('12', q), { weeks: 12 });
  assert.deepEqual(interpret('one week', q), { weeks: 1 }, 'and the words still work');
  assert.deepEqual(interpret('6 weeks', q), { weeks: 4 }, 'an unoffered length snaps to the nearest rung');
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
    assert.ok(['build', 'import', 'edit', 'help'].includes(r.kind), `"${label}" has no action`);
    if (r.kind === 'build') assert.ok(r.mode === 'program' || r.mode === 'day');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// HOW MUCH ARE WE BUILDING? — a block, or one week
// ─────────────────────────────────────────────────────────────────────────────

test('the length question is a scale, and every rung sets a real number of weeks', () => {
  const q = sizeQuestion();
  assert.equal(q.id, 'size');
  assert.equal(q.ctl, 'segmented', 'one week to twelve is an ordered scale, not a set of unlike things');
  assert.deepEqual(q.chips.map((c) => c.patch), [{ weeks: 1 }, { weeks: 4 }, { weeks: 8 }, { weeks: 12 }]);
  assert.deepEqual(q.chips.map((c) => c.label), ['One week', '4 weeks', '8 weeks', '12 weeks']);
});

test('⚠ it is asked AFTER the goal, so a race can skip it', () => {
  /*
   * ⚠ **THIS MOVED, AND THE MOVE IS THE FIX** (PO, 2026-08-14: *"we should be able to choose how long
   * the program should be"*).
   *
   * It used to be the BUILD door's first question, offering "A program" or "One week". Real lengths
   * made that untenable: `assembleEnduranceGoal` counts a race block back from `raceDate` against
   * floors of six to twelve weeks, so an athlete picking "12 weeks" and then "Run a marathon" would
   * have been silently overruled by the calendar. The first cut papered over it by removing the race
   * door once "One week" was picked — which covered one of four answers.
   *
   * Asked after the goal, it is simply not asked of a race at all.
   */
  assert.equal(nextQuestion({}).id, 'goal', 'the goal still comes first');
  assert.equal(nextQuestion({ goal: 'strength' }).id, 'experience', 'then the level, which decides the next one');
  assert.equal(nextQuestion({ goal: 'strength', experience: LIFTER }).id, 'size', 'then the length');

  const race = nextQuestion({ goal: 'run_half' });
  assert.notEqual(race.id, 'size', 'a race must never be asked a length it does not decide');
  const { asked } = walk({ goal: 'run_marathon' });
  assert.ok(!asked.includes('size'), `a marathon was asked its length: ${asked.join(', ')}`);
});

test('the race door is open again, because nothing can overrule it now', () => {
  // The counterpart of the move: with the length asked afterwards, "Run a race" no longer has to be
  // hidden from anybody.
  assert.ok(nextQuestion({}).chips.some((c) => c.picksRace));
});

test('⚠ answered once, and never asked twice', () => {
  // `undefined` means nobody asked. Any number means they did — including 1.
  assert.equal(nextQuestion({ goal: 'strength', experience: LIFTER }).id, 'size');
  assert.notEqual(nextQuestion({ goal: 'strength', experience: LIFTER, weeks: 1 }).id, 'size');
  assert.notEqual(nextQuestion({ goal: 'strength', experience: LIFTER, weeks: 8 }).id, 'size');
});

test('⚠ a week is not asked how many days A WEEK — the PO caught this one', () => {
  // "How many days a week can you train" asks what you can SUSTAIN. There is nothing to sustain in a
  // week that ends on Sunday; the honest question is how many days this week has in it.
  const week = nextQuestion({ weeks: 1, goal: 'strength', experience: LIFTER });
  assert.equal(week.id, 'days', 'a one-week build must still be asked how many days');
  assert.ok(VOICE.ask_days_week.includes(week.ask), `a one-week build asked "${week.ask}"`);
  assert.deepEqual(week.chips.map((c) => c.patch.daysPerWeek), [2, 3, 4, 5, 6]);

  const block = nextQuestion({ weeks: null, goal: 'strength', experience: LIFTER });
  assert.ok(VOICE.ask_days.includes(block.ask), 'a block must keep the habit question');
});

// ─────────────────────────────────────────────────────────────────────────────
// COACH HOME — the same five doors, drawn as three cards and two rows
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ every Home tile fires an opener that resolves', () => {
  /*
   * Home does not know how to start anything. Each card and each row carries an `OPENERS` label and goes
   * through `fromOpener` like every other door, so the surface cannot grow a second entrance to the
   * questionnaire that drifts from the first. A tile whose label stops resolving is a card that does
   * nothing when tapped, and this is where that gets caught rather than on a phone.
   */
  for (const tile of [...HOME_CARDS, ...HOME_ROWS]) {
    assert.ok(OPENERS.includes(tile.opener), `Home offers "${tile.opener}", which is not an opener`);
    assert.ok(fromOpener(tile.opener), `"${tile.opener}" leads nowhere`);
  }
});

test('Home covers all five openers, once each', () => {
  // Five doors in, five doors drawn. A missing one is a capability with no way to reach it from Home.
  const fired = [...HOME_CARDS, ...HOME_ROWS].map((t) => t.opener);
  assert.deepEqual([...fired].sort(), [...OPENERS].sort());
  assert.equal(new Set(fired).size, fired.length, 'two tiles fire the same opener');
});

test('⚠ Home replaces the opener turn, and only the opener turn', () => {
  // `isHomeTurn` decides where Home is drawn. If it matched a question's chips, the answers to that
  // question would be replaced by three capability cards mid-conversation.
  const openerTurn = { kind: 'chips', chips: OPENERS.map((label) => ({ label, patch: {} })) };
  assert.equal(isHomeTurn(openerTurn), true);
  assert.equal(isHomeTurn(greetReturning('Isaiah').at(-1)), true, 'coming back must land on Home');
  assert.equal(isHomeTurn(nextQuestion({}, 'program') && { kind: 'chips', chips: nextQuestion({}, 'program').chips }), false);
  assert.equal(isHomeTurn({ kind: 'holt', text: 'anything' }), false);
  assert.equal(isHomeTurn({ kind: 'chips', chips: [{ label: OPENERS[0], patch: {} }] }), false, 'a subset is not Home');
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

test('⚠ v2 §7 — the title block and the closing row describe the block that was BUILT', () => {
  /*
   * The subtitle and the closing row are read off `structure`, not off what the athlete asked for. The
   * engine clamps and restructures — ask for 20 weeks of a goal that tops out at 12 and you get 12 — so
   * a subtitle quoting the request would caption a block that does not exist.
   */
  const strength = { ...raceConstraints, goal: 'strength', raceDate: null, currentWeeklyMi: null, sessionMinutes: 45 };
  const card = programCardFor(strength, { name: 'Foundation 4', weeks: 8, daysPerWeek: 4 }, [], 'because');
  assert.equal(card.subtitle, '4 days · 8 weeks · Get stronger');
  assert.equal(card.closing, '45 min sessions');

  /* ⚠ The structure's figures, not the constraints'. `strength.daysPerWeek` is 4 and this structure
     says 3 — read the wrong one and the subtitle describes a week the athlete is not going to train.
     A one-week block is also the plural trap PA2-D1 opened, and it reaches the subtitle too. */
  const week = programCardFor(strength, { name: 'One Week', weeks: 1, daysPerWeek: 3 }, [], 'because');
  assert.equal(week.subtitle, '3 days · 1 week · Get stronger', '"1 weeks" in the coach\'s own voice reads as a bug in him');

  // A race has no session budget — a long run is as long as it is — so it states the week's shape.
  const race = programCardFor(raceConstraints, { name: 'Half', weeks: 14, daysPerWeek: 4 }, [{ mileage: 15, longRunMi: 6 }], 'because');
  assert.equal(race.closing, '4 runs a week');
  assert.doesNotMatch(race.closing, /min/, 'a race plan must not quote a session length nobody chose');
});

test('⚠ the refusal card names the goal its button builds, not just the words for it', () => {
  /*
   * Both buttons on this card shipped with no `onPress`, and this field is why the primary was
   * impossible: "Build the half marathon" is a sentence, and the sheet had no way to turn it back into
   * a goal key. The one card whose entire purpose is that the alternative is a THING WITH A BUTTON.
   */
  const card = refusalCardFor('run_marathon', 8, 4, 'msg');
  assert.ok(card.altGoal, 'the counter-offer must carry the goal it counter-offers');
  assert.ok(AUTHORED_GOALS.includes(card.altGoal), 'it must be a goal the engine can actually build');
  assert.match(card.primary.toLowerCase(), new RegExp(card.altGoal.replace(/^run_/, '').replace(/_/g, ' ')), 'the label and the key must name the same race');
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

/**
 * ── RUNNING EXPERIENCE IS NOT LIFTING EXPERIENCE ─────────────────────────────────────────────────────
 *
 * One chip used to write `{ lifting: e, running: e }`, so a fifteen-year lifter who had never run tapped
 * "Advanced" and was coached as an advanced RUNNER. The day-floor rail catches the dangerous half of that
 * (EPS-D7 forces a beginner's days on somebody who cannot run continuously), but the hard/easy mix is
 * composed from `experience.running` — so they would have got a beginner's mileage arranged in an
 * advanced athlete's intensity distribution.
 *
 * The race questionnaire already asks for weekly mileage one question earlier, and mileage is the better
 * answer. These guard that it is used, and that it is only ever used to come DOWN.
 */
test('runningExperienceFor — mileage overrides an overstated claim', () => {
  // The reported case: a seasoned lifter who does not run.
  assert.equal(runningExperienceFor('advanced', 0), 'beginner');
  assert.equal(runningExperienceFor('advanced', 3), 'beginner');
  assert.equal(runningExperienceFor('intermediate', 0), 'beginner');
  // The race_base bands, at their own boundaries.
  assert.equal(runningExperienceFor('advanced', 8), 'intermediate');
  assert.equal(runningExperienceFor('advanced', 15), 'intermediate');
  assert.equal(runningExperienceFor('advanced', 25), 'advanced');
  assert.equal(runningExperienceFor('advanced', 35), 'advanced');
});

test('runningExperienceFor — it never rounds an athlete UP past their own word', () => {
  /*
   * The two mistakes are not symmetric. Coaching a real runner as a beginner costs them some progress;
   * coaching a beginner as an advanced runner because a number said so is how people get hurt. So a high
   * mileage answer never promotes somebody who called themselves a beginner.
   */
  assert.equal(runningExperienceFor('beginner', 35), 'beginner');
  assert.equal(runningExperienceFor('beginner', 8), 'beginner');
  assert.equal(runningExperienceFor('intermediate', 35), 'intermediate');
});

test('runningExperienceFor — no mileage answer leaves the athlete’s own word alone', () => {
  // Every non-race build: `currentWeeklyMi` is never collected, so nothing may change.
  for (const e of ['beginner', 'intermediate', 'advanced']) {
    assert.equal(runningExperienceFor(e, null), e);
    assert.equal(runningExperienceFor(e, undefined), e);
  }
});

/**
 * ── CORRECTING A LEVEL IS NOT ANSWERING A QUESTION ───────────────────────────────────────────────────
 *
 * `forgetExperience()` sat with zero callers, so the first level an athlete ever gave was permanent —
 * the questionnaire skips the question whenever one is already stored, and a new conversation keeps it
 * on purpose. `LEVEL_CHIPS` is the correction path.
 *
 * ⚠ THE FLAG IS THE WHOLE SAFETY OF IT. These carry the SAME LABELS as the build questionnaire's
 * experience chips, and the sheet routes on `levelOnly` alone. A chip that lost the flag would fall
 * through to the ordinary path and start assembling a program the athlete never asked for.
 */
test('LEVEL_CHIPS — every one records a level and none of them builds', () => {
  assert.equal(LEVEL_CHIPS.length, 3, 'beginner, intermediate, advanced');
  for (const c of LEVEL_CHIPS) {
    assert.equal(c.levelOnly, true, `"${c.label}" would start a build instead of recording a level`);
    assert.ok(c.patch.experience, `"${c.label}" records nothing`);
    // Both disciplines are set, because the engine reads them apart and a half-answer leaves the other
    // at whatever it was — which is the bug this whole path exists to make correctable.
    assert.ok(c.patch.experience.lifting, 'lifting level missing');
    assert.ok(c.patch.experience.running, 'running level missing');
    assert.equal(c.goTo, undefined, 'correcting a level must not leave the conversation');
  }
  const levels = LEVEL_CHIPS.map((c) => c.patch.experience.lifting);
  assert.deepEqual([...levels].sort(), ['advanced', 'beginner', 'intermediate'], 'all three, once each');
});

/**
 * ── A BEGINNER IS NOT ASKED TO GUESS AT PROGRAMMING ──────────────────────────────────────────────────
 *
 * "A block, or one week?" is a question about training STRUCTURE. Somebody who has never trained has no
 * basis for preferring four weeks to twelve — they pick one and hope, and the answer then shapes ten
 * weeks of their life. Everything else in the questionnaire is a fact they own, INCLUDING the session
 * length: "how long have you got?" is a diary question, not a training one, so it stays.
 *
 * The level therefore has to be known before the length is asked, which is why it moved ahead of it on
 * the lifting path.
 */
test('a beginner is asked their level before the length, and then not asked the length at all', () => {
  const NEW = { lifting: 'beginner', running: 'beginner' };

  assert.equal(nextQuestion({ goal: 'strength' }).id, 'experience', 'the level comes before the length');

  const { asked, finished, c } = walk({ goal: 'strength', experience: NEW });
  assert.ok(finished, `never stopped asking — ${asked.join(', ')}`);
  assert.ok(!asked.includes('size'), 'a beginner was asked to choose a block length');
  assert.ok(asked.includes('time'), 'a diary question they can answer must still be asked');
  assert.ok(asked.includes('days'), 'and their days');
  assert.ok(asked.includes('where'), 'and their room');

  /* ⚠ LEFT UNDEFINED, NOT DEFAULTED IN THE CHAT. `missingFor` does not require `weeks`, so the assembler
     reaches `defaultWeeksFor` — the engine's own answer, which is a better one than a number this file
     would have had to invent. A default written here would also silently outrank it. */
  assert.equal(c.weeks, undefined, 'the chat must not invent a block length');
  assert.ok(readyToBuild(c), 'and it still has everything the assembler needs');
});

test('an experienced athlete is still asked how long a block they want', () => {
  const { asked } = walk({ goal: 'strength', experience: { lifting: 'advanced', running: 'advanced' } });
  assert.ok(asked.includes('size'), 'the length question is a real choice for anyone who can make it');
});

/**
 * ── HOW TO LOAD WEEK ONE ─────────────────────────────────────────────────────────────────────────────
 *
 * The one question the app could not answer for a first-timer: no prescription anywhere carries a weight,
 * so their first set is an empty field beside a history of `—`.
 *
 * ⚠ THE GUARD THAT MATTERS IS "NO NUMBER". Holt does not know their bodyweight or their history, and
 * weights are stored canonically and converted per athlete — so a literal figure would be both a guess
 * and wrong for everyone training in kilos.
 */
const asBeginner = (over = {}) => ({
  goal: 'strength',
  experience: { lifting: 'beginner', running: 'beginner' },
  environment: 'full_gym',
  daysPerWeek: 3,
  sessionMinutes: 45,
  ...over,
});

test('startingLoadLine — a beginner is told how to load, in every room', () => {
  for (const environment of ['full_gym', 'home', 'bodyweight', 'outdoor']) {
    const line = startingLoadLine(asBeginner({ environment }));
    assert.ok(line, `${environment} said nothing to somebody who has never trained`);
    assert.ok(/week one/i.test(line), `${environment} did not say when this applies`);
  }
});

test('⚠ startingLoadLine — it never states a weight', () => {
  for (const environment of ['full_gym', 'home', 'bodyweight', 'outdoor']) {
    const line = startingLoadLine(asBeginner({ environment }));
    // Rep counts are spelled as words in this copy, so any DIGIT is a weight that escaped.
    assert.ok(!/\d/.test(line), `${environment} put a number in front of a beginner: "${line}"`);
    assert.ok(!/\b(lb|lbs|kg|kgs|pounds|kilos)\b/i.test(line), `${environment} named a unit: "${line}"`);
  }
});

test('startingLoadLine — silent for anyone who does not need it', () => {
  for (const lifting of ['intermediate', 'advanced']) {
    assert.equal(startingLoadLine(asBeginner({ experience: { lifting, running: lifting } })), null, lifting);
  }
  // A race block is paced, not loaded, and `race_base` already asked what they run today.
  assert.equal(startingLoadLine(asBeginner({ goal: 'run_10k' })), null, 'a race got load advice');
});

test('startingLoadLine — the bar, the dumbbells and the floor get different answers', () => {
  const gym = startingLoadLine(asBeginner({ environment: 'full_gym' }));
  const home = startingLoadLine(asBeginner({ environment: 'home' }));
  const bw = startingLoadLine(asBeginner({ environment: 'bodyweight' }));
  assert.equal(new Set([gym, home, bw]).size, 3, 'three rooms must not get one generic sentence');
  assert.ok(/bar/i.test(gym), 'a gym answer should mention the bar');
  assert.ok(/fifteen/i.test(home), 'the dumbbell answer is the fifteen-rep rule');
  assert.ok(!/bar\b/i.test(bw), 'somebody with no equipment must not be told about a bar');
});

/**
 * ── "GENERAL HEALTH" IS A REAL GOAL, AND IT IS NOT "GET FITTER" ──────────────────────────────────────
 *
 * `conditioning` was pulled from the offered list by PO decision — *"Take out Get Fitter"* — because it
 * sat between Build muscle and Lose weight answering neither. General health is a different question: it
 * is not BETWEEN those two, it is below all of them, the athlete who is not chasing a number at all. It
 * is also the commonest thing a beginner actually means, and until now they had to pick "Get stronger"
 * or "Move better" instead.
 *
 * ⚠ IT BUILDS STRENGTH-SHAPED, WHICH IS THE CATALOGUE'S OWN ANSWER. `fbh-full-body-3` — what the intake
 * resolves a health goal to — is Strength Foundation I, a full-body 3-day in the Strength family. Routing
 * it to CONDITIONING would have made it a gentler `weight_loss`, which is not what anybody means by it.
 */
test('the goal question offers General health, and never re-offers Get fitter', () => {
  const labels = nextQuestion({}).chips.map((c) => c.label);
  assert.ok(labels.includes('General health'), `offered: ${labels.join(', ')}`);
  assert.ok(!labels.includes('Get fitter'), 'conditioning was taken out by decision and must stay out');
});

test('a General health build terminates and is ready, like every other goal', () => {
  const { asked, finished, c } = walk({ goal: 'health' });
  assert.ok(finished, `never stopped asking — ${asked.join(', ')}`);
  assert.ok(readyToBuild(c), 'finished without being ready');
  // It is a lifting block, so it is asked the lifting questions and none of the race ones.
  assert.ok(asked.includes('where'), 'never asked where they train');
  assert.ok(asked.includes('time'), 'never asked how long they have');
  assert.ok(!asked.includes('race_when'), 'asked about a race');
});
