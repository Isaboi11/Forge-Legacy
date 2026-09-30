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
import { forgeOr } from '@/constants/theme-scrim';
import { EquipIcon } from '@/components/forge/EquipIcon';

/* The stage. Forge keeps the design's near-black. Alabaster's clips are a SEPARATE render graded for the
   cream ground (media.ts / deliver_alabaster.py: "neither works on the other's ground"), so on paper the
   stage is the card surface — the black slab on a cream page was QA 09-26 library-18 / visualA-24. */
const STAGE = forgeOr<readonly [string, string]>(['#16181C', '#0A0B0D'], [flColor.charcoal800, flColor.charcoal700]);
const SCRIM = forgeOr<readonly [string, string]>(['rgba(6,9,12,0)', 'rgba(6,9,12,0.82)'], ['rgba(249,246,239,0)', 'rgba(249,246,239,0.9)']);
const CHIP_FILL = forgeOr('rgba(6,9,12,0.55)', 'rgba(249,246,239,0.85)');

/**
 * With no clip (or a 404) the frame shrinks to a short band holding THIS exercise's equipment glyph —
 * not a 290px dark card with a faint barbell that was wrong for every bodyweight/band/cardio move
 * (QA 09-26 library-18).
 */
function EmptyMark({ equip }: { equip?: string }) {
  return <EquipIcon equip={equip} size={44} color={forgeOr(flColor.bronze400, flColor.gray400)} />;
}

export function ExerciseDemo({ url, equip, caption = 'Side view · Full ROM · Normal tempo' }: { url: string | null; equip?: string; caption?: string }) {
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
      <View style={[styles.frame, !showing && styles.frameEmpty]}>
        {/* z0 — the radial the design draws, approximated by a vertical two-stop (RN has no radial). */}
        <LinearGradient colors={STAGE} locations={[0, 0.8] as const} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
        {/* The clip is transparent, so the watermark can't sit permanently behind it — it would show
            THROUGH the figure. It fills the frame only until a clip is up (or when one 404s). */}
        {!url || failed ? (
          <View style={styles.watermark} pointerEvents="none">
            <EmptyMark equip={equip} />
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
              colors={SCRIM}
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

/** Muted ink on the demo stage: Forge's gray400 on near-black; Alabaster's secondary ink on its cream stage. */
const STAGE_MUTED = flColor.gray400;

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
  /* No clip: a short band, not a 290px empty card. */
  frameEmpty: { height: 120 },
  watermark: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', opacity: 0.45 },
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
    backgroundColor: CHIP_FILL,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: flColor.bronze300 },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: STAGE_MUTED },
  playWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  playCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: CHIP_FILL,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3,
  },
  caption: { position: 'absolute', bottom: 13, left: 15, fontSize: 11.5, fontWeight: '600', letterSpacing: 0.3, color: STAGE_MUTED },
});
