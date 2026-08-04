-- Forge Legacy — 0110: send a program to someone who can actually run it
--
-- ══ WHAT WAS MISSING ══
--
-- "Share a program" had exactly one meaning in this app: post a keepsake CARD about a program, an image
-- with a completion line on it. There was no way to hand somebody the PLAN. An athlete who wrote a good
-- six-week block could show their squad that they finished it and could not give it to a single one of
-- them.
--
-- ══ A SHARE IS A COPY, NOT A LINK ══
--
-- `structure` is SNAPSHOTTED into the share row rather than referenced by `program_id`. That is the
-- whole design decision and it is worth being explicit about:
--
--   * The sender can edit their program tomorrow. A reference would silently rewrite a plan somebody
--     else is halfway through — the recipient would open week 3 and find different exercises.
--   * The sender can DELETE their program. A reference would dangle, or cascade, and take the
--     recipient's copy with it.
--   * Accepting is meant to be like being handed a photocopy of a training block, which is what it is.
--
-- So a share carries its own frozen copy, and the two programs are independent from the moment it is
-- sent. `source_definition_id` rides along so a shared CATALOG program stays linked to its built-in —
-- otherwise accepting Iron & Engine would produce an untethered custom program with the same name.
--
-- ══ WHO YOU MAY SEND TO ══
--
-- A friend, or somebody in a squad with you. Nothing else — there is no handle-based send, because that
-- would be an unsolicited payload from a stranger, and SOC-D15's discovery rules exist to stop exactly
-- that shape of contact. `can_receive_program_from` is the single predicate, used by the RPC and by RLS
-- so the two cannot drift.
--
-- ══ DECLINING ERASES ══
--
-- Same rule as a declined friend request (0073): the row is DELETED, not marked DECLINED. A share you
-- turned down leaves no trace for the sender to read, and afterwards is indistinguishable from one that
-- was never sent. The status enum therefore has no 'DECLINED' member — there is no state to be in.

-- ── Table ────────────────────────────────────────────────────────────────────
create table if not exists public.program_shares (
  id                   uuid primary key default gen_random_uuid(),
  from_id              uuid not null references public.profiles(id) on delete cascade,
  to_id                uuid not null references public.profiles(id) on delete cascade,
  name                 text not null,
  structure            jsonb not null,
  source_definition_id text,
  status               text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED')),
  created_at           timestamptz not null default now(),
  accepted_at          timestamptz,
  -- Nobody sends a program to themselves; the UI never offers it and the table refuses it.
  constraint program_shares_not_self check (from_id <> to_id)
);

create index if not exists program_shares_to_idx on public.program_shares (to_id, status, created_at desc);
create index if not exists program_shares_from_idx on public.program_shares (from_id, created_at desc);

-- One pending copy of one program per recipient. Sending twice is the same offer, not two of them —
-- without this, a double tap puts two identical rows in somebody's notification feed.
create unique index if not exists program_shares_one_pending
  on public.program_shares (from_id, to_id, name)
  where status = 'PENDING';

alter table public.program_shares enable row level security;

