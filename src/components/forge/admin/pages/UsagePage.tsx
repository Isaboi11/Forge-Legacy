import { View } from 'react-native';

import { Bars, Block, BlockGrid, Chart, Cohort, FootNote, Full, HeroFigures, PageHeader, Rows, qState, when, type Figure } from '@/components/forge/admin/crm-ui';
import type { PageProps } from '@/components/forge/admin/pages/types';
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
import { RANGE_INFO, int, lastLabel } from '@/domain/admin/briefing';
import { pctText, rate } from '@/domain/admin/crm-core';
import { usageNote } from '@/domain/admin/notes/usage';
import { useQuery } from '@/lib/useQuery';

/**
 * Usage — what athletes use and whether they come back (Forge CRM.dc.html, `pageData('usage')`).
 *
 * Governed by `Docs/Admin-Analytics-Architecture-v1.0.md`. Everything on this page is a POPULATION
 * AGGREGATE — AA-D2 forbids per-athlete drill-down, and that is what keeps this surface outside the
 * Performance Firewall. Nobody is named here; named rows live on Users & plans (account + billing only).
 *
 * One `useQuery` per source, so the cohort grid — the slowest by far — never holds up the figures.
 *
 * ══ TWO DEFINITIONS OF "ACTIVE" LIVE ON THIS PAGE AT ONCE ══
 *
 * The figures, the chart, How often, Onboarding and Retention (0130) count an athlete active when they
 * SAVED A WORKOUT. "What people open" (0133) counts an APP OPEN, from `athlete_activity`. They differ on
 * purpose; both are labelled, and the footnote says so, because the same word meaning two things in one
 * scroll invites comparing numbers that were never comparable.
 *
 * ══ AND WHAT IT STILL CANNOT TELL YOU ══
 *
 * Event data covers only athletes who left "Help improve Forge" on, and only from the release that
 * introduced it. The Coverage figure states that share rather than letting a sample read as everyone.
 */

const EMPTY = 'No workouts saved yet. This fills in once athletes start training.';

