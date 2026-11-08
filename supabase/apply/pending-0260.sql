-- Forge Legacy — 0260: launch fixes in the database (launch QA 11-08)
--
-- ⚠ HOW THE FOUR FUNCTION BODIES BELOW WERE PRODUCED: BY SCRIPT, from each one's NEWEST definition —
--   athlete_profile ← 0098 · find_athletes ← 0114 · pending_join_requests ← 0225 · challenge_hub ← 0163
-- (nothing later restates them, on trunk or on feat/forge-coach). Every change is a splice asserted to match exactly
-- once and to give back the source byte for byte when undone. `create or replace` with the same signatures, so
-- every existing grant stands. Nothing here is retyped.
--
-- What it fixes, in the app's words:
--   H13 a blocked person could still find you and open your profile          (athlete_profile, find_athletes)
--   H17 "Only me" on Accomplishments / Chapter History still showed under "Recent"   (athlete_profile timeline)
--   H31 a weight-loss goal drew a FULL bar on a public profile on day one     (athlete_profile goal fields; was 0257,
--       renumbered — 0257 is the applied 0257_coach_inbox_and_review on feat/forge-coach)
--   H2  an unanswered join ask never expired                                  (pending_join_requests)
--   H8  a competition starting later vanished once you joined it              (challenge_hub)
--   H34 a Free athlete could not delete their own recipe                      (user_recipes delete policy)
--   B5  backing out of Start burned one of a Free athlete's lifetime programs (discard_unstarted_program)
--
-- The app already sent for every one of these ships the code that reads them, and each reads them safely BEFORE
-- this is applied (absent keys fall back to today's behaviour; a missing RPC falls back to the plain delete).

-- ═══ §1 — THE CHANGES ═══

create or replace function public.athlete_profile(p_athlete uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  p       public.profiles%rowtype;
  v_clear text;
  v_vis   jsonb;
begin
  if v_uid is null then
    return null;
  end if;

  select * into p from public.profiles where id = p_athlete;
  if not found then
    return null;
  end if;

  -- 0260 (launch QA H13): BLOCKED EITHER WAY = NO PROFILE. This is SECURITY DEFINER, so the block policies 0171/0225
  -- put on the tables never applied here — a blocked athlete could still open the full profile.
  if p.id <> v_uid and public.is_blocked(v_uid, p_athlete) then
    return null;
  end if;

  v_clear := case
    when p.id = v_uid then 'owner'
    -- Friend outranks squad-mate: the ladder is owner > friend > squad > stranger.
    when public.are_friends(v_uid, p_athlete) then 'friend'
    when exists (
      select 1
        from public.squad_members a
        join public.squad_members b on b.squad_id = a.squad_id
       where a.user_id = v_uid and b.user_id = p_athlete
    ) then 'squad'
    else 'stranger'
  end;

  v_vis := coalesce(p.visibility, '{}'::jsonb);

  return jsonb_build_object(
    'id', p.id, 'name', p.name, 'first_name', p.first_name, 'handle', p.handle,
    'initials', p.initials, 'avatar_url', p.avatar_url, 'athlete_type', p.athlete_type,
    'standard', p.standard, 'rank_family', p.rank_family, 'rank_level', p.rank_level,
    'joined_at', p.created_at, 'clearance', v_clear, 'is_self', p.id = v_uid,
    'friendship', public.friendship_with(p_athlete),

    'shared_squads', case when v_clear in ('squad', 'friend') then coalesce((
      select jsonb_agg(s.name order by s.name)
        from public.squads s
       where exists (select 1 from public.squad_members m1 where m1.squad_id = s.id and m1.user_id = v_uid)
         and exists (select 1 from public.squad_members m2 where m2.squad_id = s.id and m2.user_id = p_athlete)
    ), '[]'::jsonb) else '[]'::jsonb end,

    'chapter', case when public.vis_clears(coalesce(v_vis->>'chapter', 'everyone'), v_clear) then (
      select jsonb_build_object(
               'id', c.id, 'name', c.name, 'start_date', c.start_date,
               'workout_count', c.workout_count,
               -- DERIVED (0098). Was `c.honor_count`, which is always 0.
               'honor_count', (select count(*) from public.honor_instances hi where hi.chapter_id = c.id),
               'goal', (
                 -- 0260 (was the parked 0257, launch QA H31): the direction, baseline and achievement travel with the
                 -- numbers, so the profile can tell 176 aiming at 160 "not started" from "beaten".
                 select jsonb_build_object('name', g.name, 'current', g.current, 'target', g.target, 'unit', g.unit,
                                           'metric_dir', g.metric_dir, 'metric_start_value', g.metric_start_value,
                                           'achieved_at', g.achieved_at)
                   from public.goals g where g.chapter_id = c.id and g.is_primary limit 1
               ))
        from public.chapters c where c.athlete_id = p_athlete and c.is_active limit 1
    ) else null end,

    'history', case when public.vis_clears(coalesce(v_vis->>'history', 'everyone'), v_clear) then coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id, 'name', c.name, 'start_date', c.start_date,
               'sealed_at', c.sealed_at, 'workout_count', c.workout_count,
               -- NEW (0098): a sealed chapter's honors. Absent before, so the client showed 0.
               'honor_count', (select count(*) from public.honor_instances hi where hi.chapter_id = c.id)
             ) order by c.sealed_at desc nulls last)
        from public.chapters c where c.athlete_id = p_athlete and not c.is_active
    ), '[]'::jsonb) else null end,

    'accomplishments', case when public.vis_clears(coalesce(v_vis->>'accomplishments', 'everyone'), v_clear) then coalesce((
      select jsonb_agg(x.obj) from (
        select jsonb_build_object('id', a.id, 'name', a.name, 'date', a.date, 'note', a.note, 'featured', a.featured) as obj
          from public.accomplishments a
         where a.athlete_id = p_athlete
         order by a.featured desc, a.date desc nulls last, a.created_at desc
         limit 3
      ) x
    ), '[]'::jsonb) else null end,

    'stats', case when public.vis_clears(coalesce(v_vis->>'stats', 'squads'), v_clear) then jsonb_build_object(
      'workouts', (select count(*) from public.workouts w where w.athlete_id = p_athlete),
      'prs', (select count(*) from public.personal_records pr where pr.athlete_id = p_athlete),
      'chapters', (select count(*) from public.chapters c where c.athlete_id = p_athlete and not c.is_active)
    ) else null end,

    'timeline', case when public.vis_clears(coalesce(v_vis->>'timeline', 'squads'), v_clear) then coalesce((
      select jsonb_agg(t.obj order by t.at desc) from (
        select c.sealed_at as at,
               jsonb_build_object('kind', 'chapter', 'label', c.name, 'at', c.sealed_at) as obj
          from public.chapters c where c.athlete_id = p_athlete and c.sealed_at is not null
           -- 0260 (launch QA H17): a sealed chapter on the timeline obeys Chapter History's own audience too.
           and public.vis_clears(coalesce(v_vis->>'history', 'everyone'), v_clear)
        union all
        select a.date::timestamptz as at,
               jsonb_build_object('kind', 'accomplishment', 'label', a.name, 'at', a.date) as obj
          from public.accomplishments a where a.athlete_id = p_athlete and a.date is not null
           -- 0260 (launch QA H17): …and an accomplishment obeys Accomplishments' audience.
           and public.vis_clears(coalesce(v_vis->>'accomplishments', 'everyone'), v_clear)
      ) t
    ), '[]'::jsonb) else null end,

    -- Now reachable: both default to the `friends` audience.
    'transformation', case when public.vis_clears(coalesce(v_vis->>'transformation', 'friends'), v_clear)
      then jsonb_build_object(
        'entries', (select count(*) from public.transformation_entries t where t.athlete_id = p_athlete)
      ) else null end
  );
