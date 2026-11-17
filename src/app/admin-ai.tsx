import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ScreenBackground } from '@/components/screen-background';
import { RangeControl, SectionCard, StatLine } from '@/components/forge/admin/charts';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flText } from '@/constants/foundation';
import { dashboardTz, isAppAdmin } from '@/data/admin-live';
import { fetchAiHealth } from '@/data/ai-health-live';
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
 * /admin → AI HEALTH (AI Road to 10, Sprint 1 — PL-4; migration 0269 `admin_ai_health`).
 *
 * "Is the AI working, and what does it really cost?" — per function, per day: calls, failures, refunds, p50/p95
 * latency, credits charged and real cost; the daily canary; reservations nobody settled; the thumbs; and which of
 * the four alerts would page right now. Audit G1: the 09-21 key drain was found by testers. This page, and the
 * push behind it, is how the PO finds the next one first.
 *
 * ══ A FAILED LOAD SAYS IT FAILED ══
 *
 * One read, one state. While it is out the page shows a spinner; when it fails it says so, with Try again — it
 * never falls back to a page of zeros, because "0 failures" drawn for "could not read the failures" is the exact
 * blindness this page exists to end. `shapeAiHealth` throws on an answer it cannot read for the same reason.
 *
 * ══ THE GATE ══ Same as /admin: `admin_guard()` inside the function is the boundary; `isAppAdmin()` here is the
 * courtesy redirect, and it fails closed.
 *
 * Tables and stat rows only — no chart (nothing here is a trend you read off a line yet). Existing tokens only:
 * layout lands in both themes, colour comes from the role tokens (Alabaster: bronze only where it is earned).
 */

type RangeKey = '1d' | '7d' | '30d' | '90d';
const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: '1d', label: 'Today', days: 1 },
  { key: '7d', label: '7D', days: 7 },
  { key: '30d', label: '30D', days: 30 },
  { key: '90d', label: '90D', days: 90 },
];

export default function AdminAiScreen() {
  const router = useRouter();
  const [range, setRange] = useState<RangeKey>('7d');
  const days = RANGES.find((r) => r.key === range)?.days ?? 7;
  const tz = dashboardTz();

  const admin = useQuery(() => isAppAdmin(), []);
  const health = useQuery(() => fetchAiHealth(days, tz), [days, tz]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/admin'));

  if (admin.loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={flColor.bronze400} />
      </View>
    );
  }
  if (admin.data !== true) return <Redirect href="/" />;

  const h = health.data;

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.legacyMountains} imageOpacity={0.18} overlay={{ flat: 'rgba(5,5,5,0.72)' }} />
      <AppBar title="AI health" onBack={goBack} />

      <ScrollView
        keyboardDismissMode={KEYBOARD_DISMISS_MODE}
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.rangeRow}>
          <RangeControl options={RANGES.map((r) => ({ key: r.key, label: r.label }))} value={range} onChange={setRange} />
        </View>

        {health.loading && !h ? (
          <View style={styles.loading}>
            <ActivityIndicator color={flColor.bronze400} />
          </View>
        ) : health.error || !h ? (
          <SectionCard title="AI health didn’t load">
            <Text style={styles.failText}>{health.error ?? 'Nothing came back.'}</Text>
            <Text style={styles.failSub}>Nothing below is known until it loads — this is not a quiet day.</Text>
            <Pressable
              onPress={health.refetch}
              accessibilityRole="button"
              accessibilityLabel="Try loading AI health again"
              style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
            >
              <Text style={styles.actionLabel}>Try again</Text>
            </Pressable>
          </SectionCard>
        ) : (
          <Loaded h={h} />
        )}
      </ScrollView>
    </View>
  );
}