export function UsagePage({ range, days, tz }: PageProps) {
  const overview = useQuery(() => fetchAdminOverview(days, tz), [days, tz]);
  const growth = useQuery(() => fetchAdminGrowth(days, tz), [days, tz]);
  // Six signup weeks (this one and the five before it) → the design's Week 0…5 grid.
  const cohorts = useQuery(() => fetchAdminCohorts(5, tz), [tz]);
  const engagement = useQuery(() => fetchAdminEngagement(days, tz), [days, tz]);
  const adoption = useQuery(() => fetchAdminAdoption(days, tz), [days, tz]);
  const content = useQuery(() => fetchAdminContent(days, 5, tz), [days, tz]);
  const social = useQuery(() => fetchAdminSocial(days, tz), [days, tz]);
  const events = useQuery(() => fetchAdminEvents(days, 6, tz), [days, tz]);

  const o = overview.data;
  const g = growth.data;
  const e = engagement.data;
  const a = adoption.data;
  const ct = content.data;
  const s = social.data;
  const ev = events.data;

  const info = RANGE_INFO[range];
  const inWin = range === '1Y' ? 'the last year' : info.label; // "Saved in 30 days" / "Saved in the last year"
  const last = lastLabel(range).replace(/^l/, 'L'); // "Last 30 days"
  // Nothing has ever been saved: every section says so once, instead of drawing zeros.
  const none = o != null && o.tiles.workoutsAllTime === 0;
  const empty = (msg: string | null) => (none ? EMPTY : msg);

  // ── Figures ──
  const dash = (label: string, note?: string): Figure => ({ label, value: '—', note: none ? 'No data yet' : note });
  const hero: Figure =
    o && !none ? { label: 'Active athletes', value: int(o.tiles.active), note: `Saved a workout in ${inWin}` } : dash('Active athletes', overview.error ? 'Couldn’t load' : undefined);
  const coverage = ev ? rate(ev.reportingAthletes, ev.athletesTotal) : null;
  const figures: Figure[] = [
    o && !none ? { label: 'New signups', value: int(o.tiles.signups), note: last } : dash('New signups'),
    o && !none ? { label: 'Workouts', value: int(o.tiles.workouts), note: `Saved in ${inWin}` } : dash('Workouts'),
    // From the growth funnel, not the overview's `activated`: that one counts ANYONE whose first-ever
    // workout fell in the window, so it could exceed the signups it sits beside.
    g && !none ? { label: 'First workouts', value: int(g.funnel.firstWorkout), note: `Of ${int(g.funnel.signedUp)} new signups` } : dash('First workouts'),
    // The overview only returns an all-time total, so this figure is all-time and says so.
    o && !none ? { label: 'Hours logged', value: int(o.tiles.hoursAllTime), note: 'All time' } : dash('Hours logged'),
    ev && coverage != null && !none
      ? { label: 'Coverage', value: pctText(Math.round(coverage)), note: `${int(ev.reportingAthletes)} of ${int(ev.athletesTotal)} left measurement on` }
      : dash('Coverage'),
  ];

  const note = o
    ? usageNote({
        windowLabel: info.label,
        priorLabel: info.prior,
        active: o.tiles.active,
        activePrev: o.tiles.activePrev,
        signups: g?.funnel.signedUp ?? o.tiles.signups,
        firstWorkouts: g?.funnel.firstWorkout ?? 0,
        workouts: o.tiles.workouts,
        workoutsAllTime: o.tiles.workoutsAllTime,
      })
    : null;

  // ── Active athletes per day ──
  // 1Y plots weeks. Summing daily actives would count athlete-DAYS, so a week's point is that week's
  // weekly-active count (the `wau` on its last day) — distinct athletes, like every other point.
  const series = e?.series ?? [];
  const weekly = range === '1Y';
  let chartV: number[] = series.map((r) => r.dau ?? 0);
  let chartD: string[] = series.map((r) => r.d);
  if (weekly) {
    const v: number[] = [];
    const d: string[] = [];
    for (let end = series.length - 1; end >= 0; end -= 7) {
      v.unshift(series[end].wau ?? 0);
      d.unshift(series[Math.max(0, end - 6)].d);
    }
    chartV = v;
    chartD = d;
  }

  // ── Retention ──
  const HEAD = ['Week 0', '1', '2', '3', '4', '5'];
  const cohortRows = [...(cohorts.data?.cohorts ?? [])].reverse().map((co) => ({
    label: `${when(co.week)} · ${co.size}`,
    // Past `maxK` the week has not happened yet: blank, never 0%.
    cells: HEAD.map((_, k) => (k > co.maxK ? null : (co.cells.find((x) => x.k === k)?.pct ?? 0))),
  }));

  // ── How often ──
  const tail = series[series.length - 1];
  const dauAvg = series.length ? series.reduce((n, r) => n + (r.dau ?? 0), 0) / series.length : 0;

  // ── Feature adoption ── (Logged a workout is 100% of active by definition, so it is left out.)
  const feats = a
    ? a.features
        .filter((f) => f.key !== 'workout' && f.inWindow > 0)
        .sort((x, y) => y.inWindow - x.inWindow)
        .slice(0, 5)
        .map((f) => ({ f, p: rate(f.inWindow, a.activeAthletes) }))
    : [];
  const over100 = feats.some((x) => (x.p ?? 0) > 100);

  // ── Programs ──
  const drop = a?.programs.dropoffByWeek.reduce<{ week: number; programs: number } | null>((m, d) => (!m || d.programs > m.programs ? d : m), null) ?? null;

  // ── Social ──
  const pushEver = a?.features.find((f) => f.key === 'push')?.ever;
  const pushPct = a && pushEver != null ? rate(pushEver, a.totalAthletes) : null;

  return (
    <View>
      <PageHeader title="Usage" purpose="What athletes use and whether they come back. Totals across everyone, never one person." note={note} />
      <HeroFigures hero={hero} figures={figures} />

      <BlockGrid>
        <Full full>
          <Block
            label="Active athletes per day"
            sub={weekly ? 'Active = saved a workout that week.' : 'Active = saved a workout that day.'}
            skeleton="chart"
            state={qState(engagement, empty(series.length ? null : 'No days in this range yet.'))}
          >
            <Chart values={chartV} days={chartD} fmt={int} weekly={weekly} />
          </Block>
        </Full>
        <Full full>
          <Block
            label="Retention by signup week"
            sub="Share of each week’s signups who saved a workout in each later week. A blank cell has not happened yet."
            state={qState(cohorts, empty(cohortRows.length ? null : 'No signups in the last six weeks.'))}
          >
            <Cohort head={HEAD} rows={cohortRows} />
          </Block>
        </Full>

        <Block label="Onboarding" sub={`${last} of signups.`} state={qState(growth, empty(g && g.funnel.signedUp === 0 ? `No signups in the ${lastLabel(range)}.` : null))}>
          {g ? (
            <Bars
              items={[
                { label: 'Signed up', value: g.funnel.signedUp },
                { label: 'Finished onboarding', value: g.funnel.onboarded },
                { label: 'First workout', value: g.funnel.firstWorkout },
                // Its own denominator: someone who signed up yesterday cannot have had a week two yet.
                { label: 'Trained in week 2', value: g.funnel.week2Return, note: `of ${int(g.funnel.week2Eligible)} old enough` },
              ]}
            />
          ) : null}
        </Block>
        <Block label="How often" sub="Active = saved a workout." state={qState(engagement, empty(null))}>
          {e ? (
            <Rows
              items={[
                { label: 'Daily active (avg)', value: int(dauAvg) },
                { label: 'Weekly active', value: int(tail?.wau ?? 0) },
                { label: 'Monthly active', value: int(tail?.mau ?? 0) },
                // The engagement read returns the median GAP between sessions, not days since the last one.
                { label: 'Median days between workouts', value: int(e.medianDaysBetween) },
              ]}
            />
          ) : null}
        </Block>

        <Block
          label="What people open"
          sub="Counts app opens, not workouts. Not comparable with the active numbers above."
          foot={ev ? `From the ${int(ev.reportingAthletes)} of ${int(ev.athletesTotal)} athletes who left measurement on.` : null}
          state={qState(
            events,
            ev && (ev.totalEvents === 0 || ev.screens.length === 0)
              ? 'No app opens recorded in this range yet. They start arriving once athletes open the update that measures them.'
              : null,
          )}
        >
          {ev ? <Bars items={ev.screens.map((sc) => ({ label: sc.screen, value: sc.views, note: `· ${int(sc.athletes)} athletes` }))} /> : null}
        </Block>
        <Block
          label="Feature adoption"
          sub={`Share of active athletes who used it in the ${lastLabel(range)}.`}
          foot={over100 ? 'A feature can be used without saving a workout, so a share can pass 100%.' : null}
          state={qState(
            adoption,
            empty(
              a && a.activeAthletes === 0
                ? 'Nobody saved a workout in this range, so there is nothing to divide by.'
                : a && feats.length === 0
                  ? 'No feature was used in this range.'
                  : null,
            ),
          )}
        >
          <Bars items={feats.map(({ f, p }) => ({ label: f.label, value: p ?? 0, display: pctText(p == null ? null : Math.round(p)) }))} />
        </Block>

        <Block label="Programs" foot="All time, not just this range. Drop-off counts programs untouched for 3 weeks that were never finished." state={qState(adoption, empty(null))}>
          {a ? (
            <Rows
              items={[
                { label: 'Programs running', value: int(a.programs.active) },
                {
                  label: 'Sessions done as planned',
                  value: pctText(a.programs.adherencePct),
                  note: `${int(a.programs.sessionsCompleted)} done · ${int(a.programs.sessionsSkipped)} skipped`,
                },
                { label: 'Most common drop-off', value: drop ? `Week ${drop.week}` : '—', note: drop ? `${int(drop.programs)} programs stalled there` : null },
              ]}
            />
          ) : null}
        </Block>
        <Block
          label="Most-trained exercises"
          sub="Ranked by how many athletes logged it, not by sets, which one person can dominate."
          state={qState(content, empty(ct && ct.exercises.length === 0 ? 'No exercises logged in this range.' : null))}
        >
          {ct ? (
            <Bars
              items={ct.exercises.map((x) => ({
                label: x.isCustom ? `${x.label} (custom)` : x.label,
                value: x.athletes,
                note: `athletes · ${int(x.workouts)} workouts`,
              }))}
            />
          ) : null}
        </Block>

        <Block label="Social" state={qState(social)}>
          {s ? (
            <Rows
              items={[
                { label: 'Squads', value: int(s.squads.total) },
                { label: 'Friend connections', value: int(s.friends.acceptedTotal) },
                { label: 'Challenges running', value: int(s.challenges.live) },
                // Athletes with an enabled push token, of everyone. Devices are not people; this counts people.
                { label: 'Push opt-in', value: pctText(pushPct == null ? null : Math.round(pushPct)) },
              ]}
            />
          ) : null}
        </Block>
      </BlockGrid>

      {/* The honesty footer: two definitions of "active" are on this page, and coverage is partial. */}
      <FootNote>
        Everything except “What people open” counts an athlete as active when they saved a workout, so someone who
        opens Forge daily and logs nothing reads as inactive there. “What people open” counts app opens instead, and
        only from athletes who left “Help improve Forge” on, from the release that introduced it. Aggregates only:
        nobody is named on this page. Days are bucketed in {tz}.
      </FootNote>
    </View>
  );
}
