-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0252: a squad's record book counts only what each member did after joining (QA 09-26 social-27)
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: the function is replaced with the same text, and the cleanup only removes a
-- join-month record that the next open of the book writes back. §3 is read-only.
--
-- ⚠ 0249–0251 are skipped on purpose: an unfinished medium-bug pass (worktree med-social2-wt) holds an
--   uncommitted, unapplied 0251 that rewrites the inbox and squad goal functions. This file touches
--   neither — only `refresh_squad_records` (last defined in 0058) and old `squad_records` rows.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  replaces `refresh_squad_records()` with 0058's body plus one `joined_at` bound in each of its five
--     branches, then deletes old reigns that predate their holder's join (current members only).
-- §2  RAISES unless the live function source carries all five bounds.
-- §3  reports records per kind, and how many still predate their holder's join. Read-only.
--
-- ⚠ PREDICTION FOR §3: `still_before_join` = 0 on every row. Anything else means the cleanup missed.
-- ⚠ The book is refreshed lazily when someone opens it (0058), so a squad whose records were all
--   deleted shows its correct holders the next time a member opens Records. No app update is needed.

-- ═════════════════════════════════════════════════════════════════════════════
-- §1 — THE STATEMENTS (verbatim from supabase/migrations/0252_squad_records_from_join.sql)
-- ═════════════════════════════════════════════════════════════════════════════

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

-- ═════════════════════════════════════════════════════════════════════════════
-- §2 — ASSERT
-- ═════════════════════════════════════════════════════════════════════════════

do $$
declare
  v_src text;
  v_n int;
begin
  select pg_get_functiondef('public.refresh_squad_records(uuid)'::regprocedure) into v_src;
  v_n := (length(v_src) - length(replace(v_src, 'sm.joined_at', ''))) / length('sm.joined_at');
  if v_n <> 5 then
    raise exception '0252: refresh_squad_records has % joined_at bounds, expected 5', v_n;
  end if;
end;
$$;

-- ═════════════════════════════════════════════════════════════════════════════
-- §3 — REPORT (read-only)
-- ═════════════════════════════════════════════════════════════════════════════

select sr.kind,
       count(*) as records,
       count(*) filter (
         where sm.user_id is not null and sr.achieved_on is not null and (
           (sr.kind in ('heaviest_lift', 'biggest_session', 'longest_run') and sr.achieved_on < sm.joined_at::date)
           or (sr.kind in ('most_workouts_month', 'most_prs_month') and sr.achieved_on <= sm.joined_at::date)
         )
       ) as still_before_join
  from public.squad_records sr
  left join public.squad_members sm on sm.squad_id = sr.squad_id and sm.user_id = sr.holder_id
 group by sr.kind
 order by sr.kind;
