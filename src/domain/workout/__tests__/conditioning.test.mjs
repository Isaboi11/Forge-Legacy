import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CARDIO_ACTIVITIES,
  CARDIO_DEFAULTS,
  OUTDOOR_CAPABLE,
  STORED_TYPE,
  TRACKS_DISTANCE,
  hasRateTarget,
  FIRST_TARGET,
  activityFromKey,
  activitySymbol,
  avgPaceSec,
  bumpDistance,
  bumpPace,
  bumpSpeed,
  cardioKey,
  deriveEquip,
  deriveName,
  distanceLabel,
  effortLabel,
  fmtClock,
  fmtPace,
  isCardioKey,
  isLogged,
  newCardioBlock,
  parseClock,
  parseDistance,
  parsePace,
  parseWithin,
  sessionActivityType,
  setModality,
  usesSpeed,
} from '../conditioning.ts';

const id = (n) => n; // imperial identity, so the label tests read plainly

// ── the picker's three activities ────────────────────────────────────────────
test('the list is the seven activities — the activity is picked, the modality is chosen later', () => {
  assert.deepEqual(CARDIO_ACTIVITIES.map((a) => a.key), ['run', 'walk', 'bike', 'row', 'elliptical', 'stair', 'swim']);
  assert.deepEqual(CARDIO_ACTIVITIES.map((a) => a.name),
    ['Run', 'Walk', 'Ride', 'Row', 'Elliptical', 'Stair Climber', 'Swim']);
});

/*
 * ══ THE MACHINES ARE NOT RUNS ══
 *
 * Three properties separate them, and each one exists because collapsing it would make the app claim
 * something untrue about the session.
 */

test('only run, walk and ride can go outdoors', () => {
  const outdoor = CARDIO_ACTIVITIES.filter((a) => OUTDOOR_CAPABLE[a.key]).map((a) => a.key);
  assert.deepEqual(outdoor, ['run', 'walk', 'bike'], 'a rower has no road');
});

test('an indoor-only activity never takes an outdoor name, even if asked', () => {
  // `deriveName` is called with whatever modality the block carries; a machine must not become
  // "Outdoor Row" because a stale modality came through.
  assert.equal(deriveName('row', 'outdoor'), 'Row');
  assert.equal(deriveName('swim', 'outdoor'), 'Pool Swim');
  // And the road-capable ones still honour the toggle.
  assert.equal(deriveName('run', 'outdoor'), 'Outdoor Run');
  assert.equal(deriveName('run', 'indoor'), 'Treadmill Run');
  assert.equal(deriveName('bike', 'indoor'), 'Indoor Ride', 'there is no treadmill for a bicycle');
  assert.equal(deriveName('row', 'indoor'), 'Row', 'nor for a rower');
});

test('the stair climber measures no distance, because floors are not miles', () => {
  assert.equal(TRACKS_DISTANCE.stair, false);
  for (const k of ['run', 'walk', 'bike', 'row', 'elliptical', 'swim']) {
    assert.equal(TRACKS_DISTANCE[k], true, k);
  }
});

test('a machine offers no pace or speed target — neither is a metric it has', () => {
  assert.equal(usesSpeed('bike'), true, 'a cyclist thinks in mph');
  assert.equal(usesSpeed('run'), false, 'a runner thinks in min/mi');
  for (const k of ['row', 'elliptical', 'swim', 'stair']) {
    assert.equal(hasRateTarget(k), false, `${k} has no per-mile rate anybody in that sport uses`);
    assert.equal(usesSpeed(k), false, k);
  }
});

test('every activity files under a distinct stored type', () => {
  const stored = CARDIO_ACTIVITIES.map((a) => STORED_TYPE[a.key]);
  assert.equal(new Set(stored).size, stored.length,
    'two activities sharing one enum value would merge them in Activity History');
  assert.deepEqual(stored,
    ['running', 'walking', 'cycling', 'rowing', 'elliptical', 'stair_climber', 'swimming']);
});

