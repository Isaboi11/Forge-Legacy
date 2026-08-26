import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { flGradient, IS_PAPER } from '@/constants/foundation';
import { paperTextureOpacity, type PaperTexture } from '@/constants/paper-scrim';
import { themeScrim } from '@/constants/theme-scrim';
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
 *
 * ══ THIS FILE IS WHERE PAPER MODE HAPPENS FOR ALL 205 CALL SITES ══
 *
 * Every caller passes a hardcoded DARKENING scrim — `overlay={{ flat: 'rgba(5,5,5,0.30)' }}` and its
 * seventeen cousins, transcribed one screen at a time from the `.dc` set. Re-authoring all 205 for a
 * second theme would be 205 chances to get one wrong, and the next screen added would start dark
 * again. So the inversion happens HERE, once, and the call sites are untouched.
 *
 * ⚠ THE ALPHA IS PRESERVED AND ONLY THE DIRECTION FLIPS. Every overlay in the app was measured before
 *   this was written: all 18 distinct values are a near-black (`rgba(5,5,5,…)`, `rgba(6,7,8,…)`,
 *   `rgba(8,6,5,…)`, `rgba(0,0,0,…)`) at an alpha from 0.15 to 0.72. That alpha does not mean
 *   "how dark" — it means **how much of the plate is suppressed**, which is a composition decision the
 *   screen's author made and which holds in either theme. Rescaling it would quietly re-art-direct
 *   every screen; swapping the three colour channels does not. (It also lands almost exactly on the
 *   design: the repo's Home passes 0.15, and `Forge Home - Paper.dc.html` uses 0.16.)
 */

/* ⚠ `themeScrim` WAS DEFINED HERE, PRIVATELY, AND THAT IS WHY 14 OTHER SCREENS SHIPPED WITHOUT THE
   GATE — it was the right one-liner in a place nobody else could import it from. It now lives in
   `@/constants/theme-scrim`; this file is a consumer like everything else. */

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

/**
 * The `--fl-bg-atmospheric` apex radial that sits over the base gradient.
 *
 * Same geometry in both themes — the design's Paper `--fl-bg-atmospheric` keeps `130% 85% at 50% -8%`
 * fading out by 48% and changes only the colour. Forge's is a cool-blue haze on near-black; Paper's is
 * the white apex that makes the page read as lit from above rather than as flat card stock.
 */
const ATMO_RADIAL: ScreenRadial = IS_PAPER
  ? { cx: '50%', cy: '-8%', rx: '130%', ry: '85%', color: 'rgba(255,255,255,0.75)', stop: 0.48 }
  : { cx: '50%', cy: '-8%', rx: '130%', ry: '85%', color: 'rgba(88,124,160,0.06)', stop: 0.48 };

/** Canvas behind the plate. Forge's near-black; Paper's `--fl-base`. */
const DEFAULT_BASE = IS_PAPER ? '#F4F0E6' : '#050505';

export function ScreenBackground({
  image,
  base = DEFAULT_BASE,
  imagePosition = 'center',
  imageOpacity = 1,
  imageOpacityPaper,
  paperTexture = 'functional',
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
  /**
   * Paper's cover-artwork opacity, when it differs.
   *
   * ⚠ NEEDED BECAUSE RECOLOURING CANNOT RESCUE A PLATE DRAWN AT 37%. Legacy renders its mountains at
   * `imageOpacity={0.375}` — on near-black that is plenty, because a faint bronze ridgeline against
   * black still reads. Against cream there is far less contrast to spend, and the same 37% left the
   * range looking washed out and too far back. The pictorial plates therefore carry MORE presence in
   * Paper, not less, which is the opposite of the instinct for a light theme.
   *
   * Omit it and Paper uses `imageOpacity` unchanged, which is right for every texture plate.
   */
  imageOpacityPaper?: number;
  /**
   * ══ HOW LOUD THE TEXTURE IS ALLOWED TO BE — ALABASTER ONLY ══
   *
   * PO design review: the same plate that reads as atmosphere on the Chapter hero and Legacy competes
   * with the information on Workouts and the Squad feed. Two levels, and the DEFAULT is the quiet one
   * because most screens in the app are functional:
   *
   *   · `'functional'` (default) — lists, feeds, forms, builders, settings. Texture scaled to 62%.
   *   · `'atmospheric'`          — Chapter headers, Legacy, ceremonies, major empty states, special
   *                                achievements. Full strength, exactly as today.
   *
   * ⚠ FORGE IGNORES THIS ENTIRELY. It is a colour decision and lands on one theme (Design System §2.0)
   * — see `paperTextureOpacity` for why the problem only exists on paper in the first place.
   *
   * ⚠ AND AN EXPLICIT `imageOpacityPaper` STILL WINS, so Legacy's deliberate 0.7 is untouched by the
   * default. The level sets a floor of judgement, it does not overrule one.
   */
  paperTexture?: PaperTexture;
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
    <View style={[styles.base, { backgroundColor: themeScrim(base) }]} pointerEvents="none">
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
        <Image
          source={image}
          style={[
            StyleSheet.absoluteFill,
            { opacity: IS_PAPER ? paperTextureOpacity(paperTexture, imageOpacity, imageOpacityPaper) : imageOpacity },
          ]}
          contentFit="cover"
          contentPosition={imagePosition}
        />
      ) : null}
      {overlay ? <Overlay overlay={overlay} /> : null}
      {allRadials.length ? <ScreenRadials radials={allRadials} /> : null}
      {/* Legacy's scroll scrim. It fades the artwork toward the PAGE, which is black in Forge and
          cream in Paper — the intent ("make the content legible as it scrolls over the artwork") is
          the same, and only the direction of the fade changes. */}
      {scrimFade ? (
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: IS_PAPER ? '#F4EFE3' : '#000', opacity: scrimOpacity }]}
        />
      ) : null}
    </View>
  );
}

function Overlay({ overlay }: { overlay: ScreenOverlay }) {
  if ('flat' in overlay) return <View style={[StyleSheet.absoluteFill, { backgroundColor: themeScrim(overlay.flat) }]} />;
  // Runtime values always carry >= 2 stops; expo-linear-gradient's prop type wants a non-empty tuple.
  const colors = overlay.colors.map(themeScrim) as unknown as readonly [string, string, ...string[]];
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
