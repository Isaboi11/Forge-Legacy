import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MARKER_STALE_SEC,
  crossedAtMs,
  durationWords,
  markerLabel,
  markerSpeech,
  observeRun,
  splitUnitFor,
} from '../mile-marker.ts';

/**
 * The mile marker — chime, buzz and spoken split each mile (or km). PO 2026-09-28.
 *
 * The failures under test are the ones an athlete would HEAR: a split said twice, two splits said back to
 * back, a split said minutes late, and a marker replayed after the app came back. Every one of them has to
 * resolve to "at most one announcement, at the right mile, with an honest number or none".
 */

const T0 = Date.parse('2026-09-28T07:00:00.000Z');
const KM_PER_MI = 1.609344;

/** Feed a sequence of observations; collect every marker that fired. */
function run(observations, initial = null) {
  let state = initial;
  const markers = [];
  for (const o of observations) {
    const r = observeRun(state, o);
    state = r.state;
    if (r.marker) markers.push(r.marker);
  }
  return { state, markers };
}

/** A steady run: `secPerMile` pace, one observation a second, for `seconds`. Track points carry wall time. */
function steady(secPerMile, seconds, { unit = 'mi', startSec = 0, startMi = 0, track = [] } = {}) {
  const out = [];
  for (let s = startSec; s <= startSec + seconds; s += 1) {
    const mi = startMi + (s - startSec) / secPerMile;
    track.push({ mi, at: T0 + s * 1000 });
    out.push({ miles: mi, elapsedSec: s, unit, track: [...track], nowMs: T0 + s * 1000 });
  }
  return out;
}

test('a fresh run is silent until the first mile, then says it once with the split', () => {
  const { markers } = run(steady(522, 600)); // 8:42 / mi for ten minutes
  assert.equal(markers.length, 1);
  assert.equal(markers[0].index, 1);
  assert.equal(markers[0].unit, 'mi');
  assert.ok(Math.abs(markers[0].splitSec - 522) <= 1, `split ${markers[0].splitSec}`);
  assert.equal(markers[0].averaged, false);
});

test('each mile fires exactly once, and every split is that mile alone', () => {
  const { markers } = run(steady(480, 480 * 3 + 30));
  assert.deepEqual(markers.map((m) => m.index), [1, 2, 3]);
  for (const m of markers) assert.ok(Math.abs(m.splitSec - 480) <= 1, `split ${m.splitSec}`);
});

test('observing the same moment over and over never fires twice (the screen re-renders every second)', () => {
  const obs = steady(300, 305);
  const repeated = obs.flatMap((o) => [o, o, o]);
  const { markers } = run(repeated);
  assert.equal(markers.length, 1);
});

test('without a track it still works, interpolating between readings', () => {
  const obs = [
    { miles: 0, elapsedSec: 0, unit: 'mi' },
    { miles: 0.9, elapsedSec: 450, unit: 'mi' },
    { miles: 1.1, elapsedSec: 550, unit: 'mi' },
  ];
  const { markers } = run(obs);
  assert.equal(markers.length, 1);
  assert.equal(Math.round(markers[0].splitSec), 500, 'the boundary fell halfway between the readings');
});

test('GPS jitter around a boundary fires once, not on every wobble across it', () => {
  const obs = [
    { miles: 0, elapsedSec: 0, unit: 'mi' },
    { miles: 0.9999, elapsedSec: 500, unit: 'mi' },
    { miles: 1.0001, elapsedSec: 501, unit: 'mi' },
    { miles: 0.9998, elapsedSec: 502, unit: 'mi' }, // the provisional head refined backwards
    { miles: 1.0003, elapsedSec: 503, unit: 'mi' },
    { miles: 1.0004, elapsedSec: 504, unit: 'mi' },
  ];
  const { markers } = run(obs);
  assert.equal(markers.length, 1);
});

test('a burst of two miles in one drain is ONE announcement — the newest mile, averaged', () => {
  const track = [];
  const before = steady(480, 400, { track }); // 0.83 mi
  // Phone away: the next reading is two drained miles later, recorded as it went.
  for (let s = 401; s <= 1000; s += 1) track.push({ mi: s / 480, at: T0 + s * 1000 });
  const drained = { miles: 1000 / 480, elapsedSec: 1000, unit: 'mi', track: [...track], nowMs: T0 + 1000 * 1000 };
  const { markers } = run([...before, drained]);
  assert.equal(markers.length, 1);
  assert.equal(markers[0].index, 2);
  assert.equal(markers[0].averaged, true);
  assert.ok(Math.abs(markers[0].splitSec - 480) <= 1, `average ${markers[0].splitSec}`);
});

