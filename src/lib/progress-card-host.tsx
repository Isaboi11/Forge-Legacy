import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  ClipPath,
  Defs,
  G,
  Image as SvgImage,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import type { ProgressCardPhoto, ProgressPostCard } from '@/data/squad-feed-live';
import { EXPORT_SCALE, formatSpec, gridGeometry, heroGeometry, type Rect as GRect } from '@/domain/share/progress-card';
import { measureText } from '@/domain/share/text-measure';
import { flColor } from '@/constants/foundation';

/**
 * Rasterises the Progress Photo Post card on device.
 *
 * ══ WHY THIS EXISTS, AND WHY IT IS NOT A SCREENSHOT ══
 *
 * `progress-image.ts` was a native stub telling the athlete the card "works in the browser today". That
 * was true when written and is no longer: builds ship, and Amendment 003 (MA3-D12) moved share-card
 * export to the FREE tier precisely because every card that reaches Instagram carries the brand to
 * somebody who has never heard of Forge. An export that only works in a browser is an acquisition
 * channel that only works in a browser.
 *
 * Two routes were available. **(a)** compose with `react-native-svg` and `toDataURL` — already a
 * dependency, so **OTA-safe**. **(b)** capture the preview with `react-native-view-shot` — a new native
 * module, which changes the fingerprint, costs a new iOS build, and blocks OTA delivery of everything
 * queued behind it. It also contradicts the 0049-era "compose, don't capture" reasoning that both
 * existing exporters are built on: a capture exports whatever the device happened to render, at whatever
 * density, with any UI that strayed into frame.
 *
 * This is (a). It mirrors `share-card-host.tsx` exactly — one hidden `Svg`, off-screen, driven by a
 * module-level queue so the caller still gets a promise.
 *
 * ══ ⚠ ONE GEOMETRY, TWO RENDERERS ══
 *
 * The web path draws with Canvas 2D and this one with SVG, but **both read `domain/share/progress-card`
 * for every rect they draw** — the tiles, the header band, the footer, the hero's top and bottom rows.
 * Nothing about placement is duplicated here, which is what stops a card composed on a phone and one
 * composed in a browser from drifting apart. What IS duplicated is the chrome's paint: colours, faces,
 * shadows. Changing a colour means changing it in both files, and there is no way around that short of
 * extracting a display list the way `card-draw.ts` does for the share card — the right follow-up, and
 * too large to do inside a launch pass without risking a shipping feature.
 *
 * ══ ⚠ TEXT IS MEASURED, NOT ASKED ══
 *
 * The pills size themselves to their label. Canvas has `measureText`; `react-native-svg` will draw text
 * and will not tell you how wide it came out. `domain/share/text-measure` is the estimator both the
 * native share card and this file use — deliberately biased to over-estimate, because a pill one pixel
 * too wide looks composed and a pill one pixel too narrow has text hanging out of it.
 */

const INK = '#F0EDE8';
const MUTED = '#9E9890';
const FAINT = '#666060';
const BRONZE = '#C99767';
const BRONZE_D = '#BA8654';
const CARD_BG = '#0A0A0B';
const RECESS = '#09090B';
const CHARCOAL_700 = '#1A1A1E';

/** Playfair is loaded by expo-font; the fallbacks keep a missing face from silently rendering as sans. */
const SERIF = 'PlayfairDisplay_600SemiBold, Georgia, serif';
const SANS = 'System';

/** The anvil, in the same 24×24 viewBox the app's mark uses. Identical to the web exporter's copy. */
const ANVIL =
  'M10.9 3.2H13.1V15H10.9ZM7.6 7.1L9.6 5.8V15H7.6ZM16.4 7.1L14.4 5.8V15H16.4ZM6.8 15.4H17.2V16.2H6.8ZM5.6 16.6H18.4V17.4H5.6ZM4.4 17.8H19.6V18.6H4.4Z';

/** One slide's worth of input: the card, which photo, and the carousel counter if there is one. */
export interface ProgressFrame {
  card: ProgressPostCard;
  /** Data URIs, index-aligned with `card.photos`. Empty string where a photo would not load. */
  photoUris: string[];
  /** Natural pixel sizes, index-aligned. Undefined where the photo would not measure. */
  natural: ({ w: number; h: number } | undefined)[];
  /** Hero only: which slide. Ignored for a grid. */
  slide: number;
}

