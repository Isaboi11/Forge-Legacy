import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { Btn, Chip, DISPLAY, ErrorLine, HeroFigures, HoverRow, Input, PageHeader, Panel, Skeleton, useLayout, useToast, when, type Figure } from '@/components/forge/admin/crm-ui';
import { useCrm } from '@/components/forge/admin/crm-theme';
import type { PageProps } from '@/components/forge/admin/pages/types';
import { fetchBillingList, fetchTiers, fetchUserCard, saveContact, searchUsers, type BillingFilter, type BillingRow, type UserCard } from '@/data/crm-live';
import { int } from '@/domain/admin/briefing';
import { actionLabel, money, productLabel, storeEventLabel } from '@/domain/admin/crm-core';
import { planStatus, planWithoutProduct, usersNote, type PlanStatus } from '@/domain/admin/notes/users';
import { rawErrorMessage as errorMessage, useQuery } from '@/lib/useQuery';

/**
 * Users & plans (Forge CRM.dc.html, the USERS section; Admin-Analytics-Amendment-002, AA-D12).
 *
 * ══ ⚠ THE PRIVACY CEILING ══
 *
 * The card draws ONLY what `admin_user_card` returns — account, billing, AI metering, support and
 * business. AA-D13: training, photos, nutrition, health and activity stay dark, and no successor RPC or
 * screen may add them. A new section here is a new decision against a locked one.
 */

