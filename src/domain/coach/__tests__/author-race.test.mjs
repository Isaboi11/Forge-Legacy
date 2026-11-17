/**
 * author-race.test.mjs — a typed race block that lifts: the athlete's split, their gym, and who writes what.
 *
 * ══ THE BUG ══
 *
 * PO, 2026-09-30: *"I want to run twice a week and lift 3 times a week. I'm prepping for a marathon but I want
 * to have weights and strength to help me. Build me a 7 week program for this."* Run through the app as it
 * stood, that came back as FOUR runs and ONE lift, the lift made of push-ups and bodyweight squats, with the
 * seven weeks ignored. Three things he said, three things dropped:
 *
 *   · the split — `MIN_RACE_RUN_DAYS` takes four running days for a marathon whatever was asked;
 *   · the weights — a race build never asked where they train, so its lifting was built for "outdoor";
 *   · the seven weeks — a race block is as long as the calendar to race day, and nothing else.
 *
 * Coach-AI-Amendment-003 CW-D13: the running stays the race rulebook's arithmetic; the split, the room and
 * the length are the athlete's; the lifting days are Holt's to write. No test here calls a model.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/author-race.test.mjs
 */

import { shiftYmd, todayYmd } from '../../dates/local-date.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildPickerDb } from '../../exercise-picker/catalog-core.ts';
import { canDoExercise } from '../../home-gym/equipment.ts';
import { assemble } from '../assemble.ts';
import { completeFor, liftsInRace, nextQuestion } from '../chat-core.ts';
import { authorUserTurn, narrowAuthorRequest } from '../author.ts';
import { endsOnRace, firstWeeksOf, isLiftDay, placeWrittenLifts, raceWeekShape, spliceLiftDays, stopsShortLine } from '../author-race.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (f) => JSON.parse(readFileSync(path.join(here, '../../exercise-relationships/source', f), 'utf8'));
const POOL = buildPickerDb({ exercises: src('exercises.json'), exerciseMuscles: src('exercise_muscles.json'), muscles: src('muscles.json'), equipment: src('equipment.json') });
const BY_KEY = new Map(POOL.map((e) => [e.key, e]));

// The athlete's local day, N weeks on — what the chips send (a UTC day was a day late in a US evening).
const inWeeks = (w) => shiftYmd(todayYmd(), w * 7);

/** What `coach-interpret` made of the PO's sentence, live, on 2026-09-30 — plus his answers. */
const SAID = { goal: 'run_marathon', daysPerWeek: 5, weeks: 7, liftDays: 3 };
const answered = (over = {}) =>
  completeFor({ ...SAID, experience: { lifting: 'advanced', running: 'intermediate' }, environment: 'full_gym', raceDate: inWeeks(7), currentWeeklyMi: 15, limitations: [], ...over }, 'program');
const build = (over = {}) => assemble({ ...answered(over), buildAnyway: true }, POOL, canDoExercise);

const day = (name, keys) => ({ letter: 'Z', name, warmup: [], main: keys.map((k) => ({ catalogKey: k, name: BY_KEY.get(k).name, sets: 3, reps: 8 })), cooldown: [] });
const WRITTEN = [
  day('Strength A', ['barbell-back-squat', 'barbell-romanian-deadlift', 'single-arm-dumbbell-row', 'plank']),
  day('Strength B', ['barbell-deadlift', 'dumbbell-bulgarian-split-squat', 'cable-lat-pulldown']),
  day('Strength C', ['machine-leg-press', 'chest-supported-row-machine', 'seated-dumbbell-shoulder-press']),
];

// ─────────────────────────────────────────────────────────────────────────────
// THE SPLIT IS THEIRS
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ the defect, pinned: without their say-so a marathon block takes four runs and leaves one lift', () => {
  const out = build();
  assert.ok(out.ok);
  assert.deepEqual(raceWeekShape(out.assembly.structure), { runDays: 4, liftDays: 1 });
});

test('⚠ "run twice, lift three times" is two runs and three lifts, every week before the race', () => {
  const out = build({ splitAsSaid: true });
  assert.ok(out.ok, out.ok ? '' : out.refusal.message);
  const s = out.assembly.structure;
  assert.equal(s.weeks, 7);
  for (const [w, week] of s.weekPlans.slice(0, -1).entries()) {
    const lifts = week.days.filter(isLiftDay).length;
    assert.deepEqual([week.days.length - lifts, lifts], [2, 3], `week ${w + 1}`);
  }
  // He says once that it is light for the distance, and does not claim to have trimmed the lifting.
  const said = (out.assembly.concerns ?? []).join(' ');
  assert.match(said, /Two runs a week is light for a marathon/);
  assert.doesNotMatch(said, /lifting days? rather than/);
});

