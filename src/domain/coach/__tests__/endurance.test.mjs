/**
 * endurance.test.mjs — the running and triathlon rulebook.
 *
 * ══ WHAT THIS FILE IS ACTUALLY GUARDING ══
 *
 * A rulebook error is not like a code error. It does not crash, it does not throw, and it does not look
 * wrong on the screen — it produces a plausible, confident, well-formatted plan that is **consistently
 * wrong for every single person who asks for it.** The first draft of this rulebook built a seventeen-week
 * MARATHON plan whose longest run was 7.3 miles, and every structural check passed on it: the weeks were
 * there, the days were there, the volume never breached a cap. It was a valid program that could not
 * finish a marathon.
 *
 * So these tests assert what a COACH would check, not what a compiler would.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/endurance.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assembleEndurance,
  composeRunWeek,
  enduranceRefusalFor,
  LONG_RUN_DISTANCE_CAP_MI,
  LONG_RUN_SPIKE_CAP,
  maxHardFor,
  pacesFrom,
  RACE_SPEC,
  weeklyVolumePlan,
  WEEKLY_INCREASE_CAP,
} from '../rulebook/endurance.ts';

const TODAY = '2026-08-09';
const STRETCHES = ['hamstring-stretch', 'pigeon-stretch', 'standing-quad-stretch'];

const base = (over = {}) => ({
  goal: 'run_marathon',
  experience: { lifting: 'intermediate', running: 'intermediate' },
  daysPerWeek: 5,
  sessionMinutes: 60,
  environment: 'outdoor',
  ownedEquipment: [],
  limitations: [],
  excludeExercises: [],
  currentWeeklyMi: 20,
  ...over,
});

const build = (over = {}, opts = {}) =>
  assembleEndurance(base(over), { todayISO: TODAY, stretchKeys: STRETCHES, canRunContinuously: true, ...opts });

/** Race day is a distance, not a training session — exclude it when judging the training. */
const trainingDays = (day) => day.name !== 'Race Day';

// ─────────────────────────────────────────────────────────────────────────────
// THE ONE THAT CAUGHT THE REAL BUG
// ─────────────────────────────────────────────────────────────────────────────

test('a race plan builds up to a long run that could actually finish the race', () => {
  // ⚠ THE REGRESSION THIS FILE EXISTS FOR. Deriving the long run as a SHARE of weekly volume caps it at
  // whatever the athlete already runs, so a marathon plan peaked at 7.3 miles and every other check
  // passed. The long run drives the build; weekly volume follows it.
  const cases = [
    { goal: 'run_5k', raceDate: '2026-10-11', currentWeeklyMi: 6, minPeak: 3 },
    { goal: 'run_10k', raceDate: '2026-10-25', currentWeeklyMi: 12, minPeak: 5 },
    { goal: 'run_half', raceDate: '2026-11-22', currentWeeklyMi: 15, minPeak: 9 },
    { goal: 'run_marathon', raceDate: '2026-12-06', currentWeeklyMi: 20, minPeak: 15 },
  ];

  for (const c of cases) {
    const r = build({ goal: c.goal, raceDate: c.raceDate, currentWeeklyMi: c.currentWeeklyMi });
    assert.equal(r.refusal, null, `${c.goal} should build: ${r.refusal?.message}`);
    const peak = Math.max(...r.volume.map((v) => v.longRunMi));
    assert.ok(
      peak >= c.minPeak,
      `${c.goal} peaks at a ${peak} mi long run — that cannot prepare anyone for ${RACE_SPEC[c.goal].label}`,
    );
  }
});

test('weekly volume actually grows across the block', () => {
  // The other half of the same bug: deload weeks were resetting the ramp, so seventeen weeks sawtoothed
  // between 20 and 24 miles and the last one was labelled the peak.
  const r = build({ raceDate: '2026-12-06', currentWeeklyMi: 20 });
  const peak = Math.max(...r.volume.map((v) => v.mileage));
  assert.ok(peak >= 20 * 1.6, `peak weekly volume ${peak} is barely above the starting 20 — the ramp is not ramping`);
});

// ─────────────────────────────────────────────────────────────────────────────
// THE LOCKED AND EVIDENCED CAPS
// ─────────────────────────────────────────────────────────────────────────────

