import '../../../data/__tests__/harness/hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

/*
 * A PHOTOGRAPHED CARD INTO BUILD A PROGRAM / BUILD A TEMPLATE (PO 2026-09-30: "shouldn't this be the same card reader
 * as when I put it in … Build a Program? That should be going through AI as well so we know it works").
 *
 * The inputs are the live prompts' REAL answers for the PO's Season 12 Day 1 photo (`fixtures/squatober-2026-day1`).
 * Before this, the program importer read that same photo as: warm-up and recovery lines turned into 3 × 10
 * exercises, Back Squat 9 × 0 with every percentage dropped, Bench 1 set, and "Rest between" as an exercise.
 */

const { readWrittenWorkout, writtenToTemplate, tsvToWrittenText } = await import('../../workout/written-workout.ts');
const { isMultiDaySheet, writtenToWeeks } = await import('../written-import.ts');
const { parseProgramTable, toProgramStructure, unmatchedNames } = await import('../import-parse.ts');
const { sanitizeTranscript } = await import('../photo-transcript.ts');
const { draftFromImport } = await import('../../../lib/program-import-draft.ts');
const { newDraft } = await import('../../../lib/program-draft-model.ts');
const { workoutDraftFromImport } = await import('../../../lib/workout-import-draft.ts');
const { toTemplateExercises } = await import('../../../lib/workout-template-rows.ts');
const { prescriptionLine, withoutScheme } = await import('../../../lib/prescription-line.ts');
const { sessionSetsFor } = await import('../../workout/session-core.ts');
const { resolveExerciseName } = await import('../../exercise-picker/data.ts');
const S12 = await import('../../workout/__tests__/fixtures/squatober-2026-day1.mjs');

const resolveKey = (n) => resolveExerciseName(n)?.key;
const SQUAT_REPS = [5, 5, 5, 3, 3, 3, 1, 1, 1];
const SQUAT_PCTS = [60, 65, 70, 73, 75, 78, 82, 85, 87];

const weeksOf = (text) => {
  const w = readWrittenWorkout(text);
  return writtenToWeeks(w, writtenToTemplate(w, resolveKey));
};

test('⚠ the card is ONE workout, so it goes through the AI check — even though the table reader sees two days in it', () => {
  /* The trap this test exists for: `parseProgramTable` reads the card's text as TWO days, and asking it "is this a
     program?" would have sent the Squatober card around the AI check it was built for. */
  const t = parseProgramTable(S12.S12_DAY1_CARD);
  assert.ok(t.ok && t.weeks[0].days.length === 2, 'the table reader still splits it — if this changes, the test below still holds');
  const tsv = sanitizeTranscript(S12.S12_DAY1_TABLE).tsv;
  assert.equal(isMultiDaySheet(S12.S12_DAY1_CARD, null), false);
  assert.equal(isMultiDaySheet(tsvToWrittenText(tsv), tsv), false);
  /* A real program sheet still goes to the table reader. */
  assert.equal(isMultiDaySheet('Week 1\nDay 1 – Upper\nBench Press 4x8\n\nDay 2 – Lower\nBack Squat 4x6', null), true);
  assert.equal(isMultiDaySheet('Monday\nBench 4x8\nWednesday\nSquat 5x5', null), true);
  assert.equal(isMultiDaySheet('x', 'Week\tDay\tExercise\tSets\tReps\n1\tA\tSquat\t5\t5\n1\tB\tBench\t5\t5'), true);
  assert.equal(isMultiDaySheet('x', 'Week\tDay\tExercise\tSets\tReps\n1\tA\tSquat\t5\t5\n1\tA\tBench\t5\t5'), false);
});

