import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { flColor, flFont, flRadius } from '@/constants/foundation';

/**
 * Get the photo INTO the circle, the way you want it.
 *
 * ══ WHY THIS EXISTS ══
 *
 * Choosing an avatar leaned entirely on the OS picker's own editor (`allowsEditing: true, aspect: [1,1]`).
 * On WEB that flag does nothing at all, and on iOS the aspect hint is largely ignored — so on the two
 * platforms this app is actually used from, "change photo" meant "hope the middle of your photo is the
 * part you wanted". A portrait taken at arm's length became a crop of somebody's collarbone.
 *
 * ══ WHY IT CROPS AT UPLOAD, NOT AT RENDER ══
 *
 * The alternative — storing a `{tx, ty, scale}` transform beside the URL and applying it wherever an
 * avatar is drawn — would mean every one of the app's avatar surfaces (Home, Legacy, squad feeds,
 * comments, rosters, the public profile, other people's clients) has to honour it, forever, and any that
 * forgot would silently show a different crop of the same person. Cropping here means the stored file IS
 * the avatar: `lib/avatar.ts` and every consumer stay exactly as they were.
 *
 * ══ MODELLED ON `AlignEditor` ══
 *
 * Same pan-by-responder, same 0.5–3× zoom slider, same fraction-of-frame transform maths — deliberately,
 * because that editor already solved this on this codebase's terms (no gesture library, no ref-in-render,
 * transforms that survive a resize). What differs is the mask (a circle, 1:1) and the ending: this one
 * produces a file rather than a stored transform.
 */

export interface AvatarCropEditorProps {
  /** The picked image, uncropped. */
  uri: string;
  /** Called with a square, already-cropped local file uri. */
  onDone: (uri: string) => void;
  onClose: () => void;
}

/** What the avatar is stored at. Big enough for a retina profile header, small enough to upload fast. */
const OUT_PX = 512;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function AvatarCropEditor({ uri, onDone, onClose }: AvatarCropEditorProps) {
  const [frame, setFrame] = useState(0); // the square viewport's side, in px
  const [tx, setTx] = useState(0); // pan, as a fraction of the frame
  const [ty, setTy] = useState(0);
  const [scale, setScale] = useState(1);
  const [last, setLast] = useState<{ x: number; y: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  /*
   * How far the image may travel before its edge enters the circle.
   *
   * At scale 1 the image exactly fills the frame, so it cannot move at all — which is correct: any pan
   * would expose background. Every extra unit of zoom buys half a frame of slack in each direction.
   */
  const limit = Math.max(0, (scale - 1) / 2);
  const clampPan = (v: number) => clamp(v, -limit, limit);

  const onGrant = (e: GestureResponderEvent) => setLast({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });
  const onMove = (e: GestureResponderEvent) => {
    if (!last || !frame) return;
    const cx = e.nativeEvent.locationX;
    const cy = e.nativeEvent.locationY;
    setTx((v) => clampPan(v + (cx - last.x) / frame));
    setTy((v) => clampPan(v + (cy - last.y) / frame));
    setLast({ x: cx, y: cy });
  };

  const onZoom = (s: number) => {
    setScale(s);
    // Re-clamp the pan against the NEW slack — zooming out with the image pushed to one edge would
    // otherwise leave it stranded outside the frame with a band of background inside the circle.
    const l = Math.max(0, (s - 1) / 2);
    setTx((v) => clamp(v, -l, l));
    setTy((v) => clamp(v, -l, l));
  };

  const reset = () => {
    setScale(1);
    setTx(0);
    setTy(0);
  };

  /**
   * Turn the on-screen arrangement into a real crop.
   *
   * The preview draws the image with `contentFit: cover`, so the source is first scaled so its SHORT
   * side fills the frame; `scale` and the pan then act on top of that. The same two steps run here in
   * source pixels: find the covered square, shrink it by the zoom, and slide it by the pan.
   */
  const apply = async () => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const ctx = ImageManipulator.manipulate(uri);
      const img = await ctx.renderAsync();
      const sw = img.width;
      const sh = img.height;

      const cover = Math.min(sw, sh); // the square `contentFit: cover` shows at scale 1
      const side = cover / scale; // zooming in shows less of the source
      // Centre of the visible square, in source pixels. Dragging the image right (+tx) moves the
      // viewport LEFT over the source, hence the minus.
      const cxSrc = sw / 2 - tx * cover;
      const cySrc = sh / 2 - ty * cover;
      const originX = clamp(cxSrc - side / 2, 0, Math.max(0, sw - side));
      const originY = clamp(cySrc - side / 2, 0, Math.max(0, sh - side));

      ctx.crop({ originX, originY, width: side, height: side }).resize({ width: OUT_PX, height: OUT_PX });
      const out = await ctx.renderAsync();
      const saved = await out.saveAsync({ format: SaveFormat.JPEG, compress: 0.9 });
      onDone(saved.uri);
    } catch {
      /* A crop that cannot be produced must not silently upload the UNCROPPED photo — that would put a
         picture the athlete explicitly rearranged on their profile in the arrangement they rejected. */
      setFailed(true);
      setBusy(false);
    }
  };

  const onFrameLayout = (e: LayoutChangeEvent) => setFrame(e.nativeEvent.layout.width);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Cancel" style={styles.headerBtn} hitSlop={6}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>Position your photo</Text>
          <Pressable onPress={() => void apply()} disabled={busy} accessibilityRole="button" accessibilityLabel="Use this crop" style={styles.headerBtn} hitSlop={6}>
            {busy ? <ActivityIndicator color={flColor.bronze300} size="small" /> : <Text style={styles.done}>Use</Text>}
          </Pressable>
        </View>

        <Text style={styles.hint}>Drag to move, zoom below. What&apos;s inside the circle is your avatar.</Text>

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
            <Image
              source={{ uri }}
              style={[styles.img, { transform: [{ translateX: tx * frame }, { translateY: ty * frame }, { scale }] }]}
              contentFit="cover"
              pointerEvents="none"
            />
            {/* The mask is four bars plus a ring rather than a real circular cut-out: RN has no
                mask-image, and this reads identically while staying one View tree. */}
            <View style={styles.ring} pointerEvents="none" />
            <View style={[styles.shade, styles.shadeTop]} pointerEvents="none" />
            <View style={[styles.shade, styles.shadeBottom]} pointerEvents="none" />
            <View style={[styles.shade, styles.shadeLeft]} pointerEvents="none" />
            <View style={[styles.shade, styles.shadeRight]} pointerEvents="none" />
          </View>
        </View>

        {failed ? <Text style={styles.error}>Couldn&apos;t crop that image. Try another photo.</Text> : null}

        <View style={styles.zoomRow}>
          <ZoomGlyph small />
          <ZoomSlider value={scale} min={MIN_ZOOM} max={MAX_ZOOM} onChange={onZoom} />
          <ZoomGlyph />
        </View>

        <Pressable onPress={reset} accessibilityRole="button" accessibilityLabel="Reset the crop" style={styles.reset}>
          <Text style={styles.resetText}>Reset</Text>
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