test('⚠ a marker crossed long ago is passed SILENTLY — even though the clock jumped first', () => {
  // JS asleep while locked: at unlock the clock ticks to 1200 before the drain lands.
  const track = [];
  const before = steady(480, 300, { track });
  const clockJump = { miles: 300 / 480, elapsedSec: 1200, unit: 'mi', track: [...track], nowMs: T0 + 1200 * 1000 };
  for (let s = 301; s <= 1200; s += 1) track.push({ mi: s / 480, at: T0 + s * 1000 });
  const drained = { miles: 1200 / 480, elapsedSec: 1201, unit: 'mi', track: [...track], nowMs: T0 + 1201 * 1000 };
  const { state, markers } = run([...before, clockJump, drained]);
  assert.equal(markers.length, 0, 'mile 2 was crossed at 960 s — four minutes ago');
  assert.equal(state.passed, 2, 'and it can never fire afterwards');
  // The NEXT mile is on time and its split is measured from where mile 2 really fell (960 s).
  const after = [];
  for (let s = 1202; s <= 1450; s += 1) {
    track.push({ mi: s / 480, at: T0 + s * 1000 });
    after.push({ miles: s / 480, elapsedSec: s, unit: 'mi', track: [...track], nowMs: T0 + s * 1000 });
  }
  const next = run(after, state).markers;
  assert.equal(next.length, 1);
  assert.equal(next[0].index, 3);
  assert.ok(Math.abs(next[0].splitSec - 480) <= 2, `split ${next[0].splitSec}`);
});

test('a marker just inside the stale window still speaks', () => {
  const track = [];
  const before = steady(480, 470, { track });
  const late = MARKER_STALE_SEC - 10;
  for (let s = 471; s <= 480 + late; s += 1) track.push({ mi: s / 480, at: T0 + s * 1000 });
  const drained = { miles: (480 + late) / 480, elapsedSec: 480 + late, unit: 'mi', track: [...track], nowMs: T0 + (480 + late) * 1000 };
  const { markers } = run([...before, drained]);
  assert.equal(markers.length, 1);
  assert.ok(Math.abs(markers[0].splitSec - 480) <= 1);
});

test('pause and resume: the paused minutes are not in the split', () => {
  const obs = [{ miles: 0, elapsedSec: 0, unit: 'mi' }];
  for (let s = 1; s <= 240; s += 1) obs.push({ miles: s / 480, elapsedSec: s, unit: 'mi' });
  // Paused for five minutes: the moving clock and the distance both hold.
  for (let i = 0; i < 300; i += 1) obs.push({ miles: 240 / 480, elapsedSec: 240, unit: 'mi' });
  for (let s = 241; s <= 500; s += 1) obs.push({ miles: s / 480, elapsedSec: s, unit: 'mi' });
  const { markers } = run(obs);
  assert.equal(markers.length, 1);
  assert.equal(Math.round(markers[0].splitSec), 480);
});

test('kilometres: markers every km, splits per km', () => {
  const secPerKm = 300; // 5:00 / km
  const secPerMile = secPerKm * KM_PER_MI;
  const { markers } = run(steady(secPerMile, 920, { unit: 'km' }));
  assert.deepEqual(markers.map((m) => [m.index, m.unit]), [[1, 'km'], [2, 'km'], [3, 'km']]);
  for (const m of markers) assert.ok(Math.abs(m.splitSec - 300) <= 1, `split ${m.splitSec}`);
  assert.equal(splitUnitFor('metric'), 'km');
  assert.equal(splitUnitFor('imperial'), 'mi');
});

