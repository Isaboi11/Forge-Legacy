import { useState } from 'react';
import { PanResponder, Platform, type GestureResponderEvent, type LayoutChangeEvent, type PanResponderGestureState, type PanResponderInstance, type ViewStyle } from 'react-native';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

/**
 * The drag behind every before/after comparison in the app.
 *
 * ══ ⚠ ROUND FOUR: THE PAGE MOVED WHILE THE THUMB DID ══
 *
 * PO, 2026-09-01: *"when we're sliding the screen should just stay in place."*
 *
 * Round three (below) stopped the divider being yanked by a passing thumb and stopped the drag being
 * handed to the scroller mid-stroke. It did NOT stop the scroller from ALSO moving: `PanResponder`
 * defaults `onShouldBlockNativeResponder` to false, so a native `ScrollView` — and, on web, the
 * browser's own touch scrolling — kept running underneath a drag the JS responder had already claimed.
 * The divider tracked the finger correctly and the whole page slid up behind it.
 *
 * ⚠ AND THE FIX IS *WHEN* WE CLAIM, NOT JUST WHAT WE RETURN. `onShouldBlockNativeResponder` is asked
 * ONCE, at the moment the responder is granted — so it cannot consult an axis that has not been decided
 * yet. Claiming on touch-DOWN (which is what round three did, to keep tap-to-place) therefore forced a
 * choice between "block the scroller for every touch that lands on a photo" and "never block it at all".
 * Neither is right.
 *
 * So the responder is claimed on MOVE, and only once the movement is unambiguously horizontal. By then
 * the answer is known, blocking is correct, and it holds for the rest of the gesture:
 *
 *  · a vertical drag never claims at all → the page scrolls exactly as if the comparison were a photo;
 *  · a horizontal drag claims and blocks → the picture moves and the page does not.
 *
 * ⚠ TAP-TO-PLACE IS GONE WITH IT, deliberately. Placing the divider by tapping needed the touch-down
 * claim that costs the above, and the handle — now at the FOOT of the frame, where a thumb already is —
 * is the affordance the design draws. A convenience nobody asked for is not worth a page that moves
 * while you drag, which is a defect that was reported.
 *
 * ══ ROUND THREE, KEPT: THE THREE THINGS THAT MADE IT "FINICKY" ══
 *
 * PO: *"The swipe picture comparison is finicky… no matter how many slides."* Rounds one and two (see
 * `BeforeAfterSlider`) made the MOVEMENT cheap — a shared value instead of state, two cancelling
 * transforms instead of an animated width. Neither touched ownership of the touch, which is what
 * "finicky" actually described:
 *
 * **1. It moved the divider the instant a finger landed.** With a slider per pose on Compare, scrolling
 * the page re-cut every comparison it passed under. Nothing is drawn until the drag is real.
 *
 * **2. It re-decided the axis on every frame.** `onPanResponderTerminationRequest` returned
 * `|dy| > |dx|` against CUMULATIVE travel, evaluated fresh each time the scroller asked — so a
 * horizontal drag that curved downward at the end was handed away mid-stroke and stopped dead under a
 * finger that was still moving. Now the responder is only ever granted to a horizontal drag, and it is
 * never given back.
 *
 * **3. It tracked `locationX`, which is relative to whatever is under the finger.** Drag past the edge
 * of the frame and the coordinate silently changed origin. The frame's left edge is measured once on
 * grant (`pageX - locationX` is page space) and the drag reads `gestureState.moveX`, which is page space
 * too — so the divider follows the finger inside the photo, past its edge, or off the side of the screen.
 *
 * ⚠ RESPONDER PROPS, NOT `GestureDetector`: `react-native-gesture-handler` needs a
 * `GestureHandlerRootView` at the app root and this app has none.
 */

/**
 * How far a touch must travel horizontally before it counts as a drag.
 *
 * Under this the gesture is still ambiguous and belongs to whatever is scrolling. Much smaller and
 * finger noise steals the page; much larger and the first part of a real drag is dropped on the floor.
 */
