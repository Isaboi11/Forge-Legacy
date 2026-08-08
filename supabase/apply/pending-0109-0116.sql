-- Forge Legacy — pending migrations 0109 through 0116
--
-- THE WHOLE OUTSTANDING LEDGER. Everything from 0109 to 0116 is authored, committed and tested,
-- and the database has never seen any of it. 0111 was applied ahead of them on 2026-08-03 (safe —
-- it only creates `athlete_lift_maxes` and adds `programs.lift_maxes`, and depends on none of
-- these), which is why the ledger reads non-sequentially.
--
-- ══ REVISED 2026-08-05 AFTER A FAILED RUN ══
--
-- The first attempt stopped on 0109 with
--
--     42P13: cannot change return type of existing function
--
-- because 0109 used `create or replace` on the belief that the live `notification_events()` matched
-- 0092's six-column shape. It does not. 0109 now DROPS the function first, which cannot fail that way
-- whatever shape is really there. Nothing else about the bundle changed.
--
-- ══ APPLY IN THIS ORDER, IN ONE RUN ══
--
-- The order is not cosmetic. 0110 DROPS AND REBUILDS all three notification functions, and its body
-- is written as 0109's plus one branch. Running 0110 before 0109 leaves the two friend branches out
-- again — the exact failure 0088 and 0092 each produced, twice, with no error and no failing test.
--
--   0109_restore_friend_notifications.sql      notification_events() DROPPED and rebuilt WITH the two friend branches
--   0110_program_shares.sql                    program_shares + branch 8 — REBUILDS notifications FROM 0109
--   0112_honor_celebration.sql                 honor_instances.celebrated_at + uncelebrated_honors()
--   0113_friends_feed_recap.sql                friends_feed() re-issued with workout_id + workout_summary
--   0114_athlete_search.sql                    profiles.discoverable + find_athletes()
--   0115_starter_template_provenance.sql       workout_templates.source_definition_id + both template RPCs
--   0116_storage_exercise_media.sql            the exercise-media bucket + its public-read policy
--
-- ══ A CLEAN RUN IS NOT PROOF ══
--
-- Five of these seven redefine PL/pgSQL functions, and PL/pgSQL resolves column references at RUN
-- time. A run with no error proves every body PARSED. It does not prove one of them binds. The proof
-- is pressing a button, and each has a specific one:
--
--   0109  send a friend request from another account — the bell must move
--   0110  send a program to a friend — it must arrive in their inbox
--   0112  earn an honor, then land on Legacy — the medallion ceremony must play
--   0113  post a workout recap to Friends — look for the Vol / Time / Lifts / PRs strip,
--         NOT the bare bronze milestone card
--   0114  type a single `%` into Add Friend — "No athletes found", never every athlete alive
--   0115  adopt a Forge starter template, train it — "Times used 1"
--   0116  open any Exercise Detail — the demonstration loop must play, not fall back
--
-- A stopped chain fails on a MISSING COLUMN (42703), which this app's PGRST205 guards do NOT catch.
-- Check for an error after the run, not merely the absence of one.



-- ==========================================================================================
-- 0109_restore_friend_notifications.sql
-- notification_events() DROPPED and rebuilt WITH the two friend branches
-- ==========================================================================================