const SHADE = 'rgba(6,7,8,0.72)';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060708', paddingHorizontal: 22, paddingTop: 84 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  headerBtn: { paddingVertical: 8, minWidth: 44 },
  cancel: { fontSize: 14, color: flColor.gray400 },
  done: { fontSize: 14, fontWeight: '700', color: flColor.bronze300, textAlign: 'right' },
  title: { fontFamily: flFont.display, fontSize: 17, fontWeight: '600', color: flColor.cream100 },
  hint: { fontSize: 12.5, lineHeight: 18, color: flColor.gray400, textAlign: 'center', marginBottom: 18 },

  frameWrap: { alignItems: 'center' },
  frame: { width: '86%', maxWidth: 300, aspectRatio: 1, borderRadius: flRadius.lg, overflow: 'hidden', backgroundColor: flColor.surfaceRecessed, position: 'relative' },
  img: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  // The circle itself: a full-bleed ring whose border radius makes the visible aperture.
  ring: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9999, borderWidth: 2, borderColor: flColor.bronzeBorder, zIndex: 2 },
  shade: { position: 'absolute', backgroundColor: SHADE },
  shadeTop: { top: 0, left: 0, right: 0, height: '7%' },
  shadeBottom: { bottom: 0, left: 0, right: 0, height: '7%' },
  shadeLeft: { top: 0, bottom: 0, left: 0, width: '7%' },
  shadeRight: { top: 0, bottom: 0, right: 0, width: '7%' },

  error: { fontSize: 12.5, color: flColor.redMuted, textAlign: 'center', marginTop: 14 },

  zoomRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 26 },
  track: { flex: 1, height: 34, justifyContent: 'center' },
  trackFillWrap: { height: 4, borderRadius: 2, backgroundColor: flColor.charcoal700, overflow: 'hidden' },
  trackFill: { height: 4, backgroundColor: flColor.bronze400 },
  thumb: { position: 'absolute', top: '50%', marginTop: -10, marginLeft: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: flColor.bronze300, borderWidth: 2, borderColor: '#060708' },
  zoomGlyph: { alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.round, backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.charcoal600 },
  zoomGlyphText: { color: flColor.gray400, fontWeight: '700', lineHeight: 20 },

  reset: { alignSelf: 'center', marginTop: 18, paddingVertical: 8 },
  resetText: { fontSize: 13, fontWeight: '600', color: flColor.gray400 },
});
