-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- Forge Legacy — CREATOR DASHBOARD, PHASE 2 (migrations 0131 + 0132 + 0133)
--
--   1. Supabase Dashboard  →  SQL Editor  →  New query
--   2. Paste this ENTIRE file
--   3. Run
--
-- Nothing in here needs editing, and it is safe to run more than once.
--
-- ⚠ THE PRIVACY POLICY EDIT SHIPS BEFORE THIS FILE RUNS — NOT ALONGSIDE IT.
--
-- Phase 1 (0129/0130) only read things athletes had already created by training. This collects
-- something new: which screens they open and which features they use. `Admin-Analytics-Architecture`
-- AA-D9 and `P-6-Amendment-001-Product-Analytics` P6-A1-D8 both require the disclosure to be live
-- first, because a policy updated afterwards was wrong for however long the gap lasted.
--
-- The edit is in `Docs/Legal/Privacy-Policy.md` § 2, "Product usage". If that is not published, stop
-- here and publish it.
--
-- WHAT THIS CREATES
--   · app_events        — usage events. Own-row insert + read; NO update, NO delete policy, because an
--                         append-only log its subject can rewrite is not a log. Pruned at 90 days.
--   · athlete_activity  — last app-open per athlete. Deliberately NOT a column on `profiles`, whose
--                         select policy is `using (true)` — a presence signal there would be public.
--   · metrics_daily     — nightly rollups. What survives the 90-day prune: counts with no athlete.
--   · admin_events()    — the eighth read model: screens, actions, session length, true app-open DAU.
--   · two cron jobs     — forge-events-prune (04:40) and forge-metrics-rollup (05:25).
--
-- WHAT ATHLETES CAN TURN OFF
--   Settings › Privacy › "Help improve Forge". Default ON, with the disclosure above.
--
-- ── VERIFY AFTER RUNNING ────────────────────────────────────────────────────────────────────────
--
--   -- all three cron jobs present and active. ⚠ forge-events-prune is the ONLY thing making the
--   -- policy's 90-day sentence true; if it is missing, that promise is false while the words stay up.
--   select jobname, schedule, active from cron.job order by jobname;
--
--   select count(*) from public.app_events;        -- 0 until the app update is installed and opened
--   select count(*) from public.athlete_activity;  -- 1+ after you next open the app
--
--   -- Optional: fill rollup history once, by hand. Chunked so it cannot run long enough to be killed.
--   -- select public.metrics_rollup_backfill('2026-01-01', current_date);
--
--   -- And the check that matters — that a NON-admin is still refused:
--   --   node supabase/seed/admin-roundtrip.mjs
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

-- Forge Legacy — 0131: what people actually do in the app
--
-- ══ WHAT THIS CLOSES ══
--
-- 0130 measures what athletes DID — workouts saved, programs finished, squads joined. It cannot measure
-- what they LIKED. Somebody who opens Forge every day and logs nothing is, to every metric in 0130,
-- indistinguishable from somebody who left. Screens opened, features tapped, session length and the
-- point at which a flow is abandoned are simply not in the database.
--
-- This is the table that changes that.
--
-- ══ ⚠ DO NOT APPLY THIS BEFORE THE PRIVACY POLICY EDIT IS LIVE ══
--
-- `Admin-Analytics-Architecture-v1.0.md` AA-D9 and `P-6-Amendment-001-Product-Analytics` P6-A1-D8 both
-- say it, and it is the one instruction in this migration with no technical enforcement: the disclosure
-- ships BEFORE the collection, not alongside it. A policy updated afterwards was wrong for however long
-- the gap lasted. The edit is in `Docs/Legal/Privacy-Policy.md` § 2, "Product usage".
--
-- ══ WHAT MAY BE IN A ROW, AND WHAT MAY NOT ══
--
-- The policy tells athletes a usage record never contains anything they wrote or anything they lifted.
-- That is enforced in `src/domain/analytics/props-core.ts` — an ALLOWLIST, tested, applied before the
-- insert — not by this table, which cannot inspect meaning. The `props` size check below is a blast
-- radius limit, not the rule.
--
-- ══ TWO CLOCKS, AND THE DIFFERENCE IS LOAD-BEARING ══
--
--   `occurred_at`  the DEVICE's clock. Can be wrong by years. Trustworthy ONLY for ordering events
--                  within one session_id.
--   `received_at`  the SERVER's clock. EVERY DASHBOARD METRIC IS COMPUTED FROM THIS ONE.
--
-- There is deliberately no CHECK clamping `occurred_at` to something sane: a constraint containing
-- `now()` is not immutable and breaks `pg_dump`.
--
-- Idempotent. Depends on 0001 (profiles) and 0120 (pg_cron). RUN AFTER 0130.

create table if not exists public.app_events (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  -- Random per app session, minted on the client. NOT a device id, not derived from hardware, not
  -- stable across sessions — the policy says so in as many words.
  session_id  uuid not null,
  kind        text not null check (length(kind) between 1 and 60),
  screen      text check (screen is null or length(screen) <= 120),
  props       jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  platform    text check (platform is null or platform in ('ios', 'android', 'web')),
  app_version text check (app_version is null or length(app_version) <= 32),
  -- The blast radius of a client bug that puts a whole workout into props. The allowlist is the real
  -- defence; this is what stops a bypass from being unbounded.
  constraint app_events_props_small check (pg_column_size(props) < 2048)
);

