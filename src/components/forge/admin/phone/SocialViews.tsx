import { useMemo, useState } from 'react';
import { Linking, Platform as RNPlatform, Pressable, ScrollView, Text, View } from 'react-native';

import { useCrm } from '@/components/forge/admin/crm-theme';
import { when } from '@/components/forge/admin/crm-ui';
import { usePhone } from '@/components/forge/admin/phone/context';
import { BigBtn, EmptyRow, ErrorRow, FigGrid, KVRow, Muted, OverlayScreen, PChip, PInput, RowButton, ScrubChart, SectionHead, Seg, SERIF, SheetFrame, Skel, Tag } from '@/components/forge/admin/phone/kit';
import { usePlatformFilter, useSocial, verdictLabel, verdictTone, weekText } from '@/components/forge/admin/social-ui';
import { SocialVideoEditor } from '@/components/forge/admin/SocialVideoEditor';
import { SOCIAL_SETUP_DOC, questionToVideo, runSocialSync, saveItem, saveVideo, startConnect } from '@/data/social-live';
import { deltaNote, int, lastLabel, RANGE_INFO } from '@/domain/admin/briefing';
import { todayKey } from '@/domain/admin/crm-core';
import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import {
  MEASURES,
  PLATFORMS,
  STAGES,
  accountState,
  addDays,
  ago,
  calendarWeeks,
  followerSeries,
  followers,
  intOrDash,
  isPosted,
  lessons,
  measureText,
  pctOrDash,
  platformLabel,
  postedIn,
  postingDay,
  share,
  stageCounts,
  sumIn,
  tagLine,
  topVideos,
  totals,
  videoDay,
  videoMap,
  videoPlatforms,
  videosInStage,
  weekCount,
  weekStart,
  weekVerdict,
  working,
  type Platform,
  type PlatformFilter,
  type SocialData,
  type Stage,
  type WorkingDim,
  type WorkingMeasure,
} from '@/domain/admin/social-core';

/**
 * More → Social on the phone (migration 0247, AA-D25): the three desktop pages, for checking between
 * posts and catching an idea before it goes. Same read and same arithmetic as the desktop
 * (`social-core`); the phone leaves out the list editors (rules, competitor notes, tags), which stay on
 * the desktop CRM.
 */

export type SocialQuery = ReturnType<typeof useSocial>;

const OFFLINE_TOAST = 'You’re offline. Saving is paused until you reconnect.';

