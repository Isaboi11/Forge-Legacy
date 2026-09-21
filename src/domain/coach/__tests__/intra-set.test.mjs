import test from 'node:test';
import assert from 'node:assert/strict';

import { intraSetSuggestion, OVERSHOOT_REPS } from '../intra-set.ts';
import { INTENSITY } from '../rulebook/intensity.ts';
import { IN_WORKOUT_LINES, WIN_KEYS, say } from '../rulebook/in-workout-voice.ts';

/** HV-D2 — the same list `voice.test.mjs` holds the conversation to. */
const CHEESE = /\b(crush(ing|ed)? it|beast( mode)?|let'?s go{3,}|no days off|champ|buddy|king|queen|killing it|slay(ing)?|rock ?star|superstar|legend|great question|you got this bro|grind never stops)\b/i;
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

test('⚠ the coach always speaks POUNDS — the screen converts, never this module', () => {
  /* Reported by the PO: "Holt is talking in KG and I have it set to lbs." The first version took a unit
     label and stamped it onto the pounds number, so a metric athlete was told to load "86 kg" when the
     figure was 86 POUNDS — mislabelled, which is worse than unconverted because it looks right.
     `useUnits().fmt` re-expresses the finished string, exactly as it does for every other weight in the
     app, and it is a no-op for imperial. */
  const got = intraSetSuggestion(base(), first);
  assert.ok(got.message.includes('lb'), got.message);
  assert.ok(!got.message.toLowerCase().includes('kg'), got.message);
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
// ⚠ THE COPY RULE — names the next action, may celebrate what went right, never grades what went wrong
// ─────────────────────────────────────────────────────────────────────────────

test('no in-workout line characterises what went wrong', () => {
  /* W9-A-005 D-3, as amended by Holt-Voice-Amendment-001 HV-D4: he may now be glad about a set that went
     well ("every rep, every set"), so "strong" left this list. What stays is every word that grades a
     set DOWN or names the shortfall — the half of the rule anti-shame depends on. */
  const GRADING = /\b(easy|light|weak|slow|sloppy|ugly|bad|failed|fail|short of|missed|behind|ahead of|crushed)\b/i;
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

test('an exclamation mark is for a win, and there is at most one (HV-D3)', () => {
  for (const [key, table] of Object.entries(IN_WORKOUT_LINES)) {
    for (const [register, lines] of Object.entries(table)) {
      for (const line of lines) {
        const marks = (line.match(/!/g) ?? []).length;
        if (!WIN_KEYS.includes(key)) assert.equal(marks, 0, `${key}/${register} is not a win: "${line}"`);
        assert.ok(marks <= 1, `${key}/${register} shouts: "${line}"`);
        assert.doesNotMatch(line, CHEESE, `${key}/${register} is cheesy: "${line}"`);
      }
    }
  }
});

test('⭐ the weight going up is celebrated at every register — the dial sets the volume, never whether he cares', () => {
  /* HV-D6. The quietest setting is warm, not silent about a win: every register's add-weight lines must
     say the athlete EARNED it or that it is progress, not merely state the new number. */
  const GLAD = /(earned|nice work|progress|every rep|every set|let's go|look at that|well earned|you owned|topped|going up|prove it|attack|make it yours|strong|you hit|last time|ready for)/i;
  for (const [register, lines] of Object.entries(IN_WORKOUT_LINES.prog_add_weight)) {
    const glad = lines.filter((l) => GLAD.test(l)).length;
    assert.ok(glad >= Math.ceil(lines.length * 0.75), `${register}: only ${glad} of ${lines.length} add-weight lines sound glad`);
  }
});

test('⚠ backing off never names the drop as a loss', () => {
  for (const line of IN_WORKOUT_LINES.prog_back_off.plain) {
    assert.doesNotMatch(line, /\b(came down|dropped|down from|lost|regress)/i, line);
  }
});

test('⚠ backing off reads identically at every register — the rescue is never delivered hard', () => {
  for (const key of ['set_back_off', 'prog_back_off', 'effort_heavy_next', 'effort_heavy_min']) {
    const b = IN_WORKOUT_LINES[key];
    assert.deepEqual(b.quiet, b.plain, key);
    assert.deepEqual(b.plain, b.direct, key);
  }
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
