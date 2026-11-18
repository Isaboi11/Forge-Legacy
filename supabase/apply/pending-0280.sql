-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0280: who trained today, for the faces row at the top of a squad
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: `create or replace` on a NEW function, grants restated, §3 is read-only.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- PO 2026-11-18: "It would be nice to be able to see who worked out." The squad page's "3 training today"
-- becomes a row of their faces. ⚠ This amends SA-D4 by the PO's call — see the migration's header.
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  creates `squad_trained_today_members(p_squad, p_since)` — members only, blocks excluded, newest first
-- §2  asserts it exists, is SECURITY DEFINER, is callable by `authenticated` and NOT by `anon`; RAISES if not
-- §3  reports, for each squad, the count (0108) beside how many faces the new function returns. Read-only.
--
-- ⚠ ORDER DOES NOT MATTER. The app falls back to the plain count when this function is missing, so it is
-- safe to apply before or after the update ships.
--
-- ⚠ §3 RUNS AS YOU IN THE EDITOR, where `auth.uid()` is null — so the new function returns ZERO rows for every
-- squad there (members only). That is the expected §3 result, not a failure; the count column shows the
-- real numbers. Seeing faces needs a signed-in member, in the app.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ═════════════════════════════════════════════════════════════════════════════
-- §1 — THE FUNCTION (verbatim from 0280_squad_trained_today_faces.sql)
-- ═════════════════════════════════════════════════════════════════════════════

create or replace function public.squad_trained_today_members(p_squad uuid, p_since timestamptz)
returns table (user_id uuid, name text, avatar_url text, trained_at timestamptz)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.user_id, pr.name, pr.avatar_url, t.trained_at
    from public.squad_members m
    join public.profiles pr on pr.id = m.user_id
    cross join lateral (
      select greatest(
        (select max(w.saved_at) from public.workouts w
          where w.athlete_id = m.user_id and w.state = 'saved' and w.saved_at >= p_since),
        (select max(c.created_at) from public.squad_checkins c
          where c.squad_id = p_squad and c.user_id = m.user_id and c.created_at >= p_since)
      ) as trained_at
    ) t
   where m.squad_id = p_squad
     and public.is_squad_member(p_squad, auth.uid())
     and t.trained_at is not null
     and not public.is_blocked(auth.uid(), m.user_id)
   order by t.trained_at desc;
$$;

revoke all on function public.squad_trained_today_members(uuid, timestamptz) from public;
revoke all on function public.squad_trained_today_members(uuid, timestamptz) from anon;
grant execute on function public.squad_trained_today_members(uuid, timestamptz) to authenticated;

comment on function public.squad_trained_today_members(uuid, timestamptz) is
  'Members of a squad who trained since p_since (saved workout OR check-in, as squad_trained_since), newest first, for the faces row. Members only; blocks either way excluded. Amends SA-D4 by PO call 2026-11-18.';


-- ═════════════════════════════════════════════════════════════════════════════
-- §2 — THE ASSERTION
-- ═════════════════════════════════════════════════════════════════════════════

do $$
declare
  sig constant text := 'public.squad_trained_today_members(uuid, timestamptz)';
begin
  if to_regprocedure(sig) is null then
    raise exception '0280: squad_trained_today_members is missing';
  end if;
  if not (select p.prosecdef from pg_proc p where p.oid = to_regprocedure(sig)) then
    raise exception '0280: squad_trained_today_members is not SECURITY DEFINER - it could not read other members'' workouts';
  end if;
  if not has_function_privilege('authenticated', sig, 'execute') then
    raise exception '0280: authenticated cannot call squad_trained_today_members - the faces row would never draw';
  end if;
  if has_function_privilege('anon', sig, 'execute') then
    raise exception '0280: anon can still call squad_trained_today_members';
  end if;
end $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- §3 — THE REPORT (read-only)
-- Expect: one row per squad; `trained_today` = 0108's count since midnight UTC; `faces_seen_here` = 0 on
-- every row, because the editor has no signed-in member (see the header).
-- ═════════════════════════════════════════════════════════════════════════════

select s.name,
       (select count(distinct m.user_id) from public.squad_members m
         where m.squad_id = s.id
           and (exists (select 1 from public.workouts w where w.athlete_id = m.user_id and w.state = 'saved' and w.saved_at >= date_trunc('day', now()))
             or exists (select 1 from public.squad_checkins c where c.squad_id = s.id and c.user_id = m.user_id and c.created_at >= date_trunc('day', now())))) as trained_today,
       (select count(*) from public.squad_trained_today_members(s.id, date_trunc('day', now()))) as faces_seen_here
  from public.squads s
 order by trained_today desc, s.name
 limit 20;
