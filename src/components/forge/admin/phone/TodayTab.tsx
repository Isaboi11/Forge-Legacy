import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useCrm } from '@/components/forge/admin/crm-theme';
import { DEFAULT_BUG_FILTER, usePhone } from '@/components/forge/admin/phone/context';
import { ErrorRow, FigGrid, PhoneScroll, SERIF, Skel, Tag, type PFig } from '@/components/forge/admin/phone/kit';
import { dashboardTz } from '@/data/admin-live';
import { fetchAiUsage, fetchAppStore, fetchBugs, fetchContacts, fetchRevenue, type AiUsage, type AppStore, type BugBoard, type ContactList, type Revenue } from '@/data/crm-live';
import { fetchAdminReports, type AdminReportsBundle } from '@/data/moderation-live';
import { buildBriefing, deltaNote, int, lastLabel, RANGE_INFO, type AttentionItem, type Briefing, type RangeKey } from '@/domain/admin/briefing';
import { churnRate, money, pctText, todayKey } from '@/domain/admin/crm-core';
import { parseSyncMessage } from '@/domain/admin/notes/appstore';
import { errorMessage, useQuery } from '@/lib/useQuery';

/**
 * Today (Forge CRM Phone.dc.html, TODAY): the date, the greeting and summary, "What I’d do today", the
 * things being watched, and the month's money. Every sentence comes from `buildBriefing`, fed the same
 * reads the desktop Overview feeds it; every to-do opens straight onto the thing to do.
 */

const DAY_MS = 86_400_000;
/** Premium AI's monthly list price — the same stand-in the desktop Overview uses (MRR is not split per product). */
const PREMIUM_AI_MONTHLY = 19.99;

const wholeDays = (from: number, to: number) => Math.max(0, Math.floor((to - from) / DAY_MS));

interface Reads {
  r: Revenue | null;
  rErr: string | null;
  a: AiUsage | null;
  b: BugBoard | null;
  s: AppStore | null;
  k: ContactList | null;
  rep: AdminReportsBundle | null;
}

/** A read that fails leaves its part of the briefing out; the others still speak. */
async function soft<T>(p: Promise<T>): Promise<{ v: T | null; err: string | null }> {
  try {
    return { v: await p, err: null };
  } catch (e) {
    return { v: null, err: errorMessage(e) };
  }
}

/** The briefing inputs, built exactly as the desktop Overview builds them. */
function briefFrom(d: Reads, range: RangeKey, now: number): Briefing | null {
  const { r, a, b, s, k, rep } = d;
  if (!r) return null;
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
  const lastEvent = r.last_event_at ? Date.parse(r.last_event_at) : NaN;
  return buildBriefing({
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
    ascLastOk: ascConfigured && ls ? ls.ok : null,
    ascMessage: ls?.message ?? null,
  });
}

/** One to-do per destination: "done" means the kind of work is gone, not that its wording changed. */
const todoKey = (it: AttentionItem) => it.dest;

/** "Mon 28 Sep". */
function shortDate(ms: number): string {
  const d = new Date(ms);
  return `${d.toLocaleDateString('en-US', { weekday: 'short' })} ${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}`;
}

