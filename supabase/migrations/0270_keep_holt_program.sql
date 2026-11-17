-- 0270 — keeping a Holt program charges and saves it in ONE step (keep_holt_program)
--
-- AI Road to 10, Sprint 1 (Docs/AI-Sprint-1-Build-Notes.md §0, branch ai/s1-client). The Sprint 0 leftover:
-- Forge-Legacy-Master-Status.md, Sprint 0 entry, "Open: Holt programs are counted on the device only".
--
-- Today (Sprint 0, commit 935ca5f1, AI audit B-D1) a Holt block of four weeks or more is paid for when it is KEPT —
-- Start, Save to the Builder ("Adjust it"), the wizard's "Final touches" — by calling consume_holt_allowance('program')
-- and THEN, in a separate call, writing the program (createProgram → programs) or a device-only Builder draft.
-- Nothing on the server ties the two:
--   · a spend whose write fails (no signal at the second call, the programs cap) is a Holt program paid for and
--     never kept;
--   · the Builder path spends and then writes only a draft on the phone — cancel the Builder and the spend
--     stands with no program anywhere;
--   · a client that skipped the spend could write the row anyway.
--
-- keep_holt_program(p_structure) does both inside one transaction: consume_holt_allowance('program') — CALLED, never
-- copied — and, only when it allowed, the programs row. If the insert fails (the programs cap, a bad structure,
-- anything), the whole call rolls back and the spend with it. So: no kept Holt program without its spend, and no
-- spend without the kept program. The client then starts that row (Start) or opens the Builder ON it (edit mode),
-- so Save writes back over the kept program instead of creating a second one.
--
-- ⚠ SECURITY INVOKER on purpose: the insert runs as the athlete, under programs' own RLS
--   (programs_owner_insert: athlete_id = auth.uid()) and through programs_cap_guard_trg, exactly as createProgram's
--   insert does. It can do nothing the caller could not already do with the two calls it replaces.
-- ⚠ A block under four weeks is a training week, not the Holt program (MA4-D5, ca5f088e): it is refused here (22023)
--   and the app never sends one — it is written as before and spends short_programs at the save.
-- ⚠ Fail-closed (78ee55ae) is the app's rule and is unchanged: an unreadable answer is a retry for anyone with a
--   ceiling. Because the spend and the row are one transaction, an unreadable answer now also means NOTHING was
--   kept or spent.
-- ⚠ Old phones keep working: consume_holt_allowance and the programs insert are untouched, so a build-11 install that
--   has not taken the OTA still spends and then writes, as today. The new client calls this function, and falls back
--   to that two-step only while this migration is not applied (PGRST202 / 42883).
-- ⚠ Supabase grants EXECUTE on a new public function to anon AND authenticated directly (not only via PUBLIC), so the
--   revoke names both PUBLIC and anon, and authenticated is granted explicitly.
--
-- Depends on 0145 (consume_holt_allowance — live source read 2026-11-17, unchanged since), 0156 (program_earns_credit),
-- 0158 (programs_cap_guard). No table, column or data changes. Idempotent: create or replace + revoke/grant. Safe to
-- run twice.

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
