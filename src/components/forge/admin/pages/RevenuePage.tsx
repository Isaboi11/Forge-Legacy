import { useState } from 'react';
import { View } from 'react-native';

import { AdminBarChart, AdminLineChart } from '@/components/forge/admin/charts';
import {
  Block,
  Chip,
  Columns,
  deltaSub,
  Empty,
  Kpis,
  KV,
  Note,
  PageHead,
  QueryGate,
  when,
} from '@/components/forge/admin/crm-ui';
import type { PageProps } from '@/components/forge/admin/pages/types';
import { fetchRevenue } from '@/data/crm-live';
import { groupedNumber } from '@/domain/admin/chart-core';
import { churnRate, money, netEstimate, pctText, productLabel, rate } from '@/domain/admin/crm-core';
import { column, rangeLabel } from '@/domain/admin/series';
import { useQuery } from '@/lib/useQuery';

/** "12 of 40 (30%)" — the count stays visible so a percentage of three people never reads as a trend. */
function ofText(num: number, den: number): string {
  return `${groupedNumber(num)} of ${groupedNumber(den)} (${pctText(rate(num, den))})`;
}

/**
 * Revenue, from RevenueCat's own price field (AA-D18). Gross everywhere, net only as a labelled
 * estimate, and TestFlight (sandbox) purchases out unless the operator switches them in — visibly.
 */
export function RevenuePage({ range, days, tz }: PageProps) {
  const [includeSandbox, setIncludeSandbox] = useState(false);
  const q = useQuery(() => fetchRevenue(days, tz, includeSandbox), [days, tz, includeSandbox]);
  const r = q.data;
  const note = rangeLabel(range);

  const head = (
    <PageHead
      title="Revenue"
      lede={
        includeSandbox
          ? "Gross, in USD, before Apple's cut — INCLUDING TestFlight (sandbox) purchases, which are not real money."
          : "Gross, in USD, before Apple's cut. TestFlight (sandbox) purchases are excluded."
      }
      right={<Chip label="Include TestFlight purchases" on={includeSandbox} onPress={() => setIncludeSandbox((v) => !v)} />}
    />
  );

  // `last_event_at` is across every store event, sandbox included — null means the webhook has never
  // delivered anything at all, which is a different state from "no revenue in this window".
  if (r && r.last_event_at == null) {
    return (
      <View style={{ gap: 28 }}>
        {head}
        <Empty>
          No purchase events have arrived yet. Revenue appears here once RevenueCat’s webhook delivers its first
          event.
        </Empty>
      </View>
    );
  }

  const gross = r ? deltaSub(r.gross, r.gross_prev, note) : null;
  const churn = r ? churnRate(r.churned, r.paying.total) : null;

  return (
    <View style={{ gap: 28 }}>
      {head}
      <QueryGate state={q}>
        {r ? (
          <>
            {!includeSandbox && r.gross_all === 0 && r.sandbox_events > 0 ? (
              <Note>
                Only TestFlight (sandbox) purchases have arrived so far ({groupedNumber(r.sandbox_events)} events). Switch
                on “Include TestFlight purchases” to see them.
              </Note>
            ) : null}
            <Kpis
              items={[
                {
                  label: 'Gross revenue',
                  value: money(r.gross),
                  sub: gross ? `${gross.sub} · before Apple's cut` : "before Apple's cut",
                  dir: gross?.dir,
                },
                { label: 'Net (estimate)', value: money(netEstimate(r.gross)), sub: "estimate at Apple's 15% cut" },
                { label: 'MRR', value: money(r.mrr), sub: 'active subscriptions, per month' },
                { label: 'ARR', value: money(r.mrr * 12), sub: 'MRR × 12' },
                {
                  label: 'Paying subscribers',
                  value: groupedNumber(r.paying.total),
                  sub: `${groupedNumber(r.paying.premium)} Premium · ${groupedNumber(r.paying.premium_ai)} Premium AI`,
                },
                { label: 'Active trials', value: groupedNumber(r.trials_active) },
                { label: 'New paid', value: groupedNumber(r.new_paid), sub: 'first payment in this window' },
                {
                  label: 'Churned',
                  value: groupedNumber(r.churned),
                  // Lapsed ÷ (still paying + lapsed): a base that can never read over 100%.
                  sub: `${pctText(churn)} churn in this window`,
                },
              ]}
            />

            <Block label="Revenue by day" hint="Gross per day, before Apple's cut. Refunds arrive as negative days.">
              <AdminLineChart values={column(r.series, 'gross')} days={r.series.map((s) => s.d)} />
            </Block>

            <Columns>
              <Block label="By product" hint="Gross in this window, rounded to the dollar.">
                <AdminBarChart
                  rows={r.by_product.map((p) => ({
                    label: productLabel(p.product),
                    value: Math.round(p.gross),
                    note: `· ${groupedNumber(p.events)} event${p.events === 1 ? '' : 's'}`,
                  }))}
                />
              </Block>
              <Block label="Conversion">
                <KV k="Paywall viewers → buyers" v={ofText(r.paywall_buyers, r.paywall_viewers)} />
                {/* Window ratio, not a cohort: a conversion here may belong to a trial started earlier. */}
                <KV k="Trial starts → converted" v={ofText(r.trial_conversions, r.trial_starts)} />
                <KV k="Ever paid, of all athletes" v={ofText(r.ever_paid, r.athletes_total)} />
                <KV k="Refunds in this window" v={money(r.refunds)} />
              </Block>
            </Columns>

            <Block label="Subscribers" hint="Plan counts are athletes; billing period counts are subscriptions.">
              <Columns>
                <AdminBarChart
                  rows={[
                    { label: 'Premium', value: r.paying.premium },
                    { label: 'Premium AI', value: r.paying.premium_ai },
                  ]}
                />
                <AdminBarChart
                  rows={[
                    { label: 'Monthly', value: r.paying.monthly },
                    { label: 'Annual', value: r.paying.annual },
                  ]}
                />
              </Columns>
            </Block>

            <Note>
              Figures come from RevenueCat’s price for each purchase event, in USD. Revenue is gross, before Apple’s cut;
              net is an estimate at the 15% Small Business Program rate. TestFlight (sandbox) purchases are{' '}
              {includeSandbox ? 'INCLUDED on this view' : 'excluded unless switched on above'}. MRR uses the latest real
              price paid for each product (annual ÷ 12), and the list price where none has been paid yet. Last purchase
              event: {when(r.last_event_at, true)}.
            </Note>
          </>
        ) : null}
      </QueryGate>
    </View>
  );
}