-- Forge Legacy — 0109: friend requests notify again
--
-- ══ THE DEFECT ══
--
-- A tester sent a friend request. The athlete on the other end opened their notification tab and it was
-- empty — not "nothing new" styled as a bug, literally the Nothing New empty state. The request existed:
-- it was in `friendships` as PENDING, it showed on the asker's "Requests Sent" list, and the recipient
-- could have accepted it from `/add-friend` if they had thought to look there. The one surface that is
-- supposed to TELL them said nothing.
--
-- The client was never at fault. `/inbox` has worded, glyphed and routed `friend_request` and
-- `friend_accepted` since 0073 — it wires them to the asker's profile, which is where a request is
-- answered. `notifications-live.ts` lists both in `KINDS`. Every one of those branches has been
-- unreachable, because the server stopped emitting the rows.
--
-- ══ HOW THEY WERE LOST ══
--
-- 0073 added the two friend branches to `notification_events()` and, in the same migration, widened the
-- `squads` join in `notification_feed` from INNER to LEFT — because a friend event has no squad and an
-- inner join silently dropped it. That much was right.
--
-- 0088 needed a `challenge_id` column. A return-type change is 42P13 under `create or replace`, so it
-- dropped all three functions and rebuilt them — and the rebuilt `notification_events()` was written
-- from the 0054 body, which predates friends. Both branches vanished. Nothing errored: the function
-- compiled, the feed kept returning rows, and squad notifications carried on working, so the loss had
-- no symptom until somebody with no squads got a friend request.
--
-- 0092 then repeated the drop-and-rebuild for `invite_id`, and its own comment records the moment the
-- regression was locked in: "Identical to 0088 apart from the new branch and column." It was — faithfully,
-- including the two missing branches. A rebuild that copies its predecessor inherits whatever the
-- predecessor forgot.
--
-- This is why the union in `notification_events()` is the single thing in this schema most worth
-- re-reading in full before touching. It has no tests, no foreign keys, and no failure mode: a dropped
-- branch is indistinguishable from a quiet week.
--
-- ══ THE FIX ══
--
-- The two branches, restored verbatim from 0073 and padded to the current six-column shape.
--
-- ⚠ AMENDED 2026-08-05 — DROP FIRST, ALWAYS. This migration originally read `create or replace` on the
-- reasoning that the return type matched 0092's. Applied against the real database it failed with
--
--     42P13: cannot change return type of existing function
--     DETAIL: Row type defined by OUT parameters is different.
--
-- so the live function is NOT the shape this file was written against. That is the same class of fact
-- this migration exists to fix: the ledger says one thing and the database holds another, and nothing
-- reported the difference until something refused to run.
--
-- The lesson generalises past this one function. `create or replace` on a `returns table` function is
-- only safe if you KNOW the live row type, and for a function that five migrations have rewritten,
-- nobody knows it — they know what the files say. Dropping first costs nothing and cannot fail this
-- way, so this migration now does what 0110 already did.
--
-- Dropping `notification_events()` alone is safe. `notification_feed` and `notification_unread_count`
-- call it BY NAME; a SQL function body records no hard dependency, so they survive the drop and bind
-- to the new body on their next call. Their own definitions are untouched here.
--
-- Both branches are still DERIVED. There is no notifications table and this does not add one: the
-- request row IS the notification. Withdraw the request and it disappears from the feed, because the
-- fact behind it stopped being true. That property is the reason a notification here can never lie.
--
-- Still no `friend_declined`, deliberately (0073): accepting notifies, declining is silent, because a
-- notification whose entire content is a small rejection is worse than none.

-- No-arg form on purpose: OUT parameters are not part of a function's identity, so this matches and
-- removes whatever shape is actually there — which is the entire point.
drop function if exists public.notification_events();

