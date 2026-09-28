/**
 * cues.test.mjs — router steps into short spoken lines, and out-and-back built from half a loop.
 *
 * The steps below are shaped like ORS `segments[0].steps` (type codes, `name`, `way_points`), hand-made
 * for a one-block loop. ⚠ Replace with a real saved ORS response once the provider phase lands (§13).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { compactCues, cueSpeech, cueText, distanceWords, mergeCues, stepsToCues } from '../cues.ts';
import { outAndBack } from '../out-and-back.ts';
import { distM, prepareCourse } from '../geometry.ts';
import { HOME, legs } from './fixtures.mjs';

// Main St north 400 m → right onto Oak St → right onto Pine St → right onto Center St → home. 1,600 m.
const LOOP = legs(HOME, [['N', 400], ['E', 400], ['S', 400], ['W', 400]]);
const LOOP_STEPS = [
  { type: 11, name: 'Main Street', distance: 400, way_points: [0, 1] },
  { type: 1, name: 'Oak Street', distance: 400, way_points: [1, 2] },
  { type: 1, name: 'Pine Street', distance: 400, way_points: [2, 3] },
  { type: 1, name: 'Center Street', distance: 400, way_points: [3, 4] },
  { type: 10, name: '-', distance: 0, way_points: [4, 4] },
];

test('steps become cues at the turn, positioned by way-point, carrying the street they leave', () => {
  const cues = stepsToCues(LOOP_STEPS, prepareCourse(LOOP).cumM);
  assert.deepEqual(
    cues.map((c) => [c.atM, c.kind, c.street, c.from]),
    [
      [400, 'right', 'Oak Street', 'Main Street'],
      [800, 'right', 'Pine Street', 'Oak Street'],
      [1200, 'right', 'Center Street', 'Pine Street'],
    ],
  );
  // Depart and goal say nothing; the follower owns "course complete".
  assert.ok(!cues.some((c) => c.atM === 0 || c.atM === 1600));
});

test('drop rules: short straights, straight-on-the-same-street, nameless paths are null not "-"', () => {
  const cum = [0, 100, 120, 300, 340];
  const cues = stepsToCues(
    [
      { type: 11, name: 'Main Street', distance: 100, way_points: [0, 1] },
      { type: 6, name: 'Main Street', distance: 20, way_points: [1, 2] }, // short straight → dropped
      { type: 6, name: 'Main Street', distance: 180, way_points: [2, 3] }, // same street → dropped
      { type: 6, name: 'Canal Trail', distance: 40, way_points: [3, 4] }, // new street, long enough → kept
      { type: 0, name: '-', distance: 50, way_points: [4, 4] },
    ],
    cum,
  );
  assert.deepEqual(cues.map((c) => [c.atM, c.kind, c.street]), [
    [300, 'straight', 'Canal Trail'],
    [340, 'left', null],
  ]);
  assert.equal(cueSpeech(cues[1], 50, 'imperial'), 'In 150 feet, turn left.');
});

test('two turns under 20 m apart are one line; a third is never chained on', () => {
  const merged = mergeCues([
    { atM: 500, kind: 'left', street: 'Elm Street' },
    { atM: 512, kind: 'right', street: 'Pine Street' },
    { atM: 525, kind: 'left', street: 'Ash Street' },
  ]);
  assert.equal(merged.length, 2);
  assert.equal(cueText(merged[0]), 'Left, then right onto Pine Street');
  assert.equal(cueSpeech(merged[0], 50, 'imperial'), 'In 150 feet, turn left, then right onto Pine Street.');
  assert.equal(cueText(merged[1]), 'Left onto Ash Street');
});

test('imperial vs metric wording, rounded the way a person says it', () => {
  const cue = { atM: 0, kind: 'left', street: 'Oak Street' };
  assert.equal(cueSpeech(cue, 50, 'imperial'), 'In 150 feet, turn left onto Oak Street.');
  assert.equal(cueSpeech(cue, 50, 'metric'), 'In 50 meters, turn left onto Oak Street.');
  assert.equal(cueSpeech(cue, 4, 'metric'), 'Turn left onto Oak Street now.');
  assert.equal(distanceWords(122, 'imperial'), '400 feet');
  assert.equal(distanceWords(805, 'imperial'), '0.5 miles');
  assert.equal(distanceWords(1609.344, 'imperial'), '1 mile');
  assert.equal(distanceWords(26, 'metric'), '30 meters');
  assert.equal(distanceWords(1500, 'metric'), '1.5 kilometers');
  assert.equal(distanceWords(1000, 'metric'), '1 kilometer');
  assert.equal(
    cueSpeech({ atM: 0, kind: 'roundabout', street: 'Canyon Road', exit: 3 }, 100, 'metric'),
    'In 100 meters, at the roundabout, take the 3rd exit onto Canyon Road.',
  );
  assert.equal(cueText({ atM: 0, kind: 'slight-right', street: null }), 'Bear right');
});

test('stored cues drop `from` — it only exists for the out-and-back mirror', () => {
  const stored = compactCues(stepsToCues(LOOP_STEPS, prepareCourse(LOOP).cumM));
  assert.ok(stored.every((c) => !('from' in c)));
  assert.deepEqual(Object.keys(stored[0]).sort(), ['atM', 'kind', 'street']);
});

// ── out and back ──

test('out-and-back: half the loop, then the same half reversed, with the turns mirrored', () => {
  const raw = stepsToCues(LOOP_STEPS, prepareCourse(LOOP).cumM);
  const ob = outAndBack({ points: LOOP, cues: raw }, 1500);

  assert.ok(Math.abs(ob.lengthM - 1500) < 0.5, `length ${ob.lengthM}`);
  assert.ok(Math.abs(ob.turnM - 750) < 0.5);
  assert.ok(distM(ob.points[0], HOME) < 0.01 && distM(ob.points.at(-1), HOME) < 0.01, 'ends where it starts');
  // The turn is 350 m along Oak Street.
  assert.ok(Math.abs(distM(ob.points[2], LOOP[1]) - 350) < 0.5);

  assert.deepEqual(
    ob.cues.map((c) => [c.atM, c.kind, c.street]),
    [
      [400, 'right', 'Oak Street'],
      [750, 'turn-around', null],
      // Back down Oak and at the corner, LEFT — onto Main Street, the street the outbound turn left.
      [1100, 'left', 'Main Street'],
    ],
  );
  assert.equal(cueText(ob.cues[1]), 'Turn around here');
  assert.equal(cueSpeech(ob.cues[1], 50, 'imperial'), 'In 150 feet, turn around.');
  assert.equal(cueSpeech(ob.cues[2], 50, 'imperial'), 'In 150 feet, turn left onto Main Street.');
});

test('out-and-back mirrors a merged pair correctly because it mirrors BEFORE merging', () => {
  // Main St north 300, right onto Elm for 12 m, left onto Pine. Out-and-back of 1,000 m cuts on Pine.
  const pts = legs(HOME, [['N', 300], ['E', 12], ['N', 400]]);
  const cum = prepareCourse(pts).cumM;
  const raw = stepsToCues(
    [
      { type: 11, name: 'Main Street', distance: 300, way_points: [0, 1] },
      { type: 1, name: 'Elm Street', distance: 12, way_points: [1, 2] },
      { type: 0, name: 'Pine Street', distance: 400, way_points: [2, 3] },
    ],
    cum,
  );
  const ob = outAndBack({ points: pts, cues: raw }, 1000);
  assert.deepEqual(ob.cues.map(cueText), [
    'Right, then left onto Pine Street',
    'Turn around here',
    // Coming back: right onto Elm, then left onto Main — the pair reversed AND mirrored.
    'Right, then left onto Main Street',
  ]);
  assert.equal(ob.cues[2].atM, Math.round(2 * ob.turnM - 312));
});
