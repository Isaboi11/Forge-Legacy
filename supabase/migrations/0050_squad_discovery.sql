-- Forge Legacy — 0050: Squad discovery (public squad browse · join · request-to-join)
--
-- Backs `Discover Squads.dc.html`. The design's cards read three squad fields nothing could set:
--   squads.category    — the filter chips (Powerlifting · Running · Hybrid · Strongman · Olympic).
--                        Nullable: an uncategorised squad still lists under "All".
--   squads.join_mode   — 'open' (instant "Join Squad") vs 'approval' ("Request to Join").
--   squads.member_cap  — the soft ceiling behind the "3 left" / "Full" tags. Defaults to 10, the
--                        durable per-squad maximum locked by `Squad-System-Architecture-v1.0` SQ-D1.
--                        A FULL open squad falls back to request-to-join (the design's
--                        `effectiveApproval`) — the ceiling keeps a squad squad-sized.
--
-- Plus `squad_join_requests` (the approval queue) and `discover_squads()` — a SECURITY DEFINER read
-- that resolves member counts + trained-today FOR A NON-MEMBER. 0029 flagged exactly this: its
-- `squads` SELECT policy allows any public squad, but `squad_members` SELECT requires membership, so
-- a non-member reading a public squad's row could never resolve its member count. This is the fix
-- that note asked for ("revisit at Discover").
--
-- Also closes a self-insert hole in `squad_members_insert` (see below).
--
-- Depends on 0049 (`squad_checkins`). Idempotent. RUN BY HAND in the Supabase SQL editor, after 0049.

-- ── Discovery columns ─────────────────────────────────────────────────────────
alter table public.squads add column if not exists category   text;
alter table public.squads add column if not exists join_mode  text not null default 'open';
alter table public.squads add column if not exists member_cap int  not null default 10;

alter table public.squads drop constraint if exists squads_category_chk;
alter table public.squads add constraint squads_category_chk
  check (category is null or category in ('Powerlifting', 'Running', 'Hybrid', 'Strongman', 'Olympic'));

alter table public.squads drop constraint if exists squads_join_mode_chk;
alter table public.squads add constraint squads_join_mode_chk check (join_mode in ('open', 'approval'));

-- 2 is the floor a squad stops being a squad below; 50 keeps a mis-set cap from becoming a community.
alter table public.squads drop constraint if exists squads_member_cap_chk;
alter table public.squads add constraint squads_member_cap_chk check (member_cap between 2 and 50);

create index if not exists squads_public_discover on public.squads (category, created_at desc) where privacy = 'public';

