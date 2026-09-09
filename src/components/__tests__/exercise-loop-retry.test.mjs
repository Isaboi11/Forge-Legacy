/**
 * exercise-loop-retry — guards the 2026-09-09 demo-loop delivery pass.
 *
 * Three decisions under guard, all source assertions (the component mounts expo-image and cannot
 * run under node --test):
 *   1. ExerciseLoop latches its fallback on the SECOND failure of a URL, not the first — a ~1MB
 *      fetch timing out once on gym reception is weather, and the one-shot latch was the PO's
 *      "it just doesn't load at all".
 *   2. Starting a workout prefetches every planned lift's loop (fire-and-forget, deduped).
 *   3. The cache repair targets ONLY the exercise-media bucket, in both SQL steps.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (...p) => readFileSync(join(root, ...p), 'utf8');

const loop = read('src', 'components', 'forge', 'ExerciseLoop.tsx');
const session = read('src', 'hooks', 'useWorkoutSession.tsx');
const prefetch = read('src', 'lib', 'demo-loop-prefetch.ts');

test('ExerciseLoop retries once before latching, and the latch is still scoped to the URL', () => {
  // Two tries per URL: the gate reads `tries < 2`, and the failure record carries which URL it counts.
  assert.match(loop, /tries < 2/, 'the fallback gate must allow a second attempt');
  assert.match(loop, /failure\?\.url === url \? failure\.tries : 0/, 'a new URL must reset the count without an effect');
  // A failure increments; it must never reset a repeat failure back to zero (that would loop forever).
  assert.match(loop, /\{ url, tries: f\.tries \+ 1 \}/, 'a repeat failure must increment, not restart');
});

test('the retry works by remount: the element key carries the attempt number', () => {
  // A new key is a new element is a fresh fetch — the same mechanism the swap fix already relies on.
  assert.match(loop, /key=\{`\$\{url\}#\$\{tries\}`\}/, 'key must change when tries changes, or the retry never refetches');
});

test('startWorkout warms the planned lifts through the prefetch helper', () => {
  assert.match(session, /prefetchDemoLoops\(lifts\.map\(\(l\) => l\.catalogKey\)/, 'the session start must hand every planned lift to the prefetch');
  // Fire-and-forget contract: the prefetch call sits inside startWorkout, before the stale timer arms.
  const start = session.slice(session.indexOf('const startWorkout'), session.indexOf('useEffect(() => clearStaleTimer'));
  assert.ok(start.includes('prefetchDemoLoops'), 'the prefetch belongs to startWorkout itself');
});

test('the prefetch dedupes, never throws at its caller, and stays out of the domain layer', () => {
  assert.match(prefetch, /new Set\(/, 'repeated lifts must not repeat megabytes');
  assert.match(prefetch, /\.catch\(\(\) => \{\}\)/, 'a prefetch failure must be swallowed — the mount-time load is the retry');
  assert.match(prefetch, /from 'expo-image'/, 'expo-image must be imported here, in src/lib, not in domain code node --test resolves');
});

test('the cache repair goes through the storage API, never through SQL alone', () => {
  // The SQL probe is kept as the record of the dead end (stored metadata does not drive the served
  // header) and must say so; the live fix is the re-upload script, which must be byte-identical
  // (no MEDIA_REV bump — devices keep their caches) and scoped to the one bucket.
  const probe = read('supabase', 'apply', 'repair-exercise-media-cache-1-probe.sql');
  assert.match(probe, /SQL CANNOT FIX THE SERVED HEADER/, 'the probe must warn off the next session');
  const script = read('scripts', 'animation-processing', 'set_cache_control.py');
  assert.match(script, /BUCKET = "exercise-media"/, 'the re-upload is scoped to the bucket');
  assert.match(script, /"cache-control": CACHE_SECONDS/, 'the upload must carry the lifetime');
  assert.match(script, /"upsert": "true"/, 'the upload must overwrite in place');
  assert.match(script, /CACHE_SECONDS = "31536000"/, 'one year, busted by ?v= on re-cuts');
});
