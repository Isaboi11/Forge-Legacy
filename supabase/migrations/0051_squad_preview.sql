-- Forge Legacy — 0051: Squad Preview (a non-member's read-only view of a public squad)
--
-- Backs `Squad Preview.dc.html` — the screen a Discover card taps into. Everything it renders lives
-- behind member-scoped RLS, so a stranger can read none of it directly: the roster (`squad_members`),
-- the live check-ins (`squad_checkins`), and the cross-member goal total (`squad_metric_total`, 0048,
-- which returns 0 to a non-member by design). `squad_preview()` is the one SECURITY DEFINER read that
-- assembles the whole screen and gates ONCE, at the top: the squad must be PUBLIC, or you must
-- already be in it.
--
-- Also splits 0048's `squad_metric_total` into a gate + a reusable sum, so the goal number on this
-- screen is the same number members see rather than a second implementation that can drift.
--
-- Depends on 0048 (squad_metric_total) · 0049 (squad_checkins) · 0050 (category/join_mode/member_cap,
-- squad_join_requests). Idempotent. RUN BY HAND in the Supabase SQL editor, after 0050.

-- ── Goal total: gate and sum, split ───────────────────────────────────────────
-- The metric switch, minus the membership gate — readable for a squad that is PUBLIC or yours.
-- Same kinds as goal_metric_value (0035/0037) and the same joins 0048 used.
create or replace function public.squad_metric_sum(p_squad uuid, p_kind text, p_key text, p_started_at timestamptz)
returns numeric
language sql
security definer
stable
set search_path = public
as $$
  select case
    when not (
      public.is_squad_member(p_squad, auth.uid())
      or exists (select 1 from public.squads s where s.id = p_squad and s.privacy = 'public')
    ) then 0
    when p_kind = 'workout_count' then coalesce((
      select count(*) from public.workouts w
      join public.squad_members sm on sm.user_id = w.athlete_id
      where sm.squad_id = p_squad and w.saved_at >= coalesce(p_started_at, '-infinity'::timestamptz)
    ), 0)
    when p_kind = 'distance_total' then coalesce((
      select sum(w.distance) from public.workouts w
      join public.squad_members sm on sm.user_id = w.athlete_id
      where sm.squad_id = p_squad and w.distance is not null
        and (p_key is null or w.activity_type::text = p_key)
        and w.saved_at >= coalesce(p_started_at, '-infinity'::timestamptz)
    ), 0)
    when p_kind = 'volume_total' then coalesce((
      select sum(ws.weight * ws.reps) from public.workout_sets ws
      join public.workout_exercises we on we.id = ws.workout_exercise_id
      join public.workouts w on w.id = we.workout_id
      join public.squad_members sm on sm.user_id = w.athlete_id
      where sm.squad_id = p_squad and w.saved_at >= coalesce(p_started_at, '-infinity'::timestamptz)
    ), 0)
    when p_kind = 'time_total' then coalesce((
      select sum(w.duration_sec) from public.workouts w
      join public.squad_members sm on sm.user_id = w.athlete_id
      where sm.squad_id = p_squad and w.saved_at >= coalesce(p_started_at, '-infinity'::timestamptz)
    ), 0) / 3600.0
    when p_kind = 'pr_count' then coalesce((
      select count(*) from public.personal_records pr
      join public.squad_members sm on sm.user_id = pr.athlete_id
      where sm.squad_id = p_squad and pr.achieved_on >= coalesce(p_started_at::date, '-infinity'::date)
    ), 0)
    else 0
  end;
$$;

-- 0048's contract, unchanged for its callers: members only, otherwise 0. Now a thin gate over the sum.
create or replace function public.squad_metric_total(p_squad uuid, p_kind text, p_key text, p_started_at timestamptz)
returns numeric
language sql
security definer
stable
set search_path = public
as $$
  select case
    when public.is_squad_member(p_squad, auth.uid())
      then public.squad_metric_sum(p_squad, p_kind, p_key, p_started_at)
    else 0
  end;
$$;

-- ── The whole preview, in one read ────────────────────────────────────────────
-- Returns jsonb (not a table) because the roster peek is a nested array. NULL means "not visible" —
-- the squad doesn't exist, or it's private and you're not in it. The client renders its missing state.
create or replace function public.squad_preview(p_squad uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_sq       public.squads%rowtype;
  v_members  int;
  v_today    int;
  v_progress numeric := 0;
  v_roster   jsonb;
  v_state    text;
begin
  select * into v_sq from public.squads where id = p_squad;
  if not found then
    return null;
  end if;

  -- The one gate. A public squad previews to anyone; a private one only to its own members (who reach
  -- this screen from a stale link and should see their squad, not a lie about it not existing).
  if v_sq.privacy <> 'public' and not public.is_squad_member(p_squad, v_uid) then
    return null;
  end if;

  select count(*)::int into v_members from public.squad_members where squad_id = p_squad;

  select count(distinct c.user_id)::int into v_today
    from public.squad_checkins c
   where c.squad_id = p_squad and c.created_at >= now() - interval '24 hours';

  if v_sq.goal_target is not null and v_sq.goal_started_at is not null then
    v_progress := public.squad_metric_sum(
      p_squad,
      coalesce(v_sq.goal_metric_kind, 'workout_count'),
      v_sq.goal_metric_key,
      v_sq.goal_started_at
    );
  end if;

  -- Roster peek — owner first, then most recently active, capped at 3 (what the design shows).
  -- Raw signals only; the screen turns last_workout_at / checked_in into its activity line.
  select coalesce(jsonb_agg(t.obj order by t.ord), '[]'::jsonb) into v_roster
    from (
      select
        jsonb_build_object(
          'id',              r.user_id,
          'name',            coalesce(p.name, 'Athlete'),
          'avatar_url',      p.avatar_url,
          'is_owner',        r.role = 'owner',
          'rank_family',     p.rank_family,
          'athlete_type',    p.athlete_type::text,
          'checked_in',      r.checked_in,
          'last_workout_at', r.last_at
        ) as obj,
        r.ord
      from (
        select
          m.user_id,
          m.role,
          lw.last_at,
          exists (
            select 1 from public.squad_checkins c
             where c.squad_id = p_squad and c.user_id = m.user_id
               and c.created_at >= now() - interval '24 hours'
          ) as checked_in,
          row_number() over (order by (m.role = 'owner') desc, lw.last_at desc nulls last, m.user_id) as ord
        from public.squad_members m
        left join lateral (
          select max(w.saved_at) as last_at from public.workouts w where w.athlete_id = m.user_id
        ) lw on true
        where m.squad_id = p_squad
      ) r
      join public.profiles p on p.id = r.user_id
      where r.ord <= 3
    ) t;

  v_state := case
    when v_uid is null then null
    when public.is_squad_member(p_squad, v_uid) then 'joined'
    when exists (
      select 1 from public.squad_join_requests q
       where q.squad_id = p_squad and q.user_id = v_uid and q.status = 'pending'
    ) then 'requested'
    else null
  end;

  return jsonb_build_object(
    'id',               v_sq.id,
    'name',             v_sq.name,
    'motto',            v_sq.motto,
    'description',      v_sq.description,
    'crest',            v_sq.crest,
    'photo_url',        v_sq.photo_url,
    'category',         v_sq.category,
    'join_mode',        v_sq.join_mode,
    'member_cap',       v_sq.member_cap,
    'created_at',       v_sq.created_at,
    'member_count',     v_members,
    'trained_today',    v_today,
    'goal',             v_sq.goal,
    'goal_target',      v_sq.goal_target,
    'goal_metric_kind', coalesce(v_sq.goal_metric_kind, 'workout_count'),
    'goal_metric_key',  v_sq.goal_metric_key,
    'goal_progress',    v_progress,
    'my_state',         v_state,
    'roster',           v_roster
  );
end;
$$;
