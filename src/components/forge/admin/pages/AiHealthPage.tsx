import { useState } from 'react';
import { Text, View } from 'react-native';

import { useCrm } from '@/components/forge/admin/crm-theme';
import { Block, BlockGrid, Chip, FootNote, Full, HeroFigures, PageHeader, Row, Rows, when, type Figure } from '@/components/forge/admin/crm-ui';
import { fetchAiDeploys, fetchAiHealth } from '@/data/ai-health-live';
import {
  DRIFT_ALARM,
  driftRowLine,
  driftVerdict,
  latestDeploys,
  type AiDeploys,
  type DriftRow,
  type DriftVerdict,
} from '@/domain/admin/ai-drift-core';
import {
  AI_ALERT_KINDS,
  AI_ALERT_LABEL,
  canaryVerdict,
  coolingDownUntil,
  failureRateLine,
  fnLine,
  helpfulShare,
  msText,
  pctText,
  usdText,
  type AiFnRow,
  type AiHealth,
  type CanaryVerdict,
} from '@/domain/admin/ai-health-core';
import { shortDay } from '@/domain/admin/series';
import { useQuery } from '@/lib/useQuery';

/**
 * /admin → Business → AI HEALTH, the web line's Business CRM page (AI Road to 10 Sprint 1, PL-4; migration 0269
 * `admin_ai_health`). Build 11 draws the same read as its own Forge page, `/admin-ai`, linked from the old
 * Creator Dashboard; the web's /admin is the CRM, so here it is a CRM page (`/admin?p=aihealth`), built from the
 * CRM's own kit and palettes, and `/admin-ai` opens it.
 *
 * "Is the AI working, and what does it really cost?" — per function, per day: calls, failures, refunds, p50/p95
 * latency, credits charged and real cost; the daily canary; reservations nobody settled; the thumbs; and which of
 * the four alerts would page right now. Audit G1: the 09-21 key drain was found by testers. This page, and the
 * push behind it, is how the PO finds the next one first.
 *
 * ══ A FAILED LOAD SAYS IT FAILED ══
 *
 * One read, one state. While it is out the page shows the skeleton; when it fails it says so, with Try again — it
 * never falls back to a page of zeros, because "0 failures" drawn for "could not read the failures" is the exact
 * blindness this page exists to end. `shapeAiHealth` throws on an answer it cannot read for the same reason.
 *
 * ══ THE GATE ══ `admin_guard()` inside the function is the boundary; `admin.tsx` / `admin-ai.tsx` redirect a
 * non-operator (fail closed) as a courtesy.
 *
 * Its own window (Today / 7D / 30D / 90D), not the CRM's range: the read covers 1–90 days, so a "1Y" would be a
 * 90-day answer under a one-year label. Rows and figures only — no chart. Colours only from `useCrm().c`.
 */

type WindowKey = '1d' | '7d' | '30d' | '90d';
const WINDOWS: { key: WindowKey; label: string; days: number }[] = [
  { key: '1d', label: 'Today', days: 1 },
  { key: '7d', label: '7D', days: 7 },
  { key: '30d', label: '30D', days: 30 },
  { key: '90d', label: '90D', days: 90 },
];

export function AiHealthPage({ tz }: { tz: string }) {
  const [win, setWin] = useState<WindowKey>('7d');
  const days = WINDOWS.find((w) => w.key === win)?.days ?? 7;
  const health = useQuery(() => fetchAiHealth(days, tz), [days, tz]);
  const h = health.data;

  return (
    <View>
      <PageHeader
        title="AI health"
        purpose="Is the AI working, and what does it really cost?"
        note="Failures, refunds, latency and real cost per AI function, the daily canary, and whether people found the answers helpful."
      />
      <Row style={{ paddingBottom: 32 }}>
        {WINDOWS.map((w) => (
          <Chip key={w.key} label={w.label} on={w.key === win} onPress={() => setWin(w.key)} />
        ))}
      </Row>

      {health.loading && !h ? (
        <Block label="AI health" state={{ loading: true }} />
      ) : health.error || !h ? (
        <Block
          label="AI health didn’t load"
          state={{ error: `${health.error ?? 'Nothing came back.'} Nothing below is known until it loads — this is not a quiet day.`, onRetry: health.refetch }}
        />
      ) : (
        <Loaded h={h} />
      )}
    </View>
  );
}

