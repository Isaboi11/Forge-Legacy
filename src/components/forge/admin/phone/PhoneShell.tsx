import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { CrmThemeProvider, useCrm } from '@/components/forge/admin/crm-theme';
import {
  DEFAULT_BUG_FILTER,
  PhoneContext,
  TAB_NAME,
  type BugFilter,
  type MoreView,
  type Overlay,
  type PhoneCtx,
  type PhoneTab,
  type Sheet,
} from '@/components/forge/admin/phone/context';
import { TAB_BAR_H } from '@/components/forge/admin/phone/kit';
import { BugFilterSheet, BugOverlay, BugsTab, CrashOverlay, NewBugSheet, ReportOverlay } from '@/components/forge/admin/phone/BugsTab';
import { MoneyTab, UserFilterSheet, UserOverlay } from '@/components/forge/admin/phone/MoneyTab';
import { DocConfirmSheet, DocPickSheet, MoreTab } from '@/components/forge/admin/phone/MoreTab';
import { ContactEditOverlay, ContactOverlay, LogSheet, PeopleTab } from '@/components/forge/admin/phone/PeopleTab';
import { NewIdeaSheet, SocialVideoOverlay } from '@/components/forge/admin/phone/SocialViews';
import { TodayTab } from '@/components/forge/admin/phone/TodayTab';
import { fetchBugCounts, fetchContacts } from '@/data/crm-live';
import { fetchAdminReports } from '@/data/moderation-live';
import type { RangeKey } from '@/domain/admin/briefing';
import { todayKey } from '@/domain/admin/crm-core';
import { useQuery } from '@/lib/useQuery';

/**
 * The phone CRM, built to `Forge CRM Phone.dc.html` (Claude Design b029488a).
 *
 * The phone is for CHECKING AND ACTING, not deep work: five tabs (Today · Money · Bugs · People · More) on a
 * bottom bar with badges; a to-do opens straight onto the thing to do, as a full-screen page over the tab;
 * editors and filters are bottom sheets. All five tabs stay mounted (hidden when not current) so a tab keeps
 * its scroll and its open page when you switch away and back — the design's behaviour.
 *
 * Used under 900 px (`CrmShell` decides). The desktop layout is untouched.
 */
export function PhoneShell({ onExit }: { onExit: () => void }) {
  return (
    <CrmThemeProvider phone>
      <PhoneBody onExit={onExit} />
    </CrmThemeProvider>
  );
}

