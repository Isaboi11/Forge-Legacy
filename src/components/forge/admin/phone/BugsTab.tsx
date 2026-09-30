import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View, type TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCrm } from '@/components/forge/admin/crm-theme';
import { when } from '@/components/forge/admin/crm-ui';
import { BugPlainView } from '@/components/forge/admin/BugPlain';
import { Select } from '@/components/forge/admin/Select';
import { DEFAULT_BUG_FILTER, usePhone, type BugFilter } from '@/components/forge/admin/phone/context';
import {
  BigBtn,
  BottomBar,
  EmptyRow,
  ErrorRow,
  FieldLabel,
  Muted,
  OfflineLine,
  OverlayScreen,
  PChip,
  PInput,
  PhoneScroll,
  RowButton,
  ScreenTitle,
  Seg,
  SERIF,
  SheetFrame,
  Skel,
} from '@/components/forge/admin/phone/kit';
import { fetchAdminErrorDetail } from '@/data/admin-live';
import {
  BUG_SOURCES,
  dismissReport,
  fetchBugLinks,
  fetchBugs,
  fetchBugSources,
  fetchCrashes,
  fetchReportsInbox,
  originSource,
  saveBug,
  trackReport,
  type Bug,
  type BugBoard,
  type BugSourceName,
  type CrashGroup,
  type InboxReport,
} from '@/data/crm-live';
import { bugBrief, bugsBrief } from '@/domain/admin/bug-brief';
import { BUG_STATUSES, SEVERITIES, type BugSeverity, type BugStatus } from '@/domain/admin/crm-core';
import { errorMessage, useQuery } from '@/lib/useQuery';

/**
 * Bugs on the phone (`Forge CRM Phone.dc.html`, BUGS + the bug / report / crash overlays + the Filter and
 * New bug sheets). The same data and writes as the desktop `BugsPage`: one board (`admin_bugs`, fetched
 * whole and filtered here), the four-source inbox (0239) and the crash groups. "Track this" copies a
 * report onto the board with a back-reference; the original is never edited.
 */

const SAVE_OFF = 'You’re offline, so saving is paused.';
const CRASH_DAYS = 30;
const SEV_LABEL: Record<BugSeverity, string> = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
const SEV_RANK: Record<BugSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
/** The design's AREAS list — merged with the areas the board really uses. */
const AREAS = ['programs', 'squads & social', 'workouts', 'holt', 'nutrition', 'legacy', 'settings', 'admin'];
const MONO = Platform.select({ web: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', ios: 'Menlo', default: 'monospace' });
const TAB: TextStyle = { fontVariant: ['tabular-nums'] };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const statusLabel = (s: BugStatus) => BUG_STATUSES.find((x) => x.key === s)?.label ?? s;
const firstLine = (s: string) => s.split('\n').find((l) => l.trim())?.trim() ?? s;

/** A QA report's markdown as plain reading text (same rule as the desktop page). */
function readableMarkdown(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^(\s*)[-*] /gm, '$1• ');
}

function reportFrom(r: InboxReport): string {
  if (r.source === 'Supabase') return 'Supabase · in-app';
  if (r.source === 'TestFlight') return r.channel || 'TestFlight';
  return 'App Store';
}

function reportMeta(r: InboxReport): string {
  const parts: (string | null)[] =
    r.source === 'Supabase'
      ? [r.handle ? `@${r.handle}` : null, when(r.created_at), r.version ? `v${r.version}` : null, r.platform]
      : r.source === 'TestFlight'
        ? [when(r.created_at), r.version ? `build ${r.version}` : null, r.device]
        : [r.handle, when(r.created_at), r.rating != null ? `${r.rating}★ review` : null, r.country];
  return parts.filter(Boolean).join(' · ');
}

function crashMeta(g: CrashGroup): string {
  return [g.last_seen ? `last seen ${when(g.last_seen, true)}` : null, g.version ? `v${g.version}` : null].filter(Boolean).join(' · ');
}

const days = (iso: string, now: number) => Math.max(0, Math.floor((now - new Date(iso).getTime()) / 86_400_000));

const matchStatus = (s: BugStatus, f: BugFilter['status']) => f === 'all' || (f === 'active' ? s === 'open' || s === 'in_progress' : s === f);

function applyFilter(rows: Bug[], f: BugFilter): Bug[] {
  return rows
    .filter((b) => matchStatus(b.status, f.status) && (!f.severity || b.severity === f.severity) && (!f.source || originSource(b.origin) === f.source) && (!f.area || b.area === f.area))
    .map((b, i) => [b, i] as const)
    .sort(([a, i], [b, j]) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || i - j)
    .map(([b]) => b);
}

const filterCount = (f: BugFilter) => (f.status !== 'active' ? 1 : 0) + (f.severity ? 1 : 0) + (f.source ? 1 : 0) + (f.area ? 1 : 0);

/** The board's real areas, most used first. */
const boardAreas = (rows: Bug[]) => {
  const n = new Map<string, number>();
  rows.forEach((b) => b.area && n.set(b.area, (n.get(b.area) ?? 0) + 1));
  return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([a]) => a);
};

// ── Shared reads (every one lists `stamp`, so pull-to-refresh and saves refetch) ──

/** The whole board, with the clock it was read at (ages are read against it, never Date.now() in render). */
function useBoard() {
  const { stamp, markLoaded } = usePhone();
  return useQuery(async () => {
    const b: BugBoard = await fetchBugs(null, null, null);
    markLoaded();
    return { ...b, at: Date.now() };
  }, [stamp]);
}

function useInbox() {
  const { stamp, markLoaded } = usePhone();
  return useQuery(async () => {
    const r = await fetchReportsInbox(200);
    markLoaded();
    return r;
  }, [stamp]);
}

