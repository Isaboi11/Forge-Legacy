/**
 * Three PO reports from 2026-09-01, held as guards.
 *
 *   1. "It's not obvious how to leave a check-in on a squad check-in. There isn't an obvious x to get
 *      out of it."
 *   2. "Commenting on a post is difficult. The comment bar is super hard to find so it needs to be
 *      higher, and then the keyboard covers it."
 *   3. "Exercises during an active workout should be able to be removed from the workout. If an
 *      exercise is a warm up and it is removed, nothing moves into that warm-up spot."
 *
 * All three are LAYOUT and WIRING defects: nothing about them is wrong until you look at the running
 * app, so tsc and lint see nothing and the arithmetic tests pass. `node --test` cannot mount a screen,
 * so these read source — the same shape as `overlay-branch` and `transformation-post-controls`.
 *
 * The arithmetic half of (3) — what the exercise list becomes — is tested properly in
 * `src/domain/workout/__tests__/remove-exercise.test.mjs`.
 *
 * Run:  node --test src/app/__tests__/exit-composer-remove.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
/** Code only. A comment describing the behaviour a test forbids must not satisfy that test. */
const strip = (src) => src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const SQUAD = strip(read('../squad/[id].tsx'));
const POST = strip(read('../squad-post/[id].tsx'));
const FRIENDS = strip(read('../friends.tsx'));
const SHEET = strip(read('../../components/forge/composites/BottomSheet/BottomSheet.tsx'));
const WORKOUT = strip(read('../workout.tsx'));
const COACH = strip(read('../../components/forge/SessionCoachSheet.tsx'));
const CORE = strip(read('../../domain/workout/session-core.ts'));

// ─────────────────────────────────────────────────────────────────────────────
// 1. there is a visible way out of a check-in
// ─────────────────────────────────────────────────────────────────────────────

/** The body of `CheckinViewer`, so a close control elsewhere on the screen cannot satisfy these. */
const VIEWER = (() => {
  const start = SQUAD.indexOf('function CheckinViewer(');
  assert.notEqual(start, -1, 'CheckinViewer was renamed — update this test with the component');
  const rest = SQUAD.slice(start);
  const end = rest.indexOf('\nfunction ');
  return end === -1 ? rest : rest.slice(0, end);
})();

test('⚠ the check-in viewer reads the real safe-area inset instead of guessing 54pt', () => {
  // The close X existed. It was drawn under the Dynamic Island, which is the same defect the
  // Transformation TopBar had — a hand-rolled overlay beside a component that already solved this.
  assert.match(VIEWER, /useSafeAreaInsets\(\)/, 'the viewer no longer reads the safe area');
  assert.match(VIEWER, /paddingTop: \d+ \+ insets\.top/, 'the top bar is back on a hardcoded inset');
  assert.doesNotMatch(VIEWER, /paddingTop: 54/, 'the hardcoded 54 is back');
});

test('⚠ the close control carries a WORD, not just a glyph over arbitrary video', () => {
  // A stroke icon on 12% white is whatever the footage behind it is. The pill is the same shape as
  // "Post a new check-in" at the foot, which nobody has ever failed to find.
  assert.match(VIEWER, /styles\.viewerCloseText/, 'the close control lost its label');
  assert.match(VIEWER, /accessibilityLabel="Close check-in"/, 'the close control lost its accessible name');
});

test('the close control has its own opaque ground rather than a tint of the video', () => {
  const styles = SQUAD.slice(SQUAD.indexOf('viewerClose:'));
  assert.doesNotMatch(styles.slice(0, 400), /backgroundColor: 'rgba\(255,255,255,0\.12\)'/, 'the invisible tint is back');
});

