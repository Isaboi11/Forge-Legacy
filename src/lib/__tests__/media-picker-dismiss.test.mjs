/**
 * media-picker-dismiss.test.mjs — the system picker is never presented into a modal that is still there.
 *
 * ══ THE DEFECT THIS CLOSES ══
 *
 * Reported from the tester build: *"I click add photo and then the camera works but I click on 'Choose
 * from library' but it doesn't take me to my library."*
 *
 * **iOS refuses to present a view controller while another is on screen.** The chooser is a
 * `BottomSheet` — an RN `Modal` — and `setOpen(false)` only SCHEDULES its dismissal. Calling
 * `launchImageLibraryAsync` in the same tick presented the photo picker into a modal that had not gone,
 * and iOS dropped it **silently**: no throw, no rejection, nothing for the `catch` to report. The row
 * did nothing at all.
 *
 * ⚠ **The camera row worked only by accident**, which is why this needed a human to find. Its branch
 * awaits `requestCameraPermissionsAsync()` first — a native round-trip that happened to give the modal
 * time to finish dismissing. Two rows of one sheet, one with an incidental delay and one without.
 *
 * ══ WHY A SOURCE GUARD ══
 *
 * The failure is an ORDERING between a React state update and a native presentation, on one platform.
 * There is no unit that can observe it without a simulator: `tsc` sees a valid call, the `catch` never
 * fires, and a web test is blind by construction because RN-web's modal is a div and its picker is a
 * file input. What CAN be held is the shape of the code that fixes it.
 *
 * Run:  node --test src/lib/__tests__/media-picker-dismiss.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const raw = readFileSync(join(HERE, '..', 'useMediaPicker.tsx'), 'utf8');
/** Comments name the forbidden ordering to explain it, so only code is scanned. */
const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

/**
 * ⚠ THE ORDERING TESTS SCAN THE HOOK ONLY, AND THAT SCOPING IS LOAD-BEARING.
 *
 * This file gained a SECOND caller of `launchImageLibraryAsync` — the standalone `pickImageFromLibrary`,
 * which the program importer uses. It presents no chooser, so it has no sheet to wait for, and it sits
 * above the hook in the file. The ordering assertions below use `indexOf`, so without this scoping they
 * would find that call first and fail — reporting a dismissal bug that does not exist while no longer
 * checking the code that can actually have one.
 *
 * ⚠ **DO NOT FIX A FUTURE FAILURE HERE BY MOVING CODE AROUND IN `useMediaPicker.tsx`.** Passing because
 * a function happens to sit lower in the file is precisely the "worked only by accident" this suite was
 * written about. Scope the scan instead.
 */
const HOOK_START = src.indexOf('export function useMediaPicker');
const hookSrc = src.slice(HOOK_START);

test('the guard is scanning the hook, not the whole file', () => {
  // If the hook is renamed or removed, every assertion below would silently scan an empty string and
  // pass. This is the check that makes the scoping above safe rather than clever.
  assert.ok(HOOK_START > 0, 'useMediaPicker moved or was renamed — this guard needs updating with it');
  assert.ok(hookSrc.length > 500, 'the hook body did not survive the slice');
});

test('the launcher waits for the sheet before presenting anything', () => {
  const wait = hookSrc.indexOf('await sheetGone()');
  const library = hookSrc.indexOf('launchImageLibraryAsync');
  const camera = hookSrc.indexOf('launchCameraAsync');

  assert.ok(wait > 0, 'useMediaPicker no longer waits for the chooser to be dismissed');
  assert.ok(library > 0 && camera > 0, 'the picker calls moved — this guard needs updating with them');
  assert.ok(wait < library, 'launchImageLibraryAsync is presented before the sheet is known to be gone');
  assert.ok(wait < camera, 'launchCameraAsync is presented before the sheet is known to be gone');
});

/**
 * The other caller of `launchImageLibraryAsync`, pinned so the two never blur into each other.
 *
 * `pickImageFromLibrary` is the program importer's path. It opens the library directly because the
 * importer's own UI is already a BottomSheet — nesting the chooser inside it would recreate exactly the
 * defect at the top of this file — and because photo import is deliberately library-only while the age
 * floor in Decision Queue #22 is open.
 */
