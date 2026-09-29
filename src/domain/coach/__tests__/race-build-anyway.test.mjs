/**
 * race-build-anyway.test.mjs — CA-D12 for races: Holt suggests, then builds what the athlete asked for.
 *
 * ══ THE DECISION ══
 *
 * PO, 2026-09-21: *"Holt shouldn't really say no to a race. Maybe suggest, but then just have him do what
 * they say."* `buildAnyway` is the athlete saying "I heard you, build it". From then on the rulebook may
 * not refuse — but it may not stop protecting them either. The caps are the same caps; what gives is how
 * far a short or thin block can get, and the concern says that out loud, once.
 *
 * So this sweeps every race × 0–30 weeks × six bases × both run states × every day count and asserts the
 * two halves together: it always builds, and the build never breaks a cap a full build would honour.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/race-build-anyway.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assembleEndurance,
  CONTINUOUS_RUN_MI,
  counterOfferIn,
  enduranceRefusalFor,
  LONG_RUN_DISTANCE_CAP_MI,
  LONG_RUN_SPIKE_CAP,
  RACE_SPEC,
  WEEKLY_INCREASE_CAP,
} from '../rulebook/endurance.ts';
import { assemble, refusalFor } from '../assemble.ts';

const TODAY = '2026-09-21';
const STRETCHES = [
  { key: 'hamstring-stretch', name: 'Hamstring Stretch' },
  { key: 'pigeon-stretch', name: 'Pigeon Stretch' },
  { key: 'standing-quad-stretch', name: 'Standing Quad Stretch' },
];
const RACES = ['run_5k', 'run_10k', 'run_half', 'run_marathon', 'triathlon'];
const BASES = [0, 2, 5, 10, 20, 40];
const DAYS = [2, 3, 4, 5, 6];

const constraints = (over = {}) => ({
  goal: 'run_marathon',
  experience: { lifting: 'intermediate', running: 'intermediate' },
  daysPerWeek: 4,
  sessionMinutes: 60,
  environment: 'outdoor',
  ownedEquipment: [],
  limitations: [],
  excludeExercises: [],
  raceDate: null,
  ...over,
});

const build = (over, canRunContinuously) =>
  assembleEndurance(constraints(over), { todayISO: TODAY, stretches: STRETCHES, canRunContinuously });

const longRunsOf = (r) =>
  r.structure.weekPlans.flatMap((w) => w.days).filter((d) => d.name === 'Long Run').map((d) => d.main[0].targetMi);

// ─────────────────────────────────────────────────────────────────────────────
// THE SWEEP
// ─────────────────────────────────────────────────────────────────────────────

test('with buildAnyway every race builds, inside every cap, for every athlete', () => {
  let builds = 0;
  let concerns = 0;
  for (const goal of RACES) {
    for (let weeks = 0; weeks <= 30; weeks += 1) {
      for (const mi of BASES) {
        for (const canRun of [true, false]) {
          for (const days of DAYS) {
            const tag = `${goal} ${weeks}w ${mi}mi canRun=${canRun} ${days}d`;
            let r;
            assert.doesNotThrow(() => {
              r = build({ goal, weeks, currentWeeklyMi: mi, daysPerWeek: days, buildAnyway: true }, canRun);
            }, tag);
            builds += 1;

            assert.equal(r.refusal, null, `${tag}: refused under buildAnyway — ${r.refusal?.message}`);
            assert.ok(r.structure.weeks >= 1, `${tag}: ${r.structure.weeks} weeks`);
            assert.equal(r.structure.weekPlans.length, r.structure.weeks, `${tag}: weekPlans ≠ weeks`);
            assert.equal(r.volume.length, r.structure.weeks, `${tag}: volume ≠ weeks`);

            for (const [i, w] of r.structure.weekPlans.entries()) {
              assert.ok(w.days.length > 0, `${tag}: week ${i + 1} has no sessions`);
              for (const d of w.days) assert.ok(d.main.length > 0, `${tag}: week ${i + 1} "${d.name}" is empty`);
            }

            // Triathlon included: `composeTriWeek` has a race week now (triathlon-plan.test.mjs). Its Race Day
            // carries no distance — the rulebook does not know whether it is a sprint or an Olympic.
            const last = r.structure.weekPlans[r.structure.weekPlans.length - 1].days;
            assert.equal(last[last.length - 1].name, 'Race Day', `${tag}: the block does not end on the race`);
            if (goal !== 'triathlon') {
              assert.equal(last[last.length - 1].main[0].targetMi, RACE_SPEC[goal].raceMi, `${tag}: race distance`);
            }

            // The locked 10% rule, read as the existing endurance test reads it: against the highest week
            // already carried — and week 1 against where the athlete is (the curve's own 3 mi floor).
            let highest = Math.max(mi, 3);
            let longest = Math.max(Math.max(mi, 3) * 0.4, CONTINUOUS_RUN_MI);
            for (const v of r.volume) {
              assert.ok(
                v.mileage <= highest * (1 + WEEKLY_INCREASE_CAP) + 0.15,
                `${tag}: week ${v.weekIndex + 1} ${v.mileage} mi against a highest of ${highest}`,
              );
              assert.ok(
                v.longRunMi <= Math.max(1, longest * LONG_RUN_SPIKE_CAP) + 0.15,
                `${tag}: week ${v.weekIndex + 1} long run ${v.longRunMi} against a longest of ${longest}`,
              );
              assert.ok(v.longRunMi <= LONG_RUN_DISTANCE_CAP_MI + 0.05, `${tag}: ${v.longRunMi} mi long run`);
              highest = Math.max(highest, v.mileage);
              longest = Math.max(longest, v.longRunMi);
            }
            for (const mi2 of longRunsOf(r)) assert.ok(mi2 <= LONG_RUN_DISTANCE_CAP_MI + 0.05, `${tag}: built long run ${mi2}`);

            // A non-continuous runner still never meets a continuous run before race week.
            if (!canRun && goal !== 'triathlon') {
              for (const w of r.structure.weekPlans.slice(0, -1)) {
                for (const d of w.days) assert.equal(d.name, 'Run / Walk', `${tag}: prescribed "${d.name}"`);
              }
            }

            // The concern is exactly the refusal it replaces — same reason, same alternative.
            const old = enduranceRefusalFor(goal, { weeksAvailable: weeks, currentWeeklyMi: mi, canRunContinuously: canRun });
            if (old) {
              concerns += 1;
              assert.ok(r.concern, `${tag}: would have refused (${old.reason}) but carries no concern`);
              assert.equal(r.concern.reason, old.reason, tag);
              assert.equal(r.concern.altGoal, old.altGoal, tag);
              assert.ok(!r.concern.message.includes('!'), `${tag}: an exclamation mark in a concern`);
              assert.equal(counterOfferIn(r.concern.message), old.altGoal, `${tag}: the words and the suggestion disagree`);
            } else if (r.concern) {
              // Nothing refused, but the long run falls well short of the race (QA F14) — said, and true.
              assert.equal(r.concern.reason, 'short_long_run', `${tag}: a concern with nothing to be concerned about`);
              const top = Math.max(...longRunsOf(r));
              const wants = Math.min(RACE_SPEC[goal].raceMi, RACE_SPEC[goal].peakLongMi);
              assert.ok(top < wants * 0.75, `${tag}: a shortfall concern over a ${top} mi long run`);
              assert.equal(counterOfferIn(r.concern.message), r.concern.altGoal, `${tag}: the words and the suggestion disagree`);
            } else if (goal !== 'triathlon' && canRun && longRunsOf(r).length) {
              const wants = Math.min(RACE_SPEC[goal].raceMi, RACE_SPEC[goal].peakLongMi);
              assert.ok(Math.max(...longRunsOf(r)) >= wants * 0.75, `${tag}: a long run far short of the race, said nothing`);
            }
          }
        }
      }
    }
  }
  assert.equal(builds, 5 * 31 * 6 * 2 * 5);
  assert.ok(concerns > 0);
});

test('without buildAnyway the refusals are exactly what they were', () => {
  for (const goal of RACES) {
    for (let weeks = 0; weeks <= 30; weeks += 1) {
      for (const mi of BASES) {
        for (const canRun of [true, false]) {
          const old = enduranceRefusalFor(goal, { weeksAvailable: weeks, currentWeeklyMi: mi, canRunContinuously: canRun });
          for (const flag of [undefined, false]) {
            const r = build({ goal, weeks, currentWeeklyMi: mi, buildAnyway: flag }, canRun);
            assert.deepEqual(r.refusal, old, `${goal} ${weeks}w ${mi}mi canRun=${canRun}`);
            assert.equal(r.concern, null);
            if (old) assert.equal(r.structure.weekPlans.length, 0);
          }
        }
      }
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// WHAT THE CONCERN SAYS
// ─────────────────────────────────────────────────────────────────────────────

test('a short marathon names the real top long run, and suggests the race that fits', () => {
  const r = build({ goal: 'run_marathon', weeks: 6, currentWeeklyMi: 15, buildAnyway: true }, true);
  const top = Math.max(...longRunsOf(r));
  assert.ok(top < 26.2);
  assert.match(r.concern.message, /usually takes about 16 weeks and you've got 6 weeks — I've built it/);
  assert.match(r.concern.message, new RegExp(`tops out around ${top >= 10 ? Math.round(top) : Math.round(top * 10) / 10} miles`));
  assert.equal(r.concern.altGoal, 'run_10k');
  assert.match(r.concern.message, /If you'd rather, the 10K fits your calendar properly/);
});

test('a race this week still builds one week, ending on the race', () => {
  const r = build({ goal: 'run_half', weeks: 0, currentWeeklyMi: 20, buildAnyway: true }, true);
  assert.equal(r.structure.weeks, 1);
  assert.match(r.concern.message, /the race is this week/);
  assert.match(r.concern.message, /no room for a long run/);
});

test('a limitation that rules out running is overridden for the race, and named', () => {
  for (const [lim, words] of [
    ['no_running', /You told me to keep running out/],
    ['knees', /your knees/],
    ['no_jumping', /no jumping/],
  ]) {
    const c = constraints({ goal: 'run_5k', weeks: 8, currentWeeklyMi: 5, limitations: [lim], canRunContinuously: true });
    // Without the flag, the assembler still says no.
    assert.ok(refusalFor(c), `${lim}: the old refusal must stand without buildAnyway`);
    const blocked = assemble(c, [], () => true);
    assert.equal(blocked.ok, false);

    const built = assemble({ ...c, buildAnyway: true }, [], () => true);
    assert.equal(built.ok, true, `${lim}: ${built.refusal?.message}`);
    assert.equal(built.assembly.concern.reason, 'no_running');
    assert.match(built.assembly.concern.message, words);
    assert.match(built.assembly.concern.message, /I've built it with running because you asked for a race/);
    assert.ok(built.assembly.structure.weekPlans.length === 8);
  }
});

test('an unconcerning race carries no concern through assemble either', () => {
  const built = assemble(constraints({ goal: 'run_5k', weeks: 8, currentWeeklyMi: 5, canRunContinuously: true, buildAnyway: true }), [], () => true);
  assert.equal(built.ok, true);
  assert.equal(built.assembly.concern, undefined);
});

// ─────────────────────────────────────────────────────────────────────────────
// QA F14 (2026-09-26) — the compressed build goes as far as the rulebook allows, and the card is honest
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ QA F14 — a compressed race build climbs its long run at the spike cap every ramp week, no slower', () => {
  /* "As far as safely possible" is EPS-D3b: each build week's long run is 110% of the longest so far. A
     short block must not ramp SLOWER than that — the shortfall the concern names must be the caps', not
     slack in the curve. (Whether a compressed marathon may shorten its 3-week taper is not in the
     rulebook — EPS-D5 fixes it by distance — so the taper is left exactly as decided.) */
  for (const [goal, weeksAway, base] of [['run_marathon', 6, 20], ['run_marathon', 10, 5], ['run_half', 6, 0], ['run_5k', 8, 0]]) {
    const raceDate = new Date(Date.parse(TODAY) + weeksAway * 7 * 86400000).toISOString().slice(0, 10);
    const r = build({ goal, raceDate, currentWeeklyMi: base, buildAnyway: true }, true);
    const build_ = r.volume.filter((v) => v.phase !== 'taper' && !v.isDeload);
    let longest = null;
    for (const v of r.volume.filter((x) => x.phase !== 'taper')) {
      if (!v.isDeload && longest != null) {
        const capped = Math.min(longest * LONG_RUN_SPIKE_CAP, RACE_SPEC[goal].peakLongMi, LONG_RUN_DISTANCE_CAP_MI);
        assert.ok(v.longRunMi >= Math.round(capped * 10) / 10 - 0.11, `${goal} ${weeksAway}w: week ${v.weekIndex + 1} ramps slower than the cap`);
      }
      longest = Math.max(longest ?? 0, v.longRunMi);
    }
    assert.ok(build_.length > 0);
    // The concern names the long run the athlete will actually meet.
    const top = Math.max(...longRunsOf(r));
    if (r.concern && top < RACE_SPEC[goal].raceMi) assert.match(r.concern.message, /the long run tops out around/);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// QA F14 (round 2) — the long run is sensibly related to the race; run/walk says its real length; no lifting copy
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ QA F14 — an 8-week 5K from under 5 miles a week reaches race distance', () => {
  for (const base of [0, 3]) {
    const raceDate = new Date(Date.parse(TODAY) + 8 * 7 * 86400000).toISOString().slice(0, 10);
    const r = build({ goal: 'run_5k', raceDate, currentWeeklyMi: base, buildAnyway: true }, true);
    const top = Math.max(...longRunsOf(r));
    assert.ok(top >= RACE_SPEC.run_5k.raceMi, `base ${base}: the longest run is ${top} mi for a 3.1 mi race`);
    assert.equal(r.concern, null);
  }
});

