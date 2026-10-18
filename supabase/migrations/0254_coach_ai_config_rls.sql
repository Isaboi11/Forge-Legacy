-- 0254 — lock public.coach_ai_config (Supabase lint rls_disabled_in_public)
--
-- `coach_ai_config` was created in 0144 with the allowance, the per-action weights, the token rates and
-- `metering_only`, and 0144 never enabled row level security on it. The same migration DID enable RLS on
-- `coach_ai_period` and `coach_ai_spend`. On the live project this was the one public table of 128 with
-- RLS still off, so the Data API could read and write the row that decides the credit allowance, what
-- each action costs, and whether the cap actually refuses anyone.
--
-- ══ WHAT THIS DOES ══
--
-- Enables RLS. Adds no policy. That is deny-by-default for `anon` and `authenticated`, the same posture
-- as `app_admins` (0129), `metrics_daily` (0133) and `nutrition_preview` (0206) — not an omission.
--
-- It does NOT `force row level security`. The readers run as the table owner (see below), and 0206's own
-- note is that a security-definer function "runs as the table owner and is not subject to RLS". Forcing
-- RLS would put the owner under the zero-policy deny and hide the row from those functions.
--
-- ══ WHO READS IT, AND WHY THEY KEEP WORKING ══
--
-- Every runtime read is inside a `security definer` function with `search_path` pinned. None of them is
-- `security invoker`. No view selects the table. Nothing in `src/` or `supabase/functions/` calls
-- `.from('coach_ai_config')` — the Edge Functions call the RPCs with the athlete's JWT, and the client
-- calls the same RPCs.
--
--   · `coach_ai_spend_credits`  (0144, body replaced by 0203 — still security definer)
--   · `coach_ai_record_usage`   (0144)
--   · `coach_ai_balance`        (0144)          — client: src/data/coach-interpret-live.ts
--   · `coach_ai_quote`          (0221)          — client: src/data/form-check-live.ts; coach-form-check
--   · `admin_ai_usage`          (0238)          — client: src/data/crm-live.ts; gated by admin_guard()
--
-- `coach_ai_cache_health` does not read this table. The `update public.coach_ai_config` statements in
-- 0174, 0218, 0220, 0222, 0223 and 0232 are migration SQL, already applied, run as the table owner.
--
-- The guard below refuses to enable RLS if the live database has grown a non-definer function, a view,
-- or a policy this file did not see. A tidy green while the lock would break a reader is the failure
-- this exists to prevent.
--
-- Idempotent. Safe to run twice: enabling RLS on a table that already has it is a no-op, and the second
-- run still finds zero policies. Does not insert, update or delete the config row. `metering_only` is
-- untouched — turning the cap on is still a separate, deliberate `update` (see the submission checklist).
--
-- Depends on 0144. RUN AFTER 0253.

begin;

do $$
declare
  v_bad text;
begin
  if to_regclass('public.coach_ai_config') is null then
    raise exception '0254 refused: public.coach_ai_config does not exist. Apply 0144 first. No change was made.';
  end if;

  -- A policy already on the table would start being enforced the moment RLS is enabled. 0144 created
  -- none, and no later migration adds one. Stop rather than activate a policy this file has not read.
  if exists (
    select 1 from pg_policies p
     where p.schemaname = 'public' and p.tablename = 'coach_ai_config'
  ) then
    raise exception '0254 refused: public.coach_ai_config already has a policy. Read it before enabling RLS. No change was made.';
  end if;

  select string_agg(format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)), ', ')
    into v_bad
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prokind = 'f'
     and not p.prosecdef
     and pg_get_functiondef(p.oid) ilike '%coach_ai_config%';

  if v_bad is not null then
    raise exception '0254 refused: these functions read coach_ai_config and are not SECURITY DEFINER: %. Enabling RLS would hide the row from them. No change was made.', v_bad;
  end if;

  select string_agg(format('%I.%I', n.nspname, c.relname), ', ')
    into v_bad
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind in ('v', 'm')
     and pg_get_viewdef(c.oid) ilike '%coach_ai_config%';

  if v_bad is not null then
    raise exception '0254 refused: these views read coach_ai_config: %. A security-invoker view would return nothing once RLS is on. No change was made.', v_bad;
  end if;
end $$;

alter table public.coach_ai_config enable row level security;

-- ⚠ NO POLICY. NOT AN OMISSION — see the header. The only readers are the security-definer functions
-- named above. The only writer is the SQL editor (the table owner bypasses RLS; service_role does too).
-- A later migration must not "fix" this by adding an anon or authenticated policy: that re-opens the
-- allowance, the prices and metering_only to the Data API.

comment on table public.coach_ai_config is
  'Coach AI allowance and pricing. One row. Edited by hand in the SQL editor; never written by the app. RLS enabled with zero policies (0254), same posture as app_admins and metrics_daily: anon and authenticated cannot read or write it. Read only inside security-definer functions (coach_ai_spend_credits, coach_ai_record_usage, coach_ai_balance, coach_ai_quote, admin_ai_usage), which run as the table owner and are not subject to RLS. Do not add a permissive policy.';

do $$
begin
  if not exists (
    select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname = 'coach_ai_config'
       and c.relrowsecurity
       and not c.relforcerowsecurity
  ) then
    raise exception '0254 DID NOT APPLY. public.coach_ai_config does not have row level security enabled (unforced).';
  end if;

  if exists (
    select 1 from pg_policies p
     where p.schemaname = 'public' and p.tablename = 'coach_ai_config'
  ) then
    raise exception '0254 DID NOT APPLY cleanly. A policy exists on public.coach_ai_config; this lock is zero policies.';
  end if;
end $$;

commit;
