import { Platform, type GestureResponderEvent } from 'react-native';
import {
  cancelAnimation,
  Easing,
  measure,
  scrollTo,
  useAnimatedKeyboard,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useSharedValue,
  withTiming,
  type AnimatedRef,
  type SharedValue,
} from 'react-native-reanimated';
import { useKeyboardInset } from './useKeyboardInset';

/**
 * ══ A PINNED PANEL THAT RIDES THE KEYBOARD FRAME BY FRAME — iMessage, not a lift ══
 *
 * PO, 2026-09-26: *"It doesn't feel very smooth. It's there, I swipe down, it's gone. I need it to be
 * smooth. The same way it is … in the iPhone texting. That smooth."*
 *
 * `useKeyboardInset` is React state: one number per keyboard EVENT, so a panel pinned above the keyboard
 * could only ever jump between "up" and "down". With `keyboardDismissMode="interactive"` (see
 * `@/lib/keyboard-dismiss`) the iOS keyboard now follows the finger — and a panel that stayed put while
 * the keyboard slid out from under it would look worse than before. This is the other half: on iOS the
 * lift is a Reanimated shared value, written on the UI thread every frame the keyboard moves, and the
 * panel's `paddingBottom` is an animated style reading it. Nothing crosses the JS thread.
 *
 * ══ WHERE THE PER-FRAME HEIGHT COMES FROM ══
 *
 * `useAnimatedKeyboard` (Reanimated 4.3.1 — deprecated in favour of react-native-keyboard-controller,
 * which is a NATIVE module and so cannot ship by OTA; this one is already in build 9's binary). Read in
 * `apple/reanimated/apple/keyboardObserver/REAKeyboardEventObserver.mm`:
 *
 * · Show/hide animations: it animates a hidden measuring view with the keyboard's own duration and
 *   samples it on a 120 Hz display link, so the value follows the keyboard's curve per frame.
 * · The INTERACTIVE drag: it KVO-observes `center` on the keyboard's host view (found in
 *   `UITextEffectsWindow`) and reports the visible height on every change — that is what makes a panel
 *   follow the finger, and what lets the athlete drag the keyboard back up.
 * · Inside an RN `<Modal>`: the keyboard lives in its own system window whatever presented it, the
 *   notifications are global, and the height is measured against the full-screen window — which a
 *   `transparent` Modal (overFullScreen) is the same size as. So `BottomSheet`'s Modal gets the same
 *   numbers as a screen does. (This is the thing `KeyboardAvoidingView` got wrong in a Modal; it
 *   measures its own frame.) Fabric: Reanimated 4 is New-Architecture only, so there is no other path.
 *
 * Web and Android are UNCHANGED: `inset` is `useKeyboardInset()` exactly as before (visualViewport on
 * web; `adjustResize` + Did-events on Android), and `lift` stays 0 there.
 *
 * ══ ⚠ THE TWO-TAP FIX STILL HOLDS — HOW ══
 *
 * `useKeyboardInset` delays every collapse 340 ms because a panel that drops between finger-down and
 * finger-up cancels the press (PO: "Log Set needs two taps"). A per-frame follower cannot delay
 * everything — a delayed follower is exactly the "not smooth" the PO is reporting — so on iOS the fix is
 * two narrower guarantees instead:
 *
 * 1. **The tap no longer hides the keyboard.** On native, a tap only dismisses the keyboard when it lands
 *    in a ScrollView whose `keyboardShouldPersistTaps` is `never` (RN captures the touch, blurs the input,
 *    and the button never sees it). Every panel this hook drives keeps its scrollers on `"handled"`, and a
 *    Pressable outside any scroller never blurs an input on iOS. So the keyboard can only start to hide
 *    from (a) a drag, or (b) a handler that runs on press-OUT — after the press has already completed.
 * 2. **And if it hides anyway, the panel holds while a finger rests on it.** Spread `touchHandlers` on the
 *    panel: from touch-down until the finger lifts (or moves more than a few points, i.e. becomes a drag)
 *    the lift may GROW but never shrink. When the finger lifts it eases to the keyboard (250 ms) rather than
 *    snapping. A drag releases the hold at once, so the interactive dismissal is never held back.
 *
 * Web keeps the 340 ms hold in `useKeyboardInset`, where the blur-on-tap is real (the DOM moves focus).
 */

/** How far a finger may wander on the panel before it counts as a drag and releases the hold. */
const TAP_SLOP = 8;
/** The ease back to the keyboard once a held panel is let go. */
const SETTLE_MS = 250;
/** Within this many points of the end, a thread counts as "reading the newest line". */
const ANCHOR_SLOP = 48;

export const FOLLOWS_KEYBOARD_PER_FRAME = Platform.OS === 'ios';

export interface PanelTouchHandlers {
  onTouchStart?: (e: GestureResponderEvent) => void;
  onTouchMove?: (e: GestureResponderEvent) => void;
  onTouchEnd?: (e: GestureResponderEvent) => void;
  onTouchCancel?: (e: GestureResponderEvent) => void;
}

export interface KeyboardLift {
  /**
   * The render-time inset — web and Android, exactly what `useKeyboardInset` returned before. Always 0 on
   * iOS, where the keyboard is followed through `lift` instead, so adding both never double-counts.
   */
  inset: number;
  /** iOS: the keyboard's visible height, per frame, UI thread. Web/Android: stays 0. */
  lift: SharedValue<number>;
  /** Spread on the pinned panel. Empty on web/Android. */
  touchHandlers: PanelTouchHandlers;
}

const NO_HANDLERS: PanelTouchHandlers = {};

