import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useCrm } from '@/components/forge/admin/crm-theme';
import {
  Chart,
  DISPLAY,
  DISPLAY_M,
  FigureList,
  HoverRow,
  SectionLabel,
  Skeleton,
  useLayout,
  type Figure,
} from '@/components/forge/admin/crm-ui';
import type { PageKey, PageProps } from '@/components/forge/admin/pages/types';
import { fetchAdminOverview } from '@/data/admin-live';
import { fetchAiUsage, fetchAppStore, fetchBugs, fetchContacts, fetchRevenue, fetchWaitlist } from '@/data/crm-live';
import { fetchAdminReports } from '@/data/moderation-live';
import { buildBriefing, deltaNote, int, lastLabel, rollWeekly, type AttentionItem } from '@/domain/admin/briefing';
import { churnRate, money, netEstimate, pctText, rate, todayKey } from '@/domain/admin/crm-core';
import { parseSyncMessage } from '@/domain/admin/notes/appstore';
import { useQuery } from '@/lib/useQuery';

const DAY_MS = 86_400_000;
const REFRESH_MS = 60_000;
/**
 * Premium AI's monthly list price. `admin_revenue` returns MRR as one total, not per product, so the
 * Premium AI share cannot be split out of it — the briefing's "what Premium AI brings in" is therefore
 * paying Premium AI subscribers × the monthly LIST price (an annual subscriber pays less per month).
 */
const PREMIUM_AI_MONTHLY = 19.99;

/** Stamp each answer with when it arrived — "Updated N s ago" is about the data, and render stays pure. */
async function stamped<T>(p: Promise<T>): Promise<{ v: T; at: number }> {
  const v = await p;
  return { v, at: Date.now() };
}

const wholeDays = (from: number, to: number) => Math.max(0, Math.floor((to - from) / DAY_MS));

/** "Sunday 28 September". */
function longDate(ms: number): string {
  const d = new Date(ms);
  return `${d.toLocaleDateString('en-US', { weekday: 'long' })} ${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'long' })}`;
}

/**
 * The morning briefing: what happened, what needs you, and the figures behind it. Every sentence is
 * built by `buildBriefing` from the reads below; every figure opens the page that explains it.
 */
