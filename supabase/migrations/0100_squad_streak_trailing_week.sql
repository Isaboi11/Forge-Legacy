-- Forge Legacy — 0100: the squad streak stops punishing rest days
--
-- SQ-D6 defines a qualifying day as at least half the squad's current members training THAT DAY. That
-- reads fine for a large squad and badly for a real one: in a squad of two it demands somebody train
-- every single day, so both members taking the same Sunday off resets a hundred-day streak.
--
-- It is the same flaw Perfect Week had, and 0099 fixed that one — an honor that quietly asks a group to
-- train through their rest days, in an app whose whole posture is that rest is part of the work. It was
-- simply less visible here, because it only bites when the rest days line up.
--
-- A day now counts when at least half the current members have trained at some point in the SEVEN DAYS
-- ending that day. An individual's day off, or a light week, is absorbed. The streak breaks when the
-- squad genuinely goes quiet, which is what the honor was always trying to measure — and it stays
-- meaningfully different from Perfect Week, which asks every member to clear the standard rather than
-- asking only that the squad is alive.
--
-- NOTHING ELSE CHANGES. `honor_metrics` is restated in full because a function must be, not because any
-- other metric moved; `max_squad_streak` is the only altered expression. No catalog row, threshold,
-- honor id or earned instance is touched — an athlete who already holds 7-Day Squad Streak keeps it, and
-- honors are granted once and never revoked, so a recomputed streak can only ever add.
--
-- Depends on 0099. Idempotent. RUN AFTER 0099.

begin;

