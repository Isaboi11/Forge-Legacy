/**
 * holt-action-cards.test.mjs — every Holt action card the app draws (AI Road to 10 Sprint 4a §1.2–§1.3, lane C).
 *
 * The model gives words; every name, date and number on a card is the app's. A card that cannot be worked out says
 * why and has no Confirm. A refused or cut-off turn shows no card, so nothing can be confirmed.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/holt-action-cards.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CONFIRM_LABEL,
  DOOR_ROUTES,
  applyShown,
  cardFor,
  dayLabel,
  failedLine,
  holdTurnActions,
  holtActionEvent,
  paceFrom,
  pickByName,
  resolveDay,
} from '../holt-action-cards.ts';
import { DOORS, NEW_ACTIONS } from '../holt-actions.ts';
import { recommend, burnFor, activityByKey } from '../../nutrition/targets.ts';

const CATALOG = [
  { key: 'barbell-bench-press', name: 'Barbell Bench Press' },
  { key: 'dumbbell-bench-press', name: 'Dumbbell Bench Press' },
  { key: 'dumbbell-incline-bench-press', name: 'Dumbbell Incline Bench Press' },
  { key: 'barbell-back-squat', name: 'Barbell Back Squat', aliases: ['Back Squat'] },
  { key: 'goblet-squat', name: 'Goblet Squat' },
  { key: 'cardio:run', name: 'Outdoor Run' },
  { key: 'lat-pulldown', name: 'Lat Pulldown' },
];

const TODAY = '2026-11-18'; // a Wednesday

const programToday = () => ({
  source: 'program',
  name: 'Upper A',
  programId: 'p1',
  programName: 'Strength Block',
  weekIndex: 1,
  dayIndex: 2,
  exercises: [
    { name: 'Barbell Bench Press', catalogKey: 'barbell-bench-press', section: 'main', kind: 'strength', logged: false, mainIndex: 0 },
    { name: 'Lat Pulldown', catalogKey: 'lat-pulldown', section: 'main', kind: 'strength', logged: false, mainIndex: 1 },
    { name: 'Outdoor Run', catalogKey: 'cardio:run', section: 'main', kind: 'cardio', logged: false, mainIndex: 2 },
  ],
});
const openToday = (benchLogged = false) => ({
  source: 'open',
  name: 'Push Day',
  startedAt: '2026-11-18T15:00:00.000Z',
  exercises: [
    { name: 'Barbell Bench Press', catalogKey: 'barbell-bench-press', section: 'main', kind: 'strength', logged: benchLogged },
    { name: 'Lat Pulldown', catalogKey: 'lat-pulldown', section: 'main', kind: 'strength', logged: true },
  ],
});
const ctx = (over = {}) => ({ units: 'imperial', today: TODAY, catalog: CATALOG, nutritionAccess: true, ...over });
const act = (name, input) => ({ name, input });

/* ── swap ─────────────────────────────────────────────────────────────────────────────────────────────────── */

test('swap: names both exercises from the session and the catalogue, today only, with the plan the executor writes', async () => {
  const card = await cardFor(act('swap_exercise_today', { from: 'bench', to: 'dumbbell bench' }), ctx({ loadToday: async () => programToday() }));
  assert.equal(card.confirmLabel, CONFIRM_LABEL);
  assert.equal(card.rows[0].label, 'Barbell Bench Press → Dumbbell Bench Press');
  assert.equal(card.rows[1].label, 'Today only');
  assert.match(card.rows[1].note, /Upper A, your next session of Strength Block/);
  assert.deepEqual(card.plan, {
    source: 'program', at: 0, fromName: 'Barbell Bench Press', fromKey: 'barbell-bench-press',
    toKey: 'dumbbell-bench-press', toName: 'Dumbbell Bench Press', programId: 'p1', weekIndex: 1, dayIndex: 2,
  });
});

