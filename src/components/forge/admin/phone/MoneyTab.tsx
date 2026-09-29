import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useCrm } from '@/components/forge/admin/crm-theme';
import { when } from '@/components/forge/admin/crm-ui';
import { usePhone } from '@/components/forge/admin/phone/context';
import {
  ChartHint,
  EmptyRow,
  ErrorRow,
  FigGrid,
  KVRow,
  Muted,
  OfflineLine,
  OverlayScreen,
  PhoneScroll,
  PInput,
  RangeSeg,
  ScreenTitle,
  ScrubChart,
  SectionHead,
  Seg,
  SERIF,
  SheetFrame,
  Skel,
  type PFig,
} from '@/components/forge/admin/phone/kit';
import { dashboardTz } from '@/data/admin-live';
import { fetchAiUsage, fetchBillingList, fetchRevenue, fetchTiers, fetchUserCard, searchUsers, type BillingFilter, type BillingRow, type UserCard } from '@/data/crm-live';
import { deltaNote, int, lastLabel, RANGE_INFO, rollWeekly } from '@/domain/admin/briefing';
import { actionLabel, aiMargin, churnRate, money, netEstimate, pctText, productLabel, storeEventLabel } from '@/domain/admin/crm-core';
import { planStatus, planWithoutProduct, type PlanStatus } from '@/domain/admin/notes/users';
import { isTestOnly } from '@/domain/admin/notes/revenue';
import { useQuery } from '@/lib/useQuery';

/**
 * Money (Forge CRM Phone.dc.html, MONEY): Revenue, Users & plans, and AI, over the same reads as the
 * desktop Revenue, Users and AI pages. Plus the Users filter sheet and one athlete's card.
 */

const EMPTY = 'No purchases recorded yet. The first one appears here within seconds of someone buying.';
const AI_EMPTY = 'No AI calls yet. Costs show up as soon as someone uses Holt or a photo feature.';
/** Premium AI over Premium, monthly list prices ($19.99 vs $14.99) — as the desktop AI page. */
const PRICE_OVER = 19.99 - 14.99;

const LISTS: { key: BillingFilter; label: string }[] = [
  { key: 'all', label: 'Newest' },
  { key: 'paying', label: 'Paying' },
  { key: 'trial', label: 'Trials' },
  { key: 'premium_ai', label: 'Premium AI' },
  { key: 'founder', label: 'Founders' },
  { key: 'comped', label: 'Comped' },
  { key: 'grant', label: 'Grants' },
  { key: 'lapsed', label: 'Lapsed' },
  { key: 'free', label: 'Free' },
];

const asFilter = (f: string): BillingFilter => (LISTS.some((l) => l.key === f) ? (f as BillingFilter) : 'all');
/** 'Athlete' is the profile default, not a name. */
const named = (n: string | null) => (n && n !== 'Athlete' ? n : null);

/** "40 of 93 · 43%". The count stays visible so a percentage of three people never reads as a trend. */
function ofPct(n: number, d: number): string {
  if (!(d > 0)) return n > 0 ? int(n) : 'None yet';
  return `${int(n)} of ${int(d)} · ${Math.round((n / d) * 100)}%`;
}

function useStatusColor() {
  const { c } = useCrm();
  return (s: PlanStatus) => (s === 'Paying' ? c.good : s === 'Trial' ? c.warn : s === 'Lapsed' ? c.critInk : c.ink3);
}

export function MoneyTab() {
  const { moneySeg, setMoneySeg } = usePhone();
  return (
    <PhoneScroll>
      <ScreenTitle title="Money" right={moneySeg !== 'users' ? <RangeSeg /> : null} />
      <OfflineLine />
      <View style={{ marginTop: 14 }}>
        <Seg
          options={[
            { key: 'revenue', label: 'Revenue' },
            { key: 'users', label: 'Users & plans' },
            { key: 'ai', label: 'AI' },
          ]}
          value={moneySeg}
          onChange={setMoneySeg}
        />
      </View>
      {moneySeg === 'revenue' ? <RevenueSeg /> : moneySeg === 'users' ? <UsersSeg /> : <AiSeg />}
    </PhoneScroll>
  );
}

