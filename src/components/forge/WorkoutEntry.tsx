import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Button } from '@/components/forge/composites/Button';
import { flColor, flFont } from '@/constants/foundation';
import { useReducedMotion } from '@/lib/useReducedMotion';
import type { ResolvedArtwork } from '@/domain/home-artwork/types';
import { resolveArtworkSource } from '@/domain/home-artwork/artwork-source';

/**
 * WORKOUT ENTRY — the screen you meet before training, in both of its states.
 *
 * Built to `Forge Workout Entry.dc.html` (design system `ForgeLegacyVisualFoundation_5368b2`). It replaces
 * the card-in-a-void that served **Freestyle** (a session with nothing in it yet) and **Resume** (a
 * session already underway), which were two `Card variant="hero"` blocks vertically centred in an empty
 * screen with left-aligned type inside them.
 *
 * ══ THE ONE-LINE CHANGE ══
 *
 * The bordered container is deleted. The workout identity sits directly on the stone as a single centred
 * column anchored to the BOTTOM, artwork carries the top half, and **bronze is spent on exactly one
 * element — the CTA**. Both states share this shell and nothing else: eyebrow, title, two body lines, CTA
 * and dismiss all differ, which is why they are props rather than a `variant`.
 *
 * ══ ⚠ THE ARTWORK GRADING IS NOT THE SPEC'S NUMBERS, AND THE SPEC'S OWN RULE IS WHY ══
 *
 * §2 asks for `opacity: 0.72` + `mix-blend-mode: screen` + a vertical `mask-image`, and states the reason
 * plainly: *"deliberately identical to the Home hero card's grading… Same asset, same grading,
 * everywhere."* Following the numbers here would BREAK that rule rather than keep it.
 *
 * Those numbers grade an OPAQUE asset — `screen` and the mask exist to drop a rectangular ground and hide
 * its edges. The app's Home artwork was luminance-cut to real alpha in a later pass (72 PNGs), and
 * `TodaysWorkoutCard` consequently draws it at **opacity 1 with no blend, mask, fade or crop**. React
 * Native has neither `mix-blend-mode` nor `mask-image` anyway, so a literal port is not on the table — but
 * even where it is, `opacity: 0.72` on an already-transparent figure is not "the same as Home", it is
 * *fainter than Home*.
 *
 * So: **opacity 1, no blend, no mask, matching the shipped Home card**, which is what §2 actually asks
 * for. Neither half of the mask survives, and neither is missed: the top fade existed to hide a rectangle
 * edge under the status bar and there is no rectangle, and the bottom fade is performed by the asset's own
 * alpha — the luminance cut turned every dark pixel transparent, so the figure dissolves as it descends.
 * See the render for why substituting a gradient scrim would be actively worse.
 *
 * ══ WHAT IS DELIBERATELY ABSENT ══
 *
 * No glyph above the eyebrow, no carved mark at the foot, no bottom glow, no second card, no stats row, no
 * progress bar or ring. All were prototyped and cut in the design pass (§10); the emptiness is the
 * composition. The Resume state's entire progress treatment is the words `Last: <exercise>`.
 */
export interface WorkoutEntryProps {
  /** Resolver output for this session. Null falls back to the stone alone — never a broken image. */
  art: ResolvedArtwork | null;
  /** Authored in caps: `FREESTYLE` · `WORKOUT IN PROGRESS`. */
  eyebrow: string;
  title: string;
  /**
   * 34 for `Freestyle Workout`, 38 for a real workout name — §9: a real name earns more scale.
   *
   * ⚠ It is a SIZE, not a state flag. The two states differ in six ways and a boolean here would be the
   * seventh place to look them up.
   */
  titleSize: 34 | 38;
  /** Two authored lines. The break is composed, not left to wrapping (§5). */
  line1: string;
  line2?: string | null;
  ctaLabel: string;
  /** Freestyle's `+`. Resume adds nothing, so it gets no plus (§7). */
  ctaPlus?: boolean;
  onCta: () => void;
  dismissLabel: string;
  onDismiss: () => void;
}