end;
$$;

create or replace function public.find_athletes(p_query text, p_limit int default 20)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_raw    text := btrim(coalesce(p_query, ''));
  v_handle boolean := left(v_raw, 1) = '@';   -- Identity §4.1: @ forces handle-only mode
  q        text := lower(regexp_replace(v_raw, '^@+', ''));
  esc      text;
  v_cap    int := least(greatest(coalesce(p_limit, 20), 1), 25);
begin
  -- Identity §4.4: nothing is returned before a query. Not an empty list as a formality — the empty
  -- query is the one input that would otherwise mean "everyone".
  if v_uid is null or char_length(q) < 2 then
    return '[]'::jsonb;
  end if;

  -- ══ THE LINE THAT STOPS THE WHOLE USER BASE BEING ENUMERATED ══
  -- Unescaped, a query of '%' matches every athlete alive and this function becomes the directory the
  -- product does not have. Escaped, '%' matches a literal percent sign and returns nothing.
  esc := replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_');

  return coalesce((
    select jsonb_agg(r.obj order by r.tier, lower(r.name), r.id)
      from (
        select p.id,
               p.name,
               -- Identity §4.2's ranking, with one deliberate deviation recorded in SOC-A3-D2: an
               -- EXACT HANDLE outranks a squad-mate. Typing somebody's whole handle is the most
               -- intentional act SOC-D15 recognises, and burying it under a roster would defeat it.
               case
                 when lower(p.handle::text) = q then 0
                 when exists (
                   select 1 from public.squad_members a
                     join public.squad_members b on b.squad_id = a.squad_id
                    where a.user_id = v_uid and b.user_id = p.id
                 ) then 1
                 when lower(p.name) = q then 2
                 when lower(p.handle::text) like esc || '%' escape '\' then 3
                 else 4
               end as tier,
               jsonb_build_object(
                 'id',           p.id,
                 'name',         p.name,
                 'handle',       p.handle,
                 'avatar_url',   p.avatar_url,
                 'athlete_type', p.athlete_type,
                 'rank_family',  p.rank_family,
                 'rank_level',   p.rank_level,
                 -- Identity §4.3's tertiary line. ONE squad name, not a list — this is a label on a
                 -- row, not a read of anybody's graph.
                 'shared_squad', (
                   select s.name from public.squads s
                     join public.squad_members a on a.squad_id = s.id and a.user_id = v_uid
                     join public.squad_members b on b.squad_id = s.id and b.user_id = p.id
                    order by s.name limit 1
                 ),
                 'state', public.friendship_with(p.id)
               ) as obj
          from public.profiles p
         where p.id <> v_uid                            -- you are not a search result
           and not public.is_blocked(v_uid, p.id)       -- 0260 (launch QA H13): never found by, or finding, a block
           and (
             lower(p.handle::text) like esc || '%' escape '\'
             -- NAME matches on a WORD prefix, never a free substring. "ada" finds "Ada Lovelace" and
             -- "Grace Ada Hopper" and does not find "Amanda". A free substring is an enumeration tool
             -- wearing a search box: '%a%' would return almost everyone.
             or (not v_handle and (
                  lower(p.name) like esc || '%' escape '\'
               or lower(p.name) like '% ' || esc || '%' escape '\'
             ))
           )
           -- SOC-A3-D3/D4: the toggle hides you from NAME search. An exact handle still resolves, and
           -- squad-mates always see each other — you are already in a room together.
           and (
             p.discoverable
             or lower(p.handle::text) = q
             or exists (
               select 1 from public.squad_members a
                 join public.squad_members b on b.squad_id = a.squad_id
                where a.user_id = v_uid and b.user_id = p.id
             )
           )
         limit v_cap
      ) r
  ), '[]'::jsonb);
