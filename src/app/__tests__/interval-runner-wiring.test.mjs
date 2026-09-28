import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
 * PO 2026-09-27: "On the active workout screen how would this work? Make it user friendly and easy to use.
 * Simple and straightforward." — "Yes" to one Start timer button and a full-screen run. The order of play is
 * tested in `domain/workout/__tests__/interval-plan.test.mjs`; this pins the wiring, which lives in route and
 * component files.
 */
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const WORKOUT = read('../workout.tsx');
const RUNNER = read('../../components/workout/IntervalRunner.tsx');
const ROWS = read('../../lib/workout-template-rows.ts');
const TEMPLATES = read('../../data/templates-live.ts');

test('Start timer shows only for a workout of timed moves, and opens the runner', () => {
  assert.match(WORKOUT, /\{canRunIntervals\(session\.exercises\) \? \(\s*<Pressable\s*onPress=\{\(\) => setIntervalsOpen\(true\)\}/);
  assert.match(WORKOUT, /accessibilityLabel="Start timer"/);
  assert.match(WORKOUT, /\{intervalsOpen \? \(\s*<IntervalRunner/);
});

test('a finished interval is logged quietly — no rest overlay, toast or seal between moves', () => {
  const fn = WORKOUT.match(/const logIntervalSet = [\s\S]*?;\r?\n/)?.[0] ?? '';
  assert.match(fn, /done: true, durationSec: sec/);
  assert.doesNotMatch(fn, /completeSet|startRest|showToast/);
});

test('the runner logs WORK steps only, and Skip logs nothing', () => {
  assert.match(RUNNER, /if \(s\.kind === 'work'\) \{\s*onLogSet\(s\.ei, s\.si, s\.sec\);/);
  const skip = RUNNER.match(/const skip = \(\) => \{[\s\S]*?\n  \};/)?.[0] ?? '';
  assert.ok(skip, 'skip handler found');
  assert.doesNotMatch(skip, /onLogSet/);
});

test('the screen stays awake while it runs, and the ding is unlocked inside the Start tap', () => {
  assert.match(RUNNER, /activateKeepAwakeAsync\('interval-runner'\)/);
  assert.match(RUNNER, /deactivateKeepAwake\('interval-runner'\)/);
  assert.match(RUNNER, /const start = \(\) => \{\s*primeDing\(\);/);
});

test('the rest after a move survives save, read-back and start', () => {
  assert.match(ROWS, /restAfterSec: x\.kind === 'cardio' \? null : \(x\.restAfterSec \?\? null\)/);
  assert.match(TEMPLATES, /restAfterSec: e\.restAfterSec == null \? null : Number\(e\.restAfterSec\)/);
  assert.match(WORKOUT, /\.\.\.\(e\.restAfterSec != null \? \{ restAfterSec: e\.restAfterSec \} : null\)/);
});
