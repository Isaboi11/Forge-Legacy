import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { flColor, flRadius, flShadow } from '@/constants/foundation';
import { useReduceMotion } from '@/lib/settings';
import {
  photosCount,
  transformationCount,
  trophyCount,
  type LegacyArchive,
} from '@/data/legacy-archive-live';

/**
 * "What Endures" — the Legacy screen's archive band.
 * Built to `Legacy Archive Band.dc.html`, option 1a.
 *
 * Replaces three navigation list rows (title · grey subtitle · bronze count · chevron) with three
 * 116×158 windows onto the things themselves. Same destinations, same three taps, 20pt shorter, and the
 * most image-heavy content in the app stops being represented by the least image.
 *
 * ── GRADING IS THE POINT ──────────────────────────────────────────────────────
 *
 * Raw camera-roll photographs are bright, blue-white and cool, and dropping them unaltered into this
 * interface makes the band look like a different app pasted into a dark screen. Every photograph here is
 * graded to belong: desaturated, warmed toward bronze, darkened. React Native has no CSS filters — except
 * that on 0.85 / New Architecture it does: `filter` accepts a literal CSS string on a View
 * (`StyleSheetTypes.d.ts:519`), so the design's own grade is transcribed verbatim rather than
 * approximated with stacked tint overlays. The filter sits on the clipping window, not the image, so it
 * cannot depend on whether `expo-image` forwards an unrecognised style prop.
 *
 * The "after" half is deliberately ~14 brightness points above the "before" half. That asymmetry IS the
 * storytelling device — the diptych reads as time passing because the right side is lit better. Do not
 * normalise the two halves.
 *
 * ── FOCAL POINTS, WITHOUT `object-position` ───────────────────────────────────
 *
 * The design positions its backgrounds at `50% 18%` (chest-up — a centre crop lands on the waistband) and
 * `center 42%`. React Native's `cover` always centres, and there is no `objectPosition`. So each image is
 * laid into a virtual box OVERSCAN× the size of the visible window and slid: `cover` guarantees the box
 * is filled whatever the source aspect ratio is, and the overscan guarantees there is something to slide
 * on BOTH axes, which a plain `cover` (which crops exactly one axis) cannot promise for a photograph of
 * unknown proportions. The design's `background-size: 210%` is a zoom tuned to one known asset; these are
 * athletes' own photographs, so the overscan is the smallest that makes the bias reliable.
 *
 * ── THE CROWN ─────────────────────────────────────────────────────────────────
 *
 * `competition-crown.png` is RGB with NO alpha — an opaque near-black plate with bronze linework on it.
 * The design hides that plate with `mix-blend-mode: screen`, which React Native does not support, so
 * shipping it here would put a visible dark rectangle inside the tile. `competition-crown-mask.png` is
 * the same drawing with real transparency (RGBA, verified) and is what renders. Same lesson as
 * [`CrownArt`](compositions/CrownArt.tsx).
 *
 * ── DELTAS VS THE `.dc` ───────────────────────────────────────────────────────
 *
 * DROPPED-FREE — the mock's counts are literals (`4 entries`, `12 photos`, `3 gold · 6 podium`); all
 * three are real reads here, and Trophy Case counts gold and podium separately so a championship is
 * never also counted as a podium.
 *
 * DEFERRED-HONEST — `data-coach` anchors have no React Native equivalent (`ScreenTour` is screen-scoped
 * and anchors nothing), so each tile carries the same identifier as a `testID`, which is what a future
 * spotlight would target.
 *
 * ADDED — per-tile empty states. The design draws three populated tiles and has no answer for an athlete
 * with no transformation entries, no photos or no competitions; a band of grey image slots would be worse
 * than the list it replaces. Each tile falls back independently to the recessed surface, keeps its
 * destination, and says what to do next. The row never collapses to two.
 */

const PAD = 18;
const GUTTER = 10;
export const TILE_H = 158;

/** The reference grade the design was built against. Transcribed, not approximated. */
const GRADE = {
  before: 'grayscale(0.55) sepia(0.20) saturate(0.85) contrast(1.06) brightness(0.48)',
  after: 'grayscale(0.42) sepia(0.20) saturate(0.95) contrast(1.08) brightness(0.62)',
  photo: 'grayscale(0.55) sepia(0.34) saturate(1.00) contrast(1.10) brightness(0.56)',
} as const;