// ── Revenue ────────────────────────────────────────────────────────────────

function Hero({ label, value, delta, deltaColor }: { label: string; value: string; delta?: string | null; deltaColor?: string }) {
  const { c } = useCrm();
  return (
    <View style={{ marginTop: 26 }}>
      <Text style={{ fontSize: 14, color: c.ink3 }}>{label}</Text>
      <Text style={{ fontFamily: SERIF, fontSize: 46, lineHeight: 51, marginTop: 4, color: value === '—' ? c.ink3 : c.ink, fontVariant: ['tabular-nums', 'lining-nums'] }}>{value}</Text>
      {delta ? <Text style={{ fontSize: 14, marginTop: 4, color: deltaColor ?? c.ink3 }}>{delta}</Text> : null}
    </View>
  );
}

function RevenueSeg() {
  const { c } = useCrm();
  const { range, stamp, markLoaded } = usePhone();
  const days = RANGE_INFO[range].days;
  const tz = dashboardTz();
  const last = lastLabel(range);
  const q = useQuery(async () => {
    const v = await fetchRevenue(days, tz, false);
    markLoaded();
    return v;
  }, [days, tz, stamp]);
  const r = q.data;

  if (!r) {
    return q.error ? <ErrorRow msg={`Couldn’t load revenue. ${q.error}`} onRetry={q.refetch} /> : <Skel lines={5} />;
  }

  const testOnly = isTestOnly({ includeSandbox: false, productionEvents: r.production_events, sandboxPurchases: r.sandbox_purchases });
  const blank = r.production_events === 0;
  const d = blank ? null : deltaNote(r.gross, r.gross_prev, range);
  const deltaText = blank
    ? testOnly
      ? `Test purchases only: ${int(r.sandbox_purchases)} TestFlight ${r.sandbox_purchases === 1 ? 'buy' : 'buys'}, none of it real money.`
      : 'No purchases yet.'
    : (d?.text ?? `— Nothing in the ${RANGE_INFO[range].prior} to compare.`);

  const weekly = range === '1Y';
  const raw = { values: r.series.map((s) => s.gross), days: r.series.map((s) => s.d) };
  const series = weekly ? rollWeekly(raw.values, raw.days) : raw;

  const churn = churnRate(r.churned, r.paying.total);
  const figs: PFig[] = blank
    ? ['MRR', 'Net (est.)', 'Trials', 'Churn'].map((label) => ({ label, value: '—', note: testOnly ? 'Only test purchases so far' : 'No data yet' }))
    : [
        { label: 'MRR', value: money(r.mrr), note: 'Per month, now' },
        { label: 'Net (est.)', value: money(netEstimate(r.gross)), note: 'After Apple’s 15%' },
        { label: 'Trials', value: int(r.trials_active), note: `${int(r.trials_ending_7d)} ending in 7 days` },
        { label: 'Churn', value: pctText(churn), note: churn == null ? 'No subscribers yet' : `${int(r.churned)} cancelled` },
      ];

  return (
    <View>
      <Hero
        label={`Revenue, gross · ${last}`}
        value={blank ? '—' : money(r.gross)}
        delta={deltaText}
        deltaColor={d?.tone === 'good' ? c.good : d?.tone === 'bad' ? c.critInk : c.ink3}
      />
      {blank ? (
        <EmptyRow>{testOnly ? 'No real purchases yet. TestFlight buys are free test purchases, so they’re left out of every number here. Your first real purchase will show the moment it happens.' : EMPTY}</EmptyRow>
      ) : (
        <>
          <ChartHint />
          <ScrubChart values={series.values} days={series.days} fmt={money} weekly={weekly} />
        </>
      )}
      <View style={{ marginTop: 22 }}>
        <FigGrid figs={figs} />
      </View>

      <SectionHead label={`By product · ${last}`} />
      {blank || !r.by_product.length ? (
        <EmptyRow>{blank ? 'Nothing sold yet.' : `No purchases in the ${last}.`}</EmptyRow>
      ) : (
        r.by_product.map((p) => <KVRow key={p.product} label={productLabel(p.product)} note={`${int(p.events)} bought`} value={money(p.gross)} />)
      )}

      <SectionHead label={`Conversion · ${last}`} />
      <KVRow label="Saw the paywall → bought" value={ofPct(r.paywall_buyers, r.paywall_viewers)} />
      <KVRow label="Trial → paid" value={ofPct(r.trial_conversions, r.trial_starts)} />
      <KVRow label="Refunds" value={r.refunds_count === 0 ? 'None' : `${int(r.refunds_count)} · ${money(r.refunds)}`} />
    </View>
  );
}

