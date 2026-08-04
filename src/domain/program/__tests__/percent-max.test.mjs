import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BAR_LB,
  ESTIMATE_MAX_REPS,
  KG_RULES,
  LB_RULES,
  estimateMaxFromSet,
  hasPercent,
  loadText,
  maxKeyFor,
  maxLbFor,
  missingMaxKeys,
  percentTargets,
  requiredMaxKeys,
  resolveLoad,
  roundToIncrement,
  unresolvablePercentages,
  usesPercentages,
  weightText,
} from '../percent-max.ts';

/** A 405 lb back squat — the anchor every vector below is computed against by hand. */
const MAX = 405;

const day = (main) => ({ letter: 'A', name: 'Day', warmup: [], main, cooldown: [] });
const structure = (days, weekPlans = null) => ({
  name: 'Test',
  weeks: 4,
  daysPerWeek: days.length,
  vary: false,
  days,
  weekPlans,
});

// ── rounding to something you can actually load ──────────────────────────────

test('rounds to the nearest 5 lb, because plates come in pairs', () => {
  assert.equal(roundToIncrement(303.75, 5), 305);
  assert.equal(roundToIncrement(352.35, 5), 350);
  assert.equal(roundToIncrement(182.25, 5), 180);
});

test('kg rounds to 2.5, not to 5', () => {
  assert.equal(roundToIncrement(101.2, 2.5), 100);
  assert.equal(roundToIncrement(102.0, 2.5), 102.5);
});

test('a nonsense increment yields 0 rather than Infinity or NaN', () => {
  assert.equal(roundToIncrement(100, 0), 0);
  assert.equal(roundToIncrement(100, -5), 0);
  assert.equal(roundToIncrement(Number.NaN, 5), 0);
});

// ── resolving a percentage ───────────────────────────────────────────────────

test('a percentage of a max becomes the weight on the bar', () => {
  assert.deepEqual(resolveLoad(MAX, 75), { weight: 305, atBar: false });
  assert.deepEqual(resolveLoad(MAX, 80), { weight: 325, atBar: false });
  assert.deepEqual(resolveLoad(MAX, 92), { weight: 375, atBar: false });
});

test('no max resolves to nothing — never to zero, never to a guess', () => {
  assert.equal(resolveLoad(null, 75), null);
  assert.equal(resolveLoad(undefined, 75), null);
  assert.equal(resolveLoad(0, 75), null);
});

test('no percentage resolves to nothing', () => {
  assert.equal(resolveLoad(MAX, null), null);
  assert.equal(resolveLoad(MAX, 0), null);
});

test('a load below an empty bar IS the bar, and says so', () => {
  // 35% of a 100 lb max is 35 lb, and there is no 35 lb barbell.
  assert.deepEqual(resolveLoad(100, 35), { weight: BAR_LB, atBar: true });
});

test('the bar floor respects the unit — 20 kg, not 45', () => {
  assert.deepEqual(resolveLoad(50, 35, KG_RULES), { weight: 20, atBar: true });
});

test('every set is computed from the TRUE max, never off the previous rounding', () => {
  // A ten-rung ramp compounded off each rounded figure drifts by more than a plate at the top, which
  // on a 95% single is the difference between a rehearsal and a miss.
  const direct = resolveLoad(MAX, 95).weight;
  const ex = { name: 'Back Squat', repScheme: [5, 4, 3, 2, 1], percentScheme: [60, 70, 80, 90, 95] };
  const last = percentTargets(ex).map((p) => resolveLoad(MAX, p).weight).at(-1);
  assert.equal(last, direct);
});

// ── per-set percentages ──────────────────────────────────────────────────────

test('a flat percentage applies to every set', () => {
  const ex = { name: 'Back Squat', sets: 5, reps: 5, percentOfMax: 75 };
  assert.deepEqual(percentTargets(ex), [75, 75, 75, 75, 75]);
});

test('a ramp keeps every rung, parallel to the rep ladder', () => {
  // "5@65, 4@75, 3@80, 2@87, 1@92" — reps AND load both change per set.
  const ex = { name: 'Back Squat', repScheme: [5, 4, 3, 2, 1], percentScheme: [65, 75, 80, 87, 92] };
  assert.deepEqual(percentTargets(ex), [65, 75, 80, 87, 92]);
  assert.deepEqual(
    percentTargets(ex).map((p) => resolveLoad(MAX, p).weight),
    [265, 305, 325, 350, 375],
  );
});

test('a short percentScheme leaves the rest unprescribed rather than repeating itself', () => {
  const ex = { name: 'Back Squat', repScheme: [5, 5, 5, 5], percentScheme: [70, 75] };
  assert.deepEqual(percentTargets(ex), [70, 75, null, null], 'repeating would invent a load nobody wrote');
});