function PhoneBody({ onExit }: { onExit: () => void }) {
  const { c } = useCrm();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<PhoneTab>('today');
  const [stacks, setStacks] = useState<Partial<Record<PhoneTab, Overlay[]>>>({});
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [stamp, setStamp] = useState(0);
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());
  const [range, setRange] = useState<RangeKey>('30D');
  const [bugFilter, setBugFilter] = useState<BugFilter>(DEFAULT_BUG_FILTER);
  const [bugSeg, setBugSeg] = useState<'board' | 'reports' | 'crashes'>('board');
  const [moneySeg, setMoneySeg] = useState<'revenue' | 'users' | 'ai'>('revenue');
  const [userFilter, setUserFilter] = useState('all');
  const [contactFilter, setContactFilter] = useState('all');
  const [moreView, setMoreView] = useState<MoreView>('root');

  // Offline, from the browser's own signal. Native has no NetInfo in this app; it reads as online and a
  // failed save still says so.
  const [offline, setOffline] = useState(() => Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.onLine === false);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => () => {
    if (toastT.current) clearTimeout(toastT.current);
  }, []);

  const toast = useCallback((m: string) => {
    if (toastT.current) clearTimeout(toastT.current);
    setToastMsg(m);
    toastT.current = setTimeout(() => setToastMsg(null), 3000);
  }, []);

  // Badges. Re-read on every refresh, so marking a bug fixed clears the dot.
  const bugs = useQuery(() => fetchBugCounts(), [stamp]);
  const reports = useQuery(() => fetchAdminReports(1, 'open'), [stamp]);
  const contacts = useQuery(async () => ({ l: await fetchContacts(null, null), today: todayKey() }), [stamp]);
  const bugBadge = bugs.data ? bugs.data.active_critical + bugs.data.active_high : 0;
  const due = contacts.data ? contacts.data.l.rows.filter((r) => r.next_follow_up && r.next_follow_up <= contacts.data!.today).length : 0;
  const waiting = reports.data?.counts.open ?? 0;
  // Today's badge counts the same kinds of to-do the Today list shows (critical bugs, overdue follow-ups,
  // reports waiting, new reports or crashes), one per kind.
  const todos = (bugs.data?.active_critical ? 1 : 0) + (due ? 1 : 0) + (waiting ? 1 : 0);

  const ctx = useMemo<PhoneCtx>(
    () => ({
      tab,
      setTab: (t, opts) => {
        setSheet(null);
        if (opts?.clear) setStacks((st) => ({ ...st, [t]: [] }));
        setTab(t);
      },
      overlayOf: (t) => {
        const s = stacks[t];
        return s && s.length ? s[s.length - 1] : null;
      },
      open: (o, onTab) => {
        const t = onTab ?? tab;
        setStacks((st) => ({ ...st, [t]: o.from && o.from !== t ? [o] : [...(st[t] ?? []), o] }));
        setSheet(null);
        setTab(t);
      },
      back: () => {
        const cur = stacks[tab] ?? [];
        const top = cur[cur.length - 1];
        setStacks((st) => ({ ...st, [tab]: (st[tab] ?? []).slice(0, -1) }));
        // "‹ Today" means Today: a page opened from another tab goes back to that tab.
        if (top?.from && top.from !== tab && cur.length === 1) setTab(top.from);
      },
      sheet,
      openSheet: setSheet,
      closeSheet: () => setSheet(null),
      toast,
      offline,
      updatedAt,
      refresh: () => setStamp((n) => n + 1),
      stamp,
      markLoaded: () => setUpdatedAt(Date.now()),
      range,
      setRange,
      bugFilter,
      setBugFilter,
      bugSeg,
      setBugSeg,
      moneySeg,
      setMoneySeg,
      userFilter,
      setUserFilter,
      contactFilter,
      setContactFilter,
      moreView,
      setMoreView,
      exit: onExit,
    }),
    [tab, stacks, sheet, toast, offline, updatedAt, stamp, range, bugFilter, bugSeg, moneySeg, userFilter, contactFilter, moreView, onExit],
  );

  const cur = stacks[tab];
  const top = cur && cur.length ? cur[cur.length - 1] : null;
  const backLabel = top?.from ? TAB_NAME[top.from] : TAB_NAME[tab];

  const tabs: { key: PhoneTab; badge: number }[] = [
    { key: 'today', badge: todos },
    { key: 'money', badge: 0 },
    { key: 'bugs', badge: bugBadge },
    { key: 'people', badge: due },
    { key: 'more', badge: waiting },
  ];

  const fill: ViewStyle = { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 };

  return (
    <PhoneContext.Provider value={ctx}>
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        {/* The five tabs, all mounted. */}
        <View style={{ ...fill, bottom: TAB_BAR_H }}>
          {(['today', 'money', 'bugs', 'people', 'more'] as PhoneTab[]).map((t) => (
            <View key={t} style={[fill, { display: t === tab ? 'flex' : 'none' }]}>
              {t === 'today' ? <TodayTab /> : t === 'money' ? <MoneyTab /> : t === 'bugs' ? <BugsTab /> : t === 'people' ? <PeopleTab /> : <MoreTab />}
            </View>
          ))}
        </View>

        {/* The tab bar. */}
        <View
          accessibilityRole="tablist"
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: TAB_BAR_H, paddingBottom: Math.max(insets.bottom, 10), flexDirection: 'row', backgroundColor: c.side, borderTopWidth: 1, borderTopColor: c.line, zIndex: 4 }}
        >
          {tabs.map(({ key, badge }) => {
            const on = key === tab;
            const color = on ? c.brz : c.ink3;
            return (
              <Pressable
                key={key}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={badge ? `${TAB_NAME[key]}, ${badge} waiting` : TAB_NAME[key]}
                onPress={() => (key === tab && (stacks[key]?.length ?? 0) > 0 ? setStacks((st) => ({ ...st, [key]: [] })) : ctx.setTab(key))}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 }}
              >
                <TabIcon tab={key} color={color} />
                <Text style={{ fontSize: 11, fontWeight: '600', color }}>{TAB_NAME[key]}</Text>
                {badge ? (
                  <View style={{ position: 'absolute', top: 3, left: '50%', marginLeft: 6, minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9, backgroundColor: c.crit, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 11, color: '#FFFFFF', fontVariant: ['tabular-nums'] }}>{badge}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {/* The current tab's full-screen page, over everything including the tab bar. */}
        {top ? (
          <View style={[fill, { zIndex: 10 }]}>
            {top.kind === 'bug' ? (
              <BugOverlay id={top.id} backLabel={backLabel} />
            ) : top.kind === 'report' ? (
              <ReportOverlay id={top.id} backLabel={backLabel} />
            ) : top.kind === 'crash' ? (
              <CrashOverlay id={top.id} backLabel={backLabel} />
            ) : top.kind === 'contact' ? (
              <ContactOverlay id={top.id} backLabel={backLabel} />
            ) : top.kind === 'contactEdit' ? (
              <ContactEditOverlay id={top.id} backLabel={backLabel} />
            ) : top.kind === 'video' ? (
              <SocialVideoOverlay id={top.id} backLabel={backLabel} />
            ) : (
              <UserOverlay id={top.id} backLabel={backLabel} />
            )}
          </View>
        ) : null}

        {/* Bottom sheets. */}
        {sheet ? (
          <View style={[fill, { zIndex: 30 }]}>
            <Pressable accessibilityLabel="Close" onPress={() => setSheet(null)} style={[fill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '86%', borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: c.panel, borderTopWidth: 1, borderColor: c.panelBd }}>
              <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets>
                {sheet.kind === 'newIdea' ? (
                  <NewIdeaSheet />
                ) : sheet.kind === 'bugFilter' ? (
                  <BugFilterSheet />
                ) : sheet.kind === 'userFilter' ? (
                  <UserFilterSheet />
                ) : sheet.kind === 'newBug' ? (
                  <NewBugSheet />
                ) : sheet.kind === 'log' ? (
                  <LogSheet params={sheet.params} />
                ) : sheet.kind === 'docPick' ? (
                  <DocPickSheet />
                ) : (
                  <DocConfirmSheet params={sheet.params} />
                )}
              </ScrollView>
            </View>
          </View>
        ) : null}

        {toastMsg ? (
          <View
            pointerEvents="none"
            accessibilityRole="alert"
            style={{ position: 'absolute', left: 16, right: 16, bottom: TAB_BAR_H + 90, zIndex: 50, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, backgroundColor: c.tip, borderWidth: 1, borderColor: c.panelBd }}
          >
            <Text style={{ fontSize: 15, lineHeight: 21, color: c.ink }}>{toastMsg}</Text>
          </View>
        ) : null}
      </View>
    </PhoneContext.Provider>
  );
}

/** The design's five tab icons, drawn as it draws them. */
function TabIcon({ tab, color }: { tab: PhoneTab; color: string }) {
  const s = { stroke: color, strokeWidth: 1.6, strokeLinecap: 'round' as const, fill: 'none' };
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      {tab === 'today' ? (
        <>
          <Circle cx={12} cy={12} r={4} {...s} />
          <Path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" {...s} />
        </>
      ) : tab === 'money' ? (
        <>
          <Path d="M4 18l5-6 4 3 7-8" {...s} strokeLinejoin="round" />
          <Path d="M15 7h5v5" {...s} strokeLinejoin="round" />
        </>
      ) : tab === 'bugs' ? (
        <>
          <Rect x={8} y={6} width={8} height={13} rx={4} {...s} />
          <Path d="M12 10v9M8 11H4.5M16 11h3.5M8 15H4.5M16 15h3.5M9.5 6 8 3.5M14.5 6 16 3.5" {...s} />
        </>
      ) : tab === 'people' ? (
        <>
          <Circle cx={9} cy={8} r={3.2} {...s} />
          <Path d="M3 19c.6-3.3 3-5 6-5s5.4 1.7 6 5M15.5 5.2a3 3 0 0 1 0 5.6M17.5 14.3c1.8.7 3 2.3 3.4 4.7" {...s} />
        </>
      ) : (
        <>
          <Circle cx={5} cy={12} r={1.6} fill={color} />
          <Circle cx={12} cy={12} r={1.6} fill={color} />
          <Circle cx={19} cy={12} r={1.6} fill={color} />
        </>
      )}
    </Svg>
  );
}
