import { useRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { flColor } from '@/constants/foundation';
import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';

/**
 * A horizontal row of chips that SAYS it scrolls.
 *
 * ══ WHY (visualA-12, QA 09-26) ══
 *
 * A chip row wider than the phone was a bare horizontal `ScrollView` with its indicator hidden, so the
 * row simply stopped at the right edge: Forge Templates' focus row hid eight of its options and Activity
 * History hid Swim, Row, Mobility and Other, with nothing to say they were there. On the web a mouse
 * cannot drag a horizontal list at all, so for a desktop viewer they were not merely hidden but
 * unreachable.
 *
 * So each edge that has more beyond it fades into the ground and carries a chevron, and the chevron is a
 * button: it pages the row by most of a screen-width. The edge disappears once there is nothing further
 * that way, so a row that fits shows nothing extra at all.
 *
 * `ground` is the colour the row sits on — the fade has to end in it, or it reads as a smudge. Pass the
 * same theme role the strip's own background uses (both themes follow from that).
 */
export function ChipScroller({
  ground,
  style,
  contentContainerStyle,
  children,
}: {
  ground: string;
  /** The wrapper — pass `{ flex: 1 }` when the row shares a line with a label. */
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const ref = useRef<ScrollView>(null);
  const [viewW, setViewW] = useState(0);
  const [contentW, setContentW] = useState(0);
  const [x, setX] = useState(0);
  const moreRight = viewW > 0 && contentW - viewW - x > EDGE_SLOP;
  const moreLeft = x > EDGE_SLOP;

  const onLayout = (e: LayoutChangeEvent) => setViewW(e.nativeEvent.layout.width);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setX(e.nativeEvent.contentOffset.x);
  const page = (dir: 1 | -1) => {
    const to = Math.max(0, Math.min(contentW - viewW, x + dir * viewW * 0.7));
    ref.current?.scrollTo({ x: to, animated: true });
  };

  const clear = clearOf(ground);
  return (
    <View style={style}>
      <ScrollView
        ref={ref}
        keyboardDismissMode={KEYBOARD_DISMISS_MODE}
        automaticallyAdjustKeyboardInsets
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={contentContainerStyle}
        onLayout={onLayout}
        onContentSizeChange={(w) => setContentW(w)}
        onScroll={onScroll}
        scrollEventThrottle={32}
      >
        {children}
      </ScrollView>
      {moreLeft ? (
        <Pressable onPress={() => page(-1)} accessibilityRole="button" accessibilityLabel="Scroll back" style={[styles.edge, styles.edgeLeft]}>
          <LinearGradient colors={[ground, ground, clear]} locations={[0, 0.45, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          <EngravedIcon name="chevron-left" size={14} color={flColor.gray400} />
        </Pressable>
      ) : null}
      {moreRight ? (
        <Pressable onPress={() => page(1)} accessibilityRole="button" accessibilityLabel="Show more options" style={[styles.edge, styles.edgeRight]}>
          <LinearGradient colors={[clear, ground, ground]} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          <EngravedIcon name="chevron-right" size={14} color={flColor.gray400} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Within this many points of an end counts as AT it — a fractional scroll offset must not keep a hint lit. */
const EDGE_SLOP = 4;

/** `color` at zero alpha, so a fade runs from nothing INTO it rather than through grey (`'transparent'` is black at 0). */
function clearOf(color: string): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (hex) {
    const n = parseInt(hex[1], 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},0)`;
  }
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(color);
  return rgb ? `rgba(${rgb[1]},${rgb[2]},${rgb[3]},0)` : 'transparent';
}

const styles = StyleSheet.create({
  edge: { position: 'absolute', top: 0, bottom: 0, width: 40, justifyContent: 'center' },
  edgeLeft: { left: 0, alignItems: 'flex-start', paddingLeft: 4 },
  edgeRight: { right: 0, alignItems: 'flex-end', paddingRight: 4 },
});
