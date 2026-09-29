import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Text, View, type TextStyle } from 'react-native';

import { useCrm } from '@/components/forge/admin/crm-theme';
import {
  age,
  Btn,
  Chip,
  DeleteBtn,
  DISPLAY,
  ErrorLine,
  Field,
  FieldGrid,
  FormPanel,
  HeroFigures,
  HoverRow,
  Input,
  LinkText,
  Opt,
  PageHeader,
  Panel,
  Row,
  Skeleton,
  useLayout,
  useToast,
  useTwoTap,
  when,
  type Figure,
} from '@/components/forge/admin/crm-ui';
import type { PageProps } from '@/components/forge/admin/pages/types';
import { fetchAdminErrorDetail, setErrorStatus } from '@/data/admin-live';
import {
  BUG_SOURCES,
  deleteBug,
  dismissReport,
  fetchBugLinks,
  fetchBugs,
  fetchBugSources,
  fetchCrashes,
  fetchReportsInbox,
  originSource,
  runSentrySync,
  saveBug,
  trackReport,
  type Bug,
  type BugLink,
  type BugSource,
  type BugSourceName,
  type CrashGroup,
  type InboxReport,
} from '@/data/crm-live';
import { bugBrief, bugsBrief } from '@/domain/admin/bug-brief';
import { BUG_STATUSES, SEVERITIES, type BugSeverity, type BugStatus } from '@/domain/admin/crm-core';
import { bugsNote } from '@/domain/admin/notes/bugs';
import { errorMessage, useQuery } from '@/lib/useQuery';

/**
 * Bugs — the one bug board (Admin-Analytics-Amendment-002, AA-D19 + AA-D21), built to `Forge CRM.v2.dc.html`.
 *
 * ══ ONE BOARD, FOUR SOURCES, ORIGINALS UNTOUCHED ══
 *
 * `ops_bugs` holds the QA-report items, the bugs filed here by hand, and reports tracked from any source.
 * The reports themselves stay where they live — in-app reports (feedback, 0167), TestFlight feedback and
 * App Store reviews (0239 inbox), Sentry issues and in-app crashes (0239 crashes). "Track this" COPIES one
 * onto the board with a back-reference (`origin`); "Add to B3" merges it into an existing item
 * (`ops_bug_links`). Neither ever edits or deletes the original.
 *
 * ══ THE WHOLE BOARD IS FETCHED ONCE ══
 *
 * `admin_bugs` is called unfiltered (ceiling 1000 rows; the board is ~300) and every chip, the search and
 * the chip counts work on those rows. That keeps a saved row on screen when a filter would drop it (marking
 * a bug Fixed under "Active" must not yank the detail away mid-edit), lets the Source column be read
 * straight off the rows' `origin`, and makes the chip counts and the list agree by construction. The
 * figures above the tabs come from `counts`, which the SQL computes over the whole table.
 */

type Tab = 'tracker' | 'reports' | 'crashes';
type StatusFilter = 'active' | BugStatus | 'all';

const STATUS_CHIPS: { key: StatusFilter; label: string }[] = [
  { key: 'active', label: 'Active' },
  ...BUG_STATUSES,
  { key: 'all', label: 'All' },
];

const SEV_LABEL: Record<BugSeverity, string> = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
const statusLabel = (s: BugStatus) => BUG_STATUSES.find((x) => x.key === s)?.label ?? s;

/* The crash list's window. `admin_crashes` flags a group New when it first appeared in the last 7 days;
   the tab count and the "Crash groups" figure both count those flags, so they always agree. */
const CRASH_DAYS = 30;

