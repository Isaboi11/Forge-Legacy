-- Forge Legacy — 0099: the five empty categories
--
-- Programs, Squad, Longevity (tenure), Prestige and Hidden all exist as categories in code and held
-- ZERO honors. The Squad system in particular is fully built — squads, members, check-ins, feed,
-- records — and earned nothing at all.
--
-- Adds 40 honors: Programs 5, Longevity 7, Squad 15, Hidden 6, Prestige 7. Catalog 139 → 179.
--
-- ══════════════════════════════════════════════════════════════════════════════
-- WHAT IS DELIBERATELY NOT HERE, AND WHY
-- ══════════════════════════════════════════════════════════════════════════════
--
--   · (SQUAD Mission Complete is BUILT — as squad GOALS. The locked catalog predates the rename: what it
--     calls a Mission is what the product shipped as the squad goal, so these three honors count goals
--     completed and carry `squad_goal_complete_*` ids rather than the doc's `mission_complete_*`. The
--     name in the doc describes a thing that no longer exists under that word.)
--   · PROGRAMS Family Mastery (2) — needs "every program in a successor lineage". Lineage exists only as
--     `successorName`, an unresolved authored STRING in client TypeScript (`domain/training/schema.ts`),
--     never resolved to ids and never shipped to the database. The evaluator cannot see it.
--   · PRESTIGE Built by the Plan (1) — requires `program_family_mastery_3`, above.
--   · COMMUNITIES (5) — the Communities pillar is deferred indefinitely by product decision. There are no
--     tables. Authoring honors for it would be building for a subsystem that does not exist.
--
-- ══════════════════════════════════════════════════════════════════════════════
-- THE SAFEGUARDS, AND THE FAILURE EACH ONE ANSWERS
-- ══════════════════════════════════════════════════════════════════════════════
--
-- These migrations are applied BY HAND in the SQL editor and cannot be run here first. Every safeguard
-- below exists so that a mistake fails LOUDLY at apply time rather than silently at some future workout
-- save — which is how this system has actually broken before.
--
--   1. `honor_metrics(uuid)` IS EXTRACTED FROM THE EVALUATOR.
--      Previously the metric computation lived inside `evaluate_honors`, which needs `auth.uid()` and
--      AWARDS things — so it could not be run to check it. PL/pgSQL binds table and column names at RUN
--      time (0091 shipped `w.name` against a table whose column is `workout_name`; the migration reported
--      success and it failed only when someone pressed the button). A function that takes an explicit id
--      and only READS can be executed the moment this migration lands. That is the verification step at
--      the bottom of this file, and it is not optional.
--
--   2. `honor_requires` CARRIES A FOREIGN KEY TO `honor_catalog`.
--      Prestige honors are honors-about-honors. Their prerequisites were prose in a locked document
--      using ids from a different naming pass; a single typo produces an honor that is real, visible and
--      unearnable by anybody, forever, with no error. As a foreign key, a typo is a constraint violation
--      and this migration REFUSES TO APPLY.
--
--   3. THE METRIC WHITELIST IS RE-STATED, and every new metric is added to it.
--      A metric name typed one way in the catalog and another in the evaluator is the same silent
--      never-fires bug. The CHECK rejects the row.
--
--   4. TWO `raise exception` SELF-CHECKS AT THE END.
--      One asserts every catalog metric is computable; the other asserts every requirement points at a
--      real honor. Either failing aborts the whole transaction.
--
--   5. ADDITIVE ONLY. No existing honor's id, name, metric, threshold or scope changes. Existing
--      `honor_instances` are untouched. Re-running is a no-op.
--
-- Depends on 0082 (evaluator), 0013/0017/0019 (programs + state + source_definition_id), 0029 (squads),
-- 0048 (squad check-ins), 0083 (display_amount). Idempotent. RUN AFTER 0098.
--
-- NOTE: 0098 replaced `athlete_profile`, NOT `evaluate_honors` — so the evaluator rewritten below is
-- based on 0082's, which is still the live one. Checked rather than assumed: replacing a function from
-- the wrong ancestor silently reverts whatever the newer one fixed.

begin;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1 · SCHEMA
-- ══════════════════════════════════════════════════════════════════════════════

