import '../../../data/__tests__/harness/hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

/*
 * IM-1, AI Road to 10 Sprint 3b — what the import corpus's real reads got wrong, each from the real answer
 * (`fixtures/import-corpus-3b.mjs`, copied from the recordings).
 */

const { readWrittenWorkout, writtenToTemplate } = await import('../written-workout.ts');
const { checkAiRewrite } = await import('../workout-ai-gate.ts');
const { resolveExerciseName } = await import('../../exercise-picker/data.ts');
const F = await import('./fixtures/import-corpus-3b.mjs');

const resolveKey = (n) => resolveExerciseName(n)?.key;
const rowsOf = (t) => writtenToTemplate(readWrittenWorkout(t), resolveKey);

test('"* same as above" on its own line under a bare lift takes the prescription above it (Squatober Day 7)', () => {
  const rows = rowsOf(F.D07_TIDY);
  const squat = rows.find((r) => r.name === 'Back Squat');
  const bench = rows.find((r) => r.name === 'Bench Press');
  assert.deepEqual(bench.repScheme, [5, 4, 3, 2, 1]);
  assert.deepEqual(bench.percentScheme, [65, 75, 80, 87, 92]);
  assert.deepEqual([bench.repScheme, bench.percentScheme], [squat.repScheme, squat.percentScheme]);
  /* …and never over a lift that already has its own numbers. */
  const own = rowsOf('1. Back Squat 5 sets of 5 reps @ 70%\n2. Bench Press 3 sets of 8 reps\n* same as above');
  assert.deepEqual([own[1].sets, own[1].targetReps], [3, 8]);
});

test('"Push downs" is "Pushdowns" — one word, however the card reader splits it (Squatober Day 21)', () => {
  const rows = rowsOf(F.D21_TIDY);
  assert.ok(rows.some((r) => r.name === 'Cable Triceps Pushdowns'));
  assert.equal(rowsOf('1. Lat Pull Downs 3 sets of 10 reps')[0].name, 'Lat Pulldowns');
  assert.equal(rowsOf('1. Push Ups 3 sets of 10 reps')[0].name, 'Push Ups', 'only the downs');
});

test('"7. Row sets" — the layout\'s "sets" with no count is not part of the name; a drop set keeps its word', () => {
  const rows = rowsOf(F.W1D_TIDY);
  assert.ok(rows.some((r) => r.name === 'Row'));
  assert.ok(!rows.some((r) => /sets$/i.test(r.name)));
  assert.equal(rowsOf('1. Curl Drop Sets 3 sets of 10 reps')[0].name, 'Curl Drop Sets');
});

test('the AI check: "15-15 reps" and "F-F reps" are two sets, "20-20-20-20-20 sec" five — read off the card, not made up', () => {
  assert.deepEqual(checkAiRewrite(F.W2E_CARD, F.W2E_TIDY, resolveKey), []);
  assert.ok(!checkAiRewrite(F.W4C_CARD, F.W4C_TIDY, resolveKey).some((p) => /wrote 5\b/.test(p)));
  /* A two-rung RANGE is still a range: "8-12 reps" written as 2 sets is made up. */
  assert.ok(checkAiRewrite('Curls\n8-12 reps', '1. Curls 2 sets of 8-12 reps', resolveKey).some((p) => /wrote 2\b/.test(p)));
});
