/**
 * photo-reminder.test.mjs — ⚠ **a switch that reported success and did nothing.**
 *
 * PO, 2026-08-21: *"hasn't sent any reminders for progress pics even though I did."*
 *
 * `/transformation`'s Capture reminder wrote `forge.xform.remind` to AsyncStorage and **nothing in the
 * app read that key** — no scheduler, no notification kind, no job. The switch moved, the row said
 * "On · monthly", and the app did nothing, with no error to find.
 *
 * The scheduling itself lives against `expo-notifications`, a native module `node --test` cannot load,
 * so what is guarded here is the part that is pure and the part that was silently wrong: **where the tap
 * goes.** Without its own arm, `progress_photo` falls through `destinationFor`'s catch-all — which, with
 * no `squadId`, lands on `/inbox`: a screen that will never hold this reminder, because a local
 * notification writes no feed row. That is a bug that LOOKS like it works.
 *
 * Run:  node --test --experimental-strip-types src/domain/notifications/__tests__/photo-reminder.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { destinationFor } from '../destination.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(path.join(here, '../../../lib/photo-reminder.ts'), 'utf8');

test('⭐ tapping the reminder opens the archive, not the inbox', () => {
  assert.equal(destinationFor({ kind: 'progress_photo' }), '/transformation');
});

test('⚠ it does not reach the catch-all — the failure that would look like success', () => {
  // The catch-all with no squad returns '/inbox'. Proving the arm exists means proving it differs.
  assert.notEqual(destinationFor({ kind: 'progress_photo' }), '/inbox');
  assert.equal(destinationFor({ kind: 'something_unknown' }), '/inbox', 'precondition: the catch-all is /inbox');
});

test('the kind the scheduler tags with is the kind the router answers', () => {
  /*
   * These are two files that must agree on one string and have no type in common — the tag is written
   * into notification `data` and read back out of it across a native boundary. A rename on either side
   * compiles cleanly and silently sends every tap to /inbox.
   */
  const m = SRC.match(/PHOTO_REMINDER_KIND = '([^']+)'/);
  assert.ok(m, 'photo-reminder must export a literal kind');
  assert.equal(destinationFor({ kind: m[1] }), '/transformation', `"${m[1]}" is tagged but not routed`);
});

test('⚠ every cadence the UI offers has a trigger — including the one with no SDK member', () => {
  /*
   * The SDK has DAILY, WEEKLY and MONTHLY calendar triggers and NO fortnightly one, so `biweekly` has to
   * run on a repeating interval instead. A `RemindFreq` added to the union without a matching arm here
   * would fall through to that interval branch and be silently mis-scheduled rather than rejected.
   */
  assert.match(SRC, /freq === 'weekly'/, 'weekly must take the WEEKLY calendar trigger');
  assert.match(SRC, /freq === 'monthly'/, 'monthly must take the MONTHLY calendar trigger');
  assert.match(SRC, /seconds: 14 \* 24 \* 60 \* 60/, 'biweekly must be a 14-day repeating interval');
  assert.match(SRC, /repeats: true/, 'a one-shot interval would remind exactly once, ever');
});

test('⚠ sync cancels before it schedules, and ensure does not cancel at all', () => {
  /*
   * Two rules, and getting either backwards recreates a version of the original bug:
   *
   *   · sync must cancel first, or changing weekly → monthly leaves BOTH running;
   *   · ensure must not cancel, or an athlete who opens this screen every few days restarts the
   *     14-day countdown every time and is never reminded.
   */
  const sync = SRC.slice(SRC.indexOf('export async function syncPhotoReminder'));
  assert.ok(
    sync.indexOf('await cancelPhotoReminder()') < sync.indexOf('scheduleNotificationAsync'),
    'syncPhotoReminder must cancel before it schedules',
  );

  const ensure = SRC.slice(
    SRC.indexOf('export async function ensurePhotoReminder'),
    SRC.indexOf('export async function syncPhotoReminder'),
  );
  assert.ok(ensure.length > 0, 'precondition: ensurePhotoReminder is declared before syncPhotoReminder');
  assert.doesNotMatch(ensure, /cancelPhotoReminder/, 'ensure must never cancel — it would reset the clock');
  assert.match(ensure, /scheduledCount\(\)\)? > 0\) return/, 'ensure must no-op when one is already scheduled');
  assert.doesNotMatch(ensure, /requestPermissionsAsync/, 'a passive screen visit must never raise the OS prompt');
});

test('⚠ cancel is scoped to this feature, never cancelAll', () => {
  /*
     Nuking every scheduled notification would take any other feature's with it.

     ⚠ MATCHED AS A CALL, WITH ITS PARENTHESIS. The bare name also appears in the source — in the
     comment explaining why it must NOT be used — so a name-only assertion failed against the very
     prose that documents the rule. A test that a correct file cannot pass is not a test.
  */
  assert.doesNotMatch(SRC, /cancelAllScheduledNotificationsAsync\(/);
  assert.match(SRC, /data\?\.kind === PHOTO_REMINDER_KIND/, 'cancellation must be found by tag');
});

test('web is a no-op, and says so rather than pretending', () => {
  // The PO reviews the web preview, where there are no notifications at all.
  assert.match(SRC, /if \(Platform\.OS === 'web'\) return 'unsupported'/);
});
