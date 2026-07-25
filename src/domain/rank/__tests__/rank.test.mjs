import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  FOUNDATION_I,
  NO_IMPROVEMENT,
  countActiveWeeks,
  countRecentActiveWeeks,
  isMeaningfulWork,
  meetsImprovement,
  mondayWeekKey,
  rankDisplay,
  rankLevel,
  resolveRank,
  resolveSubTier,
} from '../rank.ts';
import { summarizeImprovement } from '../improvement.ts';

// A zeroed signal set; override per test. Defaults resolve to Foundation I.
function signals(overrides = {}) {
  return {
    athleteType: 'strength',
    journeyElapsedDays: 0,
    nativeActiveWeeks: 0,
    importedActiveWeeks: 0,
    recentActiveWeeks: 0,
    nativeSessions: 0,
    importedSessions: 0,
    programGraduations: 0,
    distinctProgramGraduations: 0,
    sealedChapters: 0,
    goalEvents: 0,
    primaryGoalsAchieved: 0,
    improvement: NO_IMPROVEMENT,
    ...overrides,
  };
}

const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// ── rankLevel + display ──
test('rankLevel maps families to 1–25; Legacy = 25', () => {
  assert.equal(rankLevel('foundation', 1), 1);
  assert.equal(rankLevel('foundation', 4), 4);
  assert.equal(rankLevel('builder', 1), 5);
  assert.equal(rankLevel('established', 4), 20);
  assert.equal(rankLevel('legend', 1), 21);
  assert.equal(rankLevel('legacy', 1), 25);
});

test('rankDisplay formats family + roman; Legacy has no sub-tier', () => {
  assert.equal(rankDisplay('craftsman', 3), 'Craftsman · III');
  assert.equal(rankDisplay('foundation', 1), 'Foundation · I');
  assert.equal(rankDisplay('legacy', 1), 'Legacy');
});

// ── meaningful work (RCM §3.5) ──
test('meaningful work needs completed + ≥10 min + a canonical type; no min-sets', () => {
  assert.equal(isMeaningfulWork({ durationMinutes: 12, completed: true, activityType: 'STRENGTH' }), true);
  assert.equal(isMeaningfulWork({ durationMinutes: 10, completed: true, activityType: 'yoga' }), true); // 10 is the floor; case-insensitive
  assert.equal(isMeaningfulWork({ durationMinutes: 9, completed: true, activityType: 'RUN' }), false); // under floor
  assert.equal(isMeaningfulWork({ durationMinutes: 40, completed: false, activityType: 'RUN' }), false); // not completed
  assert.equal(isMeaningfulWork({ durationMinutes: 40, completed: true, activityType: 'PILATES' }), false); // not a canonical type
});

// ── active weeks (Mon–Sun) ──
test('active weeks group by Mon–Sun; recent window filters by asOf', () => {
  const mon = mondayWeekKey('2026-07-24');
  assert.equal(new Date(`${mon}T00:00:00Z`).getUTCDay(), 1); // key is a Monday
  assert.equal(countActiveWeeks([mon, addDays(mon, 3), addDays(mon, 6)]), 1); // same Mon–Sun week
  assert.equal(countActiveWeeks([mon, addDays(mon, 7)]), 2); // next week
  // recent: a session 20 weeks back is outside a 12-week window; one 2 weeks back is inside.
  const asOf = '2026-07-24';
  assert.equal(countRecentActiveWeeks([addDays(asOf, -140), addDays(asOf, -14)], asOf, 12), 1);
});

// ── improvement summary + requirement checks (CAL Q13) ──
test('summarizeImprovement derives distribution facts', () => {
  const s = summarizeImprovement(['2024-01-10', '2024-03-01', '2025-02-01']);
  assert.equal(s.totalPBs, 3);
  assert.equal(s.hasTwoSeparatedBy30d, true);
  assert.equal(s.distinctYears, 2);
  assert.ok(s.spanMonths >= 12);
  assert.deepEqual(summarizeImprovement([]), NO_IMPROVEMENT);
});

test('meetsImprovement gates by shape', () => {
  assert.equal(meetsImprovement('none', NO_IMPROVEMENT), true);
  assert.equal(meetsImprovement('first', { totalPBs: 1, hasTwoSeparatedBy30d: false, spanMonths: 0, distinctYears: 1 }), true);
  assert.equal(meetsImprovement('multi-period', { totalPBs: 3, hasTwoSeparatedBy30d: true, spanMonths: 2, distinctYears: 1 }), true);
  assert.equal(meetsImprovement('multi-period', { totalPBs: 3, hasTwoSeparatedBy30d: false, spanMonths: 2, distinctYears: 1 }), false);
  assert.equal(meetsImprovement('multi-year', { totalPBs: 10, hasTwoSeparatedBy30d: true, spanMonths: 20, distinctYears: 2 }), true);
});

// ── resolveRank: the ladder ──
test('a new athlete is Foundation I', () => {
  assert.deepEqual(resolveRank(signals()), FOUNDATION_I);
});

test('sub-tier climbs within Foundation on active weeks', () => {
  assert.equal(resolveRank(signals({ nativeActiveWeeks: 5 })).display, 'Foundation · III'); // [2,4,6] → 5≥4
});

