import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { flColor, flFont, flGradient } from '@/constants/foundation';

/**
 * Placeholder screen for tab routes whose real content lands in Phase 3
 * (Workouts / Legacy / Community). Deliberately renders a clear, on-brand
 * "coming in Phase 3" state — never blank, never a crash — so the 5-tab
 * navigation is fully explorable now.
 */
export function ComingSoonScreen({ title }: { title: string }) {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={flGradient.bgAtmospheric.colors}
        locations={flGradient.bgAtmospheric.locations}
        start={flGradient.bgAtmospheric.start}
        end={flGradient.bgAtmospheric.end}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.center}>
        <Text style={styles.eyebrow}>Forge Legacy</Text>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.divider} />
        <Text style={styles.note}>Coming in Phase 3</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: flColor.bronze400,
  },
  title: {
    fontFamily: flFont.display,
    fontSize: 34,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: flColor.cream100,
  },
  divider: {
    width: 40,
    height: 1,
    backgroundColor: flColor.bronzeBorder,
    marginVertical: 4,
  },
  note: {
    fontSize: 13,
    letterSpacing: 0.4,
    color: flColor.gray400,
  },
});
