-- Forge Legacy — 0056: who can invite (Squad Settings · Permissions)
--
-- `Squad Settings.dc.html` has a Permissions section with a "Who Can Invite" control — Owner Only /
-- Any Member, defaulting to **Owner Only**. It was skipped at build time for having no backend, which
-- left invites open to every member with nothing able to close them. This builds it.
--
-- The gate has to be server-side, and that means the invite code stops being a plain column read.
-- `squads` RLS lets any member select the squad row, `invite_code` included — so a member who is not
-- permitted to invite could still read the code straight out of the table and share it. The code is
-- therefore served by `squad_invite_info()`, which returns it only to someone allowed to hand it out.
--
--   squads.invite_permission — 'owner' (default, per the design) | 'members'
--   squad_invite_info(squad) — identity + member count always; the CODE only when permitted
--
-- NOT built: the design's second Permissions row, "Who Can Post Check-ins" (Everyone / Approved).
-- "Approved" has no meaning in this data model — there is no approved-member concept, and check-in
-- posting is already gated to squad membership. Shipping a control whose second option does nothing
-- would be worse than leaving the row out; it returns when the semantics are decided.
--
-- Depends on 0040 (invite_code) + 0055. Idempotent. RUN BY HAND, after 0055.

alter table public.squads add column if not exists invite_permission text not null default 'owner';

alter table public.squads drop constraint if exists squads_invite_permission_chk;
alter table public.squads add constraint squads_invite_permission_chk
  check (invite_permission in ('owner', 'members'));

comment on column public.squads.invite_permission is
  'Who may hand out the invite code. Design default is owner-only; the owner may open it to members.';

-- ── The invite surface, permission-gated ──────────────────────────────────────
-- SECURITY DEFINER so the decision about who sees the code is made here rather than trusted from the
-- client. Non-members get nothing at all; members who aren't permitted get the squad, not the code.
create or replace function public.squad_invite_info(p_squad uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_sq   public.squads%rowtype;
  v_own  boolean;
  v_may  boolean;
begin
  if v_uid is null then
    return null;
  end if;

  select * into v_sq from public.squads where id = p_squad;
  if not found or not public.is_squad_member(p_squad, v_uid) then
    return null;
  end if;

  v_own := v_sq.owner_id = v_uid;
  v_may := v_own or coalesce(v_sq.invite_permission, 'owner') = 'members';

  return jsonb_build_object(
    'id',           v_sq.id,
    'name',         v_sq.name,
    'privacy',      v_sq.privacy,
    'crest',        v_sq.crest,
    'photo_url',    v_sq.photo_url,
    'member_count', (select count(*)::int from public.squad_members m where m.squad_id = v_sq.id),
    'is_owner',     v_own,
    'can_invite',   v_may,
    -- The whole point of the gate: withheld unless you're allowed to hand it out.
    'invite_code',  case when v_may then v_sq.invite_code else null end
  );
end;
$$;
