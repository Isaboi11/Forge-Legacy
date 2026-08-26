import { useEffect, useState } from 'react';
/*
 * ⚠ NOT `useAnimatedValue` — IT DOES NOT EXIST ON WEB, AND IT TAKES THE WHOLE PAGE DOWN.
 *
 * React Native ships `useAnimatedValue`; **react-native-web does not implement it at all** (zero hits
 * anywhere in the package). So on web the import resolves to `undefined`, calling it throws
 * `(0, b.useAnimatedValue) is not a function`, and because that happens during render there is nothing
 * to catch it — the app renders a WHITE SCREEN. Reported from the web preview 2026-08-14 on the exercise
 * picker, which mounts this mark.
 *
 * `useState` with a lazy initialiser is the pattern the other ~30 animated values in this codebase
 * already use. It is stable across renders like a ref, and unlike `useRef(...).current` it does not trip
 * the react-compiler lint rule against reading `ref.current` during render.
 */
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';

import { IS_PAPER, flColor, flShadow } from '@/constants/foundation';
import { useReducedMotion } from '@/lib/useReducedMotion';

/**
 * ══ THE COIN IS STRUCK IN THE THEME'S OWN METAL ══
 *
 * PO, 2026-08-26: *“evaluate coach holt and his coloring to make him fit more with the light mode.”*
 *
 * The master is a bronze relief on a NEAR-BLACK field — measured, the field sits at luminance 11 of 255
 * and the darkest 1% is true black. Cover-filled into a 52px circular clip on a cream page, that is not
 * a coin, it is a hole punched in the paper: the highest-contrast object on the screen, wearing a
 * floating control the athlete is not being asked to press.
 *
 * ⚠ THE FIX IS A SECOND ASSET, NOT A `tintColor`. A tint flattens the relief to one colour, and the
 *   relief is the entire reason it reads as struck rather than printed. `scripts/artwork/holt-mark-paper.py`
 *   maps the master's own luminance onto `bronzeMetallic`'s two endpoints (#765B44 → #C99767), so the
 *   field becomes shadowed bronze and the lit faces become bronze highlight — the same metal Paper
 *   deliberately refuses to invert everywhere else. That script carries the full reasoning and the three
 *   ramps that were rendered and rejected.
 *
 * ⚠ BOTH `require`s ARE STATIC LITERALS ON PURPOSE. Metro resolves them at build time; a computed path
 *   would resolve to nothing and the mark would render as a blank circle in one theme. `IS_PAPER` is
 *   fixed at module init like every other palette read — see `foundation.ts`.
 */
const MARK_SOURCE = IS_PAPER
  ? require('../../../assets/images/coach-holt-mark-paper.png')
  : require('../../../assets/images/coach-holt-mark.png');

/**
 * Coach Holt's mark — a forged bronze medallion, and the only bronze in this feature that moves.
 *
 * ══ IT IS AN IMAGE, NOT A GLYPH ══
 *
 * ⚠ The first implementation drew a padlock outline and, before that, the letter "C". The handoff ships
 * `coach-holt-mark.png` — a struck bronze coin of a coach with folded arms and a speech bubble — and it
 * carries the whole identity of the feature. No SVG approximation of it is acceptable, and the fact that
 * one shipped is why the surface did not read as Holt at all.
 *
 * ══ THE THREE STATES (PROMPT §4.4–4.8) ══
 *
 * Idle      — a static ring at `--fl-bronze-border-subtle`.
 * Thinking  — the ring WARMS: a box-shadow pulse between a faint and a strong bronze glow, 1.6s
 *             ease-in-out. **It does not spin.** Metal near a fire, not a loading spinner.
 * Building  — a ring SWEEPS around the outside at `inset: -4px`, 1.15s linear, while the mark itself
 *             stays perfectly still.
 *
 * The distinction matters: the earlier version rotated the mark itself for building and merely tinted the
 * border for thinking, which read as one fidgety state instead of two meanings.
 *
 * Under reduced motion the sweep becomes a static ring and the pulse a steady glow (§4.8).
 */
