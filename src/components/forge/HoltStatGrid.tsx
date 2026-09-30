import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { flColor, flFont } from '@/constants/foundation';
import { fitWordSize } from '@/domain/text/fit-word';

/** Three across, so six stats form two clean rows and a dropped cell reflows rather than leaving a hole. */
const CELL = 0.31;
const VALUE_SIZE = 19;

/**
 * The stat grid on Holt's program card and its full preview (`4 WEEKS · 3 DAYS / WEEK · INTERMEDIATE LEVEL`).
 *
 * ⚠ QA holtai-17: "Intermediate" broke as "Intermediat / e" — one word wider than a third of the card. The
 * grid measures itself and each value is sized so its longest word fits its cell (`fitWordSize`); values
 * of several words still wrap, but only at a space. Both themes: every colour is a foundation role.
 */
export function HoltStatGrid({ stats }: { stats: readonly { value: string; label: string }[] }) {
  const [width, setWidth] = useState(0);
  const cell = width * CELL;
  return (
    <View style={styles.grid} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {stats.map((st) => {
        const size = fitWordSize(st.value, cell, VALUE_SIZE);
        return (
          <View key={st.label} style={styles.stat}>
            <Text style={[styles.value, size !== VALUE_SIZE && { fontSize: size }]}>{st.value}</Text>
            <Text style={styles.label}>{st.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14, columnGap: 10 },
  stat: { width: '31%', gap: 3 }, // = CELL
  value: { fontFamily: flFont.display, fontSize: VALUE_SIZE, color: flColor.cream100 },
  label: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.6, color: flColor.labelInk },
});