function useCrashes() {
  const { stamp, markLoaded } = usePhone();
  return useQuery(async () => {
    const r = await fetchCrashes(CRASH_DAYS);
    markLoaded();
    return r;
  }, [stamp]);
}

function useSevColors() {
  const { c } = useCrm();
  return (s: BugSeverity): [string, string] =>
    s === 'critical' ? [c.critInk, c.critTint] : s === 'high' ? [c.warn, c.warnTint] : s === 'medium' ? [c.ink2, c.hover] : [c.ink3, c.hover];
}

function SevTag({ sev }: { sev: BugSeverity }) {
  const [color, bg] = useSevColors()(sev);
  return (
    <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: bg }}>
      <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.44, color }}>{SEV_LABEL[sev]}</Text>
    </View>
  );
}

function useStatusColor() {
  const { c } = useCrm();
  return (s: BugStatus) => (s === 'fixed' ? c.good : s === 'in_progress' ? c.warn : c.ink3);
}

/** After a track: "B4 added to the board" (or merged / already there — the desktop's wording). */
const trackToast = (r: { ref: string; merged: boolean; existing: boolean }) =>
  r.existing ? `Already on the board as ${r.ref}` : r.merged ? `Merged into ${r.ref}` : `${r.ref} added to the board`;

/* "Copy for Claude" (PO 09-29): the board lives in the database, which a coding session can't read, so the
   brief carries the whole item — or every item the filters show — to paste into Claude. */
async function copyForClaude(text: string, what: string, toast: (m: string) => void) {
  try {
    await Clipboard.setStringAsync(text);
    toast(`Copied ${what}. Paste it into Claude.`);
  } catch {
    toast('Couldn’t copy. Your browser blocked the clipboard.');
  }
}

// ── The tab ────────────────────────────────────────────────────────────────