test('the standalone library export shows no sheet, so it correctly does not wait', () => {
  const standalone = src.slice(0, HOOK_START);
  assert.ok(
    standalone.includes('export async function pickImageFromLibrary'),
    'pickImageFromLibrary moved below the hook — the scoping above assumes it sits before it',
  );
  assert.ok(standalone.includes('launchImageLibraryAsync'), 'it no longer opens the library');
  assert.ok(
    !standalone.includes('sheetGone'),
    'the standalone path waits for a sheet it never shows — that is latency for nothing',
  );
  // ⛔ It must never grow a camera. A live capture in a 13+-rated app, past an open age-floor decision,
  // is the one change this export exists to prevent.
  assert.ok(
    !standalone.includes('launchCameraAsync'),
    'pickImageFromLibrary opens a camera — see its header; the age floor has to be closed first',
  );
});

/**
 * The wait must apply to BOTH rows. Putting it inside the `source === 'camera'` branch would restore
 * exactly the original bug — a delay on the path that already worked, and none on the path that did not.
 */
test('the wait is not hidden inside the camera branch', () => {
  const wait = hookSrc.indexOf('await sheetGone()');
  const cameraBranch = hookSrc.indexOf("source === 'camera'");
  assert.ok(cameraBranch > 0, "the camera branch moved — this guard needs updating");
  assert.ok(wait < cameraBranch, 'the dismissal wait sits inside the camera path; the library path needs it more');
});

test('every row of the chooser declares that it came from the sheet', () => {
  // `fromSheet` is what turns the wait on. A row passing `false` would tap into the same silent failure.
  const rows = [...src.matchAll(/launch\(cfg,\s*'(camera|library)',\s*(true|false)\)/g)].map((m) => `${m[1]}:${m[2]}`);
  assert.deepEqual(
    rows.sort(),
    ['camera:true', 'library:true'],
    'a chooser row launches without the fromSheet flag, so it will not wait for the modal',
  );
});

test('the direct paths skip the wait, because no sheet was ever shown', () => {
  // Desktop web and `directCamera` never open the chooser; making them wait would add latency for
  // nothing. Asserted so the flag keeps meaning "a modal is on screen" rather than drifting to "always".
  const direct = [...src.matchAll(/launch\(config,\s*'(camera|library)',\s*(true|false)\)/g)].map((m) => `${m[1]}:${m[2]}`);
  assert.deepEqual(direct.sort(), ['camera:false', 'library:false'], 'a direct launch is waiting on a sheet that never opened');
});

test('the sheet reports its real dismissal, and the fallback exists for platforms that cannot', () => {
  assert.match(src, /onDismiss=\{\(\) => dismissRef\.current\?\.\(\)\}/, 'BottomSheet no longer reports dismissal');
  assert.match(src, /SHEET_DISMISS_FALLBACK_MS/, 'no fallback: Android never fires onDismiss and would hang the launch');
  const ms = Number(/SHEET_DISMISS_FALLBACK_MS\s*=\s*(\d+)/.exec(src)?.[1]);
  assert.ok(ms >= 300, `fallback ${ms}ms is shorter than the slide dismissal it must outlast`);
  assert.ok(ms <= 800, `fallback ${ms}ms is long enough to read as a broken tap`);
});

/**
 * ══ THE SECOND REPORT, THE OTHER DIRECTION ══
 *
 * *"Tried uploading a picture on my profile from my photos and it would not pull up. Same issue as the
 * other time."* — and it was the same rule, with the two view controllers swapped.
 *
 * `expo-image-picker` resolves BEFORE it dismisses (`ImagePickerHandler` calls the result handler, then
 * `picker.dismiss(animated: true)` with no completion), so `pick()` used to hand the asset back while the
 * picker was still on screen. Profile photo is the one caller that OPENS something with it —
 * `AvatarCropEditor`, an RN `Modal` — and RN presents a modal from the screen's own view controller,
 * which was still presenting the picker. iOS dropped it silently: choose a photo, land back on an
 * unchanged Edit Profile.
 */
test('a chosen asset is not handed back until the picker is gone', () => {
  const gone = src.indexOf('pickerGone()');
  const settleAsset = src.indexOf('settle(asset)');
  assert.ok(gone > 0, 'useMediaPicker no longer waits for the system picker to be dismissed');
  assert.ok(settleAsset > 0, 'the resolve moved — this guard needs updating with it');
  assert.ok(gone < settleAsset, 'the asset is handed back before the picker is known to be off screen');
  assert.match(
    src,
    /Promise\.all\(\[[^\]]*pickerGone\(\)[^\]]*\]\)/,
    'the dismissal wait is no longer awaited alongside the downscale, so it now costs the athlete real time',
  );
});

