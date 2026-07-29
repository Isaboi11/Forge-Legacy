-- Forge Legacy — 0058: Squad Records (C-6)
--
-- Backs `Forge Squad Records.dc.html` — the squad's record book. The design shows, per record, a current
-- holder AND a descending lineage of everyone who held it before. Its own words: "These marks only ever
-- rise."
--
-- TWO THINGS THE DESIGN ASSUMES THAT THE DATA CANNOT GIVE US:
--
--   1. LINEAGE WAS NEVER RECORDED. Today's holder is a query over `personal_records` / `workouts`. But
--      "Marcus held this at 440 until Theo took it in January" is a fact nobody ever wrote down, and it
--      cannot be reconstructed — the raw rows tell you who is best NOW, not who led in March and when
--      they were overtaken. So this table starts the ledger: every time a mark is beaten,
--      `refresh_squad_records()` writes a new reign, and history accrues from here forward. The sheet
--      is honest-but-thin at launch and fills in over months. It cannot be backdated, and pretending
--      otherwise would mean inventing a past.
--
--   2. THE DESIGN'S SIXTH RECORD — "Longest Streak" — IS NOT BUILT. Nothing in this product tracks a
--      streak: no table, no definition of what breaks one, no rest-day rule. Deriving it from workout
--      dates is a real piece of work with its own product decisions, and half-inventing it for one card
--      would put a number on screen that no other surface could agree with. Five records ship; the
--      sixth returns when streaks exist as a concept. `kind` has room for it.
--
-- MODEL: one row per REIGN, not per record. The current holder is simply the highest `value` for that
-- (squad, kind) — which is what "marks only ever rise" means — and everything below it, descending, IS
-- the lineage. A unique (squad, kind, holder, value) makes the refresh idempotent: re-running never
-- duplicates a mark that's already in the book.
--
-- Depends on 0029 (squads) + 0001 (personal_records, workouts). Idempotent. RUN AFTER 0057.

create table if not exists public.squad_records (
  id          uuid primary key default gen_random_uuid(),
  squad_id    uuid not null references public.squads(id) on delete cascade,
  kind        text not null check (kind in ('heaviest_lift', 'biggest_session', 'most_workouts_month', 'longest_run', 'most_prs_month')),
  holder_id   uuid not null references public.profiles(id) on delete cascade,
  value       numeric not null,
  detail      text,        -- the exercise for a lift, the month for a per-month record
  achieved_on date,        -- when the mark itself was set (not when we noticed)
  recorded_at timestamptz not null default now(),
  -- The same athlete hitting the same number twice is one mark, not two reigns.
  unique (squad_id, kind, holder_id, value)
);
create index if not exists squad_records_book on public.squad_records (squad_id, kind, value desc);

alter table public.squad_records enable row level security;

-- Read: members only, same as every other squad-internal surface. Writes go through the refresh
-- function (definer) — nothing hand-writes a record, so there is no INSERT policy for clients.
drop policy if exists squad_records_select on public.squad_records;
create policy squad_records_select on public.squad_records for select
  using (public.is_squad_member(squad_id, auth.uid()));

-- ── Refresh ───────────────────────────────────────────────────────────────────
-- Recomputes each record's current best from raw data and writes a new reign ONLY when the standing
-- mark has been beaten. SECURITY DEFINER: reads every member's workouts and PRs, which the caller
-- cannot. Lazy, like the weekly recap — called when the book is opened, since there is no scheduler.
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

-- ── The book ──────────────────────────────────────────────────────────────────
-- One read: every record with its current holder and full lineage, holders resolved to real identity.
-- SECURITY DEFINER because it joins `profiles` for members whose rows a plain member read can reach,
-- but the squad gate belongs here rather than being trusted to the caller.
create or replace function public.squad_records_book(p_squad uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.is_squad_member(p_squad, v_uid) then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(k.entry order by k.ord)
      from (
        select
          x.ord,
          jsonb_build_object(
            'kind', x.kind,
            'reigns', (
              select jsonb_agg(
                       jsonb_build_object(
                         'holder_id',   sr.holder_id,
                         'holder_name', coalesce(p.name, 'Athlete'),
                         'holder_avatar', p.avatar_url,
                         'value',       sr.value,
                         'detail',      sr.detail,
                         'achieved_on', sr.achieved_on,
                         'recorded_at', sr.recorded_at
                       )
                       -- Descending: the head of this array is the current holder, the tail is lineage.
                       order by sr.value desc
                     )
                from public.squad_records sr
                join public.profiles p on p.id = sr.holder_id
               where sr.squad_id = p_squad and sr.kind = x.kind
            )
          ) as entry
        from (values
          ('heaviest_lift', 1),
          ('biggest_session', 2),
          ('most_workouts_month', 3),
          ('longest_run', 4),
          ('most_prs_month', 5)
        ) as x(kind, ord)
      ) k
     where k.entry -> 'reigns' <> 'null'::jsonb
  ), '[]'::jsonb);
end;
$$;
