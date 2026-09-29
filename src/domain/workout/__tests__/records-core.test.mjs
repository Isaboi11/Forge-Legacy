import { test } from 'node:test';
import assert from 'node:assert/strict';
import { annotateRecords, bestMark, dayBefore, inRecordBand, recordLine, recordsByWorkout, sameLift, utcDay } from '../records-core.ts';

const BENCH = 'barbell-bench-press';
const row = (load_value, load_reps, achieved_on, created_at, extra = {}) => ({
  exercise: 'Barbell Bench Press',
  catalog_key: BENCH,
  load_value,
  load_reps,
  achieved_on,
  created_at,
  ...extra,
});
const bench = (sets, extra = {}) => ({ name: 'Barbell Bench Press', catalogKey: BENCH, section: 'main', sets, ...extra });
const s = (weight, reps) => ({ weight, reps });

/*
 * The QA F9 day, as the tester logged it. Three sessions on 2026-09-26:
 *   · "QA Workout One"  135×8, 500×0, 500×8  — nothing in the 1–5 band, sets no record
 *   · "Heavy Triple"    150×5                — the record (a baseline 140×3 exists from the day before)
 *   · "Later"           145×8                — nothing in the band
 */
const baseline = row(140, 3, '2026-09-25', '2026-09-25T18:00:00Z');
const record = row(150, 5, '2026-09-26', '2026-09-26T15:10:00Z');
const workouts = [
  { id: 'qa-one', startedAt: '2026-09-26T14:00:00+00:00', exercises: [bench([s(135, 8), s(500, 0), s(500, 8)])] },
  { id: 'heavy', startedAt: '2026-09-26T15:00:00+00:00', exercises: [bench([s(150, 5)])] },
  { id: 'later', startedAt: '2026-09-26T19:00:00+00:00', exercises: [bench([s(145, 8)])] },
];

test('inRecordBand — 1 to 5 reps only', () => {
  assert.equal(inRecordBand(0), false);
  assert.equal(inRecordBand(1), true);
  assert.equal(inRecordBand(5), true);
  assert.equal(inRecordBand(6), false);
  assert.equal(inRecordBand(null), false);
});

test('annotateRecords — the first mark is a baseline, a heavier later mark is a record', () => {
  const a = annotateRecords([record, baseline]);
  assert.deepEqual(
    a.map((r) => [r.weight, r.isFirst, r.isRecord]),
    [
      [140, true, false],
      [150, false, true],
    ],
  );
});

test('annotateRecords — an equal or lighter later row is not a record; out-of-band rows are ignored', () => {
  const a = annotateRecords([
    baseline,
    row(140, 2, '2026-09-26', '2026-09-26T10:00:00Z'),
    row(130, 5, '2026-09-27', '2026-09-27T10:00:00Z'),
    row(500, 8, '2026-09-27', '2026-09-27T11:00:00Z'), // an Epley-era 8-rep row is not a record
  ]);
  assert.equal(a.length, 3);
  assert.equal(a.filter((r) => r.isRecord).length, 0);
});

test('annotateRecords — a keyless pre-0078 row is the same lift as its keyed successor', () => {
  const old = row(135, 5, '2026-01-01', '2026-01-01T00:00:00Z', { catalog_key: null });
  const a = annotateRecords([old, row(145, 5, '2026-02-01', '2026-02-01T00:00:00Z')]);
  assert.equal(a[1].isFirst, false);
  assert.equal(a[1].isRecord, true);
});

test('bestMark — heaviest in the band, more reps on a tie; the 500×8 is not the best', () => {
  const rows = [baseline, record, row(150, 3, '2026-09-26', '2026-09-26T16:00:00Z'), row(500, 8, '2026-09-26', 'x')];
  assert.deepEqual(bestMark(rows, { catalogKey: BENCH, name: 'Bench' }), { weight: 150, reps: 5, achievedOn: '2026-09-26' });
  assert.equal(bestMark(rows, { catalogKey: 'back-squat', name: 'Back Squat' }), null);
  assert.equal(bestMark([], { name: 'Barbell Bench Press' }), null);
  // numeric columns can arrive as strings
  assert.equal(bestMark([row('227.5', 1, '2026-09-26', 'x')], { catalogKey: BENCH, name: 'x' }).weight, 227.5);
});

test('sameLift — key first, name only for keyless rows', () => {
  assert.equal(sameLift({ catalogKey: BENCH, name: 'Bench press' }, { catalog_key: BENCH, name: 'Barbell Bench Press' }), true);
  assert.equal(sameLift({ catalogKey: BENCH, name: 'Bench' }, { catalog_key: null, name: 'Bench' }), true);
  assert.equal(sameLift({ catalogKey: BENCH, name: 'Bench' }, { catalog_key: 'other', name: 'Bench' }), false);
  assert.equal(sameLift({ name: 'Bench' }, { catalog_key: null, name: 'Bench' }), true);
});

