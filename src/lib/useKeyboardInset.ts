import { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * How many pixels of the bottom of the screen the software keyboard is currently covering.
 *
 * ══ WHY THIS EXISTS RATHER THAN `KeyboardAvoidingView` ══
 *
 * `KeyboardAvoidingView` is a **no-op in react-native-web** — it renders a plain View and adjusts
 * nothing. Web is the platform this app is actually used from, so the component that eight other
 * screens rely on would have been a decoration on the one screen that needed it most.
 *
 * ══ WHY THE WEB BRANCH READS `visualViewport` ══
 *
 * When iOS Safari raises the keyboard it shrinks the VISUAL viewport and leaves the LAYOUT viewport
 * alone. `100%`, `vh` and `position: absolute; bottom: 0` are all measured against the layout
 * viewport, so a panel pinned to the bottom of the screen stays exactly where it was — behind the
 * keyboard. `window.visualViewport` is the only thing that knows the difference.
 *
 * `offsetTop` is subtracted because Safari also SCROLLS the visual viewport when a focused input
 * would otherwise sit under the keyboard; without it the panel over-corrects by however far the page
 * was pushed.
 *
 * Returns 0 when nothing is covered, on every platform and in every browser that lacks
 * `visualViewport` — an unsupported browser gets today's behaviour, never a broken layout.
 */

/**
 * ══ ⚠ WHY THE COLLAPSE IS DELAYED AND THE RAISE IS NOT ══
 *
 * Reported by the PO: **"when I'm logging a set I have to click the Log Set button twice."** Nothing was
 * wrong with the button. The set sheet is `position: absolute; justify-content: flex-end` with
 * `paddingBottom: keyboardInset`, so the inset is the only thing holding it above the keyboard — and
 * tapping any non-input blurs the field, which closes the keyboard, which drops the inset to 0, which
 * slides the whole sheet down by the keyboard's height. All of that happens BETWEEN the finger landing
 * and the finger lifting. The press-out therefore lands on empty space, the Pressable cancels, and no
 * `onPress` fires. The second tap works because by then the keyboard is already gone and nothing moves.
 *
 * That is not a set-sheet bug; it is true of every panel this hook positions, which is nine screens.
 *
 * So a SHRINK is held for one beat and a GROW is applied at once. Holding the shrink keeps the button
 * exactly where the athlete pressed it for long enough that the tap completes, and it is the truer
 * animation besides: iOS takes about a quarter of a second to slide the keyboard away, and both
 * `keyboardWillHide` and Safari's first `visualViewport` resize fire at the START of that. Applying zero
 * immediately made the panel jump to the bottom ahead of the keyboard it was supposed to be riding.
 *
 * A GROW is never delayed, because a panel that is a beat late getting out of the way is a panel behind
 * the keyboard — the exact failure this hook was written to prevent.
 */
const COLLAPSE_HOLD_MS = 340;

export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  /* The pending collapse, and the value currently on screen.
     ⚠ REFS, NOT A FUNCTIONAL UPDATER. Deciding grow-vs-shrink needs the value already applied, and the
     decision has side effects (scheduling and cancelling a timer). A `setInset(cur => …)` updater must
     stay PURE — StrictMode calls it twice, which would leave an orphaned timer behind every time. */
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const applied = useRef(0);

  useEffect(() => {
    const cancelCollapse = () => {
      if (collapseTimer.current) {
        clearTimeout(collapseTimer.current);
        collapseTimer.current = null;
      }
    };

    /**
     * Apply a new inset — at once when it grows, one beat later when it shrinks.
     *
     * The timer is RESCHEDULED on each further shrink, so Safari's stream of resize events during the
     * close animation settles once at the end rather than stepping the panel down through every frame
     * of it.
     */
    const apply = (next: number) => {
      cancelCollapse();
      if (next >= applied.current) {
        applied.current = next;
        setInset(next);
        return;
      }
      collapseTimer.current = setTimeout(() => {
        collapseTimer.current = null;
        applied.current = next;
        setInset(next);
      }, COLLAPSE_HOLD_MS);
    };

    if (Platform.OS === 'web') {
      const vv = typeof window !== 'undefined' ? window.visualViewport : null;
      if (!vv) return;
      const read = () => {
        // Clamped at 0: Safari reports a viewport a pixel or two TALLER than the window during the
        // close animation, and a negative inset would push the panel off the bottom of the screen.
        const covered = window.innerHeight - vv.height - vv.offsetTop;
        apply(covered > 1 ? covered : 0);
      };
      vv.addEventListener('resize', read);
      vv.addEventListener('scroll', read);
      return () => {
        cancelCollapse();
        vv.removeEventListener('resize', read);
        vv.removeEventListener('scroll', read);
      };
    }

    // Native: RN already reports the height directly. `Will*` on iOS so the panel travels with the
    // keyboard rather than arriving after it; `Did*` on Android, which has no `Will*` events.
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => apply(e.endCoordinates?.height ?? 0));
    const hide = Keyboard.addListener(hideEvt, () => apply(0));
    return () => {
      cancelCollapse();
      show.remove();
      hide.remove();
    };
  }, []);

  return inset;
}
