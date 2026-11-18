import '../../../data/__tests__/harness/hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

/*
 * A WORKOUT APP'S SCREEN, READ BY CODE (AI Road to 10 Sprint 3b, IM-1). Every input is a REAL card-reader answer from the
 * import corpus (`workout/__tests__/fixtures/app-screen-cards.mjs`). Before this, the AI layout read these screens with the warm-up
 * circuit as lift 1, the finisher under Recovery, every circuit move one set, and "Rounds: 8m" as a lift's name.
 */

const { readCircuitCard, circuitWorkout, circuitCardText } = await import('../circuit-card.ts');
const { writtenToTemplate } = await import('../../workout/written-workout.ts');
const { writtenToWeeks, sideBySideTsv, isMultiDaySheet } = await import('../written-import.ts');
const { parseProgramTable } = await import('../import-parse.ts');
const { resolveExerciseName } = await import('../../exercise-picker/data.ts');
const F = await import('../../workout/__tests__/fixtures/app-screen-cards.mjs');
const S12 = await import('../../workout/__tests__/fixtures/squatober-2026-day1.mjs');

const resolveKey = (n) => resolveExerciseName(n)?.key;
const itemsOf = (text) => {
  const blocks = readCircuitCard(text);
  assert.ok(blocks, 'the screen is read');
  const w = circuitWorkout(blocks);
  return { w, items: writtenToWeeks(w, writtenToTemplate(w, resolveKey)).weeks[0].days[0].items };
};
const main = (items) => items.filter((i) => !i.section);
const brief = (i) => `${i.name} ${i.sets}x${i.durationSec ? `${i.durationSec}s` : i.toFailure ? 'F' : i.rx?.repScheme ? i.rx.repScheme.join('/') : i.reps}`;

test('the repeat icon\'s rounds are the circuit\'s sets; the warm-up circuit is the warm-up, never lift 1', () => {
  const { w, items } = itemsOf(F.W6E_ROUNDS);
  assert.deepEqual(main(items).map(brief), [
    'Conventional Deadlift 5x5',
    'Barbell Hip Thrust 4x8',
    'Wall Balls 4x20',
    'Assault Bike 4x60s',
    'Ball Slams 4x20',
    'DB Suitcase Carry 4x20s',
    'V Ups 4x20',
  ]);
  assert.match(w.how, /Stairmaster 3 min/);
  assert.match(w.how, /Warmup \(2 rounds\): 30s 90\/90 Stretch/);
  /* The HIIT circuit is one superset, each move once a round. */
  const hiit = main(items).slice(2);
  assert.equal(new Set(hiit.map((i) => i.rx?.groupId)).size, 1);
  assert.ok(hiit[0].rx.groupId);
});

test('a warm-up heading with moves under it is a circuit even when the card reader left out "CIRCUIT"', () => {
  const { w, items } = itemsOf(F.W5D_NO_CIRCUIT_WORD);
  assert.match(w.how, /^Warm-up: Warm up muscle group: 30s Straight bar stretch/);
  assert.equal(main(items)[0].name, 'Incline Bench Press');
  const row = main(items).find((i) => /^Row/.test(i.name));
  assert.deepEqual([row.name, row.sets, row.durationSec], ['Row - 20 sec hard / 40 sec easy', 1, 300]);
});

