import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StatLine } from '@/components/forge/admin/charts';
import {
  Block,
  Btn,
  Chip,
  Chips,
  Columns,
  Empty,
  ErrorText,
  Field,
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
import { flColor, flFont, flRadius, flText } from '@/constants/foundation';
import {
  fetchAdminErrorDetail,
  fetchAdminErrors,
  fetchAdminFeedback,
  setErrorStatus,
  type ErrorOccurrence,
} from '@/data/admin-live';
import { deleteBug, fetchBugs, saveBug, trackBug, type Bug } from '@/data/crm-live';
import { BUG_STATUSES, SEVERITIES, type BugSeverity, type BugStatus } from '@/domain/admin/crm-core';
import { errorMessage, useQuery } from '@/lib/useQuery';

/**
 * Bugs — the one bug board (Admin-Analytics-Amendment-002, AA-D19).
 *
 * ══ ONE BOARD, THREE SOURCES, ORIGINALS UNTOUCHED ══
 *
 * `ops_bugs` holds the QA-report items and the bugs filed here by hand. User bug reports (feedback,
 * 0167) and crash groups (client errors, 0176) stay in their own tables and keep their own views below —
 * "Track this" COPIES one onto the board with a back-reference and never edits or deletes the original.
 * So a crash marked FIXED here in its own triage chips and a tracker row marked Fixed are two separate
 * facts on purpose: one is "the reporter stopped hearing about it", the other is "the work is done".
 *
 * ══ COUNTS SPAN THE WHOLE BOARD ══
 *
 * The KPI row and the "312 bugs" line come from `counts`, which the SQL computes over every row — never
 * the filtered page (the `admin_feedback` rule). The area chips filter the fetched rows client-side:
 * `admin_bugs` has no area parameter, and at a 1000-row ceiling a second round trip buys nothing.
 */

type View3 = 'tracker' | 'reports' | 'crashes';

const STATUS_FILTERS: { key: string | null; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'fixed', label: 'Fixed' },
  { key: 'wont_fix', label: 'Won’t fix' },
  { key: null, label: 'All' },
];

const statusLabel = (s: BugStatus) => BUG_STATUSES.find((x) => x.key === s)?.label ?? s;
const sevTone = (s: BugSeverity): 'critical' | 'high' | 'muted' =>
  s === 'critical' ? 'critical' : s === 'high' ? 'high' : 'muted';

