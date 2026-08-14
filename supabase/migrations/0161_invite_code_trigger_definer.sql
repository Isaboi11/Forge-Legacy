-- Forge Legacy — 0161: the invite-code generator cannot read the column it exists to fill
--
-- ══ WHAT BROKE ══
--
-- Creating ANY squad failed:
--
--     42501 permission denied for table squads
--     CONTEXT: SQL expression "not exists (select 1 from public.squads where invite_code = c)"
--              PL/pgSQL function squads_set_invite_code() line 9 at EXIT
--              SQL statement "insert into public.squads (...) returning id"
--              PL/pgSQL function create_squad(...) line 9
--
-- `squads_set_invite_code()` (0040) is a BEFORE INSERT trigger that generates `PREFIX-XXXX` and loops
-- until the code is unused — and it tests that by **reading `invite_code`**. It was declared with no
-- security clause, so it is `SECURITY INVOKER` and runs as the athlete. `0149` revoked SELECT on
-- `squads.invite_code` from `authenticated` (SQ-D16: a member who can read the code off the row bypasses
-- request-only joining). From that moment the generator could not read the column it exists to populate,
-- and **every squad creation failed for every athlete**.
--
-- ⚠ THIS IS 0150's LESSON FROM THE OTHER DIRECTION, AND IT IS WORTH STATING BOTH WAYS.
--   0150: SECURITY DEFINER exempts the CALLER, not the callee — `save_workout` needed EXECUTE on
--         `evaluate_honors` even though that function is definer.
--   0161: a SECURITY INVOKER callee inherits the CALLER's restrictions — this trigger is reached only
--         from inside `create_squad`, but it reads with the athlete's privileges, not the schema's.
--   **"Internal" describes where a function is CALLED FROM. It says nothing about what it may READ.**
--
-- ⚠ AND IT IS THE THIRD DISTINCT BREAKAGE FROM ONE REVOKE. 0149 hid one column and broke: (1) every read
--   of `squads`, because a column added later had no grant (fixed in 0160); (2) `select *` anywhere on the
--   table; and now (3) an internal trigger that reads the hidden column. A revoke's blast radius is every
--   reader, and **most readers are not client queries** — they are policies, triggers and function bodies
--   that no client-side audit enumerates.
--
-- ══ THE FIX, AND WHY DEFINER IS RIGHT RATHER THAN CONVENIENT ══
--
-- The uniqueness probe is an INTERNAL integrity check. It must see codes the caller is forbidden to see —
-- that is the entire point of the revoke — so the function has to run with rights the caller lacks. That
-- is what SECURITY DEFINER is for.
--
-- ⚠ IT LEAKS NOTHING. The function returns `new`; it never returns a code it read. A caller cannot use it
--   to exfiltrate anything: reading another squad's code would need `returning invite_code` on their own
--   INSERT, and RETURNING is still checked against the caller's column privileges, which 0149 revoked and
--   0160 deliberately kept revoked.
--
-- ⚠ AND IT FIXES A LATENT BUG THAT PREDATES 0149. As an invoker function the probe ran under RLS as the
--   athlete, so it only ever saw squads that athlete could SELECT — it could hand out a code already held
--   by a private squad they cannot see, and the collision would surface as a unique-index violation on
--   `squads_invite_code_key` at insert time. As a definer it sees every row, so the probe is now actually
--   answering the question it asks. The unique index remains the real guarantee; the loop is the courtesy.
--
-- `set search_path` is pinned per this schema's standing rule for every definer function.
--
-- Idempotent (`create or replace`). The trigger itself is unchanged and is NOT re-created — Postgres
-- resolves the function at fire time, so replacing the body is enough. RUN ANY TIME.

begin;

create or replace function public.squads_set_invite_code()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  c     text;
  tries int := 0;
begin
  if new.invite_code is null then
    loop
      c := public.gen_squad_code(new.name);
      -- Runs as the function owner now, so this sees EVERY squad rather than only the ones the inserting
      -- athlete may select. See the header: as an invoker function this silently probed a subset.
      exit when not exists (select 1 from public.squads where invite_code = c);
      tries := tries + 1;
      if tries > 12 then
        c := public.gen_squad_code(new.name) || public._squad_code_rand(2); -- widen the space, stop looping
        exit;
      end if;
    end loop;
    new.invite_code := c;
  end if;
  return new;
end;
$$;

comment on function public.squads_set_invite_code() is
  'BEFORE INSERT on squads: assigns a unique invite code. ⚠ SECURITY DEFINER ON PURPOSE (0161) — it probes `invite_code`, which 0149 revoked from authenticated, so as an invoker function it made every squad creation fail with 42501. It returns NEW and never returns a code it read, so it leaks nothing; RETURNING is still checked against the caller''s column privileges.';

commit;


-- ═════════════════════════════════════════════════════════════════════════════
-- VERIFY — returns ROWS. `raise notice` is invisible in the Supabase SQL editor.
-- ═════════════════════════════════════════════════════════════════════════════
--
-- ⚠ THE SECOND COLUMN IS THE ONE THAT MATTERS. Fixing the reported function is not the same as fixing the
--   class: ANY `security invoker` function in `public` that reads a revoked column has this same bug and
--   will surface as a 42501 the first time somebody exercises it. This enumerates the rest of them, so the
--   next one is found here rather than by an athlete. Expect 0.

select
  (select p.prosecdef
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'squads_set_invite_code')
                                                        as trigger_is_definer_expect_true,

  -- ⚠ `p.prokind = 'f'` IS LOAD-BEARING, NOT TIDINESS. `pg_get_functiondef()` RAISES on an aggregate —
  --   `42809 "array_agg" is an aggregate function` — and one raise takes the whole verify block down
  --   after the migration has already committed, which reads exactly like a failed migration. This file
  --   shipped without it and did precisely that. The other preflights in this repo carry the same filter.
  coalesce((select string_agg(p.proname, ', ' order by p.proname)
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'                                        -- plain functions; not aggregates/windows
      and not p.prosecdef                                        -- security invoker
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
      and pg_get_functiondef(p.oid) ~ '(invite_code|training_since|training_label)'),
    'none')                                             as invoker_fns_reading_hidden_cols_expect_none,

  -- The revoke must still stand. A "fix" that restored readability would re-open SQ-D16.
  has_column_privilege('authenticated', 'public.squads'::regclass, 'invite_code', 'select')
                                                        as invite_code_still_hidden_expect_false;