test('switching units mid-run never bursts, and the first split after it is not guessed', () => {
  const track = [];
  const miles = steady(480, 1000, { track }); // 2.08 mi = 3.35 km
  const first = run(miles);
  assert.equal(first.markers.length, 2);
  // Switch to km at 3.35 km: kilometres 1, 2 and 3 must NOT be announced now.
  const switched = run([{ miles: 1000 / 480, elapsedSec: 1000, unit: 'km' }], first.state);
  assert.equal(switched.markers.length, 0);
  // At 4 km the marker fires, without a split — its start was never observed in km.
  const on = [];
  for (let s = 1001; s <= 1250; s += 1) on.push({ miles: s / 480, elapsedSec: s, unit: 'km' });
  const later = run(on, switched.state);
  assert.equal(later.markers.length, 1);
  assert.equal(later.markers[0].index, 4);
  assert.equal(later.markers[0].splitSec, null);
});

test('a remount mid-run (JS reload, app relaunched) replays nothing', () => {
  const { markers, state } = run([{ miles: 2.5, elapsedSec: 1200, unit: 'mi' }, { miles: 2.6, elapsedSec: 1250, unit: 'mi' }]);
  assert.equal(markers.length, 0);
  const next = run([{ miles: 3.01, elapsedSec: 1450, unit: 'mi' }], state);
  assert.equal(next.markers.length, 1);
  assert.equal(next.markers[0].index, 3);
  assert.equal(next.markers[0].splitSec, null, 'mile 3 began before this mount saw it');
});

test('a second bout on the same card starts counting again from zero', () => {
  const firstBout = run(steady(480, 600));
  assert.equal(firstBout.markers.length, 1);
  // `start()` zeroes the track and the clock.
  const second = run(steady(480, 500), firstBout.state);
  assert.equal(second.markers.length, 1);
  assert.equal(second.markers[0].index, 1);
  assert.ok(Math.abs(second.markers[0].splitSec - 480) <= 1);
});

test('garbage in is silence, not a crash', () => {
  const r = observeRun(null, { miles: Number.NaN, elapsedSec: 10, unit: 'mi' });
  assert.equal(r.marker, null);
  const r2 = observeRun(r.state, { miles: 5, elapsedSec: Number.POSITIVE_INFINITY, unit: 'mi' });
  assert.equal(r2.marker, null);
});

test('crossedAtMs finds the first point at or past a distance', () => {
  const track = [{ mi: 0, at: 1 }, { mi: 0.5, at: 2 }, { mi: 1.0, at: 3 }, { mi: 1.5, at: 4 }];
  assert.equal(crossedAtMs(track, 1), 3);
  assert.equal(crossedAtMs(track, 0.7), 3);
  assert.equal(crossedAtMs(track, 2), null);
  assert.equal(crossedAtMs([], 1), null);
});

// ── words ────────────────────────────────────────────────────────────────────

test('durations read the way a person says them', () => {
  assert.equal(durationWords(522), '8 minutes 42 seconds');
  assert.equal(durationWords(540), '9 minutes');
  assert.equal(durationWords(45), '45 seconds');
  assert.equal(durationWords(61), '1 minute 1 second');
  assert.equal(durationWords(3725), '1 hour 2 minutes 5 seconds');
  assert.equal(durationWords(0), '0 seconds');
  assert.equal(durationWords(521.6), '8 minutes 42 seconds', 'rounded to the second');
});

test('what is spoken: short and plain', () => {
  assert.equal(markerSpeech({ index: 3, unit: 'mi', splitSec: 522, averaged: false }), 'Mile 3. 8 minutes 42 seconds.');
  assert.equal(markerSpeech({ index: 5, unit: 'km', splitSec: 300, averaged: false }), 'Kilometer 5. 5 minutes.');
  assert.equal(markerSpeech({ index: 2, unit: 'mi', splitSec: 480, averaged: true }), 'Mile 2. Averaging 8 minutes.');
  assert.equal(markerSpeech({ index: 4, unit: 'km', splitSec: null, averaged: false }), 'Kilometer 4.');
});

test('what is shown: the same fact as a clock', () => {
  assert.equal(markerLabel({ index: 3, unit: 'mi', splitSec: 522, averaged: false }), 'Mile 3 · 8:42');
  assert.equal(markerLabel({ index: 2, unit: 'mi', splitSec: 480, averaged: true }), 'Mile 2 · avg 8:00');
  assert.equal(markerLabel({ index: 4, unit: 'km', splitSec: null, averaged: false }), 'Kilometer 4');
});
