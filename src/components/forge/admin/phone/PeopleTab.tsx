import { useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';

import { useCrm } from '@/components/forge/admin/crm-theme';
import { when } from '@/components/forge/admin/crm-ui';
import { usePhone } from '@/components/forge/admin/phone/context';
import {
  BigBtn,
  EmptyRow,
  ErrorRow,
  FieldLabel,
  Muted,
  OfflineLine,
  OverlayScreen,
  PChip,
  PhoneScroll,
  PInput,
  ScreenTitle,
  SectionHead,
  Seg,
  SERIF,
  SheetFrame,
  Skel,
} from '@/components/forge/admin/phone/kit';
import { PSelect } from '@/components/forge/admin/phone/PSelect';
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
import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import { errorMessage, useQuery } from '@/lib/useQuery';

/**
 * People — the phone CRM's contacts (`Forge CRM Phone.dc.html`, PEOPLE + the contact / edit overlays + the
 * Log sheet). Same data path as the desktop `ContactsPage`: one `admin_contacts` read (every kind, with the
 * RPC's counts), filtered here; activity per contact from `admin_contact_activity`.
 */

type Filter = 'all' | 'due' | ContactKind;

const CHIPS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'due', label: 'Follow-ups due' },
  { key: 'business', label: 'Business' },
  { key: 'tester', label: 'Testers' },
  { key: 'trainer', label: 'Trainers' },
  { key: 'user', label: 'App users' },
  { key: 'other', label: 'Other' },
];

const KIND_ONE: Record<ContactKind, string> = { business: 'Business', tester: 'Tester', trainer: 'Trainer', user: 'App user', other: 'Other' };

const LOG_KINDS: { key: Activity['kind']; label: string }[] = [
  { key: 'note', label: 'Note' },
  { key: 'call', label: 'Call' },
  { key: 'email', label: 'Email' },
  { key: 'meeting', label: 'Meeting' },
  { key: 'task', label: 'Task' },
];
const LOG_LABEL = Object.fromEntries(LOG_KINDS.map((k) => [k.key, k.label])) as Record<Activity['kind'], string>;

/** The design's NEXT: days from today, or none. */
const NEXT: [string, number | null][] = [
  ['None', null],
  ['Tomorrow', 1],
  ['In 3 days', 3],
  ['In 1 week', 7],
  ['In 2 weeks', 14],
  ['In a month', 30],
];

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const OFFLINE_MSG = 'You’re offline, so saving is paused.';
const OFFLINE_TOAST = 'You’re offline. Saving is paused until you reconnect.';
const SAVE_FAILED = 'Couldn’t save. Check your connection and tap again.';

const displayName = (ct: Contact) => ct.name || ct.email || 'Unnamed contact';

function sourceLine(ct: Contact): string {
  if (ct.source === 'testflight_form') return 'Arrived from the website waitlist';
  if (ct.source === 'trainer_seat') return 'Arrived from trainer sign-up';
  if (ct.athlete_handle) return `Linked to @${ct.athlete_handle}`;
  return 'Added by you';
}

const metaLine = (ct: Contact) => [ct.company, ct.role].filter(Boolean).join(' · ') || sourceLine(ct);

// Same rule as the RPC's `follow_up_due` count (next_follow_up <= current_date), so the chip and its list agree.
const isDue = (ct: Contact, today: string) => !!today && !!ct.next_follow_up && ct.next_follow_up <= today;

/** "Follow up — 2 days overdue" / "Follow up today" (warn) / "Follow up Oct 3". */
function followLine(ct: Contact, today: string): { text: string; warn: boolean } | null {
  const f = followUpLabel(ct.next_follow_up, today);
  if (!f || !ct.next_follow_up) return null;
  if (f.overdue) return { text: f.text.charAt(0).toUpperCase() + f.text.slice(1), warn: true };
  return { text: `Follow up ${when(ct.next_follow_up)}`, warn: false };
}

/** yyyy-mm-dd shifted by whole days (UTC arithmetic on a date key, so no DST drift). */
function shiftDay(key: string, days: number): string {
  const t = Date.parse(`${key}T00:00:00Z`);
  if (Number.isNaN(t)) return key;
  return new Date(t + days * 86_400_000).toISOString().slice(0, 10);
}

