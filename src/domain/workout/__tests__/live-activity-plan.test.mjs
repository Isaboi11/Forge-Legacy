/**
 * live-activity-plan.test.mjs — the lock-screen card's content, lifecycle, and the Swift it has to match.
 *
 * `Docs/Live-Activities-Build-Plan.md`. Two halves:
 *
 *   1. The pure planner — what the card shows for each phase, when it starts, updates and ends, and the
 *      throttle that keeps a run from sending an update every few metres.
 *   2. ⚠ SOURCE GUARDS for the native half, which no machine in this project can compile. The attributes
 *      struct exists twice (module + widget target) and ActivityKit matches them by name and shape; if
 *      they drift, the card silently never renders. So the two files are compared as text, and every
 *      field is checked against `LiveActivityContent`, which is the protocol.
 *
 * Run:  node --test src/domain/workout/__tests__/live-activity-plan.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CLOCK_SLACK_MS,
  RUN_UPDATE_MIN_MS,
  chooseContent,
  planLiveActivity,
  runContent,
  sameContent,
  staleAtFor,
  strengthContent,
} from '../live-activity-plan.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
/** Read as LF: the working tree may be CRLF on Windows, the index is LF. */
const read = (...p) => readFileSync(join(ROOT, ...p), 'utf8').replace(/\r\n/g, '\n');

const NOW = Date.parse('2026-09-28T18:00:00.000Z');
const IDLE = { running: false, content: null, sentAtMs: 0 };

const active = {
  v: 1,
  phase: 'active',
  theme: 'forge',
  workoutName: 'Push A',
  exercise: 'Barbell Bench Press',
  setLabel: 'Set 3 of 5',
  target: '185 lb × 8',
  setsDone: 2,
  setsTotal: 5,
  exerciseIndex: 0,
  setIndex: 2,
};

const rest = {
  ...active,
  phase: 'rest',
  restEndsAt: NOW + 84_000,
  restRemainingSec: null,
  restTotalSec: 90,
  nextExercise: 'Barbell Bench Press',
  nextTarget: '185 lb × 8',
  exerciseComplete: false,
};

// ── content ─────────────────────────────────────────────────────────────────

test('idle shows nothing — and that is what keeps a cardio-only session off the strength card', () => {
  assert.equal(strengthContent({ v: 1, phase: 'idle', theme: 'forge' }), null);
});

test('active carries the finished display strings through untouched', () => {
  const c = strengthContent(active);
  assert.equal(c.phase, 'active');
  assert.equal(c.exercise, 'Barbell Bench Press');
  assert.equal(c.setLabel, 'Set 3 of 5');
  assert.equal(c.target, '185 lb × 8');
  assert.equal(c.setsDone, 2);
  assert.equal(c.setsTotal, 5);
  assert.equal(c.restEnd, undefined);
});

test('a running rest becomes a native timer window; its start is end minus the full rest', () => {
  const c = strengthContent(rest);
  assert.equal(c.phase, 'rest');
  assert.equal(c.restEnd, NOW + 84_000);
  assert.equal(c.restStart, NOW + 84_000 - 90_000);
  assert.equal(c.restPausedSec, undefined);
  assert.equal(c.nextExercise, 'Barbell Bench Press');
  assert.equal(staleAtFor(c), NOW + 84_000, 'the card goes stale by itself when the rest runs out');
});

test('a paused rest is static seconds and never goes stale on its own', () => {
  const c = strengthContent({ ...rest, restEndsAt: null, restRemainingSec: 65.4 });
  assert.equal(c.restPausedSec, 65);
  assert.equal(c.restEnd, undefined);
  assert.equal(staleAtFor(c), null);
});

test('finished is the summary only', () => {
  const c = strengthContent({ v: 1, phase: 'finished', theme: 'paper', workoutName: 'Push A', totalSets: 18, elapsedSec: 3130 });
  assert.deepEqual(c, { phase: 'finished', theme: 'paper', totalSets: 18, elapsedSec: 3130 });
});

const runSnap = (extra = {}) => ({
  kind: 'run',
  miles: 3.1234,
  elapsedSec: 1622.7,
  paceSecPerMi: 522,
  paused: false,
  autoPaused: false,
  metric: false,
  theme: 'forge',
  nowMs: NOW,
  ...extra,
});

test('a run: distance and pace in the athlete’s unit, and a clock origin the card counts up from', () => {
  const c = runContent(runSnap());
  assert.equal(c.phase, 'run');
  assert.equal(c.runLabel, 'Run');
  assert.equal(c.distance, '3.12');
  assert.equal(c.distanceUnit, 'mi');
  assert.equal(c.pace, '8:42');
  assert.equal(c.paceUnit, '/mi');
  assert.equal(c.clockStart, NOW - 1622 * 1000);
  assert.equal(c.clockPausedSec, undefined);
});