test('the running is still the race rulebook\'s: a long run every week, and the race at the end', () => {
  const s = build({ splitAsSaid: true }).assembly.structure;
  for (const week of s.weekPlans.slice(0, -1)) assert.ok(week.days.some((d) => /long run/i.test(d.name)), 'every week before race week has its long run');
  assert.ok(endsOnRace(s));
  const race = s.weekPlans.at(-1).days.at(-1);
  assert.equal(race.main[0].targetMi, 26.2, 'nothing is scheduled after the race');
});

test('a split nobody said is never re-read as one: no lifting days, no flag, no change', () => {
  const plain = assemble({ ...answered({ liftDays: undefined }), buildAnyway: true }, POOL, canDoExercise);
  const flagged = assemble({ ...answered({ liftDays: undefined, splitAsSaid: true }), buildAnyway: true }, POOL, canDoExercise);
  assert.deepEqual(flagged.assembly.structure, plain.assembly.structure);
});

// ─────────────────────────────────────────────────────────────────────────────
// THE WEIGHTS ARE REAL
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ a race that lifts is asked (or remembers) where, and its lifting is built for that room', () => {
  assert.equal(liftsInRace(SAID), true);
  assert.equal(liftsInRace({ goal: 'run_marathon', daysPerWeek: 4 }), false);
  const asked = [];
  let state = { ...SAID, experience: { lifting: 'advanced', running: 'intermediate' } };
  for (let i = 0; i < 8; i += 1) {
    const q = nextQuestion(state, 'program');
    if (!q) break;
    asked.push(q.id);
    state = { ...state, ...q.chips[0].patch };
  }
  assert.deepEqual(asked, ['race_when', 'race_base', 'where', 'limits']);
  // A race with no lifting in it still never asks.
  assert.equal(nextQuestion({ goal: 'run_marathon', daysPerWeek: 4, raceDate: inWeeks(16), currentWeeklyMi: 20, experience: state.experience }, 'program').id, 'limits');

  assert.equal(completeFor({ ...SAID }, 'program').environment, 'full_gym', 'never "outdoor" for a block with lifting days');
  assert.equal(completeFor({ goal: 'run_marathon' }, 'program').environment, 'outdoor');

  const lifts = build({ splitAsSaid: true }).assembly.structure.weekPlans[0].days.filter(isLiftDay);
  const tools = new Set(lifts.flatMap((d) => d.main.map((e) => BY_KEY.get(e.catalogKey)?.equipId)));
  assert.ok(tools.has('barbell'), `a full gym's lifting uses the gym: ${[...tools]}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// SEVEN WEEKS
// ─────────────────────────────────────────────────────────────────────────────

test('"a 7 week program" offers the race at the end of those weeks first, and still asks', () => {
  const q = nextQuestion({ ...SAID, experience: { lifting: 'advanced', running: 'advanced' } }, 'program');
  assert.equal(q.id, 'race_when');
  assert.equal(q.chips[0].label, 'At the end of the 7 weeks');
  assert.equal(q.chips[0].patch.raceDate, inWeeks(7));
  assert.equal(nextQuestion({ goal: 'run_marathon', daysPerWeek: 4, experience: { lifting: 'advanced', running: 'advanced' } }, 'program').chips[0].label, 'About 6 weeks');
});

test('⚠ a race further off gets the FIRST seven weeks of its build — no taper, no race day inside it', () => {
  const full = build({ splitAsSaid: true, raceDate: inWeeks(16) }).assembly.structure;
  assert.ok(full.weeks > 7);
  const cut = firstWeeksOf(full, 7);
  assert.equal(cut.weeks, 7);
  assert.equal(cut.weekPlans.length, 7);
  assert.match(cut.name, /^7-Week Marathon/);
  assert.deepEqual(cut.weekPlans, full.weekPlans.slice(0, 7), "the weeks are the rulebook's own, untouched");
  assert.equal(endsOnRace(cut), false);
  assert.match(stopsShortLine(7, full.weeks), new RegExp(`about ${full.weeks - 7} weeks after it ends`));
  // A block already that short is left alone.
  assert.equal(firstWeeksOf(full, full.weeks), full);
  assert.equal(firstWeeksOf(full, 52), full);
  assert.equal(firstWeeksOf(full, 0), full);
});

// ─────────────────────────────────────────────────────────────────────────────
// WHO WRITES WHAT
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ what Holt wrote replaces the lifting days and never touches a run', () => {
  const s = build({ splitAsSaid: true }).assembly.structure;
  const out = spliceLiftDays(s, WRITTEN);
  for (const [w, week] of out.weekPlans.slice(0, -1).entries()) {
    const before = s.weekPlans[w].days;
    assert.deepEqual(week.days.filter((d) => !isLiftDay(d)), before.filter((d) => !isLiftDay(d)), `week ${w + 1}: the runs are exactly the rulebook's`);
    // The deload week carries the marker on what he wrote too (B-D3) — see the deload test below.
    const marker = before.some((d) => isLiftDay(d) && d.name.includes('[DELOAD]')) ? ' [DELOAD]' : '';
    assert.deepEqual(week.days.filter(isLiftDay).map((d) => d.name), ['Strength A', 'Strength B', 'Strength C'].map((n) => n + marker));
    assert.deepEqual(week.days.map((d) => d.letter), before.map((d) => d.letter), 'each day keeps its place in the week');
  }
  assert.deepEqual(out.days, out.weekPlans[0].days);
  assert.equal(out.weeks, s.weeks);
});

