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
 * · **Android / web — `on-drag`.** Android has no interactive mode (RN treats it as `on-drag` there
 *   anyway), and react-native-web only implements `on-drag` (it blurs on scroll). Naming it keeps the
 *   behaviour those platforms already had.
 *
 * Guarded by `src/app/__tests__/keyboard-dismiss.test.mjs`: every scroll container must use this
 * constant, not a string literal.
 */
export const KEYBOARD_DISMISS_MODE: 'interactive' | 'on-drag' = Platform.OS === 'ios' ? 'interactive' : 'on-drag';
