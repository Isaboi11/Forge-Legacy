import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { moreThanOneWorkout, parseProgramTable, toProgramStructure } from '../import-parse.ts';

/*
 * ══ THE PO'S AUNT'S PROGRAM, PASTED INTO BUILD A PROGRAM (PO 2026-10-06) ══
 *
 * "This is my aunt's program. I tried entering it into the text add part in the program builder … it didn't work
 * and got things confused. How can we make sure it'll work?"
 *
 * The fixture is the paste exactly as the PO sent it — five named days, "Name: 3 sets 6-8 @ 50 lbs each side", a
 * reel link under the lift it shows, an exercise with its how-to on the line under it, and an "OR" between two
 * lifts. Before this it imported as SIX days ("Glute Bridges with barbell" and "OR" were days), "3 sets 6-8" as an
 * assumed 10 with "6-8 @" left in the name, every range as its floor, Wall sits as 3 × 3, and 5 of 42 lifts
 * matched the library because the words after the numbers stayed in every name.
 */

const text = readFileSync(new URL('./fixtures/aunt-five-day-split-2026-10-06.txt', import.meta.url), 'utf8');
const r = parseProgramTable(text);
const days = r.ok ? r.weeks[0].days : [];
const find = (name) => days.flatMap((d) => d.items).find((i) => i.name === name);
const rx = (i) => [i.sets, i.durationSec ? `${i.durationSec}s` : i.reps, i.rx?.repsMax ?? null];

test('five days, in her order, named as she named them — not six, and not "OR"', () => {
  assert.equal(r.ok, true);
  assert.equal(r.weeks.length, 1);
  assert.deepEqual(days.map((d) => d.name), ['Quads & Glutes', 'Back', 'Chest/Shoulders', 'Glutes & Hamstrings', 'Arms']);
  assert.deepEqual(days.map((d) => d.items.length), [12, 6, 9, 10, 5]);
  /* The only line not read as training is her own aside. */
  assert.deepEqual(r.skipped, ['(started heavy glute work in march 2025)']);
});

test('every name is the exercise — what came before the colon, with nothing of the prescription left in it', () => {
  assert.deepEqual(days.map((d) => d.items.map((i) => i.name)), [
    [
      'Single Leg Quad Extension', 'Leg Press', 'Calf press on leg press machine', 'Bench dumbbell hinge',
      'Glute Bridges with barbell', 'Clam Shells with heavy band', 'Goblet Squat with kettlebell with elevated heels',
      'Weighted side lunge', 'Single leg calf raises', 'Wall sits', 'Adductor', 'Abdominal press machine',
    ],
    ['Single arm pulldown', 'Lat Pullover', 'Single arm row', 'Close grip lat pulldown', 'Hyper extensions with legs together weight at chest', 'Crunch machine'],
    ['Bench Press', 'Decline Dumbbell Press', 'Abs in decline chair', 'Chest Dips', 'Decline Press', 'Reverse pec dec', 'Single arm cable lateral', 'Overhead press', 'Abs Hanging leg raises'],
    [
      'Standing abductor', 'Hip thrust with belt', 'Cable Squats', 'Glute kickbacks with cable', 'Straight Leg Hamstring Dead Lift',
      'calf raise machine', 'Abductor', 'Hyperextensions with legs split apart and weight held out in front', 'Hamstring leg curl', 'Ab Crunch machine',
    ],
    ['Single arm preacher hammer curl', 'Seated alternate bicep curl', 'Single arm tricep press down', 'Dead-stop skull crusher', 'Single arm overhead cable extension'],
  ]);
});

test('the numbers are hers — sets, the whole rep range, a timed hold, and to failure', () => {
  assert.deepEqual(rx(find('Leg Press')), [3, 6, 8]); // "3 sets 6-8" — was an assumed 10
  assert.deepEqual(rx(find('Calf press on leg press machine')), [3, 12, 15]); // "3 sets x 12-15"
  assert.deepEqual(rx(find('Single Leg Quad Extension')), [3, 12, 15]); // "3 sets 12-15 reps"
  assert.deepEqual(rx(find('Lat Pullover')), [3, 10, 12]); // "10-12reps"
  assert.deepEqual(rx(find('Single leg calf raises')), [3, 10, 12]);
  assert.deepEqual(rx(find('Bench Press')), [3, 5, 8]);
  assert.deepEqual(rx(find('Decline Press')), [3, 8, null]);
  assert.deepEqual(rx(find('Abdominal press machine')), [3, 12, null]); // "3 sets of 12"
  assert.deepEqual(rx(find('Wall sits')), [3, '30s', null]); // "3 reps x 30 seconds" — was 3 × 3
  const hyper = find('Hyperextensions with legs split apart and weight held out in front');
  assert.deepEqual([hyper.reps, hyper.setsAssumed], [25, true]); // she gave reps, not sets — shown as assumed
  for (const n of ['Abs Hanging leg raises', 'Ab Crunch machine']) assert.equal(find(n).toFailure, true, n);
  assert.equal(find('Hamstring leg curl').rx?.restSec, 45); // "45 second rest between each set"
  /* Only the two lifts she gave no set count for are assumed. */
  const assumed = days.flatMap((d) => d.items).filter((i) => i.setsAssumed).map((i) => i.name);
  assert.deepEqual(assumed, ['Glute Bridges with barbell', 'Hyperextensions with legs split apart and weight held out in front']);
});

