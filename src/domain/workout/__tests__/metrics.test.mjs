import { test } from 'node:test';
import assert from 'node:assert/strict';
import { e1rm, sessionVolume, doneSetCount, hasLoggedSet, detectPRs, bestRecordWeight, completionSetCount, PR_MAX_REPS } from '../metrics.ts';

const set = (setIndex, weight, targetReps, actualReps, done) => ({ setIndex, weight, targetReps, actualReps, done });
const session = {
  workoutName: 'Lower A', activityType: 'strength', startedAt: '2026-07-17T00:00:00Z',
  exercises: [
    { name: 'Back Squat', section: 'main', position: 0, sets: [
      set(0, 315, 5, 5, true),   // done, 315x5
      set(1, 315, 5, 3, true),   // done, 315x3
      set(2, 315, 5, null, false), // pending
    ] },
    { name: 'Deadlift', section: 'main', position: 1, sets: [
      set(0, 405, 3, null, true), // done, actual null → target 3
    ] },
  ],
};

test('e1rm — Epley', () => {
  assert.equal(e1rm(300, 0), 300);
  assert.equal(e1rm(300, 30), 600);
  assert.equal(Math.round(e1rm(315, 5)), 368);
});

test('sessionVolume — done, weighted sets, actual ?? target', () => {
  // Back Squat: 315*5 + 315*3 = 2520 ; Deadlift: 405*3 (actual null→target) = 1215 → 3735
  assert.equal(sessionVolume(session), 3735);
});

test('doneSetCount + hasLoggedSet', () => {
  assert.equal(doneSetCount(session), 3);
  assert.equal(hasLoggedSet(session), true);
  assert.equal(hasLoggedSet({ ...session, exercises: [{ name: 'x', section: 'main', position: 0, sets: [set(0, 100, 5, null, false)] }] }), false);
});


/*
 * A PERSONAL RECORD IS A CLAIM ABOUT THE ATHLETE.
 *
 * From a real athlete's records: "Light treadmill walk — 2 minutes", measure_kind `load`, 40 lb. It is a
 * warm-up row. A weight got typed into it, `detectPRs` read every exercise in every section, and the app
 * told somebody they had set a 40 lb record on a walk. These lock the two exclusions that prevent it.
 */
test('detectPRs — a warm-up never sets a record', () => {
  const warmup = {
    ...session,
    exercises: [
      { name: 'Light treadmill walk — 2 minutes', section: 'warmup', position: 0, sets: [set(0, 40, 1, 1, true)] },
      { name: 'Empty bar', section: 'warmup', position: 1, sets: [set(0, 45, 10, 10, true)] },
    ],
  };
  assert.deepEqual(detectPRs(warmup, {}), [], 'a warm-up produced a personal record');
});

test('detectPRs — a cool-down never sets a record either', () => {
  const cool = {
    ...session,
    exercises: [{ name: 'Farmer Carry', section: 'cooldown', position: 0, sets: [set(0, 200, 1, 1, true)] }],
  };
  assert.deepEqual(detectPRs(cool, {}), []);
});

test('detectPRs — a cardio block never sets a LOAD record, whatever is in the weight column', () => {
  // A run has no load. Anything sitting in that column is noise, not a lift.
  const cardio = {
    ...session,
    exercises: [{
      name: 'Treadmill Run', kind: 'cardio', activity: 'run', section: 'main', position: 0,
      sets: [set(0, 40, 0, null, true)],
    }],
  };
  assert.deepEqual(detectPRs(cardio, {}), []);
});

test('detectPRs — main-section lifting still records, so the fix did not silence the feature', () => {
  const prs = detectPRs(session, { 'Back Squat': 300, Deadlift: 400 });
  assert.equal(prs.length, 2);
  assert.deepEqual(prs.map((p) => p.exercise).sort(), ['Back Squat', 'Deadlift']);
  assert.equal(prs.every((p) => p.isFirst === false), true);
});

// ── A RECORD IS A FACT, NOT A CALCULATION ────────────────────────────────────

