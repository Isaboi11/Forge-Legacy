/**
 * Three PO reports from 2026-09-01, held as guards.
 *
 *   1. "When I go into my transformation page and I see my three different entries, I should be able to
 *      carousel scroll on those cards quickly."
 *   2. "When I click on a video in my accomplishment it has to be paused for me to leave it, but I want
 *      to be able to leave it at any time."
 *   3. "When I click on a transformation card I should be able to just view it in different ways. Like a
 *      grid style if I want too."
 *
 * (2) is the interesting one, and the reason this file leads with it: the defect was a guard whose
 * CONDITION contradicted its own comment. Nothing was missing and nothing threw — the code did exactly
 * what it said and the opposite of what it meant. tsc cannot see that, lint cannot see that, and no unit
 * test in this repo can mount a `VideoView`. So it is a source assertion.
 *
 * Run:  node --test src/app/__tests__/gallery-video-grid.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
/** Code only. A comment describing the behaviour a test forbids must not satisfy that test. */
const strip = (src) => src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const ACCOMP = strip(read('../accomplishments.tsx'));
const GALLERY = strip(read('../transformation.tsx'));
const DETAIL = strip(read('../transformation/[id].tsx'));

// ─────────────────────────────────────────────────────────────────────────────
// 2. you can leave a playing video
// ─────────────────────────────────────────────────────────────────────────────

/** The body of `AccomplishmentVideo`, so another video surface cannot satisfy these. */
const VIDEO = (() => {
  const start = ACCOMP.indexOf('function AccomplishmentVideo(');
  assert.notEqual(start, -1, 'AccomplishmentVideo was renamed — update this test with the component');
  const rest = ACCOMP.slice(start);
  const end = rest.indexOf('\nfunction ');
  return end === -1 ? rest : rest.slice(0, end);
})();

test('⚠ auto-fullscreen is LATCHED, not re-evaluated on every play event', () => {
  // THE DEFECT: `if (isPlaying) enterFullscreen()` inside a `playingChange` listener. Leaving fullscreen
  // does not pause the clip, so on the way out `isPlaying` was still true, the listener fired again and
  // put the athlete straight back in. Pausing first worked; leaving while playing did not — which is the
  // report, exactly. A condition evaluated every event can always be re-entered; a latch cannot.
  assert.match(VIDEO, /escalated\.current = true;/, 'the escalation no longer latches');
  assert.match(VIDEO, /if \(!isPlaying \|\| escalated\.current\) return;/, 'the listener no longer bails once it has already escalated');
  assert.doesNotMatch(VIDEO, /if \(isPlaying\) void viewRef\.current\?\.enterFullscreen/, 'the inverted guard is back — leaving a playing video will pull you straight back in');
});

test('⚠ leaving fullscreen latches it too, whichever way the athlete got in', () => {
  // They can reach fullscreen without passing through our listener at all, by tapping the native expand
  // button before pressing play. Latching on the way OUT closes that path as well.
  assert.match(VIDEO, /onFullscreenExit=\{\(\) => \{/, 'onFullscreenExit is gone — a manually-expanded clip can still trap the athlete');
});

test('a new clip is a new decision', () => {
  // The ref outlives the player when `url` changes, so it has to be cleared where the player is.
  assert.match(VIDEO, /escalated\.current = false;/, 'the latch is never reset, so a second clip will not auto-expand');
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. a chapter's entries are a shelf
// ─────────────────────────────────────────────────────────────────────────────

test('⭐ a chapter’s entries scroll sideways, and a flick lands ON a card', () => {
  // A free-scrolling horizontal list is not a carousel: it stops between two cards.
  assert.match(GALLERY, /snapToInterval=\{cardW \+ CARD_GAP\}/, 'the shelf no longer snaps to the card pitch');
  assert.match(GALLERY, /decelerationRate="fast"/, 'the shelf scrolls with list momentum rather than carousel momentum');
  assert.doesNotMatch(GALLERY, /cardStack:/, 'the vertical stack is back');
});

test('⚠ THE CARD STOPPED SCROLLING SIDEWAYS, or the carousel could not exist', () => {
  // A horizontal ScrollView inside a horizontal ScrollView: the inner one eats every drag that begins on
  // a photograph, which is most of the card. This app has spent two passes on exactly that defect class
  // in the comparison slider; a third one built on purpose is not a trade.
  const card = GALLERY.slice(GALLERY.indexOf('function EntryCard('));
  assert.doesNotMatch(card, /<ScrollView\s+horizontal/, 'the pose strip is a horizontal scroller again, nested inside the carousel');
  assert.match(card, /styles\.poseGrid/, 'the poses are no longer laid out as a grid');
});

test('the pose tiles size themselves from the card, which sizes itself from the screen', () => {
  // A hard 76×100 letterboxes on a wide phone and overflows on a narrow one now that the card's width
  // comes from the shelf rather than from the page.
  const grid = GALLERY.slice(GALLERY.indexOf('  poseCell:'));
  assert.match(grid.slice(0, 500), /flexBasis: '3\d(\.\d)?%'/, 'the pose cell is back on a fixed width');
  assert.match(grid.slice(0, 500), /aspectRatio: 3 \/ 4/, 'the pose slot is back on a fixed height');
});

test('⚠ the shelf shows that there IS more to the side', () => {
  // A carousel whose cards are exactly the content width is indistinguishable from a static card until
  // you happen to drag it.
  assert.match(GALLERY, /const CARD_PEEK = \d+/, 'the peek is gone — the carousel looks like a single card');
  assert.match(GALLERY, /winW - 18 \* 2 - CARD_PEEK/, 'the card width no longer leaves room for the peek');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. more than one way to look at an entry
// ─────────────────────────────────────────────────────────────────────────────

test('⭐ the entry detail offers a grid as well as the hero', () => {
  assert.match(DETAIL, /useState<'single' \| 'grid'>\('single'\)/, 'the layout choice is gone, or no longer defaults to the hero');
  assert.match(DETAIL, /layout === 'grid' \?/, 'the grid is never rendered');
  assert.match(DETAIL, /styles\.gridTile/, 'the grid tile lost its style');
});

test('⚠ the chooser is only drawn where it changes something', () => {
  // A grid of one tile is the hero with extra steps.
  assert.match(DETAIL, /hasMedia && options\.length > 1 \? \(\s*<View style=\{styles\.layoutToggle\}/, 'the toggle is drawn on a single-pose entry, where both options are the same picture');
});

test('a tile is the fastest way BACK to the hero, not a dead end', () => {
  const grid = DETAIL.slice(DETAIL.indexOf('styles.gridCell'));
  const cell = DETAIL.slice(DETAIL.indexOf('setLayout(\'single\');') - 400, DETAIL.indexOf('styles.gridCell') + 200);
  assert.ok(grid.length > 0, 'the grid cell is gone');
  assert.match(cell, /setSel\(o\.key\);/, 'tapping a tile no longer selects that pose');
  assert.match(cell, /setLayout\('single'\);/, 'tapping a tile no longer opens it large');
});

test('the “View · <pose>” row is hidden in the grid, where six poses are on screen', () => {
  assert.match(DETAIL, /activeOpt && layout === 'single' \?/, 'the hero’s caption row is drawn over the grid, naming one of six visible poses as if it were selected');
});