/** rgba(5,5,5,0.10) 0% → rgba(5,5,5,0.42) 52% → rgba(5,5,5,0.93) 100%. Legibility, not decoration. */
const SCRIM = ['rgba(5,5,5,0.10)', 'rgba(5,5,5,0.42)', 'rgba(5,5,5,0.93)'] as const;
const SCRIM_STOPS = [0, 0.52, 1] as const;

const RECESSED_BASE = '#100e0b';
const CROWN = require('../../../assets/competition/competition-crown-mask.png');
/** The mask asset's own proportions — the emblem is laid in by width, so height follows from these. */
const CROWN_ASPECT = 1536 / 1024;

export interface LegacyArchiveBandProps {
  archive: LegacyArchive | null;
  onTransformation: () => void;
  onPhotos: () => void;
  onTrophies: () => void;
}

export function LegacyArchiveBand({ archive, onTransformation, onPhotos, onTrophies }: LegacyArchiveBandProps) {
  const { width } = useWindowDimensions();
  const tileW = Math.max(84, (width - 2 * PAD - 2 * GUTTER) / 3);

  const t = archive?.transformation;
  const p = archive?.photos;
  const tr = archive?.trophies;

  // One image means one image. A diptych with an empty right half would read as a missing photo.
  const diptych = !!t?.oldest && !!t?.newest && t.oldest !== t.newest;

  return (
    <View style={styles.band}>
      <Tile
        testID="lg-transform"
        width={tileW}
        label="Transformation"
        count={t ? transformationCount(t) : ''}
        onPress={onTransformation}
      >
        {diptych ? (
          <View style={styles.diptych}>
            <GradedImage uri={t.oldest!} width={(tileW - 1) / 2} height={TILE_H} grade={GRADE.before} focalY={0.18} overscan={1.6} />
            <View style={styles.seam} />
            <GradedImage uri={t.newest!} width={(tileW - 1) / 2} height={TILE_H} grade={GRADE.after} focalY={0.18} overscan={1.6} />
          </View>
        ) : t?.newest ? (
          <GradedImage uri={t.newest} width={tileW} height={TILE_H} grade={GRADE.after} focalY={0.18} overscan={1.6} />
        ) : (
          <RecessedSurface id="xform" />
        )}
      </Tile>

      <Tile testID="lg-photos" width={tileW} label="Photos" count={p ? photosCount(p) : ''} onPress={onPhotos}>
        {p?.latest ? (
          <GradedImage uri={p.latest} width={tileW} height={TILE_H} grade={GRADE.photo} focalY={0.42} overscan={1.3} />
        ) : (
          <RecessedSurface id="photos" />
        )}
      </Tile>

      <Tile testID="lg-trophies" width={tileW} label="Trophy Case" count={tr ? trophyCount(tr) : ''} bronzeEdge onPress={onTrophies}>
        <RecessedSurface id="trophy" />
        {/* An empty trophy case does not display a crown. */}
        {tr && tr.entered > 0 ? <CrownEmblem tileWidth={tileW} /> : null}
      </Tile>
    </View>
  );
}

