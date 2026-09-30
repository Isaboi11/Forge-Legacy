import { useState, useEffect } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { flColor, flGradient } from '@/constants/foundation';
import { forgeOr } from '@/constants/theme-scrim';

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
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      /*
       * ⚠ `aria-checked` IS WHAT A SCREEN READER HEARS ON WEB (QA 09-26 settings-18). react-native-web
       * 0.21 dropped `accessibilityState` entirely — the switch rendered as `role="switch"` with no
       * checked state, so every toggle read "off". `accessibilityState` stays for iOS/Android.
       */
      aria-checked={value}
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
    >
      <ToggleTrack value={value} />
    </Pressable>
  );
}

/**
 * The toggle's drawing alone — track and knob, no press handling — for a row that is itself the
 * pressable (the share sheet's field switches). One look for every switch in the app (settings-24).
 */
export function ToggleTrack({ value }: { value: boolean }) {
  const [x] = useState(() => new Animated.Value(value ? 1 : 0));

  useEffect(() => {
    Animated.timing(x, { toValue: value ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  }, [value, x]);

  const translateX = x.interpolate({ inputRange: [0, 1], outputRange: [0, 19] });

  return (
    <View style={[styles.track, value ? styles.trackOn : styles.trackOff]}>
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
        style={[styles.knob, { backgroundColor: value ? forgeOr<string>('#1A1206', flColor.onBronze) : flColor.charcoal500, transform: [{ translateX }] }]}
      />
    </View>
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
  trackOn: { borderColor: flColor.accentBorder },
  trackOff: { borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800 },
  knob: { position: 'absolute', top: 2, left: 2, width: 21, height: 21, borderRadius: 999 },
});
