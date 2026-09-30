import { useEffect, useRef, useState } from 'react';
import { Animated, Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { useCrm } from '@/components/forge/admin/crm-theme';
import { when } from '@/components/forge/admin/crm-ui';
import { usePhone, type MoreView } from '@/components/forge/admin/phone/context';
import { FilePick } from '@/components/forge/admin/phone/FilePick';
import { SocialContentView, SocialNumbersView, SocialPlaybookView, SocialSyncBar, socialSubs } from '@/components/forge/admin/phone/SocialViews';
import { SurveysView } from '@/components/forge/admin/phone/SurveysView';
import { useSocial } from '@/components/forge/admin/social-ui';
import {
  BigBtn,
  BottomBar,
  EmptyRow,
  ErrorRow,
  FieldLabel,
  FigGrid,
  Muted,
  OfflineLine,
  PChip,
  PhoneScroll,
  PInput,
  RangeSeg,
  ScreenTitle,
  SectionHead,
  Seg,
  SERIF,
  SheetFrame,
  Skel,
  type PFig,
} from '@/components/forge/admin/phone/kit';
import { dashboardTz, fetchAdminCohorts, fetchAdminEvents, fetchAdminOverview } from '@/data/admin-live';
import { deleteDocument, documentLink, fetchAppStore, fetchDocuments, fetchSurveys, runAscSync, saveDocument, uploadDocumentFiles, type Doc, type PickedFile } from '@/data/crm-live';
import { fetchAdminReports, resolveReport, type AdminReport } from '@/data/moderation-live';
import { deltaNote, int, RANGE_INFO } from '@/domain/admin/briefing';
import { bytes, DOC_CATEGORIES, guessCategory, pctText, rate, titleFromFile, type DocCategory } from '@/domain/admin/crm-core';
import { ascState } from '@/domain/admin/notes/appstore';
import { daysSince, waitingTag } from '@/domain/admin/notes/moderation';
import { REPORT_REASON_LABEL, isReportReason } from '@/domain/moderation/moderation-core';
import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import { errorMessage, useQuery } from '@/lib/useQuery';

/**
 * More — the phone CRM's fifth tab (`Forge CRM Phone.dc.html`, MORE + the Add-a-document and Upload sheets).
 * A root list (App Store · Usage · Moderation · Surveys · Documents, Appearance, Back to the app) and five sub-views over
 * the same reads the desktop pages use (`AppStorePage`, `UsagePage`, `ModerationPage`, `SurveysPage`, `DocumentsPage`).
 */

const OFFLINE_MSG = 'You’re offline, so saving is paused.';
const OFFLINE_TOAST = 'You’re offline. Saving is paused until you reconnect.';
const SETUP_DOC = 'Docs/App-Store-Connect-Key-Setup.md';
const MAX_BYTES = 50 * 1024 * 1024;

const SUBT: Record<Exclude<MoreView, 'root'>, string> = { social: 'Numbers', content: 'Content', playbook: 'Playbook', appstore: 'App Store', usage: 'Usage', moderation: 'Moderation', surveys: 'Surveys', documents: 'Documents' };

const shelfLabel = (k: DocCategory) => DOC_CATEGORIES.find((d) => d.key === k)?.label ?? k;
const isLink = (d: Doc) => !!d.url && !d.storage_path;

/** "PDF" / "XLSX" / "Link" — the file's own extension first, then the mime (same rule as DocumentsPage). */
function kindOf(d: Doc): string {
  if (isLink(d)) return 'Link';
  const ext = d.storage_path?.match(/\.([a-z0-9]{1,5})$/i)?.[1];
  if (ext) return ext.toUpperCase().slice(0, 4);
  const m = (d.mime ?? '').toLowerCase();
  if (m.includes('pdf')) return 'PDF';
  if (m.includes('spreadsheet') || m.includes('excel')) return 'XLSX';
  if (m.includes('zip')) return 'ZIP';
  if (m.startsWith('image/')) return m.slice(6, 10).toUpperCase();
  return 'File';
}

const TARGET: Record<string, string> = { post: 'Squad post', comment: 'Comment', checkin: 'Check-in', squad: 'Squad' };
function reportTitle(r: AdminReport): string {
  const who = r.targetHandle ? `@${r.targetHandle}` : null;
  if (r.targetKind === 'athlete') return `Profile: ${who ?? `id ${r.targetId.slice(0, 8)}`}`;
  const kind = TARGET[r.targetKind] ?? r.targetKind;
  return who ? `${kind} by ${who}` : `${kind} · id ${r.targetId.slice(0, 8)}`;
}
const reasonText = (reason: string) => (isReportReason(reason) ? REPORT_REASON_LABEL[reason] : reason.replace(/_/g, ' '));

// ── Shared reads (the root rows and the sub-views read the same queries) ────

function useMoreData() {
  const { stamp, range, markLoaded } = usePhone();
  const days = RANGE_INFO[range].days;
  const appstore = useQuery(async () => {
    const r = await fetchAppStore(days);
    markLoaded();
    return r;
  }, [days, stamp]);
  // `at` = when it was read, so "days waiting" is judged against that, not a render-time clock.
  const reports = useQuery(async () => {
    const r = await fetchAdminReports(50, null);
    if (!r) throw new Error('Couldn’t load reports. Check that migration 0171 is applied.');
    return { r, at: Date.now() };
  }, [stamp]);
  const docs = useQuery(() => fetchDocuments(null, null), [stamp]);
  const surveys = useQuery(() => fetchSurveys(), [stamp]);
  // The owner's TikTok and Instagram (0247): one read for the three Social rows and their views.
  const social = useSocial(stamp);
  return { appstore, reports, docs, surveys, social };
}

// ── The tab ─────────────────────────────────────────────────────────────────

export function MoreTab() {
  const { moreView } = usePhone();
  const data = useMoreData();
  if (moreView === 'root') return <MoreRoot data={data} />;
  return <MoreSub view={moreView} data={data} />;
}

type MoreData = ReturnType<typeof useMoreData>;

function MoreRoot({ data }: { data: MoreData }) {
  const { c, pref, setMode } = useCrm();
  const { setMoreView, exit, openSheet } = usePhone();
  const s = data.appstore.data;
  const avg = s?.rating?.avg ?? null;
  const asSub = !s
    ? data.appstore.error
      ? 'Couldn’t load'
      : '—'
    : ascState(s.last_sync) === 'notConnected'
      ? 'Not connected yet'
      : avg != null
        ? `${avg.toFixed(1)} rating · ${int(s.rating?.count ?? 0)} ratings`
        : 'No public rating yet';
  const waiting = data.reports.data?.r.counts.open ?? 0;
  const modSub = data.reports.data ? (waiting ? `${waiting} report${waiting > 1 ? 's' : ''} waiting` : 'Nothing waiting') : data.reports.error ? 'Couldn’t load' : '—';
  const nDocs = data.docs.data?.rows.length;
  const sv = data.surveys.data;
  const svN = sv ? sv.reduce((n, s) => n + s.responses, 0) : null;
  const surveySub = svN != null ? (sv!.length ? `${svN} ${svN === 1 ? 'response' : 'responses'}` : 'No surveys yet') : data.surveys.error ? 'Couldn’t load' : '—';
  const docSub = nDocs != null ? `${nDocs} ${nDocs === 1 ? 'file' : 'files'}` : data.docs.error ? 'Couldn’t load' : '—';

  const soc = socialSubs(data.social);
  // The first three are the Social group (AA-D25); each group's heading is drawn above its first row.
  const SOCIAL_ROWS = 3;
  const rows: { key: Exclude<MoreView, 'root'>; label: string; sub: string; badge?: number }[] = [
    { key: 'social', label: 'Numbers', sub: soc.numbers },
    { key: 'content', label: 'Content', sub: soc.content },
    { key: 'playbook', label: 'Playbook', sub: soc.playbook },
    { key: 'appstore', label: 'App Store', sub: asSub },
    { key: 'usage', label: 'Usage', sub: 'Active athletes and retention' },
    { key: 'moderation', label: 'Moderation', sub: modSub, badge: waiting },
    { key: 'surveys', label: 'Surveys', sub: surveySub },
    { key: 'documents', label: 'Documents', sub: docSub },
  ];

  return (
    <PhoneScroll>
      <ScreenTitle title="More" />
      <OfflineLine />
      <View style={{ flexDirection: 'row', marginTop: 12 }}>
        <BigBtn label="New idea" onPress={() => openSheet({ kind: 'newIdea' })} />
      </View>
      <View>
        {rows.map((r, i) => (
          <View key={r.key}>
            {i === 0 ? <SectionHead label="Social" style={{ marginTop: 22, marginBottom: 2 }} /> : i === SOCIAL_ROWS ? <SectionHead label="Business" style={{ marginTop: 26, marginBottom: 2 }} /> : null}
            <Pressable
            onPress={() => setMoreView(r.key)}
            accessibilityRole="button"
            style={({ pressed }) => [
              { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.line },
              pressed && { backgroundColor: c.hover },
            ]}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 17, color: c.ink }}>{r.label}</Text>
              <Text style={{ marginTop: 2, fontSize: 14, color: c.ink3 }}>{r.sub}</Text>
            </View>
            {r.badge ? (
              <View style={{ minWidth: 22, height: 22, paddingHorizontal: 7, borderRadius: 11, backgroundColor: c.crit, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF' }}>{r.badge}</Text>
              </View>
            ) : null}
            <Text style={{ fontSize: 22, color: c.ink3 }}>›</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <SectionHead label="Appearance" style={{ marginTop: 30 }} />
      <View style={{ marginTop: 10 }}>
        <Seg
          options={[
            { key: 'app', label: 'Match app' },
            { key: 'forge', label: 'Dark' },
            { key: 'alabaster', label: 'Light' },
          ]}
          value={pref}
          onChange={setMode}
        />
      </View>
      <Text style={{ marginTop: 8, fontSize: 13, color: c.ink3 }}>“Match the app” follows the theme set in Forge Legacy.</Text>

      <Pressable
        onPress={exit}
        accessibilityRole="button"
        style={{ marginTop: 24, minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.line }}
      >
        <Text style={{ fontSize: 17, color: c.brz }}>Back to the app</Text>
        <Text style={{ fontSize: 17, color: c.brz }}>›</Text>
      </Pressable>
    </PhoneScroll>
  );
}

function MoreSub({ view, data }: { view: Exclude<MoreView, 'root'>; data: MoreData }) {
  const { c } = useCrm();
  const { setMoreView, openSheet, offline, toast, refresh } = usePhone();
  const [syncing, setSyncing] = useState(false);
  const bar = view === 'appstore' || view === 'documents' || view === 'social' || view === 'content';

  const sync = async () => {
    if (syncing) return;
    if (offline) return toast(OFFLINE_TOAST);
    setSyncing(true);
    try {
      const res = await runAscSync();
      if (!res.configured) toast(`App Store Connect isn’t connected yet${res.missing?.length ? ` (missing ${res.missing.join(', ')})` : ''}. See ${SETUP_DOC}.`);
      else if (res.ok) toast(`Synced with App Store Connect · ${int(res.downloads ?? 0)} downloads, ${int(res.reviews ?? 0)} reviews.`);
      else toast(`Sync finished with problems: ${(res.errors ?? []).join(' · ') || 'see the last sync'}.`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'App Store sync failed.');
    } finally {
      setSyncing(false);
      refresh();
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <PhoneScroll bottomBar={bar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
          <Pressable onPress={() => setMoreView('root')} accessibilityRole="button" accessibilityLabel="Back to More" style={{ height: 44, paddingRight: 12, justifyContent: 'center' }}>
            <Text style={{ fontSize: 17, color: c.brz }}>‹ More</Text>
          </Pressable>
          {view === 'appstore' || view === 'usage' || view === 'social' ? <RangeSeg /> : null}
        </View>
        <Text accessibilityRole="header" style={{ fontFamily: SERIF, fontSize: 30, marginTop: 8, color: c.ink }}>
          {SUBT[view]}
        </Text>
        <OfflineLine />
        {view === 'social' ? <SocialNumbersView q={data.social} /> : view === 'content' ? <SocialContentView q={data.social} /> : view === 'playbook' ? <SocialPlaybookView q={data.social} /> : view === 'appstore' ? <AppStoreView data={data} /> : view === 'usage' ? <UsageView /> : view === 'moderation' ? <ModerationView data={data} /> : view === 'surveys' ? <SurveysView surveys={data.surveys.data} error={data.surveys.error} onRetry={data.surveys.refetch} /> : <DocumentsView data={data} />}
      </PhoneScroll>
      {bar ? (
        <BottomBar>
          {view === 'appstore' ? (
            <BigBtn label={syncing ? 'Syncing…' : 'Sync now'} busy={syncing} disabled={offline} onPress={() => void sync()} />
          ) : view === 'social' ? (
            <SocialSyncBar q={data.social} />
          ) : view === 'content' ? (
            <BigBtn label="New idea" onPress={() => openSheet({ kind: 'newIdea' })} />
          ) : (
            <BigBtn label="Add" onPress={() => openSheet({ kind: 'docPick' })} />
          )}
        </BottomBar>
      ) : null}
    </View>
  );
}

// ── App Store ───────────────────────────────────────────────────────────────

function AppStoreView({ data }: { data: MoreData }) {
  const { c } = useCrm();
  const { range } = usePhone();
  const q = data.appstore;
  const s = q.data;

  if (q.error && !s) return <ErrorRow msg={`Couldn’t load App Store data. ${q.error}`} onRetry={q.refetch} />;
  if (!s) return <Skel lines={4} />;

  const state = ascState(s.last_sync);
  const avg = s.rating?.avg ?? null;
  const d = deltaNote(s.downloads, s.downloads_prev, range);
  const figs: PFig[] =
    state === 'notConnected'
      ? [
          { label: 'Downloads', value: '—', note: 'Not connected yet' },
          { label: 'Rating', value: '—', note: 'Not connected yet' },
        ]
      : [
          { label: 'Downloads', value: int(s.downloads), note: d?.text ?? RANGE_INFO[range].label, tone: d?.tone ?? null },
          avg == null
            ? { label: 'Rating', value: '—', note: 'No public rating before launch' }
            : { label: 'Rating', value: avg.toFixed(1), note: s.rating?.count != null ? `${int(s.rating.count)} ratings, all time` : 'All time' },
        ];

  return (
    <View style={{ marginTop: 18 }}>
      <FigGrid figs={figs} size={34} />
      {state === 'notConnected' ? (
        <Muted style={{ marginTop: 10 }}>{`Downloads, ratings and reviews come from Apple once an API key is set up. The steps are in ${SETUP_DOC}.`}</Muted>
      ) : null}
      <SectionHead label="Latest reviews" style={{ marginTop: 22 }} />
      {s.reviews.length === 0 ? (
        <EmptyRow>{state === 'notConnected' ? 'Nothing synced from Apple yet.' : 'No written reviews yet.'}</EmptyRow>
      ) : (
        s.reviews.slice(0, 8).map((r) => (
          <View key={r.id} style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: c.line }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <Text accessibilityLabel={`${r.rating} stars`} style={{ fontSize: 14, letterSpacing: 2, color: c.brz }}>
                {'★'.repeat(Math.max(0, Math.min(5, Math.round(r.rating))))}
              </Text>
              <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 13, color: c.ink3 }}>
                {[r.nickname, when(r.created_at)].filter(Boolean).join(' · ')}
              </Text>
            </View>
            {r.title ? <Text style={{ marginTop: 6, fontSize: 16, fontWeight: '500', color: c.ink }}>{r.title}</Text> : null}
            {r.body ? <Text style={{ marginTop: 4, fontSize: 15, lineHeight: 22, color: c.ink2 }}>{r.body}</Text> : null}
          </View>
        ))
      )}
    </View>
  );
}

// ── Usage ───────────────────────────────────────────────────────────────────

const COHORT_HEAD = ['Wk 0', 'Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5'];

function UsageView() {
  const { c } = useCrm();
  const { range, stamp, markLoaded } = usePhone();
  const days = RANGE_INFO[range].days;
  const [tz] = useState(() => dashboardTz());
  const overview = useQuery(async () => {
    const r = await fetchAdminOverview(days, tz);
    markLoaded();
    return r;
  }, [days, tz, stamp]);
  // Six signup weeks (this one and the five before it) → Week 0…5, as on the desktop.
  const cohorts = useQuery(() => fetchAdminCohorts(5, tz), [tz, stamp]);
  const events = useQuery(() => fetchAdminEvents(days, 1, tz), [days, tz, stamp]);

  const o = overview.data;
  const none = o != null && o.tiles.workoutsAllTime === 0;
  const label = RANGE_INFO[range].label;
  const inWin = range === '1Y' ? 'the last year' : label;
  const dash = (l: string, note?: string): PFig => ({ label: l, value: '—', note: none ? 'No data yet' : (note ?? (overview.error ? 'Couldn’t load' : null)) });

  // Week-4 retention: everyone in a cohort old enough to have a week 4, weighted by cohort size.
  const old4 = (cohorts.data?.cohorts ?? []).filter((co) => co.maxK >= 4 && co.size > 0);
  const kept4 = old4.reduce((n, co) => n + (co.cells.find((x) => x.k === 4)?.n ?? 0), 0);
  const size4 = old4.reduce((n, co) => n + co.size, 0);
  const ret4 = rate(kept4, size4);
  const ev = events.data;
  const coverage = ev ? rate(ev.reportingAthletes, ev.athletesTotal) : null;
  const fourth: PFig =
    ret4 != null && !none
      ? { label: 'Week-4 retention', value: pctText(Math.round(ret4)), note: `Of ${int(size4)} who joined 4+ weeks ago` }
      : ev && coverage != null && !none
        ? { label: 'Coverage', value: pctText(Math.round(coverage)), note: `${int(ev.reportingAthletes)} of ${int(ev.athletesTotal)} left measurement on` }
        : dash('Week-4 retention', cohorts.data ? 'No sign-up week is 4 weeks old yet' : undefined);

  const figs: PFig[] = [
    o && !none ? { label: 'Active athletes', value: int(o.tiles.active), note: `Of ${int(o.tiles.athletesTotal)} · ${label}` } : dash('Active athletes'),
    o && !none ? { label: 'New signups', value: int(o.tiles.signups), note: label } : dash('New signups'),
    o && !none ? { label: 'Workouts logged', value: int(o.tiles.workouts), note: `Saved in ${inWin}` } : dash('Workouts logged'),
    fourth,
  ];

  const rows = [...(cohorts.data?.cohorts ?? [])].reverse().map((co) => ({
    key: co.week,
    label: `${when(co.week)} · ${co.size}`,
    // Past `maxK` the week has not happened yet: blank, never 0%.
    cells: COHORT_HEAD.map((_, k) => (k > co.maxK ? null : (co.cells.find((x) => x.k === k)?.pct ?? 0))),
  }));

  const CELL_H = 44;
  const cell = (v: number | null, k: number) => (
    <View key={k} style={{ width: 58, height: CELL_H, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: c.line }}>
      {v != null ? (
        <>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: c.brz, opacity: (Math.max(0, Math.min(100, v)) * 0.32) / 100 }} />
          <Text style={{ fontSize: 13, color: c.ink, fontVariant: ['tabular-nums'] }}>{`${Math.round(v)}%`}</Text>
        </>
      ) : null}
    </View>
  );

  return (
    <View>
      <Text style={{ marginTop: 8, fontSize: 14, color: c.ink3 }}>Read-only. Counts only, never what anyone trained or ate.</Text>
      <View style={{ marginTop: 16 }}>{!o && !overview.error ? <Skel lines={4} /> : <FigGrid figs={figs} />}</View>

      <SectionHead label="Retention by sign-up week" style={{ marginTop: 22 }} />
      <Text style={{ marginTop: 4, fontSize: 13, color: c.ink3 }}>Share still logging workouts each week after joining. Scroll sideways.</Text>
      {cohorts.error && !cohorts.data ? (
        <ErrorRow msg={`Couldn’t load retention. ${cohorts.error}`} onRetry={cohorts.refetch} />
      ) : !cohorts.data ? (
        <Skel lines={3} />
      ) : none || rows.length === 0 ? (
        <EmptyRow>{none ? 'No workouts saved yet. This fills in once athletes start training.' : 'No signups in the last six weeks.'}</EmptyRow>
      ) : (
        /* The design's sticky first column: the cohort labels stay put and only the week cells scroll. */
        <View style={{ marginTop: 12, flexDirection: 'row', borderWidth: 1, borderColor: c.line, borderRadius: 12, overflow: 'hidden' }}>
          <View style={{ width: 96, backgroundColor: c.bg }}>
            <Text style={{ paddingVertical: 10, paddingHorizontal: 12, fontSize: 12, color: c.ink3 }}>Cohort</Text>
            {rows.map((r) => (
              <View key={r.key} style={{ height: CELL_H, justifyContent: 'center', paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: c.line }}>
                <Text numberOfLines={1} style={{ fontSize: 13, color: c.ink2 }}>
                  {r.label}
                </Text>
              </View>
            ))}
          </View>
          <ScrollView horizontal keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets={false} showsHorizontalScrollIndicator style={{ flex: 1 }}>
            <View>
              <View style={{ flexDirection: 'row' }}>
                {COHORT_HEAD.map((h) => (
                  <Text key={h} style={{ width: 58, paddingVertical: 10, textAlign: 'center', fontSize: 12, color: c.ink3 }}>
                    {h}
                  </Text>
                ))}
              </View>
              {rows.map((r) => (
                <View key={r.key} style={{ flexDirection: 'row' }}>
                  {r.cells.map((v, k) => cell(v, k))}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ── Moderation ──────────────────────────────────────────────────────────────

function ModerationView({ data }: { data: MoreData }) {
  const { c } = useCrm();
  const { offline, toast, refresh } = usePhone();
  const q = data.reports;
  // Rows closed on this visit stay on screen showing their result, as the design does.
  const [closedHere, setClosedHere] = useState<Record<string, 'actioned' | 'dismissed'>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [rowErr, setRowErr] = useState<Record<string, string>>({});

  if (q.error && !q.data) return <ErrorRow msg={q.error} onRetry={q.refetch} />;
  if (!q.data) return <Skel lines={4} />;

  const at = q.data.at;
  const rows = q.data.r.rows
    .filter((r) => r.status === 'open' || closedHere[r.id])
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)); // oldest first
  const pending = rows.filter((r) => r.status === 'open' && !closedHere[r.id]).length;

  const resolve = async (id: string, status: 'actioned' | 'dismissed') => {
    if (busy) return;
    if (offline) return toast(OFFLINE_TOAST);
    setBusy(`${id}:${status}`);
    setRowErr(({ [id]: _drop, ...rest }) => rest);
    try {
      await resolveReport(id, status);
      setClosedHere((m) => ({ ...m, [id]: status }));
      toast(status === 'actioned' ? 'Marked actioned.' : 'Dismissed.');
      refresh();
    } catch {
      // The card stays open and says so: a report that silently leaves the queue is the worse failure.
      setRowErr((m) => ({ ...m, [id]: 'Couldn’t save. It’s still open. Check your connection and tap again.' }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View>
      <Text style={{ marginTop: 8, fontSize: 14, color: c.ink3 }}>{pending ? `${pending} waiting. Oldest first.` : 'Nothing waiting.'}</Text>
      {rows.length === 0 ? (
        <EmptyRow>When someone reports a post, profile or comment it shows up here. Apple expects a timely answer.</EmptyRow>
      ) : (
        <View style={{ marginTop: 16, gap: 12 }}>
          {rows.map((r) => {
            const result = closedHere[r.id] ?? (r.status === 'open' ? null : r.status);
            const tag = waitingTag(daysSince(r.createdAt, at));
            return (
              <View key={r.id} style={{ padding: 16, borderRadius: 14, backgroundColor: c.panel, borderWidth: 1, borderColor: c.panelBd }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <Text style={{ flex: 1, minWidth: 0, fontSize: 13, color: c.ink3 }}>
                    Reported by {r.reporterHandle ? `@${r.reporterHandle}` : 'an athlete'} · {reasonText(r.reason).toLowerCase()}
                  </Text>
                  <Text style={{ fontSize: 13, color: tag.late && !result ? c.warn : c.ink3 }}>{tag.text}</Text>
                </View>
                <Text style={{ marginTop: 8, fontSize: 16, fontWeight: '500', color: c.ink }}>{reportTitle(r)}</Text>
                <View style={{ marginTop: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, backgroundColor: c.field, borderWidth: 1, borderColor: c.line }}>
                  <Text selectable style={{ fontSize: 15, lineHeight: 22, color: c.ink2 }}>
                    {r.note ? `“${r.note}”` : reasonText(r.reason)}
                  </Text>
                </View>
                {rowErr[r.id] ? <Text style={{ marginTop: 10, fontSize: 14, color: c.critInk }}>{rowErr[r.id]}</Text> : null}
                {result ? (
                  <Text style={{ marginTop: 14, minHeight: 20, fontSize: 14, color: c.ink3 }}>{result === 'actioned' ? 'Actioned · content removed' : 'Dismissed · left up'}</Text>
                ) : (
                  <View style={{ marginTop: 14, flexDirection: 'row', gap: 10 }}>
                    <BigBtn kind="quiet" label="Dismiss" busy={busy === `${r.id}:dismissed`} disabled={offline || (!!busy && busy !== `${r.id}:dismissed`)} onPress={() => void resolve(r.id, 'dismissed')} style={{ height: 50 }} />
                    <BigBtn label="Actioned" busy={busy === `${r.id}:actioned`} disabled={offline || (!!busy && busy !== `${r.id}:actioned`)} onPress={() => void resolve(r.id, 'actioned')} style={{ height: 50 }} />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
      {offline && pending ? <Text style={{ marginTop: 12, textAlign: 'center', fontSize: 13, color: c.warn }}>{OFFLINE_MSG}</Text> : null}
    </View>
  );
}

// ── Documents ───────────────────────────────────────────────────────────────

function DocumentsView({ data }: { data: MoreData }) {
  const { c } = useCrm();
  const { offline, toast, refresh, openSheet } = usePhone();
  const q = data.docs;
  const [menu, setMenu] = useState<string | null>(null);
  const [armed, setArmed] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rowErr, setRowErr] = useState<{ id: string; msg: string } | null>(null);
  const armT = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (armT.current) clearTimeout(armT.current);
  }, []);

  if (q.error && !q.data) return <ErrorRow msg={`Couldn’t load documents. ${q.error}`} onRetry={q.refetch} />;
  if (!q.data) return <Skel lines={5} />;
  const rows = [...q.data.rows].sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));

  const openDoc = async (d: Doc) => {
    setRowErr(null);
    // Safari only lets a tap open a tab synchronously, so the tab opens first and the signed link fills it.
    const w = Platform.OS === 'web' ? (globalThis as unknown as { open?: (u: string, t: string) => { location: { href: string }; close: () => void; opener: unknown } | null }).open?.('', '_blank') ?? null : null;
    setBusy(`open:${d.id}`);
    try {
      const url = await documentLink(d);
      if (Platform.OS === 'web') {
        if (w) {
          w.opener = null;
          w.location.href = url;
        } else {
          await Linking.openURL(url);
        }
      } else {
        await Linking.openURL(url);
      }
    } catch (e) {
      w?.close();
      setRowErr({ id: d.id, msg: `Couldn’t open it. ${errorMessage(e)}` });
    } finally {
      setBusy(null);
    }
  };

  const del = async (d: Doc) => {
    if (offline) return toast(OFFLINE_TOAST);
    if (armed !== d.id) {
      setArmed(d.id);
      if (armT.current) clearTimeout(armT.current);
      armT.current = setTimeout(() => setArmed(null), 3000);
      return;
    }
    if (armT.current) clearTimeout(armT.current);
    setArmed(null);
    setBusy(`del:${d.id}`);
    setRowErr(null);
    try {
      await deleteDocument(d.id);
      setMenu(null);
      toast('Deleted.');
      refresh();
    } catch (e) {
      setRowErr({ id: d.id, msg: `Couldn’t delete it. ${errorMessage(e)}` });
    } finally {
      setBusy(null);
    }
  };

  if (rows.length === 0) return <EmptyRow>Nothing filed yet. Tap Add to upload a file or take a photo of a receipt.</EmptyRow>;

  return (
    <View style={{ marginTop: 6 }}>
      {rows.map((d) => {
        const on = menu === d.id;
        const arm = armed === d.id;
        return (
          <View key={d.id} style={{ borderBottomWidth: 1, borderBottomColor: c.line }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Pressable onPress={() => void openDoc(d)} accessibilityRole="button" accessibilityLabel={`Open ${d.title}`} style={{ flex: 1, minWidth: 0, minHeight: 64, paddingVertical: 12 }}>
                <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '500', color: c.ink }}>
                  {busy === `open:${d.id}` ? `Opening “${d.title}”…` : d.title}
                </Text>
                <Text style={{ marginTop: 3, fontSize: 14, color: c.ink3 }}>{`${shelfLabel(d.category)} · ${when(d.updated_at)} · ${kindOf(d)}`}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setMenu(on ? null : d.id);
                  setArmed(null);
                }}
                accessibilityRole="button"
                accessibilityLabel="More actions"
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 20, color: c.ink3 }}>⋯</Text>
              </Pressable>
            </View>
            {rowErr?.id === d.id ? <Text style={{ paddingBottom: 10, fontSize: 14, color: c.critInk }}>{rowErr.msg}</Text> : null}
            {on ? (
              <View style={{ flexDirection: 'row', gap: 10, paddingBottom: 14 }}>
                <Pressable
                  onPress={() =>
                    openSheet({
                      kind: 'docConfirm',
                      params: { editId: d.id, title: d.title, shelf: d.category, fileLine: `${kindOf(d)} · last updated ${when(d.updated_at)}` },
                    })
                  }
                  accessibilityRole="button"
                  style={{ flex: 1, height: 44, borderRadius: 10, borderWidth: 1, borderColor: c.fieldBd, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontSize: 15, color: c.ink }}>Edit</Text>
                </Pressable>
                <Pressable
                  onPress={() => void del(d)}
                  accessibilityRole="button"
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: arm ? c.crit : c.line,
                    backgroundColor: arm ? c.crit : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: offline ? 0.45 : 1,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: arm ? '#FFFFFF' : c.critInk }}>{busy === `del:${d.id}` ? 'Deleting…' : arm ? 'Confirm delete' : 'Delete'}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

// ── Sheets ──────────────────────────────────────────────────────────────────

export function DocPickSheet() {
  const { c } = useCrm();
  const { openSheet, closeSheet } = usePhone();
  const [err, setErr] = useState<string | null>(null);
  const take = (file: PickedFile, photo: boolean) => openSheet({ kind: 'docConfirm', params: { file, photo } });
  return (
    <SheetFrame title="Add a document" onClose={closeSheet}>
      <View style={{ marginTop: 8 }}>
        <FilePick label="Choose from Files" sub="PDF, spreadsheet, image or zip" onFile={(f) => take(f, false)} onError={setErr} />
        <FilePick label="Take a photo" sub="For a paper receipt." photo onFile={(f) => take(f, true)} onError={setErr} />
      </View>
      {err ? <Text style={{ marginTop: 10, fontSize: 14, color: c.critInk }}>{err}</Text> : null}
    </SheetFrame>
  );
}

/** Upload (a picked file) or Edit document (params.editId). */
export function DocConfirmSheet({ params }: { params?: Record<string, unknown> }) {
  const { c } = useCrm();
  const { closeSheet, offline, toast, refresh } = usePhone();
  const editId = typeof params?.editId === 'string' ? params.editId : null;
  const file = !editId && params?.file ? (params.file as PickedFile) : null;
  const photo = params?.photo === true;

  // Initial values from the params this sheet opened with (a new sheet = a new mount).
  const [init] = useState(() => {
    if (editId) return { title: String(params?.title ?? ''), shelf: (params?.shelf as DocCategory) ?? 'other', guessed: true };
    if (!file) return { title: '', shelf: 'other' as DocCategory, guessed: false };
    if (photo) {
      const day = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return { title: `Receipt photo, ${day}`, shelf: 'finance' as DocCategory, guessed: true };
    }
    const g = guessCategory(file.name);
    return { title: titleFromFile(file.name), shelf: g, guessed: g !== 'other' };
  });
  const [title, setTitle] = useState(init.title);
  const [shelf, setShelf] = useState<DocCategory>(init.shelf);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const tooBig = !!file && file.size > MAX_BYTES;
  const fileLine = editId ? String(params?.fileLine ?? '') : file ? `${file.name} · ${bytes(file.size)}` : '';
  const shelfNote = editId ? 'Shelf' : init.guessed ? 'Shelf · guessed from the name, change it if wrong' : 'Shelf · pick one';

  const save = async () => {
    if (busy) return;
    if (offline) return toast(OFFLINE_TOAST);
    const t = title.trim();
    if (!t) return setErr('Give it a title.');
    setBusy(true);
    setErr(null);
    try {
      if (editId) {
        await saveDocument(editId, { title: t, category: shelf });
        toast('Saved.');
      } else {
        if (!file) throw new Error('No file was chosen.');
        if (tooBig) throw new Error('Too big. Files can be up to 50 MB.');
        // A photo from the camera is "image.jpg"; give it a useful name that keeps its extension.
        const ext = file.name.match(/\.[a-z0-9]{1,5}$/i)?.[0] ?? (file.type.startsWith('image/') ? '.jpg' : '');
        const name = photo ? `receipt-${new Date().toISOString().slice(0, 10)}${ext}` : file.name;
        const [res] = await uploadDocumentFiles([{ ...file, name, shelf, title: t }]);
        if (!res?.ok) throw new Error(res?.reason ?? 'Upload failed.');
        toast(`Uploaded to ${shelfLabel(shelf)}.`);
      }
      refresh();
      closeSheet();
    } catch (e) {
      setErr(`${editId ? 'Couldn’t save.' : 'Couldn’t upload.'} ${errorMessage(e)}`);
      setBusy(false);
    }
  };

  return (
    <SheetFrame title={editId ? 'Edit document' : 'Upload'} onClose={busy ? () => {} : closeSheet}>
      <View style={{ marginTop: 12, gap: 16 }}>
        <FieldLabel label="Title">
          <PInput
            returnKeyType="done"
            value={title}
            onChangeText={(v) => {
              setTitle(v);
              setErr(null);
            }}
          />
        </FieldLabel>
        <View>
          <Text style={{ fontSize: 13, color: c.ink3 }}>{shelfNote}</Text>
          <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {DOC_CATEGORIES.map((s) => (
              <PChip key={s.key} size="lg" label={s.label} on={shelf === s.key} onPress={() => setShelf(s.key)} />
            ))}
          </View>
        </View>
        {fileLine ? <Text style={{ fontSize: 13, color: tooBig ? c.critInk : c.ink3 }}>{tooBig ? `${fileLine} · too big, files can be up to 50 MB` : fileLine}</Text> : null}
        {busy && !editId ? <UploadBar /> : null}
        {err ? <Text style={{ fontSize: 14, color: c.critInk }}>{err}</Text> : null}
        <View style={{ flexDirection: 'row' }}>
          <BigBtn label={editId ? (busy ? 'Saving…' : 'Save') : busy ? 'Uploading…' : 'Upload'} busy={busy} disabled={offline || tooBig || (!editId && !file)} onPress={() => void save()} />
        </View>
        {offline ? <Text style={{ textAlign: 'center', fontSize: 13, color: c.warn }}>{OFFLINE_MSG}</Text> : null}
      </View>
    </SheetFrame>
  );
}

/**
 * The upload's progress line. Supabase Storage's upload reports no byte progress, so this is an honest
 * indeterminate bar (a segment sweeping the track), not a percentage it cannot know.
 */
function UploadBar() {
  const { c } = useCrm();
  const [x] = useState(() => new Animated.Value(0));
  const [w, setW] = useState(0);
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(x, { toValue: 1, duration: 1100, useNativeDriver: Platform.OS !== 'web' }));
    loop.start();
    return () => loop.stop();
  }, [x]);
  const seg = Math.max(40, w * 0.35);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityLabel="Uploading" style={{ height: 4, borderRadius: 2, backgroundColor: c.track, overflow: 'hidden' }}>
      <Animated.View style={{ width: seg, height: 4, borderRadius: 2, backgroundColor: c.brz, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-seg, w] }) }] }} />
    </View>
  );
}
