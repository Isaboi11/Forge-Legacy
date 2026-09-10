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
 * ⚠ (1) CAME BACK ON 2026-09-08, AND THE ANSWER WAS THE OPPOSITE OF THE FIRST ONE. *"It would be easier
 * to adjust the photos like this somehow. You see how I can see them lining up?"* — said while looking at
 * the SLIDER. Making the modal's onion-skin readable had been the right repair to the wrong thing: the
 * comparison itself is where the two bodies can be seen meeting, so the modal is retired and the drag
 * happens on the photograph. And the alignment is now KEPT (0197) rather than living in a `useState` that
 * threw the work away on every exit. Section 1 guards that shape.
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
import { existsSync, readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const ADJUST = strip(read('../../hooks/useFrameAdjust.ts'));
const COMPARE = strip(read('../transformation-compare.tsx'));
const XDATA = strip(read('../../data/transformation-live.ts'));
const SQL_FRAMES = read('../../../supabase/migrations/0197_transformation_frames.sql');
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
// 1. you line them up ON the comparison, and it is kept
// ─────────────────────────────────────────────────────────────────────────────

test('⭐ the line-up happens on the comparison, not in a modal beside it', () => {
  // The first repair made the modal's onion-skin readable. The second deleted the modal: the slider's
  // seam is the ruler, and the athlete was being asked to judge alignment somewhere it was not.
  assert.ok(!existsSync(new URL('../../components/forge/AlignEditor.tsx', import.meta.url)), 'the align modal is back');
  assert.doesNotMatch(COMPARE, /AlignEditor/, 'Compare opens the align modal again');
  assert.match(COMPARE, /adjust=\{adjusting\}/, 'the slider is no longer given an adjust mode');
  assert.match(SLIDER, /adjust \? adj\.panHandlers : panHandlers/, 'adjusting no longer takes the drag from the divider');
});

test('⭐ the finger picks its own photo — there is no Before/After control', () => {
  // The modal asked WHICH photo before letting you move one. Touching it is the answer.
  assert.match(ADJUST, /splitV\.value && wv\.value && e\.nativeEvent\.locationX > wv\.value \/ 2 \? 1 : 0/, 'the slot is no longer chosen by which side the finger landed on');
  assert.match(SLIDER, /split: true/, 'the slider no longer tells the gesture it holds two photos');
});

test('⚠ the alignment is STORED — it used to be thrown away on every exit', () => {
  // It lived in a `useState` on the Compare screen. The athlete lined two photographs up, left, and did
  // it again next time — every time, forever.
  assert.match(COMPARE, /saveTransformationFrames\(entry\.id, next\)/, 'the framing is no longer persisted');
  assert.match(XDATA, /COLS_FRAMED = .\$\{COLS_BASE\}, frames./, 'the entry read no longer asks for frames');
  assert.match(SQL_FRAMES, /add column if not exists frames jsonb/, '0197 no longer adds the column');
});

test('⚠ a client that ships before 0197 is pasted still shows the archive', () => {
  // Selecting a column that is not there fails the WHOLE query — six irreplaceable photographs would
  // read as "no entries" because of a cosmetic feature.
  assert.match(XDATA, /code === '42703'/, 'the missing-column downgrade is gone');
  assert.match(XDATA, /framesColumn = false;/, 'the downgrade no longer sticks, so every read pays for it');
});

test('⚠ changing which captures are compared REMOUNTS the row', () => {
  // `useFrameAdjust` seeds its shared values once, at mount — it cannot be synced from a prop later
  // without tripping `react-hooks/immutability`, and syncing would fight a live gesture besides. Without
  // both entry ids in the key, the framing of the photograph that just left is applied to its replacement.
  assert.match(COMPARE, /key=\{.\$\{aEff \?\? 'a'\}:\$\{bEff \?\? 'b'\}:\$\{p\.key\}.\}/, 'the row key no longer carries both entry ids');
});

test('the adjust drag never re-renders either photo', () => {
  // Same rule the divider drag was rewritten twice for: state per touch event re-reconciles both Images
  // and the clip. React hears about this gesture once, on release.
  assert.match(ADJUST, /const t0 = useSharedValue<PhotoFrame>/, 'the live frame is no longer a shared value');
  assert.doesNotMatch(ADJUST, /useState<PhotoFrame>/, 'the frame is back in React state, and every touch will re-render');
  assert.match(ADJUST, /useAnimatedReaction\(/, 'the commit no longer goes back to JS through a reaction');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. the comparison draws itself ON the feed
// ─────────────────────────────────────────────────────────────────────────────

test('⭐ the squad feed draws the comparison, not flat photos', () => {
  // ⚠ WIDENED, NOT WEAKENED (0192). A third shape now shares `layout` — the posted workout — so these
  // read "the transformation branch is still there and still guarded" rather than pinning the exact
  // ternary, which would have to be rewritten by every future shape without saying anything more.
  assert.match(SQUAD, /const shaped = card[^;]*\? null : asTransformationLayout\(post\.layout\)/, 'the feed no longer reads a transformation layout');
  assert.match(SQUAD, /customMedia=\{[\s\S]{0,400}?shaped \? \(?\s*<TransformationLayout/, 'the feed no longer passes the composition as custom media');
});

test('the raw photos are suppressed when the composition draws them', () => {
  // Passing both renders the comparison AND the loose photos under it.
  assert.match(SQUAD, /const media = card \|\| shaped[^?]*\? \[\] : post\.media\.map/, 'a composed post also passes its raw media');
  assert.match(SQUAD, /const hasMedia = !!card \|\| !!shaped[^;]*\|\| media\.length > 0/, 'hasMedia no longer counts the composition');
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
  // The touch is still CLAIMED on down (see below) — it is the DRAWING that waits.
  assert.doesNotMatch(DRAG, /onPanResponderGrant: \([\s\S]{0,200}?put\(/, 'the divider moves on touch-down again');
  assert.match(DRAG, /onPanResponderRelease: [\s\S]{0,300}?put\(e\.nativeEvent\.locationX\)/, 'a tap no longer places the divider');
});

test('⭐ THE TOUCH IS CLAIMED ON TOUCH-DOWN — the feed stops sliding without it', () => {
  // PO: *"the sliding doesn't work on the feed."* A round that moved the claim to the first horizontal
  // MOVE broke it: a comparison in the feed sits inside a vertical scroller and a ledger card's own
  // press targets, and this view only reliably wins the gesture by claiming on down, where it is the
  // deepest node on the path.
  //
  // ⚠ AND THE MOVE-CLAIM WAS PREDICATED ON STALE DATA BESIDES: `_updateGestureStateOnMove` is called
  // from `onMoveShouldSetResponderCapture` and `onResponderMove`, NOT from the bubble-phase
  // `onMoveShouldSetResponder` — so `g.dx` there is whatever the capture pass last left behind.
  assert.match(DRAG, /onStartShouldSetPanResponder: \(\) => true/, 'the drag no longer claims the touch on touch-down — the feed will stop sliding');
  assert.doesNotMatch(
    DRAG,
    /onMoveShouldSetPanResponder: [\s\S]{0,200}?Math\.abs\(g\.dx\) >= AXIS_SLOP/,
    'the move-predicated claim is back, and it reads a gestureState the bubble phase does not refresh',
  );
});

test('⚠ `onShouldBlockNativeResponder` DEFAULTS TO TRUE — do not "fix" the page by setting it', () => {
  // PanResponder.js, onResponderGrant:
  //   return config.onShouldBlockNativeResponder == null ? true : config.onShouldBlockNativeResponder(...)
  // Setting it to `true` is a no-op that reads like a fix. A whole round was spent restructuring the
  // claim around that misreading, and the restructure is what broke the feed. What actually holds the
  // page still on web is `touch-action`, below; on native it was never not held.
  assert.doesNotMatch(DRAG, /onShouldBlockNativeResponder/, 'setting this changes nothing — it already defaults to true, and believing otherwise cost the feed a round');
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

test('⚠ the axis is decided ONCE and then held for the whole gesture', () => {
  // The report: a drag that curved downward at the end stopped dead under a moving finger, because the
  // termination request re-evaluated `|dy| > |dx|` on CUMULATIVE travel every time the scroller asked.
  //
  // ⚠ THE VERTICAL ARM IS NOT OPTIONAL. `onResponderGrant` blocks the native scroller by default, so
  // this is the only thing that hands it back — without it a comparison is a dead zone in the feed.
  assert.match(DRAG, /if \(axis\.value === 1\) return false;/, 'a horizontal drag can be taken away mid-stroke again');
  assert.match(DRAG, /if \(axis\.value === 2\) return true;/, 'a vertical scroll is never handed back — the feed cannot be scrolled past a comparison');
  assert.match(DRAG, /axis\.value = adx >= ady \? 1 : 2;/, 'the axis is no longer latched');
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