test('a null rung prescribes nothing for that set', () => {
  const ex = { name: 'Back Squat', repScheme: [5, 5, 5], percentScheme: [70, null, 80] };
  assert.deepEqual(percentTargets(ex), [70, null, 80]);
});

// ── which lift the percentage refers to ──────────────────────────────────────

test('a percentage defaults to the exercise it is written against', () => {
  const ex = { name: 'Back Squat', catalogKey: 'back-squat', sets: 5, reps: 5, percentOfMax: 75 };
  assert.equal(maxKeyFor(ex), 'back-squat');
});

test('percentOf points the percentage at a DIFFERENT lift', () => {
  // "Front Squat 3 × 4 @ 45% — % taken from Back Squat max". Resolving this against a front-squat max
  // the athlete never tested would put a materially wrong weight on the bar, with full confidence.
  const ex = {
    name: 'Front Squat',
    catalogKey: 'front-squat',
    sets: 3,
    reps: 4,
    percentOfMax: 45,
    percentOf: 'back-squat',
  };
  assert.equal(maxKeyFor(ex), 'back-squat');
  assert.equal(resolveLoad(MAX, 45).weight, 180);
});

test('an exercise with no percentage keys no max at all', () => {
  assert.equal(maxKeyFor({ name: 'Chin Up', catalogKey: 'chin-up', sets: 4, reps: 5 }), null);
});

// ── what a program needs before it can start ─────────────────────────────────

test('required maxes are derived from the prescriptions, in first-appearance order', () => {
  const s = structure([
    day([
      { name: 'Back Squat', catalogKey: 'back-squat', sets: 5, reps: 5, percentOfMax: 75 },
      { name: 'Bench Press', catalogKey: 'bench-press', sets: 5, reps: 5, percentOfMax: 75 },
      { name: 'Deadlift', catalogKey: 'deadlift', sets: 5, reps: 5, percentOfMax: 75 },
    ]),
  ]);
  assert.deepEqual(requiredMaxKeys(s), ['back-squat', 'bench-press', 'deadlift']);
});

test('a lift referenced twice is asked for once', () => {
  const s = structure([
    day([
      { name: 'Back Squat', catalogKey: 'back-squat', sets: 5, reps: 5, percentOfMax: 75 },
      { name: 'Front Squat', catalogKey: 'front-squat', sets: 3, reps: 4, percentOfMax: 45, percentOf: 'back-squat' },
    ]),
  ]);
  assert.deepEqual(requiredMaxKeys(s), ['back-squat'], 'the front squat borrows the squat max');
});

test('per-week plans are walked too — a lift that only appears in week 3 is still asked for', () => {
  const s = structure(
    [day([{ name: 'Back Squat', catalogKey: 'back-squat', sets: 5, reps: 5, percentOfMax: 70 }])],
    [
      { days: [day([{ name: 'Back Squat', catalogKey: 'back-squat', sets: 5, reps: 5, percentOfMax: 70 }])] },
      { days: [day([{ name: 'Deadlift', catalogKey: 'deadlift', sets: 5, reps: 3, percentOfMax: 83 }])] },
    ],
  );
  assert.deepEqual(requiredMaxKeys(s), ['back-squat', 'deadlift']);
});

test('a percentage with nothing to key a max by is REPORTED, not silently dropped', () => {
  // Without this it fails invisibly: a bare "@ 80%" renders forever while the entry gate, which only
  // knows about keys, never asks for the max that would resolve it.
  const orphan = { name: 'Some Squat Variation', sets: 5, reps: 3, percentOfMax: 80 };
  const s = structure([day([orphan])]);
  assert.deepEqual(requiredMaxKeys(s), []);
  assert.deepEqual(unresolvablePercentages(s), [orphan]);
});

// ── every program authored before this reads unchanged ───────────────────────

test('a program with no percentages needs no max and claims no load', () => {
  const ex = { name: 'Bench Press', sets: 4, reps: 8 };
  const s = structure([day([ex])]);
  assert.equal(hasPercent(ex), false);
  assert.equal(usesPercentages(s), false);
  assert.deepEqual(requiredMaxKeys(s), []);
  assert.equal(loadText(ex, MAX, 'lb'), '', 'nothing was prescribed, so nothing is claimed');
});

test('a garbage percentage prescribes nothing rather than resolving to something', () => {
  assert.equal(hasPercent({ name: 'X', percentOfMax: 0 }), false);
  assert.equal(hasPercent({ name: 'X', percentOfMax: -75 }), false);
  assert.equal(hasPercent({ name: 'X', percentScheme: [null, null] }), false);
});

// ── display ──────────────────────────────────────────────────────────────────

test('a resolved prescription shows the percentage AND the bar', () => {
  const ex = { name: 'Back Squat', sets: 5, reps: 5, percentOfMax: 75 };
  assert.equal(loadText(ex, MAX, 'lb'), '@ 75% — 305 lb');
});

