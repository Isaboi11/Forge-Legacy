-- Forge Legacy — 0032: fix squad RLS infinite recursion (42P17)
--
-- BUG (0029): `squad_members_select` checked membership with `exists (select 1 from squad_members …)` —
-- a subquery on the SAME table the policy guards, so evaluating it re-triggers the policy forever
-- (42P17). `squads_select` referenced squad_members too, so any squad read recursed as well. This blew up
-- create_squad (the `insert … returning` runs the squads SELECT policy).
--
-- FIX: a SECURITY DEFINER helper reads squad_members with RLS bypassed, so a policy can call it without
-- re-entering itself. Both SELECT policies use it (plus a cheap own-row / owner short-circuit). RUN BY HAND.

create or replace function public.is_squad_member(p_squad uuid, p_uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.squad_members where squad_id = p_squad and user_id = p_uid);
$$;

-- squads: public, or you own it, or you're a member (membership via the definer fn → no recursion).
drop policy if exists squads_select on public.squads;
create policy squads_select on public.squads for select
  using (privacy = 'public' or owner_id = auth.uid() or public.is_squad_member(id, auth.uid()));

-- squad_members: your own row, or you're a member of that squad (via the definer fn → no recursion).
drop policy if exists squad_members_select on public.squad_members;
create policy squad_members_select on public.squad_members for select
  using (user_id = auth.uid() or public.is_squad_member(squad_members.squad_id, auth.uid()));
