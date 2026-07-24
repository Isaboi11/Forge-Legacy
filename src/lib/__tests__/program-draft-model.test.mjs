import { test } from 'node:test';
import assert from 'node:assert/strict';
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
  draftToStructure,
  ensureWeeks,
  hasMainExercise,
  isDraftValid,
  makeDays,
  newDraft,
  normalizeDraft,
  weekBuilt,
  weeksLoseContent,
  withActiveDays,
  setVaryMode,
  setRepeatMode,
  copyWeek,
  clearWeek,
  nextIncompleteWeek,
  completedWeeks,
} from '../program-draft-model.ts';

const ex = (name) => ({ id: name, name, equip: 'Barbell', muscles: ['Chest'], type: 'Compound', sets: 3, reps: 10 });

/** A repeat-mode draft whose day `i` has one main exercise. */
function withMainOn(i) {
  const d = newDraft();
  return withActiveDays(d, d.days.map((day, k) => (k === i ? { ...day, main: [ex('Bench Press')] } : day)));
}

// ── clamps (design §14) ───────────────────────────────────────────────────────

test('clamps hold the design bounds: weeks 4–52, sets 1–8, reps 1–60', () => {
  assert.equal(clampWeeks(3), 4);
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
