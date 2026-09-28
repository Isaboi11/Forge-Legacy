import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppBar } from '@/components/forge/composites/AppBar';
import { RangeControl } from '@/components/forge/admin/charts';
import { useWide } from '@/components/forge/admin/crm-ui';
import { AiPage } from '@/components/forge/admin/pages/AiPage';
import { AppStorePage } from '@/components/forge/admin/pages/AppStorePage';
import { BugsPage } from '@/components/forge/admin/pages/BugsPage';
import { ContactsPage } from '@/components/forge/admin/pages/ContactsPage';
import { DocumentsPage } from '@/components/forge/admin/pages/DocumentsPage';
import { ModerationPage } from '@/components/forge/admin/pages/ModerationPage';
import { OverviewPage } from '@/components/forge/admin/pages/OverviewPage';
import { RevenuePage } from '@/components/forge/admin/pages/RevenuePage';
import { UsagePage } from '@/components/forge/admin/pages/UsagePage';
import { UsersPage } from '@/components/forge/admin/pages/UsersPage';
import { isPageKey, NAV, type PageKey, type PageProps } from '@/components/forge/admin/pages/types';
import { flColor, flFont, flRadius, flText } from '@/constants/foundation';
import { dashboardTz } from '@/data/admin-live';
import { fetchBugCounts } from '@/data/crm-live';
import { RANGES, rangeToDays, type RangeKey } from '@/domain/admin/series';
import { useQuery } from '@/lib/useQuery';

/**
 * The Business CRM shell (Admin-Analytics-Amendment-002).
 *
 * The Creator Dashboard used to be one fifteen-section scroll. It is now ten pages under four headings,
 * because the questions an owner asks come in kinds — "how is the money", "what is broken", "who do I
 * need to call back" — and a scroll answers none of them without passing through all the others.
 *
 * ══ TWO LAYOUTS, ONE COMPONENT TREE ══
 *
 * Wide (the web dashboard, ≥ 900 px): a fixed sidebar and a centred content column. Phone: the app bar,
 * a horizontal strip of page chips, and the same pages stacked. The pages decide their own columns with
 * `Columns`/`useWide`; the shell only decides where the navigation goes.
 *
 * ══ THE PAGE IS IN THE URL ══
 *
 * `/admin?p=bugs&a=<id>`. A refresh, a bookmark or a link pasted to yourself lands on the same page —
 * which matters most on the web, the surface this is actually used on.
 *
 * The gate is not here: `admin.tsx` checks `isAppAdmin()` before rendering this, and every RPC behind
 * every page raises 42501 for a non-admin regardless (AA-D5).
 */
