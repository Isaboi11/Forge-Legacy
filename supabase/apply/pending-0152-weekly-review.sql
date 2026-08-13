-- ══ PASTE THIS WHOLE FILE INTO THE SUPABASE SQL EDITOR ══
--
-- Verbatim copy of `supabase/migrations/0152_weekly_review_created_at.sql`. Idempotent — safe to re-run.
-- There is no Supabase CLI and no service key in this project; the dashboard is the only path.
--
-- ══ WHY THIS IS BEING APPLIED NOW ══
--
-- PO, 2026-08-13: *"I've clicked preview on it and also I've clicked skip and it keeps popping up."*
--
-- 0152 was authored on 2026-08-12 and never applied, and the Home card has been showing the consequence
-- ever since. `ensure_weekly_review()` does not return `created_at`, so `reviewWindowOpen()` reads null,
-- and null is deliberately treated as OPEN — the safe failure that stops an unapplied migration from
-- vanishing everyone's review. The cost of that safety is that **the 24-hour window has never once been
-- enforced**: the card sits on Home for the full seven days, until the next week's review replaces it.
--
-- ⚠ THERE ARE TWO FILES NUMBERED 0152 IN THIS REPO. `0152_discover_trained_today.sql` and this one. They
--   share nothing — different functions, different tables — so the order between them does not matter and
--   applying one says nothing about the other. **Check both.** This bundle is the weekly-review half.
--
-- ══ RUN THIS FIRST — IS IT ALREADY APPLIED? ══
--
--   select (select count(*) from regexp_matches(pg_get_functiondef(p.oid), '''created_at''', 'g')) as hits
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.proname = 'ensure_weekly_review';
--
--   · no rows  → 0140 was never applied either. STOP; apply `pending-0137-0143.sql` first.
--   · hits = 0 → 0152 is not applied. This bundle is what you want.
--   · hits = 2 → already applied. Running it again is harmless.
--
-- ══ WHAT CHANGES FOR AN ATHLETE ══
--
-- Nothing they can see today, and one thing they can see tomorrow. The function returns one extra field;
-- no row is written, no row is deleted, no review is altered. The card then retires itself 24 hours after
-- it first appeared instead of living out the week.
--
-- ⚠ MEASURED FROM WHEN IT APPEARED, NOT FROM MONDAY — see the migration header for why the two are not
--   the same thing and why anchoring to the week would have hidden the card from everyone who does not
--   open the app on a Monday.
--
-- ⚠ IT IS NOT THE ONLY WAY OUT ANY MORE. View and Skip now retire the card device-locally
--   (`src/lib/weekly-review-seen.ts`), which works whether or not this bundle is ever run. This migration
--   is what retires the card for somebody who simply never touches it.
--
-- VERIFY AFTER RUNNING: the three columns the footer selects. Expect `t`, `t`, and a timestamp — or null
-- on `newest_review_written_at`, which only means no athlete has completed a full week yet.
--
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

-- Forge Legacy — 0152: the weekly review stops living on the Home screen
--
-- ══ WHAT THIS CLOSES ══
--
-- PO, 2026-08-12: *"Weekly review should disappear after 24 hours."*
--
-- 0140 is lazy by design: the row is written the first time the athlete opens the app in a new week, and
-- `ensure_weekly_review()` hands the same row back on every call for the rest of that week. So the card
-- sat on Home for up to seven days. A review of last week is a thing you read once — after a day it is
-- not news, it is furniture, and Home is the screen this app can least afford to fill with furniture.
--
-- ══ ⚠ WHY A COLUMN THAT ALREADY EXISTS NEEDED A MIGRATION ANYWAY ══
--
-- `athlete_weekly_reviews.created_at` has been there since 0140 and the RPC never returned it, so the
-- client had no way to know when the card first appeared. It could have guessed from `week_start` — but
-- that would be the wrong clock. The row is written on FIRST OPEN, not on Monday: an athlete who does not
-- open the app until Wednesday first sees their review on Wednesday, and starting their 24 hours on
-- Monday would mean they never see it at all. The window has to run from when it appeared, which is
-- exactly what `created_at` is.
--
-- ⚠ AND IT IS READ BACK FROM THE ROW, not taken as `now()`. The insert carries
-- `on conflict do nothing`, so a second device may have written it moments earlier; both must measure
-- the same 24 hours from the same instant, or the card outlives itself on whichever device asked second.
-- This is the two-device rule the Train Together work paid for: derive from the shared row.
--
-- ══ WHAT THIS MIGRATION DOES NOT DO ══
--
-- It does not hide anything. The window is enforced in the client (`reviewWindowOpen`), and the review
-- itself is never deleted — `/weekly-review/[week]` still opens it, and the row stays as the snapshot
-- 0140 promises. This adds one field so the card can decide when to stand down. **A review that has
-- expired off Home is still the athlete's record; expiry is a property of the CARD, not of the week.**
--
-- ⚠ `create or replace`, and the body was transformed from 0140's by script — four asserted
--   substitutions, five structural checks that the timezone bucketing, the silence-beats-zero guard and
--   the top-lift branch all survived. Replace preserves the grant 0140 made to `authenticated`; §2
--   asserts it rather than trusting it.
--
-- Depends on 0140. Idempotent. RUN ANY TIME (order against 0151 does not matter — they touch nothing
-- in common).

