-- Forge Legacy — 0182: a coach is somebody an athlete let in
--
-- ══ WHAT THIS OPENS ══
--
-- Phase B of `Docs/Forge-Coach-Architecture-v1.0.md`. Forge Coach is a CRM for a HUMAN personal
-- trainer with paying clients. **It is not Coach Holt** — Holt is the in-app AI, and it already owns
-- `/coach`, `athlete_entitlement.coach_ai`, migrations 0138/0143/0144 and `src/domain/coach/**`.
-- FC-D2: every identifier for the human-coaching product is `trainer_*`. Cheap now, unfixable later.
--
-- This migration builds ONLY the relationship: who holds a coach seat, and which athletes have let
-- one in. It reads nobody's training data. The coach-side data RPCs come later and every one of them
-- calls `trainer_client_guard()` below as its first statement.
--
-- ══ CONSENT, NOT PRIVILEGE ══
--
-- FC-D4. `Squads-Hub-Wireframe-Spec-S1.md` §10.3 says the Performance Firewall is "not overridden for
-- premium users, coaches, or squad admins", and Squad Amendment 001 says "Consent, not privilege, is
-- the gate." A coach reading one named athlete's lifts, weight and photos is the deepest Firewall
-- breach in the product, so it is modelled as a clearance the ATHLETE grants and can withdraw — never
-- as a capability the coach holds. That way §10.3 stands unamended.
--
-- Concretely: the trainer INVITES, the athlete ACCEPTS, and either may end it. A `trainer_clients` row
-- with `status = 'active'` is the only thing that will ever unlock a coach read.
--
-- ══ WHY THE TRAINER REGISTRY HAS NO POLICIES ══
--
-- Same argument as `app_admins` in 0129, for the same reason. `0001_spine.sql` makes `profiles`
-- world-readable and 0114's header records that any holder of the anon key can page the whole of it.
-- The list of who holds a privileged seat must never become joinable to that. RLS enabled with zero
-- policies is deny-by-default for anon and authenticated alike.
--
-- A client never needs to read `trainers`. An athlete learns who coaches her from her own
-- `trainer_clients` row joined to the world-readable `profiles` — which is exactly as much as she
-- should know, and nothing about anybody else's coach.
--
-- ══ WHY `trainer_client_guard()` TAKES AN ARGUMENT AND `is_trainer()` DOES NOT ══
--
-- 0129's header is emphatic that `is_app_admin(uuid)` must not exist, because 0120 proved a definer
-- function taking an arbitrary uuid will hand out somebody else's rows. `is_trainer()` follows that
-- rule exactly: zero-argument, answers only about the caller.
--
-- `trainer_client_guard(uuid)` takes an athlete id and is still safe, because it is the OPPOSITE
-- shape: it returns no data at all. It raises unless the CALLER is that athlete's active coach. The
-- only fact it can leak is whether you coach somebody — which you already know. It is the argument
-- that makes it useful: every future coach-data RPC is `select trainer_client_guard(p_athlete);` on
-- line one, so "did a function forget the check" stays a one-line grep.
--
-- ══ ONE COACH AT A TIME ══
--
-- FC-D6, forced by `Program-Architecture-Amendment-001`: "Program Strip shows exactly one Active
-- program… no pluralizing of active programs — only one is ever shown." Two coaches assigning blocks
-- either breaks that rule or leaves one coach writing into a program the client cannot run.
-- Enforced by a PARTIAL unique index on `athlete_id where status = 'active'` — so she may hold several
-- open invitations and pick one, and a past relationship never blocks a future one.
--
-- ══ A LAPSED SEAT SUSPENDS, IT DOES NOT DESTROY ══
--
-- FC-D15. `trainers.status = 'suspended'` fails `is_trainer()` and therefore every coach read, while
-- leaving `trainer_clients` completely untouched. Non-payment must never look like a client revoking.
-- FC-D18 keeps billing out of the product for v1, so seats are granted and suspended by hand in the
-- SQL editor — see the bootstrap block at the foot of this file.
--
-- Idempotent. Depends on 0001 (profiles). RUN AFTER 0181.