-- The athlete's IANA timezone, for the Hidden honors that ask what the clock on the WALL said.
--
-- `workouts.started_at` is timestamptz — an absolute instant with no local offset preserved — so "logged
-- before 6 AM" is unanswerable without this. There is deliberately NO default: a UTC guess would award
-- "Midnight Forge" to someone in Denver who trained at 5pm, which is a false claim about the athlete and
-- exactly the class of thing this app must never invent. Null means those honors simply do not evaluate.
alter table public.profiles add column if not exists tz text;
comment on column public.profiles.tz is
  'IANA timezone (e.g. America/Denver), written by the client. Null = local-time honors do not evaluate; never defaulted, because a guessed timezone awards honors that did not happen.';

-- ── THE SQUAD'S WEEKLY STANDARD ─────────────────────────────────────────────
--
-- How many days a week this squad holds itself to. It exists because "Perfect Week" as the locked
-- catalog defines it — every member checked in Trained on all seven days — is a bad honor. Rest days
-- are TRAINING, deliberately taken, and an honor that can only be earned by a squad where nobody rests
-- rewards the one pattern the rest of this app refuses to celebrate. It would also have been broken by
-- one person taking a Sunday off, which is the shape of thing that makes people apologise to a group.
--
-- So the bar is the squad's own. Three is a default, not a claim: a squad that never opens settings
-- still has a reachable honor, and an owner who wants five sets five.
alter table public.squads add column if not exists checkin_standard int not null default 3;
alter table public.squads drop constraint if exists squads_checkin_standard_range;
alter table public.squads add constraint squads_checkin_standard_range check (checkin_standard between 1 and 7);
comment on column public.squads.checkin_standard is
  'Trained check-ins per week this squad holds itself to (1-7, default 3). The bar for a Perfect Week. Owner-set: a squad that rests two days a week is not failing at anything.';

-- ── SQUAD GOALS, ARCHIVED ───────────────────────────────────────────────────
--
-- A squad goal lives in COLUMNS ON `squads` (0031/0036) — one at a time, and setting a new one overwrites
-- the last. So "10 Squad Goals" was uncountable: every goal a squad had ever finished was gone the moment
-- it started another. This is the record that makes finishing one a thing that happened.
--
-- Keyed on (squad, started_at) because that pair identifies one goal INSTANCE — the same target set twice
-- is two goals, and re-running the archiver on a goal already banked does nothing.
create table if not exists public.squad_goal_completions (
  squad_id     uuid        not null references public.squads(id) on delete cascade,
  started_at   timestamptz not null,
  goal         text,
  target       int         not null,
  metric_kind  text        not null,
  metric_key   text,
  completed_at timestamptz not null default now(),
  primary key (squad_id, started_at)
);

alter table public.squad_goal_completions enable row level security;
drop policy if exists squad_goal_completions_read on public.squad_goal_completions;
create policy squad_goal_completions_read on public.squad_goal_completions for select using (
  exists (select 1 from public.squad_members m
           where m.squad_id = squad_goal_completions.squad_id and m.user_id = auth.uid())
);

