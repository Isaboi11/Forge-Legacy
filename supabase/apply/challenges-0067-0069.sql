-- Forge Legacy — convenience bundle: migrations 0067 → 0069, in dependency order.
--
-- NOT a new migration. Every statement below is already numbered in supabase/migrations/; this file
-- exists so the outstanding chain can be pasted into the Supabase SQL editor in one go.
--
--   0067  cancel_challenge()          — call off a competition before it closes (CS-D5)
--   0068  squad_hall_of_champions()   — C-5 Hall of Champions
--   0069  vis_clears() + athlete_profile() — the server-side gated athlete profile
--
-- SAFE TO RE-RUN, including any part already applied: every function is `create or replace` and none
-- are set-returning, so there is no 42P13 return-type collision to work around.
--
-- Ends with a PostgREST schema-cache reload so the new functions are callable immediately.

-- ============================================================================
-- 0067_cancel_challenge.sql
-- ============================================================================

-- Forge Legacy — 0067: cancel a competition before it closes (CS-D5)
--
-- CS-D5 already defines this transition and nothing implemented it: CANCELLED is "ended before
-- completion; no winner, no result, no honors", reachable by "creator/owner action, pre-COMPLETED", and
-- terminal. So the answer to "should there be a button to end a competition early" is yes, and the
-- shape it must take is already decided.
--
-- CANCELLING IS NOT "END NOW AND CROWN THE LEADER", AND THAT DISTINCTION IS THE WHOLE POINT.
-- CS-D5 r4: cancelling produces no ChallengeResult, no winner and no honor. An early finish that DID
-- crown someone would hand the creator a button that ends the season the moment they happen to be
-- ahead — the roster would be racing a clock only one of them controls. There is no honest way to
-- offer that, so a cancelled season simply never happened: no result row, no place for anybody, and per
-- CS-D3 no negative record for anyone. Nobody is recorded as having lost a competition that was called
-- off, including the people who were behind when it stopped.
--
-- WHO. The creator (challenge-scoped commissioner, CS-D6/SA-D3) or the squad owner. The owner is
-- included because CS-D5 names "creator/owner" and because CS-D23 r4 already makes squad deletion
-- cancel that squad's live challenges — an owner who can dissolve the whole squad can certainly stop
-- one of its competitions.
--
-- WHY A FUNCTION AT ALL, given `challenges_update` already lets a creator write the row: the policy
-- cannot express "only from a pre-COMPLETED state", so without this a creator could flip a COMPLETED
-- season to CANCELLED and silently void standings CS-D14 calls immutable. The state guard is the
-- reason this exists, not the permission check.
--
-- Depends on 0059. Idempotent. RUN ANY TIME after 0059.

