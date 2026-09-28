import { test } from 'node:test';
import assert from 'node:assert/strict';

import { assembleSignals, distinctProgramCount, improvementDatesForType, pbDatesByRunningMax } from '../signals.ts';
import { meetsFamilyPromotion } from '../rank.ts';

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
  assert.equal(s.selfDirectedBlocks, 0); // nowhere near six qualifying weeks
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
  assert.equal(s.selfDirectedBlocks, 0);
  assert.equal(s.journeyElapsedDays, 0);
  assert.equal(s.improvement.totalPBs, 0);
});

/**
 * Blocks are derived from MEANINGFUL work, not from anything that touched the app. A block is meant to
 * stand where a program graduation stands, so the sessions building it must clear the same bar every
 * other rank signal clears (RCM §3.5) — otherwise six weeks of five-minute check-ins would rank someone.
 */
test('assembleSignals derives blocks from meaningful work only', () => {
  const day = (week, offset) => {
    const d = new Date(Date.UTC(2026, 0, 5) + (week * 7 + offset) * 86_400_000);
    return d.toISOString().slice(0, 10);
  };
  /** 6 weeks × 4 sessions/week; `realDays` of them are meaningful, the rest are 5-minute stubs. */
  const build = (realDays) =>
    Array.from({ length: 6 }, (_, w) =>
      Array.from({ length: 4 }, (_, i) => ({
        date: day(w, i),
        durationSec: i < realDays ? 1800 : 300,
        state: 'saved',
        activityType: 'strength',
        distance: null,
      })),
    ).flat();
  const run = (sessions) =>
    assembleSignals({
      athleteType: 'strength', today: '2026-03-01', sessions, loadPRDates: [],
      programGraduations: 0, distinctProgramGraduations: 0, sealedChapters: 0, goalEvents: 0, primaryGoalsAchieved: 0,
    }).selfDirectedBlocks;

  assert.equal(run(build(3)), 1, 'three real days a week for six weeks is a block');
  assert.equal(run(build(2)), 0, 'two real days is not — the stubs cannot make up the difference');
});

test('distinctProgramCount collapses re-runs of a plan but never two different ones', () => {
  const row = (id, source) => ({ id, source_definition_id: source });
  assert.equal(distinctProgramCount([]), 0);
  assert.equal(distinctProgramCount([row('a', 'sf-i'), row('b', 'sf-i')]), 1, 'one plan, run twice');
  assert.equal(distinctProgramCount([row('a', 'sf-i'), row('b', 'sf-ii')]), 2);
  // A null source is an athlete-AUTHORED program — its own plan by definition, keyed on the row id.
  assert.equal(distinctProgramCount([row('a', null), row('b', null)]), 2);
  assert.equal(distinctProgramCount([row('a', 'sf-i'), row('b', 'sf-i'), row('c', null)]), 2);
  // The `id:` prefix keeps the two keyspaces disjoint by construction, not by luck.
  assert.equal(distinctProgramCount([row('x', null), row('y', 'x')]), 2, 'a source named like an id is still distinct');
});

// ── Imported sessions (Apple Health, build 10) — R-D46, CAL Q7/Q11, Apple-Health-Build-Plan §9 ──

const base = {
  loadPRDates: [], programGraduations: 0, distinctProgramGraduations: 0, sealedChapters: 0, goalEvents: 0, primaryGoalsAchieved: 0,
};
const run = (date, imported, distance = 3) => ({ date, durationSec: 1800, state: 'saved', activityType: 'running', distance, imported });

test('imported sessions fill their own bucket; a week with both counts once, as native', () => {
  const s = assembleSignals({
    ...base,
    athleteType: 'endurance',
    today: '2026-06-29',
    sessions: [
      run('2026-06-01', false), // week A native
      run('2026-06-02', true), //  week A imported copy-ish → week stays native
      run('2026-06-08', true), //  week B imported only
      run('2026-06-10', true), //  week B imported only
      run('2026-06-15', false), // week C native
      { date: '2026-06-22', durationSec: 300, state: 'saved', activityType: 'running', distance: 0.5, imported: true }, // not meaningful
    ],
  });
  assert.equal(s.nativeSessions, 2);
  assert.equal(s.importedSessions, 3);
  assert.equal(s.nativeActiveWeeks, 2);
  assert.equal(s.importedActiveWeeks, 1);
});

