// node --experimental-strip-types --test src/domain/workout/__tests__/import-im1.test.mjs
//
// IM-1 (AI Road to 10 Sprint 3, 11-17): fixes from the 61-photo import corpus (20/61 → 27/61, graded offline on the
// recorded reads). The inputs below are the REAL card-reader and layout texts from the recordings
// (scripts/evals/recordings/import-corpus, bridger-logan-w1a / -w1d / -w3e, squatober-2024-10), trimmed to the lines
// that matter.
import '../../../data/__tests__/harness/hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { readWrittenWorkout, writtenToTemplate } = await import('../written-workout.ts');
const { checkAiRewrite } = await import('../workout-ai-gate.ts');
const { resolveExerciseName } = await import('../../exercise-picker/data.ts');
const resolveKey = (n) => resolveExerciseName(n)?.key;

// bridger-logan-w1d — the card, and the layout's faithful "3 sets of 12 reps" for "12-12-12 reps".
const CARD_W1D = 'Bench Press\n10-8-6-4 reps\n\nAlt DB Front Raise\n12-12-12 reps\n\nCable Rope Tricep Extension\n10-10-10 reps';
const TIDY_W1D = '1. Bench Press 4 sets\n* 10-8-6-4 reps\n2. Alt DB Front Raise 3 sets of 12 reps\n3. Cable Rope Tricep Extension 3 sets of 10 reps';

test('⚠ "12-12-12 reps" is a ladder, not a date — its 12s are on the card', () => {
  assert.deepEqual(checkAiRewrite(CARD_W1D, TIDY_W1D, resolveKey), []);
});

test('a set count read off a ladder’s length ("6-6-4-4 reps" → "4 sets") is not made up', () => {
  const card = 'Incline Bench Press\n6-6-4-4 reps\n\nEZ-Bar Skull Crushers\n10-8-6 reps';
  const tidy = '1. Incline Bench Press 4 sets\n* 6-6-4-4 reps\n2. EZ-Bar Skull Crushers 3 sets\n* 10-8-6 reps';
  assert.deepEqual(checkAiRewrite(card, tidy, resolveKey), []);
  // Still caught: a number that is neither on the card nor a ladder's length.
  assert.match(checkAiRewrite(card, '1. Incline Bench Press 5 sets\n* 6-6-4-4 reps', resolveKey).join(' '), /It wrote 5/);
  // A range is not a ladder: "8-12 reps" does not excuse a "2".
  assert.match(checkAiRewrite('Curls\n8-12 reps', '1. Curls 2 sets of 8 reps', resolveKey).join(' '), /It wrote 2/);
  // A real date in a heading is still not a number anybody lifts.
  assert.deepEqual(checkAiRewrite('10-16-24\nBack Squat 5x5', '"10-16-24"\n1. Back Squat 5 sets of 5 reps', resolveKey), []);
});

test('"* 6-6-4-4 reps" on its own line under a lift is that lift’s sets, not a note', () => {
  const w = readWrittenWorkout(TIDY_W1D);
  const bench = w.exercises.find((e) => e.name === 'Bench Press');
  assert.deepEqual(bench.repScheme, [10, 8, 6, 4]);
  assert.equal(bench.sets, 4);
  assert.equal(bench.note ?? null, null);
  // A lift that already has its reps keeps them; a range on its own line is not a ladder.
  const kept = readWrittenWorkout('1. Curls 3 sets of 12 reps\n* 10-8-6 reps').exercises[0];
  assert.equal(kept.reps, 12);
  assert.equal(readWrittenWorkout('1. Curls 3 sets\n* 8-12 reps').exercises[0].repScheme, null);
});

test('"N sets" is the layout’s placeholder for an unknown count — never part of the name', () => {
  // squatober-2024-10's layout: "3. EZ Bar Skullcrushers N sets".
  const w = readWrittenWorkout('1. Back Squat 6 sets of 6 reps @ 65%\n2. EZ Bar Skullcrushers N sets\n* Or BB, x30 reps');
  const names = writtenToTemplate(w, resolveKey).map((r) => r.name);
  assert.ok(names.some((n) => /^EZ Bar Skullcrushers$/i.test(n)), names.join(' · '));
  assert.ok(!names.some((n) => /\bN Sets\b/i.test(n)), names.join(' · '));
});

test('"* F-F-F reps" under a lift with no reps is every set to failure, one F per set (bridger-logan-w1a)', async () => {
  const { writtenToWeeks } = await import('../../program/written-import.ts');
  const w = readWrittenWorkout('1. Incline Bench Press 4 sets\n* 6-6-4-4 reps\n2. Dips\n* F-F-F reps');
  const { weeks } = writtenToWeeks(w, writtenToTemplate(w, resolveKey));
  const dips = weeks[0].days[0].items.find((it) => /dips/i.test(it.name));
  assert.equal(dips.toFailure, true);
  assert.equal(dips.sets, 3);
  assert.ok(!/F-F-F/.test(dips.note ?? ''), 'the F ladder is read, not left as a note');
  // A mixed ladder stays the author's words; a lift with its own reps is never turned to failure.
  const mixed = readWrittenWorkout('1. Upright Row 4 sets\n* 10-10-10-F reps');
  assert.notEqual(writtenToWeeks(mixed, writtenToTemplate(mixed, resolveKey)).weeks[0].days[0].items[0].toFailure, true);
  const counted = readWrittenWorkout('1. Push Ups 3 sets of 12 reps\n* to failure on the last');
  assert.notEqual(writtenToWeeks(counted, writtenToTemplate(counted, resolveKey)).weeks[0].days[0].items[0].toFailure, true);
});
