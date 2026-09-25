import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ASK_TOOLS,
  formatLiftHistory,
  formatPrograms,
  formatRecords,
  formatTrainingSummary,
  formatWorkoutDetail,
  isBodyQuestion,
  liftMatch,
  localDate,
  runAskTool,
  scheduleSlots,
} from '../ask-tools.ts';
import { nextOpenSlot as coreNextOpenSlot, scheduleSlots as coreScheduleSlots } from '../../program/progress-core.ts';

/*
 * HOLT'S READ TOOLS. The bug that started this: "what's my bench progress" missed the training regex, so
 * Holt answered "I don't have that data" with a bench log in the database. These pin that the lookups find
 * the lift from the athlete's own words, in their units and dates, and that the privacy lines
 * (own data only; body only when asked) are enforced in code.
 */

const set = (weight, reps, extra = {}) => ({ weight, reps, weight_unit: 'lb', ...extra });
const workout = (startedAt, exercises, extra = {}) => ({
  started_at: startedAt,
  activity_type: 'strength',
  workout_exercises: exercises.map(([name, sets, more = {}], position) => ({
    name,
    catalog_key: more.key ?? null,
    section: more.section ?? 'main',
    position,
    workout_sets: sets.map((s, i) => ({ set_index: i, ...s })),
  })),
  ...extra,
});

const BENCH_LOG = [
  workout('2026-09-22T23:30:00Z', [
    ['Barbell Bench Press', [set(135, 10), set(225, 5), set(225, 5), set(225, 4)]],
    ['Incline Dumbbell Bench Press', [set(70, 10), set(70, 9)]],
  ]),
  workout('2026-08-10T15:00:00Z', [['Barbell Bench Press', [set(215, 5), set(215, 5)]]]),
  // A legacy row stored in kilos: 95 kg = 209.4 lb.
  workout('2026-04-02T15:00:00Z', [['Barbell Bench Press', [set(95, 5, { weight_unit: 'kg' })]]]),
  workout('2026-03-05T15:00:00Z', [
    ['Barbell Bench Press', [set(205, 5), set(205, 5)]],
    // A warm-up is not a working set and never counts.
    ['Barbell Bench Press', [set(315, 1)], { section: 'warmup' }],
  ]),
];

test('the lift is found from the words the athlete uses', () => {
  assert.equal(liftMatch('bench', 'Barbell Bench Press'), 2);
  assert.ok(liftMatch('bench', 'Barbell Bench Press') < liftMatch('bench', 'Incline Dumbbell Bench Press'));
  assert.equal(liftMatch('my bench', 'Barbell Bench Press'), 2);
  assert.notEqual(liftMatch('rdl', 'Barbell Romanian Deadlift'), null);
  assert.notEqual(liftMatch('RDLs', 'Barbell Romanian Deadlift'), null);
  assert.notEqual(liftMatch('ohp', 'Standing Overhead Press'), null);
  assert.notEqual(liftMatch('squats', 'Barbell Back Squat'), null);
  assert.notEqual(liftMatch('pullups', 'Pull Up'), null);
  // A different lift is not a typo of this one.
  assert.equal(liftMatch('front squat', 'Barbell Back Squat'), null);
  assert.equal(liftMatch('deadlift', 'Barbell Bench Press'), null);
});