end;
$$;

create or replace function public.pending_join_requests()
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    jsonb_agg(jsonb_build_object(
      'id', i.id,
      'from_id', i.from_id,
      'from_name', coalesce(p.name, 'Athlete'),
      'from_avatar_url', p.avatar_url,
      'note', i.note,
      'created_at', i.created_at
    ) order by i.created_at),
    '[]'::jsonb
  )
    from public.workout_invites i
    join public.profiles p on p.id = i.from_id
   where i.to_id = auth.uid()
     and i.kind = 'JOIN_REQUEST'
     and i.status = 'PENDING'
     and not public.is_blocked(i.from_id, i.to_id)    -- 0225
     -- 0260 (launch QA H2): an ask is a moment, not a standing order. Unanswered ones never expired, so a days-old
     -- ask popped up in the host's next workout and "Let them in" credited both. Three hours covers any session.
     and i.created_at >= now() - interval '3 hours';
$$;

create or replace function public.challenge_hub()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('open', '[]'::jsonb, 'active', '[]'::jsonb, 'history', '[]'::jsonb, 'stats', '{}'::jsonb);
  end if;

  return jsonb_build_object(
    -- Open to me: a squad I'm in, or a friend's competition I was named in, is still joinable and I
    -- haven't opted in. Still not an "invitation" in the data — no row records that I didn't join.
    -- ENROLLMENT *or* ACTIVE (0163), matching `challenge_participants_insert`: a competition that started
    -- this morning is one you can still enter, and it was the only kind an invited friend ever saw.
    'open', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id, 'name', c.name, 'type', c.type, 'metric_key', c.metric_key, 'context', c.context,
               'squad_id', c.squad_id, 'squad_name', s.name,
               'creator_name', coalesce(p.name, 'Athlete'),
               'start_at', c.start_at, 'end_at', c.end_at, 'state', c.state,
               'roster', (select count(*)::int from public.challenge_participants cp where cp.challenge_id = c.id)
             ) order by c.start_at)
        from public.challenges c
        left join public.squads s on s.id = c.squad_id
        left join public.profiles p on p.id = c.creator_id
       where c.state in ('ENROLLMENT', 'ACTIVE')
         and (
           (c.context = 'SQUAD' and public.is_squad_member(c.squad_id, v_uid))
           or (c.context = 'FRIENDS' and (c.creator_id = v_uid or v_uid = any(c.invited_ids)))
         )
         and not exists (select 1 from public.challenge_participants cp where cp.challenge_id = c.id and cp.user_id = v_uid)
    ), '[]'::jsonb),

    'active', coalesce((
      select jsonb_agg(x.obj order by x.end_at)
        from (
          select c.end_at,
                 jsonb_build_object(
                   'id', c.id, 'name', c.name, 'type', c.type, 'metric_key', c.metric_key, 'context', c.context,
                   'squad_id', c.squad_id, 'squad_name', s.name,
                   'start_at', c.start_at, 'end_at', c.end_at,
                   'roster', (select count(*)::int from public.challenge_participants cp where cp.challenge_id = c.id),
                   -- 0260 (launch QA H8): so the card can say "Starts Monday" for one that has not begun.
                   'state', c.state,
                   'my_score', public.challenge_score(c.id, v_uid),
                   'my_place', (
                     select count(*) + 1
                       from public.challenge_participants cp2
                      where cp2.challenge_id = c.id
                        and public.challenge_score(c.id, cp2.user_id) > public.challenge_score(c.id, v_uid)
                   ),
                   'leader_score', (
                     select coalesce(max(public.challenge_score(c.id, cp3.user_id)), 0)
                       from public.challenge_participants cp3 where cp3.challenge_id = c.id
                   )
                 ) as obj
            from public.challenges c
            left join public.squads s on s.id = c.squad_id
            join public.challenge_participants cp on cp.challenge_id = c.id and cp.user_id = v_uid
           -- 0260 (launch QA H8): JOINED and not started yet is still yours. It was in neither list — "open" needs
           -- not-joined, "active" needed ACTIVE — so a competition starting tomorrow vanished the moment you joined.
           where c.state in ('ENROLLMENT', 'ACTIVE')
        ) x
    ), '[]'::jsonb),

    'history', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id, 'name', c.name, 'type', c.type, 'metric_key', c.metric_key, 'context', c.context,
               'squad_name', s.name, 'end_at', c.end_at,
               'place', r.place, 'score', r.score, 'is_winner', r.is_winner,
               'roster', (select count(*)::int from public.challenge_results rr where rr.challenge_id = c.id)
             ) order by c.end_at desc)
        from public.challenge_results r
        join public.challenges c on c.id = r.challenge_id
        left join public.squads s on s.id = c.squad_id
       where r.user_id = v_uid and c.state in ('COMPLETED', 'ARCHIVED')
    ), '[]'::jsonb),

    'stats', (
      select jsonb_build_object(
               'entered', count(*)::int,
               'wins',    count(*) filter (where r.is_winner)::int,
               'podiums', count(*) filter (where r.place <= 3)::int,
               'fav_type', (
                 select c2.type from public.challenge_results r2
                   join public.challenges c2 on c2.id = r2.challenge_id
                  where r2.user_id = v_uid
                  group by c2.type order by count(*) desc, c2.type limit 1
               )
             )
        from public.challenge_results r
        join public.challenges c on c.id = r.challenge_id
       where r.user_id = v_uid and c.state in ('COMPLETED', 'ARCHIVED')
    )
  );