// ── Users & plans ──────────────────────────────────────────────────────────

function planText(r: BillingRow): string {
  return r.product ? productLabel(r.product) : planWithoutProduct(r);
}

function UsersSeg() {
  const { c } = useCrm();
  const { userFilter, openSheet, open, stamp, markLoaded } = usePhone();
  const statusColor = useStatusColor();
  const filter = asFilter(userFilter);

  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const onSearch = (v: string) => {
    setText(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setQ(v.trim()), 300);
  };

  const tiers = useQuery(() => fetchTiers(), [stamp]);
  const list = useQuery<BillingRow[]>(async () => {
    const v = q ? await searchUsers(q) : await fetchBillingList(filter);
    markLoaded();
    return v;
  }, [q, filter, stamp]);
  const rows = list.data ?? [];
  const total = q ? null : (tiers.data?.lists[filter] ?? null);
  const label = LISTS.find((l) => l.key === filter)?.label ?? 'All';

  const count = q
    ? `${int(rows.length)} ${rows.length === 1 ? 'match' : 'matches'} for “${q}”`
    : filter === 'all'
      ? `${total != null ? `${int(total)} athletes · ` : ''}newest first · showing ${int(rows.length)}`
      : `${total != null ? `${int(total)} ${label.toLowerCase()} · ` : ''}latest change first · showing ${int(rows.length)}`;

  return (
    <View>
      <View style={{ marginTop: 18, flexDirection: 'row', gap: 10 }}>
        <PInput
          value={text}
          onChangeText={onSearch}
          placeholder="Search name or @handle"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={{ flex: 1, minWidth: 0 }}
        />
        <Pressable
          onPress={() => openSheet({ kind: 'userFilter' })}
          accessibilityRole="button"
          accessibilityLabel={`Show: ${filter === 'all' ? 'everyone' : label}`}
          style={{ height: 48, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: c.fieldBd, justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 15, color: c.ink }}>{filter === 'all' ? 'All' : label} ▾</Text>
        </Pressable>
      </View>
      {list.data ? <Muted style={{ marginTop: 14 }}>{count}</Muted> : null}
      {list.error && !list.data ? (
        <ErrorRow msg={`Couldn’t load this list. ${list.error}`} onRetry={list.refetch} />
      ) : !list.data ? (
        <Skel lines={5} />
      ) : rows.length === 0 ? (
        <EmptyRow>{q ? 'No one matches that search.' : 'Nobody on this list yet.'}</EmptyRow>
      ) : (
        rows.map((r) => {
          const st = planStatus(r);
          const name = named(r.name);
          return (
            <Pressable
              key={r.id}
              onPress={() => open({ kind: 'user', id: r.id })}
              accessibilityRole="button"
              accessibilityLabel={name ?? r.handle ?? 'Athlete'}
              style={({ pressed }) => [
                { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line },
                pressed && { backgroundColor: c.hover },
              ]}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '500', color: name ? c.ink : c.ink3 }}>
                  {name ?? 'Not named yet'}
                </Text>
                <Text numberOfLines={1} style={{ marginTop: 2, fontSize: 14, color: c.ink3 }}>
                  {r.handle ? `@${r.handle}` : 'No handle'} · {planText(r)}
                </Text>
              </View>
              <Text style={{ fontSize: 13, color: statusColor(st) }}>{st}</Text>
              <Text style={{ fontSize: 22, color: c.ink3 }}>›</Text>
            </Pressable>
          );
        })
      )}
    </View>
  );
}

