-- ═════════════════════════════════════════════════════════════════════════════
-- PASTE BUNDLE — 0185. Paste this WHOLE FILE into the Supabase SQL editor at once.
-- Safe to run twice: `create or replace function` only. No table is touched, no data is written,
-- nothing is dropped.
-- ═════════════════════════════════════════════════════════════════════════════
--
-- WHAT IT DOES — two things to one function, `shared_workout_detail`:
--
--  1. THE SHARED MAP, BEHIND ITS CONSENT (D-RS-3). Route-Sharing-Amendment-001 §3 approved the route
--     on a shared Activity Detail; §4 requires the athlete to include it while composing that post.
--     The function now returns `route` and `climb_m` only when a post the caller can actually see
--     carries `workout_summary ->> 'shareRoute' = 'true'`.
--
--  2. RESTORES `duration_sec` ON SHARED SETS. 0127 added it; 0134 rebuilt the function from 0117's
--     body and deleted it again without noticing. Every shared hold, plank, carry and cardio bout has
--     read back as a blank line since. This is a bug fix riding along, not a new feature.
--
-- ⚠ NOTHING SHARES RETROACTIVELY, AND NOTHING NEEDED A BACKFILL. Consent lives in the post's existing
--   `workout_summary` JSONB. An older post has no `shareRoute` key; `coalesce(..., 'false')` reads
--   that as "no". No post gains a map by being migrated.
--
-- ⚠ THE GOAL-CONTRIBUTION DOOR (0134) NEVER OPENS THE MAP. It has no post behind it, so nobody ever
--   chose. It still resolves the session; it can never resolve the route.
--
-- ⚠ AFTER THIS APPLIES, THE MAP STILL WILL NOT APPEAR until the client that WRITES `shareRoute` is
--   deployed. Applying is not working — see §3's prediction.


-- ═════════════════════════════════════════════════════════════════════════════
-- §1 — THE STATEMENTS. Carried over verbatim from
--      supabase/migrations/0185_shared_route_consent.sql
-- ═════════════════════════════════════════════════════════════════════════════

-- 0185 — the shared map, behind the consent that was decided but never built (D-RS-3).
--
-- ══ WHY ══
--
-- `Route-Sharing-Amendment-001` §3 (D-RS-2) names the shared Activity Detail as a place a route MAY
-- appear. §4 (D-RS-3) gates it: *"The map goes on a post only when the athlete includes it while
-- composing that post. Nothing shares retroactively."* Until now the client answered that by hardcoding
-- `route: null` on every shared read, and this function never returned the columns at all — which was
-- honest, and also meant the approved feature did not exist. This builds the gate the amendment asked
-- for, so the map can be shown when, and only when, its author chose to show it.
--
-- ⚠ CONSENT LIVES ON THE POST, IN `workout_summary`. It is a JSONB snapshot, so the choice costs no
--   column and needs no backfill — and every post written before today has no `shareRoute` key, reads
--   as false, and keeps exactly the mapless card it has always had. That IS "nothing shares
--   retroactively", enforced by the absence of a key rather than by a migration that has to guess.
--
-- ⚠ THE GOAL-CONTRIBUTION DOOR NEVER OPENS THE MAP. 0134 added a second entitlement — a session that
--   counted toward a squad goal — and it has no post behind it, therefore no composer, therefore
--   nobody ever chose. It still resolves the SESSION; it can never resolve the route. A consent
--   default of "whatever the other door decided" is how an opt-in becomes decoration.
--
-- ══ ⚠ AND IT RESTORES `duration_sec`, WHICH 0134 DELETED BY ACCIDENT ══
--
-- 0127 added `duration_sec` to each shared set, because a HOLD answers in seconds and has no reps:
-- without it the viewer got `reps: null` and drew an empty line. 0134 then rebuilt this function from
-- 0117's body — the exact trap 0117's own comment warns about — and the key went with it. It has been
-- missing ever since, which is why a shared plank, dead hang, carry, or the duration of a cardio bout
-- reads as a blank row today. `fetchSharedActivityDetail` has been mapping a key nobody was sending.
--
-- ⚠ REBUILD FROM THIS BODY. It is 0134 plus 0127's `duration_sec` plus the two route keys.
--
-- Safe to run twice. `create or replace` only.

