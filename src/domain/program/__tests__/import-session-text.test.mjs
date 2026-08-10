import test from 'node:test';
import assert from 'node:assert/strict';

import {
  activityIn,
  distanceIn,
  durationIn,
  isRestText,
  looksLikeSessionText,
  nameFrom,
  parseSessionCell,
} from '../import-session-text.ts';

/**
 * Reading a training sentence.
 *
 * ⚠ EVERY CELL QUOTED HERE IS REAL, taken verbatim from a 15-week Brineman 70.3 plan a PO was handed.
 * That matters: the failure mode of a parser like this is not crashing, it is producing a plausible,
 * confident reading of somebody's training that is quietly wrong — so the fixtures have to be sentences
 * a coach actually wrote rather than sentences convenient to parse.
 */

const YD = 1760;
const min = (n) => n * 60;
const near = (actual, expected, what) =>
  assert.ok(Math.abs(actual - expected) < 1e-6, `${what}: expected ${expected}, got ${actual}`);

// ── the pieces ──────────────────────────────────────────────────────────────

test('the activity is the one named FIRST, not the one listed first here', () => {
  assert.equal(activityIn('4mi run off bike at race pace'), 'run', 'the run is the session; the bike is when');
  assert.equal(activityIn('3.5h ride (~56mi)'), 'bike');
  assert.equal(activityIn('SWIM 1200yd: technique focus'), 'swim');
  assert.equal(activityIn('45min brisk incline walk'), 'walk');
  assert.equal(activityIn('20min easy row'), 'row');
  assert.equal(activityIn('30min upper-body strength'), null, 'strength work is not an activity');
  assert.equal(activityIn('leg strength'), null);
});

test('every duration format the plan is written in', () => {
  assert.equal(durationIn('75min bike Z2'), min(75));
  assert.equal(durationIn('1h45 bike w/ 2x20min Z3'), min(105));
  assert.equal(durationIn('LONG RIDE 2.5h Z2 endurance'), min(150));
  assert.equal(durationIn('LONG RIDE 3.0h Z2 (~48mi)'), min(180));
  assert.equal(durationIn('45 mins easy'), min(45));
  assert.equal(durationIn('1 hour steady'), min(60));
  assert.equal(durationIn('LONG RUN 7mi easy-steady'), null, 'a distance is not a clock');
});

test('⚠ a figure behind a multiplier is a rep, and is never claimed as the bout', () => {
  // Reading "3min" here would state a session a quarter the real size, and look exactly like a real one.
  assert.equal(durationIn('RUN/WALK reintro 5x(3min easy jog / 2min walk) on soft flat ground'), null);
  assert.equal(durationIn('4x(6min jog / 2min walk) easy'), null);
  // …but a bout stated BEFORE its intervals is still the bout.
  assert.equal(durationIn('75min bike Z2 w/ 3x8min Z3'), min(75), 'the 75 comes first and is the ride');
  assert.equal(durationIn('1h45 bike w/ 4x6min low-cadence hill sim'), min(105));
});

test('yards and miles both land in canonical miles', () => {
  near(distanceIn('SWIM 1200yd: technique focus'), 1200 / YD, '1200 yd');
  near(distanceIn('continuous 2100yd race-distance'), 2100 / YD, '2100 yd');
  near(distanceIn('Utah Valley Marathon 26.2 miles'), 26.2, '26.2 miles');
  near(distanceIn('LONG RIDE 3.0h Z2 (~48mi)'), 48, '~48mi');
  assert.equal(distanceIn('75min bike Z2'), null, 'a clock is not a distance');
});

test('a distance range is read as its floor, like every other range in the app', () => {
  assert.equal(distanceIn('LONG RUN 5-6mi easy-steady'), 5);
  assert.equal(distanceIn('LONG RUN 8-9mi w/ middle miles at race pace'), 8);
});