const MONO = Platform.select({ web: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', ios: 'Menlo', default: 'monospace' });
const TABULAR: TextStyle = { fontVariant: ['tabular-nums'] };
const TABLE_MIN = 710;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const matchStatus = (s: BugStatus, f: StatusFilter) => f === 'all' || (f === 'active' ? s === 'open' || s === 'in_progress' : s === f);

/** "2 min ago", "3 hr ago", "4 days ago" — the source cards' sync line. */
function ago(iso: string, now: number): string {
  const m = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  return plural(Math.floor(h / 24), 'day ago', 'days ago');
}

/** The report's title: its first non-empty line. */
const firstLine = (s: string) => s.split('\n').find((l) => l.trim())?.trim() ?? s;

/** Where a report came from, as the row's bold lead: "Supabase · in-app", "TestFlight crash", "App Store". */
function reportFrom(r: InboxReport): string {
  if (r.source === 'Supabase') return 'Supabase · in-app';
  if (r.source === 'TestFlight') return r.channel || 'TestFlight';
  return 'App Store';
}

/** Who and on what — only what the inbox returns. App Store nicknames aren't Forge handles, so no "@". */
function reportMeta(r: InboxReport): string {
  const parts: (string | null)[] =
    r.source === 'Supabase'
      ? [r.handle ? `@${r.handle}` : null, when(r.created_at), r.version ? `v${r.version}` : null, r.platform]
      : r.source === 'TestFlight'
        ? [when(r.created_at), r.version ? `build ${r.version}` : null, r.device]
        : [r.handle, when(r.created_at), r.rating != null ? `${r.rating}★ review` : null, r.country];
  return parts.filter(Boolean).join(' · ');
}

interface SaveState {
  id: string;
  state: 'saving' | 'saved' | 'error';
  msg: string;
}

interface NewBug {
  title: string;
  area: string;
  sev: BugSeverity;
  desc: string;
}

/** A QA report's markdown as plain reading text: **bold** and `code` lose their markers, "- " becomes "• ". */
function readableMarkdown(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^(\s*)[-*] /gm, '$1• ');
}

export function BugsPage({ arg }: PageProps) {
  const { c } = useCrm();
  const { lg } = useLayout();
  const toast = useToast();
  // One clock per mount: ages and "the oldest critical" are read against it (no Date.now() in render).
  // A Sentry sync moves it forward so its own "Synced just now" never reads as the future.
  const [now, setNow] = useState(() => Date.now());

  const argTab: Tab | null = arg === 'reports' || arg === 'crashes' ? arg : null;
  const [pickedTab, setPickedTab] = useState<Tab | null>(null);
  const tab: Tab = pickedTab ?? argTab ?? 'tracker';

  const board = useQuery(() => fetchBugs(null, null, null), []);
  const sources = useQuery(() => fetchBugSources(), []);
  const links = useQuery(() => fetchBugLinks(), []);
  /* Not range-scoped: an unanswered bug report from six weeks ago is not less unanswered. */
  const inbox = useQuery(() => fetchReportsInbox(200), []);
  const crashes = useQuery(() => fetchCrashes(CRASH_DAYS), []);

  // ── Tracker state ──
  const [status, setStatus] = useState<StatusFilter>('active');
  const [sev, setSev] = useState<BugSeverity | null>(null);
  const [src, setSrc] = useState<BugSourceName | null>(null);
  const [query, setQuery] = useState('');
  const [tableW, setTableW] = useState(0);
  const [selId, setSelId] = useState<string | null>(null);
  /* Values the server has CONFIRMED but the refetch hasn't brought back yet. Written only after a save
     resolves — nothing optimistic — so the options never show a value that isn't saved. */
  const [patches, setPatches] = useState<Record<string, Partial<Bug>>>({});
  const [save, setSave] = useState<SaveState | null>(null);
  const [noteDraft, setNoteDraft] = useState<{ id: string; text: string } | null>(null);
  const [noteSave, setNoteSave] = useState<SaveState | null>(null);
  const [delErr, setDelErr] = useState<{ id: string; msg: string } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { armed, tap } = useTwoTap();
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);

  // ── New bug ──
  const [form, setForm] = useState<NewBug | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [formBusy, setFormBusy] = useState(false);

  // ── Track / merge / dismiss ──
  /* `${origin}|new`, `${origin}|merge` or `${origin}|dismiss` while that write is in flight. */
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actErr, setActErr] = useState<{ origin: string; msg: string } | null>(null);
  /* origin → ref for reports tracked this visit, and dismiss flips, so a row reads right before the
     refetch lands. Written only after the write resolves. */
  const [trackedNow, setTrackedNow] = useState<Record<string, string>>({});
  const [dismissedNow, setDismissedNow] = useState<Record<string, boolean>>({});

  // ── Sentry sync ──
  const [syncing, setSyncing] = useState(false);
  const [sentrySetup, setSentrySetup] = useState(false);

  // ── Crashes ──
  const [crashSel, setCrashSel] = useState<string | null>(null);
  const crashRows = crashes.data ?? [];
  const crash = crashRows.find((g) => g.origin === crashSel) ?? crashRows[0] ?? null;
  /* In-app crashes carry no trail in `admin_crashes`; their breadcrumbs come from the 0176 detail call. */
  const crashFp = crash?.source === 'Supabase' ? crash.origin.slice('error:'.length) : '';
  const detail = useQuery(() => (crashFp ? fetchAdminErrorDetail(crashFp, 1) : Promise.resolve([])), [crashFp]);
  const [triaging, setTriaging] = useState<string | null>(null);
  const [triageErr, setTriageErr] = useState<string | null>(null);

  // ── Derived ──
  const all: Bug[] = (board.data?.rows ?? []).map((b) => (patches[b.id] ? { ...b, ...patches[b.id] } : b));
  const qn = query.trim().toLowerCase();
  /* Faceted: each filter row counts what its chips WOULD show given the other rows (PO 09-29 — "Critical"
     under "Active" showed an empty list with no hint that all three were already fixed). */
  const passes = (b: Bug, skip?: 'status' | 'sev' | 'src') =>
    (skip === 'status' || matchStatus(b.status, status)) &&
    (skip === 'sev' || !sev || b.severity === sev) &&
    (skip === 'src' || !src || originSource(b.origin) === src) &&
    (!qn || `${b.title} ${b.ref ?? ''} ${b.area ?? ''} ${b.detail ?? ''}`.toLowerCase().includes(qn));
  const shown = all.filter((b) => passes(b));
  const facetCount = (skip: 'status' | 'sev' | 'src', f: (b: Bug) => boolean) => (board.data ? all.filter((b) => passes(b, skip) && f(b)).length : null);
  const sel = (selId ? all.find((b) => b.id === selId) : null) ?? shown[0] ?? null;

  const reportRows: InboxReport[] = (inbox.data ?? []).map((r) => {
    const ref = trackedNow[r.origin] ?? r.bug_ref;
    if (ref) return { ...r, bug_ref: ref, state: 'tracked' };
    const d = dismissedNow[r.origin];
    return d == null ? r : { ...r, state: d ? 'dismissed' : 'new' };
  });
  const reportsNew = inbox.data ? reportRows.filter((r) => r.state === 'new').length : null;
  const crashNew = crashes.data ? crashRows.filter((g) => g.is_new).length : null;

  const cnt = board.data?.counts;
  const oldestCritical = all
    .filter((b) => b.severity === 'critical' && matchStatus(b.status, 'active'))
    .reduce<number | null>((m, b) => {
      const d = Math.floor((now - new Date(b.created_at).getTime()) / 86_400_000);
      return m == null || d > m ? d : m;
    }, null);

  const note = cnt
    ? bugsNote({
        total: cnt.total,
        criticalActive: cnt.active_critical,
        highActive: cnt.active_high,
        active: cnt.open + cnt.in_progress,
        oldestCriticalDays: oldestCritical,
        fixed7d: cnt.fixed_7d,
        reportsNew: reportsNew ?? 0,
        crashesNew: crashNew ?? 0,
      })
    : null;

  /* "Also reported in TestFlight · 2 reports, App Store · 1 report" — merged reports grouped by source. */
  const alsoLine = (b: Bug): string | null => {
    const mine = (links.data ?? []).filter((l: BugLink) => l.bug_id === b.id);
    if (!mine.length) return null;
    const bySrc = BUG_SOURCES.map((s) => [s, mine.filter((l) => l.source === s).length] as const).filter(([, n]) => n > 0);
    return `Also reported in ${bySrc.map(([s, n]) => `${s} · ${plural(n, 'report', 'reports')}`).join(', ')}. Merged into one item.`;
  };

  /* "Copy for Claude" (PO 09-29): the board lives in the database, which a coding session can't read, so
     the button carries the whole item — or every item the filters are showing — as a brief to paste. */
  const linksOf = (b: Bug) => (links.data ?? []).filter((l) => l.bug_id === b.id);
  const filterLabel = [
    STATUS_CHIPS.find((s) => s.key === status)?.label,
    sev ? SEV_LABEL[sev] : 'any severity',
    src,
    qn ? `search “${query.trim()}”` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const copyForClaude = async (text: string, what: string) => {
    try {
      await Clipboard.setStringAsync(text);
      toast(`Copied ${what}. Paste it into Claude.`);
    } catch {
      toast('Couldn’t copy. Your browser blocked the clipboard.');
    }
  };

  /* "Mark all N Fixed" (PO 09-29: marking a fixed batch one bug at a time was "a lot to click"). Closes
     every item the filters show that isn't already closed, through the same `admin_bug_save` as one tap on
     Fixed — four at a time, and a failure never stops the rest. Two taps, because it can't be undone in bulk. */
  const toClose = shown.filter((b) => b.status === 'open' || b.status === 'in_progress');
  const markAllFixed = async () => {
    const list = toClose;
    if (!list.length || bulk) return;
    setBulk({ done: 0, total: list.length });
    const ok: string[] = [];
    let failed = 0;
    for (let i = 0; i < list.length; i += 4) {
      await Promise.all(
        list.slice(i, i + 4).map((b) =>
          saveBug(b.id, { status: 'fixed' })
            .then(() => {
              ok.push(b.id);
            })
            .catch(() => {
              failed++;
            }),
        ),
      );
      setBulk({ done: Math.min(i + 4, list.length), total: list.length });
    }
    setPatches((p) => Object.fromEntries([...Object.entries(p), ...ok.map((id) => [id, { ...p[id], status: 'fixed' as BugStatus }])]));
    setBulk(null);
    board.refetch();
    toast(failed ? `Marked ${ok.length} Fixed. ${failed} couldn’t be saved — check your connection and try again.` : `Marked ${ok.length} Fixed.`);
  };

  // ── Writes ──
  const pick = (b: Bug) => {
    setSelId(b.id);
    setSave(null);
    setNoteSave(null);
    setDelErr(null);
  };

  const setField = async (b: Bug, key: 'severity' | 'status', value: string) => {
    if (b[key] === value || (save?.id === b.id && save.state === 'saving')) return;
    const label = key === 'severity' ? SEV_LABEL[value as BugSeverity] : statusLabel(value as BugStatus);
    const prev = key === 'severity' ? SEV_LABEL[b.severity] : statusLabel(b.status);
    setSave({ id: b.id, state: 'saving', msg: label });
    try {
      await saveBug(b.id, { [key]: value } as Partial<Pick<Bug, 'severity' | 'status'>>);
      setPatches((p) => ({ ...p, [b.id]: { ...p[b.id], [key]: value } }));
      setSave({ id: b.id, state: 'saved', msg: '' });
      board.refetch();
    } catch {
      setSave({ id: b.id, state: 'error', msg: `Couldn’t save. It’s still “${prev}”. Check your connection and tap again.` });
    }
  };

  const saveNote = async (b: Bug) => {
    if (!noteDraft || noteDraft.id !== b.id) return;
    const text = noteDraft.text.trim();
    if (text === (b.note ?? '').trim()) return;
    setNoteSave({ id: b.id, state: 'saving', msg: '' });
    try {
      await saveBug(b.id, { note: text || null });
      setPatches((p) => ({ ...p, [b.id]: { ...p[b.id], note: text || null } }));
      setNoteDraft(null);
      setNoteSave({ id: b.id, state: 'saved', msg: '' });
      board.refetch();
    } catch {
      setNoteSave({ id: b.id, state: 'error', msg: 'Couldn’t save the note. Check your connection, then click out of the box again.' });
    }
  };

  const remove = async (b: Bug) => {
    setDeleting(b.id);
    setDelErr(null);
    try {
      await deleteBug(b.id);
      setSelId(null);
      board.refetch();
      links.refetch();
      inbox.refetch();
      crashes.refetch();
    } catch (e) {
      setDelErr({ id: b.id, msg: `Couldn’t delete it. ${errorMessage(e)}` });
    } finally {
      setDeleting(null);
    }
  };

  const create = async () => {
    if (!form) return;
    const title = form.title.trim();
    if (!title) {
      setFormErr('Give the bug a title.');
      return;
    }
    setFormBusy(true);
    setFormErr(null);
    try {
      const id = await saveBug(null, { title, severity: form.sev, area: form.area.trim() || null, detail: form.desc.trim() || null });
      /* `admin_bug_save` returns the id only; the ref ("B3") the toast names is read back with a narrow
         query rather than guessed — refs are assigned by the database. */
      let ref: string | null = null;
      try {
        ref = (await fetchBugs('open', form.sev, title)).rows.find((r) => r.id === id)?.ref ?? null;
      } catch {
        /* the bug is saved; only the toast's wording falls back */
      }
      setForm(null);
      setStatus('active');
      setSev(null);
      setSrc(null);
      setQuery('');
      setPickedTab('tracker');
      setSelId(id);
      setSave(null);
      board.refetch();
      toast(ref ? `${ref} added to the board` : 'Added to the board');
    } catch (e) {
      setFormErr(`Couldn’t add it. ${errorMessage(e)}`);
    } finally {
      setFormBusy(false);
    }
  };

  /* Track a report from any source; `target` merges it into that board item instead. */
  const track = async (origin: string, target: Bug | null) => {
    setBusyKey(`${origin}|${target ? 'merge' : 'new'}`);
    setActErr(null);
    try {
      const r = await trackReport(origin, target?.id ?? null);
      setTrackedNow((t) => ({ ...t, [origin]: r.ref }));
      board.refetch();
      links.refetch();
      inbox.refetch();
      crashes.refetch();
      sources.refetch();
      toast(r.existing ? `Already on the board as ${r.ref}` : r.merged ? `Merged into ${r.ref}` : `${r.ref} added to the board`);
    } catch (e) {
      setActErr({ origin, msg: `Couldn’t add it to the board. ${errorMessage(e)}` });
    } finally {
      setBusyKey(null);
    }
  };

  const dismiss = async (origin: string, on: boolean) => {
    setBusyKey(`${origin}|dismiss`);
    setActErr(null);
    try {
      await dismissReport(origin, on);
      setDismissedNow((d) => ({ ...d, [origin]: on }));
      inbox.refetch();
    } catch (e) {
      setActErr({ origin, msg: `Couldn’t save. ${errorMessage(e)}` });
    } finally {
      setBusyKey(null);
    }
  };

  const syncSentry = async () => {
    setSyncing(true);
    try {
      const r = await runSentrySync();
      setNow(Date.now());
      sources.refetch();
      crashes.refetch();
      setSentrySetup(!r.configured);
      if (!r.configured) toast('Sentry isn’t set up yet');
      else if (r.ok) toast(`Sentry synced · ${plural(r.issues ?? 0, 'issue', 'issues')}`);
      else toast(`Sentry sync failed${r.errors?.length ? ` — ${r.errors[0]}` : ''}`);
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setSyncing(false);
    }
  };

  const triage = async (fp: string, st: string) => {
    setTriaging(st);
    setTriageErr(null);
    try {
      await setErrorStatus(fp, st);
      crashes.refetch();
      board.refetch();
    } catch {
      /* The group keeps its old status: a crash that silently reads FIXED because the write failed is
         the one outcome this queue must never produce. */
      setTriageErr('Couldn’t save. Check your connection and tap again.');
    } finally {
      setTriaging(null);
    }
  };

  // ── Pieces ──
  const figures: { hero: Figure; rest: Figure[] } | null = cnt
    ? {
        hero: { label: 'Critical', value: String(cnt.active_critical), note: 'Active', tone: cnt.active_critical > 0 ? 'bad' : null },
        rest: [
          { label: 'High', value: String(cnt.active_high), note: 'Active' },
          { label: 'Open', value: String(cnt.open), note: `Of ${cnt.total} items` },
          { label: 'Fixed', value: String(cnt.fixed_7d), note: 'Last 7 days', tone: cnt.fixed_7d > 0 ? 'good' : null },
          { label: 'User reports', value: reportsNew == null ? '—' : String(reportsNew), note: 'New, not triaged' },
          { label: 'Crash groups', value: crashNew == null ? '—' : String(crashNew), note: 'New in 7 days' },
        ],
      }
    : null;

  const sevColor = (s: BugSeverity) => (s === 'critical' ? c.crit : s === 'high' ? c.warn : c.ink3);
  const cell = (w: number, extra?: TextStyle): TextStyle => ({ width: w, flexShrink: 0, ...extra });

  const sourceByName = (n: BugSourceName) => (sources.data ?? []).find((s) => s.name === n) ?? null;
  /* TestFlight and App Store both arrive through the App Store Connect sync: never run means no key yet. */
  const neverSynced = (n: BugSourceName) => {
    const s = sourceByName(n);
    return !!sources.data && (!s || (!s.live && !s.synced_at));
  };

  const sourceCards = (
    <View style={{ marginBottom: 24 }}>
      {sources.loading && !sources.data ? (
        <Skeleton />
      ) : sources.error ? (
        <ErrorLine onRetry={sources.refetch}>Couldn’t load the sources. {sources.error}</ErrorLine>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: c.line, borderWidth: 1, borderColor: c.line }}>
          {(sources.data ?? []).map((s) => (
            <SourceCard key={s.name} s={s} now={now} syncing={syncing} setupNeeded={s.name === 'Sentry' && sentrySetup} onSync={s.name === 'Sentry' ? () => void syncSentry() : null} />
          ))}
        </View>
      )}
    </View>
  );

  /* An empty list says WHY and offers the one tap that fills it — loosen the filter that's hiding them. */
  const { emptyWhy, emptyFix } = ((): { emptyWhy: string; emptyFix: { label: string; run: () => void } | null } => {
    const kind = `${sev ? `${SEV_LABEL[sev].toLowerCase()} ` : ''}bugs${src ? ` from ${src}` : ''}`;
    const byStatus = status === 'all' ? [] : all.filter((b) => passes(b, 'status'));
    if (byStatus.length) {
      const n = byStatus.length;
      const allFixed = byStatus.every((b) => b.status === 'fixed');
      const where = status === 'active' ? (allFixed ? 'already fixed' : 'fixed or closed') : 'in other statuses';
      const word = STATUS_CHIPS.find((s) => s.key === status)?.label.toLowerCase() ?? '';
      return { emptyWhy: `No ${word} ${kind}. ${n === 1 ? 'The 1 is' : `All ${n} are`} ${where}.`, emptyFix: { label: 'Show them', run: () => setStatus('all') } };
    }
    if (src && all.some((b) => passes(b, 'src'))) return { emptyWhy: `No ${kind}.`, emptyFix: { label: 'Show every source', run: () => setSrc(null) } };
    if (sev && all.some((b) => passes(b, 'sev'))) return { emptyWhy: `No ${kind}.`, emptyFix: { label: 'Show every severity', run: () => setSev(null) } };
    if (qn) return { emptyWhy: `Nothing matches “${query.trim()}”.`, emptyFix: { label: 'Clear the search', run: () => setQuery('') } };
    return {
      emptyWhy: 'No bugs match these filters.',
      emptyFix: {
        label: 'Clear filters',
        run: () => {
          setStatus('all');
          setSev(null);
          setSrc(null);
          setQuery('');
        },
      },
    };
  })();

  const tracker = (
    <>
      <Input value={query} onChangeText={setQuery} placeholder="Search bugs" style={{ height: 38, paddingHorizontal: 14 }} accessibilityLabel="Search bugs" />
      <View style={{ gap: 10 }}>
        <FacetRow label="Status">
          {STATUS_CHIPS.map((s) => (
            <Chip key={s.key} size="sm" label={s.label} count={facetCount('status', (b) => matchStatus(b.status, s.key))} on={status === s.key} onPress={() => setStatus(s.key)} />
          ))}
        </FacetRow>
        <FacetRow label="Severity">
          <Chip size="sm" label="Any" count={facetCount('sev', () => true)} on={sev == null} onPress={() => setSev(null)} />
          {SEVERITIES.map((s) => (
            <Chip key={s} size="sm" label={SEV_LABEL[s]} count={facetCount('sev', (b) => b.severity === s)} on={sev === s} onPress={() => setSev(s)} />
          ))}
        </FacetRow>
        <FacetRow label="Source">
          <Chip size="sm" label="Any" count={facetCount('src', () => true)} on={src == null} onPress={() => setSrc(null)} />
          {BUG_SOURCES.map((s) => (
            <Chip key={s} size="sm" label={s} count={facetCount('src', (b) => originSource(b.origin) === s)} on={src === s} onPress={() => setSrc(s)} />
          ))}
        </FacetRow>
      </View>
      {board.data && shown.length ? (
        <Row gap={12}>
          <Btn
            size="sm"
            label={`Copy ${shown.length === 1 ? 'this bug' : `all ${shown.length}`} for Claude`}
            onPress={() => void copyForClaude(bugsBrief(shown, linksOf, filterLabel), shown.length === 1 ? '1 bug' : `${shown.length} bugs`)}
          />
          {toClose.length || bulk ? (
            <Btn
              size="sm"
              busy={!!bulk}
              label={bulk ? `Marking ${bulk.done} of ${bulk.total}…` : armed === 'bulk-fixed' ? `Tap again to mark ${toClose.length} Fixed` : `Mark ${toClose.length === 1 ? 'this' : `all ${toClose.length}`} Fixed`}
              onPress={() => tap('bulk-fixed', () => void markAllFixed())}
            />
          ) : null}
          <Text style={{ fontSize: 12.5, color: c.ink3 }}>Everything the filters are showing, most severe first.</Text>
        </Row>
      ) : null}
      {board.loading && !board.data ? (
        <Skeleton />
      ) : board.error ? (
        <ErrorLine onRetry={board.refetch}>Couldn’t load the board. {board.error}</ErrorLine>
      ) : (
        /* The design's `overflow-x:auto` + 710 px minimum: under that the table scrolls sideways rather
           than squeezing the Bug column to nothing. */
        /* ⚠ The table's width is PINNED to the measured pane (min 710). Inside a horizontal ScrollView a
           flex:1 column is unbounded, so the one-line Bug title grew to its full length and pushed Source,
           Area, Severity, Status and Age off the right edge. */
        <ScrollView
          horizontal
          keyboardDismissMode={KEYBOARD_DISMISS_MODE}
          automaticallyAdjustKeyboardInsets={false}
          showsHorizontalScrollIndicator={false}
          onLayout={(e) => setTableW(Math.round(e.nativeEvent.layout.width))}
        >
          <View style={{ width: Math.max(TABLE_MIN, tableW) }}>
            <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: c.line }}>
              {(
                [
                  ['Ref', 52],
                  ['Bug', 0],
                  ['Source', 88],
                  ['Area', 96],
                  ['Severity', 76],
                  ['Status', 92],
                  ['Age', 44],
                ] as const
              ).map(([h, w]) => (
                <Text
                  key={h}
                  style={[
                    { fontSize: 11, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', color: c.ink3 },
                    w ? cell(w) : { flex: 1, minWidth: 0 },
                    h === 'Age' ? { textAlign: 'right' } : null,
                  ]}
                >
                  {h}
                </Text>
              ))}
            </View>
            {shown.map((b) => (
              <HoverRow key={b.id} bleed={0} selected={sel?.id === b.id} onPress={() => pick(b)} label={b.title} style={{ gap: 12, paddingVertical: 11, paddingHorizontal: 12 }}>
                <Text style={[cell(52, { fontSize: 13.5, color: c.ink3 }), TABULAR]}>{b.ref ?? '—'}</Text>
                <Text numberOfLines={1} style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: c.ink }}>
                  {b.title}
                </Text>
                <Text numberOfLines={1} style={cell(88, { fontSize: 13.5, color: c.ink2 })}>
                  {originSource(b.origin)}
                </Text>
                <Text numberOfLines={1} style={cell(96, { fontSize: 13.5, color: c.ink3 })}>
                  {b.area ?? '—'}
                </Text>
                <Text style={cell(76, { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: sevColor(b.severity) })}>{SEV_LABEL[b.severity]}</Text>
                <Text numberOfLines={1} style={cell(92, { fontSize: 13.5, color: c.ink2 })}>
                  {statusLabel(b.status)}
                </Text>
                <Text style={[cell(44, { fontSize: 13.5, color: c.ink3, textAlign: 'right' }), TABULAR]}>{age(b.created_at, now)}</Text>
              </HoverRow>
            ))}
            {shown.length === 0 ? (
              <Text style={{ paddingVertical: 18, paddingHorizontal: 12, fontSize: 14.5, lineHeight: 22, color: c.ink2, borderBottomWidth: 1, borderBottomColor: c.line }}>
                {all.length === 0 ? 'The board is empty. File a bug, or track a user report or crash.' : emptyWhy}
                {emptyFix ? (
                  <Text onPress={emptyFix.run} accessibilityRole="button" style={{ fontWeight: '600', color: c.brz }}>
                    {' '}
                    {emptyFix.label}
                  </Text>
                ) : null}
              </Text>
            ) : null}
            <Text style={[{ fontSize: 12.5, color: c.ink3, padding: 12 }, TABULAR]}>
              {shown.length} shown of {all.length}
            </Text>
          </View>
        </ScrollView>
      )}
    </>
  );

  /* The honest zeros under the inbox: a source with nothing in it says why. */
  const inboxGaps: string[] = inbox.data
    ? (['Supabase', 'TestFlight', 'App Store'] as const)
        .filter((s) => !reportRows.some((r) => r.source === s))
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

  const reportsView = (
    <View style={{ borderTopWidth: 1, borderTopColor: c.line }}>
      {inbox.loading && !inbox.data ? (
        <Skeleton />
      ) : inbox.error ? (
        <ErrorLine onRetry={inbox.refetch}>Couldn’t load user reports. {inbox.error}</ErrorLine>
      ) : (
        <>
          {reportRows.map((r) => {
            const dim = r.state === 'dismissed';
            const busy = busyKey?.startsWith(`${r.origin}|`) ? busyKey.slice(r.origin.length + 1) : null;
            return (
              <View key={r.origin} style={{ paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: c.line, gap: 6, opacity: dim ? 0.55 : 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                    <Text numberOfLines={2} style={{ fontSize: 15, fontWeight: '500', color: c.ink }}>
                      {firstLine(r.body)}
                    </Text>
                    <Text style={{ fontSize: 13, color: c.ink3 }}>
                      <Text style={{ color: c.ink2, fontWeight: '500' }}>{reportFrom(r)}</Text>
                      {reportMeta(r) ? ` · ${reportMeta(r)}` : ''}
                    </Text>
                  </View>
                  {r.state === 'tracked' ? (
                    <Text style={{ fontSize: 13, fontWeight: '600', color: c.ink3 }}>On the board as {r.bug_ref}</Text>
                  ) : r.state === 'dismissed' ? (
                    <Text style={{ fontSize: 13, color: c.ink3 }}>
                      Dismissed ·{' '}
                      <Text onPress={busy ? undefined : () => void dismiss(r.origin, false)} accessibilityRole="button" style={{ fontWeight: '600', color: c.ink }}>
                        {busy === 'dismiss' ? 'Undoing…' : 'Undo'}
                      </Text>
                    </Text>
                  ) : (
                    <Row gap={8}>
                      {/* Merge (CHANGED vs the design, which shows merged results but no control): files this
                          report under the bug open on the right instead of making a new item. */}
                      {sel?.ref ? <Btn size="sm" label={`Add to ${sel.ref}`} busy={busy === 'merge'} disabled={!!busy && busy !== 'merge'} onPress={() => void track(r.origin, sel)} /> : null}
                      <Btn size="sm" label="Dismiss" busy={busy === 'dismiss'} disabled={!!busy && busy !== 'dismiss'} onPress={() => void dismiss(r.origin, true)} />
                      <Btn size="sm" label="Track this" busy={busy === 'new'} disabled={!!busy && busy !== 'new'} onPress={() => void track(r.origin, null)} />
                    </Row>
                  )}
                </View>
                {actErr?.origin === r.origin ? <Text style={{ fontSize: 13, color: c.crit }}>{actErr.msg}</Text> : null}
              </View>
            );
          })}
          {inboxGaps.length ? (
            <View style={{ paddingVertical: 14, paddingHorizontal: 12, gap: 4 }}>
              {inboxGaps.map((g) => (
                <Text key={g} style={{ fontSize: 13, lineHeight: 20, color: c.ink3 }}>
                  {g}
                </Text>
              ))}
            </View>
          ) : null}
        </>
      )}
    </View>
  );

  const crashesView = (
    <View style={{ borderTopWidth: 1, borderTopColor: c.line }}>
      {crashes.loading && !crashes.data ? (
        <Skeleton />
      ) : crashes.error ? (
        <ErrorLine onRetry={crashes.refetch}>Couldn’t load crashes. {crashes.error}</ErrorLine>
      ) : crashRows.length === 0 ? (
        <Text style={{ paddingVertical: 18, paddingHorizontal: 12, fontSize: 14.5, lineHeight: 22, color: c.ink2 }}>
          {/* ⚠ Zero crashes is the goal AND what an unconnected Sentry looks like; say which. */}
          {`No crashes in the last ${CRASH_DAYS} days.`}
          {neverSynced('Sentry') ? ' Sentry hasn’t synced yet, so only the app’s own crash reports are counted.' : ''}
        </Text>
      ) : (
        crashRows.map((g) => (
          <HoverRow key={g.origin} bleed={0} selected={crash?.origin === g.origin} onPress={() => setCrashSel(g.origin)} label={g.title} style={{ paddingVertical: 14, paddingHorizontal: 12 }}>
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 15, fontWeight: '500', color: c.ink }}>
                  {g.title}
                </Text>
                {g.is_new ? <Text style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: c.warn }}>New</Text> : null}
              </View>
              <Text style={{ fontSize: 13, color: c.ink3 }}>
                {[g.source === 'Sentry' ? 'Sentry' : 'In-app', plural(g.people, 'athlete', 'athletes'), g.last_seen ? `last seen ${when(g.last_seen, true)}` : null, g.version]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
            {/* Events on the right; athletes lead the meta line because 12 crashes across 12 people
                outranks 200 from one tester. */}
            <Text style={[{ fontSize: 15, fontWeight: '600', color: c.ink }, TABULAR]}>{g.events}</Text>
          </HoverRow>
        ))
      )}
    </View>
  );

  const selAlso = sel ? alsoLine(sel) : null;

  return (
    <View>
      <PageHeader
        title="Bugs"
        purpose="What’s broken, how bad it is, and what you’ve fixed."
        note={note}
        actions={[
          {
            label: 'New bug',
            kind: 'primary',
            onPress: () => {
              setForm({ title: '', area: '', sev: 'medium', desc: '' });
              setFormErr(null);
            },
          },
        ]}
      />

      {form ? (
        <FormPanel title="New bug" saveLabel="Add to board" onSave={() => void create()} onCancel={() => setForm(null)} busy={formBusy} error={formErr}>
          <FieldGrid>
            <Field label="Title">
              <Input value={form.title} onChangeText={(t) => {
                  setForm({ ...form, title: t });
                  setFormErr(null);
                }} placeholder="What’s broken, in a few words" />
            </Field>
            <Field label="Area">
              <Input value={form.area} onChangeText={(t) => setForm({ ...form, area: t })} placeholder="e.g. Workouts, Paywall" />
            </Field>
          </FieldGrid>
          <Field label="Severity">
            <Row gap={6}>
              {SEVERITIES.map((s) => (
                <Opt key={s} label={SEV_LABEL[s]} on={form.sev === s} color={s === 'critical' ? c.crit : undefined} onPress={() => setForm({ ...form, sev: s })} />
              ))}
            </Row>
          </Field>
          <Field label="Description">
            <Input multiline value={form.desc} onChangeText={(t) => setForm({ ...form, desc: t })} placeholder="Steps to reproduce, what you expected, what happened" style={{ minHeight: 110 }} />
          </Field>
        </FormPanel>
      ) : null}

      {figures ? (
        <HeroFigures hero={figures.hero} figures={figures.rest} />
      ) : board.error ? (
        <View style={{ paddingBottom: 32 }}>
          <ErrorLine onRetry={board.refetch}>Couldn’t load the bug counts. {board.error}</ErrorLine>
        </View>
      ) : (
        <View style={{ paddingBottom: 32 }}>
          <Skeleton />
        </View>
      )}

      {sourceCards}

      <Tabs
        tabs={[
          { key: 'tracker', label: 'Tracker', count: cnt ? String(cnt.total) : '' },
          { key: 'reports', label: 'User reports', count: reportsNew == null ? '' : `${reportsNew} new` },
          { key: 'crashes', label: 'Crashes', count: crashNew == null ? '' : `${crashNew} new` },
        ]}
        on={tab}
        onPick={(k) => setPickedTab(k as Tab)}
      />

      <View style={{ flexDirection: lg ? 'row' : 'column', gap: lg ? 36 : 24, alignItems: lg ? 'flex-start' : 'stretch' }}>
        <View style={{ flex: lg ? 1 : undefined, minWidth: 0, gap: 14 }}>{tab === 'tracker' ? tracker : tab === 'reports' ? reportsView : crashesView}</View>

        <View style={{ width: lg ? 420 : undefined, alignSelf: lg ? 'flex-start' : 'stretch', ...(lg && Platform.OS === 'web' ? ({ position: 'sticky', top: 24 } as object) : null) }}>
          {tab === 'crashes' ? (
            crash ? (
              <CrashPanel
                crash={crash}
                detail={detail}
                onBoard={trackedNow[crash.origin] ?? crash.bug_ref}
                tracking={busyKey === `${crash.origin}|new`}
                trackErr={actErr?.origin === crash.origin ? actErr.msg : null}
                onTrack={() => void track(crash.origin, null)}
                triaging={triaging}
                triageErr={triageErr}
                onTriage={(st) => void triage(crashFp, st)}
              />
            ) : null
          ) : sel ? (
            <Panel gap={18}>
              <Text style={{ fontSize: 12.5, color: c.ink3 }}>
                {[sel.ref, `${originSource(sel.origin)}${sel.source === 'manual' && !sel.origin ? ' · filed by you' : ''}`, sel.area].filter(Boolean).join(' · ')}
              </Text>
              <Text selectable style={{ fontFamily: DISPLAY, fontSize: 22, lineHeight: 28.6, color: c.ink }}>
                {sel.title}
              </Text>
              {selAlso ? <Text style={{ fontSize: 13, color: c.ink2 }}>{selAlso}</Text> : null}
              <Row>
                <Btn size="sm" label="Copy for Claude" onPress={() => void copyForClaude(bugBrief(sel, linksOf(sel)), sel.ref ?? 'the bug')} />
              </Row>
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 12, color: c.ink3 }}>Severity</Text>
                <Row gap={6}>
                  {SEVERITIES.map((s) => (
                    <Opt key={s} label={SEV_LABEL[s]} on={sel.severity === s} color={s === 'critical' ? c.crit : undefined} onPress={() => void setField(sel, 'severity', s)} />
                  ))}
                </Row>
              </View>
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 12, color: c.ink3 }}>Status</Text>
                <Row gap={6}>
                  {BUG_STATUSES.map((s) => (
                    <Opt key={s.key} label={s.label} on={sel.status === s.key} onPress={() => void setField(sel, 'status', s.key)} />
                  ))}
                </Row>
                <Text style={{ fontSize: 12, color: save?.id === sel.id && save.state === 'error' ? c.crit : c.ink3 }}>
                  {save?.id !== sel.id ? 'Changes save as you tap' : save.state === 'saving' ? `Saving “${save.msg}”…` : save.state === 'error' ? save.msg : 'Saved'}
                </Text>
              </View>
              {/* The report's own text, split on blank lines. QA items are written in markdown, so the
                  emphasis markers and backticks come off and "- " becomes a bullet — the words are kept
                  exactly, and stay selectable so they can be copied out. */}
              <ScrollView keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets={false} style={{ maxHeight: 260 }} contentContainerStyle={{ gap: 10, paddingRight: 4 }} nestedScrollEnabled>
                {(sel.detail ?? '')
                  .split(/\n\s*\n/)
                  .map((p) => readableMarkdown(p).trim())
                  .filter(Boolean)
                  .map((p, i) => (
                    <Text key={i} selectable style={{ fontSize: 14, lineHeight: 22.4, color: c.ink2 }}>
                      {p}
                    </Text>
                  ))}
                {!sel.detail?.trim() ? <Text style={{ fontSize: 14, lineHeight: 22.4, color: c.ink3 }}>No description.</Text> : null}
              </ScrollView>
              <View style={{ gap: 6 }}>
                <Input
                  multiline
                  value={noteDraft?.id === sel.id ? noteDraft.text : (sel.note ?? '')}
                  onChangeText={(t) => setNoteDraft({ id: sel.id, text: t })}
                  onBlur={() => void saveNote(sel)}
                  placeholder="Add a note for yourself"
                  accessibilityLabel="Note"
                />
                {noteSave?.id === sel.id ? (
                  <Text style={{ fontSize: 12, color: noteSave.state === 'error' ? c.crit : c.ink3 }}>
                    {noteSave.state === 'saving' ? 'Saving note…' : noteSave.state === 'error' ? noteSave.msg : 'Note saved'}
                  </Text>
                ) : null}
              </View>
              {/* Only hand-filed bugs can be deleted. A QA row is the report's record — close it, don't erase it. */}
              {sel.source === 'manual' ? (
                <View style={{ gap: 6 }}>
                  <DeleteBtn size="md" armed={armed === sel.id} busy={deleting === sel.id} onPress={() => tap(sel.id, () => void remove(sel))} />
                  {delErr?.id === sel.id ? <Text style={{ fontSize: 13, color: c.crit }}>{delErr.msg}</Text> : null}
                </View>
              ) : (
                <Text style={{ fontSize: 12.5, color: c.ink3 }}>Synced items can be closed here but not deleted.</Text>
              )}
            </Panel>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/** One labelled row of filter chips: "Status  [Active 307] [Open 307] …". */