function useKeyboardLiftIos(): KeyboardLift {
  const keyboard = useAnimatedKeyboard();
  const lift = useSharedValue(0);
  const held = useSharedValue(false);
  const settling = useSharedValue(false);
  const touchY = useSharedValue(0);

  useAnimatedReaction(
    () => ({ h: keyboard.height.value, held: held.value }),
    (now, prev) => {
      const target = now.h > 0 ? now.h : 0;
      if (now.held) {
        // A finger is resting on the panel: rising out of the keyboard's way is always allowed; falling
        // out from under the finger is not.
        if (target > lift.value) {
          cancelAnimation(lift);
          settling.value = false;
          lift.value = target;
        }
        return;
      }
      if ((prev?.held || settling.value) && Math.abs(target - lift.value) > 1) {
        // Just let go (or still catching up from it): ease onto the keyboard instead of snapping. Each
        // further keyboard frame retargets from wherever the ease has got to, so it never jumps.
        settling.value = true;
        lift.value = withTiming(target, { duration: SETTLE_MS, easing: Easing.out(Easing.cubic) }, (finished) => {
          if (finished) settling.value = false;
        });
        return;
      }
      settling.value = false;
      cancelAnimation(lift);
      lift.value = target;
    },
  );

  return {
    inset: 0,
    lift,
    touchHandlers: {
      onTouchStart: (e) => {
        touchY.set(e.nativeEvent.pageY);
        held.set(true);
      },
      onTouchMove: (e) => {
        if (Math.abs(e.nativeEvent.pageY - touchY.get()) > TAP_SLOP) held.set(false);
      },
      onTouchEnd: () => held.set(false),
      onTouchCancel: () => held.set(false),
    },
  };
}

function useKeyboardLiftFallback(): KeyboardLift {
  const inset = useKeyboardInset();
  const lift = useSharedValue(0);
  return { inset, lift, touchHandlers: NO_HANDLERS };
}

/**
 * The keyboard, for a panel pinned above it. See the header for the whole design.
 *
 * Use it as: `paddingBottom: base + inset` in the plain style (web/Android), plus an animated style
 * `paddingBottom: base + lift.value` applied only when `FOLLOWS_KEYBOARD_PER_FRAME` (iOS).
 *
 * The implementation is chosen once at module load (a platform never changes at runtime), so the hook
 * order is stable and `useAnimatedKeyboard` is never subscribed on web, where it does not exist.
 */
export const useKeyboardLift: () => KeyboardLift = FOLLOWS_KEYBOARD_PER_FRAME ? useKeyboardLiftIos : useKeyboardLiftFallback;

/**
 * ══ A CHAT THREAD THAT STAYS ON ITS NEWEST LINE WHILE THE KEYBOARD MOVES ══
 *
 * For a scroller whose bottom edge is lifted by `lift` (it shrinks as the keyboard rises). Returns the
 * `onScroll` handler for a Reanimated `Animated.ScrollView` wearing `ref`. iOS only — pass `undefined` for
 * `onScroll` elsewhere.
 *
 * Every frame the keyboard moves, on the UI thread:
 *
 * · **Reading the newest line** (scrolled to within `ANCHOR_SLOP` of the end): the offset is set to the new end, so
 *   the last message rides up and down glued to the composer, like iMessage — opening, closing, and the
 *   rest of the slide after an interactive drag is let go.
 * · **Reading further up**: left exactly where it is — except that it may never sit past the new end.
 *   Without that clamp, the tail of a keyboard close would open blank space under the last line, and
 *   the scroller would snap back the next time it was touched: the "jump at the end of the drag".
 * · **While the finger is dragging the thread**: hands off entirely. The drag scrolls the content with
 *   the finger, and the keyboard follows the same finger, so they already move together; correcting on
 *   top of that would move the content twice.
 *
 * The viewport is measured with `measure()` (the layout as last committed — i.e. for the PREVIOUS lift)
 * and corrected by this frame's change, because the padding for this frame has not been laid out yet
 * when the reaction runs.
 */
export function useKeyboardAnchoredScroll(lift: SharedValue<number>, ref: AnimatedRef<any>) {
  const y = useSharedValue(0);
  const contentH = useSharedValue(0);
  const dragging = useSharedValue(false);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      y.value = e.contentOffset.y;
      contentH.value = e.contentSize.height;
    },
    onBeginDrag: (e) => {
      dragging.value = true;
      y.value = e.contentOffset.y;
      contentH.value = e.contentSize.height;
    },
    onEndDrag: (e) => {
      dragging.value = false;
      y.value = e.contentOffset.y;
      contentH.value = e.contentSize.height;
    },
  });

  useAnimatedReaction(
    () => lift.value,
    (now, prev) => {
      if (prev === null || now === prev || dragging.value || contentH.value <= 0) return;
      const m = measure(ref);
      if (!m) return;
      const vpBefore = m.height;
      const vpAfter = vpBefore - (now - prev);
      const maxAfter = Math.max(0, contentH.value - vpAfter);
      const gap = contentH.value - y.value - vpBefore;
      let next: number;
      // Anchored only when the thread was actually scrolled to its end — a short thread that fits is
      // top-anchored by design (Holt's greeting stays put until the athlete says something).
      if (gap <= ANCHOR_SLOP && contentH.value > vpBefore) next = maxAfter;
      else if (y.value > maxAfter) next = maxAfter;
      else return;
      if (Math.abs(next - y.value) < 0.5) return;
      y.value = next;
      scrollTo(ref, 0, next, false);
    },
  );

  return onScroll;
}
