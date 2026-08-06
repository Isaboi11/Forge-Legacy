import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { flGradient } from '@/constants/foundation';
import { svgStop } from '@/lib/svg-color';

/**
 * ScreenBackground — the ONE background layer for every product screen. Each screen renders its
 * design background per its own `.dc` (FORGE_DELTAS §16 sub-pass): a base (a cover artwork, OR the
 * `--fl-bg-atmospheric` steel gradient for the photo-less screens), a **per-screen** darkening overlay
 * (flat opacity or graduated stops — verbatim from the `.dc`, not one shared 3-stop), optional
 * screen-level **bronze radial-glows** (subtle washes framing the screen), and — for Legacy — a black
 * **scrim that fades IN** on scroll (the `.dc` darkens the artwork rather than dissolving it away).
 *
 * Absolutely positioned + `pointerEvents="none"` so it sits behind content and never intercepts taps.
 */

/** Per-screen darkening overlay over the artwork — flat single-opacity, or a vertical stop list. */
export type ScreenOverlay =
  | { flat: string } // solid darkening color, e.g. 'rgba(5,5,5,0.15)'
  | { colors: readonly string[]; locations: readonly number[] }; // vertical gradient

/**
 * A screen-level radial-glow, expressed as the `.dc` `radial-gradient(rx ry at cx cy, color 0%,
 * transparent stop)` in object-bounding-box units (percent strings; peaks may sit off-screen to frame
 * an edge). `color` is the rgba at the centre; it fades to transparent at `stop` (0..1, default 0.6).
 */
export interface ScreenRadial {
  cx: string;
  cy: string;
  rx: string;
  ry: string;
  color: string;
  stop?: number;
}

/** The `--fl-bg-atmospheric` cool-blue apex radial that sits over the steel gradient (part of the base). */
const ATMO_RADIAL: ScreenRadial = { cx: '50%', cy: '-8%', rx: '130%', ry: '85%', color: 'rgba(88,124,160,0.06)', stop: 0.48 };

export function ScreenBackground({
  image,
  base = '#050505',
  imagePosition = 'center',
  imageOpacity = 1,
  overlay,
  radials,
  atmospheric = false,
  scrimFade = false,
  scrollY,
}: {
  /** Base cover artwork. Omit for the atmospheric (photo-less) screens. */
  image?: number;
  /** Base fill behind the artwork (a few screens sit on a cooler near-black, e.g. Squads Hub #060708). */
  base?: string;
  imagePosition?: 'center' | 'top';
  /** Cover-artwork opacity (0–1); < 1 makes the background artwork subtler over the base. Default 1. */
  imageOpacity?: number;
  /** Per-screen darkening overlay; `null`/omitted → none (the atmospheric screens carry no dark scrim). */
  overlay?: ScreenOverlay | null;
  /** Screen-level bronze radial-glows layered over the base + overlay. */
  radials?: readonly ScreenRadial[];
  /** Render the `--fl-bg-atmospheric` steel gradient + cool apex radial as the base (photo-less screens). */
  atmospheric?: boolean;
  /** Legacy: fade a black scrim IN as `scrollY` grows (0 → 0.52 over [0,220]) — darkens, never dissolves. */
  scrimFade?: boolean;
  scrollY?: Animated.Value;
}) {
  const allRadials = atmospheric ? [ATMO_RADIAL, ...(radials ?? [])] : radials ?? [];
  const scrimOpacity =
    scrimFade && scrollY ? scrollY.interpolate({ inputRange: [0, 220], outputRange: [0, 0.52], extrapolate: 'clamp' }) : 0;

  return (
    <View style={[styles.base, { backgroundColor: base }]} pointerEvents="none">
      {atmospheric ? (
        <LinearGradient
          colors={flGradient.bgAtmospheric.colors}
          locations={flGradient.bgAtmospheric.locations}
          start={flGradient.bgAtmospheric.start}
          end={flGradient.bgAtmospheric.end}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {image != null ? (
        <Image source={image} style={[StyleSheet.absoluteFill, { opacity: imageOpacity }]} contentFit="cover" contentPosition={imagePosition} />
      ) : null}
      {overlay ? <Overlay overlay={overlay} /> : null}
      {allRadials.length ? <ScreenRadials radials={allRadials} /> : null}
      {scrimFade ? <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: scrimOpacity }]} /> : null}
    </View>
  );
}

function Overlay({ overlay }: { overlay: ScreenOverlay }) {
  if ('flat' in overlay) return <View style={[StyleSheet.absoluteFill, { backgroundColor: overlay.flat }]} />;
  // Runtime values always carry >= 2 stops; expo-linear-gradient's prop type wants a non-empty tuple.
  const colors = overlay.colors as readonly [string, string, ...string[]];
  const locations = overlay.locations as readonly [number, number, ...number[]];
  return <LinearGradient colors={colors} locations={locations} style={StyleSheet.absoluteFill} />;
}

/**
 * Renders each radial as an elliptical object-bounding-box gradient filling the screen.
 *
 * ⚠ THE STOP COLOUR IS SPLIT, AND IT HAS TO BE. `ScreenRadial.color` is an rgba string transcribed
 * verbatim from the `.dc`'s `radial-gradient(…)`, and **`react-native-svg` drops the alpha out of an
 * rgba `stopColor`** — so passing `r.color` straight in painted the 6%-opacity steel apex haze as a
 * SOLID slab of #587CA0 on device, and the 5% bronze radials as solid bronze, while every web preview
 * looked correct. Same defect that shipped two opaque bronze rectangles behind the Welcome logo in the
 * first TestFlight build (`157bf34`); that pass fixed the five files with a LITERAL rgba stopColor and
 * could not see this one, because here the string arrives in a variable.
 *
 * `svgStop` is applied to every stop rather than only the ones known to carry alpha — a hex or plain
 * `rgb()` passes through untouched at opacity 1, so there is no colour an author can write here that
 * silently loses its alpha again.
 */
function ScreenRadials({ radials }: { radials: readonly ScreenRadial[] }) {
  const uid = React.useId();
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        {radials.map((r, i) => {
          const peak = svgStop(r.color);
          return (
            <RadialGradient key={i} id={`${uid}-${i}`} cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry}>
              <Stop offset="0" stopColor={peak.color} stopOpacity={peak.opacity} />
              <Stop offset={String(r.stop ?? 0.6)} stopColor={peak.color} stopOpacity={0} />
            </RadialGradient>
          );
        })}
      </Defs>
      {radials.map((r, i) => (
        <Rect key={i} x="0" y="0" width="100%" height="100%" fill={`url(#${uid}-${i})`} />
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  base: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});