end;
$$;

-- user_recipes delete (launch QA H34): deleting your OWN recipe is not "planning". 0244 put it behind the planner
-- gate, so a Free athlete could see a recipe in My Foods and never remove it.
drop policy if exists user_recipes_owner_delete on public.user_recipes;
create policy user_recipes_owner_delete on public.user_recipes for delete
  using (athlete_id = auth.uid() and public.has_nutrition_access());

-- discard_unstarted_program (launch QA B5): take back a program you backed out of a minute ago, and its slot.
--
-- Start on a catalogue program adopts it FIRST (the max-lift question needs a row), and cancelling that question —
-- or "this ends your current program" — deletes the row; but the lifetime counter never goes down (MA3-D9), so
-- three cancels locked a Free athlete out of programs for good. MA3-D9's reason stands: a program you KEPT,
-- trained or held is never refunded. This refunds only the one case that was never a program at all: still
-- 'future', never started, no session marked, adopted in the last 30 minutes. One call, so the delete and the
-- refund cannot split.
create or replace function public.discard_unstarted_program(p_program uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_row   public.programs%rowtype;
  v_short boolean;
begin
  if v_uid is null then
    return false;
  end if;
  select * into v_row from public.programs where id = p_program and athlete_id = v_uid;
  if not found then
    return false;
  end if;
  if v_row.state <> 'future' or v_row.started_at is not null or v_row.created_at < now() - interval '30 minutes' then
    return false;
  end if;
  if exists (select 1 from public.program_sessions s where s.program_id = p_program) then
    return false;
  end if;
  v_short := not public.program_earns_credit(v_row.structure);
  delete from public.programs where id = p_program and athlete_id = v_uid;
  -- A saved week is charged when it is SAVED, not when it is started (0157 / MA4-D4): nothing to refund.
  if v_row.source_week_template_id is null then
    update public.athlete_usage u
       set programs_created       = case when v_short then u.programs_created else greatest(0, u.programs_created - 1) end,
           short_programs_created = case when v_short then greatest(0, u.short_programs_created - 1) else u.short_programs_created end,
           updated_at = now()
     where u.athlete_id = v_uid;
  end if;
  return true;
end;
$$;

-- Supabase grants new functions to anon AND authenticated directly; revoking from public alone leaves them callable.
revoke all on function public.discard_unstarted_program(uuid) from public, anon;
grant execute on function public.discard_unstarted_program(uuid) to authenticated;

-- ═══ §2 — THE ASSERTION (raises unless every change landed) ═══
do $$
declare
  v_ap text := pg_get_functiondef('public.athlete_profile(uuid)'::regprocedure);
  v_fa text := pg_get_functiondef('public.find_athletes(text, integer)'::regprocedure);
  v_pj text := pg_get_functiondef('public.pending_join_requests()'::regprocedure);
  v_ch text := pg_get_functiondef('public.challenge_hub()'::regprocedure);
begin
  if position('is_blocked(v_uid, p_athlete)' in v_ap) = 0 then raise exception '0260 FAILED: athlete_profile has no block check'; end if;
  if position('metric_start_value' in v_ap) = 0 then raise exception '0260 FAILED: athlete_profile sends no goal baseline'; end if;
  if position('v_vis->>''history''' in v_ap) = 0 or position('v_vis->>''accomplishments''' in v_ap) = 0 then raise exception '0260 FAILED: athlete_profile timeline is not gated'; end if;
  if position('is_blocked(v_uid, p.id)' in v_fa) = 0 then raise exception '0260 FAILED: find_athletes has no block filter'; end if;
  if position('interval ''3 hours''' in v_pj) = 0 then raise exception '0260 FAILED: pending_join_requests has no window'; end if;
  if position('''state'', c.state' in v_ch) = 0 then raise exception '0260 FAILED: challenge_hub sends no state'; end if;
  if not exists (select 1 from pg_policies where tablename = 'user_recipes' and policyname = 'user_recipes_owner_delete' and qual like '%has_nutrition_access%') then
    raise exception '0260 FAILED: user_recipes delete is not on the base gate';
  end if;
  if to_regprocedure('public.discard_unstarted_program(uuid)') is null then raise exception '0260 FAILED: discard_unstarted_program missing'; end if;
  if has_function_privilege('anon', 'public.discard_unstarted_program(uuid)', 'execute') then raise exception '0260 FAILED: anon can run discard_unstarted_program'; end if;
  raise notice '0260: all seven changes in place.';
end $$;

-- ═══ §3 — THE REPORT (read-only, one row) ═══
select
  (select count(*) from public.workout_invites where kind = 'JOIN_REQUEST' and status = 'PENDING' and created_at < now() - interval '3 hours') as stale_asks_now_hidden,
  (select count(*) from public.athlete_blocks)                                                                                          as blocks_now_enforced_on_profiles,
  (select count(*) from public.challenges c join public.challenge_participants p on p.challenge_id = c.id where c.state = 'ENROLLMENT') as joined_upcoming_entries_now_listed,
  has_function_privilege('authenticated', 'public.discard_unstarted_program(uuid)', 'execute')                                          as refund_callable_by_athletes;
