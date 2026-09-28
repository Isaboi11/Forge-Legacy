import { useRef, type ReactNode } from 'react';
import { Keyboard, Platform, StyleSheet, TextInput, View, type GestureResponderEvent } from 'react-native';

/**
 * ══ TAP ANYTHING THAT ISN'T A TEXT FIELD, AND THE KEYBOARD GOES AWAY ══
 *
 * PO, 2026-09-28: *"if I press a button (like on onboarding the lbs button) that doesn't need the keyboard
 * the keyboard should disappear."*
 *
 * Why it didn't: on iOS a tap only dismisses the keyboard when it lands in a ScrollView whose
 * `keyboardShouldPersistTaps` is `never` — and most of the app's scrollers are `"handled"` ON PURPOSE, so a
 * button tap is never swallowed by a dismiss (the "Log Set needs two taps" bug; see `useKeyboardLift`). On
 * iPhone Safari a tap on a non-focusable element does not blur the field either. So in both places the
 * keyboard stayed up over "Lbs / Kgs", "Male / Female", every tile and chip.
 *
 * ══ HOW ══
 *
 * One View at the ROOT watches every touch as it BUBBLES (touch events bubble through the React tree, so
 * sheets, Modals and native-stack modals are all seen). When a tap — not a drag — ends somewhere that is not
 * the focused field, the field is blurred ~60 ms later.
 *
 * ⚠ AFTER THE PRESS, NEVER DURING IT. The dismissal is deferred past touch-end, so the button's own
 *   `onPress` has already fired. Hiding the keyboard mid-press is what slides a pinned panel out from under
 *   the finger and cancels the press — the exact two-tap bug. Deferring makes that impossible.
 * ⚠ NOT WHEN FOCUS MOVED. Tapping another field (or a control that focuses one, like the keyboard primer)
 *   changes the focused input before the timer runs, and the check is "still the same field" — so moving
 *   between fields never flickers the keyboard down and up.
 * ⚠ NOT ON THE FIELD ITSELF. Placing the caret, or tapping a field's own padding, is inside the field (its
 *   rect plus `FIELD_SLOP`), so it never dismisses.
 * ⚠ NOT A DRAG. Scrolling is handled by `KEYBOARD_DISMISS_MODE`; a finger that moves further than `SLOP` is
 *   a scroll, not a tap.
 * ⚠ A CONTROL THAT MUST KEEP THE KEYBOARD (a chat Send, a field's clear or show-password button) spreads
 *   `KEEP_KEYBOARD` on itself. Its `onTouchStart` runs before this root's touch-end (children first), and
 *   the flag is spent by that touch-end.
 *
 * Desktop web never sees touch events, so a mouse click changes nothing there — nor does it need to.
 */

const SLOP = 10;
const FIELD_SLOP = 16;
const DEFER_MS = 60;

let keepThisTouch = false;

/** Spread on a control whose tap must NOT close the keyboard (Send, clear, show-password). */
export const KEEP_KEYBOARD = {
  onTouchStart: () => {
    keepThisTouch = true;
  },
} as const;

type Rect = { x: number; y: number; w: number; h: number };

/** The focused text field, or null. Web reads the DOM; native reads RN's own focus registry. */
function focusedField(): unknown {
  if (Platform.OS === 'web') {
    if (typeof document === 'undefined') return null;
    const el = document.activeElement as HTMLElement | null;
    if (!el) return null;
    const tag = el.tagName;
    if (tag === 'TEXTAREA' || el.isContentEditable) return el;
    if (tag === 'INPUT') {
      const type = (el as HTMLInputElement).type;
      return type === 'checkbox' || type === 'radio' || type === 'button' || type === 'submit' ? null : el;
    }
    return null;
  }
  return TextInput.State.currentlyFocusedInput?.() ?? null;
}

function blur(field: unknown) {
  if (Platform.OS === 'web') (field as HTMLElement).blur?.();
  else Keyboard.dismiss();
}

/** Web: is the touched element a text field (or inside one)? Exact, no geometry needed. */
function webTargetIsField(e: GestureResponderEvent): boolean {
  const t = (e.nativeEvent as unknown as { target?: unknown }).target ?? (e as unknown as { target?: unknown }).target;
  const el = t as HTMLElement | null;
  if (!el || typeof el.closest !== 'function') return false;
  return !!el.closest('input, textarea, [contenteditable="true"]');
}

/**
 * The touch point. Native hands RN's normalized event (`pageX` on the event); react-native-web hands
 * `onTouch*` the raw DOM `TouchEvent`, where the coordinates live on the `Touch` objects.
 */
function point(n: GestureResponderEvent['nativeEvent']): { x: number; y: number } {
  const raw = n as unknown as { pageX?: number; pageY?: number; touches?: ArrayLike<{ pageX: number; pageY: number }>; changedTouches?: ArrayLike<{ pageX: number; pageY: number }> };
  const t = typeof raw.pageX === 'number' ? raw : (raw.touches?.[0] ?? raw.changedTouches?.[0]);
  return { x: t?.pageX ?? 0, y: t?.pageY ?? 0 };
}

export function KeyboardTapAway({ children }: { children: ReactNode }) {
  /* The touch in progress. Written and read only in event handlers (never during render). */
  const touch = useRef<{ x: number; y: number; field: unknown; rect: Rect | null; moved: boolean; onField: boolean } | null>(null);

  const onTouchStart = (e: GestureResponderEvent) => {
    try {
      const n = e.nativeEvent;
      if ((n.touches?.length ?? 1) > 1) {
        touch.current = null;
        return;
      }
      const field = focusedField();
      if (!field) {
        touch.current = null;
        return;
      }
      const p = point(n);
      const t = { x: p.x, y: p.y, field, rect: null as Rect | null, moved: false, onField: Platform.OS === 'web' && webTargetIsField(e) };
      touch.current = t;
      if (Platform.OS !== 'web') {
        (field as { measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void }).measureInWindow?.((x, y, w, h) => {
          t.rect = { x, y, w, h };
        });
      }
    } catch {
      touch.current = null;
    }
  };

  const onTouchMove = (e: GestureResponderEvent) => {
    const t = touch.current;
    if (!t) return;
    const p = point(e.nativeEvent);
    if (Math.abs(p.x - t.x) > SLOP || Math.abs(p.y - t.y) > SLOP) t.moved = true;
  };

  const onTouchEnd = () => {
    const t = touch.current;
    const keep = keepThisTouch;
    touch.current = null;
    keepThisTouch = false;
    if (!t || t.moved || t.onField || keep) return;
    setTimeout(() => {
      try {
        const r = t.rect;
        const onField = r != null && t.x >= r.x - FIELD_SLOP && t.x <= r.x + r.w + FIELD_SLOP && t.y >= r.y - FIELD_SLOP && t.y <= r.y + r.h + FIELD_SLOP;
        if (onField) return;
        const now = focusedField();
        if (now && now === t.field) blur(now);
      } catch {
        /* a keyboard nicety must never take a screen down */
      }
    }, DEFER_MS);
  };

  const onTouchCancel = () => {
    touch.current = null;
    keepThisTouch = false;
  };

  return (
    <View style={styles.fill} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchCancel}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
