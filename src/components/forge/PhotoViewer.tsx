import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { flColor, flRadius } from '@/constants/foundation';
import { gridRows } from '@/domain/squad/post-photos';

/**
 * ══ THE FACEBOOK GRID AND THE VIEWER IT OPENS (PO 2026-09-28) ══
 *
 * A post's photos drawn as a collage (`gridRows`), each tile a door into `PhotoViewer` at that photo. The
 * viewer is full screen, black, every photo whole (`contain`, never cropped) and swipeable in order.
 *
 * ⚠ The viewer is an RN `Modal`, which is safe here and would not be in a composer: nothing is ever
 * picked from inside it (see `useMediaPicker` on presenting a picker over a modal).
 */
export function PhotoGrid({ urls, onOpen }: { urls: readonly string[]; onOpen: (index: number) => void }) {
  const { rows, more } = gridRows(urls.length);
  const last = rows.flat().at(-1);
  return (
    <View style={styles.grid}>
      {rows.map((row, r) => (
        <View key={r} style={styles.gridRow}>
          {row.map((i) => (
            <Pressable
              key={i}
              onPress={() => onOpen(i)}
              accessibilityRole="button"
              accessibilityLabel={`Open photo ${i + 1} of ${urls.length}`}
              style={styles.tile}
            >
              <Image source={{ uri: urls[i] }} style={StyleSheet.absoluteFill} contentFit="cover" />
              {more > 0 && i === last ? (
                <View pointerEvents="none" style={styles.more}>
                  <Text style={styles.moreText}>+{more}</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * Instagram's carousel: swipe in place, "i / n" in the corner, and a tap opens the viewer at that photo
 * (PO 09-28: *"I should be able to swipe through the pictures without having to actually click on the
 * post"*, and on the post itself *"just swipeable there and not … a long top to bottom scroll"*).
 * Fills its parent; the parent sets the shape.
 */
export function PhotoCarousel({ urls, onOpen }: { urls: readonly string[]; onOpen: (index: number) => void }) {
  const [w, setW] = useState(0);
  const [idx, setIdx] = useState(0);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (w > 0) setIdx(Math.round(e.nativeEvent.contentOffset.x / w));
  };
  return (
    <View style={styles.fill} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <ScrollView
        keyboardDismissMode={KEYBOARD_DISMISS_MODE}
        automaticallyAdjustKeyboardInsets
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.fill}
      >
        {urls.map((u, i) => (
          <Pressable
            key={`${u}-${i}`}
            onPress={() => onOpen(i)}
            accessibilityRole="button"
            accessibilityLabel={`Open photo ${i + 1} of ${urls.length}`}
            style={w > 0 ? { width: w, height: '100%' } : null}
          >
            <Image source={{ uri: u }} style={styles.fill} contentFit="cover" />
          </Pressable>
        ))}
      </ScrollView>
      {urls.length > 1 ? (
        <View pointerEvents="none" style={styles.cornerCounter}>
          <Text style={styles.counterText}>
            {Math.min(urls.length, idx + 1)} / {urls.length}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function PhotoViewer({ urls, index, onClose }: { urls: readonly string[]; index: number | null; onClose: () => void }) {
  const open = index != null;
  return (
    <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      {open ? <ViewerBody key={index} urls={urls} start={index} onClose={onClose} /> : null}
    </Modal>
  );
}

function ViewerBody({ urls, start, onClose }: { urls: readonly string[]; start: number; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [idx, setIdx] = useState(start);
  const scroller = useRef<ScrollView>(null);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width > 0) setIdx(Math.round(e.nativeEvent.contentOffset.x / width));
  };
  return (
    <View style={styles.viewer}>
      <ScrollView
        ref={scroller}
        keyboardDismissMode={KEYBOARD_DISMISS_MODE}
        automaticallyAdjustKeyboardInsets
        /* Opened AT the tapped photo. `contentOffset` alone is ignored by RN-web, so the jump is made once
           the pager has a size, on every platform the same way. */
        onLayout={() => scroller.current?.scrollTo({ x: start * width, animated: false })}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentOffset={{ x: start * width, y: 0 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {urls.map((u, i) => (
          <Image key={`${u}-${i}`} source={{ uri: u }} style={{ width, height }} contentFit="contain" />
        ))}
      </ScrollView>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close photos"
        hitSlop={10}
        style={[styles.close, { top: insets.top + 10 }]}
      >
        <EngravedIcon name="close" size={18} color={flColor.onMedia} />
      </Pressable>
      {urls.length > 1 ? (
        <View style={[styles.counter, { top: insets.top + 16 }]}>
          <Text style={styles.counterText}>
            {Math.min(urls.length, idx + 1)} / {urls.length}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const GAP = 2;

const styles = StyleSheet.create({
  grid: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, gap: GAP },
  gridRow: { flex: 1, flexDirection: 'row', gap: GAP },
  tile: { flex: 1, overflow: 'hidden', backgroundColor: flColor.charcoal800 },
  more: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(6,7,9,0.55)' },
  moreText: { fontSize: 26, fontWeight: '600', color: flColor.onMedia },

  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  cornerCounter: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: flRadius.pill,
    backgroundColor: 'rgba(6,7,9,0.62)',
  },
  viewer: { flex: 1, backgroundColor: '#000' },
  close: {
    position: 'absolute',
    right: 14,
    width: 36,
    height: 36,
    borderRadius: flRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6,7,9,0.62)',
  },
  counter: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: flRadius.pill,
    backgroundColor: 'rgba(6,7,9,0.62)',
  },
  counterText: { fontSize: 12, fontWeight: '600', color: flColor.onMedia },
});
