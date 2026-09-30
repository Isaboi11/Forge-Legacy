/**
 * rest-notification-model.test.mjs — the rest timer rings with the phone locked.
 *
 * PO, 2026-09-30: *"the timer sound isn't working when my phone is off or if I'm on a different app."*
 *
 * The scheduling itself runs against `expo-notifications`, which `node --test` cannot load, so the pure
 * rules are tested for real and the wiring is guarded as source text — each assertion below is a way
 * this feature could look finished and ring nothing, ring twice, or throw the athlete out of a workout.
 *
 * Run:  node --test --experimental-strip-types src/lib/__tests__/rest-notification-model.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { LATE_MS, REST_DONE_KIND, dingOnExpiry, isRestDone, restDoneDelaySec } from '../rest-notification-model.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(path.join(here, rel), 'utf8');
const DEVICE = read('../rest-notification.ts');
const PUSH = read('../push.tsx');
const WORKOUT = read('../../app/workout.tsx');

test('the delay is whole seconds, rounded UP — never early', () => {
  assert.equal(restDoneDelaySec(90_000, 0), 90);
  assert.equal(restDoneDelaySec(90_000, 400), 90); // 89.6s left still rings at 90, not 89
  assert.equal(restDoneDelaySec(1_000, 0), 1);
});

test('⚠ a rest that is over (or about to be) schedules nothing — iOS rejects a zero interval', () => {
  assert.equal(restDoneDelaySec(1_000, 1_000), null);
  assert.equal(restDoneDelaySec(1_000, 5_000), null);
});

test('⚠ the in-app ding does not ring a second time when the athlete comes back late', () => {
  assert.equal(dingOnExpiry(300, true), true, 'on screen, on time: ding');
  assert.equal(dingOnExpiry(LATE_MS + 1, true), false, 'back late and the notification already rang: no ding');
  assert.equal(dingOnExpiry(60_000, false), true, 'notifications off: the late ding is the only sound there is');
});

test('only our own tag is recognised', () => {
  assert.equal(isRestDone({ kind: REST_DONE_KIND }), true);
  assert.equal(isRestDone({ kind: 'progress_photo' }), false);
  assert.equal(isRestDone(null), false);
  assert.equal(isRestDone('rest_done'), false);
});

test('⚠ the notification carries a sound — without it this is a silent banner', () => {
  assert.match(DEVICE, /sound: 'default'/);
  assert.match(DEVICE, /data: \{ kind: REST_DONE_KIND \}/);
});

test('⚠ it never prompts mid-set, and never cancels another feature\'s notifications', () => {
  assert.doesNotMatch(DEVICE, /requestPermissionsAsync\(/);
  assert.doesNotMatch(DEVICE, /cancelAllScheduledNotificationsAsync\(/);
  assert.ok(
    DEVICE.indexOf('cancelScheduledNotificationAsync(REST_DONE_ID)') < DEVICE.indexOf('scheduleNotificationAsync({'),
    'cancel before schedule, or ±15s leaves the old time ringing too',
  );
});

test('⚠ a tapped "Rest complete" goes nowhere — the catch-all would push /inbox over the workout', () => {
  const go = PUSH.slice(PUSH.indexOf('const go = ('));
  assert.ok(go.indexOf('isRestDone(') > -1 && go.indexOf('isRestDone(') < go.indexOf('router.push('));
});

test('on screen it shows nothing — the ding and the toast already said it', () => {
  assert.match(PUSH, /shouldShowBanner: !quiet/);
});

test('the workout hands every deadline change to the OS, and clears it on leaving', () => {
  assert.match(WORKOUT, /syncRestDone\(soundOn && restEndsAt != null && !restPaused \? restEndsAt : null\)/);
  assert.match(WORKOUT, /useEffect\(\(\) => \(\) => syncRestDone\(null\), \[\]\)/);
});

test('⚠ expiry in the background is left to the OS — expiring there cancels the ring a moment early', () => {
  const tick = WORKOUT.slice(WORKOUT.indexOf('if (ms >= restEndsAt)'));
  assert.ok(tick.indexOf('restExpiryDeferred()') < tick.indexOf('setRestEndsAt(null)'));
});