type Resolver = (base64: string | null) => void;

let activeHost: ((frame: ProgressFrame, resolve: Resolver) => void) | null = null;

/** Whether a host is mounted. `progress-image.ts` refuses honestly rather than timing out six times. */
export function progressHostReady(): boolean {
  return activeHost != null;
}

/**
 * Compose one frame and rasterise it to a base64 PNG. Resolves null when no host is mounted or the
 * platform declines to snapshot — the caller has to tell the athlete something true either way.
 */
export function rasterizeProgressFrame(frame: ProgressFrame): Promise<string | null> {
  const host = activeHost;
  if (!host) return Promise.resolve(null);
  return new Promise<string | null>((resolve) => {
    let settled = false;
    const once: Resolver = (v) => {
      if (settled) return;
      settled = true;
      resolve(v);
    };
    // A snapshot that never calls back would hang the athlete's tap forever. Six seconds is far longer
    // than a 1080px rasterise takes and still short enough to fail into a toast.
    const timer = setTimeout(() => once(null), 6000);
    host(frame, (v) => {
      clearTimeout(timer);
      once(v);
    });
  });
}

// ── cover-fit, resolved to four numbers ──────────────────────────────────────

/**
 * `object-fit: cover`, centred — the same crop the preview showed.
 *
 * Resolved here rather than handed to SVG's `preserveAspectRatio`, for the reason `share-card-host`
 * gives: letting SVG fit again would discard framing that has already been decided.
 */
function cover(f: GRect, nat: { w: number; h: number } | undefined) {
  if (!nat || !nat.w || !nat.h) return null;
  const scale = Math.max(f.w / nat.w, f.h / nat.h);
  const w = nat.w * scale;
  const h = nat.h * scale;
  return { x: f.x + (f.w - w) / 2, y: f.y + (f.h - h) / 2, w, h };
}

// ── the pill, sized to its own label ─────────────────────────────────────────

interface PillSpec {
  text: string;
  x: number;
  y: number;
  s: number;
  bg: string;
  ink: string;
  size: number;
  weight: '400' | '600' | '700';
  border?: string;
}

function pillWidthFor(text: string, size: number, s: number): number {
  return measureText(text, size, 'sans') + 12 * s;
}

function Pill({ text, x, y, s, bg, ink, size, weight, border }: PillSpec) {
  const w = pillWidthFor(text, size, s);
  const h = 13 * s;
  return (
    <G>
      <Rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={h / 2}
        ry={h / 2}
        fill={bg}
        stroke={border}
        strokeWidth={border ? Math.max(1, s * 0.4) : undefined}
      />
      {/* Canvas `textBaseline: 'middle'` centres on the y; SVG puts the alphabetic baseline there. The
          0.36em shift is the same correction `share-card-host` applies, for the same reason. */}
      <SvgText x={x + 6 * s} y={y + h / 2 + size * 0.36} fill={ink} fontSize={size} fontWeight={weight} fontFamily={SANS}>
        {text}
      </SvgText>
    </G>
  );
}

/** The bronze-tiled anvil mark. */
function Mark({ x, y, size }: { x: number; y: number; size: number }) {
  const glyph = size * 0.62;
  const gx = x + (size - glyph) / 2;
  const gy = y + (size - glyph) / 2;
  const k = glyph / 24;
  return (
    <G>
      <Rect x={x} y={y} width={size} height={size} rx={size * 0.235} ry={size * 0.235} fill={BRONZE_D} />
      <G transform={`translate(${gx}, ${gy}) scale(${k})`}>
        <Path d={ANVIL} fill={flColor.onBronze} />
      </G>
    </G>
  );
}

// ── grid ─────────────────────────────────────────────────────────────────────

