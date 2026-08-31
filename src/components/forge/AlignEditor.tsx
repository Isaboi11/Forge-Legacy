import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { PhotoTransform } from '@/components/forge/BeforeAfterSlider';
import { flColor, flFont, flRadius } from '@/constants/foundation';

/**
 * Align editor — pan + zoom one photo at a time against the other, held still underneath as an onion-skin
 * reference, so the body lines up across a before/after. Transforms are fractions of the frame (`tx`/`ty`)
 * + a `scale`, so they render identically at any size. Drag via the View responder props (no
 * ref-in-render).
 *
 * ══ ⚠ WHICH LAYER IS TRANSLUCENT — THIS WAS BACKWARDS, AND IT MADE THE SCREEN USELESS ══
 *
 * PO, 2026-08-31: *"When doing a line up for comparisons it was hard to see the other photo to line it up
 * with."* It was not hard, it was impossible. The reference photo was drawn at `opacity: 0.4` UNDERNEATH
 * the photo being moved, which was drawn at full opacity — and both are `contentFit="cover"` filling the
 * same frame, so the opaque one covered the faint one completely. There was never a second body on screen
 * to line anything up against; the athlete was aligning one photo to a pair of crosshairs.
 *
 * Onion-skinning works the other way round: the layer you are MOVING is the translucent one, and the
 * reference stays solid beneath it so you can see both bodies at once and slide one onto the other.
 */

const IDENTITY: PhotoTransform = { tx: 0, ty: 0, scale: 1 };
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const styleFor = (t: PhotoTransform, w: number, h: number) => ({ transform: [{ translateX: t.tx * w }, { translateY: t.ty * h }, { scale: t.scale }] });

