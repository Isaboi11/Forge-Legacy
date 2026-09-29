import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { DateInput } from '@/components/forge/admin/DateInput';
import {
  Btn,
  Chip,
  DeleteBtn,
  DISPLAY,
  ErrorLine,
  Field,
  FieldGrid,
  FormPanel,
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
} from '@/components/forge/admin/crm-ui';
import { useKeyboardPrimer } from '@/components/forge/KeyboardPrimer';
import { useCrm } from '@/components/forge/admin/crm-theme';
import type { PageProps } from '@/components/forge/admin/pages/types';
import {
  deleteContact,
  fetchActivity,
  fetchContacts,
  logActivity,
  saveContact,
  setActivityDone,
  type Activity,
  type Contact,
  type ContactPatch,
} from '@/data/crm-live';
import { CONTACT_STAGES, followUpLabel, todayKey, type ContactKind, type ContactStage } from '@/domain/admin/crm-core';
import { contactsNote } from '@/domain/admin/notes/contacts';
import { errorMessage, useQuery } from '@/lib/useQuery';

/**
 * Contacts (Forge CRM.dc.html, the CONTACTS section; AA-D15).
 *
 * The list is read once (every kind) and filtered here: the chips' counts come from the RPC's `counts`,
 * and "Follow-ups due" is a date filter the RPC has no parameter for. Testers (website waitlist) and
 * trainers (trainer seats) are synced into the table by `admin_contacts` itself, so they appear on their
 * own; deleting one of those only marks it inactive, or the next read would bring it straight back.
 */

type Filter = 'all' | ContactKind | 'due';

const KIND_KEYS: ContactKind[] = ['business', 'tester', 'trainer', 'user', 'other'];
const isKind = (v: string | undefined): v is ContactKind => !!v && (KIND_KEYS as string[]).includes(v);

const CHIPS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'business', label: 'Business' },
  { key: 'tester', label: 'Testers' },
  { key: 'trainer', label: 'Trainers' },
  { key: 'user', label: 'App users' },
  { key: 'other', label: 'Other' },
  { key: 'due', label: 'Follow-ups due' },
];

/** One contact's type, singular (the row's caps line, the panel's Type field, the form's options). */
const KIND_ONE: Record<ContactKind, string> = { business: 'Business', tester: 'Tester', trainer: 'Trainer', user: 'App user', other: 'Other' };

const STAGE_LABEL = Object.fromEntries(CONTACT_STAGES.map((s) => [s.key, s.label])) as Record<ContactStage, string>;

const LOG_KINDS: { key: Activity['kind']; label: string }[] = [
  { key: 'note', label: 'Note' },
  { key: 'call', label: 'Call' },
  { key: 'email', label: 'Email' },
  { key: 'meeting', label: 'Meeting' },
  { key: 'task', label: 'Task' },
];
const LOG_LABEL = Object.fromEntries(LOG_KINDS.map((k) => [k.key, k.label])) as Record<Activity['kind'], string>;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const displayName = (ct: Contact) => ct.name || ct.email || 'Unnamed contact';

function sourceLine(ct: Contact): string {
  if (ct.source === 'testflight_form') return 'Arrived from the website waitlist';
  if (ct.source === 'trainer_seat') return 'Arrived from trainer sign-up';
  if (ct.source === 'survey') return 'Asked for early access in a survey';
  if (ct.athlete_handle) return `Linked to @${ct.athlete_handle}`;
  return 'Added by you';
}

const metaLine = (ct: Contact) => [ct.company, ct.role].filter(Boolean).join(' · ') || sourceLine(ct);

/** "Follow up — 2 days overdue" / "Follow up today" / "Follow up Oct 3"; warn = due today or earlier. */
function followLine(ct: Contact, today: string): { text: string; warn: boolean } | null {
  const f = followUpLabel(ct.next_follow_up, today);
  if (!f || !ct.next_follow_up) return null;
  if (f.overdue) return { text: f.text.charAt(0).toUpperCase() + f.text.slice(1), warn: true };
  return { text: `Follow up ${when(ct.next_follow_up)}`, warn: false };
}