-- ── Who may receive from whom ────────────────────────────────────────────────
create or replace function public.can_receive_program_from(p_to uuid, p_from uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select p_to <> p_from and (
    exists (
      select 1 from public.friendships f
       where f.status = 'ACCEPTED'
         and ((f.low_id = least(p_to, p_from) and f.high_id = greatest(p_to, p_from)))
    )
    or exists (
      select 1
        from public.squad_members a
        join public.squad_members b on b.squad_id = a.squad_id
       where a.user_id = p_from and b.user_id = p_to
    )
  );
$$;

-- Both parties read their own rows. Nobody writes through the table directly — the RPCs below own
-- every mutation, so the friendship check can never be bypassed by a hand-rolled insert.
drop policy if exists program_shares_read on public.program_shares;
create policy program_shares_read on public.program_shares
  for select using (auth.uid() = to_id or auth.uid() = from_id);

-- The recipient may erase (decline); the sender may erase (withdraw). Both are the same act — the offer
-- stops existing — which is why one policy covers them.
drop policy if exists program_shares_delete on public.program_shares;
create policy program_shares_delete on public.program_shares
  for delete using (auth.uid() = to_id or auth.uid() = from_id);

-- ── Send ─────────────────────────────────────────────────────────────────────
-- Returns how many recipients actually received it. A squad send resolves to its members client-side
-- and arrives here as an array, so one call covers "to a friend" and "to my squad" alike.
create or replace function public.share_program(
  p_to        uuid[],
  p_name      text,
  p_structure jsonb,
  p_source    text default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_n   int  := 0;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if p_name is null or btrim(p_name) = '' then raise exception 'A program needs a name'; end if;
  if p_structure is null or jsonb_typeof(p_structure) <> 'object' then raise exception 'A program needs a structure'; end if;

  insert into public.program_shares (from_id, to_id, name, structure, source_definition_id)
  select v_uid, t, btrim(p_name), p_structure, nullif(btrim(coalesce(p_source, '')), '')
    from unnest(p_to) as t
   where public.can_receive_program_from(t, v_uid)
  -- A recipient who already has this offer pending is skipped, not errored: sending to a squad of
  -- twelve where one member already has it must deliver to the other eleven.
  on conflict do nothing;

  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- ── Accept ───────────────────────────────────────────────────────────────────
-- Writes the snapshot out as a real `programs` row owned by the recipient, in 'future' state — accepting
-- a program is receiving it, never starting it. Returns the new program id.
create or replace function public.accept_program_share(p_share uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_s   public.program_shares%rowtype;
  v_id  uuid;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;

  select * into v_s from public.program_shares where id = p_share and to_id = v_uid for update;
  if not found then raise exception 'That program is no longer being shared with you'; end if;

  -- Idempotent: a double tap returns the copy already made rather than a second one with split progress.
  if v_s.status = 'ACCEPTED' then
    select id into v_id from public.programs
     where athlete_id = v_uid and name = v_s.name and created_at >= v_s.accepted_at
     order by created_at limit 1;
    if v_id is not null then return v_id; end if;
  end if;

  -- `lift_maxes` (0111) is DELIBERATELY not copied. It records what one run of a program was built
  -- from, and the sender's tested maxes are not the recipient's — inheriting them would load every
  -- percentage in the plan off somebody else's one-rep max. The copy starts unanswered, so the entry
  -- gate asks the new athlete for their own.
  insert into public.programs (athlete_id, name, structure, source_definition_id)
  values (v_uid, v_s.name, v_s.structure, v_s.source_definition_id)
  returning id into v_id;

  update public.program_shares
     set status = 'ACCEPTED', accepted_at = now()
   where id = p_share;

  return v_id;
end;
$$;

-- ── Read one, for the accept screen ──────────────────────────────────────────
create or replace function public.program_share(p_share uuid)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
           'id',                   s.id,
           'name',                 s.name,
           'structure',            s.structure,
           'source_definition_id', s.source_definition_id,
           'status',               s.status,
           'created_at',           s.created_at,
           'from_id',              s.from_id,
           'from_name',            p.name,
           'from_handle',          p.handle,
           'from_avatar_url',      p.avatar_url
         )
    from public.program_shares s
    join public.profiles p on p.id = s.from_id
   where s.id = p_share
     and (s.to_id = auth.uid() or s.from_id = auth.uid());
$$;

-- ── Notifications ────────────────────────────────────────────────────────────
-- The return type gains `share_id`, which `create or replace` cannot do (42P13), so all three are
-- dropped and rebuilt.
--
-- ⚠ REBUILT FROM 0109's BODY, NOT FROM 0092's. This is the exact step that lost the two friend branches
-- twice: 0088 rebuilt from the pre-friends 0054 body, and 0092 rebuilt "identical to 0088" and inherited
-- the hole. All EIGHT branches are below — count them before editing this again.
drop function if exists public.notification_feed(int);
drop function if exists public.notification_unread_count();
drop function if exists public.notification_events();

create or replace function public.notification_events()
returns table (kind text, at timestamptz, squad_id uuid, actor_id uuid, challenge_id uuid, invite_id uuid, share_id uuid)
language sql
security definer
stable
set search_path = public
as $$
  -- 1
  select 'join_request'::text, q.created_at, q.squad_id, q.user_id, null::uuid, null::uuid, null::uuid
    from public.squad_join_requests q
    join public.squads s on s.id = q.squad_id
   where s.owner_id = auth.uid() and q.status = 'pending'

  union all
  -- 2
  select 'member_joined'::text, m.joined_at, m.squad_id, m.user_id, null::uuid, null::uuid, null::uuid
    from public.squad_members m
    join public.squads s on s.id = m.squad_id
   where s.owner_id = auth.uid() and m.user_id <> auth.uid()

  union all
  -- 3
  select ('request_' || q.status)::text, q.decided_at, q.squad_id, null::uuid, null::uuid, null::uuid, null::uuid
    from public.squad_join_requests q
   where q.user_id = auth.uid()
     and q.status in ('approved', 'declined')
     and q.decided_at is not null

  union all
  -- 4 (0073, restored 0109)
  select 'friend_request'::text, f.requested_at, null::uuid, f.requested_by, null::uuid, null::uuid, null::uuid
    from public.friendships f
   where f.status = 'PENDING'
     and auth.uid() in (f.low_id, f.high_id)
     and f.requested_by <> auth.uid()

  union all
  -- 5 (0073, restored 0109)
  select 'friend_accepted'::text, f.accepted_at, null::uuid,
         case when f.low_id = auth.uid() then f.high_id else f.low_id end,
         null::uuid, null::uuid, null::uuid
    from public.friendships f
   where f.status = 'ACCEPTED'
     and f.accepted_at is not null
     and f.requested_by = auth.uid()

  union all
  -- 6
  select 'challenge_invite'::text, c.created_at, null::uuid, c.creator_id, c.id, null::uuid, null::uuid
    from public.challenges c
   where c.context = 'FRIENDS'
     and c.state = 'ENROLLMENT'
     and auth.uid() = any(c.invited_ids)
     and not exists (
       select 1 from public.challenge_participants cp
        where cp.challenge_id = c.id and cp.user_id = auth.uid()
     )

  union all
  -- 7
  select 'workout_invite'::text, i.created_at, null::uuid, i.from_id, null::uuid, i.id, null::uuid
    from public.workout_invites i
   where i.to_id = auth.uid() and i.status = 'PENDING'

  union all
  -- 8 (0110). Derived like the rest: accepting flips the status and declining deletes the row, so in
  -- both cases the notification stops existing because the offer stopped existing.
  select 'program_shared'::text, ps.created_at, null::uuid, ps.from_id, null::uuid, null::uuid, ps.id
    from public.program_shares ps
   where ps.to_id = auth.uid() and ps.status = 'PENDING';
$$;

create or replace function public.notification_feed(p_limit int default 50)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(
           jsonb_build_object(
             'kind',             e.kind,
             'at',               e.at,
             'unread',           e.at > coalesce((select notifications_seen_at from public.profiles where id = auth.uid()), '-infinity'::timestamptz),
             'squad_id',         e.squad_id,
             'squad_name',       s.name,
             'squad_crest',      s.crest,
             'squad_photo_url',  s.photo_url,
             'actor_id',         e.actor_id,
             'actor_name',       p.name,
             'actor_avatar_url', p.avatar_url,
             'challenge_id',     e.challenge_id,
             'challenge_name',   ch.name,
             'invite_id',        e.invite_id,
             'invite_name',      wi.workout_name,
             'share_id',         e.share_id,
             'share_name',       sh.name
           )
           order by e.at desc
         ), '[]'::jsonb)
    from (select * from public.notification_events() order by at desc limit greatest(p_limit, 0)) e
    left join public.squads s on s.id = e.squad_id
    left join public.profiles p on p.id = e.actor_id
    left join public.challenges ch on ch.id = e.challenge_id
    left join public.workout_invites wi on wi.id = e.invite_id
    left join public.program_shares sh on sh.id = e.share_id;
$$;

create or replace function public.notification_unread_count()
returns int
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::int
    from public.notification_events() e
   where e.at > coalesce((select notifications_seen_at from public.profiles where id = auth.uid()), '-infinity'::timestamptz);
$$;

comment on function public.notification_events() is
  'The derived notification union. EIGHT branches: join_request, member_joined, request_approved/declined, friend_request, friend_accepted, challenge_invite, workout_invite, program_shared. Any future column change must DROP and rebuild (42P13) — rebuild from THIS body, not from an older one. 0088 and 0092 each rebuilt from a predecessor and silently dropped both friend branches for two migrations.';

comment on table public.program_shares is
  'A program handed to another athlete. Carries a SNAPSHOT of the structure, never a reference — the sender may edit or delete their copy afterwards and the recipient''s must not change under them. Declining DELETES the row (0073''s erasure rule); there is no DECLINED status to find.';