export function AlignEditor({
  before,
  after,
  initialBefore,
  initialAfter,
  onSave,
  onClose,
}: {
  before: string;
  after: string;
  initialBefore?: PhotoTransform;
  initialAfter?: PhotoTransform;
  onSave: (beforeT: PhotoTransform, afterT: PhotoTransform) => void;
  onClose: () => void;
}) {
  const [sel, setSel] = useState<'before' | 'after'>('after');
  const [bt, setBt] = useState<PhotoTransform>(initialBefore ?? IDENTITY);
  const [at, setAt] = useState<PhotoTransform>(initialAfter ?? IDENTITY);
  const [w, setW] = useState(0);
  const [last, setLast] = useState<{ x: number; y: number } | null>(null);

  const h = (w * 4) / 3;
  const selT = sel === 'before' ? bt : at;
  const setSelT = (fn: (t: PhotoTransform) => PhotoTransform) => (sel === 'before' ? setBt(fn) : setAt(fn));

  const onFrameLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const onGrant = (e: GestureResponderEvent) => setLast({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });
  const onMove = (e: GestureResponderEvent) => {
    if (!last || !w) return;
    const cx = e.nativeEvent.locationX;
    const cy = e.nativeEvent.locationY;
    const dx = (cx - last.x) / w;
    const dy = (cy - last.y) / h;
    setSelT((t) => ({ ...t, tx: clamp(t.tx + dx, -0.8, 0.8), ty: clamp(t.ty + dy, -0.8, 0.8) }));
    setLast({ x: cx, y: cy });
  };
  const setZoom = (s: number) => setSelT((t) => ({ ...t, scale: s }));

  /*
   * ⚠ SAME FIX AS `AvatarCropEditor`, AND THIS FILE IS WHERE THAT BUG CAME FROM.
   *
   * A `Modal` covers the whole DISPLAY, so a header pinned to `top: 0` sits under the status bar and the
   * Dynamic Island — which is taller than the 56pt header. `Done` was unreachable behind system UI.
   * `AvatarCropEditor` says in its own header that it was modelled on this file, so it inherited this.
   *
   * Fixed in both on 2026-08-21 after the crop editor's `Use` was reported as unclickable.
   */
  const insets = useSafeAreaInsets();

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: 72 + insets.top }]}>
        <View style={[styles.header, { height: 56 + insets.top, paddingTop: insets.top }]}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Cancel" style={styles.headerBtn} hitSlop={6}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>Align photos</Text>
          <Pressable onPress={() => onSave(bt, at)} accessibilityRole="button" accessibilityLabel="Done" style={styles.headerBtn} hitSlop={6}>
            <Text style={styles.done}>Done</Text>
          </Pressable>
        </View>

        <Text style={styles.hint}>
          Drag the {sel} photo — it&apos;s the see-through one — until the body sits on top of the other.
        </Text>

        <View style={styles.frameWrap}>
          <View
            onLayout={onFrameLayout}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={onGrant}
            onResponderMove={onMove}
            onResponderRelease={() => setLast(null)}
            style={styles.frame}
          >
            {/*
              Reference FIRST and solid, the photo being dragged SECOND and translucent. Written as one
              pair rather than two mirrored branches so the two selections cannot drift over which layer
              is which — that drift is the bug this replaced.
            */}
            <Image
              source={{ uri: sel === 'after' ? before : after }}
              style={[styles.img, styleFor(sel === 'after' ? bt : at, w, h)]}
              contentFit="cover"
              pointerEvents="none"
            />
            <Image
              source={{ uri: sel === 'after' ? after : before }}
              style={[styles.img, styles.moving, styleFor(selT, w, h)]}
              contentFit="cover"
              pointerEvents="none"
            />
            {/* center guides */}
            <View style={styles.guideV} pointerEvents="none" />
            <View style={styles.guideH} pointerEvents="none" />
          </View>
        </View>

        <View style={styles.segRow}>
          {(['before', 'after'] as const).map((s) => (
            <Pressable key={s} onPress={() => setSel(s)} accessibilityRole="button" accessibilityState={{ selected: sel === s }} style={[styles.seg, sel === s ? styles.segOn : styles.segOff]}>
              <Text style={[styles.segText, sel === s ? styles.segTextOn : null]}>{s === 'before' ? 'Before' : 'After'}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.zoomRow}>
          <ZoomGlyph small />
          <ZoomSlider value={selT.scale} min={0.5} max={3} onChange={setZoom} />
          <ZoomGlyph />
        </View>

        <Pressable onPress={() => setSelT(() => IDENTITY)} accessibilityRole="button" accessibilityLabel="Reset this photo" style={styles.reset}>
          <Text style={styles.resetText}>Reset {sel} photo</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function ZoomSlider({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  const [tw, setTw] = useState(0);
  const ratio = clamp((value - min) / (max - min), 0, 1);
  const set = (e: GestureResponderEvent) => {
    if (!tw) return;
    onChange(min + clamp(e.nativeEvent.locationX / tw, 0, 1) * (max - min));
  };
  return (
    <View
      onLayout={(e) => setTw(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={set}
      onResponderMove={set}
      style={styles.track}
      accessibilityRole="adjustable"
      accessibilityLabel="Zoom"
    >
      <View style={styles.trackFillWrap} pointerEvents="none">
        <View style={[styles.trackFill, { width: `${ratio * 100}%` }]} />
      </View>
      <View style={[styles.thumb, { left: `${ratio * 100}%` }]} pointerEvents="none" />
    </View>
  );
}

function ZoomGlyph({ small }: { small?: boolean }) {
  const s = small ? 13 : 18;
  return (
    <View style={[styles.zoomGlyph, { width: s + 8, height: s + 8 }]}>
      <Text style={[styles.zoomGlyphText, { fontSize: small ? 12 : 17 }]}>{small ? '−' : '+'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060708', paddingHorizontal: 22, paddingTop: 72, justifyContent: 'flex-start' },
  // `height`/`paddingTop` overridden inline with the safe-area top inset; these are the zero-inset baseline.
  header: { position: 'absolute', top: 0, left: 0, right: 0, height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  headerBtn: { paddingVertical: 8 },
  cancel: { fontSize: 14, color: flColor.gray400 },
  done: { fontSize: 14, fontWeight: '700', color: flColor.bronze300 },
  title: { fontFamily: flFont.display, fontSize: 17, fontWeight: '600', color: flColor.cream100 },
  hint: { fontSize: 12.5, lineHeight: 18, color: flColor.gray400, textAlign: 'center', marginBottom: 16 },

  frameWrap: { alignItems: 'center' },
  frame: { width: '82%', maxWidth: 280, aspectRatio: 3 / 4, borderRadius: flRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.surfaceRecessed, position: 'relative' },
  img: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  /* ⚠ THE LAYER BEING MOVED, NOT THE REFERENCE. High enough to judge where the body actually is, low
     enough to see the solid photo underneath it — at 0.4 the moving photo was a ghost you could not
     position, and at 0.8 it hid the thing it is being lined up against. */
  moving: { opacity: 0.55 },
  guideV: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, marginLeft: -0.5, backgroundColor: 'rgba(247,245,241,0.35)' },
  guideH: { position: 'absolute', left: 0, right: 0, top: '50%', height: 1, marginTop: -0.5, backgroundColor: 'rgba(247,245,241,0.35)' },

  segRow: { flexDirection: 'row', gap: 8, marginTop: 20 },
  seg: { flex: 1, paddingVertical: 10, borderRadius: flRadius.md, borderWidth: 1, alignItems: 'center' },
  segOn: { backgroundColor: flColor.bronzeTint, borderColor: flColor.bronzeBorder },
  segOff: { backgroundColor: flColor.charcoal800, borderColor: flColor.charcoal600 },
  segText: { fontSize: 13, fontWeight: '700', color: flColor.gray400 },
  segTextOn: { color: flColor.bronze300 },

  zoomRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20 },
  track: { flex: 1, height: 34, justifyContent: 'center' },
  trackFillWrap: { height: 4, borderRadius: 2, backgroundColor: flColor.charcoal700, overflow: 'hidden' },
  trackFill: { height: 4, backgroundColor: flColor.bronze400 },
  thumb: { position: 'absolute', top: '50%', marginTop: -10, marginLeft: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: flColor.bronze300, borderWidth: 2, borderColor: '#060708' },
  zoomGlyph: { alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.round, backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.charcoal600 },
  zoomGlyphText: { color: flColor.gray400, fontWeight: '700', lineHeight: 20 },

  reset: { alignSelf: 'center', marginTop: 20, paddingVertical: 8 },
  resetText: { fontSize: 13, fontWeight: '600', color: flColor.gray400, textTransform: 'capitalize' },
});