test('the picker dismissal wait outlasts the iOS animation', () => {
  const ms = Number(/PICKER_DISMISS_MS\s*=\s*(\d+)/.exec(src)?.[1]);
  assert.ok(ms >= 500, `${ms}ms leaves no margin over the ~350ms iOS dismissal it must outlast`);
  assert.ok(ms <= 1200, `${ms}ms is long enough that the app looks stuck after a photo is chosen`);
});

/**
 * A browser opens a file input only from inside the tap that asked for it. Every `await` before the
 * launch is a chance to lose that, and neither wait buys web anything — there is no view controller to
 * collide with, and the web camera permission call is a stub that always returns granted.
 */
test('web reaches the picker without awaiting anything first', () => {
  assert.match(src, /if \(fromSheet && native\) await sheetGone\(\)/, 'web now awaits the sheet it never had on screen');
  assert.match(src, /if \(source === 'camera' && native\)/, 'web now awaits a permission stub before opening its capture input');
  assert.match(src, /Platform\.OS === 'web'\s*\?\s*Promise\.resolve\(\)/, 'web now pays the native picker-dismissal wait');
});

test('BottomSheet actually forwards onDismiss to the native modal', () => {
  const sheet = readFileSync(join(HERE, '..', '..', 'components', 'forge', 'composites', 'BottomSheet', 'BottomSheet.tsx'), 'utf8');
  const code = sheet.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.match(code, /<Modal[^>]*onDismiss=\{onDismiss\}/, 'the prop is accepted but never reaches the Modal');
});

/**
 * ══ THE OTHER HALF: A CALLER THAT IS ITSELF A MODAL ══
 *
 * Everything above guards the chooser sheet THIS hook owns. It knew nothing about a caller that is
 * already a modal when it asks to pick — and that is the half that reached testers, twice:
 *
 *   · the Friends-feed composer (fixed by making it a screen), and then
 *   · the squad photo inside Edit Identity, and Replace on the check-in viewer, both reported as
 *     *"the app is frozen"* because iOS drops the presentation silently and the control does nothing.
 *
 * `callerModalGone()` is the shared wait. These pin the two call sites that need it, by name — a
 * repo-wide grep would go stale against every new screen and match its own explanation besides.
 */

const CALLER_FIX = /setEditOpen\(false\);\s*\n\s*await callerModalGone\(\);\s*\n\s*const asset = await pick\(/;

test('callerModalGone exists, and web pays nothing for it', () => {
  assert.match(src, /export function callerModalGone/);
  // RN-web's modal is a div and its picker is a file input — there is no rule to obey, and an await
  // here would risk the browser's "opened from inside the tap" requirement for nothing.
  assert.match(src, /callerModalGone[\s\S]{0,200}?Platform\.OS === 'web'\) return Promise\.resolve\(\)/);
});

test('⚠ the squad photo closes Edit Identity before presenting the picker', () => {
  const squadSettings = readFileSync(join(HERE, '..', '..', 'app', 'squad-settings.tsx'), 'utf8');
  assert.match(squadSettings, CALLER_FIX, 'pickPhoto presents over the still-open Edit Identity sheet');
  // Reopened afterwards, or the athlete is dumped out of the editor they were halfway through.
  assert.match(squadSettings, /const asset = await pick\([\s\S]{0,200}?setEditOpen\(true\)/);
});

test('⚠ Replace on the check-in viewer waits for the viewer to go', () => {
  const squadDetail = readFileSync(join(HERE, '..', '..', 'app', 'squad', '[id].tsx'), 'utf8');
  const code = squadDetail.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.match(
    code,
    /setCheckinViewer\(null\);\s*\n\s*void \(async \(\) => \{\s*\n\s*await callerModalGone\(\);\s*\n\s*await startCheckin\(\);/,
    'Replace launches the camera in the same tick it closes the viewer Modal',
  );
});

test('the two fixed callers both import the shared wait rather than rolling a timeout', () => {
  for (const parts of [['app', 'squad-settings.tsx'], ['app', 'squad', '[id].tsx']]) {
    const file = readFileSync(join(HERE, '..', '..', ...parts), 'utf8');
    assert.match(
      file,
      /import \{ callerModalGone, useMediaPicker \} from '@\/lib\/useMediaPicker'/,
      `${parts.join('/')} does not import callerModalGone from the one file that owns ImagePicker`,
    );
  }
});