function PlatformRow({ value, onChange }: { value: PlatformFilter; onChange: (p: PlatformFilter) => void }) {
  return (
    <ScrollView horizontal keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets={false} showsHorizontalScrollIndicator={false} style={{ marginTop: 14, marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
      <PChip label="All" on={value === 'all'} onPress={() => onChange('all')} />
      {PLATFORMS.map((p) => (
        <PChip key={p.key} label={p.label} on={value === p.key} onPress={() => onChange(p.key)} />
      ))}
    </ScrollView>
  );
}

function useToday(at: number) {
  return useMemo(() => todayKey(at ? new Date(at) : new Date()), [at]);
}

/** Root-row subtitles for More: one honest line each, "—" until the read is back. */
export function socialSubs(q: SocialQuery): { numbers: string; content: string; playbook: string } {
  const d = q.data;
  if (!d) {
    const s = q.error ? 'Couldn’t load' : '—';
    return { numbers: s, content: s, playbook: s };
  }
  const today = todayKey(q.at ? new Date(q.at) : new Date());
  const f = followers(d.daily, 'all', 30, today);
  const counts = stageCounts(d, 'all');
  const numbers = !d.accounts.some((a) => a.connected) && f.now == null ? 'Not connected yet' : f.gained != null ? `${f.gained < 0 ? '−' : '+'}${int(Math.abs(f.gained))} followers in 30 days` : `${intOrDash(f.now)} followers`;
  return {
    numbers,
    content: `${counts.scheduled} scheduled · ${counts.idea} ${counts.idea === 1 ? 'idea' : 'ideas'}`,
    playbook: `${lessons(d).length} ${lessons(d).length === 1 ? 'lesson' : 'lessons'} · ${d.questions.length} ${d.questions.length === 1 ? 'question' : 'questions'}`,
  };
}

function Gate({ q, children }: { q: SocialQuery; children: (d: SocialData) => React.ReactNode }) {
  if (q.error && !q.data) return <ErrorRow msg={`Couldn’t load Social. ${q.error}`} onRetry={q.refetch} />;
  if (!q.data) return <Skel lines={4} />;
  return <>{children(q.data)}</>;
}

// ── Numbers ─────────────────────────────────────────────────────────────────

export function SocialNumbersView({ q }: { q: SocialQuery }) {
  const { c } = useCrm();
  const { range, open, toast, offline } = usePhone();
  const [plat, setPlat] = usePlatformFilter();
  const [busy, setBusy] = useState<string | null>(null);
  const today = useToday(q.at);
  const days = RANGE_INFO[range].days;

  const connect = async (p: Platform) => {
    if (offline) return toast(OFFLINE_TOAST);
    setBusy(p);
    try {
      const returnTo = RNPlatform.OS === 'web' && typeof window !== 'undefined' ? `${window.location.origin}/admin` : 'https://forgelegacy.expo.app/admin';
      const res = await startConnect(p, returnTo);
      if (!res.ok) return toast(`${platformLabel(p)}’s app keys are not on the server yet. The steps are in ${SOCIAL_SETUP_DOC}.`);
      if (RNPlatform.OS === 'web' && typeof window !== 'undefined') window.location.assign(res.url);
      else await Linking.openURL(res.url);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t start the sign-in.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Gate q={q}>
      {(d) => {
        const vm = videoMap(d.videos);
        const tt = totals(postedIn(d, plat, days, today), vm);
        const fol = followers(d.daily, plat, days, today);
        const series = followerSeries(d.daily, plat, days, today);
        const clicks = sumIn(d.clicks, (r) => r.clicks, plat, days, today);
        const signups = sumIn(d.waitlist, (r) => r.n, plat, days, today);
        const top = topVideos(d, plat, 30, today, 'views');
        const dn = fol.gained != null && fol.prev != null ? deltaNote(fol.gained, fol.prev, range) : null;
        const week = weekStart(today);
        return (
          <View>
            <PlatformRow value={plat} onChange={setPlat} />
            {PLATFORMS.filter((p) => plat === 'all' || plat === p.key).map((p) => {
              const a = d.accounts.find((x) => x.platform === p.key);
              if (accountState(a) === 'expired') return <Text key={p.key} style={{ marginTop: 14, fontSize: 14, lineHeight: 20, color: c.warn }}>{`${p.label} is not connected, so its numbers have stopped updating.`}</Text>;
              if (a?.connected && a.last_sync_ok === false)
                return <Text key={p.key} style={{ marginTop: 14, fontSize: 14, lineHeight: 20, color: c.warn }}>{`${p.label}’s last sync failed${a.last_sync_message ? `: ${a.last_sync_message}` : '.'}`}</Text>;
              return null;
            })}
            <View style={{ marginTop: 16 }}>
              <FigGrid
                size={30}
                figs={[
                  {
                    label: 'Followers gained',
                    value: fol.gained != null ? `${fol.gained < 0 ? '−' : '+'}${int(Math.abs(fol.gained))}` : '—',
                    note: fol.gained == null ? (fol.now != null ? 'Shows after a second day' : 'No numbers yet') : fol.since ? `Since ${when(fol.since)}` : (dn?.text ?? lastLabel(range)),
                    tone: fol.gained != null && !fol.since ? (dn?.tone ?? null) : null,
                  },
                  { label: 'Followers now', value: intOrDash(fol.now), note: plat === 'all' ? 'Both platforms' : platformLabel(plat) },
                  { label: 'Views', value: tt.posts ? int(tt.views) : '—', note: `${tt.posts} ${tt.posts === 1 ? 'post' : 'posts'}` },
                  { label: 'Average watched', value: pctOrDash(tt.watched), note: tt.watched == null ? 'No figure in this range' : `${tt.watchedOf} of ${tt.posts} report it` },
                  { label: 'Link clicks', value: int(clicks), note: 'The link in your bio' },
                  { label: 'Early-access signups', value: int(signups), note: clicks ? `${share(signups, clicks)} of clicks` : 'Through your links' },
                ]}
              />
            </View>

            <SectionHead label="Followers" />
            {series.values.length < 2 ? (
              <Muted style={{ marginTop: 10 }}>The line starts once there are two days of follower numbers.</Muted>
            ) : (
              <ScrubChart zoom values={series.values} days={series.days} fmt={(v) => int(v)} weekly={series.weekly} />
            )}

            <SectionHead label="Top videos, last 30 days" />
            {top.length === 0 ? (
              <EmptyRow>Nothing posted here in the last 30 days.</EmptyRow>
            ) : (
              top.slice(0, 5).map((r) => (
                <RowButton
                  key={r.video.id}
                  onPress={() => open({ kind: 'video', id: r.video.id })}
                  label={r.video.title}
                  right={<Text style={{ fontSize: 15, fontWeight: '600', color: c.ink, fontVariant: ['tabular-nums'] }}>{int(r.totals.views)}</Text>}
                >
                  <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '500', color: c.ink }}>
                    {r.video.title}
                  </Text>
                  <Text numberOfLines={1} style={{ marginTop: 2, fontSize: 13, color: c.ink3 }}>
                    {`${pctOrDash(r.totals.watched)} watched · ${r.totals.sharesPerK == null ? '—' : r.totals.sharesPerK.toFixed(1)} shares per 1,000 · ${r.platforms.map(platformLabel).join(', ')}`}
                  </Text>
                </RowButton>
              ))
            )}

            <SectionHead label="From a post to the list" />
            <KVRow label="Link clicks" note={tt.views ? `${share(clicks, tt.views)} of views` : null} value={int(clicks)} />
            <KVRow label="Early-access signups" note={clicks ? `${share(signups, clicks)} of clicks` : null} value={int(signups)} />
            <KVRow label="App Store downloads" note="after launch" value="—" />
            <Muted style={{ marginTop: 8 }}>One link per platform, in its bio. Counts only.</Muted>

            <SectionHead label={`This week · ${when(week)} to ${when(addDays(week, 6))}`} />
            {PLATFORMS.filter((p) => plat === 'all' || plat === p.key).map((p) => {
              const w = weekCount(d, week, p.key, today);
              return <KVRow key={p.key} label={p.label} note={`${w.posted} posted · ${w.scheduled} scheduled`} value={weekText(w)} />;
            })}

            <SectionHead label="Connected accounts" />
            {PLATFORMS.map((p) => {
              const a = d.accounts.find((x) => x.platform === p.key);
              const st = accountState(a);
              return (
                <View key={p.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 16, fontWeight: '500', color: c.ink }}>{p.label}</Text>
                    <Text numberOfLines={1} style={{ marginTop: 2, fontSize: 13, color: st === 'connected' ? c.ink3 : c.warn }}>
                      {st === 'connected' ? `${a?.username ? `@${a.username.replace(/^@/, '')} · ` : ''}${a?.last_sync_at ? `synced ${ago(a.last_sync_at, q.at)}` : 'no sync yet'}` : 'Not connected'}
                    </Text>
                  </View>
                  {st !== 'connected' ? (
                    <Pressable onPress={() => void connect(p.key)} accessibilityRole="button" style={{ height: 44, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: c.fieldBd, justifyContent: 'center' }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: c.ink }}>{busy === p.key ? 'Opening…' : 'Connect'}</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>
        );
      }}
    </Gate>
  );
}

/** The Numbers bottom bar: "Sync now", when something is connected. */
export function SocialSyncBar({ q }: { q: SocialQuery }) {
  const { toast, offline, refresh } = usePhone();
  const [busy, setBusy] = useState(false);
  const sync = async () => {
    if (busy) return;
    if (offline) return toast(OFFLINE_TOAST);
    setBusy(true);
    try {
      const res = await runSocialSync();
      const bad = res.results.filter((r) => !r.ok);
      toast(bad.length ? bad.map((r) => `${platformLabel(r.platform)}: ${r.message ?? 'failed'}`).join(' · ') : res.results.length ? 'Synced just now.' : 'Nothing to sync. Connect an account first.');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'The sync failed.');
    } finally {
      setBusy(false);
      refresh();
    }
  };
  return <BigBtn label={busy ? 'Syncing…' : 'Sync now'} busy={busy} disabled={offline || !q.data?.accounts.some((a) => a.connected)} onPress={() => void sync()} />;
}

// ── Content ─────────────────────────────────────────────────────────────────

const LIST_ORDER: Stage[] = ['scheduled', 'filmed', 'scripted', 'idea', 'posted'];

export function SocialContentView({ q }: { q: SocialQuery }) {
  const { c } = useCrm();
  const { open } = usePhone();
  const [plat, setPlat] = usePlatformFilter();
  const [seg, setSeg] = useState<'pipeline' | 'calendar'>('pipeline');
  const [stage, setStage] = useState<Stage | null>(null);
  const today = useToday(q.at);

  return (
    <Gate q={q}>
      {(d) => {
        const vm = videoMap(d.videos);
        const counts = stageCounts(d, plat);
        return (
          <View>
            <View style={{ marginTop: 14 }}>
              <Seg
                options={[
                  { key: 'pipeline', label: 'Pipeline' },
                  { key: 'calendar', label: 'Calendar' },
                ]}
                value={seg}
                onChange={setSeg}
              />
            </View>
            <PlatformRow value={plat} onChange={setPlat} />

            {seg === 'pipeline' ? (
              <>
                <ScrollView horizontal keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets={false} showsHorizontalScrollIndicator={false} style={{ marginTop: 10, marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
                  <PChip label="All" on={!stage} onPress={() => setStage(null)} />
                  {STAGES.map((s) => (
                    <PChip key={s.key} label={s.label} count={counts[s.key]} on={stage === s.key} onPress={() => setStage(stage === s.key ? null : s.key)} />
                  ))}
                </ScrollView>
                {STAGES.every((s) => counts[s.key] === 0) ? <EmptyRow>No videos yet. Tap New idea to write the first one down.</EmptyRow> : null}
                {(stage ? [stage] : LIST_ORDER).map((k) => {
                  const vs = videosInStage(d, k, plat);
                  if (!vs.length && !stage) return null;
                  const more = !stage && k === 'posted' && vs.length > 4;
                  return (
                    <View key={k}>
                      <SectionHead
                        label={`${STAGES.find((s) => s.key === k)?.label ?? k} · ${vs.length}`}
                        right={
                          more ? (
                            <Text onPress={() => setStage('posted')} accessibilityRole="button" style={{ fontSize: 14, color: c.brz }}>
                              See all
                            </Text>
                          ) : null
                        }
                      />
                      {!vs.length ? <EmptyRow>Nothing at this stage.</EmptyRow> : null}
                      {(more ? vs.slice(0, 4) : vs).map((v) => {
                        const ps = d.postings.filter((p) => p.video_id === v.id && isPosted(p) && (plat === 'all' || p.platform === plat));
                        const day = videoDay(v, d.postings, plat);
                        const right = v.stage === 'posted' ? (ps.some((p) => p.views != null) ? int(totals(ps, vm).views) : '') : v.stage === 'scheduled' && day ? when(day) : '';
                        const where = videoPlatforms(v, d.postings);
                        return (
                          <RowButton
                            key={v.id}
                            onPress={() => open({ kind: 'video', id: v.id })}
                            label={v.title}
                            right={right ? <Text style={{ fontSize: 15, fontWeight: '600', color: c.ink, fontVariant: ['tabular-nums'] }}>{right}</Text> : null}
                          >
                            <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '500', color: c.ink }}>
                              {v.title}
                            </Text>
                            <Text numberOfLines={1} style={{ marginTop: 2, fontSize: 13, color: v.stage === 'posted' && !v.topic ? c.warn : c.ink3 }}>
                              {tagLine(v)}
                              {v.topic && where.length ? ` · ${where.map(platformLabel).join(', ')}` : ''}
                            </Text>
                          </RowButton>
                        );
                      })}
                    </View>
                  );
                })}
              </>
            ) : (
              calendarWeeks(today, 1, 2).map((ws, i) => {
                const w = weekCount(d, ws, plat, today);
                const verdict = weekVerdict(w);
                const items = d.postings
                  .filter((p) => {
                    const day = postingDay(p);
                    return !!day && day >= ws && day <= addDays(ws, 6) && (plat === 'all' || p.platform === plat);
                  })
                  .sort((a, b) => (postingDay(a) ?? '').localeCompare(postingDay(b) ?? ''));
                return (
                  <View key={ws}>
                    <SectionHead
                      label={i === 0 ? 'Last week' : i === 1 ? 'This week' : `Week of ${when(ws)}`}
                      right={<Text style={{ fontSize: 13, color: verdict?.missed ? c.critInk : c.ink3, fontVariant: ['tabular-nums'] }}>{`${weekText(w)}${verdict ? ` · ${verdict.text}` : ''}`}</Text>}
                    />
                    {items.length === 0 ? <Muted style={{ paddingVertical: 12 }}>Nothing planned.</Muted> : null}
                    {items.map((p) => {
                      const v = vm.get(p.video_id);
                      if (!v) return null;
                      const day = postingDay(p)!;
                      return (
                        <RowButton key={p.id} onPress={() => open({ kind: 'video', id: v.id })} label={v.title} right={<Text style={{ fontSize: 13, color: c.ink3 }}>{isPosted(p) ? '✓ posted' : 'scheduled'}</Text>}>
                          <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '500', color: c.ink }}>
                            {v.title}
                          </Text>
                          <Text style={{ marginTop: 2, fontSize: 13, color: c.ink3 }}>{`${when(day)}${day === today ? ' · today' : ''} · ${platformLabel(p.platform)}`}</Text>
                        </RowButton>
                      );
                    })}
                  </View>
                );
              })
            )}
          </View>
        );
      }}
    </Gate>
  );
}

// ── Playbook ────────────────────────────────────────────────────────────────

const DIMS: { key: WorkingDim; label: string }[] = [
  { key: 'topic', label: 'By topic' },
  { key: 'hook', label: 'By hook' },
  { key: 'format', label: 'By format' },
  { key: 'length', label: 'By length' },
];

export function SocialPlaybookView({ q }: { q: SocialQuery }) {
  const { c } = useCrm();
  const { open, toast, refresh, offline } = usePhone();
  const [dim, setDim] = useState<WorkingDim>('topic');
  const [measure, setMeasure] = useState<WorkingMeasure>('shares');
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (key: string, fn: () => Promise<unknown>, done: string) => {
    if (offline) return toast(OFFLINE_TOAST);
    setBusy(key);
    try {
      await fn();
      toast(done);
      refresh();
    } catch {
      toast('Couldn’t save. Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Gate q={q}>
      {(d) => {
        const rows = working(d, dim, measure);
        const log = lessons(d);
        return (
          <View>
            <SectionHead label="What is working" />
            <ScrollView horizontal keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets={false} showsHorizontalScrollIndicator={false} style={{ marginTop: 10, marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
              {DIMS.map((x) => (
                <PChip key={x.key} label={x.label} on={dim === x.key} onPress={() => setDim(x.key)} />
              ))}
            </ScrollView>
            <ScrollView horizontal keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets={false} showsHorizontalScrollIndicator={false} style={{ marginTop: 8, marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
              {MEASURES.map((m) => (
                <PChip key={m.key} label={m.label} on={measure === m.key} onPress={() => setMeasure(m.key)} />
              ))}
            </ScrollView>
            {rows.length === 0 ? (
              <EmptyRow>Nothing to rank yet. Post and tag a few videos and this shows what does best.</EmptyRow>
            ) : (
              <View style={{ gap: 16, marginTop: 16 }}>
                {rows.map((r) => (
                  <View key={r.label} style={{ gap: 7 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                      <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 15, color: c.ink }}>
                        {r.label}
                      </Text>
                      <Text style={{ fontSize: 13, color: c.ink3, fontVariant: ['tabular-nums'] }}>
                        <Text style={{ fontSize: 15, fontWeight: '600', color: r.value == null ? c.ink3 : c.ink }}>{measureText(measure, r.value)}</Text>
                        {` · ${r.videos} ${r.videos === 1 ? 'video' : 'videos'}`}
                      </Text>
                    </View>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: c.track }}>
                      <View style={{ height: 6, borderRadius: 3, backgroundColor: c.brz, width: `${r.width}%` }} />
                    </View>
                  </View>
                ))}
              </View>
            )}

            <SectionHead label="Experiments" />
            {log.length === 0 ? <EmptyRow>No lessons yet. Open a posted video and write what you tried.</EmptyRow> : null}
            {log.map(({ video }) => (
              <RowButton key={video.id} onPress={() => open({ kind: 'video', id: video.id })} label={video.title} right={video.verdict ? <Tag label={verdictLabel[video.verdict]} tone={verdictTone[video.verdict]} /> : null}>
                <Text style={{ fontSize: 16, fontWeight: '500', lineHeight: 22, color: c.ink }}>{video.lesson_tried || video.title}</Text>
                {video.lesson_result ? <Text style={{ marginTop: 2, fontSize: 13, lineHeight: 19, color: c.ink3 }}>{video.lesson_result}</Text> : null}
              </RowButton>
            ))}

            <SectionHead label="Rules" />
            {d.rules.length === 0 ? <EmptyRow>No rules yet.</EmptyRow> : null}
            {d.rules.map((r) => (
              <Text key={r.id} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.line, fontFamily: SERIF, fontSize: 17, lineHeight: 24, color: c.ink }}>
                {r.body}
              </Text>
            ))}

            <SectionHead label="What people keep asking" />
            {d.questions.length === 0 ? <EmptyRow>Nothing written down yet.</EmptyRow> : null}
            {d.questions.map((qn) => (
              <View key={qn.id} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.line, gap: 10 }}>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '500', lineHeight: 22, color: c.ink }}>“{qn.question}”</Text>
                  <Text style={{ marginTop: 2, fontSize: 13, color: c.ink3 }}>{`Asked ${qn.times} ${qn.times === 1 ? 'time' : 'times'}${qn.platform ? ` · ${platformLabel(qn.platform)}` : ''}`}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <BigBtn kind="quiet" label="Asked again" busy={busy === `n-${qn.id}`} onPress={() => void act(`n-${qn.id}`, () => saveItem('question', qn.id, { times: qn.times + 1 }), 'Counted')} style={{ flex: 1 }} />
                  {qn.video_id ? (
                    <BigBtn kind="quiet" label="Open the idea" onPress={() => open({ kind: 'video', id: qn.video_id! })} style={{ flex: 1 }} />
                  ) : (
                    <BigBtn kind="quiet" label="Make a video" busy={busy === `v-${qn.id}`} onPress={() => void act(`v-${qn.id}`, () => questionToVideo(qn.id), 'Added to Ideas')} style={{ flex: 1 }} />
                  )}
                </View>
              </View>
            ))}

            <SectionHead label="Worth studying" />
            {d.rivals.length === 0 ? <EmptyRow>No notes yet.</EmptyRow> : null}
            {d.rivals.map((r) => (
              <View key={r.id} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.line }}>
                <Text style={{ fontSize: 16, fontWeight: '500', lineHeight: 22, color: c.ink }}>{`${r.who}: ${r.what}`}</Text>
                {r.why ? <Text style={{ marginTop: 2, fontSize: 13, lineHeight: 19, color: c.ink3 }}>{r.why}</Text> : null}
              </View>
            ))}
            <Muted style={{ marginTop: 16 }}>Rules, questions, notes and tags are added on the desktop CRM.</Muted>
          </View>
        );
      }}
    </Gate>
  );
}