export function BugsTab() {
  const { c } = useCrm();
  const { bugFilter, setBugFilter, bugSeg, setBugSeg, openSheet, open, stamp, toast, refresh, offline } = usePhone();
  /* "Mark all N Fixed" — two taps (the first arms it for 3 s), four saves at a time, a failure never stops the rest. */
  const [bulkArmed, setBulkArmed] = useState(false);
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);
  const statusColor = useStatusColor();

  const board = useBoard();
  const inbox = useInbox();
  const crashes = useCrashes();
  const sources = useQuery(() => fetchBugSources(), [stamp]);
  const links = useQuery(() => fetchBugLinks(), [stamp]);

  const all = board.data?.rows ?? [];
  const shown = applyFilter(all, bugFilter);
  const toClose = shown.filter((b) => b.status === 'open' || b.status === 'in_progress');
  const markAllFixed = async () => {
    if (!bulkArmed) {
      setBulkArmed(true);
      setTimeout(() => setBulkArmed(false), 3000);
      return;
    }
    setBulkArmed(false);
    const list = toClose;
    if (!list.length || bulk || offline) return;
    setBulk({ done: 0, total: list.length });
    let ok = 0;
    let failed = 0;
    for (let i = 0; i < list.length; i += 4) {
      await Promise.all(list.slice(i, i + 4).map((b) => saveBug(b.id, { status: 'fixed' }).then(() => void ok++, () => void failed++)));
      setBulk({ done: Math.min(i + 4, list.length), total: list.length });
    }
    setBulk(null);
    refresh();
    toast(failed ? `Marked ${ok} Fixed. ${failed} couldn’t be saved — try again.` : `Marked ${ok} Fixed.`);
  };
  const nF = filterCount(bugFilter);
  const cnt = board.data?.counts;
  const at = board.data?.at ?? 0;

  const reports = [...(inbox.data ?? [])].map((r, i) => [r, i] as const).sort(([a, i], [b, j]) => (a.state === 'new' ? 0 : 1) - (b.state === 'new' ? 0 : 1) || i - j).map(([r]) => r);
  const reportsNew = inbox.data ? inbox.data.filter((r) => r.state === 'new').length : null;
  const crashRows = crashes.data ?? [];
  const crashNew = crashes.data ? crashRows.filter((g) => g.is_new).length : null;

  const neverSynced = (n: BugSourceName) => {
    const s = (sources.data ?? []).find((x) => x.name === n);
    return !!sources.data && (!s || (!s.live && !s.synced_at));
  };

  const statusWord =
    bugFilter.status === 'active' ? 'open or in progress' : bugFilter.status === 'all' ? 'in total' : statusLabel(bugFilter.status).toLowerCase();
  const summary = [
    `${shown.length} ${statusWord}`,
    bugFilter.severity ? SEV_LABEL[bugFilter.severity] : null,
    bugFilter.source,
    bugFilter.area,
    cnt && nF === 0 ? `${cnt.active_critical} critical, ${cnt.active_high} high` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const inboxGaps: string[] = inbox.data
    ? (['Supabase', 'TestFlight', 'App Store'] as const)
        .filter((s) => !reports.some((r) => r.source === s))
        .map((s) =>
          s === 'Supabase'
            ? 'Nothing from the app’s own “Report a problem” yet.'
            : neverSynced(s)
              ? `Nothing from ${s} yet — it fills in after the App Store key is added.`
              : s === 'TestFlight'
                ? 'Nothing from TestFlight yet.'
                : 'No App Store review has mentioned a bug yet.',
        )
    : [];

  const hasSentry = crashRows.some((g) => g.source === 'Sentry');
  const hasInApp = crashRows.some((g) => g.source === 'Supabase');
  const crashIntro = `From ${hasSentry && hasInApp ? 'Sentry and in-app crashes' : hasInApp ? 'in-app crashes' : 'Sentry'}, grouped by cause, last ${CRASH_DAYS} days.`;

  const filterBtn =
    bugSeg === 'board' ? (
      <Pressable
        onPress={() => openSheet({ kind: 'bugFilter' })}
        accessibilityRole="button"
        style={{ height: 40, paddingHorizontal: 14, borderRadius: 10, justifyContent: 'center', borderWidth: 1, borderColor: nF ? c.brzBd : c.fieldBd, backgroundColor: nF ? c.brzTint : 'transparent' }}
      >
        <Text style={{ fontSize: 14, fontWeight: '600', color: nF ? c.brz : c.ink }}>{nF ? `Filter · ${nF}` : 'Filter'}</Text>
      </Pressable>
    ) : null;

  return (
    <View style={{ flex: 1 }}>
      <PhoneScroll bottomBar>
        <ScreenTitle title="Bugs" right={filterBtn} />
        <OfflineLine />
        <View style={{ marginTop: 14 }}>
          <Seg
            options={[
              { key: 'board', label: 'Board', count: cnt ? cnt.open + cnt.in_progress : null },
              { key: 'reports', label: 'Reports', count: reportsNew },
              { key: 'crashes', label: 'Crashes', count: crashNew == null ? null : crashNew || crashRows.length },
            ]}
            value={bugSeg}
            onChange={setBugSeg}
          />
        </View>

        {bugSeg === 'board' ? (
          board.loading && !board.data ? (
            <Skel lines={6} />
          ) : board.error && !board.data ? (
            <ErrorRow msg={`Couldn’t load the board. ${board.error}`} onRetry={board.refetch} />
          ) : (
            <>
              <Muted style={{ marginTop: 12 }}>{summary}</Muted>
              {shown.length ? (
                <Text
                  onPress={() =>
                    void copyForClaude(
                      bugsBrief(shown, (b) => (links.data ?? []).filter((l) => l.bug_id === b.id), summary),
                      shown.length === 1 ? '1 bug' : `${shown.length} bugs`,
                      toast,
                    )
                  }
                  accessibilityRole="button"
                  style={{ marginTop: 8, paddingVertical: 6, fontSize: 15, fontWeight: '600', color: c.brz }}
                >
                  {shown.length === 1 ? 'Copy this bug for Claude' : `Copy all ${shown.length} for Claude`}
                </Text>
              ) : null}
              {toClose.length || bulk ? (
                <Text
                  onPress={bulk || offline ? undefined : () => void markAllFixed()}
                  accessibilityRole="button"
                  style={{ paddingVertical: 6, fontSize: 15, fontWeight: '600', color: offline ? c.ink3 : c.brz }}
                >
                  {bulk ? `Marking ${bulk.done} of ${bulk.total}…` : bulkArmed ? `Tap again to mark ${toClose.length} Fixed` : `Mark ${toClose.length === 1 ? 'this' : `all ${toClose.length}`} Fixed`}
                </Text>
              ) : null}
              {shown.map((b) => {
                const d = days(b.created_at, at);
                return (
                  <Pressable
                    key={b.id}
                    onPress={() => open({ kind: 'bug', id: b.id })}
                    accessibilityRole="button"
                    accessibilityLabel={b.title}
                    style={({ pressed }) => ({ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.line, backgroundColor: pressed ? c.hover : 'transparent' })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <SevTag sev={b.severity} />
                      <Text style={[{ fontSize: 13, color: c.ink3 }, TAB]}>
                        {b.ref ?? '—'} · {originSource(b.origin)} · {d ? `${d}d` : 'today'}
                      </Text>
                    </View>
                    <Text style={{ marginTop: 6, fontSize: 16, fontWeight: '500', lineHeight: 21.6, color: c.ink }}>{b.title}</Text>
                    <Text style={{ marginTop: 3, fontSize: 14, color: c.ink3 }}>
                      {b.area ?? 'No area'} · <Text style={{ color: statusColor(b.status) }}>{statusLabel(b.status)}</Text>
                    </Text>
                  </Pressable>
                );
              })}
              {shown.length === 0 ? (
                all.length === 0 ? (
                  <EmptyRow>The board is empty. File a bug, or track a user report or crash.</EmptyRow>
                ) : (
                  <EmptyRow>
                    No bugs match these filters.{' '}
                    <Text onPress={() => setBugFilter(DEFAULT_BUG_FILTER)} accessibilityRole="button" style={{ color: c.brz }}>
                      Clear filters
                    </Text>
                  </EmptyRow>
                )
              ) : null}
            </>
          )
        ) : null}

        {bugSeg === 'reports' ? (
          <>
            <Muted style={{ marginTop: 12 }}>From the in-app reporter (Supabase), TestFlight feedback and App Store reviews. Track one to put it on the board.</Muted>
            {inbox.loading && !inbox.data ? (
              <Skel lines={4} />
            ) : inbox.error && !inbox.data ? (
              <ErrorRow msg={`Couldn’t load user reports. ${inbox.error}`} onRetry={inbox.refetch} />
            ) : (
              <>
                {reports.map((r) => (
                  <RowButton
                    key={r.origin}
                    onPress={() => open({ kind: 'report', id: r.origin })}
                    label={firstLine(r.body)}
                    dim={r.state === 'dismissed'}
                    right={
                      <Text style={{ fontSize: 13, color: r.state === 'new' ? c.brz : c.ink3 }}>
                        {r.state === 'new' ? 'New' : r.state === 'tracked' ? `On the board as ${r.bug_ref ?? '—'}` : 'Dismissed'}
                      </Text>
                    }
                  >
                    <Text numberOfLines={2} style={{ fontSize: 16, fontWeight: '500', color: c.ink }}>
                      {firstLine(r.body)}
                    </Text>
                    <Text style={{ marginTop: 3, fontSize: 14, color: c.ink3 }}>
                      <Text style={{ color: c.ink2 }}>{reportFrom(r)}</Text>
                      {reportMeta(r) ? ` · ${reportMeta(r)}` : ''}
                    </Text>
                  </RowButton>
                ))}
                {inboxGaps.length ? (
                  <View style={{ paddingVertical: 14, gap: 4 }}>
                    {inboxGaps.map((g) => (
                      <Muted key={g}>{g}</Muted>
                    ))}
                  </View>
                ) : null}
              </>
            )}
          </>
        ) : null}

        {bugSeg === 'crashes' ? (
          <>
            <Muted style={{ marginTop: 12 }}>{crashIntro}</Muted>
            {crashes.loading && !crashes.data ? (
              <Skel lines={4} />
            ) : crashes.error && !crashes.data ? (
              <ErrorRow msg={`Couldn’t load crashes. ${crashes.error}`} onRetry={crashes.refetch} />
            ) : crashRows.length === 0 ? (
              <EmptyRow>
                {`No crashes in the last ${CRASH_DAYS} days.`}
                {neverSynced('Sentry') ? ' Sentry hasn’t synced yet, so only the app’s own crash reports are counted.' : ''}
              </EmptyRow>
            ) : (
              crashRows.map((g) => (
                <RowButton key={g.origin} onPress={() => open({ kind: 'crash', id: g.origin })} label={g.title}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 16, fontWeight: '500', color: c.ink, flexShrink: 1 }}>{g.title}</Text>
                    {g.is_new ? (
                      <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: c.warnTint }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: c.warn }}>New</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[{ marginTop: 3, fontSize: 14, color: c.ink3 }, TAB]}>
                    {[plural(g.events, 'crash', 'crashes'), plural(g.people, 'person', 'people'), crashMeta(g)].filter(Boolean).join(' · ')}
                  </Text>
                </RowButton>
              ))
            )}
          </>
        ) : null}
      </PhoneScroll>
      <BottomBar>
        <BigBtn label="New bug" onPress={() => openSheet({ kind: 'newBug' })} />
      </BottomBar>
    </View>
  );
}