export function BugsPage({ days }: PageProps) {
  const wide = useWide();
  const [view, setView] = useState<View3>('tracker');

  // ── Tracker filters ──
  const [status, setStatus] = useState<string | null>('active');
  const [severity, setSeverity] = useState<BugSeverity | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  /* The debounce lives in the change handler, not an effect: an effect that sets state on every
     keystroke is the synchronous-setState-in-effect pattern the lint forbids, and it would still fire
     one render late. The timer is only ever touched at event time. */
  const qTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearch = (t: string) => {
    setQInput(t);
    if (qTimer.current) clearTimeout(qTimer.current);
    qTimer.current = setTimeout(() => setQ(t.trim()), 250);
  };

  const bugs = useQuery(() => fetchBugs(status, severity, q || null), [status, severity, q]);

  // ── Selection ──
  const [selId, setSelId] = useState<string | null>(null);
  /* The last copy of the selected bug we saw. Marking a bug Fixed under the "Active" filter drops it from
     the refetched rows, and the detail must not vanish out from under the operator mid-edit — so the
     detail reads the live row first and falls back to this snapshot, which is only written at event time. */
  const [snap, setSnap] = useState<Bug | null>(null);
  const [creating, setCreating] = useState(false);
  const [noteDraft, setNoteDraft] = useState<{ id: string; text: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // ── New bug form ──
  const [nTitle, setNTitle] = useState('');
  const [nSev, setNSev] = useState<BugSeverity>('medium');
  const [nArea, setNArea] = useState('');
  const [nDetail, setNDetail] = useState('');

  /* Not range-scoped. An unanswered bug report from six weeks ago is not less unanswered because the
     range chips say 7D — a support queue is a to-do list, not a trend. */
  const feedback = useQuery(() => fetchAdminFeedback(50, null), []);

  /* Errors (0176). ⚠ RANGE-SCOPED, and it is the one operator queue that should be — unlike a support
     ticket, a crash from six weeks ago on a build nobody is running is genuinely not a to-do item. The
     chips are how you ask "is this still happening", which is the question that matters after a fix. */
  const errors = useQuery(() => fetchAdminErrors(days, 50, null), [days]);
  /* Which bug's trail is open. One at a time: a stack trace and forty breadcrumbs are not something you
     compare side by side, and rendering fifty of them would make the screen unusable. */
  const [openFp, setOpenFp] = useState<string | null>(null);
  const detail = useQuery<ErrorOccurrence[]>(
    () => (openFp ? fetchAdminErrorDetail(openFp, 5) : Promise.resolve([])),
    [openFp],
  );

  const triage = async (fingerprint: string, st: string) => {
    try {
      await setErrorStatus(fingerprint, st);
      errors.refetch();
    } catch {
      /* The row keeps its old status, which is the safe failure: a bug that silently reads FIXED
         because the write failed is the one outcome this queue must never produce. */
    }
  };

  const board = bugs.data;
  const rows = (board?.rows ?? []).filter((b) => area == null || b.area === area);
  const selected = selId ? (rows.find((b) => b.id === selId) ?? (snap?.id === selId ? snap : null)) : null;

  const select = (b: Bug | null) => {
    setSelId(b?.id ?? null);
    setSnap(b);
    setCreating(false);
    setConfirmDel(null);
    setErr(null);
  };

  /* After "Track this" or "New bug": clear every filter so the row is guaranteed to be on the list, then
     open it. A tracked copy that already existed may be Fixed — the detail says so rather than hiding. */
  const showOnBoard = (id: string) => {
    setStatus('active');
    setSeverity(null);
    setArea(null);
    setQInput('');
    setQ('');
    setSelId(id);
    setSnap(null);
    setCreating(false);
    setConfirmDel(null);
    setView('tracker');
    bugs.refetch();
  };

  const track = async (kind: 'feedback' | 'error', ref: string) => {
    setBusy(`track:${kind}:${ref}`);
    setErr(null);
    try {
      const id = await trackBug(kind, ref);
      showOnBoard(id);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const patch = async (b: Bug, p: Partial<Pick<Bug, 'status' | 'severity' | 'note'>>) => {
    setBusy(`save:${b.id}`);
    setErr(null);
    try {
      await saveBug(b.id, p);
      setSnap({ ...b, ...p });
      if (p.note !== undefined) setNoteDraft(null);
      bugs.refetch();
    } catch (e) {
      /* Nothing optimistic: the chips keep showing the saved value until the write is confirmed. */
      setErr(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (b: Bug) => {
    if (confirmDel !== b.id) {
      setConfirmDel(b.id);
      return;
    }
    setBusy(`del:${b.id}`);
    setErr(null);
    try {
      await deleteBug(b.id);
      select(null);
      bugs.refetch();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const create = async () => {
    const title = nTitle.trim();
    if (!title) return;
    setBusy('create');
    setErr(null);
    try {
      const id = await saveBug(null, {
        title,
        severity: nSev,
        area: nArea.trim() || null,
        detail: nDetail.trim() || null,
      });
      setNTitle('');
      setNSev('medium');
      setNArea('');
      setNDetail('');
      showOnBoard(id);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const c = board?.counts;

  // ── Tracker: list ──
  const list = (
    <Block
      label="Bugs"
      right={
        board ? (
          <Text style={styles.count}>
            {c?.total ?? 0} bugs · showing {rows.length}
          </Text>
        ) : null
      }
    >
      <QueryGate state={bugs}>
        {rows.length === 0 ? (
          <Empty>{board && board.counts.total === 0 ? 'The board is empty.' : 'No bugs match these filters.'}</Empty>
        ) : (
          <View>
            {rows.map((b) => (
              <ListRow key={b.id} onPress={() => select(b)} selected={b.id === selId} label={b.title}>
                <View style={styles.rowHead}>
                  <Tag label={b.severity} tone={sevTone(b.severity)} />
                  {b.ref ? <Text style={styles.ref}>{b.ref}</Text> : null}
                </View>
                <RowTitle>{b.title}</RowTitle>
                <RowMeta>
                  {[b.area, statusLabel(b.status), b.round != null ? `QA round ${b.round}` : `filed ${when(b.created_at)}`]
                    .filter(Boolean)
                    .join(' · ')}
                </RowMeta>
              </ListRow>
            ))}
          </View>
        )}
      </QueryGate>
    </Block>
  );

  // ── Tracker: new bug form ──
  const newForm = (
    <Panel>
      <Text style={styles.detailTitle}>New bug</Text>
      <Field label="Title" value={nTitle} onChangeText={setNTitle} placeholder="What broke" />
      <Text style={styles.fieldLabel}>Severity</Text>
      <Chips>
        {SEVERITIES.map((s) => (
          <Chip key={s} label={s} on={nSev === s} onPress={() => setNSev(s)} />
        ))}
      </Chips>
      <Field label="Area" value={nArea} onChangeText={setNArea} placeholder="e.g. Workouts" />
      <Field label="Detail" value={nDetail} onChangeText={setNDetail} multiline placeholder="Steps, expected, actual" />
      <View style={styles.actions}>
        <Btn kind="primary" label="File bug" onPress={() => void create()} disabled={!nTitle.trim()} busy={busy === 'create'} />
        <Btn label="Cancel" onPress={() => setCreating(false)} />
      </View>
    </Panel>
  );

  // ── Tracker: detail ──
  const noteValue = selected ? (noteDraft?.id === selected.id ? noteDraft.text : (selected.note ?? '')) : '';
  const detailPanel = selected ? (
    <Panel>
      <Text style={styles.detailTitle} selectable>
        {selected.title}
      </Text>
      <RowMeta>
        {[selected.ref, selected.report, selected.round != null ? `QA round ${selected.round}` : null, `filed ${when(selected.created_at)}`]
          .filter(Boolean)
          .join(' · ')}
      </RowMeta>
      {/* Full text, as written. It is markdown from the QA report and is shown raw on purpose — a
          renderer here would be a second thing to trust, and the operator copies it into issues. */}
      {selected.detail ? (
        <Text style={styles.detailBody} selectable>
          {selected.detail}
        </Text>
      ) : (
        <Note>No detail.</Note>
      )}

      <Text style={styles.fieldLabel}>Status</Text>
      <Chips>
        {BUG_STATUSES.map((s) => (
          <Chip
            key={s.key}
            label={s.label}
            on={selected.status === s.key}
            onPress={() => (selected.status === s.key ? undefined : void patch(selected, { status: s.key }))}
          />
        ))}
      </Chips>
      {selected.closed_at ? <Note>Closed {when(selected.closed_at, true)}</Note> : null}

      <Text style={styles.fieldLabel}>Severity</Text>
      <Chips>
        {SEVERITIES.map((s) => (
          <Chip
            key={s}
            label={s}
            on={selected.severity === s}
            onPress={() => (selected.severity === s ? undefined : void patch(selected, { severity: s }))}
          />
        ))}
      </Chips>

      <Field
        label="Note"
        value={noteValue}
        onChangeText={(t) => setNoteDraft({ id: selected.id, text: t })}
        multiline
        placeholder="What you found, what you changed"
      />
      <View style={styles.actions}>
        <Btn
          label="Save note"
          onPress={() => void patch(selected, { note: noteValue.trim() || null })}
          disabled={noteDraft?.id !== selected.id}
          busy={busy === `save:${selected.id}`}
        />
        {/* Only hand-filed bugs can be deleted. A QA row is the report's record — close it, don't erase it. */}
        {selected.source === 'manual' ? (
          <Btn
            kind="danger"
            label={confirmDel === selected.id ? 'Confirm delete' : 'Delete'}
            onPress={() => void remove(selected)}
            busy={busy === `del:${selected.id}`}
          />
        ) : null}
      </View>
    </Panel>
  ) : selId && !bugs.loading ? (
    <View style={styles.missing}>
      <Empty>This bug is not in the current filter.</Empty>
      <Btn small label="Show all statuses" onPress={() => setStatus(null)} />
    </View>
  ) : wide ? (
    <Empty>Select a bug to see its detail, or file a new one.</Empty>
  ) : null;

  const side = creating ? newForm : detailPanel;
  const sideOpen = creating || selId != null;

  const tracker = (
    <>
      <View style={styles.filters}>
        <Chips>
          {STATUS_FILTERS.map((f) => (
            <Chip key={f.label} label={f.label} on={status === f.key} onPress={() => setStatus(f.key)} />
          ))}
        </Chips>
        <Chips>
          <Chip label="All severities" on={severity == null} onPress={() => setSeverity(null)} />
          {SEVERITIES.map((s) => (
            <Chip key={s} label={s} on={severity === s} onPress={() => setSeverity(s)} />
          ))}
        </Chips>
        {board && board.areas.length ? (
          <Chips>
            {board.areas.map((a) => (
              <Chip
                key={a.area}
                label={a.area}
                count={a.n}
                on={area === a.area}
                onPress={() => setArea(area === a.area ? null : a.area)}
              />
            ))}
          </Chips>
        ) : null}
        <View style={styles.searchRow}>
          <View style={styles.searchField}>
            <Field value={qInput} onChangeText={onSearch} placeholder="Search title, ref, area, detail" />
          </View>
          <Btn
            kind={creating ? 'quiet' : 'primary'}
            label="New bug"
            onPress={() => {
              setCreating(true);
              setSelId(null);
              setErr(null);
            }}
            disabled={creating}
          />
        </View>
      </View>

      {wide ? (
        <Columns ratio={[1.2, 1]}>
          {list}
          {side}
        </Columns>
      ) : sideOpen ? (
        <View style={styles.phoneDetail}>
          <View style={styles.backRow}>
            <Btn small label="‹ Back to list" onPress={() => select(null)} />
          </View>
          {side}
        </View>
      ) : (
        list
      )}
    </>
  );

  // ── User reports (0167) ──
  const reportsView = (
    <Block
      label="User reports"
      hint="What people have told us, newest first. Not range-scoped — an unanswered report is not less unanswered because the chips say 7D."
    >
      <QueryGate state={feedback}>
        {feedback.data ? (
          <>
            <StatLine label="Unanswered" value={feedback.data.unread} />
            <StatLine label="Bug reports" value={feedback.data.bugs} />
            <StatLine label="Total received" value={feedback.data.total} />
            {/* ⚠ THE HONEST-ZERO LINE. "Nobody has written" and "nothing links to the screen" both
                render as 0 above, and the second is a bug that looks exactly like calm. A date here
                is proof the pipe works end to end; the sentence is the only other truthful answer. */}
            <StatLine
              label="Last received"
              value={feedback.data.newestAt ? when(feedback.data.newestAt, true) : 'nothing has ever arrived'}
            />
            {feedback.data.rows.length === 0 ? null : (
              <View style={styles.list}>
                {feedback.data.rows.map((f) => (
                  <ListRow key={f.id}>
                    <View style={styles.rowHead}>
                      <Tag label={f.kind} tone={f.kind === 'BUG' ? 'high' : 'muted'} />
                      <Text style={styles.who} numberOfLines={1}>
                        {f.athleteHandle ? `@${f.athleteHandle}` : f.athleteName}
                      </Text>
                      <Text style={styles.stamp}>{when(f.createdAt, true)}</Text>
                    </View>
                    {/* Full text, never truncated. A support message read halfway is a support message
                        misread — and this is the one place whose whole job is to show what somebody wrote. */}
                    <Text style={styles.body} selectable>
                      {f.body}
                    </Text>
                    <RowMeta>
                      {[f.status, f.screen, f.platform, f.appVersion].filter(Boolean).join(' · ')}
                      {f.contactOk ? '' : ' · no reply wanted'}
                    </RowMeta>
                    {f.kind === 'BUG' ? (
                      <View style={styles.actions}>
                        <Btn
                          small
                          label="Track this"
                          onPress={() => void track('feedback', String(f.id))}
                          busy={busy === `track:feedback:${f.id}`}
                        />
                      </View>
                    ) : null}
                  </ListRow>
                ))}
              </View>
            )}
          </>
        ) : null}
      </QueryGate>
    </Block>
  );

  // ── Crashes (0176) ──
  /*
    ⚠ ONE ROW PER BUG, NOT PER OCCURRENCE. The grouping happens in SQL (by fingerprint) and it is
    what makes this readable: 400 raw rows is a list nobody opens twice.

    ⚠ AA-D2. The list below names NOBODY — it is aggregate. Identity appears one level down, inside a
    specific bug's trail, on the same grounds as `admin_feedback`: AA-D2 forbids a named athlete beside
    PERFORMANCE, and a crash report is not performance. "Three accounts are trapped in onboarding" is not
    actionable without the three.
  */
  const crashesView = (
    <Block
      label="Crashes"
      hint="What actually broke, grouped by bug, with the path the athlete took to get there. Range-scoped on purpose — a crash on a build nobody runs is not a to-do item."
    >
      <QueryGate state={errors}>
        {errors.data ? (
          <>
            <StatLine label="Distinct bugs" value={errors.data.bugs} />
            <StatLine label="Occurrences" value={errors.data.occurrences} />
            <StatLine label="Athletes affected" value={errors.data.athletes} />
            <StatLine label="Fatal" value={errors.data.fatal} />
            {/*
              ⚠ THE HONEST-ZERO LINE, AND IT READS THE OPPOSITE WAY FROM THE ONE ON FEEDBACK.
              Zero errors is the outcome we want AND exactly what a broken reporter looks like — a
              client half that never deployed, or `report_client_error` left un-granted. So this row
              says which of the two it is, rather than letting a comforting 0 stand for both.
            */}
            <StatLine
              label="Reporting"
              value={
                errors.data.everAny
                  ? `live · last report ${when(errors.data.everAny, true)}`
                  : 'nothing has EVER been reported — check 0176 is applied and the client is deployed'
              }
            />
            {errors.data.rows.length === 0 ? null : (
              <View style={styles.list}>
                {errors.data.rows.map((g) => (
                  <ListRow key={g.fingerprint}>
                    <Pressable
                      onPress={() => setOpenFp(openFp === g.fingerprint ? null : g.fingerprint)}
                      accessibilityRole="button"
                      accessibilityLabel={`Show the trail for ${g.name}`}
                    >
                      <View style={styles.rowHead}>
                        <Text style={styles.errName}>{g.name}</Text>
                        {/* Athletes first. 200 crashes from one tester is a bad afternoon; 12 across
                            12 people is a release blocker, and reading occurrences first gets that
                            ranking backwards. */}
                        <Text style={styles.errCount} numberOfLines={1}>
                          {g.athletes === 1 ? '1 athlete' : `${g.athletes} athletes`} · {g.occurrences}×
                        </Text>
                        <Text style={styles.stamp}>{when(g.lastSeen, true)}</Text>
                      </View>
                      <Text style={styles.body}>{g.message}</Text>
                      <RowMeta>
                        {[g.status, g.screen, g.source, g.platform, g.fatalCount > 0 ? `${g.fatalCount} fatal` : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </RowMeta>
                      {/* ⭐ The sentence a self-resetting status could never say. */}
                      {g.statusAt && g.sinceStatus > 0 ? (
                        <RowMeta tone="warn">
                          marked {g.status} on {when(g.statusAt, true)} — {g.sinceStatus} since
                        </RowMeta>
                      ) : null}
                      {/* ⭐ "Did my fix work" is answerable only from here: app_version is 1.0.0 on
                          every OTA published over build 6. */}
                      {g.updateIds.length > 0 ? (
                        <Text style={styles.errBuilds}>seen on {g.updateIds.map((u) => u.slice(0, 8)).join(', ')}</Text>
                      ) : null}
                    </Pressable>

                    <View style={styles.actions}>
                      <Chips>
                        {(['ACKED', 'FIXED', 'IGNORED'] as const).map((st) => (
                          <Chip key={st} label={st} on={g.status === st} onPress={() => void triage(g.fingerprint, st)} />
                        ))}
                      </Chips>
                      <Btn
                        small
                        label="Track this"
                        onPress={() => void track('error', g.fingerprint)}
                        busy={busy === `track:error:${g.fingerprint}`}
                      />
                    </View>

                    {/* ⭐ THE TRAIL. This is the answer to "what path were they on" and the entire
                        reason the system exists. Route shapes and enum action names only — never a
                        word the athlete typed (enforced in domain/diagnostics/breadcrumb-core.ts). */}
                    {openFp === g.fingerprint ? (
                      <View style={styles.errDetail}>
                        <QueryGate state={detail}>
                          {(detail.data ?? []).map((o) => (
                            <View key={o.id} style={styles.errOccurrence}>
                              <RowMeta>
                                {[
                                  o.athleteHandle ? `@${o.athleteHandle}` : 'signed out',
                                  when(o.receivedAt, true),
                                  o.deviceModel,
                                  o.osVersion,
                                  o.updateId ? `ota ${o.updateId.slice(0, 8)}` : 'embedded bundle',
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </RowMeta>
                              {o.breadcrumbs.length === 0 ? (
                                <Text style={styles.errTrailEmpty}>
                                  No trail — this athlete has product-usage measurement off, which drops the trail
                                  and keeps the fault. Working as designed.
                                </Text>
                              ) : (
                                <View style={styles.errTrail}>
                                  {o.breadcrumbs.map((cr, i) => (
                                    <Text key={`${o.id}-${i}`} style={styles.errCrumb} selectable>
                                      {cr.type === 'route' ? '→' : cr.type === 'net' ? '✕' : cr.type === 'state' ? '◦' : '·'}{' '}
                                      {cr.label}
                                      {cr.detail ? ` ${cr.detail}` : ''}
                                      {cr.n && cr.n > 1 ? ` ×${cr.n}` : ''}
                                    </Text>
                                  ))}
                                </View>
                              )}
                              {o.componentStack || o.stack ? (
                                <Text style={styles.errStack} selectable numberOfLines={14}>
                                  {(o.componentStack ?? o.stack ?? '').trim()}
                                </Text>
                              ) : null}
                            </View>
                          ))}
                        </QueryGate>
                      </View>
                    ) : null}
                  </ListRow>
                ))}
              </View>
            )}
          </>
        ) : null}
      </QueryGate>
    </Block>
  );

  return (
    <View style={{ gap: 28 }}>
      <PageHead
        title="Bugs"
        lede="One board for QA findings and bugs you file, with user reports and crashes alongside. “Track this” copies a report or crash onto the board and leaves the original alone."
      />

      {c ? (
        <Kpis
          items={[
            {
              label: 'Critical (active)',
              value: String(c.active_critical),
              onPress: () => {
                setView('tracker');
                setStatus('active');
                setSeverity('critical');
              },
            },
            {
              label: 'High (active)',
              value: String(c.active_high),
              onPress: () => {
                setView('tracker');
                setStatus('active');
                setSeverity('high');
              },
            },
            { label: 'Open total', value: String(c.open + c.in_progress), sub: `${c.in_progress} in progress` },
            { label: 'Fixed · last 7 days', value: String(c.fixed_7d) },
            { label: 'New user bug reports', value: String(board?.feedback_new ?? 0), onPress: () => setView('reports') },
            { label: 'New crash groups', value: String(board?.errors_new ?? 0), sub: 'last 14 days', onPress: () => setView('crashes') },
          ]}
        />
      ) : bugs.error ? (
        <ErrorText>{bugs.error}</ErrorText>
      ) : null}

      <Chips>
        <Chip label="Tracker" on={view === 'tracker'} onPress={() => setView('tracker')} count={c ? c.open + c.in_progress : null} />
        <Chip label="User reports" on={view === 'reports'} onPress={() => setView('reports')} count={board?.feedback_new ?? null} />
        <Chip label="Crashes" on={view === 'crashes'} onPress={() => setView('crashes')} count={board?.errors_new ?? null} />
      </Chips>

      {err ? <ErrorText>{err}</ErrorText> : null}

      {view === 'tracker' ? tracker : view === 'reports' ? reportsView : crashesView}
    </View>
  );
}

const styles = StyleSheet.create({
  count: { color: flColor.gray600, fontSize: 11.5, fontVariant: ['tabular-nums'] },
  filters: { gap: 10 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchField: { flex: 1, minWidth: 0 },
  phoneDetail: { gap: 12 },
  backRow: { flexDirection: 'row' },
  missing: { gap: 8, alignItems: 'flex-start' },

  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ref: { color: flColor.gray400, fontSize: 11.5, fontWeight: '600', fontVariant: ['tabular-nums'] },
  list: { marginTop: 6 },
  who: { flex: 1, minWidth: 0, fontSize: 11.5, color: flColor.gray600 },
  stamp: { flexShrink: 0, marginLeft: 'auto', fontSize: 11.5, color: flColor.gray400 },
  body: { fontSize: 13, lineHeight: 19, color: flText.primary },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 4 },

  detailTitle: { color: flText.primary, fontFamily: flFont.displayMedium, fontSize: 18, lineHeight: 24 },
  detailBody: { color: flText.secondary, fontSize: 13, lineHeight: 20 },
  fieldLabel: { color: flText.tertiary, fontSize: 10.5, letterSpacing: 0.6, textTransform: 'uppercase' },

  // ── Crashes (0176) ──
  errName: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: flColor.labelInk },
  errCount: { flex: 1, fontSize: 11, fontWeight: '600', color: flColor.labelInk },
  errBuilds: { fontSize: 10.5, color: flColor.gray400 },
  errDetail: { marginTop: 8, gap: 10 },
  errOccurrence: {
    padding: 10,
    borderRadius: flRadius.md,
    backgroundColor: flColor.surfaceRecessed,
    gap: 6,
  },
  errTrail: { gap: 1 },
  // Selectable and tight: this block exists to be READ top to bottom as a sequence, and copied out.
  errCrumb: { fontSize: 11, lineHeight: 16, color: flText.primary },
  errTrailEmpty: { fontSize: 11, lineHeight: 16, color: flColor.gray400, fontStyle: 'italic' },
  errStack: { fontSize: 10, lineHeight: 14, color: flColor.gray400 },
});