test('bench history: working sets, heaviest set, monthly e1RM trend, other matches — in pounds', () => {
  const out = formatLiftHistory('bench', BENCH_LOG, [], { units: 'imperial', tz: 300, weeks: 52 });
  assert.match(out, /^Barbell Bench Press — 4 sessions in the last 52 weeks \(weights in lb\)\. First 2026-03-05, last 2026-09-22\./);
  // The 315 single was a warm-up; the heaviest WORKING set is 225×5.
  assert.match(out, /Heaviest set: 225×5 on 2026-09-22\./);
  assert.ok(!out.includes('315'), 'a warm-up set leaked into the history');
  // Epley 205×5 = 239; 225×5 = 263. The kg row is converted, not read as 95 lb.
  assert.match(out, /2026-03 239, 2026-04 244, 2026-08 251, 2026-09 263\. First month 239 → latest month 263 \(\+10%\)/);
  assert.match(out, /2026-04-02 \(Thu\): 209\.4×5/);
  // Identical sets fold; the 135 warm-up-ish set is still a logged main set and is shown.
  assert.match(out, /2026-09-22 \(Tue\): 135×10, 225×5 ×2, 225×4 — e1RM 263/);
  assert.match(out, /Other logged lifts that also match "bench": Incline Dumbbell Bench Press \(1 session, last 2026-09-22, heaviest 70×10\)/);
});

test('an evening workout is dated on the athlete\'s calendar, not UTC', () => {
  // 23:30 UTC on the 22nd is 18:30 on the 22nd in UTC-5 — and 08:30 on the 23rd in UTC+9.
  assert.equal(localDate('2026-09-22T23:30:00Z', 300), '2026-09-22');
  assert.equal(localDate('2026-09-22T23:30:00Z', -540), '2026-09-23');
});

test('metric athletes get kilos, estimates rounded', () => {
  const out = formatLiftHistory('bench press', BENCH_LOG, [], { units: 'metric', tz: 0, weeks: 52 });
  assert.match(out, /weights in kg/);
  assert.match(out, /Heaviest set: 102\.1×5/);
  // The legacy kg row round-trips to its own number.
  assert.match(out, /2026-04-02 \(Thu\): 95×5/);
});

test('nothing logged is said plainly, with a way forward — never an invented number', () => {
  const out = formatLiftHistory('deadlift', BENCH_LOG, [], { units: 'imperial', tz: 0, weeks: 52 });
  assert.match(out, /^No logged sessions of "deadlift" in the last 52 weeks/);
  assert.match(out, /get_training_summary/);
});

test('recorded PRs for the lift ride along with its history', () => {
  const prs = [
    { exercise: 'Barbell Bench Press', measure_kind: 'load', load_value: 225, load_unit: 'lb', load_reps: 5, achieved_on: '2026-09-22' },
    { exercise: 'Barbell Back Squat', measure_kind: 'load', load_value: 315, load_unit: 'lb', load_reps: 3, achieved_on: '2026-09-01' },
  ];
  const out = formatLiftHistory('bench', BENCH_LOG, prs, { units: 'imperial', tz: 0, weeks: 52 });
  assert.match(out, /Recorded PRs: 225 lb × 5 on 2026-09-22\./);
  assert.ok(!out.includes('315 lb'), "another lift's PR leaked in");
});

test('training summary: per-week counts with the gaps, streak, and every lift', () => {
  const rows = [
    workout('2026-09-24T12:00:00Z', [['Barbell Back Squat', [set(275, 3)]]]),
    workout('2026-09-22T12:00:00Z', [['Barbell Bench Press', [set(225, 5)]]]),
    workout('2026-09-16T12:00:00Z', [['Barbell Bench Press', [set(220, 5)]]]),
    workout('2026-09-02T12:00:00Z', [['Barbell Bench Press', [set(215, 5)]]]),
  ];
  const out = formatTrainingSummary(rows, { units: 'imperial', tz: 0, weeks: 4, today: '2026-09-25' });
  assert.match(out, /^4 workouts in the last 4 weeks — 1 a week on average\./);
  // 2026-09-25 is a Friday, so the weeks start Monday 08-31, 09-07, 09-14, 09-21.
  assert.match(out, /08-31: 1, 09-07: 0, 09-14: 1, 09-21: 2/);
  assert.match(out, /Current streak: 2 weeks in a row/);
  assert.match(out, /Barbell Bench Press ×3 \(last 2026-09-22, heaviest 225×5\)/);
});