const CHIPS: { key: BillingFilter; label: string }[] = [
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

/** 'Athlete' is the profile default, not a name (the card's `named` uses the same rule). */
const named = (n: string | null) => (n && n !== 'Athlete' ? n : null);

function planText(r: BillingRow): string {
  return r.product ? productLabel(r.product) : planWithoutProduct(r);
}

export function UsersPage(props: PageProps) {
  const { c } = useCrm();
  const { lg } = useLayout();
  const toast = useToast();

  const tiers = useQuery(fetchTiers, []);
  const [filter, setFilter] = useState<BillingFilter>('all');
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

  const list = useQuery<BillingRow[]>(() => (q ? searchUsers(q) : fetchBillingList(filter)), [q, filter]);
  const rows: BillingRow[] = list.data ?? [];

  // undefined = nothing picked yet, so a user id passed by `go` opens first; null = "the top row" (after a chip).
  const [picked, setPicked] = useState<string | null | undefined>(undefined);
  const selectedId = (picked === undefined ? props.arg : picked) ?? rows[0]?.id ?? null;
  // `at` = when it was read: "is this subscription still live" is judged against that, not a render-time clock.
  const card = useQuery(async () => (selectedId ? { u: await fetchUserCard(selectedId), at: Date.now() } : null), [selectedId]);

  const [adding, setAdding] = useState(false);
  const [addErr, setAddErr] = useState<string | null>(null);

  const t = tiers.data;
  const hero: Figure = t ? { label: 'Athletes', value: int(t.athletes_total), note: `${int(t.new_30d)} new in 30 days` } : { label: 'Athletes', value: '—', note: tiers.error ? 'Couldn’t load' : undefined };
  const fig = (label: string, v: number | undefined, note?: string): Figure => ({ label, value: v == null ? '—' : int(v), note });
  const figures: Figure[] = [
    fig('Free', t?.free),
    // `premium` excludes Premium AI (admin_tiers), so it says so rather than reading as everyone on Premium.
    fig('Premium', t?.premium, t ? 'Not counting Premium AI' : undefined),
    fig('Premium AI', t?.premium_ai, t && t.ai_without_premium > 0 ? `Plus ${int(t.ai_without_premium)} on Free` : undefined),
    fig('Founder seats', t?.founder_seats),
    fig('Comped testers', t?.comped_testers),
  ];
  const note = t ? usersNote({ athletes: t.athletes_total, new30: t.new_30d, paying: t.lists.paying, trials: t.lists.trial, lapsed: t.lists.lapsed }) : null;

  const total = q ? null : (t?.lists[filter] ?? null);
  const showing = q
    ? `${rows.length} ${rows.length === 1 ? 'match' : 'matches'} for “${q}”`
    : `Showing ${int(rows.length)}${total != null && total > rows.length ? ` of ${int(total)}` : ''} · ${filter === 'all' ? 'newest first' : 'latest change first'}`;

  const statusColor = (s: PlanStatus) => (s === 'Paying' ? c.good : s === 'Trial' ? c.warn : s === 'Lapsed' ? c.crit : c.ink3);

  const addContact = async (u: UserCard) => {
    setAdding(true);
    setAddErr(null);
    try {
      const id = await saveContact(null, { kind: 'user', name: u.account.name ?? u.account.handle ?? '', athlete_id: u.account.id, stage: 'active' });
      toast('Added to contacts');
      props.go('contacts', id);
    } catch (e) {
      setAddErr('Couldn’t save. Check your connection and tap again.');
      if (__DEV__) console.warn('add contact failed', errorMessage(e));
    } finally {
      setAdding(false);
    }
  };

  const errLine = (msg: string, retry: () => void) => (
    <View style={{ paddingBottom: 14 }}>
      <ErrorLine onRetry={retry}>{msg}</ErrorLine>
    </View>
  );

  const listPane = (
    <View style={{ gap: 14, minWidth: 0, flex: lg ? 1 : undefined }}>
      <Input
        value={text}
        onChangeText={onSearch}
        placeholder="Search by handle, name or id"
        autoCapitalize="none"
        autoCorrect={false}
        style={{ height: 42, paddingHorizontal: 14, fontSize: 14.5 }}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {CHIPS.map((ch) => (
          <Chip
            key={ch.key}
            label={ch.label}
            count={t ? int(t.lists[ch.key] ?? 0) : null}
            on={!q && filter === ch.key}
            onPress={() => {
              setFilter(ch.key);
              setText('');
              setQ('');
              setPicked(null);
            }}
          />
        ))}
      </View>
      {list.data ? <Text style={{ fontSize: 12.5, color: c.ink3, paddingTop: 4 }}>{showing}</Text> : null}
      <View style={{ borderTopWidth: 1, borderTopColor: c.line }}>
        {list.error ? (
          errLine(`Couldn’t load this list. ${list.error}`, list.refetch)
        ) : list.loading && !list.data ? (
          <Skeleton />
        ) : rows.length === 0 ? (
          <Text style={{ paddingVertical: 18, fontSize: 14.5, lineHeight: 22.5, color: c.ink2 }}>
            {q ? 'Nobody matches that handle, name or id.' : 'Nobody on this list yet.'}
          </Text>
        ) : (
          rows.map((r) => {
            const st = planStatus(r);
            return (
              <HoverRow
                key={r.id}
                onPress={() => {
                  setPicked(r.id);
                  setAddErr(null);
                }}
                selected={r.id === selectedId}
                label={r.name ?? r.handle ?? r.id}
                bleed={12}
                style={{ marginHorizontal: 0, paddingVertical: 13 }}
              >
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '500', color: named(r.name) ? c.ink : c.ink3 }}>
                    {named(r.name) ?? 'Not named yet'}
                  </Text>
                  <Text numberOfLines={1} style={{ fontSize: 13, color: c.ink3 }}>
                    {r.handle ? `@${r.handle}` : 'No handle'} · joined {when(r.created_at)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 3 }}>
                  <Text style={{ fontSize: 13.5, color: c.ink2 }}>{planText(r)}</Text>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: statusColor(st) }}>{st}</Text>
                </View>
              </HoverRow>
            );
          })
        )}
      </View>
    </View>
  );

  // A card from the previous pick stays in `data` until the new one lands; never show it under a new name.
  const u = card.data && card.data.u.account.id === selectedId ? card.data.u : null;
  const readAt = card.data?.at ?? 0;
  const cardPane = (
    <Panel sticky pad={26} gap={22} style={lg ? { width: 440, flexShrink: 0 } : undefined}>
      {!selectedId ? (
        <Text style={{ fontSize: 14.5, color: c.ink2 }}>Pick someone on the list to see their account.</Text>
      ) : card.error ? (
        errLine(`Couldn’t load this account. ${card.error}`, card.refetch)
      ) : !u ? (
        <Skeleton />
      ) : (
        <>
          <View style={{ gap: 4 }}>
            <Text style={{ fontFamily: DISPLAY, fontSize: 26, fontWeight: '600', color: u.account.named && u.account.name ? c.ink : c.ink3 }}>
              {u.account.named && u.account.name ? u.account.name : 'Not named yet'}
            </Text>
            <Text style={{ fontSize: 13.5, color: c.ink3 }}>
              {u.account.handle ? `@${u.account.handle}` : 'No handle'} · id {u.account.id.slice(0, 8)} · joined {when(u.account.created_at)}
            </Text>
          </View>
          {cardSections(u, readAt).map((s) => (
            <View key={s.label}>
              <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: c.ink3, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: c.line }}>
                {s.label}
              </Text>
              {s.rows.map((r, i) => (
                <View key={`${r.k}${i}`} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: c.line }}>
                  <Text style={{ fontSize: 13.5, color: c.ink2, flexShrink: 1 }}>{r.k}</Text>
                  <Text style={{ fontSize: 13.5, fontWeight: '500', color: c.ink, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{r.v}</Text>
                </View>
              ))}
            </View>
          ))}
          <View style={{ gap: 8 }}>
            <Btn
              full
              label={u.business.contact_id ? 'Open contact' : 'Add to contacts'}
              busy={adding}
              onPress={() => (u.business.contact_id ? props.go('contacts', u.business.contact_id) : void addContact(u))}
            />
            {addErr ? <Text style={{ fontSize: 13.5, color: c.crit }}>{addErr}</Text> : null}
          </View>
          <Text style={{ fontSize: 12.5, lineHeight: 19.4, color: c.ink3 }}>Training, photos, nutrition, health and activity are never shown here.</Text>
        </>
      )}
    </Panel>
  );

  return (
    <View>
      <PageHeader title="Users & plans" purpose="Who is on which plan, and one person’s account, billing, AI and support history." note={note} />
      <HeroFigures hero={hero} figures={figures} />
      <View style={{ flexDirection: lg ? 'row' : 'column', gap: lg ? 36 : 24, alignItems: 'flex-start' }}>
        {listPane}
        <View style={{ alignSelf: lg ? 'flex-start' : 'stretch' }}>{cardPane}</View>
      </View>
    </View>
  );
}

// ── The card's sections — only what admin_user_card returns ─────────────────

interface KV {
  k: string;
  v: string;
}

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
    // Production purchases only (admin_user_card): TestFlight buys never count as money paid.
    { k: 'Lifetime paid', v: money(b.paid_total, { cents: true }) },
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