function FacetRow({ label, children }: { label: string; children: React.ReactNode }) {
  const { c } = useCrm();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
      <Text style={{ width: 64, paddingTop: 6, fontSize: 12, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', color: c.ink3 }}>{label}</Text>
      <Row gap={8} style={{ flex: 1, minWidth: 0 }}>
        {children}
      </Row>
    </View>
  );
}

// ── Source cards (Supabase / Sentry / TestFlight / App Store) ─────────────

function SourceCard({ s, now, syncing, setupNeeded, onSync }: { s: BugSource; now: number; syncing: boolean; setupNeeded: boolean; onSync: (() => void) | null }) {
  const { c } = useCrm();
  const failed = s.ok === false;
  const line = s.live
    ? 'Live'
    : failed
      ? `Last sync failed${s.message ? ` — ${s.message}` : ''}`
      : !s.synced_at
        ? `Not connected${s.message ? ` — ${s.message}` : ''}`
        : `Synced ${ago(s.synced_at, now)}`;
  return (
    <View style={{ flexGrow: 1, flexBasis: 140, minWidth: 140, gap: 3, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: c.panel }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: c.ink }}>{s.name}</Text>
      <Text style={{ fontSize: 12.5, color: c.ink2 }}>{s.feeds}</Text>
      <Text style={{ fontSize: 12, color: failed ? c.crit : c.ink3 }}>{line}</Text>
      {setupNeeded ? <Text style={{ fontSize: 12, color: c.ink3 }}>Set up Sentry (Docs/Sentry-Setup.md)</Text> : null}
      {onSync ? (
        <View style={{ flexDirection: 'row', marginTop: 6 }}>
          <Btn size="sm" label="Sync now" busy={syncing} onPress={onSync} />
        </View>
      ) : null}
    </View>
  );
}

