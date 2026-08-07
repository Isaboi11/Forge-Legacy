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

test('the launcher waits for the sheet before presenting anything', () => {
  const wait = src.indexOf('await sheetGone()');
  const library = src.indexOf('launchImageLibraryAsync');
  const camera = src.indexOf('launchCameraAsync');

  assert.ok(wait > 0, 'useMediaPicker no longer waits for the chooser to be dismissed');
  assert.ok(library > 0 && camera > 0, 'the picker calls moved — this guard needs updating with them');
  assert.ok(wait < library, 'launchImageLibraryAsync is presented before the sheet is known to be gone');
  assert.ok(wait < camera, 'launchCameraAsync is presented before the sheet is known to be gone');
});

/**
 * The wait must apply to BOTH rows. Putting it inside the `source === 'camera'` branch would restore
 * exactly the original bug — a delay on the path that already worked, and none on the path that did not.
 */
test('the wait is not hidden inside the camera branch', () => {
  const wait = src.indexOf('await sheetGone()');
  const cameraBranch = src.indexOf("source === 'camera'");
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
