-- Forge Legacy — 0047: transfer squad ownership
--
-- Atomically hands a squad to another member: the caller (current owner) becomes a regular member and the
-- chosen member becomes owner, and `squads.owner_id` moves with it. SECURITY DEFINER so it can rewrite both
-- roles regardless of RLS, but it verifies the caller is the current owner and the target is a member.
-- Demote-then-promote order respects the `squad_one_owner` partial-unique index (one 'owner' row per squad).
-- RUN BY HAND in the SQL editor.

create or replace function public.transfer_squad_ownership(p_squad uuid, p_new_owner uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if not exists (select 1 from public.squads where id = p_squad and owner_id = v_uid) then
    raise exception 'not authorized';
  end if;
  if not exists (select 1 from public.squad_members where squad_id = p_squad and user_id = p_new_owner) then
    raise exception 'not a member of this squad';
  end if;
  if p_new_owner = v_uid then
    return; -- already the owner
  end if;

  update public.squad_members set role = 'member' where squad_id = p_squad and user_id = v_uid;
  update public.squad_members set role = 'owner'  where squad_id = p_squad and user_id = p_new_owner;
  update public.squads set owner_id = p_new_owner, updated_at = now() where id = p_squad;
end;
$$;
