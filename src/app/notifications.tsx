import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ForgeSymbol } from '@/components/forge/ForgeSymbol';
import { SettingsToggle } from '@/components/forge/SettingsToggle';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flRadius } from '@/constants/foundation';
import { fetchNotifPrefs, saveNotifPrefs } from '@/data/settings-live';
import {
  ALWAYS_DELIVERED,
  NOTIF_DEFAULTS,
  NOTIF_FOOTER,
  NOTIF_SECTIONS,
  type NotifKey,
  type NotifMap,
} from '@/domain/settings/notifications';
import { usePersist } from '@/hooks/usePersist';
import { useQuery } from '@/lib/useQuery';

/**
 * P-5 Notifications (`Forge Notifications.dc.html`) — the push preference set.
 *
 * REAL, persisted preferences (`profiles.notif_prefs`, 0022) that save on every toggle. They control
 * push delivery, and push isn't sending yet — no `expo-notifications`, no server sender — so today they
 * record intent for when that lands. The footer says so; nothing here claims a push was sent. Ceremonies
 * and in-app surfaces are never gated by these.
 */

const SHIELD = 'M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z';
const CHECK = 'M8.5 12.5l2.5 2.5 5-5';

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data, loading } = useQuery(fetchNotifPrefs, []);
  const [override, setOverride] = useState<Partial<NotifMap>>({});
  const value = (k: NotifKey): boolean => override[k] ?? data?.[k] ?? NOTIF_DEFAULTS[k];
  const persist = usePersist();

  /*
   * ⚠ A SWITCH THAT MOVED AND DID NOT SAVE IS WORSE THAN ONE THAT REFUSED.
   *
   * This was a bare `void saveNotifPrefs(next)`. `writeColumn` throws, nothing caught it, and the
   * optimistic override stayed — so turning "Friend Requests" off on a bad connection showed OFF while
   * the server kept sending them. The athlete's conclusion is that the toggle does nothing, which is
   * true, and that the app is ignoring them, which is worse than an error.
   */
  const toggle = (k: NotifKey, on: boolean) => {
    const before = override;
    setOverride((o) => ({ ...o, [k]: on })); // optimistic — the switch must not lag the tap
    const next: NotifMap = { ...NOTIF_DEFAULTS, ...data, ...override, [k]: on };
    persist(() => saveNotifPrefs(next), { rollback: () => setOverride(before) });
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace('/account-settings'));

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      <AppBar title="Notifications" onBack={back} />

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 40 + insets.bottom }]} showsVerticalScrollIndicator={false}>
          {NOTIF_SECTIONS.map((sec) => (
            <View key={sec.key} style={styles.section}>
              <Text style={styles.sectionLabel}>{sec.label}</Text>
              <Text style={styles.blurb}>{sec.blurb}</Text>
              <View style={styles.card}>
                {sec.toggles.map((t, i) => (
                  <View key={t.key} style={[styles.row, i > 0 && styles.rowBorder]}>
                    <View style={styles.iconTile}>
                      <ForgeSymbol name={t.icon} size={18} color={flColor.bronze300} />
                    </View>
                    <View style={styles.rowText}>
                      <Text style={styles.rowLabel}>{t.label}</Text>
                      <Text style={styles.rowHint}>{t.desc}</Text>
                    </View>
                    <SettingsToggle value={value(t.key)} onChange={(on) => toggle(t.key, on)} accessibilityLabel={t.label} />
                  </View>
                ))}
              </View>
            </View>
          ))}

          {/* always-delivered callout */}
          <View style={styles.callout}>
            <View style={styles.calloutIcon}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                <Path d={SHIELD} />
                <Path d={CHECK} />
              </Svg>
            </View>
            <View style={styles.rowText}>
              <Text style={styles.calloutTitle}>{ALWAYS_DELIVERED.title}</Text>
              <Text style={styles.calloutBody}>{ALWAYS_DELIVERED.body}</Text>
            </View>
          </View>

          <Text style={styles.footer}>{NOTIF_FOOTER}</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: flColor.base },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 18, paddingTop: 6 },

  section: { marginBottom: 22 },
  sectionLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400, marginBottom: 4 },
  blurb: { fontSize: 12, lineHeight: 18, color: flColor.gray400, marginBottom: 11 },

  card: { borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 15 },
  rowBorder: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
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

  callout: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint, marginBottom: 16 },
  calloutIcon: { width: 34, height: 34, borderRadius: flRadius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(186, 134, 84,0.14)' },
  calloutTitle: { fontSize: 13.5, fontWeight: '700', color: flColor.bronze300, marginBottom: 3 },
  calloutBody: { fontSize: 12, lineHeight: 18, color: flColor.gray400 },

  footer: { fontSize: 11.5, lineHeight: 18, color: flColor.gray600, paddingHorizontal: 2 },
});