create function public.notification_events()
returns table (kind text, at timestamptz, squad_id uuid, actor_id uuid, challenge_id uuid, invite_id uuid)
language sql
security definer
stable
set search_path = public
as $$
  select 'join_request'::text, q.created_at, q.squad_id, q.user_id, null::uuid, null::uuid
    from public.squad_join_requests q
    join public.squads s on s.id = q.squad_id
   where s.owner_id = auth.uid() and q.status = 'pending'

  union all

  select 'member_joined'::text, m.joined_at, m.squad_id, m.user_id, null::uuid, null::uuid
    from public.squad_members m
    join public.squads s on s.id = m.squad_id
   where s.owner_id = auth.uid() and m.user_id <> auth.uid()

  union all

  select ('request_' || q.status)::text, q.decided_at, q.squad_id, null::uuid, null::uuid, null::uuid
    from public.squad_join_requests q
   where q.user_id = auth.uid()
     and q.status in ('approved', 'declined')
     and q.decided_at is not null

  union all

  -- RESTORED (0073, lost at 0088). Someone wants to be your friend. No squad, hence the null — which is
  -- the whole reason `notification_feed` left-joins `squads`.
  select 'friend_request'::text, f.requested_at, null::uuid, f.requested_by, null::uuid, null::uuid
    from public.friendships f
   where f.status = 'PENDING'
     and auth.uid() in (f.low_id, f.high_id)
     and f.requested_by <> auth.uid()

  union all

  -- RESTORED (0073, lost at 0088). They said yes. Only the asker is told; there is no matching decline
  -- event, by design.
  select 'friend_accepted'::text, f.accepted_at, null::uuid,
         case when f.low_id = auth.uid() then f.high_id else f.low_id end,
         null::uuid, null::uuid
    from public.friendships f
   where f.status = 'ACCEPTED'
     and f.accepted_at is not null
     and f.requested_by = auth.uid()

  union all

  select 'challenge_invite'::text, c.created_at, null::uuid, c.creator_id, c.id, null::uuid
    from public.challenges c
   where c.context = 'FRIENDS'
     and c.state = 'ENROLLMENT'
     and auth.uid() = any(c.invited_ids)
     and not exists (
       select 1 from public.challenge_participants cp
        where cp.challenge_id = c.id and cp.user_id = auth.uid()
     )

  union all

  select 'workout_invite'::text, i.created_at, null::uuid, i.from_id, null::uuid, i.id
    from public.workout_invites i
   where i.to_id = auth.uid() and i.status = 'PENDING';
$$;

comment on function public.notification_events() is
  'The derived notification union. SEVEN branches: join_request, member_joined, request_approved/declined, friend_request, friend_accepted, challenge_invite, workout_invite. Any future column change must DROP and rebuild (42P13) — rebuild from THIS body, not from an older one. 0088 and 0092 each rebuilt from a predecessor and silently dropped both friend branches for two migrations.';


-- ==========================================================================================
-- 0110_program_shares.sql
-- program_shares + branch 8 — REBUILDS notifications FROM 0109
-- ==========================================================================================

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


-- ==========================================================================================
-- 0112_honor_celebration.sql
-- honor_instances.celebrated_at + uncelebrated_honors()
-- ==========================================================================================

-- Forge Legacy — 0112: an honor knows whether it has been celebrated
--
-- M-2 has never played. `HonorCeremony` (the forged medallion, built to `Forge First Honor
-- Ceremony.dc.html`) is a real component, `CeremonyProvider` special-cases `honorEarned` to render
-- it instead of the generic Modal, and `CeremonyProvider` is mounted app-wide in `_layout.tsx` — and
-- `kind: 'honorEarned'` is enqueued NOWHERE outside `ceremony-harness.tsx` and the unit tests. An
-- athlete earning an honor got one line of text on the Seal screen, which the PO reasonably read as
-- the honor "popping up at the workout end", and asked for it on Legacy instead.
--
-- Legacy is where it belongs and where the pattern already lives: `legacy.tsx` has fired M-1 rank-ups
-- from its focus effect since the rank engine shipped. What was missing is not the ceremony, it is
-- the STATE — "has this athlete been shown this honor yet."
--
-- WHY A COLUMN AND NOT A CLIENT FLAG. Device-local state replays the ceremony on every reinstall and
-- forgets it on every other device. Router params from W-17 only work when the athlete reaches Legacy
-- by finishing a workout, and this must also work for an honor granted by `claim_earned_honors` on a
-- retroactive sweep — which is precisely the case where a silent grant is most confusing.
--
-- WHY MARKING IS ITS OWN CALL. `uncelebrated_honors()` reads and marks NOTHING. A ceremony that a
-- crash, a force-quit or a tab close cut short must still play next time — showing an honor twice is
-- a small annoyance, and never showing it at all is losing the moment the whole system exists for.