// ── Bug detail ─────────────────────────────────────────────────────────────

interface SaveState {
  state: 'saving' | 'saved' | 'error';
  msg: string;
}

function StatusBtn({ label, on, disabled, onPress }: { label: string; on: boolean; disabled: boolean; onPress: () => void }) {
  const { c } = useCrm();
  const base = { height: 48, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 } as const;
  const text = <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 14, fontWeight: '600', color: on ? c.btnInk : c.ink }}>{label}</Text>;
  return (
    <Pressable onPress={disabled ? undefined : onPress} accessibilityRole="button" accessibilityState={{ selected: on, disabled }} style={{ flex: 1, opacity: disabled ? 0.5 : 1 }}>
      {on ? (
        <LinearGradient colors={c.btn} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[base, { borderColor: c.btnBd }]}>
          {text}
        </LinearGradient>
      ) : (
        <View style={[base, { borderColor: c.fieldBd }]}>{text}</View>
      )}
    </Pressable>
  );
}

export function BugOverlay({ id, backLabel }: { id: string; backLabel: string }) {
  const { c } = useCrm();
  const { back, offline, refresh, stamp, toast } = usePhone();
  const insets = useSafeAreaInsets();
  const board = useBoard();
  const links = useQuery(() => fetchBugLinks(), [stamp]);

  /* Values the server has CONFIRMED that the refetch hasn't brought back yet (nothing optimistic). */
  const [patch, setPatch] = useState<Partial<Bug>>({});
  const [save, setSave] = useState<SaveState | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [noteSave, setNoteSave] = useState<SaveState | null>(null);
  /* null = the default, which is OPEN for a bug filed a moment ago (the design opens ⋯ on a new bug). */
  const [menu, setMenu] = useState<boolean | null>(null);
  const [sevTouched, setSevTouched] = useState(false);

  const raw = board.data?.rows.find((b) => b.id === id) ?? null;
  const bug: Bug | null = raw ? { ...raw, ...patch } : null;
  const at = board.data?.at ?? 0;
  const isNew = !!bug && !sevTouched && at - new Date(bug.created_at).getTime() < 60_000;
  const menuOpen = menu ?? isNew;

  const setField = async (key: 'severity' | 'status', value: string) => {
    if (!bug || offline || bug[key] === value || save?.state === 'saving') return;
    const label = key === 'severity' ? `Severity ${SEV_LABEL[value as BugSeverity]}` : statusLabel(value as BugStatus);
    const prev = key === 'severity' ? SEV_LABEL[bug.severity] : statusLabel(bug.status);
    if (key === 'severity') {
      setMenu(false);
      setSevTouched(true);
    }
    setSave({ state: 'saving', msg: label });
    try {
      await saveBug(bug.id, { [key]: value } as Partial<Pick<Bug, 'severity' | 'status'>>);
      setPatch((p) => ({ ...p, [key]: value }));
      setSave({ state: 'saved', msg: label });
      refresh();
    } catch (e) {
      setSave({ state: 'error', msg: `Couldn’t save. It’s still “${prev}”. ${errorMessage(e)}` });
    }
  };

  const saveNote = async () => {
    if (!bug || note == null || offline) return;
    const text = note.trim();
    if (text === (bug.note ?? '').trim()) return;
    setNoteSave({ state: 'saving', msg: '' });
    try {
      await saveBug(bug.id, { note: text || null });
      setPatch((p) => ({ ...p, note: text || null }));
      setNote(null);
      setNoteSave({ state: 'saved', msg: '' });
      refresh();
    } catch (e) {
      setNoteSave({ state: 'error', msg: `Couldn’t save the note. ${errorMessage(e)}` });
    }
  };

  if (!bug) {
    return (
      <OverlayScreen backLabel={backLabel} onBack={back}>
        {board.loading && !board.data ? <Skel lines={5} /> : board.error && !board.data ? <ErrorRow msg={`Couldn’t load this bug. ${board.error}`} onRetry={board.refetch} /> : <EmptyRow>This bug isn’t on the board any more.</EmptyRow>}
      </OverlayScreen>
    );
  }

  const d = days(bug.created_at, at);
  const active = bug.status === 'open' || bug.status === 'in_progress';
  const ageLong = active ? (d ? `open ${plural(d, 'day', 'days')}` : 'added today') : bug.closed_at ? `closed ${when(bug.closed_at)}` : statusLabel(bug.status).toLowerCase();
  const src = bug.source === 'qa' ? (bug.round ? `QA round ${bug.round}` : 'QA report') : !bug.origin ? 'filed by you' : /^(sentry|error):/.test(bug.origin) ? 'tracked crash' : 'tracked report';
  const paras = (bug.detail ?? '')
    .split(/\n\s*\n/)
    .map((p) => readableMarkdown(p).trim())
    .filter(Boolean);

  const mine = (links.data ?? []).filter((l) => l.bug_id === bug.id);
  const also = mine.length
    ? `Also reported in ${BUG_SOURCES.map((s) => [s, mine.filter((l) => l.source === s).length] as const)
        .filter(([, n]) => n > 0)
        .map(([s, n]) => `${s} · ${plural(n, 'report', 'reports')}`)
        .join(', ')}.`
    : null;

  const savedLine = offline ? SAVE_OFF : !save ? 'Saves as you tap' : save.state === 'saving' ? `Saving “${save.msg}”…` : save.state === 'error' ? save.msg : `Saved · ${save.msg}`;
  const savedColor = offline ? c.warn : save?.state === 'error' ? c.critInk : save?.state === 'saved' ? c.good : c.ink3;

  return (
    <View style={{ flex: 1 }}>
      <OverlayScreen
        backLabel={backLabel}
        onBack={back}
        right={
          <Pressable
            onPress={() => setMenu(!menuOpen)}
            accessibilityRole="button"
            accessibilityLabel="Severity"
            style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: menuOpen ? c.hover : 'transparent' }}
          >
            <Text style={{ fontSize: 20, color: c.ink }}>⋯</Text>
          </Pressable>
        }
        bottom={
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {BUG_STATUSES.map((s) => (
                <StatusBtn key={s.key} label={s.label} on={bug.status === s.key} disabled={offline} onPress={() => void setField('status', s.key)} />
              ))}
            </View>
            <Text style={{ marginTop: 8, textAlign: 'center', fontSize: 13, color: savedColor }}>{savedLine}</Text>
          </View>
        }
      >
        <Text style={{ fontSize: 14, color: c.ink3 }}>
          {bug.ref ?? '—'} · {originSource(bug.origin)} · {src}
        </Text>
        <Text selectable style={{ marginTop: 8, fontFamily: SERIF, fontSize: 26, lineHeight: 31.2, color: c.ink }}>
          {bug.title}
        </Text>
        <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <SevTag sev={bug.severity} />
          <Text style={{ fontSize: 14, color: c.ink3 }}>
            {bug.area ?? 'No area'} · {ageLong}
          </Text>
        </View>
        {isNew ? <Text style={{ marginTop: 14, fontSize: 14, lineHeight: 20.3, color: c.brz }}>Now on the board as {bug.ref ?? 'a new item'}. Set a severity with ⋯ at the top.</Text> : null}
        {also ? <Text style={{ marginTop: 14, fontSize: 14, lineHeight: 20.3, color: c.ink2 }}>{also}</Text> : null}
        <Text
          onPress={() => void copyForClaude(bugBrief(bug, mine), bug.ref ?? 'the bug', toast)}
          accessibilityRole="button"
          style={{ marginTop: 14, alignSelf: 'flex-start', paddingVertical: 6, fontSize: 15, fontWeight: '600', color: c.brz }}
        >
          Copy for Claude
        </Text>
        <View style={{ marginTop: 18 }}>
          <BugPlainView bug={bug} offline={offline} phone>
            <View style={{ gap: 12 }}>
          {paras.length ? (
            paras.map((p, i) => (
              <Text key={i} selectable style={{ fontSize: 16, lineHeight: 24.8, color: c.ink2 }}>
                {p}
              </Text>
            ))
          ) : (
            <Text style={{ fontSize: 16, lineHeight: 24.8, color: c.ink3 }}>No description yet.</Text>
          )}
            </View>
          </BugPlainView>
        </View>
        <Text style={{ marginTop: 26, fontSize: 12, fontWeight: '600', letterSpacing: 0.96, textTransform: 'uppercase', color: c.ink3 }}>Note</Text>
        <PInput
          multiline
          value={note ?? bug.note ?? ''}
          onChangeText={setNote}
          onBlur={() => void saveNote()}
          editable={!offline}
          placeholder="Add a note for yourself"
          accessibilityLabel="Note"
          style={{ marginTop: 10 }}
        />
        {noteSave ? (
          <Text style={{ marginTop: 6, fontSize: 13, color: noteSave.state === 'error' ? c.critInk : c.ink3 }}>
            {noteSave.state === 'saving' ? 'Saving note…' : noteSave.state === 'error' ? noteSave.msg : 'Note saved'}
          </Text>
        ) : null}
      </OverlayScreen>

      {menuOpen ? (
        <View
          style={{
            position: 'absolute',
            top: insets.top + 52,
            right: 16,
            width: 220,
            zIndex: 2,
            padding: 6,
            borderRadius: 14,
            backgroundColor: c.tip,
            borderWidth: 1,
            borderColor: c.panelBd,
            shadowColor: '#000',
            shadowOpacity: 0.35,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 16 },
            elevation: 12,
          }}
        >
          <Text style={{ paddingTop: 8, paddingHorizontal: 12, paddingBottom: 6, fontSize: 12, color: c.ink3 }}>Severity</Text>
          {SEVERITIES.map((s) => {
            const on = bug.severity === s;
            return (
              <Pressable
                key={s}
                onPress={() => void setField('severity', s)}
                disabled={offline}
                accessibilityRole="button"
                accessibilityState={{ selected: on, disabled: offline }}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44, paddingHorizontal: 12, borderRadius: 9, backgroundColor: on ? c.brzTint : 'transparent', opacity: offline ? 0.5 : 1 }}
              >
                <Text style={{ fontSize: 16, color: on ? c.brz : c.ink }}>{SEV_LABEL[s]}</Text>
                <Text style={{ fontSize: 16, color: c.brz }}>{on ? '✓' : ''}</Text>
              </Pressable>
            );
          })}
          {offline ? <Text style={{ paddingHorizontal: 12, paddingVertical: 6, fontSize: 12, color: c.warn }}>{SAVE_OFF}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

// ── Report ─────────────────────────────────────────────────────────────────

export function ReportOverlay({ id, backLabel }: { id: string; backLabel: string }) {
  const { c } = useCrm();
  const { back, open, offline, refresh, toast } = usePhone();
  const inbox = useInbox();
  const [busy, setBusy] = useState<'track' | 'dismiss' | 'undo' | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const r = (inbox.data ?? []).find((x) => x.origin === id) ?? null;

  if (!r) {
    return (
      <OverlayScreen backLabel={backLabel} onBack={back}>
        {inbox.loading && !inbox.data ? <Skel lines={5} /> : inbox.error && !inbox.data ? <ErrorRow msg={`Couldn’t load this report. ${inbox.error}`} onRetry={inbox.refetch} /> : <EmptyRow>This report isn’t in the inbox any more.</EmptyRow>}
      </OverlayScreen>
    );
  }

  const track = async () => {
    if (offline || busy) return;
    setBusy('track');
    setErr(null);
    try {
      const res = await trackReport(r.origin, null);
      refresh();
      toast(trackToast(res));
      back();
      open({ kind: 'bug', id: res.id });
    } catch (e) {
      setErr(`Couldn’t add it to the board. ${errorMessage(e)}`);
      setBusy(null);
    }
  };

  const dismiss = async (on: boolean) => {
    if (offline || busy) return;
    setBusy(on ? 'dismiss' : 'undo');
    setErr(null);
    try {
      await dismissReport(r.origin, on);
      refresh();
      if (on) {
        toast('Report dismissed.');
        back();
      } else {
        toast('Report is back in the inbox.');
        setBusy(null);
      }
    } catch (e) {
      setErr(`Couldn’t save. ${errorMessage(e)}`);
      setBusy(null);
    }
  };

  const pending = r.state === 'new';

  return (
    <OverlayScreen
      backLabel={backLabel}
      onBack={back}
      bottom={
        pending ? (
          <View style={{ flex: 1, gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <BigBtn kind="quiet" label="Dismiss" busy={busy === 'dismiss'} disabled={offline || (!!busy && busy !== 'dismiss')} onPress={() => void dismiss(true)} style={{ flex: 1 }} />
              <BigBtn label="Track this" busy={busy === 'track'} disabled={offline || (!!busy && busy !== 'track')} onPress={() => void track()} style={{ flex: 2 }} />
            </View>
            {offline ? <Text style={{ textAlign: 'center', fontSize: 13, color: c.warn }}>{SAVE_OFF}</Text> : null}
            {err ? <Text style={{ textAlign: 'center', fontSize: 13, color: c.critInk }}>{err}</Text> : null}
          </View>
        ) : undefined
      }
    >
      <Text style={{ fontSize: 14, color: c.ink3 }}>User report · {reportFrom(r)}</Text>
      <Text selectable style={{ marginTop: 8, fontFamily: SERIF, fontSize: 26, lineHeight: 31.2, color: c.ink }}>
        {firstLine(r.body)}
      </Text>
      {reportMeta(r) ? <Text style={{ marginTop: 8, fontSize: 14, color: c.ink3 }}>{reportMeta(r)}</Text> : null}
      <Text selectable style={{ marginTop: 18, fontSize: 16, lineHeight: 24.8, color: c.ink2 }}>
        {r.body.trim()}
      </Text>
      {r.state === 'tracked' ? <Text style={{ marginTop: 18, fontSize: 14, color: c.ink3 }}>On the board as {r.bug_ref ?? '—'}.</Text> : null}
      {r.state === 'dismissed' ? (
        <Text style={{ marginTop: 18, fontSize: 14, color: c.ink3 }}>
          Dismissed.{' '}
          <Text onPress={offline || busy ? undefined : () => void dismiss(false)} accessibilityRole="button" style={{ fontWeight: '600', color: c.brz }}>
            {busy === 'undo' ? 'Undoing…' : 'Undo'}
          </Text>
        </Text>
      ) : null}
      {!pending && err ? <Text style={{ marginTop: 8, fontSize: 13, color: c.critInk }}>{err}</Text> : null}
    </OverlayScreen>
  );
}

// ── Crash ──────────────────────────────────────────────────────────────────

export function CrashOverlay({ id, backLabel }: { id: string; backLabel: string }) {
  const { c } = useCrm();
  const { back, open, offline, refresh, toast, stamp } = usePhone();
  const crashes = useCrashes();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const g = (crashes.data ?? []).find((x) => x.origin === id) ?? null;
  const inApp = g?.source === 'Supabase';
  /* In-app crashes carry no trail in `admin_crashes`; their breadcrumbs come from the 0176 detail call. */
  const fp = inApp && g ? g.origin.slice('error:'.length) : '';
  const detail = useQuery(() => (fp ? fetchAdminErrorDetail(fp, 1) : Promise.resolve([])), [fp, stamp]);

  if (!g) {
    return (
      <OverlayScreen backLabel={backLabel} onBack={back}>
        {crashes.loading && !crashes.data ? <Skel lines={5} /> : crashes.error && !crashes.data ? <ErrorRow msg={`Couldn’t load this crash. ${crashes.error}`} onRetry={crashes.refetch} /> : <EmptyRow>{`This crash isn’t in the last ${CRASH_DAYS} days any more.`}</EmptyRow>}
      </OverlayScreen>
    );
  }

  const occ = inApp ? (detail.data?.[0] ?? null) : null;
  const trail: string[] = inApp
    ? (occ?.breadcrumbs ?? []).map((cr) => `${cr.label}${cr.detail ? ` ${cr.detail}` : ''}${cr.n && cr.n > 1 ? ` ×${cr.n}` : ''}`)
    : (g.trail ?? []).map((t) => t.label ?? t.kind ?? '').filter(Boolean);
  const stack = (inApp ? (occ?.stack ?? occ?.componentStack ?? '') : (g.stack ?? '')).trim();

  const track = async () => {
    if (offline || busy || g.bug_ref) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await trackReport(g.origin, null);
      refresh();
      toast(trackToast(res));
      back();
      open({ kind: 'bug', id: res.id });
    } catch (e) {
      setErr(`Couldn’t add it to the board. ${errorMessage(e)}`);
      setBusy(false);
    }
  };

  const head = (label: string) => (
    <Text style={{ marginTop: 24, fontSize: 12, fontWeight: '600', letterSpacing: 0.96, textTransform: 'uppercase', color: c.ink3 }}>{label}</Text>
  );

  return (
    <OverlayScreen
      backLabel={backLabel}
      onBack={back}
      bottom={
        <View style={{ flex: 1, gap: 8 }}>
          <BigBtn label={g.bug_ref ? `On the board as ${g.bug_ref}` : 'Track this'} busy={busy} disabled={!!g.bug_ref || offline} onPress={() => void track()} />
          {offline && !g.bug_ref ? <Text style={{ textAlign: 'center', fontSize: 13, color: c.warn }}>{SAVE_OFF}</Text> : null}
          {err ? <Text style={{ textAlign: 'center', fontSize: 13, color: c.critInk }}>{err}</Text> : null}
        </View>
      }
    >
      <Text style={{ fontSize: 14, color: c.ink3 }}>
        {inApp ? 'In-app crash' : 'Sentry crash'}
        {crashMeta(g) ? ` · ${crashMeta(g)}` : ''}
      </Text>
      <Text selectable style={{ marginTop: 8, fontFamily: SERIF, fontSize: 26, lineHeight: 31.2, color: c.ink }}>
        {g.title}
      </Text>
      <Text style={[{ marginTop: 8, fontSize: 15, color: c.ink2 }, TAB]}>
        {plural(g.events, 'crash', 'crashes')} · {plural(g.people, 'person', 'people')}
      </Text>

      {head('What they did before it crashed')}
      {inApp && detail.loading && !detail.data ? (
        <Skel lines={3} />
      ) : inApp && detail.error && !detail.data ? (
        <ErrorRow msg={`Couldn’t load the trail. ${detail.error}`} onRetry={detail.refetch} />
      ) : trail.length === 0 ? (
        <Muted style={{ marginTop: 8 }}>{inApp ? 'No trail with this report — the athlete has usage measurement turned off.' : 'No trail came with this crash’s latest event.'}</Muted>
      ) : (
        trail.map((t, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 44, borderBottomWidth: 1, borderBottomColor: c.line }}>
            <Text style={[{ width: 20, fontSize: 13, color: c.ink3 }, TAB]}>{i + 1}</Text>
            <Text selectable style={{ flex: 1, minWidth: 0, fontSize: 15, color: c.ink }}>
              {t}
            </Text>
          </View>
        ))
      )}

      {head('Stack')}
      {stack ? (
        <ScrollView
          horizontal
          keyboardDismissMode={KEYBOARD_DISMISS_MODE}
          automaticallyAdjustKeyboardInsets={false}
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 10, borderRadius: 10, backgroundColor: c.field, borderWidth: 1, borderColor: c.line }}
          contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 14 }}
        >
          <Text selectable style={{ fontFamily: MONO, fontSize: 12, lineHeight: 19.2, color: c.ink2 }}>
            {stack}
          </Text>
        </ScrollView>
      ) : inApp && detail.loading && !detail.data ? null : (
        <Muted style={{ marginTop: 8 }}>No stack came with this crash.</Muted>
      )}
    </OverlayScreen>
  );
}