test('workout detail: every set of the day, sections and notes', () => {
  const rows = [
    workout('2026-09-22T23:30:00Z', [['Barbell Bench Press', [set(225, 5), set(225, 4)]]], { workout_name: 'Upper A', duration_sec: 3720, notes: 'Felt strong' }),
    workout('2026-09-23T15:00:00Z', [['Barbell Back Squat', [set(275, 3)]]]),
  ];
  const out = formatWorkoutDetail('2026-09-22', rows, { units: 'imperial', tz: 300 });
  assert.match(out, /2026-09-22 Tue — Upper A \(strength, 62 min\)/);
  assert.match(out, /Workout note: Felt strong/);
  assert.match(out, /Barbell Bench Press: 225×5, 225×4/);
  assert.ok(!out.includes('Squat'), 'another day leaked in');
});

test('records: the best per lift and kind, plus entered 1RMs', () => {
  const prs = [
    { exercise: 'Barbell Bench Press', measure_kind: 'load', load_value: 215, load_unit: 'lb', load_reps: 5, achieved_on: '2026-08-10' },
    { exercise: 'Barbell Bench Press', measure_kind: 'load', load_value: 225, load_unit: 'lb', load_reps: 5, achieved_on: '2026-09-22' },
    { exercise: 'Run', measure_kind: 'time', time_seconds: 1500, achieved_on: '2026-07-04' },
  ];
  const out = formatRecords(prs, [{ catalog_key: 'barbell_bench_press', weight_lb: '265', source: 'tested', tested_at: '2026-06-01T00:00:00Z' }], { units: 'imperial', exercise: 'bench' });
  assert.match(out, /Barbell Bench Press: 225 lb × 5 on 2026-09-22/);
  assert.ok(!out.includes('215 lb'), 'only the best record per lift');
  assert.ok(!out.includes('Run'), 'narrowed to the lift asked about');
  assert.match(out, /barbell bench press: 265 lb 1RM \(tested, 2026-06-01\)/);
});

// ── The schedule twin ────────────────────────────────────────────────────────────────────────────────

const ex = (name, sets = 3, reps = 8) => ({ name, sets, reps });
const day = (name, main = []) => ({ name, warmup: [], main, cooldown: [] });
const STRUCTURES = {
  flat: { weeks: 4, daysPerWeek: 3, days: [day('Upper A', [ex('Bench')]), day('Lower A', [ex('Squat')]), day('Rest')] },
  // Ragged weeks — the shape that killed Continue Training at session 18.
  ragged: {
    weeks: 3,
    daysPerWeek: 3,
    vary: true,
    days: [day('A', [ex('Bench')])],
    weekPlans: [
      { days: [day('A', [ex('Bench')]), day('B', [ex('Squat')]), day('C', [ex('Row')])] },
      { days: [day('A', [ex('Bench')]), day('B', [ex('Squat')])] },
      { days: [day('A', [ex('Bench')]), day('B', [ex('Squat')]), day('C', [ex('Row')]), day('D', [ex('Press')])] },
    ],
  },
  unbuilt: { weeks: 2, daysPerWeek: 4, days: [] },
};

test("the schedule walk is progress-core's, slot for slot", () => {
  for (const [name, s] of Object.entries(STRUCTURES)) {
    const mine = scheduleSlots(s).map((x) => [x.weekIndex, x.dayIndex, x.day?.name ?? null]);
    const core = coreScheduleSlots(s).map((x) => [x.weekIndex, x.dayIndex, x.day?.name ?? null]);
    assert.deepEqual(mine, core, name);
  }
});

