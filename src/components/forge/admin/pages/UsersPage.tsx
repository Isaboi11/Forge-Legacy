import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { flColor, flFont, flText } from '@/constants/foundation';
import { AdminBarChart } from '@/components/forge/admin/charts';
import {
  Block,
  Btn,
  Chip,
  Chips,
  Columns,
  Empty,
  ErrorText,
  Field,
  KV,
  Kpis,
  ListRow,
  Note,
  PageHead,
  Panel,
  QueryGate,
  RowMeta,
  RowTitle,
  Tag,
  useWide,
  when,
} from '@/components/forge/admin/crm-ui';
import type { PageProps } from '@/components/forge/admin/pages/types';
import { fetchRecentSignups } from '@/data/admin-live';
import {
  fetchBillingList,
  fetchTiers,
  fetchUserCard,
  saveContact,
  searchUsers,
  type BillingFilter,
  type BillingRow,
  type UserCard,
  type UserHit,
} from '@/data/crm-live';
import { actionLabel, money, productLabel, storeEventLabel } from '@/domain/admin/crm-core';
import { errorMessage, useQuery } from '@/lib/useQuery';

/**
 * Users & plans (Admin-Analytics-Amendment-002, AA-D12).
 *
 * ══ ⚠ THE PRIVACY CEILING ══
 *
 * The user card draws ONLY what `admin_user_card` returns — account, billing, AI metering, support and
 * business. AA-D13: training, photos, nutrition, health and activity stay dark, and no successor RPC or
 * screen may add them. A new section here is a new decision against a locked one.
 */

const BILLING_FILTERS: { key: BillingFilter; label: string }[] = [
  { key: 'paying', label: 'Paying' },
  { key: 'trial', label: 'Trials' },
  { key: 'premium_ai', label: 'Premium AI' },
  { key: 'founder', label: 'Founders' },
  { key: 'comped', label: 'Comped' },
  { key: 'grant', label: 'Grants' },
  { key: 'lapsed', label: 'Lapsed' },
  { key: 'free', label: 'Free' },
];

/** One row shape for search hits and billing-list rows. */
interface PersonRow {
  id: string;
  name: string | null;
  handle: string | null;
  created_at: string;
  tier: 'FREE' | 'PREMIUM';
  premium_ai: boolean;
  paying: boolean;
  product: string | null;
}

function fromHit(h: UserHit): PersonRow {
  return { ...h, product: null };
}

function fromBilling(b: BillingRow, filter: BillingFilter): PersonRow {
  return {
    id: b.id,
    name: b.name,
    handle: b.handle,
    created_at: b.created_at,
    tier: b.tier,
    premium_ai: b.premium_ai,
    paying: filter === 'paying',
    product: b.product,
  };
}

