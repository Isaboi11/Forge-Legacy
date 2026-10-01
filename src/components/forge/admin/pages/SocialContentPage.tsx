import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Btn, DISPLAY, DISPLAY_M, ErrorLine, HoverRow, Input, LinkText, PageHeader, Panel, Row, SectionLabel, Skeleton, useLayout, useToast, when } from '@/components/forge/admin/crm-ui';
import { useCrm } from '@/components/forge/admin/crm-theme';
import type { PageProps } from '@/components/forge/admin/pages/types';
import { PlatformChips, PlatformCode, usePlatformFilter, useSocial, weekText } from '@/components/forge/admin/social-ui';
import { SocialVideoEditor } from '@/components/forge/admin/SocialVideoEditor';
import { saveVideo } from '@/data/social-live';
import { int } from '@/domain/admin/briefing';
import { todayKey } from '@/domain/admin/crm-core';
import {
  PLATFORMS,
  STAGES,
  addDays,
  calendarWeeks,
  isPosted,
  platformLabel,
  postingDay,
  stageCounts,
  tagLine,
  totals,
  videoDay,
  videoMap,
  videoPlatforms,
  videosInStage,
  weekCount,
  weekVerdict,
  type PlatformFilter,
  type SocialData,
  type SocialVideo,
  type Stage,
} from '@/domain/admin/social-core';

/**
 * Social → Content (migration 0247, AA-D23/D25): every video from the idea to what it did.
 *
 * Two views of the same rows: the PIPELINE (five stages across the top, the videos grouped under them)
 * and the CALENDAR (five weeks, each counted against the weekly posting goal). Picking a video opens its
 * one record beside the list — the same two-pane shape as Bugs and Contacts.
 */