test('recordsByWorkout — F9: only the session that lifted 150×5 gets the chip', () => {
  const by = recordsByWorkout(annotateRecords([baseline, record]), workouts);
  assert.deepEqual([...by.keys()], ['heavy']);
  assert.deepEqual(by.get('heavy'), [
    { exercise: 'Barbell Bench Press', catalogKey: BENCH, weight: 150, reps: 5, achievedOn: '2026-09-26' },
  ]);
});

test('recordsByWorkout — a first-ever mark is attributed to nothing', () => {
  const by = recordsByWorkout(annotateRecords([record]), workouts);
  assert.equal(by.size, 0);
});

test('recordsByWorkout — two sessions lifting the same weight: the earlier one set it', () => {
  const ws = [
    { id: 'second', startedAt: '2026-09-26T18:00:00Z', exercises: [bench([s(150, 5)])] },
    { id: 'first', startedAt: '2026-09-26T15:00:00Z', exercises: [bench([s(150, 4)])] },
  ];
  const by = recordsByWorkout(annotateRecords([baseline, record]), ws);
  assert.deepEqual([...by.keys()], ['first']);
});

test('recordsByWorkout — a session started before UTC midnight owns the record dated the next day', () => {
  const late = row(150, 5, '2026-09-27', '2026-09-27T00:20:00Z');
  const ws = [{ id: 'late', startedAt: '2026-09-26T23:30:00Z', exercises: [bench([s(150, 5)])] }];
  assert.deepEqual([...recordsByWorkout(annotateRecords([baseline, late]), ws).keys()], ['late']);
});

test('recordsByWorkout — warm-up rows and out-of-band sets never carry a record', () => {
  const ws = [
    { id: 'warm', startedAt: '2026-09-26T15:00:00Z', exercises: [bench([s(150, 5)], { section: 'warmup' })] },
    { id: 'eight', startedAt: '2026-09-26T16:00:00Z', exercises: [bench([s(150, 8)])] },
  ];
  assert.equal(recordsByWorkout(annotateRecords([baseline, record]), ws).size, 0);
});

test('recordsByWorkout — matches the lift by name when the session row has no key', () => {
  const ws = [{ id: 'w', startedAt: '2026-09-26T15:00:00Z', exercises: [bench([s(150, 5)], { catalogKey: null })] }];
  assert.deepEqual([...recordsByWorkout(annotateRecords([baseline, record]), ws).keys()], ['w']);
});

test('recordsByWorkout — 0242: a row naming its workout goes to THAT workout, not the one whose sets match', () => {
  // Two sessions both lifted 150×5 the same day; the server says the LATER one set the record (e.g. the
  // earlier was deleted and re-logged). The set-matching guess would pick the earlier — the id wins.
  const ws = [
    { id: 'early', startedAt: '2026-09-26T09:00:00+00:00', exercises: [bench([s(150, 5)])] },
    { id: 'late', startedAt: '2026-09-26T18:00:00+00:00', exercises: [bench([s(150, 5)], { name: 'Bench Press' })] },
  ];
  const tagged = row(150, 5, '2026-09-26', '2026-09-26T18:30:00Z', { workout_id: 'late' });
  const by = recordsByWorkout(annotateRecords([baseline, tagged]), ws);
  assert.deepEqual([...by.keys()], ['late']);
  // The session's own name for the lift, when the session is in the list.
  assert.equal(by.get('late')[0].exercise, 'Bench Press');
});

test("recordsByWorkout — 0242: attributed even when that workout is not in the list, under the row's own name", () => {
  const tagged = row(150, 5, '2026-09-26', '2026-09-26T15:10:00Z', { workout_id: 'elsewhere' });
  const by = recordsByWorkout(annotateRecords([baseline, tagged]), workouts);
  assert.deepEqual([...by.keys()], ['elsewhere']);
  assert.deepEqual(by.get('elsewhere'), [{ exercise: 'Barbell Bench Press', catalogKey: BENCH, weight: 150, reps: 5, achievedOn: '2026-09-26' }]);
});

test('recordsByWorkout — 0242: a first mark with a workout id is still a baseline, not a record', () => {
  const first = row(150, 5, '2026-09-26', '2026-09-26T15:10:00Z', { workout_id: 'heavy' });
  assert.equal(recordsByWorkout(annotateRecords([first]), workouts).size, 0);
});

test('recordsByWorkout — rows from before 0242 (no workout id) still take the set-matching path', () => {
  const by = recordsByWorkout(annotateRecords([baseline, { ...record, workout_id: null }]), workouts);
  assert.deepEqual([...by.keys()], ['heavy']);
});

test('utcDay / dayBefore', () => {
  assert.equal(utcDay('2026-09-26T23:30:00-05:00'), '2026-09-27');
  assert.equal(dayBefore('2026-03-01'), '2026-02-28');
});

test('recordLine — stored pounds, stated with reps', () => {
  assert.equal(recordLine({ exercise: 'Barbell Bench Press', weight: 150, reps: 5 }), 'Barbell Bench Press · 150 lb × 5');
  assert.equal(recordLine({ exercise: 'Squat', weight: 220.46226, reps: 1 }), 'Squat · 220.46 lb × 1');
});
