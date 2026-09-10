import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder } from 'react-native';

/**
 * Drag a row up and down a short, fixed-height list to reorder it.
 *
 * ══ WHY A HOOK, AND WHY PanResponder ══
 *
 * There is no drag-and-drop anywhere in this app. Every reorder is a pair of ▲▼ chevrons — the program
 * builder's exercise rows, the free workout builder's, the Progress Hub's metric sheet — and every pan
 * gesture in the product is a `PanResponder`: `useSheetDrag`, `useCompareDrag`, `useFrameAdjust`.
 *
 * That is not an accident to correct. `react-native-gesture-handler` is installed and imported nowhere
 * in `src/`, and two hooks say why in as many words: `GestureDetector` needs a provider at the root and
 * behaves differently under the web renderer, and the PO tests on the web preview. `PanResponder` is the
 * responder system both platforms already run.
 *
 * ⚠ ATTACH `handlers(i)` TO THE HANDLE, NEVER THE WHOLE ROW. A responder on the row cannot tell "lift me"
 *   from "scroll the sheet" — both are a vertical drag, and the scroller loses. Same rule, same reason,
 *   as `useSheetDrag`'s: *"a backdrop `Pressable` wrapping the body once ate the drag that should have
 *   scrolled a long imported program."*
 *
 * ⚠ FIXED ROW HEIGHT. The whole index calculation is `round(dy / rowHeight)`. A list of variable-height
 *   rows would need measurement and would drift; this is a week of a training program, so it is at most
 *   six rows of one line each and the constraint costs nothing.
 *
 * ⚠ WEB: two things terminate a responder that never fire on a phone — a text selection dragging out
 *   from under the cursor, and the context menu. Give the rows `userSelect: 'none'`. `onStartShouldSet`
 *   returns true on the handle so the very first mouse pixel is already captured, before the browser
 *   decides the gesture is a selection.
 *
 *     const drag = useListReorder({ rowHeight: 52, count: rows.length, canMove, onMove, haptics })
 *     <Animated.View style={drag.rowStyle(i)}>
 *       <View {...drag.handlers(i)}><Glyph d={GRIP} /></View>
 */
