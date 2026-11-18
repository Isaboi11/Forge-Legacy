-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0274: which model each AI function runs, read at runtime (AI Road to 10 Sprint 3b, PL-7)
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: every statement is guarded (create … if not exists, constraints only when absent,
-- create or replace, revoke/grant are idempotent), §2 only raises, §3 is read-only.
--
-- Apply order for Sprint 3b: 0274 → 0275 → 0276. Nothing here depends on 0275/0276.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- Until now each AI function's model was a constant in its code: switching or canarying one meant a redeploy. After
-- this, one SQL row switches a function's model or effort, or gives a new model to the operators (or a percentage
-- of athletes) first. The functions read it with the service role (60 s cache) and run their own in-code default
-- whenever there is no row or the read fails — a config problem can never stop a function answering.
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  creates coach_ai_model_config (RLS on, no policy; anon/authenticated hold nothing; service_role SELECT) and
--     coach_ai_model_pick(p_fn, p_uid) (SECURITY INVOKER; EXECUTE for service_role only).
-- §2  RAISES if the table, its RLS, a CHECK, the function, or a grant did not land — or if anon / authenticated can
--     read the table or call the function.
-- §3  one row: what landed and who can reach it.
--
-- ⚠ NO ROWS. Applying this changes nothing an athlete sees. The model switches are separate files the PO pastes
--   AFTER the functions that read this are deployed: supabase/apply/switch-models-step1-canary.sql (operators
--   only), switch-models-step2-everyone.sql, switch-models-revert.sql.
-- ⚠ APPLYING IS NOT WORKING: the functions that read it (coach-ask, coach-interpret, coach-author, coach-kitchen,
--   meal-photo-read, recipe-photo-read, program-photo-read) must be deployed from ai/s3b for a row to matter. A
--   function deployed before this is applied reads an error and runs its default.
--
-- ══ PREDICTED §3 (written 2026-11-18 from the live database, read-only: no table or function by these names
--    exists yet; app_admins has 1 row; service_role can read app_admins and bypasses RLS) ══
--   table_exists = true · rls_on = true · policies = 0 · config_rows = 0 · checks = 7 ·
--   table_grants_client = (none) · table_grants_service = SELECT · pick_callable_by = service_role ·
--   pick_is_definer = false · pick_for_unconfigured = 0
--   Why: a new empty table, closed to every client role; the function is the service role's only, and with no row
--   it answers zero rows (= the default).
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
-- §1 — THE STATEMENTS (verbatim from supabase/migrations/0274_ai_model_config.sql)
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
-- 0274 — Which model each AI function runs, read at runtime: coach_ai_model_config + coach_ai_model_pick().
--
-- AI Road to 10 Sprint 3b, PL-7 (Docs/AI-Road-To-10-Plan-v1.0.md §2 "Model ID + rates move into config (read at
-- runtime), so one change can canary one function" — P-G6). Contract: Docs/AI-Sprint-3b-Build-Notes.md §1.2.
--
-- ══ WHAT IT ADDS ══
--
--   coach_ai_model_config   one row per AI function (its deployed slug, e.g. 'coach-author', or 'coach-ask:summary'
--                           for coach-ask's chat summaries): `model`, `effort`, and an optional canary —
--                           `canary_model` (+ `canary_effort`) for `canary` = 'operators' (the app_admins) or a
--                           percentage of athletes ('10%'). RLS on, NO policy, NO grant to anon or authenticated: only
--                           the service role reads it, and only `postgres` (the SQL editor) writes it.
--   coach_ai_model_pick()   (p_fn, p_uid) → the model + effort this athlete gets from that function, and whether it is
--                           the canary. Zero rows when the function has no config row. SECURITY INVOKER, EXECUTE for
--                           service_role only. The functions call it with the service key (src/domain/ai/
--                           model-config.ts), keep the answer 60 s, and run their IN-CODE DEFAULT on zero rows, an
--                           error, a slow read (1.5 s) or a model / effort the code does not know.
--
-- ⚠ NO ROWS ARE SEEDED, ON PURPOSE. No row = the function runs the default written in its own code — exactly what
--   runs today. A seeded row would silently override a later change to that default. A switch is a separate,
--   PO-pasted file (supabase/apply/switch-models-*.sql): step 1 canary to operators, step 2 everyone, and a revert
--   that deletes the row (= back to the code's default).
--
-- ⚠ The CHECK lists are the models and efforts src/domain/ai/model-request.ts can send without a 400
--   (`KNOWN_MODELS`, `EFFORTS`); src/domain/ai/__tests__/model-request.test.mjs fails when the two lists disagree.
--   A model outside them cannot be written, so a typo can never reach a function (and the function would ignore it
--   anyway — `default_invalid`).
--
-- ⚠ Who is in a canary: 'operators' = a row in app_admins for p_uid (the table is_app_admin() reads). 'N%' = a
--   stable hash of the athlete and the function: the same athlete stays in (or out) on every call, and two functions
--   canaried at 10% do not pick the same 10%. No athlete id (p_uid null) is never in a canary.
--
-- ⚠ Applying this changes nothing an athlete sees: with no rows, every function keeps its own default. The
--   functions that read it must also be DEPLOYED (coach-ask, coach-interpret, coach-author, coach-kitchen,
--   meal-photo-read, recipe-photo-read, program-photo-read); a function deployed before this is applied reads an
--   error and runs its default — never a dead function.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 1. THE TABLE
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.coach_ai_model_config (
  fn            text primary key,
  model         text not null,
  effort        text,
  canary_model  text,
  canary_effort text,
  canary        text,
  note          text,
  updated_at    timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'coach_ai_model_config_fn_check') then
    alter table public.coach_ai_model_config
      add constraint coach_ai_model_config_fn_check check (fn ~ '^[a-z][a-z0-9-]{1,40}(:[a-z][a-z0-9-]{1,20})?$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'coach_ai_model_config_model_check') then
    alter table public.coach_ai_model_config
      add constraint coach_ai_model_config_model_check
      check (model in ('claude-sonnet-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-opus-5-5', 'claude-opus-5', 'claude-haiku-4-5'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'coach_ai_model_config_effort_check') then
    alter table public.coach_ai_model_config
      add constraint coach_ai_model_config_effort_check
      check (effort is null or effort in ('low', 'medium', 'high', 'xhigh', 'max'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'coach_ai_model_config_canary_model_check') then
    alter table public.coach_ai_model_config
      add constraint coach_ai_model_config_canary_model_check
      check (canary_model is null or canary_model in ('claude-sonnet-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-opus-5-5', 'claude-opus-5', 'claude-haiku-4-5'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'coach_ai_model_config_canary_effort_check') then
    alter table public.coach_ai_model_config
      add constraint coach_ai_model_config_canary_effort_check
      check (canary_effort is null or canary_effort in ('low', 'medium', 'high', 'xhigh', 'max'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'coach_ai_model_config_canary_check') then
    alter table public.coach_ai_model_config
      add constraint coach_ai_model_config_canary_check
      check (canary is null or canary = 'operators' or canary ~ '^([1-9]?[0-9]|100)%$');
  end if;
  -- A canary is both halves or neither: who gets it AND what they get.
  if not exists (select 1 from pg_constraint where conname = 'coach_ai_model_config_canary_pair_check') then
    alter table public.coach_ai_model_config
      add constraint coach_ai_model_config_canary_pair_check
      check ((canary is null) = (canary_model is null) and (canary_effort is null or canary_model is not null));
  end if;
end $$;

alter table public.coach_ai_model_config enable row level security;

-- Supabase's default privileges grant every new table to anon and authenticated DIRECTLY. Close both; the service
-- role keeps SELECT (it bypasses RLS, and the functions read with it). No one but postgres writes.
revoke all on table public.coach_ai_model_config from public, anon, authenticated, service_role;
grant select on table public.coach_ai_model_config to service_role;


-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 2. THE READ — coach_ai_model_pick(p_fn, p_uid)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.coach_ai_model_pick(p_fn text, p_uid uuid)
returns table (model text, effort text, canary boolean)
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_row  public.coach_ai_model_config%rowtype;
  v_in   boolean := false;
  v_pct  integer;
begin
  select c.* into v_row from public.coach_ai_model_config c where c.fn = p_fn;
  if not found then
    return;  -- zero rows: the function runs its in-code default
  end if;

  if v_row.canary_model is not null and v_row.canary is not null and p_uid is not null then
    if v_row.canary = 'operators' then
      v_in := exists (select 1 from public.app_admins a where a.user_id = p_uid);
    else
      v_pct := rtrim(v_row.canary, '%')::integer;
      -- hashtext is int4 and can be negative; bring it into 0..99 without abs() (abs(min int) overflows).
      v_in := ((hashtext(p_uid::text || ':' || p_fn)::bigint % 100) + 100) % 100 < v_pct;
    end if;
  end if;

  return query
    select case when v_in then v_row.canary_model else v_row.model end,
           case when v_in then coalesce(v_row.canary_effort, v_row.effort) else v_row.effort end,
           v_in;
end;
$$;

-- Supabase grants EXECUTE on every new function to anon AND authenticated directly: close both, and PUBLIC.
revoke all on function public.coach_ai_model_pick(text, uuid) from public, anon, authenticated;
grant execute on function public.coach_ai_model_pick(text, uuid) to service_role;


-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
-- §2 — THE ASSERTION: raise if anything did not land, or if a client role can reach it
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════

do $$
declare
  v_checks int;
begin
  if to_regclass('public.coach_ai_model_config') is null then
    raise exception '0274: coach_ai_model_config is missing';
  end if;
  if not (select c.relrowsecurity from pg_class c where c.oid = 'public.coach_ai_model_config'::regclass) then
    raise exception '0274: RLS is OFF on coach_ai_model_config';
  end if;
  if exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = 'coach_ai_model_config') then
    raise exception '0274: coach_ai_model_config has a policy (it must have none)';
  end if;
  select count(*) into v_checks from pg_constraint k
   where k.conrelid = 'public.coach_ai_model_config'::regclass and k.contype = 'c'
     and k.conname in ('coach_ai_model_config_fn_check', 'coach_ai_model_config_model_check', 'coach_ai_model_config_effort_check',
                       'coach_ai_model_config_canary_model_check', 'coach_ai_model_config_canary_effort_check',
                       'coach_ai_model_config_canary_check', 'coach_ai_model_config_canary_pair_check');
  if v_checks <> 7 then
    raise exception '0274: % of 7 CHECK constraints on coach_ai_model_config', v_checks;
  end if;
  if has_table_privilege('anon', 'public.coach_ai_model_config', 'select')
     or has_table_privilege('authenticated', 'public.coach_ai_model_config', 'select')
     or has_table_privilege('anon', 'public.coach_ai_model_config', 'insert')
     or has_table_privilege('authenticated', 'public.coach_ai_model_config', 'insert')
     or has_table_privilege('authenticated', 'public.coach_ai_model_config', 'update') then
    raise exception '0274: a client role can read or write coach_ai_model_config';
  end if;
  if not has_table_privilege('service_role', 'public.coach_ai_model_config', 'select') then
    raise exception '0274: service_role cannot read coach_ai_model_config (every function would run its default)';
  end if;
  if to_regprocedure('public.coach_ai_model_pick(text, uuid)') is null then
    raise exception '0274: coach_ai_model_pick(text, uuid) is missing';
  end if;
  if has_function_privilege('anon', 'public.coach_ai_model_pick(text, uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.coach_ai_model_pick(text, uuid)', 'execute') then
    raise exception '0274: a client role can call coach_ai_model_pick';
  end if;
  if not has_function_privilege('service_role', 'public.coach_ai_model_pick(text, uuid)', 'execute') then
    raise exception '0274: service_role cannot call coach_ai_model_pick';
  end if;
  if (select p.prosecdef from pg_proc p where p.oid = 'public.coach_ai_model_pick(text, uuid)'::regprocedure) then
    raise exception '0274: coach_ai_model_pick must be SECURITY INVOKER';
  end if;
end $$;


-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
-- §3 — THE REPORT (read-only)
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════

select
  to_regclass('public.coach_ai_model_config') is not null                                            as table_exists,
  (select c.relrowsecurity from pg_class c where c.oid = 'public.coach_ai_model_config'::regclass)  as rls_on,
  (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = 'coach_ai_model_config') as policies,
  (select count(*) from public.coach_ai_model_config)                                                as config_rows,
  (select count(*) from pg_constraint k where k.conrelid = 'public.coach_ai_model_config'::regclass and k.contype = 'c') as checks,
  coalesce((select string_agg(distinct g.grantee || ':' || g.privilege_type, ', ')
              from information_schema.role_table_grants g
             where g.table_schema = 'public' and g.table_name = 'coach_ai_model_config'
               and g.grantee in ('PUBLIC', 'anon', 'authenticated')), '(none)')                       as table_grants_client,
  coalesce((select string_agg(g.privilege_type, ', ' order by g.privilege_type)
              from information_schema.role_table_grants g
             where g.table_schema = 'public' and g.table_name = 'coach_ai_model_config'
               and g.grantee = 'service_role'), '(none)')                                             as table_grants_service,
  coalesce((select string_agg(r.rolname, ', ' order by r.rolname) from pg_roles r
             where r.rolname in ('anon', 'authenticated', 'service_role')
               and has_function_privilege(r.rolname, 'public.coach_ai_model_pick(text, uuid)', 'execute')), '(none)') as pick_callable_by,
  (select p.prosecdef from pg_proc p where p.oid = 'public.coach_ai_model_pick(text, uuid)'::regprocedure) as pick_is_definer,
  (select count(*) from public.coach_ai_model_pick('no-such-function', null))                        as pick_for_unconfigured;