test('Builder needs 6 AW + 12 sessions (5 AW stays Foundation)', () => {
  assert.equal(resolveRank(signals({ nativeActiveWeeks: 5, nativeSessions: 20 })).family, 'foundation');
  assert.equal(resolveRank(signals({ nativeActiveWeeks: 6, nativeSessions: 12 })).family, 'builder');
  assert.equal(resolveRank(signals({ nativeActiveWeeks: 6, nativeSessions: 11 })).family, 'foundation'); // volume short
});

test('Craftsman requires a first improvement event — convergence blocks without it', () => {
  const meetsExceptImprovement = { nativeActiveWeeks: 18, nativeSessions: 36, journeyElapsedDays: 60 };
  assert.equal(resolveRank(signals(meetsExceptImprovement)).family, 'builder'); // 0 PBs → capped at Builder
  assert.equal(resolveRank(signals({ ...meetsExceptImprovement, improvement: summarizeImprovement(['2026-01-01']) })).family, 'craftsman');
});

// A signal set that just meets Architect (and everything below it).
function architectSignals(extra = {}) {
  return signals({
    journeyElapsedDays: 270,
    nativeActiveWeeks: 36,
    recentActiveWeeks: 8,
    nativeSessions: 90,
    programGraduations: 1,
    distinctProgramGraduations: 1,
    sealedChapters: 1,
    goalEvents: 1,
    improvement: { totalPBs: 3, hasTwoSeparatedBy30d: true, spanMonths: 2, distinctYears: 1 },
    ...extra,
  });
}

test('Architect (prestige) reached when all rows met; Architect I at family entry', () => {
  const r = resolveRank(architectSignals());
  assert.equal(r.family, 'architect');
  assert.equal(r.subTier, 1); // within-family AW = 36-36 = 0
  assert.equal(r.rankLevel, 13);
});

test('recent-engagement gate: dropping to 7 recent AW drops Architect → Craftsman IV', () => {
  const r = resolveRank(architectSignals({ recentActiveWeeks: 7 }));
  assert.equal(r.family, 'craftsman');
  assert.equal(r.subTier, 4); // within-craftsman AW = 36-18 = 18 ≥ 14, first-improvement evidence present
});

test('native floor holds even when 50% import credit would clear the cumulative bar', () => {
  // Architect: cumulative 36, native floor 18. 18 native + 36 imported → effective 18+18=36 (meets), native≥18 (meets).
  const ok = architectSignals({ nativeActiveWeeks: 18, importedActiveWeeks: 36 });
  assert.equal(resolveRank(ok).family, 'architect');
  // 10 native + 60 imported → effective 10+30=40 (clears 36) but native 10 < 18 floor → blocked at Craftsman.
  const blocked = architectSignals({ nativeActiveWeeks: 10, importedActiveWeeks: 60 });
  assert.equal(resolveRank(blocked).family, 'craftsman');
});

test('sub-tier confirming evidence: Established IV needs a 3rd sealed chapter', () => {
  const established = signals({
    journeyElapsedDays: 540,
    nativeActiveWeeks: 98, // within-established = 98-72 = 26 → IV threshold
    recentActiveWeeks: 8,
    nativeSessions: 200,
    programGraduations: 3,
    distinctProgramGraduations: 3,
    sealedChapters: 2,
    goalEvents: 2,
    primaryGoalsAchieved: 1,
    improvement: { totalPBs: 6, hasTwoSeparatedBy30d: true, spanMonths: 8, distinctYears: 2 },
  });
  assert.equal(resolveRank(established).display, 'Established · III'); // 2 chapters → IV evidence fails
  assert.equal(resolveRank(signals({ ...established, sealedChapters: 3 })).display, 'Established · IV');
});

test('a fully-maxed athlete reaches Legacy (level 25)', () => {
  const legacy = signals({
    journeyElapsedDays: 2555,
    nativeActiveWeeks: 288,
    recentActiveWeeks: 8,
    nativeSessions: 700,
    programGraduations: 10,
    distinctProgramGraduations: 10,
    sealedChapters: 5,
    goalEvents: 6,
    primaryGoalsAchieved: 4,
    improvement: { totalPBs: 15, hasTwoSeparatedBy30d: true, spanMonths: 40, distinctYears: 3 },
  });
  const r = resolveRank(legacy);
  assert.equal(r.family, 'legacy');
  assert.equal(r.rankLevel, 25);
  assert.equal(r.display, 'Legacy');
});

test('Legacy blocked if primary-goals-achieved minimum (≥4) is short — a hard minimum, not a weight', () => {
  const nearLegacy = signals({
    journeyElapsedDays: 2555,
    nativeActiveWeeks: 288,
    recentActiveWeeks: 8,
    nativeSessions: 700,
    programGraduations: 10,
    distinctProgramGraduations: 10,
    sealedChapters: 5,
    goalEvents: 6,
    primaryGoalsAchieved: 3, // one short of 4
    improvement: { totalPBs: 15, hasTwoSeparatedBy30d: true, spanMonths: 40, distinctYears: 3 },
  });
  assert.equal(resolveRank(nearLegacy).family, 'legend');
});

// ── resolveSubTier direct ──
test('resolveSubTier derives within-family AW from cumulative − entry', () => {
  // Builder entry = 6 AW; [3,6,10]. 6 native → within 0 → I; 12 native → within 6 → III.
  assert.equal(resolveSubTier('builder', signals({ nativeActiveWeeks: 6 })), 1);
  assert.equal(resolveSubTier('builder', signals({ nativeActiveWeeks: 12 })), 3);
  assert.equal(resolveSubTier('legacy', signals({ nativeActiveWeeks: 999 })), 1); // no sub-tiers
});
