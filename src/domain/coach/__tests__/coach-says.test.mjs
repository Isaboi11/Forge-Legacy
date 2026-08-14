import test from 'node:test';
import assert from 'node:assert/strict';

import { coachLine } from '../coach-says.ts';

// ─────────────────────────────────────────────────────────────────────────────
// THE ORDER — most recent wins
// ─────────────────────────────────────────────────────────────────────────────

test('the live line outranks everything — it is ten seconds old', () => {
  const got = coachLine({ live: 'Next set, 195.', progression: 'Go to 190.', planCue: 'Brace first.' });
  assert.deepEqual(got, { text: 'Next set, 195.', source: 'live' });
});

test('progression outranks the plan cue — days beat timeless', () => {
  assert.deepEqual(coachLine({ progression: 'Go to 190.', planCue: 'Brace first.' }), {
    text: 'Go to 190.',
    source: 'progression',
  });
});

test('the plan cue speaks whenever the two above are silent', () => {
  // A first-time lift, or the quietest intensity — which is most of the session for many athletes.
  assert.deepEqual(coachLine({ planCue: 'Feel it in your legs, not your back.' }), {
    text: 'Feel it in your legs, not your back.',
    source: 'plan',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SILENCE IS A REAL ANSWER
// ─────────────────────────────────────────────────────────────────────────────

test('nothing to say returns null — the caller draws the mark alone', () => {
  assert.equal(coachLine({}), null);
  assert.equal(coachLine({ live: null, progression: null, planCue: null }), null);
});

test('⚠ a whitespace-only cue is nothing, not something', () => {
  /* An author who opened the cue field and thought better of it must not put an empty bubble on the
     athlete's screen for the whole exercise. */
  assert.equal(coachLine({ planCue: '   ' }), null);
  assert.equal(coachLine({ live: '\n', progression: '  ', planCue: '' }), null);
});

test('an empty higher tier falls through rather than winning with nothing', () => {
  assert.deepEqual(coachLine({ live: '  ', progression: 'Go to 190.' }), {
    text: 'Go to 190.',
    source: 'progression',
  });
});

test('lines are trimmed — trailing whitespace is not part of what he said', () => {
  assert.equal(coachLine({ live: '  Next set, 195.  ' })?.text, 'Next set, 195.');
});

test('undefined and null are the same absence', () => {
  assert.deepEqual(coachLine({ live: undefined, progression: 'Hold 185.' }), {
    text: 'Hold 185.',
    source: 'progression',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STAYING CURRENT — a line you have already outrun is not advice
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The PO's session, reproduced exactly:
 *
 *   *"I did one set of 85lbs for ten reps, coach holt said move up the weight to 95lbs for 8 reps. The
 *   first was a warmup so the second set I actually did 165lbs for 8 reps. He still said move up to
 *   95lbs. He needs to stay current."*
 */
test('⚠ 165 answers "go to 95" — the coach stops asking for it', () => {
  const askFor95 = {
    live: 'If that moved well, take the next one to 95 lb.',
    liveUpTo: 95,
    progression: 'You hit 3 × 8 at 85 lb on Bench Press — go to 95 lb and start back at 8.',
    progressionUpTo: 95,
    planCue: 'Brace before you unrack.',
  };

  // Before the working set, both lines are live and the newest wins.
  assert.equal(coachLine({ ...askFor95, heaviestThisSession: 85 })?.source, 'live');

  /* And after 165 — the whole point. BOTH have to go: they say the same thing here (a 10 lb step off 85
     is 95 either way), so clearing only the nudge would uncover an identical sentence underneath and the
     athlete would see no change at all. */
  assert.deepEqual(coachLine({ ...askFor95, heaviestThisSession: 165 }), {
    text: 'Brace before you unrack.',
    source: 'plan',
  });
});

test('exactly the suggested weight counts — the ask was answered, not approached', () => {
  assert.equal(coachLine({ live: 'Next set, 95.', liveUpTo: 95, heaviestThisSession: 95 }), null);
  assert.equal(coachLine({ live: 'Next set, 95.', liveUpTo: 95, heaviestThisSession: 94 })?.source, 'live');
});

/**
 * ⚠ `hold` AND `back_off` NAME A WEIGHT TO WORK AT, NOT ONE TO REACH.
 *
 * Both carry a `suggestedWeight`, and running this rule over it would retire the line the moment the
 * athlete did the set it was asking for — silencing the coach exactly when he is asking for three more
 * of the same. The caller passes `progressionUpTo` for `add_weight` alone; this asserts the shape it
 * relies on, so the two cannot drift apart silently.
 */
test('a hold or a back-off survives the set it asked for', () => {
  const held = coachLine({ progression: 'Stay at 185 and rebuild from there.', progressionUpTo: null, heaviestThisSession: 185 });
  assert.deepEqual(held, { text: 'Stay at 185 and rebuild from there.', source: 'progression' });
});

/**
 * ⚠ A BODYWEIGHT LIFT LOGS `weight: 0` AS A REAL ANSWER, and its progression is measured in reps.
 * `0 >= 0` would retire every line about push-ups the instant the first set landed.
 */
test('zero is not a weight — a bodyweight line never expires this way', () => {
  const got = coachLine({ progression: 'You got 12 on Push-Up — go for 13 this time.', progressionUpTo: 0, heaviestThisSession: 0 });
  assert.equal(got?.source, 'progression');
});

test('nothing logged yet cannot retire anything', () => {
  assert.equal(coachLine({ live: 'Next set, 95.', liveUpTo: 95, heaviestThisSession: null })?.source, 'live');
  assert.equal(coachLine({ live: 'Next set, 95.', liveUpTo: 95 })?.source, 'live');
});

/**
 * A spent line FALLS THROUGH rather than silencing the coin. Going quiet mid-exercise reads as the
 * coach losing interest, and a technique cue is as true on the fourth set as on the first.
 */
test('a spent live line uncovers the one beneath it, when that one is still current', () => {
  assert.deepEqual(
    coachLine({ live: 'Take the next one to 95 lb.', liveUpTo: 95, progression: 'Stay at 185.', progressionUpTo: null, heaviestThisSession: 165 }),
    { text: 'Stay at 185.', source: 'progression' },
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// ⭐ THE ARRIVAL LINES ARE FOR THE FIRST SET — PO, 2026-08-14
// ─────────────────────────────────────────────────────────────────────────────

/*
 * *"There are times where I get to an exercise, coach holt says something, and then after I do the
 * first set it doesn't go away. It should be gone after the first set."*
 *
 * ⚠ THIS REVERSES A DECISION RECORDED IN THIS FILE, and the reversal is right. The old reasoning was
 * that a technique cue "is as true on the fourth set as the first" — true, and beside the point. Both
 * `progression` and `planCue` are what Holt says when you WALK UP to the bar: where to start, and what
 * to watch on the first rep. Once you have done a set, a sentence that will not leave stops reading as
 * coaching and starts reading as a stuck screen.
 */

test('⚠ the plan cue is gone after the first set', () => {
  const cue = { planCue: 'Brace before you unrack.' };
  assert.deepEqual(coachLine({ ...cue, setsDoneThisExercise: 0 }), { text: 'Brace before you unrack.', source: 'plan' });
  assert.equal(coachLine({ ...cue, setsDoneThisExercise: 1 }), null, 'it should be gone after the first set');
  assert.equal(coachLine({ ...cue, setsDoneThisExercise: 4 }), null);
});

test('⚠ so is the progression line, even when it names no weight to outgrow', () => {
  // `hold` and `back_off` carry no `progressionUpTo` and so could never expire by the currency rule.
  // They are still arrival lines, and this is the case the athlete actually stares at for four sets.
  const held = { progression: 'Stay at 185 and rebuild from there.', progressionUpTo: null };
  assert.equal(coachLine({ ...held, setsDoneThisExercise: 0 })?.source, 'progression');
  assert.equal(coachLine({ ...held, setsDoneThisExercise: 1 }), null);
});

test('⚠ a bodyweight cue goes too — the case `heaviestThisSession` could never have caught', () => {
  /*
   * A plank, a carry and a bodyweight row log with `weight` null or 0, so the currency rule is blind to
   * them by design. Counting SETS rather than weight is what makes the fix reach the exercises where
   * the stuck sentence is most obvious.
   */
  const plank = { planCue: 'Squeeze the glutes, ribs down.', heaviestThisSession: null };
  assert.equal(coachLine({ ...plank, setsDoneThisExercise: 0 })?.source, 'plan');
  assert.equal(coachLine({ ...plank, setsDoneThisExercise: 2 }), null);
});

test('⚠ the mid-set nudge is EXEMPT, or it would vanish before it could be read', () => {
  /*
   * `live` is written BY a completed set. Retiring it on the same signal that creates it would mean
   * every line the coin exists to carry appeared and disappeared in one render.
   */
  const nudge = { live: 'That moved well — take the next one to 95.', liveUpTo: 95 };
  assert.equal(coachLine({ ...nudge, setsDoneThisExercise: 1 })?.source, 'live');
  assert.equal(coachLine({ ...nudge, setsDoneThisExercise: 3 })?.source, 'live');
});

test('an absent count is treated as "not started", so nothing regresses by omission', () => {
  // Every existing caller and every older test omits it. Absent must keep the arrival lines, or the
  // coin goes silent everywhere at once.
  assert.equal(coachLine({ planCue: 'Brace.' })?.source, 'plan');
  assert.equal(coachLine({ progression: 'Add 5 lb.', progressionUpTo: 190 })?.source, 'progression');
});

test('once the arrival lines retire, a live nudge still gets through', () => {
  // The coin is not silenced for the rest of the exercise — it is waiting for something new.
  const got = coachLine({
    live: 'Two more like that.',
    planCue: 'Brace before you unrack.',
    setsDoneThisExercise: 2,
  });
  assert.deepEqual(got, { text: 'Two more like that.', source: 'live' });
});