test('program status: counts, the next session, and it agrees with Continue Training', () => {
  const s = STRUCTURES.ragged;
  const marks = [
    { week_index: 0, day_index: 0, state: 'completed' },
    { week_index: 0, day_index: 1, state: 'skipped' },
    { week_index: 0, day_index: 2, state: 'completed' },
    { week_index: 1, day_index: 1, state: 'completed' },
  ];
  const out = formatPrograms([{ id: 'p1', name: 'Strength Block', state: 'active', structure: s, started_at: '2026-09-01T00:00:00Z' }], marks);
  assert.match(out, /Active program: Strength Block — 3 weeks, 9 sessions\. Started 2026-09-01\. 3 trained, 1 skipped, 5 to go\./);
  const core = coreNextOpenSlot(s, marks.map((m) => ({ weekIndex: m.week_index, dayIndex: m.day_index, state: m.state })));
  assert.equal(core.weekIndex, 1);
  assert.equal(core.dayIndex, 0);
  assert.match(out, /Next session: week 2, day 1 — A: Bench 3×8\./);
});

// ── The privacy lines, enforced in code ─────────────────────────────────────────────────────────────

test('body questions are recognised; lifting-weight questions are not', () => {
  for (const q of ['how much do I weigh now', 'have I lost weight this month', "what's my bodyweight trend", 'did my waist go down', 'am I cutting fast enough']) {
    assert.ok(isBodyQuestion(q), q);
  }
  for (const q of ["what's my bench progress", 'what weight should I squat', 'how heavy should I go on rows', 'add weight to deadlift?']) {
    assert.ok(!isBodyQuestion(q), q);
  }
});

/** A fake supabase client: records every table and filter, and answers from fixtures. */
function fakeDb(fixtures = {}) {
  const calls = [];
  const db = {
    from(table) {
      const q = { table, eq: [], ops: [] };
      calls.push(q);
      const result = () => {
        const d = fixtures[table];
        return { data: typeof d === 'function' ? d(q) : (d ?? []), error: null };
      };
      const b = {
        select: (cols) => ((q.cols = cols), b),
        eq: (k, v) => (q.eq.push([k, v]), b),
        in: (k, v) => (q.ops.push(['in', k, v]), b),
        gte: (k, v) => (q.ops.push(['gte', k, v]), b),
        lte: (k, v) => (q.ops.push(['lte', k, v]), b),
        lt: (k, v) => (q.ops.push(['lt', k, v]), b),
        order: () => b,
        limit: () => b,
        maybeSingle: () => {
          const r = result();
          return Promise.resolve({ data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data, error: null });
        },
        then: (ok, bad) => Promise.resolve(result()).then(ok, bad),
      };
      return b;
    },
  };
  return { db, calls };
}

const RED = /squad|friend|feed|challenge|presence|notification|admin|chapter_photos|transformation/;

test('every tool reads only the caller\'s own rows, and never a red table', async () => {
  const uid = 'athlete-1';
  const { db, calls } = fakeDb({
    profiles: [{ app_prefs: { units: 'imperial' } }],
    workouts: BENCH_LOG,
    chapters: [{ id: 'c1', name: 'Chapter One', start_date: '2026-01-01' }],
  });
  const ctx = { db, uid, question: 'how much do I weigh', tz: 0, now: new Date('2026-09-25T12:00:00Z') };
  const input = { get_lift_history: { exercise: 'bench' }, get_workout_detail: { date: '2026-09-22' } };
  for (const t of ASK_TOOLS) {
    const r = await runAskTool(t.name, input[t.name] ?? {}, ctx);
    assert.equal(typeof r.text, 'string', t.name);
  }
  assert.ok(calls.length > 10);
  for (const c of calls) {
    assert.ok(!RED.test(c.table), `red table read: ${c.table}`);
    const own = c.eq.some(([k, v]) => (k === 'athlete_id' || k === 'id') && v === uid);
    assert.ok(own, `${c.table} was read without an own-id filter`);
    // profiles is world-readable (0001) — it must be filtered on id, not athlete_id.
    if (c.table === 'profiles') assert.ok(c.eq.some(([k, v]) => k === 'id' && v === uid));
    // A reflection is the most personal writing in the app; no tool selects it.
    assert.ok(!/reflection/.test(c.cols ?? ''), `${c.table} selected a reflection`);
  }
});

