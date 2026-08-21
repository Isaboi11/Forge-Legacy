import { test } from 'node:test';
import assert from 'node:assert/strict';
import { totalSessions } from '../../domain/program/progress-core.ts';
import {
  absorbBuilderInbox,
  activeDays,
  applyDaysPerWeek,
  applyWeeks,
  clampReps,
  clampSets,
  clampWeeks,
  daysLoseContent,
  draftHasContent,
  pairWithNext,
  pairingAt,
  unpairAt,
  draftToStructure,
  ensureWeeks,
  hasMainExercise,
  isDraftValid,
  makeDays,
  newDraft,
  normalizeDraft,
  hydrateDraft,
  forLiveEdit,
  lockedCells,
  isLockedCell,
  liveEditViolation,
  weekBuilt,
  weeksLoseContent,
  withActiveDays,
  setVaryMode,
  setRepeatMode,
  copyWeek,
  clearWeek,
  nextIncompleteWeek,
  nextDayStop,
  dayAtStop,
  completedWeeks,
  templateIntoDay,
} from '../program-draft-model.ts';

const ex = (name) => ({ id: name, name, equip: 'Barbell', muscles: ['Chest'], type: 'Compound', sets: 3, reps: 10 });

/** A repeat-mode draft whose day `i` has one main exercise. */
function withMainOn(i) {
  const d = newDraft();
  return withActiveDays(d, d.days.map((day, k) => (k === i ? { ...day, main: [ex('Bench Press')] } : day)));
}

// ── clamps (design §14) ───────────────────────────────────────────────────────

test('clamps hold the design bounds: weeks 1–52, sets 1–8, reps 1–60', () => {
  // ⚠ The floor was 4 and is now 1 (PA2-D1). A 3-week block is a real thing an athlete can build; it
  // simply earns no rank credit, which is enforced at the seal and not by this clamp.
  assert.equal(clampWeeks(3), 3);
  assert.equal(clampWeeks(1), 1);
  assert.equal(clampWeeks(0), 1);
  assert.equal(clampWeeks(-5), 1);
  assert.equal(clampWeeks(53), 52);
  assert.equal(clampWeeks(12), 12);
  assert.equal(clampSets(0), 1);
  assert.equal(clampSets(9), 8);
  assert.equal(clampReps(0), 1);
  assert.equal(clampReps(61), 60);
});

test('newDraft is the design default: 8 weeks · 4 days · repeat mode · empty', () => {
  const d = newDraft();
  assert.equal(d.weeks, 8);
  assert.equal(d.daysPerWeek, 4);
  assert.equal(d.vary, false);
  assert.equal(d.days.length, 4);
  assert.deepEqual(d.days.map((x) => x.letter), ['A', 'B', 'C', 'D']);
  assert.equal(isDraftValid(d), false);
});

// ── day resizing (the data-loss guard's subject) ──────────────────────────────

test('makeDays keeps existing days by position and only appends empties', () => {
  const built = [{ letter: 'A', name: 'Push', warmup: [], main: [ex('Bench Press')], cooldown: [] }];
  const grown = makeDays(3, built);
  assert.equal(grown.length, 3);
  assert.equal(grown[0].main.length, 1, 'existing day survives the grow');
  assert.deepEqual(grown.map((d) => d.letter), ['A', 'B', 'C']);
});

test('daysLoseContent flags exactly the shrinks that would destroy exercises', () => {
  const d = withMainOn(3); // exercises live on day D (index 3)
  assert.equal(daysLoseContent(d, 4), false, 'no shrink, nothing lost');
  assert.equal(daysLoseContent(d, 3), true, 'dropping day D loses its exercises');
  assert.equal(daysLoseContent(withMainOn(0), 2), false, 'day A survives a shrink to 2');
});

test('applyDaysPerWeek clamps to 2–6 and drops an out-of-range open day', () => {
  const d = { ...withMainOn(0), openDay: 3 };
  const shrunk = applyDaysPerWeek(d, 2);
  assert.equal(shrunk.days.length, 2);
  assert.equal(shrunk.openDay, null, 'the open day no longer exists → closed, not dangling');
  assert.equal(applyDaysPerWeek(d, 9).days.length, 6);
  assert.equal(applyDaysPerWeek(d, 1).days.length, 2);
});

