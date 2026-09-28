import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AdminBarChart, AdminLineChart } from '@/components/forge/admin/charts';
import {
  Block,
  Btn,
  Columns,
  deltaSub,
  Empty,
  ErrorText,
  Kpis,
  ListRow,
  Note,
  PageHead,
  QueryGate,
  RowMeta,
  RowTitle,
  when,
} from '@/components/forge/admin/crm-ui';
import type { PageProps } from '@/components/forge/admin/pages/types';
import { fetchAppStore, fetchWaitlist, runAscSync, type AscSyncResult } from '@/data/crm-live';
import { groupedNumber } from '@/domain/admin/chart-core';
import { column, rangeLabel } from '@/domain/admin/series';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { flText } from '@/constants/foundation';

/** The four secrets `asc-sync` reads (AA-D17). `ASC_APP_ID` is optional and defaults to Forge's app. */
const ASC_SECRETS = ['ASC_KEY_ID', 'ASC_ISSUER_ID', 'ASC_PRIVATE_KEY', 'ASC_VENDOR_NUMBER'];

/** Summarised from Docs/App-Store-Connect-Key-Setup.md — the doc keeps the role discussion. */
const CONNECT_STEPS = [
  'App Store Connect → Users and Access → Integrations → Team Keys → +. Name it "Forge CRM sync", role Sales (Admin if you also want reviews).',
  'Download the .p8 file (Apple allows this once) and copy the Key ID and the Issuer ID.',
  'Payments and Financial Reports → copy the Vendor Number (starts with 8).',
  'Supabase → Edge Functions → Secrets: add ASC_KEY_ID, ASC_ISSUER_ID, ASC_PRIVATE_KEY (the whole .p8, BEGIN/END lines included) and ASC_VENDOR_NUMBER.',
  'Deploy a function named exactly asc-sync from supabase/functions/asc-sync/index.ts, with Verify JWT left ON.',
  'Press Sync now above. The result names anything still missing or refused.',
];

function stars(n: number): string {
  const r = Math.max(0, Math.min(5, Math.round(n)));
  return '★'.repeat(r) + '☆'.repeat(5 - r);
}

function syncSummary(r: AscSyncResult): string {
  if (!r.configured) return `Not configured: missing ${(r.missing ?? []).join(', ') || 'secrets'}.`;
  const parts = [
    r.days_fetched != null ? `days ${r.days_fetched}` : null,
    r.downloads != null ? `downloads ${groupedNumber(r.downloads)}` : null,
    r.reviews != null ? `reviews ${groupedNumber(r.reviews)}` : null,
  ].filter(Boolean);
  return `${r.ok ? 'Synced' : 'Synced with problems'}: ${parts.join(' · ') || 'nothing new'}.`;
}

interface SyncState {
  busy: boolean;
  result: AscSyncResult | null;
  error: string | null;
}

/**
 * Downloads, ratings and reviews from App Store Connect (AA-D17: only via the `asc-sync` function —
 * the key never touches the client), plus the landing site's TestFlight waitlist.
 */
