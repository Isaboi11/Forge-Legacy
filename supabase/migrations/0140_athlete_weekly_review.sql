-- Forge Legacy — 0140: your week, from Holt
--
-- ══ WHAT THIS IS ══
--
-- PO: *"the coach can give a weekly review in the paid tier. How this week was and how we did.
-- Encourage on other things and keep people engaged."*
--
-- Nothing in the app summarises an ATHLETE's own week. The only weekly review that exists is the SQUAD
-- recap (0057), one level up. This is that shape, for one person.
--
-- ══ FOUR DECISIONS INHERITED FROM 0057 VERBATIM, BECAUSE THEY WERE RIGHT THERE ══
--
--   1. **LAZY, NO SCHEDULER.** `ensure_weekly_review()` writes the row the first time the athlete opens
--      the app in a new week, and is a no-op after that. Same result as a cron, no infrastructure.
--
--   2. **SNAPSHOTTED, NEVER RECOMPUTED.** A week's summary must not silently change afterwards because
--      somebody later deleted a workout — it is a record of what that week WAS.
--
--   3. **SILENCE BEATS ZERO.** A week with no workouts returns null and writes nothing. "0 sessions,
--      keep going!" is the nudge-to-engage Product DNA §8/§10 forbids, and it is the exact tone the
--      Active Workout spec bars from the rest of the app.
--
--   4. **THE WINDOW IS THE WEEK THAT CLOSED**, not the one in progress.
--
-- ══ ⚠ ONE DELIBERATE DEPARTURE: THE ATHLETE'S OWN TIMEZONE ══
--
-- 0057 buckets on the server clock. That is defensible for a squad spread across zones — there is no
-- single "their" week — but wrong for one person: a Sunday-evening session in UTC−8 lands in Monday
-- UTC and would be counted in the wrong week's review. `profiles.tz` (0099) exists and is written on
-- every launch, so this is the first athlete-facing surface to use it.
--
-- ⚠ THIS MEANS TWO DEFINITIONS OF "WEEK" NOW EXIST. `rank.ts`'s `mondayWeekKey` buckets in UTC and
-- documents that limitation at its own definition. Accepted rather than hidden: rank counts active
-- weeks over a training lifetime, where one boundary session is noise, and a review names one specific
-- week to one specific person, where it is the whole content. Do not "fix" one by pointing it at the
-- other without deciding which surface is wrong.
--
-- ══ WHY A TABLE AND NOT A POST ══
--
-- 0057 lives in `squad_posts` because SQ-D8 requires the recap to BE a feed entry. An athlete has no
-- feed, so a dedicated table is the honest shape — and the primary key `(athlete_id, week_start)` is
-- the idempotency guarantee, where 0057 needed a partial unique index to get the same thing.
--
-- ══ WHAT IS NOT HERE ══
--
-- ⚠ NO WEEK-OVER-WEEK COMPARISON. It is the one field that would turn a review into the scoreboard
-- `Active-Workout-Flow-Spec-W9-W16` §6.2 bars, and the review is worth reading without it. If it ever
-- ships, the copy rule has to be: a decline is stated once, plainly, and immediately followed by the
-- instruction — that is coaching; the number alone is a grade.
--
-- ⚠ AND NO ENTITLEMENT CHECK. The row is written for EVERYONE; the paid gate lives on the SURFACE.
-- Three reasons: this is a snapshot, so a week not captured is gone forever; somebody who upgrades in
-- March should find February waiting; and gating generation means the paid tier's first review is empty.
--
-- Idempotent. Depends on 0001 (workouts), 0099 (profiles.tz). RUN AFTER 0139.

begin;

create table if not exists public.athlete_weekly_reviews (
  athlete_id uuid        not null references public.profiles (id) on delete cascade,
  week_start date        not null,
  week_end   date        not null,
  review     jsonb       not null,
  -- Holt's sentence, composed by the client on first read and written back. Null until then.
  -- ⚠ The prose is NOT generated here: voice lives in one file (`rulebook/`), and a summary that
  -- re-worded itself on every read would not be the snapshot the row above promises to be.
  note       text,
  created_at timestamptz not null default now(),
  primary key (athlete_id, week_start)
);

alter table public.athlete_weekly_reviews enable row level security;

-- Yours and nobody else's. A weekly review is training history with a reading attached; CL-D7 and the
-- Performance Firewall both put it out of reach of every other athlete.
drop policy if exists athlete_weekly_reviews_own on public.athlete_weekly_reviews;
create policy athlete_weekly_reviews_own on public.athlete_weekly_reviews
  for all using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

comment on table public.athlete_weekly_reviews is
  'The athlete''s own week, snapshotted. Lazy — written by ensure_weekly_review() on the first app open of a new week, never by a scheduler. Silence beats zero: a week with no workouts writes no row.';

-- ── Generate ─────────────────────────────────────────────────────────────────────────────────────
create or replace function public.ensure_weekly_review()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_tz     text;
  v_start  timestamptz;
  v_prev   timestamptz;
  v_row    public.athlete_weekly_reviews%rowtype;
  v_workouts int;
  v_days   int;
  v_volume numeric;
  v_seconds bigint;
  v_prs    jsonb;
  v_honors jsonb;
  v_top    jsonb := null;
  v_review jsonb;
