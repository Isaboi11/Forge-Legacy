import * as Clipboard from 'expo-clipboard';
import { useMemo, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import {
  Block,
  BlockGrid,
  Btn,
  Chip,
  DeleteBtn,
  ErrorLine,
  Field,
  FieldGrid,
  FootNote,
  FormPanel,
  HeroFigures,
  HoverRow,
  Input,
  LinkText,
  PageHeader,
  Row,
  SectionLabel,
  Skeleton,
  useToast,
  useTwoTap,
  when,
} from '@/components/forge/admin/crm-ui';
import { useCrm } from '@/components/forge/admin/crm-theme';
import type { PageProps } from '@/components/forge/admin/pages/types';
import { deleteSurvey, fetchSurvey, fetchSurveys, hideSurveyResponse, saveSurvey, surveyFormScript } from '@/data/crm-live';
import {
  isEmailQuestion,
  matches,
  pct,
  resultsBrief,
  summarize,
  topLine,
  writeIns,
  type ChoiceResult,
  type SurveyFilter,
  type SurveyRow,
  type TextResult,
} from '@/domain/admin/survey-core';
import { useQuery } from '@/lib/useQuery';

/**
 * Surveys (migration 0243, AA-D22) — answers from the Google Forms the owner posts in Facebook groups,
 * arriving on their own through the form's Apps Script, so the website and the ads can be aimed with them.
 *
 * Tap any answer bar to see only the people who gave it — every other question redraws for that group
 * ("what do 25–34 year olds who quit over price want?"). "Copy results" puts the whole page as text on
 * the clipboard for a Claude session, which cannot read the database.
 *
 * Early-access emails are counted here and listed in Contacts (tagged Survey · Early access), never here.
 */

const TEXT_SHOWN = 6;

export function SurveysPage({ arg, go }: PageProps) {
  const { c } = useCrm();
  const toast = useToast();
  const { armed, tap } = useTwoTap();

  const list = useQuery(() => fetchSurveys(), []);
  const surveys = list.data ?? [];
  const current = surveys.find((s) => s.id === arg) ?? surveys[0] ?? null;
  // `at` = when it was read, so "last 7 days" is judged against that, not a render-time clock.
  const detail = useQuery(async () => (current ? { ...(await fetchSurvey(current.id)), at: Date.now() } : null), [current?.id]);
  const d = detail.data && detail.data.id === current?.id ? detail.data : null;

  const [filter, setFilter] = useState<SurveyFilter | null>(null);
  const [editing, setEditing] = useState<'new' | 'edit' | null>(null);
  const [draft, setDraft] = useState({ title: '', form_url: '' });
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [openText, setOpenText] = useState<Record<string, true>>({});
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const rows = useMemo(() => (d ? d.rows.filter((r) => matches(r, filter, d.questions)) : []), [d, filter]);
  const results = useMemo(() => (d ? summarize(d.questions, rows) : []), [d, rows]);

  const pick = (id: string) => {
    setFilter(null);
    setOpenRow(null);
    go('surveys', id);
  };

  const copy = async (text: string, done: string) => {
    try {
      await Clipboard.setStringAsync(text);
      toast(done);
    } catch {
      toast('Couldn’t copy. Your browser blocked the clipboard.');
    }
  };

  const startEdit = (mode: 'new' | 'edit') => {
    setDraft(mode === 'edit' && current ? { title: current.title, form_url: current.form_url ?? '' } : { title: '', form_url: '' });
    setSaveErr(null);
    setEditing(mode);
  };

  const save = async () => {
    if (!draft.title.trim()) return setSaveErr('Give the survey a name.');
    setSaveBusy(true);
    setSaveErr(null);
    try {
      const id = await saveSurvey(editing === 'edit' && current ? current.id : null, { title: draft.title.trim(), form_url: draft.form_url.trim() || null });
      setEditing(null);
      list.refetch();
      detail.refetch();
      if (editing === 'new') {
        setShowSetup(true);
        pick(id);
        toast('Survey added. Connect its form below.');
      } else toast('Saved');
    } catch {
      setSaveErr('Couldn’t save. Check your connection and try again.');
    } finally {
      setSaveBusy(false);
    }
  };

  const remove = async () => {
    if (!current) return;
    setBusy('survey');
    try {
      await deleteSurvey(current.id);
      toast(`“${current.title}” deleted`);
      setEditing(null);
      go('surveys');
      list.refetch();
    } catch {
      toast('Couldn’t delete. Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  };

  const hide = async (r: SurveyRow) => {
    setBusy(r.id);
    try {
      await hideSurveyResponse(r.id);
      toast('Answer removed');
      setOpenRow(null);
      detail.refetch();
      list.refetch();
    } catch {
      toast('Couldn’t remove it. Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  };

  // ── Header ──
  const total = d?.rows.length ?? current?.responses ?? 0;
  const week = d ? d.rows.filter((r) => d.at - new Date(r.submitted_at).getTime() < 7 * 86_400_000).length : null;
  const emails = d ? d.rows.filter((r) => r.email).length : null;
  const connected = !!d?.last_intake_at;
  const note = !list.data
    ? null
    : !current
      ? 'No surveys yet. Add one, connect its Google Form, and answers show up here on their own.'
      : !connected
        ? 'Not connected yet. Follow the three steps below and answers will arrive on their own.'
        : `${total} ${total === 1 ? 'person has' : 'people have'} answered. Tap any answer to see only the people who gave it.`;

  const actions = [
    ...(d && d.rows.length
      ? [{ label: 'Copy results', kind: 'quiet' as const, onPress: () => void copy(resultsBrief(d.title, results, rows.length, filter), 'Results copied. Paste them into Claude or a doc.') }]
      : []),
    { label: 'New survey', kind: current ? ('quiet' as const) : ('primary' as const), onPress: () => startEdit('new') },
  ];

  const setup = d ? (
    <View style={{ marginBottom: 44 }}>
      <SectionLabel
        label={connected ? 'Connected' : 'Connect the Google Form'}
        right={connected ? <LinkText label={showSetup ? 'Hide steps' : 'Show steps'} onPress={() => setShowSetup((v) => !v)} /> : null}
      />
      {connected && !showSetup ? (
        <Text style={{ marginTop: 14, fontSize: 14, color: c.ink2 }}>
          Answers arrive on their own. The last one arrived {when(d.last_intake_at, true)}.
        </Text>
      ) : (
        <View style={{ gap: 14, marginTop: 16, maxWidth: 760 }}>
          {[
            'Open the form in Google Forms. Click the ⋮ menu at the top right, then Apps Script.',
            'Click “Copy setup script” below, paste it over everything in Code.gs, and click Save.',
            'Pick “setup” in the function menu and click Run. Allow access when Google asks. Answers already in the form come over right away.',
          ].map((s, i) => (
            <View key={s} style={{ flexDirection: 'row', gap: 12 }}>
              <Text style={{ width: 18, fontSize: 14, fontWeight: '600', color: c.brz }}>{i + 1}</Text>
              <Text style={{ flex: 1, fontSize: 14, lineHeight: 21.7, color: c.ink }}>{s}</Text>
            </View>
          ))}
          <Row gap={10}>
            <Btn label="Copy setup script" kind={connected ? 'quiet' : 'primary'} onPress={() => void copy(surveyFormScript(d.intake_token), 'Script copied. Paste it into Apps Script.')} />
            {d.form_url ? <Btn label="Open the form" onPress={() => void Linking.openURL(d.form_url!)} /> : null}
          </Row>
          <Text style={{ fontSize: 12.5, lineHeight: 19, color: c.ink3 }}>
            The script carries this survey’s private key. Keep it inside the form; don’t post it anywhere.
          </Text>
        </View>
      )}
    </View>
  ) : null;

  return (
    <View>
      <PageHeader title="Surveys" purpose="What people say about workout apps, to aim the website and the ads." note={note} actions={actions} />

      {list.error ? <ErrorLine onRetry={list.refetch}>{list.error}</ErrorLine> : !list.data ? <Skeleton /> : null}

      {editing ? (
        <FormPanel
          title={editing === 'new' ? 'New survey' : 'Edit survey'}
          saveLabel={editing === 'new' ? 'Add survey' : 'Save'}
          onSave={() => void save()}
          onCancel={() => setEditing(null)}
          busy={saveBusy}
          error={saveErr}
        >
          <FieldGrid>
            <Field label="Name">
              <Input value={draft.title} onChangeText={(t) => setDraft((x) => ({ ...x, title: t }))} placeholder="What do you love (and hate) about workout apps?" />
            </Field>
            <Field label="Form link (optional)">
              <Input value={draft.form_url} onChangeText={(t) => setDraft((x) => ({ ...x, form_url: t }))} placeholder="https://forms.gle/…" autoCapitalize="none" />
            </Field>
          </FieldGrid>
          {editing === 'edit' ? (
            <Row gap={10}>
              <DeleteBtn armed={armed === 'survey'} busy={busy === 'survey'} label="Delete survey" onPress={() => tap('survey', () => void remove())} />
              <Text style={{ fontSize: 12.5, color: c.ink3 }}>Deletes its answers. Contacts it added stay.</Text>
            </Row>
          ) : null}
        </FormPanel>
      ) : null}

      {surveys.length > 1 ? (
        <Row gap={8} style={{ marginBottom: 28 }}>
          {surveys.map((s) => (
            <Chip key={s.id} label={s.title} count={s.responses} on={s.id === current?.id} onPress={() => pick(s.id)} />
          ))}
        </Row>
      ) : null}

      {current ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 14, rowGap: 6, marginBottom: 20 }}>
            <Text style={{ fontSize: 17, fontWeight: '600', color: c.ink, flexShrink: 1 }}>{current.title}</Text>
            <LinkText label="Edit" onPress={() => startEdit('edit')} />
          </View>

          <HeroFigures
            hero={{ label: 'Responses', value: String(total), note: week != null && total ? `${week} in the last 7 days` : undefined }}
            figures={[
              { label: 'Early-access emails', value: emails != null ? String(emails) : '—', note: emails ? 'In Contacts, tagged Survey' : undefined, onPress: emails ? () => go('contacts') : undefined },
              { label: 'Share who left an email', value: emails != null && total ? pct(emails / total) : '—' },
              { label: 'Last answer', value: current.last_response_at ? when(current.last_response_at) : '—' },
            ]}
          />

          {detail.error ? <ErrorLine onRetry={detail.refetch}>{detail.error}</ErrorLine> : !d ? <Skeleton /> : null}

          {setup}

          {d && d.rows.length ? (
            <>
              {filter ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 14, rowGap: 6, marginBottom: 28, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, backgroundColor: c.brzTint }}>
                  <Text style={{ fontSize: 14, lineHeight: 21, color: c.ink, flexShrink: 1 }}>
                    Showing {rows.length} of {d.rows.length}: people who answered <Text style={{ fontWeight: '600' }}>{filter.a}</Text> to “{filter.q}”
                  </Text>
                  <LinkText label="Show everyone" onPress={() => setFilter(null)} />
                </View>
              ) : null}

              <BlockGrid>
                {results.map((r) =>
                  r.kind === 'choice' ? (
                    <Block key={r.title} label={r.title} sub={`${r.answered} answered${r.multi ? ' · people could pick more than one' : ''}`} state={{ emptyMsg: r.answered ? null : 'Nobody in this group answered this one.' }}>
                      <ChoiceBars r={r} filter={filter} filtered={filter?.q === r.title} onPick={(a) => setFilter((f) => (f && f.q === r.title && f.a === a ? null : { q: r.title, a }))} />
                    </Block>
                  ) : (
                    <Block key={r.title} label={r.title} sub={`${r.answered} answered`} state={{ emptyMsg: r.answered ? null : 'No written answers yet.' }}>
                      <TextAnswers r={r} all={!!openText[r.title]} onAll={() => setOpenText((m) => ({ ...m, [r.title]: true }))} />
                    </Block>
                  ),
                )}
              </BlockGrid>

              <View style={{ marginTop: 56 }}>
                <SectionLabel label={`Every response${filter ? ' in this group' : ''}`} right={<Text style={{ fontSize: 13, color: c.ink3 }}>{rows.length}</Text>} />
                {rows.map((r) => {
                  const open = openRow === r.id;
                  const shown = r.answers.filter((x) => !isEmailQuestion(x.q));
                  return (
                    <View key={r.id}>
                      <HoverRow onPress={() => setOpenRow(open ? null : r.id)} selected={open} label={`Response from ${when(r.submitted_at, true)}`} style={{ paddingVertical: 13 }}>
                        <Text style={{ width: 150, fontSize: 13.5, color: c.ink3 }}>{when(r.submitted_at, true)}</Text>
                        <Text numberOfLines={1} style={{ flex: 1, minWidth: 0, fontSize: 14, color: c.ink2 }}>
                          {shown.slice(0, 3).map((x) => (Array.isArray(x.a) ? x.a.join(', ') : x.a)).filter(Boolean).join(' · ')}
                        </Text>
                        {r.email ? <Text style={{ fontSize: 12.5, color: c.ink3 }}>left an email</Text> : null}
                        <Text style={{ fontSize: 16, color: c.ink3 }}>{open ? '▴' : '▾'}</Text>
                      </HoverRow>
                      {open ? (
                        <View style={{ gap: 12, paddingVertical: 18, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: c.line }}>
                          {shown.map((x) => (
                            <View key={x.q} style={{ gap: 3 }}>
                              <Text style={{ fontSize: 12.5, color: c.ink3 }}>{x.q}</Text>
                              <Text selectable style={{ fontSize: 14.5, lineHeight: 21.7, color: c.ink }}>
                                {(Array.isArray(x.a) ? x.a.join(', ') : x.a) || '—'}
                              </Text>
                            </View>
                          ))}
                          <Row gap={10}>
                            <DeleteBtn armed={armed === r.id} busy={busy === r.id} label="Remove" confirmLabel="Confirm remove" onPress={() => tap(r.id, () => void hide(r))} />
                            <Text style={{ fontSize: 12.5, color: c.ink3 }}>For test answers and spam. It won’t come back if the form re-sends.</Text>
                          </Row>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>

              <FootNote>
                {`Answers come straight from the Google Form, so they match its Responses sheet${d.hidden ? `, minus ${d.hidden} you removed` : ''}. Percentages are of the people who answered that question; on pick-any questions they add up to more than 100%.`}
              </FootNote>
            </>
          ) : d && connected ? (
            <Text style={{ paddingVertical: 18, fontSize: 15, color: c.ink2 }}>Connected, but nobody has answered yet. Post the form and check back.</Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

function ChoiceBars({ r, filter, filtered, onPick }: { r: ChoiceResult; filter: SurveyFilter | null; filtered: boolean; onPick: (a: string) => void }) {
  const { c } = useCrm();
  const max = Math.max(1, ...r.options.map((o) => o.n));
  // On the question the filter is ON, "most picked" is the filter itself: say nothing.
  const top = filtered ? null : topLine(r);
  return (
    <View style={{ paddingTop: 10 }}>
      {top ? <Text style={{ marginBottom: 6, fontSize: 13, color: c.ink3 }}>{top}</Text> : null}
      {r.options.map((o) => {
        const on = filter?.q === r.title && filter.a === o.label;
        return (
          <Pressable
            key={o.label}
            onPress={o.n ? () => onPick(o.label) : undefined}
            accessibilityRole="button"
            accessibilityState={{ selected: on, disabled: !o.n }}
            accessibilityLabel={`${o.label}: ${o.n}, ${pct(o.share)}. ${on ? 'Showing only these people. Tap to show everyone.' : 'Tap to see only these people.'}`}
            style={({ hovered }: { pressed: boolean; hovered?: boolean }) => ({
              gap: 7,
              paddingVertical: 8,
              paddingHorizontal: 8,
              marginHorizontal: -8,
              borderRadius: 8,
              backgroundColor: on ? c.brzTint : hovered && o.n ? c.hover : 'transparent',
            })}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
              <Text style={{ fontSize: 14, color: o.n ? c.ink : c.ink3, flexShrink: 1, fontWeight: on ? '600' : '400' }}>{o.label}</Text>
              <Text style={{ fontSize: 13, color: c.ink3, fontVariant: ['tabular-nums'] }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: o.n ? c.ink : c.ink3 }}>{pct(o.share)}</Text> {o.n}
              </Text>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: c.track }}>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: c.brz, width: `${(o.n / max) * 100}%` }} />
            </View>
          </Pressable>
        );
      })}
      {r.other.length ? (
        <Text style={{ marginTop: 10, fontSize: 13, lineHeight: 20, color: c.ink2 }}>
          <Text style={{ color: c.ink3 }}>Written in: </Text>
          {writeIns(r.other)}
        </Text>
      ) : null}
    </View>
  );
}

function TextAnswers({ r, all, onAll }: { r: TextResult; all: boolean; onAll: () => void }) {
  const { c } = useCrm();
  const shown = all ? r.answers : r.answers.slice(0, TEXT_SHOWN);
  return (
    <View>
      {shown.map((a) => (
        <View key={a.id} style={{ gap: 4, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.line }}>
          <Text selectable style={{ fontSize: 14.5, lineHeight: 22, color: c.ink }}>
            “{a.text}”
          </Text>
          <Text style={{ fontSize: 12, color: c.ink3 }}>{when(a.at)}</Text>
        </View>
      ))}
      {!all && r.answers.length > TEXT_SHOWN ? (
        <View style={{ paddingTop: 12 }}>
          <LinkText label={`Show all ${r.answers.length}`} onPress={onAll} />
        </View>
      ) : null}
    </View>
  );
}
