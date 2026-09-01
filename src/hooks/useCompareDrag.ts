import { useState } from 'react';
import { PanResponder, type GestureResponderEvent, type LayoutChangeEvent, type PanResponderGestureState, type PanResponderInstance } from 'react-native';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

/**
 * The drag behind every before/after comparison in the app.
 *
 * ══ ⚠ ROUND THREE. THE PHYSICS WERE FIXED; THE GESTURE STILL WASN'T ══
 *
 * PO, 2026-09-01: *"The swipe picture comparison is finicky… let's figure it out to be able to use the
 * picture swipe function extremely smooth no matter how many slides."*
 *
 * Rounds one and two (see `BeforeAfterSlider`) made the MOVEMENT cheap — a shared value instead of
 * state, two cancelling transforms instead of an animated width. Both were real and both landed. What
 * neither touched is the part the athlete actually experiences as "finicky", which is not frame rate at
 * all. It is **who owns the touch**, and the old responder got that wrong in three separate ways:
 *
 * **1. It moved the divider the instant a finger landed.** `onPanResponderGrant` called `track`. So
 * putting a thumb down to SCROLL PAST a comparison yanked the divider to wherever the thumb happened to
 * be — the picture changed under a gesture that was never aimed at it. With several comparisons stacked
 * on the Compare screen (one per pose — "no matter how many slides"), scrolling the page re-cut every
 * slider it passed under. Nothing is drawn on grant now: a TAP still places the divider, but it places
 * it on RELEASE, once the touch has proved it was a tap and not the beginning of a scroll.
 *
 * **2. It re-decided the axis on every frame.** `onPanResponderTerminationRequest` returned
 * `|dy| > |dx|` — evaluated fresh each time the parent scroller asked, against CUMULATIVE travel. A
 * horizontal drag that curved downward at the end therefore handed the gesture away mid-stroke: the
 * divider stopped dead under a finger that was still moving, and the only way to continue was to lift
 * and start again. That is exactly what "finicky" describes. The axis is now decided ONCE, after
 * `AXIS_SLOP` of travel, and then held for the rest of the gesture — horizontal means the scroller
 * cannot have it, vertical means it is handed over at once and the divider does not move again.
 *
 * **3. It tracked `locationX`, which is relative to whatever is under the finger.** Drag past the edge
 * of the frame and the touch target becomes an ancestor, so the coordinate silently changes origin. The
 * origin is measured ONCE on grant (`pageX - locationX` is the frame's left edge in page space) and the
 * drag reads `gestureState.moveX`, which is page space too — so the divider tracks the finger the same
 * whether it is inside the photo, past its edge, or off the side of the screen.
 *
 * ⚠ RESPONDER PROPS, NOT `GestureDetector` — unchanged, and still for the reason `BeforeAfterSlider`
 * gives: `react-native-gesture-handler` needs a `GestureHandlerRootView` at the app root and this app
 * has none.
 */

/**
 * How far a touch must travel before the gesture commits to an axis.
 *
 * Under this, the touch is still undecided and might be a tap. Much smaller and finger noise decides
 * the axis; much larger and the first part of a real drag is dropped on the floor.
 */
const AXIS_SLOP = 5;

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
  /** 0 = undecided, 1 = horizontal (ours), 2 = vertical (the scroller's). Reset on every release. */
  const axis = useSharedValue(0);

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
      // Claimed on touch-down so the drag can start on the first move rather than after the scroller
      // has already begun. Nothing is DRAWN on down — see `onPanResponderGrant`.
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        axis.value = 0;
        // The frame's left edge in page coordinates, measured once. `moveX` below is page space.
        originX.value = e.nativeEvent.pageX - e.nativeEvent.locationX;
      },
      onPanResponderMove: (_e: GestureResponderEvent, g: PanResponderGestureState) => {
        if (axis.value === 0) {
          const adx = Math.abs(g.dx);
          const ady = Math.abs(g.dy);
          if (Math.max(adx, ady) < AXIS_SLOP) return; // still a tap as far as anyone knows
          axis.value = adx >= ady ? 1 : 2;
        }
        if (axis.value !== 1) return; // the scroller owns this one
        put(g.moveX - originX.value);
      },
      /**
       * A touch that never committed to an axis was a TAP — place the divider where it landed.
       *
       * ⚠ ON RELEASE, NOT ON GRANT, and that is the whole of fix #1 above. Placing on grant meant every
       * thumb that came down on a comparison moved it, including the ones on their way somewhere else.
       */
      onPanResponderRelease: (e: GestureResponderEvent, g: PanResponderGestureState) => {
        if (axis.value === 0 && Math.max(Math.abs(g.dx), Math.abs(g.dy)) < AXIS_SLOP) put(e.nativeEvent.locationX);
        axis.value = 0;
      },
      onPanResponderTerminate: () => {
        axis.value = 0;
      },
      /**
       * ⚠ THE LINE THAT DECIDES WHETHER THE PAGE SCROLLS OR THE PICTURE MOVES — and it must answer the
       * SAME way for the whole gesture. Once horizontal, the drag is ours until the finger lifts; once
       * vertical, it is the scroller's and we never take it back. Only an undecided touch is negotiable,
       * and there a plainly-vertical intent wins so that scrolling past a comparison just scrolls.
       */
      onPanResponderTerminationRequest: (_e: GestureResponderEvent, g: PanResponderGestureState) => {
        if (axis.value === 1) return false;
        if (axis.value === 2) return true;
        return Math.abs(g.dy) > Math.abs(g.dx);
      },
    });
  });

  return { x, width, onLayout, panHandlers: pan.panHandlers };
}
