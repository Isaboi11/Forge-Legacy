/**
 * triathlon-plan.test.mjs — a triathlon plan is built like a run plan: it climbs, it rests, it tapers,
 * and it ends on the race.
 *
 * ══ WHAT THIS IS GUARDING ══
 *
 * A stress harness built 300 triathlon plans and every one of them was the same shape: four sessions a
 * week growing on a fixed ramp, peaking near three hours a week against the spec's eight, with no down
 * week, no taper and no Race Day. `composeTriWeek` never read the volume curve — which already had the
 * deloads, the taper and the race week in it, because the run plans use it. Every structural check
 * passed on those plans. This file asserts what a coach would check instead.
 *
 * The sweep: weeks 1–30 × days 2–6 × every experience × two bases × buildAnyway on/off, wherever it
 * builds.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/triathlon-plan.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assembleEndurance,
  RACE_SPEC,
  triWeekCapacityMin,
  WEEKLY_INCREASE_CAP,
} from '../rulebook/endurance.ts';

const TODAY = '2026-09-21';
const STRETCHES = ['hamstring-stretch', 'pigeon-stretch', 'standing-quad-stretch'];
const EXPERIENCES = ['beginner', 'intermediate', 'advanced'];
const SPEC = RACE_SPEC.triathlon;
const PEAK_MIN = SPEC.peakHours * 60;

const build = ({ weeks, days, experience, buildAnyway, mi = 10 }) =>
  assembleEndurance(
    {
      goal: 'triathlon',
      experience: { lifting: 'intermediate', running: experience },
      daysPerWeek: days,
      sessionMinutes: 60,
      environment: 'outdoor',
      ownedEquipment: [],
      limitations: [],
      excludeExercises: [],
      raceDate: null,
      weeks,
      currentWeeklyMi: mi,
      buildAnyway,
    },
    { todayISO: TODAY, stretchKeys: STRETCHES },
  );

/** The minutes a day prescribes in its main block — the training, not the warm-up around it. */
const dayMin = (d) => d.main.reduce((n, ex) => n + (ex.targetSec ?? 0) * (ex.sets ?? 1), 0) / 60;
const weekMin = (w) => w.days.reduce((n, d) => n + dayMin(d), 0);
const hasQuality = (w) =>
  w.days.some((d) => d.name === 'Tempo Run' || d.main.some((ex) => /^(Include|Main set)/.test(ex.coachNote ?? '')));

// ─────────────────────────────────────────────────────────────────────────────
// THE SWEEP
// ─────────────────────────────────────────────────────────────────────────────