test('with no max it shows the prescription and invents no number', () => {
  const ex = { name: 'Back Squat', sets: 5, reps: 5, percentOfMax: 75 };
  assert.equal(loadText(ex, null, 'lb'), '@ 75%', 'never "0 lb", which would be a confident false claim');
});

test('a ramp is shown in full, never collapsed to one number', () => {
  const ex = { name: 'Back Squat', repScheme: [5, 4, 3, 2, 1], percentScheme: [65, 75, 80, 87, 92] };
  assert.equal(loadText(ex, MAX, 'lb'), '@ 65-75-80-87-92% — 265-305-325-350-375 lb');
});

test('a load that fell to the bar says so on the card', () => {
  const ex = { name: 'Front Squat', sets: 1, reps: 8, percentOfMax: 35 };
  assert.equal(loadText(ex, 100, 'lb'), '@ 35% — 45 lb (bar)');
});

test('weights read the way people write them', () => {
  assert.equal(weightText(305, 'lb'), '305 lb');
  assert.equal(weightText(102.5, 'kg'), '102.5 kg');
  assert.equal(weightText(100.0, 'kg'), '100 kg', 'nobody writes 100.0');
});

test('kg resolves and rounds in kg throughout', () => {
  // A 180 kg max at 75% is 135 kg exactly; at 77% it is 138.6, which is not loadable.
  assert.deepEqual(resolveLoad(180, 75, KG_RULES), { weight: 135, atBar: false });
  assert.deepEqual(resolveLoad(180, 77, KG_RULES), { weight: 137.5, atBar: false });
  const ex = { name: 'Back Squat', sets: 5, reps: 5, percentOfMax: 77 };
  assert.equal(loadText(ex, 180, 'kg', KG_RULES), '@ 77% — 137.5 kg');
});

test('LB_RULES is the default, so a caller that forgets the unit gets pounds', () => {
  assert.deepEqual(resolveLoad(MAX, 75), resolveLoad(MAX, 75, LB_RULES));
});

// ── the athlete who does not know their max ──────────────────────────────────

test('a set they remember becomes a starting max', () => {
  assert.equal(estimateMaxFromSet(225, 5), 263); // Epley: 225 × (1 + 5/30)
  assert.equal(estimateMaxFromSet(185, 8), 234);
  assert.equal(estimateMaxFromSet(315, 1), 315, 'a single IS the max, and the maths agrees');
});

test('estimates are refused above the band where Epley stops being honest', () => {
  assert.equal(estimateMaxFromSet(60, 25), null, '60 × 25 computes to 110, which is why records bar estimates');
  assert.equal(estimateMaxFromSet(135, ESTIMATE_MAX_REPS + 1), null);
  assert.notEqual(estimateMaxFromSet(135, ESTIMATE_MAX_REPS), null, 'the boundary itself is allowed');
});

test('a set that cannot support an estimate yields nothing rather than a number', () => {
  assert.equal(estimateMaxFromSet(0, 5), null);
  assert.equal(estimateMaxFromSet(225, 0), null);
  assert.equal(estimateMaxFromSet(Number.NaN, 5), null);
});

// ── reading the stored maxes ─────────────────────────────────────────────────

const MAXES = { 'back-squat': { lb: 405, source: 'entered', setAt: null } };

test('a stored max reads back for its lift and for nothing else', () => {
  assert.equal(maxLbFor(MAXES, 'back-squat'), 405);
  assert.equal(maxLbFor(MAXES, 'bench-press'), null);
  assert.equal(maxLbFor(MAXES, null), null);
  assert.equal(maxLbFor(null, 'back-squat'), null);
});

test('a corrupt stored value reads as absent, not as zero', () => {
  assert.equal(maxLbFor({ 'back-squat': { lb: 0, source: 'entered', setAt: null } }, 'back-squat'), null);
  assert.equal(maxLbFor({ 'back-squat': { lb: Number.NaN, source: 'entered', setAt: null } }, 'back-squat'), null);
});

test('the entry gate asks only for what is still missing', () => {
  const s = structure([
    day([
      { name: 'Back Squat', catalogKey: 'back-squat', sets: 5, reps: 5, percentOfMax: 75 },
      { name: 'Bench Press', catalogKey: 'bench-press', sets: 5, reps: 5, percentOfMax: 75 },
    ]),
  ]);
  assert.deepEqual(missingMaxKeys(s, MAXES), ['bench-press']);
  assert.deepEqual(missingMaxKeys(s, {}), ['back-squat', 'bench-press']);
  assert.deepEqual(missingMaxKeys(s, null), ['back-squat', 'bench-press'], 'unanswered is not an error state');
});
