import { useState } from 'react';
import { Linking, Text, View } from 'react-native';

import { Btn, DeleteBtn, Field, Input, Opt, Row, useTwoTap, when } from '@/components/forge/admin/crm-ui';
import { useCrm } from '@/components/forge/admin/crm-theme';
import { DateInput } from '@/components/forge/admin/DateInput';
import { BigBtn, FieldLabel, PInput } from '@/components/forge/admin/phone/kit';
import { PSelect } from '@/components/forge/admin/phone/PSelect';
import { Select } from '@/components/forge/admin/Select';
import { MiniFig, StackField } from '@/components/forge/admin/social-ui';
import { attachPosting, deletePosting, deleteVideo, savePosting, saveVideo, unlinkPosting, type PostingPatch, type VideoPatch } from '@/data/social-live';
import {
  PLATFORMS,
  STAGES,
  ago,
  intOrDash,
  isPosted,
  nextStage,
  platformLabel,
  postingSource,
  tagLine,
  watched,
  type Platform,
  type SocialData,
  type SocialPosting,
  type SocialVideo,
  type Stage,
  type TagKind,
  type Verdict,
} from '@/domain/admin/social-core';

/**
 * One video, idea to result (AA-D23): its stage, tags, script, where it goes and what it did, and — once
 * it has run — the lesson. The same editor serves the desktop panel and the phone page (`phone`), which
 * differ only in field size (16 px on the phone, so iOS Safari never zooms).
 *
 * ══ IT SAVES AS YOU GO ══
 *
 * A choice (stage, tag, verdict, date) saves when it is made; a text field saves when you leave it. There
 * is no Save button to forget, and the one bronze button is free to mean "move it to the next stage".
 *
 * Mount it with `key={video.id}` so the drafts start fresh for each video.
 */

const CHOOSE = 'Choose';

