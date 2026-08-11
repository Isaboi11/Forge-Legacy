-- Forge Legacy — 0133: the events become answers, and the dashboard stays fast
--
-- ══ TWO JOBS ══
--
--   1. `admin_events(...)` — the eighth admin read model. Screens opened, features used, session
--      length, and true app-open DAU from `athlete_activity`. This is the half of the dashboard that
--      0130 could not build because nothing was recorded.
--   2. `metrics_daily` + a nightly rollup — so that when `app_events` has millions of rows the
--      dashboard is still reading a few hundred.
--
-- ⚠ ADDING `admin_events` MEANS ADDING IT TO `supabase/seed/admin-roundtrip.mjs`. That script loops
--   every admin function as a NON-admin and asserts 42501; it is the only thing standing between one
--   forgotten `admin_guard()` and the whole population's data. Done in the same commit as this file.
--
-- ══ WHY A TRAILING 3-DAY ROLLUP AND NOT JUST YESTERDAY ══
--
-- A workout saved at 11:55pm and a batch of events flushed after a phone comes off airplane mode both
-- land late. A job that computes only yesterday would freeze that day's number wrong forever, and
-- nothing would ever correct it. Three days is idempotent (`on conflict do update`) so recomputing is
-- free, and it is cheap insurance against a job that missed a night.
--
-- Idempotent. Depends on 0129 (admin_guard), 0131 (app_events), 0132 (athlete_activity), 0120 (pg_cron).
-- RUN AFTER 0132.

-- ═════════════════════════════════════════════════════════════════════════════
-- 8. EVENTS — what people actually open and tap
-- ═════════════════════════════════════════════════════════════════════════════
create or replace function public.admin_events(p_days int default 30, p_limit int default 20, p_tz text default 'UTC')
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_tz    text := coalesce(nullif(btrim(p_tz), ''), 'UTC');
  v_days  int  := least(greatest(coalesce(p_days, 30), 1), 365);
  v_limit int  := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_from  timestamptz;
  v_out   jsonb;
begin
  perform public.admin_guard();
  if not exists (select 1 from pg_timezone_names where name = v_tz) then v_tz := 'UTC'; end if;
  v_from := now() - make_interval(days => v_days);

  select jsonb_build_object(
    'days', v_days,
    -- Phase 2 exists, so "active" can finally mean what a reader assumes it means. The dashboard
    -- renders this string, so the change of definition is visible rather than silent.
    'active_def', 'app_open',

    -- ⚠ EVERY metric below buckets on `received_at`, never `occurred_at`. The device clock can be
    --   wrong by years and is trustworthy only for ordering within one session.
    'total_events',   (select count(*) from public.app_events where received_at >= v_from),
    'reporting_athletes', (select count(distinct user_id) from public.app_events where received_at >= v_from),

    -- How many people the numbers below actually describe. An opt-out rate that climbs is worth seeing,
    -- and a dashboard that hides its own coverage invites over-reading.
    'opted_out', (select count(*) from public.profiles
                   where coalesce((app_prefs ->> 'analyticsOptOut')::boolean, false)),
    'athletes_total', (select count(*) from public.profiles),

    'screens', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'screen', screen, 'views', c, 'athletes', ath) order by ath desc, c desc), '[]'::jsonb)
        from (select screen, count(*) c, count(distinct user_id) ath
                from public.app_events
               where received_at >= v_from and kind = 'screen_view' and screen is not null
               group by 1 order by count(distinct user_id) desc, count(*) desc limit v_limit) t
    ),

    -- Everything that is not a screen view: the deliberate actions.
    'actions', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'kind', kind, 'events', c, 'athletes', ath) order by ath desc, c desc), '[]'::jsonb)
        from (select kind, count(*) c, count(distinct user_id) ath
                from public.app_events
               where received_at >= v_from and kind not in ('screen_view', 'session_end')
               group by 1 order by count(distinct user_id) desc, count(*) desc limit v_limit) t
    ),

    -- Session length, from the `session_end` event the emitter writes on background.
    'sessions', (
      select jsonb_build_object(
        'count',      count(*),
        'median_sec', round(coalesce(percentile_cont(0.5) within group (order by ms), 0) / 1000.0, 1),
        'p90_sec',    round(coalesce(percentile_cont(0.9) within group (order by ms), 0) / 1000.0, 1),
        'median_screens_per_session', (
          select round(coalesce(percentile_cont(0.5) within group (order by n), 0), 1)
            from (select count(*) n from public.app_events
                   where received_at >= v_from and kind = 'screen_view'
                   group by session_id) s)
      )
      from (select (props ->> 'duration_ms')::numeric as ms
              from public.app_events
             where received_at >= v_from and kind = 'session_end'
               and props ? 'duration_ms'
               -- A device whose clock jumped can report a 40-day session. Bound it rather than let one
               -- row drag the median somewhere no human sitting ever went.
               and (props ->> 'duration_ms') ~ '^[0-9]+$'
               and (props ->> 'duration_ms')::numeric between 0 and 43200000) q
    ),

    -- TRUE app-open activity (0132), alongside the workout-based series 0130 already reports.
    'presence', (
      select jsonb_build_object(
        'dau', count(*) filter (where last_active_at >= now() - interval '1 day'),
        'wau', count(*) filter (where last_active_at >= now() - interval '7 days'),
        'mau', count(*) filter (where last_active_at >= now() - interval '30 days'),
        'by_platform', coalesce((
          select jsonb_agg(jsonb_build_object('key', p, 'n', c) order by c desc)
            from (select coalesce(last_platform, 'unknown') p, count(*) c
                    from public.athlete_activity group by 1) t), '[]'::jsonb))
        from public.athlete_activity
    ),

    'by_platform', (
      select coalesce(jsonb_agg(jsonb_build_object('key', p, 'events', c, 'athletes', ath) order by c desc), '[]'::jsonb)
        from (select coalesce(platform, 'unknown') p, count(*) c, count(distinct user_id) ath
                from public.app_events where received_at >= v_from group by 1) t
    )
  ) into v_out;

  return v_out;