function GridCard({ frame }: { frame: ProgressFrame }) {
  const { card, photoUris, natural } = frame;
  const s = EXPORT_SCALE;
  const g = gridGeometry(card.format, card.photos.length, card.incl, s);
  const radius = 12 * s;

  return (
    <>
      <Defs>
        <LinearGradient id="sheen" x1="0" y1="0" x2={g.w * 0.35} y2={g.h} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#B58A61" stopOpacity="0.09" />
          <Stop offset="0.46" stopColor="#B58A61" stopOpacity="0" />
        </LinearGradient>
        {g.tiles.map((t, i) => (
          <ClipPath id={`tile-${i}`} key={`clip-${i}`}>
            <Rect x={t.x} y={t.y} width={t.w} height={t.h} rx={g.tileRadius} ry={g.tileRadius} />
          </ClipPath>
        ))}
      </Defs>

      {/* shell — near-black ground, top-left sheen, bronze rim */}
      <Rect x={0} y={0} width={g.w} height={g.h} rx={radius} ry={radius} fill={CARD_BG} />
      <Rect x={0} y={0} width={g.w} height={g.h} rx={radius} ry={radius} fill="url(#sheen)" />
      <Rect
        x={s / 2}
        y={s / 2}
        width={g.w - s}
        height={g.h - s}
        rx={radius}
        ry={radius}
        fill="none"
        stroke="rgba(181,138,97,0.40)"
        strokeWidth={Math.max(1, s)}
      />

      {/* header */}
      <Mark x={g.pad} y={g.pad} size={17 * s} />
      <SvgText
        x={g.pad + 17 * s + 7 * s}
        y={g.pad + (17 * s) / 2 + 8.5 * s * 0.36}
        fill={MUTED}
        fontSize={8.5 * s}
        fontWeight="700"
        fontFamily={SANS}
        letterSpacing={2.2 * s}
      >
        FORGE LEGACY
      </SvgText>
      {card.incl.date ? (
        <SvgText
          x={g.w - g.pad}
          y={g.pad + (17 * s) / 2 + 9 * s * 0.36}
          fill={BRONZE}
          fontSize={9 * s}
          fontWeight="700"
          fontFamily={SANS}
          letterSpacing={0.9 * s}
          textAnchor="end"
        >
          {card.date.toUpperCase()}
        </SvgText>
      ) : null}

      {/* tiles */}
      {g.tiles.map((t, i) => {
        const fit = cover(t, natural[i]);
        const short = card.photos[i]?.short;
        return (
          <G key={`tile-${i}`}>
            {/* The recess shows through wherever the photo does not cover — and is the whole tile when
                the photo never loaded. A tile with nothing in it is honest; a stretched one is not. */}
            <Rect x={t.x} y={t.y} width={t.w} height={t.h} rx={g.tileRadius} ry={g.tileRadius} fill={RECESS} />
            {fit && photoUris[i] ? (
              <SvgImage
                x={fit.x}
                y={fit.y}
                width={fit.w}
                height={fit.h}
                href={{ uri: photoUris[i] }}
                preserveAspectRatio="none"
                clipPath={`url(#tile-${i})`}
              />
            ) : null}
            <Rect
              x={t.x}
              y={t.y}
              width={t.w}
              height={t.h}
              rx={g.tileRadius}
              ry={g.tileRadius}
              fill="none"
              stroke={CHARCOAL_700}
              strokeWidth={Math.max(1, s * 0.3)}
            />
            {card.incl.pose && short ? (
              <Pill
                text={short.toUpperCase()}
                x={t.x + 6 * s}
                y={t.y + t.h - 5 * s - 13 * s}
                s={s}
                bg="rgba(6,6,7,0.72)"
                ink={MUTED}
                size={7.5 * s}
                weight="700"
              />
            ) : null}
          </G>
        );
      })}

      {/* footer */}
      {g.footer ? <GridFooter card={card} g={g} s={s} /> : null}
    </>
  );
}

function GridFooter({ card, g, s }: { card: ProgressPostCard; g: ReturnType<typeof gridGeometry>; s: number }) {
  if (!g.footer) return null;
  // Canvas `textBaseline: 'top'` puts the top of the em box on y; SVG puts the baseline there. ~0.8em
  // down is the equivalent, and it has to match or the footer sits high by a whole line.
  let y = g.footer.y;
  const rows: React.ReactNode[] = [];

  if (card.incl.name) {
    rows.push(
      <SvgText key="name" x={g.pad} y={y + 14 * s * 0.8} fill={INK} fontSize={14 * s} fontWeight="700" fontFamily={SERIF}>
        {card.athlete}
      </SvgText>,
    );
    y += 19 * s + 3 * s;
  }
  if (card.incl.meta && card.meta) {
    rows.push(
      <SvgText key="meta" x={g.pad} y={y + 9.5 * s * 0.8} fill={FAINT} fontSize={9.5 * s} fontWeight="400" fontFamily={SANS}>
        {card.meta}
      </SvgText>,
    );
  }
  if (card.incl.chapter && card.chapter) {
    rows.push(
      <SvgText
        key="chapter"
        x={g.w - g.pad}
        y={g.footer.y + g.footer.h}
        fill={BRONZE_D}
        fontSize={8.5 * s}
        fontWeight="700"
        fontFamily={SANS}
        letterSpacing={1.2 * s}
        textAnchor="end"
      >
        {card.chapter.toUpperCase()}
      </SvgText>,
    );
  }
  return <>{rows}</>;
}

