import { composeCard, CARD_COLORS, type CardDrawing, type DrawSpec, type NaturalSizes } from '@/domain/share/card-draw';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { ClipPath, Defs, Image as SvgImage, Line, Rect, Text as SvgText } from 'react-native-svg';

/**
 * Rasterises the share card on device.
 *
 * ══ WHY A MOUNTED COMPONENT AND NOT A FUNCTION ══
 *
 * `saveShareCard` wants to be a plain async call, and on web it is — canvas rasterises without ever being
 * in the tree. `react-native-svg` cannot: `toDataURL` is a method on a mounted `Svg` instance, so the card
 * has to exist in the view hierarchy before it can become a PNG. This host is that hierarchy — one hidden
 * `Svg` positioned off-screen, driven by a module-level queue so the caller still gets a promise.
 *
 * Off-screen rather than `opacity: 0` or `display: none`, deliberately: a view that is not being composited
 * has nothing for the platform to snapshot, and both of the tidier-looking options have historically
 * returned a blank image on one platform or the other. Being genuinely rendered, just somewhere nobody
 * looks, is the version that works.
 *
 * ══ ONE HOST, MOUNTED BY THE ONE CALLER ══
 *
 * `/share-config` is the only screen that exports a card, so it mounts this. If a second caller ever
 * appears, it mounts its own — the registry below holds a single active host and the last to mount wins,
 * which is correct for screens (only one is focused) and would need revisiting for anything else.
 */

type Resolver = (base64: string | null) => void;

let activeHost: ((drawing: CardDrawing, resolve: Resolver) => void) | null = null;

/**
 * Compose a card and rasterise it to a base64 PNG. Resolves null when no host is mounted or the platform
 * declines to snapshot — the caller has to tell the athlete something true either way.
 */
export function rasterizeCard(spec: DrawSpec, natural: NaturalSizes): Promise<string | null> {
  const host = activeHost;
  if (!host) return Promise.resolve(null);
  const drawing = composeCard(spec, natural);
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
    host(drawing, (v) => {
      clearTimeout(timer);
      once(v);
    });
  });
}

