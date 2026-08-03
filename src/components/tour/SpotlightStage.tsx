/**
 * SpotlightStage — the coach mark itself: measure the step's card, cut a glowing bronze-ringed hole around
 * it, and hang the copy off it. Shared by BOTH tour surfaces, which is the whole reason it exists as its
 * own component:
 *
 *   · `TourOverlay` — the global guided run (tabs leg + Home leg), mounted in the tab shell.
 *   · `ScreenTour`  — the per-surface walkthrough each screen renders for itself.
 *
 * THE LAYERING IS WHY `ScreenTour` RENDERS ITS OWN STAGE RATHER THAN DELEGATING UPWARD. Program Builder,
 * the active workout and the exercise picker are Stack screens presented OVER the tabs; an overlay mounted
 * in the tab shell draws BEHIND them, so a spotlight hosted there could never reach the screens that most
 * need one. A screen that renders its own stage is always correctly layered, for free.
 *
 * The geometry is ported from the design layer's own coach engine (`forge-coach.js`) rather than invented:
 * per-step `pad`/`radius`, a 96px scroll margin, the card below the hole when there's room and above it
 * when there isn't, and the dim drawn as one enormous spread shadow on the ring — the trick that gets a
 * ROUNDED hole out of a platform with no way to cut one.
 *
 * MEASUREMENT IS ASYNCHRONOUS AND THE SCREEN MOVES UNDER IT. Every rect is read in a callback after a
 * scroll has been asked for and given time to settle; nothing is measured during render, and a stale rect
 * is discarded by key rather than cleared by an effect (the strict react-compiler rules forbid the write,
 * and deriving it is simpler anyway).
 */

import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/forge/composites/Button';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { useTourAnchors } from '@/hooks/useTourAnchors';
import type { TourAnchorId } from '@/domain/onboarding/tour-plan';

