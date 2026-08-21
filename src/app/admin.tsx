import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ScreenBackground } from '@/components/screen-background';
import {
  AdminBarChart,
  AdminFunnelBars,
  AdminLineChart,
  AdminStatTile,
  BucketBars,
  CohortGrid,
  RangeControl,
  SectionCard,
  StatLine,
} from '@/components/forge/admin/charts';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flText } from '@/constants/foundation';
import {
  dashboardTz,
  fetchAdminAdoption,
  fetchAdminCohorts,
  fetchAdminContent,
  fetchAdminEngagement,
  fetchAdminErrorDetail,
  fetchAdminErrors,
  fetchAdminEvents,
  fetchAdminFeedback,
  fetchAdminGrowth,
  fetchAdminOverview,
  fetchAdminSocial,
  fetchRecentSignups,
  isAppAdmin,
  setErrorStatus,
  type ErrorOccurrence,
} from '@/data/admin-live';
import { fetchAdminReports, resolveReport } from '@/data/moderation-live';
import { column, RANGES, rangeLabel, rangeToDays, type RangeKey } from '@/domain/admin/series';
import { pctOf } from '@/domain/admin/chart-core';
import { useQuery } from '@/lib/useQuery';

/**
 * The operator dashboard (migrations 0129–0133).
 *
 * Governed by `Docs/Admin-Analytics-Architecture-v1.0.md`. Everything on this screen is a POPULATION
 * AGGREGATE — AA-D2 forbids per-athlete drill-down, and that constraint is what keeps this surface
 * outside the Performance Firewall rather than in breach of it. No athlete is named anywhere here.
 *
 * ══ THE URL IS NOT THE GATE ══
 *
 * expo-router compiles every route into the bundle and `app.json` sets `web.output: "static"`, so
 * `/admin` exists as a public file on forgelegacy.expo.app no matter what this file does. The gate is
 * `admin_guard()` in Postgres: an athlete who reaches this URL gets 42501 on every query. The
 * `isAppAdmin()` check below is a courtesy that avoids rendering eight error states — it is not
 * security, and it FAILS CLOSED (an error resolves to false and redirects).
 *
 * ══ EIGHT QUERIES, NOT ONE ══
 *
 * One `useQuery` per section, so the cohort grid — the slowest of them by far — never holds up the
 * headline tiles. Each refetches independently when the range changes.
 *
 * ══ TWO DEFINITIONS OF "ACTIVE" LIVE ON THIS SCREEN AT ONCE ══
 *
 * Phase 1's sections (0130) count an athlete active when they SAVED A WORKOUT — that is all the
 * database could see before events existed, and every one of those payloads carries
 * `active_def: 'saved_workout'`. "What people open" (0133) counts an APP OPEN, from `athlete_activity`.
 * The two numbers are different on purpose and both are labelled, because silently mixing them would
 * make the same word mean two things in one scroll.
 *
 * ══ AND WHAT IT STILL CANNOT TELL YOU ══
 *
 * Event data covers only athletes who left "Help improve Forge" on, and only from the release that
 * introduced it — there is no history before that. The section states its own coverage rather than
 * letting a partial sample read as the population.
 */

