import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLog,
  computeProgress,
  computeStats,
  equipmentOf,
  fmtVolume,
  nextSession,
  scheduleSlots,
  sessionsPerWeek,
  isFinalSession,
  liveSourceIds,
  shelvePrograms,
  totalSessions,
  viewForState,
  weekSizes,
} from '../progress-core.ts';

const ex = (name, sets = 3, reps = 10, equip = 'Barbell') => ({ name, sets, reps, equip });
const day = (letter, name, main = [], warmup = [], cooldown = []) => ({ letter, name, warmup, main, cooldown });

/** 4-week program, 2 built days a week (a third day exists but is empty — not a session owed). */
const structure = {
  name: 'Winter Block',
  weeks: 4,
  daysPerWeek: 3,
  vary: false,
  days: [
    day('A', 'Push', [ex('Bench Press', 4, 5), ex('Overhead Press')]),
    day('B', 'Pull', [ex('Barbell Row', 3, 8, 'Barbell'), ex('Lat Pulldown', 3, 12, 'Cable Machine')]),
    day('C', ''), // empty — not prescribed
  ],
  weekPlans: null,
};

const logged = (n, startISO, sets = [{ setIndex: 0, weight: 100, reps: 5 }]) => ({
  id: `w${n}`,
  name: `Session ${n}`,
  startedAt: startISO,
  durationSec: 3600,
  exercises: [{ name: 'Bench Press', section: 'main', sets }],
});

// ── shape ────────────────────────────────────────────────────────────────────

test('sessions per week counts BUILT days, not the configured day count', () => {
  assert.equal(sessionsPerWeek(structure), 2, 'the empty Day C is not a session the athlete owes');
  assert.equal(totalSessions(structure), 8, '4 weeks x 2 built days');
});

test('an entirely empty program still reports a sane, non-zero shape', () => {
  const empty = { ...structure, days: [day('A', ''), day('B', '')] };
  assert.equal(sessionsPerWeek(empty), 3, 'nothing built → falls back to the CONFIGURED daysPerWeek, never 0');
  assert.ok(totalSessions(empty) > 0, 'never divides by zero downstream');
});

// ── progress ─────────────────────────────────────────────────────────────────

test('progress derives week and in-week position purely from the completed count', () => {
  const p0 = computeProgress(structure, 0);
  assert.deepEqual([p0.completed, p0.total, p0.week, p0.completedThisWeek, p0.pct], [0, 8, 1, 0, 0]);

  const p3 = computeProgress(structure, 3);
  assert.equal(p3.week, 2, '3 sessions at 2/week puts you in week 2');
  assert.equal(p3.completedThisWeek, 1);
  assert.equal(p3.pct, 38);
});

test('progress clamps at the program length instead of overflowing', () => {
  const over = computeProgress(structure, 99);
  assert.equal(over.completed, 8);
  assert.equal(over.pct, 100);
  assert.equal(over.week, 4, 'never reports week 50 of a 4-week program');
  assert.equal(over.nextWeekIndex, null, 'nothing left to do');
});

test('the next session walks the schedule in order and stops at the end', () => {
  assert.deepEqual(pick(nextSession(structure, 0)), { weekIndex: 0, dayIndex: 0, name: 'Push' });
  assert.deepEqual(pick(nextSession(structure, 1)), { weekIndex: 0, dayIndex: 1, name: 'Pull' });
  assert.deepEqual(pick(nextSession(structure, 2)), { weekIndex: 1, dayIndex: 0, name: 'Push' }, 'wraps into week 2');
  assert.equal(nextSession(structure, 8), null, 'a finished program has no next session');
});

const pick = (s) => (s ? { weekIndex: s.weekIndex, dayIndex: s.dayIndex, name: s.day.name } : null);

