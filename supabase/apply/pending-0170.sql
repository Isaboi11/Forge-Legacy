-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0170: referral attribution (remembering WHO sent an athlete)
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: every statement is guarded (`if not exists` / `create or replace` /
-- `drop policy if exists`), and §3 is read-only.
--
-- This is the ONLY migration awaiting application. 0169 is already in.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- `0145` shipped the entire economic half of referrals in June and it has been sitting unused ever since:
-- `referral_codes`, `referral_credits`, `my_referral_code()`, and `grant_referral_credit()` with MA3-D19's
-- 12-month rolling cap enforced in SQL. What it did NOT ship is the one fact the grant depends on:
--
--   `grant_referral_credit(p_referee, p_code)` takes the code AS AN ARGUMENT, and nothing in the database
--   has ever known which code a given athlete arrived through.
--
-- That is only fine if people pay in the same breath as the invite. They do not. MA3-D20 grants credit on
-- the referee's FIRST SUCCESSFUL PAYMENT — days or weeks after they tapped a squad invite, signed up and
-- started training. Between those two moments the code has to live somewhere, and today it lives nowhere.
--
-- ⚠ WHY A TABLE AND NOT AN AsyncStorage VALUE. `0169` had just finished paying for exactly that answer:
--   onboarding was collecting experience and equipment into two device-local stores that survived neither
--   a reinstall nor a second device, and the one consumer that needed them could read neither. A referral
--   is a worse candidate still — weeks pass between capture and use, and the loss is somebody's money.
--
-- ⚠ THIS MIGRATION GRANTS NOBODY ANYTHING. `grant_referral_credit` stays webhook-only (0145 withheld the
--   `authenticated` grant on purpose — "a client that could call it could credit itself"). §2's self-check
--   ASSERTS that is still true and fails the run if it is not. The credit arrives with the RevenueCat
--   adapter, Launch Checklist §4.2.
--
-- ⚠ ORDER: this is safe to apply BEFORE the client ships. The table simply stays empty. Nothing in the
--   deployed app calls either new function until the code that does is deployed.


-- ═════════════════════════════════════════════════════════════════════════════
-- §0 — PRECONDITION. 0145 must be in, or this is meaningless.
-- ═════════════════════════════════════════════════════════════════════════════

do $$
begin
  if to_regclass('public.referral_codes') is null then
    raise exception '0170 STOP: referral_codes is absent — 0145 has not been applied. Apply that first.';
  end if;
  if to_regprocedure('public.grant_referral_credit(uuid, text)') is null then
    raise exception '0170 STOP: grant_referral_credit is absent — 0145 is only partly in. Investigate before continuing.';
  end if;
  raise notice '0170 precondition OK — 0145 is present.';
end $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- §1 — THE MIGRATION.
-- ═════════════════════════════════════════════════════════════════════════════

-- ── 1. THE ATTRIBUTION ───────────────────────────────────────────────────────────────────────────────

create table if not exists public.referral_attribution (
  referee_id  uuid primary key references auth.users (id) on delete cascade,
  -- The code exactly as `grant_referral_credit` will be handed it. Stored rather than only `referrer_id`
  -- because the grant re-resolves the code itself, and handing the webhook a code it then re-resolves keeps
  -- one resolution path instead of two that can disagree.
  code        text not null check (code = upper(btrim(code)) and char_length(code) between 4 and 16),
  -- Resolved at capture for validation and for reading the table without a join. NOT the grant's input.
  referrer_id uuid not null references auth.users (id) on delete cascade,
  -- MA3-D21 is a claim about WHICH channel works. That claim is testable only if the channel is recorded.
  source      text not null check (source in ('squad', 'challenge', 'code')),
  captured_at timestamptz not null default now(),
  constraint referral_attribution_not_self check (referrer_id <> referee_id)
);

create index if not exists referral_attribution_referrer_idx
  on public.referral_attribution (referrer_id, captured_at desc);

alter table public.referral_attribution enable row level security;

-- An athlete may read their own attribution. There is deliberately NO insert/update/delete policy: writes
-- go through the definer function below, which is what enforces first-wins and the self-check. A client
-- that could insert directly could attribute itself to anyone at any time.
drop policy if exists referral_attribution_own_select on public.referral_attribution;
create policy referral_attribution_own_select on public.referral_attribution
  for select using (referee_id = auth.uid());

-- ── 2. CAPTURE ───────────────────────────────────────────────────────────────────────────────────────