export function OverviewPage({ range, days, tz, go }: PageProps) {
  const { c } = useCrm();
  const { lg, sm } = useLayout();
  const [briefOpen, setBriefOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const rev = useQuery(() => stamped(fetchRevenue(days, tz, false)), [days, tz]);
  const ai = useQuery(() => stamped(fetchAiUsage(days, tz)), [days, tz]);
  const ov = useQuery(() => stamped(fetchAdminOverview(days, tz)), [days, tz]);
  const bugs = useQuery(() => stamped(fetchBugs('active', 'critical', null)), []);
  const wl = useQuery(() => stamped(fetchWaitlist(days, tz)), [days, tz]);
  const asc = useQuery(() => stamped(fetchAppStore(days)), [days]);
  const contacts = useQuery(() => stamped(fetchContacts(null, null)), []);
  const reports = useQuery(
    () =>
      stamped(
        fetchAdminReports(50, 'open').then((r) => {
          if (!r) throw new Error('Couldn’t load reports.');
          return r;
        }),
      ),
    [],
  );

  // "Refreshes every minute": the interval only asks for new data; nothing is set synchronously here.
  const refetches = [rev.refetch, ai.refetch, ov.refetch, bugs.refetch, wl.refetch, asc.refetch, contacts.refetch, reports.refetch];
  const [r1, r2, r3, r4, r5, r6, r7, r8] = refetches;
  useEffect(() => {
    const id = setInterval(() => [r1, r2, r3, r4, r5, r6, r7, r8].forEach((f) => f()), REFRESH_MS);
    return () => clearInterval(id);
  }, [r1, r2, r3, r4, r5, r6, r7, r8]);
  // The clock behind "Updated N s ago" and the briefing's day counts.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  const r = rev.data?.v ?? null;
  const a = ai.data?.v ?? null;
  const o = ov.data?.v ?? null;
  const b = bugs.data?.v ?? null;
  const w = wl.data?.v ?? null;
  const s = asc.data?.v ?? null;
  const k = contacts.data?.v ?? null;
  const rep = reports.data?.v ?? null;

  const stamps = [rev, ai, ov, bugs, wl, asc, contacts, reports].map((x) => x.data?.at ?? 0);
  const lastLoad = Math.max(...stamps);
  const secs = lastLoad ? Math.max(0, Math.round((now - lastLoad) / 1000)) : null;
  const updatedLabel =
    secs == null ? 'Loading · refreshes every minute' : secs < 10 ? 'Updated just now · refreshes every minute' : `Updated ${secs} s ago · refreshes every minute`;

  // ── Briefing inputs, all from the reads above ──
  const hasMoney = r ? r.production_events > 0 : false;
  const oldestCritical = b?.rows.length ? Math.min(...b.rows.map((x) => Date.parse(x.created_at)).filter((t) => !Number.isNaN(t))) : null;
  const today = todayKey(new Date(now));
  const overdue = k
    ? k.rows
        .filter((x) => x.next_follow_up && x.next_follow_up <= today)
        .map((x) => ({
          id: x.id,
          name: x.name || x.company || x.email || 'a contact',
          daysOver: Math.max(0, Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${x.next_follow_up}T00:00:00Z`)) / DAY_MS)),
        }))
    : null;
  const ls = s?.last_sync ?? null;
  const ascConfigured = s ? ls != null && parseSyncMessage(ls.message).missing.length === 0 : null;
  const lastEvent = r?.last_event_at ? Date.parse(r.last_event_at) : NaN;

  const brief = r
    ? buildBriefing({
        now: new Date(now),
        range,
        gross: r.gross,
        grossPrev: r.gross_prev,
        paying: r.paying.total,
        newPaid: r.new_paid,
        churned: r.churned,
        productionEvents: r.production_events,
        sandboxPurchases: r.sandbox_purchases,
        lastPurchaseDaysAgo: Number.isNaN(lastEvent) ? null : wholeDays(lastEvent, now),
        aiCost: a?.cost_usd ?? null,
        aiCostPrev: a?.cost_prev ?? null,
        aiRevenueMonthly: r.paying.premium_ai * PREMIUM_AI_MONTHLY,
        criticalOpen: b?.counts.active_critical ?? null,
        oldestCriticalDays: oldestCritical != null && Number.isFinite(oldestCritical) ? wholeDays(oldestCritical, now) : null,
        newUserReports: b?.feedback_new ?? null,
        newCrashGroups: b?.errors_new ?? null,
        reportsWaiting: rep?.counts.open ?? null,
        oldestReportDays: rep?.counts.oldestOpenAt ? wholeDays(Date.parse(rep.counts.oldestOpenAt), now) : null,
        overdue,
        downloads: s?.downloads ?? null,
        downloadsPrev: s?.downloads_prev ?? null,
        rating: s?.rating?.avg ?? null,
        ascConfigured,
        // A sync that never had its secrets is "not connected", not "failed".
        ascLastOk: ascConfigured && ls ? ls.ok : null,
        ascMessage: ls?.message ?? null,
      })
    : null;

  const paras = brief ? [brief.summary, ...(briefOpen && brief.watching ? [brief.watching] : [])] : [];
  const watchCount = brief?.watching ? (brief.watching.startsWith('Two') ? 2 : 1) : 0;

  const openItem = (it: AttentionItem) => {
    if (it.dest === 'bugs:reports') go('bugs', 'reports');
    else if (it.dest === 'contacts') go('contacts', it.arg);
    else go(it.dest as PageKey);
  };
  const tagColor = (t: AttentionItem['tone']) => (t === 'crit' ? c.crit : t === 'warn' ? c.warn : c.ink2);

  // ── Figure lists ──
  const na = (q: { error: string | null }): Pick<Figure, 'value' | 'note'> => ({ value: '—', note: q.error ? 'Couldn’t load' : undefined });
  const noMoney = r && !hasMoney ? { value: '—', note: 'No data yet' } : null;
  const toRev = () => go('revenue');

  const moneyRows: Figure[] = [
    r ? noMoney ?? { value: money(r.mrr), note: 'From active subscriptions' } : na(rev),
    r ? noMoney ?? { value: int(r.paying.total), note: `${int(r.paying.premium)} Premium · ${int(r.paying.premium_ai)} Premium AI` } : na(rev),
    r ? noMoney ?? { value: pctText(churnRate(r.churned, r.paying.total)), note: `${int(r.churned)} lapsed in the ${lastLabel(range)}` } : na(rev),
    r
      ? noMoney ?? { value: pctText(rate(r.trial_conversions, r.trial_starts)), note: `${int(r.trial_conversions)} of ${int(r.trial_starts)} trials converted` }
      : na(rev),
  ].map((f, i) => ({ ...f, label: ['MRR', 'Paying subscribers', 'Churn', 'Trial conversion'][i], onPress: toRev }));

  const dl = s ? deltaNote(s.downloads, s.downloads_prev, range) : null;
  const aiD = a ? deltaNote(a.cost_usd, a.cost_prev, range, { costUp: true }) : null;
  const growth: Figure[] = [
    { label: 'App Store downloads', ...(s ? { value: int(s.downloads), note: dl?.text, tone: dl?.tone } : na(asc)), onPress: () => go('appstore') },
    { label: 'New athletes', ...(o ? { value: int(o.tiles.signups), note: `${int(o.tiles.athletesTotal)} athletes in total` } : na(ov)), onPress: () => go('users') },
    { label: 'Waitlist pending', ...(w ? { value: int(w.total - w.invited), note: `Of ${int(w.total)} website signups` } : na(wl)), onPress: () => go('appstore') },
    {
      label: 'Rating',
      ...(s
        ? s.rating?.avg != null
          ? { value: `★ ${s.rating.avg.toFixed(1)}`, note: s.rating.count != null ? `${int(s.rating.count)} ratings` : undefined }
          : { value: '—', note: 'No public rating yet' }
        : na(asc)),
      onPress: () => go('appstore'),
    },
  ];
  const health: Figure[] = [
    {
      label: 'Critical + high bugs',
      ...(b ? { value: int(b.counts.active_critical + b.counts.active_high), note: `${int(b.counts.active_critical)} critical · ${int(b.counts.active_high)} high` } : na(bugs)),
      onPress: () => go('bugs'),
    },
    { label: 'AI cost', ...(a ? { value: money(a.cost_usd), note: aiD?.text, tone: aiD?.tone } : na(ai)), onPress: () => go('ai') },
    {
      label: 'Free → paid',
      ...(r ? { value: pctText(rate(r.ever_paid, r.athletes_total)), note: `${int(r.ever_paid)} of ${int(r.athletes_total)} have ever paid` } : na(rev)),
      onPress: toRev,
    },
    // `errors_new` = crash groups nobody has triaged, first seen in the last 14 days (admin_bugs).
    { label: 'New crash groups', ...(b ? { value: int(b.errors_new), note: 'Not triaged · last 14 days' } : na(bugs)), onPress: () => go('bugs', 'crashes') },
  ];

  // ── Revenue hero + chart ──
  const heroDelta = r && hasMoney ? deltaNote(r.gross, r.gross_prev, range) : null;
  const weekly = range === '1Y';
  const raw = r ? { values: r.series.map((x) => x.gross), days: r.series.map((x) => x.d) } : null;
  const series = raw && weekly ? rollWeekly(raw.values, raw.days) : raw;
  const revFailed = !!rev.error && !r;

  const chartMsg = (text: string, color: string, retry?: () => void) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 14, paddingVertical: 24, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.line }}>
      <Text style={{ fontSize: 14.5, lineHeight: 22.5, color, flexShrink: 1 }}>{text}</Text>
      {retry ? (
        <Text onPress={retry} accessibilityRole="button" style={{ fontSize: 13.5, fontWeight: '600', color: c.ink, borderBottomWidth: 1, borderBottomColor: c.fieldBd }}>
          Try again
        </Text>
      ) : null}
    </View>
  );

  return (
    <View>
      {/* ── Briefing ── */}
      <View style={{ gap: 6, paddingTop: 28, paddingBottom: 32 }}>
        <Text style={{ fontSize: 13, color: c.ink3 }}>
          {longDate(now)} · your briefing · {lastLabel(range)}
        </Text>
        <Text accessibilityRole="header" style={{ marginTop: 6, fontFamily: DISPLAY, fontSize: 40, lineHeight: 46, letterSpacing: -0.3, color: c.ink }}>
          {brief ? brief.greeting : revFailed ? 'Couldn’t load your briefing.' : ' '}
        </Text>
        <View style={{ gap: 14, marginTop: 16, maxWidth: 760 }}>
          {brief ? (
            <>
              {paras.map((p) => (
                <Text key={p} style={{ fontSize: 17, lineHeight: 28, color: c.ink2 }}>
                  {p}
                </Text>
              ))}
              {brief.watching ? (
                <Text
                  onPress={() => setBriefOpen((v) => !v)}
                  accessibilityRole="button"
                  style={{ alignSelf: 'flex-start', fontSize: 14, fontWeight: '500', color: c.ink2, borderBottomWidth: 1, borderBottomColor: c.line, paddingBottom: 2 }}
                >
                  {briefOpen ? 'Show less' : watchCount === 2 ? 'Two things I’m watching' : 'One thing I’m watching'}
                </Text>
              ) : null}
            </>
          ) : revFailed ? (
            chartMsg(rev.error ?? '', c.crit, rev.refetch)
          ) : (
            <Skeleton msg="Loading your briefing…" />
          )}
        </View>
      </View>

      {/* ── What I'd do today ── */}
      <View style={{ gap: 4, paddingBottom: 36 }}>
        <SectionLabel
          label="What I’d do today"
          right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.good }} />
              <Text style={{ fontSize: 12, color: c.ink3, fontVariant: ['tabular-nums'] }}>{updatedLabel}</Text>
            </View>
          }
        />
        {!brief ? null : brief.attention.length ? (
          <>
            {brief.attention.map((it, i) => (
              <HoverRow key={`${it.dest}-${it.title}`} onPress={() => openItem(it)} label={it.title} style={{ paddingVertical: 16 }}>
                <Text style={{ width: 32, fontFamily: DISPLAY, fontSize: 22, color: c.ink3 }}>{i + 1}</Text>
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 10 }}>
                    <Text style={{ fontSize: 15.5, fontWeight: '500', color: c.ink }}>{it.title}</Text>
                    <Text style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: tagColor(it.tone) }}>{it.tag}</Text>
                  </View>
                  <Text style={{ fontSize: 13.5, lineHeight: 20, color: c.ink3 }}>{it.meta}</Text>
                </View>
                <Text style={{ fontSize: 13, fontWeight: '500', color: c.ink2 }}>{it.destLabel} ›</Text>
              </HoverRow>
            ))}
            {brief.signoff ? <Text style={{ paddingTop: 14, fontSize: 14, color: c.ink3 }}>{brief.signoff}</Text> : null}
          </>
        ) : (
          <Text style={{ paddingVertical: 16, fontSize: 15, color: c.ink2, borderBottomWidth: 1, borderBottomColor: c.line }}>
            Nothing on your plate today. Everything is running on its own, so enjoy the quiet.
          </Text>
        )}
      </View>

      {/* ── Revenue hero + Money ── */}
      <View style={{ flexDirection: lg ? 'row' : 'column', gap: lg ? 56 : 36, paddingBottom: 44, alignItems: lg ? 'flex-start' : 'stretch' }}>
        <View style={{ flex: lg ? 1.75 : undefined, minWidth: 0, gap: 18 }}>
          <Pressable onPress={toRev} accessibilityRole="link" accessibilityLabel="Open revenue" style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, color: c.ink2 }}>Revenue, gross · {lastLabel(range)}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 18 }}>
              <Text style={{ fontFamily: DISPLAY_M, fontSize: 60, lineHeight: 64, color: r && hasMoney ? c.ink : c.ink3, fontVariant: ['tabular-nums', 'lining-nums'] }}>
                {r && hasMoney ? money(r.gross) : '—'}
              </Text>
              {heroDelta ? (
                <Text style={{ fontSize: 14, fontWeight: '600', color: heroDelta.tone === 'good' ? c.good : heroDelta.tone === 'bad' ? c.crit : c.ink3 }}>{heroDelta.text}</Text>
              ) : null}
            </View>
            {r ? (
              <Text style={{ fontSize: 13, color: c.ink3 }}>
                {hasMoney ? `About ${money(netEstimate(r.gross))} net after Apple’s 15% (estimate)` : 'No purchases recorded yet. The first one appears here within seconds.'}
              </Text>
            ) : null}
          </Pressable>
          {revFailed ? (
            chartMsg(`Couldn’t load daily revenue. ${rev.error}`, c.crit, rev.refetch)
          ) : !r ? (
            <Skeleton kind="chart" msg="Chart still loading. Everything else is ready." />
          ) : !hasMoney ? (
            chartMsg('Revenue per day will show here after the first purchase.', c.ink2)
          ) : series ? (
            <Chart values={series.values} days={series.days} fmt={money} weekly={weekly} />
          ) : null}
        </View>
        <View style={{ flex: lg ? 1 : undefined, minWidth: 0 }}>
          <FigureList label="Money" rows={moneyRows} />
        </View>
      </View>

      {/* ── Growth + Health ── */}
      <View style={{ flexDirection: sm ? 'column' : 'row', gap: lg ? 56 : 36, alignItems: 'flex-start' }}>
        <View style={{ flex: sm ? undefined : 1, alignSelf: 'stretch', minWidth: 0 }}>
          <FigureList label="Growth" rows={growth} />
        </View>
        <View style={{ flex: sm ? undefined : 1, alignSelf: 'stretch', minWidth: 0 }}>
          <FigureList label="Health" rows={health} />
        </View>
      </View>
    </View>
  );
}
