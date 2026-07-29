-- Forge Legacy — 0046: leave / remove squad membership
--
-- Adds a DELETE policy to squad_members so a member can LEAVE (delete their own non-owner row) and — for the
-- owner-side member management coming next — the squad OWNER can REMOVE a member. The owner's own row is
-- protected (role <> 'owner'): an owner leaves by transferring ownership or deleting the squad, never by a
-- plain delete. RUN BY HAND in the SQL editor.

drop policy if exists squad_members_delete on public.squad_members;
create policy squad_members_delete on public.squad_members for delete
  using (
    role <> 'owner'
    and (user_id = auth.uid() or public.is_squad_owner(squad_id, auth.uid()))
  );