test('a run in kilometres converts both distance and pace', () => {
  const c = runContent(runSnap({ metric: true }));
  assert.equal(c.distance, (3.1234 * 1.609344).toFixed(2));
  assert.equal(c.distanceUnit, 'km');
  assert.equal(c.pace, '5:24'); // 522 s/mi ÷ 1.609344 = 324.4 s/km
  assert.equal(c.paceUnit, '/km');
});

test('a paused run freezes its clock and says which kind of pause', () => {
  const c = runContent(runSnap({ paused: true, autoPaused: true }));
  assert.equal(c.clockPausedSec, 1622);
  assert.equal(c.clockStart, undefined);
  assert.equal(c.autoPaused, true);
  assert.equal(c.pace, undefined, 'no pace while standing still');
});

test('a ride shows distance and time, not a pace', () => {
  const c = runContent(runSnap({ kind: 'bike' }));
  assert.equal(c.runLabel, 'Ride');
  assert.equal(c.pace, undefined);
});

test('a live run wins the card; when it ends the lifting comes back', () => {
  const s = strengthContent(active);
  const r = runContent(runSnap());
  assert.equal(chooseContent(s, r), r);
  assert.equal(chooseContent(s, null), s);
  assert.equal(chooseContent(null, null), null);
});

// ── lifecycle ───────────────────────────────────────────────────────────────

test('starts on the first thing worth showing, carrying the stale date for a rest', () => {
  const a = planLiveActivity(IDLE, strengthContent(rest), NOW);
  assert.equal(a.kind, 'start');
  assert.equal(a.staleAtMs, NOW + 84_000);
});

test('never starts a card only to say the workout is finished', () => {
  const fin = strengthContent({ v: 1, phase: 'finished', theme: 'forge', totalSets: 3, elapsedSec: 60 });
  assert.equal(planLiveActivity(IDLE, fin, NOW).kind, 'none');
  assert.equal(planLiveActivity(IDLE, null, NOW).kind, 'none');
});

test('an identical state is not sent twice (the screen re-renders every second during a rest)', () => {
  const c = strengthContent(rest);
  const sent = { running: true, content: c, sentAtMs: NOW };
  assert.equal(planLiveActivity(sent, strengthContent(rest), NOW + 1000).kind, 'none');
});

test('any strength change goes at once', () => {
  const sent = { running: true, content: strengthContent(active), sentAtMs: NOW };
  const a = planLiveActivity(sent, strengthContent(rest), NOW + 10);
  assert.equal(a.kind, 'update');
});

test('nothing left to show ends the card at once', () => {
  const sent = { running: true, content: strengthContent(active), sentAtMs: NOW };
  assert.deepEqual(planLiveActivity(sent, null, NOW), { kind: 'end', content: null, dismissAfterSec: 0 });
});

test('a run clock origin that only jittered is the same clock', () => {
  const a = runContent(runSnap());
  const b = runContent(runSnap({ nowMs: NOW + 999, elapsedSec: 1622.9 }));
  assert.ok(Math.abs(a.clockStart - b.clockStart) <= CLOCK_SLACK_MS);
  assert.ok(sameContent(a, b));
});

test('run numbers are throttled; a pause is not', () => {
  const first = runContent(runSnap());
  const sent = { running: true, content: first, sentAtMs: NOW };
  const further = runContent(runSnap({ miles: 3.14, nowMs: NOW + 2000, elapsedSec: 1624.7 }));
  assert.equal(planLiveActivity(sent, further, NOW + 2000).kind, 'none', 'held back: only the distance moved');
  const later = runContent(runSnap({ miles: 3.16, nowMs: NOW + RUN_UPDATE_MIN_MS, elapsedSec: 1622.7 + RUN_UPDATE_MIN_MS / 1000 }));
  assert.equal(planLiveActivity(sent, later, NOW + RUN_UPDATE_MIN_MS).kind, 'update');
  const paused = runContent(runSnap({ paused: true, nowMs: NOW + 1000 }));
  assert.equal(planLiveActivity(sent, paused, NOW + 1000).kind, 'update', 'a pause goes at once');
});

test('run → strength hand-back is an update, not a second card', () => {
  const sent = { running: true, content: runContent(runSnap()), sentAtMs: NOW };
  assert.equal(planLiveActivity(sent, strengthContent(active), NOW + 100).kind, 'update');
});

// ── ⚠ the native half, by source ────────────────────────────────────────────

