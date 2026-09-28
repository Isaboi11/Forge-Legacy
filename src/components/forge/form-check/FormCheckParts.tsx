import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Line, Path } from 'react-native-svg';

import { HoltMark } from '@/components/forge/HoltMark';
import { IS_PAPER, flColor, flFont, flGradient, flRadius, flShadow, type FlGradientStops } from '@/constants/foundation';
import type { FormMark } from '@/domain/coach/form-check';

/**
 * The pieces `Coach Holt Form Check.dc.html` repeats on every screen — shared by `app/form-check.tsx`
 * (01–04, 06) and `app/form-history.tsx` (05).
 */

/**
 * The .dc's two palettes (`THEMES.forge` / `THEMES.alabaster`), resolved once per theme. Colour is ONE
 * theme at a time (`feedback_two_theme_change_rule`), so this is a constant, not a hook.
 */
export const FC = IS_PAPER
  ? {
      bg: '#F5F2EC',
      ink: '#1E1B17', ink2: '#4E4943', ink3: '#6A645B', line: '#E1DAD0',
      card: '#FFFDFA', cardBd: '#DDD5C9', rec: '#EDE8E0', recBd: '#DDD5C9',
      bub: '#EAE5DC', chip: '#F7F4EF', chipBd: '#DDD5C9', tint: 'rgba(166,118,68,0.15)',
      brz: '#8A5C2C', brzHi: '#B07A40', sec: '#FFFDFA', secBd: '#D3CABD', frame: '#2A2620', markBd: '#D9D2C7',
    }
  : {
      bg: flColor.base,
      ink: flColor.cream100, ink2: flColor.gray400, ink3: flColor.gray600, line: flColor.charcoal600,
      card: flColor.charcoal800, cardBd: flColor.charcoal600, rec: flColor.surfaceRecessed, recBd: flColor.charcoal600,
      bub: 'rgba(255,255,255,0.05)', chip: 'rgba(255,255,255,0.032)', chipBd: 'rgba(255,255,255,0.09)',
      tint: 'rgba(186,146,92,0.15)', brz: flColor.bronze400, brzHi: flColor.bronze300,
      sec: 'rgba(255,255,255,0.04)', secBd: flColor.charcoal500, frame: '#1C1915', markBd: flColor.charcoal500,
    };

/** The .dc's `frame` token: an empty frame slot is a warm gradient, not a flat fill (THEMES.*.frame). */
const FRAME_STOPS = IS_PAPER ? (['#3A352E', '#221F1A', '#16140F'] as const) : (['#2B2721', '#16140F', '#0B0A08'] as const);