-- ── 1 · `ensure_weekly_review` returns when the row was written ──────────────

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
  -- 0152. When the row was first written, which IS when the card first appeared: the review is
  -- generated lazily on the athlete's first open of the new week, so `created_at` is the moment they
  -- could first have seen it. The 24-hour window is measured from here.
  v_created timestamptz;
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
    return jsonb_build_object('week_start', v_row.week_start, 'week_end', v_row.week_end, 'review', v_row.review, 'note', v_row.note, 'created_at', v_row.created_at);
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

  -- ⚠ READ IT BACK, do not assume `now()`. `on conflict do nothing` means a second device may have
  -- written this row a moment earlier, and the window belongs to the row that exists — otherwise two
  -- devices would each start their own 24 hours from whenever they happened to ask.
  select w.created_at into v_created
    from public.athlete_weekly_reviews w
   where w.athlete_id = v_uid and w.week_start = v_prev::date;

  return jsonb_build_object('week_start', v_prev::date, 'week_end', (v_start - interval '1 day')::date, 'review', v_review, 'note', null, 'created_at', v_created);
end;
$$;

-- ── 2 · Assert ───────────────────────────────────────────────────────────────

do $$
declare v_def text;
begin
  select pg_get_functiondef(p.oid) into v_def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'ensure_weekly_review';

  if v_def is null then
    raise exception '0152: ensure_weekly_review does not exist — 0140 has not been applied.';
  end if;

  -- BOTH return paths, not one. The already-generated path is the one that matters in practice (it is
  -- what every call after the first hits), and it is also the easy one to miss.
  if (length(v_def) - length(replace(v_def, '''created_at''', ''))) / 12 <> 2 then
    raise exception '0152: created_at is not returned on both paths — the replace did not land, or landed once.';
  end if;

  -- The branches that make this function what it is.
  if v_def not like '%date_trunc(''week'', now() at time zone v_tz)%'
     or v_def not like '%coalesce(p.tz, ''UTC'')%'
     or v_def not like '%if v_workouts = 0 then%' then
    raise exception '0152: the rebuild lost the timezone bucketing or the silence-beats-zero guard.';
  end if;

  if not has_function_privilege('authenticated', 'public.ensure_weekly_review()', 'execute') then
    raise exception '0152: authenticated lost EXECUTE — run: grant execute on function public.ensure_weekly_review() to authenticated;';
  end if;
end $$;

-- ── 3 · Result, as ROWS ──────────────────────────────────────────────────────
--
-- Expect: t, t, and a timestamp or null. Null just means you have not trained a full week yet — the row
-- is only written for a week with something in it.

select
  (select count(*) = 2 from regexp_matches(pg_get_functiondef(p.oid), '''created_at''', 'g')
     where true)                                                       as returns_created_at_twice_expect_t,
  has_function_privilege('authenticated', 'public.ensure_weekly_review()', 'execute')
                                                                       as authenticated_can_call_expect_t,
  (select max(created_at) from public.athlete_weekly_reviews)          as newest_review_written_at
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'ensure_weekly_review';