function Loaded({ h }: { h: AiHealth }) {
  // The snapshot's own clock, not the phone's — every "ago" and every cooldown is relative to when it was read.
  const nowMs = Date.parse(h.generatedAt);
  const verdict = canaryVerdict(h.canary, nowMs);
  const span = h.days === 1 ? 'Today' : `Last ${h.days} days`;
  const tripped = new Set(h.alerts.tripped.map((a) => a.kind));

  return (
    <>
      {/* ── Right now: the four alerts ───────────────────────────────────────── */}
      <SectionCard
        title="Right now"
        subtitle={`What would page the operators this hour. Each alert at most once every ${h.thresholds.alertCooldownHours} h.`}
      >
        {h.alerts.tripped.length ? (
          h.alerts.tripped.map((a) => (
            <Text key={a.kind} style={styles.trippedLine}>
              ✕ {a.line}
            </Text>
          ))
        ) : (
          <Text style={styles.clearLine}>✓ All clear</Text>
        )}
        <View style={styles.rule} />
        {AI_ALERT_KINDS.map((k) => {
          const sent = h.alerts.lastSent[k];
          const until = coolingDownUntil(sent, nowMs, h.thresholds.alertCooldownHours);
          return (
            <StatLine
              key={k}
              label={AI_ALERT_LABEL[k]}
              value={[
                tripped.has(k) ? 'TRIPPED' : 'clear',
                sent ? `last sent ${when(sent)}` : 'never sent',
                until ? `quiet until ${when(new Date(until).toISOString())}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            />
          );
        })}
        <StatLine label="Failure rate, last 24 h" value={failureRateLine(h.last24h.calls, h.last24h.failures, h.thresholds)} />
        <StatLine
          label="Who is told"
          value={
            h.alerts.adminsWithDevice > 0
              ? `${h.alerts.adminsWithDevice} operator${h.alerts.adminsWithDevice === 1 ? '' : 's'} with a live device`
              : 'nobody — no operator has a live device, so alerts wait'
          }
        />
      </SectionCard>

      {/* ── The canary ───────────────────────────────────────────────────────── */}
      <SectionCard
        title="Canary"
        subtitle="One tiny call per model, once a day. Records the kind of answer, the status and the time — never the error text."
      >
        <Text style={verdict.state === 'ok' ? styles.clearLine : verdict.state === 'off' || verdict.state === 'never' ? styles.quietLine : styles.trippedLine}>
          {verdictLine(verdict)}
        </Text>
        {h.canary.last
          ? h.canary.last.results.map((p) => (
              <StatLine
                key={p.model}
                label={p.model}
                value={[p.kind === 'ok' ? 'ok' : p.kind.replace(/_/g, ' '), p.status != null ? String(p.status) : null, msText(p.latencyMs)]
                  .filter(Boolean)
                  .join(' · ')}
              />
            ))
          : null}
        {h.canary.lastOkAt && verdict.state !== 'ok' ? <StatLine label="Last good run" value={when(h.canary.lastOkAt)} /> : null}
        {h.canary.recent.length > 1 ? (
          <Text style={styles.footnote}>
            {h.canary.recent.map((r) => `${dayOf(r.ranAt)} ${r.ok ? 'ok' : `${r.failed} failed`}`).join(' · ')}
          </Text>
        ) : null}
      </SectionCard>

      {/* ── By function ──────────────────────────────────────────────────────── */}
      <SectionCard title="By function" subtitle={`${span} · bucketed in ${h.tz}`}>
        <StatLine label="Calls" value={h.totals.calls} />
        <StatLine label="Failed" value={`${h.totals.failures} (${pctText(h.totals.failures, h.totals.calls)})`} />
        <StatLine label="Refunded" value={h.totals.refunds} />
        {h.totals.cancelled ? <StatLine label="Cancelled by the athlete" value={h.totals.cancelled} /> : null}
        <StatLine label="Credits charged" value={h.totals.credits} />
        <StatLine label="Real cost" value={usdText(h.totals.costUsd)} />
        {h.byFn.length === 0 ? (
          <Text style={styles.quietLine}>No AI calls in this window.</Text>
        ) : (
          <View style={styles.list}>
            {h.byFn.map((r) => (
              <FnRowView key={r.key} r={r} />
            ))}
          </View>
        )}
        {h.totals.legacyCalls > 0 ? (
          <Text style={styles.footnote}>
            {h.totals.legacyCalls} call{h.totals.legacyCalls === 1 ? '' : 's'} came through the old meter, which recorded no function and no
            latency. They are listed by action as Legacy — never guessed into a function, because day, program and message are shared.
          </Text>
        ) : null}
      </SectionCard>

      {/* ── By day ───────────────────────────────────────────────────────────── */}
      {h.byDay.length ? (
        <SectionCard title="By day" subtitle="Newest first. Only days with calls are listed.">
          {h.byDay.map((day) => (
            <View key={day.d} style={styles.day}>
              <Text style={styles.dayLabel}>{shortDay(day.d)}</Text>
              {day.rows.map((r) => (
                <View key={`${day.d}-${r.key}`} style={styles.dayRow}>
                  <Text style={styles.dayFn} numberOfLines={1}>
                    {r.label} · {r.calls}
                  </Text>
                  <Text style={styles.meta}>{fnLine(r)}</Text>
                </View>
              ))}
            </View>
          ))}
        </SectionCard>
      ) : null}

      {/* ── Unsettled ────────────────────────────────────────────────────────── */}
      <SectionCard
        title="Unsettled reservations"
        subtitle={`Reserved more than ${h.thresholds.unsettledMinutes} min ago and never settled: the function was stopped between the model and the meter. The credits are still held — nothing sweeps them yet.`}
      >
        <StatLine label="Unsettled" value={h.unsettled.count} />
        {h.unsettled.oldestAt ? <StatLine label="Oldest" value={when(h.unsettled.oldestAt)} /> : null}
      </SectionCard>

      {/* ── Thumbs ───────────────────────────────────────────────────────────── */}
      <SectionCard title="Was it helpful?" subtitle={`${span}. One vote per person per answer; a changed vote counts once.`}>
        {h.feedbackTotals.length === 0 ? (
          <Text style={styles.quietLine}>No votes in this window.</Text>
        ) : (
          h.feedbackTotals.map((f) => {
            const share = helpfulShare(f.up, f.down);
            return (
              <StatLine
                key={f.feature}
                label={f.label}
                value={`${f.up} helpful · ${f.down} not${share != null ? ` · ${share}%` : ''}`}
              />
            );
          })
        )}
        {h.feedback.length > h.feedbackTotals.length ? (
          <Text style={styles.footnote}>
            {h.feedback.map((f) => `${shortDay(f.d)} ${f.label} ${f.up}/${f.down}`).join(' · ')}
          </Text>
        ) : null}
      </SectionCard>

      <Text style={styles.disclaimer}>
        A call <Text style={styles.disclaimerStrong}>failed</Text> when its outcome was anything but ok — a refusal, a timeout, an
        unreadable answer — except the athlete’s own cancel. Calls from before the new meter have no outcome; for those, the old
        “uncharged” flag is the record, and they were charged anyway (nothing could be refunded then). Real cost is the per-model
        rate map, not the old flat rate. Aggregates only: nobody is named on this page.
      </Text>
    </>
  );
}

function FnRowView({ r }: { r: AiFnRow }) {
  return (
    <View style={styles.fnRow}>
      <View style={styles.fnHead}>
        <Text style={[styles.fnLabel, r.legacy && styles.fnLegacy]} numberOfLines={1}>
          {r.label}
        </Text>
        <Text style={styles.fnCalls}>
          {r.calls} call{r.calls === 1 ? '' : 's'}
        </Text>
      </View>
      <Text style={styles.meta}>{fnLine(r)}</Text>
      <Text style={styles.slug}>{r.fn ?? `action: ${r.action ?? 'unknown'} · before the new meter`}</Text>
    </View>
  );
}

function verdictLine(v: CanaryVerdict): string {
  switch (v.state) {
    case 'off':
      return 'Off — switched on by setting ai_ops_config.canary_url (about $0.004 a month).';
    case 'never':
      return 'On, no run yet — the first one is at 15:40 UTC.';
    case 'ok':
      return `✓ Every model answered · ${when(v.at)}`;
    case 'failed':
      return `✕ ${v.failing.map((p) => `${p.model} ${p.kind.replace(/_/g, ' ')}`).join(', ')} · ${when(v.at)}`;
    case 'stale':
      return `✕ No run for ${v.hours} h — the daily job missed. Last ran ${when(v.at)}.`;
  }
}

/** "Nov 16" for an instant, on the device's clock. */
function dayOf(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** "Nov 16, 3:40 PM" — the device's clock, like /admin's lists. */
function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: flColor.base },
  boot: { flex: 1, backgroundColor: flColor.base, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 16, paddingBottom: 56, gap: 14 },
  rangeRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 4 },
  loading: { paddingVertical: 40, alignItems: 'center' },

  failText: { color: flColor.redMuted, fontSize: 13, lineHeight: 19 },
  failSub: { color: flText.tertiary, fontSize: 11.5, lineHeight: 16 },
  action: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: flRadius.sm,
    borderWidth: 1,
    borderColor: flColor.accentBorder,
    backgroundColor: flColor.bronzeTint,
  },
  actionPressed: { opacity: 0.7 },
  actionLabel: { fontSize: 11.5, fontWeight: '600', color: flColor.bronzeInk },

  // State lines: the glyph carries the meaning, the colour only reinforces it.
  trippedLine: { color: flColor.redMuted, fontSize: 12.5, lineHeight: 18 },
  clearLine: { color: flColor.greenMuted, fontSize: 12.5, lineHeight: 18 },
  quietLine: { color: flText.tertiary, fontSize: 12, lineHeight: 17 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: flColor.divider, marginVertical: 2 },
  footnote: { color: flText.tertiary, fontSize: 10.5, lineHeight: 15 },

  list: { marginTop: 4 },
  fnRow: { paddingVertical: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: flColor.divider, gap: 3 },
  fnHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  fnLabel: { flex: 1, minWidth: 0, color: flText.primary, fontSize: 13, fontWeight: '600' },
  fnLegacy: { color: flText.secondary, fontStyle: 'italic', fontWeight: '500' },
  fnCalls: { flexShrink: 0, color: flText.primary, fontSize: 12.5, fontVariant: ['tabular-nums'] },
  meta: { color: flText.secondary, fontSize: 11.5, lineHeight: 16, fontVariant: ['tabular-nums'] },
  slug: { color: flText.tertiary, fontSize: 10.5 },

  day: { paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: flColor.divider, gap: 6 },
  dayLabel: { color: flColor.labelInk, fontSize: 10.5, letterSpacing: 1.1, textTransform: 'uppercase' },
  dayRow: { gap: 2 },
  dayFn: { color: flText.primary, fontSize: 12.5 },

  disclaimer: { color: flText.tertiary, fontSize: 10.5, lineHeight: 16, marginTop: 4 },
  disclaimerStrong: { color: flText.secondary, fontFamily: flFont.displayMedium },
});