alter table public.honor_instances add column if not exists celebrated_at timestamptz;

comment on column public.honor_instances.celebrated_at is
  'When the M-2 ceremony for this honor was dismissed. Null = still owed. Set by mark_honors_celebrated() AFTER the ceremony closes, never at fetch time — a ceremony cut short must replay.';

-- BACKFILL, and it is not optional. Every honor in the system predates this column, so leaving them
-- null would greet every existing athlete with a ceremony for every honor they have ever earned the
-- next time they open Legacy — 139 medallions in a row for the account that has them all. They were
-- earned before the ceremony existed; the honest record is that their moment has passed.
update public.honor_instances set celebrated_at = awarded_at where celebrated_at is null;

-- Owed honors, oldest first. `security invoker` — the `honor_own` policy (0012) already scopes this
-- to the caller's own rows, and a definer here would be a wider grant than the read needs.
create or replace function public.uncelebrated_honors()
returns jsonb
language sql
security invoker
stable
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',           h.id,
        'honorType',    h.honor_type,
        'displayName',  h.display_name,
        'dateEarned',   h.date_earned
      )
      order by h.awarded_at, h.id
    ),
    '[]'::jsonb
  )
    from public.honor_instances h
   where h.athlete_id = auth.uid()
     and h.celebrated_at is null;
$$;

-- Returns how many rows it actually changed, so a caller can tell "marked" from "already was".
-- `is null` in the WHERE keeps this idempotent: a double-dismiss does not rewrite the timestamp.
create or replace function public.mark_honors_celebrated(p_ids uuid[])
returns int
language plpgsql
security invoker
as $$
declare
  v_n int;
begin
  if p_ids is null or array_length(p_ids, 1) is null then
    return 0;
  end if;
  update public.honor_instances
     set celebrated_at = now()
   where athlete_id = auth.uid()
     and id = any(p_ids)
     and celebrated_at is null;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;


-- ==========================================================================================
-- 0113_friends_feed_recap.sql
-- friends_feed() re-issued with workout_id + workout_summary
-- ==========================================================================================

-- Forge Legacy — 0113: the Friends Feed carries the recap it was already storing
--
-- One table has served both feeds since 0074: `squad_posts`, with an `audience` column and a
-- `workout_summary` jsonb. The SQUAD side has rendered that column as a Vol / Time / Lifts / PRs strip
-- since it shipped. `friends_feed()` selected `pr_value`, `pr_exercise` and `pr_label` and never
-- selected `workout_summary` or `workout_id` — so a recap posted to FRIENDS arrived with its stats
-- stripped, fell through `shapeOf()` into the generic bronze milestone card, and had nothing to say.
--
-- Same table. Same column. One feed reading it and one not. This is an omission, not a design.
--
-- NOTHING ELSE CHANGES. Audience scoping, the friendship join, ordering, the comment/reaction
-- subqueries and the reactors aggregate are 0074's, verbatim. Signature and return type are unchanged,
-- so `create or replace` is enough and no `drop function` is needed.
--
-- ⚠ PL/pgSQL RESOLVES COLUMN REFERENCES AT RUN TIME. Applying this proves the body parsed, not that it
-- binds `p.workout_summary`. The proof is pressing the button: post a recap to Friends and look at the
-- card. If it renders bare, the function did not rebind — check the live body with \df+ friends_feed.

