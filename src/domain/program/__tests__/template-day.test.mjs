import test from 'node:test';
import assert from 'node:assert/strict';

import { daySectionsSummary, templateRowsToDayWith } from '../template-day-core.ts';

/**
 * The template → program-day crossing (`template-day-core`).
 *
 * These guard the two things that would go wrong silently. A row whose `section` is dropped lands in
 * Main, so a cool-down stretch would be prescribed as a working lift. And a cardio finisher that misses
 * its branch becomes sets-of-a-run: 29 of the 81 Forge sessions end in one, so that failure would reach
 * an athlete as "3 × 8 of a mile".
 */

/** A stand-in catalogue — the real one is 794 rows and this file must load without it. */
const CATALOG = {
  'barbell-bench-press': { equip: 'Barbell', muscles: ['Chest', 'Triceps'], cat: 'Chest' },
  'band-pull-apart': { equip: 'Resistance Band', muscles: ['Rear Delts'], cat: 'Shoulders' },
};
const lookup = (k) => CATALOG[k];

const row = (over = {}) => ({ catalogKey: 'barbell-bench-press', name: 'Bench Press', sets: 3, targetReps: 8, ...over });

test('each row lands in the section it was authored into', () => {
  const d = templateRowsToDayWith(
    [
      row({ catalogKey: 'band-pull-apart', name: 'Band Pull-Apart', section: 'warmup' }),
      row({ section: 'main' }),
      row({ catalogKey: null, name: 'Chest Stretch', section: 'cooldown', sets: 1, targetReps: 30 }),
    ],
    lookup,
  );
  assert.equal(d.warmup.length, 1);
  assert.equal(d.main.length, 1);
  assert.equal(d.cooldown.length, 1);
  assert.equal(d.cooldown[0].name, 'Chest Stretch');
});

test('a row with no section reads as main — the reading every pre-0095 template gets', () => {
  const d = templateRowsToDayWith([row({ section: undefined })], lookup);
  assert.equal(d.main.length, 1);
  assert.equal(d.warmup.length + d.cooldown.length, 0);
});

test('sets and reps cross over, and targetReps becomes reps', () => {
  const [ex] = templateRowsToDayWith([row({ sets: 4, targetReps: 6 })], lookup).main;
  assert.equal(ex.sets, 4);
  assert.equal(ex.reps, 6);
});

test('equipment and muscles are resolved from the catalogue, not from the template row', () => {
  const [ex] = templateRowsToDayWith([row()], lookup).main;
  assert.equal(ex.equip, 'Barbell', 'EquipIcon draws from this');
  assert.deepEqual(ex.muscles, ['Chest', 'Triceps'], 'the day-row subtitle is inferred from these');
});

test('a custom exercise resolves to no equipment and no muscles, and keeps its name', () => {
  const [ex] = templateRowsToDayWith([row({ catalogKey: null, name: 'Sandbag Carry' })], lookup).main;
  assert.equal(ex.name, 'Sandbag Carry');
  assert.equal(ex.equip, undefined);
  assert.deepEqual(ex.muscles, []);
});

test('a cardio finisher crosses as a cardio block, not as sets of a run', () => {
  const [ex] = templateRowsToDayWith(
    [{ catalogKey: 'cardio:run', name: 'Treadmill Run', kind: 'cardio', modality: 'indoor', sets: 1, targetReps: 0, targetMi: 1, section: 'cooldown' }],
    lookup,
  ).cooldown;
  assert.equal(ex.kind, 'cardio');
  assert.equal(ex.activity, 'run');
  assert.equal(ex.targetMi, 1);
  assert.equal(ex.sets, undefined, 'a mile is not three sets of a mile');
});

/**
 * ⚠ THE DURATION USED TO BE DROPPED IN TRANSIT.
 *
 * A template carries BOTH `targetMi` and `targetDurationSec`, and only the distance crossed into the
 * program day. So a session prescribing "run for twenty minutes" was written on save, stored, read back,
 * and then silently discarded one step before anyone could see it — the athlete got a run of no stated
 * length. Nothing errored, because an open target is a legitimate state; it just was not the one
 * authored.
 */
test('a timed cardio block keeps its duration', () => {
  const [ex] = templateRowsToDayWith(
    [{ catalogKey: 'cardio:run', name: 'Easy Run', kind: 'cardio', modality: 'outdoor', sets: 1, targetReps: 0, targetMi: null, targetDurationSec: 1200, section: 'cooldown' }],
    lookup,
  ).cooldown;
  assert.equal(ex.targetSec, 1200, 'twenty minutes was authored and must survive the crossing');
  assert.equal(ex.targetMi, null, 'and an absent distance stays absent rather than becoming 0');
});

test('a cardio block with neither target crosses as fully open', () => {
  // `null` is meaningful here: it prescribes an open bout. A 0 would prescribe a run of no distance.
  const [ex] = templateRowsToDayWith(
    [{ catalogKey: 'cardio:run', name: 'Run', kind: 'cardio', modality: 'outdoor', sets: 1, targetReps: 0 }],
    lookup,
  ).main;
  assert.equal(ex.targetMi, null);
  assert.equal(ex.targetSec, null);
});

test('a cardio block names itself from activity + modality rather than copying the stored name', () => {
  const indoor = templateRowsToDayWith([{ catalogKey: 'cardio:run', name: 'stale name', kind: 'cardio', modality: 'indoor', sets: 1, targetReps: 0, targetMi: 1 }], lookup).main[0];
  const outdoor = templateRowsToDayWith([{ catalogKey: 'cardio:run', name: 'stale name', kind: 'cardio', modality: 'outdoor', sets: 1, targetReps: 0, targetMi: 1 }], lookup).main[0];
  assert.notEqual(indoor.name, 'stale name');
  assert.notEqual(indoor.name, outdoor.name, 'a treadmill run and a road run must not read identically');
  assert.notEqual(indoor.equip, outdoor.equip);
});

test('an unprescribed cardio target stays null — 0 would be a target permanently met', () => {
  const [ex] = templateRowsToDayWith([{ catalogKey: 'cardio:run', name: 'Run', kind: 'cardio', sets: 1, targetReps: 0 }], lookup).main;
  assert.equal(ex.targetMi, null);
  assert.equal(ex.targetPaceSec, null);
  assert.equal(ex.targetSpdMph, null);
});

test('a superset survives the crossing, and an ungrouped kind reads as a circuit', () => {
  const d = templateRowsToDayWith(
    [
      row({ name: 'Press', groupId: 'g1', groupKind: 'superset', groupRounds: 3 }),
      row({ name: 'Row', groupId: 'g1', groupKind: 'superset', groupRounds: 3 }),
      row({ name: 'Burpee', groupId: 'g2', groupKind: null }),
    ],
    lookup,
  );
  assert.equal(d.main[0].groupId, 'g1');
  assert.equal(d.main[0].groupKind, 'superset');
  assert.equal(d.main[0].groupRounds, 3);
  assert.equal(d.main[2].groupKind, 'circuit', 'absent means circuit — the same reading the DB and the logger take');
});

test('an ungrouped row carries no group fields at all', () => {
  const [ex] = templateRowsToDayWith([row()], lookup).main;
  assert.ok(!('groupId' in ex), 'a stray null groupId would read as a block of one');
});

test('daySectionsSummary names only the sections that have something in them', () => {
  const full = { warmup: [1], main: [1, 2, 3], cooldown: [1] };
  assert.equal(daySectionsSummary(full), '3 lifts · 1 warm-up · 1 cool-down');
  assert.equal(daySectionsSummary({ warmup: [], main: [1], cooldown: [] }), '1 lift');
});
