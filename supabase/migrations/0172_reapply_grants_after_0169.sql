-- Forge Legacy — 0172: re-apply the per-column grants `0169` skipped
--
-- ══ WHAT IS WRONG ══
--
-- `0169` added `profiles.experience` and `profiles.training_goals`. It issued **no grants**, and `profiles`
-- is one of the two tables in this schema with **no table-level SELECT**: `0149` revoked it and granted
-- every readable column individually, because Postgres cannot revoke a single column from a table grant.
--
-- `0160` installed `reapply_hidden_column_grants()` for exactly this case and its own comment states the
-- rule in full:
--
--   "⚠ CALL THIS FROM ANY MIGRATION THAT ADDS A COLUMN TO EITHER TABLE. … a new column is therefore
--    invisible until this runs, and because PostgREST selects *, one ungranted column fails EVERY read of
--    the table."
--
-- `0169` did not call it. So the two columns it added are ungranted, and any statement naming them fails
-- with **42501 for the whole statement**.
--
-- ══ ⚠ WHY NOTHING HAS BROKEN YET, AND WHY THAT IS THE DANGEROUS PART ══
--
-- `0169`'s CLIENT half has never been deployed. `src/data/coach-profile-live.ts:76` selects
-- `experience, training_goals, environment, home_gym_equipment` — the read that lets Coach Holt skip
-- questions the athlete has already answered, which is the entire purpose of `0169` — and **that read is
-- the one that will raise 42501 the moment it ships.**
--
-- The symptom would be *"Holt still asks me my experience"*: identical to the bug `0169` was written to
-- fix, on a build where the fix is present and applied. Anyone debugging it starts in the client, where
-- nothing is wrong. This is the third time this schema has produced a defect of exactly that shape —
-- `0153` adding `squads.training_alerts` a day after `0149` killed every squad read for every athlete.
--
-- ⚠ THIS IS A DEPLOY BLOCKER, NOT A TIDY-UP. Apply it BEFORE the client half of 0169–0171 goes out.
--
-- ══ WHY THE FUNCTION AND NOT A HAND-WRITTEN GRANT ══
--
-- `0160`'s comment ends: "never write a second revoke/grant loop." The hidden list lives inside that
-- function; a hand-written `grant select (experience, training_goals)` here would work today and would
-- silently diverge the moment the hidden set changes.

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