-- ── The seat register ────────────────────────────────────────────────────────
create table if not exists public.trainers (
  user_id    uuid primary key references public.profiles (id) on delete cascade,

  -- FC-D15. 'suspended' is a lapsed seat: the coach goes dark, the relationships survive.
  status     text not null default 'active' check (status in ('active', 'suspended')),

  -- FC-D7: the coach pays Forge per seat. This is how many clients this seat covers, and it is the
  -- "N of cap active" the CRM draws. Per MA3-D16 a cap lives in the database, never as a constant in
  -- `src/`. 0 is a legitimate value — a seat that may hold no clients yet.
  seat_cap   int  not null default 0 check (seat_cap >= 0),

  -- Free text, for the human reading this table in two years wondering who granted what and why.
  note       text,

  granted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trainers enable row level security;

-- ⚠ NO POLICIES. NOT AN OMISSION. See the header. Read only by the definer functions below (which run
-- as the table owner and are not subject to RLS); written only by hand in the SQL editor.

comment on table public.trainers is
  'FC-D7/FC-D15. Who holds a Forge Coach seat. RLS is ENABLED WITH ZERO POLICIES on purpose — deny-by-default, so the trainer roster is not enumerable through the world-readable profiles table (0129 makes the same argument for app_admins). status=suspended is a lapsed seat: the coach goes dark, their client relationships are untouched. Written by hand in the SQL editor until billing exists (FC-D18).';

-- ── The consent record ───────────────────────────────────────────────────────
create table if not exists public.trainer_clients (
  id          uuid primary key default gen_random_uuid(),
  trainer_id  uuid not null references public.profiles (id) on delete cascade,
  athlete_id  uuid not null references public.profiles (id) on delete cascade,

  -- 'invited'  the trainer asked; nothing is readable yet
  -- 'active'   the athlete accepted; this is the ONLY status that unlocks a coach read
  -- 'declined' the athlete said no
  -- 'revoked'  the athlete ended it       (FC-D14)
  -- 'ended'    the trainer ended it
  status      text not null default 'invited'
              check (status in ('invited', 'active', 'declined', 'revoked', 'ended')),

  invited_at  timestamptz not null default now(),
  accepted_at timestamptz,
  ended_at    timestamptz,
  ended_by    text check (ended_by is null or ended_by in ('athlete', 'trainer')),

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint trainer_clients_not_self check (trainer_id <> athlete_id)
);

-- FC-D6. PARTIAL on purpose: several open invitations are fine, a past coach never blocks a future
-- one, and exactly one relationship may be active at a time.
create unique index if not exists trainer_clients_one_active_coach
  on public.trainer_clients (athlete_id)
  where status = 'active';

-- One live approach per trainer per athlete. A declined or ended pair may be re-invited later.
create unique index if not exists trainer_clients_one_live_pair
  on public.trainer_clients (trainer_id, athlete_id)
  where status in ('invited', 'active');

create index if not exists trainer_clients_by_trainer
  on public.trainer_clients (trainer_id, status);

alter table public.trainer_clients enable row level security;

-- Either party may READ a row they are a party to. Nobody may write one from a client: the RPCs below
-- are the only writers, and they are SECURITY DEFINER. Same reasoning as `athlete_usage` in 0145 — a
-- client that could write this table could grant itself a coaching relationship, and a coaching
-- relationship is a read of somebody else's body.
drop policy if exists trainer_clients_party_select on public.trainer_clients;
create policy trainer_clients_party_select on public.trainer_clients
  for select using (athlete_id = auth.uid() or trainer_id = auth.uid());

comment on table public.trainer_clients is
  'FC-D4/FC-D6/FC-D14. The coaching relationship, as a clearance the ATHLETE grants. status=active is the ONLY status that unlocks a coach read, and a partial unique index allows exactly one active coach per athlete. SELECT is open to either party; there is deliberately NO client write path — every write goes through the SECURITY DEFINER RPCs in this migration.';

-- ── Is the CALLER a trainer with a live seat? ────────────────────────────────
--
-- Zero-argument, exactly as 0129 requires of `is_app_admin()`. Safe to grant to authenticated: it
-- reveals only whether YOU hold a seat, never who else does.
create or replace function public.is_trainer()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.trainers t
    where t.user_id = auth.uid() and t.status = 'active'
  );
$$;

comment on function public.is_trainer() is
  'FC-D7/FC-D15. True when the CALLER holds a Forge Coach seat that is not suspended. Deliberately zero-argument — 0129 records why an is_x(uuid) overload is a footgun. Reveals only whether YOU are a trainer.';

-- ── The seat guard ───────────────────────────────────────────────────────────
create or replace function public.trainer_guard()
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_trainer() then
    raise exception 'not authorized: no active trainer seat' using errcode = '42501';
  end if;
end;
$$;

comment on function public.trainer_guard() is
  'FC-D7. Raises 42501 unless the caller holds a live seat. MUST be the first statement of every trainer_* function that acts as the coach. Raises rather than returning empty: an empty result set is indistinguishable from "no data yet", which would hide a broken guard for months (0129).';