/** The order the pipeline list is read in: what is about to go out first, what already ran last. */
const LIST_ORDER: Stage[] = ['scheduled', 'filmed', 'scripted', 'idea', 'posted'];
const POSTED_SHOWN = 5;
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function SocialContentPage({ go, arg }: PageProps) {
  const { c } = useCrm();
  const { lg } = useLayout();
  const toast = useToast();
  const social = useSocial();
  const [plat, setPlat] = usePlatformFilter();
  const [view, setView] = useState<'pipeline' | 'calendar'>('pipeline');
  const [stage, setStage] = useState<Stage | null>(null);
  const [idea, setIdea] = useState('');
  const [adding, setAdding] = useState(false);

  const d = social.data;
  const today = useMemo(() => todayKey(social.at ? new Date(social.at) : new Date()), [social.at]);
  const selected = d && arg ? (d.videos.find((v) => v.id === arg) ?? null) : null;

  const addIdea = async () => {
    const title = idea.trim();
    if (!title) return toast('Type the idea first.');
    setAdding(true);
    try {
      const id = await saveVideo(null, { title, stage: 'idea', planned: plat === 'all' ? [] : [plat] });
      setIdea('');
      setStage(null);
      setView('pipeline');
      social.refetch();
      go('content', id);
      toast('Idea added');
    } catch {
      toast('Couldn’t add it. Check your connection and try again.');
    } finally {
      setAdding(false);
    }
  };

  const header = (
    <PageHeader
      title="Content"
      purpose="Every video from idea to posted, and what each one did."
      note="Every video, from the idea to what it did. One record each."
      actions={[
        { label: 'Pipeline', kind: 'quiet', on: view === 'pipeline', onPress: () => setView('pipeline') },
        { label: 'Calendar', kind: 'quiet', on: view === 'calendar', onPress: () => setView('calendar') },
      ]}
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

  const narrowPanel = !lg && !!selected;

  const panel = selected ? (
    <Panel sticky pad={24} gap={18} style={lg ? { width: 440, flexShrink: 0 } : undefined}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <Text style={{ fontFamily: DISPLAY, fontSize: 22, lineHeight: 28, color: c.ink, flexShrink: 1 }}>{selected.title}</Text>
        <Pressable onPress={() => go('content')} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10}>
          <Text style={{ fontSize: 22, lineHeight: 24, color: c.ink3 }}>×</Text>
        </Pressable>
      </View>
      <SocialVideoEditor key={selected.id} video={selected} data={d} at={social.at} onChanged={social.refetch} onOpen={(id) => go('content', id ?? undefined)} toast={toast} />
    </Panel>
  ) : null;

  return (
    <View>
      {header}

      <Row gap={10} wrap={false} style={{ alignItems: 'center' }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Input value={idea} onChangeText={setIdea} onSubmitEditing={() => void addIdea()} placeholder="Write down an idea before it goes" accessibilityLabel="New idea" returnKeyType="done" />
        </View>
        <Btn label="Add idea" kind="primary" busy={adding} onPress={() => void addIdea()} />
      </Row>

      <View style={{ marginTop: 20 }}>
        <PlatformChips value={plat} onChange={setPlat} />
      </View>

      {narrowPanel ? (
        <View style={{ marginTop: 24, gap: 14 }}>
          <LinkText label="Back to the list" onPress={() => go('content')} />
          {panel}
        </View>
      ) : (
        <View style={{ flexDirection: lg ? 'row' : 'column', gap: 40, alignItems: 'flex-start', marginTop: 20 }}>
          <View style={{ flex: lg ? 1 : undefined, minWidth: 0, alignSelf: 'stretch' }}>
            {view === 'pipeline' ? (
              <Pipeline d={d} plat={plat} stage={stage} setStage={setStage} selectedId={selected?.id ?? null} onPick={(id) => go('content', id)} />
            ) : (
              <Calendar d={d} plat={plat} today={today} compact={!!selected} selectedId={selected?.id ?? null} onPick={(id) => go('content', id)} />
            )}
          </View>
          {panel}
        </View>
      )}
    </View>
  );
}

// ── Pipeline ────────────────────────────────────────────────────────────────

function Pipeline({ d, plat, stage, setStage, selectedId, onPick }: { d: SocialData; plat: PlatformFilter; stage: Stage | null; setStage: (s: Stage | null) => void; selectedId: string | null; onPick: (id: string) => void }) {
  const { c } = useCrm();
  const counts = stageCounts(d, plat);
  const vm = videoMap(d.videos);
  const order = stage ? [stage] : LIST_ORDER;
  const total = STAGES.reduce((n, s) => n + counts[s.key], 0);

  const right = (v: SocialVideo): string => {
    if (v.stage === 'posted') {
      const ps = d.postings.filter((p) => p.video_id === v.id && isPosted(p) && (plat === 'all' || p.platform === plat));
      const t = totals(ps, vm);
      return ps.some((p) => p.views != null) ? `${int(t.views)} views` : 'No numbers yet';
    }
    const day = videoDay(v, d.postings, plat);
    return v.stage === 'scheduled' && day ? when(day) : '';
  };

  return (
    <View>
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 2, marginBottom: 32 }}>
        {STAGES.map((s, i) => {
          const on = stage === s.key;
          return (
            <Pressable
              key={s.key}
              onPress={() => setStage(on ? null : s.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${s.label}: ${counts[s.key]}${on ? '. Showing only these. Tap to show every stage.' : ''}`}
              style={({ hovered }: { pressed: boolean; hovered?: boolean }) => ({
                flex: 1,
                minWidth: 0,
                paddingTop: 14,
                paddingBottom: 13,
                paddingHorizontal: 14,
                borderTopWidth: 1,
                borderTopColor: on ? c.brzBd : c.line,
                backgroundColor: on ? c.brzTint : hovered ? c.hover : 'transparent',
                gap: 2,
              })}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text style={{ fontFamily: DISPLAY_M, fontSize: 26, lineHeight: 30, color: counts[s.key] ? c.ink : c.ink3, fontVariant: ['tabular-nums'] }}>{counts[s.key]}</Text>
                {i < STAGES.length - 1 ? <Text style={{ fontSize: 15, color: c.ink3 }}>›</Text> : null}
              </View>
              <Text numberOfLines={1} style={{ fontSize: 13, color: on ? c.brz : c.ink2, fontWeight: on ? '600' : '400' }}>
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {total === 0 ? (
        <Text style={{ paddingVertical: 18, fontSize: 14.5, lineHeight: 22.5, color: c.ink2 }}>
          {plat === 'all' ? 'No videos yet. Write down the first idea above. Once an account is connected, what you have already posted comes in on its own.' : `Nothing for ${platformLabel(plat)} yet.`}
        </Text>
      ) : null}

      {order.map((k, gi) => {
        const vs = videosInStage(d, k, plat);
        if (!vs.length && !stage) return null;
        const more = !stage && k === 'posted' && vs.length > POSTED_SHOWN;
        const label = STAGES.find((s) => s.key === k)?.label ?? k;
        return (
          <View key={k} style={{ marginTop: gi === 0 ? 0 : 28 }}>
            <SectionLabel label={`${label} · ${vs.length}`} right={more ? <LinkText label="See all posted" onPress={() => setStage('posted')} /> : null} />
            {!vs.length ? (
              <Text style={{ paddingVertical: 18, fontSize: 14.5, lineHeight: 22.5, color: c.ink2 }}>
                Nothing at this stage
                {plat === 'all' ? '' : ` for ${platformLabel(plat)}`}.
              </Text>
            ) : null}
            {(more ? vs.slice(0, POSTED_SHOWN) : vs).map((v) => {
              const ps = videoPlatforms(v, d.postings);
              return (
                <HoverRow key={v.id} onPress={() => onPick(v.id)} selected={v.id === selectedId} label={v.title} style={{ paddingVertical: 13 }}>
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text numberOfLines={1} style={{ fontSize: 14, color: c.ink }}>
                      {v.title}
                    </Text>
                    <Text numberOfLines={1} style={{ fontSize: 12.5, color: v.stage === 'posted' && !v.topic ? c.warn : c.ink3 }}>
                      {tagLine(v)}
                    </Text>
                  </View>
                  <Text numberOfLines={1} style={{ width: 140, fontSize: 13, color: c.ink2 }}>
                    {ps.length ? ps.map(platformLabel).join(', ') : 'No platform yet'}
                  </Text>
                  <Text style={{ width: 110, textAlign: 'right', fontSize: 14, color: c.ink, fontVariant: ['tabular-nums'] }}>{right(v)}</Text>
                </HoverRow>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

// ── Calendar ────────────────────────────────────────────────────────────────

/** `compact` = the video panel is open beside it, so each cell is narrow: the platform mark sits above a two-line title. */
function Calendar({ d, plat, today, compact, selectedId, onPick }: { d: SocialData; plat: PlatformFilter; today: string; compact: boolean; selectedId: string | null; onPick: (id: string) => void }) {
  const { c } = useCrm();
  const vm = videoMap(d.videos);
  const weeks = calendarWeeks(today);
  const hasGoal = d.goals.some((g) => (plat === 'all' || g.platform === plat) && g.posts_per_week > 0);

  const head = { paddingHorizontal: 8, paddingTop: 10, paddingBottom: 8, fontSize: 11, fontWeight: '600' as const, letterSpacing: 1.2, textTransform: 'uppercase' as const, color: c.ink3 };

  return (
    <View>
      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.line }}>
        {DOW.map((x) => (
          <Text key={x} style={[head, { flex: 1, minWidth: 0 }]}>
            {x}
          </Text>
        ))}
        <Text style={[head, { width: 78, paddingLeft: 12 }]}>Week</Text>
      </View>
      {weeks.map((ws, wi) => {
        const w = weekCount(d, ws, plat, today);
        const verdict = weekVerdict(w);
        return (
          <View key={ws} style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: c.line }}>
            {DOW.map((_, di) => {
              const day = addDays(ws, di);
              const isToday = day === today;
              const items = d.postings.filter((p) => postingDay(p) === day && (plat === 'all' || p.platform === plat));
              const dom = Number(day.slice(8));
              return (
                <View
                  key={day}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    minHeight: 104,
                    paddingHorizontal: 6,
                    paddingTop: 8,
                    paddingBottom: 10,
                    gap: 5,
                    borderRightWidth: 1,
                    borderRightColor: c.line,
                    backgroundColor: day < today ? c.hover : 'transparent',
                  }}
                >
                  <Text style={{ paddingHorizontal: 2, fontSize: 12, color: isToday ? c.brz : c.ink3, fontWeight: isToday ? '700' : '400', fontVariant: ['tabular-nums'] }}>
                    {dom === 1 || (wi === 0 && di === 0) ? when(day) : dom}
                    {isToday ? ' · today' : ''}
                  </Text>
                  {items.map((p) => {
                    const v = vm.get(p.video_id);
                    if (!v) return null;
                    const up = isPosted(p);
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => onPick(v.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`${v.title}, ${platformLabel(p.platform)}, ${up ? 'posted' : 'scheduled'}`}
                        style={({ hovered }: { pressed: boolean; hovered?: boolean }) => ({
                          flexDirection: compact ? 'column' : 'row',
                          alignItems: compact ? 'flex-start' : 'center',
                          gap: compact ? 3 : 6,
                          paddingVertical: 4,
                          paddingHorizontal: 4,
                          borderRadius: 6,
                          backgroundColor: v.id === selectedId ? c.brzTint : hovered ? c.hover : 'transparent',
                        })}
                      >
                        <PlatformCode platform={p.platform} />
                        <Text numberOfLines={compact ? 2 : 1} style={[{ minWidth: 0, fontSize: 12.5, lineHeight: 16, color: up ? c.ink3 : c.ink }, compact ? { alignSelf: 'stretch' } : { flex: 1 }]}>
                          {up ? '✓ ' : ''}
                          {v.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
            <View style={{ width: 78, paddingLeft: 12, paddingVertical: 8, gap: 2 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: c.ink, fontVariant: ['tabular-nums'] }}>{weekText(w)}</Text>
              {verdict ? <Text style={{ fontSize: 12.5, color: verdict.missed ? c.crit : c.ink3 }}>{verdict.text}</Text> : null}
            </View>
          </View>
        );
      })}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 6, marginTop: 14 }}>
        {PLATFORMS.map((p) => (
          <View key={p.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <PlatformCode platform={p.key} />
            <Text style={{ fontSize: 12.5, color: c.ink3 }}>{p.label}</Text>
          </View>
        ))}
        <Text style={{ fontSize: 12.5, color: c.ink3 }}>· ✓ posted · {hasGoal ? 'the week column counts posts against your weekly goal' : 'set a weekly goal on Numbers and each week is counted against it'}</Text>
      </View>
    </View>
  );
}