export function TodayTab() {
  const { c } = useCrm();
  const { range, stamp, markLoaded, updatedAt, offline, open, setTab, setBugSeg, setBugFilter, setMoreView, setMoneySeg } = usePhone();
  const days = RANGE_INFO[range].days;
  const tz = dashboardTz();

  const [now, setNow] = useState(() => Date.now());
  const [watchOpen, setWatchOpen] = useState(false);
  // Every to-do seen this session (key → last title). One that is no longer live is struck through as done.
  const [seen, setSeen] = useState<Record<string, string>>({});

  // "Updated N min ago" re-reads the clock once a minute; nothing else is set here.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const q = useQuery(async () => {
    const [r, a, b, s, k, rep] = await Promise.all([
      soft(fetchRevenue(days, tz, false)),
      soft(fetchAiUsage(days, tz)),
      soft(fetchBugs('active', 'critical', null)),
      soft(fetchAppStore(days)),
      soft(fetchContacts(null, null)),
      soft(fetchAdminReports(50, 'open')),
    ]);
    markLoaded();
    const at = Date.now();
    const d: Reads = { r: r.v, rErr: r.err, a: a.v, b: b.v, s: s.v, k: k.v, rep: rep.v };
    const bf = briefFrom(d, range, at);
    if (bf?.attention.length) {
      setSeen((prev) => {
        const next = { ...prev };
        bf.attention.forEach((it) => (next[todoKey(it)] = it.title));
        return next;
      });
    }
    return { d, at };
  }, [days, tz, range, stamp]);

  const d = q.data?.d ?? null;
  const clock = Math.max(now, q.data?.at ?? 0);
  const brief = d ? briefFrom(d, range, clock) : null;
  const r = d?.r ?? null;
  const live = brief?.attention ?? [];
  const liveKeys = new Set(live.map(todoKey));
  const done = brief ? Object.entries(seen).filter(([key]) => !liveKeys.has(key as AttentionItem['dest'])) : [];

  const mins = Math.floor((clock - updatedAt) / 60_000);
  const updatedLabel = offline
    ? `Offline · last updated ${new Date(updatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    : mins < 1
      ? 'Updated just now'
      : `Updated ${mins} min ago`;

  const oldestCriticalId = (() => {
    const rows = d?.b?.rows ?? [];
    if (!rows.length) return null;
    return [...rows].sort((x, y) => Date.parse(x.created_at) - Date.parse(y.created_at))[0].id;
  })();

  const go = (it: AttentionItem) => {
    switch (it.dest) {
      case 'bugs':
        setBugSeg('board');
        setBugFilter({ ...DEFAULT_BUG_FILTER, severity: 'critical' });
        if (oldestCriticalId) open({ kind: 'bug', id: oldestCriticalId, from: 'today' }, 'bugs');
        else setTab('bugs', { clear: true });
        break;
      case 'contacts':
        if (it.arg) open({ kind: 'contact', id: it.arg, from: 'today' }, 'people');
        else setTab('people');
        break;
      case 'bugs:reports':
        setBugSeg((d?.b?.feedback_new ?? 0) > 0 ? 'reports' : 'crashes');
        setTab('bugs', { clear: true });
        break;
      case 'moderation':
        setMoreView('moderation');
        setTab('more', { clear: true });
        break;
      case 'revenue':
        setMoneySeg('revenue');
        setTab('money', { clear: true });
        break;
      case 'appstore':
        setMoreView('appstore');
        setTab('more', { clear: true });
        break;
    }
  };

  const watchLines = brief?.watching
    ? brief.watching
        .replace(/^Two things I’m watching for you\.\s*/, '')
        .replace(/^One thing I’m watching:\s*/, '')
        .split(/(?<=\.)\s+(?=[A-Z0-9$])/)
        .filter(Boolean)
    : [];
  const watchTwo = !!brief?.watching?.startsWith('Two');

  // ── Money figures ──
  const hasMoney = r ? r.production_events > 0 : false;
  const blankNote = r ? (r.sandbox_purchases > 0 ? 'Only test purchases so far' : 'No data yet') : 'Couldn’t load';
  const revD = r && hasMoney ? deltaNote(r.gross, r.gross_prev, range) : null;
  const figs: PFig[] =
    r && hasMoney
      ? [
          { label: 'Revenue', value: money(r.gross), note: revD?.text ?? null, tone: revD?.tone ?? null },
          { label: 'MRR', value: money(r.mrr), note: 'Per month, now' },
          { label: 'Paying', value: int(r.paying.total), note: `${int(r.paying.premium)} Premium · ${int(r.paying.premium_ai)} AI` },
          { label: 'Churn', value: pctText(churnRate(r.churned, r.paying.total)), note: `${int(r.churned)} cancelled` },
        ]
      : ['Revenue', 'MRR', 'Paying', 'Churn'].map((label) => ({ label, value: '—', note: blankNote }));

  const sectionLabel = { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.96, textTransform: 'uppercase' as const, color: c.ink3 };

  return (
    <PhoneScroll>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
        <Text style={{ fontSize: 13, color: c.ink3 }}>
          {shortDate(clock)} · {lastLabel(range)}
        </Text>
        <Text style={{ fontSize: 13, color: offline ? c.warn : c.ink3, flexShrink: 1, textAlign: 'right' }}>{updatedLabel}</Text>
      </View>

      {brief ? (
        <>
          <Text accessibilityRole="header" style={{ fontFamily: SERIF, fontSize: 30, lineHeight: 35, marginTop: 18, marginBottom: 10, color: c.ink }}>
            {brief.greeting}
          </Text>
          <Text style={{ fontSize: 17, lineHeight: 25.5, color: c.ink2 }}>{brief.summary}</Text>
        </>
      ) : q.error || (d && !d.r) ? (
        <View style={{ marginTop: 18 }}>
          <Text style={{ fontFamily: SERIF, fontSize: 30, lineHeight: 35, color: c.ink }}>Couldn’t load your briefing.</Text>
          <ErrorRow msg={q.error ?? d?.rErr ?? 'The revenue read failed.'} onRetry={q.refetch} />
        </View>
      ) : (
        <Skel lines={4} />
      )}

      {brief ? (
        <>
          <Text style={[sectionLabel, { marginTop: 30 }]}>What I’d do today · {live.length}</Text>
          {live.length ? (
            <View style={{ marginTop: 6 }}>
              {live.map((it) => (
                <Pressable
                  key={todoKey(it)}
                  onPress={() => go(it)}
                  accessibilityRole="button"
                  accessibilityLabel={it.title}
                  style={({ pressed }) => [
                    { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 68, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line },
                    pressed && { backgroundColor: c.hover },
                  ]}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <Text style={{ fontSize: 17, fontWeight: '500', color: c.ink }}>{it.title}</Text>
                      <Tag label={it.tag} tone={it.tone === 'crit' ? 'crit' : it.tone === 'warn' ? 'warn' : 'brz'} />
                    </View>
                    <Text style={{ marginTop: 3, fontSize: 14, lineHeight: 20, color: c.ink3 }}>{it.meta}</Text>
                  </View>
                  <Text style={{ fontSize: 22, color: c.ink3 }}>›</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={{ paddingTop: 18, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: c.line }}>
              <Text style={{ fontFamily: SERIF, fontSize: 24, color: c.ink }}>You’re clear.</Text>
              <Text style={{ marginTop: 6, fontSize: 15, lineHeight: 22, color: c.ink3 }}>Nothing needs you right now. New bugs, reports and follow-ups will show up here.</Text>
            </View>
          )}
          {done.map(([key, title]) => (
            <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, borderBottomWidth: 1, borderBottomColor: c.line }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: c.brzTint, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 12, color: c.brz }}>✓</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 15, color: c.ink3, textDecorationLine: 'line-through' }}>{title}</Text>
            </View>
          ))}

          {watchLines.length ? (
            <>
              <Pressable
                onPress={() => setWatchOpen((v) => !v)}
                accessibilityRole="button"
                accessibilityState={{ expanded: watchOpen }}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, marginTop: 6, borderBottomWidth: 1, borderBottomColor: c.line }}
              >
                <Text style={{ fontSize: 15, color: c.ink2 }}>{watchTwo ? 'Two things I’m watching' : 'One thing I’m watching'}</Text>
                <Text style={{ fontSize: 15, color: c.ink3 }}>{watchOpen ? '−' : '+'}</Text>
              </Pressable>
              {watchOpen ? (
                <View style={{ paddingTop: 12, paddingBottom: 4, gap: 10 }}>
                  {watchLines.map((l) => (
                    <Text key={l} style={{ fontSize: 15, lineHeight: 22.5, color: c.ink2 }}>
                      {l}
                    </Text>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}

      <View style={{ marginTop: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={sectionLabel}>Money · {lastLabel(range)}</Text>
        <Pressable
          onPress={() => {
            setMoneySeg('revenue');
            setTab('money', { clear: true });
          }}
          accessibilityRole="button"
          accessibilityLabel="Open Money"
          style={{ paddingVertical: 10, paddingLeft: 12 }}
        >
          <Text style={{ fontSize: 14, color: c.brz }}>Open ›</Text>
        </Pressable>
      </View>
      {d || q.error ? <FigGrid figs={figs} size={28} /> : <Skel lines={3} />}
    </PhoneScroll>
  );
}