/** The one contacts read every People surface shares (list, overlay, edit, Log sheet). */
function useContacts() {
  const { stamp, markLoaded } = usePhone();
  return useQuery(async () => {
    const l = await fetchContacts(null, null);
    markLoaded();
    return { l, today: todayKey() };
  }, [stamp]);
}

// ── The tab ─────────────────────────────────────────────────────────────────

export function PeopleTab() {
  const { c } = useCrm();
  const { open, contactFilter, setContactFilter } = usePhone();
  const list = useContacts();
  const rows = list.data?.l.rows ?? [];
  const counts = list.data?.l.counts ?? null;
  const today = list.data?.today ?? '';
  const dueCount = rows.filter((r) => isDue(r, today)).length;

  // The design opens on "Follow-ups due" when any are due. Derived, not synced: until the owner picks a chip
  // here, an untouched 'all' reads as 'due' while something is due.
  const [touched, setTouched] = useState(false);
  const filter = (!touched && contactFilter === 'all' && dueCount > 0 ? 'due' : contactFilter) as Filter;
  const pick = (k: Filter) => {
    setTouched(true);
    setContactFilter(k);
  };
  const shown = rows.filter((r) => (filter === 'all' ? true : filter === 'due' ? isDue(r, today) : r.kind === filter));

  const count = (k: Filter): number | null => {
    if (!counts) return null;
    if (k === 'all') return counts.total;
    if (k === 'due') return counts.follow_up_due;
    return counts[k];
  };

  return (
    <PhoneScroll padX={0}>
      <View style={{ paddingHorizontal: 20 }}>
        <ScreenTitle title="People" />
        <OfflineLine />
      </View>
      <ScrollView
        horizontal
        keyboardDismissMode={KEYBOARD_DISMISS_MODE}
        automaticallyAdjustKeyboardInsets={false}
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: 14, flexGrow: 0 }}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
      >
        {CHIPS.map((ch) => (
          <PChip key={ch.key} label={ch.label} count={count(ch.key)} on={filter === ch.key} onPress={() => pick(ch.key)} />
        ))}
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
        {list.error && !list.data ? (
          <ErrorRow msg={`Couldn’t load contacts. ${list.error}`} onRetry={list.refetch} />
        ) : !list.data ? (
          <Skel lines={5} />
        ) : shown.length === 0 ? (
          filter === 'due' ? (
            <Text style={{ paddingVertical: 28, fontSize: 15, color: c.ink3 }}>
              No follow-ups due.{' '}
              <Text onPress={() => pick('all')} accessibilityRole="button" style={{ color: c.brz }}>
                Show everyone
              </Text>
            </Text>
          ) : (
            <EmptyRow>{filter === 'all' ? 'No contacts yet. Add them from the desktop CRM.' : 'Nobody of this type yet.'}</EmptyRow>
          )
        ) : (
          shown.map((r) => {
            const f = followLine(r, today);
            return (
              <Pressable
                key={r.id}
                onPress={() => open({ kind: 'contact', id: r.id })}
                accessibilityRole="button"
                accessibilityLabel={displayName(r)}
                style={({ pressed }) => [
                  { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 68, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line },
                  pressed && { backgroundColor: c.hover },
                ]}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '500', color: c.ink }}>
                    {displayName(r)}
                  </Text>
                  <Text numberOfLines={1} style={{ marginTop: 3, fontSize: 14, color: c.ink3 }}>
                    {metaLine(r)}
                  </Text>
                  {f ? <Text style={{ marginTop: 3, fontSize: 13, color: f.warn ? c.warn : c.ink3 }}>{f.text}</Text> : null}
                </View>
                <Text style={{ fontSize: 22, color: c.ink3 }}>›</Text>
              </Pressable>
            );
          })
        )}
      </View>
    </PhoneScroll>
  );
}

// ── Contact overlay ─────────────────────────────────────────────────────────

