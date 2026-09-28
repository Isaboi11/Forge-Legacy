import { View } from 'react-native';

import { AdminLineChart } from '@/components/forge/admin/charts';
import {
  Block,
  Columns,
  deltaSub,
  Empty,
  ErrorText,
  Kpis,
  ListRow,
  PageHead,
  QueryGate,
  RowMeta,
  RowTitle,
  type KpiProps,
  when,
} from '@/components/forge/admin/crm-ui';
import type { PageKey, PageProps } from '@/components/forge/admin/pages/types';
import { fetchAdminOverview } from '@/data/admin-live';
import { fetchAiUsage, fetchAppStore, fetchBugs, fetchContacts, fetchRevenue, fetchWaitlist } from '@/data/crm-live';
import { groupedNumber } from '@/domain/admin/chart-core';
import { churnRate, money, pctText, rate } from '@/domain/admin/crm-core';
import { column, rangeLabel } from '@/domain/admin/series';
import { useQuery } from '@/lib/useQuery';

/** A RevenueCat webhook that has gone quiet this long is worth a look (the events are the revenue). */
const STALE_EVENT_DAYS = 7;
const DAY_MS = 86_400_000;

interface Alert {
  key: string;
  title: string;
  meta: string;
  page: PageKey;
  arg?: string;
}

/**
 * The one-glance business summary. Every tile opens the page that explains it; "Needs attention" lists
 * only what is actually true right now, so an empty list is a real answer rather than a placeholder.
 */
