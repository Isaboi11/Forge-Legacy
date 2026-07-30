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