test('⚠ race week keeps one short lift and gives the other lifting days back', () => {
  const s = build({ splitAsSaid: true }).assembly.structure;
  const before = s.weekPlans.at(-1).days;
  assert.equal(before.filter(isLiftDay).length, 3, 'the rulebook writes its trimmed session once per lifting day');
  const after = spliceLiftDays(s, WRITTEN).weekPlans.at(-1).days;
  assert.equal(after.length, before.length, 'the week keeps its length');
  assert.equal(after.filter(isLiftDay).length, 1);
  assert.deepEqual(after.filter(isLiftDay)[0], before.filter(isLiftDay)[0], "and that one is the rulebook's own");
  assert.equal(after.filter((d) => d.main.length === 0).length, 2, 'the others are empty days — nothing owed');
  assert.deepEqual(after.at(-1), before.at(-1), 'the race is still last');
  assert.ok(!after.some((d) => WRITTEN.some((x) => x.name === d.name)), 'no full lifting day lands in race week');
});

test('nothing written, or nothing to put it into, changes nothing', () => {
  const s = build({ splitAsSaid: true }).assembly.structure;
  assert.equal(spliceLiftDays(s, []), s);
  const flat = { name: 'x', weeks: 4, daysPerWeek: 3, vary: false, days: WRITTEN, weekPlans: null };
  assert.equal(spliceLiftDays(flat, WRITTEN), flat);
});

test('fewer written days than lifting days go round again rather than leaving a gap', () => {
  const out = spliceLiftDays(build({ splitAsSaid: true }).assembly.structure, WRITTEN.slice(0, 2));
  assert.deepEqual(out.weekPlans[0].days.filter(isLiftDay).map((d) => d.name), ['Strength A', 'Strength B', 'Strength A']);
});

// ─────────────────────────────────────────────────────────────────────────────
// B-D3 (AI audit 11-16) — WHERE A WRITTEN DAY LANDS, AND THE DELOAD
// ─────────────────────────────────────────────────────────────────────────────

const patternOf = (k) => BY_KEY.get(k)?.pattern;
const placingOf = (a) => ({ shape: a.weekShape, ...a.racePlacing, patternOf });
/** Is this the day before (or after) the long run, in the rulebook's seven-day week? */
const besideLong = (a, where) => {
  const runAt = a.weekShape.map((x, i) => (x === 'run' ? i : -1)).filter((i) => i >= 0);
  const long = runAt[a.racePlacing.demands.indexOf('long')];
  const day = (long + (where === 'before' ? 6 : 1)) % 7;
  // The session index of that calendar day, when it holds a session.
  return a.weekShape[day] === 'rest' ? null : a.weekShape.slice(0, day).filter((x) => x !== 'rest').length;
};
const leadsOnLegs = (d) => ['Squat / Knee Dominant', 'Hinge / Hip Dominant'].includes(patternOf(d.main[0].catalogKey));

/*
 * Their own week (CA-D12): upper Monday, legs Wednesday, upper Friday, the long run Saturday. Holt writes three
 * lifting days — and writes the leg days first. By position, his deadlift day lands on Friday.
 */
const TYPED_WEEK = [
  { kind: 'lift', focus: 'upper' },
  { kind: 'run' },
  { kind: 'lift', focus: 'legs' },
  { kind: 'run' },
  { kind: 'lift', focus: 'upper' },
  { kind: 'run' },
  { kind: 'rest' },
];
const LEGS_FIRST = [
  day('Lower A', ['barbell-back-squat', 'barbell-romanian-deadlift', 'barbell-calf-raise']),
  day('Upper A', ['barbell-bench-press', 'pull-up', 'barbell-overhead-press']),
  day('Lower B', ['barbell-deadlift', 'dumbbell-bulgarian-split-squat', 'cable-lat-pulldown']),
];
const typedRace = () => {
  const out = assemble(
    { ...completeFor({ goal: 'run_half', days: TYPED_WEEK, daysAsGiven: true, weeks: null, experience: { lifting: 'intermediate', running: 'intermediate' }, environment: 'full_gym', raceDate: inWeeks(10), currentWeeklyMi: 14, limitations: [] }, 'program'), buildAnyway: true },
    POOL,
    canDoExercise,
  );
  assert.ok(out.ok, out.ok ? '' : out.refusal.message);
  return out.assembly;
};

