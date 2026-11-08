/**
 * PO 11-08: *"I was on a walk with my wife, she clicked join workout on my name, I clicked yes, and it took her
 * to the choose exercise screen when it should've just started with where I was at."*
 *
 * Two halves. The snapshot now carries the walk (`session-core.test.mjs`), and the walk the guest opens on
 * starts its GPS by itself — but ONLY from an accepted join, and only once. These are source assertions
 * because the start happens inside a tracker hook on a screen no test here renders.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const join = read('../workout-join.tsx');
const invite = read('../workout-invite.tsx');
const logger = read('../workout.tsx');
const card = read('../../components/workout/CardioBlockCard.tsx');

test('an accepted JOIN asks for the start; an ordinary invitation does not', () => {
  assert.match(join, /autoStartBout: true/);
  assert.equal(/autoStartBout/.test(invite), false, 'accepting an invitation is agreeing to train, not a starting gun');
});

test('the logger marks only the block the join opens on', () => {
  assert.match(logger, /withAutoStart\(templateToSessionExercises\(shape, prescribed\.load\), launch\.autoStartBout \? launchStart : null\)/);
  assert.match(logger, /exercises\[i\]\?\.kind === 'cardio' \? exercises\.map\(\(e, j\) => \(j === i \? \{ \.\.\.e, autoStart: true \} : e\)\) : exercises/);
});

test('⚠ one-shot: the first live report clears the flag, so a reopened session never starts a second bout', () => {
  assert.match(logger, /autoStart=\{!!ex\.autoStart\}/);
  assert.match(logger, /i === exIdx \? \{ \.\.\.e, boutOpen: live \|\| undefined, autoStart: undefined \}/);
});

test('the card starts the way its own Start does — GPS on the road, the clock indoors — only for a bout not yet begun', () => {
  assert.match(card, /const canAutoStart = !!autoStart && !logged && tracker\.phase === 'idle' && !timer\.running && timer\.elapsedSec === 0;/);
  assert.match(card, /autoStartedRef\.current = true;\s+if \(onRoad\) startTracker\(\);\s+else startClock\(\);\s+onLiveChange\?\.\(true\);/);
});

test('a walk somebody joined keeps Add Exercise — it is not a prescribed plan', () => {
  assert.match(logger, /templated: shape\.some\(\(e\) => e\.kind !== 'cardio'\)/);
});