test('no week raises volume into new territory by more than the locked 10%', () => {
  /*
   * ══ TWO LOCKED RULES THAT DISAGREE, AND HOW THIS READS THEM ══
   *
   * PAS §11.4 caps weekly mileage growth at 10% week-over-week. PAS §7.1 mandates Block Periodization,
   * which "alternates easy and intensity weeks" — a down week, then back to the ramp. Read literally,
   * the second one breaks the first every time: a deload to 75% followed by a return to where you were
   * is a +33% week, and the 10% cap forbids it.
   *
   * Taken literally the deload would permanently cost a quarter of the ramp, and a sixteen-week plan
   * with three deloads would end lower than it started. That is not what the rule is for.
   *
   * So the cap is applied to NEW TERRITORY: no week may exceed 110% of the highest week the athlete has
   * already trained. Returning to a load you have already carried is a return, not an increase. This is
   * an interpretation of a locked rule and is recorded as such in
   * `Docs/Endurance-Programming-Standard-v1.0.md` — if the PO reads it the other way, this test is where
   * that decision changes.
   */
  for (const goal of ['run_5k', 'run_10k', 'run_half', 'run_marathon']) {
    for (const startMi of [0, 5, 15, 30]) {
      const plan = weeklyVolumePlan({ goal, weeks: RACE_SPEC[goal].idealWeeks, startMi });
      let highest = 0;
      for (const v of plan) {
        if (highest > 0) {
          assert.ok(
            v.mileage <= highest * (1 + WEEKLY_INCREASE_CAP) + 0.15,
            `${goal} from ${startMi}: week ${v.weekIndex + 1} reaches ${v.mileage} against a highest-so-far of ${highest}`,
          );
        }
        highest = Math.max(highest, v.mileage);
      }
    }
  }
});

test('no long run spikes past the evidenced ceiling over the longest so far', () => {
  for (const goal of ['run_half', 'run_marathon']) {
    const plan = weeklyVolumePlan({ goal, weeks: 16, startMi: 18 });
    let longest = 0;
    for (const v of plan) {
      if (longest > 0) {
        assert.ok(
          v.longRunMi <= longest * LONG_RUN_SPIKE_CAP + 0.15,
          `${goal} week ${v.weekIndex + 1}: ${v.longRunMi} mi against a longest-so-far of ${longest}`,
        );
      }
      longest = Math.max(longest, v.longRunMi);
    }
  }
});

