-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0172: re-apply the per-column grants 0169 skipped
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once. Idempotent.
--
-- ⛔ DEPLOY BLOCKER. `0169` added two columns to `profiles` and issued no grants. That table has NO
--    table-level SELECT (0149 revoked it; every readable column is granted individually), so the two new
--    columns are invisible and any statement naming them raises 42501 for the WHOLE statement.
--
-- ⚠ NOTHING HAS BROKEN YET ONLY BECAUSE 0169'S CLIENT HALF WAS NEVER DEPLOYED.
--   `src/data/coach-profile-live.ts:76` selects `experience, training_goals, …` — the read that lets Coach
--   Holt skip questions the athlete already answered, which is the whole point of 0169. It fails the moment
--   it ships, and the symptom is "Holt still asks me my experience": indistinguishable from the bug 0169
--   was written to fix, on a build where the fix is present. **Apply this BEFORE deploying.**
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

do $$
declare
  r record;
begin
  if to_regprocedure('public.reapply_hidden_column_grants()') is null then
    raise exception '0172 STOP: reapply_hidden_column_grants() is absent — 0160 has not been applied. Apply that first.';
  end if;

  for r in select * from public.reapply_hidden_column_grants() loop
    raise notice '0172: % — % columns granted, % kept hidden', r.tbl, r.granted, r.hidden;
  end loop;
end;
$$;

-- ── SELF-CHECK ───────────────────────────────────────────────────────────────────────────────────────

do $$
declare
  missing text := '';
begin
  -- The two columns 0169 added must now be selectable by the app's role.
  foreach missing in array array['experience', 'training_goals'] loop
    if not exists (
      select 1 from information_schema.column_privileges
       where table_schema = 'public' and table_name = 'profiles'
         and column_name = missing and privilege_type = 'SELECT'
         and grantee = 'authenticated'
    ) then
      raise exception '0172 self-check: profiles.% is still not selectable by authenticated — the repair did not cover it', missing;
    end if;
  end loop;

  -- ⚠ AND THE INVERSE, which is the half `0160` exists to enforce: the repair must not have PUBLISHED a
  -- column that is hidden on purpose. A grant loop that over-reaches is worse than one that under-reaches,
  -- because nothing fails — it just quietly exposes every private squad's invite code.
  if exists (
    select 1 from information_schema.column_privileges
     where table_schema = 'public' and table_name = 'squads'
       and column_name = 'invite_code' and privilege_type = 'SELECT'
       and grantee in ('authenticated', 'anon', 'PUBLIC')
  ) then
    raise exception '0172 self-check: squads.invite_code became selectable — the repair leaked a hidden column';
  end if;

  raise notice '0172 OK: profiles.experience and profiles.training_goals are selectable, and squads.invite_code is still hidden.';
end;
$$;

-- ══ VERIFY BY HAND ═══════════════════════════════════════════════════════════════════════════════════
--   The read that would have failed, as the app makes it:
--     select experience, training_goals, environment, home_gym_equipment from public.profiles limit 1;
--
--   ⚠ Run it as `authenticated`, not as postgres — postgres owns the table and cannot reproduce the
--     failure. Use the wrapper this project already relies on:
--       begin;
--       select set_config('request.jwt.claims',
--              json_build_object('sub','<any uuid>','role','authenticated')::text, true);
--       set local role authenticated;
--       select experience, training_goals from public.profiles limit 1;
--       rollback;