test('⚠ B-D3: a written leg day no longer lands the day before the long run', () => {
  const a = typedRace();
  const friday = besideLong(a, 'before');
  assert.notEqual(friday, null, 'the fixture has a lift the day before the long run');
  assert.ok(!leadsOnLegs(a.structure.weekPlans[0].days[friday]), "the rulebook's own Friday is their upper day");
  // The defect, pinned: by position the deadlift day is Friday.
  const byPosition = spliceLiftDays(a.structure, LEGS_FIRST);
  assert.equal(byPosition.weekPlans[0].days[friday].name, 'Lower B');
  // Placed: every week before race week has an upper day there, and the runs and letters are the rulebook's.
  const { structure, clash } = placeWrittenLifts(a.structure, LEGS_FIRST, placingOf(a));
  for (const [w, week] of structure.weekPlans.slice(0, -1).entries()) {
    assert.ok(!leadsOnLegs(week.days[friday]), `week ${w + 1}: ${week.days[friday].name} the day before the long run`);
    const before = a.structure.weekPlans[w].days;
    assert.deepEqual(week.days.filter((d) => !isLiftDay(d)), before.filter((d) => !isLiftDay(d)), 'the runs are untouched');
    assert.deepEqual(week.days.map((d) => d.letter), before.map((d) => d.letter));
  }
  // Two leg days and their week's two remaining slots both sit before a run; the one that is a quality run is said.
  assert.match(clash ?? '', /^Lower [AB] sits the day before a quality run/);
});

test('B-D3: written days that already fit are placed exactly where the position put them', () => {
  const a = build({ splitAsSaid: true }).assembly;
  const placed = placeWrittenLifts(a.structure, WRITTEN, placingOf(a));
  assert.deepEqual(placed.structure, spliceLiftDays(a.structure, WRITTEN), 'nothing to fix, nothing moved');
  assert.equal(placed.clash, null);
});

test('B-D3: when every written day trains legs and a slot sits beside the long run, it is said — never silent', () => {
  // Five days, three of them lifting, strength beside a 5K: the rulebook puts its upper day after the long run.
  const out = assemble({ ...answered({ goal: 'run_5k', strengthGoal: 'muscle', raceDate: inWeeks(12), weeks: 12 }), buildAnyway: true }, POOL, canDoExercise);
  assert.ok(out.ok);
  const a = out.assembly;
  const after = besideLong(a, 'after');
  assert.notEqual(after, null, 'the fixture has a lift the day after the long run');
  assert.ok(!leadsOnLegs(a.structure.weekPlans[0].days[after]), "the rulebook's own day there is not a leg day");
  const { clash } = placeWrittenLifts(a.structure, WRITTEN, placingOf(a));
  assert.match(clash ?? '', /the day after your long run/);
});

test('B-D3: a written day in a deload week is deloaded like the rulebook\'s — the marker and the cut sets', () => {
  const a = typedRace();
  const deload = a.deloadWeeks[0];
  assert.ok(deload != null && deload < a.structure.weekPlans.length - 1, 'the block has a deload before race week');
  const { structure } = placeWrittenLifts(a.structure, LEGS_FIRST, placingOf(a));
  const lifts = structure.weekPlans[deload].days.filter(isLiftDay);
  assert.equal(lifts.length, 3);
  for (const d of lifts) {
    assert.match(d.name, / \[DELOAD\]$/, 'PAS-D8 (1): the marker');
    assert.ok(d.main.every((e) => e.sets === 2), `PAS-D8 (2): 3 sets cut to 2 — ${d.name}: ${d.main.map((e) => e.sets)}`);
  }
  // The week before it is full.
  assert.ok(structure.weekPlans[deload - 1].days.filter(isLiftDay).every((d) => !d.name.includes('[DELOAD]') && d.main.every((e) => e.sets === 3)));
});

test('he is told these are the lifting days of a race block, and to write no running', () => {
  const turn = authorUserTurn(narrowAuthorRequest({ kind: 'program', said: ['run twice, lift three times, marathon'], days: 3, weeks: 7, goal: 'strength', beside: { race: 'marathon', runDays: 2 } }));
  assert.match(turn, /^Write ONLY the 3 LIFTING days of a training week\. The athlete is training for a marathon and runs 2 days a week/);
  assert.match(turn, /Do not write any running or cardio/);
  assert.equal(narrowAuthorRequest({ said: ['x'], beside: { race: '', runDays: 2 } }).beside, null);
  assert.equal(narrowAuthorRequest({ said: ['x'], beside: 'marathon' }).beside, null);
  assert.doesNotMatch(authorUserTurn(narrowAuthorRequest({ kind: 'program', said: ['ppl'], days: 3, weeks: 8 })), /LIFTING days/);
});
