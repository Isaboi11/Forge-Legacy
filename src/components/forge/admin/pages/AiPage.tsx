import { View } from 'react-native';

import {
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
  type BarItem,
  type Figure,
} from '@/components/forge/admin/crm-ui';
import type { PageProps } from '@/components/forge/admin/pages/types';
import { fetchAiUsage, fetchTiers } from '@/data/crm-live';
import { deltaNote, int, lastLabel, RANGE_INFO, rollWeekly } from '@/domain/admin/briefing';
import { actionLabel, aiMargin, money, pctText } from '@/domain/admin/crm-core';
import { aiNote } from '@/domain/admin/notes/ai';
import { useQuery } from '@/lib/useQuery';

/** Premium AI over Premium, monthly list prices (Monetization amendment: $19.99 vs $14.99). */
const PRICE_OVER = 19.99 - 14.99;
const EMPTY = 'No AI calls yet. Costs show up as soon as someone uses Holt or a photo feature.';

/** "Since March" / "Since March 2025" (another year). */
function sinceLabel(iso: string | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return `Since ${d.toLocaleDateString('en-US', { month: 'long', ...(sameYear ? {} : { year: 'numeric' }) })}`;
}

/**
 * What Holt and the photo features cost to run (AA-D14 — metered, never read), and whether Premium AI
 * covers it.
 */
