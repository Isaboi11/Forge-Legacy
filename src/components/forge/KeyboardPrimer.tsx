import { createContext, useCallback, useContext, useRef, type ReactNode } from 'react';
import { StyleSheet, TextInput } from 'react-native';

/**
 * THE KEYBOARD PRIMER — how a sheet that does not exist yet gets a keyboard on the web.
 *
 * ══ THE RULE THIS EXISTS FOR ══
 *
 * A browser opens the software keyboard only for a `focus()` issued INSIDE the user-gesture call stack.
 * Anything deferred — a frame, a timeout, an effect after a state commit — moves the call outside that
 * stack, and **iOS Safari then focuses the element and silently declines to show a keyboard**. The field
 * gets a caret, looks completely live, and cannot be typed into.
 *
 * React Native's `autoFocus` is exactly that deferred call: it fires when the element mounts, one commit
 * after the tap that mounted it. Native has no such rule, so `autoFocus` is correct there and the defect
 * is invisible to anyone testing on a simulator — which is why twelve screens shipped with it.
 *
 * ⚠ AND EVERY `BottomSheet` IS AFFECTED, because it is a bare `<Modal visible={open}>`: RN's Modal
 * renders `null` while closed, so its children do not exist at the moment of the tap. Any `autoFocus`
 * inside a sheet, an overlay, or a `{flag ? <TextInput/> : null}` swap is the same bug.
 *
 * ══ WHAT THIS DOES ══
 *
 * An invisible input that is ALWAYS mounted takes focus synchronously during the tap and opens the
 * keyboard. The real field then mounts and its `autoFocus` MOVES focus to it — and moving focus between
 * inputs while a keyboard is already up needs no gesture, which is the property the whole arrangement
 * rests on.
 *
 * PO: *"When I go to log a run it's not letting me put in the time."* That report was two separate faults
 * — a collapsed layout on `/log-activity` and a `Text`→`TextInput` swap in `CardioBlockCard` — and
 * auditing for "everything with the same thing to it" turned up this, the general form, in twelve more
 * places. `workout.tsx` had already discovered it, solved it locally for its Set Input Sheet, and left
 * two of its own overlays unfixed beside the solution.
 *
 * ══ ⚠ THREE INPUTS, BECAUSE THE TYPE CANNOT BE SET ON THE WAY IN ══
 *
 * Changing `keyboardType` is a state write, and a state write does not land before the `focus()` on the
 * next line — so a single primer would raise whatever keyboard it was last configured for. The original
 * in `workout.tsx` sidesteps this by hardcoding `decimal-pad`, which is right for a weight field and
 * would put a number pad under "Rename workout".
 *
 * So there is one primer per keyboard, each permanently mounted, and priming picks the matching one.
 * Three offscreen inputs cost nothing and the choice is made synchronously.
 */

export type PrimerKeyboard = 'default' | 'number-pad' | 'decimal-pad';

/**
 * Call this SYNCHRONOUSLY inside the `onPress` that opens the field — not in an effect, not after an
 * `await`, not inside a `setTimeout`. Being inside the gesture is the entire point; a deferred call is
 * the bug it exists to prevent, and it will look like it works on a simulator either way.
 */
export type PrimeKeyboard = (kind?: PrimerKeyboard) => void;

const noop: PrimeKeyboard = () => {};

/**
 * Defaults to a no-op rather than throwing. A missing provider must never take a screen down over a
 * keyboard nicety — the field still opens, and on native it still focuses.
 */
const KeyboardPrimerContext = createContext<PrimeKeyboard>(noop);

export function useKeyboardPrimer(): PrimeKeyboard {
  return useContext(KeyboardPrimerContext);
}

export function KeyboardPrimerProvider({ children }: { children: ReactNode }) {
  const plain = useRef<TextInput | null>(null);
  const numberPad = useRef<TextInput | null>(null);
  const decimalPad = useRef<TextInput | null>(null);

  const prime = useCallback<PrimeKeyboard>((kind = 'default') => {
    const target = kind === 'number-pad' ? numberPad : kind === 'decimal-pad' ? decimalPad : plain;
    target.current?.focus();
  }, []);

  return (
    <KeyboardPrimerContext.Provider value={prime}>
      {children}
      {/*
        * Offscreen rather than `display: none` or zero-sized: a hidden or undisplayed input cannot take
        * focus at all, which would make the whole mechanism a silent no-op. One pixel, a thousand points
        * off the top-left corner, fully transparent — the same shape `workout.tsx` arrived at.
        *
        * `caretHidden` and an empty value so nothing can ever be seen or typed into them, and
        * `accessibilityElementsHidden` / `importantForAccessibility` so a screen reader never lands on
        * three nameless fields.
        */}
      <TextInput
        ref={plain}
        style={styles.primer}
        value=""
        onChangeText={noopText}
        caretHidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <TextInput
        ref={numberPad}
        style={styles.primer}
        value=""
        onChangeText={noopText}
        keyboardType="number-pad"
        caretHidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <TextInput
        ref={decimalPad}
        style={styles.primer}
        value=""
        onChangeText={noopText}
        keyboardType="decimal-pad"
        caretHidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </KeyboardPrimerContext.Provider>
  );
}

/** Stable no-op, so each primer's `onChangeText` is not a fresh closure on every render. */
function noopText() {}

const styles = StyleSheet.create({
  primer: { position: 'absolute', top: -1000, left: -1000, width: 1, height: 1, opacity: 0 },
});