export function UsersPage(props: PageProps) {
  const wide = useWide();
  const tiers = useQuery(fetchTiers, []);
  const signups = useQuery(() => fetchRecentSignups(60), []);

  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [filter, setFilter] = useState<BillingFilter | null>(null);
  // undefined = the operator has not picked anyone yet, so a user id passed by `go` opens directly.
  const [picked, setPicked] = useState<string | null | undefined>(undefined);
  const selected = picked !== undefined ? picked : (props.arg ?? null);

  const onSearch = (v: string) => {
    setText(v);
    if (timer) clearTimeout(timer);
    setTimer(setTimeout(() => setQ(v.trim()), 300));
  };

  const hits = useQuery(() => (q ? searchUsers(q) : Promise.resolve([] as UserHit[])), [q]);
  const billing = useQuery(
    () => (filter ? fetchBillingList(filter) : Promise.resolve([] as BillingRow[])),
    [filter],
  );

  const t = tiers.data;
  const kinds = t?.by_kind ?? [];

  const rows: PersonRow[] | null = q
    ? hits.data
      ? hits.data.map(fromHit)
      : null
    : filter && billing.data
      ? billing.data.map((b) => fromBilling(b, filter))
      : null;
  const listState = q ? hits : billing;

  const list = (
    <Block label="Find a user" hint="Search by handle, name or id — or pick a billing list.">
      <Field value={text} onChangeText={onSearch} placeholder="Handle, name or id" autoCapitalize="none" autoCorrect={false} />
      <Chips>
        {BILLING_FILTERS.map((f) => (
          <Chip
            key={f.key}
            label={f.label}
            on={filter === f.key}
            onPress={() => {
              setFilter(filter === f.key ? null : f.key);
              setText('');
              setQ('');
            }}
          />
        ))}
      </Chips>
      {!q && !filter ? (
        <Empty>Type a name or pick a list.</Empty>
      ) : (
        <QueryGate state={listState}>
          {rows && rows.length === 0 ? (
            <Empty>{q ? 'Nobody matches that.' : 'Nobody on this list.'}</Empty>
          ) : (
            (rows ?? []).map((r) => (
              <ListRow
                key={r.id}
                onPress={() => setPicked(r.id)}
                selected={selected === r.id}
                label={`Open ${r.name ?? r.handle ?? 'user'}`}
              >
                <RowTitle dim={!r.name}>{r.name ?? 'Not named yet'}</RowTitle>
                <RowMeta>
                  {r.handle ? `@${r.handle} · ` : ''}joined {when(r.created_at)}
                </RowMeta>
                <Chips>
                  <Tag label={r.tier} tone={r.tier === 'PREMIUM' ? 'ok' : 'muted'} />
                  {r.premium_ai ? <Tag label="AI" /> : null}
                  {r.paying ? <Tag label="Paying" /> : null}
                  {r.product ? <Tag label={productLabel(r.product)} tone="muted" /> : null}
                </Chips>
              </ListRow>
            ))
          )}
        </QueryGate>
      )}
    </Block>
  );

  const card = selected ? (
    <View style={{ gap: 12 }}>
      {!wide ? (
        <View style={{ alignSelf: 'flex-start' }}>
          <Btn label="‹ Back" small onPress={() => setPicked(null)} />
        </View>
      ) : null}
      <UserCardPanel key={selected} id={selected} go={props.go} />
    </View>
  ) : null;

  return (
    <View style={{ gap: 28 }}>
      <PageHead title="Users & plans" lede="Who is on which plan, and one person's account, billing, AI and support history." />

      <QueryGate state={tiers}>
        {t ? (
          <View style={{ gap: 8 }}>
            <Kpis
              items={[
                { label: 'Athletes', value: String(t.athletes_total) },
                { label: 'Free', value: String(t.free) },
                { label: 'Premium', value: String(t.premium) },
                {
                  label: 'Premium AI',
                  value: String(t.premium_ai),
                  sub: t.ai_without_premium ? `${t.ai_without_premium} without Premium` : undefined,
                },
                { label: 'Founder seats', value: String(t.founder_seats) },
                { label: 'Comped testers', value: String(t.comped_testers) },
              ]}
            />
            {t.default_tier === 'PREMIUM' ? <Note>New accounts start on Premium — the testing default (0189).</Note> : null}
          </View>
        ) : null}
      </QueryGate>

      <Block label="Premium by kind" hint="How each Premium account got there.">
        <QueryGate state={tiers}>
          <AdminBarChart rows={kinds.map((k) => ({ label: k.kind || 'unknown', value: k.n }))} />
        </QueryGate>
      </Block>

      {wide ? (
        <Columns ratio={[1.1, 1]}>
          {list}
          {card ?? <Empty>Pick someone to see their card.</Empty>}
        </Columns>
      ) : (
        (card ?? list)
      )}

      {/*
        ── Newest athletes (0137) ─────────────────────────────────────
        ⚠ THE ONE SECTION THAT LISTS ANYBODY UNPROMPTED, and it is an amendment rather than a slip —
        `Admin-Analytics-Amendment-001` AA-D8. A count answers "how many", which is the wrong shape of
        answer while invitations are going out to named people one at a time.

        ⚠ ACCOUNT EXISTENCE ONLY. No workout count, no streak, no rank, no last-active time may join
        this list; AA-D2's performance prohibitions are unamended (AA-D9). If a column is ever added
        here, it is a new decision against a locked one.
      */}
      <Block
        label="Newest athletes"
        hint="Who has an account, newest first. “Not named yet” means they created an account but haven’t finished the Account step — the profile is still the placeholder."
      >
        <QueryGate state={signups}>
          {(signups.data ?? []).length === 0 ? (
            <Empty>No accounts yet.</Empty>
          ) : (
            (signups.data ?? []).map((a) => (
              <ListRow key={a.id} onPress={() => setPicked(a.id)} selected={selected === a.id} label={`Open ${a.named ? a.name : 'account'}`}>
                <RowTitle dim={!a.named}>{a.named ? a.name : 'Not named yet'}</RowTitle>
                <RowMeta>
                  {a.handle ? `@${a.handle} · ` : ''}joined {when(a.createdAt)}
                </RowMeta>
              </ListRow>
            ))
          )}
        </QueryGate>
      </Block>
    </View>
  );
}

// ── The user card (AA-D12 ceiling) ─────────────────────────────────────────

function Sub({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.sub}>
      <Text style={s.subLabel}>{label}</Text>
      {children}
    </View>
  );
}

