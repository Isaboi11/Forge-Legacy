-- Forge Legacy — 0280: WHO trained today, for the faces row at the top of a squad (PO 2026-11-18)
--
-- ══ WHY ══
--
-- The squad page said "3 training today" in small grey type. PO, reviewing the page: *"It would be nice to be
-- able to see who worked out. We're already getting notifications when people start working out."* So the
-- top of the squad shows the faces of the members who trained today, newest first.
--
-- ⚠ THIS AMENDS SA-D4 (Squad-Architecture-Amendment-001) AND 0108's OWN NOTE, by the PO's call (2026-11-18).
-- 0108 made `squad_trained_since` a COUNT, never a roster, because a roster shows who did NOT train by
-- elimination. The PO weighed that and chose the roster: the start-a-workout push already tells the squad who
-- is training, so the page now says what the phones already said. The count function is unchanged.
--
-- ══ WHAT IT RETURNS ══
--
-- One row per member who trained since `p_since` (a saved workout OR a squad check-in — 0108's definition,
-- byte-for-byte the same two tests), with their name, photo, and the time of their latest one. Newest first.
--
--   · MEMBERS ONLY. 0108's count also answers on a public squad for a non-member browsing it; a roster of
--     names does not — that is a stranger reading who trained, which nobody asked for.
--   · BLOCKS APPLY (0171 `is_blocked`, either direction): someone you blocked, or who blocked you, is not in
--     your row. So the row can be one shorter than the count; the client draws the row's own length.
--   · `security definer` because `workouts` is owner-only under RLS — the same reason 0108 is.
--
-- New function, nothing replaced. Safe to run twice.

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
