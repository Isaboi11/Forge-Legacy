/**
 * program-gear-gap.test.mjs — the Program screen tells you what your gym cannot do, before you start.
 *
 * ══ WHY THIS IS A SOURCE GUARD ══
 *
 * `programGymCoverage` was correct, tested, and called in exactly ONE place: an onboarding card. The
 * Program screen — where an athlete actually browses to a program and taps Start — never called it. So
 * the data was right and the athlete was never told, which is the same failure as not having the data.
 *
 * That is not detectable by `tsc`, by lint, or by any test of the domain layer, because nothing is
 * broken: a function simply isn't called. It is the same shape as the "Save this day as a template"
 * defect, where a sheet lived in the wrong render branch and the button set state nothing rendered.
 *
 * The behavioural half below is what makes the guard mean something — a screen that calls the function
 * and renders a gap of zero would pass a source check alone.
 *
 * ⚠ This reads ONE NAMED FILE rather than grepping the repo, deliberately. A source guard that searches
 * for a string it must also SAY will match itself — `svg-gradient-stops.test.mjs` did exactly that and
 * failed on every run from the day it was committed.
 *
 * Run:  node --test src/app/__tests__/program-gear-gap.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { canDoExercise } from '../../domain/home-gym/equipment.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCREEN = readFileSync(join(HERE, '..', 'program', '[id].tsx'), 'utf8');

// ── the wiring ──────────────────────────────────────────────────────────────

/**
 * The first draft of this asserted `/fetchHomeGym/` and did not bite: deleting the IMPORT left the call
 * behind, so the regex still matched a file that no longer compiled. Weak, and worth recording — the
 * fix is to assert the profile is CALLED FOR and WRITTEN TO STATE, which is what a removal really takes
 * out. (`tsc` would have caught the import case; a guard that only passes because another gate exists is
 * not doing its job.)
 */
test('the Program screen reads the athlete’s gym into state and computes coverage', () => {
  assert.match(SCREEN, /fetchHomeGym\(\)/, 'the screen never calls for the gear profile');
  assert.match(SCREEN, /setHomeGym\(/, 'the profile is fetched but never kept, so nothing can read it');
  assert.match(SCREEN, /programGymCoverage/, 'the screen never computes coverage');
});

test('coverage is computed from the SOURCE DEFINITION, so an adopted program is covered too', () => {
  // Keying off `previewDef` would warn only while browsing and go silent the moment they pressed Start —
  // which is the half of the problem that is easiest to ship and hardest to notice.
  assert.match(
    SCREEN,
    /programGymCoverage\(sourceDefId/,
    'coverage must key off sourceDefId, not previewDef — a gym changes after a program is started',
  );
});

test('the gap is actually rendered, not merely calculated', () => {
  assert.match(SCREEN, /\{gearGap \?/, 'gearGap is computed but never rendered');
  assert.match(SCREEN, /styles\.gearGap/, 'the gap line has no style, so it was never added to the tree');
  assert.match(SCREEN, /gearGap: \{/, 'styles.gearGap is referenced but not defined');
});

/**
 * Shown ONLY when a profile exists AND something is missing — the same rule the onboarding card follows.
 * A screen that says "your gym covers 40 of 40" every time is noise, and one that says anything at all
 * to an athlete who never built a gym is inventing a problem out of a null.
 */
test('the gap is suppressed when there is no profile, or nothing is missing', () => {
  assert.match(
    SCREEN,
    /coverage\.total > 0 && coverage\.doable < coverage\.total/,
    'the gap must be withheld unless something is genuinely missing',
  );
});

// ── the behaviour that makes the guard worth having ─────────────────────────

const EXERCISES = JSON.parse(
  readFileSync(join(HERE, '..', '..', 'domain', 'exercise-relationships', 'source', 'exercises.json'), 'utf8'),
);
const equipById = new Map(EXERCISES.map((e) => [e.id, e.equipmentId]));
const CQ = JSON.parse(
  readFileSync(join(HERE, '..', '..', 'domain', 'training', 'programs', 'close-quarters-6day.json'), 'utf8'),
);
const KEYS = [...new Set(CQ.blocks.flatMap((b) => b.workouts).flatMap((w) => w.main).map((x) => x.catalogKey))];
const trainable = (owned) =>
  KEYS.filter((k) => canDoExercise({ key: k, equipId: equipById.get(k) }, owned)).length;

/**
 * Close Quarters is the program that exposed all of this: dumbbells-only on paper, twelve prescriptions
 * needing a bench, and every one of them passing every home check the app had.
 */
test('a dumbbells-only athlete is told the truth about Close Quarters', () => {
  const withDumbbells = trainable(['dumbbells']);
  assert.ok(withDumbbells < KEYS.length, 'a benchless athlete is being told they can train all of it');
  assert.ok(withDumbbells > 0, 'a dumbbell owner should still be able to train most of a dumbbell program');
  assert.equal(trainable(['dumbbells', 'bench']), KEYS.length, 'dumbbells and a bench must cover all of it');
});

test('the missing movements are the bench ones, not an arbitrary set', () => {
  const blocked = KEYS.filter((k) => !canDoExercise({ key: k, equipId: equipById.get(k) }, ['dumbbells']));
  // Every blocked movement must be blocked FOR THE BENCH — adding a bench resolves all of them.
  const stillBlocked = blocked.filter((k) => !canDoExercise({ key: k, equipId: equipById.get(k) }, ['dumbbells', 'bench']));
  assert.deepEqual(stillBlocked, [], 'something is blocked for a reason other than the bench');
});
