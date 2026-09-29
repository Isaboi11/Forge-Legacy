import { useState } from 'react';
import { Text, View } from 'react-native';

import { useCrm } from '@/components/forge/admin/crm-theme';
import {
  Bars,
  Block,
  BlockGrid,
  Chart,
  DISPLAY,
  ErrorLine,
  Full,
  HeroFigures,
  PageHeader,
  qState,
  Reviews,
  Rows,
  SectionLabel,
  useToast,
  when,
  type Figure,
} from '@/components/forge/admin/crm-ui';
import type { PageProps } from '@/components/forge/admin/pages/types';
import { fetchAppStore, fetchWaitlist, runAscSync } from '@/data/crm-live';
import { deltaNote, int, lastLabel, RANGE_INFO, rollWeekly } from '@/domain/admin/briefing';
import { appStoreNote, ascState, parseSyncMessage } from '@/domain/admin/notes/appstore';
import { useQuery } from '@/lib/useQuery';

const EMPTY = 'Nothing synced from Apple yet. Run a sync to pull in downloads and reviews.';
const PART_LABEL: Record<string, string> = { sales: 'sales', reviews: 'reviews', rating: 'the rating', key: 'the key' };

/** Time only when it was today ("8:02 AM"), else the date ("Sep 27, 8:02 AM"). */
function syncTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  if (d.toDateString() === new Date().toDateString()) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return when(iso, true);
}

const oneDecimal = (v: number) => (Math.round(v * 10) / 10).toString();

