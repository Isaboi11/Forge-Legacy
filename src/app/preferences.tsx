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
import { INTENSITY_LEVELS, type IntensityLevel } from '@/domain/coach/rulebook/intensity';
import { previewSquat, type UnitSystem } from '@/domain/settings/units';
import { useAppPrefs } from '@/lib/settings';
import { useToast } from '@/hooks/useCeremony';
import { useQuery } from '@/lib/useQuery';

/**
 * P-4b Preferences (`Forge Preferences.dc.html`) — the app-experience settings.
 *
 * Units is real: it persists (`profiles.app_prefs`, 0022), drives the live preview here, and every weight
 * display across the app reads it through `useUnits`. Reduce Motion is real (gates animation via
 * `useReduceMotion`). SOUND IS NOW REAL: it gates the rest-timer ding through `useSoundEnabled`, on web
 * and native alike. Haptics still persists the athlete's intent only — the app has no haptics layer — so
 * it alone carries the honest "native only" note rather than pretending to act. Saving refetches the
 * shared settings provider so a units change lands app-wide at once.
 */

const UNIT_OPTIONS: { id: UnitSystem; label: string }[] = [
  { id: 'imperial', label: 'Lbs' },
  { id: 'metric', label: 'Kgs' },
];

/**
 * ⚠ EACH LEVEL IS DESCRIBED BY WHAT IT DOES, NOT BY WHERE IT SITS ON A SCALE.
 *
 * "Low / Medium / High" would make the athlete guess, and guessing wrong here means a coach who either
 * nags them or goes silent — neither of which they would connect back to this screen. Every line below
 * is a promise the engine actually keeps; see `rulebook/intensity.ts`.
 *
 * ⚠ AND NOTHING IS DISABLED. What a level MEANS is bounded by experience — a beginner at `drive` is
 * never given bigger jumps than an intermediate at `push` — but that bounding happens in the matrix, out
 * of sight. A greyed-out option would say "you're not good enough", which is the anxiety posture the
 * Active Workout spec forbids and a silent narrowing under CL-D3.
 */
const INTENSITY_COPY: Record<IntensityLevel, { label: string; hint: string }> = {
  reminders: { label: 'Reminders', hint: 'Technique cues only. I won’t tell you to change the weight.' },
  steady: { label: 'Steady', hint: 'I’ll tell you when you’ve earned more weight.' },
  push: { label: 'Push', hint: 'I’ll say it sooner, and offer a bump mid-exercise.' },
  drive: { label: 'Drive', hint: 'I’ll push on every lift and tell you straight.' },
};

export default function PreferencesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refetch } = useAppPrefs();
  const { showToast } = useToast();

  const { data, loading } = useQuery(fetchAppPrefs, []);
  const [override, setOverride] = useState<Partial<AppPrefs>>({});
  const prefs: AppPrefs = { ...APP_PREFS_DEFAULTS, ...data, ...override };

  /**
   * ⚠ THE OPTIMISTIC OVERRIDE IS ROLLED BACK ON FAILURE, AND IT WAS NOT.
   *
   * `setOverride` moves the control the instant it is tapped, which is right — a settings toggle that
   * waits on a round trip feels broken. But the write can reject (`writeColumn` throws), and there was
   * no `catch`: the promise rejected unhandled, the override stayed, and **the screen went on showing a
   * value the server had never accepted.** An athlete would set Lbs, see Lbs, and find the rest of the
   * app still in kilograms with no way to tell why — which is exactly how this was reported.
   *
   * A settings screen that lies about what it saved is worse than one that fails loudly.
   */
  const commit = (next: AppPrefs) => {
    const before = prefs;
    setOverride((o) => ({ ...o, ...next }));
    void saveAppPrefs(next)
      .then(() => refetch()) // refetch so useUnits updates every other screen
      .catch(() => {
        setOverride((o) => ({ ...o, ...before }));
        showToast('Couldn’t save that — check your connection and try again.');
      });
  };

  const setUnits = (units: UnitSystem) => commit({ ...prefs, units });
  const setToggle = (key: ExperienceKey, on: boolean) => commit({ ...prefs, [key]: on });
  const setIntensity = (coachIntensity: IntensityLevel) => commit({ ...prefs, coachIntensity });

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

          {/*
            coaching — how hard Holt pushes.

            Above Experience deliberately: this changes what a person says to you mid-workout, and the
            toggles below it change how an animation behaves. It sits under Display only because Units
            is the one setting on this screen that every other screen reads.
          */}
          <Text style={styles.sectionLabel}>Coaching</Text>
          <View style={styles.card}>
            <View style={styles.unitsHead}>
              <View style={styles.iconTile}>
                <ForgeSymbol name="spark" size={19} color={flColor.bronze300} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>How hard Holt pushes</Text>
                <Text style={styles.rowHint}>Change it any time — it takes effect on his next line.</Text>
              </View>
            </View>
            <View style={styles.levels}>
              {INTENSITY_LEVELS.map((level, i) => {
                const on = prefs.coachIntensity === level;
                const copy = INTENSITY_COPY[level];
                return (
                  <Pressable
                    key={level}
                    onPress={() => setIntensity(level)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`${copy.label} — ${copy.hint}`}
                    style={[styles.level, i > 0 && styles.rowBorder, on && styles.levelOn]}
                  >
                    <View style={styles.rowText}>
                      <Text style={[styles.rowLabel, on && styles.levelLabelOn]}>{copy.label}</Text>
                      <Text style={styles.rowHint}>{copy.hint}</Text>
                    </View>
                    {on ? <ForgeSymbol name="seal" size={17} color={flColor.bronze400} /> : null}
                  </Pressable>
                );
              })}
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

  // coaching levels — a list of choices, not a slider: each one is a sentence, and a slider has none.
  levels: { marginTop: 4 },
  level: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  /* The selected level is marked by a bronze tint and a check, never by dimming the others — every
     level is available to everybody (see INTENSITY_COPY). */
  levelOn: { backgroundColor: flColor.bronzeTint },
  levelLabelOn: { color: flColor.bronze300 },
  rowText: { flex: 1 },
});