const AXIS_SLOP = 5;

/**
 * ⚠ WEB SCROLLS IN THE BROWSER, WHERE `onShouldBlockNativeResponder` MEANS NOTHING.
 *
 * react-native-web has no native responder to block — the page is scrolled by the browser's own
 * compositor, off the main thread, and it will keep scrolling under a JS drag no matter what the
 * responder system decides. `touch-action` is the only thing that speaks to it.
 *
 * `pan-y` says: vertical panning is yours, horizontal is mine. That is precisely the split the
 * responder above implements, so the two agree — a vertical drag scrolls the page natively and never
 * reaches us, and a horizontal one is ours with the page held still. `none` would have worked for the
 * drag and made the comparison a dead zone you cannot scroll past, which is the bug round three fixed.
 */
export const COMPARE_TOUCH_STYLE: ViewStyle | null =
  Platform.OS === 'web' ? ({ touchAction: 'pan-y' } as unknown as ViewStyle) : null;

export interface CompareDrag {
  /** The divider's x, in points from the frame's left edge. Read it from a `useAnimatedStyle`. */
  x: SharedValue<number>;
  /** The frame's measured width. State, because the RENDER needs it; `x` is what the gesture writes. */
  width: number;
  onLayout: (e: LayoutChangeEvent) => void;
  panHandlers: PanResponderInstance['panHandlers'];
}

export function useCompareDrag(): CompareDrag {
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  /**
   * ⚠ SHARED VALUES, NOT STATE AND NOT REFS. The responder below is built ONCE, so everything it reads
   * has to be stable AND live — state would be frozen at first render (when the width is 0), and a ref
   * written during render trips `react-hooks/refs`. A shared value is both, and Reanimated is already
   * here for the divider.
   */
  const wv = useSharedValue(0);
  const originX = useSharedValue(0);
  /** Has the athlete positioned this divider themselves? A resize must not yank one that they have. */
  const touched = useSharedValue(false);

  const onLayout = (e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.width;
    wv.value = next;
    setWidth(next);
    // Centre on first layout, and on any RESIZE the athlete has not overridden — but never move a
    // divider they have already put somewhere.
    if (!touched.value) x.value = next / 2;
  };

  const [pan] = useState(() => {
    const put = (px: number) => {
      touched.value = true;
      x.value = Math.max(0, Math.min(wv.value, px));
    };
    return PanResponder.create({
      /* ⚠ NOT ON TOUCH-DOWN. See the note above: claiming here is what forced the all-or-nothing choice
         about blocking the scroller, and it is what let a passing thumb move the picture. */
      onStartShouldSetPanResponder: () => false,
      /* Claimed the moment the movement is unambiguously sideways, and not before. A vertical or
         still-ambiguous touch is left to whatever is scrolling. */
      onMoveShouldSetPanResponder: (_e: GestureResponderEvent, g: PanResponderGestureState) =>
        Math.abs(g.dx) >= AXIS_SLOP && Math.abs(g.dx) > Math.abs(g.dy),
      /* ⚠ THE LINE THAT KEEPS THE PAGE STILL. Asked once, at grant — and by then the gesture has already
         proved it is horizontal, so the answer can be an unconditional yes. */
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        // The frame's left edge in page coordinates, measured once. `moveX` below is page space.
        originX.value = e.nativeEvent.pageX - e.nativeEvent.locationX;
      },
      onPanResponderMove: (_e: GestureResponderEvent, g: PanResponderGestureState) => {
        put(g.moveX - originX.value);
      },
      /* Granted only to a horizontal drag, so there is nothing left to negotiate: it is ours until the
         finger lifts. This is what stops a stroke that curves downward being handed to the scroller
         halfway through and stopping dead. */
      onPanResponderTerminationRequest: () => false,
    });
  });

  return { x, width, onLayout, panHandlers: pan.panHandlers };
}
