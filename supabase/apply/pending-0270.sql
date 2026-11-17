-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0270: keeping a Holt program charges and saves it in ONE step (keep_holt_program)
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: create or replace + revoke/grant, and §3 is read-only.
-- The editor shows only the LAST result — that is §3.
--
-- Order: after 0268 (money) and 0269 (observe), as Docs/AI-Sprint-1-Build-Notes.md §0 says — but it touches none of
-- their objects, so it is safe on its own too. Independent of every other pending bundle.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- AI Road to 10, Sprint 1 — the Sprint 0 leftover "Holt programs are counted on the device only"
-- (Forge-Legacy-Master-Status.md, Sprint 0 entry). Since Sprint 0 (935ca5f1, AI audit B-D1) a Holt block of four
-- weeks or more is paid for when it is KEPT (Start · Adjust it / Save to the Builder · the wizard's Final touches):
-- the phone calls consume_holt_allowance('program') and then writes the program in a SEPARATE call. Nothing on the
-- server ties the spend to the program — a failed second call, or a Builder that was cancelled, leaves a spend with
-- no program; a client that skips the spend could write one anyway.
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  creates keep_holt_program(p_structure jsonb): consume_holt_allowance('program') (CALLED, never copied) and, only
--     when it allowed, the programs row — one transaction, so a failed insert rolls the spend back too. SECURITY
--     INVOKER: the insert is the athlete's own, under programs' RLS and programs_cap_guard_trg, like createProgram.
--     A block under four weeks is refused (MA4-D5). EXECUTE: authenticated only.
-- §2  RAISES if the function is missing, is SECURITY DEFINER, has the wrong shape, is callable by anon or PUBLIC, is
--     not callable by authenticated — or if the OLD path old phones use (consume_holt_allowance) is not callable.
-- §3  one row: what landed, who can call it, and that the old path and the programs cap trigger are still there.
--
-- ⚠ Nothing changes for any installed app until the client that calls it ships (ai/s1-client): every phone keeps
--   spending and then writing exactly as today. The new client falls back to that same two-step while this file is
--   not pasted, so client and SQL can ship in either order. Pasting it FIRST is still the better order: the atomic
--   keep is live the moment the OTA lands.
-- ⚠ No table, column or row changes. Nothing to back up.
-- ⚠ After the OTA: on a Free test account with no Holt program used, build a 4-week block with Holt and tap Start —
--   the program opens, and athlete_usage.holt_programs_used went 0 → 1 in the same moment. That is "someone saw it".
--
-- ══ PREDICTED §3 (2026-11-17) ══
--   keep_present = true · security = invoker · args = p_structure jsonb ·
--   returns = TABLE(allowed boolean, used integer, allowance integer, program_id uuid) ·
--   search_path = {"search_path=public, pg_temp"} · anon_execute = false · authenticated_execute = true ·
--   public_execute = false · old_path_still_callable = true · programs_cap_guard_on = true
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §1 — THE STATEMENTS (verbatim from supabase/migrations/0270_keep_holt_program.sql)
-- ───────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.keep_holt_program(p_structure jsonb)
returns table(allowed boolean, used integer, allowance integer, program_id uuid)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_name  text;
  v_spend record;
  v_id    uuid;
begin
  if v_uid is null then
    raise exception 'keep_holt_program: no authenticated athlete' using errcode = '28000';
  end if;

  if p_structure is null or jsonb_typeof(p_structure) <> 'object' then
    raise exception 'keep_holt_program: the structure must be a program object' using errcode = '22023';
  end if;

  v_name := p_structure ->> 'name';
  if v_name is null then
    raise exception 'keep_holt_program: the program has no name' using errcode = '22023';
  end if;

  -- MA4-D5: under four weeks is a training week. It never spends the Holt program.
  if not public.program_earns_credit(p_structure) then
    raise exception 'keep_holt_program: a block under four weeks is a training week, not the Holt program (MA4-D5)'
      using errcode = '22023';
  end if;

  -- The existing spend, called — never retyped. It locks the athlete's usage row, so two devices keeping at once
  -- spend at most what the cap allows.
  select s.allowed, s.used, s.allowance
    into v_spend
    from public.consume_holt_allowance('program') s;

  if not coalesce(v_spend.allowed, false) then
    return query select false, coalesce(v_spend.used, 0), v_spend.allowance, null::uuid;
    return;
  end if;

  -- The kept program, as createProgram writes it. A failure here rolls the spend above back with it.
  insert into public.programs (athlete_id, name, structure)
  values (v_uid, v_name, p_structure)
  returning id into v_id;

  return query select true, v_spend.used, v_spend.allowance, v_id;
end;
$$;

comment on function public.keep_holt_program(jsonb) is
  'Keep a Holt block of 4+ weeks (0270, AI Road to 10 Sprint 1): spends consume_holt_allowance(''program'') and writes the programs row in one transaction. allowed=false = the allowance is used and nothing was written. SECURITY INVOKER: the insert is the athlete''s own, under RLS and programs_cap_guard.';

revoke all on function public.keep_holt_program(jsonb) from public, anon;
grant execute on function public.keep_holt_program(jsonb) to authenticated;


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §2 — THE ASSERTION (raises if §1 did not land, or landed wrong)
-- ───────────────────────────────────────────────────────────────────────────────────────────────

do $$
declare
  v_fn regprocedure := to_regprocedure('public.keep_holt_program(jsonb)');
  v_definer boolean;
  v_result text;
begin
  if v_fn is null then
    raise exception '0270 DID NOT APPLY: public.keep_holt_program(jsonb) is missing';
  end if;

  select p.prosecdef, pg_get_function_result(p.oid) into v_definer, v_result from pg_proc p where p.oid = v_fn;
  if v_definer then
    raise exception '0270: keep_holt_program is SECURITY DEFINER — it must run as the athlete (INVOKER)';
  end if;
  if v_result is distinct from 'TABLE(allowed boolean, used integer, allowance integer, program_id uuid)' then
    raise exception '0270: keep_holt_program returns % — expected TABLE(allowed boolean, used integer, allowance integer, program_id uuid)', v_result;
  end if;

  if has_function_privilege('anon', v_fn, 'EXECUTE') then
    raise exception '0270: anon can still EXECUTE keep_holt_program';
  end if;
  if exists (select 1 from pg_proc p, aclexplode(p.proacl) a where p.oid = v_fn and a.grantee = 0 and a.privilege_type = 'EXECUTE') then
    raise exception '0270: PUBLIC can still EXECUTE keep_holt_program';
  end if;
  if not has_function_privilege('authenticated', v_fn, 'EXECUTE') then
    raise exception '0270: authenticated cannot EXECUTE keep_holt_program';
  end if;

  -- The path every installed phone still uses. Nothing here touches it; if it is gone, stop.
  if to_regprocedure('public.consume_holt_allowance(text)') is null
     or not has_function_privilege('authenticated', 'public.consume_holt_allowance(text)', 'EXECUTE') then
    raise exception '0270: consume_holt_allowance(text) is missing or not callable — old phones would break';
  end if;
end $$;


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §3 — THE REPORT (read-only)
-- ───────────────────────────────────────────────────────────────────────────────────────────────

select
  true                                                                                    as keep_present,
  case when p.prosecdef then 'definer' else 'invoker' end                                 as security,
  pg_get_function_identity_arguments(p.oid)                                               as args,
  pg_get_function_result(p.oid)                                                           as returns,
  p.proconfig                                                                             as search_path,
  has_function_privilege('anon', p.oid, 'EXECUTE')                                        as anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE')                               as authenticated_execute,
  exists (select 1 from aclexplode(p.proacl) a where a.grantee = 0 and a.privilege_type = 'EXECUTE') as public_execute,
  has_function_privilege('authenticated', 'public.consume_holt_allowance(text)', 'EXECUTE') as old_path_still_callable,
  exists (select 1 from pg_trigger t
           where t.tgrelid = 'public.programs'::regclass and t.tgname = 'programs_cap_guard_trg') as programs_cap_guard_on
from pg_proc p
where p.oid = 'public.keep_holt_program(jsonb)'::regprocedure;