// ── week plans (Customize mode — model is week-aware ahead of the UI) ─────────

test('ensureWeeks sizes weekPlans to weeks × daysPerWeek and starts new weeks empty', () => {
  const d = ensureWeeks({ ...newDraft(), vary: true, weeks: 3, daysPerWeek: 2 });
  assert.equal(d.weekPlans.length, 3);
  assert.ok(d.weekPlans.every((w) => w.days.length === 2));
  assert.ok(d.weekPlans.every((w) => !weekBuilt(w)));
});

test('weeksLoseContent only fires when a week beyond the new length is actually built', () => {
  let d = ensureWeeks({ ...newDraft(), vary: true, weeks: 6, daysPerWeek: 2 });
  d = { ...d, openWeek: 4 };
  d = withActiveDays(d, activeDays(d).map((day, i) => (i === 0 ? { ...day, main: [ex('Squat')] } : day)));
  assert.equal(weeksLoseContent(d, 4), true, 'shrinking to 4 cuts index 4 — the built week');
  assert.equal(weeksLoseContent(d, 5), false, 'shrinking to 5 KEEPS index 4 (off-by-one guard)');
  assert.equal(weeksLoseContent(d, 6), false);
  assert.equal(weeksLoseContent({ ...newDraft(), vary: false }, 4), false, 'repeat mode has no weeks to lose');
});

test('activeDays/withActiveDays target the open week in Customize mode, the template otherwise', () => {
  let d = ensureWeeks({ ...newDraft(), vary: true, weeks: 2, daysPerWeek: 2, openWeek: 1 });
  d = withActiveDays(d, activeDays(d).map((day, i) => (i === 0 ? { ...day, main: [ex('Row')] } : day)));
  assert.equal(d.weekPlans[1].days[0].main.length, 1, 'written into the OPEN week');
  assert.equal(d.weekPlans[0].days[0].main.length, 0, 'other weeks untouched');
  assert.equal(d.days[0].main.length, 0, 'the repeat template is untouched');
});

// ── the Picker round-trip ────────────────────────────────────────────────────

test('absorbBuilderInbox appends to the addressed section with the design defaults', () => {
  const inbox = {
    vary: false,
    week: 0,
    day: 1,
    section: 'main',
    items: [{ name: 'Overhead Press', equip: 'Barbell', muscles: ['Shoulders'], type: 'Compound' }],
  };
  const d = absorbBuilderInbox(newDraft(), inbox);
  assert.equal(d.days[1].main.length, 1);
  assert.equal(d.days[1].main[0].name, 'Overhead Press');
  assert.equal(d.days[1].main[0].sets, 3, 'Main defaults to 3 sets');
  assert.equal(d.days[1].main[0].reps, 10, 'Main defaults to 10 reps');
  assert.equal(d.openDay, 1, 'lands back on the day that was being built');
  assert.equal(d.days[0].main.length, 0, 'no other day touched');
});

test('absorbBuilderInbox uses per-section defaults: warm-up 2×12, cool-down 1×30', () => {
  const mk = (section) =>
    absorbBuilderInbox(newDraft(), {
      vary: false,
      week: 0,
      day: 0,
      section,
      items: [{ name: 'X', equip: 'Bodyweight', muscles: [], type: '' }],
    }).days[0][section][0];
  assert.deepEqual([mk('warmup').sets, mk('warmup').reps], [2, 12]);
  assert.deepEqual([mk('cooldown').sets, mk('cooldown').reps], [1, 30]);
});

test('absorbBuilderInbox appends rather than replacing, and assigns distinct ids', () => {
  const inbox = (name) => ({
    vary: false,
    week: 0,
    day: 0,
    section: 'main',
    items: [{ name, equip: 'Barbell', muscles: [], type: '' }],
  });
  const d = absorbBuilderInbox(absorbBuilderInbox(newDraft(), inbox('A')), inbox('B'));
  assert.deepEqual(d.days[0].main.map((x) => x.name), ['A', 'B']);
  assert.notEqual(d.days[0].main[0].id, d.days[0].main[1].id);
});

