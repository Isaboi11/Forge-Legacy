import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { flColor, flFont, flText } from '@/constants/foundation';
import {
  dashboardTz,
  fetchAdminAdoption,
  fetchAdminCohorts,
  fetchAdminContent,
  fetchAdminEngagement,
  fetchAdminEvents,
  fetchAdminGrowth,
  fetchAdminOverview,
  fetchAdminSocial,
  fetchRecentSignups,
  isAppAdmin,
} from '@/data/admin-live';
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
          subtitle="Drop-off counts programs untouched for 3 weeks and not finished — not everyone currently mid-week."
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
                <StatLine label="Graduated" value={a.programs.graduated} />
                <StatLine label="Weeks completed" value={a.programs.finished} />
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
  disclaimer: { color: flColor.gray600, fontSize: 10.5, lineHeight: 16, marginTop: 4 },
  disclaimerStrong: { color: flText.secondary, fontFamily: flFont.displayMedium },
});
