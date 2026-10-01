import { forwardRef, useId } from 'react';
import Svg, { Circle, ClipPath, Defs, G, Image as SvgImage, LinearGradient, Path, Rect, Stop, Text as SvgText, TSpan } from 'react-native-svg';

import { ANVIL_PATH, ON_BRONZE, STORY_BRONZE, type StoryDrawing } from '@/domain/share/story-card';

/**
 * The share picture, painted from its draw list with react-native-svg.
 *
 * ══ ONE COMPONENT, TWO JOBS ══
 *
 * It is the preview on the share screen (drawn small — the viewBox is always the full 1080×1920, so the
 * preview IS the export scaled down) and, on a phone, the thing `StoryCardHost` mounts off-screen at full
 * size and snapshots with `toDataURL`. The browser export draws the same list on a canvas instead
 * (`lib/story-image.web.ts`), because react-native-svg on the web cannot rasterise.
 *
 * ══ IT DOES NO LAYOUT ══
 *
 * Every number was decided in `domain/share/story-card`. This maps ops to elements in paint order and does
 * nothing else — the moment it starts placing things, the phone and the browser pictures can drift.
 */

/** Playfair is loaded by expo-font; the fallbacks keep a missing face from rendering as the sans. */
const SERIF = 'PlayfairDisplay_600SemiBold, Georgia, serif';
const SANS = 'System';

export interface StoryCanvasProps {
  drawing: StoryDrawing;
  /** The athlete's photo — a data URI for export, any loadable uri for the preview. */
  photoUri: string | null;
  /** Rendered width in points. Height follows the 9:16 frame. Defaults to the full 1080 (the export). */
  width?: number;
}

export const StoryCanvas = forwardRef<Svg, StoryCanvasProps>(function StoryCanvas({ drawing, photoUri, width }, ref) {
  // Gradient and clip ids are document-global on the web, and the share screen draws four of these at once.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const w = width ?? drawing.width;
  const h = (w * drawing.height) / drawing.width;

  return (
    <Svg ref={ref} width={w} height={h} viewBox={`0 0 ${drawing.width} ${drawing.height}`}>
      <Defs>
        {drawing.ops.map((op, i) => {
          if (op.kind === 'vgrad') {
            return (
              <LinearGradient key={`g${i}`} id={`${uid}g${i}`} x1="0" y1={op.y} x2="0" y2={op.y + op.h} gradientUnits="userSpaceOnUse">
                {op.stops.map((s, k) => (
                  <Stop key={k} offset={s.at} stopColor={s.color} stopOpacity={s.opacity} />
                ))}
              </LinearGradient>
            );
          }
          if (op.kind === 'photo') {
            return (
              <ClipPath key={`c${i}`} id={`${uid}c${i}`}>
                <Rect x={op.frame.x} y={op.frame.y} width={op.frame.w} height={op.frame.h} />
              </ClipPath>
            );
          }
          return null;
        })}
      </Defs>

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
                fillOpacity={op.fillOpacity}
                stroke={op.stroke}
                strokeOpacity={op.strokeOpacity}
                strokeWidth={op.strokeWidth}
              />
            );
          case 'vgrad':
            return <Rect key={i} x={op.x} y={op.y} width={op.w} height={op.h} fill={`url(#${uid}g${i})`} />;
          case 'photo':
            return photoUri ? (
              <SvgImage
                key={i}
                x={op.image.x}
                y={op.image.y}
                width={op.image.w}
                height={op.image.h}
                href={{ uri: photoUri }}
                // The cover-fit is already resolved into these four numbers; letting SVG fit again would crop
                // differently from the canvas export.
                preserveAspectRatio="none"
                opacity={op.opacity}
                clipPath={`url(#${uid}c${i})`}
              />
            ) : null;
          case 'path':
            return (
              <Path
                key={i}
                d={op.d}
                fill={op.fill ?? 'none'}
                stroke={op.stroke}
                strokeOpacity={op.strokeOpacity}
                strokeWidth={op.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          case 'circle':
            return <Circle key={i} cx={op.cx} cy={op.cy} r={op.r} fill={op.fill} stroke={op.stroke} strokeWidth={op.strokeWidth} />;
          case 'mark': {
            const glyph = op.size * 0.62;
            const k = glyph / 24;
            return (
              <G key={i}>
                <Rect x={op.x} y={op.y} width={op.size} height={op.size} rx={op.size * 0.235} ry={op.size * 0.235} fill={STORY_BRONZE} />
                <G transform={`translate(${op.x + (op.size - glyph) / 2}, ${op.y + (op.size - glyph) / 2}) scale(${k})`}>
                  <Path d={ANVIL_PATH} fill={ON_BRONZE} />
                </G>
              </G>
            );
          }
          case 'text':
            return (
              <SvgText key={i} x={op.x} y={op.y} textAnchor={op.anchor}>
                {op.runs.map((r, k) => (
                  <TSpan
                    key={k}
                    fontSize={r.size}
                    fontWeight={r.weight}
                    fontFamily={r.face === 'serif' ? SERIF : SANS}
                    fontStyle={r.italic ? 'italic' : 'normal'}
                    letterSpacing={r.letterSpacing}
                    fill={r.fill}
                    fillOpacity={r.opacity ?? 1}
                  >
                    {r.text}
                  </TSpan>
                ))}
              </SvgText>
            );
        }
        return null;
      })}
    </Svg>
  );
});
