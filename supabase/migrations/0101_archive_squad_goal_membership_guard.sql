-- Forge Legacy — 0101: `archive_squad_goal` asks who is calling
--
-- Found by the 2026-08-02 full audit, in a sweep of every mutating function for an authority decision.
--
-- `archive_squad_goal(p_squad uuid)` shipped in 0099 as SECURITY DEFINER with NO check of any kind. It
-- takes a squad id and runs as the function owner, so RLS on `squads`, `squad_members` and
-- `squad_goal_completions` does not apply to it. Every sibling in the family — `ensure_weekly_recap`,
-- `refresh_squad_records` — opens with exactly the guard this one is missing:
--
--     if v_uid is null or not public.is_squad_member(p_squad, v_uid) then ...
--
-- ══ WHAT IT ACTUALLY EXPOSED ══
--
-- Not goal FORGERY. The function archives only a goal that is genuinely met (`v_progress >= v_target`)
-- and the insert is `on conflict do nothing`, so a stranger could not fabricate a completion — at worst
-- they wrote the same row the squad's own client would have written.
--
-- The real exposure is a DISCLOSURE ORACLE. The boolean return says whether an arbitrary squad has met
-- its current goal, and squads are private by design (SQ-D16 made joining request-only). Anyone holding
-- the anon key could walk squad ids and learn which private squads had just completed a goal, without
-- being in any of them. Small, but it is information about a closed group leaking to someone outside it,
-- and it is the exact class the Performance Firewall exists to prevent.
--
-- ══ MEMBER, NOT OWNER ══
--
-- Deliberately `is_squad_member` rather than an owner check, matching its siblings. Archiving is
-- bookkeeping that fires when any member's client notices the goal is complete — gating it to the owner
-- would mean a squad whose owner is inactive silently loses its record of finished goals, which is the
-- very failure 0099 added this function to prevent.
--
-- Behaviour for a legitimate caller is UNCHANGED. No catalog row, honor, or existing completion is
-- touched; `squad_goal_completions` rows already written stay exactly as they are.
--
-- Depends on 0099. Idempotent. RUN AFTER 0099 (and after 0100 if you have not run that yet — order
-- between 0100 and 0101 does not matter, they touch different functions).

begin;

create or replace function public.archive_squad_goal(p_squad uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_goal     text;
  v_target   int;
  v_kind     text;
  v_key      text;
  v_started  timestamptz;
  v_progress numeric;
begin
  -- THE GUARD THIS FUNCTION SHIPPED WITHOUT. Same shape as `ensure_weekly_recap` / `refresh_squad_records`.
  -- Returns false rather than raising: "nothing was archived" is the honest answer to a caller with no
  -- business here, and it keeps the return type meaning one thing.
  if v_uid is null or not public.is_squad_member(p_squad, v_uid) then
    return false;
  end if;

  select sq.goal, sq.goal_target, sq.goal_metric_kind, sq.goal_metric_key, sq.goal_started_at
    into v_goal, v_target, v_kind, v_key, v_started
    from public.squads sq where sq.id = p_squad;

  if v_target is null or v_started is null then
    return false;
  end if;

  v_progress := public.squad_metric_sum(p_squad, coalesce(v_kind, 'workout_count'), v_key, v_started);
  if v_progress is null or v_progress < v_target then
    return false;
  end if;

  insert into public.squad_goal_completions (squad_id, started_at, goal, target, metric_kind, metric_key)
  values (p_squad, v_started, v_goal, v_target, coalesce(v_kind, 'workout_count'), v_key)
  on conflict (squad_id, started_at) do nothing;

  return found;
end;
$$;

-- ── SELF-CHECK ───────────────────────────────────────────────────────────────
--
-- Runs the function as an unauthenticated caller (auth.uid() is null in the SQL editor), which must now
-- take the guard's early return rather than reading another squad's goal. PL/pgSQL binds names at run
-- time, so executing it is the only way to know the rewritten body compiles AND behaves.
do $$
declare
  v_result boolean;
begin
  select public.archive_squad_goal('00000000-0000-0000-0000-000000000000'::uuid) into v_result;
  if v_result is not false then
    raise exception 'archive_squad_goal: expected false for a non-member, got %', v_result;
  end if;
  raise notice 'archive_squad_goal OK — a non-member is now refused.';
end $$;

commit;

-- ══════════════════════════════════════════════════════════════════════════════
-- VERIFY
-- ══════════════════════════════════════════════════════════════════════════════
--
--   select public.archive_squad_goal('<a squad you are NOT in>'::uuid);   -- expect: false
--   select public.archive_squad_goal('<your own squad>'::uuid);           -- expect: true once its goal is met
--
-- Then confirm nothing was lost:
--   select count(*) from public.squad_goal_completions;   -- same as before this migration