export type MarkState = 'idle' | 'thinking' | 'building';

export function HoltMark({ size = 36, state = 'idle' }: { size?: number; state?: MarkState }) {
  const [pulse] = useState(() => new Animated.Value(0));
  const [spin] = useState(() => new Animated.Value(0));
  const still = useReducedMotion();

  useEffect(() => {
    // `still` is a plain boolean now, so this is a guard rather than the async dance it started as.
    if (!still) {
      if (state === 'thinking') {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
            Animated.timing(pulse, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
          ]),
        ).start();
      }
      if (state === 'building') {
        Animated.loop(
          Animated.timing(spin, { toValue: 1, duration: 1150, easing: Easing.linear, useNativeDriver: true }),
        ).start();
      }
    }

    return () => {
      pulse.stopAnimation();
      spin.stopAnimation();
      pulse.setValue(0);
      spin.setValue(0);
    };
  }, [state, pulse, spin, still]);

  const ring = size + 8; // `inset: -4px` — the sweep sits outside the mark, never over it.

  return (
    <View style={{ width: size, height: size }}>
      {state === 'building' ? (
        <Animated.View
          pointerEvents="none"
          style={[
            // §4.8 — with reduced motion this stops rotating and stands as a bronze ring instead.
            still ? styles.ringStatic : styles.sweep,
            {
              width: ring,
              height: ring,
              borderRadius: ring / 2,
              left: -4,
              top: -4,
              transform: still ? [] : [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
            },
          ]}
        />
      ) : null}

      <Animated.View
        style={[
          styles.mark,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: state === 'building' ? flColor.bronzeBorder : flColor.bronzeBorderSubtle,
          },
          state === 'thinking' && still
            ? { boxShadow: flShadow.glowSubtle }
            : state === 'thinking'
            ? {
                // The heat pulse. `boxShadow` interpolates as a string here, so the two ends are the
                // literal values from §4.6 rather than an approximation of them.
                boxShadow: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [
                    `0 0 0 1px ${flColor.bronzeBorderSubtle}, 0 0 10px rgba(186,146,92,0.10)`,
                    `0 0 0 1px ${flColor.bronzeBorder}, 0 0 26px rgba(186,146,92,0.34)`,
                  ],
                }) as unknown as string,
              }
            : null,
        ]}
      >
        <Image
          source={MARK_SOURCE}
          style={{ width: size, height: size }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { overflow: 'hidden', borderWidth: 1, backgroundColor: flColor.base },
  /* A ring that is transparent for most of its circumference and bronze at one end — the closest honest
     read of the design's conic sweep with the primitives available. */
  ringStatic: { position: 'absolute', borderWidth: 1.5, borderColor: flColor.bronzeBorder },
  sweep: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderTopColor: flColor.bronze300,
    borderRightColor: flColor.bronze400,
  },
});

/** The bubble's own treatment — 52px, the mark cover-filled, and the badge glow (PROMPT §3.1–3.3). */
export const BUBBLE_SIZE = 52;
/**
 * ⚠ THIS WAS ASSEMBLED HERE FROM TWO BLACK LITERALS AND IT DID NOT SWITCH THEMES.
 *
 * It read `0 0 0 1px rgba(0,0,0,0.5), ${flShadow.glowBadge}, 0 12px 28px rgba(0,0,0,0.4)` — one token
 * in the middle, a hard black ring and a black drop shadow around it. The comment above it called the
 * ring “a dark rim to lift it off whatever it floats over”, and on near-black that is exactly what it
 * does. On Alabaster it outlines a dark disc in black against cream, which is the single most
 * conspicuous object on the screen and is a control the athlete is not being asked to press.
 *
 * `flShadow.coachMarkFloat` states all three terms in both palettes. Forge's is byte-identical to the
 * string this replaced; Paper draws the rim in bronze and the float in warm brown.
 */
export const BUBBLE_SHADOW = flShadow.coachMarkFloat;