test('absent `imported` means native — existing callers are unchanged', () => {
  const s = assembleSignals({ ...base, athleteType: 'endurance', today: '2026-06-29', sessions: [{ date: '2026-06-01', durationSec: 1800, state: 'saved', activityType: 'running', distance: 3 }] });
  assert.equal(s.nativeSessions, 1);
  assert.equal(s.importedSessions, 0);
  assert.equal(s.importedActiveWeeks, 0);
});

test('recent engagement and self-directed blocks come from native sessions only; journey starts at the earliest import', () => {
  // Twelve straight weeks of 4 imported runs a week, ending today: would be a block and full recent engagement if native.
  const sessions = [];
  for (let w = 0; w < 12; w++) for (let d = 0; d < 4; d++) sessions.push(run(new Date(Date.UTC(2026, 6, 6) + (w * 7 + d) * 86_400_000).toISOString().slice(0, 10), true));
  const s = assembleSignals({ ...base, athleteType: 'endurance', today: '2026-09-28', sessions });
  assert.equal(s.recentActiveWeeks, 0);
  assert.equal(s.selfDirectedBlocks, 0);
  assert.equal(s.nativeActiveWeeks, 0);
  assert.equal(s.importedActiveWeeks, 12);
  assert.equal(s.journeyElapsedDays, 84); // 2026-07-06 → 2026-09-28 (RCM §5.6: imports extend longevity)
});

test('below prestige, imports count in full: a Garmin-only runner reaches Builder', () => {
  const sessions = [];
  for (let w = 0; w < 6; w++) for (const d of [0, 3]) sessions.push(run(new Date(Date.UTC(2026, 7, 3) + (w * 7 + d) * 86_400_000).toISOString().slice(0, 10), true));
  const s = assembleSignals({ ...base, athleteType: 'endurance', today: '2026-09-28', sessions });
  assert.equal(meetsFamilyPromotion('builder', s), true);
});

/**
 * The prestige floor with a year of imports (device test §11.10): a big Apple Health history must not
 * carry an athlete into Architect without 18 Forge-native active weeks — and once they have them, the
 * imports DO count (at half) toward the rest.
 */
test('prestige: a year of imports cannot jump the native active-week floor', () => {
  const TODAY = Date.UTC(2026, 8, 28); // a Monday
  const build = (nativeWeeks) => {
    const sessions = [];
    const total = 50 + nativeWeeks;
    let i = 0;
    for (let w = 0; w < total; w++) {
      const monday = TODAY - (total - w) * 7 * 86_400_000;
      for (const d of [0, 2, 4]) {
        sessions.push(run(new Date(monday + d * 86_400_000).toISOString().slice(0, 10), w < 50, 3 + i++ * 0.01));
      }
    }
    return assembleSignals({
      ...base, athleteType: 'endurance', today: '2026-09-28', sessions, programGraduations: 1, distinctProgramGraduations: 1, sealedChapters: 1, goalEvents: 1,
    });
  };

  const short = build(17);
  assert.equal(short.nativeActiveWeeks, 17);
  assert.equal(short.importedActiveWeeks, 50);
  assert.ok(short.nativeActiveWeeks + 0.5 * short.importedActiveWeeks >= 36, 'the cumulative row is met with half-credit imports…');
  assert.equal(meetsFamilyPromotion('architect', short), false, '…but 17 native weeks is under the floor of 18');

  const enough = build(18);
  assert.equal(meetsFamilyPromotion('architect', enough), true);

  // Only the 18 native weeks, without the imports behind them, is nowhere near — the imports do real (half) work.
  const nativeOnly = { ...enough, importedActiveWeeks: 0, importedSessions: 0, journeyElapsedDays: 18 * 7 };
  assert.equal(meetsFamilyPromotion('architect', nativeOnly), false);
});
