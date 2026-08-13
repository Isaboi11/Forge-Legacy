import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ForgeSymbol } from '@/components/forge/ForgeSymbol';
import { SettingsToggle } from '@/components/forge/SettingsToggle';
import { Toast } from '@/components/forge/composites/Toast';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flRadius } from '@/constants/foundation';
import { fetchAppPrefs, fetchVisibility, saveAppPrefs, saveVisibility } from '@/data/settings-live';
import { APP_PREFS_DEFAULTS } from '@/domain/settings/preferences';
import { useToast } from '@/hooks/useCeremony';
import { usePersist } from '@/hooks/usePersist';
import { setAnalyticsEnabled } from '@/lib/analytics';
import {
  AUDIENCES,
  VISIBILITY_DEFAULTS,
  VISIBILITY_SECTIONS,
  type AudienceId,
  type VisibilityKey,
  type VisibilityMap,
} from '@/domain/settings/visibility';
import { useQuery } from '@/lib/useQuery';

/**
 * P-6 Profile Visibility (`Forge Profile Visibility.dc.html`) — per-section audience control.
 *
 * Server-backed (`profiles.visibility`, 0022) because it governs what OTHER athletes see: it has to live
 * where their requests can read it. Saves on every tap. Rank, Standard and Honors are core identity and
 * are always visible — the callout says so, and they are not listed.
 */

const EYE = 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z';