const MODULE_ATTRS = ['modules', 'live-activity', 'ios', 'ForgeWorkoutAttributes.swift'];
const TARGET_ATTRS = ['targets', 'live-activity', 'ForgeWorkoutAttributes.swift'];

test('⚠ the attributes struct is byte-identical in the module and the widget target', () => {
  assert.equal(read(...MODULE_ATTRS), read(...TARGET_ATTRS), 'edit BOTH copies — a drift means the card never renders');
});

/** `var name: Type` lines inside `struct ContentState { … }`. */
function swiftStateFields(src) {
  const start = src.indexOf('struct ContentState');
  assert.ok(start >= 0, 'ContentState is gone');
  const body = src.slice(start, src.indexOf('\n  }\n', start));
  return Object.fromEntries([...body.matchAll(/var (\w+): ([\w?]+)/g)].map((m) => [m[1], m[2]]));
}

/** Field names inside `export interface LiveActivityContent { … }`. */
function tsContentFields(src) {
  const start = src.indexOf('export interface LiveActivityContent');
  const body = src.slice(start, src.indexOf('\n}\n', start));
  return Object.fromEntries([...body.matchAll(/^\s{2}(\w+)(\??):\s*([^;]+);/gm)].map((m) => [m[1], { optional: m[2] === '?', type: m[3] }]));
}

test('⚠ every ContentState field is in the TypeScript protocol and the other way round', () => {
  const swift = swiftStateFields(read(...MODULE_ATTRS));
  const ts = tsContentFields(read('src', 'domain', 'workout', 'live-activity-plan.ts'));
  assert.deepEqual(Object.keys(swift).sort(), Object.keys(ts).sort());
});

test('⚠ only `phase` is required in Swift — a newer phone must never break an older extension', () => {
  const swift = swiftStateFields(read(...MODULE_ATTRS));
  for (const [name, type] of Object.entries(swift)) {
    if (name === 'phase') assert.equal(type, 'String');
    else assert.ok(type.endsWith('?'), `${name} must be optional in Swift`);
  }
});

test('⚠ the Swift types can decode what TypeScript sends', () => {
  const swift = swiftStateFields(read(...MODULE_ATTRS));
  const ts = tsContentFields(read('src', 'domain', 'workout', 'live-activity-plan.ts'));
  const DATES = ['restStart', 'restEnd', 'clockStart']; // epoch ms ↔ .millisecondsSince1970
  for (const [name, { type }] of Object.entries(ts)) {
    const sw = swift[name].replace('?', '');
    if (DATES.includes(name)) assert.equal(sw, 'Date', `${name} is a date`);
    else if (type === 'number') assert.equal(sw, 'Int', `${name} is a whole number — keep it rounded in TS`);
    else if (type === 'boolean') assert.equal(sw, 'Bool', name);
    else assert.equal(sw, 'String', name);
  }
});

test('⚠ the module decodes dates as epoch milliseconds', () => {
  assert.match(read('modules', 'live-activity', 'ios', 'ForgeLiveActivityModule.swift'), /\.millisecondsSince1970/);
});

test('⚠ the widget target: widget type, its own App ID, and deployment target 16.4 — not the plugin default 18.0', () => {
  const require = createRequire(import.meta.url);
  const cfg = require(join(ROOT, 'targets', 'live-activity', 'expo-target.config.js'))({});
  assert.equal(cfg.type, 'widget');
  assert.equal(cfg.bundleIdentifier, '.liveactivity');
  assert.equal(cfg.deploymentTarget, '16.4');
  assert.equal(read('modules', 'live-activity', 'ios', 'ForgeLiveActivity.podspec').includes("{ :ios => '16.4' }"), true);
});

test('⚠ the main app declares NSSupportsLiveActivities (the plugin does not add it)', () => {
  const app = JSON.parse(read('app.json')).expo;
  assert.equal(app.ios.infoPlist.NSSupportsLiveActivities, true);
});

test('⚠ no root targets/_shared — it would link into the Watch too', () => {
  assert.equal(existsSync(join(ROOT, 'targets', '_shared')), false);
});

test('the TS bridge loads the module optionally, so web and build 9 stay inert', () => {
  const src = read('src', 'lib', 'live-activity.ts');
  assert.match(src, /requireOptionalNativeModule<LiveActivityModule>\('ForgeLiveActivity'\)/);
  assert.match(read('modules', 'live-activity', 'ios', 'ForgeLiveActivityModule.swift'), /Name\("ForgeLiveActivity"\)/);
  assert.ok(existsSync(join(ROOT, 'src', 'lib', 'live-activity.web.ts')), 'the web no-op is missing');
});
