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
const FRIENDS = read('../friends.tsx');
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
  // The friends feed shows the same posts and had the same handler — and for a plain video post, no
  // handler at all. Both feeds play the clip through the one player.
  assert.match(
    strip(FRIENDS),
    /onMedia=\{\s*post\.media\[0\]\?\.kind === 'video'\s*\?\s*\(\) => router\.push\(\{ pathname: '\/pin-video'/,
    'the friends feed no longer routes a video tap to /pin-video',
  );
  assert.match(strip(FRIENDS), /onMedia=\{onMedia\}/, 'FeedLedgerPost no longer passes onMedia to the card');
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
  assert.match(src, /note=\{reflection \|\| mediaCaption \|\| note\.trim\(\) \|\| null\}/, 'the share sheet no longer receives the caption / unsealed note');
});

test('⚠ the sentence that posts is the one on the share sheet, in a box the athlete can see', () => {
  // Second report of the same defect after the first fix: the body must not depend on which of three
  // upstream boxes survived — it is typed (or confirmed) where the post is made.
  const src = strip(SHEET);
  assert.match(src, /const body = \(bodyDraft \?\? note \?\? ''\)\.trim\(\);/, 'the sheet no longer derives the body from its own box');
  assert.match(src, /type: 'recap' as const,\s*body,/, 'the recap must post the body from the sheet');
  assert.match(src, /accessibilityLabel="A comment for the post"/, 'the comment box is gone');
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

test('the completion screen says "Posted" and keeps saying it on the way back', () => {
  const src = strip(COMPLETE);
  assert.match(src, /void fetchWorkoutShares\(workoutIdForShares\)/, 'the screen must read prior shares on arrival, not only learn them from the sheet');
  assert.match(src, /onShared=\{setShares\}/, 'the sheet must be able to update the screen');
  // 2026-09-28: POST is the in-app word. The button says so, and says who sees it.
  assert.match(src, /subLabel="Share with Friends or your Squad"/, 'the Post to Forge sub-line is gone');
  assert.match(src, />\s*Post to Forge\s*</, 'the primary CTA no longer says Post to Forge');
  assert.match(src, /const postedWhere = postedFor\(postedState, mySquads \?\? \[\]\);/, 'the posted state no longer names where');
  assert.doesNotMatch(src, /'Share your workout'/, 'the old share wording is back on the completion screen');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3b. auto-post: on the way OUT, never in review, never with a map or words they did not write
// ─────────────────────────────────────────────────────────────────────────────
test('auto-post never runs in review or outside the just-finished window, and waits for real prefs', () => {
  const src = strip(COMPLETE);
  assert.match(src, /const autoEligible = !review && withinAutoPostWindow\(data\?\.savedAt \?\? null\);/);
  assert.match(src, /!autoTried &&\s*autoPost\.loaded &&/, 'deciding on unloaded (default OFF) prefs would silently skip the post');
  assert.match(src, /shares !== null &&\s*autoPostStanding\(/, 'unread posts must not be taken for "nowhere yet" — that is how a session posts twice');
});

test('⚠ auto-post fires when the athlete LEAVES, not on arrival — so the note and playlist go with it (PO 2026-09-30)', () => {
  const src = strip(COMPLETE);
  assert.doesNotMatch(src, /autoPostOnArrival/, 'posting on arrival is the bug: it published before anything could be added');
  // the button names it
  assert.match(src, /\{autoPosting \? 'Posting…' : 'Post and see your Legacy'\}/);
  assert.match(src, /disabled=\{autoPosting \|\| savingNote \|\| savingPlaylist \|\| savingName\}/, 'a post built mid-save is the session without the thing just added');
  // and there is a way out that does not post
  assert.match(src, />Leave without posting</);
  // leaving any other way still posts; the handler clears the ref so that does not post a second time
  assert.match(src, /if \(a\) void runAutoPost\(a\.id, a\.pref\);/);
  const leave = src.slice(src.indexOf('const postAndLeave = async'));
  assert.ok(leave.indexOf('autoOnLeave.current = null;') < leave.indexOf('await runAutoPost('), 'the unmount would post again');
  assert.ok(leave.indexOf('if (r.error) return;') < leave.indexOf('goHome();'), 'a failed post must not leave for Legacy as if it landed');
  // closing the app is covered by the marker and the launch catch-up
  assert.match(src, /void markAutoPostPending\(workoutIdForShares, savedAtForAuto\)/);
  assert.match(read('../_layout.tsx'), /<AutoPostCatchUp \/>/);
});

test('an auto-post carries only the athlete’s own note, no photos, and never the map (D-RS-3)', () => {
  const src = strip(read('../../data/auto-post-live.ts'));
  assert.match(src, /body: autoPostCaption\(recap\.reflection\),\s*media: \[\],/, 'the caption is their sealed note or nothing; photos never ride an automatic post');
  assert.match(src, /workoutSummary: \{ \.\.\.recap\.summary, shareRoute: false, food: null, auto: true \}/, 'the route and the food must never ride an automatic post');
  assert.doesNotMatch(src, /shareRoute: true/);
});

test('the post sheet speaks POST inside Forge and keeps SHARE for outside it', () => {
  const src = strip(SHEET);
  assert.match(src, /'Post your workout'/);
  assert.match(src, /<Text style=\{styles\.group\}>Post to<\/Text>/);
  assert.match(src, /<Text style=\{styles\.group\}>Outside Forge<\/Text>/);
  assert.doesNotMatch(src, /Within Forge|'Share your workout'|'Sharing…'/);
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