create or replace function public.cancel_challenge(p_challenge uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  c     public.challenges%rowtype;
  v_owner uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into c from public.challenges where id = p_challenge;
  if not found then
    raise exception 'competition not found';
  end if;

  select s.owner_id into v_owner from public.squads s where s.id = c.squad_id;

  if c.creator_id <> v_uid and coalesce(v_owner, '00000000-0000-0000-0000-000000000000'::uuid) <> v_uid then
    raise exception 'only the creator or the squad owner can call off this competition';
  end if;

  -- Terminal states stay terminal. A closed season's standings are immutable (CS-D14) and cancelling
  -- must never be a route around that.
  if c.state not in ('DRAFT', 'ENROLLMENT', 'ACTIVE') then
    raise exception 'this competition has already closed';
  end if;

  update public.challenges set state = 'CANCELLED', updated_at = now() where id = p_challenge;

  -- Deliberately NO writes beyond the state: no challenge_results rows (CS-D5 r4), and the participant
  -- roster is left intact rather than deleted, because the roster is not a record of failure — it is
  -- just who had opted in when it stopped. `challenge_hub` never selects CANCELLED, so it disappears
  -- from every surface without anything being erased.
end;
$$;

-- ============================================================================
-- 0068_hall_of_champions.sql
-- ============================================================================

-- Forge Legacy — 0068: Hall of Champions (C-5, CS-D18)
--
-- Every finished competition this squad has ever run, newest first, with its champion(s). A terminal
-- read over `challenge_results` — it feeds nothing and computes nothing live (CS-D14: results are frozen
-- snapshots, so a workout backfilled into a closed season can never rewrite the hall).
--
-- WINNERS ONLY, AND THAT IS A RULE NOT A SHORTCUT. `Hall-of-Champions-Wireframe-Spec-C5` §6 is explicit:
-- "Only winners are named. No 'runner-up,' no per-challenge loser, no 'X never won'" (CC-D3), repeated as
-- a validation item in §12. The design's card carries a "subtle podium" footer naming 2nd and 3rd, and
-- that is the one thing a browsable hall must not do — C-4 can show a full field because you opened one
-- specific result, but a scrollable list of every season that repeatedly names who came second becomes a
-- record of who kept losing. `field` is returned instead, so a card can say "5 competed" and name nobody.
--
-- CANCELLED SEASONS ARE ABSENT (§6.2) with no special-casing: a cancelled challenge never reaches
-- COMPLETED and never gets a result row, so both filters below exclude it for free.
--
-- DEPARTED WINNERS ARE KEPT (§6.3). The join is on `profiles`, not on current squad membership — someone
-- who won and later left is still the champion of that season. No de-emphasis, no removal.
--
-- CO-WINNERS ARE PLURAL (CS-D15), consistent with C-4 and the podium.
--
-- Depends on 0059. Idempotent. RUN ANY TIME after 0059.

create or replace function public.squad_hall_of_champions(p_squad uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  -- Squad-scoped (§10): any member may read, nobody outside has a path.
  if v_uid is null or not public.is_squad_member(p_squad, v_uid) then
    return null;
  end if;

  return jsonb_build_object(
    'squad_id',   p_squad,
    'squad_name', (select s.name from public.squads s where s.id = p_squad),
    'founded_at', (select s.created_at from public.squads s where s.id = p_squad),

    'entries', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'id', c.id, 'name', c.name, 'type', c.type, 'metric_key', c.metric_key,
                 'end_at', c.end_at,
                 -- Field size, not a runner-up list. Says how big the win was without naming anybody.
                 'field', (select count(*) from public.challenge_results r2 where r2.challenge_id = c.id),
                 'score', (
                   select max(r3.score) from public.challenge_results r3
                    where r3.challenge_id = c.id and r3.is_winner
                 ),
                 'champions', coalesce((
                   select jsonb_agg(
                            jsonb_build_object(
                              'user_id', r.user_id,
                              'name', coalesce(p.name, 'Athlete'),
                              'avatar_url', p.avatar_url,
                              'is_self', r.user_id = v_uid
                            ) order by coalesce(p.name, 'Athlete'))
                     from public.challenge_results r
                     join public.profiles p on p.id = r.user_id
                    where r.challenge_id = c.id and r.is_winner
                 ), '[]'::jsonb)
               ) order by c.end_at desc)
        from public.challenges c
       where c.squad_id = p_squad
         and c.state in ('COMPLETED', 'ARCHIVED')
         -- A completed season with no recorded field has no champion to enshrine.
         and exists (select 1 from public.challenge_results r where r.challenge_id = c.id and r.is_winner)
    ), '[]'::jsonb)
  );
end;
$$;

-- ============================================================================
-- 0069_athlete_profile.sql
-- ============================================================================

