import test from 'node:test';
import assert from 'node:assert/strict';

import { INTENSITY, INTENSITY_LEVELS, DEFAULT_INTENSITY, profileFor, willSay, atCeiling } from '../rulebook/intensity.ts';
import { incrementFor } from '../progression.ts';

const EXPERIENCES = ['beginner', 'intermediate', 'advanced'];
const cells = () => EXPERIENCES.flatMap((e) => INTENSITY_LEVELS.map((l) => ({ e, l, p: INTENSITY[e][l] })));

// ─────────────────────────────────────────────────────────────────────────────
// ⚠ THE DIAGONAL — the PO's sentence as arithmetic
// ─────────────────────────────────────────────────────────────────────────────

test('a beginner at DRIVE is never more aggressive than an intermediate at PUSH', () => {
  // "If a beginner chooses the highest level of intensity it shouldn't be as high of a level as an
  // expert lifter." Checked on the three levers that touch training content — not on register or
  // line count, which are loudness and are allowed to differ.
  const bd = INTENSITY.beginner.drive;
  const ip = INTENSITY.intermediate.push;
  assert.ok(bd.confirmSessions >= ip.confirmSessions, 'never asks for less proof');
  assert.ok(bd.stepScale <= ip.stepScale, 'never a bigger jump');
  assert.ok(!bd.intraSession, 'no mid-exercise bump for a beginner at any level');
});

test('a beginner never gets the mid-exercise bump, at any level', () => {
  // The one lever where the clamp is absolute rather than merely equal: an intra-set load change is a
  // judgement about a rep you just watched, and a novice has not yet earned the reps to judge it by.
  for (const level of INTENSITY_LEVELS) {
    assert.equal(INTENSITY.beginner[level].intraSession, false, `beginner/${level}`);
  }
});

test('…and is strictly below an intermediate at DRIVE', () => {
  const bd = INTENSITY.beginner.drive;
  const id = INTENSITY.intermediate.drive;
  assert.ok(bd.stepScale < id.stepScale || bd.intraSession < id.intraSession, 'beginner max is bounded');
});

test('a beginner at DRIVE is still LOUDER than at PUSH — asking to be pushed does something', () => {
  assert.equal(INTENSITY.beginner.push.register, 'plain');
  assert.equal(INTENSITY.beginner.drive.register, 'direct');
});

test('⚠ stepScale is 1 in every beginner cell — EXPERIENCE_MULTIPLIER already carries their aggression', () => {
  for (const level of INTENSITY_LEVELS) {
    assert.equal(INTENSITY.beginner[level].stepScale, 1, `beginner/${level}`);
  }
});

test('the worked squat example holds — nobody gets a 30 lb jump', () => {
  const squat = 'Squat / Knee Dominant';
  const at = (e, l) => incrementFor(squat, e, 'barbell', INTENSITY[e][l].stepScale);
  assert.equal(at('beginner', 'drive'), 15);
  assert.equal(at('intermediate', 'drive'), 15);
  assert.equal(at('advanced', 'drive'), 20);
  assert.equal(at('advanced', 'steady'), 10, 'unchanged from before intensity existed');
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠ THE CEILING — the floor bug pointing upward
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ ×2 on a lateral raise is capped — 10 lb is how you teach someone to ignore the coach', () => {
  const raise = incrementFor('Shoulder Isolation', 'advanced', 'dumbbell', 2);
  assert.equal(raise, 5, 'the movement ceiling outranks the intensity dial');
});

test('no pattern can be pushed past its ceiling at any scale', () => {
  const PATTERNS = [
    ['Squat / Knee Dominant', 20],
    ['Horizontal Push', 10],
    ['Elbow Flexion', 10],
    ['Shoulder Isolation', 5],
    ['Calf / Ankle', 15],
  ];
  for (const [pattern, ceiling] of PATTERNS) {
    for (const e of EXPERIENCES) {
      assert.ok(incrementFor(pattern, e, 'barbell', 2) <= ceiling, `${pattern}/${e}`);
    }
  }
});

test('the floor still holds — a scale below 1 cannot shrink a jump', () => {
  // `Math.max(1, stepScale)` — the dial only ever pushes up. Easing off is `back_off`, not a smaller jump.
  assert.equal(incrementFor('Squat / Knee Dominant', 'advanced', 'barbell', 0.1), 10);
});

test('an omitted scale is byte-identical to the old behaviour', () => {
  for (const e of EXPERIENCES) {
    assert.equal(incrementFor('Horizontal Push', e, 'barbell'), incrementFor('Horizontal Push', e, 'barbell', 1));
  }
});

test('mobility and bodyweight still add nothing, at every intensity', () => {
  assert.equal(incrementFor('Mobility', 'advanced', 'barbell', 2), 0);
  assert.equal(incrementFor('Vertical Pull', 'advanced', 'bodyweight', 2), 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// WHAT IS INVARIANT ACROSS ALL TWELVE CELLS
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ safety is spoken at EVERY level — the quietest setting is not "no coach"', () => {
  for (const { e, l, p } of cells()) assert.ok(willSay(p, 'safety'), `${e}/${l}`);
});

test('nothing weaker than steady ever volunteers a load increase', () => {
  for (const e of EXPERIENCES) assert.ok(!willSay(INTENSITY[e].reminders, 'load_up'), e);
});

test('reminders never offers a mid-exercise bump, at any experience', () => {
  for (const e of EXPERIENCES) assert.equal(INTENSITY[e].reminders.intraSession, false, e);
});

test('reminders is identical across experiences on every content lever', () => {
  // There is no "quiet, but for an expert" — somebody who asks for quiet gets quiet.
  const [b, i, a] = EXPERIENCES.map((e) => INTENSITY[e].reminders);
  for (const key of ['confirmSessions', 'intraSession', 'stepScale', 'volunteered', 'register']) {
    assert.equal(b[key], i[key], key);
    assert.equal(i[key], a[key], key);
  }
});

test('confirmSessions is only ever 1 or 2 — it never invents readiness', () => {
  for (const { e, l, p } of cells()) assert.ok(p.confirmSessions === 1 || p.confirmSessions === 2, `${e}/${l}`);
});

test('the volunteered cap never exceeds three lines a session', () => {
  for (const { e, l, p } of cells()) assert.ok(p.volunteered >= 0 && p.volunteered <= 3, `${e}/${l}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ an unknown experience resolves to the SAFEST row, not the middle one', () => {
  // Experience is device-local, so "absent" is what every new phone looks like. Falling to intermediate
  // would let a fresh install quietly unlock a harder coach.
  assert.deepEqual(profileFor('drive', null), INTENSITY.beginner.drive);
  assert.deepEqual(profileFor('drive', undefined), INTENSITY.beginner.drive);
});

test('an unset level resolves to the default', () => {
  assert.deepEqual(profileFor(null, 'advanced'), INTENSITY.advanced[DEFAULT_INTENSITY]);
  assert.equal(DEFAULT_INTENSITY, 'steady');
});

test('a stale stored value cannot crash the coach', () => {
  assert.deepEqual(profileFor('ludicrous', 'advanced'), INTENSITY.advanced.steady);
  assert.deepEqual(profileFor('steady', 'olympian'), INTENSITY.beginner.steady);
});

test('there is no level above drive', () => {
  assert.ok(atCeiling('drive'));
  assert.ok(!atCeiling('push'));
  assert.equal(INTENSITY_LEVELS[INTENSITY_LEVELS.length - 1], 'drive');
});