test('there is exactly ONE close control, and it is not in the video player’s own band', () => {
  // `nativeControls` draws AVPlayer's scrubber across the foot of this screen. A second Close down
  // there would be a third control fighting for the same 60pt — the fix for "I can't find the way out"
  // is one unmissable exit, not two competing ones.
  const closes = VIEWER.split('accessibilityLabel="Close check-in"').length - 1;
  assert.equal(closes, 1, 'the viewer grew a second close control');
  assert.doesNotMatch(VIEWER, /styles\.viewerDone\b/, 'the bottom Done button is back, over the scrubber');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. the comment bar is findable, and the keyboard does not sit on it
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ the post composer stands clear of the home indicator when no keyboard is up', () => {
  // A flat `paddingBottom: 16` put the bottom third of the bar inside the system gesture strip.
  assert.match(POST, /paddingBottom: 16 \+ \(keyboardInset > 0 \? keyboardInset : insets\.bottom\)/, 'the composer is back on a flat bottom padding');
  assert.match(POST, /useSafeAreaInsets\(\)/, 'the post screen no longer reads the safe area');
});

test('the two insets are never added together', () => {
  // iOS reports the keyboard height from the bottom of the SCREEN, so it already contains the
  // indicator's space. Adding both leaves a 34pt gap under a raised keyboard.
  assert.doesNotMatch(POST, /keyboardInset \+ insets\.bottom/, 'the insets are being double-counted');
});

test('⚠ the comment count is a CONTROL that opens the composer, not decoration', () => {
  // It sat next to the flame looking identical and doing nothing, so the one thing on the screen that
  // says "comments" was inert and the composer had to be hunted for at the foot of a long post.
  assert.match(POST, /composerRef\.current\?\.focus\(\)/, 'the comment count no longer focuses the composer');
  assert.match(POST, /ref=\{composerRef\}/, 'the composer field lost its ref');
});

test('⚠ the friends comment field is PINNED, not the last item in a list of comments', () => {
  // Underneath every comment, in a sheet that did not scroll, it was clipped past the 88% cap on any
  // post with a real thread: not merely hard to find, unreachable.
  const sheet = FRIENDS.slice(FRIENDS.indexOf('function CommentsSheet('));
  const footerAt = sheet.indexOf('footer={');
  const bodyAt = sheet.indexOf('styles.comments');
  assert.notEqual(footerAt, -1, 'the comment field is no longer the sheet footer');
  assert.ok(footerAt < bodyAt, 'the composer must be the pinned footer, not part of the scrolling body');
  assert.match(sheet.slice(0, footerAt), /^\s*scroll\s*$/m, 'the comment thread no longer scrolls');
});

test('⚠ BottomSheet lifts itself where KeyboardAvoidingView does nothing at all', () => {
  // KAV is a no-op in react-native-web, and is deliberately off for a scrolling sheet — which is
  // exactly the two cases a pinned footer field lands in.
  assert.match(SHEET, /const lift = Platform\.OS === 'android' \? 0 : Platform\.OS === 'web' \|\| scroll \? keyboardInset : 0/, 'the sheet no longer lifts for the keyboard');
  assert.match(SHEET, /paddingBottom: 22 \+ insets\.bottom \+ lift/, 'the lift is not applied to the sheet');
});

test('the scroller does not correct for the keyboard a second time once the sheet has moved', () => {
  assert.match(SHEET, /automaticallyAdjustKeyboardInsets=\{lift === 0\}/, 'the scroller and the sheet will both shift — the body scrolls out from under the athlete');
});

test('the sheet height cap grows with the lift, so the body is not squeezed by invisible padding', () => {
  assert.match(SHEET, /maxHeight: windowHeight \* 0\.88 \+ lift/, 'the 88% cap is being spent on padding nobody can see');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. an exercise can be taken out of a live session
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ removal is reachable WITHOUT Coach Holt, who is entitlement-gated', () => {
  // `holt_in_workout` is a capability. If "Take it out" existed only in his sheet, removal would be a
  // paid feature by accident. The Overview is the plan, and it is always open.
  assert.match(WORKOUT, /accessibilityLabel=\{`Remove \$\{e\.name\} from this workout`\}/, 'the Overview lost its remove control');
  assert.match(COACH, /label="Take it out"/, 'the coach sheet lost its remove row');
});

test('the Overview two targets are SIBLINGS — a pressable inside a pressable eats the touch', () => {
  const ov = WORKOUT.slice(WORKOUT.indexOf('styles.ovRow, isCur'));
  assert.match(ov.slice(0, 1200), /style=\{styles\.ovRowMain\}/, 'the jump-to target is no longer its own pressable');
});