export function OverviewPage({ range, days, tz, go }: PageProps) {
  // The clock is read when the answer arrives, not during render — "how stale is the webhook" is a
  // question about the data we were handed, and render must stay pure.
  const rev = useQuery(async () => ({ r: await fetchRevenue(days, tz, false), at: Date.now() }), [days, tz]);
  const ai = useQuery(() => fetchAiUsage(days, tz), [days, tz]);
  const ov = useQuery(() => fetchAdminOverview(days, tz), [days, tz]);
  const bugs = useQuery(() => fetchBugs(null, null, null), []);
  const wl = useQuery(() => fetchWaitlist(days, tz), [days, tz]);
  const asc = useQuery(() => fetchAppStore(days), [days]);
  const contacts = useQuery(() => fetchContacts(null, null), []);

  const note = rangeLabel(range);
  const r = rev.data?.r ?? null;

  const kpis: KpiProps[] = [];
  if (r) {
    const gross = deltaSub(r.gross, r.gross_prev, note);
    kpis.push(
      { label: 'MRR', value: money(r.mrr), sub: 'from active subscriptions', onPress: () => go('revenue') },
      {
        label: 'Paying subscribers',
        value: groupedNumber(r.paying.total),
        sub: `${groupedNumber(r.paying.premium)} Premium · ${groupedNumber(r.paying.premium_ai)} Premium AI`,
        onPress: () => go('revenue'),
      },
      {
        label: 'Revenue (gross)',
        value: money(r.gross),
        sub: gross ? `${gross.sub} · before Apple's cut` : "before Apple's cut",
        dir: gross?.dir,
        onPress: () => go('revenue'),
      },
    );
  }
  if (ai.data) {
    const d = deltaSub(ai.data.cost_usd, ai.data.cost_prev, note);
    kpis.push({ label: 'AI cost', value: money(ai.data.cost_usd), sub: d?.sub, dir: d?.dir, invert: true, onPress: () => go('ai') });
  }
  if (ov.data) {
    kpis.push({
      label: 'Athletes',
      value: groupedNumber(ov.data.tiles.athletesTotal),
      sub: `${groupedNumber(ov.data.tiles.signups)} new in this window`,
      onPress: () => go('users'),
    });
  }
  if (r) {
    kpis.push(
      // All-time: anyone who has ever paid, over every athlete. Not a window figure.
      { label: 'Free → paid', value: pctText(rate(r.ever_paid, r.athletes_total)), sub: `${groupedNumber(r.ever_paid)} ever paid`, onPress: () => go('revenue') },
      // Conversions in the window can come from trials that started before it, so this is a rough
      // window ratio, not a cohort — rate() keeps "no trials" as '—' rather than 0%.
      {
        label: 'Trial conversion',
        value: pctText(rate(r.trial_conversions, r.trial_starts)),
        sub: `${groupedNumber(r.trial_conversions)} of ${groupedNumber(r.trial_starts)} trials`,
        onPress: () => go('revenue'),
      },
      {
        label: 'Churn',
        value: pctText(churnRate(r.churned, r.paying.total)),
        sub: `${groupedNumber(r.churned)} lapsed in this window`,
        onPress: () => go('revenue'),
      },
    );
  }
  if (bugs.data) {
    const c = bugs.data.counts;
    kpis.push({
      label: 'Critical + high bugs',
      value: groupedNumber(c.active_critical + c.active_high),
      sub: `${groupedNumber(c.active_critical)} critical · ${groupedNumber(c.active_high)} high`,
      onPress: () => go('bugs'),
    });
  }
  if (wl.data) {
    kpis.push({
      label: 'Waitlist pending',
      value: groupedNumber(wl.data.total - wl.data.invited),
      sub: `of ${groupedNumber(wl.data.total)} signups`,
      onPress: () => go('contacts', 'tester'),
    });
  }
  if (asc.data) {
    const d = deltaSub(asc.data.downloads, asc.data.downloads_prev, note);
    const rt = asc.data.rating;
    kpis.push(
      { label: 'App Store downloads', value: groupedNumber(asc.data.downloads), sub: d?.sub, dir: d?.dir, onPress: () => go('appstore') },
      {
        label: 'Rating',
        value: rt?.avg != null ? `★ ${rt.avg.toFixed(1)}` : '—',
        sub: rt?.count != null ? `${groupedNumber(rt.count)} ratings` : 'no ratings synced',
        onPress: () => go('appstore'),
      },
    );
  }

  // ── Needs attention: computed, and only when true ──
  const alerts: Alert[] = [];
  if (bugs.data) {
    const b = bugs.data;
    if (b.counts.active_critical > 0) {
      alerts.push({
        key: 'crit',
        title: `${b.counts.active_critical} critical bug${b.counts.active_critical === 1 ? '' : 's'} open`,
        meta: 'Bug board',
        page: 'bugs',
      });
    }
    if (b.feedback_new > 0) {
      alerts.push({ key: 'fb', title: `${b.feedback_new} new bug report${b.feedback_new === 1 ? '' : 's'} from users`, meta: 'Not triaged yet', page: 'bugs' });
    }
    if (b.errors_new > 0) {
      alerts.push({ key: 'err', title: `${b.errors_new} new crash group${b.errors_new === 1 ? '' : 's'}`, meta: 'Not triaged yet', page: 'bugs' });
    }
  }
  if (contacts.data && contacts.data.counts.follow_up_due > 0) {
    const n = contacts.data.counts.follow_up_due;
    alerts.push({ key: 'fu', title: `${n} contact${n === 1 ? '' : 's'} due a follow-up`, meta: 'Contacts', page: 'contacts' });
  }
  if (r && rev.data) {
    const last = r.last_event_at ? Date.parse(r.last_event_at) : NaN;
    const age = Number.isNaN(last) ? null : Math.floor((rev.data.at - last) / DAY_MS);
    if (age == null) {
      alerts.push({ key: 'rc', title: 'No purchase events yet — check the RevenueCat webhook', meta: 'Revenue', page: 'revenue' });
    } else if (age > STALE_EVENT_DAYS) {
      alerts.push({ key: 'rc', title: `No purchase events in ${age} days — check the RevenueCat webhook`, meta: 'Revenue', page: 'revenue' });
    }
    if (r.gross_all === 0 && r.sandbox_events > 0) {
      alerts.push({
        key: 'sb',
        title: 'Only TestFlight (sandbox) purchases so far',
        meta: 'No real revenue has arrived yet — sandbox is excluded from every figure by default',
        page: 'revenue',
      });
    }
  }
  if (asc.data) {
    const ls = asc.data.last_sync;
    if (!ls) alerts.push({ key: 'asc', title: 'App Store Connect has never synced', meta: 'Connect the key to see downloads and reviews', page: 'appstore' });
    else if (!ls.ok) alerts.push({ key: 'asc', title: 'The last App Store sync failed', meta: ls.message ?? `on ${when(ls.ran_at, true)}`, page: 'appstore' });
  }

  // Secondary reads fail independently; name them rather than silently dropping their tiles.
  const failed = [
    ai.error && 'AI usage',
    ov.error && 'athletes',
    bugs.error && 'bugs',
    wl.error && 'waitlist',
    asc.error && 'App Store',
    contacts.error && 'contacts',
  ].filter(Boolean);

  return (
    <View style={{ gap: 28 }}>
      <PageHead title="Overview" lede="The business at a glance. Tap any figure to open the page behind it." />
      <QueryGate state={{ loading: rev.loading, error: rev.error, data: rev.data }}>
        <Kpis items={kpis} />
        {failed.length ? <ErrorText>Could not load: {failed.join(', ')}.</ErrorText> : null}
        <Columns ratio={[3, 2]}>
          <Block label="Revenue" hint={`Gross per day, before Apple's cut. TestFlight purchases excluded.`}>
            {r ? <AdminLineChart values={column(r.series, 'gross')} days={r.series.map((s) => s.d)} /> : null}
          </Block>
          <Block label="Needs attention">
            {alerts.length ? (
              alerts.map((a) => (
                <ListRow key={a.key} onPress={() => go(a.page, a.arg)} label={a.title}>
                  <RowTitle>{a.title}</RowTitle>
                  <RowMeta>{a.meta}</RowMeta>
                </ListRow>
              ))
            ) : (
              <Empty>Nothing needs you right now.</Empty>
            )}
          </Block>
        </Columns>
      </QueryGate>
    </View>
  );
}
