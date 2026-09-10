import { useEffect, useState } from 'react';
import { PanResponder, Platform, type GestureResponderEvent, type NativeTouchEvent, type PanResponderGestureState, type PanResponderInstance, type ViewStyle } from 'react-native';
import { runOnJS, useAnimatedReaction, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

/**
 * Move a photo inside its frame, on the comparison itself.
 *
 * ══ ⚠ THE LINE-UP USED TO BE A MODAL, AND THAT IS WHY IT WAS HARD ══
 *
 * PO, 2026-09-08, looking at a slider comparison: *"It would be easier to adjust the photos like this
 * somehow. You see how I can see them lining up?"*
 *
 * `AlignEditor` was a full-screen modal: it ghosted one photo over the other at 55%, gave you a
 * Before/After segmented control to choose which one moved, and a zoom slider to size it. Three decisions
 * to move one picture — and all of it happening somewhere OTHER than the comparison you were judging. The
 * seam of the slider is the ruler; the modal took the ruler away and handed back an approximation of it.
 *
 * So the gesture comes to the photograph. In Adjust mode you drag the half you want to move, watching the
 * two bodies meet at the divider, and pinch to size it. There is no "which one" question because you are
 * touching it.
 *
 * ══ WHY A HOOK AND NOT A RESPONDER IN THE SLIDER ══
 *
 * `BeforeAfterSlider` and the side-by-side cells need the same gesture over different geometry — one frame
 * holding two photos, and two frames holding one each. That is exactly the split that let the divider drag
 * drift into two implementations and get fixed twice (see `useCompareDrag`), so it is one hook from the
 * start. `split` is the only thing that differs: the slider asks which side of the divider the finger
 * landed on, a cell only ever holds one photo.
 *
 * ⚠ TWO SLOTS, FIXED. Hooks cannot be called in a loop, so the ceiling is the two photos a comparison has.
 * A third would need a third `useAnimatedStyle`, not a bigger array.
 *
 * ⚠ RESPONDER PROPS, NOT `GestureDetector` — `react-native-gesture-handler` wants a
 * `GestureHandlerRootView` at the app root and this app has none. Pinch therefore reads
 * `nativeEvent.touches` directly rather than composing a `Gesture.Pinch()`.
 *
 * ⚠ NOTHING HERE RENDERS WHILE YOU DRAG. The live frame lives in shared values and the photo moves on the
 * UI thread; React hears about it once, on release, when the value is committed and saved. Writing this to
 * state would re-render two Images and a clip per touch event, which is the exact fault
 * `BeforeAfterSlider` was rewritten twice to remove.
 */

export interface PhotoFrame {
  /** Pan as a fraction of the frame's width/height, so it renders identically at any size. */
  tx: number;
  ty: number;
  scale: number;
}

export const IDENTITY_FRAME: PhotoFrame = { tx: 0, ty: 0, scale: 1 };

/** Whether a frame is worth storing — an untouched photo should not write a row of zeroes. */
export const frameIsSet = (f: PhotoFrame | undefined): boolean => !!f && (f.tx !== 0 || f.ty !== 0 || f.scale !== 1);

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
/** Past this the body has left the frame entirely and the athlete has lost the thing they were aiming at. */
const MAX_PAN = 0.8;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * ⚠ `none`, NOT the comparison's `pan-y`. While adjusting, BOTH axes belong to the photograph — a vertical
 * drag is how you line up shoulders — so the browser must not take one of them. The page is still
 * scrollable everywhere outside the frame, and Adjust is a mode you leave.
 */
export const ADJUST_TOUCH_STYLE: ViewStyle | null = Platform.OS === 'web' ? ({ touchAction: 'none' } as unknown as ViewStyle) : null;

const gap = (a: NativeTouchEvent, b: NativeTouchEvent) => Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);

export interface FrameAdjust {
  /** One per slot. Put it on a wrapper AROUND the photo — the photo itself keeps `contentFit="cover"`. */
  styles: [ReturnType<typeof useAnimatedStyle<ViewStyle>>, ReturnType<typeof useAnimatedStyle<ViewStyle>>];
  panHandlers: PanResponderInstance['panHandlers'];
}