create or replace function public.honor_metrics(p_uid uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_friends  int := 0;
  v_captures int := 0;
  v_tz       text;
  v_squad    boolean;
begin
  if auth.uid() is not null and p_uid <> auth.uid() then
    raise exception 'honor_metrics: may only be called for yourself';
  end if;

  select pr.tz into v_tz from public.profiles pr where pr.id = p_uid;

  -- Read defensively: these tables arrive in later migrations than some deployments may have applied,
  -- and an honor family should degrade to "not yet earned" rather than take the whole evaluation down.
  if to_regclass('public.friendships') is not null then
    execute 'select count(*) from public.friendships where status = ''ACCEPTED'' and $1 in (low_id, high_id)'
      into v_friends using p_uid;
  end if;
  if to_regclass('public.transformation_entries') is not null then
    execute 'select count(*) from public.transformation_entries where athlete_id = $1'
      into v_captures using p_uid;
  end if;

  -- Whether to compute the squad block at all. These are the only genuinely expensive metrics here and
  -- `evaluate_honors` runs on every workout save, so an athlete in no squad pays nothing for them.
  select exists (select 1 from public.squad_members m where m.user_id = p_uid) into v_squad;

  return jsonb_build_object(
    -- ── unchanged from 0082 ────────────────────────────────────────────────
    'workouts_total',  (select count(*) from workouts where athlete_id = p_uid),
    'hours_forged',    (select coalesce(sum(duration_sec), 0) / 3600.0 from workouts where athlete_id = p_uid),
    'chapters_sealed', (select count(*) from chapters where athlete_id = p_uid and sealed_at is not null),
    'goals_achieved',  (select count(*) from goals where athlete_id = p_uid and achieved_at is not null),
    'active_weeks',    (select count(distinct date_trunc('week', saved_at)) from workouts where athlete_id = p_uid),
    'combined_lifts',  public.lift_best_lb(p_uid, 'barbell-bench-press')
                     + public.lift_best_lb(p_uid, 'barbell-back-squat')
                     + public.lift_best_lb(p_uid, 'barbell-deadlift'),
    'challenges_won',     (select count(*) from public.challenge_results r where r.user_id = p_uid and r.is_winner),
    'challenges_entered', (select count(*) from public.challenge_results r where r.user_id = p_uid),
    'lifetime_volume', (
      select coalesce(sum(
        case when lower(coalesce(ws.weight_unit, 'lb')) = 'kg' then ws.weight * 2.20462 else ws.weight end
        * ws.reps), 0)
        from workout_sets ws
        join workout_exercises we on we.id = ws.workout_exercise_id
        join workouts w on w.id = we.workout_id
       where w.athlete_id = p_uid and ws.weight is not null and ws.reps is not null
    ),
    'partnered_sessions', (
      select count(*) from workouts w where w.athlete_id = p_uid and array_length(w.partners, 1) > 0
    ),
    'same_partner_max', (
      select coalesce(max(c), 0) from (
        select count(*) as c from workouts w, unnest(w.partners) as p(name)
         where w.athlete_id = p_uid group by p.name
      ) t
    ),
    'distinct_partners', (
      select count(distinct p.name) from workouts w, unnest(w.partners) as p(name) where w.athlete_id = p_uid
    ),
    'comeback_days', (
      select coalesce(max(gap), 0) from (
        select (w.saved_at::date - lag(w.saved_at::date) over (order by w.saved_at))::numeric as gap
          from workouts w where w.athlete_id = p_uid
      ) g
    ),
    'prs_recorded', (select count(*) from public.personal_records pr where pr.athlete_id = p_uid),
    'goals_set',    (select count(*) from public.goals g where g.athlete_id = p_uid),
    'connections',  (select count(*) from public.squad_members m where m.user_id = p_uid) + v_friends,
    'captures_recorded', v_captures,
    'reflections_written',
      (select count(*) from public.chapters c where c.athlete_id = p_uid and btrim(coalesce(c.reflection, '')) <> '')
      + (select count(*) from public.accomplishments a where a.athlete_id = p_uid and btrim(coalesce(a.note, '')) <> ''),
    'has_standard', (
      select case when btrim(coalesce(p.standard, '')) <> '' then 1 else 0 end
        from public.profiles p where p.id = p_uid
    ),
    'best_week_sessions', (
      select coalesce(max(cnt), 0) from (
        select count(*) over (
                 order by w.saved_at
                 range between interval '6 days' preceding and current row
               ) as cnt
          from workouts w where w.athlete_id = p_uid
      ) t
    ),

    -- ── NEW · always ───────────────────────────────────────────────────────
    -- For honors gated purely on OTHER honors (the Prestige Named Combinations). The catalog's shape is
    -- metric ≥ threshold, so a constant satisfies it and `honor_requires` carries the real rule.
    'always', 1,
    -- The counterpart. `hidden_triple_threat` is awarded by an explicit branch at the end of the
    -- evaluator, not by threshold — and with metric `always` the generic loop would have handed it to
    -- every athlete on their first evaluation, which is the opposite of hidden.
    'never', 0,

    -- ── NEW · Programs ─────────────────────────────────────────────────────
    'programs_graduated', (
      select count(*) from public.programs p where p.athlete_id = p_uid and p.state = 'graduated'
    ),

    -- ── NEW · Longevity as TENURE ──────────────────────────────────────────
    -- Distinct from the shipped comeback honors, which measure time AWAY. This is time since the account
    -- was created — the locked catalog's actual Longevity family, which had never been authored.
    'account_days', (
      select greatest(0, (current_date - pr.created_at::date))::numeric from public.profiles pr where pr.id = p_uid
    ),

    -- ── NEW · Squad ────────────────────────────────────────────────────────
    'squads_founded', (
      select count(*) from public.squads s where s.owner_id = p_uid
    ),
    -- Distinct DAYS on which the athlete posted a check-in to a squad, not raw rows: fifty videos in one
    -- afternoon is one day of showing up, and counting rows would make Team Player a posting target.
    'squad_checkins_logged', (
      select count(distinct ck.created_at::date) from public.squad_checkins ck where ck.user_id = p_uid
    ),
    -- Every workout logged by any CURRENT member of any squad the athlete belongs to, each counted once.
    -- A squad-collective figure: "your squads have logged N sessions together".
    'squad_workouts', case when not v_squad then 0 else (
      select count(distinct w.id)
        from public.squad_members me
        join public.squad_members mate on mate.squad_id = me.squad_id
        join public.workouts w on w.athlete_id = mate.user_id and w.state = 'saved'
       where me.user_id = p_uid
    ) end,
    -- A perfect week: an ISO week in which EVERY current member met the squad's OWN standard.
    --
    -- Counted from LOGGED WORKOUTS. The obvious source would be check-ins, and this was written against
    -- them — but `squad_checkins` has been ephemeral video stories since 0049 dropped 0048's daily
    -- trained/rest table, so that record does not exist. Workouts are the stronger evidence regardless.
    --
    -- Calendar weeks rather than rolling ones: the doc says "a 7-day window" without saying how
    -- overlapping windows count, and fourteen perfect days should be two perfect weeks, not eight.
    --
    -- A member who trained NOTHING that week produces no row at all, so the count falls short of the
    -- roster and the week does not qualify — the intended reading of "every current member".
    'perfect_weeks', case when not v_squad then 0 else (
      select count(*) from (
        select per.squad_id, per.wk
          from (
            select me.squad_id,
                   date_trunc('week', w.saved_at) as wk,
                   w.athlete_id,
                   count(distinct w.saved_at::date) as days
              from public.squad_members me
              join public.squad_members mate on mate.squad_id = me.squad_id
              join public.workouts w
                on w.athlete_id = mate.user_id and w.state = 'saved' and w.saved_at is not null
             where me.user_id = p_uid
             group by me.squad_id, date_trunc('week', w.saved_at), w.athlete_id
          ) per
         group by per.squad_id, per.wk
        having count(*) filter (
                 where per.days >= (select sq.weekly_standard from public.squads sq where sq.id = per.squad_id))
             = (select count(*) from public.squad_members m2 where m2.squad_id = per.squad_id)
      ) pw
    ) end,
    -- Squad goals finished, across every squad the athlete belongs to. Counted from the archive, because
    -- the live goal columns hold only the current one.
    'squad_goals_completed', case when not v_squad then 0 else (
      select count(*) from public.squad_goal_completions gc
       where gc.squad_id in (select sm.squad_id from public.squad_members sm where sm.user_id = p_uid)
    ) end,
    -- The squad streak: consecutive days on which the squad was STILL GOING.
    --
    -- SQ-D6 defines a qualifying day as at least half the current members (rounded up) training THAT DAY.
    -- That reads fine for a large squad and badly for a real one: in a squad of two it demands somebody
    -- train every single day, so both members taking the same Sunday off resets a hundred-day streak. It
    -- is the same flaw Perfect Week had — an honor that quietly asks a group to train through their rest
    -- days — just less visible, because it only bites when the rest days line up.
    --
    -- So the bar is met over a TRAILING WEEK rather than on the day itself: a day counts when at least
    -- half the current members have trained at some point in the seven days ending that day. An
    -- individual's day off, or a light week, is absorbed completely. The streak breaks when the squad
    -- actually goes quiet — more than half of it having trained nothing in a week — which is the thing
    -- the honor was always trying to measure.
    --
    -- This also keeps it meaningfully different from Perfect Week, which asks every member to clear the
    -- standard. This one asks only that the squad is alive.
    'max_squad_streak', case when not v_squad then 0 else (
      select coalesce(max(run_len), 0) from (
        select count(*) as run_len
          from (
            select q.squad_id, (q.day - (row_number() over (partition by q.squad_id order by q.day))::int) as grp
              from (
                -- Every day from the squad's first session to its last, kept when the trailing week
                -- clears the bar. `generate_series` rather than the set of training days, because a
                -- qualifying day need not itself contain a session.
                select sp.squad_id, d::date as day
                  from (
                    select me.squad_id, min(w.saved_at::date) as first_day, max(w.saved_at::date) as last_day
                      from public.squad_members me
                      join public.squad_members mate on mate.squad_id = me.squad_id
                      join public.workouts w
                        on w.athlete_id = mate.user_id and w.state = 'saved' and w.saved_at is not null
                     where me.user_id = p_uid
                     group by me.squad_id
                  ) sp
                  cross join lateral generate_series(sp.first_day, sp.last_day, interval '1 day') d
                 where (
                   select count(distinct w2.athlete_id)
                     from public.workouts w2
                    where w2.state = 'saved' and w2.saved_at is not null
                      and w2.saved_at::date between d::date - 6 and d::date
                      and w2.athlete_id in (
                        select m2.user_id from public.squad_members m2 where m2.squad_id = sp.squad_id)
                 ) >= ceil(
                   (select count(*) from public.squad_members m3 where m3.squad_id = sp.squad_id)::numeric / 2)
              ) q
          ) g
         group by g.squad_id, g.grp
      ) runs
    ) end,
    -- Every current member of one squad has graduated the SAME catalogue program. `source_definition_id`
    -- is what makes "the same program" answerable across athletes — an athlete's program row is their
    -- own, but two rows sharing a source are two people running one plan.
    'everyone_finished_program', case when not v_squad then 0 else (
      select case when exists (
        select 1
          from public.squad_members me
          join public.programs p
            on p.state = 'graduated'
           and p.source_definition_id is not null
           and p.athlete_id in (select m2.user_id from public.squad_members m2 where m2.squad_id = me.squad_id)
         where me.user_id = p_uid
         group by me.squad_id, p.source_definition_id
        having count(distinct p.athlete_id)
             = (select count(*) from public.squad_members m3 where m3.squad_id = me.squad_id)
      ) then 1 else 0 end
    ) end,

    -- ── NEW · Prestige breadth ─────────────────────────────────────────────
    -- How many of the seven solo-achievable categories the athlete has TOPPED.
    --
    -- The locked doc never defines "top-tier". This reads it as: holding the final rung of at least one
    -- ladder in that category, where a ladder is one (metric, metric_key) — so maxing out deadlifts tops
    -- Strength, and running 15,000 lifetime miles tops Endurance. Derived from the catalog rather than a
    -- hand-listed set of ids, so it stays correct when rungs are added. Adding a HIGHER rung later can
    -- only make a category harder to top going forward; it never revokes anything, because honors are
    -- granted once and permanently.
    'categories_topped', (
      select count(*) from (
        select c.category
          from public.honor_catalog c
          join (
            select cc.category, cc.metric, coalesce(cc.metric_key, '') as mk, max(cc.threshold) as top
              from public.honor_catalog cc
             where cc.category in ('Strength', 'Training', 'Programs', 'Goals', 'Chapters', 'Longevity', 'Endurance')
             group by cc.category, cc.metric, coalesce(cc.metric_key, '')
          ) lad
            on lad.category = c.category
           and lad.metric   = c.metric
           and lad.mk       = coalesce(c.metric_key, '')
           and lad.top      = c.threshold
         where exists (
           select 1 from public.honor_instances hi
            where hi.athlete_id = p_uid and hi.honor_type = c.honor_type)
         group by c.category
      ) t
    ),

    -- ── NEW · Hidden ───────────────────────────────────────────────────────
    -- All five read the wall clock, so all five are zero without a timezone. `at time zone` on a null tz
    -- yields null and the comparison is null rather than true, but the guard is written out anyway: a
    -- reader should not have to reason about three-valued logic to see that a missing tz awards nothing.
    'sessions_before_6am', case when v_tz is null then 0 else (
      select count(*) from public.workouts w
       where w.athlete_id = p_uid and w.state = 'saved'
         and extract(hour from (w.started_at at time zone v_tz)) < 6
    ) end,
    'sessions_midnight_3am', case when v_tz is null then 0 else (
      select count(*) from public.workouts w
       where w.athlete_id = p_uid and w.state = 'saved'
         and extract(hour from (w.started_at at time zone v_tz)) < 3
    ) end,
    'sessions_new_years', case when v_tz is null then 0 else (
      select count(*) from public.workouts w
       where w.athlete_id = p_uid and w.state = 'saved'
         and to_char(w.started_at at time zone v_tz, 'MM-DD') = '01-01'
    ) end,
    'sessions_leap_day', case when v_tz is null then 0 else (
      select count(*) from public.workouts w
       where w.athlete_id = p_uid and w.state = 'saved'
         and to_char(w.started_at at time zone v_tz, 'MM-DD') = '02-29'
    ) end,
    -- Trained on the account's birthday, in a year that is not itself a Longevity year — the point is the
    -- anniversary nobody marks. Year 0 is excluded too: the day you signed up is not an anniversary.
    -- 15 and 20 join the doc's 1/3/5/10 because this migration adds those rungs; leaving them out would
    -- have fired both honors on the same day, which is precisely what the exclusion exists to prevent.
    'sessions_full_circle', case when v_tz is null then 0 else (
      select count(*) from public.workouts w
       join public.profiles pr on pr.id = p_uid
       where w.athlete_id = p_uid and w.state = 'saved'
         and to_char(w.started_at at time zone v_tz, 'MM-DD') = to_char(pr.created_at at time zone v_tz, 'MM-DD')
         and (extract(year from (w.started_at at time zone v_tz))
              - extract(year from (pr.created_at at time zone v_tz))) not in (0, 1, 3, 5, 10, 15, 20)
    ) end
  );
end;
$$;

-- ── SELF-CHECK ───────────────────────────────────────────────────────────────
--
-- Executes the rewritten function. `generate_series` over a lateral join is the most intricate SQL in
-- this file and PL/pgSQL binds none of it until run time, so a mistake here would otherwise surface at
-- somebody's next saved workout rather than now.
do $$
begin
  perform public.honor_metrics('00000000-0000-0000-0000-000000000000'::uuid);
  raise notice 'honor_metrics OK — squad streak now measured over a trailing week.';
end $$;

commit;

-- ══════════════════════════════════════════════════════════════════════════════
-- VERIFY
-- ══════════════════════════════════════════════════════════════════════════════
--
--   select jsonb_pretty(public.honor_metrics('<your-athlete-id>'::uuid));
--
-- `max_squad_streak` should be the same or HIGHER than before — the bar only got easier to hold. If it
-- dropped, something is wrong and worth reporting.