export function SocialVideoEditor({
  video,
  data,
  at,
  phone,
  onChanged,
  onOpen,
  toast,
}: {
  video: SocialVideo;
  data: SocialData;
  /** When `data` was read — "synced 3 hours ago" is judged against this. */
  at: number;
  phone?: boolean;
  onChanged: () => void;
  /** Open another video (after an unlink or an attach moves the posting). */
  onOpen: (id: string | null) => void;
  toast: (msg: string) => void;
}) {
  const { c } = useCrm();
  const { armed, tap } = useTwoTap();
  const [draft, setDraft] = useState({
    title: video.title,
    first_line: video.first_line ?? '',
    notes: video.notes ?? '',
    length_s: video.length_s != null ? String(video.length_s) : '',
    lesson_tried: video.lesson_tried ?? '',
    lesson_result: video.lesson_result ?? '',
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [numbers, setNumbers] = useState<{ id: string; views: string; likes: string; comments: string; shares: string; saves: string } | null>(null);
  const [watchDraft, setWatchDraft] = useState<Record<string, string>>({});
  const [attachTo, setAttachTo] = useState('');

  const postings = data.postings.filter((p) => p.video_id === video.id);
  const TextIn = phone ? PInput : Input;
  const label = { fontSize: 11, fontWeight: '600' as const, letterSpacing: 1.6, textTransform: 'uppercase' as const, color: c.ink3 };

  const run = async (key: string, fn: () => Promise<unknown>, done?: string) => {
    setBusy(key);
    try {
      await fn();
      if (done) toast(done);
      onChanged();
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      toast(/not authorized/i.test(msg) ? 'Not authorized.' : 'Couldn’t save. Check your connection and try again.');
      return false;
    } finally {
      setBusy(null);
    }
  };

  const patch = (p: VideoPatch, done?: string) => run('video', () => saveVideo(video.id, p), done);

  const commitText = (k: 'title' | 'first_line' | 'notes' | 'lesson_tried' | 'lesson_result') => {
    const next = draft[k].trim();
    if (next === (video[k] ?? '')) return;
    if (k === 'title' && !next) return setDraft((d) => ({ ...d, title: video.title }));
    void patch({ [k]: next } as VideoPatch);
  };

  const commitLength = () => {
    const n = draft.length_s.trim() === '' ? null : Math.round(Number(draft.length_s));
    if (n != null && (!Number.isFinite(n) || n < 1)) return setDraft((d) => ({ ...d, length_s: video.length_s != null ? String(video.length_s) : '' }));
    if (n === video.length_s) return;
    void patch({ length_s: n });
  };

  /** A stage change, with the two that mean something on a posting: scheduled needs a date, posted stamps the day. */
  const moveTo = async (stage: Stage) => {
    if (stage === video.stage) return;
    if (stage === 'scheduled' && !postings.some((p) => p.scheduled_for || p.posted_at)) {
      return toast('Give it a date on at least one platform first.');
    }
    if (stage === 'posted') {
      if (!postings.length) return toast('Add the platform it went up on first.');
      const ok = await run('stage', async () => {
        for (const p of postings) {
          if (p.posted_at) continue;
          // Noon on the planned day (or now): until the sync matches the real post, this is the day it counts on.
          const at = p.scheduled_for ? new Date(`${p.scheduled_for}T12:00:00`).toISOString() : new Date().toISOString();
          await savePosting(p.id, { posted_at: at });
        }
        await saveVideo(video.id, { stage });
      });
      if (ok) toast('Moved to Posted. Its numbers attach here when they come in.');
      return;
    }
    void patch({ stage }, `Moved to ${STAGES.find((s) => s.key === stage)?.one ?? stage}.`);
  };

  const tagOptions = (kind: TagKind, current: string | null) => {
    const labels = data.tags.filter((t) => t.kind === kind).map((t) => t.label);
    if (current && !labels.includes(current)) labels.push(current);
    return labels;
  };

  const pick = (kind: TagKind, current: string | null, title: string) => {
    const labels = tagOptions(kind, current);
    const onChange = (v: string) => void patch({ [kind]: v === CHOOSE || v === '' ? null : v } as VideoPatch);
    const control = phone ? (
      <PSelect value={current ?? CHOOSE} options={current ? labels : [CHOOSE, ...labels]} onChange={onChange} accessibilityLabel={title} />
    ) : (
      <Select value={current ?? ''} options={[...(current ? [] : [{ value: '', label: CHOOSE }]), ...labels.map((l) => ({ value: l, label: l }))]} onChange={onChange} accessibilityLabel={title} />
    );
    return phone ? <FieldLabel label={title}>{control}</FieldLabel> : <Field label={title}>{control}</Field>;
  };

  /** `inRow` = it shares a row with another field (desktop), so it takes `Field`'s equal share of the width. */
  const field = (title: string, node: React.ReactNode, inRow = false) =>
    phone ? <FieldLabel label={title}>{node}</FieldLabel> : inRow ? <Field label={title}>{node}</Field> : <StackField label={title}>{node}</StackField>;

  const setPlanned = (p: Platform, on: boolean) => {
    const next = on ? [...video.planned.filter((x) => x !== p), p] : video.planned.filter((x) => x !== p);
    void patch({ planned: next });
  };

  const saveNumbers = async () => {
    if (!numbers) return;
    const n = (s: string) => (s.trim() === '' ? null : Math.max(0, Math.round(Number(s.replace(/,/g, '')) || 0)));
    const ok = await run(`num-${numbers.id}`, () => savePosting(numbers.id, { views: n(numbers.views), likes: n(numbers.likes), comments: n(numbers.comments), shares: n(numbers.shares), saves: n(numbers.saves) } as PostingPatch));
    if (ok) setNumbers(null);
  };

  const saveWatched = async (p: SocialPosting) => {
    const raw = (watchDraft[p.id] ?? '').replace('%', '').trim();
    const v = raw === '' ? null : Number(raw);
    if (v != null && (!Number.isFinite(v) || v < 0 || v > 100)) return toast('Watched is a percentage from 0 to 100.');
    const ok = await run(`w-${p.id}`, () => savePosting(p.id, { watch_pct_typed: v }));
    if (ok) setWatchDraft((m) => ({ ...m, [p.id]: '' }));
  };

  const candidates = data.videos.filter((v) => v.id !== video.id && v.stage !== 'posted' && v.stage !== 'dropped');
  const importedPosting = video.imported_from ? postings.find((p) => p.linked) : undefined;
  const next = nextStage(video.stage);

  const remove = () => {
    setBusy('delete');
    deleteVideo(video.id)
      .then(() => {
        toast(`“${video.title}” deleted`);
        onChanged();
        onOpen(null);
      })
      .catch(() => toast('Couldn’t delete. Check your connection and try again.'))
      .finally(() => setBusy(null));
  };

  return (
    <View style={{ gap: 18 }}>
      {video.imported_from && !video.topic ? (
        <View style={{ paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, backgroundColor: c.warnTint, gap: 10 }}>
          <Text style={{ fontSize: 14, lineHeight: 21.7, color: c.ink }}>This went up without a plan, so it came in from {platformLabel(video.imported_from)} on its own. Give it tags and it counts in the Playbook.</Text>
          {importedPosting && candidates.length ? (
            <Row gap={10}>
              <Text style={{ fontSize: 13, color: c.ink2 }}>Or it is one you planned:</Text>
              {phone ? (
                <PSelect
                  value={candidates.find((v) => v.id === attachTo)?.title ?? CHOOSE}
                  options={[CHOOSE, ...candidates.map((v) => v.title)]}
                  onChange={(t) => setAttachTo(candidates.find((v) => v.title === t)?.id ?? '')}
                  accessibilityLabel="Planned video"
                />
              ) : (
                <Select compact value={attachTo} options={[{ value: '', label: CHOOSE }, ...candidates.map((v) => ({ value: v.id, label: v.title }))]} onChange={setAttachTo} accessibilityLabel="Planned video" />
              )}
              {attachTo ? (
                <Btn
                  label="Move it there"
                  size="sm"
                  busy={busy === 'attach'}
                  onPress={() =>
                    void run('attach', () => attachPosting(importedPosting.id, attachTo), 'Moved. The plan now has its real numbers.').then((ok) => {
                      if (ok) onOpen(attachTo);
                    })
                  }
                />
              ) : null}
            </Row>
          ) : null}
        </View>
      ) : null}

      {field('Title', <TextIn value={draft.title} onChangeText={(t) => setDraft((d) => ({ ...d, title: t }))} onBlur={() => commitText('title')} accessibilityLabel="Title" />)}

      <View style={{ gap: 8 }}>
        <Text style={label}>Stage</Text>
        <Row gap={6}>
          {STAGES.map((s) => (
            <Opt key={s.key} label={s.one} on={video.stage === s.key} onPress={() => void moveTo(s.key)} />
          ))}
        </Row>
      </View>

      <View style={{ flexDirection: phone ? 'column' : 'row', gap: phone ? 14 : 24 }}>
        {pick('topic', video.topic, 'Topic')}
        {pick('hook', video.hook, 'Hook')}
      </View>
      <View style={{ flexDirection: phone ? 'column' : 'row', gap: phone ? 14 : 24 }}>
        {pick('format', video.format, 'Format')}
        {field('Length, seconds', <TextIn value={draft.length_s} onChangeText={(t) => setDraft((d) => ({ ...d, length_s: t }))} onBlur={commitLength} keyboardType="number-pad" accessibilityLabel="Length in seconds" />, true)}
      </View>

      {field('First line', <TextIn value={draft.first_line} onChangeText={(t) => setDraft((d) => ({ ...d, first_line: t }))} onBlur={() => commitText('first_line')} placeholder="The sentence they hear first" />)}
      {field('Script notes', <TextIn multiline value={draft.notes} onChangeText={(t) => setDraft((d) => ({ ...d, notes: t }))} onBlur={() => commitText('notes')} placeholder="Shots, beats, what to cut" />)}

      {/* ── Where it goes ── */}
      <View>
        <Text style={[label, { marginBottom: 4 }]}>Where it goes</Text>
        {PLATFORMS.map((p) => {
          const post = postings.find((x) => x.platform === p.key);
          const planned = video.planned.includes(p.key);
          const account = data.accounts.find((a) => a.platform === p.key);

          if (!post && !planned) return null;

          if (!post) {
            return (
              <View key={p.key} style={{ paddingVertical: 14, borderTopWidth: 1, borderTopColor: c.line, gap: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: c.ink }}>{p.label}</Text>
                  <Text style={{ fontSize: 13, color: c.ink3 }}>No date yet</Text>
                </View>
                <Row gap={10}>
                  <View style={{ width: phone ? undefined : 180, flexGrow: phone ? 1 : 0 }}>
                    <DateInput value="" onChange={(v) => (v ? void run(`new-${p.key}`, () => savePosting(null, { video_id: video.id, platform: p.key, scheduled_for: v })) : undefined)} accessibilityLabel={`${p.label} date`} />
                  </View>
                  <Btn label="Remove" size="sm" onPress={() => setPlanned(p.key, false)} />
                </Row>
              </View>
            );
          }

          const up = isPosted(post);
          const w = watched(post, video);
          const src = postingSource(post);
          const canTypeWatched = up && post.avg_watch_s == null;
          return (
            <View key={p.key} style={{ paddingVertical: 14, borderTopWidth: 1, borderTopColor: c.line, gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: c.ink }}>{p.label}</Text>
                <Text style={{ fontSize: 13, color: c.ink3 }}>{up ? `Posted ${when(post.posted_day)}` : post.scheduled_for ? `Scheduled for ${when(post.scheduled_for)}` : 'No date yet'}</Text>
              </View>

              {!up ? (
                <Row gap={10}>
                  <View style={{ width: phone ? undefined : 180, flexGrow: phone ? 1 : 0 }}>
                    <DateInput value={post.scheduled_for ?? ''} onChange={(v) => void run(`date-${post.id}`, () => savePosting(post.id, { scheduled_for: v || null }))} accessibilityLabel={`${p.label} date`} />
                  </View>
                  <DeleteBtn
                    armed={armed === post.id}
                    busy={busy === `del-${post.id}`}
                    label="Remove"
                    confirmLabel="Confirm remove"
                    size="sm"
                    onPress={() => tap(post.id, () => void run(`del-${post.id}`, () => deletePosting(post.id)))}
                  />
                </Row>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 10 }}>
                    <MiniFig value={intOrDash(post.views)} label="views" />
                    <MiniFig value={w ? `${Math.round(w.pct)}%` : '—'} label={w?.typed ? 'watched, typed' : 'watched'} />
                    <MiniFig value={intOrDash(post.likes)} label="likes" />
                    <MiniFig value={intOrDash(post.comments)} label="comments" />
                    <MiniFig value={intOrDash(post.shares)} label="shares" />
                    <MiniFig value={intOrDash(post.saves)} label="saves" />
                  </View>
                  <Text style={{ fontSize: 12.5, lineHeight: 19, color: c.ink3 }}>
                    {src === 'synced'
                      ? `Synced ${ago(post.synced_at, at) ?? ''}.`
                      : account?.connected
                        ? 'Waiting for the next sync to find this post.'
                        : src === 'typed'
                          ? `Typed ${when(post.typed_at)}. ${p.label} is not connected.`
                          : `No numbers yet. ${p.label} is not connected, so they are typed by hand.`}
                    {p.key === 'tiktok' && src === 'synced' ? ' TikTok does not share watch time or saves.' : ''}
                    {post.avg_watch_s != null && !w ? ` People watched ${Number(post.avg_watch_s).toFixed(1)} seconds on average. Add the video’s length above to see that as a share.` : ''}
                  </Text>

                  {canTypeWatched ? (
                    <Row gap={10}>
                      <TextIn
                        value={watchDraft[post.id] ?? ''}
                        onChangeText={(t) => setWatchDraft((m) => ({ ...m, [post.id]: t }))}
                        placeholder={post.watch_pct_typed != null ? `${post.watch_pct_typed}` : 'Watched %'}
                        keyboardType="decimal-pad"
                        accessibilityLabel={`${p.label} average watched, percent`}
                        style={{ width: 130 }}
                      />
                      <Btn label={post.watch_pct_typed != null ? 'Change watched' : 'Save watched'} size="sm" busy={busy === `w-${post.id}`} onPress={() => void saveWatched(post)} />
                      <Text style={{ fontSize: 12.5, color: c.ink3, flexShrink: 1 }}>From the video’s analytics in the {p.label} app.</Text>
                    </Row>
                  ) : null}

                  {numbers?.id === post.id ? (
                    <View style={{ gap: 10 }}>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                        {(['views', 'likes', 'comments', 'shares', 'saves'] as const).map((k) => (
                          <View key={k} style={{ width: phone ? '47%' : 104, gap: 5 }}>
                            <Text style={{ fontSize: 12.5, color: c.ink2 }}>{k[0].toUpperCase() + k.slice(1)}</Text>
                            <TextIn value={numbers[k]} onChangeText={(t) => setNumbers((n) => (n ? { ...n, [k]: t } : n))} keyboardType="number-pad" accessibilityLabel={k} />
                          </View>
                        ))}
                      </View>
                      <Row gap={10}>
                        <Btn label="Save numbers" size="sm" kind="primary" busy={busy === `num-${post.id}`} onPress={() => void saveNumbers()} />
                        <Btn label="Cancel" size="sm" onPress={() => setNumbers(null)} />
                      </Row>
                    </View>
                  ) : (
                    <Row gap={16}>
                      {!post.linked ? (
                        <Text
                          onPress={() =>
                            setNumbers({
                              id: post.id,
                              views: post.views != null ? String(post.views) : '',
                              likes: post.likes != null ? String(post.likes) : '',
                              comments: post.comments != null ? String(post.comments) : '',
                              shares: post.shares != null ? String(post.shares) : '',
                              saves: post.saves != null ? String(post.saves) : '',
                            })
                          }
                          accessibilityRole="button"
                          style={{ fontSize: 13, fontWeight: '600', color: c.ink, borderBottomWidth: 1, borderBottomColor: c.fieldBd }}
                        >
                          Type the numbers
                        </Text>
                      ) : null}
                      {post.url ? (
                        <Text onPress={() => void Linking.openURL(post.url!)} accessibilityRole="link" style={{ fontSize: 13, fontWeight: '600', color: c.ink, borderBottomWidth: 1, borderBottomColor: c.fieldBd }}>
                          Open the post
                        </Text>
                      ) : null}
                      {post.linked && !video.imported_from ? (
                        <DeleteBtn
                          armed={armed === `un-${post.id}`}
                          busy={busy === `un-${post.id}`}
                          label="Not this video"
                          confirmLabel="Confirm: split it off"
                          size="xs"
                          onPress={() =>
                            tap(`un-${post.id}`, () => {
                              setBusy(`un-${post.id}`);
                              unlinkPosting(post.id)
                                .then((id) => {
                                  toast('Split off. It is its own video now, and this plan has its slot back.');
                                  onChanged();
                                  onOpen(id);
                                })
                                .catch(() => toast('Couldn’t split it off. Check your connection and try again.'))
                                .finally(() => setBusy(null));
                            })
                          }
                        />
                      ) : null}
                      {!post.linked ? (
                        <DeleteBtn
                          armed={armed === post.id}
                          busy={busy === `del-${post.id}`}
                          label="Remove"
                          confirmLabel="Confirm remove"
                          size="xs"
                          onPress={() => tap(post.id, () => void run(`del-${post.id}`, () => deletePosting(post.id)))}
                        />
                      ) : null}
                    </Row>
                  )}
                </>
              )}
            </View>
          );
        })}
        <Row gap={8} style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: c.line }}>
          {PLATFORMS.filter((p) => !postings.some((x) => x.platform === p.key) && !video.planned.includes(p.key)).map((p) => (
            <Btn key={p.key} label={`Add ${p.label}`} size="sm" onPress={() => setPlanned(p.key, true)} />
          ))}
          {!postings.length && !video.planned.length ? <Text style={{ fontSize: 13, color: c.ink3 }}>No platform chosen yet.</Text> : null}
        </Row>
      </View>

      {/* ── Lesson ── */}
      {video.stage === 'posted' ? (
        <View style={{ gap: 12 }}>
          <Text style={label}>Lesson</Text>
          {field('What I tried', <TextIn value={draft.lesson_tried} onChangeText={(t) => setDraft((d) => ({ ...d, lesson_tried: t }))} onBlur={() => commitText('lesson_tried')} placeholder="One sentence" />)}
          {field('What happened', <TextIn value={draft.lesson_result} onChangeText={(t) => setDraft((d) => ({ ...d, lesson_result: t }))} onBlur={() => commitText('lesson_result')} placeholder="One sentence" />)}
          <Row gap={6}>
            {(
              [
                ['keep', 'Keep', c.good],
                ['retest', 'Retest', c.warn],
                ['kill', 'Kill', c.crit],
              ] as [Verdict, string, string][]
            ).map(([k, l, color]) => (
              <Opt key={k} label={l} on={video.verdict === k} color={color} onPress={() => void patch({ verdict: video.verdict === k ? null : k })} />
            ))}
          </Row>
        </View>
      ) : null}

      {phone ? (
        <View style={{ gap: 10, paddingTop: 4 }}>
          {next ? (
            <View style={{ flexDirection: 'row' }}>
              <BigBtn label={next.label} busy={busy === 'stage' || busy === 'video'} onPress={() => void moveTo(next.to)} />
            </View>
          ) : null}
          <View style={{ flexDirection: 'row' }}>
            <BigBtn label={armed === 'video' ? 'Confirm delete' : 'Delete video'} kind="quiet" danger={armed === 'video'} busy={busy === 'delete'} onPress={() => tap('video', remove)} />
          </View>
        </View>
      ) : (
        <Row gap={10} style={{ paddingTop: 4 }}>
          {next ? <Btn label={next.label} kind="primary" busy={busy === 'stage' || busy === 'video'} onPress={() => void moveTo(next.to)} /> : null}
          <DeleteBtn armed={armed === 'video'} busy={busy === 'delete'} size="md" onPress={() => tap('video', remove)} />
        </Row>
      )}
      {!video.topic && !video.imported_from && video.stage === 'posted' ? <Text style={{ fontSize: 12.5, color: c.warn }}>{tagLine(video)}. Untagged videos are left out of the Playbook.</Text> : null}
    </View>
  );
}