/** Downloads, ratings and reviews from Apple (AA-D17), plus the website waitlist. */
export function AppStorePage({ range, days, tz, go }: PageProps) {
  const { c } = useCrm();
  const toast = useToast();
  const q = useQuery(() => fetchAppStore(days), [days]);
  const wl = useQuery(() => fetchWaitlist(days, tz), [days, tz]);
  const [syncing, setSyncing] = useState(false);
  const s = q.data;
  const last = lastLabel(range);

  const sync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await runAscSync();
      if (!res.configured) toast(`Apple isn’t connected yet${res.missing?.length ? `: missing ${res.missing.join(', ')}` : ''}.`);
      else if (res.ok) toast(`Synced · ${int(res.downloads ?? 0)} downloads, ${int(res.reviews ?? 0)} reviews`);
      else toast(`Sync finished with problems: ${(res.errors ?? []).join(' · ') || 'see Last sync'}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'App Store sync failed.');
    } finally {
      setSyncing(false);
      q.refetch();
    }
  };

  const state = s ? ascState(s.last_sync) : null;
  const parts = parseSyncMessage(s?.last_sync?.message);
  const failedParts = parts.failed.map((f) => f.part);
  // No public rating = before launch (the design's "prelaunch" state).
  const avg = s?.rating?.avg ?? null;

  const note = s && state
    ? appStoreNote({
        state,
        period: RANGE_INFO[range].label,
        days: s.days,
        downloads: s.downloads,
        rating: avg,
        reviewStars: s.reviews.map((r) => r.rating),
        failedParts: failedParts.map((p) => PART_LABEL[p] ?? p),
      })
    : null;

  const waitlist = (
    <Block
      label={state === 'notConnected' ? 'Website waitlist' : 'Website waitlist · forgelegacy.app'}
      link="Open testers"
      onLink={() => go('contacts', 'tester')}
      foot="Each signup is also a Tester in Contacts."
      state={qState(wl, wl.data && wl.data.total === 0 ? 'No one has signed up on the website yet.' : null)}
    >
      {wl.data ? (
        <Rows
          items={[
            { label: 'Signups', value: int(wl.data.total) },
            { label: 'Invited', value: int(wl.data.invited) },
            { label: 'Pending', value: int(wl.data.total - wl.data.invited) },
            ...(state === 'notConnected' ? [] : [{ label: `Signed up in the ${last}`, value: int(wl.data.in_window) }]),
          ]}
        />
      ) : null}
    </Block>
  );

  // ── Not connected: the setup steps, then the waitlist (which does not need Apple) ──
  if (state === 'notConnected') {
    const missing = parts.missing;
    const keyMissing = missing.some((m) => m === 'ASC_KEY_ID' || m === 'ASC_ISSUER_ID');
    const step = (text: string, isMissing: boolean) => ({ text, state: isMissing ? 'Missing' : 'To do', color: isMissing ? c.warn : c.ink3 });
    const steps = [
      step('In App Store Connect, open Users and Access → Integrations', false),
      step('Make a key with the Sales and Customer Reviews roles', keyMissing),
      step('Add the .p8 file, Key ID, Issuer ID and vendor number as secrets on the asc-sync function', missing.length > 0),
      step('Run the first sync', false),
    ];
    return (
      <View>
        <PageHeader
          title="App Store"
          purpose="Downloads, ratings and reviews from Apple, plus the website waitlist."
          note={note}
          actions={[{ label: syncing ? 'Checking…' : 'Check connection', onPress: sync, busy: syncing }]}
        />
        <View style={{ gap: 18, maxWidth: 720, paddingTop: 8, paddingBottom: 40 }}>
          <SectionLabel label="Connect App Store Connect" />
          <Text style={{ fontSize: 16, lineHeight: 25.6, color: c.ink2 }}>
            Downloads, ratings and reviews come from Apple. To pull them in you need to make an API key once. It takes about ten minutes.
          </Text>
          <View>
            {steps.map((st, i) => (
              <View key={st.text} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line }}>
                <Text style={{ width: 32, fontFamily: DISPLAY, fontSize: 20, color: c.ink3 }}>{i + 1}</Text>
                <Text style={{ flex: 1, minWidth: 0, fontSize: 15, color: c.ink }}>{st.text}</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: st.color }}>{st.state}</Text>
              </View>
            ))}
          </View>
          {s?.last_sync?.message ? (
            <Text style={{ fontSize: 12.5, lineHeight: 19.4, color: c.ink3 }}>
              Last check {syncTime(s.last_sync.ran_at)}: {s.last_sync.message}
            </Text>
          ) : null}
        </View>
        <BlockGrid>{waitlist}</BlockGrid>
      </View>
    );
  }

  // ── Connected / partial ──
  let figures: Figure[];
  if (s) {
    const d = deltaNote(s.downloads, s.downloads_prev, range);
    const ls = s.last_sync;
    figures = [
      { label: 'Downloads', value: int(s.downloads), note: d?.text, tone: d?.tone },
      { label: 'Re-downloads', value: int(s.redownloads), note: `${last[0].toUpperCase()}${last.slice(1)}` },
      { label: 'Updates', value: int(s.updates), note: `${last[0].toUpperCase()}${last.slice(1)}` },
      avg == null
        ? { label: 'Rating', value: '—', note: 'No public rating before launch' }
        : { label: 'Rating', value: `★ ${avg.toFixed(1)}`, note: s.rating?.count != null ? `${int(s.rating.count)} ratings` : undefined },
      { label: 'All-time downloads', value: int(s.downloads_all), note: 'Since launch' },
      syncing
        ? { label: 'Last sync', value: 'Now', note: 'Loading sales, ratings, reviews' }
        : {
            label: 'Last sync',
            value: ls ? syncTime(ls.ran_at) : '—',
            note: !ls
              ? undefined
              : failedParts.length
                ? `${failedParts.map((p) => PART_LABEL[p] ?? p).join(', ').replace(/^./, (x) => x.toUpperCase())} failed`
                : 'Sales, ratings and reviews loaded',
            tone: failedParts.length ? 'bad' : null,
          },
    ];
  } else {
    figures = ['Downloads', 'Re-downloads', 'Updates', 'Rating', 'All-time downloads', 'Last sync'].map((label) => ({ label, value: '—' }));
  }

  const weekly = range === '1Y';
  const dl = s ? { values: s.series.map((x) => x.downloads), days: s.series.map((x) => x.d) } : null;
  const dlSeries = dl && weekly ? rollWeekly(dl.values, dl.days) : dl;
  const w = wl.data ? { values: wl.data.series.map((x) => x.n), days: wl.data.series.map((x) => x.d) } : null;
  const wlSeries = w && weekly ? rollWeekly(w.values, w.days) : w;

  const failed = !!q.error && !s;
  const nothing = s ? s.downloads_all === 0 && s.reviews.length === 0 : false;
  const failOf = (part: string) => parts.failed.find((f) => f.part === part);
  const lastOk = s?.last_ok_at ? ` What’s shown is from the sync at ${syncTime(s.last_ok_at)}.` : '';
  const reviewsFail = state === 'partial' ? failOf('reviews') : undefined;
  const salesFail = state === 'partial' ? failOf('sales') : undefined;

  return (
    <View>
      <PageHeader
        title="App Store"
        purpose="Downloads, ratings and reviews from Apple, plus the website waitlist."
        note={note}
        actions={[{ label: syncing ? 'Syncing…' : 'Sync now', onPress: sync, busy: syncing }]}
      />
      <HeroFigures hero={figures[0]} figures={figures.slice(1)} />
      <BlockGrid>
        <Full full>
          <Block
            label="Downloads per day"
            state={failed ? { error: `Couldn’t load App Store data. ${q.error}`, onRetry: q.refetch } : qState(q, nothing ? EMPTY : null)}
            skeleton="chart"
          >
            {salesFail && s?.last_sync ? (
              <ErrorLine>
                Apple refused the sales request at {syncTime(s.last_sync.ran_at)} ({salesFail.text}).{lastOk}
              </ErrorLine>
            ) : null}
            {dlSeries ? <Chart values={dlSeries.values} days={dlSeries.days} fmt={int} weekly={weekly} /> : null}
          </Block>
        </Full>
        {failed ? null : (
          <Block label="Top countries" state={qState(q, nothing ? EMPTY : s && !s.by_country.length ? `No downloads by country in the ${last}.` : null)}>
            {s ? <Bars items={s.by_country.map((x) => ({ label: x.country, value: x.n }))} /> : null}
          </Block>
        )}
        {failed ? null : (
          <Block label="Latest reviews" state={qState(q, s && !s.reviews.length && !reviewsFail ? (nothing ? EMPTY : 'No written reviews yet.') : null)}>
            {reviewsFail && s?.last_sync ? (
              <ErrorLine>
                Apple refused the reviews request at {syncTime(s.last_sync.ran_at)} ({reviewsFail.text}).{lastOk}
              </ErrorLine>
            ) : null}
            {s ? (
              <Reviews
                items={s.reviews.slice(0, 5).map((r) => ({
                  id: r.id,
                  rating: r.rating,
                  title: r.title,
                  text: r.body,
                  meta: [r.nickname, r.territory, when(r.created_at)].filter(Boolean).join(' · '),
                }))}
              />
            ) : null}
          </Block>
        )}
        {waitlist}
        <Block label="Waitlist signups per day" state={qState(wl, wl.data && wl.data.total === 0 ? 'No one has signed up on the website yet.' : null)} skeleton="chart">
          {wlSeries ? <Chart values={wlSeries.values} days={wlSeries.days} fmt={oneDecimal} weekly={weekly} /> : null}
        </Block>
      </BlockGrid>
    </View>
  );
}