create or replace function public.friends_feed(p_limit int default 40, p_before timestamptz default null)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(
             jsonb_build_object(
               'id', p.id,
               'type', p.type,
               'audience', p.audience,
               'body', p.body,
               'media', p.media,
               'layout', p.layout,
               'created_at', p.created_at,
               'author_id', p.author_id,
               'author_name', coalesce(pr.name, 'Athlete'),
               'author_handle', pr.handle,
               'author_avatar_url', pr.avatar_url,
               'is_mine', p.author_id = v_uid,
               'pr_value', p.pr_value,
               'pr_exercise', p.pr_exercise,
               'pr_label', p.pr_label,
               -- THE TWO KEYS THIS MIGRATION EXISTS FOR.
               'workout_id', p.workout_id,
               'workout_summary', p.workout_summary,
               'comment_count', (select count(*) from public.squad_post_comments c where c.post_id = p.id),
               'reaction_count', (select count(*) from public.squad_post_reactions r where r.post_id = p.id),
               'my_reaction', (
                 select r.reaction from public.squad_post_reactions r
                  where r.post_id = p.id and r.user_id = v_uid
               ),
               -- Who acknowledged it, for the "Acknowledged by A, B and N others" line. Names only; there
               -- is no count rendered as a score anywhere (SOC-D11).
               'reactors', coalesce((
                 select jsonb_agg(jsonb_build_object('id', rp.id, 'name', coalesce(rp.name, 'Athlete'), 'avatar_url', rp.avatar_url, 'is_self', rp.id = v_uid)
                          order by (rp.id = v_uid) desc, rp.name)
                   from public.squad_post_reactions r
                   join public.profiles rp on rp.id = r.user_id
                  where r.post_id = p.id
               ), '[]'::jsonb)
             ) order by p.created_at desc)
      from public.squad_posts p
      join public.profiles pr on pr.id = p.author_id
     where p.audience in ('FRIENDS', 'BOTH')
       and (p.author_id = v_uid or public.are_friends(p.author_id, v_uid))
       and (p_before is null or p.created_at < p_before)
     limit greatest(p_limit, 0)
  ), '[]'::jsonb);
end;
$$;


-- ==========================================================================================
-- 0114_athlete_search.sql
-- profiles.discoverable + find_athletes()
-- ==========================================================================================

-- Forge Legacy — 0114: athlete search returns a LIST, by name or handle
--
-- THIS RESTORES A LOCKED SPEC RATHER THAN OVERTURNING ONE.
--
-- `Identity-Amendment-001-Username.md` §4 has specified name+handle search since it was locked: §4.1
-- says a query matches Display Name AND Username simultaneously and that a leading `@` forces
-- handle-only mode, §4.2 gives the ranking, §4.3 the row format, §4.4 the empty state, §4.5 the
-- no-results copy word for word. SOC-D15 was written later, read "returns a LIST" as the definition of
-- a discovery surface, and narrowed it to one exact handle — which is what 0073 shipped.
--
-- Two LOCKED documents disagreed. `Social-Architecture-Amendment-003-Athlete-Search.md` settles it in
-- Identity's favour and restates precisely what SOC-D15 still bars, which is everything the system
-- populates on its own: Suggested Friends, People You May Know, mutual-friend recommendations, any
-- ranking by engagement or popularity, and any result for a query the athlete did not type.
--
-- `find_athlete_by_handle` (0073) IS NOT REPLACED. It is the QR-code and profile-link path SOC-D15
-- explicitly sanctions, and other callers use it.
--
-- ⚠ READ THIS BEFORE TRUSTING `discoverable`. `0001_spine.sql:165` is
--   create policy profiles_read on profiles for select using (true)
-- so any client holding the anon key can already page the entire profile table through PostgREST. Every
-- guard below is ADVISORY UX, not enforcement, and the toggle is a promise this database does not keep.
-- Making it real means narrowing `profiles_read`, which is its own ruling — the feed and notification
-- functions that join `profiles` are all `security definer` and would be unaffected, but the blast
-- radius needs checking first. Until then the setting must be worded as "hide me from name search",
-- never as "no one can find me".

-- ── The toggle Identity §7.1 has always specified and nothing ever implemented ────────────────────
-- A real column, not a key inside `app_prefs`: the search function has to filter on it in SQL. And not
-- a key inside `profiles.visibility` either — that is a per-SECTION audience map (chapter · history ·
-- timeline · transformation · photos · accomplishments · stats · training) with no notion of
-- findability, and P-6 §75 assigns discoverability to Identity rather than to P-6's own controls.
alter table public.profiles add column if not exists discoverable boolean not null default true;