test('progress reads the open week plan in Customize mode', () => {
  const vary = {
    ...structure,
    vary: true,
    weeks: 2,
    weekPlans: [
      { days: [day('A', 'Heavy', [ex('Squat')]), day('B', 'Light', [ex('Front Squat')])] },
      { days: [day('A', 'Deload', [ex('Squat')]), day('B', '')] },
    ],
  };
  assert.equal(sessionsPerWeek(vary), 2);
  assert.equal(pick(nextSession(vary, 0)).name, 'Heavy');
  assert.equal(pick(nextSession(vary, 2)).name, 'Deload', 'week 2 uses its own plan, not week 1');
});

// ── the log ──────────────────────────────────────────────────────────────────

test('the log fills completed slots with real sets and future slots with the prescription', () => {
  const weeks = buildLog(structure, [logged(1, '2026-07-01T10:00:00Z'), logged(2, '2026-07-03T10:00:00Z')]);
  assert.equal(weeks.length, 4);

  const w1 = weeks[0];
  assert.equal(w1.complete, true, 'both of week 1’s sessions are logged');
  assert.equal(w1.days[0].completed, true);
  assert.deepEqual(w1.days[0].exercises[0].sets, [{ label: 'Set 1', value: '100 lb × 5' }]);

  const w2 = weeks[1];
  assert.equal(w2.complete, false);
  assert.equal(w2.days[0].completed, false);
  assert.equal(w2.days[0].name, 'Push', 'unlogged slots show the planned day');
  assert.equal(w2.days[0].exercises[0].planned, '4 × 5', 'and its prescription');
  assert.deepEqual(w2.days[0].exercises[0].sets, [], 'with no invented set data');
});

test('workouts fill slots in the order they were trained, regardless of input order', () => {
  const weeks = buildLog(structure, [
    { ...logged(2, '2026-07-03T10:00:00Z'), name: 'Second' },
    { ...logged(1, '2026-07-01T10:00:00Z'), name: 'First' },
  ]);
  assert.deepEqual([weeks[0].days[0].name, weeks[0].days[1].name], ['First', 'Second']);
});

test('a set logged without weight reads as reps, never as a fake load', () => {
  const weeks = buildLog(structure, [
    logged(1, '2026-07-01T10:00:00Z', [
      { setIndex: 0, weight: null, reps: 12 },
      { setIndex: 1, weight: 0, reps: 10 },
    ]),
  ]);
  assert.deepEqual(
    weeks[0].days[0].exercises[0].sets.map((s) => s.value),
    ['12 reps', '10 reps'],
  );
});

test('the log spans the whole program even with nothing logged', () => {
  const weeks = buildLog(structure, []);
  assert.equal(weeks.length, 4);
  assert.ok(weeks.every((w) => w.days.length === 2 && !w.complete));
  assert.ok(weeks.every((w) => w.days.every((d) => !d.completed)));
});

// ── stats ────────────────────────────────────────────────────────────────────

test('stats total real volume and find the heaviest set', () => {
  const s = computeStats([
    logged(1, '2026-07-01T10:00:00Z', [
      { setIndex: 0, weight: 100, reps: 5 },
      { setIndex: 1, weight: 135, reps: 3 },
    ]),
    logged(2, '2026-07-03T10:00:00Z', [{ setIndex: 0, weight: 95, reps: 10 }]),
  ]);
  assert.equal(s.workouts, 2);
  assert.equal(s.sets, 3);
  assert.equal(s.volume, 100 * 5 + 135 * 3 + 95 * 10);
  assert.equal(s.heaviest, 135);
});

test('bodyweight sets count toward sets but never toward volume or heaviest', () => {
  const s = computeStats([logged(1, '2026-07-01T10:00:00Z', [{ setIndex: 0, weight: null, reps: 20 }])]);
  assert.deepEqual([s.sets, s.volume, s.heaviest], [1, 0, 0]);
});

