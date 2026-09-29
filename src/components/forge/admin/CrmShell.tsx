import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { CrmThemeProvider, useCrm, type CrmMode } from '@/components/forge/admin/crm-theme';
import { DISPLAY, ToastProvider, useLayout } from '@/components/forge/admin/crm-ui';
import { PhoneShell } from '@/components/forge/admin/phone/PhoneShell';
import { AiPage } from '@/components/forge/admin/pages/AiPage';
import { AppStorePage } from '@/components/forge/admin/pages/AppStorePage';
import { BugsPage } from '@/components/forge/admin/pages/BugsPage';
import { ContactsPage } from '@/components/forge/admin/pages/ContactsPage';
import { DocumentsPage } from '@/components/forge/admin/pages/DocumentsPage';
import { ModerationPage } from '@/components/forge/admin/pages/ModerationPage';
import { OverviewPage } from '@/components/forge/admin/pages/OverviewPage';
import { RevenuePage } from '@/components/forge/admin/pages/RevenuePage';
import { SurveysPage } from '@/components/forge/admin/pages/SurveysPage';
import { UsagePage } from '@/components/forge/admin/pages/UsagePage';
import { UsersPage } from '@/components/forge/admin/pages/UsersPage';
import { isPageKey, NAV, RANGE_PAGES, type PageKey, type PageProps } from '@/components/forge/admin/pages/types';
import { dashboardTz } from '@/data/admin-live';
import { fetchBugCounts } from '@/data/crm-live';
import { fetchAdminReports } from '@/data/moderation-live';
import { RANGE_INFO, type RangeKey } from '@/domain/admin/briefing';
import { useQuery } from '@/lib/useQuery';

/**
 * The Business CRM shell, built to `Forge CRM.dc.html` (Admin-Analytics-Amendment-002).
 *
 * Wide (≥ 900): a 236 px sidebar — brand, "‹ Back to the app", four headed groups, badges on Bugs
 * (critical + high still open) and Moderation (reports waiting). Narrow: the brand row and a scrolling row
 * of page pills. Both: a top bar with the breadcrumb, the Dark / Light switch and, on the pages that use
 * it, the 7D / 30D / 90D / 1Y range; then a content column up to 1240 px.
 *
 * The page is in the URL (`/admin?p=bugs&a=reports`), so a refresh or a bookmark lands in the same place.
 * The gate is not here: `admin.tsx` checks `isAppAdmin()`, and every RPC behind every page raises 42501
 * for a non-admin regardless (AA-D5).
 */
export function CrmShell({ onExit }: { onExit: () => void }) {
  const { wide } = useLayout();
  // Under 900 px the owner is on a phone: the phone design's own app (five tabs), not a squeezed desktop.
  if (!wide) return <PhoneShell onExit={onExit} />;
  return (
    <CrmThemeProvider>
      <ToastProvider>
        <ShellBody onExit={onExit} />
      </ToastProvider>
    </CrmThemeProvider>
  );
}