comment on column public.profiles.discoverable is
  'Identity-Amendment-001 §7.1 "Let non-squad athletes find me in search". Default true. Governs NAME search only (SOC-A3-D4) — an exact handle still resolves, because a handle is something you were given. ADVISORY: profiles_read is `using (true)`, so this is not enforced at the row level.';

-- Only the LEADING-prefix branch can use these. The mid-name word-prefix branch seq-scans, which is
-- fine at this scale and capped at 25 rows; past tens of thousands of athletes it wants pg_trgm + GIN,
-- which is an extension decision and is deliberately not taken here.
create index if not exists profiles_name_prefix on public.profiles (lower(name) text_pattern_ops);
create index if not exists profiles_handle_prefix on public.profiles (lower(handle::text) text_pattern_ops);

create or replace function public.find_athletes(p_query text, p_limit int default 20)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_raw    text := btrim(coalesce(p_query, ''));
  v_handle boolean := left(v_raw, 1) = '@';   -- Identity §4.1: @ forces handle-only mode
  q        text := lower(regexp_replace(v_raw, '^@+', ''));
  esc      text;
  v_cap    int := least(greatest(coalesce(p_limit, 20), 1), 25);
begin
  -- Identity §4.4: nothing is returned before a query. Not an empty list as a formality — the empty
  -- query is the one input that would otherwise mean "everyone".
  if v_uid is null or char_length(q) < 2 then
    return '[]'::jsonb;
  end if;

  -- ══ THE LINE THAT STOPS THE WHOLE USER BASE BEING ENUMERATED ══
  -- Unescaped, a query of '%' matches every athlete alive and this function becomes the directory the
  -- product does not have. Escaped, '%' matches a literal percent sign and returns nothing.
  esc := replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_');

  return coalesce((
    select jsonb_agg(r.obj order by r.tier, lower(r.name), r.id)
      from (
        select p.id,
               p.name,
               -- Identity §4.2's ranking, with one deliberate deviation recorded in SOC-A3-D2: an
               -- EXACT HANDLE outranks a squad-mate. Typing somebody's whole handle is the most
               -- intentional act SOC-D15 recognises, and burying it under a roster would defeat it.
               case
                 when lower(p.handle::text) = q then 0
                 when exists (
                   select 1 from public.squad_members a
                     join public.squad_members b on b.squad_id = a.squad_id
                    where a.user_id = v_uid and b.user_id = p.id
                 ) then 1
                 when lower(p.name) = q then 2
                 when lower(p.handle::text) like esc || '%' escape '\' then 3
                 else 4
               end as tier,
               jsonb_build_object(
                 'id',           p.id,
                 'name',         p.name,
                 'handle',       p.handle,
                 'avatar_url',   p.avatar_url,
                 'athlete_type', p.athlete_type,
                 'rank_family',  p.rank_family,
                 'rank_level',   p.rank_level,
                 -- Identity §4.3's tertiary line. ONE squad name, not a list — this is a label on a
                 -- row, not a read of anybody's graph.
                 'shared_squad', (
                   select s.name from public.squads s
                     join public.squad_members a on a.squad_id = s.id and a.user_id = v_uid
                     join public.squad_members b on b.squad_id = s.id and b.user_id = p.id
                    order by s.name limit 1
                 ),
                 'state', public.friendship_with(p.id)
               ) as obj
          from public.profiles p
         where p.id <> v_uid                            -- you are not a search result
           and (
             lower(p.handle::text) like esc || '%' escape '\'
             -- NAME matches on a WORD prefix, never a free substring. "ada" finds "Ada Lovelace" and
             -- "Grace Ada Hopper" and does not find "Amanda". A free substring is an enumeration tool
             -- wearing a search box: '%a%' would return almost everyone.
             or (not v_handle and (
                  lower(p.name) like esc || '%' escape '\'
               or lower(p.name) like '% ' || esc || '%' escape '\'
             ))
           )
           -- SOC-A3-D3/D4: the toggle hides you from NAME search. An exact handle still resolves, and
           -- squad-mates always see each other — you are already in a room together.
           and (
             p.discoverable
             or lower(p.handle::text) = q
             or exists (
               select 1 from public.squad_members a
                 join public.squad_members b on b.squad_id = a.squad_id
                where a.user_id = v_uid and b.user_id = p.id
             )
           )
         limit v_cap
      ) r
  ), '[]'::jsonb);