test('absorbBuilderInbox ignores an inbox addressed at a day that no longer exists', () => {
  const d = absorbBuilderInbox(newDraft(), {
    vary: false,
    week: 0,
    day: 9,
    section: 'main',
    items: [{ name: 'Ghost', equip: 'Barbell', muscles: [], type: '' }],
  });
  assert.deepEqual(d.days.flatMap((x) => x.main), [], 'no exercise landed anywhere');
});

test('absorbBuilderInbox routes a vary-addressed pick into that week plan', () => {
  const d = absorbBuilderInbox({ ...newDraft(), vary: true, weeks: 4 }, {
    vary: true,
    week: 2,
    day: 0,
    section: 'main',
    items: [{ name: 'Deadlift', equip: 'Barbell', muscles: ['Back'], type: 'Compound' }],
  });
  assert.equal(d.weekPlans[2].days[0].main[0].name, 'Deadlift');
  assert.equal(d.openWeek, 2);
  assert.equal(d.weekPlans[0].days[0].main.length, 0);
});

// ── save gate + persisted shape ──────────────────────────────────────────────

test('isDraftValid requires a name AND a main exercise (warm-up alone is not enough)', () => {
  const named = { ...newDraft(), name: 'Winter Block' };
  assert.equal(isDraftValid(named), false, 'name alone does not qualify');

  const warmOnly = withActiveDays(named, named.days.map((d, i) => (i === 0 ? { ...d, warmup: [ex('Jog')] } : d)));
  assert.equal(isDraftValid(warmOnly), false, 'warm-up is not a main exercise');

  const ok = { ...withMainOn(0), name: 'Winter Block' };
  assert.equal(isDraftValid(ok), true);
  assert.equal(isDraftValid({ ...ok, name: '   ' }), false, 'whitespace is not a name');
});

test('hasMainExercise reads week plans in Customize mode, not the stale template', () => {
  let d = ensureWeeks({ ...newDraft(), vary: true, weeks: 2, daysPerWeek: 2, openWeek: 0 });
  assert.equal(hasMainExercise(d), false);
  d = withActiveDays(d, activeDays(d).map((day, i) => (i === 0 ? { ...day, main: [ex('Squat')] } : day)));
  assert.equal(hasMainExercise(d), true);
});

test('draftToStructure trims the name, drops session bookkeeping, and nulls weekPlans in repeat mode', () => {
  const s = draftToStructure({ ...withMainOn(0), name: '  Winter Block  ' });
  assert.equal(s.name, 'Winter Block');
  assert.equal(s.weekPlans, null);
  assert.deepEqual(Object.keys(s).sort(), ['days', 'daysPerWeek', 'name', 'vary', 'weekPlans', 'weeks']);
});

test('applyWeeks clamps and keeps week plans sized in Customize mode', () => {
  const d = applyWeeks({ ...newDraft(), vary: true, weekPlans: [] }, 60);
  assert.equal(d.weeks, 52);
  assert.equal(d.weekPlans.length, 52);
});

// ── reading a draft back off the device ──────────────────────────────────────

test('draftHasContent — a fresh draft closes silently; anything typed or added asks first', () => {
  assert.equal(draftHasContent(newDraft()), false, 'untouched draft is not worth confirming');
  assert.equal(draftHasContent({ ...newDraft(), name: 'Winter' }), true, 'a typed name counts');
  assert.equal(draftHasContent({ ...newDraft(), name: '   ' }), false, 'whitespace does not count');
  assert.equal(draftHasContent(withMainOn(2)), true, 'an added exercise counts');

  const namedDay = newDraft();
  assert.equal(
    draftHasContent(withActiveDays(namedDay, namedDay.days.map((d, i) => (i === 0 ? { ...d, name: 'Push' } : d)))),
    true,
    'a renamed day counts even with no exercises',
  );
});

