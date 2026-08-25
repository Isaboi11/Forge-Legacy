-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- 0179 · COACH HOLT'S EXPLORATION NUDGES — the state, and the signals
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
--
-- PO: *"Coach holt should invite people to do things they haven't in the app once in a while… Subtly
-- help them explore the app to get more buy in… Plan this out appropriately so it's not annoying."*
--
-- Planned in `Docs/Coach-Holt-Exploration-Nudges-Plan.md` and signed off: eight invitations, one at a
-- time, delivered through the coin and never mid-workout. **Shipping WITHOUT push**, also signed off —
-- an ignored in-app line costs nothing, an unwanted notification costs the push permission permanently,
-- for the squad and training alerts the athlete DID ask for.
--
-- ══ WHY THE STATE IS SERVER-SIDE AND NOT AsyncStorage ══
--
-- The cadence is the entire design (3 sessions before the first, 7 days between, 21 after a dismissal,
-- never after two). Device-local state would restart that budget on a reinstall and run two independent
-- budgets on two devices — an athlete with a phone and an iPad would be nudged twice as often as the
-- rule allows, which is precisely the failure the rule exists to prevent.
--
-- ══ THE TWO HALVES ══
--
--   1. `coach_nudge_state` — per athlete, per nudge: when it was last shown, how many times it has been
--      refused, and whether the feature has since been used. Owner-scoped RLS, no exceptions.
--   2. `coach_nudge_signals()` — the counts that decide which nudges are even ELIGIBLE, in ONE round
--      trip. Eight separate client count queries on every Home focus would be eight round trips to
--      decide, most of the time, to say nothing at all.
--
-- ⚠ SECURITY INVOKER, DELIBERATELY. This function reads eight of the athlete's own tables and every one
-- of them is already owner-scoped by RLS. A `security definer` here would be a function that can read
-- ANY athlete's counts, guarded only by its own `where` clause — and `0169` is this project's record of
-- what that costs. Invoker means RLS is still the thing standing in the way, and a bug in this body can
-- leak nothing.
--
-- ⚠ `p_uid` IS NOT A PARAMETER, ON PURPOSE. It reads `auth.uid()` directly. A caller-supplied athlete id
-- would make the function's safety depend on the caller passing the right one.
--
-- Safe to run twice.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════

-- ── 1 · STATE ────────────────────────────────────────────────────────────────────────────────────────

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

-- ⚠ NO DELETE POLICY, AND THAT IS THE POINT. Deleting a row would reset a nudge the athlete has already
-- refused twice, which is the one thing the "never again" rule must survive.

-- ── 2 · SIGNALS ──────────────────────────────────────────────────────────────────────────────────────
--
-- What the athlete has and has not done. Counts only — no ids, no content.
--
-- ⚠ `sessions` GATES THE WHOLE FEATURE (nothing before 3), so it is first and it counts `workouts`, the
-- table Finish actually writes. Not `program_sessions`, which is empty for every freestyle athlete.

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
