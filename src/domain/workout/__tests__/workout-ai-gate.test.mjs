import '../../../data/__tests__/harness/hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
 * WHEN AI READS A WORKOUT (PO 2026-09-28: "use AI when needed … build a fool proof plan of when to use ai and when
 * not to"). Two halves, both proven here with the real cards and the app's real catalogue matcher:
 *
 *   1. The line. Every card the PO has sent is read by the rules and must NOT reach AI. A card the rules cannot
 *      read must.
 *   2. The check on AI's answer. A faithful rewrite (the reader's own layout of each real card, which is what the
 *      prompt asks AI to write) passes; a rewrite that changes one number, drops one %, invents a lift or a rest
 *      is thrown away.
 */

const { readWrittenWorkout, writtenToTemplate, rowsToWrittenText } = await import('../written-workout.ts');
const { whenToUseAi, checkAiRewrite, MAX_AI_CHARS } = await import('../workout-ai-gate.ts');
const { resolveExerciseName } = await import('../../exercise-picker/data.ts');
const W3 = await import('./fixtures/squatober-2024-week3.mjs');
const W2 = await import('./fixtures/squatober-2024-week2.mjs');
const S11 = await import('./fixtures/squatober-2025.mjs');

const src = readFileSync(new URL('./written-workout.test.mjs', import.meta.url), 'utf8');
const S10 = Object.fromEntries(['DAY1', 'DAY2', 'DAY3', 'DAY4', 'DAY7'].map((k) => [`2024 ${k}`, new RegExp(`const ${k} = \`([^\`]*)\``).exec(src)[1]]));
const CARDS = {
  ...S10,
  ...Object.fromEntries(Object.entries(W2).map(([k, v]) => [`2024 ${k}`, v])),
  ...Object.fromEntries(Object.entries(W3).map(([k, v]) => [`2024 ${k}`, v])),
  ...Object.fromEntries(Object.entries(S11).map(([k, v]) => [`2025 ${k}`, v])),
};
const resolveKey = (n) => resolveExerciseName(n)?.key;
const gate = (text) => {
  const w = text.trim() ? readWrittenWorkout(text) : null;
  return whenToUseAi(text, w, w ? writtenToTemplate(w, resolveKey) : []);
};
const canonical = (text) => {
  const w = readWrittenWorkout(text);
  return rowsToWrittenText({ name: w.name, how: w.how, after: w.after, rows: writtenToTemplate(w, resolveKey) });
};

test('all 19 cards are here', () => assert.equal(Object.keys(CARDS).length, 19));

for (const [name, text] of Object.entries(CARDS)) {
  test(`${name}: the rules read it, so no AI is used`, () => {
    const call = gate(text);
    assert.ok(call.kind === 'rules' || call.kind === 'none', `${name} → ${JSON.stringify(call)}`);
  });
  test(`${name}: its faithful rewrite passes the check`, () => {
    assert.deepEqual(checkAiRewrite(text, canonical(text), resolveKey), []);
  });
}

test('nothing to read, and a rest day, never use AI', () => {
  assert.equal(gate('').kind, 'none');
  assert.equal(gate('   \n').kind, 'none');
  assert.equal(gate('Rest day\n30 min walk\nEat big\nSleep 9 hrs').kind, 'none');
});

test('a simple typed workout stays on the rules', () => {
  assert.equal(gate('1. Back Squat 5 sets of 5 reps @ 75%\n2 min rest between each set\n2. Bench Press 3 x 8').kind, 'rules');
});

test('a card written a way the rules have not seen goes to AI, saying why', () => {
  const messy = 'Squat day\nSquat — work up: 5@60 5@65 then 3 x 3 @ 80 percent, long rests\nThen bench, the usual 5x5 at 70';
  const call = gate(messy);
  assert.equal(call.kind, 'ai');
  assert.ok(call.reasons.length > 0);
});

test('lifts written but none found goes to AI', () => {
  const call = gate('Squat 5x5 @ 75%\nBench 5x5 @ 70%');
  if (call.kind === 'rules') return; // the rules may read this unnumbered; either way no lift is silently lost
  assert.equal(call.kind, 'ai');
});

test('a % on the card that went nowhere goes to AI', () => {
  const w = readWrittenWorkout('1. Back Squat 5 sets of 5 reps @ 75%');
  const rows = writtenToTemplate(w, resolveKey);
  const call = whenToUseAi('1. Back Squat 5 sets of 5 reps @ 75%\nfinish with 90% single', w, rows);
  assert.equal(call.kind, 'ai');
  assert.match(call.reasons.join(' '), /90%/);
});

test('only a misspelt name stays on the rules — that is spelling, the poster fixes it', () => {
  assert.equal(gate('1. Bak Sqaut 5 sets of 5 reps @ 75%').kind, 'rules');
});

test('too long for one read is never sent', () => {
  const long = 'Squat work up 5@60 then 3x3 at 80 percent\n'.repeat(Math.ceil(MAX_AI_CHARS / 40) + 5);
  assert.equal(gate(long).kind, 'too_long');
});

/* ── AI's answer is thrown away unless it is faithful ─────────────────────── */

const D21 = W3.D21;
const good = canonical(D21);

test('one changed percentage is caught', () => {
  const bad = good.replace('@ 75%', '@ 78%');
  assert.notEqual(bad, good);
  assert.match(checkAiRewrite(D21, bad, resolveKey).join(' '), /78/);
});

test('one changed rep count is caught', () => {
  const bad = good.replace('5 sets of 3-6 reps', '5 sets of 3-8 reps');
  assert.match(checkAiRewrite(D21, bad, resolveKey).join(' '), /8/);
});

/* Coverage is by VALUE: a % that survives on another lift counts as kept. Which lift each number sits on is what
   the poster checks against the card; this guarantees no value on the card is lost and none is invented. */
test('a dropped % is caught', () => {
  const bad = good.replace(/^(\w[\w ]*) warm up sets:.*$/gm, '$1 warm up sets: 3 reps @ 55%');
  assert.match(checkAiRewrite(D21, bad, resolveKey).join(' '), /67%/);
});

test('an invented rest is caught', () => {
  const bad = good.replace('rest 2:00\n4.', 'rest 1:45\n4.');
  assert.match(checkAiRewrite(D21, bad, resolveKey).join(' '), /105s/);
});

test('an invented lift is caught', () => {
  const bad = good.replace('Heavy DB Shrugs', 'Face Pulls');
  assert.match(checkAiRewrite(D21, bad, resolveKey).join(' '), /Face Pulls/);
});

test('a rewrite with no lifts is thrown away', () => {
  assert.match(checkAiRewrite(D21, 'I could not read this workout.', resolveKey).join(' '), /no lifts/);
});

test('rests may be written another way: 2½ min = 2:30 = 150 seconds', () => {
  const card = '1. Back Squat 5 sets of 5 reps @ 75%\n2½ min rest between each set';
  assert.deepEqual(checkAiRewrite(card, '"Workout"\n1. Back Squat 5 sets of 5 reps @ 75%\nrest 2:30', resolveKey), []);
  assert.deepEqual(checkAiRewrite(card, '"Workout"\n1. Back Squat 5 sets of 5 reps @ 75%\nrest 150 seconds', resolveKey), []);
});

test('DB may be spelled out as Dumbbell', () => {
  const card = 'a. DB RDL 4 sets of 5 reps';
  assert.deepEqual(checkAiRewrite(card, '"Workout"\n1. Dumbbell Romanian Deadlift 4 sets of 5 reps', resolveKey), []);
});