test('⚠ "Move past this" and "Take it out" both say which is which', () => {
  // Two rows that sound alike, one of which throws away logged work. Sitting unlabelled next to each
  // other they were a choice you get wrong once and cannot undo.
  assert.match(COACH, /label="Move past this" sub="Keep it in the session, come back to it"/, 'skip no longer states that the lift stays in the record');
  assert.match(COACH, /label="Take it out" sub="Remove it from today’s session"/, 'remove no longer states what it does');
});

test('the remove row is HIDDEN, not disabled, on the last exercise standing', () => {
  assert.match(COACH, /\{canRemove \? <Row label="Take it out"/, 'the row is drawn unconditionally — a greyed row invites a tap and answers with a refusal');
  assert.match(WORKOUT, /canRemove=\{session\.exercises\.length > 1\}/, 'the screen no longer tells the sheet whether removal is possible');
});

test('⚠ removing the last exercise is refused rather than leaving a session with no way out', () => {
  const ask = WORKOUT.slice(WORKOUT.indexOf('const askRemove'));
  assert.match(ask.slice(0, 900), /session\.exercises\.length <= 1/, 'the last-exercise guard is gone');
  assert.match(ask.slice(0, 900), /blockedByBout\(\)/, 'removal is open while a cardio bout is running');
});

test('⚠ removing LOGGED work asks first; removing an untouched exercise does not', () => {
  const ask = WORKOUT.slice(WORKOUT.indexOf('const askRemove'));
  assert.match(ask.slice(0, 900), /target\.sets\.some\(\(s\) => s\.done\)/, 'logged sets are no longer confirmed before being thrown away');
  assert.match(WORKOUT, /open=\{removeAsk != null\}/, 'the confirmation is gone');
});

test('the confirmation is mounted at SCREEN level, not inside a sheet that is closing', () => {
  // Holt's rows all close the sheet on press (`run()`), and the Overview closes before it asks. A
  // ConfirmSheet declared inside either would never render — the `overlay-branch` defect class.
  const confirm = WORKOUT.indexOf('open={removeAsk != null}');
  const holt = WORKOUT.indexOf('<SessionCoachSheet');
  assert.notEqual(confirm, -1, 'the remove confirmation is gone');
  assert.notEqual(holt, -1);
  const between = WORKOUT.slice(Math.min(holt, confirm), Math.max(holt, confirm));
  assert.ok(between.includes('/>'), 'the confirm sheet is nested inside the coach sheet');
});

test('⚠ index-keyed overlays are dropped on removal — every index after the gap has shifted', () => {
  const doRemove = WORKOUT.slice(WORKOUT.indexOf('const doRemove'));
  for (const setter of ['setGoalOpen(null)', 'setNoteOpen(null)', 'setSsOpen(null)']) {
    assert.ok(doRemove.slice(0, 1200).includes(setter), setter + ' is missing — that overlay will reopen on whatever slid into the slot');
  }
});

test('⚠ THE COLLISION REMOVAL INTRODUCES: neither add path stamps length as a position', () => {
  // Positions are the join key `buildSubstitutions` and `buildAppendExercises` use. Once a list has a
  // hole in it, its length is a position that is already taken.
  assert.match(WORKOUT, /const pos = nextPosition\(s\.exercises\)/, 'the Picker add path is back on the array length');
  assert.match(WORKOUT, /pickedToExercise\(picked, nextPosition\(s\.exercises\)\)/, 'the coach add path is back on the array length');
  assert.doesNotMatch(WORKOUT, /pickedToExercise\(p, base \+ i\)/, 'the old position seed is back');
});

test('positions are never renumbered on removal', () => {
  // Renumbering would re-point every join, including a continued session matching rows that already
  // exist in the database.
  const fn = CORE.slice(CORE.indexOf('export function removeExerciseAt'));
  assert.doesNotMatch(fn.slice(0, 900), /position: i\b/, 'removal renumbers positions');
  assert.doesNotMatch(fn.slice(0, 900), /position: idx/, 'removal renumbers positions');
});
