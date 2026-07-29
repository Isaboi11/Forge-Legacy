-- Forge Legacy — 0048: squad daily check-ins + cross-member goal totals
--
-- Two things that make a multi-person squad feel alive:
--   1. `squad_checkins` — one row per member per squad per day: 'trained' (optionally a note) or 'rest'. Powers
--      the "Today's Check-ins" carousel + the real "N training today" (was a solo workout proxy).
--   2. `squad_metric_total(...)` — sums a goal metric across ALL squad members (was owner-only via
--      goal_metric_value). SECURITY DEFINER so it can read every member's workouts, gated to members.
-- RUN BY HAND in the SQL editor.

create table if not exists public.squad_checkins (
  squad_id     uuid not null references public.squads(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  checkin_date date not null,
  status       text not null check (status in ('trained', 'rest')),
  note         text,
  created_at   timestamptz not null default now(),
  primary key (squad_id, user_id, checkin_date)
);
create index if not exists squad_checkins_today on public.squad_checkins (squad_id, checkin_date);

alter table public.squad_checkins enable row level security;

drop policy if exists squad_checkins_select on public.squad_checkins;
drop policy if exists squad_checkins_insert on public.squad_checkins;
drop policy if exists squad_checkins_update on public.squad_checkins;
drop policy if exists squad_checkins_delete on public.squad_checkins;
create policy squad_checkins_select on public.squad_checkins for select
  using (public.is_squad_member(squad_id, auth.uid()));
create policy squad_checkins_insert on public.squad_checkins for insert with check (
  user_id = auth.uid() and public.is_squad_member(squad_id, auth.uid())
);
create policy squad_checkins_update on public.squad_checkins for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy squad_checkins_delete on public.squad_checkins for delete
  using (user_id = auth.uid());

-- ── Cross-member goal total ──────────────────────────────────────────────────
-- Same metric kinds as goal_metric_value (0035/0037), summed across every member of the squad.
create or replace function public.squad_metric_total(p_squad uuid, p_kind text, p_key text, p_started_at timestamptz)
returns numeric
language sql
security definer
stable
set search_path = public
as $$
  select case
    when not public.is_squad_member(p_squad, auth.uid()) then 0
    when p_kind = 'workout_count' then coalesce((
      select count(*) from public.workouts w
      join public.squad_members sm on sm.user_id = w.athlete_id
      where sm.squad_id = p_squad and w.saved_at >= coalesce(p_started_at, '-infinity'::timestamptz)
    ), 0)
    when p_kind = 'distance_total' then coalesce((
      select sum(w.distance) from public.workouts w
      join public.squad_members sm on sm.user_id = w.athlete_id
      where sm.squad_id = p_squad and w.distance is not null
        and (p_key is null or w.activity_type::text = p_key)
        and w.saved_at >= coalesce(p_started_at, '-infinity'::timestamptz)
    ), 0)
    when p_kind = 'volume_total' then coalesce((
      select sum(ws.weight * ws.reps) from public.workout_sets ws
      join public.workout_exercises we on we.id = ws.workout_exercise_id
      join public.workouts w on w.id = we.workout_id
      join public.squad_members sm on sm.user_id = w.athlete_id
      where sm.squad_id = p_squad and w.saved_at >= coalesce(p_started_at, '-infinity'::timestamptz)
    ), 0)
    when p_kind = 'time_total' then coalesce((
      select sum(w.duration_sec) from public.workouts w
      join public.squad_members sm on sm.user_id = w.athlete_id
      where sm.squad_id = p_squad and w.saved_at >= coalesce(p_started_at, '-infinity'::timestamptz)
    ), 0) / 3600.0
    when p_kind = 'pr_count' then coalesce((
      select count(*) from public.personal_records pr
      join public.squad_members sm on sm.user_id = pr.athlete_id
      where sm.squad_id = p_squad and pr.achieved_on >= coalesce(p_started_at::date, '-infinity'::date)
    ), 0)
    else 0
  end;
$$;