test('draftHasContent sees exercises living only in a week plan', () => {
  let d = ensureWeeks({ ...newDraft(), vary: true, weeks: 2, daysPerWeek: 2, openWeek: 1 });
  assert.equal(draftHasContent(d), false);
  d = withActiveDays(d, activeDays(d).map((day, i) => (i === 0 ? { ...day, main: [ex('Squat')] } : day)));
  assert.equal(draftHasContent(d), true);
});

test('normalizeDraft repairs missing letters and clears legacy "Day A" placeholder names', () => {
  const d = normalizeDraft({
    ...newDraft(),
    days: [
      { letter: '', name: 'Day A', warmup: [], main: [], cooldown: [] },
      { letter: '', name: 'Push', warmup: [], main: [], cooldown: [] },
    ],
  });
  assert.deepEqual(d.days.map((x) => x.letter), ['A', 'B']);
  assert.equal(d.days[0].name, '', 'the placeholder name is cleared, not shown as a real name');
  assert.equal(d.days[1].name, 'Push', 'a real name is preserved');
});

// ── Pass 2: Customize each week ─────────────────────────────────────────────

test('switching to Customize SEEDS week 1 from the template instead of discarding it', () => {
  const built = { ...withMainOn(0), weeks: 3 };
  const v = setVaryMode(built);
  assert.equal(v.vary, true);
  assert.equal(v.openWeek, 0);
  assert.equal(v.weekPlans.length, 3);
  assert.equal(v.weekPlans[0].days[0].main.length, 1, 'the week already built carries into week 1');
  assert.equal(v.weekPlans[1].days[0].main.length, 0, 'later weeks still start empty');
});

test('the seeded week is a COPY — editing it never reaches back into the template', () => {
  const v = setVaryMode({ ...withMainOn(0), weeks: 2 });
  assert.notEqual(v.weekPlans[0].days[0].main[0].id, v.days[0].main[0].id, 'ids are regenerated');
  v.weekPlans[0].days[0].main.push(ex('Extra'));
  assert.equal(v.days[0].main.length, 1, 'the template is untouched');
});

test('switching to Customize from an empty template leaves every week empty', () => {
  const v = setVaryMode({ ...newDraft(), weeks: 2 });
  assert.ok(v.weekPlans.every((w) => !weekBuilt(w)));
});

test('setRepeatMode closes the open week and returns to the template', () => {
  const back = setRepeatMode(setVaryMode({ ...withMainOn(0), weeks: 2 }));
  assert.equal(back.vary, false);
  assert.equal(back.openWeek, null);
  assert.equal(back.days[0].main.length, 1, 'the template survived the round trip');
});

test('copyWeek duplicates a built week without aliasing it', () => {
  let d = setVaryMode({ ...withMainOn(0), weeks: 3 });
  d = copyWeek(d, 0, 2);
  assert.equal(d.weekPlans[2].days[0].main[0].name, 'Bench Press');
  assert.notEqual(d.weekPlans[2].days[0].main[0].id, d.weekPlans[0].days[0].main[0].id);
  assert.equal(d.weekPlans[1].days[0].main.length, 0, 'only the target week changed');
});

test('copyWeek is a no-op for a missing or self-referential target', () => {
  const d = setVaryMode({ ...withMainOn(0), weeks: 2 });
  assert.deepEqual(copyWeek(d, 0, 0), d, 'copying a week onto itself changes nothing');
  assert.deepEqual(copyWeek(d, 0, 9), d, 'a week that does not exist is ignored');
});

test('clearWeek empties one week and leaves its neighbours alone', () => {
  let d = setVaryMode({ ...withMainOn(0), weeks: 3 });
  d = copyWeek(d, 0, 1);
  d = clearWeek(d, 0);
  assert.equal(weekBuilt(d.weekPlans[0]), false);
  assert.equal(d.weekPlans[0].days.length, d.daysPerWeek, 'the day skeleton stays');
  assert.equal(weekBuilt(d.weekPlans[1]), true);
});