export function ContactOverlay({ id, backLabel }: { id: string; backLabel: string }) {
  const { c } = useCrm();
  const { back, open, openSheet, offline, toast, refresh, stamp } = usePhone();
  const list = useContacts();
  const ct = list.data?.l.rows.find((r) => r.id === id) ?? null;
  const today = list.data?.today ?? '';
  const acts = useQuery(async () => ({ id, rows: await fetchActivity(id) }), [id, stamp]);

  const [stageOver, setStageOver] = useState<ContactStage | null>(null);
  const [stageBusy, setStageBusy] = useState(false);
  const [doneOver, setDoneOver] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState<string | null>(null);
  // The design's Call → Log hand-off: after tapping Call, the Log sheet opens on "Call".
  const [lastKind, setLastKind] = useState<Activity['kind'] | null>(null);

  if (!ct) {
    return (
      <OverlayScreen backLabel={backLabel} onBack={back}>
        {list.error && !list.data ? (
          <ErrorRow msg={`Couldn’t load this contact. ${list.error}`} onRetry={list.refetch} />
        ) : !list.data ? (
          <Skel lines={5} />
        ) : (
          <EmptyRow>This contact is gone. It may have been deleted on the desktop.</EmptyRow>
        )}
      </OverlayScreen>
    );
  }

  // The tapped stage shows at once and stays until the re-read carries it (a failed save puts it back).
  const stage = stageOver ?? ct.stage;
  const si = CONTACT_STAGES.findIndex((s) => s.key === stage);
  const f = followLine(ct, today);
  const sub = [ct.company, ct.role].filter(Boolean).join(', ') || (ct.name ? ct.email : null) || '';

  const setStage = async (key: ContactStage) => {
    if (offline) return toast(OFFLINE_TOAST);
    if (stageBusy || key === (stageOver ?? ct.stage)) return;
    setStageOver(key);
    setStageBusy(true);
    setErr(null);
    try {
      await saveContact(ct.id, { stage: key });
      toast(`Moved to ${CONTACT_STAGES.find((s) => s.key === key)?.label}.`);
      refresh();
    } catch (e) {
      setStageOver(null);
      setErr(`Couldn’t save the stage. ${errorMessage(e)}`);
    } finally {
      setStageBusy(false);
    }
  };

  const toggle = async (a: Activity, done: boolean) => {
    if (offline) return toast(OFFLINE_TOAST);
    setDoneOver((o) => ({ ...o, [a.id]: !done }));
    setErr(null);
    try {
      await setActivityDone(a.id, !done);
      toast(!done ? 'Done.' : 'Reopened.');
      refresh();
    } catch (e) {
      setDoneOver((o) => ({ ...o, [a.id]: done }));
      setErr(`Couldn’t save that task. ${errorMessage(e)}`);
    }
  };

  const call = () => {
    if (!ct.phone) return toast('No phone number saved. Add one with Edit.');
    setLastKind('call');
    Linking.openURL(`tel:${ct.phone.replace(/[^\d+]/g, '')}`).catch(() => toast('Couldn’t start a call on this device.'));
  };
  const email = () => {
    if (!ct.email) return toast('No email saved. Add one with Edit.');
    setLastKind('email');
    Linking.openURL(`mailto:${ct.email}`).catch(() => toast('Couldn’t open Mail on this device.'));
  };

  const rowsA = acts.data && acts.data.id === id ? acts.data.rows : null;

  return (
    <OverlayScreen
      backLabel={backLabel}
      onBack={back}
      right={
        <Pressable onPress={() => open({ kind: 'contactEdit', id })} accessibilityRole="button" style={{ height: 44, paddingLeft: 12, paddingRight: 4, justifyContent: 'center' }}>
          <Text style={{ fontSize: 17, color: c.brz }}>Edit</Text>
        </Pressable>
      }
      bottom={
        <>
          <BigBtn kind="quiet" label="Call" onPress={call} style={{ opacity: ct.phone ? 1 : 0.45 }} />
          <BigBtn kind="quiet" label="Email" onPress={email} style={{ opacity: ct.email ? 1 : 0.45 }} />
          <BigBtn label="Log" onPress={() => openSheet({ kind: 'log', params: { contactId: id, kind: lastKind ?? 'note' } })} />
        </>
      }
    >
      <Text style={{ fontSize: 14, color: c.ink3 }}>{KIND_ONE[ct.kind]}</Text>
      <Text style={{ fontFamily: SERIF, fontSize: 28, lineHeight: 34, marginTop: 6, color: c.ink }}>{displayName(ct)}</Text>
      {sub ? <Text style={{ marginTop: 6, fontSize: 15, color: c.ink2 }}>{sub}</Text> : null}
      {f ? <Text style={{ marginTop: 4, fontSize: 15, color: f.warn ? c.warn : c.ink3 }}>{f.text}</Text> : null}
      <OfflineLine />

      <View style={{ marginTop: 20, flexDirection: 'row', gap: 4, opacity: offline ? 0.55 : 1 }}>
        {CONTACT_STAGES.map((s, i) => {
          const on = i === si;
          const bar = on ? c.brz : i < si && stage !== 'inactive' ? c.brzBd : c.track;
          return (
            <Pressable
              key={s.key}
              onPress={() => void setStage(s.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: on, disabled: offline }}
              accessibilityLabel={`Stage: ${s.label}`}
              style={{ flex: 1, minWidth: 0, minHeight: 44, paddingVertical: 6, gap: 8 }}
            >
              <View style={{ height: 4, borderRadius: 2, backgroundColor: bar }} />
              <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '600', color: on ? c.brz : c.ink3 }}>
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {err ? <Text style={{ marginTop: 8, fontSize: 14, color: c.critInk }}>{err}</Text> : null}

      <SectionHead label="Activity" style={{ marginTop: 22 }} />
      {acts.error && !rowsA ? (
        <ErrorRow msg={`Couldn’t load activity. ${acts.error}`} onRetry={acts.refetch} />
      ) : !rowsA ? (
        <Skel lines={2} />
      ) : rowsA.length === 0 ? (
        <Text style={{ paddingVertical: 16, fontSize: 15, color: c.ink3 }}>Nothing logged yet.</Text>
      ) : (
        rowsA.map((a) => {
          const isTask = a.kind === 'task';
          const done = isTask && (doneOver[a.id] ?? !!a.done_at);
          const meta = isTask && a.due_on ? `Task · due ${when(a.due_on)}` : `${LOG_LABEL[a.kind]} · ${when(a.created_at)}`;
          return (
            <View key={a.id} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.line }}>
              {isTask ? (
                <Pressable
                  onPress={() => void toggle(a, done)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done }}
                  accessibilityLabel={a.body}
                  style={{ width: 44, height: 44, marginVertical: -12, marginLeft: -12, alignItems: 'center', justifyContent: 'center' }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 5,
                      borderWidth: 1.5,
                      borderColor: done ? c.brz : c.fieldBd,
                      backgroundColor: done ? c.brz : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {done ? <Text style={{ fontSize: 12, lineHeight: 14, color: c.btnInk }}>✓</Text> : null}
                  </View>
                </Pressable>
              ) : null}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 16, lineHeight: 22, color: done ? c.ink3 : c.ink, textDecorationLine: done ? 'line-through' : 'none' }}>{a.body}</Text>
                <Text style={{ marginTop: 3, fontSize: 13, color: c.ink3 }}>{meta}</Text>
              </View>
            </View>
          );
        })
      )}

      {ct.notes ? (
        <>
          <SectionHead label="Notes" style={{ marginTop: 22 }} />
          <Text style={{ marginTop: 10, fontSize: 15, lineHeight: 22, color: c.ink2 }}>{ct.notes}</Text>
        </>
      ) : null}
      <Text style={{ marginTop: 22, fontSize: 13, color: c.ink3 }}>{sourceLine(ct)}</Text>
    </OverlayScreen>
  );
}