// ── Sheets ─────────────────────────────────────────────────────────────────

function ChipGroup({ label, children }: { label: string; children: React.ReactNode }) {
  const { c } = useCrm();
  return (
    <View>
      <Text style={{ marginTop: 16, fontSize: 13, color: c.ink3 }}>{label}</Text>
      <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
    </View>
  );
}

export function BugFilterSheet() {
  const { bugFilter: f, setBugFilter, closeSheet } = usePhone();
  const board = useBoard();
  const rows = board.data?.rows ?? [];
  const n = applyFilter(rows, f).length;
  const areas = boardAreas(rows);
  const set = (p: Partial<BugFilter>) => setBugFilter({ ...f, ...p });

  const statuses: { key: BugFilter['status']; label: string }[] = [{ key: 'active', label: 'Active' }, ...BUG_STATUSES, { key: 'all', label: 'All' }];

  return (
    <SheetFrame title="Filter bugs" onClose={closeSheet}>
      <ChipGroup label="Status">
        {statuses.map((s) => (
          <PChip key={s.key} size="lg" label={s.label} on={f.status === s.key} onPress={() => set({ status: s.key })} />
        ))}
      </ChipGroup>
      <ChipGroup label="Severity">
        <PChip size="lg" label="Any" on={!f.severity} onPress={() => set({ severity: null })} />
        {SEVERITIES.map((s) => (
          <PChip key={s} size="lg" label={SEV_LABEL[s]} on={f.severity === s} onPress={() => set({ severity: s })} />
        ))}
      </ChipGroup>
      <ChipGroup label="Source">
        <PChip size="lg" label="Any" on={!f.source} onPress={() => set({ source: null })} />
        {BUG_SOURCES.map((s) => (
          <PChip key={s} size="lg" label={s} on={f.source === s} onPress={() => set({ source: s })} />
        ))}
      </ChipGroup>
      <ChipGroup label="Area">
        <PChip size="lg" label="Any" on={!f.area} onPress={() => set({ area: null })} />
        {areas.map((a) => (
          <PChip key={a} size="lg" label={a} on={f.area === a} onPress={() => set({ area: a })} />
        ))}
      </ChipGroup>
      <View style={{ marginTop: 24, flexDirection: 'row', gap: 10 }}>
        <BigBtn kind="quiet" label="Reset" onPress={() => setBugFilter(DEFAULT_BUG_FILTER)} style={{ flex: 1 }} />
        <BigBtn label={board.data ? `Show ${plural(n, 'bug', 'bugs')}` : 'Show bugs'} onPress={closeSheet} style={{ flex: 2 }} />
      </View>
    </SheetFrame>
  );
}

