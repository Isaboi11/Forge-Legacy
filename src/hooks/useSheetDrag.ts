import { useMemo, useState } from 'react';
import { Animated, PanResponder } from 'react-native';

/**
 * Drag-a-sheet-down-to-dismiss — the behaviour every grabber in this app depicts.
 *
 * ══ WHY THIS IS A HOOK AND NOT SIX COPIES ══
 *
 * PO, 2026-08-25: *"all the places where it pulls a page up and it shows it as if you can drag it down
 * but none of them drag down."* A grabber was drawn on the shared `BottomSheet` composite (49 files)
 * and on five more sheets that roll their own `Modal`, and NONE of them had a gesture behind it. A
 * drag handle is not an ornament — it is the standard signal that a surface is dismissible by dragging,
 * and drawing one with nothing behind it is the same defect class as a button whose only behaviour is a
 * "coming soon" toast.
 *
 * `ForgeBottomSheet` has had a working pan since it shipped, and its numbers are the ones used here:
 * a quarter of the sheet's height, or a 0.8 fling. Two sheets that dismiss at different distances would
 * feel like two different apps, so there is one implementation and everything shares it.
 *
 * ⚠ ATTACH `panHandlers` TO THE GRAB AREA, NEVER TO THE WHOLE SHEET. A responder on the sheet cannot
 *   tell "dismiss me" from "scroll my body" — both are a vertical drag, and the scroller is the one
 *   that loses. `BottomSheet`'s own history is exactly this: a backdrop `Pressable` wrapping the body
 *   once ate the drag that should have scrolled a long imported program. Scoped to the handle, the two
 *   gestures cannot contend.
 *
 * ⚠ AND GIVE THE HANDLE ROW REAL PADDING. The bar the design draws is 4-5px tall; that is a picture,
 *   not a touch target. The row around it wants ~20px of height or the gesture is there and unfindable,
 *   which is indistinguishable from it being missing.
 *
 *     const drag = useSheetDrag({ onClose, dismissible })
 *     <Animated.View onLayout={drag.onLayout} style={[styles.sheet, drag.style]}>
 *       <View style={styles.handleRow} {...drag.panHandlers}><View style={styles.handle} /></View>
 */
export function useSheetDrag({ onClose, dismissible = true }: { onClose: () => void; dismissible?: boolean }) {
  /* ⚠ `useState`, NOT `useRef(...).current`. The react-compiler lint ERRORS on a ref read during
     render (`react-hooks/refs`), and this hook's whole output is read during render. `ForgeBottomSheet`
     already holds its own `Animated.Value` this way for the same reason — the lazy initialiser gives
     the identical "created once" guarantee without touching `.current`. */
  const [dragY] = useState(() => new Animated.Value(0));
  const [height, setHeight] = useState(0);

  const springBack = useMemo(
    () => () =>
      Animated.spring(dragY, {
        toValue: 0,
        stiffness: 320,
        damping: 30,
        overshootClamping: true,
        useNativeDriver: true,
      }).start(),
    [dragY],
  );

  const pan = useMemo(
    () =>
      PanResponder.create({
        /* Downward only. An upward drag near the handle still belongs to the body, and the `dx` guard
           keeps a horizontal swipe from reading as a dismiss. */
        onMoveShouldSetPanResponder: (_e, g) => dismissible && g.dy > 6 && g.dy > Math.abs(g.dx),
        onPanResponderMove: (_e, g) => dragY.setValue(Math.max(0, g.dy)), // a sheet never lifts
        onPanResponderRelease: (_e, g) => {
          const far = height > 0 && g.dy > height * 0.25;
          if (dismissible && (far || g.vy > 0.8)) {
            Animated.timing(dragY, { toValue: height || 600, duration: 180, useNativeDriver: true }).start(() => {
              /* Reset BEFORE closing, or the next open re-enters already dragged off-screen — the sheet
                 would mount, be invisible, and look like a tap that did nothing. */
              dragY.setValue(0);
              onClose();
            });
          } else springBack();
        },
        onPanResponderTerminate: springBack,
      }),
    [dismissible, dragY, height, onClose, springBack],
  );

  return {
    panHandlers: pan.panHandlers,
    style: { transform: [{ translateY: dragY }] },
    onLayout: (e: { nativeEvent: { layout: { height: number } } }) => setHeight(e.nativeEvent.layout.height),
  };
}