test('bestRecordWeight — the heaviest weight moved for 1–5 reps, and nothing above', () => {
  assert.equal(PR_MAX_REPS, 5);
  assert.equal(bestRecordWeight([set(0, 225, 5, 5, true), set(1, 245, 3, 3, true)]), 245);
  // A heavier set at 12 reps is real training and is not a record.
  assert.equal(bestRecordWeight([set(0, 225, 5, 5, true), set(1, 250, 12, 12, true)]), 225);
  // Nothing in the band at all.
  assert.equal(bestRecordWeight([set(0, 135, 12, 12, true)]), null);
  // Pending sets are not performances.
  assert.equal(bestRecordWeight([set(0, 400, 3, null, false)]), null);
});

test('a high-rep light set can no longer out-rank a genuine heavy triple', () => {
  // Under estimated 1RM this was the failure: 60×25 computes to 110, beating 80×3 at 88. A record is now
  // the weight on the bar, so 60 never beats 80 no matter how many times it moves.
  const s = { ...session, exercises: [{ name: 'Press', section: 'main', position: 0, sets: [set(0, 60, 25, 25, true)] }] };
  assert.deepEqual(detectPRs(s, { Press: 80 }), []);
});

test('the FIRST time on a lift is a baseline — recorded, never announced', () => {
  // Straight from a real athlete's records: 3 lb, then 35, then 90 — three "records" in a day on a lift
  // they had only just met. The first is now silent.
  const first = { ...session, exercises: [{ name: 'Dumbbell Bench Press', section: 'main', position: 0, sets: [set(0, 3, 5, 5, true)] }] };
  const prs = detectPRs(first, {}); // {} = never done it
  assert.equal(prs.length, 1, 'the mark must still be written — the next session needs something to beat');
  assert.equal(prs[0].isFirst, true, 'and it must be flagged, so nothing calls it a record');
});

test('the SECOND time is a real record, because now there was something to beat', () => {
  const s = { ...session, exercises: [{ name: 'Dumbbell Bench Press', section: 'main', position: 0, sets: [set(0, 35, 5, 5, true)] }] };
  const prs = detectPRs(s, { 'Dumbbell Bench Press': 3 });
  assert.equal(prs.length, 1);
  assert.equal(prs[0].isFirst, false);
  assert.equal(prs[0].weight, 35);
});

test('an absent lift means NEVER DONE, and must never be read as zero', () => {
  // The whole distinction lives in undefined-vs-0. A `?? 0` anywhere brings the flood straight back:
  // every set a beginner performs would beat it.
  const s = { ...session, exercises: [{ name: 'New Lift', section: 'main', position: 0, sets: [set(0, 95, 5, 5, true)] }] };
  assert.equal(detectPRs(s, {})[0].isFirst, true);
  assert.equal(detectPRs(s, { 'New Lift': 0 })[0].isFirst, false, 'an explicit 0 is a real prior mark and 95 beats it');
});

test('matching your best is not beating it', () => {
  const s = { ...session, exercises: [{ name: 'Squat', section: 'main', position: 0, sets: [set(0, 225, 5, 5, true)] }] };
  assert.deepEqual(detectPRs(s, { Squat: 225 }), []);
});

test('a day of nothing but 4×12 sets no records, and that is correct', () => {
  const s = {
    ...session,
    exercises: [{ name: 'Lateral Raise', section: 'main', position: 0, sets: [
      set(0, 20, 12, 12, true), set(1, 25, 12, 12, true), set(2, 30, 12, 12, true),
    ] }],
  };
  assert.deepEqual(detectPRs(s, { 'Lateral Raise': 15 }), [],
    'going heavier at 12 reps is improvement, shown on the Record — it is not a personal record');
});

/*
 * ══ ONE LIFT, TWICE IN A SESSION ══
 *
 * `priorBest` is a snapshot taken before the session and it never moves. A lift that appears twice — a
 * program listing it in two blocks, an athlete adding it again, a superset — was therefore compared
 * against the same stale number both times. Found by the 2026-08-02 audit.
 */