test('body metrics are refused unless THIS message asks about the body — before any read', async () => {
  const { db, calls } = fakeDb({ body_entries: [{ logged_on: '2026-09-20', weight_lb: 190 }] });
  const r = await runAskTool('get_body_metrics', {}, { db, uid: 'a', question: "what's my bench progress", tz: 0 });
  assert.equal(r.isError, true);
  assert.equal(calls.length, 0, 'the gate must stop the read, not just the answer');

  const ok = await runAskTool('get_body_metrics', {}, { db: fakeDb({ profiles: [{ app_prefs: {} }], body_entries: [{ logged_on: '2026-09-20', weight_lb: 190 }] }).db, uid: 'a', question: 'have I lost weight?', tz: 0 });
  assert.equal(ok.isError, false);
  assert.match(ok.text, /2026-09-20: 190 lb/);
});

test('a failed read comes back as an error the model can say out loud, never a throw', async () => {
  const db = { from: () => { throw new Error('connection reset'); } };
  const r = await runAskTool('get_recent_workouts', {}, { db, uid: 'a', question: 'x', tz: 0 });
  assert.equal(r.isError, true);
  assert.match(r.text, /couldn't pull it/);
  const unknown = await runAskTool('get_squad_feed', {}, { db, uid: 'a', question: 'x', tz: 0 });
  assert.equal(unknown.isError, true);
});

test('the tool list is stable, closed, and read-only by name', () => {
  // The list is part of the cached prefix: it must not vary, and every schema is closed.
  assert.equal(JSON.stringify(ASK_TOOLS), JSON.stringify(ASK_TOOLS.map((t) => ({ ...t }))));
  for (const t of ASK_TOOLS) {
    assert.match(t.name, /^get_/, `${t.name} — every tool is a read`);
    assert.equal(t.input_schema.additionalProperties, false, t.name);
    assert.ok(!RED.test(t.name), t.name);
  }
});

// ── Actions, recipes, and past chats (Coach-AI-Amendment-002) ─────────────────────────────────────────

import { actionAck, ASK_ACTIONS, ASK_ACTION_NAMES, cleanSummary, formatPastChats, formatRecipes, narrowRecipes, transcriptOf } from '../ask-tools.ts';
import { EDIT_OPS, EDIT_SCOPES, VOLUME_DIRECTIONS, VOLUME_TARGETS, narrowEdit } from '../interpret-narrow.ts';
import { readAskEvent } from '../ask-wire.ts';
import { medicalRoute } from '../medical-routing.ts';

test("propose_program_edit speaks exactly the chat's own EditIntent — no op the resolver cannot take", () => {
  const edit = ASK_ACTIONS.find((a) => a.name === 'propose_program_edit');
  const p = edit.input_schema.properties;
  assert.deepEqual(p.op.enum, [...EDIT_OPS]);
  assert.deepEqual(p.scope.enum, [...EDIT_SCOPES]);
  assert.deepEqual(p.target.enum, [...VOLUME_TARGETS]);
  assert.deepEqual(p.direction.enum, [...VOLUME_DIRECTIONS]);
  // Whatever the model sends is narrowed on the device by the same function the typed path uses.
  assert.deepEqual(narrowEdit({ op: 'swap', exercise: 'bench', to: 'dumbbell press', day: 'Monday', junk: 1 }), {
    op: 'swap',
    exercise: 'bench',
    to: 'dumbbell press',
    day: 'Monday',
  });
});

test('actions are never reads: they are not in ASK_TOOLS, and nothing runs them server-side', async () => {
  for (const name of ASK_ACTION_NAMES) {
    assert.ok(!ASK_TOOLS.some((t) => t.name === name), name);
    const r = await runAskTool(name, {}, { db: { from: () => assert.fail('an action must not read') }, uid: 'a', question: 'x', tz: 0 });
    assert.equal(r.isError, true, `${name} must be unknown to the read runner`);
  }
  assert.match(actionAck('propose_program_edit'), /Do not say it is done/);
});

test('the app reads an action off the stream', () => {
  assert.deepEqual(readAskEvent(JSON.stringify({ action: { name: 'propose_program_edit', input: { op: 'skip', day: 'Friday' } } })), {
    action: { name: 'propose_program_edit', input: { op: 'skip', day: 'Friday' } },
  });
  assert.equal(readAskEvent(JSON.stringify({ action: { input: {} } })), null);
});

const BOOK = narrowRecipes([
  { id: 'p01', name: 'Chicken Rice Bowl', mine: false, meals: ['lunch', 'dinner'], minutes: 25, kcal: 612, protein: 48, carb: 70, fat: 14, allergens: [], ingredients: ['chicken breast', 'white rice', 'broccoli'] },
  { id: 'u:1', name: "Mom's Turkey Chili", mine: true, meals: ['dinner'], minutes: 50, kcal: 540, protein: 44, carb: 38, fat: 20, allergens: [], ingredients: ['ground turkey', 'kidney beans'] },
  { id: 'p02', name: 'Overnight Oats', mine: false, meals: ['breakfast', 'snack'], minutes: 5, kcal: 410, protein: 22, carb: 58, fat: 9, allergens: ['milk'], ingredients: ['oats', 'greek yogurt'] },
  { name: 'no id — dropped' },
]);

test('the recipe book: matched on names and ingredients, the app numbers quoted, their own first', () => {
  assert.equal(BOOK.length, 3);
  const chicken = formatRecipes(BOOK, { query: 'chicken' });
  assert.match(chicken, /Chicken Rice Bowl — 612 kcal, 48 g protein, 70 g carbs, 14 g fat; 25 min; lunch\/dinner/);
  assert.ok(!chicken.includes('Oats'));
  const dinner = formatRecipes(BOOK, { meal: 'dinner' });
  assert.ok(dinner.indexOf("Mom's Turkey Chili (their own recipe)") < dinner.indexOf('Chicken Rice Bowl'), 'their own recipe first');
  assert.match(formatRecipes(BOOK, { query: 'oats' }), /contains milk/);
  assert.match(formatRecipes(BOOK, { query: 'salmon' }), /Nothing in their recipe book matches "salmon"\. You can offer an online search/);
  assert.match(formatRecipes(BOOK, { maxMinutes: 10 }), /Overnight Oats/);
  assert.match(formatRecipes([], {}), /offer_online_recipe_search/);
});

test('get_recipes reads the book the device sent, and touches no table', async () => {
  const r = await runAskTool('get_recipes', { query: 'chili' }, { db: { from: () => assert.fail('no db') }, uid: 'a', question: 'x', tz: 0, recipes: BOOK });
  assert.equal(r.isError, false);
  assert.match(r.text, /Turkey Chili/);
});

test('a chat summary keeps what was decided and drops anything the medical guard would stop', () => {
  const stops = (s) => medicalRoute(s) !== 'clear';
  assert.equal(
    cleanSummary('Asked about bench progress; it went from 205x5 to 225x5. Said they tore their rotator cuff last year. Wants Sundays for long runs.', stops),
    'Asked about bench progress; it went from 205x5 to 225x5. Wants Sundays for long runs.',
  );
  assert.equal(cleanSummary('NOTHING', stops), null);
  assert.equal(cleanSummary('  ', stops), null);
  assert.ok(cleanSummary('x'.repeat(900) + '.', stops).length <= 500);
  assert.equal(
    transcriptOf([
      { role: 'athlete', text: 'how is my bench' },
      { role: 'holt', text: 'Up 10%.' },
    ]),
    'Athlete: how is my bench\nHolt: Up 10%.',
  );
  assert.match(formatPastChats([{ summary: 'Moved the long run to Sunday.', created_at: '2026-09-20T23:00:00Z' }], 300), /2026-09-20: Moved the long run to Sunday\./);
  assert.match(formatPastChats([], 0), /No earlier conversations/);
});
