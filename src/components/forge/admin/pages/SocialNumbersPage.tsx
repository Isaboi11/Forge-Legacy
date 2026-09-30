import * as Clipboard from 'expo-clipboard';
import { useMemo, useState } from 'react';
import { Linking, Platform as RNPlatform, Text, View } from 'react-native';

import {
  Block,
  BlockGrid,
  Btn,
  Chart,
  DeleteBtn,
  ErrorLine,
  Field,
  FootNote,
  Full,
  HeroFigures,
  HoverRow,
  Input,
  LinkText,
  PageHeader,
  Panel,
  Row,
  Rows,
  Skeleton,
  useLayout,
  useToast,
  useTwoTap,
  when,
  type Figure,
} from '@/components/forge/admin/crm-ui';
import { useCrm } from '@/components/forge/admin/crm-theme';
import { DateInput } from '@/components/forge/admin/DateInput';
import { Select } from '@/components/forge/admin/Select';
import type { PageProps } from '@/components/forge/admin/pages/types';
import { GoalBar, PlatformChips, StackField, usePlatformFilter, useSocial } from '@/components/forge/admin/social-ui';
import { SOCIAL_SETUP_DOC, deleteItem, disconnectAccount, fetchSyncStatus, runSocialSync, saveFollowers, saveGoal, saveItem, startConnect } from '@/data/social-live';
import { deltaNote, int, lastLabel, RANGE_INFO } from '@/domain/admin/briefing';
import { money, todayKey } from '@/domain/admin/crm-core';
import {
  PLATFORMS,
  accountState,
  addDays,
  ago,
  followerSeries,
  followers,
  intOrDash,
  pctOrDash,
  platformLabel,
  platformLink,
  postedIn,
  share,
  sumIn,
  syncLine,
  tagLine,
  topVideos,
  totals,
  videoMap,
  weekCount,
  weekStart,
  type Platform,
  type SocialData,
  type TopSort,
} from '@/domain/admin/social-core';
import { useQuery } from '@/lib/useQuery';

/**
 * Social → Numbers (migration 0247, AA-D25/D26/D27): what the owner's TikTok and Instagram did, and what
 * they brought in. Everything is derived from the one `admin_social_media` read, so the platform chips
 * and the date range are filters over rows already here.
 *
 * ══ WHAT IS NOT KNOWN IS SAID, NOT ZEROED ══
 *
 * TikTok shares no watch time. An account connected this week has no "30 days ago". The app is not on
 * the App Store yet, so Apple has no download count per link. Each of those is a "—" with the reason
 * beside it; none is a 0.
 */

const WHAT_COMES_IN: Record<Platform, string> = {
  tiktok: 'Followers, and each video’s views, likes, comments and shares. TikTok does not share watch time or saves, so “watched” is typed on the video.',
  instagram: 'Followers, reach, and each reel’s views, watch time, likes, comments, shares and saves. Instagram can run up to two days behind.',
};

const NUM_COL = 92;

