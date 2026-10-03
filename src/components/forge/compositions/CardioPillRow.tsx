import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { flColor, flRadius } from '@/constants/foundation';
import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import type { CardioPill } from '@/domain/workout/conditioning';

/**
 * One sideways row of cardio pills — the SAME row on Home's Start a Workout sheet (tap = start) and in
 * the Exercise Picker (tap = tick), so a treadmill is one word in one place in both (PO 10-03).
 *
 * The caller orders the pills (`cardioPillsByRecency`) and says what a tap does; this only draws them.
 * `selected` is the picker's tick; Home has none. `gutter` lets the row bleed to the screen edge, so a
 * pill cut off at the right reads as "scrolls" rather than "clipped".
 */
export function CardioPillRow({
  label,
  pills,
  onPress,
  selected,
  gutter,
  large = false,
}: {
  label: string;
  pills: readonly CardioPill[];
  onPress: (pill: CardioPill) => void;
  selected?: (pill: CardioPill) => boolean;
  gutter: number;
  /** Home's sheet: 44 pt pills, the launcher's own touch size. The picker's are a step smaller. */
  large?: boolean;
}) {
  return (
    <View style={[styles.wrap, { marginHorizontal: -gutter }]}>
      <Text style={[styles.label, { paddingHorizontal: gutter }]}>{label}</Text>
      <ScrollView
        horizontal
        keyboardDismissMode={KEYBOARD_DISMISS_MODE}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, { paddingHorizontal: gutter }]}
      >
        {pills.map((p) => {
          const on = selected?.(p) ?? false;
          return (
            <Pressable
              key={p.id}
              onPress={() => onPress(p)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${p.label}, cardio`}
              style={({ pressed }) => [styles.pill, large && styles.pillLarge, on && styles.pillOn, pressed && !on && styles.pillPressed]}
            >
              {on ? <EngravedIcon name="check" size={13} color={flColor.onBronze} /> : null}
              <Text style={[styles.text, large && styles.textLarge, on && styles.textOn]}>{p.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.gray600 },
  row: { gap: 7 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: 'transparent',
  },
  pillLarge: { height: 44, paddingHorizontal: 16 },
  pillOn: { borderColor: flColor.bronze400, backgroundColor: flColor.bronzeSolid },
  pillPressed: { borderColor: flColor.accentBorder },
  text: { fontSize: 13, fontWeight: '600', color: flColor.gray400 },
  textLarge: { fontSize: 14, color: flColor.cream100 },
  textOn: { color: flColor.onBronze },
});