test('swap: in the open workout, by index, carrying when it started', async () => {
  const card = await cardFor(act('swap_exercise_today', { from: 'bench press', to: 'incline dumbbell press' }), ctx({ loadToday: async () => openToday() }));
  assert.equal(card.confirmLabel, CONFIRM_LABEL);
  assert.equal(card.plan.source, 'open');
  assert.equal(card.plan.at, 0);
  assert.equal(card.plan.toKey, 'dumbbell-incline-bench-press');
  assert.equal(card.plan.startedAt, '2026-11-18T15:00:00.000Z');
});

test('swap: every way it cannot be worked out says why and has no Confirm', async () => {
  const cases = [
    [{ from: 'bench', to: 'dumbbell bench' }, async () => null, /nothing to swap/],
    [{ from: 'deadlift', to: 'dumbbell bench' }, async () => programToday(), /couldn't find that exercise in Upper A/],
    [{ from: 'bench', to: 'zzzz wiggle' }, async () => programToday(), /couldn't match the new exercise/],
    [{ from: 'bench', to: 'barbell bench press' }, async () => programToday(), /already the exercise/],
    [{ from: 'bench', to: 'outdoor run' }, async () => programToday(), /run and a lift/],
    [{ from: 'bench', to: 'dumbbell bench' }, async () => openToday(true), /logged sets on Barbell Bench Press/],
    [{ from: '', to: 'x' }, async () => programToday(), /didn't catch/],
    [{ from: 'bench', to: 'dumbbell bench' }, async () => { throw new Error('offline'); }, /nothing to swap/],
  ];
  for (const [input, loadToday, why] of cases) {
    const card = await cardFor(act('swap_exercise_today', input), ctx({ loadToday }));
    assert.equal(card.confirmLabel, null, JSON.stringify(input));
    assert.match(card.blocked, why, JSON.stringify(input));
    assert.match(card.blocked, /Nothing was changed\.$/);
    assert.equal(card.plan, undefined);
  }
});

/* ── start ────────────────────────────────────────────────────────────────────────────────────────────────── */

const choices = (over = {}) => ({
  program: {
    id: 'p1',
    name: 'Strength Block',
    open: [
      { weekIndex: 1, dayIndex: 2, name: 'Upper A', exerciseCount: 6 },
      { weekIndex: 1, dayIndex: 3, name: 'Lower B', exerciseCount: 5 },
    ],
  },
  planned: { name: 'Hotel Gym', exerciseCount: 4 },
  templates: [
    { id: 't1', name: 'Push Day', exerciseCount: 7 },
    { id: 't2', name: 'Pull Day', exerciseCount: 6 },
    { id: 't3', name: 'Push Day Heavy', exerciseCount: 5 },
  ],
  open: null,
  ...over,
});

test("start: no name = today's session — the program's next one", async () => {
  const card = await cardFor(act('start_workout', {}), ctx({ loadStartChoices: async () => choices() }));
  assert.equal(card.title, 'Start Upper A');
  assert.equal(card.rows[0].value, '6 exercises');
  assert.deepEqual(card.plan, { kind: 'program', programId: 'p1', weekIndex: 1, dayIndex: 2, name: 'Upper A', next: true });
});

test('start: by name — a template, a later program session, the workout built for later', async () => {
  const by = async (name) => cardFor(act('start_workout', { name }), ctx({ loadStartChoices: async () => choices() }));
  assert.deepEqual((await by('my push day workout')).plan, { kind: 'template', templateId: 't1', name: 'Push Day' });
  assert.deepEqual((await by('lower b')).plan, { kind: 'program', programId: 'p1', weekIndex: 1, dayIndex: 3, name: 'Lower B', next: false });
  assert.deepEqual((await by('hotel gym')).plan, { kind: 'planned', name: 'Hotel Gym' });
  const tie = await by('day');
  assert.equal(tie.confirmLabel, null);
  assert.match(tie.blocked, /say which/);
  const none = await by('legs and glutes');
  assert.match(none.blocked, /couldn't find a workout of yours/);
});

test('start: nothing planned → says so; an open workout with sets → says it will ask first', async () => {
  const empty = await cardFor(act('start_workout', {}), ctx({ loadStartChoices: async () => choices({ program: null, planned: null }) }));
  assert.equal(empty.confirmLabel, null);
  assert.match(empty.blocked, /Nothing is planned for today/);
  const planned = await cardFor(act('start_workout', {}), ctx({ loadStartChoices: async () => choices({ program: null }) }));
  assert.deepEqual(planned.plan, { kind: 'planned', name: 'Hotel Gym' });
  const busy = await cardFor(act('start_workout', {}), ctx({ loadStartChoices: async () => choices({ open: { name: 'Leg Day', logged: true } }) }));
  assert.match(busy.rows[1].note, /Leg Day has sets logged/);
});

test('pickByName: every word must be in the name; fewest extra words wins; a tie is a question', () => {
  const opts = [{ name: 'Push Day' }, { name: 'Push Day Heavy' }, { name: 'Pull Day' }];
  assert.deepEqual(pickByName('push day', opts), { one: { name: 'Push Day' } });
  assert.deepEqual(pickByName('heavy push', opts), { one: { name: 'Push Day Heavy' } });
  assert.equal(pickByName('legs', opts), null);
  assert.equal(pickByName('my workout', opts), null);
});

/* ── schedule ─────────────────────────────────────────────────────────────────────────────────────────────── */

test('resolveDay: words → the local day (2026-11-18 is a Wednesday)', () => {
  const cases = {
    today: '2026-11-18',
    tonight: '2026-11-18',
    tomorrow: '2026-11-19',
    'day after tomorrow': '2026-11-20',
    thursday: '2026-11-19',
    Thursday: '2026-11-19',
    'on thursday': '2026-11-19',
    thurs: '2026-11-19',
    wednesday: '2026-11-18',
    'next thursday': '2026-11-26',
    'this saturday': '2026-11-21',
    monday: '2026-11-23',
    'in 3 days': '2026-11-21',
    'in a week': '2026-11-25',
    'in two weeks': '2026-12-02',
    'the 24th': '2026-11-24',
    '24th': '2026-11-24',
    'the 2nd': '2026-12-02',
    'nov 24': '2026-11-24',
    'november 24th': '2026-11-24',
    'dec 1': '2026-12-01',
    '1 december': '2026-12-01',
    'the 3rd of january': '2027-01-03',
    'jan 3': '2027-01-03',
    '2026-11-30': '2026-11-30',
  };
  for (const [words, want] of Object.entries(cases)) assert.equal(resolveDay(words, TODAY), want, words);
  for (const bad of ['', 'someday', 'yesterday', '2026-11-01', 'feb 30', 'the 31st of november', 'in 200 days', 'next year', 'may 5']) {
    assert.equal(resolveDay(bad, TODAY), null, bad);
  }
});

test('resolveDay: across a month and a year end, by the calendar not by 24-hour blocks', () => {
  assert.equal(resolveDay('tomorrow', '2026-12-31'), '2027-01-01');
  assert.equal(resolveDay('the 1st', '2026-12-31'), '2027-01-01');
  assert.equal(resolveDay('friday', '2026-12-31'), '2027-01-01');
  assert.equal(resolveDay('in 1 day', '2026-03-07'), '2026-03-08'); // US DST starts 03-08
});

test('dayLabel', () => {
  assert.equal(dayLabel('2026-11-18', TODAY), 'Today, Nov 18');
  assert.equal(dayLabel('2026-11-19', TODAY), 'Tomorrow, Nov 19');
  assert.equal(dayLabel('2026-11-26', TODAY), 'Thursday, Nov 26');
});

test('schedule: resolves the day, then says plainly it cannot be put on a date yet — no Confirm', async () => {
  const card = await cardFor(act('schedule_session', { when: 'thursday', what: 'legs' }), ctx());
  assert.equal(card.rows[0].label, 'Tomorrow, Nov 19');
  assert.equal(card.rows[0].note, 'legs');
  assert.equal(card.confirmLabel, null);
  assert.match(card.blocked, /can't put sessions on dates yet/);
  const can = await cardFor(act('schedule_session', { when: 'the 24th' }), ctx({ canSchedule: true }));
  assert.equal(can.confirmLabel, CONFIRM_LABEL);
  assert.deepEqual(can.plan, { date: '2026-11-24', what: null });
  const bad = await cardFor(act('schedule_session', { when: 'yesterday' }), ctx({ canSchedule: true }));
  assert.equal(bad.confirmLabel, null);
});

/* ── targets ──────────────────────────────────────────────────────────────────────────────────────────────── */

const adult = (over = {}) => ({
  facts: { sex: 'male', weightLb: 200, birthYear: 1990, heightIn: 70, activity: activityByKey('moderate') ?? activityByKey('active'), ...over },
  current: { kcal: 2600, protein: 180, carb: 280, fat: 80 },
  lowWeek: false,
});

test("targets: every number is recommend()'s, from the athlete's facts — the model sends goal and pace only", async () => {
  const read = adult();
  assert.ok(read.facts.activity, 'fixture activity level exists');
  const card = await cardFor(act('set_targets', { goal: 'lose', pace: 1, kcal: 900, protein: 400 }), ctx({ loadTargetFacts: async () => read }));
  const rec = recommend(read.facts, burnFor(read.facts, TODAY), 'lose', 1, TODAY);
  assert.equal(card.confirmLabel, CONFIRM_LABEL);
  assert.equal(card.title, 'New targets: lose 1 lb a week');
  assert.equal(card.rows[0].value, `${rec.kcal.toLocaleString('en-US')} a day`);
  assert.equal(card.rows[1].value, `${rec.protein} g`);
  assert.equal(card.rows[4].label, 'Replaces');
  assert.deepEqual(card.plan, { kcal: rec.kcal, protein: rec.protein, carb: rec.carb, fat: rec.fat, weightLb: 200, today: TODAY });
  assert.notEqual(card.plan.kcal, 900);
});

test('targets: an over-fast pace is held by recommend() and the card says so', async () => {
  const card = await cardFor(act('set_targets', { goal: 'lose', pace: 2.5 }), ctx({ loadTargetFacts: async () => adult({ weightLb: 150 }) }));
  assert.match(card.rows[0].note, /Forge keeps loss to 1% of bodyweight/);
  assert.match(card.title, /lose 1\.5 lb a week/);
});

test('targets: under 18, missing details, not male, a low week, no nutrition — each blocked, no number', async () => {
  const cases = [
    [adult({ birthYear: 2010 }), 'lose', {}, /start at 18/],
    [adult({ heightIn: null }), 'maintain', {}, /needs a few details/],
    [adult({ sex: 'unspecified' }), 'maintain', {}, /needs a few details/],
    [adult({ sex: 'female' }), 'maintain', {}, /asks one question/],
    [{ ...adult(), lowWeek: true }, 'lose', {}, /won't set a loss target from here this week/],
    [null, 'lose', {}, /didn't load/],
    [adult(), 'lose', { nutritionAccess: false }, /Nutrition is not open/],
  ];
  for (const [read, goal, over, why] of cases) {
    const card = await cardFor(act('set_targets', { goal }), ctx({ loadTargetFacts: async () => read, ...over }));
    assert.equal(card.confirmLabel, null, String(why));
    assert.match(card.blocked, why);
    assert.equal(card.plan, undefined);
    assert.ok(!card.rows.some((r) => /\d/.test(r.value ?? '')), 'no number on a blocked card');
  }
  // A low week still allows keeping or gaining.
  const keep = await cardFor(act('set_targets', { goal: 'maintain' }), ctx({ loadTargetFacts: async () => ({ ...adult(), lowWeek: true }) }));
  assert.equal(keep.confirmLabel, CONFIRM_LABEL);
  const bad = await cardFor(act('set_targets', { goal: 'shred' }), ctx({ loadTargetFacts: async () => adult() }));
  assert.match(bad.blocked, /lose, keep or gain/);
});

test('targets: the same numbers as today is not a change', async () => {
  const read = adult();
  const rec = recommend(read.facts, burnFor(read.facts, TODAY), 'maintain', 0, TODAY);
  const card = await cardFor(act('set_targets', { goal: 'maintain' }), ctx({ loadTargetFacts: async () => ({ ...read, current: { kcal: rec.kcal, protein: rec.protein, carb: rec.carb, fat: rec.fat } }) }));
  assert.match(card.blocked, /already your targets/);
});

test('paceFrom: held to a quarter pound and to the screen range', () => {
  assert.equal(paceFrom('lose', undefined), 1);
  assert.equal(paceFrom('gain', undefined), 0.5);
  assert.equal(paceFrom('maintain', 3), 0);
  assert.equal(paceFrom('lose', 0.3), 0.25);
  assert.equal(paceFrom('lose', 9), 2.5);
  assert.equal(paceFrom('gain', 3), 1);
  assert.equal(paceFrom('lose', -1), 1);
  assert.equal(paceFrom('lose', '2'), 1);
});

/* ── notes and doors ──────────────────────────────────────────────────────────────────────────────────────── */

test('remember_note: one clean line, or why not', async () => {
  const ok = await cardFor(act('remember_note', { text: '  I train   at 6am  ' }), ctx());
  assert.equal(ok.rows[0].label, 'I train at 6am');
  assert.deepEqual(ok.plan, { text: 'I train at 6am' });
  const long = await cardFor(act('remember_note', { text: 'x'.repeat(200) }), ctx());
  assert.equal(long.confirmLabel, null);
});

test('open_door: every door goes to a route the app has; nutrition doors follow the gate', async () => {
  for (const door of DOORS) {
    const card = await cardFor(act('open_door', { door }), ctx());
    assert.equal(card.confirmLabel, 'Open');
    assert.equal(card.plan.go, DOOR_ROUTES[door]);
  }
  const shut = await cardFor(act('open_door', { door: 'targets' }), ctx({ nutritionAccess: false }));
  assert.equal(shut.confirmLabel, null);
  assert.equal(await cardFor(act('open_door', { door: 'settings' }), ctx()), null);
});

test('the meal and program actions are not drawn here (lane B / lane A)', async () => {
  for (const name of ['log_food', 'propose_meal', 'propose_program', 'propose_day', 'propose_program_edit', 'offer_online_recipe_search']) {
    assert.equal(await cardFor(act(name, {}), ctx()), null, name);
  }
  // …and every other new action is.
  for (const name of NEW_ACTIONS.filter((n) => !['log_food', 'propose_meal', 'propose_program', 'propose_day', 'open_door'].includes(n))) {
    assert.ok(await cardFor(act(name, {}), ctx()), name);
  }
});

/* ── §1.3 ─────────────────────────────────────────────────────────────────────────────────────────────────── */

test('§1.3: cards only after a clean end — a refused, cut-off, retracted, errored or stopped turn draws none', async () => {
  let drawn = 0;
  const draw = async (a, c) => {
    drawn += 1;
    return cardFor(a, c);
  };
  const ends = [
    { done: true, stop: 'refusal' },
    { done: true, stop: 'max_tokens' },
    { done: true, stop: 'end_turn', retracted: true },
    { done: true, stop: 'end_turn', error: 'boom' },
    { done: true, stop: 'end_turn', aborted: true },
    { done: false },
    { done: true },
  ];
  for (const end of ends) {
    const hold = holdTurnActions(draw);
    hold.hold(act('remember_note', { text: 'I train at 6am' }));
    assert.deepEqual(await hold.release(end, ctx()), [], JSON.stringify(end));
    assert.equal(hold.count, 0);
  }
  assert.equal(drawn, 0, 'no card was even worked out');

  const hold = holdTurnActions(draw);
  hold.hold(act('remember_note', { text: 'I train at 6am' }));
  hold.hold({ name: 'not_an_action', input: {} });
  hold.hold(null);
  hold.hold(act('log_food', {}));
  const shown = await hold.release({ done: true, stop: 'end_turn' }, ctx());
  assert.equal(shown.length, 1, 'only drawable actions become cards');
  assert.equal(shown[0].card.action, 'remember_note');
  assert.deepEqual(await hold.release({ done: true, stop: 'end_turn' }, ctx()), [], 'released once');

  const dropped = holdTurnActions(draw);
  dropped.hold(act('remember_note', { text: 'I train at 6am' }));
  dropped.drop();
  assert.deepEqual(await dropped.release({ done: true, stop: 'tool_use' }, ctx()), []);
});

test('§1.3: no executor is called for a dropped action — and a blocked card never writes', async () => {
  const calls = [];
  const exec = (name) => ({
    apply: async (input) => {
      calls.push([name, input]);
      return { ok: true, said: '', undo: { action: name } };
    },
  });
  /* A refused turn: the athlete sees nothing, so there is nothing to tap, so nothing is applied. */
  const refused = holdTurnActions();
  refused.hold(act('remember_note', { text: 'I train at 6am' }));
  for (const shown of await refused.release({ done: true, stop: 'refusal' }, ctx())) await applyShown(shown, undefined, exec);
  assert.deepEqual(calls, []);

  /* A clean turn: Confirm hands the executor the card's plan, not the model's input. */
  const clean = holdTurnActions();
  clean.hold(act('remember_note', { text: '  I train   at 6am ', sneaky: 'x' }));
  const [shown] = await clean.release({ done: true, stop: 'end_turn' }, ctx());
  const res = await applyShown(shown, undefined, exec);
  assert.equal(res.ok, true);
  assert.deepEqual(calls, [['remember_note', { text: 'I train at 6am' }]]);

  /* A card with no Confirm: neither Confirm nor a secondary key reaches the executor. */
  const blockedShown = { action: act('schedule_session', { when: 'thursday' }), card: await cardFor(act('schedule_session', { when: 'thursday' }), ctx()) };
  assert.deepEqual(await applyShown(blockedShown, undefined, exec), { ok: false, reason: 'failed' });
  assert.deepEqual(await applyShown(blockedShown, 'save', exec), { ok: false, reason: 'failed' });
  assert.equal(calls.length, 1);

  /* No executor (schedule in 4a), or one that throws → a plain failure, never a throw. */
  assert.deepEqual(await applyShown(shown, undefined, () => null), { ok: false, reason: 'failed' });
  assert.deepEqual(await applyShown(shown, undefined, () => ({ apply: async () => { throw new Error('x'); } })), { ok: false, reason: 'failed' });
});

/* ── words and telemetry ──────────────────────────────────────────────────────────────────────────────────── */

test('failedLine is plain and never a stack trace', () => {
  for (const r of ['offline', 'gone', 'not_allowed', 'failed']) assert.match(failedLine(r), /^[A-Z][^{}<>]*\.$/);
  assert.match(failedLine('not_allowed', 'remember_note'), /memory is full/);
});

test('holt_action telemetry: the name and the outcome only, on allowlisted keys', () => {
  assert.deepEqual(holtActionEvent('set_targets', 'confirmed'), { kind: 'set_targets', result: 'confirmed' });
  assert.equal(holtActionEvent('set_targets', 'maybe'), null);
  assert.equal(holtActionEvent('drop table', 'confirmed'), null);
  assert.equal(holtActionEvent({ name: 'x' }, 'undone'), null);
});