test('nextIncompleteWeek walks forward, wraps back, then reports done', () => {
  let d = setVaryMode({ ...withMainOn(0), weeks: 3 });
  assert.equal(nextIncompleteWeek(d, 0), 1, 'week 2 is the next gap');
  d = copyWeek(d, 0, 1);
  assert.equal(nextIncompleteWeek(d, 0), 2);
  d = copyWeek(d, 0, 2);
  assert.equal(nextIncompleteWeek(d, 0), null, 'everything is built');
});

test('nextIncompleteWeek wraps to an earlier gap rather than reporting done', () => {
  let d = setVaryMode({ ...newDraft(), weeks: 3 });
  d = withActiveDays({ ...d, openWeek: 2 }, [{ letter: 'A', name: '', warmup: [], main: [ex('Squat')], cooldown: [] }]);
  assert.equal(nextIncompleteWeek(d, 2), 0, 'from the last week, wrap to the first unbuilt one');
});

test('completedWeeks counts only weeks with a main exercise', () => {
  let d = setVaryMode({ ...withMainOn(0), weeks: 3 });
  assert.equal(completedWeeks(d), 1);
  d = copyWeek(d, 0, 1);
  assert.equal(completedWeeks(d), 2);
});

// ── SUPERSETS, authored in the builder ──────────────────────────────────────────────────────────────

const row = (name, sets, extra) => ({ id: name, name, sets, reps: 8, ...(extra ?? {}) });

test('pairing joins a row to the one below it, and only those two', () => {
  const out = pairWithNext([row('Press', 3), row('Row', 3), row('Curl', 3)], 0);
  assert.equal(out[0].groupKind, 'superset');
  assert.equal(out[1].groupKind, 'superset');
  assert.equal(out[0].groupId, out[1].groupId, 'one block, one id');
  assert.equal(out[2].groupId, undefined, 'the third row is untouched');
  assert.equal(out[0].groupRounds, 3);
});

test('rounds come from the LONGEST member, so no prescribed set is dropped', () => {
  const out = pairWithNext([row('Press', 3), row('Row', 4)], 0);
  assert.equal(out[0].groupRounds, 4, 'four rounds — the press simply sits out the fourth');
});

test('pairing the LAST row is a no-op — there is nothing below it', () => {
  const list = [row('Press', 3), row('Row', 3)];
  assert.deepEqual(pairWithNext(list, 1), list);
});

test('joining an existing superset EXTENDS it rather than forking a rival block beside it', () => {
  const two = pairWithNext([row('Press', 3), row('Row', 3), row('Fly', 3)], 0);
  const three = pairWithNext(two, 1); // from the second member, add the third
  assert.equal(three[0].groupId, three[1].groupId);
  assert.equal(three[1].groupId, three[2].groupId, 'all three are one block');
  assert.deepEqual(pairingAt(three, 2), { pos: 3, count: 3, label: 'A3', letter: 'A' });
});

test('pairingAt reports the label the logger will show', () => {
  const out = pairWithNext([row('Press', 3), row('Row', 3)], 0);
  assert.deepEqual(pairingAt(out, 0), { pos: 1, count: 2, label: 'A1', letter: 'A' });
  assert.deepEqual(pairingAt(out, 1), { pos: 2, count: 2, label: 'A2', letter: 'A' });
});

test('⚠ a SECOND superset is B, not another A — the whole point of the rename', () => {
  // It was String.fromCharCode(64 + pos) per block, so both supersets in a day had an A and a B and
  // "do A next" named four different lifts.
  let list = pairWithNext([row('Press', 3), row('Row', 3), row('Squat', 3), row('Curl', 3)], 0);
  list = pairWithNext(list, 2);
  assert.equal(pairingAt(list, 0).label, 'A1');
  assert.equal(pairingAt(list, 1).label, 'A2');
  assert.equal(pairingAt(list, 2).label, 'B1');
  assert.equal(pairingAt(list, 3).label, 'B2');
});

test('a circuit is not reported as a pairing — the builder only authors supersets', () => {
  const circuit = [row('Burpee', 1, { groupId: 'c1', groupRounds: 4 }), row('Wall Ball', 1, { groupId: 'c1', groupRounds: 4 })];
  assert.equal(pairingAt(circuit, 0), null, 'no groupKind means circuit, and this affordance is not about circuits');
});

