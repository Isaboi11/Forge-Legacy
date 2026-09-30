-- Forge Legacy — 0252: a squad's records count only what each member did AFTER joining (QA 09-26 social-27)
--
-- The record book showed lifts from before the squad existed: `refresh_squad_records()` (0058) joined
-- every member's whole history. SQ-D3 Rule 6 (LOCKED) says a member contributes "from the moment they
-- join", and a record book is the same kind of squad surface. Each of the five branches now needs the mark
-- to be set at or after that member's `squad_members.joined_at` (the founder joins when the squad is made,
-- so nothing predates the squad either).
--
-- ⚠ THE FUNCTION BODY IS 0058's, COPIED BY SCRIPT, WITH FIVE ADDED LINES — one `joined_at` bound per branch.
--   Nothing else in it changed. 0058 is the only earlier definition.
-- ⚠ Old reigns that predate the holder's join are DELETED once (below), for holders who are still members.
--   The per-month records are deleted if their month began before the join, because that month's count
--   may include pre-join workouts. The book refreshes when it is opened, so the right holder is written back
--   the next time anyone opens it. A former member's reigns are kept (their join date is gone).
-- ⚠ Lifts: `personal_records` holds each athlete's BEST EVER per exercise. A best set before joining stays
--   out even if they lift close to it later — only a new PR after joining can hold the record.
--
-- Safe to run twice (a second run can only delete a join-month record that the next open writes back).
-- Depends on 0058 + 0029.

create or replace function public.refresh_squad_records(p_squad uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  r     record;
begin
  if v_uid is null or not public.is_squad_member(p_squad, v_uid) then
    return;
  end if;

  -- Each branch resolves ONE best-in-squad mark. `insert … where not exists (a better or equal mark)`
  -- is what enforces "only ever rise": a tie or a regression writes nothing.

  -- Heaviest single lift.
  for r in
    select pr.athlete_id, pr.load_value as value, pr.exercise as detail, pr.achieved_on
      from public.personal_records pr
      join public.squad_members sm on sm.user_id = pr.athlete_id
     where sm.squad_id = p_squad and pr.measure_kind::text = 'load' and pr.load_value is not null
       and pr.achieved_on >= sm.joined_at::date
     order by pr.load_value desc, pr.achieved_on asc
     limit 1
  loop
    insert into public.squad_records (squad_id, kind, holder_id, value, detail, achieved_on)
      select p_squad, 'heaviest_lift', r.athlete_id, r.value, r.detail, r.achieved_on
       where not exists (
         select 1 from public.squad_records x
          where x.squad_id = p_squad and x.kind = 'heaviest_lift' and x.value >= r.value
       )
      on conflict do nothing;
  end loop;

  -- Biggest single session, by volume.
  for r in
    select w.athlete_id, sum(ws.weight * ws.reps) as value, w.saved_at::date as achieved_on
      from public.workout_sets ws
      join public.workout_exercises we on we.id = ws.workout_exercise_id
      join public.workouts w on w.id = we.workout_id
      join public.squad_members sm on sm.user_id = w.athlete_id
     where sm.squad_id = p_squad
       and w.saved_at >= sm.joined_at
     group by w.id, w.athlete_id, w.saved_at
     order by 2 desc, 3 asc
     limit 1
  loop
    insert into public.squad_records (squad_id, kind, holder_id, value, detail, achieved_on)
      select p_squad, 'biggest_session', r.athlete_id, r.value, null, r.achieved_on
       where r.value is not null
         and not exists (
           select 1 from public.squad_records x
            where x.squad_id = p_squad and x.kind = 'biggest_session' and x.value >= r.value
         )
      on conflict do nothing;
  end loop;

  -- Most workouts in a calendar month.
  for r in
    select w.athlete_id, count(*)::numeric as value, date_trunc('month', w.saved_at)::date as month_start
      from public.workouts w
      join public.squad_members sm on sm.user_id = w.athlete_id
     where sm.squad_id = p_squad
       and w.saved_at >= sm.joined_at
     group by w.athlete_id, date_trunc('month', w.saved_at)
     order by 2 desc, 3 asc
     limit 1
  loop
    insert into public.squad_records (squad_id, kind, holder_id, value, detail, achieved_on)
      select p_squad, 'most_workouts_month', r.athlete_id, r.value, to_char(r.month_start, 'Mon YYYY'), r.month_start
       where not exists (
         select 1 from public.squad_records x
          where x.squad_id = p_squad and x.kind = 'most_workouts_month' and x.value >= r.value
       )
      on conflict do nothing;
  end loop;

  -- Longest run.
  for r in
    select w.athlete_id, w.distance as value, w.saved_at::date as achieved_on
      from public.workouts w
      join public.squad_members sm on sm.user_id = w.athlete_id
     where sm.squad_id = p_squad and w.distance is not null and w.activity_type::text = 'running'
       and w.saved_at >= sm.joined_at
     order by w.distance desc, w.saved_at asc
     limit 1
  loop
    insert into public.squad_records (squad_id, kind, holder_id, value, detail, achieved_on)
      select p_squad, 'longest_run', r.athlete_id, r.value, null, r.achieved_on
       where not exists (
         select 1 from public.squad_records x
          where x.squad_id = p_squad and x.kind = 'longest_run' and x.value >= r.value
       )
      on conflict do nothing;
  end loop;

  -- Most PRs in a calendar month.
  for r in
    select pr.athlete_id, count(*)::numeric as value, date_trunc('month', pr.achieved_on)::date as month_start
      from public.personal_records pr
      join public.squad_members sm on sm.user_id = pr.athlete_id
     where sm.squad_id = p_squad and pr.achieved_on is not null
       and pr.achieved_on >= sm.joined_at::date
     group by pr.athlete_id, date_trunc('month', pr.achieved_on)
     order by 2 desc, 3 asc
     limit 1
  loop
    insert into public.squad_records (squad_id, kind, holder_id, value, detail, achieved_on)
      select p_squad, 'most_prs_month', r.athlete_id, r.value, to_char(r.month_start, 'Mon YYYY'), r.month_start
       where not exists (
         select 1 from public.squad_records x
          where x.squad_id = p_squad and x.kind = 'most_prs_month' and x.value >= r.value
       )
      on conflict do nothing;
  end loop;
end;
$$;


-- One-time cleanup: reigns that predate their holder's join (current members only).
delete from public.squad_records sr
 using public.squad_members sm
 where sm.squad_id = sr.squad_id
   and sm.user_id = sr.holder_id
   and sr.achieved_on is not null
   and (
     (sr.kind in ('heaviest_lift', 'biggest_session', 'longest_run') and sr.achieved_on < sm.joined_at::date)
     or (sr.kind in ('most_workouts_month', 'most_prs_month') and sr.achieved_on <= sm.joined_at::date)
   );
