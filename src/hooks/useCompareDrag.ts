import { useState } from 'react';
import { PanResponder, Platform, type GestureResponderEvent, type LayoutChangeEvent, type PanResponderGestureState, type PanResponderInstance, type ViewStyle } from 'react-native';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

/**
 * The drag behind every before/after comparison in the app.
 *
 * ══ ⚠ ROUND FIVE: THE FEED STOPPED SLIDING, AND I BROKE IT CHASING A NO-OP ══
 *
 * PO, 2026-09-01: *"the slider on the comparison went to the bottom like we wanted on the post, but now
 * the sliding doesn't work on the feed."*
 *
 * Round four moved the responder claim from touch-DOWN to the first horizontal MOVE, on the reasoning
 * that `onShouldBlockNativeResponder` is only asked at grant and so could not consult an axis decided
 * later. The premise was right. The conclusion was wrong, because of one line in
 * `PanResponder.js`'s `onResponderGrant`:
 *
 *     return config.onShouldBlockNativeResponder == null ? true : config.onShouldBlockNativeResponder(...)
 *
 * ⚠ **IT DEFAULTS TO `true`.** Not false. Every version of this drag has always blocked the native
 * scroller from the moment it was granted — so round four's `onShouldBlockNativeResponder: () => true`
 * changed nothing at all, and the only thing that actually changed was giving up the touch-down claim.
 * That is what the PO is reporting: a comparison in the FEED sits inside a vertical scroller and a
 * ledger card's own press targets, and without the down-claim the drag never reliably became ours.
 *
 * ⚠ AND `gestureState` IS NOT FRESH IN THE BUBBLE PHASE. `_updateGestureStateOnMove` is called from
 * `onMoveShouldSetResponderCapture` and from `onResponderMove` — **not** from the bubble-phase
 * `onMoveShouldSetResponder` this app was deciding in. Predicating the claim on `g.dx` there is reading
 * whatever the capture pass happened to leave behind, guarded by `_accountsForMovesUpTo`. A claim that
 * depends on that is a claim that works on one screen and not the next, which is exactly what shipped.
 *
 * So the claim is back on touch-down, where it has worked on every surface, and it costs nothing: the
 * native scroller was already being blocked at grant either way.
 *
 * ══ WHAT ACTUALLY KEEPS THE PAGE STILL, THEN ══
 *
 * PO, earlier the same day: *"when we're sliding the screen should just stay in place."* On NATIVE that
 * was already true (see the default above). On **web** it never was and no responder decision could make
 * it: react-native-web has no native responder to block, and the page is scrolled by the browser's own
 * compositor, off the main thread. `touch-action` is the only thing that speaks to it — see
 * `COMPARE_TOUCH_STYLE`. That is the fix that mattered, and it is kept.
 *
 * ══ ROUND THREE, KEPT IN FULL: THE THREE THINGS THAT MADE IT "FINICKY" ══
 *
 * **1. It moved the divider the instant a finger landed.** `track` ran from `onPanResponderGrant`, so a
 * thumb on its way past re-cut every comparison it crossed — and on Compare, where there is a slider per
 * pose, scrolling the page re-cut all of them. Nothing is drawn until the drag proves itself horizontal;
 * a TAP still places the divider, on release.
 *
 * **2. It re-decided the axis on every frame.** `onPanResponderTerminationRequest` returned
 * `|dy| > |dx|` against CUMULATIVE travel, evaluated fresh each time the scroller asked — so a
 * horizontal drag that curved downward at the end was handed away mid-stroke and stopped dead under a
 * finger that was still moving. The axis is latched once and held.
 *
 * **3. It tracked `locationX`, which is relative to whatever is under the finger.** Drag past the edge
 * of the frame and the coordinate silently changed origin. The frame's left edge is measured once on
 * grant (`pageX - locationX` is page space) and the drag reads `gestureState.moveX`, page space too.
 *
 * ⚠ RESPONDER PROPS, NOT `GestureDetector`: `react-native-gesture-handler` needs a
 * `GestureHandlerRootView` at the app root and this app has none.
 */

/**
 * How far a touch must travel before the gesture commits to an axis.
 *
 * Under this, the touch is still undecided and might be a tap. Much smaller and finger noise decides
 * the axis; much larger and the first part of a real drag is dropped on the floor.
 */
const AXIS_SLOP = 5;

/**
 * ⚠ WEB SCROLLS IN THE BROWSER, WHERE NO RESPONDER DECISION REACHES IT.
 *
 * `pan-y` says: vertical panning is yours, horizontal is mine. That is precisely the split the responder
 * below implements, so the two agree — a vertical drag scrolls the page and a horizontal one moves the
 * divider with the page held still. `none` would have worked for the drag and made the comparison a dead
 * zone you cannot scroll past, which is the bug round three existed to fix.
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
      /* ⚠ ON TOUCH-DOWN, AND IT HAS TO BE. This view is deeper than the feed's scroller and than the
         ledger card's own press targets, so claiming here is what makes the drag reliably ours on every
         surface — see round five above. Nothing is DRAWN on down; that is `onPanResponderGrant`'s job
         and it deliberately does not do it. */
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
       * ⚠ ON RELEASE, NOT ON GRANT. Placing on grant meant every thumb that came down on a comparison
       * moved it, including the ones on their way somewhere else.
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
       *
       * This is also what releases the native scroller, which `onResponderGrant` blocked by default the
       * moment the touch landed. Without it a comparison is a dead zone in the middle of the feed.
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
