/**
 * Launch QA 11-08 — H21 (a Treadmill Run template started as an Outdoor Run with GPS) and H22 (starting a template
 * or a program day on weak signal opened an empty Freestyle session, in silence).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const logger = read('../workout.tsx');

test('H21 — a template keeps where its cardio is done, and the logger reads it through the model', () => {
  assert.match(read('../../lib/workout-template-rows.ts'), /\.\.\.\(x\.kind === 'cardio' && x\.modality \? \{ modality: x\.modality \} : null\)/);
  assert.match(logger, /modality: resolveModality\(act, e\.modality\),/);
  assert.equal(/modality: e\.modality \?\? 'outdoor'/.test(logger), false);
  assert.match(read('../workout-builder.tsx'), /resolveModality\(activityFromKey\(e\.catalogKey\) \?\? 'run', e\.modality \?\? null\)/);
});

test('H22 — every template launch carries its rows as the fallback, and the logger uses them on a failed read', () => {
  for (const f of ['../template/[id].tsx', '../templates.tsx']) assert.match(read(f), /templateFallback: t\.exercises/, f);
  assert.match(read('../workout-builder.tsx'), /templateFallback: toTemplateExercises\(draft\)/);
  assert.match(logger, /launch\.templateFallback\?\.length\n\s+\? \{ id: launch\.templateId, name: launch\.workoutName \?\? 'Workout', exercises: launch\.templateFallback \}/);
});

test('H22 — when there is nothing to build from, the athlete is told', () => {
  assert.match(logger, /Couldn’t load that template/);
  assert.match(logger, /if \(!fresh && launch\?\.programId\) showToast\('Couldn’t load your program day/);
});