// ── One video (a full-screen page over the tab) ─────────────────────────────

export function SocialVideoOverlay({ id, backLabel }: { id: string; backLabel: string }) {
  const { c } = useCrm();
  const { back, open, toast, refresh, stamp } = usePhone();
  const q = useSocial(stamp);
  const video = q.data?.videos.find((v) => v.id === id) ?? null;
  return (
    <OverlayScreen backLabel={backLabel} onBack={back}>
      {q.error && !q.data ? (
        <ErrorRow msg={`Couldn’t load the video. ${q.error}`} onRetry={q.refetch} />
      ) : !q.data ? (
        <Skel lines={5} />
      ) : !video ? (
        <EmptyRow>This video is gone. It may have been deleted on another device.</EmptyRow>
      ) : (
        <View style={{ gap: 16 }}>
          <Text accessibilityRole="header" style={{ fontFamily: SERIF, fontSize: 24, lineHeight: 30, color: c.ink }}>
            {video.title}
          </Text>
          <SocialVideoEditor key={video.id} phone video={video} data={q.data} at={q.at} onChanged={refresh} onOpen={(next) => (next ? open({ kind: 'video', id: next }) : back())} toast={toast} />
        </View>
      )}
    </OverlayScreen>
  );
}

// ── New idea (a bottom sheet: one field, which platform, save) ──────────────