function UserCardPanel({ id, go }: { id: string; go: PageProps['go'] }) {
  const card = useQuery(() => fetchUserCard(id), [id]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const addContact = async (c: UserCard) => {
    setBusy(true);
    setErr(null);
    try {
      const newId = await saveContact(null, {
        kind: c.business.trainer ? 'trainer' : 'user',
        ...(c.account.name ? { name: c.account.name } : {}),
        athlete_id: c.account.id,
      });
      go('contacts', newId);
    } catch (e) {
      setErr(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Panel>
      <QueryGate state={card}>
        {card.data ? <CardBody c={card.data} busy={busy} err={err} onAdd={addContact} go={go} /> : null}
      </QueryGate>
    </Panel>
  );
}

function CardBody({
  c,
  busy,
  err,
  onAdd,
  go,
}: {
  c: UserCard;
  busy: boolean;
  err: string | null;
  onAdd: (c: UserCard) => void;
  go: PageProps['go'];
}) {
  const b = c.billing;
  const period = c.ai.periods[0] ?? null;
  const contactId = c.business.contact_id;

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 3 }}>
        <Text style={[s.name, !c.account.named && s.nameDim]} selectable>
          {c.account.named && c.account.name ? c.account.name : 'Not named yet'}
        </Text>
        <Text style={s.meta} selectable>
          {c.account.handle ? `@${c.account.handle} · ` : ''}joined {when(c.account.created_at)}
        </Text>
      </View>

      <Chips>
        {contactId ? (
          <Btn label="Open contact" onPress={() => go('contacts', contactId)} />
        ) : (
          <Btn label="Add to contacts" onPress={() => onAdd(c)} busy={busy} />
        )}
      </Chips>
      {err ? <ErrorText>{err}</ErrorText> : null}

      <Sub label="Billing">
        <KV k="Plan" v={b.tier} />
        <KV k="Kind" v={b.premium_kind ?? '—'} />
        <KV k="Until" v={b.premium_until ? when(b.premium_until) : '—'} />
        <KV k="Premium AI" v={b.premium_ai ? `Yes${b.premium_ai_until ? ` · until ${when(b.premium_ai_until)}` : ''}` : 'No'} />
        <KV k="Founder seat" v={b.founder_seat != null ? `#${b.founder_seat}` : '—'} />
        <KV k="Comped tester" v={b.comped_tester ? 'Yes' : 'No'} />
        <KV k="Lifetime paid (production)" v={money(b.paid_total)} />
      </Sub>

      <Sub label="Subscriptions">
        {b.subscriptions.length === 0 ? (
          <Empty>No subscriptions.</Empty>
        ) : (
          b.subscriptions.map((sub) => (
            <ListRow key={`${sub.product_id}-${sub.environment}`}>
              <RowTitle>{productLabel(sub.product_id)}</RowTitle>
              <RowMeta>
                {[sub.period_type, sub.expires_at ? `expires ${when(sub.expires_at)}` : null].filter(Boolean).join(' · ') || '—'}
              </RowMeta>
              <Tag label={sub.environment === 'SANDBOX' ? 'SANDBOX' : 'PRODUCTION'} tone={sub.environment === 'SANDBOX' ? 'muted' : 'ok'} />
            </ListRow>
          ))
        )}
      </Sub>

      <Sub label="Purchase history">
        {b.events.length === 0 ? (
          <Empty>No store events.</Empty>
        ) : (
          b.events.map((e, i) => (
            <ListRow key={`${e.received_at}-${i}`}>
              <RowTitle>
                {storeEventLabel(e.type)} · {productLabel(e.product)}
              </RowTitle>
              <RowMeta>
                {money(e.price)} · {when(e.received_at, true)}
              </RowMeta>
              {e.environment ? <Tag label={e.environment} tone={e.environment === 'SANDBOX' ? 'muted' : 'ok'} /> : null}
            </ListRow>
          ))
        )}
      </Sub>

      <Sub label="AI">
        <KV k="This period" v={period ? `${period.spent} of ${period.allowance} credits · ${period.period}` : '—'} />
        {c.ai.by_action.map((a) => (
          <KV key={a.action} k={actionLabel(a.action)} v={`${a.calls} calls · ${a.credits} credits · ${money(a.cost_usd)}`} />
        ))}
        <KV k="All-time cost" v={money(c.ai.cost_all)} />
      </Sub>

      <Sub label="Support">
        {c.support.feedback.length === 0 ? (
          <Empty>No feedback.</Empty>
        ) : (
          c.support.feedback.map((f) => (
            <ListRow key={f.id}>
              <RowTitle>{f.body}</RowTitle>
              <RowMeta>
                {f.kind} · {f.status} · {when(f.created_at)}
              </RowMeta>
            </ListRow>
          ))
        )}
        <KV
          k="Crash reports"
          v={`${c.support.errors} ${c.support.errors === 1 ? 'report' : 'reports'} across ${c.support.error_bugs} ${
            c.support.error_bugs === 1 ? 'bug' : 'bugs'
          }`}
        />
      </Sub>

      <Sub label="Business">
        <KV
          k="Trainer seat"
          v={c.business.trainer ? `${c.business.trainer.status} · cap ${c.business.trainer.seat_cap}` : 'None'}
        />
        {c.business.trainer ? <KV k="Active clients" v={String(c.business.trainer_clients)} /> : null}
      </Sub>

      <Note>Training, photos, nutrition, health and activity are never shown here (AA-D13).</Note>
    </View>
  );
}

const s = StyleSheet.create({
  name: { color: flText.primary, fontFamily: flFont.display, fontSize: 22, letterSpacing: 0.2 },
  nameDim: { color: flColor.gray600, fontStyle: 'italic' },
  meta: { color: flColor.gray400, fontSize: 12.5 },
  sub: { gap: 4 },
  subLabel: {
    color: flText.bronzeLabel,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    paddingBottom: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: flColor.charcoal700,
  },
});