// ── Underlined tabs (Tracker / User reports / Crashes) ─────────────────────

function Tabs({ tabs, on, onPick }: { tabs: { key: string; label: string; count: string }[]; on: string; onPick: (k: string) => void }) {
  const { c } = useCrm();
  return (
    <View style={{ flexDirection: 'row', gap: 28, borderBottomWidth: 1, borderBottomColor: c.line, marginBottom: 20 }}>
      {tabs.map((t) => {
        const active = t.key === on;
        return (
          <Pressable
            key={t.key}
            onPress={() => onPick(t.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={{ paddingBottom: 12, marginBottom: -1, borderBottomWidth: 2, borderBottomColor: active ? c.brz : 'transparent' }}
          >
            <Text numberOfLines={1} style={{ fontSize: 14.5, fontWeight: active ? '600' : '500', color: active ? c.ink : c.ink3 }}>
              {t.label} <Text style={[{ fontWeight: '400', color: c.ink3 }, TABULAR]}>{t.count}</Text>
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── The crash detail ───────────────────────────────────────────────────────

function CrashPanel({
  crash,
  detail,
  onBoard,
  tracking,
  trackErr,
  onTrack,
  triaging,
  triageErr,
  onTriage,
}: {
  crash: CrashGroup;
  detail: { data: Awaited<ReturnType<typeof fetchAdminErrorDetail>> | null; loading: boolean; error: string | null; refetch: () => void };
  onBoard: string | null;
  tracking: boolean;
  trackErr: string | null;
  onTrack: () => void;
  triaging: string | null;
  triageErr: string | null;
  onTriage: (status: string) => void;
}) {
  const { c } = useCrm();
  const inApp = crash.source === 'Supabase';
  const occ = inApp ? (detail.data?.[0] ?? null) : null;
  /* Sentry groups bring their latest event's trail; in-app groups read it from the 0176 detail call. */
  const trail: string[] = inApp
    ? (occ?.breadcrumbs ?? []).map((cr) => `${cr.label}${cr.detail ? ` ${cr.detail}` : ''}${cr.n && cr.n > 1 ? ` ×${cr.n}` : ''}`)
    : (crash.trail ?? []).map((t) => t.label ?? t.kind ?? '').filter(Boolean);
  const stack = (inApp ? (occ?.stack ?? occ?.componentStack ?? '') : (crash.stack ?? '')).trim();
  const permalink = crash.permalink;
  return (
    <Panel gap={18}>
      <Text style={{ fontSize: 12.5, color: c.ink3 }}>
        {inApp ? 'In-app crash' : 'Sentry crash group'} · {plural(crash.events, 'event', 'events')} · {plural(crash.people, 'athlete', 'athletes')}
      </Text>
      <Text selectable style={{ fontFamily: DISPLAY, fontSize: 22, lineHeight: 28.6, color: c.ink }}>
        {crash.title}
      </Text>
      <View>
        <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: c.ink3, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: c.line }}>
          What they did before it broke
        </Text>
        {inApp && detail.loading && !detail.data ? (
          <Skeleton />
        ) : inApp && detail.error ? (
          <ErrorLine onRetry={detail.refetch}>Couldn’t load the trail. {detail.error}</ErrorLine>
        ) : trail.length === 0 ? (
          /* Route shapes and action names only are ever sent (breadcrumb-core.ts, sentry-scrub.ts). An
             empty trail means the athlete has product-usage measurement off, or Sentry sent none. */
          <Text style={{ paddingVertical: 10, fontSize: 13.5, lineHeight: 20, color: c.ink3 }}>
            {inApp ? 'No trail with this report — the athlete has usage measurement turned off.' : 'No trail came with this crash’s latest event.'}
          </Text>
        ) : (
          trail.map((t, i) => {
            const last = i === trail.length - 1;
            return (
              <View key={i} style={{ flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.line }}>
                <Text style={[{ width: 22, fontSize: 13.5, color: c.ink3 }, TABULAR]}>{i + 1}</Text>
                <Text selectable style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: last ? c.crit : c.ink }}>
                  {last ? `${t} · crashed here` : t}
                </Text>
              </View>
            );
          })
        )}
      </View>
      {stack ? (
        <View style={{ padding: 14, borderRadius: 10, backgroundColor: c.field, borderWidth: 1, borderColor: c.fieldBd }}>
          <Text selectable style={{ fontFamily: MONO, fontSize: 11.5, lineHeight: 18.4, color: c.ink2 }}>
            {stack.split('\n').slice(0, 14).join('\n')}
          </Text>
        </View>
      ) : null}
      {permalink ? <LinkText label="View in Sentry" onPress={() => void Linking.openURL(permalink)} /> : null}
      <Btn kind="primary" full label={onBoard ? `On the board as ${onBoard}` : 'Track this'} disabled={!!onBoard} busy={tracking} onPress={onTrack} />
      {trackErr ? <Text style={{ fontSize: 13, color: c.crit }}>{trackErr}</Text> : null}
      {/* Kept from the old page (not in the design), in-app groups only: without it nothing clears an
          in-app crash's status. It writes the crash group's own triage status, never the board. Sentry
          groups are triaged in Sentry. */}
      {inApp ? (
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 12, color: c.ink3 }}>Crash status</Text>
          <Row gap={6}>
            {(
              [
                ['ACKED', 'Seen'],
                ['FIXED', 'Fixed'],
                ['IGNORED', 'Ignored'],
              ] as const
            ).map(([k, l]) => (
              <Opt key={k} label={triaging === k ? `${l}…` : l} on={crash.status === k} onPress={() => (crash.status === k || triaging ? undefined : onTriage(k))} />
            ))}
          </Row>
          {triageErr ? <Text style={{ fontSize: 12, color: c.crit }}>{triageErr}</Text> : null}
        </View>
      ) : null}
    </Panel>
  );
}
