-- Forge Legacy — 0057: the generated Weekly Recap (SQ-D8)
--
-- SQ-D8 is LOCKED: "Forge Legacy generates a weekly Squad recap including workouts, PRs, participation,
-- goal progress, and Honors earned", delivered as "the first entry in the Squad Feed for the new week …
-- a Feed entry like any other", with prior weeks reachable by scrolling the Feed's history.
--
-- Three consequences that shape this migration:
--
--   1. It is a POST, not a side table. §2/§3 require it to live in the feed and stay in its history, so
--      `squad_posts` gains a 'weekly' type rather than a `squad_weekly_recaps` table.
--   2. It has NO AUTHOR. Nobody wrote it — Forge generated it — and the design agrees (`Squad Detail`
--      renders the weekly card with `who: ''`). `author_id` therefore becomes nullable, and both feed
--      RPCs move to LEFT JOIN so an authorless row isn't silently dropped from the feed by the join.
--   3. There is no scheduler. Generation is LAZY: `ensure_weekly_recap()` writes the current week's row
--      the first time anyone opens the feed in a new week, and is a no-op after that. Same result as a
--      cron, no infrastructure — and a squad nobody visits simply has no recap, which is honest.
--
-- The numbers are SNAPSHOTTED into `recap` at generation time (the AD-52 pattern already used for
-- workout recaps in 0043). A week's summary must not silently change afterwards because someone later
-- deleted a workout — it is a record of what that week WAS.
--
-- SQ-D8 §4: content is squad-aggregate and "no member is ranked within the summary". PRs and honors are
-- named by member (consistent with the Feed's individual-attribution model) but never ordered by volume,
-- never scored, and never compared. There is deliberately no "top performer".
--
-- Depends on 0045 (feed RPC shape) + 0048 (squad_metric_sum via 0051). Idempotent. RUN AFTER 0056.

-- ── Schema ────────────────────────────────────────────────────────────────────
alter table public.squad_posts add column if not exists recap jsonb;
-- The Monday the summarised week began. An explicit column rather than an index on
-- date_trunc('week', created_at): that expression is STABLE, not IMMUTABLE (it depends on TimeZone),
-- so Postgres refuses it in an index.
alter table public.squad_posts add column if not exists recap_week date;
alter table public.squad_posts alter column author_id drop not null;

alter table public.squad_posts drop constraint if exists squad_posts_type_check;
alter table public.squad_posts add constraint squad_posts_type_check
  check (type in ('checkin', 'recap', 'pr', 'formcheck', 'transformation', 'discussion', 'announcement', 'weekly'));

-- One recap per squad per week. The partial unique index IS the idempotency guarantee — two clients
-- opening the feed at the same moment cannot produce two summaries for the same week.
create unique index if not exists squad_posts_weekly_once
  on public.squad_posts (squad_id, recap_week)
  where type = 'weekly';

-- ── Generation ────────────────────────────────────────────────────────────────
-- SECURITY DEFINER: reads every member's workouts, PRs and honors, which the caller cannot. Gated to
-- members. Returns the recap row's id, or null when there was nothing to report.
create or replace function public.ensure_weekly_recap(p_squad uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_start   timestamptz := date_trunc('week', now());   -- Postgres weeks start Monday
  v_prev    timestamptz := date_trunc('week', now()) - interval '7 days';
  v_sq      public.squads%rowtype;
  v_id      uuid;
  v_total   int;
  v_active  int;
  v_workouts int;
  v_prs     jsonb;
  v_honors  jsonb;
  v_goal    jsonb := null;
  v_delta   numeric;
begin
  if v_uid is null or not public.is_squad_member(p_squad, v_uid) then
    return null;
  end if;

  -- Already generated for the week that just ended? Nothing to do.
  select id into v_id
    from public.squad_posts
   where squad_id = p_squad and type = 'weekly' and recap_week = v_prev::date
   limit 1;
  if found then
    return v_id;
  end if;

  select * into v_sq from public.squads where id = p_squad;
  if not found then
    return null;
  end if;

  -- The window is the PRIOR seven days — the week that just closed, not the one in progress.
  select count(*)::int into v_total from public.squad_members where squad_id = p_squad;

  select count(*)::int into v_workouts
    from public.workouts w
    join public.squad_members sm on sm.user_id = w.athlete_id
   where sm.squad_id = p_squad and w.saved_at >= v_prev and w.saved_at < v_start;

  select count(distinct w.athlete_id)::int into v_active
    from public.workouts w
    join public.squad_members sm on sm.user_id = w.athlete_id
   where sm.squad_id = p_squad and w.saved_at >= v_prev and w.saved_at < v_start;

  -- A week where nobody trained isn't a summary worth posting — silence beats "0 sessions".
  if v_workouts = 0 then
    return null;
  end if;

  -- PRs, named by member. No ordering by size: SQ-D8 §4 forbids ranking inside the summary.
  select coalesce(jsonb_agg(jsonb_build_object('name', x.name, 'exercise', x.exercise, 'value', x.value) order by x.name), '[]'::jsonb)
    into v_prs
    from (
      select coalesce(p.name, 'Athlete') as name,
             pr.exercise,
             case pr.measure_kind::text
               when 'load'     then trim(to_char(pr.load_value, 'FM999999990.##')) || ' ' || coalesce(pr.load_unit, 'lb')
               when 'time'     then to_char((pr.time_seconds || ' seconds')::interval, 'MI:SS')
               when 'distance' then trim(to_char(pr.distance_value, 'FM999999990.##')) || ' ' || coalesce(pr.distance_unit, 'mi')
               when 'reps'     then pr.reps_count || ' reps'
               else ''
             end as value
        from public.personal_records pr
        join public.squad_members sm on sm.user_id = pr.athlete_id
        join public.profiles p on p.id = pr.athlete_id
       where sm.squad_id = p_squad
         and pr.achieved_on >= v_prev::date and pr.achieved_on < v_start::date
    ) x;

  select coalesce(jsonb_agg(jsonb_build_object('name', coalesce(p.name, 'Athlete'), 'honor', h.display_name) order by p.name), '[]'::jsonb)
    into v_honors
    from public.honor_instances h
    join public.squad_members sm on sm.user_id = h.athlete_id
    join public.profiles p on p.id = h.athlete_id
   where sm.squad_id = p_squad
     and h.awarded_at >= v_prev and h.awarded_at < v_start;

  -- Goal progress FOR THE WEEK: the same metric the squad's goal counts, measured over this window
  -- only. Reuses squad_metric_sum (0051) so the recap and the goal bar can't disagree.
  if v_sq.goal_target is not null and v_sq.goal_started_at is not null then
    v_delta := public.squad_metric_sum(
      p_squad,
      coalesce(v_sq.goal_metric_kind, 'workout_count'),
      v_sq.goal_metric_key,
      greatest(v_prev, v_sq.goal_started_at)
    );
    v_goal := jsonb_build_object(
      'title',  v_sq.goal,
      'kind',   coalesce(v_sq.goal_metric_kind, 'workout_count'),
      'delta',  round(coalesce(v_delta, 0), 1),
      'target', v_sq.goal_target
    );
  end if;

  insert into public.squad_posts (squad_id, author_id, type, body, recap_week, recap)
    values (
      p_squad,
      null,
      'weekly',
      null,
      v_prev::date,
      jsonb_build_object(
        'week_start',    v_prev,
        'week_end',      v_start,
        'workouts',      v_workouts,
        'participation', jsonb_build_object('active', v_active, 'total', v_total),
        'prs',           v_prs,
        'pr_count',      jsonb_array_length(v_prs),
        'honors',        v_honors,
        'honor_count',   jsonb_array_length(v_honors),
        'goal',          v_goal
      )
    )
    on conflict do nothing
    returning id into v_id;

  -- Lost the race to a concurrent caller — take theirs.
  if v_id is null then
    select id into v_id from public.squad_posts
     where squad_id = p_squad and type = 'weekly' and recap_week = v_prev::date limit 1;
  end if;

  return v_id;
end;
$$;

-- ── Feed RPCs carry `recap`, and tolerate an authorless post ───────────────────
-- Dropped first: CREATE OR REPLACE cannot change a set-returning function's OUT columns (42P13).
-- The INNER JOIN on profiles becomes LEFT — a weekly recap has no author and must not be filtered out.
drop function if exists public.squad_feed(uuid, int, int);
create function public.squad_feed(p_squad uuid, p_limit int, p_offset int)
returns table (
  id uuid, type text, body text, pr_value text, pr_exercise text, pr_label text,
  author_id uuid, author_name text, author_avatar text, author_is_owner boolean,
  created_at timestamptz, comment_count bigint, respect_count bigint, i_reacted boolean,
  media jsonb, workout_summary jsonb, layout jsonb, recap jsonb
)
language sql
security invoker
stable
set search_path = public
as $$
  select p.id, p.type, p.body, p.pr_value, p.pr_exercise, p.pr_label,
    p.author_id, pr.name, pr.avatar_url, (s.owner_id = p.author_id),
    p.created_at,
    (select count(*) from public.squad_post_comments c where c.post_id = p.id),
    (select count(*) from public.squad_post_reactions r where r.post_id = p.id),
    exists (select 1 from public.squad_post_reactions r where r.post_id = p.id and r.user_id = auth.uid()),
    p.media, p.workout_summary, p.layout, p.recap
  from public.squad_posts p
  join public.squads s on s.id = p.squad_id
  left join public.profiles pr on pr.id = p.author_id
  where p.squad_id = p_squad
  order by p.created_at desc
  limit greatest(p_limit, 0) offset greatest(p_offset, 0);
$$;

drop function if exists public.squad_post_one(uuid);
create function public.squad_post_one(p_post uuid)
returns table (
  id uuid, type text, body text, pr_value text, pr_exercise text, pr_label text,
  author_id uuid, author_name text, author_avatar text, author_is_owner boolean,
  created_at timestamptz, comment_count bigint, respect_count bigint, i_reacted boolean,
  media jsonb, workout_summary jsonb, layout jsonb, recap jsonb,
  squad_id uuid, squad_name text, squad_owner_id uuid
)
language sql
security invoker
stable
set search_path = public
as $$
  select p.id, p.type, p.body, p.pr_value, p.pr_exercise, p.pr_label,
    p.author_id, pr.name, pr.avatar_url, (s.owner_id = p.author_id),
    p.created_at,
    (select count(*) from public.squad_post_comments c where c.post_id = p.id),
    (select count(*) from public.squad_post_reactions r where r.post_id = p.id),
    exists (select 1 from public.squad_post_reactions r where r.post_id = p.id and r.user_id = auth.uid()),
    p.media, p.workout_summary, p.layout, p.recap,
    s.id, s.name, s.owner_id
  from public.squad_posts p
  join public.squads s on s.id = p.squad_id
  left join public.profiles pr on pr.id = p.author_id
  where p.id = p_post;
$$;