test('every triathlon plan climbs, rests, tapers and ends on the race', () => {
  let built = 0;
  let refused = 0;
  for (let weeks = 1; weeks <= 30; weeks += 1) {
    for (let days = 2; days <= 6; days += 1) {
      for (const experience of EXPERIENCES) {
        for (const mi of [0, 10]) {
          for (const buildAnyway of [false, true]) {
            const tag = `${weeks}w ${days}d ${experience} ${mi}mi anyway=${buildAnyway}`;
            const r = build({ weeks, days, experience, buildAnyway, mi });
            if (r.refusal) {
              assert.ok(!buildAnyway, `${tag}: refused under buildAnyway`);
              assert.ok(weeks < SPEC.minWeeks, `${tag}: refused with enough weeks — ${r.refusal.message}`);
              refused += 1;
              continue;
            }
            built += 1;

            const plans = r.structure.weekPlans;
            const n = plans.length;
            const effDays = r.structure.daysPerWeek;
            assert.equal(r.volume.length, n, tag);

            // Every week has sessions, and every session has something in it.
            for (const [i, w] of plans.entries()) {
              assert.ok(w.days.length > 0, `${tag}: week ${i + 1} is empty`);
              for (const d of w.days) assert.ok(d.main.length > 0, `${tag}: week ${i + 1} "${d.name}" is empty`);
              // The week is the days they gave (race week excepted: at most four, as for the runs).
              if (i < n - 1) assert.equal(w.days.length, effDays, `${tag}: week ${i + 1} holds ${w.days.length} sessions`);
            }

            // ── RACE DAY — the last session of the last week, and the only one.
            const last = plans[n - 1].days;
            assert.equal(last[last.length - 1].name, 'Race Day', `${tag}: the block does not end on the race`);
            assert.deepEqual(
              last[last.length - 1].main.map((ex) => ex.activity),
              ['swim', 'bike', 'run'],
              `${tag}: race day is not a swim, a ride and a run`,
            );
            assert.equal(plans.flatMap((w) => w.days).filter((d) => d.name === 'Race Day').length, 1, `${tag}: race count`);
            assert.ok(last.length <= Math.min(effDays, 4), `${tag}: race week holds ${last.length} sessions`);

            const mins = plans.map(weekMin);
            const training = mins.slice(0, n - 1);
            const peakBuilt = training.length ? Math.max(...training) : 0;

            // Race week is sharpening, not training: short, and no quality session in it.
            assert.ok(!last.some((d) => d.name === 'Tempo Run'), `${tag}: a tempo in race week`);
            if (n >= 2) assert.ok(mins[n - 1] <= peakBuilt * 0.5 + 1, `${tag}: race week ${mins[n - 1]} min against a peak of ${peakBuilt}`);

            // ── THE TAPER — weeks ≥ 4: the week before race week is a taper week, cut from the peak, and
            // intensity is retained (EPS-D6) wherever the week has room for a quality session at all.
            if (weeks >= 4) {
              const before = r.volume[n - 2];
              assert.equal(before.phase, 'taper', `${tag}: week ${n - 1} is ${before.phase}, not taper`);
              assert.ok(mins[n - 2] < peakBuilt, `${tag}: the taper week (${mins[n - 2]}) is not below the peak (${peakBuilt})`);
              if (experience !== 'beginner' && effDays >= 3) {
                assert.ok(hasQuality(plans[n - 2]), `${tag}: the taper dropped all intensity`);
              }
            }

            // ── RECOVERY — weeks ≥ 8: at least one down week, and it is actually down.
            if (weeks >= 8) {
              const deloads = r.volume.filter((v) => v.isDeload);
              assert.ok(deloads.length >= 1, `${tag}: no recovery week`);
              for (const v of deloads) {
                assert.ok(mins[v.weekIndex] < mins[v.weekIndex - 1], `${tag}: deload week ${v.weekIndex + 1} is not down`);
                assert.ok(!hasQuality(plans[v.weekIndex]), `${tag}: deload week ${v.weekIndex + 1} carries quality work`);
              }
            }

            // ── PEAK — a full-length plan reaches the spec's peak (±20%), or what the week can hold.
            if (weeks >= SPEC.minWeeks) {
              const target = Math.min(PEAK_MIN, triWeekCapacityMin(effDays));
              if (target === PEAK_MIN || effDays >= 3) {
                assert.ok(
                  peakBuilt >= PEAK_MIN * 0.8 && peakBuilt <= PEAK_MIN * 1.2,
                  `${tag}: peak ${peakBuilt} min against a spec of ${PEAK_MIN}`,
                );
              }
              assert.ok(peakBuilt >= target * 0.9, `${tag}: peak ${peakBuilt} min against a reachable ${target}`);
            }

            // ── THE LOCKED 10% (EPS-D3) — read as the run plans read it, against the highest week already
            // carried. The curve exactly; the built week within its five-minute rounding.
            let highest = 0;
            let highestBuilt = 0;
            for (const [i, v] of r.volume.entries()) {
              assert.equal(typeof v.minutes, 'number', `${tag}: week ${i + 1} has no minutes`);
              if (highest > 0) {
                assert.ok(v.minutes <= highest * (1 + WEEKLY_INCREASE_CAP) + 1, `${tag}: week ${i + 1} curve ${v.minutes} vs ${highest}`);
                assert.ok(
                  mins[i] <= highestBuilt * (1 + WEEKLY_INCREASE_CAP) + 2.5 * plans[i].days.length,
                  `${tag}: week ${i + 1} builds ${mins[i]} min against a highest of ${highestBuilt}`,
                );
              }
              highest = Math.max(highest, v.minutes);
              highestBuilt = Math.max(highestBuilt, mins[i]);
            }

            // ── THE CONCERN — a short build says so, once; a full one says nothing.
            if (buildAnyway && weeks < SPEC.minWeeks) {
              assert.ok(r.concern, `${tag}: built short with no concern`);
              assert.equal(r.concern.reason, 'not_enough_time', tag);
              assert.match(r.concern.message, /compressed build/, tag);
            } else {
              assert.equal(r.concern, null, `${tag}: a concern on a full build`);
            }
          }
        }
      }
    }
  }
  assert.ok(built > 1000, `only ${built} builds`);
  assert.ok(refused > 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// THE SHAPES A COACH WOULD LOOK AT
// ─────────────────────────────────────────────────────────────────────────────

test('a 16-week, 4-day intermediate plan: the volume climbs to about eight hours, then tapers', () => {
  const r = build({ weeks: 16, days: 4, experience: 'intermediate', buildAnyway: false });
  const mins = r.structure.weekPlans.map(weekMin);
  assert.ok(Math.max(...mins) >= PEAK_MIN * 0.9, `peak ${Math.max(...mins)}`);
  assert.deepEqual(
    r.volume.filter((v) => v.isDeload).map((v) => v.weekIndex + 1),
    [4, 8, 12],
  );
  assert.deepEqual(
    r.volume.filter((v) => v.phase === 'taper').map((v) => v.weekIndex + 1),
    [15, 16],
  );
  assert.ok(mins[14] < mins[13] && mins[15] < mins[14], `taper ${mins.slice(13).join(' → ')}`);
});

test('the day before the race is rest, said on the last opener', () => {
  for (const days of [2, 3, 4, 5, 6]) {
    const r = build({ weeks: 16, days, experience: 'intermediate', buildAnyway: false });
    const last = r.structure.weekPlans.at(-1).days;
    const opener = last.at(-2);
    assert.ok(opener.main.some((ex) => /day before the race is rest/.test(ex.coachNote ?? '')), `${days}d: ${opener.name}`);
  }
});

test('a swim is a duration, never a pace or a derived distance (EPS-D12)', () => {
  const r = build({ weeks: 16, days: 6, experience: 'advanced', buildAnyway: false });
  for (const w of r.structure.weekPlans) {
    for (const row of w.days.flatMap((d) => d.main).filter((x) => x.activity === 'swim')) {
      assert.equal(row.targetPaceSec, undefined);
      assert.equal(row.targetMi, undefined);
    }
  }
});

test('no single session runs past its cap, however few the days', () => {
  for (const days of [2, 3, 4, 5, 6]) {
    const r = build({ weeks: 24, days, experience: 'advanced', buildAnyway: false });
    for (const w of r.structure.weekPlans) {
      for (const d of w.days) {
        if (d.name === 'Race Day') continue;
        for (const ex of d.main) {
          const min = (ex.targetSec ?? 0) / 60;
          const cap = ex.activity === 'swim' ? 75 : ex.activity === 'bike' ? 180 : d.name === 'Brick' ? 45 : 90;
          assert.ok(min <= cap, `${days}d "${d.name}" ${ex.activity} ${min} min`);
        }
      }
    }
  }
});