export function NewBugSheet() {
  const { c } = useCrm();
  const { closeSheet, offline, refresh, toast, open, setBugFilter, setBugSeg } = usePhone();
  const board = useBoard();
  const [title, setTitle] = useState('');
  const [sev, setSev] = useState<BugSeverity>('high');
  const [area, setArea] = useState('programs');
  const [desc, setDesc] = useState('');
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const real = boardAreas(board.data?.rows ?? []);
  const areas = [...real, ...AREAS.filter((a) => !real.includes(a))];

  const create = async () => {
    if (offline || busy) return;
    const t = title.trim();
    if (!t) {
      setMissing(true);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const id = await saveBug(null, { title: t, severity: sev, area: area.trim() || null, detail: desc.trim() || null });
      /* `admin_bug_save` returns the id only; the ref is read back, never guessed (the database assigns it). */
      let ref: string | null = null;
      try {
        ref = (await fetchBugs('open', sev, t)).rows.find((r) => r.id === id)?.ref ?? null;
      } catch {
        /* the bug is saved; only the toast's wording falls back */
      }
      refresh();
      toast(ref ? `${ref} added to the board` : 'Added to the board');
      setBugFilter(DEFAULT_BUG_FILTER);
      setBugSeg('board');
      closeSheet();
      open({ kind: 'bug', id }, 'bugs');
    } catch (e) {
      setErr(`Couldn’t add it. ${errorMessage(e)}`);
      setBusy(false);
    }
  };

  return (
    <SheetFrame title="New bug" onClose={closeSheet}>
      <View style={{ marginTop: 12, gap: 16 }}>
        <FieldLabel label="What’s wrong">
          <PInput
            value={title}
            onChangeText={(v) => {
              setTitle(v);
              if (v.trim()) setMissing(false);
            }}
            placeholder="One line, as you’d say it"
            accessibilityLabel="What’s wrong"
            style={missing ? { borderColor: c.crit } : null}
          />
          {missing ? <Text style={{ fontSize: 14, color: c.critInk }}>Give the bug a title.</Text> : null}
        </FieldLabel>
        <View>
          <Text style={{ fontSize: 13, color: c.ink3 }}>Severity</Text>
          <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SEVERITIES.map((s) => (
              <PChip key={s} size="lg" label={SEV_LABEL[s]} on={sev === s} onPress={() => setSev(s)} />
            ))}
          </View>
        </View>
        <FieldLabel label="Area">
          <Select value={area} options={areas.map((a) => ({ value: a, label: a }))} onChange={setArea} accessibilityLabel="Area" />
        </FieldLabel>
        <FieldLabel label="Details (optional)">
          <PInput multiline value={desc} onChangeText={setDesc} placeholder="Steps, device, what you expected" accessibilityLabel="Details" />
        </FieldLabel>
        {err ? <Text style={{ fontSize: 14, color: c.critInk }}>{err}</Text> : null}
        <View style={{ flexDirection: 'row' }}>
          <BigBtn label="Add to the board" busy={busy} disabled={offline} onPress={() => void create()} />
        </View>
        {offline ? <Text style={{ textAlign: 'center', fontSize: 13, color: c.warn }}>{SAVE_OFF}</Text> : null}
      </View>
    </SheetFrame>
  );
}