-- Forge Legacy — 0069: the athlete profile read (Forge Public Profile / the specs' Limited Athlete Profile)
--
-- Every avatar in the competition screens, the hall and the squad roster points here, and it has been a
-- "coming soon" toast. This is the read behind it.
--
-- GATING HAPPENS HERE, NOT IN THE CLIENT. This is the whole reason it is one RPC rather than a handful of
-- table reads. `profiles.visibility` (0022) is the athlete's own per-section audience map, and the honest
-- implementation of "a stranger cannot see your training stats" is that the stats are never SELECTed —
-- not that they are fetched and then hidden behind a conditional. A client-side gate ships the private
-- data to the viewer's device and trusts the UI to look away; anyone with the network tab has it. Each
-- section below is inside a `case when` on the viewer's clearance, so a hidden section is absent from the
-- payload entirely.
--
-- CLEARANCE LADDER, matching `src/domain/settings/visibility.ts` exactly (owner 100 > friend 3 > squad 2
-- > stranger 1) against the audience ranks (private 99, friends 3, squads 2, everyone 1).
--
-- THERE IS NO FRIEND CLEARANCE YET, and this is why that matters rather than being a footnote: two of
-- the seven sections — `transformation` and `photos` — default to `friends`, and with no friends graph no
-- viewer can ever clear them. They are therefore invisible to everyone but the owner, which is the
-- CORRECT failure direction: the defaults err private, so an unbuilt relationship tier withholds data
-- rather than leaking it. If the friend graph is added later, `p_clearance` gains a branch and both
-- sections light up without touching a single gate.
--
-- THE FIREWALL RESOLVES ITSELF. The challenge specs route row taps to a "performance-free" profile, and
-- `stats` defaults to `squads` — so a stranger never sees training numbers, while a squad-mate does,
-- which is exactly what `Squad-System-Architecture` SQ-D2 lifts the Performance Firewall for. The
-- visibility ladder was already the right answer; nothing extra is needed to satisfy CS-D22.
--
-- Depends on 0022 (visibility), 0023 (accomplishments), 0025 (goals), 0029 (squads), 0001. Idempotent.

-- ── Does this clearance clear this audience? ──────────────────────────────────
create or replace function public.vis_clears(p_audience text, p_clearance text)
returns boolean
language sql
immutable
as $$
  select case
    when p_audience = 'private' then p_clearance = 'owner'
    else
      case p_clearance when 'owner' then 100 when 'friend' then 3 when 'squad' then 2 else 1 end
      >=
      case p_audience  when 'friends' then 3 when 'squads' then 2 else 1 end
  end;
$$;

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

  v_clear := case
    when p.id = v_uid then 'owner'
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
    -- Identity is always visible: rank, Standard and Honors are core identity and deliberately absent
    -- from the visibility list (visibility.ts header).
    'id', p.id,
    'name', p.name,
    'first_name', p.first_name,
    'handle', p.handle,
    'initials', p.initials,
    'avatar_url', p.avatar_url,
    'athlete_type', p.athlete_type,
    'standard', p.standard,
    -- Real rank. The design renders Foundation IV for every athlete from a literal.
    'rank_family', p.rank_family,
    'rank_level', p.rank_level,
    'joined_at', p.created_at,
    'clearance', v_clear,
    'is_self', p.id = v_uid,

    -- Shared squads, for the relationship chip. The design hardcodes "Iron Vigil".
    'shared_squads', case when v_clear = 'squad' then coalesce((
      select jsonb_agg(s.name order by s.name)
        from public.squads s
       where exists (select 1 from public.squad_members m1 where m1.squad_id = s.id and m1.user_id = v_uid)
         and exists (select 1 from public.squad_members m2 where m2.squad_id = s.id and m2.user_id = p_athlete)
    ), '[]'::jsonb) else '[]'::jsonb end,

    -- ── Current chapter + its primary goal (default: everyone) ──
    'chapter', case when public.vis_clears(coalesce(v_vis->>'chapter', 'everyone'), v_clear) then (
      select jsonb_build_object(
               'id', c.id, 'name', c.name, 'start_date', c.start_date,
               'workout_count', c.workout_count, 'honor_count', c.honor_count,
               'goal', (
                 select jsonb_build_object('name', g.name, 'current', g.current, 'target', g.target, 'unit', g.unit)
                   from public.goals g
                  where g.chapter_id = c.id and g.is_primary
                  limit 1
               )
             )
        from public.chapters c
       where c.athlete_id = p_athlete and c.is_active
       limit 1
    ) else null end,

    -- ── Sealed chapters (default: everyone) ──
    'history', case when public.vis_clears(coalesce(v_vis->>'history', 'everyone'), v_clear) then coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id, 'name', c.name, 'start_date', c.start_date,
               'sealed_at', c.sealed_at, 'workout_count', c.workout_count
             ) order by c.sealed_at desc nulls last)
        from public.chapters c
       where c.athlete_id = p_athlete and not c.is_active
    ), '[]'::jsonb) else null end,

    -- ── Accomplishments, featured first (default: everyone) ──
    'accomplishments', case when public.vis_clears(coalesce(v_vis->>'accomplishments', 'everyone'), v_clear) then coalesce((
      select jsonb_agg(x.obj) from (
        select jsonb_build_object('id', a.id, 'name', a.name, 'date', a.date, 'note', a.note, 'featured', a.featured) as obj
          from public.accomplishments a
         where a.athlete_id = p_athlete
         order by a.featured desc, a.date desc nulls last, a.created_at desc
         limit 3
      ) x
    ), '[]'::jsonb) else null end,

    -- ── Training stats (default: squads — a stranger never gets these) ──
    'stats', case when public.vis_clears(coalesce(v_vis->>'stats', 'squads'), v_clear) then jsonb_build_object(
      'workouts', (select count(*) from public.workouts w where w.athlete_id = p_athlete),
      'prs', (select count(*) from public.personal_records pr where pr.athlete_id = p_athlete),
      'chapters', (select count(*) from public.chapters c where c.athlete_id = p_athlete and not c.is_active)
    ) else null end,

    -- ── Timeline (default: squads) ──
    -- Derived from what is already recorded rather than a table: sealed chapters and dated
    -- accomplishments, newest first. L-2 Legacy Timeline is unbuilt, so this is the honest subset —
    -- events that genuinely happened, not a placeholder feed.
    'timeline', case when public.vis_clears(coalesce(v_vis->>'timeline', 'squads'), v_clear) then coalesce((
      select jsonb_agg(t.obj order by t.at desc) from (
        select c.sealed_at as at,
               jsonb_build_object('kind', 'chapter', 'label', c.name, 'at', c.sealed_at) as obj
          from public.chapters c
         where c.athlete_id = p_athlete and c.sealed_at is not null
        union all
        select a.date::timestamptz as at,
               jsonb_build_object('kind', 'accomplishment', 'label', a.name, 'at', a.date) as obj
          from public.accomplishments a
         where a.athlete_id = p_athlete and a.date is not null
      ) t
    ), '[]'::jsonb) else null end

    -- NOT RETURNED, deliberately:
    --   transformation / photos — both default to `friends`, and no viewer can hold friend clearance
    --     until the friends graph exists. Omitted rather than gated-and-empty.
    --   honors — no HonorInstance table exists (Honor-Catalog-Amendment-001 is unbuilt), so there is
    --     nothing truthful to return. The design shows four from a literal.
  );
end;
$$;

notify pgrst, 'reload schema';
