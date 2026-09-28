import { useState } from 'react';
import { Linking, Text, View } from 'react-native';

import { flColor } from '@/constants/foundation';
import {
  Block,
  Btn,
  Chip,
  Chips,
  Columns,
  Empty,
  ErrorText,
  Field,
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
import {
  CONTACT_KINDS,
  CONTACT_STAGES,
  followUpLabel,
  parseTags,
  todayKey,
  type ContactKind,
  type ContactStage,
} from '@/domain/admin/crm-core';
import { errorMessage, useQuery } from '@/lib/useQuery';

/**
 * Contacts (Admin-Analytics-Amendment-002, AA-D15). Operator records about people the business deals
 * with — testers from the website form and trainer seats sync in automatically; everything else is
 * added by hand. AA-D13 still applies to what is TYPED here: notes never copy training data.
 */

type Filter = 'all' | 'due' | ContactKind;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const ACTIVITY_KINDS: { key: Activity['kind']; label: string }[] = [
  { key: 'note', label: 'Note' },
  { key: 'call', label: 'Call' },
  { key: 'email', label: 'Email' },
  { key: 'meeting', label: 'Meeting' },
  { key: 'task', label: 'Task' },
];

const SOURCE_LINE: Record<Contact['source'], string> = {
  testflight_form: 'From the website TestFlight form',
  trainer_seat: 'From the trainer seat register',
  manual: 'Added by hand',
};

function stageLabel(k: ContactStage): string {
  return CONTACT_STAGES.find((x) => x.key === k)?.label ?? k;
}
function kindLabel(k: ContactKind): string {
  return CONTACT_KINDS.find((x) => x.key === k)?.label ?? k;
}

/** Two-tap confirm: the first tap arms for ~4 s, the second acts. */
function useTwoTap(): [boolean, () => void, () => void] {
  const [armed, setArmed] = useState(false);
  const arm = () => {
    setArmed(true);
    setTimeout(() => setArmed(false), 4000);
  };
  return [armed, arm, () => setArmed(false)];
}

export function ContactsPage(props: PageProps) {
  const wide = useWide();
  const today = todayKey();

  const argKind = CONTACT_KINDS.some((k) => k.key === props.arg) ? (props.arg as ContactKind) : null;
  const argId = props.arg && UUID.test(props.arg) ? props.arg : null;

  const [pickedFilter, setPickedFilter] = useState<Filter | undefined>(undefined);
  const filter: Filter = pickedFilter ?? argKind ?? 'all';
  // undefined = nothing picked yet (so a contact id passed by `go` opens); 'new' = the blank editor.
  const [picked, setPicked] = useState<string | null | undefined>(undefined);
  const selected = picked !== undefined ? picked : argId;

  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const onSearch = (v: string) => {
    setText(v);
    if (timer) clearTimeout(timer);
    setTimer(setTimeout(() => setQ(v.trim()), 300));
  };

  const serverKind = filter === 'all' || filter === 'due' ? null : filter;
  const list = useQuery(() => fetchContacts(serverKind, q || null), [serverKind, q]);
  const counts = list.data?.counts;
  const allRows = list.data?.rows ?? [];
  const rows = filter === 'due' ? allRows.filter((r) => followUpLabel(r.next_follow_up, today)?.overdue) : allRows;
  const current = selected && selected !== 'new' ? (allRows.find((r) => r.id === selected) ?? null) : null;

  const listView = (
    <Block label="People" right={<Btn label="New contact" kind="primary" small onPress={() => setPicked('new')} />}>
      <Chips>
        <Chip label="All" count={counts?.total ?? null} on={filter === 'all'} onPress={() => setPickedFilter('all')} />
        {CONTACT_KINDS.map((k) => (
          <Chip key={k.key} label={k.label} count={counts?.[k.key] ?? null} on={filter === k.key} onPress={() => setPickedFilter(k.key)} />
        ))}
        <Chip label="Follow-ups due" count={counts?.follow_up_due ?? null} on={filter === 'due'} onPress={() => setPickedFilter('due')} />
      </Chips>
      <Field value={text} onChangeText={onSearch} placeholder="Name, email, company, @handle or tag" autoCapitalize="none" autoCorrect={false} />
      <QueryGate state={list}>
        {rows.length === 0 ? (
          <Empty>{filter === 'due' ? 'No follow-ups due.' : q ? 'Nobody matches that.' : 'No contacts here yet.'}</Empty>
        ) : (
          rows.map((c) => {
            const fu = followUpLabel(c.next_follow_up, today);
            const meta = [c.company, c.role, c.athlete_handle ? `@${c.athlete_handle}` : null].filter(Boolean).join(' · ');
            return (
              <ListRow key={c.id} onPress={() => setPicked(c.id)} selected={selected === c.id} label={`Open ${c.name ?? c.email ?? 'contact'}`}>
                <RowTitle dim={!c.name && !c.email}>{c.name ?? c.email ?? 'Unnamed'}</RowTitle>
                {meta ? <RowMeta>{meta}</RowMeta> : null}
                {fu ? <RowMeta tone={fu.overdue ? 'warn' : undefined}>{fu.text}</RowMeta> : null}
                <Chips>
                  <Tag label={stageLabel(c.stage)} tone={c.stage === 'inactive' ? 'muted' : undefined} />
                  <Tag label={kindLabel(c.kind)} tone="muted" />
                  {c.open_tasks > 0 ? <Tag label={`${c.open_tasks} open ${c.open_tasks === 1 ? 'task' : 'tasks'}`} tone="high" /> : null}
                </Chips>
              </ListRow>
            );
          })
        )}
      </QueryGate>
    </Block>
  );

  const detail =
    selected === 'new' || current ? (
      <View style={{ gap: 12 }}>
        {!wide ? (
          <View style={{ alignSelf: 'flex-start' }}>
            <Btn label="‹ Back" small onPress={() => setPicked(null)} />
          </View>
        ) : null}
        <ContactEditor
          key={current?.id ?? 'new'}
          contact={current}
          defaultKind={serverKind ?? 'business'}
          go={props.go}
          onSaved={(id) => {
            setPicked(id);
            list.refetch();
          }}
          onDeleted={(gone) => {
            if (gone) setPicked(null);
            list.refetch();
          }}
        />
      </View>
    ) : null;

  return (
    <View style={{ gap: 28 }}>
      <PageHead title="Contacts" lede="Testers, trainers, partners and anyone else the business deals with — with follow-ups and a timeline." />
      {wide ? (
        <Columns ratio={[1.1, 1]}>
          {listView}
          {detail ?? <Empty>Pick a contact, or start a new one.</Empty>}
        </Columns>
      ) : (
        (detail ?? listView)
      )}
    </View>
  );
}

// ── The editor ─────────────────────────────────────────────────────────────

interface Draft {
  name: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  next_follow_up: string;
  tags: string;
  notes: string;
  kind: ContactKind;
  stage: ContactStage;
}

function draftOf(c: Contact | null, defaultKind: ContactKind): Draft {
  return {
    name: c?.name ?? '',
    email: c?.email ?? '',
    phone: c?.phone ?? '',
    company: c?.company ?? '',
    role: c?.role ?? '',
    next_follow_up: c?.next_follow_up ?? '',
    tags: (c?.tags ?? []).join(', '),
    notes: c?.notes ?? '',
    kind: c?.kind ?? defaultKind,
    stage: c?.stage ?? 'lead',
  };
}

function ContactEditor({
  contact,
  defaultKind,
  go,
  onSaved,
  onDeleted,
}: {
  contact: Contact | null;
  defaultKind: ContactKind;
  go: PageProps['go'];
  onSaved: (id: string) => void;
  onDeleted: (gone: boolean) => void;
}) {
  const [base, setBase] = useState(() => draftOf(contact, defaultKind));
  const [d, setD] = useState<Draft>(base);
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [armed, arm, disarm] = useTwoTap();

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  const patch: ContactPatch = {};
  const textKeys = ['name', 'email', 'phone', 'company', 'role', 'notes'] as const;
  for (const k of textKeys) if (d[k] !== base[k]) patch[k] = d[k];
  if (d.kind !== base.kind) patch.kind = d.kind;
  if (d.stage !== base.stage) patch.stage = d.stage;
  if (d.next_follow_up.trim() !== base.next_follow_up) patch.next_follow_up = d.next_follow_up.trim() || null;
  if (parseTags(d.tags).join(',') !== parseTags(base.tags).join(',')) patch.tags = parseTags(d.tags);
  const dirty = Object.keys(patch).length > 0;
  const badDate = d.next_follow_up.trim() !== '' && !DATE.test(d.next_follow_up.trim());

  const save = async () => {
    if (badDate) {
      setErr('Follow-up date must be yyyy-mm-dd.');
      return;
    }
    setBusy('save');
    setErr(null);
    try {
      const body: ContactPatch = contact ? patch : { ...patch, kind: d.kind, stage: d.stage };
      const id = await saveContact(contact?.id ?? null, body);
      const saved = { ...d, next_follow_up: d.next_follow_up.trim(), tags: parseTags(d.tags).join(', ') };
      setBase(saved);
      setD(saved);
      setBusy(null);
      onSaved(id);
    } catch (e) {
      setErr(errorMessage(e));
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!contact) return;
    if (!armed) {
      arm();
      return;
    }
    disarm();
    setBusy('delete');
    setErr(null);
    try {
      await deleteContact(contact.id);
      if (contact.source !== 'manual') {
        setBase((b) => ({ ...b, stage: 'inactive' }));
        setD((p) => ({ ...p, stage: 'inactive' }));
      }
      setBusy(null);
      // A synced row is marked inactive, not deleted — it stays on screen.
      onDeleted(contact.source === 'manual');
    } catch (e) {
      setErr(errorMessage(e));
      setBusy(null);
    }
  };

  const synced = contact != null && contact.source !== 'manual';
  const email = contact?.email;
  const athleteId = contact?.athlete_id;

  return (
    <View style={{ gap: 24 }}>
      <Panel>
        <Text style={{ color: flColor.gray400, fontSize: 12 }}>
          {contact ? SOURCE_LINE[contact.source] : 'New contact'}
          {contact ? ` · added ${when(contact.created_at)}` : ''}
        </Text>
        <Field label="Name" value={d.name} onChangeText={(v) => set('name', v)} />
        <Field label="Email" value={d.email} onChangeText={(v) => set('email', v)} autoCapitalize="none" keyboardType="email-address" />
        <Field label="Phone" value={d.phone} onChangeText={(v) => set('phone', v)} keyboardType="phone-pad" />
        <Field label="Company" value={d.company} onChangeText={(v) => set('company', v)} />
        <Field label="Role" value={d.role} onChangeText={(v) => set('role', v)} />
        <Field
          label="Next follow-up"
          value={d.next_follow_up}
          onChangeText={(v) => set('next_follow_up', v)}
          placeholder="yyyy-mm-dd"
          autoCapitalize="none"
        />
        <Field label="Tags" value={d.tags} onChangeText={(v) => set('tags', v)} placeholder="comma, separated" autoCapitalize="none" />
        <Field label="Notes" value={d.notes} onChangeText={(v) => set('notes', v)} multiline />
        <Note>Don&apos;t copy training data from the app into notes (AA-D15).</Note>

        <Text style={{ color: flColor.gray600, fontSize: 10.5, letterSpacing: 0.6 }}>KIND</Text>
        <Chips>
          {CONTACT_KINDS.map((k) => (
            <Chip key={k.key} label={k.label} on={d.kind === k.key} onPress={() => set('kind', k.key)} />
          ))}
        </Chips>
        <Text style={{ color: flColor.gray600, fontSize: 10.5, letterSpacing: 0.6 }}>STAGE</Text>
        <Chips>
          {CONTACT_STAGES.map((k) => (
            <Chip key={k.key} label={k.label} on={d.stage === k.key} onPress={() => set('stage', k.key)} />
          ))}
        </Chips>

        {err ? <ErrorText>{err}</ErrorText> : null}
        <Chips>
          <Btn
            label={contact ? 'Save' : 'Create contact'}
            onPress={() => void save()}
            busy={busy === 'save'}
            disabled={(contact != null && !dirty) || busy === 'delete'}
          />
          {email ? <Btn label="Email" onPress={() => void Linking.openURL(`mailto:${email}`)} /> : null}
          {athleteId ? <Btn label="Open user" onPress={() => go('users', athleteId)} /> : null}
          {contact ? (
            <Btn
              label={armed ? (synced ? 'Confirm mark inactive' : 'Confirm delete') : synced ? 'Mark inactive' : 'Delete'}
              kind="danger"
              onPress={() => void remove()}
              busy={busy === 'delete'}
              disabled={busy === 'save' || (synced && contact.stage === 'inactive')}
            />
          ) : null}
        </Chips>
        {synced ? <Note>Synced contacts are marked inactive rather than deleted, so they don&apos;t sync back.</Note> : null}
      </Panel>

      {contact ? <ActivityBlock contactId={contact.id} onChanged={() => onDeleted(false)} /> : null}
    </View>
  );
}

// ── Activity ───────────────────────────────────────────────────────────────

function ActivityBlock({ contactId, onChanged }: { contactId: string; onChanged: () => void }) {
  const acts = useQuery(() => fetchActivity(contactId), [contactId]);
  const [kind, setKind] = useState<Activity['kind']>('note');
  const [body, setBody] = useState('');
  const [due, setDue] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const log = async () => {
    const dueOn = kind === 'task' && due.trim() ? due.trim() : null;
    if (dueOn && !DATE.test(dueOn)) {
      setErr('Due date must be yyyy-mm-dd.');
      return;
    }
    setBusy('log');
    setErr(null);
    try {
      await logActivity(contactId, kind, body.trim(), dueOn);
      setBody('');
      setDue('');
      setBusy(null);
      acts.refetch();
      onChanged();
    } catch (e) {
      setErr(errorMessage(e));
      setBusy(null);
    }
  };

  const toggle = async (a: Activity) => {
    setBusy(a.id);
    setErr(null);
    try {
      await setActivityDone(a.id, !a.done_at);
      setBusy(null);
      acts.refetch();
      onChanged();
    } catch (e) {
      setErr(errorMessage(e));
      setBusy(null);
    }
  };

  return (
    <Block label="Activity">
      <Panel>
        <Chips>
          {ACTIVITY_KINDS.map((k) => (
            <Chip key={k.key} label={k.label} on={kind === k.key} onPress={() => setKind(k.key)} />
          ))}
        </Chips>
        <Field value={body} onChangeText={setBody} placeholder="What happened?" multiline />
        {kind === 'task' ? <Field label="Due" value={due} onChangeText={setDue} placeholder="yyyy-mm-dd" autoCapitalize="none" /> : null}
        <View style={{ alignSelf: 'flex-start' }}>
          <Btn label="Log" onPress={() => void log()} busy={busy === 'log'} disabled={!body.trim()} />
        </View>
      </Panel>
      {err ? <ErrorText>{err}</ErrorText> : null}
      <QueryGate state={acts}>
        {(acts.data ?? []).length === 0 ? (
          <Empty>Nothing logged yet.</Empty>
        ) : (
          (acts.data ?? []).map((a) => (
            <ListRow key={a.id}>
              <Chips>
                <Tag label={a.kind} tone="muted" />
                {a.kind === 'task' ? (
                  <Chip label={a.done_at ? 'Done' : 'Mark done'} on={!!a.done_at} onPress={() => void toggle(a)} />
                ) : null}
              </Chips>
              <RowTitle>{a.body}</RowTitle>
              <RowMeta>
                {when(a.created_at, true)}
                {a.kind === 'task' && a.due_on ? ` · due ${when(a.due_on)}` : ''}
                {busy === a.id ? ' · saving…' : ''}
              </RowMeta>
            </ListRow>
          ))
        )}
      </QueryGate>
    </Block>
  );
}
