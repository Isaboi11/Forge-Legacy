/**
 * Launch QA 11-08, H20 — a day Holt wrote from typed words showed a warm-up, a cool-down, supersets and cardio on
 * its card; "Start it now" and "Save for later" kept only the main lifts (`launchRowsFor` / `templateRowsFor`).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('both buttons convert the WHOLE day through the Workout Builder\'s converter', () => {
  const src = readFileSync(new URL('../../components/forge/CoachChatSheet.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.match(src, /saveTemplate\(built\.day\.name, toTemplateExercises\(dayAsDraft\(built\.day\)\)\)/);
  assert.match(src, /writeWorkoutLaunch\(\{ exercises: toTemplateExercises\(dayAsDraft\(built\.day\)\), workoutName: built\.day\.name \}\)/);
  assert.match(src, /const dayAsDraft = \(day: ProgramDay\) => \(\{ name: day\.name, warmup: day\.warmup \?\? \[\], main: day\.main, cooldown: day\.cooldown \?\? \[\], editId: null \}\);/);
});
