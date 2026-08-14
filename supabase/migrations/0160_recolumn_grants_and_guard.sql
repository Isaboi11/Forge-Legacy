-- Forge Legacy — 0160: a column added after 0149 is invisible, and the whole table read fails with it
--
-- ══ WHAT BROKE ══
--
-- Creating or opening a squad failed with:
--
--     permission denied for table squads (42501)
--
-- `0149_hide_invite_code_and_presence.sql` hides `squads.invite_code` and `profiles.training_since` /
-- `training_label`. **PostgreSQL has no way to revoke ONE column from a table-level SELECT grant** — a
-- table grant outranks column grants — so 0149 does the only thing that works: it revokes SELECT on the
-- table and re-grants every OTHER column individually, enumerating them from
-- `information_schema.columns` AT THE MOMENT IT RUNS.
--
-- **Every column added after that point therefore has no grant at all.** `0153` added
-- `squads.training_alerts` on 2026-08-13. PostgREST issues `select *`, which expands to every column
-- including the ungranted one, and Postgres refuses the STATEMENT — not the column. So one new boolean
-- took down every read of `squads` for every athlete: the Squads tab, Squad Detail, Discover, create,
-- join. Confirmed by column audit: `training_alerts` was the ONLY casualty, and both deliberately hidden
-- columns were still correctly hidden.
--
-- ⚠ THIS WAS PREDICTED IN WRITING AND SHIPPED ANYWAY. `Docs/Launch-Audit-2026-08-12.md` §4-2 says a
--   column-level grant "must enumerate every remaining column and silently breaks reads when a future
--   column is added". That is this, one day later. The prediction was not enough; a mechanism is.
--
-- ⚠ AND EVERY GATE WAS GREEN. `preflight-0146-0153.sql` asserts `invite_code` is hidden — it was, and
--   still is. Nothing asserted the INVERSE: that everything else is still readable. A privilege check
--   that only tests what must be absent cannot see what has gone missing by accident. §3 fixes that.
--
-- ══ WHAT THIS FILE DOES ══
--
--   1. Installs `public.reapply_hidden_column_grants()` — 0149's loop, as a callable function, so the
--      repair is one statement instead of a copied block that will drift from its original.
--   2. Runs it, and ASSERTS the outcome in both directions.
--   3. Tries to install an event trigger that re-runs it automatically whenever a column is added to
--      either table. **Tolerated if it fails** — event triggers need privileges a hosted Postgres role
--      may not have, and a migration that dies on a hardening bonus is worse than one that reports it.
--
-- Idempotent. Safe to run twice. RUN ANY TIME — it grants only what 0149 would have granted.

begin;

-- ═════════════════════════════════════════════════════════════════════════════
-- 1 · THE REPAIR, AS A FUNCTION RATHER THAN A COPIED BLOCK
-- ═════════════════════════════════════════════════════════════════════════════
--
-- ⚠ THE HIDDEN LIST LIVES HERE NOW, IN ONE PLACE. 0149 spelled it inline in a DO block, which is why
--   nothing could re-run it. If a future column must be hidden, add it to this function and call the
--   function — do not write another bespoke revoke/grant loop, because two loops will disagree and the
--   one that ran last wins silently.

create or replace function public.reapply_hidden_column_grants()
returns table (tbl text, granted int, hidden int)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r        record;
  c        record;
  v_grants int;
begin
  for r in
    select 'profiles'::text as t, array['training_since', 'training_label']::text[] as hide
    union all
    select 'squads'::text,         array['invite_code']::text[]
  loop
    v_grants := 0;

    -- Revoke first, then re-grant. A table-level grant would outrank the column grants and silently
    -- publish the hidden columns, so this ordering is the whole mechanism, not tidiness.
    execute format('revoke select on public.%I from anon, authenticated', r.t);

    for c in
      select column_name from information_schema.columns
       where table_schema = 'public' and table_name = r.t
         and not (column_name = any (r.hide))
       order by ordinal_position
    loop
      execute format('grant select (%I) on public.%I to anon, authenticated', c.column_name, r.t);
      v_grants := v_grants + 1;
    end loop;

    tbl := r.t; granted := v_grants; hidden := array_length(r.hide, 1);
    return next;
  end loop;
end;
$$;

comment on function public.reapply_hidden_column_grants() is
  'Re-applies 0149''s per-column SELECT grants on profiles and squads. ⚠ CALL THIS FROM ANY MIGRATION THAT ADDS A COLUMN TO EITHER TABLE. Postgres cannot revoke a single column from a table-level grant, so those two tables have NO table-level SELECT and every readable column is granted individually — a new column is therefore invisible until this runs, and because PostgREST selects *, one ungranted column fails EVERY read of the table (0160).';

revoke execute on function public.reapply_hidden_column_grants() from public;
revoke execute on function public.reapply_hidden_column_grants() from anon, authenticated;


-- ═════════════════════════════════════════════════════════════════════════════
-- 2 · RUN IT, AND ASSERT BOTH DIRECTIONS
-- ═════════════════════════════════════════════════════════════════════════════