create or replace function public.shared_workout_detail(p_workout_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid         uuid := auth.uid();
  v_w           record;
  v_posted      boolean;
  v_share_route boolean;
  v_route       text := null;
  v_climb_m     integer := null;
begin
  if v_uid is null or p_workout_id is null then
    return null;
  end if;

  -- DOOR 1 (0117) — a post carries this workout to an audience this athlete is in. Entitlement is the
  -- POST: unfriend, leave the squad or delete the post and the session stops resolving.
  --
  -- Resolved into a variable rather than tested inline, because the route gate below needs to ask a
  -- narrower version of the same question and the two must not drift apart.
  v_posted := exists (
    select 1
      from public.squad_posts p
     where p.workout_id = p_workout_id
       and (
            p.author_id = v_uid
         or (p.audience in ('FRIENDS', 'BOTH') and public.are_friends(p.author_id, v_uid))
         or (p.audience in ('SQUAD',   'BOTH') and p.squad_id is not null
             and public.is_squad_member(p.squad_id, v_uid))
       )
  );

  -- DOOR 2 (0134) — the session counted toward a goal of a squad this athlete is a MEMBER of.
  -- Entitlement is the shared goal: leave the squad, or let the goal's window close behind the
  -- session, and it stops resolving the same way.
  if not v_posted and not exists (
    -- The same window `squad_goal_detail` uses to LIST the contribution, so the gate cannot refuse a
    -- row the screen just offered. `is_squad_member` is the one deliberate narrowing — see 0134.
    select 1
      from public.workouts w
      join public.squad_members sm on sm.user_id = w.athlete_id
      join public.squads s on s.id = sm.squad_id
     where w.id = p_workout_id
       and s.goal is not null
       and public.is_squad_member(s.id, v_uid)
       and w.saved_at >= coalesce(s.goal_started_at, '-infinity'::timestamptz)
       and w.saved_at < public.squad_goal_window_end(s.id)
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

  -- ══ THE CONSENT (D-RS-3) ══
  --
  -- A post that (a) carries this workout, (b) this athlete is an audience for, and (c) was composed
  -- with the map included. All three, on the SAME post: a route shared to a squad must not become
  -- visible to a friend through a different, mapless post of the same session.
  --
  -- `->>` on a missing key yields NULL, which `coalesce` reads as 'false'. Every post predating this
  -- migration therefore withholds the map without anything having to be written to it.
  v_share_route := exists (
    select 1
      from public.squad_posts p
     where p.workout_id = p_workout_id
       and coalesce(p.workout_summary ->> 'shareRoute', 'false') = 'true'
       and (
            p.author_id = v_uid
         or (p.audience in ('FRIENDS', 'BOTH') and public.are_friends(p.author_id, v_uid))
         or (p.audience in ('SQUAD',   'BOTH') and p.squad_id is not null
             and public.is_squad_member(p.squad_id, v_uid))
       )
  );

  if v_share_route then
    -- The first set carrying a shape wins, and its climb comes from the SAME row — exactly the rule
    -- the owner's own read uses (`activity-live.ts`). One session holds at most one tracked bout
    -- today; ordering makes the answer stable rather than assuming that stays true.
    select ws.route, ws.climb_m
      into v_route, v_climb_m
      from public.workout_sets ws
      join public.workout_exercises we on we.id = ws.workout_exercise_id
     where we.workout_id = v_w.id
       and ws.route is not null
     order by we.position, ws.set_index
     limit 1;
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
    -- Named, not linked — see 0117's header. `program_id` is deliberately not returned.
    'program_name', (select pg.name from public.programs pg where pg.id = v_w.program_id),
    'playlist_url', v_w.playlist_url,
    'playlist_service', v_w.playlist_service,
    'playlist_name', v_w.playlist_name,
    -- NULL unless the author ticked the map on a post this viewer can see. Absent and null are the
    -- same thing to the client, which draws no Route section either way.
    'route', v_route,
    'climb_m', v_climb_m,
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
                              'reps', ws.reps,
                              -- ⚠ RESTORED. Added by 0127, dropped by 0134's rebuild. A hold answers in
                              -- seconds and has no reps at all; without this key the viewer gets
                              -- `reps: null` and draws an empty line.
                              'duration_sec', ws.duration_sec
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

comment on function public.shared_workout_detail(uuid) is
  'Reads one saved workout for somebody who is not its author. TWO entitlements, either sufficient: a squad_posts row carrying it to an audience the caller is in (0117), or a goal contribution in a squad the caller is a MEMBER of, inside that goal''s window (0134). Returns the route ONLY when a post the caller can see was composed with workout_summary->>''shareRoute'' = ''true'' (D-RS-3, 0185) — the goal door never opens the map. Never grants ordinal, chapter, partners or the program id. Rebuild from 0185''s body, never 0117''s or 0134''s: 0134 rebuilt from 0117 and silently deleted the set-level duration_sec that 0127 added.';

-- ═════════════════════════════════════════════════════════════════════════════
-- §2 — THE ASSERTION. Raises if the function did not actually take the new body.
--      A migration that returns a tidy green having done nothing is what this prevents.
-- ═════════════════════════════════════════════════════════════════════════════

do $verify$
declare
  src     text;
  missing text := '';
begin
  select p.prosrc
    into src
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = 'shared_workout_detail';

  if src is null then
    raise exception '0185 DID NOT APPLY. public.shared_workout_detail does not exist at all.';
  end if;

  -- The consent gate, by the exact key the client writes. Probed on names rather than on quoted SQL
  -- literals so this block stays readable and needs no escaping of its own.
  if position('shareRoute' in src) = 0    then missing := missing || ' consent-gate(shareRoute)'; end if;
  if position('v_share_route' in src) = 0 then missing := missing || ' consent-variable';         end if;

  -- The two values the gate exists to release.
  if position('v_route' in src) = 0   then missing := missing || ' route';   end if;
  if position('v_climb_m' in src) = 0 then missing := missing || ' climb_m'; end if;

  -- ⚠ THE ONE 0134 LOST. Absent means the function is still an old body and the blank-hold bug is live.
  if position('ws.duration_sec' in src) = 0 then
    missing := missing || ' set-duration_sec(0127-regression)';
  end if;

  if missing <> '' then
    raise exception '0185 DID NOT FULLY APPLY. Missing:%', missing;
  end if;

  raise notice '0185 OK — consent gate, route, climb_m, and the restored set duration_sec are all present.';
end $verify$;


-- ═════════════════════════════════════════════════════════════════════════════
-- §3 — WHAT IS NOW THERE. Read-only.
-- ═════════════════════════════════════════════════════════════════════════════

-- The function's own account of itself, so the next person rebuilding it reads the warning first.
select obj_description(p.oid, 'pg_proc') as shared_workout_detail_comment
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname = 'shared_workout_detail';

-- ⚠ PREDICTION, to be read against the actual output:
--
--   posts_total            > 0   — the feed has posts.
--   posts_with_a_workout   > 0   — some of them are recaps.
--   posts_sharing_route    = 0   ← MUST BE ZERO. The composer that writes `shareRoute` is committed
--                                  but NOT deployed. Any other number means something is writing this
--                                  key that should not be, and consent is not the only way in.
--   sessions_with_a_route  > 0   — routes have been stored since 0162; they were simply never read.
--
-- After the client deploys and somebody ticks the box on a real post, `posts_sharing_route` becomes 1.
select
  (select count(*) from public.squad_posts)                                             as posts_total,
  (select count(*) from public.squad_posts where workout_id is not null)                as posts_with_a_workout,
  (select count(*) from public.squad_posts
    where coalesce(workout_summary ->> 'shareRoute', 'false') = 'true')                 as posts_sharing_route,
  (select count(distinct we.workout_id)
     from public.workout_sets ws
     join public.workout_exercises we on we.id = ws.workout_exercise_id
    where ws.route is not null)                                                         as sessions_with_a_route;