export function UserFilterSheet() {
  const { c } = useCrm();
  const { userFilter, setUserFilter, closeSheet, stamp } = usePhone();
  const tiers = useQuery(() => fetchTiers(), [stamp]);
  const current = asFilter(userFilter);
  return (
    <SheetFrame title="Show" onClose={closeSheet}>
      {tiers.error && !tiers.data ? <Muted style={{ marginTop: 8 }}>Couldn’t load the counts. {tiers.error}</Muted> : null}
      <View style={{ marginTop: 8 }}>
        {LISTS.map((l) => {
          const on = l.key === current;
          const n = tiers.data?.lists[l.key];
          return (
            <Pressable
              key={l.key}
              onPress={() => {
                setUserFilter(l.key);
                closeSheet();
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 50, borderBottomWidth: 1, borderBottomColor: c.line }}
            >
              <Text style={{ fontSize: 16, color: on ? c.brz : c.ink }}>{l.label}</Text>
              <Text style={{ fontSize: 16, color: c.ink3, fontVariant: ['tabular-nums'] }}>
                {n != null ? int(n) : tiers.data ? '—' : ''}
                {on ? <Text style={{ color: c.brz }}> ✓</Text> : null}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SheetFrame>
  );
}

// ── AI ─────────────────────────────────────────────────────────────────────

function AiSeg() {
  const { c } = useCrm();
  const { range, stamp, markLoaded } = usePhone();
  const days = RANGE_INFO[range].days;
  const tz = dashboardTz();
  const last = lastLabel(range);
  const q = useQuery(async () => {
    const v = await fetchAiUsage(days, tz);
    markLoaded();
    return v;
  }, [days, tz, stamp]);
  const tiers = useQuery(() => fetchTiers(), [stamp]);
  const a = q.data;
  const t = tiers.data;

  if (!a) {
    return q.error ? <ErrorRow msg={`Couldn’t load AI usage. ${q.error}`} onRetry={q.refetch} /> : <Skel lines={5} />;
  }

  const empty = a.calls === 0 && a.cost_all === 0;
  const d = empty ? null : deltaNote(a.cost_usd, a.cost_prev, range, { costUp: true });
  const weekly = range === '1Y';
  const raw = { values: a.series.map((s) => s.cost), days: a.series.map((s) => s.d) };
  const series = weekly ? rollWeekly(raw.values, raw.days) : raw;

  const feats = [...a.by_action].sort((x, y) => y.cost_usd - x.cost_usd);
  const fmax = Math.max(0, ...feats.map((f) => f.cost_usd));

  // Margin, as the desktop AI page: all AI cost is counted against Premium AI athletes (an upper bound).
  const monthlyCost = (a.cost_usd / Math.max(1, a.days)) * 30;
  const premiumAi = t?.premium_ai ?? 0;
  const perHead = premiumAi > 0 ? monthlyCost / premiumAi : null;
  const m = perHead != null ? aiMargin(PRICE_OVER, perHead) : null;
  const marginText = empty
    ? null
    : !t
      ? tiers.error
        ? `Couldn’t load plan counts, so the margin can’t be worked out. ${tiers.error}`
        : null
      : perHead == null || !m
        ? 'No Premium AI athletes yet, so there’s no margin to work out.'
        : `At this pace AI costs about ${money(perHead)} a month per Premium AI athlete, against the ${money(PRICE_OVER, { cents: true })} Premium AI charges over Premium. That leaves ${money(m.margin, { cents: true })} per athlete${m.pct != null ? ` (${pctText(Math.round(m.pct))})` : ''}. All AI cost is counted against Premium AI athletes, so this is the most it could be.`;

  return (
    <View>
      <Hero
        label={`AI cost · ${last}`}
        value={empty ? '—' : money(a.cost_usd)}
        delta={empty ? null : (d?.text ?? `— Nothing in the ${RANGE_INFO[range].prior} to compare.`)}
        deltaColor={d?.tone === 'bad' ? c.warn : d?.tone === 'good' ? c.good : c.ink3}
      />
      {empty ? (
        <EmptyRow>{AI_EMPTY}</EmptyRow>
      ) : (
        <>
          <ChartHint />
          <ScrubChart values={series.values} days={series.days} fmt={money} weekly={weekly} />
          <SectionHead label={`By feature · ${last}`} />
          {feats.length === 0 ? (
            <EmptyRow>No AI calls in the {last}.</EmptyRow>
          ) : (
            feats.map((f, i) => (
              <View key={f.action} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.line }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <Text style={{ fontSize: 16, color: c.ink, flexShrink: 1 }}>
                    <Text style={{ color: c.ink3 }}>{i + 1}  </Text>
                    {actionLabel(f.action)}
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: c.ink, fontVariant: ['tabular-nums'] }}>{money(f.cost_usd)}</Text>
                </View>
                <View style={{ marginTop: 8, height: 4, borderRadius: 2, backgroundColor: c.track }}>
                  <View style={{ height: 4, borderRadius: 2, width: `${fmax > 0 ? (f.cost_usd / fmax) * 100 : 0}%`, backgroundColor: c.brz, opacity: 0.7 }} />
                </View>
              </View>
            ))
          )}
        </>
      )}
      {marginText ? <Text style={{ marginTop: 20, fontSize: 15, lineHeight: 22.5, color: c.ink2 }}>{marginText}</Text> : null}
    </View>
  );
}

// ── One athlete's card ─────────────────────────────────────────────────────

interface KV {
  k: string;
  v: string;
}

/** Only what admin_user_card returns (AA-D12/13) — the same sections as the desktop card. */
function cardSections(u: UserCard, now: number): { label: string; rows: KV[] }[] {
  const b = u.billing;
  const live = b.subscriptions.find((s) => s.expires_at && new Date(s.expires_at).getTime() > now) ?? null;
  const paidEnds = b.subscriptions.filter((s) => s.ever_paid && s.expires_at).map((s) => s.expires_at as string).sort();
  const lastPaid = paidEnds[paidEnds.length - 1] ?? null;

  const plan = live
    ? `${productLabel(live.product_id)}${live.period_type === 'TRIAL' ? ' · trial' : ''}${live.environment === 'SANDBOX' ? ' · test' : ''}`
    : planWithoutProduct({ tier: b.tier, premium_kind: b.premium_kind, premium_ai: b.premium_ai, founder_seat: b.founder_seat, comped: b.comped_tester, product: null, period_type: null, last_paid_until: null });
  const renew: KV = live
    ? { k: live.period_type === 'TRIAL' ? 'Trial ends' : 'Renews', v: when(live.expires_at) }
    : lastPaid
      ? { k: 'Ended', v: when(lastPaid) }
      : b.premium_until
        ? { k: 'Until', v: when(b.premium_until) }
        : { k: 'Renews', v: '—' };

  const billing: KV[] = [
    { k: 'Plan', v: plan },
    renew,
    { k: 'Premium AI', v: b.premium_ai ? (b.premium_ai_until ? `Yes · until ${when(b.premium_ai_until)}` : 'Yes') : 'No' },
    { k: 'Founder seat', v: b.founder_seat != null ? `Yes · seat ${b.founder_seat}` : 'No' },
    { k: 'Paid, all time', v: money(b.paid_total, { cents: true }) },
  ];

  const purchases: KV[] = b.events.length
    ? b.events.slice(0, 6).map((e) => ({
        k: `${when(e.received_at)} · ${storeEventLabel(e.type)}${e.product ? `, ${productLabel(e.product)}` : ''}${e.environment === 'SANDBOX' ? ' · test' : ''}`,
        v: e.price != null ? money(e.price, { cents: true }) : '—',
      }))
    : [{ k: 'No purchases', v: '—' }];

  const top = u.ai.last30_by_action.slice(0, 2);
  const ai: KV[] = [
    { k: 'Credits used', v: int(u.ai.last30.credits) },
    { k: 'Cost', v: money(u.ai.last30.cost) },
    ...(top.length ? [{ k: top.map((x) => actionLabel(x.action)).join(' · '), v: top.map((x) => money(x.cost_usd)).join(' · ') }] : []),
  ];

  const support: KV[] = [
    { k: 'Bug reports sent', v: int(u.support.feedback.filter((f) => f.kind === 'BUG').length) },
    { k: 'Crashes', v: int(u.support.errors) },
  ];

  return [
    { label: 'Billing', rows: billing },
    { label: 'Purchases', rows: purchases },
    { label: 'AI · last 30 days', rows: ai },
    { label: 'Support', rows: support },
  ];
}

/** The card's status, by the roster's own rule (`planStatus`), from the card's subscriptions. */
function cardStatus(u: UserCard, now: number): PlanStatus {
  const b = u.billing;
  const live = b.subscriptions.find((s) => s.expires_at && new Date(s.expires_at).getTime() > now) ?? null;
  const paidEnds = b.subscriptions.filter((s) => s.ever_paid && s.expires_at).map((s) => s.expires_at as string).sort();
  return planStatus({
    tier: b.tier,
    premium_kind: b.premium_kind,
    premium_ai: b.premium_ai,
    founder_seat: b.founder_seat,
    comped: b.comped_tester,
    product: live?.product_id ?? null,
    period_type: live?.period_type ?? null,
    last_paid_until: live ? null : (paidEnds[paidEnds.length - 1] ?? null),
  });
}

export function UserOverlay({ id, backLabel }: { id: string; backLabel: string }) {
  const { c } = useCrm();
  const { back, stamp } = usePhone();
  const statusColor = useStatusColor();
  // `at` = when it was read: "is this subscription still live" is judged against that, not a render-time clock.
  const card = useQuery(async () => ({ u: await fetchUserCard(id), at: Date.now() }), [id, stamp]);
  const u = card.data && card.data.u.account.id === id ? card.data.u : null;
  const at = card.data?.at ?? 0;
  const st = u ? cardStatus(u, at) : null;
  const name = u && u.account.named && u.account.name ? u.account.name : null;

  return (
    <OverlayScreen backLabel={backLabel} onBack={back}>
      {card.error && !u ? (
        <ErrorRow msg={`Couldn’t load this account. ${card.error}`} onRetry={card.refetch} />
      ) : !u || !st ? (
        <Skel lines={6} />
      ) : (
        <>
          <Text style={{ fontSize: 14, color: statusColor(st) }}>{st}</Text>
          <Text style={{ fontFamily: SERIF, fontSize: 28, marginTop: 6, color: name ? c.ink : c.ink3 }}>{name ?? 'Not named yet'}</Text>
          <Text style={{ marginTop: 4, fontSize: 15, color: c.ink2 }}>
            {u.account.handle ? `@${u.account.handle}` : 'No handle'} · joined {when(u.account.created_at)}
          </Text>
          {cardSections(u, at).map((s) => (
            <View key={s.label}>
              <SectionHead label={s.label} style={{ marginTop: 24 }} />
              {s.rows.map((r, i) => (
                <KVRow key={`${r.k}${i}`} label={r.k} value={r.v} />
              ))}
            </View>
          ))}
          <Text style={{ marginTop: 24, fontSize: 13, lineHeight: 19.5, color: c.ink3 }}>
            This card shows account, billing, AI use and support only. Training, photos, nutrition, health and activity stay private.
          </Text>
        </>
      )}
    </OverlayScreen>
  );
}