// ── Edit overlay ────────────────────────────────────────────────────────────

type EditKey = 'name' | 'company' | 'role' | 'email' | 'phone' | 'notes';
const EDIT_FIELDS: { key: EditKey; label: string; kb?: 'email-address' | 'phone-pad' }[] = [
  { key: 'name', label: 'Name' },
  { key: 'company', label: 'Company' },
  { key: 'role', label: 'Role' },
  { key: 'email', label: 'Email', kb: 'email-address' },
  { key: 'phone', label: 'Phone', kb: 'phone-pad' },
  { key: 'notes', label: 'Notes' },
];

export function ContactEditOverlay({ id }: { id: string; backLabel: string }) {
  const { c } = useCrm();
  const { back, offline, toast, refresh } = usePhone();
  const list = useContacts();
  const ct = list.data?.l.rows.find((r) => r.id === id) ?? null;

  // Only what the owner typed; everything else reads through to the saved contact (derive, don't sync).
  const [draft, setDraft] = useState<Partial<Record<EditKey, string>>>({});
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);
  const [delBusy, setDelBusy] = useState(false);

  const val = (k: EditKey) => draft[k] ?? (ct?.[k] ?? '');

  const save = async () => {
    if (!ct || busy) return;
    if (offline) return toast(OFFLINE_TOAST);
    const name = val('name').trim();
    const mail = val('email').trim();
    if (!name) return setErr('Add a name.');
    if (mail && !EMAIL_RE.test(mail)) return setErr('That email doesn’t look right.');
    const patch: ContactPatch = { name, email: mail, phone: val('phone').trim(), company: val('company').trim(), role: val('role').trim(), notes: val('notes') };
    setBusy(true);
    setErr(null);
    try {
      await saveContact(ct.id, patch);
      toast('Saved.');
      refresh();
      back();
    } catch (e) {
      setErr(`${SAVE_FAILED} ${errorMessage(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const manual = ct?.source === 'manual';
  const remove = async () => {
    if (!ct || delBusy) return;
    if (offline) return toast(OFFLINE_TOAST);
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    setDelBusy(true);
    setErr(null);
    try {
      // admin_contact_delete only marks synced rows inactive (they would re-sync); manual rows really go.
      await deleteContact(ct.id);
      toast(manual ? 'Contact deleted.' : `${displayName(ct)} marked inactive.`);
      refresh();
      back();
      back();
    } catch (e) {
      setErr(`${SAVE_FAILED} ${errorMessage(e)}`);
    } finally {
      setDelBusy(false);
    }
  };

  return (
    <OverlayScreen
      backLabel="Cancel"
      plainBack
      onBack={back}
      title="Edit contact"
      right={
        <Pressable
          onPress={() => void save()}
          accessibilityRole="button"
          accessibilityState={{ disabled: offline || busy || !ct }}
          style={{ height: 44, paddingLeft: 12, paddingRight: 4, justifyContent: 'center', opacity: offline || !ct ? 0.45 : 1 }}
        >
          <Text style={{ fontSize: 17, fontWeight: '600', color: c.brz }}>{busy ? 'Saving…' : 'Save'}</Text>
        </Pressable>
      }
    >
      {!ct ? (
        list.error && !list.data ? <ErrorRow msg={`Couldn’t load this contact. ${list.error}`} onRetry={list.refetch} /> : <Skel lines={5} />
      ) : (
        <View style={{ gap: 16, paddingTop: 4 }}>
          {EDIT_FIELDS.map((fd) => (
            <FieldLabel key={fd.key} label={fd.label}>
              {fd.key === 'notes' ? (
                <PInput
                  multiline
                  value={val('notes')}
                  onChangeText={(t) => setDraft((d) => ({ ...d, notes: t }))}
                  placeholder="Don’t copy training data from the app into notes."
                />
              ) : (
                <PInput
                  returnKeyType="done"
                  value={val(fd.key)}
                  onChangeText={(t) => {
                    setDraft((d) => ({ ...d, [fd.key]: t }));
                    setErr(null);
                  }}
                  keyboardType={fd.kb}
                  autoCapitalize={fd.key === 'email' ? 'none' : undefined}
                  autoCorrect={fd.key === 'email' ? false : undefined}
                />
              )}
            </FieldLabel>
          ))}
          {err ? <Text style={{ fontSize: 14, color: c.critInk }}>{err}</Text> : null}
          {offline ? <Text style={{ fontSize: 13, color: c.warn, textAlign: 'center' }}>{OFFLINE_MSG}</Text> : null}
          <Pressable
            onPress={() => void remove()}
            accessibilityRole="button"
            style={{
              marginTop: 12,
              height: 48,
              borderRadius: 11,
              borderWidth: 1,
              borderColor: armed ? c.crit : c.line,
              backgroundColor: armed ? c.crit : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: offline ? 0.45 : 1,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: armed ? '#FFFFFF' : c.critInk }}>
              {delBusy ? (manual ? 'Deleting…' : 'Saving…') : armed ? (manual ? 'Confirm delete' : 'Confirm') : manual ? 'Delete contact' : 'Mark inactive'}
            </Text>
          </Pressable>
          {!manual ? <Muted>This contact comes from {ct.source === 'testflight_form' ? 'the website waitlist' : 'trainer sign-up'}, so it can only be marked inactive. Deleting it would bring it straight back.</Muted> : null}
        </View>
      )}
    </OverlayScreen>
  );
}

// ── Log sheet ───────────────────────────────────────────────────────────────

export function LogSheet({ params }: { params?: Record<string, unknown> }) {
  const { c } = useCrm();
  const { closeSheet, offline, toast, refresh } = usePhone();
  const contactId = typeof params?.contactId === 'string' ? params.contactId : '';
  const startKind = LOG_KINDS.some((k) => k.key === params?.kind) ? (params?.kind as Activity['kind']) : 'note';
  const list = useContacts();
  const ct = list.data?.l.rows.find((r) => r.id === contactId) ?? null;

  const [kind, setKind] = useState<Activity['kind']>(startKind);
  const [text, setText] = useState('');
  const [next, setNext] = useState('In 1 week');
  // One clock for this sheet: the reminder date and the "is it due" check read the same day.
  const [today] = useState(() => todayKey());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const days = NEXT.find(([l]) => l === next)?.[1] ?? null;
  const nextDate = days != null ? shiftDay(today, days) : null;

  const save = async () => {
    if (busy || !ct) return;
    if (offline) return toast(OFFLINE_TOAST);
    const body = text.trim() || LOG_LABEL[kind];
    setBusy(true);
    setErr(null);
    try {
      await logActivity(ct.id, kind, body, kind === 'task' ? nextDate : null);
      // The reminder is never forgotten: a picked follow-up is written to the contact. "None" clears a
      // follow-up that this log answers (one already due); a future one is left alone.
      if (nextDate) await saveContact(ct.id, { next_follow_up: nextDate });
      else if (isDue(ct, today)) await saveContact(ct.id, { next_follow_up: null });
      toast(nextDate ? `Logged. Next follow-up ${when(nextDate)}.` : 'Logged.');
      refresh();
      closeSheet();
    } catch (e) {
      setErr(`${SAVE_FAILED} ${errorMessage(e)}`);
      setBusy(false);
    }
  };

  return (
    <SheetFrame title={ct ? `Log for ${ct.company || displayName(ct)}` : 'Log'} onClose={busy ? () => {} : closeSheet}>
      <View style={{ marginTop: 12 }}>
        <Seg options={LOG_KINDS} value={kind} onChange={setKind} size="sm" surface="field" />
      </View>
      <PInput multiline value={text} onChangeText={setText} placeholder="What happened?" style={{ marginTop: 14, minHeight: 110 }} />
      <View style={{ marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 48 }}>
        <Text style={{ fontSize: 16, color: c.ink }}>Next follow-up</Text>
        <PSelect value={next} options={NEXT.map(([l]) => l)} onChange={setNext} accessibilityLabel="Next follow-up" />
      </View>
      <Text style={{ marginTop: 4, fontSize: 13, color: c.ink3 }}>{nextDate ? `Reminder on ${when(nextDate)}. It’ll show on Today.` : 'No reminder.'}</Text>
      {err ? <Text style={{ marginTop: 10, fontSize: 14, color: c.critInk }}>{err}</Text> : null}
      {!ct && list.error ? <Text style={{ marginTop: 10, fontSize: 14, color: c.critInk }}>{`Couldn’t load this contact. ${list.error}`}</Text> : null}
      <View style={{ marginTop: 18, flexDirection: 'row' }}>
        <BigBtn label={busy ? 'Saving…' : 'Save'} busy={busy} disabled={offline || !ct} onPress={() => void save()} />
      </View>
      {offline ? <Text style={{ marginTop: 8, textAlign: 'center', fontSize: 13, color: c.warn }}>{OFFLINE_MSG}</Text> : null}
    </SheetFrame>
  );
}
