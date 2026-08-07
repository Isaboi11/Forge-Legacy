import { useEffect, useState } from 'react';
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
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const vv = typeof window !== 'undefined' ? window.visualViewport : null;
      if (!vv) return;
      const read = () => {
        // Clamped at 0: Safari reports a viewport a pixel or two TALLER than the window during the
        // close animation, and a negative inset would push the panel off the bottom of the screen.
        const covered = window.innerHeight - vv.height - vv.offsetTop;
        setInset(covered > 1 ? covered : 0);
      };
      vv.addEventListener('resize', read);
      vv.addEventListener('scroll', read);
      return () => {
        vv.removeEventListener('resize', read);
        vv.removeEventListener('scroll', read);
      };
    }

    // Native: RN already reports the height directly. `Will*` on iOS so the panel travels with the
    // keyboard rather than arriving after it; `Did*` on Android, which has no `Will*` events.
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => setInset(e.endCoordinates?.height ?? 0));
    const hide = Keyboard.addListener(hideEvt, () => setInset(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return inset;
}