test('a lift done twice in one session is measured against what it just did', () => {
  const twice = (a, b) => ({
    ...session,
    exercises: [
      { name: 'Squat', section: 'main', position: 0, sets: [set(0, a, 3, 3, true)] },
      { name: 'Squat', section: 'main', position: 1, sets: [set(0, b, 3, 3, true)] },
    ],
  });

  // The bug: 310 then 300, against a prior of 295, announced BOTH. The 300 is not a record —
  // they had just done 310 twenty minutes earlier.
  const heavyFirst = detectPRs(twice(310, 300), { Squat: 295 });
  assert.deepEqual(heavyFirst.map((p) => p.weight), [310],
    'only the heaviest stands; a lighter later set is not a second record');

  // Climbing through the session is still two genuine records, in order.
  assert.deepEqual(detectPRs(twice(300, 310), { Squat: 295 }).map((p) => p.weight), [300, 310]);

  // Equalling what you did earlier today is not beating it.
  assert.deepEqual(detectPRs(twice(300, 300), { Squat: 295 }).map((p) => p.weight), [300]);
});

test('first-ever stays first-ever, and the second block is not a new "first"', () => {
  const s = {
    ...session,
    exercises: [
      { name: 'Novel Lift', section: 'main', position: 0, sets: [set(0, 100, 3, 3, true)] },
      { name: 'Novel Lift', section: 'main', position: 1, sets: [set(0, 110, 3, 3, true)] },
    ],
  };
  const prs = detectPRs(s, {});
  assert.equal(prs[0].isFirst, true, 'the first mark on a lift they have never done');
  assert.equal(prs.length, 2, 'and 110 then beats it');
  assert.equal(prs[1].isFirst, false, 'the second is a real record, not another baseline');
});

/*
 * ══ ONE LIFT, TWO NAMES ══
 *
 * An imported program keeps the athlete's words ("Bench press"); the picker writes the catalogue's
 * ("Barbell Bench Press"). Same lift, same catalogKey. Keyed by NAME, history split in half and the app
 * announced a 190 lb record to somebody who had benched 225. Found by the 2026-08-02 audit.
 */

test('two names for one lift share one history, via the catalogue key', () => {
  const KEY = 'barbell-bench-press';
  const lift = (name, weight) => ({
    ...session,
    exercises: [{ name, catalogKey: KEY, section: 'main', position: 0, sets: [set(0, weight, 3, 3, true)] }],
  });

  // Their real best, logged under the imported program's wording, is keyed by the catalogue key.
  const prior = { [KEY]: 225 };

  // The same lift picked from the library — a different string, the same key.
  assert.deepEqual(detectPRs(lift('Barbell Bench Press', 190), prior), [],
    '190 is not a record for someone who has benched 225, whatever the row is called');

  // And a genuine improvement still lands.
  assert.equal(detectPRs(lift('Barbell Bench Press', 230), prior)[0]?.weight, 230);
});

test('an exercise with no catalogue key still falls back to its name', () => {
  // Custom and unmatched lifts have no key; the name is the only identity they have, and it must work.
  const s = {
    ...session,
    exercises: [{ name: 'Coach Special', section: 'main', position: 0, sets: [set(0, 100, 3, 3, true)] }],
  };
  assert.deepEqual(detectPRs(s, { 'Coach Special': 120 }), [], 'name identity still applies');
  assert.equal(detectPRs(s, { 'Coach Special': 80 })[0]?.weight, 100);
});

// ── completionSetCount — the "3 warm-up sets showed as 0 sets" regression ───────────────────────────
//
// The Record screen counted only sets carrying BOTH a weight and a rep count, so an exercise done for
// three unweighted warm-up sets reported "0 sets" beside a header that said 3. These guard the rule
// that replaced it: a row exists because a set was logged, and the load is a property of the set.

test('completionSetCount — unweighted sets still count', () => {
  const warmups = [{ weight: null, reps: 10 }, { weight: null, reps: 10 }, { weight: null, reps: 8 }];
  assert.equal(completionSetCount(warmups), 3, 'three warm-up sets are three sets, not zero');
});

test('completionSetCount — bodyweight (0 lb) sets still count', () => {
  const pullups = [{ weight: 0, reps: 8 }, { weight: 0, reps: 7 }];
  assert.equal(completionSetCount(pullups), 2);
});

test('completionSetCount — a set with no reps either still counts', () => {
  // Logged is logged. A set the athlete resolved without saying how many is still a set they did.
  assert.equal(completionSetCount([{ weight: null, reps: null }]), 1);
});

test('completionSetCount — weighted sets are unaffected', () => {
  assert.equal(completionSetCount([{ weight: 315, reps: 5 }, { weight: 315, reps: 3 }]), 2);
});

