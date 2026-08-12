-- Forge Legacy — 0137: who just signed up
--
-- ══ WHAT THIS CLOSES ══
--
-- PO: *"is there a way for me to get notified whenever someone signs up? And to get the name of who?
-- I'm waiting on some that I don't know if they have or not."*
--
-- 0130 gave the dashboard a signup COUNT. A count answers "how many" and the question here is "who" —
-- the operator is handing out testing invitations one at a time and needs to know which ones landed.
-- Two halves, because they answer it at different moments: a LIST on `/admin` that can be checked at
-- any time, and a PUSH at the moment it happens.
--
-- ══ ⚠ WHY THE TRIGGER IS ON `name`, NOT ON THE INSERT ══
--
-- `handle_new_user()` (0001) mints the profile row from `auth.users` metadata, and the sign-in screen
-- passes **only email and password** — no name is collected until the Account step of onboarding. So
-- every profile is born as `name = 'Athlete'`, `handle = 'athlete_<8 hex>'`, and a trigger on INSERT
-- would have pushed "Athlete signed up" for every single person. That is the count again, with a
-- notification sound on it.
--
-- The moment an athlete becomes identifiable is the moment they are NAMED, so that is the moment this
-- fires. `event_at` is pinned to `created_at` rather than `now()`, which makes 0120's unique index do
-- the deduplication for free: renaming yourself later produces the same key and files nothing.
--
-- ══ ⚠ WHY IT SWALLOWS EVERY ERROR ══
--
-- This trigger sits on `public.profiles`, in the path of onboarding. An operator convenience that can
-- raise is an operator convenience that can stop a real athlete from finishing sign-up — and it would
-- fail for the most ordinary reason imaginable, since migrations here are pasted in by hand and 0120
-- may not be applied on the database this runs against. `to_regclass` checks first and the exception
-- block catches everything else. A missed alert is a missed alert; a blocked signup is a lost athlete.
--
-- ══ ⚠ WHY IT DOES NOT GO THROUGH `notification_events_for` ══
--
-- That function is the ATHLETE'S feed — `/inbox` renders it, and `push_enqueue_for` re-derives pushes
-- from it. A signup is an operator event: it belongs to nobody's inbox, it has no route inside the
-- social model, and adding a branch would mean rebuilding a 70-line union that six triggers depend on.
-- It writes `push_outbox` directly instead, which is the sender's own input and nothing else's.
--
-- ══ SELF-CONTAINED ON PURPOSE ══
--
-- `app_admins`, `is_app_admin()` and `admin_guard()` are restated below EXACTLY as 0129 defines them,
-- so this file runs correctly whether or not 0129 has been applied yet. `create table if not exists`
-- skips an existing table; the two `create or replace` bodies are byte-identical to 0129's, so
-- replacing them is a no-op. Re-running 0129 afterwards is equally harmless.
--
-- Idempotent. Depends on 0001 (profiles). Degrades to list-only without 0120 (push_outbox).

begin;

-- ── The operator allowlist — 0129's definition, restated so this file stands alone ──────────────────
create table if not exists public.app_admins (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  note       text,
  granted_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;
-- ⚠ NO POLICIES. NOT AN OMISSION — see 0129's header (AA-D6). RLS on with zero policies is
-- deny-by-default, which is what keeps the key-holder roster from being joinable to world-readable
-- `profiles`. A later migration must not "fix" this by adding an owner policy.

create or replace function public.is_app_admin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.app_admins a where a.user_id = auth.uid());
$$;

create or replace function public.admin_guard()
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_app_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
end;
$$;

-- ── HALF ONE: the list ──────────────────────────────────────────────────────────────────────────────
--
-- Newest first, and it deliberately INCLUDES the ones still called 'Athlete'. That is not noise, it is
-- the answer to the actual question: somebody who created an account and never finished onboarding is
-- exactly the case the PO cannot currently see, and "signed up but stalled at the Account step" is a
-- different problem from "never signed up at all".
--
-- `named` states which of those two a row is, so the screen never has to know that 'Athlete' is a
-- sentinel. `email` is NOT returned — it is not needed to answer "did they sign up", it lives in
-- `auth.users` rather than `profiles`, and AA-D2's rule against per-athlete drill-down is the standing
-- instinct here.
create or replace function public.admin_recent_signups(p_limit int default 60)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_rows jsonb;
begin
  perform public.admin_guard();

  select coalesce(jsonb_agg(r order by r.created_at desc), '[]'::jsonb)
    into v_rows
    from (
      select p.id,
             p.name,
             p.handle,
             p.created_at,
             -- 'Athlete' is what `handle_new_user()` writes when signup carried no metadata, which is
             -- always: the sign-in screen collects email and password only.
             (p.name is distinct from 'Athlete') as named
        from public.profiles p
       order by p.created_at desc
       limit greatest(1, least(coalesce(p_limit, 60), 200))
    ) r;

  return v_rows;