-- BRIN on the append-only time column: this table is written in `received_at` order forever, which is
-- exactly the access pattern BRIN is for, at a fraction of a btree's size.
create index if not exists app_events_received_brin on public.app_events using brin (received_at);
-- "how often is this event fired lately" — the rollup's query.
create index if not exists app_events_kind_time on public.app_events (kind, received_at desc);
-- "how many distinct athletes", and the athlete's own read of their own log.
create index if not exists app_events_user_time on public.app_events (user_id, received_at desc);
-- Screen-view counts skip the rest of the table entirely.
create index if not exists app_events_screen_time on public.app_events (screen, received_at desc)
  where screen is not null;

alter table public.app_events enable row level security;

drop policy if exists app_events_insert on public.app_events;
drop policy if exists app_events_own_select on public.app_events;

create policy app_events_insert on public.app_events for insert
  with check (user_id = auth.uid());

-- P6-A1-D10. Own-row SELECT, matching push_outbox's "readable by its owner for support and debugging".
-- It is also what makes the policy's "you can see what we collect" true without building an export
-- endpoint.
create policy app_events_own_select on public.app_events for select
  using (user_id = auth.uid());

-- ⚠ NO UPDATE POLICY AND NO DELETE POLICY, ON PURPOSE. An append-only log its subject can rewrite is
--   not a log. Deleting the account removes every row via the FK cascade, which is the deletion the
--   policy actually promises.

comment on table public.app_events is
  'First-party product-usage events (P-6-Amendment-001). Allowlisted payloads only — never athlete-authored text, never training values, never location (P6-A1-D3, enforced in domain/analytics/props-core.ts). Own-row insert + select; no update, no delete. Raw rows pruned at 90 days (P6-A1-D9); only anonymous daily totals survive. Metrics compute from received_at, never occurred_at.';

-- ── Retention: 90 days raw, aggregates forever (P6-A1-D9) ────────────────────
--
-- ⚠ THIS JOB IS THE ONLY THING MAKING THE POLICY'S 90-DAY SENTENCE TRUE. If it is unscheduled or fails
--   silently, the promise quietly becomes false while the sentence stays on the page. The policy's own
--   "Before You Publish" checklist now carries `select jobname, active from cron.job;` as a release
--   check for exactly this reason.
--
-- Bounded batch, in the `push_drain(50)` style: one statement can never lock the table for minutes.
create or replace function public.app_events_prune(p_limit int default 20000)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_n int;
begin
  with doomed as (
    select id from public.app_events
     where received_at < now() - interval '90 days'
     order by id
     limit greatest(coalesce(p_limit, 20000), 0)
  )
  delete from public.app_events e using doomed d where e.id = d.id;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke execute on function public.app_events_prune(int) from public;

-- Monthly partitioning + `drop partition` is the escalation path if volume ever justifies it. It does
-- not now, and a partitioned table is a permanent complexity tax paid against a four-figure daily rate.
select cron.unschedule('forge-events-prune')
 where exists (select 1 from cron.job where jobname = 'forge-events-prune');
select cron.schedule('forge-events-prune', '40 4 * * *', $cron$ select public.app_events_prune(20000); $cron$);


-- Forge Legacy — 0132: when did this athlete last open the app
--
-- ══ WHY THIS IS ITS OWN TABLE AND NOT A COLUMN ON `profiles` ══
--
-- The obvious move is `alter table profiles add column last_active_at`. `syncAthleteTimezone()` already
-- fires an UPDATE on `profiles` on every launch and every auth change, so the write is free.
--
-- It is also the one place this must not go.
--
-- `0001_spine.sql` is `create policy profiles_read on profiles for select using (true)` — the profile
-- table is WORLD-READABLE, and `0114_athlete_search.sql`'s own header already records that any holder of
-- the anon key can page the whole of it. A `last_active_at` there would publish every athlete's last
-- app-open time to the public internet. That is a presence signal — materially worse than the timezone
-- already sitting there, because it says who is around right now and who has stopped coming.
--
-- So presence lives here, owner-scoped, in the same shape as `push_tokens.last_seen_at` (0120), and the
-- dashboard reads it through a SECURITY DEFINER function rather than directly.
--
-- P-6-Amendment-001 P6-A1-D7. Idempotent. Depends on 0001. RUN AFTER 0131.

create table if not exists public.athlete_activity (
  user_id        uuid primary key references public.profiles (id) on delete cascade,
  last_active_at timestamptz not null default now(),
  last_platform  text check (last_platform is null or last_platform in ('ios', 'android', 'web')),
  last_version   text check (last_version is null or length(last_version) <= 32)
);

-- One row per athlete, overwritten each launch. NOT a session history — the policy describes it as
-- "when you last opened the app", and a table that accumulated one row per launch would be an event
-- log wearing a different name.
create index if not exists athlete_activity_recent on public.athlete_activity (last_active_at desc);

alter table public.athlete_activity enable row level security;

drop policy if exists athlete_activity_own on public.athlete_activity;
create policy athlete_activity_own on public.athlete_activity for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

comment on table public.athlete_activity is
  'Last app-open per athlete (P6-A1-D7). Deliberately NOT a column on profiles, whose select policy is `using (true)` — a presence signal on a world-readable table would publish everyone''s activity. Overwritten per launch; not a session history. Read in aggregate only, via SECURITY DEFINER.';


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
