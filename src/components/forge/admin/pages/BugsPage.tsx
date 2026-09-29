import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View, type TextStyle } from 'react-native';

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
import { fetchAdminErrorDetail, fetchAdminErrors, fetchAdminFeedback, setErrorStatus, type ErrorGroup } from '@/data/admin-live';
import { deleteBug, fetchBugs, saveBug, trackBug, type Bug } from '@/data/crm-live';
import { BUG_STATUSES, SEVERITIES, type BugSeverity, type BugStatus } from '@/domain/admin/crm-core';
import { bugsNote } from '@/domain/admin/notes/bugs';
import { errorMessage, useQuery } from '@/lib/useQuery';

/**
 * Bugs — the one bug board (Admin-Analytics-Amendment-002, AA-D19), built to `Forge CRM.dc.html`.
 *
 * ══ ONE BOARD, THREE SOURCES, ORIGINALS UNTOUCHED ══
 *
 * `ops_bugs` holds the QA-report items and the bugs filed here by hand. User bug reports (feedback, 0167)
 * and crash groups (client errors, 0176) stay in their own tables and keep their own tabs — "Track this"
 * COPIES one onto the board with a back-reference (`origin`) and never edits or deletes the original.
 *
 * ══ THE WHOLE BOARD IS FETCHED ONCE ══
 *
 * `admin_bugs` is called unfiltered (ceiling 1000 rows; the board is ~300) and every chip, the search and
 * the chip counts work on those rows. That keeps a saved row on screen when a filter would drop it (marking
 * a bug Fixed under "Active" must not yank the detail away mid-edit), lets "Tracked" be read straight off
 * the rows' `origin`, and makes the chip counts and the list agree by construction. The figures above
 * the tabs come from `counts`, which the SQL computes over the whole table.
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

/* The crash list's window. The SAME 14 days `admin_bugs.errors_new` counts over, so the "Crash groups"
   figure, the tab count and the rows tagged New always agree. */
const CRASH_DAYS = 14;

