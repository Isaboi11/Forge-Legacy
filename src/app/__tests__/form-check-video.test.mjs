// node --test src/app/__tests__/form-check-video.test.mjs
//
// Form check, step 1 (PO 2026-11-17): "see it in your video". The rep logic is unit-tested in
// src/domain/coach/__tests__/pose-rep-view.test.mjs; these pin the wiring, which only a phone can run.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const FORM = read('../form-check.tsx');
const LIVE = read('../../data/form-check-live.ts');
const SET = read('../../components/forge/form-check/YourSet.tsx');
const between = (src, a, b) => src.slice(src.indexOf(a), src.indexOf(b, src.indexOf(a)));
const SCREEN = between(FORM, 'export default function FormCheckScreen', '// ── 01 Start');
const TRIM = between(FORM, 'function TrimStage(', '// ── 03 Watching');
const READ = between(FORM, 'function ReadStage(', '// ── 06 States');

test('no lift is picked until the athlete picks one; Film says so at the lift instead of a dead button', () => {
  assert.match(SCREEN, /params\.lift \? \{ name: String\(params\.lift\)\.slice\(0, 60\), key: params\.key \? String\(params\.key\) : null \} : null/);
  assert.doesNotMatch(SCREEN, /findLift\(COMMON\[0\]\)/, 'the Back Squat preset is gone');
  assert.match(SCREEN, /if \(!lift\) return setNeedLift\(true\);/);
  assert.match(FORM, /Pick the lift first, so I know what to look for\./);
});

test("today's lifts, then recent ones, then the common six — nine chips at most", () => {
  assert.match(SCREEN, /for \(const l of session\?\.lifts \?\? \[\]\)/);
  assert.match(SCREEN, /fetchRecentExerciseKeys\(8\)/);
  assert.match(SCREEN, /if \(out\.length >= 9/);
  assert.ok(SCREEN.indexOf('session?.lifts') < SCREEN.indexOf('for (const k of recent)'));
  assert.ok(SCREEN.indexOf('for (const k of recent)') < SCREEN.indexOf('for (const n of COMMON)'));
});

test('the rep scan: the clip up to a minute, else the window under the handles — and never two passes at once', () => {
  assert.match(SCREEN, /rescan=\{bodyPoseAvailable\(\) \? \(w\) => beginScan\(stage\.clip\.uri, stage\.clip\.durationMs, w\) : null\}/);
  assert.match(SCREEN, /if \(settling\) await settling;\n\s+if \(token !== scanToken\.current\) return null;/, 'a new scan waits for the cancelled one');
  assert.match(SCREEN, /if \(scanCovers\(job\.span, startMs, endMs\)\) scan = await job\.promise;\n\s+else \{\n\s+cancelFormTracking\(\);\n\s+await job\.promise;/);
  assert.match(SCREEN, /if \(scanSettling\.current\) await scanSettling\.current;/, 'a read waits for a cancelled scan too');
  assert.match(SCREEN, /const restart = \(\) => \{\n\s+stopScan\(\);/);
  assert.match(LIVE, /const scan = opts\.scan && opts\.scan\.uri === uri && scanCovers\(opts\.scan, start, end\) \? opts\.scan : null;/);
  assert.match(LIVE, /scan\.fps >= poseFps\(end - start\)/, 'a slice is only used when it sampled at least as finely');
  assert.match(LIVE, /if \(win && win\.end > win\.start\) return \{ startMs: win\.start, endMs: win\.end, fps: poseFps\(win\.end - win\.start\) \};/);
});

test('a clip over a minute is scanned where the handles are, again whenever a handle is let go', () => {
  assert.match(TRIM, /const long = dur > REP_SCAN_MAX_MS;/);
  assert.match(TRIM, /onPanResponderRelease: \(\) => \{\n\s+finish\(\);\n\s+if \(long\) look\(false\);/);
  assert.match(TRIM, /void rescan\(long \? \{ \.\.\.live\.trim \} : undefined\)/);
  assert.match(TRIM, /if \(!live\.alive \|\| seq !== live\.seq\) return;/, 'only the newest look counts');
  assert.match(TRIM, /Put the handles over your set and I’ll find the reps\./);
});

test('the trim marks the reps: waiting line, numbered ticks, the wrap, and "Just rep N"', () => {
  assert.match(TRIM, /Finding your reps…/);
  assert.match(TRIM, /setReps\(rs\);\n\s+wrap\(rs\);/);
  assert.match(TRIM, /const w = live\.touched \? null : wrapReps\(/, 'never moves a window the athlete has moved');
  assert.match(TRIM, /onPress=\{\(\) => pans\.pick\(just === i \? null : i, reps\)\}/);
  assert.match(TRIM, /`Just rep \$\{just \+ 1\}`/);
  assert.match(TRIM, /I found \$\{found\} rep/);
});

test('the read opens on the athlete\'s own clip, with a bronze mark per fix that shows it slowly', () => {
  assert.match(READ, /<YourSet[\s\S]*?markers=\{markers\}[\s\S]*?onMarker=\{\(k\) => showMe\(marked\[k\]\)\}/);
  assert.ok(READ.indexOf('<YourSet') < READ.indexOf('{viewLine ? <HoltSays'), 'the clip comes before Holt starts talking');
  assert.match(READ, /Show me in your video/);
  assert.match(READ, /<SlowReplay uri=\{r\.clip\.uri\} fromMs=\{showMeFrom\(r\.times\[full\.at\], r\.win\.start\)\} toMs=\{r\.times\[full\.at\]\} onDone=\{endReplay\} \/>/);
  assert.match(READ, /Slow replay/);
  assert.match(SET, /p\.playbackRate = SHOW_ME_RATE;/);
  assert.match(SET, /if \(currentTime \* 1000 >= toMs - 20\) \{\n\s+player\.pause\(\);\n\s+onDone\(\);/);
});

test('the rep strip: one card per measured rep; tapped, its caption is NOT put in Holt\'s mouth', () => {
  assert.match(READ, /repCards\(r\.facts, r\.reps, r\.times, r\.stills, r\.sizes\)/);
  assert.match(READ, /repStripLabel\(r\.facts\?\.kind\)/);
  assert.match(READ, /holt: false,/);
  assert.match(READ, /\{full\.holt \? <HoltSays text=\{full\.text\} label=\{false\} size=\{32\} \/> : <Text style=\{s\.fullCaption\}>\{full\.text\}<\/Text>\}/);
});

test('the clip and the joints stay on the phone: nothing new goes to the server', () => {
  assert.match(SCREEN, /pose: got\.pose\?\.facts \}/, 'the request still sends the facts and nothing else of the pose');
  assert.doesNotMatch(LIVE.slice(LIVE.indexOf('export interface FormRequest')), /reps: RepSpan/, 'rep spans are not part of the request');
  assert.match(LIVE, /⛔ Like `stills`: drawn, never sent, never stored\./);
});

test('swipe-back stays off on the read too — its timeline is a sideways drag', () => {
  assert.match(SCREEN, /const dragsSideways = stage\.step === 'trim' \|\| stage\.step === 'read';/);
  assert.match(SET, /onPanResponderTerminationRequest: \(\) => false/);
});

test('the rep count shown and saved is the phone\'s, never the model\'s guess (PO 11-17)', () => {
  assert.match(SCREEN, /const read = trustRepCount\(snapped, got\.pose && got\.pose\.level !== 'off' \? got\.pose\.reps\.length : null\);/);
  assert.ok(SCREEN.indexOf('trustRepCount(snapped') < SCREEN.indexOf('insertFormCheck({'), 'form history saves the trusted count too');
});