begin
  if v_uid is null then return null; end if;

  -- The athlete's own clock, falling back to UTC. See the header for why this differs from 0057.
  select coalesce(p.tz, 'UTC') into v_tz from public.profiles p where p.id = v_uid;
  if v_tz is null then return null; end if;

  v_start := date_trunc('week', now() at time zone v_tz) at time zone v_tz;
  v_prev  := v_start - interval '7 days';

  -- Already generated for the week that just ended? Hand it back untouched — snapshotted, not recomputed.
  select * into v_row
    from public.athlete_weekly_reviews
   where athlete_id = v_uid and week_start = v_prev::date;
  if found then
    return jsonb_build_object('week_start', v_row.week_start, 'week_end', v_row.week_end, 'review', v_row.review, 'note', v_row.note);
  end if;

  select count(*)::int,
         count(distinct date_trunc('day', w.saved_at at time zone v_tz))::int,
         coalesce(sum(w.duration_sec), 0)
    into v_workouts, v_days, v_seconds
    from public.workouts w
   where w.athlete_id = v_uid and w.saved_at >= v_prev and w.saved_at < v_start;

  /*
   * ⚠ VOLUME IS DERIVED, NOT STORED. `workouts` has no `volume` column — it never has — so this sums
   * the sets, which is the same arithmetic `computeStats` does client-side. A bodyweight set carries
   * `weight = 0` (a real answer meaning "nothing on the bar") and contributes nothing, which is
   * correct; a set with a NULL weight was never logged and is excluded rather than counted as zero.
   */
  select coalesce(sum(ws.weight * ws.reps), 0)
    into v_volume
    from public.workout_sets ws
    join public.workout_exercises we on we.id = ws.workout_exercise_id
    join public.workouts w on w.id = we.workout_id
   where w.athlete_id = v_uid
     and w.saved_at >= v_prev and w.saved_at < v_start
     and ws.weight is not null and ws.reps is not null;

  -- ⚠ SILENCE BEATS ZERO. Nothing is written, so nothing can be shown — see the header.
  if v_workouts = 0 then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('exercise', pr.exercise, 'value', pr.load_value) order by pr.achieved_on), '[]'::jsonb)
    into v_prs
    from public.personal_records pr
   where pr.athlete_id = v_uid and pr.achieved_on >= v_prev::date and pr.achieved_on < v_start::date;

  select coalesce(jsonb_agg(jsonb_build_object('honor', h.display_name) order by h.date_earned), '[]'::jsonb)
    into v_honors
    from public.honor_instances h
   where h.athlete_id = v_uid and h.date_earned >= v_prev::date and h.date_earned < v_start::date;

  -- The single heaviest working set of the week, for the one line a review can lead with.
  select jsonb_build_object('name', we.name, 'weight', ws.weight, 'reps', ws.reps)
    into v_top
    from public.workout_sets ws
    join public.workout_exercises we on we.id = ws.workout_exercise_id
    join public.workouts w on w.id = we.workout_id
   where w.athlete_id = v_uid and w.saved_at >= v_prev and w.saved_at < v_start and ws.weight is not null
   order by ws.weight desc, ws.reps desc
   limit 1;

  v_review := jsonb_build_object(
    'workouts', v_workouts,
    'days_trained', v_days,
    'volume_lb', round(v_volume),
    'duration_sec', v_seconds,
    'prs', v_prs,
    'honors', v_honors,
    'top_lift', v_top
  );

  insert into public.athlete_weekly_reviews (athlete_id, week_start, week_end, review)
  values (v_uid, v_prev::date, (v_start - interval '1 day')::date, v_review)
  on conflict (athlete_id, week_start) do nothing;

  return jsonb_build_object('week_start', v_prev::date, 'week_end', (v_start - interval '1 day')::date, 'review', v_review, 'note', null);
end;
$$;

comment on function public.ensure_weekly_review() is
  'Writes and returns the athlete''s review for the week that just closed, or null when they did not train. Lazy and idempotent — the first call in a new week generates, every later one reads. Bucketed in profiles.tz, unlike 0057''s squad recap, because one athlete has one clock.';

revoke execute on function public.ensure_weekly_review() from public;
grant  execute on function public.ensure_weekly_review() to authenticated;

-- ── Holt's sentence, written back once ───────────────────────────────────────────────────────────
create or replace function public.set_weekly_review_note(p_week_start date, p_note text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.athlete_weekly_reviews
     set note = nullif(btrim(p_note), '')
   where athlete_id = auth.uid()
     and week_start = p_week_start
     -- ⚠ ONLY ONCE. A note that could be rewritten would make the snapshot mutable through the back
     -- door — the numbers would be frozen and the sentence about them would not.
     and note is null;
$$;

revoke execute on function public.set_weekly_review_note(date, text) from public;
grant  execute on function public.set_weekly_review_note(date, text) to authenticated;

commit;

-- ══ SELF-CHECK ══════════════════════════════════════════════════════════════════════════════════════
do $$
begin
  if to_regclass('public.athlete_weekly_reviews') is null then
    raise exception '0140 self-check: the table was not created';
  end if;
  if to_regprocedure('public.ensure_weekly_review()') is null then
    raise exception '0140 self-check: ensure_weekly_review was not created';
  end if;
  raise notice '0140: weekly reviews ready. They generate on the first app open of a new week.';
end;
$$;