test('volume formats compactly and shows an em dash rather than a zero', () => {
  assert.equal(fmtVolume(0), '—');
  assert.equal(fmtVolume(850), '850 lb');
  assert.equal(fmtVolume(1000), '1k lb', 'no pointless ".0"');
  assert.equal(fmtVolume(12800), '12.8k lb');
  assert.equal(fmtVolume(120000), '120k lb', 'the decimal stops carrying information up here');
});

// ── the five states ──────────────────────────────────────────────────────────

test('each lifecycle state gets its own CTA, and only owned programs can be ended', () => {
  assert.deepEqual(viewForState('future', true), { pill: 'Planned', cta: 'Start Program', secondary: 'Remove from Planned' });
  assert.deepEqual(viewForState('active', true), { pill: 'Active', cta: 'Continue Training', secondary: 'End Program' });
  assert.equal(viewForState('graduated', true).cta, 'Run This Program Again');
  assert.equal(viewForState('ended_early', true).cta, 'Restart Program');
  assert.deepEqual(viewForState('active', false), { pill: 'Preview', cta: 'Start Program', secondary: null });
});

test('equipment is deduped across the whole program', () => {
  assert.deepEqual(equipmentOf(structure), ['Barbell', 'Cable Machine']);
});

test('equipment scans every week plan in Customize mode, not just the template', () => {
  const vary = {
    ...structure,
    vary: true,
    days: [],
    weekPlans: [{ days: [day('A', 'W1', [ex('Swing', 3, 10, 'Kettlebell')])] }],
  };
  assert.deepEqual(equipmentOf(vary), ['Kettlebell']);
});

// ── ragged weeks ─────────────────────────────────────────────────────────────
//
// A real purchased block runs six days for two weeks and then five. Deriving ONE sessions-per-week
// figure from week 1 and multiplying by it got both the length and the STRIDE wrong, and the stride is
// what broke: on the first session past the first short week the schedule walked off the end of the
// week it was pointed at, and "Continue Training" went dead with 15 sessions still unlogged.

/** 6, 6, 5, 5, 5, 5 — 32 sessions, not 36. */
const ragged = {
  name: 'Six Week Block',
  weeks: 6,
  daysPerWeek: 6,
  vary: true,
  days: [],
  weekPlans: [0, 1, 2, 3, 4, 5].map((wi) => ({
    days: Array.from({ length: wi < 2 ? 6 : 5 }, (_, di) =>
      day(String.fromCharCode(65 + di), `W${wi + 1}D${di + 1}`, [ex('Bench Press', 4, 6)])),
  })),
};

test('week sizes are read per week, not multiplied out from the first', () => {
  assert.deepEqual(weekSizes(ragged), [6, 6, 5, 5, 5, 5]);
  assert.equal(totalSessions(ragged), 32, 'not 36 — the program does not have 36 sessions in it');
});

test('the schedule walks every ragged week without falling off the end', () => {
  const slots = scheduleSlots(ragged);
  assert.equal(slots.length, 32);
  assert.ok(slots.every((s) => s.day), 'every slot resolves to a real prescribed day');
  assert.deepEqual(
    slots.map((s) => s.day.name).slice(10, 14),
    ['W2D5', 'W2D6', 'W3D1', 'W3D2'],
    'the six-day week hands off to the five-day week at the right session',
  );
});

test('the 18th session still has a next session — the regression this shape caused', () => {
  // 17 logged puts the athlete at session 18, which the old stride located as week 3, day 6 of 5.
  const s = nextSession(ragged, 17);
  assert.ok(s, 'Continue Training must not go dead mid-program');
  assert.deepEqual([s.weekIndex, s.dayIndex, s.day.name], [3, 0, 'W4D1']);
});

test('every session in a ragged program is reachable in order, start to finish', () => {
  const names = Array.from({ length: 32 }, (_, i) => nextSession(ragged, i)?.day.name ?? null);
  assert.equal(names.filter(Boolean).length, 32, 'no dead slot anywhere in the program');
  assert.equal(names[0], 'W1D1');
  assert.equal(names[31], 'W6D5');
  assert.equal(nextSession(ragged, 32), null, 'and it ends exactly once, at the end');
});

