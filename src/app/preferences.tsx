import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ForgeSymbol } from '@/components/forge/ForgeSymbol';
import { SettingsToggle } from '@/components/forge/SettingsToggle';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flRadius } from '@/constants/foundation';
import { fetchAppPrefs, saveAppPrefs } from '@/data/settings-live';
import { APP_PREFS_DEFAULTS, EXPERIENCE_TOGGLES, type AppPrefs, type ExperienceKey } from '@/domain/settings/preferences';
import { previewSquat, type UnitSystem } from '@/domain/settings/units';
import { useAppPrefs } from '@/lib/settings';
import { useQuery } from '@/lib/useQuery';

/**
 * P-4b Preferences (`Forge Preferences.dc.html`) — the app-experience settings.
 *
 * Units is real: it persists (`profiles.app_prefs`, 0022), drives the live preview here, and every weight
 * display across the app reads it through `useUnits`. Reduce Motion is real (gates animation via
 * `useReduceMotion`). Haptics and Sound persist the athlete's intent, but their consumers are native-only
 * — on the web preview there is nothing to fire — so they carry an honest "native only" note rather than
 * pretending to act. Saving refetches the shared settings provider so a units change lands app-wide at once.
 */

const UNIT_OPTIONS: { id: UnitSystem; label: string }[] = [
  { id: 'imperial', label: 'Imperial' },
  { id: 'metric', label: 'Metric' },
];

export default function PreferencesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refetch } = useAppPrefs();

  const { data, loading } = useQuery(fetchAppPrefs, []);
  const [override, setOverride] = useState<Partial<AppPrefs>>({});
  const prefs: AppPrefs = { ...APP_PREFS_DEFAULTS, ...data, ...override };

  const commit = (next: AppPrefs) => {
    setOverride((o) => ({ ...o, ...next }));
    void saveAppPrefs(next).then(() => refetch()); // refetch so useUnits updates every other screen
  };

  const setUnits = (units: UnitSystem) => commit({ ...prefs, units });
  const setToggle = (key: ExperienceKey, on: boolean) => commit({ ...prefs, [key]: on });

  const back = () => (router.canGoBack() ? router.back() : router.replace('/account-settings'));

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      <AppBar title="Preferences" onBack={back} />

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 40 + insets.bottom }]} showsVerticalScrollIndicator={false}>
          {/* display / units */}
          <Text style={styles.sectionLabel}>Display</Text>
          <View style={styles.card}>
            <View style={styles.unitsHead}>
              <View style={styles.iconTile}>
                <ForgeSymbol name="scale" size={19} color={flColor.bronze300} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Units</Text>
                <Text style={styles.rowHint}>Applied across every screen — workouts, programs, and your legacy.</Text>
              </View>
            </View>
            <View style={styles.segment}>
              {UNIT_OPTIONS.map((u) => {
                const on = prefs.units === u.id;
                return (
                  <Pressable
                    key={u.id}
                    onPress={() => setUnits(u.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={u.label}
                    style={[styles.seg, on && styles.segOn]}
                  >
                    <Text style={[styles.segText, on && styles.segTextOn]}>{u.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.preview}>
              <Text style={styles.previewLabel}>Preview</Text>
              <Text style={styles.previewValue}>
                Best squat <Text style={styles.previewMono}>{previewSquat(prefs.units)}</Text>
              </Text>
            </View>
          </View>

          {/* experience */}
          <Text style={styles.sectionLabel}>Experience</Text>
          <View style={styles.card}>
            {EXPERIENCE_TOGGLES.map((t, i) => (
              <View key={t.key} style={[styles.row, i > 0 && styles.rowBorder]}>
                <View style={styles.iconTile}>
                  <ForgeSymbol name={t.icon} size={18} color={flColor.bronze300} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{t.label}</Text>
                  <Text style={styles.rowHint}>{t.desc}</Text>
                  {!t.live ? <Text style={styles.nativeNote}>Applies on the mobile app.</Text> : null}
                </View>
                <SettingsToggle value={prefs[t.key]} onChange={(on) => setToggle(t.key, on)} accessibilityLabel={t.label} />
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: flColor.base },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 18, paddingTop: 6 },

  sectionLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400, marginBottom: 11 },

  card: { padding: 14, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900, marginBottom: 22, overflow: 'hidden' },
  unitsHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: flRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flColor.charcoal800,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
  },
  rowLabel: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  rowHint: { fontSize: 11.5, lineHeight: 17, color: flColor.gray600, marginTop: 2 },
  nativeNote: { fontSize: 10.5, color: flColor.bronze600, marginTop: 4 },

  segment: { flexDirection: 'row', gap: 8, marginTop: 12 },
  seg: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
  },
  segOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  segText: { fontSize: 13, fontWeight: '600', color: flColor.gray400 },
  segTextOn: { color: flColor.bronze300 },

  preview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 13, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  previewLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: flColor.gray600 },
  previewValue: { fontSize: 13, color: flColor.gray400 },
  previewMono: { color: flColor.cream100 },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 13 },
  rowBorder: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  rowText: { flex: 1 },
});
