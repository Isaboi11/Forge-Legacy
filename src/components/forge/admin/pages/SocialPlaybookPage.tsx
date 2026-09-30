import { useMemo, useState } from 'react';
import { Linking, Text, View } from 'react-native';

import { Block, BlockGrid, Btn, Chip, DeleteBtn, DISPLAY_M, ErrorLine, Field, FootNote, Full, HoverRow, Input, PageHeader, Panel, Row, Skeleton, useToast, useTwoTap, when } from '@/components/forge/admin/crm-ui';
import { useCrm } from '@/components/forge/admin/crm-theme';
import { Select } from '@/components/forge/admin/Select';
import type { PageProps } from '@/components/forge/admin/pages/types';
import { Pill, StackField, useSocial, verdictLabel, verdictTone } from '@/components/forge/admin/social-ui';
import { documentLink, fetchDocuments, type Doc } from '@/data/crm-live';
import { deleteItem, deleteTag, questionToVideo, saveItem, saveTag, type ItemKind } from '@/data/social-live';
import { bytes } from '@/domain/admin/crm-core';
import { MEASURES, PLATFORMS, lessons, measureText, platformLabel, working, type Platform, type TagKind, type WorkingDim, type WorkingMeasure } from '@/domain/admin/social-core';
import { useQuery } from '@/lib/useQuery';

/**
 * Social → Playbook (migration 0247, AA-D30/D31): what the numbers say is working, and what the owner has
 * decided to do about it.
 *
 * "What is working" and the experiment log are COMPUTED from the videos — their tags, their numbers and
 * the lesson written on each. Rules, questions and competitor notes are typed by hand. Assets are the
 * Marketing shelf of Documents, shown here rather than copied.
 */

const DIMS: { key: WorkingDim; label: string }[] = [
  { key: 'topic', label: 'By topic' },
  { key: 'hook', label: 'By hook' },
  { key: 'format', label: 'By format' },
  { key: 'length', label: 'By length' },
];

const TAG_KINDS: { key: TagKind; label: string }[] = [
  { key: 'topic', label: 'Topics' },
  { key: 'hook', label: 'Hooks' },
  { key: 'format', label: 'Formats' },
];

type Form = { kind: 'rule'; body: string } | { kind: 'question'; question: string; platform: Platform | '' } | { kind: 'rival'; who: string; what: string; why: string; url: string };

const docKind = (d: Doc): string => {
  if (d.url && !d.storage_path) return 'Link';
  const ext = d.storage_path?.match(/\.([a-z0-9]{1,5})$/i)?.[1];
  return ext ? ext.toUpperCase().slice(0, 4) : 'File';
};

