import { useState } from 'react';
import { StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';

import { flColor, flRadius } from '@/constants/foundation';

/**
 * Before/After comparison slider — one framed 3:4 image with a draggable divider. The "after" image is the
 * full base; the "before" image is clipped to the divider's x, so dragging reveals more of one and less of
 * the other. Drag via the View responder props (fresh closures over current width — no ref-in-render); works
 * on web + native. Used for transformation comparisons in the Compare view, the Share preview, and the squad
 * post they create.
 */
/** Pan (`tx`/`ty` as fractions of the frame) + `scale` for aligning a photo. */
export interface PhotoTransform {
  tx: number;
  ty: number;
  scale: number;
}

const asTransform = (t: PhotoTransform | undefined, w: number, h: number) => (t ? [{ translateX: t.tx * w }, { translateY: t.ty * h }, { scale: t.scale }] : undefined);

export function BeforeAfterSlider({ before, after, beforeLabel, afterLabel, beforeT, afterT }: { before: string; after: string; beforeLabel?: string; afterLabel?: string; beforeT?: PhotoTransform; afterT?: PhotoTransform }) {
  const [w, setW] = useState(0);
  const [x, setX] = useState<number | null>(null);

  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const track = (e: GestureResponderEvent) => setX(Math.max(0, Math.min(w, e.nativeEvent.locationX)));
  const dividerX = x == null ? w / 2 : Math.max(0, Math.min(w, x));
  const h = (w * 4) / 3; // 3:4 frame

  return (
    <View
      onLayout={onLayout}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={track}
      onResponderMove={track}
      style={styles.container}
      accessibilityRole="adjustable"
      accessibilityLabel="Before and after slider — drag to compare"
    >
      <View style={styles.full} pointerEvents="none">
        <Image source={{ uri: after }} style={[styles.fill, afterT ? { transform: asTransform(afterT, w, h) } : null]} contentFit="cover" />
      </View>
      <View style={[styles.clip, { width: dividerX }]} pointerEvents="none">
        <Image source={{ uri: before }} style={{ width: w, height: '100%', transform: asTransform(beforeT, w, h) }} contentFit="cover" />
      </View>

      {beforeLabel ? (
        <View style={[styles.chip, styles.chipLeft]} pointerEvents="none">
          <Text style={styles.chipText} numberOfLines={1}>
            {beforeLabel}
          </Text>
        </View>
      ) : null}
      {afterLabel ? (
        <View style={[styles.chip, styles.chipRight]} pointerEvents="none">
          <Text style={[styles.chipText, styles.chipTextNow]} numberOfLines={1}>
            {afterLabel}
          </Text>
        </View>
      ) : null}

      <View style={[styles.divider, { left: dividerX - 1 }]} pointerEvents="none" />
      <View style={[styles.handle, { left: dividerX - 17 }]} pointerEvents="none">
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#1A1206" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M9 7l-4 5 4 5M15 7l4 5-4 5" />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', aspectRatio: 3 / 4, borderRadius: flRadius.md, overflow: 'hidden', borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.surfaceRecessed, position: 'relative' },
  full: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  fill: { width: '100%', height: '100%' },
  clip: { position: 'absolute', top: 0, left: 0, bottom: 0, overflow: 'hidden' },
  chip: { position: 'absolute', top: 8, paddingVertical: 3, paddingHorizontal: 8, borderRadius: flRadius.sm, backgroundColor: 'rgba(8,11,14,0.72)', borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, maxWidth: '46%' },
  chipLeft: { left: 8 },
  chipRight: { right: 8 },
  chipText: { fontSize: 9.5, fontWeight: '600', color: flColor.gray400 },
  chipTextNow: { color: flColor.bronze300 },
  divider: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: 'rgba(247,245,241,0.92)' },
  handle: {
    position: 'absolute',
    top: '50%',
    marginTop: -17,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: flColor.bronze300,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(247,245,241,0.92)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
  },
});