export function CrmShell({ onExit }: { onExit: () => void }) {
  const router = useRouter();
  const wide = useWide();
  const params = useLocalSearchParams<{ p?: string; a?: string }>();
  const page: PageKey = isPageKey(params.p) ? params.p : 'overview';
  const arg = typeof params.a === 'string' && params.a ? params.a : undefined;

  const [range, setRange] = useState<RangeKey>('30d');
  const days = rangeToDays(range);
  const tz = dashboardTz();

  // Badges. Re-read when the page changes, so fixing a bug and navigating away updates the count.
  const bugCounts = useQuery(() => fetchBugCounts(), [page]);
  const badge: Partial<Record<PageKey, number>> = {
    bugs: bugCounts.data ? bugCounts.data.active_critical + bugCounts.data.active_high : undefined,
  };

  const go = (p: PageKey, a?: string) => router.setParams({ p, a: a ?? '' });
  const ranged = NAV.flatMap((g) => g.items).find((i) => i.key === page)?.ranged ?? false;
  const title = NAV.flatMap((g) => g.items).find((i) => i.key === page)?.label ?? 'Overview';

  const props: PageProps = { range, days, tz, go, arg };
  const body = renderPage(page, props);

  const rangeControl = ranged ? (
    <RangeControl options={RANGES.map((r) => ({ key: r.key, label: r.label }))} value={range} onChange={setRange} />
  ) : null;

  if (wide) {
    return (
      <View style={styles.wideRoot}>
        <View style={styles.sidebar}>
          <Pressable onPress={onExit} accessibilityRole="link" accessibilityLabel="Back to the app" style={styles.brand}>
            <Text style={styles.brandName}>Forge Legacy</Text>
            <Text style={styles.brandSub}>‹ Back to the app</Text>
          </Pressable>
          <ScrollView contentContainerStyle={styles.navScroll} showsVerticalScrollIndicator={false}>
            {NAV.map((g) => (
              <View key={g.group} style={styles.navGroup}>
                <Text style={styles.navGroupLabel}>{g.group}</Text>
                {g.items.map((i) => {
                  const on = i.key === page;
                  const n = badge[i.key];
                  return (
                    <Pressable
                      key={i.key}
                      onPress={() => go(i.key)}
                      accessibilityRole="link"
                      accessibilityState={{ selected: on }}
                      style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
                        styles.navItem,
                        hovered && !on && styles.navItemHover,
                        on && styles.navItemOn,
                      ]}
                    >
                      <Text style={[styles.navText, on && styles.navTextOn]}>{i.label}</Text>
                      {n ? <Text style={styles.navBadge}>{n}</Text> : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </View>

        <ScrollView
          style={styles.main}
          contentContainerStyle={styles.mainBody}
          keyboardDismissMode={KEYBOARD_DISMISS_MODE}
          automaticallyAdjustKeyboardInsets
        >
          <View style={styles.column}>
            <View style={styles.topBar}>
              <Text style={styles.crumb}>
                {NAV.find((g) => g.items.some((i) => i.key === page))?.group} · {title}
              </Text>
              {rangeControl}
            </View>
            {body}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.phoneRoot}>
      <AppBar title="Creator Dashboard" onBack={onExit} />
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabStrip}>
          {NAV.flatMap((g) => g.items).map((i) => {
            const on = i.key === page;
            const n = badge[i.key];
            return (
              <Pressable
                key={i.key}
                onPress={() => go(i.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                style={[styles.tab, on && styles.tabOn]}
              >
                <Text style={[styles.tabText, on && styles.tabTextOn]}>
                  {i.label}
                  {n ? <Text style={styles.tabBadge}> {n}</Text> : null}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <ScrollView
        contentContainerStyle={styles.phoneBody}
        keyboardDismissMode={KEYBOARD_DISMISS_MODE}
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        {rangeControl ? <View style={styles.phoneRange}>{rangeControl}</View> : null}
        {body}
      </ScrollView>
    </View>
  );
}

function renderPage(page: PageKey, props: PageProps) {
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
    case 'documents':
      return <DocumentsPage {...props} />;
  }
}

const SIDEBAR_W = 236;

const styles = StyleSheet.create({
  wideRoot: { flex: 1, flexDirection: 'row', backgroundColor: flColor.base },
  sidebar: {
    width: SIDEBAR_W,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: flColor.charcoal700,
    backgroundColor: flColor.charcoal900,
    paddingTop: 22,
  },
  brand: { paddingHorizontal: 22, paddingBottom: 18, gap: 3 },
  brandName: { color: flText.primary, fontFamily: flFont.display, fontSize: 19, letterSpacing: 0.3 },
  brandSub: { color: flColor.gray600, fontSize: 11.5 },
  navScroll: { paddingHorizontal: 12, paddingBottom: 28, gap: 18 },
  navGroup: { gap: 2 },
  navGroupLabel: {
    color: flColor.gray600,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    paddingHorizontal: 10,
    paddingBottom: 6,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: flRadius.sm,
  },
  navItemHover: { backgroundColor: flColor.hoverWash },
  navItemOn: { backgroundColor: flColor.bronzeTint },
  navText: { color: flColor.gray400, fontSize: 13.5 },
  navTextOn: { color: flColor.bronzeInk, fontWeight: '600' },
  navBadge: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: flRadius.pill,
    overflow: 'hidden',
    textAlign: 'center',
    color: flColor.redMuted,
    backgroundColor: flColor.dangerBg,
    fontSize: 11,
    fontWeight: '700',
  },

  main: { flex: 1 },
  mainBody: { paddingHorizontal: 36, paddingBottom: 72 },
  column: { width: '100%', maxWidth: 1180, alignSelf: 'center', gap: 22 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingTop: 20,
    minHeight: 52,
  },
  crumb: { color: flColor.gray600, fontSize: 12, letterSpacing: 0.4 },

  phoneRoot: { flex: 1, backgroundColor: flColor.base },
  tabStrip: { paddingHorizontal: 16, paddingVertical: 8, gap: 6 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
  },
  tabOn: { borderColor: flColor.accentBorder, backgroundColor: flColor.bronzeTint },
  tabText: { color: flColor.gray400, fontSize: 12.5, fontWeight: '600' },
  tabTextOn: { color: flColor.bronzeInk },
  tabBadge: { color: flColor.redMuted },
  phoneBody: { paddingHorizontal: 16, paddingBottom: 56, gap: 22 },
  phoneRange: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 4 },
});
