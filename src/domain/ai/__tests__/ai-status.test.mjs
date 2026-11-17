// node --experimental-strip-types --test src/domain/ai/__tests__/ai-status.test.mjs
//
// UX-1 (one AI state kit) + IM-4 (the import screen), AI Road to 10 Sprint 3.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { aiFailed, aiStatusA11y, importProgress } from '../ai-status.ts';

const src = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('reading three photos: a step per photo, done / now / waiting, and what the current one is doing', () => {
  const s = importProgress(3, 1, 'layout');
  assert.equal(s.kind, 'working');
  assert.equal(s.headline, 'Reading photo 2 of 3…');
  assert.equal(s.detail, 'Laying it out…');
  assert.deepEqual(s.steps.map((x) => `${x.label}:${x.state}`), ['Photo 1:done', 'Photo 2:now', 'Photo 3:waiting']);
  assert.equal(aiStatusA11y(s), 'Reading photo 2 of 3… Laying it out…');
});

test('one photo has no step row — "Reading your photo…" is the whole story; bad input is clamped', () => {
  const s = importProgress(1, 0, 'card');
  assert.equal(s.headline, 'Reading your photo…');
  assert.equal(s.detail, 'Reading the photo…');
  assert.equal(s.steps, undefined);
  assert.equal(importProgress(2, 9, 'card').headline, 'Reading photo 2 of 2…');
  assert.equal(importProgress(0, -1, 'card').headline, 'Reading your photo…');
});

test('a failure says "Not charged." once, as its own line — never twice', () => {
  const refunded = aiFailed('Photo 2: That photo couldn’t be read. Not charged.', true);
  assert.equal(refunded.headline, 'Photo 2: That photo couldn’t be read.');
  assert.equal(refunded.notCharged, true);
  assert.equal(aiStatusA11y(refunded), 'Photo 2: That photo couldn’t be read. Not charged.');
  const charged = aiFailed('No exercises could be read from that photo.', false);
  assert.equal(charged.notCharged, false);
  assert.equal(charged.canRetry, true);
});

test('the import screen shows the kit: per-photo progress from readImportPhoto’s steps, failures with Try again', () => {
  const screen = src('../../../app/program-import.tsx');
  assert.match(screen, /readImportPhoto\(uri, \(n\) => resolveExerciseName\(n\)\?\.key, closeSignal\(\), \(phase\) => setAiState\(importProgress\(photos\.length, i, phase\)\)\)/);
  assert.match(screen, /<AiStatus status=\{aiState\} onRetry=\{\(\) => void previewPhotos\(\)\}/);
  assert.match(screen, /failedAt\(withNotCharged\(photoError\(r, i \+ 1, photos\.length\), r\.refunded\), r\.refunded\)/);
  // The photo beside what was read.
  assert.match(screen, /mode === 'photo' && photos\.length \? <ImportPhotoStrip photos=\{photos\} \/> : null/);
  const read = src('../../../data/import-photo-read.ts');
  assert.ok(read.indexOf("onStep?.('card')") < read.indexOf('await readWorkoutCard('));
  assert.ok(read.indexOf("onStep?.('layout')") < read.indexOf('await tidyWrittenWorkout('));
});

test('the kit’s look is tokens only (both themes) and never bronze (Alabaster: bronze is earned)', () => {
  const kit = src('../../../components/forge/AiStatus.tsx');
  assert.doesNotMatch(kit.slice(kit.indexOf('StyleSheet.create')), /bronze/i);
  assert.doesNotMatch(kit, /#[0-9a-f]{3,8}\b/i);
  const strip = src('../../../components/forge/ImportPhotoStrip.tsx');
  assert.doesNotMatch(strip, /#[0-9a-f]{3,8}\b/i);
});

test('IM-4: a guessed or unread number in the preview is boxed — never a to-failure or timed set', () => {
  const sheet = src('../../../components/forge/ImportSpreadsheetSheet.tsx');
  assert.match(sheet, /impNumAssumed: \{[^}]*borderStyle: 'dashed'/);
  assert.match(sheet, /A number in a dashed box was guessed or couldn’t be read — check it against your photo\./);
  const body = sheet.slice(sheet.indexOf('export function repsUnsure('), sheet.indexOf('export function ImportPreview('));
  const open = body.indexOf('): boolean {') + '): boolean {'.length;
  const repsUnsure = new Function('it', body.slice(open, body.lastIndexOf('}')));
  assert.equal(repsUnsure({ reps: 0 }), true);
  assert.equal(repsUnsure({ reps: 8, repsAssumed: true }), true);
  assert.equal(repsUnsure({ reps: 8 }), false);
  assert.equal(repsUnsure({ reps: 0, toFailure: true }), false);
  assert.equal(repsUnsure({ reps: 0, durationSec: 30 }), false);
});

test('meal photo: the kit, two steps as they happen; its failure keeps "Not charged." on its own line', async () => {
  const { mealPhotoProgress } = await import('../ai-status.ts');
  assert.deepEqual(mealPhotoProgress('reading').steps.map((s) => s.state), ['now', 'waiting']);
  assert.deepEqual(mealPhotoProgress('matching').steps.map((s) => s.state), ['done', 'now']);
  const screen = src('../../../app/meal-photo.tsx');
  assert.match(screen, /<AiStatus status=\{mealPhotoProgress\(stage\.step\)\}/);
  assert.match(screen, /<AiStatus status=\{aiFailed\(stage\.text, false, false\)\} \/>/);
});
