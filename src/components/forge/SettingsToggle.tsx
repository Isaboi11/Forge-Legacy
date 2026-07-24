import { useState, useEffect } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { flColor, flGradient } from '@/constants/foundation';

/**
 * The settings toggle, matched exactly to `Forge Notifications.dc.html` / `Forge Preferences.dc.html`.
 *
 * Track 46×27, pill. ON = the bronze-metallic sweep with a **dark `#1A1206` knob**; OFF = charcoal-800
 * with a charcoal-500 knob. This is deliberately NOT the `ForgeToggle` composite (CLA-C14), whose ON
 * thumb is a light bronze highlight — the settings design uses the dark-knob-on-gold treatment, which
 * is what the target screenshot shows.
 */
export function SettingsToggle({
  value,
  onChange,
  accessibilityLabel,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  accessibilityLabel?: string;
}) {
  const [x] = useState(() => new Animated.Value(value ? 1 : 0));

  useEffect(() => {
    Animated.timing(x, { toValue: value ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  }, [value, x]);

  const translateX = x.interpolate({ inputRange: [0, 1], outputRange: [0, 19] });

  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      style={[styles.track, value ? styles.trackOn : styles.trackOff]}
    >
      {value ? (
        <LinearGradient
          colors={flGradient.bronzeMetallic.colors}
          locations={flGradient.bronzeMetallic.locations}
          start={flGradient.bronzeMetallic.start}
          end={flGradient.bronzeMetallic.end}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <Animated.View
        style={[styles.knob, { backgroundColor: value ? '#1A1206' : flColor.charcoal500, transform: [{ translateX }] }]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 46,
    height: 27,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  trackOn: { borderColor: flColor.bronzeBorder },
  trackOff: { borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800 },
  knob: { position: 'absolute', top: 2, left: 2, width: 21, height: 21, borderRadius: 999 },
});