test('unpairing dissolves the whole block and leaves the prescriptions alone', () => {
  const paired = pairWithNext([row('Press', 3), row('Row', 4), row('Curl', 3)], 0);
  const flat = unpairAt(paired, 1);
  assert.equal(pairingAt(flat, 0), null);
  assert.ok(!('groupId' in flat[0]) && !('groupKind' in flat[0]), 'the fields are removed, not nulled');
  assert.equal(flat[0].sets, 3);
  assert.equal(flat[1].sets, 4, 'set counts are untouched by the ungrouping');
  assert.equal(flat.length, 3);
});

test('unpairing a loose row changes nothing', () => {
  const list = [row('Press', 3)];
  assert.deepEqual(unpairAt(list, 0), list);
});

// ── templateIntoDay: a whole workout template dropped into the day being built ──────────────────

/** A day-worth of converted template rows, in the three-section shape `templateRowsToDay` produces. */
const rows = (over = {}) => ({
  warmup: [ex('Band Pull-Apart')],
  main: [ex('Bench Press'), ex('Incline DB Press')],
  cooldown: [ex('Chest Stretch')],
  ...over,
});

/** A draft with day 0 open and empty. */
function openDraft(dayIndex = 0) {
  return { ...newDraft(), openDay: dayIndex };
}

test('templateIntoDay fills an empty day and names it', () => {
  const d = templateIntoDay(openDraft(), 0, rows(), { mode: 'replace', name: 'Push Day' });
  const day = activeDays(d)[0];
  assert.equal(day.name, 'Push Day');
  assert.equal(day.warmup.length, 1);
  assert.equal(day.main.length, 2);
  assert.equal(day.cooldown.length, 1);
  assert.equal(d.openDay, 0, 'the day stays open — you land back on what you just filled');
});

test('templateIntoDay never overwrites a name the athlete typed', () => {
  const base = withActiveDays(openDraft(), openDraft().days.map((day, i) => (i === 0 ? { ...day, name: 'Heavy Push' } : day)));
  const d = templateIntoDay(base, 0, rows(), { mode: 'replace', name: 'Push Day' });
  assert.equal(activeDays(d)[0].name, 'Heavy Push');
});

test('replace discards what was there; append keeps it', () => {
  const seeded = templateIntoDay(openDraft(), 0, rows(), { mode: 'replace' });
  const replaced = templateIntoDay(seeded, 0, rows(), { mode: 'replace' });
  assert.equal(activeDays(replaced)[0].main.length, 2);
  const appended = templateIntoDay(seeded, 0, rows(), { mode: 'append' });
  assert.equal(activeDays(appended)[0].main.length, 4);
});

test('every applied row gets a fresh id, so two copies are separately editable', () => {
  const twice = templateIntoDay(templateIntoDay(openDraft(), 0, rows(), { mode: 'replace' }), 0, rows(), { mode: 'append' });
  const ids = activeDays(twice)[0].main.map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate ids would make move/remove hit the wrong row');
});

test('group ids are remapped, so appending a template twice does not fuse two blocks into one', () => {
  const sup = {
    warmup: [],
    cooldown: [],
    main: [
      { ...ex('Press'), groupId: 'g1', groupKind: 'superset' },
      { ...ex('Row'), groupId: 'g1', groupKind: 'superset' },
    ],
  };
  const twice = templateIntoDay(templateIntoDay(openDraft(), 0, sup, { mode: 'replace' }), 0, sup, { mode: 'append' });
  const main = activeDays(twice)[0].main;
  assert.equal(main[0].groupId, main[1].groupId, 'the first block is still one block');
  assert.equal(main[2].groupId, main[3].groupId, 'and so is the second');
  assert.notEqual(main[1].groupId, main[2].groupId, 'but they are NOT the same block');
  assert.equal(pairingAt(main, 0).count, 2, 'a four-lift superset is not what was authored');
});