test('no long run exceeds the absolute distance cap', () => {
  const plan = weeklyVolumePlan({ goal: 'run_marathon', weeks: 30, startMi: 45 });
  for (const v of plan) {
    assert.ok(v.longRunMi <= LONG_RUN_DISTANCE_CAP_MI + 0.05, `a ${v.longRunMi} mi training run is past the cap`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// THE WEEK'S SHAPE
// ─────────────────────────────────────────────────────────────────────────────

test('hard days are never back to back', () => {
  const HARD = new Set(['long', 'tempo', 'intervals']);
  for (const days of [2, 3, 4, 5, 6]) {
    for (const experience of ['beginner', 'intermediate', 'advanced']) {
      for (const phase of ['base', 'build', 'peak']) {
        const roles = composeRunWeek({ daysPerWeek: days, experience, phase, canRunContinuously: true });
        for (let i = 1; i < roles.length; i += 1) {
          assert.ok(
            !(HARD.has(roles[i]) && HARD.has(roles[i - 1])),
            `${days}d/${experience}/${phase}: ${roles.join(',')} puts two hard days together`,
          );
        }
        assert.ok(
          roles.filter((r) => HARD.has(r)).length <= maxHardFor(days),
          `${days}d/${experience}: more hard days than the week can separate`,
        );
      }
    }
  }
});

test('every week ends with the long run, and has exactly one', () => {
  for (const days of [3, 4, 5, 6]) {
    const roles = composeRunWeek({ daysPerWeek: days, experience: 'advanced', phase: 'build', canRunContinuously: true });
    assert.equal(roles.filter((r) => r === 'long').length, 1);
    assert.equal(roles[roles.length - 1], 'long');
  }
});

test('race week is the race, not a training week', () => {
  const r = build({ raceDate: '2026-12-06', currentWeeklyMi: 20 });
  const last = r.structure.weekPlans[r.structure.weekPlans.length - 1];
  const names = last.days.map((d) => d.name);

  assert.equal(names[names.length - 1], 'Race Day', 'the block must end on the race');
  assert.ok(!names.includes('Long Run'), 'a long run in race week is training through the thing you trained for');
  assert.ok(!names.includes('Intervals'), 'no interval session in race week');
  assert.ok(!names.some((n) => n.startsWith('Tempo')), `race week still holds a tempo: ${names.join(', ')}`);

  const race = last.days[last.days.length - 1].main[0];
  assert.equal(race.targetMi, RACE_SPEC.run_marathon.raceMi);
  assert.equal(race.targetPaceSec, undefined, 'the plan does not tell you how fast to race');
});

// ─────────────────────────────────────────────────────────────────────────────
// THE TAPER — EPS-D5 / EPS-D6
// ─────────────────────────────────────────────────────────────────────────────

test('the taper cuts volume and keeps intensity', () => {
  const r = build({ raceDate: '2026-12-06', currentWeeklyMi: 20 });
  const taper = r.volume.filter((v) => v.phase === 'taper');
  const peak = Math.max(...r.volume.map((v) => v.mileage));

  assert.ok(taper.length >= 2, 'a marathon taper is not one week');
  assert.ok(
    taper[taper.length - 1].mileage <= peak * 0.6,
    `the taper only reaches ${taper[taper.length - 1].mileage} from a peak of ${peak}`,
  );

  // ⚠ THE PART THAT IS EASY TO GET WRONG AND EXPENSIVE TO GET WRONG. Cutting intensity during a taper
  // erases the benefit of cutting volume. The tempo in the first taper week must be the PEAK week's
  // tempo, not week one's.
  const weekOf = (i) => r.structure.weekPlans[i].days;
  const tempoSec = (days) => days.find((d) => d.name === 'Tempo Run')?.main[0]?.targetSec ?? null;
  const peakIdx = r.volume.findIndex((v) => v.phase === 'peak');
  const firstTaperIdx = r.volume.findIndex((v) => v.phase === 'taper');

  const atPeak = tempoSec(weekOf(peakIdx));
  const atTaper = tempoSec(weekOf(firstTaperIdx));
  if (atPeak != null && atTaper != null) {
    assert.equal(atTaper, atPeak, 'the taper dropped the tempo — that erases the taper');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESSION — a session that never changes is a placeholder
// ─────────────────────────────────────────────────────────────────────────────

test('the quality sessions advance across the block', () => {
  const r = build({ raceDate: '2026-12-06', currentWeeklyMi: 20 });
  const tempo = (i) => r.structure.weekPlans[i].days.find((d) => d.name === 'Tempo Run')?.main[0]?.targetSec;
  const first = tempo(0);
  const peakIdx = r.volume.findIndex((v) => v.phase === 'peak');
  const last = tempo(peakIdx);
  assert.ok(first != null && last != null);
  assert.ok(last > first, `the tempo is ${first}s in week 1 and ${last}s at the peak — it never advanced`);
});

test("a beginner's run/walk advances too", () => {
  const r = build(
    { goal: 'run_5k', experience: { lifting: 'beginner', running: 'beginner' }, raceDate: '2026-10-11', currentWeeklyMi: 0 },
    { canRunContinuously: false },
  );
  const runSec = (i) => r.structure.weekPlans[i].days[0].main[0].targetSec;
  assert.ok(runSec(r.structure.weekPlans.length - 2) > runSec(0), 'the run interval never got longer');
});

// ─────────────────────────────────────────────────────────────────────────────
// THE BEGINNER — EPS-D7 / EPS-D8
// ─────────────────────────────────────────────────────────────────────────────

test('someone who cannot run continuously is never handed a continuous run', () => {
  // The first version gave this athlete a "Long Run" on the last day of every week — a plan that stops
  // believing its own premise on day four.
  const r = build(
    { goal: 'run_5k', daysPerWeek: 5, experience: { lifting: 'beginner', running: 'beginner' }, raceDate: '2026-10-11', currentWeeklyMi: 0 },
    { canRunContinuously: false },
  );
  assert.equal(r.refusal, null, 'a complete beginner must not be turned away');

  for (const week of r.structure.weekPlans.slice(0, -1)) {
    for (const day of week.days.filter(trainingDays)) {
      assert.ok(
        day.name === 'Run / Walk',
        `a non-runner was prescribed "${day.name}" — the one thing they said they cannot do`,
      );
    }
  }
});

test('a beginner gets at least the minimum days, and is not run into the ground', () => {
  for (const asked of [2, 3, 4, 5, 6]) {
    const r = build(
      { goal: 'run_5k', daysPerWeek: asked, experience: { lifting: 'beginner', running: 'beginner' }, raceDate: '2026-10-11', currentWeeklyMi: 0 },
      { canRunContinuously: false },
    );
    assert.ok(r.structure.daysPerWeek >= 3, `asked ${asked}, got ${r.structure.daysPerWeek} — below the floor`);
    assert.ok(r.structure.daysPerWeek <= 4, `asked ${asked}, got ${r.structure.daysPerWeek} — too much for a new runner`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// REFUSALS — and each one carries the alternative
// ─────────────────────────────────────────────────────────────────────────────

test('a marathon in four weeks from nothing is refused, and offered something real', () => {
  const r = enduranceRefusalFor('run_marathon', { weeksAvailable: 4, currentWeeklyMi: 0, canRunContinuously: true });
  assert.ok(r, 'this must not build');
  assert.equal(r.reason, 'not_enough_time');
  assert.match(r.message, /half marathon/i, 'a refusal without an alternative is the anti-shame principle broken');
});

test('every refusal names something the athlete can do instead', () => {
  const refusals = [
    enduranceRefusalFor('run_marathon', { weeksAvailable: 4, currentWeeklyMi: 20, canRunContinuously: true }),
    enduranceRefusalFor('run_marathon', { weeksAvailable: 20, currentWeeklyMi: 2, canRunContinuously: true }),
    enduranceRefusalFor('run_half', { weeksAvailable: 4, currentWeeklyMi: 10, canRunContinuously: true }),
    enduranceRefusalFor('run_10k', { weeksAvailable: 12, currentWeeklyMi: 8, canRunContinuously: false }),
  ];
  for (const r of refusals) {
    assert.ok(r, 'expected a refusal');
    assert.ok(r.message.length > 40, 'a one-line no is not a coaching answer');
    assert.match(r.message, /5K|10K|half marathon|marathon|weeks|base/i);
  }
});

test('the marathon door is 15 miles a week, and that is a decision', () => {
  /*
   * §6.2, PO-confirmed 2026-08-09. It was 10, and a 12 mi/week athlete passed the gate and got a block
   * peaking at a 12.4-mile long run — safe, well-formed, and not marathon preparation. The spike cap was
   * right; the door was too wide.
   *
   * This asserts the DECISION, not the arithmetic. Lowering it again means coming back to the standard
   * and saying what changed about the spike cap that made a lower door safe.
   */
  assert.equal(RACE_SPEC.run_marathon.minBaseMi, 15);
  assert.equal(RACE_SPEC.run_half.minBaseMi, 8);

  const under = enduranceRefusalFor('run_marathon', { weeksAvailable: 16, currentWeeklyMi: 12, canRunContinuously: true });
  assert.ok(under, '12 mi/week must not open a marathon block');
  assert.match(under.message, /half marathon/i, 'and it must offer the race they can actually train for');

  assert.equal(
    enduranceRefusalFor('run_marathon', { weeksAvailable: 16, currentWeeklyMi: 15, canRunContinuously: true }),
    null,
    '15 is the door, not the floor above it',
  );
});

test('a plan that has the time and the base is not refused', () => {
  assert.equal(enduranceRefusalFor('run_marathon', { weeksAvailable: 16, currentWeeklyMi: 20, canRunContinuously: true }), null);
  assert.equal(enduranceRefusalFor('run_5k', { weeksAvailable: 8, currentWeeklyMi: 0, canRunContinuously: false }), null);
});

// ─────────────────────────────────────────────────────────────────────────────
// PACES — EPS-D10, and the rule that no number is ever invented
// ─────────────────────────────────────────────────────────────────────────────

test('no race result means no prescribed pace, anywhere', () => {
  const r = build({ raceDate: '2026-12-06', currentWeeklyMi: 20 });
  assert.equal(r.paces, null);
  for (const week of r.structure.weekPlans) {
    for (const day of week.days) {
      for (const row of [...day.warmup, ...day.main, ...day.cooldown]) {
        assert.equal(
          row.targetPaceSec,
          undefined,
          `"${row.name}" carries a pace nobody gave us — a guessed pace is indistinguishable from a derived one`,
        );
      }
    }
  }
});

test('a real race result produces paces in the right order', () => {
  // A 20:00 5k. The zones must come out ordered — easy slowest, intervals fastest — and land in the
  // region a coach would recognise for that runner.
  const p = pacesFrom(3.1, 20 * 60);
  assert.ok(p);
  assert.ok(p.easySec > p.marathonSec, 'easy must be slower than marathon pace');
  assert.ok(p.marathonSec > p.thresholdSec, 'marathon must be slower than threshold');
  assert.ok(p.thresholdSec > p.intervalSec, 'threshold must be slower than interval');
  assert.ok(p.easySec > 480 && p.easySec < 600, `easy pace ${p.easySec}s/mi is not plausible off a 20:00 5k`);
  assert.ok(p.intervalSec > 340 && p.intervalSec < 420, `interval pace ${p.intervalSec}s/mi is not plausible`);
});

test('a missing or nonsense result yields null rather than a number', () => {
  assert.equal(pacesFrom(null, 1200), null);
  assert.equal(pacesFrom(3.1, null), null);
  assert.equal(pacesFrom(0, 1200), null);
  assert.equal(pacesFrom(3.1, 0), null);
  assert.equal(pacesFrom(undefined, undefined), null);
});

// ─────────────────────────────────────────────────────────────────────────────
// THE WHOLE THING
// ─────────────────────────────────────────────────────────────────────────────

test('the plan lands on the race date', () => {
  // 2026-08-09 → 2026-12-06 is 17 weeks. A plan that ends early or late is not built for that race.
  const r = build({ raceDate: '2026-12-06', currentWeeklyMi: 20 });
  assert.equal(r.structure.weeks, 17);
  assert.equal(r.structure.weekPlans.length, 17);
});

test('the same answers produce the same plan, every time', () => {
  const a = build({ raceDate: '2026-12-06', currentWeeklyMi: 20 });
  const b = build({ raceDate: '2026-12-06', currentWeeklyMi: 20 });
  assert.deepEqual(a.structure, b.structure);
});

test('every day has something in it, and running days warm up and cool down', () => {
  for (const goal of ['run_5k', 'run_10k', 'run_half', 'run_marathon', 'triathlon']) {
    const spec = RACE_SPEC[goal];
    const r = build({ goal, daysPerWeek: 5, currentWeeklyMi: Math.max(spec.minBaseMi, 12), weeks: spec.idealWeeks, raceDate: null });
    assert.equal(r.refusal, null, `${goal}: ${r.refusal?.message}`);

    for (const week of r.structure.weekPlans) {
      assert.ok(week.days.length > 0, `${goal}: an empty week`);
      for (const day of week.days) {
        assert.ok(day.main.length > 0, `${goal}: "${day.name}" has no session in it`);
        // PAS-D9 — running days require both. The swim/bike/brick days are not runs.
        if (day.name.includes('Run') && day.name !== 'Race Day') {
          assert.ok(day.warmup.length > 0, `${goal}: "${day.name}" has no warm-up`);
          assert.ok(day.cooldown.length > 0, `${goal}: "${day.name}" has no cool-down`);
        }
      }
    }
  }
});

test('a triathlon week swims, rides, runs and bricks', () => {
  const r = build({ goal: 'triathlon', daysPerWeek: 6, raceDate: '2027-01-10', currentWeeklyMi: 10 });
  assert.equal(r.refusal, null, r.refusal?.message);
  const names = r.structure.weekPlans[0].days.map((d) => d.name);
  for (const want of ['Swim', 'Ride', 'Brick']) {
    assert.ok(names.includes(want), `a triathlon week with no ${want}: ${names.join(', ')}`);
  }
  assert.equal(names.filter((n) => n === 'Brick').length, 1, 'one brick a week is the working dose');
});

test('a swim is never given a pace the app cannot render', () => {
  // EPS-D12 — `RATE_KIND` returns 'none' for swim, so a pace on a swim row is a number with no reader.
  const r = build({ goal: 'triathlon', daysPerWeek: 6, raceDate: '2027-01-10', currentWeeklyMi: 10 });
  for (const week of r.structure.weekPlans) {
    for (const day of week.days) {
      for (const row of day.main.filter((x) => x.activity === 'swim')) {
        assert.equal(row.targetPaceSec, undefined);
        assert.equal(row.targetSpdMph, undefined);
      }
    }
  }
});