function Loaded({ h }: { h: AiHealth }) {
  const { c } = useCrm();
  // The snapshot's own clock, not the browser's — every "ago" and every cooldown is relative to when it was read.
  const nowMs = Date.parse(h.generatedAt);
  const verdict = canaryVerdict(h.canary, nowMs);
  const span = h.days === 1 ? 'Today' : `Last ${h.days} days`;
  const tripped = new Set(h.alerts.tripped.map((a) => a.kind));

  const hero: Figure = { label: 'AI calls', value: h.totals.calls.toLocaleString('en-US'), note: `${span} · bucketed in ${h.tz}` };
  const figures: Figure[] = [
    { label: 'Failed', value: h.totals.failures.toLocaleString('en-US'), note: `${pctText(h.totals.failures, h.totals.calls)} of calls`, tone: h.totals.failures > 0 ? 'bad' : null },
    { label: 'Refunded', value: h.totals.refunds.toLocaleString('en-US'), note: 'Credits given back' },
    { label: 'Cancelled by the athlete', value: h.totals.cancelled.toLocaleString('en-US') },
    { label: 'Credits charged', value: h.totals.credits.toLocaleString('en-US') },
    // What rode free (0272, MA12, Sprint 2) — only once the server counts it; a read from before 0272 has `waived: null`
    // and the three figures are simply absent (unknown, never zeros).
    ...(h.waived
      ? [
          { label: 'Free daily uses (after the month ran out)', value: h.waived.floor.toLocaleString('en-US') },
          { label: 'Typed builds not charged twice', value: h.waived.typedBuild.toLocaleString('en-US') },
          { label: 'Photo tidy passes at no charge', value: h.waived.photoTidy.toLocaleString('en-US') },
        ]
      : []),
    { label: 'Real cost', value: usdText(h.totals.costUsd), note: 'Per-model rates' },
  ];

  const lineColor = (state: 'ok' | 'bad' | 'quiet') => (state === 'ok' ? c.good : state === 'bad' ? c.crit : c.ink3);
  const vState = verdict.state === 'ok' ? 'ok' : verdict.state === 'off' || verdict.state === 'never' ? 'quiet' : 'bad';

  return (
    <View>
      <HeroFigures hero={hero} figures={figures} />
      <BlockGrid>
        {/* ── Right now: the four alerts ── */}
        <Block label="Right now" sub={`What would page the operators this hour. Each alert at most once every ${h.thresholds.alertCooldownHours} h.`}>
          <View style={{ paddingTop: 14, gap: 4 }}>
            {h.alerts.tripped.length ? (
              h.alerts.tripped.map((a) => (
                <Text key={a.kind} style={{ fontSize: 14, lineHeight: 21, color: lineColor('bad') }}>
                  ✕ {a.line}
                </Text>
              ))
            ) : (
              <Text style={{ fontSize: 14, lineHeight: 21, color: lineColor('ok') }}>✓ All clear</Text>
            )}
          </View>
          <Rows
            items={[
              ...AI_ALERT_KINDS.map((k) => {
                const sent = h.alerts.lastSent[k];
                const until = coolingDownUntil(sent, nowMs, h.thresholds.alertCooldownHours);
                return {
                  label: AI_ALERT_LABEL[k],
                  value: tripped.has(k) ? 'TRIPPED' : 'clear',
                  note: [sent ? `last sent ${when(sent, true)}` : 'never sent', until ? `quiet until ${when(new Date(until).toISOString(), true)}` : null]
                    .filter(Boolean)
                    .join(' · '),
                };
              }),
              {
                label: 'Failure rate, last 24 h',
                value: pctText(h.last24h.failures, h.last24h.calls),
                note: failureRateLine(h.last24h.calls, h.last24h.failures, h.thresholds),
              },
              {
                label: 'Who is told',
                value: h.alerts.adminsWithDevice.toLocaleString('en-US'),
                note:
                  h.alerts.adminsWithDevice > 0
                    ? `operator${h.alerts.adminsWithDevice === 1 ? '' : 's'} with a live device`
                    : 'nobody — no operator has a live device, so alerts wait',
              },
            ]}
          />
        </Block>

        {/* ── The canary ── */}
        <Block label="Canary" sub="One tiny call per model, once a day. Records the kind of answer, the status and the time — never the error text.">
          <Text style={{ paddingTop: 14, fontSize: 14, lineHeight: 21, color: lineColor(vState) }}>{verdictLine(verdict)}</Text>
          {h.canary.last ? (
            <Rows
              items={h.canary.last.results.map((p) => ({
                label: p.model,
                value: p.kind === 'ok' ? 'ok' : p.kind.replace(/_/g, ' '),
                note: [p.status != null ? String(p.status) : null, msText(p.latencyMs)].filter(Boolean).join(' · '),
              }))}
            />
          ) : null}
          {h.canary.lastOkAt && verdict.state !== 'ok' ? <Rows items={[{ label: 'Last good run', value: when(h.canary.lastOkAt, true) }]} /> : null}
          {h.canary.recent.length > 1 ? (
            <Text style={{ marginTop: 12, fontSize: 12.5, lineHeight: 19, color: c.ink3 }}>
              {h.canary.recent.map((r) => `${when(r.ranAt)} ${r.ok ? 'ok' : `${r.failed} failed`}`).join(' · ')}
            </Text>
          ) : null}
        </Block>

        {/* ── Deployed code (0271, Sprint 2 PL-5): the nightly deployed-vs-repo check, on its own read ── */}
        <Full full>
          <DeployedCodeBlock />
        </Full>

        {/* ── By function ── */}
        <Full full>
          <Block
            label="By function"
            sub={`${span} · bucketed in ${h.tz}`}
            state={{ emptyMsg: h.byFn.length === 0 ? 'No AI calls in this window.' : null }}
            foot={
              h.totals.legacyCalls > 0
                ? `${h.totals.legacyCalls} call${h.totals.legacyCalls === 1 ? '' : 's'} came through the old meter, which recorded no function and no latency. They are listed by action as Legacy — never guessed into a function, because day, program and message are shared.`
                : null
            }
          >
            <View style={{ paddingTop: 4 }}>
              {h.byFn.map((r) => (
                <FnRowView key={r.key} r={r} />
              ))}
            </View>
          </Block>
        </Full>

        {/* ── By day ── */}
        {h.byDay.length ? (
          <Full full>
            <Block label="By day" sub="Newest first. Only days with calls are listed.">
              <View style={{ paddingTop: 4 }}>
                {h.byDay.map((day) => (
                  <View key={day.d} style={{ paddingVertical: 12, gap: 6, borderBottomWidth: 1, borderBottomColor: c.line }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', color: c.ink3 }}>{shortDay(day.d)}</Text>
                    {day.rows.map((r) => (
                      <View key={`${day.d}-${r.key}`} style={{ gap: 2 }}>
                        <Text style={{ fontSize: 14, color: c.ink }} numberOfLines={1}>
                          {r.label} · {r.calls}
                        </Text>
                        <Text style={{ fontSize: 12.5, lineHeight: 18, color: c.ink2, fontVariant: ['tabular-nums'] }}>{fnLine(r)}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </Block>
          </Full>
        ) : null}

        {/* ── Unsettled ── */}
        <Block
          label="Unsettled reservations"
          sub={`Reserved more than ${h.thresholds.unsettledMinutes} min ago and never settled: the function was stopped between the model and the meter. The credits are still held — nothing sweeps them yet.`}
        >
          <Rows
            items={[
              { label: 'Unsettled', value: h.unsettled.count.toLocaleString('en-US') },
              ...(h.unsettled.oldestAt ? [{ label: 'Oldest', value: when(h.unsettled.oldestAt, true) }] : []),
            ]}
          />
        </Block>

        {/* ── Thumbs ── */}
        <Block
          label="Was it helpful?"
          sub={`${span}. One vote per person per answer; a changed vote counts once.`}
          state={{ emptyMsg: h.feedbackTotals.length === 0 ? 'No votes in this window.' : null }}
          foot={h.feedback.length > h.feedbackTotals.length ? h.feedback.map((f) => `${shortDay(f.d)} ${f.label} ${f.up}/${f.down}`).join(' · ') : null}
        >
          <Rows
            items={h.feedbackTotals.map((f) => {
              const share = helpfulShare(f.up, f.down);
              return { label: f.label, value: share != null ? `${share}%` : '—', note: `${f.up} helpful · ${f.down} not` };
            })}
          />
        </Block>
      </BlockGrid>

      <FootNote>
        A call failed when its outcome was anything but ok — a refusal, a timeout, an unreadable answer — except the athlete’s own cancel, or a
        server guard stopping it on purpose (refunded, and counted as a refund). Calls from before the new meter have no outcome; for those, the old
        “uncharged” flag is the record, and they were charged anyway (nothing could be refunded then). Real cost is the per-model rate map, not the
        old flat rate. Aggregates only: nobody is named on this page.
      </FootNote>
    </View>
  );
}

function FnRowView({ r }: { r: AiFnRow }) {
  const { c } = useCrm();
  return (
    <View style={{ paddingVertical: 12, gap: 3, borderBottomWidth: 1, borderBottomColor: c.line }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <Text
          style={{ flex: 1, minWidth: 0, fontSize: 14, color: r.legacy ? c.ink2 : c.ink, fontWeight: r.legacy ? '500' : '600', fontStyle: r.legacy ? 'italic' : 'normal' }}
          numberOfLines={1}
        >
          {r.label}
        </Text>
        <Text style={{ flexShrink: 0, fontSize: 14, color: c.ink, fontVariant: ['tabular-nums'] }}>
          {r.calls} call{r.calls === 1 ? '' : 's'}
        </Text>
      </View>
      <Text style={{ fontSize: 12.5, lineHeight: 18, color: c.ink2, fontVariant: ['tabular-nums'] }}>{fnLine(r)}</Text>
      <Text style={{ fontSize: 12, color: c.ink3 }}>{r.fn ?? `action: ${r.action ?? 'unknown'} · before the new meter`}</Text>
    </View>
  );
}

/**
 * "Deployed code" — every function whose deployed file is not the repo's (0271, scripts/deploy-ai/drift.mjs; build 11's
 * `DeployedCodeCard`). Its own read: a database without 0271 fails this block alone, and says so — never an "all clear".
 */
function DeployedCodeBlock() {
  const q = useQuery(() => fetchAiDeploys(), []);
  const d = q.data;
  return (
    <Block
      label="Deployed code"
      sub="Each night every function's deployed file is compared with the repo (main, which mirrors build 11). Anything that is not the same is listed."
      state={
        q.loading && !d
          ? { loading: true }
          : q.error || !d
            ? { error: `${q.error ?? 'Nothing came back.'} Not known until it loads — this is not an all clear.`, onRetry: q.refetch }
            : undefined
      }
    >
      {d ? <DeployedCode d={d} /> : null}
    </Block>
  );
}

function DeployedCode({ d }: { d: AiDeploys }) {
  const { c } = useCrm();
  const v = driftVerdict(d, Date.parse(d.generatedAt));
  const rows = v.state === 'never' ? [] : v.flagged;
  const recent = latestDeploys(d.deploys);
  const tone = v.state === 'clean' ? c.good : v.state === 'never' ? c.ink3 : c.crit;
  return (
    <View>
      <Text style={{ paddingTop: 14, fontSize: 14, lineHeight: 21, color: tone }}>{driftLine(v)}</Text>
      {rows.length ? (
        <View style={{ paddingTop: 4 }}>
          {rows.map((r) => (
            <DriftRowView key={r.slug} r={r} />
          ))}
        </View>
      ) : null}
      {recent.length ? (
        <Rows items={recent.map((x) => ({ label: x.slug, value: `v${x.version}`, note: `${x.method} · ${when(x.deployedAt, true)}` }))} />
      ) : (
        <Text style={{ marginTop: 12, fontSize: 12.5, lineHeight: 19, color: c.ink3 }}>
          No deploy recorded yet — the deploy-ai skill records each one (slug, version, hash, commit).
        </Text>
      )}
      {d.runs7d ? (
        <Text style={{ marginTop: 12, fontSize: 12.5, lineHeight: 19, color: c.ink3 }}>
          {d.runs7d} nightly check{d.runs7d === 1 ? '' : 's'} in the last 7 days.
        </Text>
      ) : null}
    </View>
  );
}

function DriftRowView({ r }: { r: DriftRow }) {
  const { c } = useCrm();
  const alarm = DRIFT_ALARM.includes(r.status);
  return (
    <View style={{ paddingVertical: 12, gap: 3, borderBottomWidth: 1, borderBottomColor: c.line }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <Text style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: alarm ? '600' : '500', color: alarm ? c.ink : c.ink2 }} numberOfLines={1}>
          {r.slug}
        </Text>
        <Text style={{ flexShrink: 0, fontSize: 13, color: alarm ? c.crit : c.ink3 }}>{driftRowLine(r)}</Text>
      </View>
      {r.detail ? <Text style={{ fontSize: 12.5, lineHeight: 18, color: c.ink2 }}>{r.detail}</Text> : null}
    </View>
  );
}

function driftLine(v: DriftVerdict): string {
  switch (v.state) {
    case 'never':
      return 'No check has run yet — the nightly job starts once its GitHub secret is set.';
    case 'stale':
      return `✕ No check for ${v.hours} h — the nightly job missed. Last ran ${when(v.at, true)}.`;
    case 'clean':
      return `✓ Every deployed function matches the repo · checked ${when(v.at, true)}`;
    case 'alarm':
      return `✕ ${v.alarms.length} of ${v.count} function${v.count === 1 ? '' : 's'} not matching the repo · checked ${when(v.at, true)}`;
  }
}

function verdictLine(v: CanaryVerdict): string {
  switch (v.state) {
    case 'off':
      return 'Off — switched on by setting ai_ops_config.canary_url (about $0.004 a month).';
    case 'never':
      return 'On, no run yet — the first one is at 15:40 UTC.';
    case 'ok':
      return `✓ Every model answered · ${when(v.at, true)}`;
    case 'failed':
      return `✕ ${v.failing.map((p) => `${p.model} ${p.kind.replace(/_/g, ' ')}`).join(', ')} · ${when(v.at, true)}`;
    case 'stale':
      return `✕ No run for ${v.hours} h — the daily job missed. Last ran ${when(v.at, true)}.`;
  }
}
