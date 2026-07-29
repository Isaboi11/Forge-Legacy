-- Forge Legacy — 0053: squads are request-to-join only; size ceiling 10 → 50
--
-- Two product decisions, taken together (see `Docs/Amendments/Squad-Architecture-Amendment-003-Size-And-Joining.md`):
--
--   1. OPEN JOINING IS REMOVED. 0050 gave a public squad two doors: 'open' (a stranger self-admits) and
--      'approval' (the owner decides). Open doesn't earn its place — the invite code (0040) already
--      covers "let specific people in without ceremony", including on a PRIVATE squad, so open only
--      served the narrow case of wanting strangers without wanting to review them. Against that sits
--      SQ-D2, which lifts the Performance Firewall inside a squad precisely because everyone chose
--      these specific people: a stranger self-admitting into shared progress, streak, feed, and
--      standings with zero owner action contradicts the reason squads get that visibility at all.
--      Every public squad is now request-to-join.
--
--   2. THE SIZE CEILING GOES 10 → 50, amending SQ-D1's locked 10. The 10-member figure predates
--      Discover; the design's own public squads run 15–48 members. `member_cap` already permitted up
--      to 50, so this is a default change, not a new constraint.
--
-- `join_mode` and `join_public_squad` are DROPPED rather than left in place set to 'approval' — a
-- column nothing reads is a trap for the next person. To restore open joining, re-run 0050's
-- `join_mode` column block and its `join_public_squad` function.
--
-- Depends on 0052. Idempotent. RUN BY HAND in the Supabase SQL editor, after 0052.

-- ── 1 · Size ceiling ──────────────────────────────────────────────────────────
alter table public.squads alter column member_cap set default 50;
-- Nothing can set member_cap yet, so every existing row still carries 0050's default of 10.
update public.squads set member_cap = 50 where member_cap = 10;

-- ── 2 · Functions stop reading join_mode ──────────────────────────────────────
-- Redefined BEFORE the column is dropped so no function is briefly pointing at a missing column.

-- `create or replace` cannot change a set-returning function's OUT columns (42P13), and this one is
-- losing `join_mode` — so it has to be dropped first. Same reason 0042 dropped+recreated the feed RPCs.
drop function if exists public.discover_squads();

create or replace function public.discover_squads()
returns table (
  id            uuid,
  name          text,
  motto         text,
  description   text,
  crest         text,
  photo_url     text,
  category      text,
  member_cap    int,
  member_count  int,
  trained_today int,
  my_state      text
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  return query
  select
    s.id,
    s.name,
    s.motto,
    s.description,
    s.crest,
    s.photo_url,
    s.category,
    s.member_cap,
    (select count(*)::int from public.squad_members m where m.squad_id = s.id),
    (select count(distinct c.user_id)::int
       from public.squad_checkins c
      where c.squad_id = s.id and c.created_at >= now() - interval '24 hours'),
    case
      when v_uid is null then null::text
      when exists (select 1 from public.squad_members m where m.squad_id = s.id and m.user_id = v_uid) then 'joined'::text
      when exists (select 1 from public.squad_join_requests r
                    where r.squad_id = s.id and r.user_id = v_uid and r.status = 'pending') then 'requested'::text
      else null::text
    end
  from public.squads s
  where s.privacy = 'public'
  order by 10 desc, s.created_at desc  -- most active first, then newest (10 = trained_today)
  limit 200;
end;
$$;

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

-- create_squad loses p_join_mode. Drop 0050's 8-arg form so the named-argument call stays unambiguous.
drop function if exists public.create_squad(text, text, text, text, text, text, text, text);

create or replace function public.create_squad(
  p_name text,
  p_description text,
  p_privacy text,
  p_crest text,
  p_motto text,
  p_goal text,
  p_category text default null
)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_uid   uuid := auth.uid();
  v_squad uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  insert into public.squads (name, description, privacy, crest, motto, goal, category, owner_id)
    values (
      p_name,
      nullif(btrim(p_description), ''),
      coalesce(p_privacy, 'private'),
      coalesce(p_crest, 'swords'),
      nullif(btrim(p_motto), ''),
      nullif(btrim(p_goal), ''),
      nullif(btrim(p_category), ''),
      v_uid
    )
    returning id into v_squad;
  insert into public.squad_members (squad_id, user_id, role) values (v_squad, v_uid, 'owner');
  return jsonb_build_object('squad_id', v_squad);
end;
$$;

-- ── 3 · Retire open joining ───────────────────────────────────────────────────
-- The instant-join door. Nothing calls it once the client ships request-only.
drop function if exists public.join_public_squad(uuid);

alter table public.squads drop constraint if exists squads_join_mode_chk;
alter table public.squads drop column if exists join_mode;
