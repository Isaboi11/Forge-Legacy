// node --test src/domain/coach/__tests__/pose-rep-view.test.mjs
//
// What the athlete SEES of their reps (PO 2026-11-17, form check step 1): the trim's ticks / wrap / "Just rep N",
// the read's rep cards, and where "Show me" starts. Pure — no phone needed.
import test from 'node:test';
import assert from 'node:assert/strict';

import { POSE_KINDS, poseFactLines } from '../pose/pose-facts.ts';
import { J, POSE_VALUES } from '../pose/joints.ts';
import {
  REP_ONE_PAD_MS,
  REP_WRAP_PAD_MS,
  SHOW_ME_LEAD_MS,
  WORK_PHASE,
  oneRep,
  repCards,
  repSpans,
  repStripLabel,
  repsInside,
  showMeFrom,
  wrapReps,
} from '../pose/pose-rep-view.ts';

const MIN = 1_000;
const MAX = 30_000;
const rep = (startMs, turnMs, endMs) => ({ startMs, turnMs, endMs });
const THREE = [rep(2_000, 3_000, 4_000), rep(4_200, 5_200, 6_200), rep(6_400, 7_400, 8_400)];

/** Facts as `measureFacts` makes them, with only what a test sets. */
function facts(over = {}) {
  return {
    kind: 'squat',
    view: 'side',
    side: 'left',
    reps: 3,
    frames: [],
    tempo: null,
    depth: null,
    torso: null,
    hipsFirst: null,
    kneesIn: null,
    tilt: null,
    shift: null,
    shiftSide: null,
    lockoutShort: null,
    ...over,
  };
}

test('repSpans drops malformed reps and sorts the rest', () => {
  assert.deepEqual(repSpans(null), []);
  assert.deepEqual(
    repSpans([rep(5, 6, 7), { startMs: 1, turnMs: 2 }, rep(3, 2, 4), rep(0, 1, 2), { startMs: NaN, turnMs: 1, endMs: 2 }]),
    [rep(0, 1, 2), rep(5, 6, 7)],
  );
});

test('the trim wraps every rep with room each side, inside the clip and one read long at most', () => {
  assert.deepEqual(wrapReps(THREE, 20_000, MIN, MAX), { start: 2_000 - REP_WRAP_PAD_MS, end: 8_400 + REP_WRAP_PAD_MS });
  assert.deepEqual(wrapReps([rep(100, 900, 1_800)], 2_000, MIN, MAX), { start: 0, end: 2_000 }, 'clamped to the clip');
  assert.equal(wrapReps([], 20_000, MIN, MAX), null);
  const long = [rep(1_000, 2_000, 3_000), rep(40_000, 41_000, 42_000)];
  const w = wrapReps(long, 60_000, MIN, MAX);
  assert.equal(w.end - w.start, MAX, 'a span longer than one read keeps its start and is cut');
  assert.equal(w.start, 1_000 - REP_WRAP_PAD_MS);
});

test('"Just rep N" trims to that rep alone, never under the minimum', () => {
  assert.deepEqual(oneRep(THREE[1], 20_000, MIN, MAX), { start: 4_200 - REP_ONE_PAD_MS, end: 6_200 + REP_ONE_PAD_MS });
  const quick = oneRep(rep(5_000, 5_100, 5_200), 20_000, MIN, MAX);
  assert.equal(quick.end - quick.start, MIN);
  assert.ok(quick.start <= 5_000 && quick.end >= 5_200, 'still around the rep');
});

test('a rep counts as inside a window when its turnaround is', () => {
  assert.equal(repsInside(THREE, { start: 0, end: 20_000 }), 3);
  assert.equal(repsInside(THREE, { start: 3_500, end: 8_000 }), 2);
  assert.equal(repsInside(THREE, { start: 9_000, end: 10_000 }), 0);
});

test('"Show me" starts a little before the moment, never before the part Holt read or the clip', () => {
  assert.equal(showMeFrom(10_000, 2_000), 10_000 - SHOW_ME_LEAD_MS);
  assert.equal(showMeFrom(2_500, 2_000), 2_000);
  assert.equal(showMeFrom(500, 0), 0);
});

test('the rep strip says where each picture is in the rep, by kind', () => {
  assert.equal(repStripLabel('squat'), 'EACH REP, AT THE BOTTOM');
  assert.equal(repStripLabel('pull'), 'EACH REP, AT THE TOP');
  assert.equal(repStripLabel('row'), 'EACH REP, PULLED IN');
  assert.equal(repStripLabel(null), 'EACH REP, AT THE TURN');
});

test('WORK_PHASE says what pose-facts says: the same slot is "slowest", in the same word, for every kind', () => {
  for (const kind of POSE_KINDS) {
    // Slot 0 says rep 1 is slowest, slot 2 says rep 2: whichever the line names is the kind's working slot.
    const lines = poseFactLines(facts({ kind, reps: 2, tempo: [[3, 0, 1], [1, 0, 2]] })).join('\n');
    const { slot, word } = WORK_PHASE[kind];
    assert.match(lines, new RegExp(`rep ${slot === 2 ? 2 : 1} ${word} was slowest`), kind);
  }
});