export function useListReorder({
  rowHeight,
  count,
  canMove,
  onMove,
  haptics,
}: {
  /** Row height INCLUDING its bottom gap — the pitch the index maths steps by. */
  rowHeight: number;
  count: number;
  /** Can the row at this display position be picked up? A pinned session cannot. */
  canMove: (index: number) => boolean;
  /** Committed on release. `from === to` is never emitted. */
  onMove: (from: number, to: number) => void;
  haptics?: { light: () => void; medium: () => void };
}) {
  /* ⚠ `useState`, NOT `useRef(...).current`. The react-compiler lint ERRORS on a ref read during render
     (`react-hooks/refs`), and `rowStyle` is read during render. The lazy initialiser gives the same
     "created once" guarantee — the identical trade `useSheetDrag` makes, for the identical reason. */
  const [lift] = useState(() => new Animated.Value(0));
  const [shift] = useState(() => new Animated.Value(0));
  const [dragging, setDragging] = useState<number | null>(null);
  const [target, setTarget] = useState<number | null>(null);

  /*
   * ⚠ THE RESPONDER IS BUILT ONCE AND MUST NOT CLOSE OVER STALE PROPS.
   *
   * `PanResponder.create` runs inside a `useMemo`, so the callbacks it captures would keep whatever
   * `count` / `canMove` / `onMove` existed at creation. After one drag the order has changed and those
   * are exactly the values that must be current — a stale `onMove` would commit against the previous
   * ordering and silently scramble the week.
   *
   * Reading them through a ref inside a CALLBACK is fine; only a read during RENDER trips the lint.
   */
  const live = useRef({ rowHeight, count, canMove, onMove, haptics });
  useEffect(() => {
    live.current = { rowHeight, count, canMove, onMove, haptics };
  });

  const lastTarget = useRef<number | null>(null);
  const from = useRef<number | null>(null);
  /** True from grant to release. While it is set, no other row may claim the drag or rewrite `from`. */
  const held = useRef(false);

  const reset = useMemo(
    () => () => {
      lift.setValue(0);
      shift.setValue(0);
      held.current = false;
      from.current = null;
      lastTarget.current = null;
      setDragging(null);
      setTarget(null);
    },
    [lift, shift],
  );

  /*
   * ⚠ ONE RESPONDER PER ROW, so each closure knows its OWN index.
   *
   * The alternative — one shared responder plus an `onTouchStart` that records which handle was pressed
   * — depends on `onTouchStart` arriving before the responder negotiation, and it does not reliably: the
   * responder system asks `onStartShouldSetPanResponder` during the negotiation that touch start begins.
   * A week is at most six rows, so six responders is nothing, and the index is then a fact rather than a
   * race.
   */
  const makeResponder = useMemo(
    () => (index: number) =>
      PanResponder.create({
        // True from the first touch on the handle: on web this claims the gesture before the browser can
        // read it as the start of a text selection.
        /*
         * ⚠ `held` GUARDS THE SHARED `from` REF, and without it a second finger corrupts a live drag.
         *
         * `onPanResponderTerminationRequest: () => false` refuses to hand the RESPONDER over, but it
         * cannot stop another row's should-set callback from running — and that callback had already
         * written `from.current`. Brush row 5's grip while dragging row 1 and the move handler starts
         * computing from 5: the row under the finger snaps back and a session nobody picked up is
         * reordered on release.
         */
        onStartShouldSetPanResponder: () => {
          if (held.current || !live.current.canMove(index)) return false;
          from.current = index;
          return true;
        },
        onMoveShouldSetPanResponder: (_e, g) => {
          if (held.current || !live.current.canMove(index)) return false;
          if (Math.abs(g.dy) <= Math.abs(g.dx)) return false;
          from.current = index;
          return true;
        },
        // ⚠ Refuse termination. On web an ancestor's scroll event asks for the responder back mid-drag,
        // and handing it over drops the row wherever it happened to be.
        onPanResponderTerminationRequest: () => false,

        onPanResponderGrant: () => {
          if (from.current == null) return;
          held.current = true;
          setDragging(from.current);
          setTarget(from.current);
          lastTarget.current = from.current;
          live.current.haptics?.light();
        },

        onPanResponderMove: (_e, g) => {
          const start = from.current;
          if (start == null) return;
          const { rowHeight: h, count: n, canMove: can } = live.current;
          lift.setValue(g.dy);

          let next = Math.max(0, Math.min(n - 1, start + Math.round(g.dy / h)));
          // Step past a row that cannot move, the way the drag is going. Falling off the end means there
          // is nowhere legal that way, so the target stays where it was.
          const step = next >= start ? 1 : -1;
          while (next >= 0 && next < n && !can(next)) next += step;
          if (next < 0 || next >= n) next = lastTarget.current ?? start;

          if (next !== lastTarget.current) {
            lastTarget.current = next;
            setTarget(next);
            live.current.haptics?.light();
            // The rows between the row's origin and its target slide one place to make the gap. One
            // shared value drives all of them; which rows it applies to is decided in `rowStyle`.
            Animated.timing(shift, {
              toValue: next > start ? -1 : next < start ? 1 : 0,
              duration: 120,
              useNativeDriver: true,
            }).start();
          }
        },

        onPanResponderRelease: () => {
          const start = from.current;
          const end = lastTarget.current;
          reset();
          if (start != null && end != null && start !== end) {
            live.current.haptics?.medium();
            live.current.onMove(start, end);
          }
        },
        onPanResponderTerminate: reset,
      }),
    [lift, shift, reset],
  );

  const responders = useMemo(
    () => Array.from({ length: count }, (_, i) => makeResponder(i)),
    [count, makeResponder],
  );

  return {
    /** Spread onto the GRAB HANDLE of row `i`, never onto the row. */
    handlers: (i: number) => responders[i]?.panHandlers ?? {},

    /**
     * The transform for row `i`. The lifted row follows the finger; the rows it is passing over step
     * aside by exactly one row height, so the list always shows the order a release would commit.
     */
    rowStyle: (i: number) => {
      if (dragging == null) return { transform: [{ translateY: 0 }], zIndex: 0 };
      if (i === dragging) return { transform: [{ translateY: lift }], zIndex: 2 };

      const t = target ?? dragging;
      const between = t > dragging ? i > dragging && i <= t : i < dragging && i >= t;
      if (!between) return { transform: [{ translateY: 0 }], zIndex: 0 };

      /* Dragging DOWN (`shift` → -1) lifts the rows being passed over UP by one place, and vice versa —
         so the list on screen always reads as the order a release would commit. */
      return {
        transform: [
          {
            translateY: shift.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: [-rowHeight, 0, rowHeight],
            }),
          },
        ],
        zIndex: 1,
      };
    },

    /** Which row is in the air, or null. The sheet uses it to lift the row visually. */
    dragging,
  };
}