test('⚠ QA F14 — a race whose long run falls far short says so, before anything is started', () => {
  // A half from 8 miles a week passes every door, and the spike cap still stops the long run near 7.
  const r = build({ goal: 'run_half', weeks: 12, currentWeeklyMi: 8, buildAnyway: true }, true);
  assert.equal(r.refusal, null);
  assert.equal(r.concern.reason, 'short_long_run');
  assert.match(r.concern.message, new RegExp(`tops out around ${Math.max(...longRunsOf(r))} miles`));
  assert.equal(r.concern.altGoal, 'run_10k');
  assert.equal(counterOfferIn(r.concern.message), 'run_10k');
});

test('⚠ QA F14 — a six-week marathon from no running says the calendar too, and suggests the 5K', () => {
  const r = build({ goal: 'run_marathon', weeks: 6, currentWeeklyMi: 0, buildAnyway: true }, false);
  assert.equal(r.concern.reason, 'cannot_run');
  assert.match(r.concern.message, /usually takes about 16 weeks and you've got 6 weeks, so expect to walk a lot of it/);
  assert.equal(r.concern.altGoal, 'run_5k');
});

test('⚠ QA F14 — a run/walk session is prescribed as its whole length, not one minute', () => {
  const r = build({ goal: 'run_5k', weeks: 8, currentWeeklyMi: 0, buildAnyway: true }, false);
  const rw = r.structure.weekPlans.flatMap((w) => w.days).filter((d) => d.name === 'Run / Walk');
  assert.ok(rw.length > 0);
  for (const d of rw) {
    const row = d.main[0];
    const m = row.coachNote.match(/Run (\d+)s, walk (\d+)s, (\d+) times through — about (\d+) minutes/);
    assert.ok(m, row.coachNote);
    const [, run, walk, reps, mins] = m.map(Number);
    assert.equal(row.targetSec, reps * (run + walk), 'the row is the session, not one run interval');
    assert.equal(Math.round(row.targetSec / 60), mins);
    assert.ok(row.targetSec >= 10 * 60, `${row.targetSec}s`);
    assert.equal(row.sets ?? 1, 1, 'a cardio row is logged as one bout');
  }
});

test('⚠ QA F14 — a race plan is not described as a lifting block', async () => {
  const { rationaleFor } = await import('../rulebook/rationale.ts');
  for (const goal of RACES) {
    for (const daysPerWeek of DAYS) {
      const why = rationaleFor({ goal, daysPerWeek, sessionMinutes: 60, weeks: 12, splitStyle: 'ppl', deloadWeeks: [3, 7] });
      assert.ok(why.length > 0, `${goal} ${daysPerWeek}d`);
      assert.doesNotMatch(why, /muscle|gym|lift|compound|rep range|push, pull/i, `${goal} ${daysPerWeek}d: ${why}`);
    }
  }
  // A lifting block keeps its own words.
  assert.match(rationaleFor({ goal: 'muscle', daysPerWeek: 4, sessionMinutes: 60, weeks: 8, deloadWeeks: [] }), /muscle group/);
});