end;
$$;

comment on function public.admin_recent_signups(int) is
  'The newest accounts, name and handle and when. Includes profiles still named ''Athlete'' — an account that stalled during onboarding is a different state from no account, and both are answers to "did they sign up yet". Gated by admin_guard() (0129/0137).';

-- ⚠ Revoke FROM PUBLIC, never from `authenticated` — Postgres grants EXECUTE to PUBLIC on every new
-- function, and revoking from a role that never held a direct grant removes nothing (0120, 0129, 0130
-- all carry this note). The GUARD, not the grant, is what refuses a signed-in non-admin; the grant only
-- shuts out anon.
--
-- The two gate functions are re-stated here for the standalone case. `create or replace` PRESERVES
-- existing grants, so on a database where 0129 already ran these three lines are a no-op.
revoke execute on function public.admin_recent_signups(int) from public;
grant  execute on function public.admin_recent_signups(int) to authenticated;
revoke execute on function public.admin_guard() from public;
grant  execute on function public.is_app_admin() to authenticated;

-- ── HALF TWO: the push ──────────────────────────────────────────────────────────────────────────────
--
-- Fires when an athlete is first NAMED, files one row per operator with a live device, and cannot
-- raise. See the header for all three of those decisions.
create or replace function public.push_tg_athlete_signup()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Nothing to say until they have a real name, and nothing to say twice.
  if new.name is null or new.name = 'Athlete' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.name is not distinct from new.name then
    return new;
  end if;

  -- 0120 may not be applied on this database. `to_regclass` is null rather than an error for a missing
  -- relation, which is the whole reason it is used here instead of a plain reference.
  if to_regclass('public.push_outbox') is null or to_regclass('public.push_tokens') is null then
    return new;
  end if;

  begin
    insert into public.push_outbox (user_id, kind, event_at, actor_id, title, body, route)
    select a.user_id,
           'athlete_signup',
           -- ⚠ THE SIGNUP TIME, NOT NOW. Pinning it to `created_at` makes 0120's
           -- `push_outbox_event_uk` idempotent across every later rename of the same athlete.
           new.created_at,
           new.id,
           'New athlete',
           new.name || ' just signed up' || coalesce(' (@' || new.handle || ')', ''),
           '/admin'
      from public.app_admins a
      -- Only operators with a live device. `push_enqueue_for` makes the same check for the same
      -- reason: a row nothing can deliver is a row that sits PENDING and eventually FAILED.
     where exists (
             select 1 from public.push_tokens t
              where t.user_id = a.user_id and t.disabled_at is null
           )
       -- Never notify the operator about their own account.
       and a.user_id <> new.id
    on conflict do nothing;
  exception
    when others then
      -- ⚠ DELIBERATE, AND THE MOST IMPORTANT LINE IN THIS FILE. This trigger is in the path of
      -- onboarding. An alert that raises is an alert that stops somebody joining.
      null;
  end;

  return new;
end;
$$;

comment on function public.push_tg_athlete_signup() is
  'Files an operator push when an athlete is first given a real name — the moment a signup becomes identifiable, since profiles are minted as ''Athlete''. Writes push_outbox directly rather than through notification_events_for: a signup is an operator event and belongs in no athlete''s inbox. Swallows every error, because it runs inside onboarding.';

drop trigger if exists push_athlete_signup on public.profiles;
create trigger push_athlete_signup
  after insert or update of name on public.profiles
  for each row execute function public.push_tg_athlete_signup();

commit;

-- ══ SELF-CHECK ══════════════════════════════════════════════════════════════════════════════════════
-- Outside the transaction, so a failure here reports rather than rolling back a migration that worked.
-- Both halves are asserted by presence, because "the migration ran" and "the objects exist" are the two
-- facts that have come apart before on this project.
do $$
begin
  if to_regprocedure('public.admin_recent_signups(int)') is null then
    raise exception '0137 self-check: admin_recent_signups was not created';
  end if;
  if not exists (
    select 1 from pg_trigger where tgname = 'push_athlete_signup' and not tgisinternal
  ) then
    raise exception '0137 self-check: the signup trigger was not created';
  end if;
  if to_regclass('public.push_outbox') is null then
    raise notice '0137: push_outbox is absent — the LIST works, the PUSH will no-op until 0120 is applied.';
  end if;
end;
$$;
