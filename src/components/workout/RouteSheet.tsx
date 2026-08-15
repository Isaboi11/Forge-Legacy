import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { flColor, flFont } from '@/constants/foundation';
import { ROUTE_TRIM_NOTE, type LatLng } from '@/domain/run/route-region';
import { RouteMap } from './RouteMap';

/**
 * The route, full screen, where the athlete can actually handle it.
 *
 * PO: *"He couldn't click on the map to zoom in or anything."*
 *
 * ══ WHY EXPANDING RATHER THAN MAKING THE INLINE MAP PANNABLE ══
 *
 * The cardio card sits inside the workout screen's horizontally-paging ScrollView — one page per
 * exercise. A pannable map inside a pager eats every horizontal drag meant to change exercise, so the
 * athlete gains a map and loses the ability to move through their own workout. Tap-to-expand is what
 * every app with a map inside a feed does, and for this reason.
 *
 * So: inline is a picture with a tap target, this is the map. `interactive` is the only difference.
 */

interface Props {
  visible: boolean;
  onClose: () => void;
  points: readonly LatLng[];
  /** "3.01 mi · 31:07" — the numbers, restated over the shape they came from. */
  summary?: string;
}

export function RouteSheet({ visible, onClose, points, summary }: Props) {
  const { height } = useWindowDimensions();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close the map" hitSlop={12} style={styles.close}>
            <Text style={styles.closeText}>Done</Text>
          </Pressable>
          <Text style={styles.title}>Your route</Text>
          {/* Balances the row so the title sits centred without measuring anything. */}
          <View style={styles.close} />
        </View>

        {/* Full bleed minus the chrome. `interactive` turns on every gesture at once — see RouteMap. */}
        <RouteMap points={points} height={height - 168} interactive showEnds testID="route-sheet-map" />

        <View style={styles.footer}>
          {summary ? <Text style={styles.summary}>{summary}</Text> : null}
          {/*
            ⚠ REQUIRED, NOT DECORATIVE — Amendment §8.7. The line drawn here genuinely is shorter than
            the run: the first and last 200 m were removed before the route was ever stored (D-RTE-1).
            An athlete comparing this against their distance would otherwise reasonably conclude the app
            had lost their miles, which is the exact complaint this whole piece of work started from.
          */}
          <Text style={styles.note}>{ROUTE_TRIM_NOTE}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: flColor.base },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  close: { minWidth: 64 },
  closeText: { color: flColor.bronze300, fontFamily: flFont.sans, fontSize: 16 },
  title: { color: flColor.cream100, fontFamily: flFont.display, fontSize: 20 },
  footer: { paddingHorizontal: 20, paddingTop: 16, gap: 6 },
  summary: { color: flColor.cream100, fontFamily: flFont.display, fontSize: 22, textAlign: 'center' },
  note: { color: flColor.gray400, fontFamily: flFont.sans, fontSize: 12, textAlign: 'center', lineHeight: 17 },
});
