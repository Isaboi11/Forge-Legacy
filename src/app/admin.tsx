import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';

import { CrmShell } from '@/components/forge/admin/CrmShell';
import { flColor } from '@/constants/foundation';
import { isAppAdmin } from '@/data/admin-live';
import { useQuery } from '@/lib/useQuery';

/**
 * The Creator Dashboard — since 2026-09-28, the operator's Business CRM.
 *
 * Governed by `Docs/Admin-Analytics-Architecture-v1.0.md` as amended by `Admin-Analytics-Amendment-001`
 * (who signed up) and `Admin-Analytics-Amendment-002` (the Business CRM: revenue, plans, AI spend, bugs,
 * contacts, documents, App Store). The pages live in `components/forge/admin/pages/`; the navigation in
 * `CrmShell`. This file is only the gate.
 *
 * ══ THE URL IS NOT THE GATE ══
 *
 * expo-router compiles every route into the bundle and `app.json` sets `web.output: "static"`, so
 * `/admin` exists as a public file on forgelegacy.expo.app no matter what this file does. The gate is
 * `admin_guard()` in Postgres: an athlete who reaches this URL gets 42501 on every query, and the private
 * `ops-docs` bucket refuses them at the storage policy. The `isAppAdmin()` check below is a courtesy that
 * avoids rendering ten error states — it is not security, and it FAILS CLOSED (an error resolves to
 * false and redirects).
 */
export default function AdminScreen() {
  const router = useRouter();
  const admin = useQuery(() => isAppAdmin(), []);

  if (admin.loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={flColor.bronze400} />
      </View>
    );
  }
  // `error` is treated as `false` by isAppAdmin() itself — a guard that fails open is not a guard.
  if (admin.data !== true) return <Redirect href="/" />;

  return <CrmShell onExit={() => (router.canGoBack() ? router.back() : router.replace('/account-settings'))} />;
}

const styles = StyleSheet.create({
  boot: { flex: 1, backgroundColor: flColor.base, alignItems: 'center', justifyContent: 'center' },
});