export default function AdminScreen() {
  const router = useRouter();
  const [range, setRange] = useState<RangeKey>('30d');
  const days = rangeToDays(range);
  const tz = dashboardTz();

  const admin = useQuery(() => isAppAdmin(), []);

  const overview = useQuery(() => fetchAdminOverview(days, tz), [days, tz]);
  const growth = useQuery(() => fetchAdminGrowth(days, tz), [days, tz]);
  const cohorts = useQuery(() => fetchAdminCohorts(12, tz), [tz]);
  const engagement = useQuery(() => fetchAdminEngagement(days, tz), [days, tz]);
  const adoption = useQuery(() => fetchAdminAdoption(days, tz), [days, tz]);
  const content = useQuery(() => fetchAdminContent(days, 12, tz), [days, tz]);
  const social = useQuery(() => fetchAdminSocial(days, tz), [days, tz]);
  const events = useQuery(() => fetchAdminEvents(days, 15, tz), [days, tz]);
  /* Not range-scoped, deliberately: "did this person sign up yet" is not a question about the last 30
     days, and re-fetching the list every time the range chips move would answer a question nobody asked. */
  const signups = useQuery(() => fetchRecentSignups(60), []);
  /* Also not range-scoped. An unanswered bug report from six weeks ago is not less unanswered because
     the range chips say 7D — a support queue is a to-do list, not a trend. */
  const feedback = useQuery(() => fetchAdminFeedback(50, null), []);
  /* Reports (0171). Same reasoning as feedback above — deliberately NOT range-scoped, because an open
     report is not less open because the chips say 7D. */
  const reports = useQuery(() => fetchAdminReports(50, null), []);

  /* Errors (0176). ⚠ RANGE-SCOPED, and it is the one operator queue that should be — unlike a support
     ticket, a crash from six weeks ago on a build nobody is running is genuinely not a to-do item. The
     chips are how you ask "is this still happening", which is the question that matters after a fix. */
  const errors = useQuery(() => fetchAdminErrors(days, 50, null), [days]);
  /* Which bug's trail is open. One at a time: a stack trace and forty breadcrumbs are not something you
     compare side by side, and rendering fifty of them would make the screen unusable. */
  const [openFp, setOpenFp] = useState<string | null>(null);
  const detail = useQuery<ErrorOccurrence[]>(
    () => (openFp ? fetchAdminErrorDetail(openFp, 5) : Promise.resolve([])),
    [openFp],
  );

  const triage = async (fingerprint: string, status: string) => {
    try {
      await setErrorStatus(fingerprint, status);
      await errors.refetch();
    } catch {
      /* The row keeps its old status, which is the safe failure: a bug that silently reads FIXED
         because the write failed is the one outcome this queue must never produce. */
    }
  };

  const resolve = async (id: string, status: 'actioned' | 'dismissed') => {
    try {
      await resolveReport(id, status);
      await reports.refetch();
    } catch {
      /* The row stays open and visibly unresolved, which is the safe failure: a report that silently
         disappears from the queue is worse than one that refuses to close. */
    }
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/account-settings'));

  if (admin.loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={flColor.bronze400} />
      </View>
    );
  }
  // `error` is treated as `false` by isAppAdmin() itself — a guard that fails open is not a guard.
  if (admin.data !== true) return <Redirect href="/" />;

  const o = overview.data;
  const g = growth.data;
  const e = engagement.data;
  const a = adoption.data;
  const c = content.data;
  const s = social.data;
  const ev = events.data;

  const series = o?.series ?? [];
  const growthDays = (g?.series ?? []).map((r) => r.d);
  const engDays = (e?.series ?? []).map((r) => r.d);
  const note = rangeLabel(range);

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.legacyMountains} imageOpacity={0.18} overlay={{ flat: 'rgba(5,5,5,0.72)' }} />
      <AppBar title="Creator Dashboard" onBack={goBack} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.rangeRow}>
          <RangeControl options={RANGES.map((r) => ({ key: r.key, label: r.label }))} value={range} onChange={setRange} />
        </View>

        {/* ── Overview ─────────────────────────────────────────────────── */}
        <Section state={overview}>
          {o ? (
            <>
              <View style={styles.tiles}>
                <AdminStatTile label="Athletes" value={o.tiles.athletesTotal} exact />
                <AdminStatTile
                  label="Active"
                  value={o.tiles.active}
                  prev={o.tiles.activePrev}
                  deltaNote={note}
                  series={column(series, 'active')}
                />
                <AdminStatTile
                  label="New signups"
                  value={o.tiles.signups}
                  prev={o.tiles.signupsPrev}
                  deltaNote={note}
                  series={column(series, 'signups')}
                />
                <AdminStatTile
                  label="Workouts"
                  value={o.tiles.workouts}
                  prev={o.tiles.workoutsPrev}
                  deltaNote={note}
                  series={column(series, 'workouts')}
                />
                <AdminStatTile
                  label="First workout"
                  value={o.tiles.activated}
                  prev={o.tiles.activatedPrev}
                  deltaNote={note}
                />
                <AdminStatTile label="Hours logged" value={o.tiles.hoursAllTime} suffix="h" />
              </View>
              <Text style={styles.footnote}>
                {o.tiles.onboardedTotal} of {o.tiles.athletesTotal} athletes finished onboarding
                {o.tiles.athletesTotal > 0 ? ` · ${pctOf(o.tiles.onboardedTotal, o.tiles.athletesTotal)}%` : ''} ·{' '}
                {o.tiles.workoutsAllTime} workouts all time · median {o.tiles.medianWorkoutsPerActive} per active athlete
              </Text>
            </>
          ) : null}
        </Section>

        {/* ── Growth ───────────────────────────────────────────────────── */}
        <SectionCard title="Growth">
          <Section state={growth}>
            {g ? (
              <>
                <AdminLineChart values={column(g.series, 'signups')} days={growthDays} title="Signups per day" />
                <AdminLineChart values={column(g.series, 'cumulative')} days={growthDays} title="Total athletes" />
              </>
            ) : null}
          </Section>
        </SectionCard>

        {/*
          ── Newest athletes (0137) ─────────────────────────────────────
          ⚠ THE ONE SECTION ON THIS SCREEN THAT NAMES ANYBODY, and it is an amendment rather than a
          slip — `Admin-Analytics-Amendment-001` AA-D8. The chart above answers "how many", which is
          the wrong shape of answer while invitations are going out to named people one at a time.

          ⚠ ACCOUNT EXISTENCE ONLY. No workout count, no streak, no rank, no last-active time may join
          this list; AA-D2's performance prohibitions are unamended (AA-D9). If a column is ever added
          here, it is a new decision against a locked one.
        */}
        {/* ── Errors (0176) ────────────────────────────────────────────── */}
        {/*
          ⚠ ONE ROW PER BUG, NOT PER OCCURRENCE. The grouping happens in SQL (by fingerprint) and it is
          what makes this readable: 400 raw rows is a list nobody opens twice.

          ⚠ AA-D2. The list below names NOBODY — it is aggregate, like every other section on this
          screen. Identity appears one level down, inside a specific bug's trail, on the same grounds as
          `admin_feedback`: AA-D2 forbids a named athlete beside PERFORMANCE, and a crash report is not
          performance. "Three accounts are trapped in onboarding" is not actionable without the three.
        */}
        <SectionCard
          title="Errors"
          subtitle="What actually broke, grouped by bug, with the path the athlete took to get there. Range-scoped on purpose — a crash on a build nobody runs is not a to-do item."
        >
          <Section state={errors}>
            {errors.data ? (
              <>
                <StatLine label="Distinct bugs" value={errors.data.bugs} />
                <StatLine label="Occurrences" value={errors.data.occurrences} />
                <StatLine label="Athletes affected" value={errors.data.athletes} />
                <StatLine label="Fatal" value={errors.data.fatal} />
                {/*
                  ⚠ THE HONEST-ZERO LINE, AND IT READS THE OPPOSITE WAY FROM THE ONE ON FEEDBACK.
                  Zero errors is the outcome we want AND exactly what a broken reporter looks like — a
                  client half that never deployed, or `report_client_error` left un-granted. So this row
                  says which of the two it is, rather than letting a comforting 0 stand for both.
                */}
                <StatLine
                  label="Reporting"
                  value={
                    errors.data.everAny
                      ? `live · last report ${signupDate(errors.data.everAny)}`
                      : 'nothing has EVER been reported — check 0176 is applied and the client is deployed'
                  }
                />
                {errors.data.rows.length === 0 ? null : (
                  <View style={styles.feedbackList}>
                    {errors.data.rows.map((g) => (
                      <View key={g.fingerprint} style={styles.feedbackRow}>
                        <Pressable
                          onPress={() => setOpenFp(openFp === g.fingerprint ? null : g.fingerprint)}
                          accessibilityRole="button"
                          accessibilityLabel={`Show the trail for ${g.name}`}
                        >
                          <View style={styles.feedbackHead}>
                            <Text style={styles.feedbackKind}>{g.name}</Text>
                            {/* Athletes first. 200 crashes from one tester is a bad afternoon; 12 across
                                12 people is a release blocker, and reading occurrences first gets that
                                ranking backwards. */}
                            <Text style={styles.errCount} numberOfLines={1}>
                              {g.athletes === 1 ? '1 athlete' : `${g.athletes} athletes`} · {g.occurrences}×
                            </Text>
                            <Text style={styles.feedbackWhen}>{signupDate(g.lastSeen)}</Text>
                          </View>
                          <Text style={styles.errMessage}>{g.message}</Text>
                          <Text style={styles.feedbackMeta}>
                            {[
                              g.status,
                              g.screen,
                              g.source,
                              g.platform,
                              g.fatalCount > 0 ? `${g.fatalCount} fatal` : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </Text>
                          {/* ⭐ The sentence a self-resetting status could never say. */}
                          {g.statusAt && g.sinceStatus > 0 ? (
                            <Text style={styles.errStale}>
                              marked {g.status} on {signupDate(g.statusAt)} — {g.sinceStatus} since
                            </Text>
                          ) : null}
                          {/* ⭐ "Did my fix work" is answerable only from here: app_version is 1.0.0 on
                              every OTA published over build 6. */}
                          {g.updateIds.length > 0 ? (
                            <Text style={styles.errBuilds}>
                              seen on {g.updateIds.map((u) => u.slice(0, 8)).join(', ')}
                            </Text>
                          ) : null}
                        </Pressable>

                        <View style={styles.errActions}>
                          {(['ACKED', 'FIXED', 'IGNORED'] as const).map((st) => (
                            <Pressable
                              key={st}
                              onPress={() => void triage(g.fingerprint, st)}
                              accessibilityRole="button"
                              accessibilityLabel={`Mark ${st}`}
                              style={({ pressed }) => [
                                styles.errChip,
                                g.status === st && styles.errChipOn,
                                pressed && styles.errChipPressed,
                              ]}
                            >
                              <Text style={[styles.errChipText, g.status === st && styles.errChipTextOn]}>
                                {st}
                              </Text>
                            </Pressable>
                          ))}
                        </View>

                        {/* ⭐ THE TRAIL. This is the answer to "what path were they on" and the entire
                            reason the system exists. Route shapes and enum action names only — never a
                            word the athlete typed (enforced in domain/diagnostics/breadcrumb-core.ts). */}
                        {openFp === g.fingerprint ? (
                          <View style={styles.errDetail}>
                            <Section state={detail}>
                              {(detail.data ?? []).map((o) => (
                                <View key={o.id} style={styles.errOccurrence}>
                                  <Text style={styles.feedbackMeta}>
                                    {[
                                      o.athleteHandle ? `@${o.athleteHandle}` : 'signed out',
                                      signupDate(o.receivedAt),
                                      o.deviceModel,
                                      o.osVersion,
                                      o.updateId ? `ota ${o.updateId.slice(0, 8)}` : 'embedded bundle',
                                    ]
                                      .filter(Boolean)
                                      .join(' · ')}
                                  </Text>
                                  {o.breadcrumbs.length === 0 ? (
                                    <Text style={styles.errTrailEmpty}>
                                      No trail — this athlete has product-usage measurement off, which drops
                                      the trail and keeps the fault. Working as designed.
                                    </Text>
                                  ) : (
                                    <View style={styles.errTrail}>
                                      {o.breadcrumbs.map((c, i) => (
                                        <Text key={`${o.id}-${i}`} style={styles.errCrumb} selectable>
                                          {c.type === 'route'
                                            ? '→'
                                            : c.type === 'net'
                                              ? '✕'
                                              : c.type === 'state'
                                                ? '◦'
                                                : '·'}{' '}
                                          {c.label}
                                          {c.detail ? ` ${c.detail}` : ''}
                                          {c.n && c.n > 1 ? ` ×${c.n}` : ''}
                                        </Text>
                                      ))}
                                    </View>
                                  )}
                                  {o.componentStack || o.stack ? (
                                    <Text style={styles.errStack} selectable numberOfLines={14}>
                                      {(o.componentStack ?? o.stack ?? '').trim()}
                                    </Text>
                                  ) : null}
                                </View>
                              ))}
                            </Section>
                          </View>
                        ) : null}
                      </View>
                    ))}
                  </View>
                )}
              </>
            ) : null}
          </Section>
        </SectionCard>

        {/* ── Feedback (0167) ──────────────────────────────────────────── */}
        <SectionCard
          title="Feedback"
          subtitle="What people have told us, newest first. Not range-scoped — an unanswered report is not less unanswered because the chips say 7D."
        >
          <Section state={feedback}>
            {feedback.data ? (
              <>
                <StatLine label="Unanswered" value={feedback.data.unread} />
                <StatLine label="Bug reports" value={feedback.data.bugs} />
                <StatLine label="Total received" value={feedback.data.total} />
                {/* ⚠ THE HONEST-ZERO LINE. "Nobody has written" and "nothing links to the screen" both
                    render as 0 above, and the second is a bug that looks exactly like calm. A date here
                    is proof the pipe works end to end; the sentence is the only other truthful answer. */}
                <StatLine
                  label="Last received"
                  value={feedback.data.newestAt ? signupDate(feedback.data.newestAt) : 'nothing has ever arrived'}
                />
                {feedback.data.rows.length === 0 ? null : (
                  <View style={styles.feedbackList}>
                    {feedback.data.rows.map((f) => (
                      <View key={f.id} style={styles.feedbackRow}>
                        <View style={styles.feedbackHead}>
                          <Text style={styles.feedbackKind}>{f.kind}</Text>
                          <Text style={styles.feedbackWho} numberOfLines={1}>
                            {f.athleteHandle ? `@${f.athleteHandle}` : f.athleteName}
                          </Text>
                          <Text style={styles.feedbackWhen}>{signupDate(f.createdAt)}</Text>
                        </View>
                        <Text style={styles.feedbackBody}>{f.body}</Text>
                        <Text style={styles.feedbackMeta}>
                          {[f.status, f.screen, f.platform, f.appVersion].filter(Boolean).join(' · ')}
                          {f.contactOk ? '' : ' · no reply wanted'}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            ) : null}
          </Section>
        </SectionCard>

        {/* ── Reports (0171) ───────────────────────────────────────────── */}
        <SectionCard
          title="Reports"
          subtitle="Reported content and people. ⚠ This queue is an App Store obligation, not a nice-to-have — Guideline 1.2 requires reporting AND timely responses, and an unread queue fails the second half while passing the first."
        >
          <Section state={reports}>
            {reports.data ? (
              <>
                <StatLine label="Open" value={reports.data.counts.open} />
                <StatLine label="Actioned" value={reports.data.counts.actioned} />
                <StatLine label="Dismissed" value={reports.data.counts.dismissed} />
                {/*
                  * ⚠ THE LINE THAT ACTUALLY MEASURES "TIMELY". `Open: 0` and `Open: 3, oldest three weeks
                  * ago` are the difference between a queue being worked and a queue being ignored, and the
                  * count alone cannot tell them apart. Null is "nothing has ever been reported" — a
                  * different fact from "nothing is open", which a bare 0 collapses.
                  */}
                <StatLine
                  label="Oldest still open"
                  value={
                    reports.data.counts.oldestOpenAt
                      ? signupDate(reports.data.counts.oldestOpenAt)
                      : reports.data.counts.open === 0 && reports.data.counts.actioned === 0 && reports.data.counts.dismissed === 0
                        ? 'nothing has ever been reported'
                        : 'nothing open'
                  }
                />
                {reports.data.rows.length === 0 ? null : (
                  <View style={styles.feedbackList}>
                    {reports.data.rows.map((r) => (
                      <View key={r.id} style={styles.feedbackRow}>
                        <View style={styles.feedbackHead}>
                          <Text style={styles.feedbackKind}>
                            {r.reason} · {r.targetKind}
                          </Text>
                          <Text style={styles.feedbackWho} numberOfLines={1}>
                            {r.targetHandle ? `@${r.targetHandle}` : r.targetId.slice(0, 8)}
                          </Text>
                          <Text style={styles.feedbackWhen}>{signupDate(r.createdAt)}</Text>
                        </View>
                        {r.note ? <Text style={styles.feedbackBody}>{r.note}</Text> : null}
                        <Text style={styles.feedbackMeta}>
                          {[
                            r.status,
                            r.reporterHandle ? `from @${r.reporterHandle}` : null,
                            r.resolution,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                        {r.status === 'open' ? (
                          <View style={styles.reportActions}>
                            <Pressable
                              onPress={() => void resolve(r.id, 'actioned')}
                              accessibilityRole="button"
                              accessibilityLabel="Mark actioned"
                              style={styles.reportAction}
                            >
                              <Text style={styles.reportActionLabel}>Actioned</Text>
                            </Pressable>
                            <Pressable
                              onPress={() => void resolve(r.id, 'dismissed')}
                              accessibilityRole="button"
                              accessibilityLabel="Dismiss report"
                              style={styles.reportAction}
                            >
                              <Text style={styles.reportActionLabel}>Dismiss</Text>
                            </Pressable>
                          </View>
                        ) : null}
                      </View>
                    ))}
                  </View>
                )}
              </>
            ) : null}
          </Section>
        </SectionCard>

        <SectionCard
          title="Newest athletes"
          subtitle="Who has an account, newest first. “Not named yet” means they created an account but haven’t finished the Account step — the profile is still the placeholder."
        >
          <Section state={signups}>
            {(signups.data ?? []).length === 0 ? (
              <Text style={styles.sectionError}>No accounts yet.</Text>
            ) : (
              (signups.data ?? []).map((a) => (
                <View key={a.id} style={styles.signupRow}>
                  <View style={styles.signupWho}>
                    <Text style={[styles.signupName, !a.named && styles.signupUnnamed]} numberOfLines={1}>
                      {a.named ? a.name : 'Not named yet'}
                    </Text>
                    {a.handle ? (
                      <Text style={styles.signupHandle} numberOfLines={1}>
                        @{a.handle}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.signupWhen}>{signupDate(a.createdAt)}</Text>
                </View>
              ))
            )}
          </Section>
        </SectionCard>

        {/* ── Funnel ───────────────────────────────────────────────────── */}
        <SectionCard
          title="Onboarding funnel"
          subtitle={`Everyone who signed up in the last ${days} days. The week-2 row counts only athletes old enough to have had a week two.`}
        >
          <Section state={growth}>
            {g ? (
              <AdminFunnelBars
                stages={[
                  { label: 'Signed up', value: g.funnel.signedUp },
                  { label: 'Finished onboarding', value: g.funnel.onboarded },
                  { label: 'Logged a workout', value: g.funnel.firstWorkout },
                  { label: 'Logged a second', value: g.funnel.secondWorkout },
                  {
                    label: 'Came back in week 2',
                    value: g.funnel.week2Return,
                    denominator: g.funnel.week2Eligible,
                    ofLabel: `of ${g.funnel.week2Eligible} old enough to count`,
                  },
                ]}
              />
            ) : null}
          </Section>
        </SectionCard>

        {/* ── Retention ────────────────────────────────────────────────── */}
        <SectionCard
          title="Retention by signup week"
          subtitle="Share of each week's cohort who trained again N weeks later. Blank means that week hasn't happened yet — not zero. The rightmost column of the newest row is always partial."
        >
          <Section state={cohorts}>
            {cohorts.data ? <CohortGrid cohorts={cohorts.data.cohorts} weeks={cohorts.data.weeks} /> : null}
          </Section>
        </SectionCard>

        {/* ── Engagement ───────────────────────────────────────────────── */}
        <SectionCard title="Engagement">
          <Section state={engagement}>
            {e ? (
              <>
                {/* Three small multiples, never three lines on one plot — the palette cannot carry a
                    categorical series, and a dual axis would be worse. */}
                <AdminLineChart values={column(e.series, 'dau')} days={engDays} title="Daily active" />
                <AdminLineChart values={column(e.series, 'wau')} days={engDays} title="Weekly active" />
                <AdminLineChart values={column(e.series, 'mau')} days={engDays} title="Monthly active" />
                <StatLine label="Median days between sessions" value={e.medianDaysBetween} />
                <Text style={styles.subhead}>Days since last workout</Text>
                <BucketBars buckets={e.churnRisk} />
              </>
            ) : null}
          </Section>
        </SectionCard>

        {/* ── What people open and tap (Phase 2, 0131–0133) ────────────── */}
        <SectionCard
          title="What people open"
          subtitle={
            ev
              ? `${ev.reportingAthletes} of ${ev.athletesTotal} athletes are reporting${ev.optedOut > 0 ? ` · ${ev.optedOut} opted out` : ''}. Counts below describe only those athletes.`
              : undefined
          }
        >
          <Section state={events}>
            {ev ? (
              ev.totalEvents === 0 ? (
                // A real state worth naming rather than drawing as flat zero: the tables exist, the app
                // just has not reported yet. "Nothing here" and "nobody uses this" are different claims.
                <Text style={styles.empty}>
                  No usage recorded yet in this window. Events start arriving once the update is installed and the
                  app is opened — a fresh install reports from its first launch.
                </Text>
              ) : (
                <>
                  <View style={styles.tiles}>
                    <AdminStatTile label="Opened today" value={ev.presence.dau} exact />
                    <AdminStatTile label="Opened this week" value={ev.presence.wau} exact />
                    <AdminStatTile label="Opened this month" value={ev.presence.mau} exact />
                    <AdminStatTile label="Median session" value={ev.sessions.medianSec} suffix="s" exact />
                  </View>

                  <Text style={styles.subhead}>Screens, by how many athletes opened them</Text>
                  <AdminBarChart
                    rows={ev.screens.map((s) => ({
                      label: s.screen,
                      value: s.athletes,
                      note: `· ${s.views} views`,
                    }))}
                  />

                  {ev.actions.length ? (
                    <>
                      <Text style={styles.subhead}>Actions taken</Text>
                      <AdminBarChart
                        rows={ev.actions.map((a) => ({
                          label: a.kind.replace(/_/g, ' '),
                          value: a.athletes,
                          note: `· ${a.events} times`,
                        }))}
                      />
                    </>
                  ) : null}

                  <Text style={styles.subhead}>Sessions</Text>
                  <StatLine label="Sessions recorded" value={ev.sessions.count} />
                  <StatLine label="Median length" value={`${ev.sessions.medianSec}s`} />
                  {/* The p90 is the load-bearing one: a median of 40s with a p90 of 12 minutes is a
                      product with a short check-in AND a long session, which one number would hide. */}
                  <StatLine label="90th percentile length" value={`${ev.sessions.p90Sec}s`} />
                  <StatLine label="Median screens per session" value={ev.sessions.medianScreensPerSession} />

                  {ev.byPlatform.length ? (
                    <>
                      <Text style={styles.subhead}>Where they are</Text>
                      <AdminBarChart
                        rows={ev.byPlatform.map((p) => ({ label: p.key, value: p.athletes, note: `· ${p.events} events` }))}
                      />
                    </>
                  ) : null}
                </>
              )
            ) : null}
          </Section>
        </SectionCard>

        {/* ── Feature adoption ─────────────────────────────────────────── */}
        <SectionCard
          title="What gets used"
          subtitle={a ? `Athletes who have ever used each feature, of ${a.totalAthletes} total.` : undefined}
        >
          <Section state={adoption}>
            {a ? (
              <AdminBarChart
                max={a.totalAthletes}
                rows={[...a.features]
                  .sort((x, y) => y.ever - x.ever)
                  .map((f) => ({
                    label: f.label,
                    value: f.ever,
                    note: `· ${pctOf(f.ever, a.totalAthletes) ?? 0}%`,
                  }))}
              />
            ) : null}
          </Section>
        </SectionCard>

        {/* ── Programs ─────────────────────────────────────────────────── */}
        <SectionCard
          title="Programs"
          subtitle="Drop-off counts programs untouched for 3 weeks that are still open — not everyone currently mid-week, and not ones already graduated, finished or ended early."
        >
          <Section state={adoption}>
            {a ? (
              <>
                <StatLine
                  label="Session adherence"
                  value={a.programs.adherencePct == null ? 'no sessions yet' : `${a.programs.adherencePct}%`}
                />
                <StatLine label="Sessions completed" value={a.programs.sessionsCompleted} />
                <StatLine label="Sessions skipped" value={a.programs.sessionsSkipped} />
                {/* Two completion states, never summed. 'graduated' earns rank credit and Programs
                    Graduated honors; 'finished' is the same achievement on a program under four designed
                    weeks, which D-RCM-30 rules earns neither. Labelled so the difference is legible
                    without the doc — "Weeks completed" was the old label here and counted programs. */}
                <StatLine label="Graduated" value={a.programs.graduated} />
                <StatLine label="Finished (under 4 weeks)" value={a.programs.finished} />
                <StatLine label="Ended early" value={a.programs.endedEarly} />
                <StatLine label="Currently active" value={a.programs.active} />
                {a.programs.dropoffByWeek.length ? (
                  <>
                    <Text style={styles.subhead}>Where stalled programs stopped</Text>
                    <AdminBarChart
                      rows={a.programs.dropoffByWeek.map((d) => ({ label: `Week ${d.week}`, value: d.programs }))}
                    />
                  </>
                ) : null}
              </>
            ) : null}
          </Section>
        </SectionCard>

        {/* ── Content ──────────────────────────────────────────────────── */}
        <SectionCard
          title="Most-trained exercises"
          subtitle="Ranked by how many different athletes logged it — not by raw set count, which one person can dominate."
        >
          <Section state={content}>
            {c ? (
              <>
                <AdminBarChart
                  rows={c.exercises.map((x) => ({
                    label: x.isCustom ? `${x.label} (custom)` : x.label,
                    value: x.athletes,
                    note: `· ${x.workouts} workouts`,
                  }))}
                />
                <Text style={styles.subhead}>Session type</Text>
                <AdminBarChart
                  rows={c.activityMix.map((m) => ({ label: m.key, value: m.workouts, note: `· ${m.athletes} athletes` }))}
                />
                <Text style={styles.subhead}>Where sessions come from</Text>
                <AdminBarChart
                  rows={[
                    { label: 'From a program', value: c.sessionSource.program },
                    { label: 'From a template', value: c.sessionSource.template },
                    { label: 'Freestyle', value: c.sessionSource.freestyle },
                  ]}
                />
                {c.topHonors.length ? (
                  <>
                    <Text style={styles.subhead}>Honors earned</Text>
                    <AdminBarChart
                      rows={c.topHonors.map((h) => ({ label: h.label, value: h.athletes, note: `· ${h.awards} awards` }))}
                    />
                  </>
                ) : null}
              </>
            ) : null}
          </Section>
        </SectionCard>

        {/* ── Social ───────────────────────────────────────────────────── */}
        <SectionCard title="Social" subtitle="A squad counts as active if somebody posted or checked in.">
          <Section state={social}>
            {s ? (
              <>
                <StatLine label="Squads" value={s.squads.total} />
                <StatLine label="Active squads" value={s.squads.active} />
                <StatLine label="Median squad size" value={s.squads.medianSize} />
                <StatLine label="Posts" value={s.squads.posts} />
                <StatLine label="Check-ins" value={s.squads.checkins} />
                <StatLine label="Join requests" value={s.squads.joinRequests} />
                <Text style={styles.subhead}>Squad size</Text>
                <BucketBars buckets={s.squads.sizeHistogram} />

                <Text style={styles.subhead}>Friends</Text>
                <StatLine label="Accepted friendships" value={s.friends.acceptedTotal} />
                <StatLine label="Pending requests" value={s.friends.pending} />
                <StatLine label="Median friends per athlete" value={s.friends.medianFriends} />

                <Text style={styles.subhead}>Challenges</Text>
                <StatLine label="Created" value={s.challenges.created} />
                <StatLine label="Live now" value={s.challenges.live} />
                <StatLine label="Completed" value={s.challenges.completed} />
                <StatLine label="Cancelled" value={s.challenges.cancelled} />
                <StatLine label="Median participants" value={s.challenges.medianParticipants} />

                <Text style={styles.subhead}>Push</Text>
                <StatLine label="Sent" value={s.push.sent} />
                <StatLine label="Failed" value={s.push.failed} />
                <StatLine
                  label="Devices registered"
                  value={s.push.devices.reduce((n, d) => n + d.n, 0)}
                />
              </>
            ) : null}
          </Section>
        </SectionCard>

        {/* The honesty footer. Two definitions of "active" are on this screen at once and a reader who
            does not know that will compare two numbers that were never comparable. */}
        <Text style={styles.disclaimer}>
          Everything above “What people open” counts an athlete as{' '}
          <Text style={styles.disclaimerStrong}>active when they saved a workout</Text> — so somebody who opens Forge
          daily and logs nothing reads as inactive there. “What people open” counts an{' '}
          <Text style={styles.disclaimerStrong}>app open</Text> instead. The two are deliberately different.
        </Text>
        <Text style={styles.disclaimer}>
          Usage data starts from the release that introduced it — there is no history before that — and covers only
          athletes who left “Help improve Forge” on in Settings › Privacy. It never includes anything an athlete
          wrote or lifted, no photos and no location. All figures are bucketed in {tz}.
        </Text>
        {/* ⚠ THIS PARAGRAPH USED TO SAY "no athlete is named on this screen." It was true when it was
            written and "Newest athletes" made it false. Corrected in place rather than deleted — the
            claim worth making is the narrower one, and a footer that silently drops a promise is worse
            than one that never made it. See `Admin-Analytics-Amendment-001` (AA-D8/AA-D9). */}
        <Text style={styles.disclaimer}>
          Aggregates only, by design — with one exception. “Newest athletes” names people, and it carries{' '}
          <Text style={styles.disclaimerStrong}>account existence and nothing else</Text>: no workouts, no streak, no
          rank, no last-active time. Every other figure on this screen is a population aggregate, and nothing here —
          named or not — may be shown inside the app (Admin-Analytics-Architecture AA-D2 / AA-D3, amended by AA-D8).
        </Text>
      </ScrollView>
    </View>
  );
}

/**
 * "Aug 11, 2:14 PM" — the date AND the time, because during a hand-run rollout the operator is often
 * looking for somebody who signed up twenty minutes ago and a bare date cannot tell them apart.
 *
 * The device's own clock, not `dashboardTz()`: every other figure on this screen is BUCKETED and has to
 * agree with the others about where a day begins, which is what that one clock exists to guarantee. A
 * signup is a single instant with nothing to line it up against.
 */
function signupDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** Loading / error / content for one section, so a slow query never blanks the whole screen. */
function Section({
  state,
  children,
}: {
  state: { loading: boolean; error: string | null; data: unknown };
  children: React.ReactNode;
}) {
  if (state.loading && state.data == null) {
    return (
      <View style={styles.sectionLoading}>
        <ActivityIndicator color={flColor.bronze400} size="small" />
      </View>
    );
  }
  if (state.error) return <Text style={styles.sectionError}>{state.error}</Text>;
  return <>{children}</>;
}

const styles = StyleSheet.create({
  // ── Reports (0171) ──
  reportActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  reportAction: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: flRadius.sm, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  reportActionLabel: { fontSize: 11.5, fontWeight: '600', color: flColor.bronze300 },
  root: { flex: 1, backgroundColor: flColor.base },
  boot: { flex: 1, backgroundColor: flColor.base, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 16, paddingBottom: 56, gap: 14 },
  rangeRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 4 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footnote: { color: flColor.gray600, fontSize: 11, lineHeight: 16, marginTop: 8 },
  subhead: {
    color: flText.bronzeLabel,
    fontSize: 10.5,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  empty: { color: flColor.gray600, fontSize: 12, lineHeight: 17, paddingVertical: 6 },
  sectionLoading: { paddingVertical: 22, alignItems: 'center' },
  sectionError: { color: flColor.redMuted, fontSize: 12, lineHeight: 17, paddingVertical: 8 },

  // Newest athletes (0137). A hairline between rows and nothing else — it is a list, not a table.
  signupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: flColor.charcoal700,
  },
  signupWho: { flex: 1, minWidth: 0 },
  signupName: { fontSize: 13.5, fontWeight: '600', color: flColor.cream100 },
  /* Dimmed on purpose: "Not named yet" is a state, not a name, and it must not read like one. */
  signupUnnamed: { color: flColor.gray600, fontStyle: 'italic', fontWeight: '500' },
  signupHandle: { marginTop: 1, fontSize: 11.5, color: flColor.gray600 },
  signupWhen: { flexShrink: 0, fontSize: 11.5, color: flColor.gray400 },

  // Feedback (0167). Stacked rather than tabular: the body is the point and it needs the full width.
  feedbackList: { marginTop: 10 },
  // ── Errors (0176) ──────────────────────────────────────────────────────────
  errCount: { flex: 1, fontSize: 11, fontWeight: '600', color: flColor.bronze400 },
  errMessage: { marginTop: 5, fontSize: 13, lineHeight: 19, color: flColor.cream100 },
  errStale: { marginTop: 4, fontSize: 11, fontWeight: '600', color: flColor.bronze400 },
  errBuilds: { marginTop: 3, fontSize: 10.5, color: flColor.gray400 },
  errActions: { flexDirection: 'row', gap: 6, marginTop: 8 },
  errChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: flRadius.sm,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
  },
  errChipOn: { borderColor: flColor.bronze400, backgroundColor: flColor.charcoal800 },
  errChipPressed: { opacity: 0.7 },
  errChipText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, color: flColor.gray400 },
  errChipTextOn: { color: flColor.bronze400 },
  errDetail: { marginTop: 10, gap: 10 },
  errOccurrence: {
    padding: 10,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal700,
    backgroundColor: flColor.charcoal800,
    gap: 6,
  },
  errTrail: { gap: 1 },
  // Selectable and tight: this block exists to be READ top to bottom as a sequence, and copied out.
  errCrumb: { fontSize: 11, lineHeight: 16, color: flColor.cream100 },
  errTrailEmpty: { fontSize: 11, lineHeight: 16, color: flColor.gray400, fontStyle: 'italic' },
  errStack: { fontSize: 10, lineHeight: 14, color: flColor.gray400 },
  feedbackRow: {
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: flColor.charcoal700,
  },
  feedbackHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  feedbackKind: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: flColor.bronze400,
  },
  feedbackWho: { flex: 1, minWidth: 0, fontSize: 11.5, color: flColor.gray600 },
  feedbackWhen: { flexShrink: 0, fontSize: 11.5, color: flColor.gray400 },
  /* Full text, never truncated. A support message read halfway is a support message misread — and this
     is the one screen in the app whose whole job is to show what somebody actually wrote. */
  feedbackBody: { marginTop: 6, fontSize: 13, lineHeight: 19, color: flColor.cream100 },
  feedbackMeta: { marginTop: 5, fontSize: 10.5, color: flColor.gray600 },

  disclaimer: { color: flColor.gray600, fontSize: 10.5, lineHeight: 16, marginTop: 4 },
  disclaimerStrong: { color: flText.secondary, fontFamily: flFont.displayMedium },
});
