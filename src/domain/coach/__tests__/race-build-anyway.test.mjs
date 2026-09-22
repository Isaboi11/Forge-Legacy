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
  counterOfferIn,
  enduranceRefusalFor,
  LONG_RUN_DISTANCE_CAP_MI,
  LONG_RUN_SPIKE_CAP,
  RACE_SPEC,
  WEEKLY_INCREASE_CAP,
} from '../rulebook/endurance.ts';
import { assemble, refusalFor } from '../assemble.ts';

const TODAY = '2026-09-21';
const STRETCHES = ['hamstring-stretch', 'pigeon-stretch', 'standing-quad-stretch'];
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
  assembleEndurance(constraints(over), { todayISO: TODAY, stretchKeys: STRETCHES, canRunContinuously });

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
            let longest = Math.max(Math.max(mi, 3) * 0.4, 1.5);
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
            } else {
              assert.equal(r.concern, null, `${tag}: a concern with nothing to be concerned about`);
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