test('cardioKey round-trips, and a strength key is never mistaken for one', () => {
  for (const a of CARDIO_ACTIVITIES) {
    assert.equal(isCardioKey(cardioKey(a.key)), true);
    assert.equal(activityFromKey(cardioKey(a.key)), a.key);
  }
  assert.equal(isCardioKey('barbell-back-squat'), false);
  assert.equal(activityFromKey('barbell-back-squat'), null);
  assert.equal(activityFromKey(null), null);
  assert.equal(activityFromKey('cardio:swimming'), null, 'an unknown activity resolves to null, not a bad type');
});

// ── name / equip derivation (spec 2.5) ───────────────────────────────────────
test('deriveName: the block always states what it is', () => {
  assert.equal(deriveName('run', 'outdoor'), 'Outdoor Run');
  assert.equal(deriveName('run', 'indoor'), 'Treadmill Run');
  assert.equal(deriveName('walk', 'outdoor'), 'Outdoor Walk');
  assert.equal(deriveName('walk', 'indoor'), 'Treadmill Walk');
});

test('deriveName: a bike gets Indoor Ride — there is no treadmill for a bicycle', () => {
  assert.equal(deriveName('bike', 'outdoor'), 'Outdoor Ride');
  assert.equal(deriveName('bike', 'indoor'), 'Indoor Ride');
});

test('deriveEquip: Road outdoors, Treadmill indoors, Trainer for a bike', () => {
  assert.equal(deriveEquip('run', 'outdoor'), 'Road');
  assert.equal(deriveEquip('run', 'indoor'), 'Treadmill');
  assert.equal(deriveEquip('bike', 'indoor'), 'Trainer');
});

test('setModality rewrites name and equip together, and no-ops when already selected', () => {
  const b = newCardioBlock('run');
  const indoor = setModality(b, 'indoor');
  assert.equal(indoor.name, 'Treadmill Run');
  assert.equal(indoor.equip, 'Treadmill');
  assert.equal(indoor.modality, 'indoor');
  assert.equal(setModality(indoor, 'indoor'), indoor, 'same object back — nothing to change');
});

test('setModality preserves the targets — switching where you run is not editing the program', () => {
  // Set targets explicitly — a new block has none to preserve, which is not what's under test here.
  const authored = { ...newCardioBlock('run'), targetMi: 3, targetPaceSec: 495 };
  const b = setModality(authored, 'indoor');
  assert.equal(b.targetMi, 3);
  assert.equal(b.targetPaceSec, 495);
  assert.equal(b.name, 'Treadmill Run');
});

// ── the glyph is keyed off activity (spec 2.4) ───────────────────────────────
test('the glyph follows ACTIVITY, so Run and Walk never collide on shared equipment', () => {
  assert.equal(activitySymbol('run'), 'shoe');
  assert.equal(activitySymbol('walk'), 'footprints');
  assert.equal(activitySymbol('bike'), 'bicycle');
  // Both are 'Road' outdoors — keying off equip would render them identically.
  assert.equal(deriveEquip('run', 'outdoor'), deriveEquip('walk', 'outdoor'));
  assert.notEqual(activitySymbol('run'), activitySymbol('walk'));
});

// ── defaults ─────────────────────────────────────────────────────────────────
//
// DELIBERATE DEVIATION from the handoff's §2.2 table, which authored 3 mi @ 8:15 / 2 mi @ 17:30 /
// 10 mi @ 17 mph. Those arrived in an author's program looking exactly like a prescription they had
// written, and "just go for a run" cost six taps to undo. A target is now something you set, not
// something you inherit.
test('a new block starts OPEN — a target is a decision, not a default', () => {
  for (const a of ['run', 'walk', 'bike']) {
    assert.equal(CARDIO_DEFAULTS[a].targetMi, null, `${a} arrived with a distance nobody chose`);
    assert.equal(newCardioBlock(a).targetMi, null);
  }
  assert.equal(CARDIO_DEFAULTS.run.targetPaceSec, null);
  assert.equal(CARDIO_DEFAULTS.walk.targetPaceSec, null);
  assert.equal(CARDIO_DEFAULTS.bike.targetSpdMph, null);
});

