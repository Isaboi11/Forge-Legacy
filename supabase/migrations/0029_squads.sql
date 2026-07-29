-- Forge Legacy — 0029: Squads (Social pillar · Part 1 · Squad Core)
--
-- Graduates the squad cluster from `supabase/design/0002_full_model.sql` into a real, applied schema —
-- scoped to CORE: a squad is a real row with real members. No check-ins / feed / records / invites /
-- competitions yet (those are later parts). Follows the user's Core breakdown (name/description/privacy/
-- crest), which diverges from 0002 (that draft had commitment/icon/goal/mission, no description/privacy,
-- and SELECT-only policies).
--
-- Idempotent (create-if-not-exists + drop-policy-if-exists); RUN BY HAND in the Supabase SQL editor.

create table if not exists public.squads (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 28),  -- backstops the client 2–28 rule
  description text,                                                        -- nullable; the one character line
  privacy     text not null default 'private' check (privacy in ('private', 'public')),
  crest       text not null default 'swords',                             -- glyph key (no photo upload in Core)
  owner_id    uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists squads_owner on public.squads (owner_id);

create table if not exists public.squad_members (
  squad_id  uuid not null references squads(id) on delete cascade,
  user_id   uuid not null references profiles(id) on delete cascade,
  role      text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (squad_id, user_id)
);
create index if not exists squad_members_user on public.squad_members (user_id);
-- One owner per squad (the app never sets two; this makes it a DB invariant).
create unique index if not exists squad_one_owner on public.squad_members (squad_id) where role = 'owner';

alter table public.squads enable row level security;
alter table public.squad_members enable row level security;

-- Membership check as a SECURITY DEFINER fn (reads squad_members with RLS bypassed) so the SELECT policies
-- below can test membership WITHOUT re-entering their own table's policy → no 42P17 recursion. (See 0032,
-- which retrofits this onto databases created before the fix.)
create or replace function public.is_squad_member(p_squad uuid, p_uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.squad_members where squad_id = p_squad and user_id = p_uid);
$$;

-- NOTE (revisit at Discover): `squads` SELECT allows any PUBLIC squad, but `squad_members` SELECT requires
-- membership — so once discovery lands, a non-member can read a public squad's row while its member count
-- (from squad_members) won't resolve. Fix then with a members-of-public SELECT branch or a cached count.
drop policy if exists squads_select on public.squads;
drop policy if exists squads_insert on public.squads;
drop policy if exists squads_update on public.squads;
drop policy if exists squads_delete on public.squads;
create policy squads_select on public.squads for select
  using (privacy = 'public' or owner_id = auth.uid() or public.is_squad_member(id, auth.uid()));
create policy squads_insert on public.squads for insert with check (owner_id = auth.uid());
create policy squads_update on public.squads for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy squads_delete on public.squads for delete using (owner_id = auth.uid());

drop policy if exists squad_members_select on public.squad_members;
drop policy if exists squad_members_insert on public.squad_members;
create policy squad_members_select on public.squad_members for select
  using (user_id = auth.uid() or public.is_squad_member(squad_members.squad_id, auth.uid()));
create policy squad_members_insert on public.squad_members for insert with check (user_id = auth.uid());

-- Atomic create: squad + the founder's owner membership in one transaction. A squad can never exist
-- without its owner row (which would be invisible to its own creator). security invoker — passes RLS as
-- the caller (both INSERT checks are owner/self = auth.uid()). Modeled on save_workout (0010).
create or replace function public.create_squad(p_name text, p_description text, p_privacy text, p_crest text)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_uid   uuid := auth.uid();
  v_squad uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  insert into public.squads (name, description, privacy, crest, owner_id)
    values (p_name, nullif(btrim(p_description), ''), coalesce(p_privacy, 'private'), coalesce(p_crest, 'swords'), v_uid)
    returning id into v_squad;
  insert into public.squad_members (squad_id, user_id, role) values (v_squad, v_uid, 'owner');
  return jsonb_build_object('squad_id', v_squad);
end;
$$;