test('a rest day is rest; a day that mentions rest is not', () => {
  assert.ok(isRestText('Full Rest Day'));
  assert.ok(isRestText('Rest'));
  assert.ok(isRestText('rest day'));
  assert.equal(isRestText('Rest, then 20min easy spin'), false);
  assert.equal(isRestText('Active recovery walk'), false);
});

test('a name loses its furniture and keeps its meaning', () => {
  assert.equal(nameFrom('75min bike Z2'), 'bike Z2');
  assert.equal(nameFrom('LONG RIDE 2.5h Z2 endurance'), 'Z2 endurance');
  assert.equal(nameFrom('SWIM 1200yd: technique focus'), 'technique focus');
  assert.equal(nameFrom('30min upper-body strength'), 'upper-body strength');
});

// ── whole cells ─────────────────────────────────────────────────────────────

test('a rest day produces NOTHING, so the day drops out of the schedule', () => {
  assert.deepEqual(parseSessionCell('Full Rest Day'), []);
  assert.deepEqual(parseSessionCell('   '), []);
});

test('a two-part day becomes two items, each keeping its own sentence', () => {
  const items = parseSessionCell('75min bike Z2 w/ 3x8min Z3 + 30min upper-body strength');
  assert.equal(items.length, 2);

  assert.equal(items[0].kind, 'cardio');
  assert.equal(items[0].activity, 'bike');
  assert.equal(items[0].targetSec, min(75));
  assert.equal(items[0].note, '75min bike Z2 w/ 3x8min Z3', 'the interval detail survives verbatim');

  assert.equal(items[1].kind, 'strength');
  assert.equal(items[1].note, '30min upper-body strength');
});

test('a four-part day splits into four', () => {
  const items = parseSessionCell('45min easy bike + calf rehab/mobility (as cleared) + leg strength + 30min walk');
  assert.equal(items.length, 4);
  assert.deepEqual(
    items.map((i) => i.kind),
    ['cardio', 'strength', 'strength', 'cardio'],
  );
  assert.equal(items[0].activity, 'bike');
  assert.equal(items[3].activity, 'walk');
  assert.equal(items[3].targetSec, min(30));
});

test('⚠ a set fragment folds into the bout above it instead of becoming a movement', () => {
  const items = parseSessionCell('SWIM 1200yd: technique focus, 8x100 Z2 + 4x50 drills + 20min easy row');
  assert.equal(items.length, 2, 'the swim and the row — "4x50 drills" is part of the swim');

  assert.equal(items[0].activity, 'swim');
  near(items[0].targetMi, 1200 / YD, 'swim distance');
  assert.ok(items[0].note.includes('4x50 drills'), 'and it is kept, on the swim');

  assert.equal(items[1].activity, 'row');
  assert.equal(items[1].targetSec, min(20));
});

test('a brick reads as a ride then a run, in that order', () => {
  const items = parseSessionCell('RACE-SIM BRICK: 3.5h ride (~56mi) + 4mi run off bike at race pace');
  assert.equal(items.length, 2);
  assert.equal(items[0].activity, 'bike');
  assert.equal(items[0].targetSec, min(210));
  near(items[0].targetMi, 56, 'ride distance');
  assert.equal(items[1].activity, 'run');
  near(items[1].targetMi, 4, 'run distance');
});

test('a strength block splits on its bullets and keeps the written sets and reps', () => {
  const items = parseSessionCell(
    'UPPER: push-ups or DB bench 3x10 • 1-arm DB row 3x10/side • overhead press 3x8 • pull-ups/lat pulldown 3x8 • face pulls 2x15 • plank 3x45s',
  );
  assert.equal(items.length, 6);
  assert.equal(items[0].sets, 3);
  assert.equal(items[0].reps, 10);
  assert.equal(items[2].name, 'overhead press');
  assert.equal(items[2].sets, 3);
  assert.equal(items[2].reps, 8);
  // ⚠ THE REGRESSION THIS LINE GUARDS. "1-arm DB row" contains "row" and was classified as a rowing
  // machine. A bulleted cell is a list of MOVEMENTS, so the keyword table is not consulted for it.
  assert.equal(items[1].name, '1-arm DB row');
  assert.equal(items[1].kind, 'strength', 'a DB row is a lift, not an erg');
  assert.ok(items.every((i) => i.kind === 'strength'), 'nothing in a lifting block is cardio');
});