export function AiPage({ range, days, tz }: PageProps) {
  const q = useQuery(() => fetchAiUsage(days, tz), [days, tz]);
  // The run-rate is "at this week's pace" whatever the range, so it reads the last 7 days on its own.
  const week = useQuery(() => fetchAiUsage(7, tz), [tz]);
  const tiers = useQuery(() => fetchTiers(), []);
  const a = q.data;
  const t = tiers.data;
  const last = lastLabel(range);

  const empty = a ? a.calls === 0 && a.cost_all === 0 : false;
  const monthlyCost = a ? (a.cost_usd / Math.max(1, a.days)) * 30 : 0;

  const note = a
    ? aiNote({
        period: RANGE_INFO[range].label,
        days: a.days,
        calls: a.calls,
        cost: a.cost_usd,
        athletes: a.athletes,
        premiumAi: t ? t.premium_ai : null,
        priceOver: PRICE_OVER,
        byFeature: a.by_action.map((x) => ({ label: actionLabel(x.action), calls: x.calls, cost: x.cost_usd })),
      })
    : null;

  let figures: Figure[];
  if (a && !empty) {
    const d = deltaNote(a.cost_usd, a.cost_prev, range, { costUp: true });
    figures = [
      { label: 'AI cost', value: money(a.cost_usd), note: d?.text, tone: d?.tone },
      { label: 'Calls', value: int(a.calls), note: `${int(a.credits)} credits used` },
      { label: 'Athletes using AI', value: int(a.athletes), note: t ? `Of ${int(t.athletes_total)} athletes` : undefined },
      { label: 'Cost per AI user', value: a.athletes > 0 ? money(a.cost_usd / a.athletes) : '—', note: `${last[0].toUpperCase()}${last.slice(1)}` },
      {
        label: 'Monthly run-rate',
        value: week.data ? money((week.data.cost_usd / 7) * 30) : '—',
        note: week.data ? 'At this week’s pace' : week.error ? 'Couldn’t load this week' : undefined,
      },
      { label: 'All-time cost', value: money(a.cost_all), note: sinceLabel(a.first_at) },
    ];
  } else {
    const labels = ['AI cost', 'Calls', 'Athletes using AI', 'Cost per AI user', 'Monthly run-rate', 'All-time cost'];
    figures = labels.map((label) => ({ label, value: '—', note: empty ? 'No data yet' : undefined }));
  }

  const weekly = range === '1Y';
  const raw = a ? { values: a.series.map((s) => s.cost), days: a.series.map((s) => s.d) } : null;
  const series = raw && weekly ? rollWeekly(raw.values, raw.days) : raw;

  const features: BarItem[] = a
    ? [...a.by_action]
        .sort((x, y) => y.calls - x.calls)
        .map((x, i) => ({
          label: actionLabel(x.action),
          value: x.calls,
          note: i === 0 ? `· ${money(x.cost_usd)} · ${int(x.athletes)} ${x.athletes === 1 ? 'athlete' : 'athletes'}` : `· ${money(x.cost_usd)} · ${int(x.athletes)}`,
        }))
    : [];

  const failed = !!q.error && !a;
  const blankMsg = empty ? EMPTY : null;
  const windowMsg = blankMsg ?? (a && a.calls === 0 ? `No AI calls in the ${last}.` : null);

  // Margin: all AI cost is counted against Premium AI athletes, so the per-head cost is an upper bound.
  const premiumAi = t?.premium_ai ?? 0;
  const perHead = premiumAi > 0 ? monthlyCost / premiumAi : null;
  const margin = perHead != null ? aiMargin(PRICE_OVER, perHead) : null;

  return (
    <View>
      <PageHeader title="AI usage" purpose="What Holt and the photo features cost to run, and whether Premium AI covers it." note={note} />
      <HeroFigures hero={figures[0]} figures={figures.slice(1)} />
      <BlockGrid>
        <Full full>
          <Block
            label="Cost per day"
            sub="USD, as metered on each call."
            state={failed ? { error: `Couldn’t load AI usage. ${q.error}`, onRetry: q.refetch } : qState(q, blankMsg)}
            skeleton="chart"
          >
            {series ? <Chart values={series.values} days={series.days} fmt={money} weekly={weekly} /> : null}
          </Block>
        </Full>
        {failed ? null : (
          <Block label="By feature" sub="Bars are calls. Cost and athletes follow." state={qState(q, windowMsg)}>
            <Bars items={features} />
          </Block>
        )}
        {failed ? null : (
          <Block
            label="Margin"
            foot="A rough guide: list prices, before Apple’s cut. All AI cost is counted against Premium AI athletes, so the cost per athlete is the most it could be."
            state={
              tiers.error && !t
                ? { error: `Couldn’t load plan counts. ${tiers.error}`, onRetry: tiers.refetch }
                : {
                    loading: (q.loading && !a) || (tiers.loading && !t),
                    emptyMsg: a && t ? blankMsg ?? (premiumAi === 0 ? 'No Premium AI athletes yet, so there’s no margin to work out.' : null) : null,
                  }
            }
          >
            {perHead != null && margin ? (
              <Rows
                items={[
                  { label: 'AI cost per Premium AI athlete, per month', value: money(perHead) },
                  { label: 'Premium AI price over Premium', value: money(PRICE_OVER, { cents: true }) },
                  { label: 'Left over per athlete', value: `${money(margin.margin, { cents: true })} · ${pctText(margin.pct == null ? null : Math.round(margin.pct))}` },
                ]}
              />
            ) : null}
          </Block>
        )}
        {failed ? null : (
          <Block label="Spread per athlete" state={qState(q, windowMsg)}>
            {a ? (
              <Rows
                items={[
                  { label: 'Typical athlete', value: money(a.per_athlete.median) },
                  { label: 'Top 10%', value: money(a.per_athlete.p90) },
                  { label: 'Highest', value: money(a.per_athlete.max) },
                ]}
              />
            ) : null}
          </Block>
        )}
        {failed ? null : (
          <Block label="By model" state={qState(q, windowMsg ?? (a && !a.by_model.length ? `No AI calls in the ${last}.` : null))}>
            {/* Token totals are not returned per model, so the design's "1.9M tokens" note is left off. */}
            {a ? <Rows items={a.by_model.map((m) => ({ label: m.model, value: money(m.cost_usd) }))} /> : null}
          </Block>
        )}
      </BlockGrid>
      {a && !empty ? (
        <FootNote>Usage is metered, never read. No prompts or replies are stored where this page can see them. Costs under a cent show four decimals.</FootNote>
      ) : null}
    </View>
  );
}
