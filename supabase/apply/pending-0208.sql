-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0208: a shared session says who else was there
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: §1 is `create or replace`, §2 is read-only.
--
-- ⚠ Supabase's editor shows only the LAST statement's result, so §2 is the only output you will see.
--
-- ⚠ VERIFIED BY SOURCE, NOT BY CALLING. `shared_workout_detail` is `security definer` and reads
--   `auth.uid()`; the SQL editor runs as `postgres`, where that is NULL and the function returns null
--   for every input. Calling it here would prove nothing. §2 therefore reads the installed definition
--   back out of the catalog and asserts the new key is in it.
--
-- ⚠ ORDER DOES NOT MATTER against the client deploy, unusually. This only ADDS a key to a jsonb
--   return value; the client that is deployed right now never reads it and is unaffected. Paste it
--   before or after the web deploy.
--
-- ⚠ `0207` (micros) and `0209` (target weight snapshot) may also be unpasted. All three are
--   INDEPENDENT — different tables, different functions — and may be pasted in any order.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §1 — the migration, verbatim from supabase/migrations/0208_shared_workout_partners.sql
-- ───────────────────────────────────────────────────────────────────────────────────────────────

-- 0208 — the people on the post: a shared session finally says who else was there.
--
-- ══ WHY ══
--
-- PO, 2026-09-23: *"I did a walk and added someone to my workout. I posted that workout in the squad.
-- How come they didn't show up on the face card of the post?"*
--
-- They didn't because nothing ever put them there. The tags are written to `workouts.partners` at save
-- and read by every surface that belongs to their author — Activity History's "with Selene", Activity
-- Detail's Trained With row, 0079's twenty-four partnership honors — and then the share snapshot
-- dropped them. The post was the one place in the app that forgot who was in the room.
--
-- The client half of this pass snapshots the names into `workout_summary.partners` and draws them on
-- the feed card. This is the other half: the session that card OPENS.
--
-- ══ WHAT CHANGES, AND WHAT 0117 DECIDED ══
--
-- 0117 withheld `partners` deliberately, and its reason was right for what it was looking at: *"other
-- people's identities, who did not post anything."* That reason held while the only available source
-- was the workout row — a live column, read at view time, attached to the workout rather than to any
-- act of sharing. It does not hold for a name the author published on a specific post to a specific
-- audience, which is a thing they chose, once, and which stays what it was.
--
-- So the grant is not "partners are public now". It is the `shareRoute` shape, exactly:
--
--   · the names come from the POST'S SNAPSHOT, never from `workouts.partners`
--   · from a post that carries this workout to an audience this viewer is in
--   · and the GOAL DOOR (0134) never opens them — no post, no composer, nobody chose
--
-- ⚠ STILL NAMES, NEVER IDS. A viewer learns who was there; they do not get a link to them. The
-- partner did not post anything and has not agreed to be a tap target on somebody else's card, which
-- is the engagement loop `Workout-With-Friend-Spec-WwF` §1 refuses.
--
-- ⚠ REBUILD FROM THIS BODY, NEVER 0117'S OR 0134'S OR 0185'S. This is 0185's body verbatim plus the
-- partners consent and its key — the trap 0117 warned about, that 0134 fell into (deleting 0127's
-- set-level `duration_sec`), and that 0185 had to undo.
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
  v_partners    jsonb := '[]'::jsonb;
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

  -- ══ WHO ELSE WAS THERE (0208) ══
  --
  -- ⚠ FROM THE POST'S SNAPSHOT, NEVER FROM `workouts.partners`. That column is the author's own record
  -- of their own session; this key is the names they published WITH a particular post. Reading the
  -- column instead would mean untagging somebody a week later silently rewrote a card their squad had
  -- already seen — and, far worse, that the goal door below would hand out names on a session nobody
  -- ever posted. Same rule, same shape and the same three-part test as `shareRoute`: a post that
  -- carries this workout, to an audience this viewer is in, carrying these names.
  --
  -- `->` on a missing key yields NULL, so every post written before 0208 answers with the default
  -- empty array and the viewer's Trained With row simply does not draw. Nothing is backfilled and no
  -- post already in a feed gains a name it was not shared with.
  v_partners := coalesce((
    select p.workout_summary -> 'partners'
      from public.squad_posts p
     where p.workout_id = p_workout_id
       and jsonb_typeof(p.workout_summary -> 'partners') = 'array'
       and (
            p.author_id = v_uid
         or (p.audience in ('FRIENDS', 'BOTH') and public.are_friends(p.author_id, v_uid))
         or (p.audience in ('SQUAD',   'BOTH') and p.squad_id is not null
             and public.is_squad_member(p.squad_id, v_uid))
       )
     order by p.created_at desc
     limit 1
  ), '[]'::jsonb);

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
    -- Names, never ids: the partner did not post this and is not a tap target on it.
    'partners', v_partners,
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
  'Reads one saved workout for somebody who is not its author. TWO entitlements, either sufficient: a squad_posts row carrying it to an audience the caller is in (0117), or a goal contribution in a squad the caller is a MEMBER of, inside that goal''s window (0134). Returns the route ONLY when a post the caller can see was composed with workout_summary->>''shareRoute'' = ''true'' (D-RS-3, 0185), and the Trained With names ONLY from workout_summary->''partners'' on such a post (0208) — the goal door opens neither. Never grants ordinal, chapter, workouts.partners or the program id. Rebuild from 0208''s body, never an earlier one: 0134 rebuilt from 0117 and silently deleted the set-level duration_sec that 0127 added.';


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §2 — the report. Read-only, and read off the CATALOG rather than off a call.
--
-- Expect: partners_key t · snapshot_sourced t · not_from_workouts_column t · route_key_intact t
--
-- `not_from_workouts_column` is the one that matters most. It asserts the installed body never reads
-- `w.partners` — the live column on the workout row — which would hand out names on a session nobody
-- posted, through the goal door that has no composer behind it and therefore no consent.
-- ───────────────────────────────────────────────────────────────────────────────────────────────

with def as (
  select pg_get_functiondef('public.shared_workout_detail(uuid)'::regprocedure) as src
)
select
  src like '%''partners'', v_partners%'                     as partners_key,
  src like '%workout_summary -> ''partners''%'              as snapshot_sourced,
  src not like '%w.partners%'                               as not_from_workouts_column,
  src like '%''route'', v_route%'                           as route_key_intact,
  src like '%''duration_sec'', ws.duration_sec%'            as set_duration_intact
from def;