export function SocialNumbersPage({ range, days, go, arg }: PageProps) {
  const { c } = useCrm();
  const { lg } = useLayout();
  const toast = useToast();
  const { armed, tap } = useTwoTap();
  const social = useSocial();
  const status = useQuery(() => fetchSyncStatus(), []);
  const [plat, setPlat] = usePlatformFilter();
  const [sort, setSort] = useState<TopSort>('views');
  const [busy, setBusy] = useState<string | null>(null);
  const [incomeForm, setIncomeForm] = useState<{ platform: Platform; what: string; amount: string; day: string } | null>(null);
  const [goalForm, setGoalForm] = useState<Record<Platform, { per: string; target: string; date: string }> | null>(null);
  const [typed, setTyped] = useState<Partial<Record<Platform, string>>>({});

  const d = social.data;
  const today = useMemo(() => todayKey(social.at ? new Date(social.at) : new Date()), [social.at]);

  const view = useMemo(() => {
    if (!d) return null;
    const vm = videoMap(d.videos);
    const posted = postedIn(d, plat, days, today);
    return {
      tt: totals(posted, vm),
      fol: followers(d.daily, plat, days, today),
      series: followerSeries(d.daily, plat, days, today),
      clicks: sumIn(d.clicks, (r) => r.clicks, plat, days, today),
      signups: sumIn(d.waitlist, (r) => r.n, plat, days, today),
      top: topVideos(d, plat, 30, today, sort),
    };
  }, [d, plat, days, today, sort]);

  const copy = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      toast('Link copied. Paste it into that platform’s bio.');
    } catch {
      toast('Couldn’t copy. Your browser blocked the clipboard.');
    }
  };

  const sync = async () => {
    setBusy('sync');
    try {
      const res = await runSocialSync();
      const parts = res.results.map((r) => (r.ok ? `${platformLabel(r.platform)}: ${r.posts} posts${r.new_videos ? `, ${r.new_videos} new` : ''}` : `${platformLabel(r.platform)}: ${r.message ?? 'failed'}`));
      toast(parts.length ? `Synced. ${parts.join(' · ')}.` : 'Nothing to sync. Connect an account first.');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'The sync failed.');
    } finally {
      setBusy(null);
      social.refetch();
    }
  };

  const connect = async (p: Platform) => {
    setBusy(`connect-${p}`);
    try {
      const returnTo = RNPlatform.OS === 'web' && typeof window !== 'undefined' ? `${window.location.origin}/admin` : 'https://forgelegacy.expo.app/admin';
      const res = await startConnect(p, returnTo);
      if (!res.ok) {
        toast(`${platformLabel(p)}’s app keys are not on the server yet (${res.missing.join(', ')}). The steps are in ${SOCIAL_SETUP_DOC}.`);
        return;
      }
      if (RNPlatform.OS === 'web' && typeof window !== 'undefined') window.location.assign(res.url);
      else await Linking.openURL(res.url);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t start the sign-in.');
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async (p: Platform) => {
    setBusy(`disc-${p}`);
    try {
      await disconnectAccount(p);
      toast(`${platformLabel(p)} disconnected. Its numbers stay and stop updating.`);
      social.refetch();
    } catch {
      toast('Couldn’t disconnect. Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  };

  const saveTyped = async (p: Platform) => {
    const n = Number((typed[p] ?? '').replace(/,/g, ''));
    if (!Number.isFinite(n) || n < 0 || (typed[p] ?? '').trim() === '') return toast('Type the follower count as a number.');
    setBusy(`typed-${p}`);
    try {
      await saveFollowers(p, today, Math.round(n));
      setTyped((m) => ({ ...m, [p]: '' }));
      toast(`Saved ${int(n)} ${platformLabel(p)} followers for today.`);
      social.refetch();
    } catch {
      toast('Couldn’t save. Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  };

  const saveIncome = async () => {
    if (!incomeForm) return;
    const amount = Number(incomeForm.amount.replace(/[$,]/g, ''));
    if (!incomeForm.what.trim() || !Number.isFinite(amount) || incomeForm.amount.trim() === '') return toast('Say what it was for and how much.');
    setBusy('income');
    try {
      await saveItem('income', null, { platform: incomeForm.platform, what: incomeForm.what.trim(), amount_usd: amount, day: incomeForm.day || today });
      setIncomeForm(null);
      toast('Income added');
      social.refetch();
    } catch {
      toast('Couldn’t save. Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  };

  const removeIncome = async (id: string) => {
    setBusy(id);
    try {
      await deleteItem('income', id);
      social.refetch();
    } catch {
      toast('Couldn’t delete. Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  };

  const openGoals = (data: SocialData) =>
    setGoalForm(
      Object.fromEntries(
        PLATFORMS.map((p) => {
          const g = data.goals.find((x) => x.platform === p.key);
          return [p.key, { per: String(g?.posts_per_week ?? 0), target: g?.follower_target != null ? String(g.follower_target) : '', date: g?.target_date ?? '' }];
        }),
      ) as Record<Platform, { per: string; target: string; date: string }>,
    );

  const saveGoals = async () => {
    if (!goalForm) return;
    setBusy('goals');
    try {
      for (const p of PLATFORMS) {
        const g = goalForm[p.key];
        const target = g.target.trim() === '' ? null : Math.max(0, Math.round(Number(g.target.replace(/,/g, '')) || 0));
        await saveGoal(p.key, Math.max(0, Math.round(Number(g.per) || 0)), target, g.date || null);
      }
      setGoalForm(null);
      toast('Goals saved');
      social.refetch();
    } catch {
      toast('Couldn’t save. Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  };

  // ── Header ──
  const anyConnected = !!d?.accounts.some((a) => a.connected);
  const note = d ? `What your posts did in the ${lastLabel(range)}, and what they brought in. ${syncLine(d.accounts, social.at)}` : null;
  const back = arg?.match(/^(connected|failed)-(tiktok|instagram)$/);

  if (social.error && !d) {
    return (
      <View>
        <PageHeader title="Numbers" purpose="What the TikTok and Instagram accounts did." />
        <ErrorLine onRetry={social.refetch}>{`Couldn’t load Social. ${social.error}`}</ErrorLine>
      </View>
    );
  }

  if (!d || !view) {
    return (
      <View>
        <PageHeader title="Numbers" purpose="What the TikTok and Instagram accounts did." />
        <Skeleton />
      </View>
    );
  }

  const { tt, fol, series, clicks, signups, top } = view;
  const shown = PLATFORMS.filter((p) => plat === 'all' || plat === p.key);

  // ── Figures ──
  const dn = fol.gained != null && fol.prev != null ? deltaNote(fol.gained, fol.prev, range) : null;
  const hero: Figure = {
    label: 'Followers gained',
    value: fol.gained != null ? `${fol.gained < 0 ? '−' : '+'}${int(Math.abs(fol.gained))}` : '—',
    note:
      fol.gained == null
        ? fol.now != null
          ? 'Growth shows after a second day of numbers.'
          : 'No follower numbers yet.'
        : fol.since
          ? `Since ${when(fol.since)}, when the numbers start`
          : (dn?.text ?? `In the ${lastLabel(range)}`),
    tone: fol.gained != null && !fol.since ? (dn?.tone ?? null) : null,
  };
  const watchedNote = tt.watched == null ? 'No watch figure in this range' : `${tt.watchedOf} of ${tt.posts} ${tt.posts === 1 ? 'post' : 'posts'} report it`;
  const figures: Figure[] = [
    { label: 'Followers now', value: intOrDash(fol.now), note: plat === 'all' ? 'Both platforms' : platformLabel(plat) },
    { label: 'Views', value: tt.posts ? int(tt.views) : '—', note: `${tt.posts} ${tt.posts === 1 ? 'post' : 'posts'}` },
    { label: 'Average watched', value: pctOrDash(tt.watched), note: watchedNote },
    { label: 'Shares per 1,000 views', value: tt.sharesPerK == null ? '—' : tt.sharesPerK.toFixed(1), note: 'The rate that travels' },
    { label: 'Link clicks', value: int(clicks), note: 'From the link in your bio' },
    { label: 'Early-access signups', value: int(signups), note: 'Came through your links' },
  ];

  // ── Notices ──
  const notices = PLATFORMS.flatMap((p) => {
    const a = d.accounts.find((x) => x.platform === p.key);
    if (plat !== 'all' && plat !== p.key) return [];
    if (accountState(a) === 'expired') return [{ key: `x-${p.key}`, text: `${p.label} is not connected, so its numbers have stopped updating.`, act: `Connect ${p.label}`, on: () => void connect(p.key) }];
    if (a?.connected && a.last_sync_ok === false) return [{ key: `e-${p.key}`, text: `${p.label}’s last sync failed${a.last_sync_message ? `: ${a.last_sync_message}` : '.'}`, act: 'Sync now', on: () => void sync() }];
    return [];
  });

  const num = (text: string, dim?: boolean) => <Text style={{ width: NUM_COL, textAlign: 'right', fontSize: 14, color: dim ? c.ink3 : c.ink, fontVariant: ['tabular-nums'] }}>{text}</Text>;
  const head = (text: string, w = NUM_COL) => <Text style={{ width: w, textAlign: 'right', fontSize: 12, color: c.ink3 }}>{text}</Text>;
  const sortHead = (k: TopSort, label: string) => (
    <Text
      onPress={() => setSort(k)}
      accessibilityRole="button"
      accessibilityState={{ selected: sort === k }}
      style={{ width: NUM_COL, textAlign: 'right', fontSize: 12, color: sort === k ? c.ink : c.ink3, fontWeight: sort === k ? '600' : '400' }}
    >
      {label}
      {sort === k ? ' ↓' : ''}
    </Text>
  );

  const week = weekStart(today);
  const incomeRows = d.income.filter((i) => plat === 'all' || i.platform === plat);
  const incomeInRange = incomeRows.filter((i) => i.day > addDays(today, -days) && i.day <= today);

  const accountsBlock = (
    <Full full>
      <Block label="Connected accounts" foot={status.error ? status.error : null}>
        {PLATFORMS.map((p) => {
          const a = d.accounts.find((x) => x.platform === p.key);
          const st = accountState(a);
          const missing = status.data?.missing?.[p.key] ?? [];
          const synced = a?.last_sync_at ? ago(a.last_sync_at, social.at) : null;
          return (
            <View key={p.key} style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: c.line, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: c.ink }}>
                    {p.label}
                    {a?.username ? <Text style={{ fontWeight: '400', color: c.ink2 }}>{` · @${a.username.replace(/^@/, '')}`}</Text> : null}
                  </Text>
                  <Text style={{ fontSize: 13, lineHeight: 19.5, color: c.ink3, maxWidth: 720 }}>
                    {st === 'connected'
                      ? `${synced ? `Synced ${synced}. ` : 'Connected. No sync has run yet. '}${WHAT_COMES_IN[p.key]}`
                      : st === 'expired'
                        ? 'Not connected. The numbers already here stay; nothing new is coming in.'
                        : missing.length
                          ? `Not connected. ${p.label}’s app keys are not on the server yet (${missing.join(', ')}). The steps are in ${SOCIAL_SETUP_DOC}.`
                          : `Not connected. ${WHAT_COMES_IN[p.key]}`}
                  </Text>
                </View>
                {st === 'connected' ? (
                  <DeleteBtn armed={armed === `disc-${p.key}`} busy={busy === `disc-${p.key}`} label="Disconnect" size="sm" onPress={() => tap(`disc-${p.key}`, () => void disconnect(p.key))} />
                ) : (
                  <Btn label={`Connect ${p.label}`} size="sm" kind={anyConnected ? 'quiet' : 'primary'} busy={busy === `connect-${p.key}`} onPress={() => void connect(p.key)} />
                )}
              </View>
              {st !== 'connected' ? (
                <Row gap={10}>
                  <Input
                    value={typed[p.key] ?? ''}
                    onChangeText={(v) => setTyped((m) => ({ ...m, [p.key]: v }))}
                    placeholder="Followers today"
                    keyboardType="number-pad"
                    accessibilityLabel={`${p.label} followers today`}
                    style={{ width: 170 }}
                  />
                  <Btn label="Save" size="sm" busy={busy === `typed-${p.key}`} onPress={() => void saveTyped(p.key)} />
                  <Text style={{ fontSize: 12.5, color: c.ink3, flexShrink: 1 }}>Until it is connected, you can type the count by hand.</Text>
                </Row>
              ) : null}
            </View>
          );
        })}
      </Block>
    </Full>
  );

  return (
    <View>
      <PageHeader
        title="Numbers"
        purpose="What the TikTok and Instagram accounts did, and what they brought in."
        note={note}
        actions={anyConnected ? [{ label: busy === 'sync' ? 'Syncing…' : 'Sync now', onPress: () => void sync(), busy: busy === 'sync' }] : undefined}
      />

      <View style={{ marginBottom: 28 }}>
        <PlatformChips value={plat} onChange={setPlat} />
      </View>

      {back ? (
        <View
          style={{
            marginBottom: 24,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 10,
            backgroundColor: back[1] === 'connected' ? c.brzTint : c.warnTint,
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'baseline',
            columnGap: 14,
            rowGap: 6,
          }}
        >
          <Text style={{ fontSize: 14, lineHeight: 21.7, color: c.ink, flexShrink: 1 }}>
            {back[1] === 'connected'
              ? `${platformLabel(back[2] as Platform)} is connected. Its numbers are in, and will update every day.`
              : `${platformLabel(back[2] as Platform)} didn’t connect. Nothing was changed. Try again, and check the steps in ${SOCIAL_SETUP_DOC}.`}
          </Text>
          <LinkText label="OK" onPress={() => go('social')} />
        </View>
      ) : null}

      {notices.map((n) => (
        <View
          key={n.key}
          style={{ marginBottom: 24, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, backgroundColor: c.warnTint, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 14, rowGap: 6 }}
        >
          <Text style={{ fontSize: 14, lineHeight: 21.7, color: c.ink, flexShrink: 1 }}>{n.text}</Text>
          <Text onPress={n.on} accessibilityRole="button" style={{ fontSize: 13.5, fontWeight: '600', color: c.ink, borderBottomWidth: 1, borderBottomColor: c.fieldBd }}>
            {n.act}
          </Text>
        </View>
      ))}

      <HeroFigures hero={hero} figures={figures} />

      <BlockGrid>
        {!anyConnected ? accountsBlock : null}

        <Full full>
          <Block
            label={`Followers, ${plat === 'all' ? 'both platforms' : platformLabel(plat)}`}
            state={{ emptyMsg: series.values.length < 2 ? 'The line starts once there are two days of follower numbers. It begins the day an account is connected, because neither platform hands over its history.' : null }}
          >
            <Chart zoom values={series.values} days={series.days} fmt={(v) => int(v)} weekly={series.weekly} />
          </Block>
        </Full>

        <Full full>
          <Block label="By platform">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: c.line }}>
              <Text style={{ flex: 1, fontSize: 12, color: c.ink3 }}>Platform</Text>
              {head('Followers')}
              {head('Gained')}
              {head('Posts')}
              {head('Views')}
              {lg ? head('Watched') : null}
              {lg ? head('Link clicks') : null}
              {head('Last synced', 120)}
            </View>
            {PLATFORMS.map((p) => {
              const a = d.accounts.find((x) => x.platform === p.key);
              const pf = followers(d.daily, p.key, days, today);
              const pt = totals(postedIn(d, p.key, days, today), videoMap(d.videos));
              const st = accountState(a);
              return (
                <HoverRow key={p.key} onPress={() => setPlat(plat === p.key ? 'all' : p.key)} selected={plat === p.key} label={p.label} style={{ paddingVertical: 13 }}>
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={{ fontSize: 14, color: c.ink }}>{p.label}</Text>
                    {a?.username ? <Text style={{ fontSize: 12.5, color: c.ink3 }}>@{a.username.replace(/^@/, '')}</Text> : null}
                  </View>
                  {num(intOrDash(pf.now), pf.now == null)}
                  {num(pf.gained == null ? '—' : `${pf.gained < 0 ? '−' : '+'}${int(Math.abs(pf.gained))}`, pf.gained == null)}
                  {num(String(pt.posts))}
                  {num(pt.posts ? int(pt.views) : '—', !pt.posts)}
                  {lg ? num(pctOrDash(pt.watched), pt.watched == null) : null}
                  {lg ? num(int(sumIn(d.clicks, (r) => r.clicks, p.key, days, today))) : null}
                  <Text style={{ width: 120, textAlign: 'right', fontSize: 13, color: st === 'connected' ? c.ink2 : c.warn }}>{st === 'connected' ? (ago(a?.last_sync_at, social.at) ?? 'Not yet') : 'Not connected'}</Text>
                </HoverRow>
              );
            })}
          </Block>
        </Full>

        <Full full>
          <Block
            label="Top videos, last 30 days"
            link="All content"
            onLink={() => go('content')}
            state={{ emptyMsg: top.length ? null : `Nothing posted${plat === 'all' ? '' : ` on ${platformLabel(plat)}`} in the last 30 days.` }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: c.line }}>
              <Text style={{ flex: 1, fontSize: 12, color: c.ink3 }}>Video</Text>
              {head('Posted', 70)}
              {sortHead('views', 'Views')}
              {sortHead('watched', 'Watched')}
              {lg ? head('Likes') : null}
              {sortHead('shares', 'Shares / 1k')}
              {lg ? head('Saves') : null}
            </View>
            {top.slice(0, 8).map((r) => (
              <HoverRow key={r.video.id} onPress={() => go('content', r.video.id)} label={r.video.title} style={{ paddingVertical: 13 }}>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text numberOfLines={1} style={{ fontSize: 14, color: c.ink }}>
                    {r.video.title}
                  </Text>
                  <Text numberOfLines={1} style={{ fontSize: 12.5, color: r.video.topic ? c.ink3 : c.warn }}>
                    {tagLine(r.video)}
                    {r.video.topic ? ` · ${r.platforms.map(platformLabel).join(', ')}` : ''}
                  </Text>
                </View>
                <Text style={{ width: 70, textAlign: 'right', fontSize: 13, color: c.ink2 }}>{when(r.day)}</Text>
                {num(int(r.totals.views))}
                {num(pctOrDash(r.totals.watched), r.totals.watched == null)}
                {lg ? num(int(r.totals.likes)) : null}
                {num(r.totals.sharesPerK == null ? '—' : r.totals.sharesPerK.toFixed(1), r.totals.sharesPerK == null)}
                {lg ? num(intOrDash(r.totals.saves), r.totals.saves == null) : null}
              </HoverRow>
            ))}
          </Block>
        </Full>

        <Block
          label="From a post to the list"
          sub={`Through your ${plat === 'all' ? 'platform links' : `${platformLabel(plat)} link`}, ${lastLabel(range)}.`}
          foot="Counts only. Nothing here records who clicked. App Store downloads per platform come from Apple once the app is live; Apple leaves out any count under 5."
        >
          <Rows
            items={[
              { label: 'Views', value: tt.posts ? int(tt.views) : '—' },
              { label: 'Link clicks', value: int(clicks), note: tt.views ? `${share(clicks, tt.views)} of views` : null },
              { label: 'Early-access signups', value: int(signups), note: clicks ? `${share(signups, clicks)} of clicks` : null },
              { label: 'App Store downloads', value: '—', note: 'After launch. Apple’s count, per platform.' },
            ]}
          />
        </Block>

        <Block label="Your links" sub="One per platform. Put each in that platform’s bio. It counts the click, then sends the person on.">
          {shown.map((p) => (
            <View key={p.key} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.line, gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: c.ink }}>{p.label}</Text>
                <Text style={{ fontSize: 13, color: c.ink3, fontVariant: ['tabular-nums'] }}>{int(sumIn(d.clicks, (r) => r.clicks, p.key, days, today))} clicks</Text>
              </View>
              <Row gap={10}>
                <View style={{ paddingVertical: 5, paddingHorizontal: 9, borderRadius: 6, backgroundColor: c.field, borderWidth: 1, borderColor: c.line, flexShrink: 1 }}>
                  <Text selectable numberOfLines={1} style={{ fontSize: 12.5, color: c.ink2, fontFamily: RNPlatform.OS === 'web' ? 'ui-monospace, Menlo, Consolas, monospace' : undefined }}>
                    {platformLink(p.key)}
                  </Text>
                </View>
                <Text onPress={() => void copy(`https://${platformLink(p.key)}`)} accessibilityRole="button" style={{ fontSize: 13.5, fontWeight: '600', color: c.ink, borderBottomWidth: 1, borderBottomColor: c.fieldBd }}>
                  Copy link
                </Text>
              </Row>
            </View>
          ))}
        </Block>

        <Block
          label="Revenue"
          link={incomeForm ? null : 'Add income'}
          onLink={() => setIncomeForm({ platform: plat === 'all' ? 'tiktok' : plat, what: '', amount: '', day: today })}
          foot="Two different kinds of money, shown side by side and never added."
        >
          {incomeForm ? (
            <Panel pad={18} gap={14} style={{ marginTop: 14 }}>
              <Row gap={12} style={{ alignItems: 'flex-end' }}>
                <Field label="Platform">
                  <Select
                    value={incomeForm.platform}
                    options={PLATFORMS.map((p) => ({ value: p.key, label: p.label }))}
                    onChange={(v) => setIncomeForm((f) => (f ? { ...f, platform: v as Platform } : f))}
                    accessibilityLabel="Platform"
                  />
                </Field>
                <Field label="Amount, USD">
                  <Input value={incomeForm.amount} onChangeText={(v) => setIncomeForm((f) => (f ? { ...f, amount: v } : f))} placeholder="150.00" keyboardType="decimal-pad" />
                </Field>
                <Field label="Date">
                  <DateInput value={incomeForm.day} onChange={(v) => setIncomeForm((f) => (f ? { ...f, day: v } : f))} accessibilityLabel="Date" />
                </Field>
              </Row>
              <StackField label="What it was for">
                <Input value={incomeForm.what} onChangeText={(v) => setIncomeForm((f) => (f ? { ...f, what: v } : f))} placeholder="Creator Rewards, September" />
              </StackField>
              <Row gap={10}>
                <Btn label="Add income" kind="primary" size="sm" busy={busy === 'income'} onPress={() => void saveIncome()} />
                <Btn label="Cancel" size="sm" onPress={() => setIncomeForm(null)} />
              </Row>
            </Panel>
          ) : null}
          <Rows
            items={[
              { label: 'App revenue from social', value: '—', note: 'After launch. Subscriptions that came through your links, gross, before Apple’s cut.' },
              {
                label: 'Platform income',
                value: incomeInRange.length
                  ? money(
                      incomeInRange.reduce((n, i) => n + Number(i.amount_usd), 0),
                      { cents: true },
                    )
                  : '—',
                note: `Payouts and brand deals in the ${lastLabel(range)}, typed by hand.`,
              },
            ]}
          />
          {incomeRows.slice(0, 6).map((i) => (
            <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: c.line }}>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text numberOfLines={1} style={{ fontSize: 14, color: c.ink2 }}>
                  {i.what}
                </Text>
                <Text style={{ fontSize: 12.5, color: c.ink3 }}>
                  {platformLabel(i.platform)} · {when(i.day)}
                </Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: c.ink, fontVariant: ['tabular-nums'] }}>{money(Number(i.amount_usd), { cents: true })}</Text>
              <DeleteBtn armed={armed === i.id} busy={busy === i.id} size="xs" onPress={() => tap(i.id, () => void removeIncome(i.id))} />
            </View>
          ))}
        </Block>

        <Block label="This week’s goals" link={goalForm ? null : 'Edit goals'} onLink={() => openGoals(d)} sub={`${when(week)} to ${when(addDays(week, 6))}`}>
          {goalForm ? (
            <Panel pad={18} gap={14} style={{ marginTop: 14 }}>
              {PLATFORMS.map((p) => (
                <Row key={p.key} gap={12} style={{ alignItems: 'flex-end' }}>
                  <Field label={`${p.label} posts a week`}>
                    <Input value={goalForm[p.key].per} onChangeText={(v) => setGoalForm((f) => (f ? { ...f, [p.key]: { ...f[p.key], per: v } } : f))} keyboardType="number-pad" />
                  </Field>
                  <Field label="Follower target">
                    <Input value={goalForm[p.key].target} onChangeText={(v) => setGoalForm((f) => (f ? { ...f, [p.key]: { ...f[p.key], target: v } } : f))} placeholder="5000" keyboardType="number-pad" />
                  </Field>
                  <Field label="By">
                    <DateInput value={goalForm[p.key].date} onChange={(v) => setGoalForm((f) => (f ? { ...f, [p.key]: { ...f[p.key], date: v } } : f))} accessibilityLabel={`${p.label} target date`} />
                  </Field>
                </Row>
              ))}
              <Row gap={10}>
                <Btn label="Save goals" kind="primary" size="sm" busy={busy === 'goals'} onPress={() => void saveGoals()} />
                <Btn label="Cancel" size="sm" onPress={() => setGoalForm(null)} />
              </Row>
            </Panel>
          ) : null}
          <View style={{ gap: 16, paddingTop: 18 }}>
            {shown.map((p) => {
              const w = weekCount(d, week, p.key, today);
              const g = d.goals.find((x) => x.platform === p.key);
              const now = followers(d.daily, p.key, days, today).now;
              return (
                <View key={p.key} style={{ gap: 16 }}>
                  <GoalBar
                    label={`${p.label} posts`}
                    text={
                      <>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: c.ink }}>
                          {w.posted} posted · {w.scheduled} scheduled
                        </Text>
                        {w.target ? ` of ${w.target}` : ' · no goal set'}
                      </>
                    }
                    solid={w.target ? (w.posted / w.target) * 100 : 0}
                    soft={w.target ? (w.scheduled / w.target) * 100 : 0}
                  />
                  {g?.follower_target ? (
                    <GoalBar
                      label={`${p.label} followers`}
                      text={
                        <>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: c.ink }}>{intOrDash(now)}</Text>
                          {` of ${int(g.follower_target)}${g.target_date ? ` by ${when(g.target_date)}` : ''}`}
                        </>
                      }
                      solid={now != null ? (now / g.follower_target) * 100 : 0}
                    />
                  ) : null}
                </View>
              );
            })}
          </View>
        </Block>

        {anyConnected ? accountsBlock : null}
      </BlockGrid>

      <FootNote>
        {`Numbers come in once a day on their own, and whenever you press Sync now. Each platform’s sign-in is kept on the server and is never shown here. The range above is ${RANGE_INFO[range].label}; Top videos always shows the last 30 days.`}
      </FootNote>
    </View>
  );
}
