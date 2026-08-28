/**
 * post-share-wiring.test.mjs — four PO reports on one shared workout, held as source guards.
 *
 * 2026-08-27, one post on the squad feed, one message:
 *   1. "I clicked the video but it just showed me the workout summary and not the video."
 *   2. "I put a comment when I was creating the post after the workout and it's not showing the comment."
 *   3. "I clicked share to squad and friends … it's still not showing me that I shared it in any way."
 *   4. "The video is not centered in the post for some reason."
 *
 * Every one of these was a WIRING gap, not a broken function: a handler that sent the tap to the wrong
 * place, a field carried to one table and not the other, a record that existed and was read by nothing,
 * a tile with no frame in it. Nothing here can be seen by tsc, and `node --test` cannot mount a screen —
 * so each guard reads the file and holds the line that closed it. Same shape as
 * `program-photo-wiring.test.mjs`, for the same reason.
 *
 * Run:  node --test src/app/__tests__/post-share-wiring.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const FEED = read('../squad/[id].tsx');
const CARD = read('../../components/forge/compositions/LedgerPost.tsx');
const COMPLETE = read('../workout-complete.tsx');
const SHEET = read('../../components/forge/ShareSessionSheet.tsx');
const DATA = read('../../data/squad-feed-live.ts');

// ─────────────────────────────────────────────────────────────────────────────
// 1. the video plays
// ─────────────────────────────────────────────────────────────────────────────

test('the feed sends a tap on a video to the player, not to the workout summary', () => {
  assert.match(
    strip(FEED),
    /onMedia=\{\s*p\.media\[0\]\?\.kind === 'video'\s*\?\s*\(\) => router\.push\(\{ pathname: '\/pin-video'/,
    'the squad feed no longer routes a video tap to /pin-video',
  );
});

test('the card gives the media band its own control when asked', () => {
  const src = strip(CARD);
  assert.match(src, /onMedia\?: \(\) => void;/, 'LedgerPost lost the onMedia prop');
  assert.match(src, /onMedia \? \(\s*<Pressable onPress=\{onMedia\}/, 'the media band is no longer its own Pressable');
  assert.match(src, /accessibilityLabel=\{media\[0\]\?\.kind === 'video' \? 'Play video'/, 'the band must announce itself as Play video');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. the caption reaches the post
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ the line typed under a photo or video becomes the post body when no reflection was sealed', () => {
  const src = strip(COMPLETE);
  assert.match(src, /const mediaCaption = addedPhotos\.map\(\(p\) => p\.caption\?\.trim\(\) \?\? ''\)\.find\(Boolean\) \?\? '';/);
  assert.match(src, /note=\{reflection \|\| mediaCaption \|\| null\}/, 'the share sheet no longer receives the media caption');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. "shared" is durable
// ─────────────────────────────────────────────────────────────────────────────

test('the already-shared record is read from the rows that already exist — no new table', () => {
  const src = strip(DATA);
  assert.match(src, /export async function fetchWorkoutShares\(workoutId: string\): Promise<PriorShare\[\]>/);
  assert.match(src, /\.eq\('author_id', user\.id\)\s*\.eq\('workout_id', workoutId\)/, 'the read must be scoped to the athlete AND the workout');
});

test('the sheet reads it on open, records every landed post, and refuses what already exists', () => {
  const src = strip(SHEET);
  assert.match(src, /if \(prior == null\) void fetchWorkoutShares\(workoutId\)/, 'the sheet no longer reads prior shares on open');
  assert.match(src, /done\.push\(\{ audience: t\.audience, squadId: t\.squadId \}\);/, 'a landed post must be recorded per target, so a halfway failure still marks what exists');
  assert.match(src, /const squads = unshared;/, 'choose() must offer only the squads that do not have it yet');
  assert.match(src, /disabled=\{sharing \|\| !snapshot \|\| state\.friends\}/, 'the Friends tile must refuse when friends already have it');
  assert.match(src, /disabled=\{sharing \|\| !hasSquad \|\| !snapshot \|\| state\.friends \|\| allSquadsShared\}/, 'the Both tile must refuse when either half already has it');
  assert.match(src, /\{already \? \(/, 'the sheet must say where the session already is');
});

test('the completion screen says "Shared" and keeps saying it on the way back', () => {
  const src = strip(COMPLETE);
  assert.match(src, /void fetchWorkoutShares\(workoutIdForShares\)/, 'the screen must read prior shares on arrival, not only learn them from the sheet');
  assert.match(src, /onShared=\{setShares\}/, 'the sheet must be able to update the screen');
  assert.match(src, /\{shares\?\.length \? 'Shared ✓ · Share again' : 'Share your workout'\}/, 'the button must say Shared once it is');
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. the video has a frame, in the same band as a photo
// ─────────────────────────────────────────────────────────────────────────────

test('a video draws a real first frame with the play disc centred over it', () => {
  const src = strip(CARD);
  assert.match(src, /<MediaThumb url=\{media\[0\]\.url\} kind="video" \/>/, 'the video band no longer draws a MediaThumb frame');
  assert.match(src, /const ratio = 4 \/ 5;/, 'the band is back to a 16:9 letterbox for video');
  assert.doesNotMatch(src, /videoTile/, 'the flat black tile is back');
  assert.match(src, /playOverlay: \{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' \}/);
});
