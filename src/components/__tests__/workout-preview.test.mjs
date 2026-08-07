/**
 * workout-preview.test.mjs — the preview shows the day; it does not start it, and it does not
 * re-describe it.
 *
 * ══ THE TWO THINGS THAT COULD GO WRONG ══
 *
 * **1. Looking becomes committing.** Starting a workout from Home writes a launch intent
 * (`writeWorkoutLaunch`) and seeds the session (`startWorkout`), in that order, and the logger reads a
 * launch arriving on top of unfinished work as a conflict. A preview that reached for either would
 * become a SECOND start path that behaves subtly differently from the first — and the failure would be
 * invisible until an athlete opened a preview on top of a half-finished session. The sheet takes an
 * `onStart` callback and nothing else; Home hands it the identical `startHomeWorkout` its own button
 * uses.
 *
 * **2. The preview and the logger disagree about the day.** Both must read a prescription through the
 * SAME `schemeText` / `deriveBlocks`. Hand-rolling "4 × 8" in the sheet is the tempting shortcut, and it
 * is how "4 × 8" here and "4 × 8-12" in the logger become two answers to one question — exactly the
 * class of drift that lost Full Frame its rep ranges and every program its per-side prescriptions.
 *
 * Run:  node --test src/components/__tests__/workout-preview.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const sheet = readFileSync(join(HERE, '..', 'forge', 'WorkoutPreviewSheet.tsx'), 'utf8');
/** Comments explain the forbidden things by name, so only code is scanned. */
const code = sheet.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

test('the preview cannot start a workout by itself', () => {
  for (const forbidden of ['writeWorkoutLaunch', 'startWorkout', 'router.push', 'useRouter']) {
    assert.doesNotMatch(
      code,
      new RegExp(forbidden.replace('.', '\\.')),
      `WorkoutPreviewSheet reaches for ${forbidden} — starting is the caller's job, via onStart`,
    );
  }
});

test('the preview reads a prescription the same way the logger does', () => {
  assert.match(code, /from '@\/domain\/program\/prescription'/, 'must use the shared prescription module');
  /*
   * ⚠ CALLED, not merely imported. The first draft matched `\bschemeText\b`, which the IMPORT LINE
   * satisfies — so deleting the call and hand-rolling the list left the guard green. Verified by
   * mutation: replacing `deriveBlocks(main)` with a literal now turns this red.
   */
  for (const fn of ['schemeText', 'deriveBlocks']) {
    assert.match(code, new RegExp(`\\b${fn}\\(`), `${fn} must be CALLED, not just imported`);
  }
  // No hand-rolled scheme formatting. The multiplication sign is `schemeText`'s to write.
  assert.doesNotMatch(code, /`\$\{[^}]*\}\s*×/, 'a hand-built "N × M" string bypasses schemeText');
});

test('the summary describes what the sheet draws, and the sheet does not compute it', () => {
  /*
   * "6 EXERCISES · 19 SETS" over a day showing eight movement names. `main.length` counted the three
   * stations of the Engine circuit as peers of the three lifts and excluded the two warm-up rows, so it
   * matched neither the rows above it nor the rows below it; the 19 folded the circuit's 3 × 3 into a
   * set count that appears nowhere on the card. The rules moved to `sessionSummary`, where they are
   * unit-tested against the real Squat & Sled day — and they stay there.
   */
  assert.match(code, /\bsessionSummary\(/, 'sessionSummary must be CALLED, not just imported');
  assert.doesNotMatch(code, /main\.length/, 'the array length is not the number of exercises the athlete sees');
  assert.doesNotMatch(code, /plannedSetCount/, 'volume is not a description — it counts a circuit twice over');
});

test('Start Workout is the only action with a button around it', () => {
  /*
   * Three peer buttons asked an inspection sheet for a scheduling decision. Skipping WRITES to the
   * program's schedule and now lives in Program Detail, which "Choose another workout" opens.
   */
  assert.doesNotMatch(code, /onSkip/, 'skip is not offered a tap away from "I just wanted to look"');
  assert.equal((code.match(/<Button\b/g) ?? []).length, 1, 'exactly one Button — the primary');
  assert.doesNotMatch(
    /* The secondary must not be a second bordered pill; borders are what made the three read as peers. */
    /altBtn:\s*\{[^}]*\}/.exec(sheet)?.[0] ?? '',
    /borderWidth/,
    'the secondary action is borderless, or it is a second button',
  );
});

test('a circuit is drawn as one block, not as loose neighbours', () => {
  // `deriveBlocks` groups by ADJACENCY; rendering its output flat would show a four-round finisher as
  // three unrelated exercises and lose the round count entirely.
  assert.match(code, /blockRoundsText|isAmrap/, 'a grouped block must state its rounds or its clock');
});

test('Home offers the preview only where there is an authored day to show', () => {
  const home = readFileSync(join(HERE, '..', '..', 'app', '(tabs)', 'index.tsx'), 'utf8');
  const onPreview = /onPreview=\{([^}]*)\}/.exec(home)?.[1] ?? '';
  assert.ok(onPreview.length, 'Home no longer passes onPreview at all');
  assert.match(
    onPreview,
    /plannedDay/,
    'onPreview must be gated on there being a planned day — the resume and open faces have none',
  );
});
