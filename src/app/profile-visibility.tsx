import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ForgeSymbol } from '@/components/forge/ForgeSymbol';
import { Toast } from '@/components/forge/composites/Toast';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flRadius } from '@/constants/foundation';
import { fetchVisibility, saveVisibility } from '@/data/settings-live';
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
  const value = (k: VisibilityKey): AudienceId => override[k] ?? data?.[k] ?? VISIBILITY_DEFAULTS[k];

  const persist = (map: VisibilityMap) => void saveVisibility(map);

  const set = (k: VisibilityKey, id: AudienceId) => {
    setOverride((o) => ({ ...o, [k]: id }));
    persist({ ...VISIBILITY_DEFAULTS, ...data, ...override, [k]: id });
  };

  const reset = () => {
    setOverride({ ...VISIBILITY_DEFAULTS });
    persist({ ...VISIBILITY_DEFAULTS });
    setToast(true);
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
