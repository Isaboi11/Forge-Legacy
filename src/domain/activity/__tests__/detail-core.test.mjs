import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ordinalLine,
  pacePer,
  programTag,
  sectionsOf,
  setLine,
  statTiles,
  summaryLine,
  whenLine,
} from '../detail-core.ts';

const set = (i, weight, reps, unit = 'lbs') => ({ setIndex: i, weight, weightUnit: unit, reps, durationSec: null });
/** A set measured by the clock: no reps at all, seconds instead. `weight` for a loaded carry. */
const held = (i, sec, weight = null, unit = 'lbs') => ({ setIndex: i, weight, weightUnit: unit, reps: null, durationSec: sec });
const exercise = (name, section, sets) => ({ name, section, catalogKey: null, equip: null, sets });

const detail = (over = {}) => ({
  id: 'w1',
  type: 'strength',
  title: 'Leg Day A',
  startedAt: '2026-06-10T17:12:00Z',
  durationSec: 3600,
  distance: null,
  distanceUnit: null,
  exercises: [exercise('Back Squat', 'main', [set(0, 315, 5), set(1, 335, 3)])],
  chapterName: 'Chapter I — Building Your Foundation',
  programId: null,
  programName: null,
  partners: [],
  milestones: [],
  ordinal: 12,
  ...over,
});

// ── hero ────────────────────────────────────────────────────────────────────

test('the program tag names the program, or says the session was free', () => {
  assert.equal(programTag(detail({ programName: 'Winter Block' })), 'Winter Block');
  assert.equal(programTag(detail({ programName: null })), 'Free Session');
  assert.equal(programTag(detail({ type: 'running', programName: null })), 'Run', 'cardio shows its type');
});

test('the strength summary counts real exercises and sets', () => {
  assert.equal(summaryLine(detail()), '1 hr · 1 exercise · 2 sets');
});

test('a strength session with nothing logged degrades to the duration alone', () => {
  assert.equal(summaryLine(detail({ exercises: [] })), '1 hr', 'no "0 exercises · 0 sets"');
});

test('cardio summarises with its distance, in the unit it was stored in', () => {
  assert.equal(summaryLine(detail({ type: 'running', distance: 5.25, distanceUnit: 'mi' })), '1 hr · 5.3 mi');
  assert.equal(summaryLine(detail({ type: 'cycling', distance: null })), '1 hr', 'no distance, no claim');
});

test('the when line uses the real logged time', () => {
  const line = whenLine('2026-06-10T17:12:00Z');
  assert.ok(line.includes('June 10'), line);
  assert.ok(/\d{1,2}:\d{2}\s?(AM|PM)/i.test(line), `expected a clock time in: ${line}`);
  assert.equal(whenLine('nonsense'), '', 'a broken timestamp renders nothing');
});

test('strength and other sessions are numbered separately, with the chapter shortened', () => {
  assert.equal(ordinalLine(detail()), 'Workout #12 · Chapter I');
  assert.equal(ordinalLine(detail({ type: 'running', ordinal: 3 })), 'Session #3 · Chapter I');
  assert.equal(ordinalLine(detail({ chapterName: null })), 'Workout #12', 'no chapter, no separator');
});

// ── strength body ───────────────────────────────────────────────────────────

test('sections come out in order and empty ones are dropped', () => {
  const d = detail({
    exercises: [
      exercise('Squat', 'main', [set(0, 225, 5)]),
      exercise('Bike', 'warmup', [set(0, null, null)]),
    ],
  });
  assert.deepEqual(sectionsOf(d).map((s) => s.label), ['Warm-up', 'Main Workout']);
  assert.deepEqual(sectionsOf(d)[0].exercises.map((e) => e.name), ['Bike']);
  assert.equal(sectionsOf(detail({ exercises: [] })).length, 0);
});

test('a set renders only what was actually recorded', () => {
  assert.equal(setLine(set(0, 225, 5)), '225 lbs × 5');
  assert.equal(setLine(set(0, null, 12)), '12 reps', 'no weight entered reads as reps, not "0 lbs"');
  assert.equal(setLine(set(0, 225, null)), '225 lbs × —', 'a missing rep count is a dash, not a guess');
  assert.equal(setLine(set(0, null, null)), '');
  assert.equal(setLine(set(0, 100, 5, 'kg')), '100 kg × 5', 'the stored unit is respected');
});

test('0 lb is BODYWEIGHT, and it is not the same fact as no weight at all', () => {
  // The athlete tapped BW: they said this set carried nothing. That is an answer, and it renders.
  assert.equal(setLine(set(0, 0, 12)), 'BW × 12');
  // Nothing entered is NOT a claim that the set was bodyweight — a warm-up with an empty bar is not
  // a bodyweight set, and the app must not decide that it was.
  assert.equal(setLine(set(0, null, 12)), '12 reps');
  assert.equal(setLine(set(0, 0, null)), '', 'BW with no rep count says nothing, and says it honestly');
});

/**
 * ⚠ A HOLD HAS NO REPS BY CONSTRUCTION, so every arm of `setLine` used to fall through to `''` and an
 * athlete's forty-five second plank appeared in their history as a name with an empty line under it.
 * (Before that it was worse: the set carried a fabricated `reps: 10` and read as "10 reps".)
 */
test('a hold is read in seconds, and reads first', () => {
  assert.equal(setLine(held(0, 45)), '45s');
  assert.equal(setLine(held(0, 90)), '1m 30s');
  assert.equal(setLine(held(0, 40, 70)), '70 lbs × 40s', 'a loaded carry keeps both halves');
  assert.equal(setLine(held(0, 60, 0)), 'BW × 1m', 'BW is still an answer when the set is timed');
  // Zero is not a hold — a set that recorded nothing must not claim "0s".
  assert.equal(setLine(held(0, 0)), '');
  assert.equal(setLine(held(0, null)), '');
});

// ── non-strength body ───────────────────────────────────────────────────────

test('pace needs both halves to be real', () => {
  assert.equal(pacePer(5, 3000, 'mi'), '10:00 /mi');
  assert.equal(pacePer(3.1, 1800, 'mi'), '9:41 /mi');
  assert.equal(pacePer(null, 3000, 'mi'), null);
  assert.equal(pacePer(5, null, 'mi'), null, 'no duration, no pace');
  assert.equal(pacePer(0, 3000, 'mi'), null, 'never divides by zero');
});

test('pace rounds 59.6s up to the next minute rather than showing ":60"', () => {
  assert.equal(pacePer(1, 599.7, 'mi'), '10:00 /mi');
});

test('stat tiles only include what the session actually recorded', () => {
  const run = statTiles(detail({ type: 'running', distance: 5, distanceUnit: 'mi', durationSec: 3000 }));
  assert.deepEqual(run.map((t) => t.label), ['Distance', 'Avg Pace', 'Duration']);
  assert.equal(run[0].value, '5 mi');

  const noDistance = statTiles(detail({ type: 'mobility', distance: null }));
  assert.deepEqual(noDistance.map((t) => t.label), ['Duration'], 'no empty Distance tile');
});

test('a distance with no duration still shows distance, just no pace', () => {
  const t = statTiles(detail({ type: 'walking', distance: 2, distanceUnit: 'mi', durationSec: null }));
  assert.deepEqual(t.map((x) => x.label), ['Distance', 'Duration']);
  assert.equal(t[1].value, '—');
});