// ── hero ─────────────────────────────────────────────────────────────────────

function HeroSlide({ frame }: { frame: ProgressFrame }) {
  const { card, photoUris, natural, slide } = frame;
  const s = EXPORT_SCALE;
  const g = heroGeometry(card.format, s);
  const photo: ProgressCardPhoto | undefined = card.photos[slide];
  const fit = cover(g.photo, natural[slide]);
  const counter = card.photos.length > 1 ? `${slide + 1}/${card.photos.length}` : null;

  // Right to left, so the counter always sits on the edge and the pose chip stacks inside it.
  let right = g.top.x + g.top.w;
  const chipY = g.top.y + (g.markSize - 13 * s) / 2;
  const counterW = counter ? pillWidthFor(counter, 8 * s, s) : 0;
  const poseText = card.incl.pose && photo?.short ? photo.short.toUpperCase() : null;
  const poseW = poseText ? pillWidthFor(poseText, 7.5 * s, s) : 0;
  const counterX = right - counterW;
  if (counter) right -= counterW + 7 * s;
  const poseX = right - poseW;

  // The bottom block is measured UPWARD from the baseline so the date always lands in the same place
  // whatever is switched on above it — the design's rule, and the reason this is arithmetic rather than
  // a stack.
  let y = g.h - g.bottom.offset;
  const nameOn = card.incl.name;
  const chapterOn = card.incl.chapter && !!card.chapter;
  const nameW = nameOn ? measureText(card.athlete, 11 * s, 'sans') : 0;
  const nameRowY = y;
  if (nameOn || chapterOn) y -= 15 * s + 4 * s;
  const metaOn = card.incl.meta && !!card.meta;
  const metaY = y;
  if (metaOn) y -= 14 * s + 4 * s;
  const dateY = y;

  return (
    <>
      <Defs>
        <ClipPath id="hero-clip">
          <Rect x={0} y={0} width={g.w} height={g.h} />
        </ClipPath>
        <LinearGradient id="scrim" x1="0" y1="0" x2="0" y2={g.h} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#060607" stopOpacity="0.62" />
          <Stop offset="0.3" stopColor="#060607" stopOpacity="0" />
          <Stop offset="0.52" stopColor="#060607" stopOpacity="0.18" />
          <Stop offset="1" stopColor="#060607" stopOpacity="0.9" />
        </LinearGradient>
      </Defs>

      <Rect x={0} y={0} width={g.w} height={g.h} fill={RECESS} />
      {fit && photoUris[slide] ? (
        <SvgImage
          x={fit.x}
          y={fit.y}
          width={fit.w}
          height={fit.h}
          href={{ uri: photoUris[slide] }}
          preserveAspectRatio="none"
          clipPath="url(#hero-clip)"
        />
      ) : null}
      <Rect x={0} y={0} width={g.w} height={g.h} fill="url(#scrim)" />

      {/* top chrome */}
      <Mark x={g.top.x} y={g.top.y} size={g.markSize} />
      <SvgText
        x={g.top.x + g.markSize + 7 * s}
        y={g.top.y + g.markSize / 2 + 8.5 * s * 0.36}
        fill="rgba(240,238,234,0.82)"
        fontSize={8.5 * s}
        fontWeight="700"
        fontFamily={SANS}
        letterSpacing={2.2 * s}
      >
        FORGE LEGACY
      </SvgText>
      {counter ? (
        <Pill text={counter} x={counterX} y={chipY} s={s} bg="rgba(6,6,7,0.62)" ink="rgba(240,238,234,0.92)" size={8 * s} weight="600" />
      ) : null}
      {poseText ? (
        <Pill
          text={poseText}
          x={poseX}
          y={chipY}
          s={s}
          bg="rgba(6,6,7,0.6)"
          ink="rgba(240,238,234,0.9)"
          size={7.5 * s}
          weight="700"
          border="rgba(255,255,255,0.14)"
        />
      ) : null}

      {/* bottom block — canvas draws these with textBaseline 'bottom', which IS the SVG baseline, so
          these are the only rows on the card that need no baseline correction. */}
      {nameOn ? (
        <SvgText x={g.bottom.x} y={nameRowY} fill="#F0EEEA" fontSize={11 * s} fontWeight="600" fontFamily={SANS}>
          {card.athlete}
        </SvgText>
      ) : null}
      {chapterOn ? (
        <SvgText
          x={g.bottom.x + (nameOn ? nameW + 7 * s + 3 * s + 7 * s : 0)}
          y={nameRowY}
          fill={BRONZE}
          fontSize={8.5 * s}
          fontWeight="700"
          fontFamily={SANS}
          letterSpacing={1.2 * s}
        >
          {card.chapter!.toUpperCase()}
        </SvgText>
      ) : null}
      {nameOn && chapterOn ? (
        // The separator dot between name and chapter.
        <Rect x={g.bottom.x + nameW + 7 * s} y={nameRowY - 4 * s - 1.5 * s} width={3 * s} height={3 * s} rx={1.5 * s} ry={1.5 * s} fill="rgba(240,238,234,0.45)" />
      ) : null}
      {metaOn ? (
        <SvgText x={g.bottom.x} y={metaY} fill="rgba(240,238,234,0.72)" fontSize={10 * s} fontWeight="400" fontFamily={SANS}>
          {card.meta}
        </SvgText>
      ) : null}
      {card.incl.date ? (
        <SvgText x={g.bottom.x} y={dateY} fill="#F7F5F1" fontSize={27 * s} fontWeight="700" fontFamily={SERIF} letterSpacing={-0.6 * s}>
          {card.date}
        </SvgText>
      ) : null}
    </>
  );
}

