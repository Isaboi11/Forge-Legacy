/**
 * transformation-post-controls.test.mjs — five PO reports on one transformation post, held as guards.
 *
 * 2026-08-31, one message:
 *   1. "When doing a line up for comparisons it was hard to see the other photo to line it up with."
 *   2. "I posted on the squad and the slider was not on the post unless I clicked into it."
 *   3. "The slider is not smooth."
 *   4. "Let me be able to name/rename the post for transformation."
 *   5. "Let me be able to delete a post."
 *
 * ⚠ (3) IS THE SECOND TIME. `BeforeAfterSlider` was already rewritten once for "the slider feature isn't
 * too smooth" — the position moved to a Reanimated shared value and it got better rather than good,
 * because it was still animating `width` (a LAYOUT property) and still claiming every touch. And there
 * was a whole SECOND slider on the friends feed that had never been touched at all. Both are guarded
 * here, together, so the next person to open one of them finds the other.
 *
 * `node --test` cannot mount a screen or reach a database, so these read source. Same shape as the other
 * wiring guards in this directory.
 *
 * Run:  node --test src/app/__tests__/transformation-post-controls.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const ALIGN = strip(read('../../components/forge/AlignEditor.tsx'));
const SLIDER = strip(read('../../components/forge/BeforeAfterSlider.tsx'));
const DRAG = strip(read('../../hooks/useCompareDrag.ts'));
const FRIENDS = strip(read('../friends.tsx'));
const SQUAD = strip(read('../squad/[id].tsx'));
const LAYOUT = strip(read('../../components/forge/TransformationLayout.tsx'));
const DETAIL = strip(read('../squad-post/[id].tsx'));
const DATA = strip(read('../../data/squad-feed-live.ts'));
const SQL = read('../../../supabase/migrations/0186_rename_squad_post.sql');
/* 0186 header quotes the for-update policy it deliberately does NOT add, so a naive
   search finds the explanation rather than a real policy. Comments stripped. */
const SQL_CODE = SQL.replace(/^[ ]*--.*$/gm, '');
const BUNDLE = read('../../../supabase/apply/pending-0186.sql');

// ─────────────────────────────────────────────────────────────────────────────
// 1. you can see the photo you are lining up against
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ the MOVING photo is the translucent one, not the reference', () => {
  // The bug was the other way round: the reference was drawn at 0.4 UNDERNEATH a fully opaque moving
  // photo, and both `cover` the same frame — so the reference was never visible at all.
  assert.match(ALIGN, /moving: \{ opacity: 0\.\d+ \}/, 'the translucent style is gone or renamed');
  assert.doesNotMatch(ALIGN, /dim: \{ opacity/, 'the old `dim` reference style is back');
  const moving = ALIGN.indexOf('styles.moving');
  const first = ALIGN.indexOf('<Image');
  assert.ok(moving > first, 'the translucent layer is drawn first — it must sit ON TOP of the reference');
});