export interface SpotlightStep {
  key: string;
  title: string;
  body: string;
  anchor?: TourAnchorId;
  pad?: number;
  radius?: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Anything RN will hand us a window rect for. Typed structurally so a ScrollView and a View are both fine. */
interface Measurable {
  measureInWindow(cb: (x: number, y: number, w: number, h: number) => void): void;
}
const measurable = (node: unknown): Measurable | null =>
  node && typeof (node as Measurable).measureInWindow === 'function' ? (node as Measurable) : null;

/** Keep the spotlit card this far inside the scroll viewport — the design's own margin. */
const SCROLL_MARGIN = 96;
/** How long to let an animated scroll settle before believing a measurement, and how long to keep checking. */
const SETTLE_STEP_MS = 70;
const SETTLE_MAX_MS = 900;
/** Assumed card height for the frame BEFORE its first layout — corrected by `onLayout` on the next frame. */
const CARD_H_ESTIMATE = 196;

export interface SpotlightStageProps {
  steps: SpotlightStep[];
  index: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  /** Primary label on the final step. "Got it" for a per-screen tour, "Start training" for the Home leg. */
  doneLabel?: string;
  /** Where an UNANCHORED card rests. 108 clears the tab bar; a modal screen wants the default. */
  restingBottom?: number;
}

export function SpotlightStage({ steps, index, onNext, onPrev, onSkip, doneLabel = 'Got it', restingBottom = 28 }: SpotlightStageProps) {
  const insets = useSafeAreaInsets();
  const { height: frameH } = useWindowDimensions();
  const { anchorNode, scrollerNode, scrollY } = useTourAnchors();

  const rootRef = useRef<View | null>(null);
  // Keyed by step: a rect measured for a step we've already left is ignored rather than erased.
  const [hole, setHole] = useState<{ key: string; rect: Rect } | null>(null);
  const [cardH, setCardH] = useState(CARD_H_ESTIMATE);

  const clamped = Math.min(Math.max(0, index), Math.max(0, steps.length - 1));
  const step = steps[clamped] ?? null;
  const stepKey = step?.key ?? null;
  const anchorId = step?.anchor ?? null;

  // Standing in for a scroll viewport we couldn't measure: below the app bar, above the tab bar.
  const fallbackViewTop = insets.top + 64;
  const fallbackViewBottom = frameH - insets.bottom - 84;

  /**
   * Bring the step's card into view and measure it. Runs on every step change; a step with no anchor never
   * enters here, so an unanchored leg pays none of this cost.
   */
  useEffect(() => {
    if (!anchorId || !stepKey) return;
    let cancelled = false;

    const measureAnchor = (cb: (r: Rect | null) => void) => {
      const node = measurable(anchorNode(anchorId));
      const root = measurable(rootRef.current);
      if (!node || !root) {
        cb(null);
        return;
      }
      // Window coordinates, converted to the stage's own box — the stage is not guaranteed to start at the
      // top of the window (a translucent status bar, a shell inset), and a 20px error is a visible one.
      root.measureInWindow((rx, ry) => {
        node.measureInWindow((x, y, w, h) => {
          if (cancelled) return;
          if (w <= 0 || h <= 0) cb(null);
          else cb({ x: x - rx, y: y - ry, w, h });
        });
      });
    };

    const scrollIntoView = (done: () => void) => {
      const sc = scrollerNode();
      const node = measurable(anchorNode(anchorId));
      if (!sc || !node) {
        done();
        return;
      }

      const withViewport = (apply: (top: number, height: number) => void) => {
        const view = measurable(sc);
        // A ScrollView that won't hand back a rect still scrolls perfectly well — so fall back to the
        // window minus its chrome rather than giving up and ringing a card that's below the fold.
        const fallback = () => apply(fallbackViewTop, fallbackViewBottom - fallbackViewTop);
        if (!view) {
          fallback();
          return;
        }
        view.measureInWindow((_sx, sy, _sw, sh) => {
          if (sh > 0) apply(sy, sh);
          else fallback();
        });
      };

      withViewport((sy, sh) => {
        node.measureInWindow((_ax, ay, _aw, ah) => {
          if (cancelled) return;
          const from = scrollY();
          let target = from;
          if (ay < sy + SCROLL_MARGIN) target = from - (sy + SCROLL_MARGIN - ay);
          else if (ay + ah > sy + sh - SCROLL_MARGIN) target = from + (ay + ah - (sy + sh - SCROLL_MARGIN));
          target = Math.max(0, target);
          if (Math.abs(target - from) < 2) {
            done();
            return;
          }
          sc.scrollTo({ y: target, animated: true });
          setTimeout(done, 320);
        });
      });
    };

    // After the scroll, poll until the rect stops moving — an animated scroll that is measured too early
    // lands the ring where the card USED to be, which is worse than no ring at all.
    const settle = (last: number | null, waited: number) => {
      measureAnchor((r) => {
        if (cancelled) return;
        if (!r) {
          /**
           * NOT MEASURABLE *YET* IS NOT THE SAME AS NOT THERE.
           *
           * This used to give up permanently on the first null, which is wrong the moment a run spans
           * screens: the guided tour navigates across all four tabs, so a Home-leg step reached straight
           * after the tabs leg asks for Home's cards in the same commit that navigates back to Home —
           * before it has remounted and re-registered them. One null, and that step lost its ring for
           * good. Keep asking until the budget runs out.
           */
          if (waited < SETTLE_MAX_MS) setTimeout(() => settle(last, waited + SETTLE_STEP_MS), SETTLE_STEP_MS);
          return;
        }
        const stable = last !== null && Math.abs(r.y - last) < 0.5;
        setHole({ key: stepKey, rect: r });
        if (stable || waited >= SETTLE_MAX_MS) return;
        setTimeout(() => settle(r.y, waited + SETTLE_STEP_MS), SETTLE_STEP_MS);
      });
    };

    scrollIntoView(() => {
      if (!cancelled) settle(null, 0);
    });

    return () => {
      cancelled = true;
    };
  }, [anchorId, stepKey, anchorNode, scrollerNode, scrollY, fallbackViewTop, fallbackViewBottom]);

  if (!step) return null;

  const total = steps.length;
  const isLast = clamped >= total - 1;
  const spot = anchorId && hole?.key === stepKey ? hole.rect : null;

  // Grow the hole by the step's padding, then keep it on screen — a card flush to the edge would otherwise
  // ring a rectangle half of which is off it.
  const pad = step.pad ?? 8;
  const ring = spot
    ? (() => {
        let left = spot.x - pad;
        let top = spot.y - pad;
        let w = spot.w + pad * 2;
        let h = spot.h + pad * 2;
        if (left < 6) {
          w += left - 6;
          left = 6;
        }
        if (top < 6) {
          h += top - 6;
          top = 6;
        }
        return { left, top, width: Math.max(0, w), height: Math.max(0, h) };
      })()
    : null;

  // Below the hole when it fits, above when it doesn't, pinned at the resting line as the last resort.
  const bottomLimit = frameH - insets.bottom - restingBottom - 8;
  const cardTop = ring
    ? ring.top + ring.height + 16 + cardH < bottomLimit
      ? ring.top + ring.height + 16
      : ring.top - 16 - cardH > insets.top + 12
        ? ring.top - 16 - cardH
        : Math.max(insets.top + 12, bottomLimit - cardH)
    : null;

  return (
    <View ref={rootRef} style={styles.stage} collapsable={false} pointerEvents="box-none">
      {/* Tap shield. Full-strength dim only when there's no hole to cut; with a ring, the dim IS the ring's
          shadow, and a second scrim on top of it would double-darken the screen. */}
      <View style={[styles.shield, ring ? null : styles.shieldDim]} pointerEvents="auto" />

      {ring ? (
        <View
          pointerEvents="none"
          style={[styles.ring, { left: ring.left, top: ring.top, width: ring.width, height: ring.height, borderRadius: step.radius ?? 16 }]}
        />
      ) : null}

      <View style={styles.cardLayer} pointerEvents="box-none">
        <View
          onLayout={(e) => setCardH(e.nativeEvent.layout.height)}
          style={[styles.card, cardTop != null ? { top: cardTop } : { bottom: restingBottom }]}
        >
          <View style={styles.cardHead}>
            <Text style={styles.step}>{total > 1 ? `${clamped + 1} of ${total}` : 'Tip'}</Text>
            <Pressable
              onPress={onSkip}
              accessibilityRole="button"
              accessibilityLabel={total > 1 ? 'Skip the rest of this walkthrough' : 'Dismiss'}
              hitSlop={8}
            >
              {/* "Skip", not "Skip all". It retires THIS walkthrough and nothing else — the other surfaces
                  still teach themselves once each — so the old label promised a global silence the control
                  does not deliver, and an athlete who tapped it expecting one met twenty-six more tours.
                  The genuine global off-switch is Guided Tips in Account Settings, which is where a promise
                  that size belongs. The accessibility label already said this correctly. */}
              <Text style={styles.skipText}>{total > 1 ? 'Skip' : 'Dismiss'}</Text>
            </Pressable>
          </View>

          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.body}>{step.body}</Text>

          <View style={styles.foot}>
            {clamped > 0 ? (
              <Pressable onPress={onPrev} accessibilityRole="button" accessibilityLabel="Previous step" hitSlop={8} style={styles.back}>
                <Text style={styles.backText}>Back</Text>
              </Pressable>
            ) : (
              <View />
            )}
            <Button variant="primary" onPress={onNext} accessibilityLabel={isLast ? doneLabel : 'Next step'}>
              {isLast ? doneLabel : 'Next'}
            </Button>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 },
  shield: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  shieldDim: { backgroundColor: 'rgba(4,6,8,0.76)' },
  /**
   * The hole. `borderRadius` + a 9999px spread shadow = a rounded window in an otherwise dimmed screen,
   * with the bronze halo layered in the same declaration. Straight from the design's coach mark.
   */
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: flColor.bronze400,
    boxShadow: '0 0 0 4px rgba(191,143,79,0.14), 0 0 22px rgba(191,143,79,0.26), 0 0 0 9999px rgba(4,6,8,0.76)',
  },
  cardLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  card: {
    position: 'absolute',
    left: 18,
    right: 18,
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal900,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 18,
    gap: 9,
    boxShadow: flShadow.ambient,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  step: {
    fontFamily: flFont.sans,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: flColor.bronze400,
  },
  title: {
    fontFamily: flFont.display,
    fontSize: 23,
    fontWeight: '600',
    letterSpacing: -0.3,
    lineHeight: 27,
    color: flColor.cream100,
  },
  body: {
    fontFamily: flFont.sans,
    fontSize: 14,
    lineHeight: 21,
    color: flColor.gray400,
  },
  foot: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  back: { paddingVertical: 8, paddingRight: 12 },
  backText: { fontFamily: flFont.sans, fontSize: 13, fontWeight: '600', color: flColor.gray400 },
  skipText: { fontFamily: flFont.sans, fontSize: 12.5, fontWeight: '500', color: flColor.gray600 },
});
