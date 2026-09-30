/**
 * programs-library-lows-0926.test.mjs — the QA 09-26 low pass on programs, builders and the library.
 * Source-level wiring checks: each one pins the regression, not the exact copy around it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('library-19: Back on an edited template compares against what was loaded', () => {
  const src = read('../workout-builder.tsx');
  assert.match(src, /withWorkoutBaseline\(hydrate\(/, 'the server read must stamp a baseline');
  assert.match(src, /workoutDraftIsDirty\(draft\)\) setConfirmLeave\(true\)/, 'Back must ask only when something changed');
  assert.match(src, /editing \? 'Save changes' : 'Save for later'/);
});

test('library-20: the week builder checklist names a week', () => {
  assert.match(read('../program-builder.tsx'), /<CheckRow ok=\{nameOk\} label=\{isWeek \? 'Week name' : 'Program name'\} \/>/);
});

test('programs-17: the day menu confirms before writing over a day that holds exercises', () => {
  const src = read('../program-builder.tsx');
  assert.match(src, /setPendingDayOp\(\{\s*kind: 'copy'/);
  assert.match(src, /setPendingDayOp\(\{ kind: 'clear'/);
});

test('programs-19: What\'s next never names a program nobody wrote', () => {
  const src = read('../program/[id].tsx');
  assert.doesNotMatch(src, /isn't written yet/);
  assert.match(src, /nextAfter\(def\.id\)\.kind !== 'program'/, '"What this builds" filters an unwritten successor');
});

test('programs-23: SectionHeader draws its own chevron, so no action label carries one', () => {
  assert.doesNotMatch(read('../(tabs)/workouts.tsx'), /action="[^"]*›"|'All Sessions ›'/);
});

test('programs-31: the share sheet states what it sends, and its body cap follows the screen', () => {
  const src = read('../../components/forge/compositions/ShareSheet/ShareSheet.tsx');
  assert.doesNotMatch(src, /not wired yet/);
  assert.match(src, /Math\.min\(440, windowHeight \* 0\.5\)/);
});

test('library-30: home gym can go back to "not set up" (null), not just empty', () => {
  assert.match(read('../../data/home-gym-live.ts'), /home_gym_equipment: null/);
  assert.match(read('../home-gym.tsx'), /clearHomeGym\(\)/);
});