test('the shape of the activity IS still a default — only the demands were removed', () => {
  assert.equal(CARDIO_DEFAULTS.run.name, 'Outdoor Run');
  assert.equal(CARDIO_DEFAULTS.bike.equip, 'Road');
  assert.equal(CARDIO_DEFAULTS.walk.modality, 'outdoor');
});

test('a ride carries speed and no pace; a run the reverse', () => {
  assert.equal(usesSpeed('bike'), true);
  assert.equal(usesSpeed('run'), false);
  assert.equal(CARDIO_DEFAULTS.bike.targetPaceSec, undefined);
  assert.equal(CARDIO_DEFAULTS.run.targetSpdMph, undefined);
});

test('the first tap up from Open lands on an ordinary session, not the smallest legal one', () => {
  // Open is now the starting point, so this seed is what someone gets the moment they want a target.
  assert.equal(bumpDistance(null, 1, FIRST_TARGET.run.mi), 3);
  assert.equal(bumpDistance(null, 1, FIRST_TARGET.walk.mi), 2);
  assert.equal(bumpDistance(null, 1, FIRST_TARGET.bike.mi), 10);
  assert.equal(bumpPace(null, 1, FIRST_TARGET.walk.paceSec), 1050);
  assert.equal(bumpSpeed(null, 1, FIRST_TARGET.bike.spdMph), 17);
  // And stepping back down still reaches Open rather than sticking at the seed.
  assert.equal(bumpDistance(0.5, -1, FIRST_TARGET.run.mi), null);
});

test('newCardioBlock hands back a copy — two blocks in one day must not share a target', () => {
  const a = newCardioBlock('run');
  const b = newCardioBlock('run');
  a.targetMi = 10;
  assert.equal(b.targetMi, null);
});

// ── steppers: Open at the bottom (spec 2.6) ──────────────────────────────────
test('distance: stepping below the minimum CLEARS the target rather than clamping', () => {
  assert.equal(bumpDistance(1, -1), 0.5);
  assert.equal(bumpDistance(0.5, -1), null, 'below 0.5 is Open, not 0');
});

test('distance: + from Open seeds the minimum, - from Open stays Open', () => {
  assert.equal(bumpDistance(null, 1), 0.5);
  assert.equal(bumpDistance(null, -1), null);
});

test('distance: the marathon is the ceiling, and float drift never shows', () => {
  assert.equal(bumpDistance(26.2, 1), 26.2);
  assert.equal(bumpDistance(3, 1), 3.5);
  assert.equal(bumpDistance(3.5, 1), 4);
});

test('pace: + is SLOWER, and below 5:00 clears to Any', () => {
  assert.equal(bumpPace(495, 1), 500, 'a bigger number is a slower pace');
  assert.equal(bumpPace(300, -1), null);
  assert.equal(bumpPace(null, 1), 495);
  assert.equal(bumpPace(1200, 1), 1200);
});

test('speed: + is FASTER, and below 6 mph clears to Any', () => {
  assert.equal(bumpSpeed(17, 1), 17.5);
  assert.equal(bumpSpeed(6, -1), null);
  assert.equal(bumpSpeed(null, 1), 17);
  assert.equal(bumpSpeed(30, 1), 30);
});

test('all four combinations are reachable from two steppers', () => {
  // fully open (where a block now starts) · 3 mi @ any pace · open @ 8:15 · 3 mi @ 8:15
  const base = newCardioBlock('run');
  assert.equal(base.targetMi, null);
  assert.equal(base.targetPaceSec, null);
  const mi = bumpDistance(base.targetMi, 1, FIRST_TARGET.run.mi);
  assert.equal(mi, 3, 'one tap gives a distance');
  const pace = bumpPace(base.targetPaceSec, 1, FIRST_TARGET.run.paceSec);
  assert.equal(pace, 495, 'one tap gives a pace');
  assert.equal(bumpPace(300, -1), null, 'and either drops back out');
  assert.equal(bumpDistance(0.5, -1), null);
});

