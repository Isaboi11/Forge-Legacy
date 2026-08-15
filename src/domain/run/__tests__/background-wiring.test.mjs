/**
 * background-wiring.test.mjs — the four things background GPS needs, none of which any other gate checks.
 *
 * PO: *"Will this TestFlight app now do GPS without having the screen on?"*
 *
 * ══ WHY A SOURCE GUARD ══
 *
 * Background location is four separate facts in four separate files, and removing ANY of them leaves a
 * project that compiles, lints, passes every test and silently stops measuring the moment the screen
 * locks — the exact failure being fixed. There is no runtime to assert against: `TaskManager` needs a
 * device, and the config is consumed by a native build this repo cannot run.
 *
 * The failure mode is specifically a QUIET one. A run that ends early looks like a run, with a plausible
 * distance on it. Nobody files that as a bug for weeks.
 *
 * ⚠ Reads named files rather than grepping the repo — a guard that searches for a string it must also
 * SAY will match itself (`svg-gradient-stops.test.mjs` did, and failed from the day it was committed).
 *
 * Run:  node --test src/domain/run/__tests__/background-wiring.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const read = (...p) => readFileSync(join(ROOT, ...p), 'utf8');

const APP = JSON.parse(read('app.json')).expo;
const PKG = JSON.parse(read('package.json'));
const LAYOUT = read('src', 'app', '_layout.tsx');
const TRACKER = read('src', 'hooks', 'useRunTracker.ts');

// ── 1 · the native capability ───────────────────────────────────────────────

test('⚠ iOS declares the location background mode', () => {
  // Without this the OS suspends the app on lock and never delivers another fix. It is also the single
  // line that makes the whole feature a NEW BUILD rather than an OTA.
  assert.deepEqual(APP.ios?.infoPlist?.UIBackgroundModes, ['location']);
});

test('and asks for the permission that background tracking actually requires', () => {
  // "When in use" is not enough: iOS needs Always for updates delivered with the app suspended.
  assert.ok(APP.ios?.infoPlist?.NSLocationAlwaysAndWhenInUseUsageDescription?.length > 40, 'the Always prompt needs a real reason, not a placeholder');
});

test('expo-location is configured for background on both platforms', () => {
  const plugin = APP.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-location');
  assert.ok(plugin, 'the expo-location plugin entry is gone');
  assert.equal(plugin[1].isIosBackgroundLocationEnabled, true);
  assert.equal(plugin[1].isAndroidBackgroundLocationEnabled, true);
  assert.equal(plugin[1].isAndroidForegroundServiceEnabled, true, 'Android kills a location service with no foreground service');
  assert.ok(plugin[1].locationAlwaysAndWhenInUsePermission?.length > 40);
});

test('Android has the background and foreground-service-location permissions', () => {
  const perms = APP.android.permissions;
  assert.ok(perms.includes('android.permission.ACCESS_BACKGROUND_LOCATION'));
  assert.ok(perms.includes('android.permission.FOREGROUND_SERVICE_LOCATION'), 'Android 14+ refuses a location service without its typed permission');
});

test('expo-task-manager is a dependency — the task cannot be defined without it', () => {
  assert.ok(PKG.dependencies['expo-task-manager'], 'background location is delivered through TaskManager');
});

// ── 2 · the task is registered before anything is delivered ─────────────────

test('⚠ the task module is imported at the ROOT for its side effect', () => {
  // After a cold background launch there is no mounted component to register from, so this cannot move
  // into an effect. Deleting the line breaks nothing that any other gate can see.
  assert.match(LAYOUT, /import '@\/domain\/run\/background-task'/, 'defineTask never runs, so the OS delivers batches to nothing');
});

// ── 3 · the buffer becomes distance, through the ONE rule ───────────────────

test('the tracker drains the buffer when the app comes back', () => {
  assert.match(TRACKER, /AppState\.addEventListener/, 'nothing notices the app returning to the foreground');
  assert.match(TRACKER, /drainBackgroundFixes\(\)/, 'the buffered fixes are never read');
});

test('and drains it again on stop, so ending a backgrounded run keeps its miles', () => {
  const stop = TRACKER.match(/const stop = useCallback\([\s\S]*?\n  \}, \[/);
  assert.ok(stop, 'stop() is no longer a useCallback — move this assertion with it');
  assert.match(stop[0], /drainBackgroundFixes/, 'a run ended while backgrounded would report only its watched miles');
});

/*
 * ══ ⚠ DRAINING IS NOT ENOUGH — THE ANSWER HAS TO REACH THE FORM ══
 *
 * `stop()` drained correctly and still lost the miles, because it did it in the background and returned
 * void. The log form was seeded from the render's `track`, one tick before the buffered tail landed — so
 * the last stretch before pressing End, which on a pocketed phone is most of the run, arrived just after
 * the number it belonged to had already been written down.
 *
 * A drain nobody waits for is a drain nobody reads. These two are what make it arrive in time, and
 * neither is visible to a type-check: `stop()` returning a promise nobody awaits compiles perfectly.
 */
test('⚠ stop() hands the finished track BACK, rather than draining into the void', () => {
  const stop = TRACKER.match(/const stop = useCallback\([\s\S]*?\n  \}, \[/);
  assert.match(stop[0], /await drainBackgroundFixes\(\)/, 'the drain must be awaited, not fired off');
  assert.match(stop[0], /return finished/, 'and what it produced must be returned to the caller');
});

test('⚠ the card AWAITS the end of the run before reading its distance', () => {
  const CARD = read('src', 'components', 'workout', 'CardioBlockCard.tsx');
  const end = CARD.match(/const endBout = async \(\) => \{[\s\S]*?\n  \};/);
  assert.ok(end, 'endBout() is gone — the End button is reading a distance from somewhere else again');
  const awaitAt = end[0].indexOf('await tracker.stop()');
  const openAt = end[0].indexOf('openLog(');
  assert.ok(awaitAt > -1, 'the bout must end through the awaited stop()');
  assert.ok(openAt > awaitAt, 'the form is seeded BEFORE the run finished measuring');
  assert.match(end[0], /totalMiles\(finished\)/, 'the distance must come from the finished track, not from a render value');
});

test('a second bout starts from zero rather than continuing the last one', () => {
  // stop() deliberately leaves the track standing so the finished run can still be read off the card,
  // which means start() is the only place that can clear it. Without this, ending a run and pressing
  // Start again — which the card offers as soon as the log form is cancelled — resumed the old mileage.
  const start = TRACKER.match(/const start = useCallback\([\s\S]*?\n  \}, \[/);
  assert.ok(start, 'start() is no longer a useCallback — move this assertion with it');
  assert.match(start[0], /commit\(\[\]\)/, 'the track carries over into the next bout');
  assert.match(start[0], /setElapsedSec\(0\)/, 'so does the clock');
});

test('⚠ buffered fixes go through acceptFix, not their own arithmetic', () => {
  // Two distance rules is how the watched and unwatched halves of one run start to disagree about what
  // a jitter is. `applyFixes` folds them through the same accept path the live watcher uses.
  assert.match(TRACKER, /const applyFixes = [\s\S]{0,200}?acceptFix\(/, 'the background segment has grown its own distance maths');
});

test('a new run does not inherit the last one’s buffered tail', () => {
  assert.match(TRACKER, /clearBackgroundFixes\(\)/, 'a run the app was killed during would add its leftovers to the next one');
});