export function AppStorePage({ range, days, tz, go }: PageProps) {
  const q = useQuery(() => fetchAppStore(days), [days]);
  const wl = useQuery(() => fetchWaitlist(days, tz), [days, tz]);
  const [sync, setSync] = useState<SyncState>({ busy: false, result: null, error: null });
  const { refetch } = q;

  const onSync = async () => {
    setSync({ busy: true, result: null, error: null });
    try {
      // Apple's reports go back further, but 60 days keeps one sync inside the function's time limit.
      const result = await runAscSync(Math.min(60, days));
      setSync({ busy: false, result, error: null });
    } catch (e) {
      setSync({ busy: false, result: null, error: errorMessage(e) });
    }
    refetch();
  };

  const a = q.data;
  const note = rangeLabel(range);
  const needsConnect = (a != null && a.last_sync == null) || sync.result?.configured === false;
  const missing = sync.result?.configured === false ? sync.result.missing ?? [] : null;
  const dl = a ? deltaSub(a.downloads, a.downloads_prev, note) : null;
  const w = wl.data;

  return (
    <View style={{ gap: 28 }}>
      <PageHead
        title="App Store"
        lede="Downloads, ratings and reviews from App Store Connect, and the website's TestFlight waitlist."
        right={<Btn label="Sync now" kind="primary" busy={sync.busy} onPress={onSync} />}
      />
      {sync.error ? <ErrorText>{sync.error}</ErrorText> : null}
      {sync.result ? (
        <>
          {sync.result.ok ? <Note>{syncSummary(sync.result)}</Note> : <ErrorText>{syncSummary(sync.result)}</ErrorText>}
          {sync.result.errors?.length ? <ErrorText>{sync.result.errors.join(' · ')}</ErrorText> : null}
        </>
      ) : null}

      <QueryGate state={q}>
        {a ? (
          <>
            {needsConnect ? (
              <Block label="Connect App Store Connect" hint="Once, about 15 minutes. Full steps: Docs/App-Store-Connect-Key-Setup.md.">
                {CONNECT_STEPS.map((step, i) => (
                  <Text key={i} style={st.step}>
                    {i + 1}. {step}
                  </Text>
                ))}
                <Note>
                  {missing
                    ? `Missing secrets: ${missing.length ? missing.join(', ') : 'none reported'}.`
                    : `Secrets it needs: ${ASC_SECRETS.join(', ')}. Press Sync now to see which are missing.`}
                </Note>
              </Block>
            ) : null}

            <Kpis
              items={[
                { label: 'Downloads', value: groupedNumber(a.downloads), sub: dl?.sub, dir: dl?.dir },
                { label: 'Re-downloads', value: groupedNumber(a.redownloads) },
                { label: 'Updates', value: groupedNumber(a.updates) },
                {
                  label: 'Rating',
                  value: a.rating?.avg != null ? `★ ${a.rating.avg.toFixed(1)}` : '—',
                  sub: a.rating?.count != null ? `${groupedNumber(a.rating.count)} ratings` : 'none synced yet',
                },
                { label: 'All-time downloads', value: groupedNumber(a.downloads_all) },
              ]}
            />

            {/* Apple publishes each day the following day, so the last day or two read low until they settle. */}
            <Block label="Downloads per day" hint="First-time downloads. The latest one or two days fill in as Apple publishes them.">
              <AdminLineChart values={column(a.series, 'downloads')} days={a.series.map((s) => s.d)} />
            </Block>

            <Columns>
              <Block label="Top countries" hint="Downloads in this window.">
                <AdminBarChart rows={a.by_country.map((c) => ({ label: c.country, value: c.n }))} />
              </Block>
              <Block label="Latest reviews">
                {a.reviews.length ? (
                  a.reviews.map((r) => (
                    <ListRow key={r.id}>
                      <RowTitle>
                        {stars(r.rating)}
                        {r.title ? `  ${r.title}` : ''}
                      </RowTitle>
                      {r.body ? <Text style={st.body}>{r.body}</Text> : null}
                      <RowMeta>{[r.nickname, r.territory, when(r.created_at)].filter(Boolean).join(' · ')}</RowMeta>
                    </ListRow>
                  ))
                ) : (
                  <Empty>No reviews synced yet.</Empty>
                )}
              </Block>
            </Columns>

            <Note>
              Last sync: {a.last_sync ? `${when(a.last_sync.ran_at, true)} · ${a.last_sync.ok ? 'ok' : 'failed'}` : 'never'}
              {a.last_sync?.message ? ` — ${a.last_sync.message}` : ''}
              {a.last_ok_at && a.last_sync && !a.last_sync.ok ? ` · last good sync ${when(a.last_ok_at, true)}` : ''}
            </Note>
          </>
        ) : null}
      </QueryGate>

      <Block label="Website waitlist (forgelegacy.app)" right={<Btn label="Open testers" small onPress={() => go('contacts', 'tester')} />}>
        <QueryGate state={wl}>
          {w ? (
            <>
              <Kpis
                items={[
                  { label: 'Total signups', value: groupedNumber(w.total) },
                  { label: 'Invited', value: groupedNumber(w.invited) },
                  { label: 'Pending', value: groupedNumber(w.total - w.invited), sub: 'not invited yet' },
                  { label: 'In this window', value: groupedNumber(w.in_window) },
                ]}
              />
              <AdminLineChart values={column(w.series, 'n')} days={w.series.map((s) => s.d)} title="Signups per day" />
              {/* by_source is all-time, not the window. */}
              <AdminBarChart rows={w.by_source.map((s) => ({ label: s.source || 'unknown', value: s.n }))} />
              <Note>Each signup is also a Tester in Contacts. Sources are all-time.</Note>
            </>
          ) : null}
        </QueryGate>
      </Block>
    </View>
  );
}

const st = StyleSheet.create({
  step: { color: flText.secondary, fontSize: 12.5, lineHeight: 19 },
  body: { color: flText.secondary, fontSize: 12.5, lineHeight: 18 },
});