test('an unrecognised phrase is kept as written rather than dropped or guessed at', () => {
  const [only] = parseSessionCell('Foot strain, recovering from marathon.');
  assert.equal(only.note, 'Foot strain, recovering from marathon.');
  assert.ok(only.name.length > 0);
});

test('every item carries its source phrase, always', () => {
  const cell = '90min steady aerobic bike Z2 + 15min brisk walk (transition practice)';
  for (const item of parseSessionCell(cell)) {
    assert.ok(item.note && cell.includes(item.note.split(' + ')[0]), `note missing for ${item.name}`);
  }
});

// ── the gate ────────────────────────────────────────────────────────────────

test('only a real session sentence is claimed by this reader', () => {
  assert.ok(looksLikeSessionText('75min bike Z2 w/ 3x8min Z3'));
  assert.ok(looksLikeSessionText('SWIM 1600yd: 10x100 build'));
  assert.ok(looksLikeSessionText('Full Rest Day'));
  assert.ok(looksLikeSessionText('goblet squat 3x10 • RDL 3x8 • split squat 2x8/side'));

  // These must keep going through the ordinary one-row-per-exercise reader.
  assert.equal(looksLikeSessionText('Barbell Bench Press'), false);
  assert.equal(looksLikeSessionText('Squat'), false);
  assert.equal(looksLikeSessionText(''), false);
});

// ── the whole week, end to end ──────────────────────────────────────────────

test('week 1 of the real plan reads as a week of training', () => {
  const week = [
    '75min bike Z2 w/ 3x8min Z3 + 30min upper-body strength',
    '60min easy bike Z2 + 45min brisk incline walk (gentle calf loading)',
    '90min steady aerobic bike Z2 + 15min brisk walk (transition practice)',
    '45min easy bike + calf rehab/mobility (as cleared) + leg strength + 30min walk',
    'SWIM 1200yd: technique focus, 8x100 Z2 + 4x50 drills + 20min easy row',
    'LONG RIDE 2.5h Z2 endurance (~38-42mi), rolling terrain',
    'Full Rest Day',
  ].map(parseSessionCell);

  assert.deepEqual(week.map((d) => d.length), [2, 2, 2, 4, 2, 1, 0], 'six training days and a rest day');

  const longRide = week[5][0];
  assert.equal(longRide.activity, 'bike');
  assert.equal(longRide.targetSec, min(150));
  near(longRide.targetMi, 38, 'the range floor');

  // Not one session in the week is left without a clock or a distance.
  const cardio = week.flat().filter((i) => i.kind === 'cardio');
  assert.equal(cardio.length, 10, 'six rides, two walks, a swim and a row');
  for (const c of cardio) {
    assert.ok(c.targetSec != null || c.targetMi != null, `${c.name} reached the athlete with no target`);
  }
});

test('a strength column is never read as cardio, whatever words are in it', () => {
  // Real cells from the plan's "Strength & Mobility" column. Every one of them trips a cardio keyword.
  const [bikeDay] = parseSessionCell('Bike-based strength today — no gym work needed', { strengthOnly: true });
  assert.equal(bikeDay.kind, 'strength', '"bike-based strength" is not a ride');

  const rehab = parseSessionCell('isometric calf hold 4x30s • walking lunge 2x10/side • single-leg calf raise 3x12', {
    strengthOnly: true,
  });
  assert.ok(rehab.every((i) => i.kind === 'strength'));
  assert.equal(rehab[1].name, 'walking lunge', 'a walking lunge is a lift');
});