// Same rule as the RPC's `follow_up_due` count (next_follow_up <= current_date), so the chip and its list agree.
const isDue = (ct: Contact, today: string) => !!today && !!ct.next_follow_up && ct.next_follow_up <= today;

const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/** yyyy-mm-dd shifted by whole days (UTC arithmetic on a date key, so no DST drift). */
function shiftDay(key: string, days: number): string {
  const t = Date.parse(`${key}T00:00:00Z`);
  if (Number.isNaN(t)) return key;
  return new Date(t + days * 86_400_000).toISOString().slice(0, 10);
}

interface FormValues {
  name: string;
  email: string;
  company: string;
  role: string;
  phone: string;
  follow: string;
  kind: ContactKind;
  stage: ContactStage;
}
const EMPTY_FORM: FormValues = { name: '', email: '', company: '', role: '', phone: '', follow: '', kind: 'business', stage: 'lead' };

const SAVE_FAILED = 'Couldn’t save. Check your connection and tap again.';

export function ContactsPage(props: PageProps) {
  const { c } = useCrm();
  const { lg } = useLayout();
  const toast = useToast();
  const twoTap = useTwoTap();

  // `today` is read with the list, so "is it due" is judged against one clock, never a render-time one.
  const list = useQuery(async () => ({ l: await fetchContacts(null, null), today: todayKey() }), []);
  const rows: Contact[] = list.data?.l.rows ?? [];
  const counts = list.data?.l.counts ?? null;
  const today = list.data?.today ?? '';

  // A kind passed by `go` opens that chip; anything else is a contact id and opens that contact.
  const argKind = isKind(props.arg) ? props.arg : null;
  const argId = props.arg && !argKind ? props.arg : null;
  const [filterPick, setFilterPick] = useState<Filter | null>(null);
  const filter: Filter = filterPick ?? argKind ?? 'all';
  const shown = rows.filter((r) => (filter === 'all' ? true : filter === 'due' ? isDue(r, today) : r.kind === filter));

  // undefined = nothing picked yet (so a `go` id wins); null = the top row of the current list.
  const [picked, setPicked] = useState<string | null | undefined>(undefined);
  const selectedId = (picked === undefined ? argId : picked) ?? shown[0]?.id ?? null;
  const ct = rows.find((r) => r.id === selectedId) ?? null;
  // Under 1180 the panel replaces the list once someone is opened ("‹ Back" returns).
  const [openPick, setOpenPick] = useState<boolean | null>(null);
  const open = openPick ?? !!argId;

  const activity = useQuery(async () => (selectedId ? { id: selectedId, rows: await fetchActivity(selectedId) } : null), [selectedId]);

  // ── New contact form ──
  const [form, setForm] = useState<FormValues | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const setF = (k: keyof FormValues, v: string) => {
    setForm((f) => (f ? { ...f, [k]: v } : f));
    setFormErr(null);
  };

  const saveForm = async () => {
    if (!form || formBusy) return;
    const name = form.name.trim();
    const email = form.email.trim();
    if (!name) return setFormErr('Add a name.');
    if (email && !EMAIL_RE.test(email)) return setFormErr('That email doesn’t look right.');
    const patch: ContactPatch = { kind: form.kind, stage: form.stage, name };
    if (email) patch.email = email;
    if (form.company.trim()) patch.company = form.company.trim();
    if (form.role.trim()) patch.role = form.role.trim();
    if (form.phone.trim()) patch.phone = form.phone.trim();
    if (form.follow) patch.next_follow_up = form.follow;
    setFormBusy(true);
    try {
      const id = await saveContact(null, patch);
      toast(`${name} added to contacts`);
      setForm(null);
      setFilterPick('all');
      setPicked(id);
      setOpenPick(true);
      list.refetch();
    } catch (e) {
      setFormErr(SAVE_FAILED);
      if (__DEV__) console.warn('contact save failed', errorMessage(e));
    } finally {
      setFormBusy(false);
    }
  };

  // ── Stage (the 5-segment bar) ──
  const [stageOver, setStageOver] = useState<Record<string, ContactStage>>({});
  const [stageSave, setStageSave] = useState<{ id: string; state: 'saving' | 'error'; msg: string } | null>(null);
  const setStage = async (cur: Contact, key: ContactStage) => {
    const prev = stageOver[cur.id] ?? cur.stage;
    if (prev === key || (stageSave?.id === cur.id && stageSave.state === 'saving')) return;
    setStageOver((o) => ({ ...o, [cur.id]: key }));
    setStageSave({ id: cur.id, state: 'saving', msg: STAGE_LABEL[key] });
    try {
      await saveContact(cur.id, { stage: key });
      setStageSave(null);
      list.refetch();
    } catch (e) {
      setStageOver((o) => ({ ...o, [cur.id]: prev }));
      setStageSave({ id: cur.id, state: 'error', msg: `Couldn’t save. It’s still “${STAGE_LABEL[prev]}”. Check your connection and tap again.` });
      if (__DEV__) console.warn('stage save failed', errorMessage(e));
    }
  };

  // ── Notes (save on blur, only if changed) ──
  const [draft, setDraft] = useState<{ id: string; text: string } | null>(null);
  const [noteSave, setNoteSave] = useState<{ id: string; state: 'saving' | 'error' } | null>(null);
  const saveNotes = async (cur: Contact) => {
    if (!draft || draft.id !== cur.id || draft.text === (cur.notes ?? '')) return;
    setNoteSave({ id: cur.id, state: 'saving' });
    try {
      await saveContact(cur.id, { notes: draft.text });
      setNoteSave(null);
      toast('Saved');
      list.refetch();
    } catch (e) {
      setNoteSave({ id: cur.id, state: 'error' });
      if (__DEV__) console.warn('notes save failed', errorMessage(e));
    }
  };

  // ── Activity composer (CHANGED vs the design: its kind chips had no text entry) ──
  const [composer, setComposer] = useState<{ id: string; kind: Activity['kind']; text: string; due: string } | null>(null);
  const primeKeyboard = useKeyboardPrimer();
  const [logBusy, setLogBusy] = useState(false);
  const [logErr, setLogErr] = useState<string | null>(null);
  const log = async () => {
    if (!composer || logBusy) return;
    const body = composer.text.trim();
    if (!body) return setLogErr('Write a line first.');
    setLogBusy(true);
    setLogErr(null);
    try {
      await logActivity(composer.id, composer.kind, body, composer.kind === 'task' && composer.due ? composer.due : null);
      setComposer(null);
      activity.refetch();
      list.refetch();
    } catch (e) {
      setLogErr(SAVE_FAILED);
      if (__DEV__) console.warn('activity log failed', errorMessage(e));
    } finally {
      setLogBusy(false);
    }
  };

  const [doneOver, setDoneOver] = useState<Record<string, boolean>>({});
  const [doneErr, setDoneErr] = useState<string | null>(null);
  const toggleDone = async (a: Activity, done: boolean) => {
    setDoneOver((o) => ({ ...o, [a.id]: !done }));
    setDoneErr(null);
    try {
      await setActivityDone(a.id, !done);
      activity.refetch();
      list.refetch();
    } catch (e) {
      setDoneOver((o) => ({ ...o, [a.id]: done }));
      setDoneErr('Couldn’t save that task. Check your connection and tap again.');
      if (__DEV__) console.warn('task toggle failed', errorMessage(e));
    }
  };

  // ── Delete / mark inactive ──
  const [delBusy, setDelBusy] = useState(false);
  const [delErr, setDelErr] = useState<string | null>(null);
  const remove = async (cur: Contact) => {
    setDelBusy(true);
    setDelErr(null);
    try {
      await deleteContact(cur.id);
      // admin_contact_delete only marks synced rows inactive (they would re-sync); manual rows really go.
      if (cur.source === 'manual') {
        toast(`${displayName(cur)} deleted`);
        setPicked(null);
        setOpenPick(false);
      } else {
        toast(`${displayName(cur)} marked inactive`);
        setStageOver((o) => ({ ...o, [cur.id]: 'inactive' }));
      }
      list.refetch();
    } catch (e) {
      setDelErr(SAVE_FAILED);
      if (__DEV__) console.warn('contact delete failed', errorMessage(e));
    } finally {
      setDelBusy(false);
    }
  };

  const pick = (id: string) => {
    setPicked(id);
    setOpenPick(true);
    setDelErr(null);
    setLogErr(null);
    setDoneErr(null);
  };

  // ── Note under the title ──
  const note = list.data
    ? contactsNote({
        total: counts?.total ?? rows.length,
        due: rows
          .filter((r) => isDue(r, today))
          .sort((a, b) => ((a.next_follow_up ?? '') < (b.next_follow_up ?? '') ? -1 : 1))
          .map((r) => ({ name: displayName(r), daysOver: daysBetween(r.next_follow_up as string, today) })),
        openTasks: rows.reduce((s, r) => s + (Number(r.open_tasks) || 0), 0),
        newTesters7d: rows.filter((r) => r.source === 'testflight_form' && r.created_at.slice(0, 10) > shiftDay(today, -7)).length,
      })
    : null;

  const chipCount = (k: Filter): number | null => {
    if (!counts) return null;
    if (k === 'all') return counts.total;
    if (k === 'due') return counts.follow_up_due;
    return counts[k];
  };

  // ── List ──
  const listPane = (
    <View style={{ minWidth: 0, flex: lg ? 1 : undefined, borderTopWidth: 1, borderTopColor: c.line }}>
      {list.error ? (
        <View style={{ paddingBottom: 14 }}>
          <ErrorLine onRetry={list.refetch}>{`Couldn’t load contacts. ${list.error}`}</ErrorLine>
        </View>
      ) : list.loading && !list.data ? (
        <Skeleton />
      ) : shown.length === 0 ? (
        <Text style={{ paddingVertical: 18, fontSize: 14.5, lineHeight: 22.5, color: c.ink2 }}>
          {filter === 'due' ? 'No follow-ups are due.' : filter === 'all' ? 'No contacts yet.' : 'Nobody of this type yet.'}
        </Text>
      ) : (
        shown.map((r) => {
          const f = followLine(r, today);
          return (
            <HoverRow key={r.id} onPress={() => pick(r.id)} selected={lg && r.id === selectedId} label={displayName(r)} bleed={12} style={{ marginHorizontal: 0, paddingVertical: 14 }}>
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '500', color: c.ink }}>
                  {displayName(r)}
                </Text>
                <Text numberOfLines={1} style={{ fontSize: 13, color: c.ink3 }}>
                  {metaLine(r)}
                </Text>
                {f ? <Text style={{ fontSize: 12.5, fontWeight: '600', color: f.warn ? c.warn : c.ink3 }}>{f.text}</Text> : null}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 3 }}>
                <Text style={{ fontSize: 13.5, color: c.ink2 }}>{STAGE_LABEL[stageOver[r.id] ?? r.stage]}</Text>
                <Text style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: c.ink3 }}>{KIND_ONE[r.kind]}</Text>
              </View>
            </HoverRow>
          );
        })
      )}
    </View>
  );

  // ── Panel ──
  const renderPanel = (cur: Contact) => {
    const stage = stageOver[cur.id] ?? cur.stage;
    const si = CONTACT_STAGES.findIndex((s) => s.key === stage);
    const f = followLine(cur, today);
    const fields: { k: string; v: string; warn?: boolean }[] = [
      { k: 'Email', v: cur.email || '—' },
      { k: 'Phone', v: cur.phone || '—' },
      { k: 'Type', v: KIND_ONE[cur.kind] },
      { k: 'Tags', v: cur.tags?.length ? cur.tags.join(', ') : '—' },
      { k: 'Next follow-up', v: f ? f.text : 'None set', warn: !!f?.warn },
      { k: 'Source', v: sourceLine(cur) },
    ];
    const notesValue = draft?.id === cur.id ? draft.text : (cur.notes ?? '');
    const acts = activity.data && activity.data.id === cur.id ? activity.data.rows : null;
    const comp = composer?.id === cur.id ? composer : null;
    const ss = stageSave?.id === cur.id ? stageSave : null;
    const ns = noteSave?.id === cur.id ? noteSave : null;

    return (
      <>
        {!lg ? (
          <View style={{ alignSelf: 'flex-start' }}>
            <Btn label="‹ Back" size="sm" onPress={() => setOpenPick(false)} />
          </View>
        ) : null}
        <View style={{ gap: 4 }}>
          <Text style={{ fontFamily: DISPLAY, fontSize: 26, fontWeight: '600', color: c.ink }}>{displayName(cur)}</Text>
          <Text style={{ fontSize: 13.5, color: c.ink3 }}>{metaLine(cur)}</Text>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 12, color: c.ink3 }}>Stage</Text>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {CONTACT_STAGES.map((s, i) => {
              const bar = i <= si && stage !== 'inactive' ? c.brz : s.key === 'inactive' && stage === 'inactive' ? c.ink3 : c.track;
              const on = s.key === stage;
              return (
                <Pressable key={s.key} onPress={() => void setStage(cur, s.key)} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ flex: 1, minWidth: 0, gap: 6 }}>
                  <View style={{ height: 4, borderRadius: 2, backgroundColor: bar }} />
                  <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: on ? '600' : '400', color: on ? c.ink : c.ink3 }}>
                    {s.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {ss ? <Text style={{ fontSize: 12.5, color: ss.state === 'error' ? c.crit : c.ink3 }}>{ss.state === 'saving' ? `Saving “${ss.msg}”…` : ss.msg}</Text> : null}
        </View>

        <View>
          {fields.map((r) => (
            <View key={r.k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: c.line }}>
              <Text style={{ fontSize: 13.5, color: c.ink2 }}>{r.k}</Text>
              <Text style={{ fontSize: 13.5, fontWeight: '500', color: r.warn ? c.warn : c.ink, textAlign: 'right', flexShrink: 1 }}>{r.v}</Text>
            </View>
          ))}
          {cur.athlete_id ? (
            <View style={{ paddingTop: 10 }}>
              <LinkText label="Open user" onPress={() => props.go('users', cur.athlete_id as string)} />
            </View>
          ) : null}
        </View>

        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 12, color: c.ink3 }}>Notes</Text>
          <Input
            multiline
            value={notesValue}
            onChangeText={(t) => {
              setDraft({ id: cur.id, text: t });
              if (ns?.state === 'error') setNoteSave(null);
            }}
            onBlur={() => void saveNotes(cur)}
            placeholder="Add notes"
            style={{ minHeight: 70 }}
          />
          {ns ? (
            <Text style={{ fontSize: 12, color: ns.state === 'error' ? c.crit : c.ink3 }}>
              {ns.state === 'saving' ? 'Saving…' : 'Couldn’t save your notes. Check your connection, then click out of the box again.'}
            </Text>
          ) : null}
          <Text style={{ fontSize: 12, color: c.ink3 }}>Don’t copy training data from the app into notes.</Text>
        </View>

        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: c.ink3 }}>Activity</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {LOG_KINDS.map((k) => (
                <LogChip
                  key={k.key}
                  label={k.label}
                  on={comp?.kind === k.key}
                  onPress={() => {
                    /* FIRST, and synchronously: the composer's field mounts one commit from now with
                       `autoFocus`, outside this tap — on iOS Safari that focuses it with no keyboard. */
                    primeKeyboard();
                    setComposer({ id: cur.id, kind: k.key, text: comp?.text ?? '', due: comp?.due ?? '' });
                    setLogErr(null);
                  }}
                />
              ))}
            </View>
          </View>
          {comp ? (
            <View style={{ gap: 8 }}>
              <Input
                value={comp.text}
                onChangeText={(t) => {
                  setComposer({ ...comp, text: t });
                  setLogErr(null);
                }}
                onSubmitEditing={() => void log()}
                placeholder={comp.kind === 'task' ? 'What needs doing' : `${LOG_LABEL[comp.kind]}: what happened`}
                autoFocus
              />
              {comp.kind === 'task' ? <DateInput value={comp.due} onChange={(v) => setComposer({ ...comp, due: v })} accessibilityLabel="Due date" /> : null}
              <Row gap={8}>
                <Btn label="Log" kind="primary" size="sm" busy={logBusy} onPress={() => void log()} />
                <Btn
                  label="Cancel"
                  size="sm"
                  onPress={() => {
                    setComposer(null);
                    setLogErr(null);
                  }}
                />
                {logErr ? <Text style={{ fontSize: 13, color: c.crit }}>{logErr}</Text> : null}
              </Row>
            </View>
          ) : null}
          {doneErr ? <Text style={{ fontSize: 13, color: c.crit }}>{doneErr}</Text> : null}
          {activity.error && !acts ? (
            <ErrorLine onRetry={activity.refetch}>{`Couldn’t load activity. ${activity.error}`}</ErrorLine>
          ) : !acts ? (
            <Skeleton />
          ) : acts.length === 0 ? (
            <ActivityItem mark="round" text="Nothing logged yet." meta="Log a note, call, email, meeting or task above." />
          ) : (
            acts.map((a) => {
              const isTask = a.kind === 'task';
              const done = isTask && (doneOver[a.id] ?? !!a.done_at);
              const meta = isTask && a.due_on ? `Task · due ${when(a.due_on)}` : `${LOG_LABEL[a.kind]} · ${when(a.created_at)}`;
              return <ActivityItem key={a.id} mark={isTask ? 'square' : 'round'} done={done} text={a.body} meta={meta} onToggle={isTask ? () => void toggleDone(a, done) : undefined} />;
            })
          )}
        </View>

        <View style={{ gap: 8, paddingTop: 4 }}>
          <View style={{ alignSelf: 'flex-start' }}>
            <DeleteBtn armed={twoTap.armed === cur.id} busy={delBusy} label={cur.source === 'manual' ? 'Delete' : 'Mark inactive'} onPress={() => twoTap.tap(cur.id, () => void remove(cur))} />
          </View>
          {delErr ? <Text style={{ fontSize: 13, color: c.crit }}>{delErr}</Text> : null}
        </View>
      </>
    );
  };

  const panel = (
    <Panel sticky pad={26} gap={20} style={lg ? { width: 460, flexShrink: 0 } : undefined}>
      {ct ? (
        renderPanel(ct)
      ) : list.loading && !list.data ? (
        <Skeleton />
      ) : (
        <Text style={{ fontSize: 14.5, color: c.ink2 }}>Pick someone on the list to see where things stand.</Text>
      )}
    </Panel>
  );

  const narrowPanel = !lg && open && !!ct;

  return (
    <View>
      <PageHeader
        title="Contacts"
        purpose="Who you’re working with, where things stand, and who you owe."
        note={note}
        actions={[
          {
            label: 'New contact',
            onPress: () => {
              setForm({ ...EMPTY_FORM });
              setFormErr(null);
            },
          },
        ]}
      />

      {form ? (
        <FormPanel title="New contact" saveLabel="Save contact" onSave={() => void saveForm()} onCancel={() => setForm(null)} busy={formBusy} error={formErr}>
          <FieldGrid>
            <Field label="Name">
              <Input value={form.name} onChangeText={(v) => setF('name', v)} placeholder="Person or organisation" />
            </Field>
            <Field label="Email">
              <Input value={form.email} onChangeText={(v) => setF('email', v)} placeholder="name@company.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            </Field>
            <Field label="Company">
              <Input value={form.company} onChangeText={(v) => setF('company', v)} placeholder="Optional" />
            </Field>
            <Field label="Role">
              <Input value={form.role} onChangeText={(v) => setF('role', v)} placeholder="Optional" />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChangeText={(v) => setF('phone', v)} placeholder="Optional" keyboardType="phone-pad" />
            </Field>
            <Field label="Next follow-up">
              <DateInput value={form.follow} onChange={(v) => setF('follow', v)} accessibilityLabel="Next follow-up" />
            </Field>
          </FieldGrid>
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12.5, color: c.ink2 }}>Type</Text>
            <Row gap={6}>
              {KIND_KEYS.map((k) => (
                <Opt key={k} label={KIND_ONE[k]} on={form.kind === k} onPress={() => setF('kind', k)} />
              ))}
            </Row>
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12.5, color: c.ink2 }}>Stage</Text>
            <Row gap={6}>
              {CONTACT_STAGES.map((s) => (
                <Opt key={s.key} label={s.label} on={form.stage === s.key} onPress={() => setF('stage', s.key)} />
              ))}
            </Row>
          </View>
        </FormPanel>
      ) : null}

      {!narrowPanel ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 18 }}>
          {CHIPS.map((ch) => (
            <Chip
              key={ch.key}
              label={ch.label}
              count={chipCount(ch.key)}
              on={filter === ch.key}
              onPress={() => {
                setFilterPick(ch.key);
                setPicked(null);
              }}
            />
          ))}
        </View>
      ) : null}

      {lg ? (
        <View style={{ flexDirection: 'row', gap: 36, alignItems: 'flex-start' }}>
          {listPane}
          <View style={{ alignSelf: 'flex-start' }}>{panel}</View>
        </View>
      ) : narrowPanel ? (
        panel
      ) : (
        listPane
      )}
    </View>
  );
}