export default function ProfileVisibilityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data, loading } = useQuery(fetchVisibility, []);
  const [override, setOverride] = useState<Partial<VisibilityMap>>({});
  const [toast, setToast] = useState(false);
  const persistWrite = usePersist();
  const { showToast } = useToast();
  const value = (k: VisibilityKey): AudienceId => override[k] ?? data?.[k] ?? VISIBILITY_DEFAULTS[k];

  /* The analytics opt-out (P6-A1-D5/D6). Server truth is `profiles.app_prefs`; `setAnalyticsEnabled`
     mirrors it to AsyncStorage so the emitter can check consent SYNCHRONOUSLY on the next launch,
     before anything can be queued. Both writes happen on tap — a toggle that only takes effect after a
     round trip would keep collecting for the rest of the session the athlete just declined. */
  const { data: prefs, loading: prefsLoading, error: prefsError } = useQuery(fetchAppPrefs, []);
  const [optOutOverride, setOptOutOverride] = useState<boolean | null>(null);
  const analyticsOptOut = optOutOverride ?? prefs?.analyticsOptOut ?? APP_PREFS_DEFAULTS.analyticsOptOut;

  /**
   * ⚠ TWO SEPARATE DEFECTS LIVED IN THIS ONE FUNCTION, AND THE SECOND WAS THE WORSE.
   *
   * 1. The write had no rejection arm, so an opt-out the server refused stayed showing as opted out.
   *    `src/lib/settings.tsx` then reconciles the local mirror FROM SERVER TRUTH on the next launch —
   *    so collection silently resumed for somebody who had said no and been shown that it took.
   *
   * 2. **`{ ...APP_PREFS_DEFAULTS, ...prefs }` where `prefs` is `null` spreads NOTHING and writes pure
   *    defaults over the whole blob.** `useQuery` returns `data: null` while loading AND on error
   *    (`useQuery.ts:77`), and `saveAppPrefs` → `sanitizePrefs` fills every field, so the write is
   *    complete and cannot merge. Tapping this control in the first moments of the screen — or any time
   *    after that read failed — reset units to lbs, coach intensity to default, and Sound and
   *    Reduce-Motion with them, app-wide.
   *
   *    `src/lib/settings.tsx:20-29` documents this exact trap and says "it exists because that bug
   *    shipped". The `loaded` guard built to prevent it was never used on this screen.
   *
   * So the tap is refused outright until the read has actually resolved. A control that cannot yet be
   * honoured must not appear to work.
   */
  const prefsReady = !prefsLoading && !prefsError && !!prefs;

  const setAnalytics = (on: boolean) => {
    if (!prefsReady) {
      showToast('Still loading your settings — try that again in a moment.');
      return;
    }
    const before = optOutOverride;
    setOptOutOverride(!on);
    setAnalyticsEnabled(on);
    persistWrite(() => saveAppPrefs({ ...APP_PREFS_DEFAULTS, ...prefs, analyticsOptOut: !on }), {
      rollback: () => {
        setOptOutOverride(before);
        setAnalyticsEnabled(!on); // put the synchronous local mirror back too
      },
    });
  };

  /*
   * ⚠ VISIBILITY IS A PROMISE ABOUT WHAT OTHER PEOPLE CAN SEE. A segment that moves on a write the server
   * rejected tells the athlete their sealed chapters are private when they are not.
   */
  const set = (k: VisibilityKey, id: AudienceId) => {
    const before = override;
    setOverride((o) => ({ ...o, [k]: id }));
    persistWrite(() => saveVisibility({ ...VISIBILITY_DEFAULTS, ...data, ...override, [k]: id }), {
      rollback: () => setOverride(before),
    });
  };

  /*
   * ⚠ THE TOAST USED TO FIRE UNCONDITIONALLY, BEFORE AND REGARDLESS OF THE WRITE. "Reset to defaults" is
   * a confident claim about a privacy state; it now only appears once the server has actually accepted it.
   */
  const reset = () => {
    const before = override;
    setOverride({ ...VISIBILITY_DEFAULTS });
    persistWrite(() => saveVisibility({ ...VISIBILITY_DEFAULTS }), {
      onOk: () => setToast(true),
      rollback: () => setOverride(before),
    });
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace('/account-settings'));

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      <AppBar title="Profile Visibility" onBack={back} />

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 40 + insets.bottom }]} showsVerticalScrollIndicator={false}>
          <Text style={styles.intro}>
            Choose who can see each part of your Legacy when they open your profile. Anything set to a smaller audience
            simply won’t appear for others.
          </Text>

          {/* always visible */}
          <View style={styles.callout}>
            <View style={styles.calloutIcon}>
              <ForgeSymbol name="eye" size={17} color={flColor.bronze300} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.calloutTitle}>Always visible</Text>
              <Text style={styles.calloutBody}>
                Your rank, your Standard, and your Honors are part of your identity — everyone who visits can see them.
              </Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>What others can see</Text>

          {VISIBILITY_SECTIONS.map((sec) => (
            <View key={sec.key} style={styles.card}>
              <View style={styles.secHead}>
                <View style={styles.iconTile}>
                  <ForgeSymbol name={sec.icon} size={18} color={flColor.bronze300} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{sec.label}</Text>
                  <Text style={styles.rowHint}>{sec.desc}</Text>
                </View>
              </View>
              <View style={styles.segment}>
                {AUDIENCES.map((a) => {
                  const on = value(sec.key) === a.id;
                  return (
                    <Pressable
                      key={a.id}
                      onPress={() => set(sec.key, a.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={`${sec.label}: ${a.label}`}
                      style={[styles.seg, on && styles.segOn]}
                    >
                      <Text style={[styles.segText, on && styles.segTextOn]}>{a.short}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          <Pressable onPress={reset} accessibilityRole="button" accessibilityLabel="Reset to defaults" style={styles.reset}>
            <Text style={styles.resetText}>Reset to defaults</Text>
          </Pressable>

          {/* P-6's third toggle (P6-A1-D5). It governs nothing another athlete can see — which is why it
              sits below the reset, outside "What others can see", rather than among the audience rows.
              The copy states what is collected in the same breath as the control: a toggle whose effect
              the athlete has to go and read a policy to understand is not really a control. */}
          <Text style={styles.sectionLabel}>Helping Forge improve</Text>
          <View style={styles.card}>
            <View style={styles.secHead}>
              <View style={styles.iconTile}>
                <ForgeSymbol name="eye" size={18} color={flColor.bronze300} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Help improve Forge</Text>
                <Text style={styles.rowHint}>
                  Records which screens and features you use, so we can see what’s working. Never what you wrote or
                  what you lifted, never your photos, never your location. It stays in Forge and is never sold or
                  shared.
                </Text>
              </View>
              <SettingsToggle
                value={!analyticsOptOut}
                onChange={setAnalytics}
                accessibilityLabel="Help improve Forge"
              />
            </View>
          </View>
        </ScrollView>
      )}

      <Toast
        open={toast}
        message="Reset to defaults"
        durationMs={2000}
        onDismiss={() => setToast(false)}
        icon={
          <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#1A1206" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d={EYE} />
          </Svg>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: flColor.base },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 18, paddingTop: 6 },

  intro: { fontSize: 13, lineHeight: 20, color: flColor.gray400, marginBottom: 16 },

  callout: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint, marginBottom: 22 },
  calloutIcon: { width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.charcoal800 },
  calloutTitle: { fontSize: 13.5, fontWeight: '700', color: flColor.bronze300, marginBottom: 4 },
  calloutBody: { fontSize: 12, lineHeight: 18, color: flColor.gray400 },

  sectionLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400, marginBottom: 11 },

  card: { padding: 14, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900, marginBottom: 11 },
  secHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
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
  rowText: { flex: 1, minWidth: 0 },
  rowLabel: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  rowHint: { fontSize: 11.5, lineHeight: 17, color: flColor.gray600, marginTop: 2 },

  segment: { flexDirection: 'row', gap: 6 },
  seg: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
  },
  segOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  segText: { fontSize: 11.5, fontWeight: '600', color: flColor.gray400 },
  segTextOn: { color: flColor.bronze300 },

  reset: { alignSelf: 'center', paddingVertical: 14, paddingHorizontal: 16, marginTop: 8 },
  resetText: { fontSize: 12.5, fontWeight: '700', color: flColor.gray400 },
});