const MONO = Platform.select({ web: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', ios: 'Menlo', default: 'monospace' });
const TABULAR: TextStyle = { fontVariant: ['tabular-nums'] };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const matchStatus = (s: BugStatus, f: StatusFilter) => f === 'all' || (f === 'active' ? s === 'open' || s === 'in_progress' : s === f);

function sourceLabel(b: Bug): string {
  if (b.source === 'qa') return b.round != null ? `QA round ${b.round}` : 'QA report';
  if (b.origin?.startsWith('feedback:')) return 'From a user report';
  if (b.origin?.startsWith('error:')) return 'From a crash';
  return 'Filed by you';
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
  const [now] = useState(() => Date.now());

  const argTab: Tab | null = arg === 'reports' || arg === 'crashes' ? arg : null;
  const [pickedTab, setPickedTab] = useState<Tab | null>(null);
  const tab: Tab = pickedTab ?? argTab ?? 'tracker';

  const board = useQuery(() => fetchBugs(null, null, null), []);
  /* Not range-scoped: an unanswered bug report from six weeks ago is not less unanswered. */
  const reports = useQuery(() => fetchAdminFeedback(100, null), []);
  const crashes = useQuery(() => fetchAdminErrors(CRASH_DAYS, 50, null), []);

  // ── Tracker state ──
  const [status, setStatus] = useState<StatusFilter>('active');
  const [sev, setSev] = useState<BugSeverity | null>(null);
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

  // ── New bug ──
  const [form, setForm] = useState<NewBug | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [formBusy, setFormBusy] = useState(false);

  // ── Track this ──
  const [tracking, setTracking] = useState<string | null>(null);
  const [trackErr, setTrackErr] = useState<{ key: string; msg: string } | null>(null);
  /* origin → ref for rows tracked this visit, so the button reads "Tracked" before the refetch lands. */
  const [trackedNow, setTrackedNow] = useState<Record<string, string>>({});

  // ── Crashes ──
  const [crashSel, setCrashSel] = useState<string | null>(null);
  const crashRows = crashes.data?.rows ?? [];
  const crash = crashRows.find((g) => g.fingerprint === crashSel) ?? crashRows[0] ?? null;
  const crashFp = crash?.fingerprint ?? '';
  const detail = useQuery(() => (crashFp ? fetchAdminErrorDetail(crashFp, 1) : Promise.resolve([])), [crashFp]);
  const [triaging, setTriaging] = useState<string | null>(null);
  const [triageErr, setTriageErr] = useState<string | null>(null);

  // ── Derived ──
  const all: Bug[] = (board.data?.rows ?? []).map((b) => (patches[b.id] ? { ...b, ...patches[b.id] } : b));
  const qn = query.trim().toLowerCase();
  const shown = all.filter(
    (b) =>
      matchStatus(b.status, status) &&
      (!sev || b.severity === sev) &&
      (!qn || `${b.title} ${b.ref ?? ''} ${b.area ?? ''} ${b.detail ?? ''}`.toLowerCase().includes(qn)),
  );
  const sel = (selId ? all.find((b) => b.id === selId) : null) ?? shown[0] ?? null;
  const originRef = (origin: string) => trackedNow[origin] ?? all.find((b) => b.origin === origin)?.ref ?? null;

  const cnt = board.data?.counts;
  const reportRows = (reports.data?.rows ?? []).filter((f) => f.kind === 'BUG');
  const crashNew = board.data?.errors_new ?? 0;
  const reportsNew = board.data?.feedback_new ?? 0;

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
        reportsNew,
        crashesNew: crashNew,
      })
    : null;

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

  const track = async (kind: 'feedback' | 'error', ref: string) => {
    const key = `${kind}:${ref}`;
    setTracking(key);
    setTrackErr(null);
    try {
      const r = await trackBug(kind, ref);
      setTrackedNow((t) => ({ ...t, [key]: r.ref }));
      board.refetch();
      toast(`${r.ref} added to the board`);
    } catch (e) {
      setTrackErr({ key, msg: `Couldn’t add it to the board. ${errorMessage(e)}` });
    } finally {
      setTracking(null);
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
          { label: 'User reports', value: String(reportsNew), note: 'New, not triaged' },
          { label: 'Crash groups', value: String(crashNew), note: `New in ${CRASH_DAYS} days` },
        ],
      }
    : null;

  const sevColor = (s: BugSeverity) => (s === 'critical' ? c.crit : s === 'high' ? c.warn : c.ink3);
  const cell = (w: number, extra?: TextStyle): TextStyle => ({ width: w, flexShrink: 0, ...extra });

  const tracker = (
    <>
      <Input value={query} onChangeText={setQuery} placeholder="Search bugs" style={{ height: 38, paddingHorizontal: 14 }} accessibilityLabel="Search bugs" />
      <Row gap={8}>
        {STATUS_CHIPS.map((s) => (
          <Chip key={s.key} size="sm" label={s.label} count={board.data ? all.filter((b) => matchStatus(b.status, s.key)).length : null} on={status === s.key} onPress={() => setStatus(s.key)} />
        ))}
        <View style={{ width: 1, height: 18, backgroundColor: c.line, marginHorizontal: 4 }} />
        <Chip size="sm" label="Any severity" on={sev == null} onPress={() => setSev(null)} />
        {SEVERITIES.map((s) => (
          <Chip key={s} size="sm" label={SEV_LABEL[s]} on={sev === s} onPress={() => setSev(s)} />
        ))}
      </Row>
      {board.loading && !board.data ? (
        <Skeleton />
      ) : board.error ? (
        <ErrorLine onRetry={board.refetch}>Couldn’t load the board. {board.error}</ErrorLine>
      ) : (
        /* The design's `overflow-x:auto` + 620 px minimum: under that the table scrolls sideways rather
           than squeezing the Bug column to nothing. */
        /* ⚠ The table's width is PINNED to the measured pane (min 620). Inside a horizontal ScrollView a
           flex:1 column is unbounded, so the one-line Bug title grew to its full length and pushed Area,
           Severity, Status and Age off the right edge. */
        <ScrollView
          horizontal
          keyboardDismissMode={KEYBOARD_DISMISS_MODE}
          automaticallyAdjustKeyboardInsets={false}
          showsHorizontalScrollIndicator={false}
          onLayout={(e) => setTableW(Math.round(e.nativeEvent.layout.width))}
        >
          <View style={{ width: Math.max(620, tableW) }}>
            <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: c.line }}>
              {(
                [
                  ['Ref', 52],
                  ['Bug', 0],
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
              <Text style={{ paddingVertical: 18, paddingHorizontal: 12, fontSize: 14.5, color: c.ink2, borderBottomWidth: 1, borderBottomColor: c.line }}>
                {all.length === 0 ? 'The board is empty. File a bug, or track a user report or crash.' : 'No bugs match these filters. Try “All” or clear the search.'}
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

  const reportsView = (
    <View style={{ borderTopWidth: 1, borderTopColor: c.line }}>
      {reports.loading && !reports.data ? (
        <Skeleton />
      ) : reports.error ? (
        <ErrorLine onRetry={reports.refetch}>Couldn’t load user reports. {reports.error}</ErrorLine>
      ) : reportRows.length === 0 ? (
        <Text style={{ paddingVertical: 18, paddingHorizontal: 12, fontSize: 14.5, lineHeight: 22, color: c.ink2 }}>
          {/* The honest zero: "nobody has written" and "the report screen isn't reachable" both look like 0. */}
          {reports.data?.newestAt ? 'No bug reports from athletes. Other feedback is still arriving.' : 'No reports have ever arrived. When an athlete sends one from the app it shows up here.'}
        </Text>
      ) : (
        reportRows.map((f) => {
          const origin = `feedback:${f.id}`;
          const onBoard = originRef(origin);
          const first = f.body.split('\n').find((l) => l.trim())?.trim() ?? f.body;
          const who = f.athleteHandle ? `@${f.athleteHandle}` : f.athleteName;
          return (
            <View key={f.id} style={{ paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: c.line, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <Text numberOfLines={2} style={{ fontSize: 15, fontWeight: '500', color: c.ink }}>
                    {first}
                  </Text>
                  <Text style={{ fontSize: 13, color: c.ink3 }}>
                    {[who, when(f.createdAt), f.appVersion ? `v${f.appVersion}` : null, f.platform].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Btn size="sm" label={onBoard ? 'Tracked' : 'Track this'} disabled={!!onBoard} busy={tracking === origin} onPress={() => void track('feedback', String(f.id))} />
              </View>
              {trackErr?.key === origin ? <Text style={{ fontSize: 13, color: c.crit }}>{trackErr.msg}</Text> : null}
            </View>
          );
        })
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
          {/* ⚠ Zero crashes is the goal AND what a broken reporter looks like; `everAny` tells them apart. */}
          {crashes.data?.everAny
            ? `No crashes in the last ${CRASH_DAYS} days. The last one arrived ${when(crashes.data.everAny)}.`
            : 'No crash has ever been reported. If the app has been in use, check that crash reporting (0176) is applied and deployed.'}
        </Text>
      ) : (
        crashRows.map((g) => (
          <HoverRow key={g.fingerprint} bleed={0} selected={crash?.fingerprint === g.fingerprint} onPress={() => setCrashSel(g.fingerprint)} label={g.message || g.name} style={{ paddingVertical: 14, paddingHorizontal: 12 }}>
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 15, fontWeight: '500', color: c.ink }}>
                  {g.message || g.name}
                </Text>
                {g.status === 'NEW' ? <Text style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: c.warn }}>New</Text> : null}
              </View>
              <Text style={{ fontSize: 13, color: c.ink3 }}>
                {[plural(g.athletes, 'athlete', 'athletes'), `last seen ${when(g.lastSeen, true)}`, g.appVersion ? `v${g.appVersion}` : null].filter(Boolean).join(' · ')}
              </Text>
            </View>
            {/* Occurrences on the right; athletes lead the meta line because 12 crashes across 12 people
                outranks 200 from one tester. */}
            <Text style={[{ fontSize: 15, fontWeight: '600', color: c.ink }, TABULAR]}>{g.occurrences}</Text>
          </HoverRow>
        ))
      )}
    </View>
  );

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

      <Tabs
        tabs={[
          { key: 'tracker', label: 'Tracker', count: cnt ? String(cnt.total) : '' },
          { key: 'reports', label: 'User reports', count: board.data ? `${reportsNew} new` : '' },
          { key: 'crashes', label: 'Crashes', count: board.data ? `${crashNew} new` : '' },
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
                onBoard={originRef(`error:${crash.fingerprint}`)}
                tracking={tracking === `error:${crash.fingerprint}`}
                trackErr={trackErr?.key === `error:${crash.fingerprint}` ? trackErr.msg : null}
                onTrack={() => void track('error', crash.fingerprint)}
                triaging={triaging}
                triageErr={triageErr}
                onTriage={(st) => void triage(crash.fingerprint, st)}
              />
            ) : null
          ) : sel ? (
            <Panel gap={18}>
              <Text style={{ fontSize: 12.5, color: c.ink3 }}>{[sel.ref, sourceLabel(sel), sel.area].filter(Boolean).join(' · ')}</Text>
              <Text selectable style={{ fontFamily: DISPLAY, fontSize: 22, lineHeight: 28.6, color: c.ink }}>
                {sel.title}
              </Text>
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
                <Text style={{ fontSize: 12.5, color: c.ink3 }}>QA items can be closed but not deleted.</Text>
              )}
            </Panel>
          ) : null}
        </View>
      </View>
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
            <Text style={{ fontSize: 14.5, fontWeight: active ? '600' : '500', color: active ? c.ink : c.ink3 }}>
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
  crash: ErrorGroup;
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
  const occ = detail.data?.[0] ?? null;
  const crumbs = occ?.breadcrumbs ?? [];
  const stack = (occ?.stack ?? occ?.componentStack ?? '').trim();
  return (
    <Panel gap={18}>
      <Text style={{ fontSize: 12.5, color: c.ink3 }}>
        Crash group · {plural(crash.occurrences, 'report', 'reports')} · {plural(crash.athletes, 'athlete', 'athletes')}
      </Text>
      <Text selectable style={{ fontFamily: DISPLAY, fontSize: 22, lineHeight: 28.6, color: c.ink }}>
        {crash.message || crash.name}
      </Text>
      <View>
        <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: c.ink3, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: c.line }}>
          What they did before it broke
        </Text>
        {detail.loading && !detail.data ? (
          <Skeleton />
        ) : detail.error ? (
          <ErrorLine onRetry={detail.refetch}>Couldn’t load the trail. {detail.error}</ErrorLine>
        ) : crumbs.length === 0 ? (
          /* Route shapes and action names only are ever sent (breadcrumb-core.ts). An empty trail means
             the athlete has product-usage measurement off: the fault is kept, the trail is dropped. */
          <Text style={{ paddingVertical: 10, fontSize: 13.5, lineHeight: 20, color: c.ink3 }}>No trail with this report — the athlete has usage measurement turned off.</Text>
        ) : (
          crumbs.map((cr, i) => {
            const last = i === crumbs.length - 1;
            const text = `${cr.label}${cr.detail ? ` ${cr.detail}` : ''}${cr.n && cr.n > 1 ? ` ×${cr.n}` : ''}${last ? ' · crashed here' : ''}`;
            return (
              <View key={i} style={{ flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.line }}>
                <Text style={[{ width: 22, fontSize: 13.5, color: c.ink3 }, TABULAR]}>{i + 1}</Text>
                <Text selectable style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: last ? c.crit : c.ink }}>
                  {text}
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
      <Btn kind="primary" full label={onBoard ? `On the board as ${onBoard}` : 'Track this'} disabled={!!onBoard} busy={tracking} onPress={onTrack} />
      {trackErr ? <Text style={{ fontSize: 13, color: c.crit }}>{trackErr}</Text> : null}
      {/* Kept from the old page (not in the design): without it nothing clears a crash's "New" tag. It
          writes the crash group's own triage status, never the board. */}
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
    </Panel>
  );
}