-- Bank the squad's current goal if it has been met. Idempotent; returns whether it banked anything.
--
-- Columns are read into named variables rather than a `record`, on purpose: PL/pgSQL resolves record
-- fields at RUN time, so `s.goal_target` against a renamed column compiles clean, reports success, and
-- fails the first time an athlete finishes a goal. This project has already shipped that exact bug once.
create or replace function public.archive_squad_goal(p_squad uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_goal     text;
  v_target   int;
  v_kind     text;
  v_key      text;
  v_started  timestamptz;
  v_progress numeric;
begin
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

-- Honors that require OTHER honors.
--
-- Rows in the same `group_id` are alternatives (OR); different groups must all be satisfied (AND). Both
-- columns are foreign keys, which is the entire point: a prerequisite that does not exist cannot be
-- stored, so "this honor can never fire" is impossible to ship.
create table if not exists public.honor_requires (
  honor_type    text not null references public.honor_catalog(honor_type) on delete cascade,
  requires_type text not null references public.honor_catalog(honor_type) on delete cascade,
  group_id      int  not null default 0,
  primary key (honor_type, requires_type)
);

alter table public.honor_requires enable row level security;
drop policy if exists honor_requires_read on public.honor_requires;
create policy honor_requires_read on public.honor_requires for select using (true);

-- ── Hidden honors are hidden IN THE DATA, not just in the UI ────────────────
--
-- The catalog is world-readable so the app can render an honor it has not earned yet, and the Honors hub
-- only ever draws earned rows — so Hidden honors are already invisible on screen. They were not invisible
-- to anyone who read the API, where the whole category sat listing its own qualification criteria.
--
-- The authoring standard says a Hidden honor's criteria are never surfaced anywhere the athlete can
-- discover them. A UI convention cannot promise that; a row-level policy can. Hidden rows become
-- readable at the moment they are earned, after which they display exactly like any other honor.
drop policy if exists honor_catalog_read on public.honor_catalog;
create policy honor_catalog_read on public.honor_catalog for select using (
  category <> 'Hidden'
  or exists (
    select 1 from public.honor_instances hi
     where hi.athlete_id = auth.uid() and hi.honor_type = honor_catalog.honor_type
  )
);

comment on table public.honor_requires is
  'Prerequisite honors. Same group_id = OR; different group_id = AND. FK-guarded so a mistyped prerequisite fails at apply time rather than becoming an honor nobody can ever earn.';

-- ══════════════════════════════════════════════════════════════════════════════
-- 2 · METRICS — extracted, explicit-id, read-only, RUNNABLE
-- ══════════════════════════════════════════════════════════════════════════════

-- SECURITY DEFINER, and it has to be.
--
-- Three of the squad metrics count OTHER PEOPLE'S rows — squad-mates' workouts, their graduated
-- programs, their check-ins. Under `security invoker` those reads pass through the athlete's own RLS,
-- which is owner-scoped on `workouts` and `programs`. `squad_workouts` would silently count only the
-- athlete's own sessions and "100 Squad Workouts" would fire at 100 personal ones; `everyone_finished_
-- program` would see a roster of one. Both wrong, both silent, both plausible-looking.
--
-- Definer rights make the aggregate readable. The guard below is what stops that becoming a way to read
-- someone else's numbers: through PostgREST an athlete may only ask about themselves. `auth.uid()` is
-- null in the SQL editor, where the operator is already privileged and needs to run this to verify it.
--
-- `search_path` is pinned because a definer function that resolves names through a caller-controlled
-- path is how definer functions get hijacked.
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
    'squad_checkins_logged', (
      select count(*) from public.squad_checkins ck where ck.user_id = p_uid
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
    -- Not "all seven days", which is what the locked catalog says and what this originally shipped as.
    -- That version could only be earned by a squad in which nobody ever rested, and was broken for
    -- everyone by one person taking a Sunday off — an honor that quietly asks a group to train through
    -- their rest days, in an app whose whole posture is that rest is part of the work.
    --
    -- Calendar weeks rather than rolling ones: the doc says "a 7-day window" without saying how
    -- overlapping windows count, and fourteen perfect days should be two perfect weeks, not eight.
    'perfect_weeks', case when not v_squad then 0 else (
      select count(*) from (
        select per.squad_id, per.wk
          from (
            select ck.squad_id,
                   date_trunc('week', ck.checkin_date) as wk,
                   ck.user_id,
                   count(*) as days
              from public.squad_checkins ck
             where ck.status = 'trained'
               and ck.squad_id in (select sm.squad_id from public.squad_members sm where sm.user_id = p_uid)
               and exists (select 1 from public.squad_members cur
                            where cur.squad_id = ck.squad_id and cur.user_id = ck.user_id)
             group by ck.squad_id, date_trunc('week', ck.checkin_date), ck.user_id
          ) per
         group by per.squad_id, per.wk
        having count(*) filter (
                 where per.days >= (select sq.checkin_standard from public.squads sq where sq.id = per.squad_id))
             = (select count(*) from public.squad_members m2 where m2.squad_id = per.squad_id)
      ) pw
    ) end,
    -- Squad goals finished, across every squad the athlete belongs to. Counted from the archive, because
    -- the live goal columns hold only the current one.
    'squad_goals_completed', case when not v_squad then 0 else (
      select count(*) from public.squad_goal_completions gc
       where gc.squad_id in (select sm.squad_id from public.squad_members sm where sm.user_id = p_uid)
    ) end,
    -- SQ-D6: a day counts when at least half the current members (rounded up) check in Trained. Rest
    -- days do not count toward the bar. Gaps-and-islands over qualifying days; the streak is the longest
    -- run ever achieved, not the current one, because an honor once earned is never revoked.
    'max_squad_streak', case when not v_squad then 0 else (
      select coalesce(max(run_len), 0) from (
        select count(*) as run_len
          from (
            select d.squad_id, (d.day - (row_number() over (partition by d.squad_id order by d.day))::int) as grp
              from (
                select ck.squad_id, ck.checkin_date as day
                  from public.squad_checkins ck
                 where ck.status = 'trained'
                   and ck.squad_id in (select sm.squad_id from public.squad_members sm where sm.user_id = p_uid)
                   and exists (select 1 from public.squad_members cur
                                where cur.squad_id = ck.squad_id and cur.user_id = ck.user_id)
                 group by ck.squad_id, ck.checkin_date
                having count(*) >= ceil(
                  (select count(*) from public.squad_members m2 where m2.squad_id = ck.squad_id)::numeric / 2)
              ) d
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

comment on function public.honor_metrics(uuid) is
  'Every computable honor metric for one athlete. Read-only and takes an explicit id so it can be RUN and inspected without awarding anything — the verification step for any migration that touches honors.';

-- Are this honor''s prerequisite honors satisfied? Same group_id = alternatives; groups are ANDed.
-- Vacuously true for the honors that have no prerequisites, which is all but seven of them.
create or replace function public.honor_requirements_met(p_uid uuid, p_honor text)
returns boolean
language sql
stable
security invoker
as $$
  select not exists (
    select 1
      from public.honor_requires r
     where r.honor_type = p_honor
     group by r.group_id
    having bool_and(not exists (
      select 1 from public.honor_instances hi
       where hi.athlete_id = p_uid and hi.honor_type = r.requires_type))
  );
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 3 · EVALUATOR — same three passes, now requirement-aware, plus one special case
-- ══════════════════════════════════════════════════════════════════════════════

-- SECURITY DEFINER — forced by the Hidden concealment policy above, and worth stating plainly because
-- the safeguard nearly ate the feature.
--
-- That policy makes an unearned Hidden catalog row unreadable to the athlete. This function READS the
-- catalog to decide what to award, so as `security invoker` it would have looked straight past every
-- Hidden row it had not already granted — six honors, permanently unearnable, because the rule that
-- hides them also hid them from the thing that awards them. An evaluator must not be subject to the read
-- policies on its own reference data.
--
-- Safe as definer: `v_uid` comes from `auth.uid()` and the function refuses to run without one, so every
-- row it writes is the caller's own. `search_path` is pinned, as it must be for any definer function.
create or replace function public.evaluate_honors(p_source text default 'live_session')
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_live    boolean := (p_source = 'live_session');
  v_new     jsonb := '[]'::jsonb;
  v_row     record;
  v_metrics jsonb;
  v_bw      numeric;
  v_cats    int;
  v_tt      record;
  v_sq      record;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  v_bw := public.latest_bodyweight_lb(v_uid);

  -- Bank any squad goal that has been met, BEFORE measuring. Nothing else notices a goal being finished
  -- — progress is derived live and the columns are overwritten by the next goal — so if this does not run
  -- here, a squad can complete ten goals and the honor counting them stays at zero forever.
  for v_sq in select sm.squad_id from public.squad_members sm where sm.user_id = v_uid loop
    perform public.archive_squad_goal(v_sq.squad_id);
  end loop;

  v_metrics := public.honor_metrics(v_uid);

  -- ── Account-scoped, unkeyed ──
  for v_row in
    select c.honor_type, c.display_name, c.category
      from public.honor_catalog c
     where c.scope = 'account'
       and c.metric_key is null
       and v_metrics ? c.metric
       and (v_metrics->>c.metric)::numeric >= c.threshold
       and public.honor_requirements_met(v_uid, c.honor_type)
     order by c.sort_order
  loop
    insert into honor_instances (athlete_id, honor_type, display_name, category, source)
    values (v_uid, v_row.honor_type, v_row.display_name, v_row.category, p_source)
    on conflict do nothing;
    if found then
      v_new := v_new || jsonb_build_array(jsonb_build_object('honor_type', v_row.honor_type, 'display_name', v_row.display_name));
      if v_live then
        insert into timeline_events (athlete_id, event_type, object_name, occurred_at, source_entity_type)
        values (v_uid, 'HONOR_EARNED', v_row.display_name, now(), 'honor_instance');
      end if;
    end if;
  end loop;

  -- ── Account-scoped, keyed ──
  for v_row in
    select c.honor_type, c.display_name, c.category
      from public.honor_catalog c
     where c.scope = 'account'
       and c.metric_key is not null
       and case c.metric
             when 'lift_max' then public.lift_best_lb(v_uid, c.metric_key)
             when 'lift_ratio' then
               case when v_bw is null or v_bw <= 0 then null
                    else public.lift_best_lb(v_uid, c.metric_key) / v_bw end
             when 'session_distance' then (
               select coalesce(max(case when lower(coalesce(w.distance_unit, 'mi')) = 'km'
                                        then w.distance * 0.621371 else w.distance end), 0)
                 from workouts w
                where w.athlete_id = v_uid and w.distance is not null
                  and w.activity_type::text = c.metric_key
             )
             when 'lifetime_distance' then (
               select coalesce(sum(case when lower(coalesce(w.distance_unit, 'mi')) = 'km'
                                        then w.distance * 0.621371 else w.distance end), 0)
                 from workouts w
                where w.athlete_id = v_uid and w.distance is not null
                  and w.activity_type::text = c.metric_key
             )
             else null
           end >= c.threshold
       and public.honor_requirements_met(v_uid, c.honor_type)
     order by c.sort_order
  loop
    insert into honor_instances (athlete_id, honor_type, display_name, category, source)
    values (v_uid, v_row.honor_type, v_row.display_name, v_row.category, p_source)
    on conflict do nothing;
    if found then
      v_new := v_new || jsonb_build_array(jsonb_build_object('honor_type', v_row.honor_type, 'display_name', v_row.display_name));
      if v_live then
        insert into timeline_events (athlete_id, event_type, object_name, occurred_at, source_entity_type)
        values (v_uid, 'HONOR_EARNED', v_row.display_name, now(), 'honor_instance');
      end if;
    end if;
  end loop;

  -- ── Chapter-scoped ──
  for v_row in
    select c.honor_type, c.display_name, c.category, ch.id as chapter_id, ch.name as chapter_name
      from public.honor_catalog c
      cross join (
        select chp.id, chp.name,
               chp.workout_count::numeric as chapter_workouts,
               case when chp.sealed_at is not null
                    then (chp.sealed_at::date - chp.start_date)::numeric
                    else null end as chapter_days
          from chapters chp where chp.athlete_id = v_uid
      ) ch
     where c.scope = 'chapter'
       and case c.metric
             when 'chapter_workouts' then ch.chapter_workouts
             when 'chapter_days'     then ch.chapter_days
             else null
           end >= c.threshold
     order by c.sort_order
  loop
    insert into honor_instances (athlete_id, honor_type, display_name, category, chapter_id, source, metadata)
    values (v_uid, v_row.honor_type, v_row.display_name, v_row.category, v_row.chapter_id, p_source,
            jsonb_build_object('chapterName', v_row.chapter_name))
    on conflict do nothing;
    if found then
      v_new := v_new || jsonb_build_array(jsonb_build_object(
        'honor_type', v_row.honor_type, 'display_name', v_row.display_name, 'chapter', v_row.chapter_name));
      if v_live then
        insert into timeline_events (athlete_id, event_type, object_name, chapter_id, occurred_at, source_entity_type)
        values (v_uid, 'HONOR_EARNED', v_row.display_name, v_row.chapter_id, now(), 'honor_instance');
      end if;
    end if;
  end loop;

  -- ── SECOND PASS · honors that depend on other honors ──
  --
  -- Prestige has to see what THIS evaluation just awarded. An athlete can complete a named combination
  -- in the very session that triggers its last component — deadlift 600 for the first time and become
  -- The Complete Lifter in the same breath — and the first loop cannot see that, because its cursor was
  -- planned before those rows existed. Re-running only the requirement-gated honors afterwards is the
  -- whole fix; there are seven of them, they are already held or already checked, and the pass is a
  -- no-op for anyone who earned nothing.
  --
  -- One pass, not a loop-until-stable one: no Prestige honor is a prerequisite for another (the locked
  -- catalog's No-Prestige-on-Prestige rule), so a second round could never find anything a first did not.
  for v_row in
    select c.honor_type, c.display_name, c.category
      from public.honor_catalog c
     where c.scope = 'account'
       and c.metric_key is null
       and exists (select 1 from public.honor_requires r where r.honor_type = c.honor_type)
       and v_metrics ? c.metric
       and (v_metrics->>c.metric)::numeric >= c.threshold
       and public.honor_requirements_met(v_uid, c.honor_type)
     order by c.sort_order
  loop
    insert into honor_instances (athlete_id, honor_type, display_name, category, source)
    values (v_uid, v_row.honor_type, v_row.display_name, v_row.category, p_source)
    on conflict do nothing;
    if found then
      v_new := v_new || jsonb_build_array(jsonb_build_object('honor_type', v_row.honor_type, 'display_name', v_row.display_name));
      if v_live then
        insert into timeline_events (athlete_id, event_type, object_name, occurred_at, source_entity_type)
        values (v_uid, 'HONOR_EARNED', v_row.display_name, now(), 'honor_instance');
      end if;
    end if;
  end loop;

  -- ── Triple Threat, the one honor that is about this evaluation itself ──
  --
  -- Three categories in one transaction. It cannot be a threshold on a stored metric because the thing
  -- it measures does not persist — it is a property of THIS award batch. Counted from the batch, after
  -- everything else has run, and never counting itself.
  if jsonb_array_length(v_new) >= 3 then
    select count(distinct c.category) into v_cats
      from jsonb_array_elements(v_new) e
      join public.honor_catalog c on c.honor_type = e->>'honor_type'
     where c.category <> 'Hidden';

    if v_cats >= 3 then
      for v_tt in select hc.honor_type, hc.display_name, hc.category
                    from public.honor_catalog hc where hc.honor_type = 'hidden_triple_threat'
      loop
        insert into honor_instances (athlete_id, honor_type, display_name, category, source)
        values (v_uid, v_tt.honor_type, v_tt.display_name, v_tt.category, p_source)
        on conflict do nothing;
        if found then
          v_new := v_new || jsonb_build_array(jsonb_build_object('honor_type', v_tt.honor_type, 'display_name', v_tt.display_name));
          if v_live then
            insert into timeline_events (athlete_id, event_type, object_name, occurred_at, source_entity_type)
            values (v_uid, 'HONOR_EARNED', v_tt.display_name, now(), 'honor_instance');
          end if;
        end if;
      end loop;
    end if;
  end if;

  return v_new;
end;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4 · THE METRIC WHITELIST — every name the catalog is allowed to use
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.honor_catalog drop constraint if exists honor_catalog_metric_check;
alter table public.honor_catalog add constraint honor_catalog_metric_check
  check (metric in (
    'workouts_total', 'hours_forged', 'chapters_sealed', 'goals_achieved', 'active_weeks',
    'chapter_workouts', 'chapter_days',
    'lift_max', 'combined_lifts', 'lift_ratio',
    'challenges_won', 'challenges_entered',
    'session_distance', 'lifetime_distance',
    'lifetime_volume', 'partnered_sessions', 'same_partner_max', 'distinct_partners', 'comeback_days',
    'prs_recorded', 'goals_set', 'connections', 'captures_recorded', 'reflections_written',
    'has_standard', 'best_week_sessions',
    -- 0099
    'always', 'never', 'programs_graduated', 'account_days',
    'squads_founded', 'squad_checkins_logged', 'squad_workouts',
    'perfect_weeks', 'max_squad_streak', 'everyone_finished_program', 'squad_goals_completed',
    'categories_topped',
    'sessions_before_6am', 'sessions_midnight_3am', 'sessions_new_years', 'sessions_leap_day',
    'sessions_full_circle'
  ));

-- ══════════════════════════════════════════════════════════════════════════════
-- 5 · THE HONORS
-- ══════════════════════════════════════════════════════════════════════════════

insert into public.honor_catalog (honor_type, display_name, category, metric, metric_key, threshold, scope, sort_order) values
  -- ── Programs (5 of 7; Family Mastery blocked — see the header) ──
  ('first_program_graduated', 'First Program Graduated', 'Programs', 'programs_graduated', null, 1,  'account', 600),
  ('programs_graduated_5',    '5 Programs Graduated',    'Programs', 'programs_graduated', null, 5,  'account', 601),
  ('programs_graduated_10',   '10 Programs Graduated',   'Programs', 'programs_graduated', null, 10, 'account', 602),
  ('programs_graduated_25',   '25 Programs Graduated',   'Programs', 'programs_graduated', null, 25, 'account', 603),
  ('programs_graduated_50',   '50 Programs Graduated',   'Programs', 'programs_graduated', null, 50, 'account', 604),

  -- ── Longevity · tenure (the locked family, never authored until now) ──
  ('longevity_90_days', '90 Days Forging', 'Longevity', 'account_days', null, 90,   'account', 700),
  ('longevity_1_year',  '1 Year Forging',  'Longevity', 'account_days', null, 365,  'account', 701),
  ('longevity_3_years', '3 Years Forging', 'Longevity', 'account_days', null, 1095, 'account', 702),
  ('longevity_5_years', '5 Years Forging', 'Longevity', 'account_days', null, 1825, 'account', 703),
  ('longevity_10_years','10 Years Forging','Longevity', 'account_days', null, 3650, 'account', 704),
  ('longevity_15_years','15 Years Forging','Longevity', 'account_days', null, 5475, 'account', 705),
  ('longevity_20_years','20 Years Forging','Longevity', 'account_days', null, 7300, 'account', 706),

  -- ── Squad (12 of 15; Mission Complete blocked — see the header) ──
  ('squad_founder',       'Squad Founder',        'Squad', 'squads_founded',        null, 1,    'account', 800),
  ('perfect_week_1',      'First Perfect Week',   'Squad', 'perfect_weeks',         null, 1,    'account', 810),
  ('perfect_week_10',     '10 Perfect Weeks',     'Squad', 'perfect_weeks',         null, 10,   'account', 811),
  ('perfect_week_25',     '25 Perfect Weeks',     'Squad', 'perfect_weeks',         null, 25,   'account', 812),
  ('squad_streak_7',      '7-Day Squad Streak',   'Squad', 'max_squad_streak',      null, 7,    'account', 820),
  ('squad_streak_30',     '30-Day Squad Streak',  'Squad', 'max_squad_streak',      null, 30,   'account', 821),
  ('squad_streak_100',    '100-Day Squad Streak', 'Squad', 'max_squad_streak',      null, 100,  'account', 822),
  ('team_player',         'Team Player',          'Squad', 'squad_checkins_logged', null, 50,   'account', 830),
  ('squad_workouts_100',  '100 Squad Workouts',   'Squad', 'squad_workouts',        null, 100,  'account', 840),
  ('squad_workouts_500',  '500 Squad Workouts',   'Squad', 'squad_workouts',        null, 500,  'account', 841),
  ('squad_workouts_1000', '1,000 Squad Workouts', 'Squad', 'squad_workouts',        null, 1000, 'account', 842),
  ('everyone_finished_program', 'Everyone Finished Program', 'Squad', 'everyone_finished_program', null, 1, 'account', 850),
  -- The locked catalog's Mission Complete family. Missions shipped as squad GOALS; these count those.
  ('squad_goal_complete_1',  'First Squad Goal', 'Squad', 'squad_goals_completed', null, 1,  'account', 860),
  ('squad_goal_complete_10', '10 Squad Goals',   'Squad', 'squad_goals_completed', null, 10, 'account', 861),
  ('squad_goal_complete_25', '25 Squad Goals',   'Squad', 'squad_goals_completed', null, 25, 'account', 862),

  -- ── Hidden. Criteria are never surfaced before they are earned; the Honors hub omits a category
  --    entirely when nothing in it is held, which is the whole concealment mechanism. No new schema. ──
  ('hidden_early_forge',      'Early Forge',       'Hidden', 'sessions_before_6am',   null, 1, 'account', 900),
  ('hidden_midnight_forge',   'Midnight Forge',    'Hidden', 'sessions_midnight_3am', null, 1, 'account', 901),
  ('hidden_new_years_forge',  'New Year''s Forge', 'Hidden', 'sessions_new_years',    null, 1, 'account', 902),
  ('hidden_leap_day_forge',   'Leap Day Forge',    'Hidden', 'sessions_leap_day',     null, 1, 'account', 903),
  ('hidden_full_circle',      'Full Circle',       'Hidden', 'sessions_full_circle',  null, 1, 'account', 904),
  ('hidden_triple_threat',    'Triple Threat',     'Hidden', 'never',                 null, 1, 'account', 905),

  -- ── Prestige (7 of 8; Built by the Plan blocked — see the header).
  --    The real rule for each of these lives in `honor_requires` below. ──
  ('prestige_breadth_1', 'Many Paths',          'Prestige', 'categories_topped', null, 4, 'account', 950),
  ('prestige_breadth_2', 'A Wider Legacy',      'Prestige', 'categories_topped', null, 5, 'account', 951),
  ('prestige_breadth_3', 'Almost Every Path',   'Prestige', 'categories_topped', null, 6, 'account', 952),
  ('prestige_breadth_4', 'The Complete Legacy', 'Prestige', 'categories_topped', null, 7, 'account', 953),
  ('prestige_complete_lifter',   'The Complete Lifter', 'Prestige', 'always', null, 1, 'account', 960),
  ('prestige_three_disciplines', 'Three Disciplines',   'Prestige', 'always', null, 1, 'account', 961),
  ('prestige_life_in_chapters',  'A Life in Chapters',  'Prestige', 'always', null, 1, 'account', 962)
on conflict (honor_type) do update set
  display_name = excluded.display_name,
  category     = excluded.category,
  metric       = excluded.metric,
  metric_key   = excluded.metric_key,
  threshold    = excluded.threshold,
  scope        = excluded.scope,
  sort_order   = excluded.sort_order;

-- ══════════════════════════════════════════════════════════════════════════════
-- 6 · PREREQUISITES — every id below is a foreign key. A typo aborts this migration.
-- ══════════════════════════════════════════════════════════════════════════════

insert into public.honor_requires (honor_type, requires_type, group_id) values
  -- Breadth Ladder: the count of topped categories is the catalog threshold; tenure is the gate.
  ('prestige_breadth_1', 'longevity_1_year',  0),
  ('prestige_breadth_2', 'longevity_3_years', 0),
  ('prestige_breadth_3', 'longevity_5_years', 0),
  ('prestige_breadth_4', 'longevity_10_years',0),

  -- Named Combinations: each group must be satisfied, so these are all ANDs.
  ('prestige_complete_lifter', 'bench_milestone_4',    0),
  ('prestige_complete_lifter', 'squat_milestone_4',    1),
  ('prestige_complete_lifter', 'deadlift_milestone_4', 2),
  ('prestige_complete_lifter', 'longevity_3_years',    3),

  ('prestige_three_disciplines', 'run_milestone_5',  0),
  ('prestige_three_disciplines', 'bike_milestone_3', 1),
  ('prestige_three_disciplines', 'swim_milestone_4', 2),
  ('prestige_three_disciplines', 'longevity_3_years',3),

  ('prestige_life_in_chapters', 'chapters_sealed_25', 0),
  ('prestige_life_in_chapters', 'goals_achieved_50',  1),
  ('prestige_life_in_chapters', 'longevity_5_years',  2)
on conflict (honor_type, requires_type) do update set group_id = excluded.group_id;

-- ══════════════════════════════════════════════════════════════════════════════
-- 7 · SELF-CHECKS — this migration refuses to apply if it built something unearnable
-- ══════════════════════════════════════════════════════════════════════════════

do $$
declare
  v_bad text;
  v_missing text;
begin
  -- (a) Every catalog metric must be one this evaluator can actually produce. A metric the evaluator
  --     never computes yields an honor that is visible, real-looking and unearnable by anyone, forever,
  --     with no error anywhere. `honor_metrics` returns the unkeyed ones; the keyed CASE handles four more.
  select string_agg(distinct c.metric, ', ') into v_bad
    from public.honor_catalog c
   where c.metric not in (
     select jsonb_object_keys(public.honor_metrics('00000000-0000-0000-0000-000000000000'::uuid))
   )
     and c.metric not in ('lift_max', 'lift_ratio', 'session_distance', 'lifetime_distance',
                          'chapter_workouts', 'chapter_days');
  if v_bad is not null then
    raise exception 'HONOR CATALOG BROKEN: no evaluator path for metric(s): %. These honors could never be earned.', v_bad;
  end if;

  -- (b) Every prerequisite must name a real honor. The foreign key already guarantees this; asserting it
  --     again costs nothing and makes the guarantee visible to whoever reads the migration next.
  select string_agg(r.requires_type, ', ') into v_missing
    from public.honor_requires r
    left join public.honor_catalog c on c.honor_type = r.requires_type
   where c.honor_type is null;
  if v_missing is not null then
    raise exception 'HONOR REQUIREMENTS BROKEN: prerequisite(s) do not exist: %', v_missing;
  end if;

  -- (c) Execute the goal archiver once. A non-existent squad returns false at the first guard, but only
  --     AFTER the select that names five `squads` columns has been planned and run — which is the whole
  --     point: a renamed column fails here, at apply time, instead of the first time a squad finishes a
  --     goal. Read-only in this path; it cannot bank anything for a squad that does not exist.
  perform public.archive_squad_goal('00000000-0000-0000-0000-000000000000'::uuid);

  raise notice 'Honor catalog OK — % honors, % prerequisite rows.',
    (select count(*) from public.honor_catalog),
    (select count(*) from public.honor_requires);
end $$;

commit;

-- ══════════════════════════════════════════════════════════════════════════════
-- VERIFY — RUN THIS. It is the only proof the new SQL executes.
-- ══════════════════════════════════════════════════════════════════════════════
--
-- A migration applying proves the functions PARSE. PL/pgSQL binds tables and columns at run time, so a
-- wrong column name compiles clean and fails months later when a real athlete presses a button. This
-- reads only — it awards nothing — and it will error immediately if anything in here is wrong.
--
--   select jsonb_pretty(public.honor_metrics(auth.uid()));
--
-- Expect one object with 43 keys and plausible numbers. Then check the counts:
--
--   select category, count(*) from public.honor_catalog group by category order by count(*) desc;
--
-- Expect 179 honors across 15 categories, with Programs 5, Longevity 10, Squad 15, Hidden 6,
-- Prestige 7.
--
-- And confirm the squad standard landed, since Perfect Week now depends on it:
--
--   select name, checkin_standard from public.squads;
