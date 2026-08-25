-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- PASTE BUNDLE — 0179 · Coach Holt's exploration nudges (state + signals)
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
--
-- PASTE THIS WHOLE FILE INTO THE SUPABASE SQL EDITOR AND RUN IT ONCE. Safe to run twice.
--
-- ⚠ RUN `pending-0178.sql` FIRST. They are independent, but 0178 is the one the squad post screen
--   depends on, and getting it in before the deploy is what keeps that screen working.
--
-- WHAT IT DOES
--   1. `coach_nudge_state` — per athlete, per nudge: last shown, times refused, whether it has been
--      used. Owner-scoped RLS. Server-side rather than device-local because the cadence budget must not
--      restart on a reinstall or run twice across two devices.
--   2. `coach_nudge_signals()` — the eight counts that decide which nudges are eligible, in one round
--      trip instead of eight.
--
-- ⚠ NO DELETE POLICY ON THE STATE TABLE, deliberately. Deleting a row would reset a nudge the athlete
--   has already refused twice, and "never again" is the rule that has to survive.
--
-- ⚠ `coach_nudge_signals()` IS SECURITY **INVOKER**. It reads eight of the athlete's own tables, all of
--   which are already owner-scoped by RLS, and it takes NO athlete id — it reads `auth.uid()` itself. A
--   definer here would be a function that can read any athlete's counts guarded only by its own where
--   clause, which is what 0169 is this project's record of.
--
-- ⚠ APPLYING IS NOT SHIPPING. Until the client is deployed, §3 must report 0 nudge rows — the app is
--   the only thing that writes them. 0153 sat applied-and-invisible for eleven migrations exactly here.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- §1 · THE STATEMENTS — verbatim from supabase/migrations/0179_coach_nudge_state.sql
--       44 non-comment lines, ALL present and in order — verified by parsing both files and diffing the
--       non-comment lines, not by eye.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════

create table if not exists public.coach_nudge_state (
  athlete_id      uuid        not null references public.profiles(id) on delete cascade,
  nudge_id        text        not null,
  shown_at        timestamptz,
  dismissed_count int         not null default 0,
  dismissed_at    timestamptz,
  used_at         timestamptz,
  primary key (athlete_id, nudge_id)
);

comment on table public.coach_nudge_state is
  'Which exploration nudges Holt has offered this athlete, and how they answered (0179). One row per athlete per nudge. `used_at` retires a nudge permanently; `dismissed_count` >= 2 retires it too. Server-side rather than device-local because the cadence budget must not restart on a reinstall or run twice across two devices.';

alter table public.coach_nudge_state enable row level security;

drop policy if exists coach_nudge_state_owner_select on public.coach_nudge_state;
drop policy if exists coach_nudge_state_owner_insert on public.coach_nudge_state;
drop policy if exists coach_nudge_state_owner_update on public.coach_nudge_state;
create policy coach_nudge_state_owner_select on public.coach_nudge_state for select
  using (athlete_id = auth.uid());
create policy coach_nudge_state_owner_insert on public.coach_nudge_state for insert
  with check (athlete_id = auth.uid());
create policy coach_nudge_state_owner_update on public.coach_nudge_state for update
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());

create or replace function public.coach_nudge_signals()
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'sessions',   (select count(*) from public.workouts               w  where w.athlete_id  = auth.uid()),
    'photos',     (select count(*) from public.transformation_entries t  where t.athlete_id  = auth.uid()),
    'goals',      (select count(*) from public.goals                  g  where g.athlete_id  = auth.uid()),
    'templates',  (select count(*) from public.workout_templates      wt where wt.athlete_id = auth.uid()),
    'squads',     (select count(*) from public.squad_members          sm where sm.user_id    = auth.uid()),
    'honors',     (select count(*) from public.honor_instances        hi where hi.athlete_id = auth.uid()),
    'weighIns',   (select count(*) from public.body_entries           be where be.athlete_id = auth.uid()),
    'programs',   (select count(*) from public.programs               p  where p.athlete_id  = auth.uid() and p.state = 'active')
  );
$$;

comment on function public.coach_nudge_signals() is
  'The counts deciding which exploration nudges are eligible (0179), in one round trip. SECURITY INVOKER on purpose: every table read is already owner-scoped by RLS, so a bug in this body can leak nothing. Reads auth.uid() directly rather than taking an athlete id, so its safety cannot depend on the caller.';

revoke execute on function public.coach_nudge_signals() from public;
grant execute on function public.coach_nudge_signals() to authenticated;


-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- §2 · ASSERTIONS — raise if anything above did not land.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════

do $$
declare
  v jsonb;
begin
  if to_regclass('public.coach_nudge_state') is null then
    raise exception '0179 FAILED: coach_nudge_state is absent';
  end if;

  if not exists (
    select 1 from pg_class where relname = 'coach_nudge_state' and relrowsecurity
  ) then
    raise exception '0179 FAILED: RLS is not enabled on coach_nudge_state — every athlete could read every row';
  end if;

  if (select count(*) from pg_policies
       where schemaname = 'public' and tablename = 'coach_nudge_state') <> 3 then
    raise exception '0179 FAILED: expected exactly 3 policies on coach_nudge_state (select/insert/update, and NO delete)';
  end if;

  if to_regprocedure('public.coach_nudge_signals()') is null then
    raise exception '0179 FAILED: coach_nudge_signals() is absent';
  end if;

  -- ⚠ THE FUNCTION MUST ACTUALLY RUN AND RETURN ALL EIGHT KEYS. Existing in the catalogue says a
  -- function is there, not that its body works — a mistyped column would only surface at call time,
  -- which is on the athlete's phone.
  select public.coach_nudge_signals() into v;
  if v is null then
    raise exception '0179 FAILED: coach_nudge_signals() returned null';
  end if;
  if not (v ? 'sessions' and v ? 'photos' and v ? 'goals' and v ? 'templates'
          and v ? 'squads' and v ? 'honors' and v ? 'weighIns' and v ? 'programs') then
    raise exception '0179 FAILED: coach_nudge_signals() is missing keys — got %', v;
  end if;

  raise notice '0179 OK — state table (RLS on, 3 policies, no delete) and a signals function that runs.';
end $$;


-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- §3 · REPORT — read-only.
--
--       PREDICTED OUTPUT, written before running:
--         · nudge_rows       — 0   ← the app is the only thing that writes them, and it is not deployed
--         · policies         — 3   ← select + insert + update. NOT 4: there is deliberately no delete.
--         · signals_ok       — t
--
--       ⚠ A NON-ZERO `nudge_rows` BEFORE THE DEPLOY MEANS SOMETHING ELSE IS WRITING THIS TABLE.
--
--       `my_signals` is YOUR OWN counts, run as you — a sanity check that the reads point at the right
--       columns. `sessions` there should match roughly how many workouts you have finished.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════

select
  (select count(*) from public.coach_nudge_state)                                     as nudge_rows,
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'coach_nudge_state')                  as policies,
  (public.coach_nudge_signals() is not null)                                          as signals_ok,
  public.coach_nudge_signals()                                                        as my_signals;
