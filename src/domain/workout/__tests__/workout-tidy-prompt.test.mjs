import '../../../data/__tests__/harness/hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
 * The example in `workout-tidy`'s prompt IS the layout the model copies. If the example did not read cleanly, or
 * would fail the device's own check, every tidy would be taught to fail. This keeps the prompt and the reader in
 * step: edit either, and this says so.
 */

const { readWrittenWorkout, writtenToTemplate } = await import('../written-workout.ts');
const { checkAiRewrite, whenToUseAi } = await import('../workout-ai-gate.ts');
const { resolveExerciseName } = await import('../../exercise-picker/data.ts');
const resolveKey = (n) => resolveExerciseName(n)?.key;

const fn = readFileSync(new URL('../../../../supabase/functions/workout-tidy/index.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const between = (tag) => new RegExp(String.raw`<!-- ${tag} -->\n([\s\S]*?)\n<!-- /${tag} -->`).exec(fn)[1];
const CARD = between('EXAMPLE CARD');
const REWRITE = between('EXAMPLE REWRITE');

test('the example rewrite reads cleanly: every line read, every lift in the library, reps on every lift', () => {
  const w = readWrittenWorkout(REWRITE);
  const rows = writtenToTemplate(w, resolveKey);
  assert.deepEqual(w.unread, []);
  assert.equal(rows.filter((r) => r.section !== 'warmup').length, 6);
  for (const r of rows) assert.ok(r.catalogKey, `${r.name} is in the library`);
  assert.equal(whenToUseAi(REWRITE, w, rows).kind, 'rules', 'the layout never needs AI itself');
});

test('the example rewrite passes the device check against its own card', () => {
  assert.deepEqual(checkAiRewrite(CARD, REWRITE, resolveKey), []);
});

test('the example reads to the right numbers: 75% single set, 3-6 chin-ups, 2:00 rests, a three-way superset', () => {
  const rows = writtenToTemplate(readWrittenWorkout(REWRITE), resolveKey);
  const main = rows.filter((r) => r.section !== 'warmup');
  assert.deepEqual(main.map((r) => [r.sets, r.targetReps, r.percentOfMax ?? null]).slice(0, 3), [[1, 3, 75], [1, 3, 75], [5, 3, null]]);
  assert.equal(main[2].repsMax, 6);
  assert.equal(main[2].restSec, 120);
  assert.equal(new Set(main.slice(3).map((r) => r.groupId)).size, 1);
  assert.deepEqual(rows.filter((r) => r.section === 'warmup').map((r) => r.percentScheme), [[55, 67], [55, 67]]);
});

test('the prompt holds nothing that varies per request (it is cached)', () => {
  const system = /const SYSTEM = `([\s\S]*?)`;/.exec(fn)[1];
  assert.doesNotMatch(system, /\$\{/);
});
