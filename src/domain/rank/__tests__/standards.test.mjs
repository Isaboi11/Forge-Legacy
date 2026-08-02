import { test } from 'node:test';
import assert from 'node:assert/strict';

import { allMet, familyStandards, subTierStandards } from '../standards.ts';
import { meetsFamilyPromotion, resolveSubTier } from '../rank.ts';
import { FAMILY_PROMOTIONS, FAMILIES, SUBTIER_ACTIVE_WEEKS } from '../thresholds.ts';

const PROMOTABLE = FAMILIES.slice(1);

const signals = (over = {}) => ({
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
  improvement: { totalPBs: 0, hasTwoSeparatedBy30d: false, spanMonths: 0, distinctYears: 0 },
  ...over,
});

/** Signals that clear every requirement for `target`, with room to spare. */
const clearing = (target) => {
  const r = FAMILY_PROMOTIONS[target];
  return signals({
    journeyElapsedDays: r.timeGateDays + 10,
    nativeActiveWeeks: r.cumulativeActiveWeeks + 5,
    nativeSessions: r.volumeSessions + 5,
    recentActiveWeeks: 12,
    programGraduations: Math.max(r.programGraduations, r.distinctProgramGraduations ?? 0) + 1,
    distinctProgramGraduations: (r.distinctProgramGraduations ?? 0) + 1,
    sealedChapters: r.sealedChapters + 1,
    goalEvents: r.goalEvents + 1,
    primaryGoalsAchieved: r.primaryGoalsAchieved + 1,
    improvement: { totalPBs: 20, hasTwoSeparatedBy30d: true, spanMonths: 48, distinctYears: 4 },
  });
};

/*
 * THE ONE THAT MATTERS.
 *
 * The screen tells an athlete what a rank asks for. The engine decides whether they get it. Those are two
 * statements of one rule, and the moment they disagree the app is lying to somebody about why they were
 * not promoted — the worst possible bug in a system whose entire job is to feel earned rather than
 * arbitrary. So the standards are not trusted to match `meetsFamilyPromotion`; they are asserted to.
 */
test('every requirement met ⟺ the engine promotes — for every family, at every boundary', () => {
  for (const target of PROMOTABLE) {
    const ok = clearing(target);
    assert.equal(allMet(familyStandards(target, ok)), true, `${target}: rows say not met on clearing signals`);
    assert.equal(meetsFamilyPromotion(target, ok), true, `${target}: engine refuses clearing signals`);

    // Now break each requirement in turn and confirm BOTH sides notice.
    const breakers = [
      ['journeyElapsedDays', 0],
      ['nativeActiveWeeks', 0],
      ['nativeSessions', 0],
      ['programGraduations', 0],
      ['sealedChapters', 0],
      ['goalEvents', 0],
      ['primaryGoalsAchieved', 0],
      ['recentActiveWeeks', 0],
      ['improvement', { totalPBs: 0, hasTwoSeparatedBy30d: false, spanMonths: 0, distinctYears: 0 }],
    ];
    for (const [field, value] of breakers) {
      const broken = { ...ok, [field]: value };
      // `distinctProgramGraduations` can never exceed the total, so keep them consistent.
      if (field === 'programGraduations') broken.distinctProgramGraduations = 0;
      const rowsSay = allMet(familyStandards(target, broken));
      const engineSays = meetsFamilyPromotion(target, broken);
      assert.equal(
        rowsSay,
        engineSays,
        `${target} with ${field} broken: screen says ${rowsSay}, engine says ${engineSays}`,
      );
    }
  }
});

test('imported history counts at half rate for prestige, on the screen exactly as in the engine', () => {
  // Architect is the first prestige family. 36 cumulative weeks, 18 of them native.
  const s = signals({
    journeyElapsedDays: 400,
    nativeActiveWeeks: 18,
    importedActiveWeeks: 36, // → 18 + 0.5×36 = 36 effective, exactly the bar
    nativeSessions: 90,
    recentActiveWeeks: 12,
    programGraduations: 1,
    sealedChapters: 1,
    goalEvents: 1,
    improvement: { totalPBs: 5, hasTwoSeparatedBy30d: true, spanMonths: 12, distinctYears: 2 },
  });
  const rows = familyStandards('architect', s);
  const aw = rows.find((r) => r.key === 'activeWeeks');
  assert.equal(aw.have, 36, 'the screen must show the credited figure the engine actually compares');
  assert.equal(aw.met, true);
  assert.equal(allMet(rows), meetsFamilyPromotion('architect', s));
});

test('a requirement of zero is never printed', () => {
  // Builder asks for no programs, chapters or goals. Printing "0 of 0" three times buries the two numbers
  // that matter under rows that can never be unsatisfied.
  const keys = familyStandards('builder', null).map((r) => r.key);
  // Builder's time gate is 0 days, so even that row is absent — it asks for two things, and says two.
  assert.deepEqual(keys, ['activeWeeks', 'sessions'], `builder printed: ${keys.join(', ')}`);

  // And nothing anywhere prints a zero requirement.
  for (const target of PROMOTABLE) {
    for (const r of familyStandards(target, null)) {
      assert.ok(r.need > 0, `${target}.${r.key} printed "of ${r.need}"`);
    }
  }
});

test('the standards render with no athlete at all — they are a reference, not a report card', () => {
  for (const target of PROMOTABLE) {
    const rows = familyStandards(target, null);
    assert.ok(rows.length > 0, `${target} states nothing`);
    for (const r of rows) {
      assert.equal(r.have, null);
      assert.equal(r.met, false);
      assert.ok(r.need > 0, `${target}.${r.key} printed a zero requirement`);
      assert.ok(r.label.length > 0);
    }
  }
});

test('a PR count alone never claims a shaped improvement requirement is met', () => {
  // Established asks for six PRs spanning six months. Six PRs in one week is not that, and saying "met"
  // would be a lie the athlete only discovers at the promotion that does not arrive.
  const s = signals({ improvement: { totalPBs: 6, hasTwoSeparatedBy30d: true, spanMonths: 1, distinctYears: 1 } });
  const row = familyStandards('established', s).find((r) => r.key === 'improvement');
  assert.equal(row.have, 6);
  assert.equal(row.need, 6);
  assert.equal(row.met, false, 'count reached, shape not — must not read as satisfied');
});

test('sub-tier weeks match the engine, and Legacy has none', () => {
  assert.deepEqual(subTierStandards('legacy', null), []);
  for (const family of FAMILIES.filter((f) => f !== 'legacy')) {
    const rows = subTierStandards(family, null);
    assert.deepEqual(rows.map((r) => r.weeks), [...SUBTIER_ACTIVE_WEEKS[family]], `${family} sub-tier weeks drifted`);
    assert.deepEqual(rows.map((r) => r.tier), [2, 3, 4]);
  }
});

test('sub-tier progress agrees with resolveSubTier at the boundary', () => {
  // Builder is entered at 6 cumulative weeks; II wants 3 more.
  const [t2] = SUBTIER_ACTIVE_WEEKS.builder;
  const entry = FAMILY_PROMOTIONS.builder.cumulativeActiveWeeks;
  const just = signals({ nativeActiveWeeks: entry + t2 });
  const shy = signals({ nativeActiveWeeks: entry + t2 - 1 });

  assert.equal(subTierStandards('builder', just)[0].met, true);
  assert.equal(resolveSubTier('builder', just) >= 2, true);
  assert.equal(subTierStandards('builder', shy)[0].met, false);
  assert.equal(resolveSubTier('builder', shy) >= 2, false);
});
