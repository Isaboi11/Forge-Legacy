import test from 'node:test';
import assert from 'node:assert/strict';

import { intraSetSuggestion, OVERSHOOT_REPS } from '../intra-set.ts';
import { INTENSITY } from '../rulebook/intensity.ts';
import { IN_WORKOUT_LINES, say } from '../rulebook/in-workout-voice.ts';
import { resetVoice } from '../rulebook/voice.ts';

const first = () => 0; // deterministic variant choice

const base = (over = {}) => ({
  exerciseName: 'Barbell Bench Press',
  pattern: 'Horizontal Push',
  experience: 'intermediate',
  equipment: 'barbell',
  profile: INTENSITY.intermediate.push,
  justLogged: { weight: 185, actualReps: 12 },
  topReps: 10,
  setsRemaining: 2,
  unit: 'lb',
  ...over,
});

// ─────────────────────────────────────────────────────────────────────────────
// THE ASK — "in the middle of a set be told, let's go up 10 lbs"
// ─────────────────────────────────────────────────────────────────────────────

test('a genuine overshoot offers the next set heavier', () => {
  const got = intraSetSuggestion(base(), first);
  assert.equal(got.suggestedWeight, 190); // 185 + 5 (horizontal push, intermediate, ×1)
  assert.ok(got.message.includes('190 lb'));
});

test('the jump follows the movement, not a flat number', () => {
  const squat = intraSetSuggestion(base({ pattern: 'Squat / Knee Dominant', justLogged: { weight: 225, actualReps: 12 } }), first);
  assert.equal(squat.suggestedWeight, 235); // squats take 10
});

test('intensity scales the jump, inside the movement ceiling', () => {
  const at = (level) =>
    intraSetSuggestion(base({ experience: 'advanced', profile: INTENSITY.advanced[level], pattern: 'Squat / Knee Dominant', justLogged: { weight: 315, actualReps: 12 } }), first);
  assert.equal(at('push').suggestedWeight, 330); // 315 + 15
  assert.equal(at('drive').suggestedWeight, 335); // 315 + 20, the squat ceiling
});

// ─────────────────────────────────────────────────────────────────────────────
// THE FIVE GATES
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ a beginner is never offered a mid-exercise bump, even at drive', () => {
  assert.equal(intraSetSuggestion(base({ experience: 'beginner', profile: INTENSITY.beginner.drive }), first), null);
});

test('steady and reminders never offer one either', () => {
  for (const level of ['reminders', 'steady']) {
    assert.equal(intraSetSuggestion(base({ profile: INTENSITY.intermediate[level] }), first), null, level);
  }
});

test('hitting the top of the range is not an overshoot — that is what the range is for', () => {
  assert.equal(intraSetSuggestion(base({ justLogged: { weight: 185, actualReps: 10 } }), first), null);
  assert.equal(intraSetSuggestion(base({ justLogged: { weight: 185, actualReps: 11 } }), first), null);
  assert.ok(intraSetSuggestion(base({ justLogged: { weight: 185, actualReps: 10 + OVERSHOOT_REPS } }), first));
});

test('⚠ nothing is said on the last set — instructing a set nobody will do is commentary', () => {
  assert.equal(intraSetSuggestion(base({ setsRemaining: 0 }), first), null);
});

test('a bodyweight set progresses in reps, not pounds', () => {
  assert.equal(intraSetSuggestion(base({ justLogged: { weight: 0, actualReps: 20 } }), first), null);
  assert.equal(intraSetSuggestion(base({ equipment: 'bodyweight' }), first), null);
  assert.equal(intraSetSuggestion(base({ equipment: 'resistance_band' }), first), null);
});

test('⚠ it never suggests going DOWN — one bad set is a Tuesday', () => {
  const got = intraSetSuggestion(base({ justLogged: { weight: 185, actualReps: 3 } }), first);
  assert.equal(got, null, 'a short set is back_off’s business, and back_off reads two sessions');
});

test('an unlogged set says nothing', () => {
  assert.equal(intraSetSuggestion(base({ justLogged: { weight: null, actualReps: 12 } }), first), null);
  assert.equal(intraSetSuggestion(base({ justLogged: { weight: 185, actualReps: null } }), first), null);
});

test('mobility adds nothing at any intensity', () => {
  assert.equal(intraSetSuggestion(base({ pattern: 'Mobility' }), first), null);
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠ THE COPY RULE — names the next action, never grades the set
// ─────────────────────────────────────────────────────────────────────────────

test('no in-workout line characterises the set just logged', () => {
  /* W9-A-005 D-3: "a scoreboard tells you how you did, and a coach tells you what to do next."
     Any assessment must be a conditional handed to the athlete, never an assertion by Holt. */
  const GRADING = /\b(easy|light|weak|slow|strong|good rep|nailed|crushed|behind|ahead of)\b/i;
  for (const [key, table] of Object.entries(IN_WORKOUT_LINES)) {
    for (const [register, lines] of Object.entries(table)) {
      for (const line of lines) {
        assert.doesNotMatch(line, GRADING, `${key}/${register}: "${line}"`);
      }
    }
  }
});

test('every register of every key has at least three variants', () => {
  for (const [key, table] of Object.entries(IN_WORKOUT_LINES)) {
    for (const [register, lines] of Object.entries(table)) {
      assert.ok(lines.length >= 3, `${key}/${register} has ${lines.length}`);
    }
  }
});

test('no exclamation marks — he is a coach, not a cheerleader', () => {
  for (const table of Object.values(IN_WORKOUT_LINES)) {
    for (const lines of Object.values(table)) {
      for (const line of lines) assert.ok(!line.includes('!'), line);
    }
  }
});

test('⚠ backing off reads identically at every register — the rescue is never delivered hard', () => {
  const b = IN_WORKOUT_LINES.set_back_off;
  assert.deepEqual(b.quiet, b.plain);
  assert.deepEqual(b.plain, b.direct);
});

test('a missing token silences the line rather than printing a brace', () => {
  resetVoice();
  assert.equal(say('cue_reminder', 'plain', {}, first), null);
  assert.equal(say('set_advance', 'plain', { lift: 'Squat' }, first), null, 'no weight yet');
});

test('a filled line comes back whole', () => {
  resetVoice();
  const line = say('cue_reminder', 'quiet', { cue: 'Feel it in your legs, not your back.' }, first);
  assert.equal(line, 'Feel it in your legs, not your back.');
});
