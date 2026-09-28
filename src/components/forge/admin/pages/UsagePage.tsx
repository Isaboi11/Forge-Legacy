import { StyleSheet, Text, View } from 'react-native';

import { AdminBarChart, AdminFunnelBars, AdminLineChart, BucketBars, CohortGrid, StatLine } from '@/components/forge/admin/charts';
import { Block, Columns, Empty, Kpis, PageHead, QueryGate, deltaSub, type KpiProps } from '@/components/forge/admin/crm-ui';
import type { PageProps } from '@/components/forge/admin/pages/types';
import { flColor, flFont, flText } from '@/constants/foundation';
import {
  fetchAdminAdoption,
  fetchAdminCohorts,
  fetchAdminContent,
  fetchAdminEngagement,
  fetchAdminEvents,
  fetchAdminGrowth,
  fetchAdminOverview,
  fetchAdminSocial,
} from '@/data/admin-live';
import { groupedNumber, pctOf } from '@/domain/admin/chart-core';
import { column, rangeLabel } from '@/domain/admin/series';
import { useQuery } from '@/lib/useQuery';

/**
 * Usage — the product half of the old operator dashboard (migrations 0129–0133), moved here whole by
 * Admin-Analytics-Amendment-002.
 *
 * Governed by `Docs/Admin-Analytics-Architecture-v1.0.md`. Everything on this page is a POPULATION
 * AGGREGATE — AA-D2 forbids per-athlete drill-down, and that constraint is what keeps this surface
 * outside the Performance Firewall rather than in breach of it. No athlete is named anywhere here;
 * the named rows live on Users & plans (account + billing only, AA-D12), never beside training data.
 *
 * ══ EIGHT QUERIES, NOT ONE ══
 *
 * One `useQuery` per section, so the cohort grid — the slowest of them by far — never holds up the
 * headline tiles. Each refetches independently when the range changes.
 *
 * ══ TWO DEFINITIONS OF "ACTIVE" LIVE ON THIS PAGE AT ONCE ══
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
export function UsagePage({ range, days, tz }: PageProps) {
  const overview = useQuery(() => fetchAdminOverview(days, tz), [days, tz]);
  const growth = useQuery(() => fetchAdminGrowth(days, tz), [days, tz]);
  const cohorts = useQuery(() => fetchAdminCohorts(12, tz), [tz]);
  const engagement = useQuery(() => fetchAdminEngagement(days, tz), [days, tz]);
  const adoption = useQuery(() => fetchAdminAdoption(days, tz), [days, tz]);
  const content = useQuery(() => fetchAdminContent(days, 12, tz), [days, tz]);
  const social = useQuery(() => fetchAdminSocial(days, tz), [days, tz]);
  const events = useQuery(() => fetchAdminEvents(days, 15, tz), [days, tz]);

  const o = overview.data;
  const g = growth.data;
  const e = engagement.data;
  const a = adoption.data;
  const c = content.data;
  const s = social.data;
  const ev = events.data;

  const growthDays = (g?.series ?? []).map((r) => r.d);
  const engDays = (e?.series ?? []).map((r) => r.d);
  const note = rangeLabel(range);

  /* A tile with a prior-period figure carries the ▲/▼ line; the all-time ones do not pretend to one. */
  const kpi = (label: string, value: number, prev?: number, suffix = ''): KpiProps => ({
    label,
    value: `${groupedNumber(value)}${suffix}`,
    ...(prev == null ? {} : (deltaSub(value, prev, note) ?? {})),
  });

  return (
    <View style={{ gap: 28 }}>
      <PageHead
        title="Usage"
        lede="How athletes use Forge — population aggregates only. Nobody is named on this page."
      />

      {/* ── Overview ─────────────────────────────────────────────────── */}
      <QueryGate state={overview}>
        {o ? (
          <View style={styles.overview}>
            <Kpis
              items={[
                kpi('Athletes', o.tiles.athletesTotal),
                kpi('Active', o.tiles.active, o.tiles.activePrev),
                kpi('New signups', o.tiles.signups, o.tiles.signupsPrev),
                kpi('Workouts', o.tiles.workouts, o.tiles.workoutsPrev),
                kpi('First workout', o.tiles.activated, o.tiles.activatedPrev),
                kpi('Hours logged', o.tiles.hoursAllTime, undefined, 'h'),
              ]}
            />
            <Text style={styles.footnote}>
              {o.tiles.onboardedTotal} of {o.tiles.athletesTotal} athletes finished onboarding
              {o.tiles.athletesTotal > 0 ? ` · ${pctOf(o.tiles.onboardedTotal, o.tiles.athletesTotal)}%` : ''} ·{' '}
              {o.tiles.workoutsAllTime} workouts all time · median {o.tiles.medianWorkoutsPerActive} per active athlete
            </Text>
          </View>
        ) : null}
      </QueryGate>

      <Columns>
        {/* ── Growth ───────────────────────────────────────────────────── */}
        <Block label="Growth">
          <QueryGate state={growth}>
            {g ? (
              <>
                <AdminLineChart values={column(g.series, 'signups')} days={growthDays} title="Signups per day" />
                <AdminLineChart values={column(g.series, 'cumulative')} days={growthDays} title="Total athletes" />
              </>
            ) : null}
          </QueryGate>
        </Block>

        {/* ── Funnel ───────────────────────────────────────────────────── */}
        <Block
          label="Onboarding funnel"
          hint={`Everyone who signed up in the last ${days} days. The week-2 row counts only athletes old enough to have had a week two.`}
        >
          <QueryGate state={growth}>
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
          </QueryGate>
        </Block>
      </Columns>

      {/* ── Retention ────────────────────────────────────────────────── */}
      <Block
        label="Retention by signup week"
        hint="Share of each week's cohort who trained again N weeks later. Blank means that week hasn't happened yet — not zero. The rightmost column of the newest row is always partial."
      >
        <QueryGate state={cohorts}>
          {cohorts.data ? <CohortGrid cohorts={cohorts.data.cohorts} weeks={cohorts.data.weeks} /> : null}
        </QueryGate>
      </Block>

      <Columns>
        {/* ── Engagement ───────────────────────────────────────────────── */}
        <Block label="Engagement">
          <QueryGate state={engagement}>
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
          </QueryGate>
        </Block>

        {/* ── Feature adoption ─────────────────────────────────────────── */}
        <Block
          label="What gets used"
          hint={a ? `Athletes who have ever used each feature, of ${a.totalAthletes} total.` : undefined}
        >
          <QueryGate state={adoption}>
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
          </QueryGate>
        </Block>
      </Columns>

      {/* ── What people open and tap (Phase 2, 0131–0133) ────────────── */}
      <Block
        label="What people open"
        hint={
          ev
            ? `${ev.reportingAthletes} of ${ev.athletesTotal} athletes are reporting${ev.optedOut > 0 ? ` · ${ev.optedOut} opted out` : ''}. Counts below describe only those athletes.`
            : undefined
        }
      >
        <QueryGate state={events}>
          {ev ? (
            ev.totalEvents === 0 ? (
              // A real state worth naming rather than drawing as flat zero: the tables exist, the app
              // just has not reported yet. "Nothing here" and "nobody uses this" are different claims.
              <Empty>
                No usage recorded yet in this window. Events start arriving once the update is installed and the
                app is opened — a fresh install reports from its first launch.
              </Empty>
            ) : (
              <>
                <Kpis
                  items={[
                    kpi('Opened today', ev.presence.dau),
                    kpi('Opened this week', ev.presence.wau),
                    kpi('Opened this month', ev.presence.mau),
                    kpi('Median session', ev.sessions.medianSec, undefined, 's'),
                  ]}
                />

                <Columns>
                  <View style={styles.col}>
                    <Text style={styles.subhead}>Screens, by how many athletes opened them</Text>
                    <AdminBarChart
                      rows={ev.screens.map((sc) => ({
                        label: sc.screen,
                        value: sc.athletes,
                        note: `· ${sc.views} views`,
                      }))}
                    />
                  </View>

                  <View style={styles.col}>
                    {ev.actions.length ? (
                      <>
                        <Text style={styles.subhead}>Actions taken</Text>
                        <AdminBarChart
                          rows={ev.actions.map((ac) => ({
                            label: ac.kind.replace(/_/g, ' '),
                            value: ac.athletes,
                            note: `· ${ac.events} times`,
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
                  </View>
                </Columns>
              </>
            )
          ) : null}
        </QueryGate>
      </Block>

      <Columns>
        {/* ── Programs ─────────────────────────────────────────────────── */}
        <Block
          label="Programs"
          hint="Drop-off counts programs untouched for 3 weeks that are still open — not everyone currently mid-week, and not ones already graduated, finished or ended early."
        >
          <QueryGate state={adoption}>
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
          </QueryGate>
        </Block>

        {/* ── Content ──────────────────────────────────────────────────── */}
        <Block
          label="Most-trained exercises"
          hint="Ranked by how many different athletes logged it — not by raw set count, which one person can dominate."
        >
          <QueryGate state={content}>
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
          </QueryGate>
        </Block>
      </Columns>

      {/* ── Social ───────────────────────────────────────────────────── */}
      <Block label="Social" hint="A squad counts as active if somebody posted or checked in.">
        <QueryGate state={social}>
          {s ? (
            <Columns>
              <View style={styles.col}>
                <StatLine label="Squads" value={s.squads.total} />
                <StatLine label="Active squads" value={s.squads.active} />
                <StatLine label="Median squad size" value={s.squads.medianSize} />
                <StatLine label="Posts" value={s.squads.posts} />
                <StatLine label="Check-ins" value={s.squads.checkins} />
                <StatLine label="Join requests" value={s.squads.joinRequests} />
                <Text style={styles.subhead}>Squad size</Text>
                <BucketBars buckets={s.squads.sizeHistogram} />
              </View>

              <View style={styles.col}>
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
                <StatLine label="Devices registered" value={s.push.devices.reduce((n, d) => n + d.n, 0)} />
              </View>
            </Columns>
          ) : null}
        </QueryGate>
      </Block>

      {/* The honesty footer. Two definitions of "active" are on this page at once and a reader who
          does not know that will compare two numbers that were never comparable. */}
      <View style={styles.footer}>
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
        {/* ⚠ THIS PARAGRAPH HAS BEEN CORRECTED TWICE, IN PLACE. It first said "no athlete is named on this
            screen"; "Newest athletes" (AA-D8/AA-D9) made that false and it narrowed to one exception. The
            CRM (Amendment 002, AA-D12) moved every named row to Users & plans, so the claim worth making is
            now about THAT page's ceiling. A footer that silently drops a promise is worse than one that
            never made it. */}
        <Text style={styles.disclaimer}>
          Aggregates only, by design. People are named in exactly one place —{' '}
          <Text style={styles.disclaimerStrong}>Users &amp; plans</Text> — and only with their account and billing
          record (AA-D12): <Text style={styles.disclaimerStrong}>never training data</Text> — no workouts, no streak,
          no rank, no last-active time. Every figure on this page is a population aggregate, and nothing in the CRM —
          named or not — may be shown inside the app (Admin-Analytics-Architecture AA-D2 / AA-D3, amended by AA-D8
          and AA-D12).
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overview: { gap: 10 },
  footnote: { color: flColor.gray600, fontSize: 11, lineHeight: 16 },
  col: { gap: 8 },
  subhead: {
    color: flText.tertiary,
    fontSize: 10.5,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  footer: { gap: 8 },
  disclaimer: { color: flColor.gray600, fontSize: 10.5, lineHeight: 16 },
  disclaimerStrong: { color: flText.secondary, fontFamily: flFont.displayMedium },
});