test('progress reports the week the athlete is actually in', () => {
  assert.equal(computeProgress(ragged, 0).week, 1);
  assert.equal(computeProgress(ragged, 12).week, 3, '12 done = weeks 1-2 complete, standing in week 3');
  assert.equal(computeProgress(ragged, 12).completedThisWeek, 0);
  assert.equal(computeProgress(ragged, 14).completedThisWeek, 2);
  assert.equal(computeProgress(ragged, 14).perWeek, 5, 'week 3 is a five-day week and says so');
  assert.equal(computeProgress(ragged, 32).pct, 100);
});

test('the log gives each ragged week its own number of day slots', () => {
  const weeks = buildLog(ragged, []);
  assert.deepEqual(weeks.map((w) => w.days.length), [6, 6, 5, 5, 5, 5]);
  assert.equal(weeks[3].days[0].name, 'W4D1');
  assert.equal(weeks[3].days[0].num, 18, 'session numbering is a running total across ragged weeks');
});

/*
 * ══════════════════════════════════════════════════════════════════════════════════════════════════════
 * GOLDEN VECTORS — THE DRIFT GUARD
 *
 * `totalSessions` is implemented TWICE: here in TypeScript, and as `public.program_total_sessions(jsonb)`
 * in migration 0104. It has to be, because `save_workout` decides graduation server-side — an athlete must
 * not be able to assert their own, since a graduation buys five permanent honors and a rank family.
 *
 * THIS LIST IS DUPLICATED VERBATIM INTO 0104's SELF-CHECK A, which `raise exception`s on the first
 * mismatch and rolls the whole migration back. So the two implementations can only drift through a
 * deliberate edit to both lists — which is the point. If you change the rule, change it in three places:
 * `weekSizes`/`totalSessions`, this list, and the migration.
 * ══════════════════════════════════════════════════════════════════════════════════════════════════════
 */
const GOLDEN = [
  ['empty-ish: no days array at all', { weeks: 6, daysPerWeek: 3 }, null],
  ['repeating week, 3 built days x 6 weeks',
    { weeks: 6, daysPerWeek: 3, vary: false, days: [day('A', '', [ex('a')]), day('B', '', [ex('b')]), day('C', '', [ex('c')])], weekPlans: null }, 18],
  ['empty days fall back to daysPerWeek',
    { weeks: 4, daysPerWeek: 3, vary: false, days: [day('A', ''), day('B', '')], weekPlans: null }, 12],
  ['warmup alone makes a day count',
    { weeks: 2, daysPerWeek: 9, vary: false, days: [day('A', '', [], [ex('w')]), day('B', '', [], [], [ex('c')])], weekPlans: null }, 4],
  ['ragged weeks: 3 then 2',
    { weeks: 2, daysPerWeek: 3, vary: true, days: [day('A', '', [ex('a')])],
      weekPlans: [{ days: [day('A', '', [ex('a')]), day('B', '', [ex('b')]), day('C', '', [ex('c')])] },
                  { days: [day('A', '', [ex('a')]), day('B', '', [ex('b')])] }] }, 5],
  ['vary with fewer weekPlans than weeks falls back to the template',
    { weeks: 3, daysPerWeek: 2, vary: true, days: [day('A', '', [ex('a')]), day('B', '', [ex('b')])],
      weekPlans: [{ days: [day('A', '', [ex('a')]), day('B', '', [ex('b')]), day('C', '', [ex('c')])] }] }, 7],
  ['weeks floored at 1',
    { weeks: 0, daysPerWeek: 3, vary: false, days: [day('A', '', [ex('a')]), day('B', '', [ex('b')])], weekPlans: null }, 2],
  ['every week floored at 1 even with nothing built and dpw 0',
    { weeks: 3, daysPerWeek: 0, vary: false, days: [day('A', '')], weekPlans: null }, 3],
];