export function NewIdeaSheet() {
  const { closeSheet, toast, refresh, offline, setTab, setMoreView } = usePhone();
  const [title, setTitle] = useState('');
  const [planned, setPlanned] = useState<Platform[]>([]);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!title.trim()) return toast('Type the idea first.');
    if (offline) return toast(OFFLINE_TOAST);
    setBusy(true);
    try {
      await saveVideo(null, { title: title.trim(), stage: 'idea', planned });
      closeSheet();
      refresh();
      setMoreView('content');
      setTab('more', { clear: true });
      toast('Idea added');
    } catch {
      toast('Couldn’t add it. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SheetFrame title="New idea" onClose={closeSheet}>
      <View style={{ gap: 14, marginTop: 8 }}>
        <PInput value={title} onChangeText={setTitle} placeholder="What is the video?" autoFocus accessibilityLabel="Idea" returnKeyType="done" onSubmitEditing={() => void save()} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {PLATFORMS.map((p) => (
            <PChip key={p.key} label={p.label} on={planned.includes(p.key)} onPress={() => setPlanned((cur) => (cur.includes(p.key) ? cur.filter((x) => x !== p.key) : [...cur, p.key]))} />
          ))}
        </View>
        <View style={{ flexDirection: 'row' }}>
          <BigBtn label="Save idea" busy={busy} onPress={() => void save()} />
        </View>
      </View>
    </SheetFrame>
  );
}
