import { test } from 'node:test';
import assert from 'node:assert/strict';

import { assembleSignals, improvementDatesForType, pbDatesByRunningMax } from '../signals.ts';

test('pbDatesByRunningMax emits a date only when a new max is set', () => {
  const pts = [
    { date: '2026-01-01', value: 100 },
    { date: '2026-01-08', value: 95 }, // not a PB
    { date: '2026-01-15', value: 110 }, // PB
    { date: '2026-01-22', value: 110 }, // tie, not a PB
    { date: '2026-01-29', value: 120 }, // PB
  ];
  assert.deepEqual(pbDatesByRunningMax(pts), ['2026-01-01', '2026-01-15', '2026-01-29']);
});

test('improvement source is remapped per athlete type', () => {
  const loadPRs = ['2026-01-01', '2026-02-01'];
  const sessions = [
    { date: '2026-01-05', durationSec: 1800, state: 'saved', activityType: 'running', distance: 5 },
    { date: '2026-01-19', durationSec: 1800, state: 'saved', activityType: 'running', distance: 8 }, // distance PB
  ];
  assert.deepEqual(improvementDatesForType('strength', loadPRs, sessions), loadPRs);
  assert.deepEqual(improvementDatesForType('bodybuilding', loadPRs, sessions), loadPRs);
  assert.deepEqual(improvementDatesForType('endurance', loadPRs, sessions), ['2026-01-05', '2026-01-19']);
  assert.equal(improvementDatesForType('hybrid', loadPRs, sessions).length, 4); // load PRs ∪ distance PBs
});

test('assembleSignals filters to meaningful work and counts weeks/volume', () => {
  const sessions = [
    { date: '2026-06-01', durationSec: 1200, state: 'saved', activityType: 'strength', distance: null }, // ✓
    { date: '2026-06-03', durationSec: 600, state: 'saved', activityType: 'running', distance: 3 }, // ✓ (10-min floor, modality mapped)
    { date: '2026-06-10', durationSec: 3600, state: 'in_progress', activityType: 'strength', distance: null }, // ✗ not saved
    { date: '2026-06-11', durationSec: 300, state: 'saved', activityType: 'strength', distance: null }, // ✗ under 10 min
    { date: '2026-06-15', durationSec: 1800, state: 'saved', activityType: 'cycling', distance: 20 }, // ✓
  ];
  const s = assembleSignals({
    athleteType: 'strength',
    today: '2026-06-22',
    sessions,
    loadPRDates: ['2026-06-01'],
    programGraduations: 2,
    distinctProgramGraduations: 2,
    sealedChapters: 1,
    goalEvents: 1,
    primaryGoalsAchieved: 0,
  });
  assert.equal(s.nativeSessions, 3); // three meaningful sessions
  assert.equal(s.nativeActiveWeeks, 2); // Jun 1 & Jun 3 share a Mon–Sun week; Jun 15 is a second week
  assert.equal(s.programGraduations, 2);
  assert.equal(s.improvement.totalPBs, 1);
  assert.ok(s.journeyElapsedDays >= 21); // earliest Jun 1 → Jun 22
});

test('assembleSignals with no activity is a clean Foundation-floor signal set', () => {
  const s = assembleSignals({
    athleteType: 'strength',
    today: '2026-06-22',
    sessions: [],
    loadPRDates: [],
    programGraduations: 0,
    distinctProgramGraduations: 0,
    sealedChapters: 0,
    goalEvents: 0,
    primaryGoalsAchieved: 0,
  });
  assert.equal(s.nativeSessions, 0);
  assert.equal(s.nativeActiveWeeks, 0);
  assert.equal(s.journeyElapsedDays, 0);
  assert.equal(s.improvement.totalPBs, 0);
});