export function useFrameAdjust({
  frames,
  width,
  height,
  enabled,
  split,
  onCommit,
}: {
  /** Up to two stored frames. Undefined is an untouched photo. */
  frames: (PhotoFrame | undefined)[];
  width: number;
  height: number;
  enabled: boolean;
  /**
   * Two photos in one frame, divided down the middle — the slider. The finger picks its own photo by
   * which side it lands on, which is the whole reason this reads better than a Before/After control.
   */
  split?: boolean;
  /** Called once per gesture, on release. The caller stores it. */
  onCommit: (slot: number, frame: PhotoFrame) => void;
}): FrameAdjust {
  /**
   * ⚠ SEEDED ONCE, AT MOUNT, AND NEVER WRITTEN FROM AN EFFECT — the caller REMOUNTS instead.
   *
   * `react-hooks/immutability` is an error in this repo, and it freezes any value that render-reachable
   * code mutates: the responder is built inside a `useState` initializer, which counts as render, so once
   * it writes `t0` nothing else may. That rules out the obvious "sync the shared value from the prop in an
   * effect" — and it is right to, because syncing while a finger is down would fight the gesture.
   *
   * So a stored frame is an INITIAL value, and a comparison whose photographs change gets a new component
   * (see the row key in `transformation-compare`). `wv`/`hv`/`on` are still synced by effect below, which
   * is allowed precisely because the responder only ever READS them.
   */
  const t0 = useSharedValue<PhotoFrame>({ ...(frames[0] ?? IDENTITY_FRAME) });
  const t1 = useSharedValue<PhotoFrame>({ ...(frames[1] ?? IDENTITY_FRAME) });
  const wv = useSharedValue(0);
  const hv = useSharedValue(0);
  const on = useSharedValue(false);

  /* Gesture bookkeeping. All shared values, because the responder below is built ONCE and would otherwise
     read whatever the first render happened to close over — the trap `useCompareDrag` documents. */
  const slot = useSharedValue(0);
  const baseX = useSharedValue(0);
  const baseY = useSharedValue(0);
  const baseDx = useSharedValue(0);
  const baseDy = useSharedValue(0);
  /** 0 while one finger is down. Non-zero is the spread the pinch started from. */
  const pinchD0 = useSharedValue(0);
  const pinchS0 = useSharedValue(1);

  const splitV = useSharedValue(false);
  /** Bumped once per finished gesture. The reaction below is what turns that into a save. */
  const commits = useSharedValue(0);

  /**
   * ⚠ THE RESPONDER CANNOT SIMPLY CALL `onCommit`, AND THE TWO OBVIOUS WAYS OUT ARE BOTH LINT ERRORS.
   *
   * It is built once (a responder swapped mid-gesture loses its `gestureState` and the drag jumps), so it
   * closes over the FIRST `onCommit` — and that callback has to be current, because the athlete can change
   * which two entries are being compared and a stale one would save the alignment onto the wrong
   * photograph. A ref handed to the `useState` initializer trips `react-hooks/refs`; a mutable object from
   * `useState` trips `react-hooks/immutability`. Both rules are right about what they are looking at.
   *
   * So the gesture publishes a COUNTER, and this reaction — re-registered every render, closing over the
   * current callback with nothing held across renders — turns each bump into one save. Reanimated is
   * already carrying the frames; this is the same road back.
   */
  useAnimatedReaction(
    () => commits.value,
    (now, was) => {
      if (was === null || now === was) return;
      runOnJS(onCommit)(slot.value, slot.value === 1 ? t1.value : t0.value);
    },
  );

  useEffect(() => {
    wv.value = width;
    hv.value = height;
    on.value = enabled;
    splitV.value = !!split;
  }, [width, height, enabled, split, wv, hv, on, splitV]);

  const [pan] = useState(() => {
    const read = (): PhotoFrame => (slot.value === 1 ? t1.value : t0.value);
    const write = (f: PhotoFrame) => {
      if (slot.value === 1) t1.value = f;
      else t0.value = f;
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => on.value,
      onMoveShouldSetPanResponder: () => on.value,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        slot.value = splitV.value && wv.value && e.nativeEvent.locationX > wv.value / 2 ? 1 : 0;
        const cur = read();
        baseX.value = cur.tx;
        baseY.value = cur.ty;
        baseDx.value = 0;
        baseDy.value = 0;
        pinchD0.value = 0;
      },
      onPanResponderMove: (e: GestureResponderEvent, g: PanResponderGestureState) => {
        if (!wv.value || !hv.value) return;
        const touches = e.nativeEvent.touches;
        const cur = read();

        if (touches.length >= 2) {
          const d = gap(touches[0], touches[1]);
          if (!d) return;
          if (!pinchD0.value) {
            pinchD0.value = d;
            pinchS0.value = cur.scale;
          }
          write({ ...cur, scale: clamp((pinchS0.value * d) / pinchD0.value, MIN_SCALE, MAX_SCALE) });
          return;
        }

        /* ⚠ RE-ANCHOR WHEN THE SECOND FINGER LIFTS. `dx`/`dy` are cumulative from grant and keep counting
           through the pinch, so without this the photo jumps by however far the fingers travelled while
           they were sizing it. */
        if (pinchD0.value) {
          pinchD0.value = 0;
          baseX.value = cur.tx;
          baseY.value = cur.ty;
          baseDx.value = g.dx;
          baseDy.value = g.dy;
        }

        write({
          tx: clamp(baseX.value + (g.dx - baseDx.value) / wv.value, -MAX_PAN, MAX_PAN),
          ty: clamp(baseY.value + (g.dy - baseDy.value) / hv.value, -MAX_PAN, MAX_PAN),
          scale: cur.scale,
        });
      },
      onPanResponderRelease: () => {
        pinchD0.value = 0;
        commits.value = commits.value + 1;
      },
      onPanResponderTerminate: () => {
        pinchD0.value = 0;
        commits.value = commits.value + 1;
      },
      /* ⚠ NEVER HANDED BACK. In Adjust mode a vertical drag is the athlete lining up shoulders, not the
         page scrolling — the opposite of the divider drag, which gives the vertical axis away on purpose.
         `onResponderGrant` already blocks the native scroller by default; this keeps it blocked. */
      onPanResponderTerminationRequest: () => false,
    });
  });

  const style0 = useAnimatedStyle(() => ({ transform: [{ translateX: t0.value.tx * wv.value }, { translateY: t0.value.ty * hv.value }, { scale: t0.value.scale }] }));
  const style1 = useAnimatedStyle(() => ({ transform: [{ translateX: t1.value.tx * wv.value }, { translateY: t1.value.ty * hv.value }, { scale: t1.value.scale }] }));

  return { styles: [style0, style1], panHandlers: pan.panHandlers };
}