test('a template row outside the builder clamps into what the steppers can reach', () => {
  const wild = { warmup: [], cooldown: [], main: [{ ...ex('Press'), sets: 40, reps: 500 }] };
  const day = activeDays(templateIntoDay(openDraft(), 0, wild, { mode: 'replace' }))[0];
  assert.equal(day.main[0].sets, clampSets(40));
  assert.equal(day.main[0].reps, clampReps(500));
});

test('a cardio block keeps its open targets rather than being clamped to a set count', () => {
  const cardio = { warmup: [], cooldown: [], main: [{ id: 'c', name: 'Run', kind: 'cardio', activity: 'run', modality: 'outdoor', targetMi: 1, targetPaceSec: null, targetSpdMph: null }] };
  const block = activeDays(templateIntoDay(openDraft(), 0, cardio, { mode: 'replace' }))[0].main[0];
  assert.equal(block.targetMi, 1);
  assert.equal(block.targetPaceSec, null, 'null is an OPEN target and must not become 0');
  assert.ok(block.sets === undefined, 'a run is not sets of a run');
});

test('templateIntoDay on a day that does not exist changes nothing', () => {
  const d = openDraft();
  assert.equal(templateIntoDay(d, 99, rows(), { mode: 'replace' }), d);
});

// ── the Day Builder's forward move (PO: "all the way until the last day and week") ────────────────

/** A customize-per-week draft with `weeks` weeks, sitting on week `w`, day `dayIndex`. */
function varyDraft(weeks, w, dayIndex) {
  const seeded = setVaryMode({ ...newDraft(), weeks });
  return { ...seeded, openWeek: w, openDay: dayIndex };
}

test('forward is the next day while there is one', () => {
  const d = openDraft(0);
  assert.deepEqual(nextDayStop(d), { week: null, day: 1 });
  assert.equal(dayAtStop(d, nextDayStop(d)).letter, 'B');
});

test('a repeating template ENDS at its last day — it has no weeks to walk into', () => {
  // ⚠ `weeks` is 8 here and must be ignored: `vary` is false, so d.days IS every week. Reading the
  // count anyway would invent seven weeks of days that do not exist.
  const last = { ...openDraft(3), weeks: 8 };
  assert.equal(last.days.length, 4);
  assert.equal(nextDayStop(last), null);
});

test('⚠ the last day of a week walks into the NEXT WEEK, not to a dead end', () => {
  const d = varyDraft(4, 0, 3); // week 1, day D of 4
  assert.deepEqual(nextDayStop(d), { week: 1, day: 0 }, 'the forward path died here before');
  assert.equal(dayAtStop(d, nextDayStop(d)).letter, 'A');
});

test('and keeps walking, week after week, until the real end', () => {
  let d = varyDraft(3, 0, 0);
  const visited = [];
  for (let guard = 0; guard < 50; guard++) {
    const stop = nextDayStop(d);
    if (!stop) break;
    visited.push(`${(stop.week ?? d.openWeek) + 1}-${stop.day}`);
    d = { ...d, openWeek: stop.week ?? d.openWeek, openDay: stop.day };
  }
  assert.equal(visited.length, 3 * 4 - 1, 'every day of every week is reachable by pressing forward');
  assert.equal(visited[3], '2-0', 'week 1 hands over to week 2');
  assert.equal(visited[visited.length - 1], '3-3');
  assert.equal(nextDayStop(d), null, 'the last day of the last week is where it stops');
});

test('the last week has no week after it', () => {
  assert.equal(nextDayStop(varyDraft(2, 1, 3)), null);
});

