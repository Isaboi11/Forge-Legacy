import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CARDIO_ACTIVITIES,
  CARDIO_DEFAULTS,
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
  parseDistance,
  setModality,
  usesSpeed,
} from '../conditioning.ts';

const id = (n) => n; // imperial identity, so the label tests read plainly

// ── the picker's three activities ────────────────────────────────────────────
test('the list is Run, Walk, Ride — the activity is picked, the modality is chosen later', () => {
  assert.deepEqual(CARDIO_ACTIVITIES.map((a) => a.key), ['run', 'walk', 'bike']);
  assert.deepEqual(CARDIO_ACTIVITIES.map((a) => a.name), ['Run', 'Walk', 'Ride']);
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
  const b = setModality(newCardioBlock('run'), 'indoor');
  assert.equal(b.targetMi, 3);
  assert.equal(b.targetPaceSec, 495);
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

// ── defaults (spec 2.2) ──────────────────────────────────────────────────────
test('authored defaults match the handoff table', () => {
  assert.equal(CARDIO_DEFAULTS.run.targetMi, 3);
  assert.equal(CARDIO_DEFAULTS.run.targetPaceSec, 495); // 8:15/mi
  assert.equal(CARDIO_DEFAULTS.walk.targetMi, 2);
  assert.equal(CARDIO_DEFAULTS.walk.targetPaceSec, 1050); // 17:30/mi
  assert.equal(CARDIO_DEFAULTS.bike.targetMi, 10);
  assert.equal(CARDIO_DEFAULTS.bike.targetSpdMph, 17);
});

test('a ride carries speed and no pace; a run the reverse', () => {
  assert.equal(usesSpeed('bike'), true);
  assert.equal(usesSpeed('run'), false);
  assert.equal(CARDIO_DEFAULTS.bike.targetPaceSec, undefined);
  assert.equal(CARDIO_DEFAULTS.run.targetSpdMph, undefined);
});

test('newCardioBlock hands back a copy — two blocks in one day must not share a target', () => {
  const a = newCardioBlock('run');
  const b = newCardioBlock('run');
  a.targetMi = 10;
  assert.equal(b.targetMi, 3);
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

test('all four authored combinations are reachable from two steppers', () => {
  // 3 mi @ 8:15 · 3 mi @ any pace · open @ 8:15 · fully open
  const base = newCardioBlock('run');
  assert.ok(base.targetMi != null && base.targetPaceSec != null);
  assert.equal(bumpPace(300, -1), null, 'drop the pace out');
  assert.equal(bumpDistance(0.5, -1), null, 'drop the distance out');
  assert.equal(bumpDistance(null, 1), 0.5, 'and bring either back');
});

// ── labels ───────────────────────────────────────────────────────────────────
test('distanceLabel says Open, never 0', () => {
  assert.equal(distanceLabel(null, id), 'Open');
  assert.equal(distanceLabel(3, id), '3.0');
});

test('effortLabel says Any for a cleared target, and speaks speed for a ride', () => {
  const run = newCardioBlock('run');
  assert.equal(effortLabel(run, id, id), '8:15');
  assert.equal(effortLabel({ ...run, targetPaceSec: null }, id, id), 'Any');
  const ride = newCardioBlock('bike');
  assert.equal(effortLabel(ride, id, id), '17.0');
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
