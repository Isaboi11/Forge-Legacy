// node --test src/app/__tests__/form-check-trim.test.mjs
//
// Form check's trim works like the Photos app (PO 11-17: "The drag function when selecting where my rep is is
// finicky and keeps trying to swipe the whole screen. As well as I can't see where I'm swiping to."). The grip
// math is unit-tested here; the gesture wiring can only be pinned by reading the screen's source.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { FORM_CLIP_MS } from '../../domain/coach/form-check.ts';
import { FORM_TRIM_MIN_MS, moveTrimGrip } from '../../domain/coach/form-check-view.ts';

const FORM = readFileSync(new URL('../form-check.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const TRIM = FORM.slice(FORM.indexOf('function TrimStage('), FORM.indexOf('// ── 03 Watching'));

test('a grip stops one second short of the other and never leaves the clip', () => {
  const t = { start: 2_000, end: 8_000 };
  assert.deepEqual(moveTrimGrip('start', 7_900, t, 20_000), { start: 8_000 - FORM_TRIM_MIN_MS, end: 8_000 });
  assert.deepEqual(moveTrimGrip('start', -500, t, 20_000), { start: 0, end: 8_000 });
  assert.deepEqual(moveTrimGrip('end', 2_100, t, 20_000), { start: 2_000, end: 2_000 + FORM_TRIM_MIN_MS });
  assert.deepEqual(moveTrimGrip('end', 25_000, t, 20_000), { start: 2_000, end: 20_000 });
});

test('past one read\'s length a grip pulls the other along, so a long clip\'s window slides', () => {
  const t = { start: 0, end: FORM_CLIP_MS };
  assert.deepEqual(moveTrimGrip('end', FORM_CLIP_MS + 10_000, t, 90_000), { start: 10_000, end: FORM_CLIP_MS + 10_000 });
  const late = { start: 40_000, end: 40_000 + FORM_CLIP_MS };
  assert.deepEqual(moveTrimGrip('start', 30_000, late, 90_000), { start: 30_000, end: 30_000 + FORM_CLIP_MS });
});

test('no swipe-back while trimming or reading — iOS 26 makes a sideways drag anywhere on a pushed screen "go back"', () => {
  assert.match(FORM, /const dragsSideways = stage\.step === 'trim' \|\| stage\.step === 'read';/);
  assert.match(FORM, /navigation\.setOptions\(\{ gestureEnabled: !dragsSideways \}\)/);
});

test('the grips drag RELATIVE to where they were, keep the finger, and are built once', () => {
  assert.match(TRIM, /const \[pans\] = useState\(\(\) => \{/, 'a rebuilt PanResponder mid-drag restarts at dx 0');
  assert.match(TRIM, /onPanResponderMove: \(_e, g\) => put\(which, live\.grab \+ \(g\.dx \/ live\.w\) \* dur\)/);
  assert.doesNotMatch(TRIM, /measureInWindow|g\.moveX/, 'no absolute rail measured mid push-animation');
  assert.equal((TRIM.match(/onPanResponderTerminationRequest: \(\) => false/g) ?? []).length, 2, 'grips and scrub hold the touch');
});

test('the picture follows the finger: pause, scrubbing mode, seek to the grip; play loops the chosen part', () => {
  assert.match(TRIM, /player\.pause\(\);\n\s+scrubMode\(player, true\);/);
  assert.match(TRIM, /set\(next, next\[which\]\)/, 'the player shows the frame under the moving grip');
  assert.match(TRIM, /scrubMode\(player, false\);/, 'scrubbing mode ends at lift-off');
  assert.match(TRIM, /if \(isPlaying && \(ms >= trim\.end \|\| ms < trim\.start - 250\)\)/);
  assert.match(TRIM, /s\.playhead/);
  assert.match(TRIM, /\{drag \? null : \(\n\s+<Pressable/, 'the play button gets off the lifter while scrubbing');
});

test('the .dc\'s look is kept: 14 pt grips, 64 pt strip, bronze bracket; VoiceOver can move a grip', () => {
  assert.match(FORM, /const HANDLE = 14;/);
  assert.match(FORM, /const STRIP_H = 64;/);
  assert.match(FORM, /grip: \{ position: 'absolute', top: 0, bottom: 0, width: HANDLE, backgroundColor: C\.brzHi/);
  assert.equal((TRIM.match(/accessibilityRole="adjustable"/g) ?? []).length, 2);
  assert.equal((TRIM.match(/onAccessibilityAction=\{pans\.nudge(Start|End)\}/g) ?? []).length, 2);
});

test('two grips close together split the gap — the end grip no longer covers the start grip', () => {
  assert.match(TRIM, /const reachIn = Math\.min\(HANDLE \+ REACH_IN, stripW > 0 \? \(\(win \/ dur\) \* stripW\) \/ 2 : HANDLE \+ REACH_IN\);/);
  assert.equal((TRIM.match(/width: REACH_OUT \+ reachIn \}/g) ?? []).length, 2);
});
