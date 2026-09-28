-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0236: remove_external_workouts — "Remove from Forge" for imported workouts
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: create or replace + restated grants, and §3 is read-only.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- Build 10 lets an athlete remove a workout Apple Health imported (Activity Detail, Activity History, or
-- all of them on Disconnect). `chapters.workout_count` is a stored counter that the import RPC (0234)
-- bumps and nothing took back down, so removing imports left the chapter's count too high. This RPC does
-- the removal in ONE statement: delete the imported rows, write the ledger 'deleted' rows (so a re-sync
-- never brings them back), and decrement the ACTIVE chapter's count (sealed chapters untouched, floor 0).
--
-- Forge-recorded workouts (source = 'forge') can never be removed through it, whatever ids are passed.
-- Every FK to `workouts` already cascades or nulls, so the delete cannot be refused (see the migration).
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  creates public.remove_external_workouts(uuid[]) — SECURITY INVOKER, authenticated only
-- §2  asserts the function exists, is SECURITY INVOKER, and anon cannot run it — RAISES if not
-- §3  reports what landed. Read-only. ONE result (the editor shows only the last statement's result).
--
-- ⚠ APPLYING IS NOT THE SAME AS WORKING. The client that calls this ships in native BUILD 10 (imports only
-- exist there). Until this is applied the build-10 client falls back to the old two-call removal, which
-- works but leaves the chapter count high. Safe to paste before or after build 10 ships.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ═════════════════════════════════════════════════════════════════════════════
-- §1 — THE FUNCTION (verbatim from supabase/migrations/0236_remove_imported_workouts.sql)
-- ═════════════════════════════════════════════════════════════════════════════

create or replace function public.remove_external_workouts(p_ids uuid[])
returns integer
language plpgsql
security invoker
set search_path = public
as $fn$
declare
  v_uid     uuid := auth.uid();
  v_removed integer := 0;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_ids is null or cardinality(p_ids) = 0 then
    return 0;
  end if;
  if cardinality(p_ids) > 200 then
    raise exception 'remove_external_workouts: at most 200 ids per call (got %)', cardinality(p_ids) using errcode = '22023';
  end if;

  -- One statement: every data-modifying CTE runs whether or not it is read, against the same snapshot,
  -- and the chapter arithmetic is taken from exactly the rows that were deleted.
  with gone as (
    delete from public.workouts w
     where w.athlete_id = v_uid
       and w.source <> 'forge'
       and w.id = any (p_ids)
    returning w.id, w.source, w.external_id, w.chapter_id
  ),
  ledger as (
    insert into public.external_activity_ledger (athlete_id, source, external_id, outcome, workout_id)
    select v_uid, g.source, g.external_id, 'deleted', g.id
      from gone g
     where g.external_id is not null
    on conflict (athlete_id, source, external_id)
      do update set outcome = 'deleted', workout_id = excluded.workout_id
    returning 1
  ),
  counted as (
    update public.chapters c
       set workout_count = greatest(0, c.workout_count - x.n)
      from (select g.chapter_id, count(*)::integer as n
              from gone g
             where g.chapter_id is not null
             group by g.chapter_id) x
     where c.id = x.chapter_id
       and c.athlete_id = v_uid
       and c.is_active
    returning 1
  )
  select count(*)::integer into v_removed from gone;

  return v_removed;
end;
$fn$;

comment on function public.remove_external_workouts(uuid[]) is
  'Removes the CALLER''s imported workouts among p_ids (0236; Apple-Health-Build-Plan §10.5). SECURITY INVOKER. source <> ''forge'' only; writes ledger ''deleted'' so a re-sync never re-imports; decrements the ACTIVE chapter''s workout_count (sealed chapters untouched, floor 0). One statement. ≤ 200 ids. Returns the number removed.';

revoke execute on function public.remove_external_workouts(uuid[]) from public, anon;
grant execute on function public.remove_external_workouts(uuid[]) to authenticated;


-- ═════════════════════════════════════════════════════════════════════════════
-- §2 — ASSERT IT TOOK. Raises rather than returning a tidy false green.
-- ═════════════════════════════════════════════════════════════════════════════

do $$
declare
  v_fn      regprocedure := to_regprocedure('public.remove_external_workouts(uuid[])');
  v_definer boolean;
begin
  if v_fn is null then
    raise exception '0236 DID NOT APPLY. Missing: public.remove_external_workouts(uuid[])';
  end if;
  select p.prosecdef into v_definer from pg_proc p where p.oid = v_fn;
  if v_definer then
    raise exception '0236 WRONG: remove_external_workouts must be SECURITY INVOKER (it runs under the athlete''s RLS)';
  end if;
  if has_function_privilege('anon', v_fn, 'execute') then
    raise exception '0236 WRONG: anon can execute remove_external_workouts';
  end if;
  if not has_function_privilege('authenticated', v_fn, 'execute') then
    raise exception '0236 WRONG: authenticated cannot execute remove_external_workouts';
  end if;
  if position('c.is_active' in pg_get_functiondef(v_fn)) = 0 or position('''deleted''' in pg_get_functiondef(v_fn)) = 0 then
    raise exception '0236 WRONG: remove_external_workouts body is not 0236''s (no active-chapter guard or ledger write)';
  end if;

  raise notice '0236 OK — remove_external_workouts is present, SECURITY INVOKER, authenticated-only.';
end $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- §3 — WHAT IS NOW THERE. Read-only, one row.
-- Predicted: fn_present = true · security_definer = false · anon_can_execute = false ·
--            authenticated_can_execute = true · imported_workouts = 0 and ledger_deleted = 0
--            (both stay 0 until build 10 is on a phone and has imported / removed something).
-- ═════════════════════════════════════════════════════════════════════════════

select
  to_regprocedure('public.remove_external_workouts(uuid[])') is not null                                  as fn_present,
  (select p.prosecdef from pg_proc p where p.oid = to_regprocedure('public.remove_external_workouts(uuid[])')) as security_definer,
  has_function_privilege('anon', 'public.remove_external_workouts(uuid[])', 'execute')                    as anon_can_execute,
  has_function_privilege('authenticated', 'public.remove_external_workouts(uuid[])', 'execute')           as authenticated_can_execute,
  (select count(*) from public.workouts where source <> 'forge')                                           as imported_workouts,
  (select count(*) from public.external_activity_ledger where outcome = 'deleted')                        as ledger_deleted;