test('no cards without measured reps, or when the reps and the facts disagree', () => {
  const times = [3_000, 5_200, 7_400];
  assert.deepEqual(repCards(null, THREE, times), []);
  assert.deepEqual(repCards(facts({ reps: 1 }), THREE.slice(0, 1), times), [], 'one rep is not a strip');
  assert.deepEqual(repCards(facts({ reps: 2 }), THREE, times), [], 'three reps, two measured');
  assert.deepEqual(repCards(facts(), THREE, []), []);
});

test('each card shows the frame tagged for its bottom, else the frame nearest it', () => {
  const times = [2_000, 3_100, 4_000, 5_000, 6_000, 7_300];
  const f = facts({ frames: [null, null, null, { rep: 2, at: 'turn' }, null, null] });
  const cards = repCards(f, THREE, times);
  assert.deepEqual(cards.map((c) => c.frame), [1, 3, 5]);
  assert.deepEqual(cards.map((c) => c.atMs), [3_000, 5_200, 7_400]);
});

test('what was measured: depth in plain words and the working half in seconds', () => {
  const cards = repCards(facts({ depth: ['below', 'level', null], tempo: [[1.2, 0.1, 1.4], [1.1, 0, 1.5], [1, 0, 1.6]] }), THREE, [3_000, 5_200, 7_400]);
  assert.deepEqual(cards[0].measured, ['Below parallel', '1.4 s up']);
  assert.deepEqual(cards[1].measured, ['At parallel', '1.5 s up']);
  assert.deepEqual(cards[2].measured, ['1.6 s up']);
});

test('the odd rep gets ONE note; what happened on every rep is the set, not an odd one', () => {
  const times = [3_000, 5_200, 7_400];
  assert.deepEqual(repCards(facts({ depth: ['below', 'below', 'above'] }), THREE, times).map((c) => c.note), ['', '', 'Shallower']);
  assert.deepEqual(repCards(facts({ depth: ['above', 'below', 'below'] }), THREE, times).map((c) => c.note), ['Shallower', '', '']);
  assert.deepEqual(repCards(facts({ kneesIn: [2, 3] }), THREE, times).map((c) => c.note), ['', 'Knees moved in', 'Knees moved in']);
  assert.deepEqual(repCards(facts({ kneesIn: [1, 2, 3] }), THREE, times).map((c) => c.note), ['', '', ''], 'every rep');
  assert.deepEqual(repCards(facts({ depth: ['below', 'below', 'above'], kneesIn: [3] }), THREE, times)[2].note, 'Shallower', 'depth first');
  assert.deepEqual(repCards(facts({ hipsFirst: [1] }), THREE, times)[0].note, 'Hips rose first');
  assert.deepEqual(repCards(facts({ lockoutShort: [2] }), THREE, times)[1].note, 'Short of lockout');
});

test('"Slowest up" only when it really stands out, and only from three reps', () => {
  const times = [3_000, 5_200, 7_400];
  const slow = repCards(facts({ tempo: [[1, 0, 1.2], [1, 0, 1.3], [1, 0, 2.4]] }), THREE, times);
  assert.deepEqual(slow.map((c) => c.note), ['', '', 'Slowest up']);
  const even = repCards(facts({ tempo: [[1, 0, 1.2], [1, 0, 1.3], [1, 0, 1.4]] }), THREE, times);
  assert.deepEqual(even.map((c) => c.note), ['', '', '']);
  const two = repCards(facts({ reps: 2, tempo: [[1, 0, 1], [1, 0, 3]] }), THREE.slice(0, 2), times);
  assert.deepEqual(two.map((c) => c.note), ['', '']);
});

test('the shallower rep draws its depth line only when both the hip and the knee were found', () => {
  const person = new Array(POSE_VALUES).fill(0);
  const put = (j, x, y) => {
    person[j * 3] = x;
    person[j * 3 + 1] = y;
    person[j * 3 + 2] = 0.9;
  };
  put(J.leftHip, 0.5, 0.55);
  put(J.rightHip, 0.52, 0.55);
  put(J.leftKnee, 0.5, 0.62);
  put(J.rightKnee, 0.52, 0.62);
  const times = [3_000, 5_200, 7_400];
  const f = facts({ depth: ['below', 'below', 'above'] });
  const [, , third] = repCards(f, THREE, times, [null, null, person], [null, null, [720, 1280]]);
  assert.equal(third.mark?.kind, 'line');
  assert.ok(Math.abs(third.mark.y - 0.55) < 1e-9 && Math.abs(third.mark.tick - 0.62) < 1e-9);
  assert.equal(repCards(f, THREE, times)[2].mark, null, 'no joints, no line');
  const hipOnly = person.slice();
  hipOnly[J.leftKnee * 3 + 2] = 0;
  hipOnly[J.rightKnee * 3 + 2] = 0;
  assert.equal(repCards(f, THREE, times, [null, null, hipOnly], [null, null, [720, 1280]])[2].mark, null, 'a guessed line is worse than none');
});

test('every word on a card is about a position or a time (Body-Pose plan §7)', () => {
  const all = repCards(
    facts({
      depth: ['below', 'level', 'above'],
      tempo: [[1, 0, 1], [1, 0, 1], [1, 0, 3]],
      kneesIn: [2],
      hipsFirst: [3],
      lockoutShort: [1],
      tilt: [2],
      shift: [3],
    }),
    THREE,
    [3_000, 5_200, 7_400],
  );
  const words = all.flatMap((c) => [...c.measured, c.note]).join(' ');
  assert.doesNotMatch(words, /valgus|injur|risk|safe|danger|pain|weak|strong|weight|load|max/i);
});
