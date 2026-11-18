/**
 * PO 11-08: *"When I go to post my workout on squads it wouldn't post the numbers on my picture."*
 *
 * The overlay existed, but the strip was the default, nothing remembered a change, and every failure on the way
 * to the picture was swallowed — so "never chose it" and "it broke on the phone" looked the same. Source
 * assertions: the picture is drawn by a mounted SVG on a screen no test here renders.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const complete = read('../workout-complete.tsx');
const dest = read('../../lib/post-destinations.ts');
const native = read('../../lib/story-image.ts');
const web = read('../../lib/story-image.web.ts');
const post = read('../../data/workout-post-live.ts');
const host = read('../../lib/story-card-host.tsx');
const canvas = read('../../components/forge/StoryCanvas.tsx');

test('on the photo is the default, and the last choice is read back and saved', () => {
  assert.match(complete, /useState<PhotoLook>\('overlay'\)/);
  assert.match(complete, /readPhotoLook\(\)\.then/);
  assert.match(complete, /onChange=\{choosePhotoLook\}/);
  assert.match(complete, /savePhotoLook\(v\)/);
  assert.match(dest, /v === 'overlay' \|\| v === 'strip' \? v : null/, 'a stored value is validated, junk reads as the default');
});

test('⚠ no silent null on the way to the picture — every renderer exit says why', () => {
  for (const [name, src] of [['native', native], ['web', web]]) {
    const body = src.slice(src.indexOf('export async function renderStoryImage'), src.indexOf('export async function exportStory'));
    assert.ok(body.length > 0, `${name} renderStoryImage found`);
    assert.equal(/catch \{\s*return null;/.test(body), false, `${name}: no bare catch-null`);
    assert.match(body, /reportError\(/, `${name} reports`);
  }
  assert.equal(/renderStoryImage\([^)]*\)\.catch\(\(\) => null\)/.test(post), false, 'the post path reports a throw');
  assert.equal(/uploadFeedImageData\([^)]*\)\.catch\(\(\) => null\)/.test(post), false, 'the post path reports a failed upload');
  assert.equal(/postPictureBits\([^)]*\)\.catch\(\(\) => null\)/.test(complete), false, 'the chooser\'s measure reports');
});

test('the phone snapshot waits for the photo to load, not a fixed delay', () => {
  assert.match(canvas, /onLoad=\{onPhotoLoad\}/);
  assert.match(host, /onPhotoLoad=\{\(\) => setLoadedJob\(job\)\}/);
  assert.match(host, /const ready = !job\.photo \|\| loadedJob === job;/);
  assert.equal(/job\.photo \? 250 : 60/.test(host), false);
});

test('⚠ the uploaded picture is a JPEG at the drawing\'s own size — never the 3× PNG (Da Bois, 11-17: 50 MB)', () => {
  const body = native.slice(native.indexOf('export async function renderStoryImage'), native.indexOf('export async function exportStory'));
  assert.match(body, /rasterizeStory\(drawing, photo, \{ trueSize: true \}\)/, 'the post snapshot asks for true size');
  assert.match(body, /mime: 'image\/jpeg'/, 'the post picture is a JPEG');
  assert.equal(/mime: 'image\/png'/.test(body), false, 'the post picture is never the PNG snapshot');
  assert.match(native, /resize\(\{ width, height \}\)/, 'the re-encode pins the pixel size');
  assert.match(native, /SaveFormat\.JPEG/);
  assert.match(host, /job\.trueSize && Platform\.OS === 'ios' \? PixelRatio\.get\(\)/, 'iOS asks for size ÷ screen scale');
  assert.match(host, /snapshotSize\(job\)/, 'the snapshot uses that size');
  const exp = native.slice(native.indexOf('export async function exportStory'));
  assert.match(exp, /rasterizeStory\(spec\.drawing, photo\)/, 'the share sheet picture is untouched');
});

test('⚠ the canvas is drawn at the snapshot size — the snapshot crops, it never scales (PO recap, 11-18: top-left third)', () => {
  assert.match(host, /<StoryCanvas ref=\{svgRef\} drawing=\{job\.drawing\} width=\{snapshotSize\(job\)\.width\}/, 'the canvas width matches the snapshot');
});
