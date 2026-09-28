import { View } from 'react-native';

import { AdminBarChart, AdminLineChart } from '@/components/forge/admin/charts';
import { Block, Columns, deltaSub, ErrorText, Kpis, KV, Note, PageHead, QueryGate } from '@/components/forge/admin/crm-ui';
import type { PageProps } from '@/components/forge/admin/pages/types';
import { fetchAiUsage, fetchRevenue, fetchTiers } from '@/data/crm-live';
import { groupedNumber } from '@/domain/admin/chart-core';
import { aiMargin, actionLabel, money, pctText } from '@/domain/admin/crm-core';
import { column, rangeLabel } from '@/domain/admin/series';
import { useQuery } from '@/lib/useQuery';

/** Premium AI $19.99 vs Premium $14.99 — the list-price step up that AI use has to fit inside. */
const AI_PRICE_STEP = 5;

/**
 * AI usage: calls, tokens and dollars (AA-D14 — metered, never read). Nothing on this page can show a
 * prompt, a reply or a photo, because the RPC behind it never returns one.
 */
export function AiPage({ range, days, tz }: PageProps) {
  const q = useQuery(() => fetchAiUsage(days, tz), [days, tz]);
  const tiers = useQuery(() => fetchTiers(), []);
  const rev = useQuery(() => fetchRevenue(days, tz, false), [days, tz]);
  const a = q.data;

  // The window's cost scaled to 30 days. On a short window one heavy day swings this a lot.
  const runRate = a && a.days > 0 ? (a.cost_usd / a.days) * 30 : null;
  const cost = a ? deltaSub(a.cost_usd, a.cost_prev, rangeLabel(range)) : null;

  const premiumAi = tiers.data?.premium_ai ?? null;
  // max(1, …) so an empty tier shows the whole run-rate instead of dividing by zero.
  const perAiAthlete = runRate != null && premiumAi != null ? runRate / Math.max(1, premiumAi) : null;
  const margin = perAiAthlete != null ? aiMargin(AI_PRICE_STEP, perAiAthlete) : null;

  return (
    <View style={{ gap: 28 }}>
      <PageHead title="AI usage" lede="What Holt and the photo features cost to run. Metered, never read." />
      <QueryGate state={q}>
        {a ? (
          <>
            <Kpis
              items={[
                { label: 'AI cost', value: money(a.cost_usd), sub: cost?.sub, dir: cost?.dir, invert: true },
                { label: 'Calls', value: groupedNumber(a.calls), sub: `${groupedNumber(a.credits)} credits` },
                { label: 'Athletes using AI', value: groupedNumber(a.athletes) },
                { label: 'Cost per AI user', value: money(a.athletes > 0 ? a.cost_usd / a.athletes : null), sub: 'in this window' },
                { label: 'Monthly run-rate', value: money(runRate), sub: 'this window scaled to 30 days' },
                { label: 'All-time cost', value: money(a.cost_all) },
              ]}
            />

            <Block label="Cost per day" hint="USD, as metered on each call.">
              <AdminLineChart values={column(a.series, 'cost')} days={a.series.map((s) => s.d)} />
            </Block>

            <Columns>
              <Block label="By feature" hint="Bars are calls; cost and athletes follow.">
                <AdminBarChart
                  rows={a.by_action.map((x) => ({
                    label: actionLabel(x.action),
                    value: x.calls,
                    note: `· ${money(x.cost_usd)} · ${groupedNumber(x.athletes)} athlete${x.athletes === 1 ? '' : 's'}`,
                  }))}
                />
              </Block>
              <Block label="By model" hint="Bars are calls; cost follows.">
                <AdminBarChart rows={a.by_model.map((x) => ({ label: x.model, value: x.calls, note: `· ${money(x.cost_usd)}` }))} />
              </Block>
            </Columns>

            <Columns>
              <Block label="Spread per athlete" hint="Cost per athlete who used AI in this window.">
                <KV k="Median" v={money(a.per_athlete.median)} />
                <KV k="90th percentile" v={money(a.per_athlete.p90)} />
                <KV k="Highest" v={money(a.per_athlete.max)} />
                {/* The allowance is per credit period, not per window — it is the latest period's count. */}
                <KV k="Used their whole monthly allowance" v={groupedNumber(a.at_allowance)} />
                <KV k="Credits per period" v={a.credits_per_period != null ? groupedNumber(a.credits_per_period) : '—'} />
                {a.uncharged > 0 ? <KV k="Calls not charged to credits" v={groupedNumber(a.uncharged)} /> : null}
              </Block>
              <Block label="Tokens" hint="In this window.">
                <KV k="Input" v={groupedNumber(a.tokens.input)} />
                <KV k="Output" v={groupedNumber(a.tokens.output)} />
                <KV k="Cache read" v={groupedNumber(a.tokens.cache_read)} />
                <KV k="Cache write" v={groupedNumber(a.tokens.cache_write)} />
              </Block>
            </Columns>

            <Block label="Margin — a rough guide">
              {tiers.error ? <ErrorText>{tiers.error}</ErrorText> : null}
              <KV k="Athletes with Premium AI" v={premiumAi != null ? groupedNumber(premiumAi) : '—'} />
              <KV k="…of whom paying" v={rev.data ? groupedNumber(rev.data.paying.premium_ai) : '—'} />
              <KV k="AI run-rate per month" v={money(runRate)} />
              <KV k="AI cost per Premium AI athlete / month" v={money(perAiAthlete)} />
              <KV k="Premium AI price over Premium / month" v={money(AI_PRICE_STEP, { cents: true })} />
              <KV k="Left per Premium AI athlete / month" v={margin ? `${money(margin.margin, { cents: true })} (${pctText(margin.pct)})` : '—'} />
              <Note>
                A rough guide, not accounting. The run-rate counts every AI call, including free credits, testers and
                comped accounts, and divides it only by Premium AI athletes{premiumAi === 0 ? ' (none yet, so this is the whole run-rate)' : ''}.
                The $5.00 step is the list price ($19.99 vs $14.99) before Apple’s cut.
              </Note>
            </Block>

            <Note>
              AA-D14: AI usage is metered, never read. Calls, credits, tokens and dollars only — no prompts, replies or
              photos are visible here.
            </Note>
          </>
        ) : null}
      </QueryGate>
    </View>
  );
}