// ── labels ───────────────────────────────────────────────────────────────────
test('distanceLabel says Open, never 0', () => {
  assert.equal(distanceLabel(null, id), 'Open');
  assert.equal(distanceLabel(3, id), '3.0');
});

test('effortLabel says Any for a cleared target, and speaks speed for a ride', () => {
  const run = newCardioBlock('run');
  assert.equal(effortLabel(run, id, id), 'Any', 'a new block prescribes no pace');
  assert.equal(effortLabel({ ...run, targetPaceSec: 495 }, id, id), '8:15');
  const ride = newCardioBlock('bike');
  assert.equal(effortLabel({ ...ride, targetSpdMph: 17 }, id, id), '17.0');
  assert.equal(effortLabel({ ...ride, targetSpdMph: null }, id, id), 'Any');
});

test('fmtPace floors so a pace never renders as ":60"', () => {
  assert.equal(fmtPace(495), '8:15');
  assert.equal(fmtPace(479.99), '7:59');
  assert.equal(fmtPace(null), '--:--');
  assert.equal(fmtPace(0), '--:--');
});

test('fmtClock hides the hour under one and never over', () => {
  assert.equal(fmtClock(0), '0:00');
  assert.equal(fmtClock(1485), '24:45');
  assert.equal(fmtClock(3725), '1:02:05');
  assert.equal(fmtClock(null), '0:00');
});

// ── computed pace ────────────────────────────────────────────────────────────
test('avgPaceSec: real once there is distance, null when a half is missing', () => {
  assert.equal(avgPaceSec(3, 1485), 495);
  assert.equal(avgPaceSec(0, 1485), null);
  assert.equal(avgPaceSec(3, 0), null);
  assert.equal(avgPaceSec(null, 600), null);
});

test('avgPaceSec: a trivial distance yields nothing rather than an absurd pace', () => {
  assert.equal(avgPaceSec(0.02, 600), null, '0.02 mi in 10 minutes is not an 8-hour mile, it is noise');
});

// ── logged state ─────────────────────────────────────────────────────────────
test('isLogged needs BOTH numbers — a distance with no time is not a session', () => {
  assert.equal(isLogged(null), false);
  assert.equal(isLogged({ distanceMi: 3, timeSec: null }), false);
  assert.equal(isLogged({ distanceMi: null, timeSec: 1485 }), false);
  assert.equal(isLogged({ distanceMi: 3, timeSec: 1485 }), true);
});

// ── typed distance ───────────────────────────────────────────────────────────
test('parseDistance accepts plain, decimal and comma-decimal input', () => {
  assert.equal(parseDistance('3'), 3);
  assert.equal(parseDistance('3.1'), 3.1);
  assert.equal(parseDistance('3,1'), 3.1);
  assert.equal(parseDistance(' .5 '), 0.5);
});

test('parseDistance rejects anything that would store a distance nobody ran', () => {
  for (const bad of ['', 'abc', '-3', '0', '3.1.4', '1e3', '9999']) {
    assert.equal(parseDistance(bad), null, `${bad} should be rejected`);
  }
});

// ── typed clock, pace and plain numbers ──────────────────────────────────────
//
// From the PO: *"would be nice to have the option to click and enter the time. Mainly a factor when
// making big adjustments and having to click the plus or minus button several times."* TIME stepped in
// fifteen-second jumps, so a 42:30 race was 170 taps from a seeded zero. These are the parsers that
// make the field typeable, and the rejections matter more than the acceptances: a field whose job is
// to REPLACE a number must refuse rather than guess, or a fat-fingered entry silently rewrites a race.

