-- ─────────────────────────────────────────────────────────────────────────────────────────────────
-- VERIFY 0123 + 0124 — run this on its own. Every column must come back TRUE.
--
-- The Supabase editor only shows the LAST result set, which is why the checks inside the bundle were
-- invisible. This returns all of them at once.
--
-- ⚠ It reads the INSTALLED function body, not the file. That distinction is the whole point: a partial
-- run leaves an older body in place and still reports success, which is how this schema has lost a
-- function branch four separate times.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────
select
  -- 0124 — the installed save_workout actually writes the per-exercise note.
  (select pg_get_functiondef(p.oid) like '%nullif(v_ex->>''notes''%'
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'save_workout' limit 1)
      as save_workout_writes_notes,

  -- 0124 — and it still carries the graduation block. A rebuild from a partial read is how 0106
  -- silently deleted this entire branch once before.
  (select pg_get_functiondef(p.oid) like '%PROGRAM_GRADUATED%'
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'save_workout' limit 1)
      as save_workout_still_graduates,

  -- 0124 — the grant survived the replace. A DROP here would have restored PUBLIC EXECUTE silently.
  (select has_function_privilege('authenticated', p.oid, 'execute')
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'save_workout' limit 1)
      as save_workout_grant_intact,

  -- 0123 — the guard function exists...
  (select count(*) = 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'programs_guard_structure')
      as guard_function_exists,

  -- ...and is actually attached to the table. A function nobody calls guards nothing.
  (select count(*) = 1 from pg_trigger
    where tgname = 'programs_guard_structure_trg' and not tgisinternal)
      as guard_trigger_attached;
