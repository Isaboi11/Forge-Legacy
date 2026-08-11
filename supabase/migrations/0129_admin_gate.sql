-- Forge Legacy — 0129: who is allowed to read the whole population
--
-- ══ WHAT THIS CLOSES ══
--
-- PO: *"Is there a way that I can make a dashboard to see what everyone is using and how often?"*
--
-- 128 migrations of fully-timestamped, user-scoped state, and no way for the operator of the service
-- to read any of it in aggregate. There is no admin concept anywhere in this schema: no `is_admin`,
-- no roles table, no staff flag. The only `role` columns are `squad_members.role` (owner|member) and
-- `chapter_photos.role` (a photo tag), both squad-scoped and neither an authorization primitive.
--
-- There is also, deliberately, no service_role key in the repository — `.env.example` says "NEVER put
-- the service_role key here" and means it. So the privileged read path cannot be a secret held by a
-- client; it has to be a SECURITY DEFINER function gated on a row in this table. That is what 0129
-- creates, and 0130 consumes.
--
-- Governed by `Docs/Admin-Analytics-Architecture-v1.0.md`. The Firewall argument lives there in full:
-- CS-D22.4 and SQ-D13 bind ATHLETE-FACING surfaces, which they enumerate by name (S-1 cards, the S-2
-- member list, the Limited Athlete Profile, the Friends Feed, Community). `/admin` is not one of them,
-- renders no athlete's performance to another athlete, and its requester is the operator rather than a
-- peer inside a roster. AA-D2 keeps that true by forbidding per-athlete drill-down outright.
--
-- ══ WHY THE TABLE HAS NO POLICIES ══
--
-- `0001_spine.sql` is `create policy profiles_read on profiles for select using (true)` — the profile
-- table is world-readable, and `0114_athlete_search.sql`'s header already records that any holder of
-- the anon key can page the whole of it. The ONE table that must never become joinable to that is the
-- list of who holds the keys. RLS enabled with zero policies is deny-by-default for anon and
-- authenticated alike: not readable, not countable, not enumerable. See AA-D6 — a later migration must
-- not "fix" this by adding an owner policy.
--
-- ══ WHY `is_app_admin()` TAKES NO ARGUMENT ══
--
-- 0120's grants block is explicit about the failure mode: `notification_events_for(uuid)` is SECURITY
-- DEFINER and takes any user id, so left callable it would hand any athlete anyone else's
-- notifications — "that safety came from the missing parameter, not from RLS." An `is_app_admin(uuid)`
-- overload would have exactly one legitimate caller and one obvious footgun. It does not exist.
--
-- Idempotent. Depends on 0001 (profiles). RUN AFTER 0128.

create table if not exists public.app_admins (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  -- Free text, for the human reading this table in two years wondering who granted what and why.
  note       text,
  granted_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

-- ⚠ NO POLICIES. NOT AN OMISSION. See the header. The only reader is the definer function below
-- (which runs as the table owner and is not subject to RLS); the only writer is the SQL editor.

comment on table public.app_admins is
  'AA-D5/AA-D6. The operator allowlist for the /admin dashboard. RLS is ENABLED WITH ZERO POLICIES on purpose — deny-by-default for anon and authenticated, so the roster is not enumerable through the world-readable profiles table. Read only by public.is_app_admin(); written only by hand in the SQL editor (AA-D7 — a UI for granting admin is a UI for escalating privilege).';

-- ── The check ────────────────────────────────────────────────────────────────
create or replace function public.is_app_admin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.app_admins a where a.user_id = auth.uid());
$$;

comment on function public.is_app_admin() is
  'AA-D5. True when the CALLER is an operator. Deliberately zero-argument: a definer function taking an arbitrary uuid is the exact footgun 0120 documents. Safe to grant to authenticated — it reveals only whether YOU are an admin, never who else is.';

-- ── The guard every admin RPC calls as its first statement ───────────────────
--
-- One definition rather than seven copies, so "did a function forget the check" is a one-line grep
-- rather than a per-function reading. It raises rather than returning empty: an empty result set is
-- indistinguishable from "there is no data yet", which would hide a broken guard for months.
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

comment on function public.admin_guard() is
  'AA-D5. Raises 42501 unless the caller is in app_admins. MUST be the first statement of every admin_* function body. Never granted to any role — it is called from inside definer functions, not from a client.';

-- ── Grants ───────────────────────────────────────────────────────────────────
--
-- ⚠ Revoke FROM PUBLIC, never from `authenticated` — Postgres grants EXECUTE to PUBLIC on every new
-- function, and revoking from a role that never held a direct grant removes nothing. 0120 learned this
-- the hard way and its header says so.
--
-- `admin_guard` is never granted to anybody: it is called from inside definer bodies, and a client
-- that could call it would learn nothing anyway.
revoke execute on function public.admin_guard() from public;
grant  execute on function public.is_app_admin() to authenticated;

-- ── Granting yourself admin (there is no CLI — this IS the mechanism) ────────
--
-- Supabase Dashboard → SQL Editor. It runs as `postgres`, which bypasses RLS.
--
--   select id, email from auth.users where email = '<your email>';
--
--   insert into public.app_admins (user_id, note)
--   values ('<paste-uuid>'::uuid, 'creator — bootstrap 2026-08-11')
--   on conflict (user_id) do nothing;
--
--   select a.user_id, p.handle, a.note, a.granted_at
--     from public.app_admins a join public.profiles p on p.id = a.user_id;
--
-- Revoking is `delete from public.app_admins where user_id = '...'`. If the last row is deleted the
-- SQL editor is the only way back — acceptable, because the SQL editor belongs to the same person,
-- but worth knowing before somebody "cleans up" this table.