function Tile({
  testID,
  width,
  label,
  count,
  bronzeEdge = false,
  onPress,
  children,
}: {
  testID: string;
  width: number;
  label: string;
  count: string;
  bronzeEdge?: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  const reduceMotion = useReduceMotion();
  // "TRANSFORMATION" is the constraint. Step down before letting it wrap or truncate.
  const labelSize = width >= 104 ? 9 : 8.5;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={count ? `${label}, ${count}` : label}
      style={({ pressed }) => [
        styles.tile,
        { width, borderColor: bronzeEdge ? flColor.bronzeBorderSubtle : flColor.charcoal600 },
        pressed ? (reduceMotion ? styles.pressedFlat : styles.pressedScale) : null,
      ]}
    >
      {children}

      <LinearGradient colors={SCRIM} locations={SCRIM_STOPS} style={StyleSheet.absoluteFill} pointerEvents="none" />

      <View style={styles.labelBlock} pointerEvents="none">
        <Text style={[styles.labelLine, { fontSize: labelSize }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
          {label}
        </Text>
        {count ? <Text style={styles.countLine}>{count}</Text> : null}
      </View>
    </Pressable>
  );
}

/**
 * A photograph, graded and focal-point cropped.
 *
 * `overscan` is how much larger than the visible window the image box is; `focalY` is which slice of the
 * overflow shows (0 = top of frame, 0.5 = centred, 1 = bottom). Horizontal is always centred, matching
 * the design's `50%`.
 */
function GradedImage({
  uri,
  width,
  height,
  grade,
  focalY,
  overscan,
}: {
  uri: string;
  width: number;
  height: number;
  grade: string;
  focalY: number;
  overscan: number;
}) {
  const boxW = width * overscan;
  const boxH = height * overscan;
  return (
    <View style={[styles.window, { width, height, filter: grade }]}>
      <Image
        source={{ uri }}
        style={{ position: 'absolute', width: boxW, height: boxH, left: -(boxW - width) / 2, top: -(boxH - height) * focalY }}
        contentFit="cover"
        // No entrance animation anywhere in this band, per the design.
        transition={0}
        cachePolicy="memory-disk"
        // The source is a full-resolution capture; never decode one at full size for a 116pt tile.
        recyclingKey={uri}
        accessible={false}
      />
    </View>
  );
}

/**
 * The lit recessed plate: `radial-gradient(120% 90% at 50% 8%, rgba(186, 134, 84,0.16), transparent 62%)`
 * over `#100e0b`.
 *
 * Drawn in SVG because neither `expo-linear-gradient` nor RN's non-experimental style API does radial. The
 * viewBox is a 0–100 square stretched to the tile (`preserveAspectRatio="none"`), so user units read as
 * percentages; `scale(1, 0.75)` turns the 120%-wide circle into the design's 120% × 90% ellipse, and the
 * centre is pre-divided by that scale so it still lands at 8% down.
 */
function RecessedSurface({ id }: { id: string }) {
  const gid = `fl-archive-glow-${id}`;
  return (
    <View style={[StyleSheet.absoluteFill, styles.recessed]} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id={gid} gradientUnits="userSpaceOnUse" cx={50} cy={10.667} r={120} gradientTransform="scale(1, 0.75)">
            <Stop offset="0" stopColor={flColor.bronze400} stopOpacity={0.16} />
            <Stop offset="0.62" stopColor={flColor.bronze400} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={100} height={100} fill={`url(#${gid})`} />
      </Svg>
    </View>
  );
}

/** Inset 14pt from the top, 96pt of window, the emblem laid in at 152% width so it crops at the edges. */
function CrownEmblem({ tileWidth }: { tileWidth: number }) {
  const artW = tileWidth * 1.52;
  const artH = artW / CROWN_ASPECT;
  return (
    <View style={styles.crownWindow} pointerEvents="none">
      <Image
        source={CROWN}
        style={{ position: 'absolute', width: artW, height: artH, left: (tileWidth - artW) / 2, top: (96 - artH) * 0.46 }}
        contentFit="fill"
        transition={0}
        accessible={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  band: { flexDirection: 'row', gap: GUTTER, paddingHorizontal: PAD },

  tile: {
    height: TILE_H,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: RECESSED_BASE,
    boxShadow: `${flShadow.borderInset}, ${flShadow.card}`,
  },
  /* Scale, not an opacity flash — the tile is imagery, and dimming it reads as a load state. */
  pressedScale: { transform: [{ scale: 0.975 }] },
  pressedFlat: { opacity: 0.9 },

  diptych: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row' },
  seam: { width: 1, backgroundColor: flColor.bronzeBorder },

  window: { overflow: 'hidden' },
  recessed: { backgroundColor: RECESSED_BASE },
  crownWindow: { position: 'absolute', left: 0, right: 0, top: 14, height: 96, overflow: 'hidden', opacity: 0.95 },

  labelBlock: { position: 'absolute', left: 9, right: 9, bottom: 9, gap: 3 },
  labelLine: { fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', color: flColor.cream100 },
  countLine: { fontSize: 10, fontWeight: '600', color: flColor.bronze400 },
});
