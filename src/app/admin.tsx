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
  fetchAdminGrowth,
  fetchAdminOverview,
  fetchAdminSocial,
  isAppAdmin,
} from '@/data/admin-live';
import { column, RANGES, rangeLabel, rangeToDays, type RangeKey } from '@/domain/admin/series';
import { pctOf } from '@/domain/admin/chart-core';
import { useQuery } from '@/lib/useQuery';

/**
 * The operator dashboard (migrations 0129 + 0130).
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
 * `isAppAdmin()` check below is a courtesy that avoids rendering seven error states — it is not
 * security, and it FAILS CLOSED (an error resolves to false and redirects).
 *
 * ══ SEVEN QUERIES, NOT ONE ══
 *
 * One `useQuery` per section, so the cohort grid — the slowest of them by far — never holds up the
 * headline tiles. Each refetches independently when the range changes.
 *
 * ══ WHAT THIS SCREEN CANNOT TELL YOU, AND SAYS SO ══
 *
 * There is no telemetry in this product yet, so "active" means SAVED A WORKOUT, not opened the app.
 * The footer states that rather than letting the reader assume otherwise. Screens visited, features
 * tapped, session length and where people abandon a flow all arrive with Phase 2.
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

        {/* The honesty footer. Without it a reader assumes "active" means opened the app. */}
        <Text style={styles.disclaimer}>
          “Active” here means <Text style={styles.disclaimerStrong}>saved a workout</Text> — there is no app-open
          tracking in the product yet, so somebody who opens Forge daily and logs nothing counts as inactive. Screens
          visited, features tapped, session length and where people abandon a flow are not measured. All figures are
          bucketed in {tz}.
        </Text>
        <Text style={styles.disclaimer}>
          Aggregates only, by design — no athlete is named on this screen, and nothing here may be shown inside the app
          (Admin-Analytics-Architecture AA-D2 / AA-D3).
        </Text>
      </ScrollView>
    </View>
  );
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
  sectionLoading: { paddingVertical: 22, alignItems: 'center' },
  sectionError: { color: flColor.redMuted, fontSize: 12, lineHeight: 17, paddingVertical: 8 },
  disclaimer: { color: flColor.gray600, fontSize: 10.5, lineHeight: 16, marginTop: 4 },
  disclaimerStrong: { color: flText.secondary, fontFamily: flFont.displayMedium },
});