test('golden vectors — the rule 0104 mirrors in SQL', () => {
  for (const [label, structure, expected] of GOLDEN) {
    if (expected == null) continue; // the SQL returns null where TS would throw; see 0104's comment
    assert.equal(totalSessions(structure), expected, label);
  }
});

test('isFinalSession is the graduation predicate, and it is inclusive', () => {
  const p = { weeks: 2, daysPerWeek: 2, vary: false, days: [day('A', '', [ex('a')]), day('B', '', [ex('b')])], weekPlans: null };
  assert.equal(totalSessions(p), 4);
  assert.equal(isFinalSession(p, 3), false);
  assert.equal(isFinalSession(p, 4), true, 'the final session graduates it');
  // `>=`, matching the SQL: two devices racing can put the count past the total, and an athlete past
  // the end has still finished.
  assert.equal(isFinalSession(p, 9), true);
});

test('the graduated CTA offers a new run, not a rewind', () => {
  // "Run Again" read like a reactivation — which is exactly what the button used to do (Amendment-001 §1).
  assert.equal(viewForState('graduated', true).cta, 'Run This Program Again');
  assert.equal(viewForState('graduated', true).pill, 'Graduated');
  assert.equal(viewForState('graduated', true).secondary, null, 'a sealed record offers nothing else');
});

// ── Shelves: where each program sits on the Workouts tab ─────────────────────────────────────────────

const row = (id, state, sourceDefinitionId = null) => ({ id, state, sourceDefinitionId });

test('the active program is not also listed among the ones you built', () => {
  const mine = [row('a', 'active'), row('b', 'graduated')];
  const s = shelvePrograms(mine);

  assert.equal(s.active.id, 'a');
  assert.deepEqual(s.built.map((p) => p.id), ['b'], 'active appeared twice — once as Active, once under Your Programs');
});

test('a planned program is queued, not something the athlete wrote', () => {
  // The whole point of the Planned section: a catalog program you have taken on is NOT authorship, and
  // filing it under "Your Programs" is what made an athlete ask why looking at a program built them one.
  const mine = [row('c', 'future', 'squat-ascent-intermediate'), row('d', 'future')];
  const s = shelvePrograms(mine);

  assert.deepEqual(s.planned.map((p) => p.id), ['c', 'd'], 'both queued programs belong to Planned');
  assert.deepEqual(s.built, [], 'a queued program is never listed as one you built');
});

test('a sealed Forge run keeps a home, and an authored one stays with your programs', () => {
  const mine = [row('e', 'graduated', 'strength-foundation-1'), row('f', 'ended_early')];
  const s = shelvePrograms(mine);

  assert.deepEqual(s.past.map((p) => p.id), ['e'], 'a finished Forge program needs somewhere to be read from');
  assert.deepEqual(s.built.map((p) => p.id), ['f'], 'a program you wrote stays yours after it ends');
});

test('Discover withholds only what you have a live claim on', () => {
  const live = liveSourceIds([
    row('g', 'future', 'planned-one'),
    row('h', 'active', 'active-one'),
    row('i', 'graduated', 'finished-one'),
    row('j', 'ended_early', 'abandoned-one'),
    row('k', 'future'), // authored — nothing to withhold from a catalogue it was never in
  ]);

  assert.ok(live.has('planned-one'), 'a queued program is already yours, not something to find');
  assert.ok(live.has('active-one'));
  // THE REGRESSION. This set was every program ever adopted, so graduating one deleted it from the
  // catalogue for good — while 0104 dropped the one-row-per-source index precisely so it could be run
  // a second time. A shelf you can only take from is not a shelf.
  assert.equal(live.has('finished-one'), false, 'a graduated program goes back on the shelf');
  assert.equal(live.has('abandoned-one'), false, 'so does one you ended early');
  assert.equal(live.size, 2);
});
