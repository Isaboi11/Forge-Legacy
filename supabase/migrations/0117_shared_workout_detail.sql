-- Forge Legacy — 0117: a shared workout recap opens the session, for everyone who can see the post
--
-- ══ WHAT WAS BROKEN ══════════════════════════════════════════════════════════════════════════════
--
-- `Social-Architecture-Amendment-002-Workout-Recap-Posts` §3 says a recap card taps "through to the
-- session on Activity Detail". The Friends feed does route there. But `fetchActivityDetail` reads
--
--     from workouts where id = $1 and athlete_id = auth.uid()
--
-- so it resolves for exactly one person: the author. Every other athlete who tapped a friend's recap —
-- the entire audience the post was written for — got "Couldn't load this session. It may have been
-- deleted." A dead link, on the one card in the feed that promises the most.
--
-- The Squad feed never even tried: a `recap` row opened `/squad-post/[id]`, which rebuilds a reduced
-- version of the same screen out of the `workout_summary` snapshot. So the same post type had two
-- different destinations depending on which feed you found it in, and neither was the one the
-- amendment specifies. Reported by the PO: *"the post of a workout recap should be the same page that
-- pulls up when you go to activity history and you click on a workout."*
--
-- ══ WHY AN RPC AND NOT AN RLS POLICY ═════════════════════════════════════════════════════════════
--
-- A policy on `workouts` would have to be readable as "…or somebody posted this workout to a feed you
-- are in", and would then apply to EVERY query against the table — including `fetchActivityHistory`,
-- the Progress Hub's set read, and the rank engine's aggregates, all of which say `athlete_id =
-- auth.uid()` today and would quietly start being able to return other people's rows if that clause
-- were ever dropped. One `security definer` function with one entry point is the narrower grant: it
-- answers exactly one question, for exactly one workout id, and `workouts` RLS stays "yours only".
--
-- ══ WHAT A VIEWER GETS, AND WHAT THEY DO NOT ═════════════════════════════════════════════════════
--
-- The SESSION, because that is what the author posted: its name, when it was, how long it took, the
-- distance if it was a run, every exercise with the sets actually logged, the records set in it, the
-- playlist, and the program it belonged to by name.
--
-- NOT four things the owner's own screen shows, each deliberately withheld:
--
--   · `ordinal` ("Workout #212") — a running count of the author's entire training life. The post
--     shared one session, not a lifetime total.
--   · `chapter` — athlete-authored prose about their own life ("Chapter III — The Rebuild"). Sharing a
--     workout is not sharing your Legacy.
--   · `partners` — other people's identities, who did not post anything.
--   · the program's ID, so it is named but not tappable: a viewer cannot open somebody else's program,
--     and a link that leads to a permission error is worse than a label.
--
-- The client renders their absence as absence — no ordinal line, no chapter row — rather than as a
-- zero. A value that is only ever its default is worse than an absent one (2026-08-01 audit).
--
-- ══ ENTITLEMENT IS THE POST, NOT THE RELATIONSHIP ════════════════════════════════════════════════
--
-- SOC-A2-D1 §2: *"friendship still exposes nothing… the athlete does."* This function refuses unless a
-- `squad_posts` row EXISTS carrying this workout on an audience the caller is in. Unfriend, leave the
-- squad, or delete the post and the session stops resolving — because the grant was never attached to
-- the workout, only ever to the post about it.
--
-- ⚠ PL/pgSQL binds column references at RUN time. Applying this proves the body parsed. The proof is
-- opening a squad-mate's recap card and seeing their sets.