test('no open day, no forward move', () => {
  assert.equal(nextDayStop(newDraft()), null);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// LIVE PROGRAM EDITING (W-5 Amendment-001) — a running program may be edited, but its finish line
// may not move, and the sessions already trained may not change.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

const day = (mains) => ({ letter: 'A', name: '', warmup: [], main: mains.map((n) => ({ id: n, exerciseId: n, sets: 3, reps: 10 })), cooldown: [] });
const blank = () => ({ letter: 'B', name: '', warmup: [], main: [], cooldown: [] });

test('hydrateDraft no longer truncates a ragged program (migration 0123 day-deletion)', () => {
  // Five days in a structure that calls itself 3/week — exactly what a Coach Holt program looks like.
  const source = {
    id: 'p1',
    name: 'Ragged',
    structure: { name: 'Ragged', weeks: 2, daysPerWeek: 3, vary: false, days: [day(['a']), day(['b']), day(['c']), day(['d']), day(['e'])], weekPlans: null },
  };
  const d = hydrateDraft(source, 'edit');
  assert.equal(d.days.length, 5, 'opening the builder must not delete the two days past daysPerWeek');
  assert.deepEqual(d.days.map((x) => x.main[0].exerciseId), ['a', 'b', 'c', 'd', 'e']);
});

test('normalizeDraft does not truncate on the Picker round-trip either', () => {
  const d = {
    ...newDraft(),
    weeks: 2,
    daysPerWeek: 3,
    vary: true,
    weekPlans: [{ days: [day(['a']), day(['b']), day(['c']), day(['d'])] }, { days: [day(['e'])] }],
  };
  const out = normalizeDraft(d);
  assert.equal(out.weekPlans[0].days.length, 4, 'a ragged week must survive every focus');
  assert.equal(out.weekPlans.length, 2);
});

test('forLiveEdit materialises Repeat into per-week plans WITHOUT changing the session count', () => {
  const base = { ...newDraft(), weeks: 4, daysPerWeek: 3, vary: false, days: [day(['a']), day(['b']), day(['c'])], weekPlans: null };
  const before = totalSessions(draftToStructure(base));
  const live = forLiveEdit(base, { trained: [], sessions: before });
  assert.equal(live.vary, true, 'future weeks must become independently editable');
  assert.equal(live.weekPlans.length, 4);
  assert.equal(totalSessions(draftToStructure(live)), before, 'materialising must be meaning-preserving');
  assert.equal(liveEditViolation(live), null);
});

test('liveEditViolation allows an in-place swap and refuses a shrink', () => {
  const base = { ...newDraft(), weeks: 4, daysPerWeek: 3, vary: false, days: [day(['a']), day(['b']), day(['c'])], weekPlans: null };
  const live = forLiveEdit(base, { trained: [], sessions: totalSessions(draftToStructure(base)) });

  // Swapping the exercise in a future week is the whole point of the feature.
  const swapped = { ...live, weekPlans: live.weekPlans.map((w, i) => (i === 3 ? { days: [day(['z']), day(['b']), day(['c'])] } : w)) };
  assert.equal(liveEditViolation(swapped), null, 'changing what is IN a session must be allowed');

  // Dropping a week moves the finish line.
  const shorter = { ...live, weeks: 2, weekPlans: live.weekPlans.slice(0, 2) };
  assert.match(liveEditViolation(shorter) ?? '', /removes 6 sessions \(12 → 6\)/);

  // ⚠ And so does EMPTYING a day — the case a `weeks × daysPerWeek` guard would have missed entirely.
  const emptied = { ...live, weekPlans: live.weekPlans.map((w, i) => (i === 3 ? { days: [day(['a']), day(['b']), blank()] } : w)) };
  assert.match(liveEditViolation(emptied) ?? '', /removes 1 session \(12 → 11\)/);
});

test('lockedCells maps schedule-space slots to builder-space rows across a blank day', () => {
  // Week 0 is [built, BLANK, built]. Schedule space skips the blank, so slot 1 is builder row 2.
  const d = {
    ...newDraft(),
    weeks: 1,
    daysPerWeek: 3,
    vary: true,
    weekPlans: [{ days: [day(['a']), blank(), day(['c'])] }],
    live: { trained: [{ weekIndex: 0, dayIndex: 1 }], sessions: 2 },
  };
  const locked = lockedCells(d);
  assert.equal(isLockedCell(locked, 0, 2), true, 'the second TRAINED day is builder row 2, not row 1');
  assert.equal(isLockedCell(locked, 0, 1), false, 'the blank row is not the trained session');
  assert.equal(isLockedCell(locked, 0, 0), false, 'an untrained built day stays editable');
});
