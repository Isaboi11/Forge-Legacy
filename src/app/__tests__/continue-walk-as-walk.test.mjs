/**
 * Launch QA 11-08, H25 — "Continue this workout" brought a finished Outdoor Walk back as a LIFT (a sets table with
 * no Start, Add Set put reps on it): the rebuild set no `kind`, and the logger decides cardio by `kind === 'cardio'`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('a saved cardio row is rebuilt as a logged cardio block, its set still marked saved', () => {
  const src = readFileSync(new URL('../../data/continue-workout-live.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.match(src, /const act = activityFromKey\(ex\.catalog_key\);\n\s+if \(act\) \{/);
  assert.match(src, /kind: 'cardio',\n\s+activity: act,/);
  assert.match(src, /loggedModality: modality,/);
  // The sets are the same `saved: true` rows, so neither the append nor the save-apart path re-sends them.
  assert.match(src, /done: true,\n\s+saved: true,/);
});
