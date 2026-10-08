import { Platform } from 'react-native';

/**
 * How every scrolling surface in the app lets go of the keyboard. ONE value, so no screen can drift.
 *
 * PO, 2026-09-26, after `on-drag` shipped: *"It doesn't feel very smooth. It's there, I swipe down, it's
 * gone. I need it to be smooth. The same way it is … in the iPhone texting."*
 *
 * · **iOS — `interactive`.** The keyboard follows the finger down, frame by frame, and can be dragged
 *   back up before it is let go — exactly iMessage. Anything pinned above the keyboard follows it too:
 *   see `useKeyboardLift`, which is the other half of this and the reason it no longer looks "gone".
 * · **Android — `on-drag`.** Android has no interactive mode (RN treats it as `on-drag` there anyway).
 * · **Web — `none`.** ⚠ react-native-web's `on-drag` is NOT a drag: it blurs on EVERY scroll event,
 *   including the ones nobody's finger made. PO, 2026-10-08: *"When changing an exercise on building a
 *   program or template it keeps bringing the keyboard down when I'm typing."* Typing in the picker's
 *   search shortens the list, the browser clamps the scroll position, that is a scroll event, and the
 *   keyboard went down mid-word. iPhone Safari scrolling a focused field into view did the same. On web
 *   the swipe-down is done by `KeyboardTapAway` instead, from the finger itself.
 *
 * Guarded by `src/app/__tests__/keyboard-dismiss.test.mjs`: every scroll container must use this
 * constant, not a string literal.
 */
export const KEYBOARD_DISMISS_MODE: 'interactive' | 'on-drag' | 'none' =
  Platform.OS === 'ios' ? 'interactive' : Platform.OS === 'web' ? 'none' : 'on-drag';
