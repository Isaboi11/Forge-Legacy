-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- VERIFY 0198 — is un-skip live, and is the session mark now RPC-only?
--
-- Read-only. Paste the whole thing, run it, send back the rows.
--
-- ⚠ ONE QUERY ON PURPOSE. The Supabase SQL editor shows only the LAST statement's output, so a bundle
-- of separate selects hides every answer but one. Everything below folds into a single result.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

with checks as (
  select * from (values

    -- ── §1 · the function ──────────────────────────────────────────────────────────────────────
    ('1 · unskip_program_session exists',
     (select count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'unskip_program_session'),
     '1'),

    -- ⚠ INVOKER, not definer. A definer function would delete as the table owner, leaving the
    -- athlete_id predicate as the only thing between one athlete and another's schedule.
    ('2 · it is security INVOKER',
     (select case when prosecdef then 'definer' else 'invoker' end from pg_proc
       where oid = 'public.unskip_program_session(uuid,integer,integer)'::regprocedure),
     'invoker'),

    ('3 · authenticated may execute it',
     (select case when has_function_privilege('authenticated',
        'public.unskip_program_session(uuid,integer,integer)', 'execute')
      then 'yes' else 'no' end),
     'yes'),

    -- ── §2 · the policies ──────────────────────────────────────────────────────────────────────
    -- 'r' = select, 'a' = insert, 'w' = update, 'd' = delete, '*' = all.
    ('4 · program_sessions policies (r=select, a=insert)',
     (select coalesce(array_to_string(array_agg(distinct polcmd::text order by polcmd::text), ','), 'none')
       from pg_policy where polrelid = 'public.program_sessions'::regclass),
     'a,r'),

    -- ⚠ THE ONE THAT MATTERS, asserted separately so a later migration adding a third policy shows as a
    -- changed row 4 rather than as a failure here. A `w`, `d` or `*` means the client can still delete a
    -- `completed` mark directly — the record that a workout satisfied a session.
    ('5 · no update or delete door remains',
     (select case when bool_or(polcmd::text in ('w', 'd', '*')) then 'OPEN' else 'closed' end
       from pg_policy where polrelid = 'public.program_sessions'::regclass),
     'closed'),

    ('6 · the old for-all policy is gone',
     (select count(*)::text from pg_policy
       where polrelid = 'public.program_sessions'::regclass and polname = 'program_sessions_own'),
     '0'),

    -- ── §3 · nothing else moved ────────────────────────────────────────────────────────────────
    -- 0198 must not have touched either write path. If a count here is 0, something was dropped.
    ('7 · skip_program_session still there',
     (select count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'skip_program_session'),
     '1'),

    ('8 · save_workout still there',
     (select count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'save_workout'),
     '1'),

    -- ── §4 · the data is undisturbed ───────────────────────────────────────────────────────────
    -- A policy change writes no rows. These are here so "nothing was lost" is observed, not assumed.
    ('9 · session marks on file (completed / skipped)',
     (select count(*) filter (where state = 'completed')::text || ' / ' ||
             count(*) filter (where state = 'skipped')::text
       from public.program_sessions),
     'informational'),

    ('10 · skipped marks that are still undoable (active programs)',
     (select count(*)::text from public.program_sessions ps
        join public.programs p on p.id = ps.program_id
       where ps.state = 'skipped' and p.state = 'active'),
     'informational')

  ) as t(check_name, actual, expected)
)

select
  check_name,
  actual,
  expected,
  case
    when expected = 'informational' then '—'
    when actual is not distinct from expected then 'PASS'
    else '❌ FAIL'
  end as verdict
from checks
order by check_name;