/** Fills its parent with the frame gradient — put it first inside any frame-shaped box. */
export function FrameFill() {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={FRAME_STOPS}
      locations={[0, 0.62, 1]}
      start={{ x: 0.37, y: 0 }}
      end={{ x: 0.63, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}

/**
 * The .dc's buttons, at the .dc's sizes. The app `Button` has no 54px primary and its `secondary` ignores
 * `size`, so "Choose a clip" drew shorter than "Film a set" beside it (design gate, 09-25). Same bronze
 * fill, border and shadow tokens as `Button`, so the two cannot look like different buttons.
 *
 *   · `hero`  — 64 tall, 15px mixed case (Film a set).
 *   · default — 54 tall, 14px uppercase with 1.4 tracking (Send to Holt, Ask Holt about this…).
 */
export function FcPrimary({
  label,
  onPress,
  icon,
  hero,
  disabled,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  hero?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const [pressed, setPressed] = useState(false);
  // Annotated for the reason `Button` gives: the disabled stop list has no `locations`.
  const fill: FlGradientStops = disabled ? flGradient.bronzeFillDisabled : pressed ? flGradient.bronzeFillPressed : flGradient.bronzeFill;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      style={s.btnWrap}
    >
      <LinearGradient
        colors={fill.colors}
        locations={fill.locations}
        start={fill.start}
        end={fill.end}
        style={[s.btn, { height: hero ? 64 : 54, borderColor: disabled ? flColor.disabledBorder : flColor.bronzeBorder, boxShadow: disabled ? undefined : flShadow.buttonPrimary }]}
      >
        {icon ?? null}
        <Text style={[hero ? s.heroLabel : s.primaryLabel, { color: disabled ? flColor.disabledLabel : flColor.onBronze }]}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

/** The .dc's secondary: `--sec` fill, `--secBd` border, mixed-case 600. 48 tall unless told otherwise. */
export function FcSecondary({
  label,
  onPress,
  icon,
  height = 48,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  height?: number;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [s.btnWrap, s.btn, s.secondary, { height, opacity: pressed ? 0.85 : 1 }]}
    >
      {icon ?? null}
      <Text style={[s.secondaryLabel, height >= 64 ? s.secondaryLabelHero : null]}>{label}</Text>
    </Pressable>
  );
}

/** Holt's mark, the HOLT label, his bubble — the .dc's speaking unit. */
export function HoltSays({ text, under, label = true, size = 36 }: { text: string; under?: string; label?: boolean; size?: number }) {
  return (
    <View style={s.says}>
      <View style={[s.markRing, { width: size, height: size, borderRadius: size / 2 }]}>
        <HoltMark size={size} />
      </View>
      <View style={s.saysCol}>
        {label ? <Text style={s.holt}>HOLT</Text> : null}
        <Text style={s.bubble}>{text}</Text>
        {under ? <Text style={s.under}>{under}</Text> : null}
      </View>
    </View>
  );
}

/**
 * The athlete's own frame with Holt's mark on it — the bronze dot (a point) or dashed line (a height).
 *
 * ⚠ THE MARK IS PLACED ON THE IMAGE AS DRAWN, NOT ON THE BOX. `cover` crops, so a fraction of the frame is
 * mapped through the drawn size and offset; the crop is then SLID so the mark stays in view (a knee at the
 * bottom of a portrait clip would otherwise be cut off by a 250-tall landscape box). `contain` letterboxes
 * instead, for the full-screen view (04b).
 *
 * Body tracking (build 10, `Docs/Form-Check-Body-Pose-Build-Plan.md` §6): a depth line whose mark carries
 * `tick` gets a short second line at knee height, so the two heights the fix is about are both on the
 * frame. `skeleton` draws the athlete's bones thin and low-contrast — PO decision 2 puts it on the
 * FULL-SCREEN frame only; the mark is the coaching, and a skeleton on every card is noise.
 */
export function MarkedFrame({
  uri,
  mark,
  height,
  tag,
  fill,
  contain,
  skeleton,
}: {
  uri: string | null;
  mark: FormMark | null;
  height?: number;
  tag?: string;
  fill?: boolean;
  contain?: boolean;
  /** Bones as `[x1, y1, x2, y2]`, 0–1 of the image (`skeletonBones`). Drawn under the mark. */
  skeleton?: [number, number, number, number][];
}) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [img, setImg] = useState({ w: 0, h: 0, uri: '' });

  useEffect(() => {
    if (!uri) return undefined;
    let live = true;
    Image.getSize(
      uri,
      (w, h) => {
        if (live) setImg({ w, h, uri });
      },
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [uri]);

  const mx = mark?.x ?? 0.5;
  const my = mark?.y ?? 0.5;
  const sized = !!uri && img.uri === uri && img.w > 0 && box.w > 0 && box.h > 0;
  let dw = box.w;
  let dh = box.h;
  let ox = 0;
  let oy = 0;
  if (sized) {
    const scale = contain ? Math.min(box.w / img.w, box.h / img.h) : Math.max(box.w / img.w, box.h / img.h);
    dw = img.w * scale;
    dh = img.h * scale;
    if (contain) {
      ox = (box.w - dw) / 2;
      oy = (box.h - dh) / 2;
    } else {
      ox = Math.min(0, Math.max(box.w - dw, box.w / 2 - mx * dw));
      oy = Math.min(0, Math.max(box.h - dh, box.h / 2 - my * dh));
    }
  }
  const px = ox + mx * dw;
  const py = oy + my * dh;
  const ring = fill ? 34 : 26;
  const dot = fill ? 10 : 8;

  return (
    <View style={[s.frameBox, fill ? s.flex : { height }]} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <FrameFill />
      {sized && uri ? <Image source={{ uri }} style={{ position: 'absolute', left: ox, top: oy, width: dw, height: dh }} /> : null}
      {sized && skeleton?.length ? (
        <Svg pointerEvents="none" width={box.w} height={box.h} style={StyleSheet.absoluteFill}>
          {skeleton.map(([x1, y1, x2, y2], i) => (
            <Line
              key={i}
              x1={ox + x1 * dw}
              y1={oy + y1 * dh}
              x2={ox + x2 * dw}
              y2={oy + y2 * dh}
              stroke="#F0EDE8"
              strokeOpacity={0.35}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          ))}
        </Svg>
      ) : null}
      {sized && mark?.kind === 'dot' ? (
        <>
          <View pointerEvents="none" style={[s.ring, { left: px - ring / 2, top: py - ring / 2, width: ring, height: ring, borderRadius: ring / 2 }]} />
          <View pointerEvents="none" style={[s.dot, { left: px - dot / 2, top: py - dot / 2, width: dot, height: dot, borderRadius: dot / 2 }]} />
        </>
      ) : null}
      {sized && mark?.kind === 'line' ? <View pointerEvents="none" style={[s.depth, { top: py, left: box.w * 0.06, right: box.w * 0.06 }]} /> : null}
      {sized && mark?.kind === 'line' && typeof mark.tick === 'number' ? (
        <View pointerEvents="none" style={[s.tick, { top: oy + mark.tick * dh, left: box.w * 0.06, width: box.w * 0.16 }]} />
      ) : null}
      {tag && !fill ? (
        <>
          <Text style={s.frameTag}>{tag}</Text>
          <View style={s.expand}>
            <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#F0EDE8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
            </Svg>
          </View>
        </>
      ) : null}
    </View>
  );
}

/** The .dc's header: title left, close (or a right action) right, back on the left when there is one. */
export function FormBar({ title, left, right }: { title?: string; left?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={[s.bar, left ? s.barWithLeft : null]}>
      {left ?? null}
      {title ? <Text style={s.barTitle}>{title}</Text> : <View style={s.flex} />}
      {right ?? null}
    </View>
  );
}

export function CloseGlyph({ color = FC.ink2 }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round">
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

export function BackGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={FC.ink2} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 5l-7 7 7 7" />
    </Svg>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  btnWrap: { alignSelf: 'stretch' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: flRadius.md, borderWidth: 1, paddingHorizontal: 16 },
  primaryLabel: { fontSize: 14, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase' },
  heroLabel: { fontSize: 15, fontWeight: '700' },
  secondary: { backgroundColor: FC.sec, borderColor: FC.secBd },
  secondaryLabel: { fontSize: 13.5, fontWeight: '600', color: FC.ink, fontFamily: flFont.sans },
  secondaryLabelHero: { fontSize: 15 },
  bar: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 20, paddingRight: 8 },
  barWithLeft: { paddingLeft: 8, paddingRight: 12 },
  barTitle: { color: FC.ink, fontSize: 16, fontWeight: '600' },
  says: { flexDirection: 'row', gap: 12 },
  markRing: { overflow: 'hidden', borderWidth: 1, borderColor: FC.markBd },
  saysCol: { flex: 1, minWidth: 0, gap: 7 },
  holt: { fontSize: 9.5, fontWeight: '700', letterSpacing: 2.4, color: FC.brz },
  bubble: {
    alignSelf: 'flex-start',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    backgroundColor: FC.bub,
    color: FC.ink,
    fontSize: 15,
    lineHeight: 22,
    overflow: 'hidden',
  },
  under: { paddingHorizontal: 2, fontSize: 12.5, lineHeight: 18, color: FC.ink3 },
  frameBox: { borderRadius: 12, overflow: 'hidden' },
  ring: { position: 'absolute', borderWidth: 2, borderColor: FC.brzHi },
  dot: { position: 'absolute', backgroundColor: FC.brzHi },
  depth: { position: 'absolute', borderTopWidth: 2, borderStyle: 'dashed', borderColor: FC.brzHi },
  tick: { position: 'absolute', borderTopWidth: 2, borderColor: FC.brzHi, opacity: 0.7 },
  frameTag: { position: 'absolute', left: 10, bottom: 10, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, backgroundColor: 'rgba(10,10,10,0.6)', fontSize: 11.5, fontWeight: '600', color: '#F0EDE8', overflow: 'hidden' },
  expand: { position: 'absolute', right: 10, bottom: 10, width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(10,10,10,0.6)', alignItems: 'center', justifyContent: 'center' },
});