-- ── The relationship guard — the real security boundary ──────────────────────
--
-- ⚠ EVERY coach-side function that reads or writes an athlete's data must call this FIRST. It is the
-- single line that makes FC-D4 true: no active row, no read. Revocation therefore takes effect on the
-- next call, with no cache to invalidate and no session to expire.
create or replace function public.trainer_client_guard(p_athlete uuid)
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  -- Both halves are required. The seat check is not redundant: a suspended seat (FC-D15) must go dark
  -- immediately even though every one of its client rows is still perfectly 'active'.
  if not public.is_trainer() then
    raise exception 'not authorized: no active trainer seat' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.trainer_clients tc
    where tc.trainer_id = auth.uid()
      and tc.athlete_id = p_athlete
      and tc.status     = 'active'
  ) then
    raise exception 'not authorized: not this athlete''s coach' using errcode = '42501';
  end if;
end;
$$;

comment on function public.trainer_client_guard(uuid) is
  'FC-D4/FC-D14. Raises 42501 unless the CALLER is that athlete''s active coach AND holds a live seat. The first statement of every coach-side data function — which keeps "did one forget the check" a one-line grep. Takes an argument and is still safe because it returns NO data: the only fact it can leak is whether you coach somebody, which you already know.';

-- ── The trainer invites, by exact handle ─────────────────────────────────────
--
-- Exact handle only. `SOC-D15` bars discovery outright — no suggestions, no asymmetric relationships —
-- and FC-D5 keeps Forge Coach invite-only so that bar and the three marketplace exclusions are never
-- approached. `profiles.handle` is `citext`, so the comparison is already case-insensitive.
create or replace function public.trainer_invite_client(p_handle text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_athlete uuid;
  v_active  int;
  v_cap     int;
  v_id      uuid;
begin
  perform public.trainer_guard();

  select p.id into v_athlete
  from public.profiles p
  where p.handle = p_handle::citext;

  if v_athlete is null then
    raise exception 'no athlete with that handle' using errcode = 'P0002';
  end if;

  if v_athlete = auth.uid() then
    raise exception 'a trainer cannot coach themselves' using errcode = '22023';
  end if;

  -- FC-D7. The seat is what was paid for, so the cap is enforced here rather than drawn in the UI.
  select t.seat_cap into v_cap
  from public.trainers t
  where t.user_id = auth.uid();

  select count(*) into v_active
  from public.trainer_clients tc
  where tc.trainer_id = auth.uid()
    and tc.status in ('invited', 'active');

  if v_active >= v_cap then
    raise exception 'seat is full: % of % used', v_active, v_cap using errcode = '53400';
  end if;

  insert into public.trainer_clients (trainer_id, athlete_id, status)
  values (auth.uid(), v_athlete, 'invited')
  returning id into v_id;

  return v_id;
exception
  when unique_violation then
    raise exception 'that athlete already has a live invitation or relationship with you'
      using errcode = '23505';
end;
$$;

comment on function public.trainer_invite_client(text) is
  'FC-D4/FC-D5. The trainer asks; nothing is readable until the athlete accepts. Exact handle only — SOC-D15 bars discovery, and invite-only keeps Forge Coach clear of the marketplace exclusions. Counts open invitations against seat_cap, because an invitation the seat cannot hold is a promise the product cannot keep.';

-- ── The trainer withdraws an unanswered invitation ───────────────────────────
--
-- Without this a mistyped handle costs a seat slot forever, because trainer_invite_client counts
-- open invitations against seat_cap and nothing ages them out. Withdrawing is the trainer un-asking;
-- it is not an ending, because nothing was ever begun.
create or replace function public.trainer_withdraw_invite(p_invite uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_n int;
begin
  perform public.trainer_guard();

  update public.trainer_clients tc
     set status = 'ended', ended_at = now(), ended_by = 'trainer', updated_at = now()
   where tc.id = p_invite
     and tc.trainer_id = auth.uid()
     and tc.status = 'invited';

  get diagnostics v_n = row_count;
  return v_n > 0;
end;
$$;

comment on function public.trainer_withdraw_invite(uuid) is
  'Lets a trainer take back an unanswered invitation, which frees the seat slot it was holding. Scoped to their OWN invited rows: it can never touch an accepted relationship, and ending one of those is trainer_end_client. Returns false rather than raising when there was nothing to withdraw.';

-- ── The athlete answers ──────────────────────────────────────────────────────
create or replace function public.athlete_respond_to_coach(p_invite uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
begin
  select tc.status into v_status
  from public.trainer_clients tc
  where tc.id = p_invite and tc.athlete_id = auth.uid();

  -- Same message for "no such invitation" and "not yours": an invitation id is not a lookup key for
  -- somebody else's coaching arrangements.
  if v_status is null then
    raise exception 'no such invitation' using errcode = 'P0002';
  end if;

  if v_status <> 'invited' then
    raise exception 'that invitation is already %', v_status using errcode = '22023';
  end if;

  if not p_accept then
    update public.trainer_clients tc
       set status = 'declined', ended_at = now(), ended_by = 'athlete', updated_at = now()
     where tc.id = p_invite;
    return 'declined';
  end if;

  -- FC-D6. Checked explicitly so the athlete gets a sentence instead of a unique-violation, but the
  -- partial index is what actually enforces it — a check in plpgsql is a race, an index is not.
  if exists (
    select 1 from public.trainer_clients tc
    where tc.athlete_id = auth.uid() and tc.status = 'active'
  ) then
    raise exception 'you already have a coach — end that first' using errcode = '23505';
  end if;

  update public.trainer_clients tc
     set status = 'active', accepted_at = now(), updated_at = now()
   where tc.id = p_invite;

  return 'active';
end;
$$;

comment on function public.athlete_respond_to_coach(uuid, boolean) is
  'FC-D4/FC-D6. The athlete accepts or declines. This is the moment consent is given, and the only path to status=active. Refuses a second active coach with a sentence, while the partial unique index does the real enforcing.';

-- ── The athlete withdraws consent ────────────────────────────────────────────
--
-- Zero-argument because FC-D6 guarantees there is at most one active coach to end. FC-D14: the effect
-- is immediate — the next `trainer_client_guard()` call fails, and there is no cache to clear.
create or replace function public.athlete_revoke_coach()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_n int;
begin
  update public.trainer_clients tc
     set status = 'revoked', ended_at = now(), ended_by = 'athlete', updated_at = now()
   where tc.athlete_id = auth.uid() and tc.status = 'active';

  get diagnostics v_n = row_count;
  return v_n > 0;
end;
$$;

comment on function public.athlete_revoke_coach() is
  'FC-D14. The athlete ends the relationship. Immediate: the coach''s next trainer_client_guard() call raises. Zero-argument because FC-D6 allows at most one active coach. Returns false when there was nothing to end, rather than raising — revoking twice is not an error.';

-- ── The trainer lets a client go ─────────────────────────────────────────────
create or replace function public.trainer_end_client(p_athlete uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_n int;
begin
  perform public.trainer_client_guard(p_athlete);

  update public.trainer_clients tc
     set status = 'ended', ended_at = now(), ended_by = 'trainer', updated_at = now()
   where tc.trainer_id = auth.uid()
     and tc.athlete_id = p_athlete
     and tc.status = 'active';

  get diagnostics v_n = row_count;
  return v_n > 0;
end;
$$;

comment on function public.trainer_end_client(uuid) is
  'The trainer''s side of ending a relationship. Distinct from the athlete''s revoke only in ended_by, which matters because FC-D14 treats the two identically for data but the CRM tells a different story about each.';

-- ── Grants ───────────────────────────────────────────────────────────────────
--
-- ⚠ Revoke FROM PUBLIC, never from `authenticated`. Postgres grants EXECUTE to PUBLIC on every new
-- function, and revoking from a role that never held a direct grant removes nothing. 0120 learned
-- this the hard way and 0129's header repeats it.
--
-- The two guards are never granted to anybody: they are called from inside definer bodies.
revoke execute on function public.trainer_guard()             from public;
revoke execute on function public.trainer_client_guard(uuid)  from public;

grant execute on function public.is_trainer()                              to authenticated;
grant execute on function public.trainer_invite_client(text)               to authenticated;
grant execute on function public.athlete_respond_to_coach(uuid, boolean)   to authenticated;
grant execute on function public.athlete_revoke_coach()                    to authenticated;
grant execute on function public.trainer_end_client(uuid)                  to authenticated;
grant execute on function public.trainer_withdraw_invite(uuid)             to authenticated;

-- ── Seating a trainer (there is no CLI — this IS the mechanism, FC-D18) ─────
--
-- Supabase Dashboard → SQL Editor. It runs as `postgres`, which bypasses RLS.
--
--   select id, handle from public.profiles where handle = '<their handle>';
--
--   insert into public.trainers (user_id, seat_cap, note)
--   values ('<paste-uuid>'::uuid, 25, 'first trainer — pilot 2026-08-31')
--   on conflict (user_id) do update set seat_cap = excluded.seat_cap, updated_at = now();
--
-- Suspending a lapsed seat (FC-D15 — this does NOT touch their clients):
--
--   update public.trainers set status = 'suspended', updated_at = now() where user_id = '<uuid>';
--
-- ⚠ Do NOT delete a trainer row to suspend them. `on delete cascade` from profiles is about the
-- person leaving Forge Legacy entirely; deleting the seat row alone would strand every
-- `trainer_clients` row pointing at a coach who can no longer be identified as one.