test('completionSetCount — a conditioning bout is one bout, however it was stored', () => {
  // A run is one unit of work; it must not report the number of rows it happens to occupy.
  assert.equal(completionSetCount([{ distance: 3.1, durationSec: 1620 }]), 1);
  assert.equal(completionSetCount([{ distance: 3.1, durationSec: 1620 }, { distance: null, durationSec: null }]), 1);
  assert.equal(completionSetCount([{ distance: null, durationSec: 900 }]), 1, 'a timed bout with no distance is still a bout');
});

test('completionSetCount — an empty exercise is zero, and that is the only zero', () => {
  assert.equal(completionSetCount([]), 0);
});

test('a bodyweight set sets no weight record', () => {
  // BW writes weight 0. A personal record measured in pounds cannot be 0 of them, and announcing
  // "Pull-Up — 0 lb" to someone who just did their first chin-up is the record system lying.
  const bw = [set(0, 0, 5, 5, true), set(1, 0, 5, 4, true)];
  assert.equal(bestRecordWeight(bw), null);

  // A weighted pull-up still records, and records the added load.
  assert.equal(bestRecordWeight([set(0, 0, 5, 5, true), set(1, 25, 5, 3, true)]), 25);
});

// ── a bout that measured nothing did not happen ──────────────────────────────

test('an unfinished cardio bout is not part of the record', async () => {
  // Reported from real use: an athlete started a treadmill walk, never ended it, trained something else
  // and finished. The record showed a walk beside the strength work — with no time and no distance,
  // because the bout was never stopped. The set filter already dropped the un-done set; the EXERCISE
  // row was written anyway, which is what made the record claim it.
  const { buildSaveExercises } = await import('../save-core.ts');
  const session = {
    workoutName: 'Test',
    activityType: 'strength',
    startedAt: new Date(0).toISOString(),
    programId: null,
    exercises: [
      {
        name: 'Treadmill Walk',
        catalogKey: 'cardio:walk',
        kind: 'cardio',
        section: 'main',
        position: 0,
        sets: [{ setIndex: 0, weight: null, targetReps: 0, actualReps: null, done: false, durationSec: null, distanceMi: null }],
      },
      {
        name: 'Barbell Back Squat',
        catalogKey: 'barbell-back-squat',
        section: 'main',
        position: 1,
        sets: [{ setIndex: 0, weight: 225, targetReps: 5, actualReps: 5, done: true }],
      },
    ],
  };
  const rows = buildSaveExercises(session);
  assert.deepEqual(rows.map((r) => r.name), ['Barbell Back Squat'], 'the unfinished walk must not be recorded');
});

test('a cardio bout that WAS logged is recorded normally', async () => {
  const { buildSaveExercises } = await import('../save-core.ts');
  const session = {
    workoutName: 'Test',
    activityType: 'strength',
    startedAt: new Date(0).toISOString(),
    programId: null,
    exercises: [
      {
        name: 'Treadmill Walk',
        catalogKey: 'cardio:walk',
        kind: 'cardio',
        section: 'main',
        position: 0,
        sets: [{ setIndex: 0, weight: null, targetReps: 0, actualReps: null, done: true, durationSec: 1800, distanceMi: 1.5, modality: 'indoor' }],
      },
    ],
  };
  const rows = buildSaveExercises(session);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].sets[0].duration_sec, 1800);
  assert.equal(rows[0].sets[0].distance, 1.5);
});

test('a strength exercise with no completed sets is still part of the session', async () => {
  // A different statement from an unmeasured bout: "this was in the session and I did not get to it"
  // is the athlete's own record of intent, not a measurement the app invented.
  const { buildSaveExercises } = await import('../save-core.ts');
  const session = {
    workoutName: 'Test',
    activityType: 'strength',
    startedAt: new Date(0).toISOString(),
    programId: null,
    exercises: [
      { name: 'Bench Press', catalogKey: 'barbell-bench-press', section: 'main', position: 0, sets: [{ setIndex: 0, weight: null, targetReps: 5, actualReps: null, done: false }] },
    ],
  };
  assert.deepEqual(buildSaveExercises(session).map((r) => r.name), ['Bench Press']);
});