// ── the host ─────────────────────────────────────────────────────────────────

export function ProgressCardHost() {
  const svgRef = useRef<Svg>(null);
  const [job, setJob] = useState<{ frame: ProgressFrame; resolve: Resolver } | null>(null);
  const pending = useRef<Resolver | null>(null);

  useEffect(() => {
    activeHost = (frame, resolve) => {
      pending.current = resolve;
      setJob({ frame, resolve });
    };
    return () => {
      if (activeHost) activeHost = null;
      // A host unmounting mid-rasterise must release the caller rather than leave it on the timeout.
      pending.current?.(null);
      pending.current = null;
    };
  }, []);

  const size = job ? formatSpec(job.frame.card.format) : null;

  // Snapshot only once the tree carrying this frame has been committed — reading the ref in the same
  // pass that sets the state would rasterise the previous slide, or an empty one on the first export.
  const capture = useCallback(() => {
    const resolve = pending.current;
    if (!resolve || !svgRef.current?.toDataURL || !size) {
      pending.current = null;
      resolve?.(null);
      setJob(null);
      return;
    }
    pending.current = null;
    svgRef.current.toDataURL(
      (base64) => {
        resolve(base64 ?? null);
        setJob(null);
      },
      { width: size.exportW, height: size.exportH },
    );
  }, [size]);

  useEffect(() => {
    if (!job) return;
    // One frame for layout, then snapshot. `requestAnimationFrame` alone fires before the SVG children
    // have measured on the first export of a session.
    const id = setTimeout(capture, 48);
    return () => clearTimeout(id);
  }, [job, capture]);

  if (!job || !size) return null;

  return (
    <View style={styles.offscreen} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg ref={svgRef} width={size.exportW} height={size.exportH} viewBox={`0 0 ${size.exportW} ${size.exportH}`}>
        {job.frame.card.style === 'hero' ? <HeroSlide frame={job.frame} /> : <GridCard frame={job.frame} />}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  // Genuinely rendered, just where nobody looks — `opacity: 0` and `display: none` have both returned a
  // blank image on one platform or the other. Same note as `share-card-host`.
  offscreen: { position: 'absolute', left: -20000, top: 0, opacity: 1 },
});