/*
 * Record who sent this athlete. Idempotent, first-wins, and honest about which of those two happened.
 *
 * Returns 'recorded' | 'already' | 'unknown' | 'self'.
 *
 * ⚠ A TEXT VERDICT RATHER THAN A BOOLEAN, ON PURPOSE. The caller has to tell "you were already invited by
 * someone else" from "that code is not real" — different sentences to show a human.
 *
 * ⚠ FIRST WINS IS A RULE, NOT A CONVENIENCE. Last-write-wins lets an athlete about to subscribe paste a
 * different friend's code and move the credit off whoever actually brought them in.
 */
create or replace function public.record_referral_attribution(p_code text, p_source text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_code     text := upper(btrim(coalesce(p_code, '')));
  v_referrer uuid;
begin
  if v_uid is null then
    raise exception 'record_referral_attribution: no authenticated athlete' using errcode = '28000';
  end if;

  if p_source is null or p_source not in ('squad', 'challenge', 'code') then
    raise exception 'record_referral_attribution: source must be squad, challenge or code'
      using errcode = '22023';
  end if;

  if v_code = '' then
    return 'unknown';
  end if;

  -- Cheapest check first: an existing attribution ends the call whatever the code says, because first wins.
  if exists (select 1 from public.referral_attribution where referee_id = v_uid) then
    return 'already';
  end if;

  select athlete_id into v_referrer from public.referral_codes where code = v_code;

  if v_referrer is null then
    return 'unknown';
  end if;

  if v_referrer = v_uid then
    return 'self';
  end if;

  insert into public.referral_attribution (referee_id, code, referrer_id, source)
       values (v_uid, v_code, v_referrer, p_source)
  on conflict (referee_id) do nothing;

  -- Reachable: two devices flushing the same held code at once. Not an error — the outcome is what was
  -- wanted — but it is 'already', not 'recorded', because nothing was written.
  if not found then
    return 'already';
  end if;

  return 'recorded';
end;
$$;

revoke all on function public.record_referral_attribution(text, text) from public;
grant execute on function public.record_referral_attribution(text, text) to authenticated;

/*
 * The caller's own attribution, or nothing.
 *
 * Two readers: the invite surface, so it does not ask a question already answered; and the payment webhook,
 * to find the code to hand `grant_referral_credit` — which is the whole reason the table exists.
 */
create or replace function public.my_referral_attribution()
returns table (code text, source text, captured_at timestamptz)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select a.code, a.source, a.captured_at
    from public.referral_attribution a
   where a.referee_id = auth.uid();
$$;

revoke all on function public.my_referral_attribution() from public;
grant execute on function public.my_referral_attribution() to authenticated;


-- ═════════════════════════════════════════════════════════════════════════════
-- §1b — ⛔ SECURITY FIX. Five functions any signed-in athlete can currently call.
--
-- ⚠ THIS SECTION EXISTS BECAUSE §2 FAILED ON THE FIRST RUN OF THIS FILE, AND IT WAS RIGHT.
--
-- `0145` deliberately withheld the `authenticated` grant on five internal functions —
-- `claim_founder_seat` says so in a comment on the line after its definition. `0147` §1 then ran
-- `grant execute on all functions in schema public to authenticated`, correctly and for a documented
-- reason, and its §3 take-back list did not include these five. A blanket grant silently reversed five
-- targeted revokes two migrations later, and nothing failed.
--
-- ⚠ THE SHARP ONE: `claim_founder_seat(p_athlete uuid)` is SECURITY DEFINER, takes the athlete as an
--   ARGUMENT and never reads `auth.uid()`. Any signed-in athlete can award themselves — or anyone else —
--   a lifetime Founder entitlement (the $149 SKU) for nothing, and can burn all 100 seats doing it.
--   Invisible today only because `default_tier = 'PREMIUM'` makes everyone Premium anyway. The
--   `athlete_entitlement` row it writes SURVIVES Phase F, so it pays out exactly when money starts moving.
--
-- ⚠ SAFE TO REVOKE, CHECKED THE WAY 0150 SAYS TO. That migration exists because revoking `evaluate_honors`
--   broke Finish Workout for every athlete — its callers were `security invoker`. Checked here:
--   zero `src/` RPC call sites for all five, and every SQL caller (`my_entitlement`, `my_tier`,
--   `athlete_caps`, `consume_holt_allowance`, `programs_cap_guard`, `week_templates_cap_guard`) is
--   SECURITY DEFINER, so the permission check runs against the owner and none can notice the revoke.
--   `claim_founder_seat` and `grant_referral_credit` have no callers at all — the purchase webhook that
--   will call them does not exist yet (§4.2).
-- ═════════════════════════════════════════════════════════════════════════════

do $$
declare
  f text;
  fns text[] := array[
    'public.claim_founder_seat(uuid)',
    'public.grant_referral_credit(uuid, text)',
    'public.athlete_tier(uuid)',
    'public.athlete_caps(uuid)',
    'public.athlete_live_counts(uuid)'
  ];
begin
  foreach f in array fns loop
    begin
      execute format('revoke execute on function %s from anon, authenticated', f);
      raise notice '0170 revoked from client roles: %', f;
    exception when undefined_function then
      raise warning '0170: no such function, skipped — %', f;
    end;
  end loop;
end $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- §2 — SELF-CHECK. Raises if anything did not land.
-- ═════════════════════════════════════════════════════════════════════════════

do $$
declare
  v_policies int;
  v_fn       text;
  missing    text := '';
begin
  if to_regclass('public.referral_attribution') is null then missing := missing || ' referral_attribution'; end if;
  if to_regprocedure('public.record_referral_attribution(text, text)') is null then missing := missing || ' record_referral_attribution'; end if;
  if to_regprocedure('public.my_referral_attribution()') is null then missing := missing || ' my_referral_attribution'; end if;

  if missing <> '' then
    raise exception '0170 DID NOT FULLY APPLY. Missing:%', missing;
  end if;

  if not exists (select 1 from pg_class where relname = 'referral_attribution' and relrowsecurity) then
    raise exception '0170 self-check: RLS is not enabled on referral_attribution';
  end if;

  select count(*) into v_policies
    from pg_policies where schemaname = 'public' and tablename = 'referral_attribution';
  if v_policies <> 1 then
    raise exception '0170 self-check: referral_attribution should carry exactly one policy (own select), found %', v_policies;
  end if;

  -- ⚠ THE ASSERTION THAT FOUND THE HOLE IN §1b. Kept broad on purpose: the failure was never one function,
  -- it was a blanket grant reaching functions whose targeted revoke nobody re-checked. Another blanket
  -- grant will do it again, and this is what will say so.
  for v_fn in
    select unnest(array[
      'claim_founder_seat', 'grant_referral_credit', 'athlete_tier', 'athlete_caps', 'athlete_live_counts'
    ])
  loop
    if exists (
      select 1
        from information_schema.role_routine_grants
       where routine_schema = 'public'
         and routine_name = v_fn
         and grantee in ('authenticated', 'anon', 'PUBLIC')
    ) then
      raise exception '0170 self-check: %() is still executable by a client role — the §1b revoke did not land', v_fn;
    end if;
  end loop;

  raise notice '0170 OK — table, RLS, capture and read are present, and all five internal functions are server-side only.';
end $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- §3 — WHAT IS NOW THERE. Read-only.
-- ═════════════════════════════════════════════════════════════════════════════

select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_name = 'referral_attribution'
order by ordinal_position;

-- ⚠ BOTH SHOULD BE 0 RIGHT NOW. The client that writes attributions is not deployed yet, and codes are
--   created lazily on first share. A non-zero attribution count before the deploy would mean something is
--   writing this table that should not be.
select
  (select count(*) from public.referral_attribution) as attributions,
  (select count(*) from public.referral_codes)       as codes_issued;

-- ⛔ DO NOT ADD `select public.my_referral_code();` HERE. It was in this file once and it took the whole
--    migration down with it — the editor runs the script in one transaction, so a failure on the last
--    statement rolls back the table, the functions and the security fix above.
--
--    0145's own header says why, in bold, and it is right: **the SQL editor has no `auth.uid()`.** It runs
--    as `postgres` with no auth context, so every `my_*` function raises 28000 "no authenticated athlete"
--    when pasted in. That is the guard working, not the migration failing. The `my_*` wrappers are verified
--    from the app, with a real JWT — never from here.

-- ⚠ THE SECURITY FIX, PROVEN RATHER THAN ASSUMED. This should return ZERO ROWS. Any row here is a function
--   a signed-in athlete can still call. (§2 already raises on this — the select is so you can SEE it.)
select
  routine_name,
  grantee
from information_schema.role_routine_grants
where routine_schema = 'public'
  and routine_name in ('claim_founder_seat', 'grant_referral_credit', 'athlete_tier', 'athlete_caps', 'athlete_live_counts')
  and grantee in ('authenticated', 'anon', 'PUBLIC')
order by routine_name, grantee;

-- ⚠ WHO ALREADY HELPED THEMSELVES. Founder seats can only have been claimed by the hole in §1b — the
--   purchase webhook that is supposed to call `claim_founder_seat` does not exist yet, so ANY row here was
--   written by a client and is a free lifetime Premium entitlement somebody currently holds.
--   Expected: zero rows. If there are any, they need revoking by hand before Phase F.
select
  athlete_id,
  tier,
  premium_kind,
  founder_seat,
  updated_at
from public.athlete_entitlement
where founder_seat is not null
   or premium_kind = 'FOUNDER'
order by founder_seat;
