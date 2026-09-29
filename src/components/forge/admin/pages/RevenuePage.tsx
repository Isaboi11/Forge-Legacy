import { useState } from 'react';
import { View } from 'react-native';

import {
  Banner,
  Bars,
  Block,
  BlockGrid,
  Chart,
  FootNote,
  Full,
  HeroFigures,
  PageHeader,
  qState,
  Rows,
  when,
  type BarItem,
  type Figure,
} from '@/components/forge/admin/crm-ui';
import type { PageProps } from '@/components/forge/admin/pages/types';
import { fetchRevenue } from '@/data/crm-live';
import { deltaNote, int, lastLabel, RANGE_INFO, rollWeekly } from '@/domain/admin/briefing';
import { churnRate, money, netEstimate, pctText, productLabel } from '@/domain/admin/crm-core';
import { isTestOnly, revenueNote } from '@/domain/admin/notes/revenue';
import { useQuery } from '@/lib/useQuery';

const EMPTY = 'No purchases recorded yet. The first one appears here within seconds of someone buying.';
const TEST_ONLY_EMPTY = 'No real purchases yet. Test purchases are hidden so they don’t inflate the numbers.';
const NOBODY = 'Nobody is paying right now.';

/** "40 of 93 · 43%". The count stays visible so a percentage of three people never reads as a trend. */
function ofPct(n: number, d: number): string {
  if (!(d > 0)) return n > 0 ? int(n) : 'None yet';
  return `${int(n)} of ${int(d)} · ${Math.round((n / d) * 100)}%`;
}