create or replace function public.shared_workout_detail(p_workout_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_w   record;
begin
  if v_uid is null or p_workout_id is null then
    return null;
  end if;

  -- THE GATE. A post must exist, carry this workout, and be one this athlete is an audience for.
  if not exists (
    select 1
      from public.squad_posts p
     where p.workout_id = p_workout_id
       and (
            p.author_id = v_uid
         or (p.audience in ('FRIENDS', 'BOTH') and public.are_friends(p.author_id, v_uid))
         or (p.audience in ('SQUAD',   'BOTH') and p.squad_id is not null
             and public.is_squad_member(p.squad_id, v_uid))
       )
  ) then
    return null;
  end if;

  select w.id, w.athlete_id, w.workout_name, w.activity_type, w.started_at, w.duration_sec,
         w.distance, w.distance_unit, w.program_id,
         w.playlist_url, w.playlist_service, w.playlist_name
    into v_w
    from public.workouts w
   where w.id = p_workout_id
     and w.state = 'saved';

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_w.id,
    'author_id', v_w.athlete_id,
    'author_name', coalesce((select pr.name from public.profiles pr where pr.id = v_w.athlete_id), 'Athlete'),
    'workout_name', v_w.workout_name,
    'activity_type', v_w.activity_type,
    'started_at', v_w.started_at,
    'duration_sec', v_w.duration_sec,
    'distance', v_w.distance,
    'distance_unit', v_w.distance_unit,
    -- Named, not linked — see the header. `program_id` is deliberately not returned.
    'program_name', (select pg.name from public.programs pg where pg.id = v_w.program_id),
    'playlist_url', v_w.playlist_url,
    'playlist_service', v_w.playlist_service,
    'playlist_name', v_w.playlist_name,
    'exercises', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'name', we.name,
                 'section', we.section,
                 'position', we.position,
                 'catalog_key', we.catalog_key,
                 'sets', coalesce((
                   select jsonb_agg(
                            jsonb_build_object(
                              'set_index', ws.set_index,
                              'weight', ws.weight,
                              'weight_unit', ws.weight_unit,
                              'reps', ws.reps
                            ) order by ws.set_index)
                     from public.workout_sets ws
                    where ws.workout_exercise_id = we.id
                 ), '[]'::jsonb)
               ) order by we.position)
        from public.workout_exercises we
       where we.workout_id = v_w.id
    ), '[]'::jsonb),
    -- The records set on the day of this session. Narrowed to this session's exercises by the client,
    -- exactly as the owner's own read does — a record set in a different session that day belongs to
    -- that session, not this one.
    'milestones', coalesce((
      select jsonb_agg(
               case when pr.load_value is not null
                    then pr.load_value::text || ' ' || coalesce(pr.load_unit, 'lb') || ' ' || pr.exercise
                    else pr.exercise end)
        from public.personal_records pr
       where pr.athlete_id = v_w.athlete_id
         and pr.achieved_on = (v_w.started_at at time zone 'UTC')::date
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.shared_workout_detail(uuid) from public;
grant execute on function public.shared_workout_detail(uuid) to authenticated;


-- ══ AND THE SQUAD FEED HAS TO CARRY THE ID, THE WAY THE FRIENDS FEED ALREADY DOES ═════════════════
--
-- Exactly the omission 0113 fixed on the other side, in the other direction. `friends_feed()` returns
-- `workout_id`, so the Friends card has always been able to route to the session. `squad_feed()` and
-- `squad_post_one()` select `workout_summary` and NOT `workout_id` — so a squad recap card had nowhere
-- to send you, and `onOpen` fell back to the post page. Same table, same column, one caller reading it.
--
-- Dropped first: `create or replace` cannot change a set-returning function's OUT columns (42P13) — the
-- same failure 0057 hit and 0109 hit again. Everything else below is 0057's body verbatim, including
-- the LEFT JOIN on profiles that keeps an authorless weekly recap in the feed.

drop function if exists public.squad_feed(uuid, int, int);
create function public.squad_feed(p_squad uuid, p_limit int, p_offset int)
returns table (
  id uuid, type text, body text, pr_value text, pr_exercise text, pr_label text,
  author_id uuid, author_name text, author_avatar text, author_is_owner boolean,
  created_at timestamptz, comment_count bigint, respect_count bigint, i_reacted boolean,
  media jsonb, workout_summary jsonb, layout jsonb, recap jsonb, workout_id uuid
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
    p.media, p.workout_summary, p.layout, p.recap, p.workout_id
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
  squad_id uuid, squad_name text, squad_owner_id uuid, workout_id uuid
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
    s.id, s.name, s.owner_id, p.workout_id
  from public.squad_posts p
  join public.squads s on s.id = p.squad_id
  left join public.profiles pr on pr.id = p.author_id
  where p.id = p_post;
$$;
