-- Forge Legacy — 0098: a chapter's honor tally is DERIVED, because the stored one was always zero
--
-- `chapters.honor_count` has existed since 0001 with `not null default 0`. It is written in exactly one
-- place — chapter creation, as the literal 0 (0008, and 0066's retry-safe rewrite of it). Across all 97
-- migrations there is not a single statement that raises it. For comparison, `workout_count` has eight.
--
-- It was never a counter. It was a zero that looked like a tally.
--
-- ══ WHAT THAT MEANT ON SCREEN ══
--
-- Nothing caught it because every reader treated it as real:
--
--   * Chapter Detail renders it as a stat tile — every chapter, forever, read "0 Honors".
--   * The M-5 seal ceremony's context line reads "N workouts · 0 honors". That is the moment the app
--     asks an athlete to look back at a chapter they are closing, and it told them they earned nothing
--     in it. A chapter with eleven honors sealed saying zero.
--   * `athlete_profile()` ships it to the PUBLIC profile, so it was wrong for strangers too.
--
-- A number that is only ever its default is worse than an absent one: absent renders nothing, whereas
-- this rendered a confident, specific, false claim about the athlete's own history.
--
-- ══ DERIVED, NOT REPAIRED ══
--
-- The obvious fix is to backfill the column and add a trigger. 0095 already rejected that shape for
-- template use-counts and the reasoning holds here unchanged: a counter drifts on any path its author
-- did not think of (an honor revoked, a chapter reassigned, a bulk grant) and has no repair path,
-- because nothing can tell you what the number SHOULD be.
--
-- `honor_instances.chapter_id` has existed since 0012 and is the actual record of which honors belong
-- to which chapter. It is the answer; the column was a cache of an answer nobody ever computed. So the
-- count is derived at read time, the same rule the notification feed, the timeline, and 0095's
-- "Times used" all follow.
--
-- ══ THE COLUMN IS LEFT IN PLACE, DELIBERATELY ══
--
-- 0053 dropped `join_mode` on the principle that a column nothing reads is a trap for the next person,
-- and that principle applies here too. It is NOT dropped in this migration, because the only statements
-- still naming it are the two inserts inside `complete_onboarding` — the account-creation path, and the
-- one function in this schema whose failure mode is "a new athlete can never enter" (which is why 0066
-- exists at all). Rewriting it to remove a literal zero is not worth that risk on the same migration
-- that fixes the bug. The comment below marks the column dead so it cannot be trusted again; dropping
-- it belongs with the next change that has a reason to touch onboarding.
--
-- Depends on 0012 (honor_instances.chapter_id), 0073 (the current athlete_profile). Idempotent. RUN AFTER 0097.

-- ── 1. Make the derivation cheap ──────────────────────────────────────────────
-- 0012's `honor_per_chap` is (athlete_id, honor_type, chapter_id), so it cannot serve a bare
-- `where chapter_id = ?` count — the leading column is wrong. This is that index.
create index if not exists honor_instances_chapter
  on public.honor_instances (chapter_id)
  where chapter_id is not null;

-- ── 2. The column is dead ─────────────────────────────────────────────────────
comment on column public.chapters.honor_count is
  'DEAD — DO NOT READ. Written only at chapter creation as 0 and never incremented by anything; every
   surface that displayed it showed "0 honors" for every chapter. The real tally is derived from
   honor_instances.chapter_id (0098). Retained only because complete_onboarding still names it in its
   INSERT column list; drop it alongside the next change to that function.';

-- ── 3. The public profile derives it, in both places ──────────────────────────
-- Identical to 0073 apart from: `chapter.honor_count` is now a subquery over honor_instances, and
-- `history` gains the same key. History never carried an honor count at all, which is why the client
-- hardcoded 0 for sealed chapters on someone else's profile — that hardcode goes with this.
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
                 select jsonb_build_object('name', g.name, 'current', g.current, 'target', g.target, 'unit', g.unit)
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
        union all
        select a.date::timestamptz as at,
               jsonb_build_object('kind', 'accomplishment', 'label', a.name, 'at', a.date) as obj
          from public.accomplishments a where a.athlete_id = p_athlete and a.date is not null
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