test('the two selections cannot disagree about which layer is which', () => {
  // Written as one pair driven by `sel`, not two mirrored branches — mirrored branches are how the
  // layers got swapped in one case and not the other.
  assert.doesNotMatch(ALIGN, /sel === 'after' \? \(\s*<>/, 'the mirrored-branch shape is back');
  assert.match(ALIGN, /source=\{\{ uri: sel === 'after' \? before : after \}\}/, 'the reference is no longer chosen from `sel`');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. the comparison draws itself ON the feed
// ─────────────────────────────────────────────────────────────────────────────

test('⭐ the squad feed draws the comparison, not flat photos', () => {
  assert.match(SQUAD, /const shaped = card \? null : asTransformationLayout\(post\.layout\)/, 'the feed no longer reads a transformation layout');
  assert.match(SQUAD, /customMedia=\{card \? <FeedProgressCard card=\{card\} \/> : shaped \? <TransformationLayout/, 'the feed no longer passes the composition as custom media');
});

test('the raw photos are suppressed when the composition draws them', () => {
  // Passing both renders the comparison AND the loose photos under it.
  assert.match(SQUAD, /const media = card \|\| shaped \? \[\] : post\.media\.map/, 'a composed post also passes its raw media');
  assert.match(SQUAD, /const hasMedia = !!card \|\| !!shaped \|\| media\.length > 0/, 'hasMedia no longer counts the composition');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. both sliders, and neither animates layout
// ─────────────────────────────────────────────────────────────────────────────

for (const [name, src] of [
  ['BeforeAfterSlider', SLIDER],
  ['the friends feed comparison', FRIENDS],
]) {
  test(`⚠ ${name} reveals with transforms, never an animated width`, () => {
    // `width` is layout. A layout pass per frame is the thing that was still slow after round one.
    assert.doesNotMatch(src, /useAnimatedStyle\(\(\) => \(\{ width:/, `${name} still animates width`);
    assert.match(src, /clipStyle = useAnimatedStyle\(\(\) => \(\{ transform: \[\{ translateX: x\.value - w(idth)?\b/, `${name} lost its outer clip transform`);
    assert.match(src, /clipInnerStyle = useAnimatedStyle\(\(\) => \(\{ transform: \[\{ translateX: w(idth)? - x\.value/, `${name} lost the cancelling inner transform`);
  });

  /**
   * ⚠ ROUND THREE MOVED THE GESTURE OUT OF BOTH FILES. PO, 2026-09-01: *"the swipe picture comparison is
   * finicky."* The physics guarded above were fine; who owned the TOUCH was not, and the fix is one
   * shared `useCompareDrag` rather than the same repair made twice in two files — which is exactly how
   * round two came to find a second slider that had never been fixed at all.
   *
   * So these two now assert the copy is GONE. What the drag must do is guarded once, below.
   */
  test(`${name} uses the one shared drag, not a copy of it`, () => {
    assert.match(src, /useCompareDrag\(\)/, `${name} no longer uses the shared drag`);
    assert.doesNotMatch(src, /PanResponder\.create\(/, `${name} has grown its own responder again — that is how the two drifted apart`);
    assert.doesNotMatch(src, /setPct\(/, `${name} writes a percentage to state on every touch event`);
  });
}

/**
 * The drag itself. Every rule here is a defect that was reported at least once.
 */
test('⚠ the divider is NOT moved when a finger merely lands on it', () => {
  // The report: scrolling past a comparison re-cut it, because `track` ran from `onPanResponderGrant`.
  // The responder is not even CLAIMED on touch-down now — see the next test for why that had to change.
  assert.match(DRAG, /onStartShouldSetPanResponder: \(\) => false/, 'the drag claims the touch on touch-down again');
  assert.doesNotMatch(DRAG, /onPanResponderGrant: \([\s\S]{0,200}?put\(/, 'the divider moves on touch-down again');
});

test('⭐ THE PAGE STAYS STILL WHILE YOU DRAG — claimed on MOVE, and only when horizontal', () => {
  // PO: *"when we're sliding the screen should just stay in place."* `onShouldBlockNativeResponder` is
  // asked ONCE, at grant — so it cannot consult an axis decided later. Claiming on touch-down forced a
  // choice between blocking the scroller for every touch and never blocking it. Claiming on the first
  // unambiguously horizontal move means the answer is already known and can be an unconditional yes.
  assert.match(DRAG, /onShouldBlockNativeResponder: \(\) => true/, 'the native scroller runs under the drag again');
  assert.match(
    DRAG,
    /onMoveShouldSetPanResponder: [\s\S]{0,200}?Math\.abs\(g\.dx\) >= AXIS_SLOP && Math\.abs\(g\.dx\) > Math\.abs\(g\.dy\)/,
    'the drag claims vertical or ambiguous movement again — that is a comparison you cannot scroll past',
  );
});

test('⚠ WEB SCROLLS IN THE BROWSER, where blocking the native responder means nothing', () => {
  // The page is scrolled off the main thread by the compositor and will keep going under a JS drag.
  // `pan-y` gives the browser the vertical axis and keeps the horizontal one, matching the responder.
  assert.match(DRAG, /touchAction: 'pan-y'/, 'the web comparison lets the browser scroll the page while dragging');
  assert.doesNotMatch(DRAG, /touchAction: 'none'/, "'none' makes the comparison a dead zone you cannot scroll past");
  for (const [name, src] of [['BeforeAfterSlider', SLIDER], ['the friends feed comparison', FRIENDS]]) {
    assert.match(src, /COMPARE_TOUCH_STYLE/, `${name} does not apply the touch-action style`);
  }
});

test('⭐ the grab handle sits at the FOOT of the frame, not over the middle of the photo', () => {
  // PO: *"the actual slider circle that's in the middle should be at the bottom."* Dead centre puts the
  // handle over the part of a progress shot people are trying to see, and reaching it means covering the
  // comparison with your hand.
  const handle = SLIDER.slice(SLIDER.indexOf('  handle: {'));
  const block = handle.slice(0, handle.indexOf('},'));
  assert.match(block, /bottom: \d+/, 'the handle is no longer anchored to the bottom of the frame');
  assert.doesNotMatch(block, /top: '50%'/, 'the handle is centred over the photograph again');
  // ⚠ A percentage against a parent whose height comes from `aspectRatio` is the RN trap that
  // resolves to no constraint at all. `bottom` is a real edge.
  assert.doesNotMatch(block, /marginTop: -/, 'the centring offset is back, and it will fight `bottom`');
});

test('⚠ a horizontal drag is never handed back mid-stroke', () => {
  // The report: a drag that curved downward at the end stopped dead under a moving finger, because the
  // termination request re-evaluated `|dy| > |dx|` on CUMULATIVE travel every time the scroller asked.
  // The responder is now granted only to a drag that has already proved itself horizontal, so there is
  // nothing left to negotiate and the answer is a flat no.
  assert.match(DRAG, /onPanResponderTerminationRequest: \(\) => false/, 'a horizontal drag can be taken away mid-stroke again');
});

test('the drag still never re-renders, and its responder is built once', () => {
  assert.match(DRAG, /const x = useSharedValue\(0\)/, 'the divider is no longer a shared value');
  assert.match(DRAG, /useState\(\(\) => \{[\s\S]{0,400}?PanResponder\.create\(/, 'the PanResponder is rebuilt every render');
});

test('the drag reads its width from a shared value, not a ref', () => {
  // `react-hooks/refs` counts a `useState` initializer as render, so a ref here is a lint ERROR in this
  // repo. A shared value is stable, readable from a handler, and already present.
  assert.match(DRAG, /Math\.max\(0, Math\.min\(wv\.value, px\)\)/, 'the drag reads its width from something else');
  assert.doesNotMatch(DRAG, /wRef\.current/, 'the drag is back on a ref');
});

test('⚠ tracking is in PAGE space, so dragging past the frame still follows the finger', () => {
  // `locationX` is relative to whatever is under the touch, which changes the moment the finger leaves
  // the photo. The frame's origin is measured once on grant and the drag reads `gestureState.moveX`.
  assert.match(DRAG, /originX\.value = e\.nativeEvent\.pageX - e\.nativeEvent\.locationX/, 'the frame origin is no longer measured on grant');
  assert.match(DRAG, /put\(g\.moveX - originX\.value\)/, 'the drag is back on a target-relative coordinate');
});

// ─────────────────────────────────────────────────────────────────────────────
// 4 + 5. name it, or take it down
// ─────────────────────────────────────────────────────────────────────────────

test('the name rides the layout, so no read path had to change', () => {
  assert.match(DATA, /title\?: string \| null;/, 'TransformationLayoutData lost its title');
  assert.match(SQL, /jsonb_set\(coalesce\(p\.layout, '\{\}'::jsonb\), '\{title\}'/, '0186 no longer writes the title into layout');
  assert.doesNotMatch(SQL, /alter table public\.squad_posts add column/, '0186 adds a column — the feed RPCs would have to be rebuilt');
});

test('⚠ renaming is author-only, and buys no other write access', () => {
  assert.match(SQL, /and p\.author_id = v_uid;/, 'the authorship check is gone — a definer function exempts its caller from RLS');
  assert.match(SQL, /get diagnostics v_rows = row_count/, 'a rename that matched no row would succeed silently');
  // The reason the RPC exists at all.
  assert.doesNotMatch(SQL_CODE, /for update/i, '0186 adds an UPDATE policy — an author could then rewrite type, audience or the snapshot');
  assert.match(BUNDLE, /raise exception '0186: an UPDATE policy exists on squad_posts/, 'the bundle no longer checks that no UPDATE policy appeared');
});

test('a blank name clears it rather than storing an empty one', () => {
  assert.match(SQL, /v_clean := nullif\(btrim\(coalesce\(p_title, ''\)\), ''\)/, 'the title is no longer trimmed to null');
  assert.match(SQL, /coalesce\(p\.layout, '\{\}'::jsonb\) - 'title'/, 'clearing no longer removes the key');
});

test('deleting needed no migration, and the client says why', () => {
  assert.match(DATA, /export async function deleteSquadPost/, 'the delete call is gone');
  // No ownership check is repeated client-side — the 0041 policy is the authority.
  assert.match(DATA, /from\('squad_posts'\)\.delete\(\)\.eq\('id', postId\)/, 'the delete changed shape');
  assert.match(BUNDLE, /tablename = 'squad_posts' and cmd = 'DELETE'/, 'the bundle no longer shows the delete policy it relies on');
});

test('both controls are offered on your own post, and only there', () => {
  assert.match(DETAIL, /const mine = !!post && !!myId && post\.authorId === myId/, 'ownership is no longer computed');
  assert.match(DETAIL, /mine \? \(/, 'the manage menu is not gated on ownership');
  // Reporting yourself stays hidden — the two actions share one AppBar slot.
  assert.match(DETAIL, /accessibilityLabel="Manage this post"/, 'the manage button is gone');
  assert.match(DETAIL, /accessibilityLabel="Report this post"/, 'the report button was lost in the swap');
});

test('⚠ deleting asks first, and says what goes with it', () => {
  assert.match(DETAIL, /open=\{confirmDelete\}/, 'the delete confirmation sheet is gone');
  assert.match(DETAIL, /along with its comments/, 'the confirmation no longer says the comments go too');
  // A rename shows immediately rather than waiting for the next focus refetch.
  assert.match(DETAIL, /<TransformationLayout data=\{\{ \.\.\.shaped, title: shapedTitle \}\} \/>/, 'a rename no longer shows until refetch');
});

test('the title is drawn by the composition, so every surface gets it', () => {
  // `LedgerPost` suppresses its own `title` on any post carrying customMedia, which a comparison always
  // does — so the name has to travel inside the art or the feed would never show it.
  assert.match(LAYOUT, /const title = data\.title\?\.trim\(\)/, 'the layout no longer reads its title');
  assert.match(LAYOUT, /function TransformationArt/, 'the art was not split out from the titled wrapper');
});