end;
$$;


-- ==========================================================================================
-- 0115_starter_template_provenance.sql
-- workout_templates.source_definition_id + both template RPCs
-- ==========================================================================================

-- Forge Legacy — 0115: a template knows whether Forge wrote it
--
-- Forge now ships six starter templates (`src/domain/workout/starter-templates`), so a brand-new
-- athlete's first Templates screen is six ready sessions instead of an empty panel reading
-- "No templates yet". `Forge Strength Start.dc.html`'s "Start a workout you've saved — or one built by
-- Forge" becomes true.
--
-- ADOPTED, NOT SHARED. The starters are shipped DEFINITIONS; adopting one writes the athlete their own
-- ordinary row here, stamped with the definition it came from. Exactly the model `programs` already
-- uses for the built-in catalogue (`programs.source_definition_id`, 0019).
--
-- The alternative — seed rows with `athlete_id is null` plus a read policy — was rejected because this
-- schema is owner-only in load-bearing places, not incidentally:
--
--   · `template_detail()` and `workout_templates_list()` (0095) both end `where t.athlete_id =
--     auth.uid()`.
--   · `save_workout` re-checks `where id = p_template_id and athlete_id = v_uid` and DEGRADES TO AN
--     UNATTRIBUTED WORKOUT otherwise — so a session trained from a shared Forge row would silently
--     lose its `template_id`, and W-27 would show no history for the templates everyone used.
--   · `use_count` is DERIVED from `workouts.template_id` (0095 argues at length that it must be). On a
--     shared row that becomes a GLOBAL count — how many times every athlete alive has trained Push Day
--     — printed on a screen that means "how many times you have".
--
-- Provenance only. This column never gates a read, never changes ownership, and is never used to
-- rewrite an athlete's row when the shipped definition changes: their copy is theirs from the moment
-- they take it.

alter table public.workout_templates
  add column if not exists source_definition_id text;

comment on column public.workout_templates.source_definition_id is
  'The Forge starter definition this template was adopted from (src/domain/workout/starter-templates). Null for a captured or authored template. Provenance only — the row is the athlete''s own copy and an app update never rewrites it, exactly as programs.source_definition_id works.';

-- Adopting the same starter twice must RESUME the copy, not fork it. Partial, so the column stays
-- null on every captured/authored template without those colliding with each other.
create unique index if not exists workout_templates_one_per_source
  on public.workout_templates (athlete_id, source_definition_id)
  where source_definition_id is not null;

-- ── Both reads carry the field ────────────────────────────────────────────────
-- 0095's bodies, verbatim, plus one key each. Signatures unchanged, so no `drop function`.
--
-- ⚠ PL/pgSQL binds at RUN time. These two are `language sql`, which is checked at creation — but
-- `save_workout` in 0095 is PL/pgSQL and untouched here, and the run-time proof for this migration is
-- still the same one: adopt a starter, train it, and confirm W-27 shows "Times used 1" with a history
-- row. That is what proves the ownership check passed and `template_id` survived the save.