end;
$$;


-- ═════════════════════════════════════════════════════════════════════════════
-- ROLLUPS
-- ═════════════════════════════════════════════════════════════════════════════
create table if not exists public.metrics_daily (
  day         date not null,
  metric      text not null,
  -- '' for a scalar; a screen path / event kind / platform otherwise. Part of the PK so a metric can
  -- be broken down without a second table.
  dim         text not null default '',
  value       numeric not null,
  computed_at timestamptz not null default now(),
  primary key (day, metric, dim)
);

alter table public.metrics_daily enable row level security;
-- No policies, deliberately, exactly as `app_admins`: this is read by SECURITY DEFINER functions and
-- written by a cron job. No client has any business reading it directly.

comment on table public.metrics_daily is
  'Nightly rollup of daily totals (P6-A1-D9). This is what survives the 90-day prune of app_events — counts with no athlete attached. RLS on with zero policies; read via SECURITY DEFINER only.';

create or replace function public.metrics_rollup(p_days int default 3, p_tz text default 'UTC')
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tz text := coalesce(nullif(btrim(p_tz), ''), 'UTC');
  v_n  int;
begin
  if not exists (select 1 from pg_timezone_names where name = v_tz) then v_tz := 'UTC'; end if;

  with days as (
    select generate_series(
             (now() at time zone v_tz)::date - (greatest(coalesce(p_days, 3), 1) - 1),
             (now() at time zone v_tz)::date,
             interval '1 day')::date as d
  ),
  rows as (
    select d, 'signups' as metric, '' as dim,
           (select count(*) from public.profiles p where (p.created_at at time zone v_tz)::date = d)::numeric as value
      from days
    union all
    select d, 'workouts', '',
           (select count(*) from public.workouts w
             where w.state = 'saved' and (w.saved_at at time zone v_tz)::date = d)::numeric
      from days
    union all
    select d, 'active_athletes', '',
           (select count(distinct w.athlete_id) from public.workouts w
             where w.state = 'saved' and (w.saved_at at time zone v_tz)::date = d)::numeric
      from days
    union all
    select d, 'events', '',
           (select count(*) from public.app_events e where (e.received_at at time zone v_tz)::date = d)::numeric
      from days
    union all
    select d, 'reporting_athletes', '',
           (select count(distinct e.user_id) from public.app_events e
             where (e.received_at at time zone v_tz)::date = d)::numeric
      from days
    union all
    -- Per-screen view counts. THIS is the row that has to survive the prune: once the raw events are
    -- gone, this table is the only record that a screen was ever opened.
    select d, 'screen_views', screen, cnt::numeric
      from (select (e.received_at at time zone v_tz)::date d, e.screen, count(*) cnt
              from public.app_events e
              join days on days.d = (e.received_at at time zone v_tz)::date
             where e.kind = 'screen_view' and e.screen is not null
             group by 1, 2) s
    union all
    select d, 'action_events', kind, cnt::numeric
      from (select (e.received_at at time zone v_tz)::date d, e.kind, count(*) cnt
              from public.app_events e
              join days on days.d = (e.received_at at time zone v_tz)::date
             where e.kind not in ('screen_view', 'session_end')
             group by 1, 2) a
  )
  insert into public.metrics_daily (day, metric, dim, value, computed_at)
  select d, metric, dim, value, now() from rows
  on conflict (day, metric, dim) do update
    set value = excluded.value, computed_at = now();

  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

/**
 * Fill history by hand, once, from the SQL editor:
 *   select public.metrics_rollup_backfill('2026-01-01', current_date);
 * Chunked a month at a time so it never runs long enough to be killed mid-way.
 */
create or replace function public.metrics_rollup_backfill(p_from date, p_to date, p_tz text default 'UTC')
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cursor date := greatest(p_from, current_date - 730);
  v_total  int  := 0;
begin
  while v_cursor <= p_to loop
    v_total := v_total + public.metrics_rollup(
      least(31, (p_to - v_cursor) + 1), p_tz);
    v_cursor := v_cursor + 31;
  end loop;
  return v_total;
end;
$$;

revoke execute on function public.metrics_rollup(int, text) from public;
revoke execute on function public.metrics_rollup_backfill(date, date, text) from public;
revoke execute on function public.admin_events(int, int, text) from public;
grant  execute on function public.admin_events(int, int, text) to authenticated;

select cron.unschedule('forge-metrics-rollup')
 where exists (select 1 from cron.job where jobname = 'forge-metrics-rollup');
select cron.schedule('forge-metrics-rollup', '25 5 * * *', $cron$ select public.metrics_rollup(3); $cron$);

comment on function public.admin_events(int, int, text) is
  'AA-D1/AA-D2. Operator dashboard, Phase 2: screens opened, actions taken, session length, and true app-open DAU/WAU/MAU from athlete_activity. Buckets on received_at, never the device clock. Reports its own coverage (opted_out) so the numbers are not over-read. Population aggregates only.';