test('an AMRAP\'s clock ("Rounds: 8m") is never a set count or a lift — a count-less move is still a move', () => {
  const { items } = itemsOf(F.W1F_AMRAP);
  const m = main(items);
  assert.ok(m.every((i) => i.sets === 1), 'as many rounds as you can: the sets are not written');
  assert.ok(!m.some((i) => /rounds/i.test(i.name)));
  assert.deepEqual(
    m.map((i) => i.name),
    ['Pulse Squats', 'DB Plank Pull Through', 'DB half burpee row', 'Reverse Lunge, Hammer Curl, Press (Left)', 'Reverse Crunches', 'Narrow Squat, hammer curl, front raise', 'Narrow Stance Snatch', 'Reverse Lunge, Hammer Curl, Press (Right)'],
  );
  assert.match(m[0].note, /AMRAP #1 — as many rounds as you can in 8 min/);
});

test('"3 Round Finisher" keeps its 3; "F-F-F reps" is every set to failure', () => {
  const { items } = itemsOf(F.W5A_ROUND_FINISHER);
  const m = main(items);
  assert.deepEqual(m.slice(-3).map(brief), ['Push Ups 3x20', 'Bent Arm DB Lateral Raise 3x15', 'V Ups 3x25']);
  assert.equal(brief(m.find((i) => i.name === 'Dips')), 'Dips 3xF');
});

test('a numbered screen ("1 Sprint Sled Push" / "20-20-20-20-20 sec") and a stretch circuit after the lifts', () => {
  const { w, items } = itemsOf(F.W4C_NUMBERED);
  assert.equal(brief(main(items)[0]), 'Sprint Sled Push 5x20s');
  assert.ok(!main(items).some((i) => /stretch/i.test(i.name)), 'the stretches are what comes after, not lifts');
  assert.match(w.after, /Stretch where you are sore: 2m Worlds Greatest Stretch, 2m Straight bar stretch/);
});

test('a name wrapped onto two lines is one lift', () => {
  const { items } = itemsOf(F.W1E_WRAPPED);
  assert.ok(main(items).some((i) => i.name === 'DB Staggered-Stance Rom deadlift' && i.sets === 3 && i.reps === 12));
});

test('anything that is not an app\'s screen is left alone: a Squatober card, a sheet, prose', () => {
  assert.equal(readCircuitCard(S12.S12_DAY1_CARD), null);
  assert.equal(readCircuitCard(F.PO_3WEEK_SHEET), null);
  assert.equal(readCircuitCard('Just a note about my week.\nI felt great.'), null);
  assert.equal(readCircuitCard(''), null);
});

test('the words shown for the read are the screen\'s blocks', () => {
  const t = circuitCardText(readCircuitCard(F.W6E_ROUNDS));
  assert.match(t, /^\(Optional\) Stairmaster\n3 min/);
  assert.match(t, /CIRCUIT\nRounds: 4\nHIIT\n20 Wall Balls\n1m Assault Bike/);
});

test('two days side by side unfold into a 3-week, 4-day sheet with the abs on the lower days', () => {
  const tsv = sideBySideTsv(F.PO_3WEEK_SHEET);
  assert.ok(tsv);
  assert.ok(isMultiDaySheet(F.PO_3WEEK_SHEET, tsv));
  const t = parseProgramTable(tsv);
  assert.ok(t.ok);
  assert.equal(t.weeks.length, 3);
  assert.deepEqual(t.weeks[0].days.map((d) => d.name), ['Monday- Upper Body A', 'Tuesday- Lower Body A', 'Thursday- Upper Body B', 'Friday- Lower Body B']);
  assert.deepEqual(t.weeks[0].days[1].items.slice(-2).map((i) => i.name), ['Lying Leg Raise', 'Swiss Ball Crunch']);
  assert.deepEqual(t.weeks[2].days[0].items.map((i) => `${i.sets}x${i.reps}`), Array(5).fill('3x4'));
  /* A single card with a pipe in it is not this sheet. */
  assert.equal(sideBySideTsv('Bench Press | 3 X 8'), null);
});

test('layoutDisagrees: same lifts, same numbers, names kept — or it says which lift differs', async () => {
  const { layoutDisagrees } = await import('../circuit-card.ts');
  const { items } = itemsOf(F.W6E_ROUNDS);
  assert.equal(layoutDisagrees(items, items), null);
  const moved = items.map((i, k) => (k === 2 ? { ...i, sets: 1 } : i));
  assert.match(layoutDisagrees(moved, items), /Wall Balls/);
  assert.match(layoutDisagrees(items.slice(0, -1), items), /lifts/);
  const renamed = items.map((i) => (i.name === 'DB Suitcase Carry' ? { ...i, name: 'Dumbbell Suitcase Carries' } : i));
  assert.equal(layoutDisagrees(renamed, items), null, 'DB spelled out and a plural are the same name');
  const cut = itemsOf(F.W5D_NO_CIRCUIT_WORD).items;
  const short = cut.map((i) => (/^Row -/.test(i.name) ? { ...i, name: 'Row' } : i));
  assert.match(layoutDisagrees(short, cut), /named “Row”/);
});
