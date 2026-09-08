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
 * …and two from 2026-09-08, after none of the above had yet reached the phone (they went onto a branch
 * the build-8 OTA was never cut from). Together they REPLACE (1):
 *
 *   4. "I like the way the cards are. Keep the shape and size. But have it be able to scroll like a
 *      carousel with my thumb through the pictures."
 *   5. "I don't want the cards to be carousels. Just the pictures in the cards we have in the
 *      screenshot. Also, let's have the add progress pics at the top of the cards and not the bottom."
 *
 * ⚠ (1) WAS READ TOO WIDELY, AND TWO PASSES WERE SPENT ON THE CONSEQUENCE. Making the cards a
 * horizontal shelf put two horizontal scrollers on one axis, since the card carries its own pose strip.
 * The first reconciliation flattened the poses into a 3-column grid, which doubled the card's height;
 * the second put the strip back and chained the drag out of it with `bounces={false}`. (5) says the
 * shelf was never wanted: the PICTURES move, the cards stack. One horizontal scroller on the screen,
 * and no workaround for a conflict that no longer exists. Seeing all six poses at once was never
 * dropped — it is (3), one tap away, on a screen with room for it.
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
// 1 / 5. the cards stack; the pictures move
// ─────────────────────────────────────────────────────────────────────────────

test('⭐ THE CARDS DO NOT MOVE SIDEWAYS — only the pictures inside them do', () => {
  // PO, 2026-09-08: "I don't want the cards to be carousels. Just the pictures in the cards."
  // The shelf is what made the card's own pose strip a nested same-axis scroller, and every workaround
  // for that (the wrapped grid, then `bounces={false}`) cost something the PO had asked to keep.
  assert.match(GALLERY, /cardStack: \{ gap: CARD_GAP \}/, 'the entries are not a plain vertical stack');
  assert.doesNotMatch(GALLERY, /cardShelf/, 'the horizontal card shelf is back');
  assert.doesNotMatch(GALLERY, /snapToInterval=\{cardW/, 'the cards snap like a carousel again');
  assert.doesNotMatch(GALLERY, /useWindowDimensions/, 'the card is being measured off the window again — only a carousel page needed that');
});

test('⭐ “Take progress pics” sits ABOVE the record, not under it', () => {
  // PO: "let's have the add progress pics at the top of the cards and not the bottom." The list grows;
  // a button after the last chapter gets further from the thumb with every entry added.
  const populated = GALLERY.slice(GALLERY.indexOf('        ) : ('), GALLERY.indexOf('      </ScrollView>'));
  const cta = populated.indexOf('accessibilityLabel="Take progress pics"');
  const firstGroup = populated.indexOf('{groups.map((g) => {');
  assert.ok(cta !== -1 && firstGroup !== -1, 'the CTA or the chapter list moved — update this test with the screen');
  assert.ok(cta < firstGroup, 'the add-photos CTA is below the chapter cards again');
});

test('⭐ the poses inside a card are a strip you drag, and a flick lands ON a pose', () => {
  // PO, 2026-09-08: "I like the way the cards are. Keep the shape and size. But have it be able to
  // scroll like a carousel with my thumb through the pictures."
  //
  // These six spent one pass as a 3-column grid, so that nothing competed with the card shelf for the
  // horizontal drag. It worked, and it roughly DOUBLED the card's height — the one dimension the
  // instruction protects. `Forge Transformation.dc.html` draws this row as `overflow-x:auto` anyway, so
  // the strip is both the instruction and the design. The shelf it was competing with is now gone.
  const card = GALLERY.slice(GALLERY.indexOf('function EntryCard('));
  assert.match(card, /<ScrollView\s+horizontal/, 'the pose strip stopped scrolling sideways');
  assert.match(card, /snapToInterval=\{POSE_W \+ POSE_GAP\}/, 'the strip no longer snaps to the pose pitch, so a flick stops between two photographs');
  assert.doesNotMatch(card, /styles\.poseGrid/, 'the poses are a wrapped grid again, which is the card-height regression');
});

test('the strip is the screen’s ONLY horizontal scroller, and carries no workaround for a shelf', () => {
  // `bounces={false}` and `nestedScrollEnabled` existed solely to share the horizontal axis with the
  // card shelf. The shelf is gone; a prop kept "just in case" is a prop the next reader has to explain.
  const strips = GALLERY.match(/<ScrollView\s+horizontal/g) ?? [];
  assert.equal(strips.length, 1, 'a second horizontal scroller is back on this screen');
  const card = GALLERY.slice(GALLERY.indexOf('function EntryCard('));
  const strip = card.slice(card.indexOf('<ScrollView'), card.indexOf('</ScrollView>'));
  assert.doesNotMatch(strip, /bounces=\{false\}/, 'the strip refuses to bounce for a shelf that no longer exists');
  assert.doesNotMatch(strip, /disableIntervalMomentum/, 'one 76pt tile per flick is three flicks to the last pose');
});

test('the card keeps the shape and size it was told to keep', () => {
  // The `.dc`'s `fl-strip` numbers: a 76×100 tile, 8 apart. Sizing the tile off the card instead — which
  // is what the grid did — is what made the card grow.
  assert.match(GALLERY, /const POSE_W = 76;/, 'the pose tile is no longer the design’s width');
  assert.match(GALLERY, /const POSE_GAP = 8;/, 'the gap between poses left the design');
  const slot = GALLERY.slice(GALLERY.indexOf('  poseSlot:'), GALLERY.indexOf('  poseSlot:') + 300);
  assert.match(slot, /width: POSE_W, height: 100/, 'the pose slot is sizing itself from the card again, which grows the card');
});

test('the shelf left nothing behind', () => {
  assert.doesNotMatch(GALLERY, /CARD_PEEK/, 'the card peek is dead machinery — it only ever sized a carousel page');
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