function LogChip({ label, on, onPress }: { label: string; on?: boolean; onPress: () => void }) {
  const { c } = useCrm();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!on }}
      style={({ hovered }: { pressed: boolean; hovered?: boolean }) => ({
        height: 26,
        paddingHorizontal: 9,
        borderRadius: 7,
        borderWidth: 1,
        borderColor: on ? c.brzBd : c.line,
        backgroundColor: on ? c.brzTint : hovered ? c.hover : 'transparent',
        justifyContent: 'center',
      })}
    >
      <Text style={{ fontSize: 12, fontWeight: '500', color: on ? c.brz : c.ink2 }}>{label}</Text>
    </Pressable>
  );
}

/** One timeline entry: a round mark for a note/call/email/meeting, a checkbox for a task. */
function ActivityItem({ mark, done, text, meta, onToggle }: { mark: 'round' | 'square'; done?: boolean; text: string; meta: string; onToggle?: () => void }) {
  const { c } = useCrm();
  const box = (
    <View
      style={{
        width: 16,
        height: 16,
        marginTop: 2,
        borderRadius: mark === 'square' ? 4 : 8,
        borderWidth: 1.5,
        borderColor: mark === 'square' ? (done ? c.brz : c.fieldBd) : c.line,
        backgroundColor: done ? c.brz : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {done ? <Text style={{ fontSize: 11, lineHeight: 12, color: c.btnInk }}>✓</Text> : null}
    </View>
  );
  return (
    <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.line }}>
      <View style={{ width: 20 }}>
        {onToggle ? (
          <Pressable onPress={onToggle} accessibilityRole="checkbox" accessibilityState={{ checked: !!done }} accessibilityLabel={text} hitSlop={8}>
            {box}
          </Pressable>
        ) : (
          box
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Text style={{ fontSize: 13.5, color: c.ink, textDecorationLine: done ? 'line-through' : 'none' }}>{text}</Text>
        <Text style={{ fontSize: 12, color: c.ink3 }}>{meta}</Text>
      </View>
    </View>
  );
}