export function WorkoutEntry({
  art,
  eyebrow,
  title,
  titleSize,
  line1,
  line2,
  ctaLabel,
  ctaPlus = false,
  onCta,
  dismissLabel,
  onDismiss,
}: WorkoutEntryProps) {
  const source = art ? resolveArtworkSource(art.assetPath) : null;
  const { width } = useWindowDimensions();
  const rise = useEntryRise();
  /*
   * ⚠ THE 46px BOTTOM PADDING IS MEASURED ON A 404 × 868 CANVAS THAT HAS NO HOME INDICATOR.
   *
   * Shipping it as a constant would put the dismiss label roughly 12pt off the physical bottom of a
   * modern iPhone — under the indicator, which is the exact defect the coach sheets shipped with. The
   * design's 46 is the gap it wants ABOVE the safe area, so the inset is added rather than substituted.
   */
  const insets = useSafeAreaInsets();

  /*
   * The reference frame is 404 × 868 and the art is `height: 438` — a hair over half the frame, sized so
   * the near-square asset overflows horizontally and crops at both edges. Scaling by WIDTH rather than
   * height keeps that relationship on every device: the figure fills the screen's width and the crop is
   * what hides the asset's own margins. A fixed 438 would leave a tall phone half empty.
   */
  const artHeight = Math.round((438 / 404) * width);

  return (
    <View style={styles.root}>
      {source != null ? (
        <View pointerEvents="none" style={[styles.artLayer, { height: artHeight }]}>
          {/*
            NO SCRIM, AND THAT IS THE FADE — see the header. The luminance→alpha pass already turned every
            dark pixel of these masters transparent, so the figure dissolves into the stone on its own;
            that is why `TodaysWorkoutCard` draws it bare too.

            ⚠ A gradient scrim here would be worse than nothing. Its opaque end would land mid-screen on a
            TEXTURED background, flattening the slate into a solid block with a visible horizontal seam
            where the layer stops. A real mask needs `@react-native-masked-view`, and a new native
            dependency moves the build fingerprint — which costs every athlete an OTA — for a fade the
            asset already performs.

            `alt=""` + `aria-hidden` + `pointerEvents: none` (§12) — decorative, never announced.
          */}
          <Image source={source} style={styles.art} contentFit="cover" contentPosition="top center" accessible={false} />
        </View>
      ) : null}

      {/* The spacer above is what bottom-anchors this: the column is `flex: none` under a `flex: 1` gap,
          not a vertically centred box. §3. */}
      <View style={styles.spacer} />

      <Animated.View style={[styles.column, { paddingBottom: 46 + insets.bottom }, rise]}>
        <View style={styles.eyebrowRow}>
          <LinearGradient
            colors={['rgba(186,146,92,0)', 'rgba(186,146,92,0.45)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.rule}
          />
          <Text style={styles.eyebrow} numberOfLines={1}>
            {eyebrow}
          </Text>
          <LinearGradient
            colors={['rgba(186,146,92,0.45)', 'rgba(186,146,92,0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.rule}
          />
        </View>

        {/* ⚠ `width: '100%'` on the title AND the body. The column is `align-items: center`, which
            shrink-wraps block children — without it the copy wraps at roughly half width. This was a real
            bug in the design's own first pass and it reproduces identically in RN. */}
        <Text style={[styles.title, { fontSize: titleSize, lineHeight: Math.round(titleSize * 1.06) }]}>{title}</Text>

        <View style={styles.diamondRow}>
          <LinearGradient
            colors={['rgba(186,146,92,0)', 'rgba(186,146,92,0.38)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.rule}
          />
          <View style={styles.diamond} />
          <LinearGradient
            colors={['rgba(186,146,92,0.38)', 'rgba(186,146,92,0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.rule}
          />
        </View>

        <Text style={styles.body}>
          {line1}
          {line2 ? `\n${line2}` : ''}
        </Text>

        {/* The 40px above this is the largest gap in the column and it is load-bearing: it separates
            reading from acting. Do not equalize the rhythm. */}
        <View style={styles.ctaWrap}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={onCta}
            accessibilityLabel={ctaLabel}
            icon={ctaPlus ? <PlusGlyph /> : null}
          >
            {ctaLabel}
          </Button>
        </View>

        {/*
          ⚠ WARM GRAY, AND THAT INCLUDES "End workout".
          It was bronze, which gave the two paths equal weight; bronze now points at exactly one thing.
          Resume's dismiss is destructive in MEANING and still stays this quiet — confirmation belongs in
          the step that follows, not in the weight of a label. `#8A817A` on the stone is ~5.2:1, which
          passes AA for body text; if it needs to be quieter, that is a size or spacing change, never a
          darker colour. `hitSlop` holds the 44pt target under 15px text.
        */}
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel={dismissLabel}
          hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
          style={({ pressed }) => [styles.dismiss, pressed ? styles.dismissPressed : null]}
        >
          <Text style={styles.dismissText}>{dismissLabel}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

/** Fade + slight rise on the content column, ~260ms. The artwork never animates. */
function useEntryRise() {
  const reduced = useReducedMotion();
  const [t] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduced) {
      // Not "no animation" — the column still has to be VISIBLE. Jumping straight to 1 is the
      // reduced-motion variant; leaving the value at 0 would hide the screen.
      t.setValue(1);
      return;
    }
    Animated.timing(t, { toValue: 1, duration: 260, easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: true }).start();
  }, [t, reduced]);

  return { opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] };
}

function PlusGlyph() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2.4} strokeLinecap="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  artLayer: { position: 'absolute', top: 0, left: 0, right: 0 },
  art: { width: '100%', height: '100%' },

  spacer: { flex: 1, minHeight: 0 },
  column: { alignItems: 'center', paddingHorizontal: 22 }, // paddingBottom is 46 + the safe-area inset

  // ── eyebrow (§4)
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 14, width: '100%', maxWidth: 300 },
  rule: { flex: 1, height: 1 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 4.6, color: flColor.bronze400 },

  // ── title (§5). `width: '100%'` is required — see the note at the call site.
  title: {
    width: '100%',
    marginTop: 18,
    fontFamily: flFont.display,
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'center',
    color: flColor.cream100,
  },

  // ── diamond divider (§6) — narrower than the eyebrow's 300 so the two rule-pairs do not read as a repeat
  diamondRow: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', maxWidth: 236, marginTop: 20 },
  diamond: { width: 6, height: 6, transform: [{ rotate: '45deg' }], backgroundColor: flColor.bronze400, opacity: 0.85 },

  body: { width: '100%', marginTop: 20, fontSize: 16, lineHeight: 26, textAlign: 'center', color: flColor.gray400 },

  ctaWrap: { width: '100%', marginTop: 40 },

  dismiss: { marginTop: 30, paddingVertical: 8, paddingHorizontal: 16 },
  dismissPressed: { opacity: 0.7 },
  dismissText: { fontSize: 15, color: '#8A817A' },
});