do $$
declare
  v_missing text;
  v_leaked  text;
begin
  perform public.reapply_hidden_column_grants();

  -- (a) Nothing that should be readable is missing.
  select string_agg(c.table_name || '.' || c.column_name, ', ' order by c.table_name, c.column_name)
    into v_missing
    from information_schema.columns c
   where c.table_schema = 'public'
     and c.table_name in ('profiles', 'squads')
     and not ((c.table_name = 'squads'   and c.column_name = 'invite_code')
           or (c.table_name = 'profiles' and c.column_name in ('training_since', 'training_label')))
     and not has_column_privilege('authenticated', ('public.' || c.table_name)::regclass, c.column_name, 'select');

  if v_missing is not null then
    raise exception '0160 FAILED: authenticated still cannot select %', v_missing;
  end if;

  -- (b) ⚠ AND NOTHING THAT MUST STAY HIDDEN LEAKED. A repair that fixes readability by handing back
  --     `invite_code` would re-open SQ-D16 (any member reads the code off the row and bypasses
  --     request-only joining) and publish every athlete's live training status to the anon key.
  select string_agg(x.col, ', ')
    into v_leaked
    from (
      select 'squads.invite_code' as col
       where has_column_privilege('authenticated', 'public.squads'::regclass, 'invite_code', 'select')
          or has_column_privilege('anon',          'public.squads'::regclass, 'invite_code', 'select')
      union all
      select 'profiles.' || c
        from unnest(array['training_since', 'training_label']) as c
       where has_column_privilege('authenticated', 'public.profiles'::regclass, c, 'select')
          or has_column_privilege('anon',          'public.profiles'::regclass, c, 'select')
    ) x;

  if v_leaked is not null then
    raise exception '0160 FAILED: a column that must stay hidden is now readable: %', v_leaked;
  end if;
end $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- 3 · MAKE IT NOT HAPPEN AGAIN — BEST EFFORT, AND HONEST ABOUT IT
-- ═════════════════════════════════════════════════════════════════════════════
--
-- An event trigger re-runs the grant loop whenever a column is added to either table, which closes the
-- class rather than the instance. Event triggers normally require superuser, and this project applies
-- migrations as a hosted role that may not have it.
--
-- ⚠ SO FAILURE HERE IS TOLERATED AND REPORTED, NOT FATAL. The repair in §2 has already happened and must
--   not be rolled back because a hardening bonus was unavailable. The VERIFY block below states plainly
--   whether the trigger exists, so nobody has to assume.
--
-- ⚠ IF IT IS NOT INSTALLED, THE BACKSTOP IS THE PREFLIGHT, NOT MEMORY. `preflight-0146-0153.sql` now
--   carries a check that every non-hidden column on both tables is selectable.

create or replace function public.tg_reapply_hidden_column_grants()
returns event_trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  c record;
begin
  for c in select objid from pg_event_trigger_ddl_commands() where command_tag = 'ALTER TABLE'
  loop
    if c.objid in ('public.profiles'::regclass, 'public.squads'::regclass) then
      perform public.reapply_hidden_column_grants();
      return;
    end if;
  end loop;
end;
$$;

do $$
begin
  drop event trigger if exists reapply_hidden_column_grants_trg;
  create event trigger reapply_hidden_column_grants_trg
    on ddl_command_end
    when tag in ('ALTER TABLE')
    execute function public.tg_reapply_hidden_column_grants();
exception
  when insufficient_privilege or feature_not_supported then
    -- Expected on a hosted role without superuser. §2's repair stands; the preflight is the backstop.
    null;
end $$;

commit;


-- ═════════════════════════════════════════════════════════════════════════════
-- VERIFY — returns ROWS. `raise notice` is invisible in the Supabase SQL editor.
-- ═════════════════════════════════════════════════════════════════════════════

select
  (select count(*) from information_schema.columns c
    where c.table_schema = 'public' and c.table_name in ('profiles', 'squads')
      and not ((c.table_name = 'squads'   and c.column_name = 'invite_code')
            or (c.table_name = 'profiles' and c.column_name in ('training_since', 'training_label')))
      and not has_column_privilege('authenticated', ('public.' || c.table_name)::regclass, c.column_name, 'select'))
                                                            as unreadable_expect_0,

  has_column_privilege('authenticated', 'public.squads'::regclass, 'training_alerts', 'select')
                                                            as training_alerts_expect_true,

  -- The two that must STILL be hidden. A green repair that leaked these would be a worse bug than the one
  -- it fixed, so they are asserted here rather than trusted.
  has_column_privilege('authenticated', 'public.squads'::regclass, 'invite_code', 'select')
                                                            as invite_code_expect_false,
  has_column_privilege('authenticated', 'public.profiles'::regclass, 'training_since', 'select')
                                                            as training_since_expect_false,

  (select count(*) from pg_event_trigger where evtname = 'reapply_hidden_column_grants_trg')
                                                            as auto_regrant_1_if_installed;