function ShellBody({ onExit }: { onExit: () => void }) {
  const router = useRouter();
  const { c, mode, setMode } = useCrm();
  const { lg } = useLayout();
  const params = useLocalSearchParams<{ p?: string; a?: string }>();
  const page: PageKey = isPageKey(params.p) ? params.p : 'overview';
  const arg = typeof params.a === 'string' && params.a ? params.a : undefined;

  const [range, setRange] = useState<RangeKey>('30D');
  const days = RANGE_INFO[range].days;
  const tz = dashboardTz();

  // Badges re-read when the page changes, so fixing a bug and moving on updates the count.
  const bugCounts = useQuery(() => fetchBugCounts(), [page]);
  const reports = useQuery(() => fetchAdminReports(1, 'open'), [page]);
  const badge: Partial<Record<PageKey, number>> = {
    bugs: bugCounts.data ? bugCounts.data.active_critical + bugCounts.data.active_high : undefined,
    moderation: reports.data?.counts.open || undefined,
  };

  const go = (p: PageKey, a?: string) => router.setParams({ p, a: a ?? '' });
  const group = NAV.find((g) => g.items.some((i) => i.key === page))?.group ?? 'Business';
  const label = NAV.flatMap((g) => g.items).find((i) => i.key === page)?.label ?? 'Overview';
  const props: PageProps = { range, days, tz, go, arg };

  const seg = (on: boolean) => ({ color: on ? c.ink : c.ink3, bg: on ? c.hover : 'transparent' });
  const topBar = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, minHeight: 36 }}>
      <Text style={{ fontSize: 13, color: c.ink3 }}>
        {group} · <Text style={{ color: c.ink2 }}>{label}</Text>
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <View accessibilityRole="radiogroup" accessibilityLabel="Appearance" style={{ flexDirection: 'row', gap: 2, padding: 3, borderRadius: 10, borderWidth: 1, borderColor: c.line }}>
          {(
            [
              ['forge', 'Dark'],
              ['alabaster', 'Light'],
            ] as [CrmMode, string][]
          ).map(([k, l]) => (
            <Pressable key={k} accessibilityRole="radio" accessibilityState={{ checked: mode === k }} onPress={() => setMode(k)} style={{ paddingVertical: 5, paddingHorizontal: 12, borderRadius: 7, backgroundColor: seg(mode === k).bg }}>
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: seg(mode === k).color }}>{l}</Text>
            </Pressable>
          ))}
        </View>
        {RANGE_PAGES.includes(page) ? (
          <View accessibilityRole="radiogroup" accessibilityLabel="Date range" style={{ flexDirection: 'row', gap: 2, padding: 3, borderRadius: 10, borderWidth: 1, borderColor: c.line }}>
            {(['7D', '30D', '90D', '1Y'] as RangeKey[]).map((k) => (
              <Pressable key={k} accessibilityRole="radio" accessibilityState={{ checked: range === k }} onPress={() => setRange(k)} style={{ paddingVertical: 5, paddingHorizontal: 12, borderRadius: 7, backgroundColor: seg(range === k).bg }}>
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: seg(range === k).color }}>{k}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );

  const body = (
    <View style={{ width: '100%', maxWidth: 1240, alignSelf: 'center' }}>
      <PageBody page={page} props={props} />
    </View>
  );

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: c.bg }}>
      <ScrollView keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets={false} style={{ width: 236, flexGrow: 0, backgroundColor: c.side, borderRightWidth: 1, borderRightColor: c.line }} contentContainerStyle={{ paddingVertical: 28, paddingHorizontal: 16, gap: 26 }}>
        <View style={{ gap: 4, paddingHorizontal: 10 }}>
          <Text style={{ fontFamily: DISPLAY, fontSize: 21, color: c.ink }}>Forge Legacy</Text>
          <Text onPress={onExit} accessibilityRole="link" style={{ fontSize: 12.5, color: c.ink3 }}>
            ‹ Back to the app
          </Text>
        </View>
        {NAV.map((g) => (
          <View key={g.group} accessibilityRole="menu" style={{ gap: 2 }}>
            <Text style={{ fontSize: 10.5, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: c.ink3, paddingHorizontal: 10, paddingBottom: 6 }}>{g.group}</Text>
            {g.items.map((i) => {
              const on = i.key === page;
              const n = badge[i.key];
              return (
                <Pressable
                  key={i.key}
                  onPress={() => go(i.key)}
                  accessibilityRole="link"
                  accessibilityState={{ selected: on }}
                  style={({ hovered }: { pressed: boolean; hovered?: boolean }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    height: 34,
                    paddingHorizontal: 10,
                    borderRadius: 8,
                    backgroundColor: on ? c.brzTint : hovered ? c.hover : 'transparent',
                  })}
                >
                  <Text style={{ fontSize: 14, color: on ? c.brz : c.ink2, fontWeight: on ? '600' : '400' }}>{i.label}</Text>
                  {n ? (
                    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: c.critTint }}>
                      <Text style={{ fontSize: 11.5, fontWeight: '600', color: c.crit, fontVariant: ['tabular-nums'] }}>{n}</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: lg ? 28 : 24, paddingHorizontal: lg ? 56 : 32, paddingBottom: lg ? 72 : 64 }}
        keyboardDismissMode={KEYBOARD_DISMISS_MODE}
        automaticallyAdjustKeyboardInsets
      >
        {topBar}
        {body}
      </ScrollView>
    </View>
  );
}

function PageBody({ page, props }: { page: PageKey; props: PageProps }) {
  switch (page) {
    case 'overview':
      return <OverviewPage {...props} />;
    case 'revenue':
      return <RevenuePage {...props} />;
    case 'users':
      return <UsersPage {...props} />;
    case 'ai':
      return <AiPage {...props} />;
    case 'appstore':
      return <AppStorePage {...props} />;
    case 'usage':
      return <UsagePage {...props} />;
    case 'bugs':
      return <BugsPage {...props} />;
    case 'moderation':
      return <ModerationPage {...props} />;
    case 'contacts':
      return <ContactsPage {...props} />;
    case 'surveys':
      return <SurveysPage {...props} />;
    case 'documents':
      return <DocumentsPage {...props} />;
  }
}