test('nothing she wrote is lost — the weights, the drop sets, the how-to, the reel and the other choice ride as notes', () => {
  assert.match(find('Leg Press').note, /@50 lbs each side/);
  assert.match(find('Single arm pulldown').note, /last set failure, drop 33% @ 12\.5 then fail again/);
  /* "Glute Bridges with barbell:" with its how-to underneath — an exercise, not a day. */
  const bridge = find('Glute Bridges with barbell');
  assert.deepEqual([bridge.sets, bridge.reps, bridge.setsAssumed, bridge.repsAssumed], [3, 10, true, true]);
  assert.equal(bridge.note, 'Pulses up, side to side pulses, leg spread pulses with hips at the top.');
  /* The reel sits under the hinge it demonstrates. */
  assert.match(find('Bench dumbbell hinge').note, /https:\/\/www\.instagram\.com\/reel\/DdrfjaNBx0a/);
  /* "Overhead press … OR Lateral Raise …" — one slot, two choices; the raise is not a lift of its own. */
  assert.match(find('Overhead press').note, /then one set to 25 @ 10 lbs — OR Lateral Raise: 3 x 10 @ 20lbs$/);
  assert.equal(find('Lateral Raise'), undefined);
  assert.match(find('Abductor').note, /LEAN FORWARD, 4th set lower to 85 lbs/);
});

test('Create keeps the range — the program gets repsMax, not the floor alone', () => {
  const s = toProgramStructure(r.weeks, 'Aunt', () => null);
  const leg = s.days[0].main.find((e) => e.name === 'Leg Press');
  assert.deepEqual([leg.sets, leg.reps, leg.repsMax], [3, 6, 8]);
  const curl = s.days[3].main.find((e) => e.name === 'Hamstring leg curl');
  assert.equal(curl.restSec, 45);
  const raises = s.days[2].main.find((e) => e.name === 'Abs Hanging leg raises');
  assert.deepEqual(raises.repScheme, ['F', 'F', 'F']);
});

// ── each rule, on its own, and where it must NOT fire ───────────────────────

const parse = (lines) => {
  const p = parseProgramTable(lines.join('\n'));
  assert.equal(p.ok, true);
  return p.weeks[0].days.map((d) => [d.name, d.items.map((i) => i.name)]);
};

test('a colon line is still a day heading when the days are not named', () => {
  assert.deepEqual(parse(['Upper Body:', 'Bench 3x8', 'Row 3x8', 'Lower Body:', 'Squat 5x5']), [
    ['Upper Body', ['Bench', 'Row']],
    ['Lower Body', ['Squat']],
  ]);
});

test('with named days, a colon line with WORK under it is untouched — only one with words under it is a lift', () => {
  const p = parse(['Monday: Legs', 'Squat 5x5', 'Hip Bridge:', 'Squeeze at the top, slow down.', 'Lunge 3x10', 'Tuesday: Push', 'Bench 3x8']);
  assert.deepEqual(p, [
    ['Legs', ['Squat', 'Hip Bridge', 'Lunge']],
    ['Push', ['Bench']],
  ]);
});

test('"Chest Fly 0:40" is a clock, "A1: 3x8" is not a lift called A1, and "Upper: Bench 3x8" keeps its lift', () => {
  assert.equal(parseProgramTable('Chest Fly 0:40').weeks[0].days[0].items[0].name, 'Chest Fly');
  assert.notEqual(parseProgramTable('Squat 5x5\nA1: Bench 3x8').weeks[0].days[0].items[1]?.name, 'A1');
  assert.match(parseProgramTable('Day 1\nUpper: Bench 3x8').weeks[0].days[0].items[0].name, /Bench/);
});

test('"…, then one set to 25" is the same lift; "Bench 4x8, Row 4x8" is still two', () => {
  assert.deepEqual(parse(['Overhead press: 2 x 10-12 @ 25 lbs, then one set to 25 @ 10 lbs']), [['Day 1', ['Overhead press']]]);
  assert.deepEqual(parse(['Bench 4x8, Row 4x8']), [['Day 1', ['Bench', 'Row']]]);
});

test('"3 sets 135 lbs" is not 135 reps, and "8/8 reps" (per side) is not a range', () => {
  const heavy = parseProgramTable('Squat 4 sets 135 lbs').weeks[0].days[0].items[0];
  assert.notEqual(heavy.reps, 135);
  const side = parseProgramTable('Lunge 3 sets 8/8 reps').weeks[0].days[0].items[0];
  assert.deepEqual([side.sets, side.reps, side.rx?.repsMax], [3, 8, undefined]);
});

test('"OR" with nothing above it is listed, not dropped', () => {
  const p = parseProgramTable('OR\nBench 3x8');
  assert.equal(p.ok, true);
  assert.ok(p.skipped.includes('OR'));
});

test('a whole week pasted into Build a Template is offered as a program — one workout is not', () => {
  /* PO 2026-10-06: "should we just have that as a program sort of thing?" — her week, pasted as a template. */
  assert.equal(moreThanOneWorkout(r.weeks), '5 days');
  assert.equal(moreThanOneWorkout(parseProgramTable(['Push A', 'Bench Press 4x8', 'Dips 3x12'].join('\n')).weeks), null);
  assert.equal(moreThanOneWorkout(parseProgramTable(['Week 1', 'Squat 5x5', 'Week 2', 'Squat 5x3'].join('\n')).weeks), '2 weeks');
  assert.equal(moreThanOneWorkout([]), null);
});