for (const [label, text] of [
  ['whole card → AI, run 1', S12.S12_DAY1_CARD_TIDY_1],
  ['whole card → AI, run 2', S12.S12_DAY1_CARD_TIDY_2],
  ['table → AI, run 1', S12.S12_DAY1_TABLE_TIDY_1],
  ['table → AI, run 2', S12.S12_DAY1_TABLE_TIDY_2],
]) {
  test(`${label}: the preview's weeks hold the card, and Build a Program gets every set of it`, () => {
    const { weeks, skipped } = weeksOf(text);
    assert.equal(weeks.length, 1);
    const day = weeks[0].days[0];
    const byName = (re) => day.items.find((i) => re.test(i.name));
    const squat = byName(/back squat/i);
    assert.deepEqual([squat.sets, squat.rx.repScheme, squat.rx.percentScheme], [9, SQUAT_REPS, SQUAT_PCTS]);
    assert.equal(squat.setsAssumed, false, 'nothing was filled in');
    const pinch = byName(/pinch/i);
    assert.equal(pinch.durationSec, 20, 'a hold for time is a timed set');
    assert.ok(!/20 seconds/.test(pinch.note ?? ''), 'and its words are not said twice');
    const [dips, curls] = [byName(/dips/i), byName(/curl/i)];
    assert.ok(dips.rx.groupId && dips.rx.groupId === curls.rx.groupId && curls.rx.groupId === pinch.rx.groupId, 'the superset holds');
    assert.ok(!day.items.some((i) => /recovery|warm|steak|rest between/i.test(i.name)), 'no warm-up, recovery or rest line became an exercise');
    assert.ok(skipped.some((s) => /Trunk Twists/.test(s)), 'the warm-up is listed, not lost');
    assert.ok(skipped.some((s) => /Steak/i.test(s)), 'the recovery is listed, not lost');
    assert.deepEqual(unmatchedNames(weeks, resolveKey).filter((n) => !/pinch/i.test(n)), [], 'the card’s own library matches carry through');

    /* Build a Program: the structure and the builder's draft keep the ramp, the rest and the superset. */
    const structure = toProgramStructure(weeks, 'Squatober', resolveKey);
    const ex = (re) => structure.days[0].main.find((x) => re.test(x.name));
    /* One rest for the lift, or the same rest written on every rung (a live run did each). */
    const sq = ex(/back squat/i);
    assert.deepEqual([sq.repScheme, sq.percentScheme, sq.restSec ?? sq.restScheme?.[8]], [SQUAT_REPS, SQUAT_PCTS, 120]);
    assert.equal(ex(/bench/i).restSec ?? ex(/bench/i).restScheme?.[0], 90);
    assert.equal(ex(/dips/i).groupKind, 'superset');
    const r = draftFromImport(newDraft(), weeks, { isWeek: false, resolveKey });
    const draftSquat = r.draft.days[0].main.find((x) => /back squat/i.test(x.name));
    assert.equal(draftSquat.sets, 9, 'nine sets reach the program builder');

    /* The logger: nine sets, each with its percentage and the card's rest. */
    const sets = sessionSetsFor(draftSquat);
    assert.deepEqual(sets.map((s) => s.targetReps), SQUAT_REPS);
    assert.ok(sets.every((s) => s.restSec === 120 || s.restSec == null), 'rest reaches the set');
    assert.equal(sets[0].restSec ?? draftSquat.restScheme?.[0], 120);
  });
}

test('Build a Template: the draft and the saved template rows keep the ramp, the % and the rest', () => {
  const { weeks } = weeksOf(S12.S12_DAY1_CARD_TIDY_2);
  const w = workoutDraftFromImport(weeks, resolveKey);
  assert.ok(w);
  assert.equal(w.draft.name, 'Deep End Diving');
  const squat = w.draft.main.find((x) => /back squat/i.test(x.name));
  assert.equal(squat.sets, 9);
  const rows = toTemplateExercises(w.draft);
  const row = rows.find((x) => /back squat/i.test(x.name));
  assert.deepEqual([row.sets, row.repScheme, row.percentScheme, row.restSec ?? row.restScheme?.[0]], [9, SQUAT_REPS, SQUAT_PCTS, 120]);
  const pinch = rows.find((x) => /pinch/i.test(x.name));
  assert.equal(pinch.targetDurationSec, 20);
});

test('the fallback path: the table read of the photo, turned into words, reads the same once AI has laid it out', () => {
  const words = tsvToWrittenText(sanitizeTranscript(S12.S12_DAY1_TABLE).tsv);
  assert.ok(words.length > 0);
  const { weeks } = weeksOf(S12.S12_DAY1_TABLE_TIDY_1);
  assert.equal(weeks[0].days[0].items.find((i) => /back squat/i.test(i.name)).sets, 9);
});

test('the builder row says what the steppers can’t, and re-counting it by hand makes it plain sets × reps', () => {
  const row = { name: 'Back Squat', sets: 9, reps: 5, repScheme: SQUAT_REPS, percentScheme: SQUAT_PCTS, restSec: 120 };
  assert.equal(prescriptionLine(row), '9 sets · 5-5-5-3-3-3-1-1-1 reps · 60-87% · rest 2:00');
  assert.equal(prescriptionLine({ name: 'Squat', sets: 5, reps: 5 }), null, 'a plain row says nothing extra');
  const plain = withoutScheme(row);
  assert.equal(plain.repScheme, undefined);
  assert.equal(plain.percentScheme, undefined);
  assert.equal(plain.restSec, 120, 'one rest for every set stays');
  const flat = withoutScheme({ name: 'Bench', sets: 5, repScheme: [3, 3, 3, 3, 3], percentScheme: [80, 80, 80, 80, 80] });
  assert.deepEqual([flat.reps, flat.percentOfMax], [3, 80], 'one % for every set stays');
});
