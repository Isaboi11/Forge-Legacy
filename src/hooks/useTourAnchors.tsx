/**
 * The tour anchor registry — which real, on-screen cards the spotlight can ring, and the scroll view they
 * live in (Onboarding-Amendment-003, v2 element-spotlight pass).
 *
 * This is the RN equivalent of the design's `data-coach="…"` attributes: `forge-coach.js` finds its targets
 * with `document.querySelector`, and there is no querySelector here — so a screen hands its nodes in, keyed
 * by the same ids the step list names. Nothing is drawn from this registry; it only answers "is that card
 * mounted, and where is it right now".
 *
 * DELIBERATELY REF-HELD, NOT STATE. Registering a card must not re-render the app, and the registry is read
 * only from callbacks and effects (planning a run, measuring a step) — never during render, which the strict
 * react-compiler rules forbid for refs anyway. The consequence to remember: a change here notifies nobody.
 * Anything that needs to react to a card appearing must ask, at a moment of its choosing.
 *
 * Mounted ABOVE `TourProvider` so the provider can filter its step list by what actually exists.
 */

import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import type { ScrollView, View } from 'react-native';

import type { TourAnchorId } from '@/domain/onboarding/tour-plan';

export interface TourAnchorRegistry {
  registerAnchor: (id: TourAnchorId, node: View) => void;
  /**
   * Release an anchor — but ONLY if `node` is still the one registered.
   *
   * This guard is not paranoia. The Program Builder swaps between three full views under one route, and a
   * screen mounting its replacement can register an id before the outgoing screen's ref cleanup runs. An
   * unconditional `delete(id)` then erases the LIVE anchor and the tour silently loses the step it was
   * about to draw. Releasing by identity makes the order irrelevant.
   */
  releaseAnchor: (id: TourAnchorId, node: View) => void;
  anchorNode: (id: TourAnchorId) => View | null;
  /** Ids mounted at this instant — the run planner drops steps whose card isn't among them. */
  registeredAnchors: () => TourAnchorId[];
  registerScroller: (node: ScrollView) => void;
  /** Same identity guard as `releaseAnchor`, for the same reason. */
  releaseScroller: (node: ScrollView) => void;
  scrollerNode: () => ScrollView | null;
  noteScrollY: (y: number) => void;
  scrollY: () => number;
}

/**
 * The default is a working, inert registry rather than `null`. These anchors hang off shared Home
 * compositions, and a composition rendered outside the provider (a harness, a test, a future screen that
 * reuses the card) must not throw over a walkthrough it isn't part of.
 */
const INERT: TourAnchorRegistry = {
  registerAnchor: () => {},
  releaseAnchor: () => {},
  anchorNode: () => null,
  registeredAnchors: () => [],
  registerScroller: () => {},
  releaseScroller: () => {},
  scrollerNode: () => null,
  noteScrollY: () => {},
  scrollY: () => 0,
};

const AnchorContext = createContext<TourAnchorRegistry>(INERT);

export function TourAnchorProvider({ children }: { children: React.ReactNode }) {
  const anchors = useRef(new Map<TourAnchorId, View>());
  const scroller = useRef<ScrollView | null>(null);
  const scrollY = useRef(0);

  const value = useMemo<TourAnchorRegistry>(
    () => ({
      registerAnchor: (id, node) => {
        anchors.current.set(id, node);
      },
      releaseAnchor: (id, node) => {
        if (anchors.current.get(id) === node) anchors.current.delete(id);
      },
      anchorNode: (id) => anchors.current.get(id) ?? null,
      registeredAnchors: () => Array.from(anchors.current.keys()),
      registerScroller: (node) => {
        scroller.current = node;
        // A screen handing over a new scroller starts at the top; carrying the old offset would send the
        // first spotlight to a position measured on a screen that is no longer mounted.
        scrollY.current = 0;
      },
      releaseScroller: (node) => {
        if (scroller.current !== node) return;
        scroller.current = null;
        scrollY.current = 0;
      },
      scrollerNode: () => scroller.current,
      noteScrollY: (y) => {
        scrollY.current = y;
      },
      scrollY: () => scrollY.current,
    }),
    [],
  );

  return <AnchorContext.Provider value={value}>{children}</AnchorContext.Provider>;
}

export function useTourAnchors(): TourAnchorRegistry {
  return useContext(AnchorContext);
}

/**
 * Attach a card to the registry: `<Pressable ref={useTourAnchor('mission')} …>`.
 *
 * Returns a ref CALLBACK, so it goes straight onto the element that's already there — no wrapper View, no
 * layout touched by the tour. `id` is optional and an absent one no-ops, which is what keeps these
 * compositions generic: the ids are authored at the Home call site next to everything else about the tour,
 * not buried in the card.
 */
export function useTourAnchor(id: TourAnchorId | undefined) {
  const { registerAnchor, releaseAnchor } = useTourAnchors();
  return useCallback(
    (node: View | null) => {
      if (!id || !node) return;
      registerAnchor(id, node);
      return () => releaseAnchor(id, node);
    },
    [id, registerAnchor, releaseAnchor],
  );
}

/**
 * Hand a screen's scroll view to the tour: `<ScrollView ref={useTourScroller()} onScroll={useTourScrollTracker()} …>`.
 * Without it the spotlight can still ring a card, but only one already in view — and four of the seven Home
 * steps sit below the fold on a phone.
 */
export function useTourScroller() {
  const { registerScroller, releaseScroller } = useTourAnchors();
  return useCallback(
    (node: ScrollView | null) => {
      if (!node) return;
      registerScroller(node);
      return () => releaseScroller(node);
    },
    [registerScroller, releaseScroller],
  );
}

/**
 * The companion `onScroll` handler. The offset is needed to convert "move this card 96px below the top of
 * the viewport" into an absolute `scrollTo`, and RN will not tell us the current offset on demand — so it
 * is remembered as it happens, into a ref, with no re-render for a value nothing draws.
 */
export function useTourScrollTracker() {
  const { noteScrollY } = useTourAnchors();
  return useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => noteScrollY(e.nativeEvent.contentOffset.y),
    [noteScrollY],
  );
}