create or replace function public.template_detail(p_template uuid)
returns jsonb
language sql
security invoker
stable
set search_path = public
as $$
  select jsonb_build_object(
           'id', t.id,
           'name', t.name,
           'exercises', t.exercises,
           'created_at', t.created_at,
           'source_definition_id', t.source_definition_id,
           'use_count', (select count(*) from public.workouts w where w.template_id = t.id and w.state = 'saved'),
           'last_used_at', (select max(w.saved_at) from public.workouts w where w.template_id = t.id and w.state = 'saved'),
           'history', coalesce((
             select jsonb_agg(jsonb_build_object(
                      'workout_id', h.id,
                      'at', h.saved_at,
                      'duration_sec', h.duration_sec,
                      'note', h.notes
                    ) order by h.saved_at desc)
               from public.workouts h
              where h.template_id = t.id and h.state = 'saved'
           ), '[]'::jsonb)
         )
    from public.workout_templates t
   where t.id = p_template and t.athlete_id = auth.uid();
$$;

create or replace function public.workout_templates_list()
returns jsonb
language sql
security invoker
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(x.obj order by x.last_used_at desc nulls last, x.created_at desc), '[]'::jsonb)
    from (
      select t.created_at,
             (select max(w.saved_at) from public.workouts w where w.template_id = t.id and w.state = 'saved') as last_used_at,
             jsonb_build_object(
               'id', t.id,
               'name', t.name,
               'exercises', t.exercises,
               'created_at', t.created_at,
               'source_definition_id', t.source_definition_id,
               'use_count', (select count(*) from public.workouts w where w.template_id = t.id and w.state = 'saved'),
               'last_used_at', (select max(w.saved_at) from public.workouts w where w.template_id = t.id and w.state = 'saved')
             ) as obj
        from public.workout_templates t
       where t.athlete_id = auth.uid()
    ) x;
$$;


-- ==========================================================================================
-- 0116_storage_exercise_media.sql
-- the exercise-media bucket + its public-read policy
-- ==========================================================================================

-- Forge Legacy — 0116: the exercise demonstration bucket
--
-- W-22's FIRST section in `Forge Exercise Detail.dc.html` is the demonstration loop, and it has been
-- the one deferred block on that screen since it was built ("no media exists for any of the 794
-- exercises"). `scripts/animation-processing` now produces them: transparent looping WebP, the target
-- muscle recoloured to app bronze, warm-graded for the dark UI.
--
-- READ-ONLY TO EVERY CLIENT. This is app content, not athlete content — the difference from `avatars`,
-- `squad-media` and `transformation-media`, which all carry owner-write policies because an athlete
-- puts things in them. Nothing in the app uploads here; the library is processed on a workstation and
-- pushed from the dashboard or a service key. So there is a public read policy and NO insert, update or
-- delete policy at all, which is the narrowest grant that serves the screen.
--
-- ── THE PATH CONVENTION IS THE CONTRACT ──────────────────────────────────────────────────────────
--
--     exercise-media/male/<exerciseId>.webp
--     exercise-media/female/<exerciseId>.webp
--
-- `<exerciseId>` is the catalog id from `exercises.json` — `barbell-bench-press`, `pull-up`. NOT the
-- library's source filename (`Barbell-Bench-Press_Chest_.webp`).
--
-- WHY THE RENAME, since the pipeline currently writes source-named files: keying on the catalog id
-- means the app DERIVES the URL from the id it already has, so there is no manifest to ship, nothing
-- to keep in step, and no 800-row lookup table in the bundle. `catalog_match_review.csv` already holds
-- both columns (`exercise_id`, `male_file`, `female_file`), so the rename is a read of the sheet that
-- is being reviewed by hand anyway — and reviewing it is the step that has to happen regardless.
--
-- A missing file is an ORDINARY STATE, not an error: the app renders the design's empty demo frame and
-- says nothing. Exercises can be added to the catalog before the library has a clip for them, and some
-- (strongman, mobility) are not in this library at all.

insert into storage.buckets (id, name, public)
values ('exercise-media', 'exercise-media', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "exercise_media_public_read" on storage.objects;

create policy "exercise_media_public_read" on storage.objects
  for select using ( bucket_id = 'exercise-media' );
