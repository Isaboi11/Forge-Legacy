import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';

import { useCompareDrag } from '@/hooks/useCompareDrag';
import { flColor, flRadius } from '@/constants/foundation';

/**
 * Before/After comparison slider — one framed 3:4 image with a draggable divider. The "after" image is the
 * full base; the "before" image is clipped to the divider's x, so dragging reveals more of one and less of
 * the other. The drag comes from `useCompareDrag`; works on web + native. Used for transformation
 * comparisons in the Compare view, the Share preview, and the squad post they create.
 */
/** Pan (`tx`/`ty` as fractions of the frame) + `scale` for aligning a photo. */
export interface PhotoTransform {
  tx: number;
  ty: number;
  scale: number;
}

const asTransform = (t: PhotoTransform | undefined, w: number, h: number) => (t ? [{ translateX: t.tx * w }, { translateY: t.ty * h }, { scale: t.scale }] : undefined);

export function BeforeAfterSlider({ before, after, beforeLabel, afterLabel, beforeT, afterT }: { before: string; after: string; beforeLabel?: string; afterLabel?: string; beforeT?: PhotoTransform; afterT?: PhotoTransform }) {
  /**
   * ══ THE DIVIDER IS A SHARED VALUE, NOT STATE, AND THAT IS HALF THE FIX ══
   *
   * PO: *"the slider feature isn't too smooth."* It was `useState`, written from `onResponderMove`. Every
   * touch event — dozens a second — therefore ran a full React render of this component: both `Image`s
   * reconciled with freshly-allocated `source` objects and `transform` arrays, both label chips, the
   * divider and the handle, then a layout pass to resize the clip. That is a lot of work per frame to
   * move one white line, and on a real photo pair it is visibly behind your thumb.
   *
   * The position now lives in a Reanimated shared value: writing it updates the UI thread directly and
   * renders NOTHING. The images mount once and are never touched again by dragging.
   *
   * ══ AND IT IS NOT ANIMATING `width`, WHICH IS THE OTHER HALF ══
   *
   * Moving the divider used to re-lay-out the reveal panel every frame. Reanimated ran that on the UI
   * thread rather than through React, which is why it got better and not good — a layout pass per frame
   * is still a layout pass per frame, and it is the one animated property guaranteed to cost more than a
   * transform.
   *
   * The panel is now full-width and clipped by TWO CANCELLING TRANSFORMS: the outer view slides left by
   * `x - w` so its right edge lands exactly on `x`, and the inner view slides right by `w - x` so the
   * photo inside it does not move at all. `overflow: hidden` on the outer does the cutting. Same picture,
   * no layout — only `translateX`, which is the cheapest thing a compositor can do.
   *
   * ⚠ THE GESTURE ITSELF NOW LIVES IN `useCompareDrag`, SHARED WITH THE FEED'S COMPARISON CARD. Read
   * that file for what was wrong with it and why — in short, the physics above were never the reason it
   * felt finicky; ownership of the touch was. Two implementations of the same drag is how this component
   * and `ProgressCompare` came to need the same fix twice, so there is now one.
   *
   * ⚠ `-1` AND `-17` ARE CENTRING OFFSETS, half the divider's 2pt width and half the handle's 34. They
   * were in the old `left:` maths and have to survive here or both drift right of the touch.
   */
  const { x, width: w, onLayout, panHandlers } = useCompareDrag();

  const clipStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value - w }] }));
  const clipInnerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: w - x.value }] }));
  const dividerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value - 1 }] }));
  const handleStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value - 17 }] }));

  const h = (w * 4) / 3; // 3:4 frame

  return (
    <View
      onLayout={onLayout}
      {...panHandlers}
      style={styles.container}
      accessibilityRole="adjustable"
      accessibilityLabel="Before and after slider — drag to compare"
    >
      <View style={styles.full} pointerEvents="none">
        <Image source={{ uri: after }} style={[styles.fill, afterT ? { transform: asTransform(afterT, w, h) } : null]} contentFit="cover" />
      </View>
      <Animated.View style={[styles.clip, clipStyle]} pointerEvents="none">
        <Animated.View style={[styles.full, clipInnerStyle]}>
          <Image source={{ uri: before }} style={{ width: w, height: '100%', transform: asTransform(beforeT, w, h) }} contentFit="cover" />
        </Animated.View>
      </Animated.View>

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

      <Animated.View style={[styles.divider, dividerStyle]} pointerEvents="none" />
      <Animated.View style={[styles.handle, handleStyle]} pointerEvents="none">
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={flColor.onBronze} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M9 7l-4 5 4 5M15 7l4 5-4 5" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', aspectRatio: 3 / 4, borderRadius: flRadius.md, overflow: 'hidden', borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.surfaceRecessed, position: 'relative' },
  full: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  fill: { width: '100%', height: '100%' },
  /* ⚠ FULL WIDTH, NOT `width: x`. The reveal is cut by sliding this whole panel left and sliding its
     contents right by the same amount — two transforms that cancel, so the photo holds still and the
     window over it moves. Nothing here is ever re-laid-out while dragging. */
  clip: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  chip: { position: 'absolute', top: 8, paddingVertical: 3, paddingHorizontal: 8, borderRadius: flRadius.sm, backgroundColor: 'rgba(8,11,14,0.72)', borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, maxWidth: '46%' },
  chipLeft: { left: 8 },
  chipRight: { right: 8 },
  chipText: { fontSize: 9.5, fontWeight: '600', color: flColor.gray400 },
  chipTextNow: { color: flColor.bronze300 },
  /* ⚠ `left: 0` IS LOAD-BEARING NOW. Both of these used to be positioned by an inline `left:` recomputed
     every render; they are driven by `translateX` from the UI thread instead, and a transform moves an
     element from wherever it already is. Without an explicit origin the two would start at whatever the
     layout gave them and the divider would sit off the touch by that amount. */
  divider: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 2, backgroundColor: 'rgba(247,245,241,0.92)' },
  handle: {
    position: 'absolute',
    top: '50%',
    left: 0,
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