test('parseClock reads the colon forms a runner would type', () => {
  assert.equal(parseClock('42:30'), 2550);
  assert.equal(parseClock('0:45'), 45);
  assert.equal(parseClock('1:05:20'), 3920);
});

test('a bare number in a time field is MINUTES — it is what people mean by "I did forty-five"', () => {
  // Reading 45 as 45 seconds would be arithmetically defensible and would file a marathon as a warm-up.
  assert.equal(parseClock('45'), 45 * 60);
  assert.equal(parseClock('1'), 60);
});

test('parseClock refuses a typo rather than reinterpreting it', () => {
  assert.equal(parseClock('42:75'), null); // not 43:15 — that is a decision the athlete did not make
  assert.equal(parseClock('1:05:99'), null);
  for (const bad of ['', 'abc', '-5', '42:', ':30', '1:2:3:4', '0', '13:00:00']) {
    assert.equal(parseClock(bad), null, `${bad} should be rejected`);
  }
});

test('parsePace accepts mm:ss and a bare minutes-per-unit', () => {
  assert.equal(parsePace('8:30'), 510);
  assert.equal(parsePace('8'), 480);
});

test('parsePace holds the same window the steppers walk — typing cannot reach what stepping cannot', () => {
  assert.equal(parsePace('1:30'), null); // faster than the 2:00 floor
  assert.equal(parsePace('45'), null); // slower than the 40:00 ceiling
  assert.equal(parsePace('8:75'), null);
});

test('parseWithin bounds a plain decimal, and tolerates a comma keypad and a stray percent sign', () => {
  assert.equal(parseWithin('7.5', 0, 15), 7.5);
  assert.equal(parseWithin('7,5', 0, 15), 7.5);
  assert.equal(parseWithin('3%', 0, 15), 3);
  assert.equal(parseWithin('0', 0, 15), 0); // zero incline is a real answer, unlike zero distance
  assert.equal(parseWithin('20', 0, 15), null);
  assert.equal(parseWithin('-1', 0, 15), null);
});

test('a rejected parse is null, never NaN — the caller leaves the old value standing', () => {
  for (const fn of [parseClock, parsePace, parseDistance]) {
    const out = fn('nonsense');
    assert.equal(out, null);
    assert.ok(!Number.isNaN(out));
  }
});

// ── what a session IS ────────────────────────────────────────────────────────
//
// A run that was the whole session used to save as `activity_type: 'strength'`. The distance sat in the
// row and nothing looked at it: Activity History filed it with the bench presses, the rank engine
// counted it STRENGTH, and the run-records lookup asks for 'running' and found nothing.
test('a session that is only a run is filed as a run', () => {
  const one = [{ kind: 'cardio', activity: 'run' }];
  assert.equal(sessionActivityType(one, 'strength'), 'running');
  assert.equal(sessionActivityType([{ kind: 'cardio', activity: 'walk' }], 'strength'), 'walking');
  assert.equal(sessionActivityType([{ kind: 'cardio', activity: 'bike' }], 'strength'), 'cycling');
});

test('a lift day with a cool-down walk stays a strength workout', () => {
  const mixed = [
    { kind: 'strength' },
    { kind: 'strength' },
    { kind: 'cardio', activity: 'walk' },
  ];
  assert.equal(sessionActivityType(mixed, 'strength'), 'strength', 'the last five minutes must not rename the day');
});

test('two different cardio kinds in one session claim neither', () => {
  const brick = [{ kind: 'cardio', activity: 'bike' }, { kind: 'cardio', activity: 'run' }];
  assert.equal(sessionActivityType(brick, 'strength'), 'strength');
});

test('several bouts of the SAME activity still count as that activity', () => {
  const intervals = [
    { kind: 'cardio', activity: 'run' },
    { kind: 'cardio', activity: 'run' },
  ];
  assert.equal(sessionActivityType(intervals, 'strength'), 'running');
});

test('an empty session keeps its fallback rather than inventing a type', () => {
  assert.equal(sessionActivityType([], 'strength'), 'strength');
});
