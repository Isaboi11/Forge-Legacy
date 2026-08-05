/**
 * ExerciseDemo — W-22 §1, the demonstration loop.
 *
 * Built to `Forge Exercise Detail.dc.html`'s FIRST block, which has specified this since the screen was
 * drawn: 290px tall, above the name, a faint bronze barbell behind it, a "MOVEMENT DEMO" badge, a
 * bottom scrim, a caption, and a full-area tap that pauses and plays the loop. The build shipped
 * without it and said so — "Demonstration loop — no media exists for any of the 794 exercises." That is
 * now being produced (`scripts/animation-processing`), so the slot is real.
 *
 * ── THE EMPTY FRAME IS THE POINT ─────────────────────────────────────────────────────────────────
 *
 * With no clip, this renders the frame and the watermark and NOTHING ELSE — no badge claiming a demo,
 * no caption describing camera angle and tempo for a video that isn't there, no play button over
 * nothing. Those all appear with the image. An exercise without a clip gets a quiet piece of furniture
 * at the top of its page, not a broken promise; the library doesn't cover strongman or most mobility
 * work, and a catalog entry can land before its clip does.
 *
 * ── PAUSE IS REAL ────────────────────────────────────────────────────────────────────────────────
 *
 * `expo-image` exposes `startAnimating()` / `stopAnimating()` on its ref, so the design's tap-to-pause
 * stops the actual animation rather than hiding it behind an overlay. Someone checking their setup
 * against a still frame is the reason this control exists.
 */

import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

import { flColor, flRadius } from '@/constants/foundation';

/** The design's barbell mark, 168px at 0.11 opacity — what fills the frame before the clip loads. */
function BarbellWatermark() {
  return (
    <Svg width={168} height={168} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={0.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6.5 9v6M17.5 9v6M4 10.5v3M20 10.5v3M6.5 12h11" />
    </Svg>
  );
}

export function ExerciseDemo({ url, caption = 'Side view · Full ROM · Normal tempo' }: { url: string | null; caption?: string }) {
  // The component instance, not `ImageRef` — `startAnimating`/`stopAnimating` live on the former.
  const ref = useRef<Image | null>(null);
  const [paused, setPaused] = useState(false);
  /* `failed` is set by onError, so a 404 for an exercise the library never covered collapses back to
     the empty frame instead of leaving a badge over a blank rectangle. */
  const [failed, setFailed] = useState(false);

  /* "Showing" the moment there's a URL that hasn't errored — NOT once onLoad fires. expo-image's load
     event is unreliable for animated WebP on web; gating on it stranded the badge/caption off and left
     the watermark behind a transparent clip. A 404 flips `failed` and collapses back to the empty frame. */
  const showing = !!url && !failed;

  const toggle = () => {
    if (!showing) return;
    const next = !paused;
    setPaused(next);
    void (next ? ref.current?.stopAnimating() : ref.current?.startAnimating());
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.frame}>
        {/* z0 — the radial the design draws, approximated by a vertical two-stop (RN has no radial). */}
        <LinearGradient colors={['#16181C', '#0A0B0D'] as const} locations={[0, 0.8] as const} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
        {/* The clip is transparent, so the watermark can't sit permanently behind it — it would show
            THROUGH the figure. It fills the frame only until a clip is up (or when one 404s). */}
        {!url || failed ? (
          <View style={styles.watermark} pointerEvents="none">
            <BarbellWatermark />
          </View>
        ) : null}

        {url && !failed ? (
          <Image
            ref={ref}
            source={{ uri: url }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            transition={220}
            onError={() => setFailed(true)}
            accessibilityLabel="Movement demonstration"
          />
        ) : null}

        {showing ? (
          <>
            {/* z2 — bottom scrim, so the caption sits on something */}
            <LinearGradient
              colors={['rgba(6,9,12,0)', 'rgba(6,9,12,0.82)'] as const}
              locations={[0.48, 1] as const}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            {/* z3 — the badge */}
            <View style={styles.badge} pointerEvents="none">
              <View style={styles.badgeDot} />
              <Text style={styles.badgeText}>Movement demo</Text>
            </View>

            {/* z4 — full-area tap */}
            <Pressable
              onPress={toggle}
              accessibilityRole="button"
              accessibilityLabel={paused ? 'Play demonstration' : 'Pause demonstration'}
              style={StyleSheet.absoluteFill}
            />

            {/* z5 — the play circle, only while paused */}
            {paused ? (
              <View style={styles.playWrap} pointerEvents="none">
                <View style={styles.playCircle}>
                  <Svg width={21} height={21} viewBox="0 0 24 24" fill={flColor.bronze300}>
                    <Path d="M8 5v14l11-7z" />
                  </Svg>
                </View>
              </View>
            ) : null}

            <Text style={styles.caption} pointerEvents="none">
              {caption}
            </Text>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 6 },
  frame: {
    position: 'relative',
    width: '100%',
    height: 290,
    borderRadius: flRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: flColor.charcoal600,
  },
  watermark: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', opacity: 0.11 },
  badge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: flRadius.pill,
    backgroundColor: 'rgba(6,9,12,0.55)',
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: flColor.bronze300 },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.gray400 },
  playWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  playCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(6,9,12,0.55)',
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3,
  },
  caption: { position: 'absolute', bottom: 13, left: 15, fontSize: 11.5, fontWeight: '600', letterSpacing: 0.3, color: flColor.gray400 },
});