export function SocialPlaybookPage({ go }: PageProps) {
  const { c } = useCrm();
  const toast = useToast();
  const { armed, tap } = useTwoTap();
  const social = useSocial();
  const docs = useQuery(() => fetchDocuments('marketing', null), []);
  const [dim, setDim] = useState<WorkingDim>('topic');
  const [measure, setMeasure] = useState<WorkingMeasure>('shares');
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [tagDraft, setTagDraft] = useState<Record<TagKind, string>>({ topic: '', hook: '', format: '' });
  const [rename, setRename] = useState<{ kind: TagKind; old: string; label: string } | null>(null);

  const d = social.data;
  const rows = useMemo(() => (d ? working(d, dim, measure) : []), [d, dim, measure]);
  const log = useMemo(() => (d ? lessons(d) : []), [d]);

  const act = async (key: string, fn: () => Promise<unknown>, done?: string) => {
    setBusy(key);
    try {
      await fn();
      if (done) toast(done);
      social.refetch();
      return true;
    } catch {
      toast('Couldn’t save. Check your connection and try again.');
      return false;
    } finally {
      setBusy(null);
    }
  };

  const saveForm = async () => {
    if (!form) return;
    let kind: ItemKind;
    let patch: Record<string, unknown>;
    if (form.kind === 'rule') {
      if (!form.body.trim()) return toast('Write the rule first.');
      kind = 'rule';
      patch = { body: form.body.trim() };
    } else if (form.kind === 'question') {
      if (!form.question.trim()) return toast('Type the question first.');
      kind = 'question';
      patch = { question: form.question.trim(), platform: form.platform };
    } else {
      if (!form.who.trim() || !form.what.trim()) return toast('Say who it was and what they did.');
      kind = 'rival';
      patch = { who: form.who.trim(), what: form.what.trim(), why: form.why.trim(), url: form.url.trim() };
    }
    if (await act('form', () => saveItem(kind, null, patch), 'Added')) setForm(null);
  };

  const openDoc = async (doc: Doc) => {
    try {
      await Linking.openURL(await documentLink(doc));
    } catch {
      toast('Couldn’t open the file.');
    }
  };

  const header = (
    <PageHeader
      title="Playbook"
      purpose="What is working on social, and what has been decided."
      note="What the numbers say is working, and what you have decided to do about it."
      actions={[{ label: 'Add a rule', onPress: () => setForm({ kind: 'rule', body: '' }) }]}
    />
  );

  if (social.error && !d) {
    return (
      <View>
        {header}
        <ErrorLine onRetry={social.refetch}>{`Couldn’t load Social. ${social.error}`}</ErrorLine>
      </View>
    );
  }
  if (!d) {
    return (
      <View>
        {header}
        <Skeleton />
      </View>
    );
  }

  const formPanel = form ? (
    <Panel pad={20} gap={14} style={{ marginBottom: 32 }}>
      {form.kind === 'rule' ? (
        <StackField label="The rule, in your own words">
          <Input value={form.body} onChangeText={(t) => setForm({ ...form, body: t })} placeholder="Open on the result. Explain after." autoFocus />
        </StackField>
      ) : form.kind === 'question' ? (
        <Row gap={24} wrap={false} style={{ alignItems: 'flex-end' }}>
          <View style={{ flex: 2, minWidth: 0 }}>
            <StackField label="What people keep asking">
              <Input value={form.question} onChangeText={(t) => setForm({ ...form, question: t })} placeholder="Is it free?" autoFocus />
            </StackField>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <StackField label="Mostly on">
              <Select
                value={form.platform}
                options={[{ value: '', label: 'Either' }, ...PLATFORMS.map((p) => ({ value: p.key, label: p.label }))]}
                onChange={(v) => setForm({ ...form, platform: v as Platform | '' })}
                accessibilityLabel="Platform"
              />
            </StackField>
          </View>
        </Row>
      ) : (
        <>
          <Row gap={24} wrap={false}>
            <Field label="Who">
              <Input value={form.who} onChangeText={(t) => setForm({ ...form, who: t })} placeholder="Hevy" autoFocus />
            </Field>
            <Field label="What they did">
              <Input value={form.what} onChangeText={(t) => setForm({ ...form, what: t })} placeholder="A recap card people repost" />
            </Field>
          </Row>
          <StackField label="Why it worked">
            <Input value={form.why} onChangeText={(t) => setForm({ ...form, why: t })} placeholder="The viewer’s own numbers are the content." />
          </StackField>
          <StackField label="Link (optional)">
            <Input value={form.url} onChangeText={(t) => setForm({ ...form, url: t })} placeholder="https://…" autoCapitalize="none" />
          </StackField>
        </>
      )}
      <Row gap={10}>
        <Btn label={form.kind === 'rule' ? 'Add rule' : form.kind === 'question' ? 'Add question' : 'Add note'} kind="primary" busy={busy === 'form'} onPress={() => void saveForm()} />
        <Btn label="Cancel" onPress={() => setForm(null)} />
      </Row>
    </Panel>
  ) : null;

  const marketing = docs.data?.rows ?? [];

  return (
    <View>
      {header}
      {formPanel}

      <BlockGrid>
        <Full full>
          <Block
            label="What is working"
            state={{ emptyMsg: rows.length ? null : 'Nothing to rank yet. Once videos are posted and tagged, this shows which topics, hooks, formats and lengths do best.' }}
            foot={`Every posted video, all time. The count on the right is how many videos stand behind each line. ${measure === 'watched' ? 'Watched uses Instagram’s own figure and the TikTok figures you typed.' : 'This measure comes in from both platforms.'}`}
          >
            <View style={{ gap: 10, marginTop: 14 }}>
              <Row gap={6}>
                {DIMS.map((x) => (
                  <Chip key={x.key} size="sm" label={x.label} on={dim === x.key} onPress={() => setDim(x.key)} />
                ))}
              </Row>
              <Row gap={6}>
                <Text style={{ fontSize: 13, color: c.ink3, marginRight: 4 }}>Measured by</Text>
                {MEASURES.map((m) => (
                  <Chip key={m.key} size="sm" label={m.label} on={measure === m.key} onPress={() => setMeasure(m.key)} />
                ))}
              </Row>
            </View>
            <View style={{ gap: 16, paddingTop: 18 }}>
              {rows.map((r) => (
                <View key={r.label} style={{ gap: 7 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                    <Text numberOfLines={1} style={{ fontSize: 14, color: c.ink, flexShrink: 1 }}>
                      {r.label}
                    </Text>
                    <Text style={{ fontSize: 13, color: c.ink3, fontVariant: ['tabular-nums'] }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: r.value == null ? c.ink3 : c.ink }}>{measureText(measure, r.value)}</Text>
                      {` · ${r.videos} ${r.videos === 1 ? 'video' : 'videos'}`}
                    </Text>
                  </View>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: c.track }}>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: c.brz, width: `${r.width}%` }} />
                  </View>
                </View>
              ))}
            </View>
          </Block>
        </Full>

        <Block label="Experiments" state={{ emptyMsg: log.length ? null : 'No lessons yet. Open a posted video in Content, write what you tried and what happened, and pick Keep, Retest or Kill.' }}>
          {log.map(({ video, day }) => (
            <HoverRow key={video.id} onPress={() => go('content', video.id)} label={video.title} style={{ paddingVertical: 15, alignItems: 'flex-start' }}>
              <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: c.ink }}>{video.lesson_tried || video.title}</Text>
                {video.lesson_result ? <Text style={{ fontSize: 14, lineHeight: 21.7, color: c.ink2 }}>{video.lesson_result}</Text> : null}
                <Text style={{ fontSize: 12.5, color: c.ink3 }}>
                  {video.title}
                  {day ? ` · ${when(day)}` : ''}
                </Text>
              </View>
              {video.verdict ? <Pill label={verdictLabel[video.verdict]} tone={verdictTone[video.verdict]} /> : null}
            </HoverRow>
          ))}
        </Block>

        <Block
          label="Rules"
          state={{ emptyMsg: d.rules.length ? null : 'No rules yet. Write one when a lesson has held up more than once.' }}
          foot="Your own words. Written when a lesson has held up more than once."
        >
          {d.rules.map((r) => (
            <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.line }}>
              <Text style={{ flex: 1, minWidth: 0, fontFamily: DISPLAY_M, fontSize: 18, lineHeight: 26, color: c.ink }}>{r.body}</Text>
              <DeleteBtn armed={armed === r.id} busy={busy === r.id} label="Remove" confirmLabel="Confirm" size="xs" onPress={() => tap(r.id, () => void act(r.id, () => deleteItem('rule', r.id)))} />
            </View>
          ))}
        </Block>

        <Block
          label="What people keep asking"
          link={form?.kind === 'question' ? null : 'Add a question'}
          onLink={() => setForm({ kind: 'question', question: '', platform: '' })}
          state={{ emptyMsg: d.questions.length ? null : 'Nothing written down yet. When the same question shows up in comments or messages, add it here.' }}
          foot="Typed by hand from comments and messages. Nothing is read automatically."
        >
          {d.questions.map((q) => (
            <View key={q.id} style={{ paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: c.line, gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: c.ink, flexShrink: 1 }}>“{q.question}”</Text>
                <Text style={{ fontSize: 13, color: c.ink3, fontVariant: ['tabular-nums'] }}>
                  asked {q.times} {q.times === 1 ? 'time' : 'times'}
                </Text>
              </View>
              <Row gap={14}>
                {q.platform ? <Text style={{ fontSize: 12.5, color: c.ink3 }}>Mostly on {platformLabel(q.platform)}</Text> : null}
                <Text
                  onPress={() => void act(`n-${q.id}`, () => saveItem('question', q.id, { times: q.times + 1 }))}
                  accessibilityRole="button"
                  style={{ fontSize: 12.5, fontWeight: '600', color: c.ink, borderBottomWidth: 1, borderBottomColor: c.fieldBd }}
                >
                  Asked again
                </Text>
                {q.video_id ? (
                  <Text onPress={() => go('content', q.video_id!)} accessibilityRole="link" style={{ fontSize: 12.5, fontWeight: '600', color: c.good }}>
                    In Ideas ›
                  </Text>
                ) : (
                  <Text
                    onPress={() =>
                      void (async () => {
                        setBusy(`v-${q.id}`);
                        try {
                          await questionToVideo(q.id);
                          toast('Added to Ideas');
                          social.refetch();
                        } catch {
                          toast('Couldn’t add it. Check your connection and try again.');
                        } finally {
                          setBusy(null);
                        }
                      })()
                    }
                    accessibilityRole="button"
                    style={{ fontSize: 12.5, fontWeight: '600', color: c.ink, borderBottomWidth: 1, borderBottomColor: c.fieldBd }}
                  >
                    {busy === `v-${q.id}` ? 'Adding…' : 'Make it a video'}
                  </Text>
                )}
                <DeleteBtn armed={armed === q.id} busy={busy === q.id} label="Remove" confirmLabel="Confirm" size="xs" onPress={() => tap(q.id, () => void act(q.id, () => deleteItem('question', q.id)))} />
              </Row>
            </View>
          ))}
        </Block>

        <Block
          label="Worth studying"
          link={form?.kind === 'rival' ? null : 'Add a note'}
          onLink={() => setForm({ kind: 'rival', who: '', what: '', why: '', url: '' })}
          state={{ emptyMsg: d.rivals.length ? null : 'No notes yet. When another account does something that works, write down who, what and why.' }}
        >
          {d.rivals.map((r) => (
            <View key={r.id} style={{ paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: c.line, gap: 5 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: c.ink }}>
                {r.who}: {r.what}
              </Text>
              {r.why ? <Text style={{ fontSize: 14, lineHeight: 21.7, color: c.ink2 }}>{r.why}</Text> : null}
              <Row gap={14}>
                <Text style={{ fontSize: 12.5, color: c.ink3 }}>Noted {when(r.noted_on)}</Text>
                {r.url ? (
                  <Text onPress={() => void Linking.openURL(r.url!)} accessibilityRole="link" style={{ fontSize: 12.5, fontWeight: '600', color: c.ink, borderBottomWidth: 1, borderBottomColor: c.fieldBd }}>
                    Open
                  </Text>
                ) : null}
                <DeleteBtn armed={armed === r.id} busy={busy === r.id} label="Remove" confirmLabel="Confirm" size="xs" onPress={() => tap(r.id, () => void act(r.id, () => deleteItem('rival', r.id)))} />
              </Row>
            </View>
          ))}
        </Block>

        <Full full>
          <Block
            label="Assets"
            link="Open Documents"
            onLink={() => go('documents')}
            state={{
              loading: docs.loading && !docs.data,
              error: docs.error,
              onRetry: docs.refetch,
              emptyMsg: docs.data && !marketing.length ? 'Nothing on the Marketing shelf yet. Add screen recordings, caption templates and brand files in Documents and they show here.' : null,
            }}
            foot="This is the Marketing shelf of Documents. Same files, shown here so they sit beside the work."
          >
            {marketing.map((doc) => (
              <HoverRow key={doc.id} onPress={() => void openDoc(doc)} label={doc.title} style={{ paddingVertical: 13 }}>
                <View style={{ minWidth: 44, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, borderWidth: 1, borderColor: c.fieldBd, alignItems: 'center' }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: 0.4, color: c.ink2 }}>{docKind(doc)}</Text>
                </View>
                <Text numberOfLines={1} style={{ flex: 1, minWidth: 0, fontSize: 14, color: c.ink }}>
                  {doc.title}
                </Text>
                <Text style={{ fontSize: 13, color: c.ink3, fontVariant: ['tabular-nums'] }}>{doc.size_bytes != null ? bytes(doc.size_bytes) : 'Link'}</Text>
              </HoverRow>
            ))}
          </Block>
        </Full>

        <Full full>
          <Block label="Your tags" sub="The lists every video picks from. Renaming one renames it on every video that wears it.">
            {rename ? (
              <Panel pad={18} gap={12} style={{ marginTop: 14 }}>
                <StackField label={`Rename “${rename.old}”`}>
                  <Input value={rename.label} onChangeText={(t) => setRename({ ...rename, label: t })} autoFocus />
                </StackField>
                <Row gap={10}>
                  <Btn
                    label="Rename"
                    kind="primary"
                    size="sm"
                    busy={busy === 'rename'}
                    onPress={() => {
                      if (!rename.label.trim()) return toast('Type the new name.');
                      void act('rename', () => saveTag(rename.kind, rename.old, rename.label.trim()), 'Renamed').then((ok) => (ok ? setRename(null) : undefined));
                    }}
                  />
                  <Btn label="Cancel" size="sm" onPress={() => setRename(null)} />
                </Row>
              </Panel>
            ) : null}
            {TAG_KINDS.map((k) => {
              const labels = d.tags.filter((t) => t.kind === k.key);
              return (
                <View key={k.key} style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: c.line, gap: 10 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: c.ink }}>{k.label}</Text>
                  <Row gap={8}>
                    {labels.map((t) => (
                      <View key={t.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 30, paddingLeft: 12, paddingRight: 6, borderRadius: 15, borderWidth: 1, borderColor: c.line }}>
                        <Text onPress={() => setRename({ kind: k.key, old: t.label, label: t.label })} accessibilityRole="button" accessibilityLabel={`Rename ${t.label}`} style={{ fontSize: 13, color: c.ink2 }}>
                          {t.label}
                        </Text>
                        <Text
                          onPress={() => tap(`tag-${k.key}-${t.label}`, () => void act(`tag-${t.label}`, () => deleteTag(k.key, t.label)))}
                          accessibilityRole="button"
                          accessibilityLabel={armed === `tag-${k.key}-${t.label}` ? `Confirm removing ${t.label}` : `Remove ${t.label}`}
                          style={{ fontSize: armed === `tag-${k.key}-${t.label}` ? 12 : 15, fontWeight: '600', paddingHorizontal: 6, color: armed === `tag-${k.key}-${t.label}` ? c.crit : c.ink3 }}
                        >
                          {armed === `tag-${k.key}-${t.label}` ? 'Remove?' : '×'}
                        </Text>
                      </View>
                    ))}
                    <Input
                      value={tagDraft[k.key]}
                      onChangeText={(t) => setTagDraft((m) => ({ ...m, [k.key]: t }))}
                      onSubmitEditing={() => {
                        const v = tagDraft[k.key].trim();
                        if (v) void act(`add-${k.key}`, () => saveTag(k.key, null, v)).then((ok) => (ok ? setTagDraft((m) => ({ ...m, [k.key]: '' })) : undefined));
                      }}
                      placeholder="Add one, press Enter"
                      accessibilityLabel={`Add to ${k.label}`}
                      style={{ width: 190, height: 30, fontSize: 13, borderRadius: 15 }}
                    />
                  </Row>
                </View>
              );
            })}
          </Block>
        </Full>
      </BlockGrid>

      <FootNote>Removing a tag takes it off the list; videos already wearing it keep it. Competitor notes and questions are typed by hand. Nothing on this page is scraped.</FootNote>
    </View>
  );
}