-- ── Join requests (the approval queue) ────────────────────────────────────────
-- One row per (squad, athlete). 'pending' is what Discover reads back as "Request Sent"; the owner
-- resolves it to approved/declined from Squad Join Requests (not yet built).
create table if not exists public.squad_join_requests (
  squad_id   uuid not null references public.squads(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  primary key (squad_id, user_id)
);
create index if not exists squad_join_requests_queue on public.squad_join_requests (squad_id, status, created_at);

alter table public.squad_join_requests enable row level security;

-- Read: your own requests, or every request for a squad you own.
drop policy if exists squad_join_requests_select on public.squad_join_requests;
create policy squad_join_requests_select on public.squad_join_requests for select using (
  user_id = auth.uid()
  or exists (select 1 from public.squads s where s.id = squad_join_requests.squad_id and s.owner_id = auth.uid())
);

-- Write goes through request_squad_join() (definer). This policy is defence in depth for a direct insert.
drop policy if exists squad_join_requests_insert on public.squad_join_requests;
create policy squad_join_requests_insert on public.squad_join_requests for insert with check (
  user_id = auth.uid()
  and exists (select 1 from public.squads s where s.id = squad_join_requests.squad_id and s.privacy = 'public')
  and not public.is_squad_member(squad_join_requests.squad_id, auth.uid())
);

-- Delete: the athlete withdraws their own request; the owner clears one off their queue.
drop policy if exists squad_join_requests_delete on public.squad_join_requests;
create policy squad_join_requests_delete on public.squad_join_requests for delete using (
  user_id = auth.uid()
  or exists (select 1 from public.squads s where s.id = squad_join_requests.squad_id and s.owner_id = auth.uid())
);

-- Update (approve / decline): owner only.
drop policy if exists squad_join_requests_update on public.squad_join_requests;
create policy squad_join_requests_update on public.squad_join_requests for update
  using (exists (select 1 from public.squads s where s.id = squad_join_requests.squad_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.squads s where s.id = squad_join_requests.squad_id and s.owner_id = auth.uid()));

-- ── Close the self-insert hole ────────────────────────────────────────────────
-- 0029's check was only `user_id = auth.uid()`, so ANY authenticated athlete could insert themselves
-- into ANY squad — including a private one — bypassing invite codes entirely. Direct insert is now the
-- FOUNDER path only (create_squad, security invoker, inserts the owner row for a squad it just created
-- with owner_id = auth.uid()). Every other join runs through a SECURITY DEFINER RPC that enforces its
-- own gate: join_squad_by_code (0040) · join_public_squad (below).
drop policy if exists squad_members_insert on public.squad_members;
create policy squad_members_insert on public.squad_members for insert with check (
  user_id = auth.uid()
  and exists (select 1 from public.squads s where s.id = squad_members.squad_id and s.owner_id = auth.uid())
);

-- ── Discover read ─────────────────────────────────────────────────────────────
-- SECURITY DEFINER so a non-member gets real member counts + trained-today for a PUBLIC squad. Returns
-- the whole public set (bounded at 200) — the screen filters by category/query in memory, exactly as the
-- design does, so switching a chip is instant and never re-enters a loading state.
create or replace function public.discover_squads()
returns table (
  id            uuid,
  name          text,
  motto         text,
  description   text,
  crest         text,
  photo_url     text,
  category      text,
  join_mode     text,
  member_cap    int,
  member_count  int,
  trained_today int,
  my_state      text
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  return query
  select
    s.id,
    s.name,
    s.motto,
    s.description,
    s.crest,
    s.photo_url,
    s.category,
    s.join_mode,
    s.member_cap,
    (select count(*)::int from public.squad_members m where m.squad_id = s.id),
    (select count(distinct c.user_id)::int
       from public.squad_checkins c
      where c.squad_id = s.id and c.created_at >= now() - interval '24 hours'),
    case
      when v_uid is null then null::text
      when exists (select 1 from public.squad_members m where m.squad_id = s.id and m.user_id = v_uid) then 'joined'::text
      when exists (select 1 from public.squad_join_requests r
                    where r.squad_id = s.id and r.user_id = v_uid and r.status = 'pending') then 'requested'::text
      else null::text
    end
  from public.squads s
  where s.privacy = 'public'
  order by 11 desc, s.created_at desc  -- most active first, then newest (11 = trained_today)
  limit 200;
end;
$$;

-- ── Join an OPEN public squad ─────────────────────────────────────────────────
-- Definer so the fullness / open-ness gate is enforced server-side rather than trusted from the client.
-- Refuses (rather than silently queueing) when the squad is approval-gated or at its cap — the caller
-- then routes to request_squad_join, which is what the design's button branch already decides.
create or replace function public.join_public_squad(p_squad uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_sq  public.squads%rowtype;
  v_n   int;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_sq from public.squads where id = p_squad;
  if not found or v_sq.privacy <> 'public' then
    return jsonb_build_object('ok', false, 'reason', 'not_public');
  end if;

  if exists (select 1 from public.squad_members where squad_id = p_squad and user_id = v_uid) then
    return jsonb_build_object('ok', true, 'already', true);
  end if;

  select count(*) into v_n from public.squad_members where squad_id = p_squad;
  if v_sq.join_mode <> 'open' or v_n >= v_sq.member_cap then
    return jsonb_build_object('ok', false, 'reason', 'approval_required');
  end if;

  insert into public.squad_members (squad_id, user_id, role) values (p_squad, v_uid, 'member');
  -- Joining supersedes any request that was already sitting in the queue.
  delete from public.squad_join_requests where squad_id = p_squad and user_id = v_uid;
  return jsonb_build_object('ok', true, 'already', false);
end;
$$;

-- ── Request to join ───────────────────────────────────────────────────────────
-- Idempotent: re-requesting after a decline resets the row to pending rather than stacking rows.
create or replace function public.request_squad_join(p_squad uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_sq  public.squads%rowtype;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_sq from public.squads where id = p_squad;
  if not found or v_sq.privacy <> 'public' then
    return jsonb_build_object('ok', false, 'reason', 'not_public');
  end if;

  if exists (select 1 from public.squad_members where squad_id = p_squad and user_id = v_uid) then
    return jsonb_build_object('ok', false, 'reason', 'already_member');
  end if;

  insert into public.squad_join_requests (squad_id, user_id, status)
    values (p_squad, v_uid, 'pending')
    on conflict (squad_id, user_id) do update set status = 'pending', created_at = now(), decided_at = null;

  return jsonb_build_object('ok', true);
end;
$$;

-- ── create_squad widens to carry the discovery fields ─────────────────────────
-- Same shape as 0030's widening: drop the old arity so the named-argument call can't go ambiguous.
drop function if exists public.create_squad(text, text, text, text, text, text);

create or replace function public.create_squad(
  p_name text,
  p_description text,
  p_privacy text,
  p_crest text,
  p_motto text,
  p_goal text,
  p_category text default null,
  p_join_mode text default 'open'
)
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
  insert into public.squads (name, description, privacy, crest, motto, goal, category, join_mode, owner_id)
    values (
      p_name,
      nullif(btrim(p_description), ''),
      coalesce(p_privacy, 'private'),
      coalesce(p_crest, 'swords'),
      nullif(btrim(p_motto), ''),
      nullif(btrim(p_goal), ''),
      nullif(btrim(p_category), ''),
      coalesce(nullif(btrim(p_join_mode), ''), 'open'),
      v_uid
    )
    returning id into v_squad;
  insert into public.squad_members (squad_id, user_id, role) values (v_squad, v_uid, 'owner');
  return jsonb_build_object('squad_id', v_squad);
end;
$$;
