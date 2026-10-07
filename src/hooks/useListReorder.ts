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
  /*
   * ══ ONE OFFSET PER ROW, ATTACHED FOR AS LONG AS THE ROW IS ON SCREEN ══
   *
   * ⚠ A ROW'S TRANSFORM MUST NEVER SWAP BETWEEN AN ANIMATED VALUE AND A PLAIN NUMBER. It did: the rows
   * being passed over took `shift.interpolate(...)` and every other row took `translateY: 0`. An animation
   * writes to the view directly — React never sees the -1 row it drew — so when a row dropped OUT of the
   * passed-over set (a finger that nudged one place and came back, or turned round past its origin), React
   * swapped `0` in for `0` and changed nothing, and the row stayed drawn one place up, on top of its
   * neighbour. The list then showed a hole where it should have been and hid the row under it, and it
   * stayed that way until the sheet closed (All Exercises, PO 10-06: "moved a workout once then moved a
   * second to the bottom" — Bench Press sat over the row above it, an empty slot below).
   *
   * Every row now keeps the SAME value in its transform from mount to unmount, and the drag only ever
   * changes what that value holds. JS-driven, because the lifted row's value is written on every move
   * event, and a value cannot be both natively animated and set from JS without the two disagreeing.
   *
   * `useMemo` on `count`, not a ref: `rowStyle` reads these during render (`react-hooks/refs`). A new count
   * means a row was added or removed, which never happens mid-drag, so starting the set again at 0 is right.
   */
  const offsets = useMemo(() => Array.from({ length: count }, () => new Animated.Value(0)), [count]);
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
  const live = useRef({ rowHeight, count, canMove, onMove, haptics, offsets });
  useEffect(() => {
    live.current = { rowHeight, count, canMove, onMove, haptics, offsets };
  });

  const lastTarget = useRef<number | null>(null);
  const from = useRef<number | null>(null);
  /** True from grant to release. While it is set, no other row may claim the drag or rewrite `from`. */
  const held = useRef(false);
  /** Where each non-lifted row is headed (px), so a target change only starts the rows that must move. */
  const goals = useRef<number[]>([]);

  const reset = useMemo(
    () => () => {
      // Every row home BEFORE the state clears — `setValue` stops any tween still running.
      for (const v of live.current.offsets) v.setValue(0);
      goals.current = [];
      held.current = false;
      from.current = null;
      lastTarget.current = null;
      setDragging(null);
      setTarget(null);
    },
    [],
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
          const { rowHeight: h, count: n, canMove: can, offsets: rows } = live.current;
          rows[start]?.setValue(g.dy);

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
            // The rows between the row's origin and its target slide one place to make the gap; every
            // other row goes home — including one that WAS in the gap a moment ago (see `offsets`).
            rows.forEach((v, i) => {
              if (i === start) return;
              const between = next > start ? i > start && i <= next : i < start && i >= next;
              const goal = between ? (next > start ? -h : h) : 0;
              if ((goals.current[i] ?? 0) === goal) return;
              goals.current[i] = goal;
              Animated.timing(v, { toValue: goal, duration: 120, useNativeDriver: false }).start();
            });
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
    [reset],
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
      // ⚠ Always this row's own value, never a plain number in its place — see `offsets`.
      const translateY = offsets[i] ?? 0;
      if (dragging == null) return { transform: [{ translateY }], zIndex: 0 };
      if (i === dragging) return { transform: [{ translateY }], zIndex: 2 };
      const t = target ?? dragging;
      const between = t > dragging ? i > dragging && i <= t : i < dragging && i >= t;
      return { transform: [{ translateY }], zIndex: between ? 1 : 0 };
    },

    /** Which row is in the air, or null. The sheet uses it to lift the row visually. */
    dragging,
  };
}