/** "today at 9:14 AM" / "Sep 27, 2:14 PM". */
function arrived(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return when(iso, true);
  if (d.toDateString() === new Date().toDateString()) return `today at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  return when(iso, true);
}

/**
 * Revenue, from RevenueCat's own price on each event (AA-D18). Gross everywhere; net only as a labelled
 * estimate; TestFlight (sandbox) buys out unless switched in — and then a banner says so.
 */
export function RevenuePage({ range, days, tz }: PageProps) {
  const [tf, setTf] = useState(false);
  const q = useQuery(() => fetchRevenue(days, tz, tf), [days, tz, tf]);
  const r = q.data;
  const last = lastLabel(range);

  const testOnly = r ? isTestOnly({ includeSandbox: tf, productionEvents: r.production_events, sandboxPurchases: r.sandbox_purchases }) : false;
  // Nothing at all to show: no real events and, with the toggle on, no test buys either.
  const empty = r ? !testOnly && r.production_events === 0 && !(tf && r.sandbox_purchases > 0) : false;
  const blank = testOnly || empty;

  const note = r
    ? revenueNote({
        period: RANGE_INFO[range].label,
        prior: RANGE_INFO[range].prior,
        includeSandbox: tf,
        gross: r.gross,
        grossPrev: r.gross_prev,
        productionEvents: r.production_events,
        sandboxPurchases: r.sandbox_purchases,
        byProduct: r.by_product.map((p) => ({ label: productLabel(p.product), gross: p.gross, events: p.events })),
      })
    : null;

  const banner = tf
    ? 'TestFlight purchases are included. They are free test buys, so every number on this page is higher than what you actually earned.'
    : testOnly && r
      ? `Showing test data only. ${int(r.sandbox_purchases)} TestFlight ${r.sandbox_purchases === 1 ? 'purchase' : 'purchases'}, $0 in real revenue. Turn on “Include TestFlight purchases” to see them.`
      : null;

  let figures: Figure[];
  if (r && !blank) {
    const d = deltaNote(r.gross, r.gross_prev, range);
    const churn = churnRate(r.churned, r.paying.total);
    figures = [
      { label: 'Gross revenue', value: money(r.gross), note: d?.text, tone: d?.tone },
      { label: 'Net (estimate)', value: money(netEstimate(r.gross)), note: 'At Apple’s 15% rate' },
      { label: 'MRR', value: money(r.mrr), note: 'Active subscriptions, per month' },
      { label: 'ARR', value: money(r.mrr * 12), note: 'MRR × 12' },
      { label: 'Paying subscribers', value: int(r.paying.total), note: `${int(r.paying.premium)} Premium · ${int(r.paying.premium_ai)} Premium AI` },
      { label: 'Active trials', value: int(r.trials_active), note: `${int(r.trials_ending_7d)} ending in the next 7 days` },
      { label: 'New paid', value: int(r.new_paid), note: `First payment in the ${last}` },
      { label: 'Churned', value: int(r.churned), note: churn == null ? 'No subscribers yet' : `${pctText(churn)} of subscribers` },
    ];
  } else {
    const labels = ['Gross revenue', 'Net (estimate)', 'MRR', 'ARR', 'Paying subscribers', 'Active trials', 'New paid', 'Churned'];
    const n = testOnly ? 'Only test purchases so far' : empty ? 'No data yet' : undefined;
    figures = labels.map((label) => ({ label, value: '—', note: n }));
  }

  // The 1Y range plots weeks, as the design does.
  const weekly = range === '1Y';
  const raw = r ? { values: r.series.map((s) => s.gross), days: r.series.map((s) => s.d) } : null;
  const series = raw && weekly ? rollWeekly(raw.values, raw.days) : raw;

  const products: BarItem[] = r
    ? r.by_product.map((p, i) => ({
        label: productLabel(p.product),
        value: p.gross,
        display: money(p.gross),
        note: i === 0 ? `· ${int(p.events)} ${p.events === 1 ? 'purchase' : 'purchases'}` : `· ${int(p.events)}`,
      }))
    : [];

  const blankMsg = blank ? (testOnly ? TEST_ONLY_EMPTY : EMPTY) : null;
  // One read feeds the whole page: when it fails, the first section carries the error and retry and the
  // rest stay out of the way instead of repeating it four times.
  const failed = !!q.error && !r;
  const subsMsg = blankMsg ?? (r && r.paying.total === 0 ? NOBODY : null);

  return (
    <View>
      <PageHeader
        title="Revenue"
        purpose="How much you’re making, from what, and whether people stay."
        note={note}
        actions={[{ label: tf ? 'TestFlight purchases included' : 'Include TestFlight purchases', kind: 'quiet', on: tf, onPress: () => setTf((v) => !v) }]}
      />
      {banner ? <Banner>{banner}</Banner> : null}
      <HeroFigures hero={figures[0]} figures={figures.slice(1)} />
      <BlockGrid>
        <Full full>
          <Block
            label="Revenue per day"
            sub="Gross, before Apple’s cut. A refund is subtracted on the day it happened."
            state={failed ? { error: `Couldn’t load revenue. ${q.error}`, onRetry: q.refetch } : qState(q, blankMsg)}
            skeleton="chart"
          >
            {series ? <Chart values={series.values} days={series.days} fmt={money} weekly={weekly} /> : null}
          </Block>
        </Full>
        {failed ? null : (
          <Block label="By product" sub={`Gross in the ${last}.`} state={qState(q, blankMsg ?? (products.length ? null : `No purchases in the ${last}.`))}>
            <Bars items={products} />
          </Block>
        )}
        {failed ? null : (
          <Block label="Conversion" state={qState(q, blankMsg)}>
            {r ? (
              <Rows
                items={[
                  { label: 'Saw the paywall → bought', value: ofPct(r.paywall_buyers, r.paywall_viewers) },
                  { label: 'Started a trial → paid', value: ofPct(r.trial_conversions, r.trial_starts) },
                  { label: 'Ever paid, of all athletes', value: ofPct(r.ever_paid, r.athletes_total) },
                  { label: 'Refunds', value: r.refunds_count === 0 ? 'None' : `${int(r.refunds_count)} · ${money(r.refunds)}`, note: `In the ${last}` },
                ]}
              />
            ) : null}
          </Block>
        )}
        {failed ? null : (
          <Block label="Subscribers by plan" state={qState(q, subsMsg)}>
            {r ? (
              <Bars
                items={[
                  { label: 'Premium', value: r.paying.premium },
                  { label: 'Premium AI', value: r.paying.premium_ai },
                ]}
              />
            ) : null}
          </Block>
        )}
        {failed ? null : (
          <Block label="Subscribers by billing" state={qState(q, subsMsg)}>
            {r ? (
              <Bars
                items={[
                  { label: 'Monthly', value: r.paying.monthly },
                  { label: 'Annual', value: r.paying.annual },
                ]}
              />
            ) : null}
          </Block>
        )}
      </BlockGrid>
      {r && !blank ? (
        <FootNote>
          From RevenueCat’s price on every purchase event. MRR uses the latest real price per product.
          {r.last_event_at ? ` The last RevenueCat event arrived ${arrived(r.last_event_at)}.` : ''}
        </FootNote>
      ) : null}
    </View>
  );
}
