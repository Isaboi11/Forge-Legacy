import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CrmThemeProvider, useCrm } from '@/components/forge/admin/crm-theme';
import { useLayout } from '@/components/forge/admin/crm-ui';
import { AiHealthPage } from '@/components/forge/admin/pages/AiHealthPage';
import { flColor } from '@/constants/foundation';
import { dashboardTz, isAppAdmin } from '@/data/admin-live';
import { useQuery } from '@/lib/useQuery';

/**
 * /admin-ai — AI HEALTH (AI Road to 10, Sprint 1 — PL-4; migration 0269 `admin_ai_health`), the web line's door.
 *
 * On build 11 this route IS the page, linked from the old Creator Dashboard. On the web, /admin is the Business
 * CRM, so the page is a CRM page (`AiHealthPage`, sidebar → Business → AI health, `/admin?p=aihealth`). This route
 * stays because the hourly AI alert push and the inbox open `/admin-ai` (0269, `destination.ts`), and the phone
 * CRM's More tab links here:
 *   · wide (≥ 900, the CRM's sidebar layout) → the CRM page itself;
 *   · narrow → the same page on the phone CRM's ground, with the way back.
 *
 * ══ THE GATE ══ Same as /admin: `admin_guard()` inside the function is the boundary; `isAppAdmin()` here is the
 * courtesy redirect, and it fails closed.
 */
export default function AdminAiScreen() {
  const router = useRouter();
  const { wide } = useLayout();
  const admin = useQuery(() => isAppAdmin(), []);

  if (admin.loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={flColor.bronze400} />
      </View>
    );
  }
  if (admin.data !== true) return <Redirect href="/" />;
  if (wide) return <Redirect href="/admin?p=aihealth" />;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/admin'));
  return (
    <CrmThemeProvider phone>
      <Narrow onBack={goBack} />
    </CrmThemeProvider>
  );
}

function Narrow({ onBack }: { onBack: () => void }) {
  const { c } = useCrm();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <ScrollView
        keyboardDismissMode={KEYBOARD_DISMISS_MODE}
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[styles.body, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 64 }]}
      >
        <Text onPress={onBack} accessibilityRole="link" style={[styles.back, { color: c.brz }]}>
          ‹ Back
        </Text>
        <AiHealthPage tz={dashboardTz()} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, backgroundColor: flColor.base, alignItems: 'center', justifyContent: 'center' },
  root: { flex: 1 },
  body: { paddingHorizontal: 20 },
  back: { fontSize: 17, paddingVertical: 10, alignSelf: 'flex-start' },
});