export function ShareCardHost() {
  const svgRef = useRef<Svg>(null);
  const [job, setJob] = useState<{ drawing: CardDrawing; resolve: Resolver } | null>(null);
  const pending = useRef<Resolver | null>(null);

  useEffect(() => {
    activeHost = (drawing, resolve) => {
      pending.current = resolve;
      setJob({ drawing, resolve });
    };
    return () => {
      if (activeHost) activeHost = null;
      // A host unmounting mid-rasterise must release the caller rather than leave it on the timeout.
      pending.current?.(null);
      pending.current = null;
    };
  }, []);

  // Snapshot only once the tree carrying this drawing has actually been committed — reading the ref in the
  // same pass that sets the state would rasterise the previous card, or an empty one on the first export.
  const capture = useCallback(() => {
    const resolve = pending.current;
    if (!resolve || !svgRef.current?.toDataURL) {
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
      { width: job?.drawing.width, height: job?.drawing.height },
    );
  }, [job]);

  useEffect(() => {
    if (!job) return;
    // One frame for layout, then snapshot. `requestAnimationFrame` alone fires before the SVG children
    // have measured on the first export of a session.
    const id = setTimeout(capture, 48);
    return () => clearTimeout(id);
  }, [job, capture]);

  if (!job) return null;
  const { drawing } = job;

  return (
    <View style={styles.offscreen} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg ref={svgRef} width={drawing.width} height={drawing.height} viewBox={`0 0 ${drawing.width} ${drawing.height}`}>
        <Defs>
          {drawing.ops.map((op, i) =>
            op.kind === 'photo' ? (
              <ClipPath id={`frame-${i}`} key={`clip-${i}`}>
                <Rect x={op.frame.x} y={op.frame.y} width={op.frame.w} height={op.frame.h} rx={op.radius} ry={op.radius} />
              </ClipPath>
            ) : null,
          )}
        </Defs>

        {/* The list is paint order. Mapping it straight through is the whole contract with `card-draw`. */}
        {drawing.ops.map((op, i) => {
          switch (op.kind) {
            case 'rect':
              return (
                <Rect
                  key={i}
                  x={op.x}
                  y={op.y}
                  width={op.w}
                  height={op.h}
                  rx={op.radius}
                  ry={op.radius}
                  fill={op.fill ?? 'none'}
                  stroke={op.stroke}
                  strokeWidth={op.strokeWidth}
                />
              );

            case 'photo':
              return (
                <React.Fragment key={i}>
                  {/* The recess shows through wherever the photo does not cover — and is the whole frame
                      when the photo never loaded. */}
                  <Rect
                    x={op.frame.x}
                    y={op.frame.y}
                    width={op.frame.w}
                    height={op.frame.h}
                    rx={op.radius}
                    ry={op.radius}
                    fill={CARD_COLORS.RECESS}
                  />
                  {op.image ? (
                    <SvgImage
                      x={op.image.x}
                      y={op.image.y}
                      width={op.image.w}
                      height={op.image.h}
                      href={{ uri: photoFor(op.index) }}
                      // `card-draw` already resolved cover-fit plus the athlete's pan and zoom into these
                      // four numbers. Letting SVG fit again would silently discard their framing.
                      preserveAspectRatio="none"
                      clipPath={`url(#frame-${i})`}
                    />
                  ) : null}
                </React.Fragment>
              );

            case 'chip':
              return (
                <React.Fragment key={i}>
                  <Rect
                    x={op.x}
                    y={op.y}
                    width={op.w}
                    height={op.h}
                    rx={op.radius}
                    ry={op.radius}
                    fill={CARD_COLORS.CHIP_BG}
                    stroke={CARD_COLORS.BORDER}
                    strokeWidth={1.5}
                  />
                  <SvgText
                    x={op.textX}
                    y={op.textY + 7}
                    fill={CARD_COLORS.BRONZE}
                    fontSize={20}
                    fontWeight="700"
                    fontFamily={SANS}
                  >
                    {op.label}
                  </SvgText>
                </React.Fragment>
              );

            case 'text':
              return (
                <SvgText
                  key={i}
                  x={op.x}
                  // Canvas `textBaseline: 'middle'` centres on the y; SVG puts the alphabetic baseline
                  // there. 0.36em is the shift that lines the two up across both faces.
                  y={op.baseline === 'middle' ? op.y + op.size * 0.36 : op.y}
                  fill={op.fill}
                  fontSize={op.size}
                  fontWeight={op.weight}
                  fontStyle={op.italic ? 'italic' : 'normal'}
                  fontFamily={op.face === 'serif' ? SERIF : SANS}
                  textAnchor={op.anchor}
                  letterSpacing={op.letterSpacing}
                >
                  {op.text}
                </SvgText>
              );

            case 'line':
              return <Line key={i} x1={op.x1} y1={op.y1} x2={op.x2} y2={op.y2} stroke={op.stroke} strokeWidth={op.strokeWidth} />;
          }
        })}
      </Svg>
    </View>
  );
}

/**
 * Photo data URIs for the drawing being rendered.
 *
 * Set by `share-image.ts` immediately before `rasterizeCard`, because the ops carry an index rather than a
 * url — geometry has no business knowing about bytes. Data URIs rather than remote hrefs so nothing is
 * still loading when the snapshot fires; a half-loaded photo is the one failure this whole path exists to
 * avoid, and it would export silently.
 */
let photoData: string[] = [];
export function setCardPhotos(uris: string[]) {
  photoData = uris;
}
function photoFor(index: number): string {
  return photoData[index] ?? '';
}

/** Playfair is loaded by expo-font; the fallbacks keep a missing face from rendering as the sans. */
const SERIF = 'PlayfairDisplay_600SemiBold, Georgia, serif';
const SANS = 'System';

const styles = StyleSheet.create({
  // Genuinely rendered, just where nobody looks. See the header note on why not opacity/display.
  offscreen: { position: 'absolute', left: -20000, top: 0, opacity: 1 },
});
