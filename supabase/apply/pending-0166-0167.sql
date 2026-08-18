-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- Forge Legacy — PASTE-READY BUNDLE: migrations 0166 + 0167
--   0166 · the /admin programs panel stops counting completions as drop-offs
--   0167 · in-app feedback, and the App Store Support URL's other half
--
-- HOW TO APPLY: Supabase Dashboard → SQL Editor → paste this whole file → Run.
-- There is no Supabase CLI and no service key in this project; the dashboard is the only path.
--
-- ⚠ SAFE AS ONE PASTE. Each migration opens and closes its own transaction and each self-check runs
--   outside it. Unlike 0155→0156, NEITHER file adds an enum value, so there is no
--   "let it commit before the next one" hazard here. Run the whole thing in one tab.
--
-- ══ WHAT 0166 FIXES — TWO WRONG NUMBERS, ONE OF THEM FABRICATED ══
--
-- `admin_feature_adoption` still hardcoded the pre-0155 enum (future|active|graduated|ended_early).
--
--   1. Completed short programs were INVISIBLE. The 'finished' key was never emitted, and `num()` in
--      `src/data/admin-live.ts` coerces a missing key to 0 — so the buckets stopped summing to the
--      population and nobody could tell.
--
--   2. Worse: the drop-off chart INVENTED abandonment. Its exclusion list was
--      `state in ('graduated','ended_early')`, so a program somebody successfully FINISHED and then
--      left alone for 21 days was counted as somebody who quit in that week. Not a low number — a
--      fabricated one. The on-screen subtitle has claimed "and not finished" the whole time.
--
-- ⚠ 'graduated' and 'finished' stay SEPARATE and are never summed. D-RCM-30: a program under four
--   designed weeks earns no rank credit and no Programs Graduated honors, and `honor_metrics()` and
--   `rank-live.ts` both filter `state = 'graduated'`. Merging them here would make the dashboard
--   disagree with the rank engine.
--
-- ══ WHAT 0167 ADDS ══
--
-- The `feedback` table + RLS (insert-own / select-own, and deliberately NO update or delete policy),
-- a 6-per-hour rate limit that RAISES rather than dropping, an operator push reusing 0137 verbatim,
-- and `admin_feedback()` / `admin_feedback_set_status()`.
--
-- ⚠ `feedback.body` is DELIBERATE FREE TEXT — the one table in this schema that stores words the
--   athlete wrote, and the exact inverse of `app_events`/P6-A1-D3. This is lawful because
--   `site/privacy.html` §2 "Support messages and feedback" discloses it, and that disclosure ships
--   BEFORE this migration per P6-A1-D8. Do not route this column through `sanitizeProps()`.
--
-- ⚠ THIS IS AN APP STORE DEPENDENCY, not a feature. Apple requires a Support URL and rejects a bare
--   `mailto:`. `site/support.html` is the other half and must be uploaded separately.
--
-- ══ WHAT YOU SHOULD SEE ══
--
-- Two NOTICE lines at the end, in this order:
--   0166 OK: admin_feature_adoption now counts 'finished' and excludes it from drop-off.
--   0167 OK: feedback table, RLS, rate limit, operator push and both admin functions are present.
--
-- Anything else is a real failure — each self-check asserts the FIX, not merely that the file ran.
-- A `0167: push_outbox is absent` notice is benign (feedback saves; the operator push no-ops).
--
-- SAFE TO RUN TWICE: every function is `create or replace`, the table is `if not exists`, and every
-- policy and trigger is dropped before it is created.
--
-- AFTER RUNNING:
--   select jsonb_pretty(public.admin_feedback(20));
--   select jsonb_pretty(public.admin_feature_adoption(30,'UTC') -> 'programs');
--   node supabase/seed/admin-roundtrip.mjs      -- asserts 42501 for a non-admin
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ══════════ 0166 ══════════
-- Forge Legacy — 0166: teach the /admin programs panel the 'finished' state
--
-- ══ WHAT WAS WRONG ══
--
-- `admin_feature_adoption` was written in 0130, when `program_state` was `future | active | graduated |
-- ended_early`. 0155 added 'finished' (a program under four DESIGNED weeks that completed — no rank
-- credit, no Programs Graduated honors, per D-RCM-30), and 0156/0158 route short programs into it.
-- Nothing ever taught this function about it. Two numbers on the shipped dashboard are wrong today:
--
--   1. NO BUCKET COUNTS 'finished'. The key is absent from the jsonb entirely, and `num()` in
--      `src/data/admin-live.ts` coerces a missing key to 0 rather than throwing — so every completed
--      short program is invisible, and the state buckets no longer sum to the population.
--
--   2. THE DROP-OFF CHART FABRICATES A NON-ZERO. This is the worse one. The exclusion list read
--      `state in ('graduated','ended_early')`, so a program somebody SUCCESSFULLY FINISHED and then
--      stopped touching for 21 days was counted as someone who QUIT in that week. The panel did not
--      read low — it invented abandonment out of completions.
--
-- ⚠ The stale comment at `src/data/admin-live.ts:373` said this "reads 0 until migration 0157 teaches
--   `admin_program_metrics` the new state". Both halves are false: 0157 is `week_templates`, and there
--   has never been a function named `admin_program_metrics` in this schema. The fix was never written.
--   That comment is corrected in the same commit as this file.
--
-- ══ SHAPE ══
--
-- A `create or replace` of the whole function, per 0130's rule that a read model is one definer function
-- per dashboard SECTION. Signature is unchanged — `(int, text)` — so:
--
--   · the existing ACL is PRESERVED (`create or replace` does not reset privileges, and does not re-apply
--     default privileges the way a fresh `create` would). 0147's anon revoke is not undone by this file.
--   · `supabase/seed/admin-roundtrip.mjs` needs NO edit. This adds no eighth function name; it replaces
--     one already in that list.
--
-- The grant/revoke pair at the foot is restated anyway, so this file stands alone if it is ever replayed
-- against a database where 0130's tail did not run.
--
-- Depends on 0129 (admin_guard), 0130 (the function), 0155 (the 'finished' enum label).
-- Idempotent — replaces by definition, and re-running changes nothing.

begin;

create or replace function public.admin_feature_adoption(p_days int default 30, p_tz text default 'UTC')
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_tz     text := coalesce(nullif(btrim(p_tz), ''), 'UTC');
  v_days   int  := least(greatest(coalesce(p_days, 30), 1), 365);
  v_from   timestamptz;
  v_total  int;
  v_active int;
  v_out    jsonb;
begin
  perform public.admin_guard();
  if not exists (select 1 from pg_timezone_names where name = v_tz) then v_tz := 'UTC'; end if;
  v_from := now() - make_interval(days => v_days);

  select count(*) into v_total from public.profiles;
  select count(distinct athlete_id) into v_active
    from public.workouts where state = 'saved' and saved_at >= v_from;

  -- Two denominators on purpose. `in_window / active` answers "what are people using right now";
  -- `ever / total` answers "has this feature ever found anyone" — which at this population size is
  -- the number that actually decides whether something gets built on or cut.
  --
  -- ⚠ The owner column differs per table and getting it wrong is a silent zero, not an error.
  select jsonb_build_object(
    'days',   v_days,
    'total_athletes',  v_total,
    'active_athletes', v_active,
    'features', jsonb_build_array(
      jsonb_build_object('key','workout','label','Logged a workout',
        'ever',(select count(distinct athlete_id) from public.workouts where state='saved'),
        'in_window',(select count(distinct athlete_id) from public.workouts where state='saved' and saved_at>=v_from)),
      jsonb_build_object('key','program','label','Started a program',
        'ever',(select count(distinct athlete_id) from public.programs),
        'in_window',(select count(distinct athlete_id) from public.programs where created_at>=v_from)),
      jsonb_build_object('key','template','label','Saved a template',
        'ever',(select count(distinct athlete_id) from public.workout_templates),
        'in_window',(select count(distinct athlete_id) from public.workout_templates where created_at>=v_from)),
      jsonb_build_object('key','goal','label','Set a goal',
        'ever',(select count(distinct athlete_id) from public.goals),
        'in_window',(select count(distinct athlete_id) from public.goals where created_at>=v_from)),
      jsonb_build_object('key','honor','label','Earned an honor',
        'ever',(select count(distinct athlete_id) from public.honor_instances),
        'in_window',(select count(distinct athlete_id) from public.honor_instances where awarded_at>=v_from)),
      jsonb_build_object('key','pr','label','Recorded a PR',
        'ever',(select count(distinct athlete_id) from public.personal_records where athlete_id is not null),
        'in_window',(select count(distinct athlete_id) from public.personal_records where athlete_id is not null and created_at>=v_from)),
      jsonb_build_object('key','chapter_sealed','label','Sealed a chapter',
        'ever',(select count(distinct athlete_id) from public.chapters where sealed_at is not null),
        'in_window',(select count(distinct athlete_id) from public.chapters where sealed_at>=v_from)),
      -- squad_members keys on user_id and timestamps as joined_at — no created_at on this table.
      jsonb_build_object('key','squad','label','Joined a squad',
        'ever',(select count(distinct user_id) from public.squad_members),
        'in_window',(select count(distinct user_id) from public.squad_members where joined_at>=v_from)),
      -- squad_posts keys on author_id, not athlete_id.
      jsonb_build_object('key','squad_post','label','Posted to a squad',
        'ever',(select count(distinct author_id) from public.squad_posts),
        'in_window',(select count(distinct author_id) from public.squad_posts where created_at>=v_from)),
      -- 0049 rebuilt squad_checkins as video stories: no checkin_date, bucket on created_at.
      jsonb_build_object('key','checkin','label','Posted a check-in',
        'ever',(select count(distinct user_id) from public.squad_checkins),
        'in_window',(select count(distinct user_id) from public.squad_checkins where created_at>=v_from)),
      jsonb_build_object('key','challenge','label','Entered a challenge',
        'ever',(select count(distinct user_id) from public.challenge_participants),
        'in_window',(select count(distinct user_id) from public.challenge_participants where joined_at>=v_from)),
      -- friendships is an undirected edge: both endpoints count as having used the feature.
      jsonb_build_object('key','friend','label','Made a friend',
        'ever',(select count(distinct u) from (
                  select low_id u from public.friendships where status='ACCEPTED'
                  union select high_id from public.friendships where status='ACCEPTED') t),
        'in_window',(select count(distinct u) from (
                  select low_id u from public.friendships where status='ACCEPTED' and accepted_at>=v_from
                  union select high_id from public.friendships where status='ACCEPTED' and accepted_at>=v_from) t)),
      -- custom_exercises keys on author_id.
      jsonb_build_object('key','custom_exercise','label','Made a custom exercise',
        'ever',(select count(distinct author_id) from public.custom_exercises where deleted_at is null),
        'in_window',(select count(distinct author_id) from public.custom_exercises where deleted_at is null and created_at>=v_from)),
      jsonb_build_object('key','favorite','label','Favourited an exercise',
        'ever',(select count(distinct athlete_id) from public.exercise_favorites),
        'in_window',(select count(distinct athlete_id) from public.exercise_favorites where created_at>=v_from)),
      jsonb_build_object('key','body','label','Logged a body entry',
        'ever',(select count(distinct athlete_id) from public.body_entries),
        'in_window',(select count(distinct athlete_id) from public.body_entries where created_at>=v_from)),
      jsonb_build_object('key','transformation','label','Added a transformation',
        'ever',(select count(distinct athlete_id) from public.transformation_entries),
        'in_window',(select count(distinct athlete_id) from public.transformation_entries where created_at>=v_from)),
      jsonb_build_object('key','photo','label','Added a chapter photo',
        'ever',(select count(distinct athlete_id) from public.chapter_photos),
        'in_window',(select count(distinct athlete_id) from public.chapter_photos where created_at>=v_from)),
      jsonb_build_object('key','accomplishment','label','Added an accomplishment',
        'ever',(select count(distinct athlete_id) from public.accomplishments),
        'in_window',(select count(distinct athlete_id) from public.accomplishments where created_at>=v_from)),
      -- athlete_lift_maxes has NO created_at — updated_at is the only timestamp it carries.
      jsonb_build_object('key','lift_max','label','Entered a lift max',
        'ever',(select count(distinct athlete_id) from public.athlete_lift_maxes),
        'in_window',(select count(distinct athlete_id) from public.athlete_lift_maxes where updated_at>=v_from)),
      jsonb_build_object('key','push','label','Enabled push',
        'ever',(select count(distinct user_id) from public.push_tokens where disabled_at is null),
        'in_window',(select count(distinct user_id) from public.push_tokens where disabled_at is null and last_seen_at>=v_from))
    ),

    'programs', (
      with pp as (
        select ps.program_id, ps.athlete_id,
               max(ps.week_index)                             as last_week,
               count(*) filter (where ps.state = 'completed') as done,
               count(*) filter (where ps.state = 'skipped')   as skipped,
               max(ps.created_at)                             as last_touch
          from public.program_sessions ps group by 1, 2
      )
      select jsonb_build_object(
        'adherence_pct', (select round(100.0 * sum(done) / nullif(sum(done + skipped), 0), 1) from pp),
        'sessions_completed', (select coalesce(sum(done), 0) from pp),
        'sessions_skipped',   (select coalesce(sum(skipped), 0) from pp),
        -- programs.state is a lowercase enum, in lifecycle order (0155 inserted 'finished' before
        -- 'ended_early'): future | active | graduated | finished | ended_early.
        --
        -- ⚠ 'graduated' and 'finished' are BOTH completions and must stay SEPARATE keys, never summed
        --   here. D-RCM-30: a program under four designed weeks earns no rank credit and no Programs
        --   Graduated honors, and 0155 chose a distinct state precisely so `honor_metrics()` and
        --   `rank-live.ts` — which both filter `state = 'graduated'` — needed zero changes. Merging the
        --   two on this screen would make the dashboard disagree with the rank engine.
        'graduated',   (select count(*) from public.programs where state = 'graduated'),
        'finished',    (select count(*) from public.programs where state = 'finished'),
        'ended_early', (select count(*) from public.programs where state = 'ended_early'),
        'active',      (select count(*) from public.programs where state = 'active'),
        -- ⚠ STALLED, not merely in progress. Without the last_touch floor this histogram counts
        --   everybody who is currently mid-week-2 as having QUIT in week 2.
        --   week_index is 0-based, so +1 to render it as a human week number.
        --
        -- ⚠ ALL THREE SEALED STATES ARE EXCLUDED. 'finished' was missing here until 0166, which meant a
        --   successfully completed short program left alone for three weeks was rendered as a drop-off.
        --   The on-screen subtitle at `src/app/admin.tsx:368` has always claimed "and not finished" —
        --   this is the line that finally makes that copy true. Any state added to `program_state` in
        --   future that means "this program is over" belongs in this list on the same day.
        'dropoff_by_week', (
          select coalesce(jsonb_agg(jsonb_build_object('week', last_week + 1, 'programs', c) order by last_week), '[]'::jsonb)
            from (select last_week, count(*) c from pp
                   where last_touch < now() - interval '21 days'
                     and program_id not in (select id from public.programs where state in ('graduated','finished','ended_early'))
                   group by 1) t)
      )
    )
  ) into v_out;

  return v_out;
end;
$$;

comment on function public.admin_feature_adoption(int, text) is
  'Feature adoption (two denominators: ever/total and in_window/active) plus the programs panel. Aggregates only, AA-D2. 0166 taught the programs block the ''finished'' state from 0155: it is counted as its own completion bucket, kept separate from ''graduated'' per D-RCM-30, and excluded from dropoff_by_week alongside the other sealed states.';

-- Restated for self-containment. `create or replace` preserves the existing ACL, so these are no-ops
-- against a database where 0130's tail ran — which is every database that has this function.
revoke execute on function public.admin_feature_adoption(int, text) from public;
grant  execute on function public.admin_feature_adoption(int, text) to   authenticated;

commit;

-- ══ SELF-CHECK ══════════════════════════════════════════════════════════════════════════════════════
-- Outside the transaction, so a failure here reports rather than rolling back a migration that worked.
-- Asserts the FIX, not merely the function's existence — 0130 already guaranteed the latter, and "the
-- migration ran" and "the objects are correct" are the two facts that have come apart before here.
do $$
declare
  v_src text;
begin
  if to_regprocedure('public.admin_feature_adoption(int, text)') is null then
    raise exception '0166 self-check: admin_feature_adoption is missing';
  end if;

  if not exists (
    select 1 from pg_type t join pg_enum e on e.enumtypid = t.oid
     where t.typname = 'program_state' and e.enumlabel = 'finished'
  ) then
    raise exception '0166 self-check: program_state has no ''finished'' label — apply 0155 first';
  end if;

  select p.prosrc into v_src
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'admin_feature_adoption';

  -- The drop-off exclusion is the fix that actually changes a rendered number. Assert it by source,
  -- because a partial paste that dropped the tail of the body would still leave a callable function.
  if v_src not like '%''graduated'',''finished'',''ended_early''%' then
    raise exception '0166 self-check: dropoff_by_week still excludes only two states — the replace did not take';
  end if;

  -- Matched on the predicate rather than the jsonb key, because the key is followed by alignment
  -- whitespace that a reformat would change; `where state = 'finished'` appears exactly once and only
  -- in the line this migration adds.
  if v_src not like '%where state = ''finished''%' then
    raise exception '0166 self-check: the ''finished'' count bucket is missing from the programs block';
  end if;

  raise notice '0166 OK: admin_feature_adoption now counts ''finished'' and excludes it from drop-off.';
end;
$$;

-- ══ VERIFY BY HAND (paste separately, as an admin) ═══════════════════════════════════════════════════
--   select jsonb_pretty(public.admin_feature_adoption(30, 'UTC') -> 'programs');
-- Expect a 'finished' key to be present. A 0 there is now a real zero rather than a missing key —
-- cross-check against:  select state, count(*) from public.programs group by 1 order by 1;


-- ══════════ 0167 ══════════
-- Forge Legacy — 0167: in-app feedback, bug reports and suggestions
--
-- ══ WHY THIS EXISTS ══
--
-- Two obligations, one table.
--
--   1. THE PRODUCT ONE. Nothing in this app has ever let an athlete tell us anything. The only support
--      touchpoint in the entire binary was a sentence of copy inside the privacy sheet
--      (`src/domain/settings/content.ts`, LEGAL.privacy.body) — not a form, not a link, not reachable by
--      anyone actually looking for help.
--
--   2. THE STORE ONE. App Store Connect requires a **Support URL** and Apple rejects a bare `mailto:` as
--      an answer (GO-LIVE §10.4). `site/support.html` is that URL; this table is its in-app half.
--
-- ══ ⚠ FREE TEXT IS DELIBERATE HERE — DO NOT "FIX" IT ══
--
-- `feedback.body` stores exactly what the athlete typed. That is the OPPOSITE of `app_events` (0131),
-- whose whole design is P6-A1-D3: "an event payload may never contain … any other text the athlete
-- authored", enforced by `sanitizeProps()` at the boundary.
--
-- Both are correct, because they answer different questions. An analytics event asks "which screen was
-- opened", and free text there is a privacy leak with no upside. A support message asks "what went
-- wrong for you", and it is ONLY useful in the athlete's own words. Redacting it would leave a table of
-- timestamps attached to nothing.
--
-- ⛔ A future migration must not route this column through `sanitizeProps`, allow-list it, or truncate it
--    to enumerated values. If that ever looks like a good idea, read `site/privacy.html` §2 "Support
--    messages and feedback" first — the disclosure that makes this lawful describes free text, in
--    writing, publicly, and shipped BEFORE this migration per P6-A1-D8.
--
-- ══ AA-D2 ══
--
-- `admin_feedback()` returns a NAMED athlete, which every other admin read model refuses to do. That is
-- not a breach: AA-D2 forbids a named athlete beside "a volume number, a challenge standing, a
-- leaderboard position, or a rank" — beside PERFORMANCE. A support ticket is not performance data, and
-- you cannot answer a bug report without knowing who filed it. `admin_recent_signups` (0137) set this
-- precedent. This function returns handle and display name and NOT ONE training figure; joining a
-- workout count onto it later would be the actual breach.
--
-- Depends on 0129 (the admin gate), 0120 (push_outbox — optional, degrades), 0001/0022 (profiles).
-- Idempotent: `if not exists` on the table, `create or replace` on every function, `drop trigger if
-- exists` before each trigger.
--
-- ⚠ 0164/0165 are not applied on every database, so the three gate objects are RE-STATED inline
--   byte-identically (the 0137:44-49 precedent) and this file stands alone.

begin;

-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- 0. THE GATE — restated verbatim from 0129 so this file is standalone
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════

create table if not exists public.app_admins (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  granted_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;
-- ⚠ NO POLICIES. NOT AN OMISSION — see 0129's header (AA-D6). RLS on with zero policies is
-- deny-by-default, which is what keeps the key-holder roster from being joinable to world-readable
-- `profiles`. A later migration must not "fix" this by adding an owner policy.

create or replace function public.is_app_admin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.app_admins a where a.user_id = auth.uid());
$$;

create or replace function public.admin_guard()
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_app_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
end;
$$;

-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- 1. THE TABLE
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════

create table if not exists public.feedback (
  -- bigint identity, not uuid: an operator reads these in a list and refers to them out loud and in
  -- email ("#41 is fixed"). push_outbox uses uuid because nobody ever says a push row's id.
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles (id) on delete cascade,

  -- ⚠ NOT AN ALLOW-LIST THE READ PATH FILTERS ON. The constraint keeps the four buckets honest at write
  --   time; `admin_feedback` deliberately does NOT filter by kind, so a fifth kind added here shows up
  --   on the dashboard the same day rather than being silently dropped. That exact failure — a client
  --   allow-list quietly discarding rows it did not know about — cost this project eleven migrations of
  --   invisible notifications (`src/data/notifications-live.ts` KINDS).
  kind         text not null check (kind in ('BUG', 'SUGGESTION', 'PRAISE', 'OTHER')),

  -- The athlete's own words. See the header. 2000 chars is generous for a bug report and small enough
  -- that no single row can be used as file storage.
  body         text not null check (length(btrim(body)) between 1 and 2000),

  -- Context captured automatically, because "it broke" plus a screen name is reproducible and "it broke"
  -- alone is not. All nullable: a message sent from a state we failed to capture is still worth having.
  screen       text,
  app_version  text,
  platform     text,

  -- Did they agree to be replied to. Not the same as having an email — it is consent to use it.
  contact_ok   boolean not null default true,

  -- Operator workflow. Written only by admin_feedback_set_status().
  status       text not null default 'NEW' check (status in ('NEW', 'READ', 'ACTIONED', 'CLOSED')),

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.feedback is
  'In-app bug reports, suggestions and praise. ⚠ `body` is DELIBERATE FREE TEXT — the one table in this schema that stores words the athlete wrote, disclosed in site/privacy.html §2 "Support messages and feedback". Do not route it through sanitizeProps(). See 0167''s header.';

-- Newest-first admin list, and the rate-limit probe. One index serves both.
create index if not exists feedback_created_at on public.feedback (created_at desc);
create index if not exists feedback_user_time   on public.feedback (user_id, created_at desc);
create index if not exists feedback_status_time on public.feedback (status, created_at desc);

-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- 2. RLS
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
--
-- Insert your own, read your own, and that is all. No UPDATE policy and no DELETE policy — an athlete
-- cannot rewrite a report after we have read it, and cannot delete one to cover an abuse report. The
-- operator reaches these rows through SECURITY DEFINER functions, which bypass RLS by design.
--
-- ⚠ The own-row SELECT is not decoration. `site/privacy.html` §7 gives a right of access; a policy that
--   let you write but never read would make that promise false in the database.

alter table public.feedback enable row level security;

drop policy if exists feedback_insert_own on public.feedback;
create policy feedback_insert_own on public.feedback
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists feedback_select_own on public.feedback;
create policy feedback_select_own on public.feedback
  for select to authenticated
  using (user_id = auth.uid());

-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- 3. RATE LIMIT
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
--
-- Ten lines, and the difference between a support table and a spam target the day the app is public.
-- Six per hour is far above any honest use and far below anything that fills a disk.
--
-- ⚠ Raises rather than silently dropping. A swallowed insert would tell the athlete their message was
--   sent when it was not — the one failure mode a support channel must never have.

create or replace function public.feedback_tg_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_recent int;
begin
  select count(*) into v_recent
    from public.feedback
   where user_id = new.user_id
     and created_at > now() - interval '1 hour';

  if v_recent >= 6 then
    raise exception 'Too many messages in a short time. Please wait a little while before sending another.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists feedback_rate_limit on public.feedback;
create trigger feedback_rate_limit
  before insert on public.feedback
  for each row execute function public.feedback_tg_rate_limit();

-- Keep `updated_at` honest without making the app remember to set it.
create or replace function public.feedback_tg_touch()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists feedback_touch on public.feedback;
create trigger feedback_touch
  before update on public.feedback
  for each row execute function public.feedback_tg_touch();

-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- 4. OPERATOR PUSH — the 0137 pattern, verbatim
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
--
-- Writes `push_outbox` DIRECTLY rather than through `notification_events_for`: feedback is an operator
-- event and belongs in no athlete's inbox. Swallows every error, because it runs inside the insert that
-- delivers the athlete's message and a broken notifier must never eat a support ticket.

create or replace function public.push_tg_feedback_filed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- 0120 may not be applied on this database. `to_regclass` is null rather than an error for a missing
  -- relation, which is the whole reason it is used here instead of a plain reference.
  if to_regclass('public.push_outbox') is null or to_regclass('public.push_tokens') is null then
    return new;
  end if;

  begin
    insert into public.push_outbox (user_id, kind, event_at, actor_id, title, body, route)
    select a.user_id,
           'feedback_filed',
           -- ⚠ THE FILING TIME, NOT NOW — keeps 0120's push_outbox_event_uk idempotent on replay.
           new.created_at,
           new.user_id,
           case new.kind
             when 'BUG'        then 'Bug report'
             when 'SUGGESTION' then 'Suggestion'
             when 'PRAISE'     then 'Someone said thanks'
             else                   'New feedback'
           end,
           left(btrim(new.body), 120),
           '/admin'
      from public.app_admins a
      -- Only operators with a live device — a row nothing can deliver sits PENDING and ends FAILED.
     where exists (
             select 1 from public.push_tokens t
              where t.user_id = a.user_id and t.disabled_at is null
           )
       -- Never notify the operator about their own message.
       and a.user_id <> new.user_id
    on conflict do nothing;
  exception
    when others then null;
  end;

  return new;
end;
$$;

comment on function public.push_tg_feedback_filed() is
  'Files an operator push when an athlete sends feedback. Writes push_outbox directly — feedback is an operator event and belongs in no athlete''s inbox. Swallows every error, because it runs inside the insert that carries the athlete''s message.';

drop trigger if exists push_feedback_filed on public.feedback;
create trigger push_feedback_filed
  after insert on public.feedback
  for each row execute function public.push_tg_feedback_filed();

-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- 5. THE ADMIN READ MODEL
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
--
-- ⚠ ADDING THIS FUNCTION MEANS ADDING ITS NAME TO `supabase/seed/admin-roundtrip.mjs` IN THE SAME
--   COMMIT (0130's standing rule). That script loops every admin function as a non-admin and asserts
--   42501; it is the only thing standing between "somebody forgot admin_guard()" and exposure. Done.
--
-- `p_status` is an OPTIONAL filter, null meaning all. It does not filter by `kind` — see the table's
-- kind comment.

create or replace function public.admin_feedback(p_limit int default 100, p_status text default null)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_limit  int := least(greatest(coalesce(p_limit, 100), 1), 500);
  v_status text := nullif(btrim(coalesce(p_status, '')), '');
  v_rows   jsonb;
  v_counts jsonb;
begin
  perform public.admin_guard();

  select coalesce(jsonb_agg(r order by r.created_at desc), '[]'::jsonb)
    into v_rows
    from (
      select f.id,
             f.kind,
             f.body,
             f.screen,
             f.app_version,
             f.platform,
             f.contact_ok,
             f.status,
             f.created_at,
             -- Identity, because you cannot answer a bug report without knowing who filed it. Handle and
             -- name ONLY — see the AA-D2 note in this file's header. Never join a training figure here.
             p.name   as athlete_name,
             p.handle as athlete_handle
        from public.feedback f
        join public.profiles p on p.id = f.user_id
       where v_status is null or f.status = v_status
       order by f.created_at desc
       limit v_limit
    ) r;

  -- Counts are computed over the WHOLE table, never over the filtered page — otherwise "unread: 0" would
  -- mean "0 on this screen" and read as "nothing to do".
  select jsonb_build_object(
    'total',    count(*),
    'new',      count(*) filter (where status = 'NEW'),
    'read',     count(*) filter (where status = 'READ'),
    'actioned', count(*) filter (where status = 'ACTIONED'),
    'closed',   count(*) filter (where status = 'CLOSED'),
    'bugs',     count(*) filter (where kind = 'BUG'),
    -- ⚠ The honest-zero guard. "no feedback yet" and "the screen never shipped" are different facts, and
    --   a bare 0 cannot tell them apart. A null here means the table is genuinely empty.
    'newest_at', max(created_at)
  ) into v_counts
  from public.feedback;

  return jsonb_build_object('rows', v_rows, 'counts', v_counts, 'limit', v_limit, 'status', v_status);
end;
$$;

comment on function public.admin_feedback(int, text) is
  'Operator inbox for in-app feedback. Returns the athlete''s handle and name because a support ticket must be answerable — NOT an AA-D2 breach, which concerns a named athlete beside performance data (see 0167''s header). Counts span the whole table, not the returned page. Gated by admin_guard() (0129).';

-- The status writer. Without it `status` would be a column nothing can ever change, permanently 'NEW' —
-- which is exactly the sort of dead field that makes a dashboard lie.
create or replace function public.admin_feedback_set_status(p_id bigint, p_status text)
returns jsonb
language plpgsql
security definer
volatile
set search_path = public, pg_temp
as $$
declare
  v_status text := btrim(coalesce(p_status, ''));
  v_row    public.feedback;
begin
  perform public.admin_guard();

  if v_status not in ('NEW', 'READ', 'ACTIONED', 'CLOSED') then
    raise exception 'unknown feedback status: %', v_status using errcode = '22023';
  end if;

  update public.feedback set status = v_status where id = p_id returning * into v_row;

  if not found then
    raise exception 'no feedback row with id %', p_id using errcode = 'P0002';
  end if;

  return jsonb_build_object('id', v_row.id, 'status', v_row.status, 'updated_at', v_row.updated_at);
end;
$$;

comment on function public.admin_feedback_set_status(bigint, text) is
  'Moves one feedback row through NEW → READ → ACTIONED → CLOSED. Gated by admin_guard() (0129). The only writer of feedback.status — the table has no UPDATE policy, so nothing else can.';

-- ⚠ Revoke FROM PUBLIC, never from `authenticated` — Postgres grants EXECUTE to PUBLIC on every new
-- function, and revoking from a role that never held a direct grant removes nothing (0120, 0129, 0130,
-- 0137 all carry this note). The GUARD, not the grant, is what refuses a signed-in non-admin; the grant
-- only shuts out anon. 0147 §2 additionally set default privileges so a new function is not handed to
-- `anon` by the platform — re-run `supabase/apply/audit-anon-executable-functions.sql` after this file.
revoke execute on function public.admin_feedback(int, text)                from public;
grant  execute on function public.admin_feedback(int, text)                to   authenticated;
revoke execute on function public.admin_feedback_set_status(bigint, text)  from public;
grant  execute on function public.admin_feedback_set_status(bigint, text)  to   authenticated;
revoke execute on function public.admin_guard()  from public;
grant  execute on function public.is_app_admin() to   authenticated;

commit;

-- ══ SELF-CHECK ══════════════════════════════════════════════════════════════════════════════════════
-- Outside the transaction, so a failure here reports rather than rolling back a migration that worked.
-- Asserted by presence, because "the migration ran" and "the objects exist" are the two facts that have
-- come apart before on this project.
do $$
begin
  if to_regclass('public.feedback') is null then
    raise exception '0167 self-check: the feedback table was not created';
  end if;

  if to_regprocedure('public.admin_feedback(int, text)') is null then
    raise exception '0167 self-check: admin_feedback was not created';
  end if;

  if to_regprocedure('public.admin_feedback_set_status(bigint, text)') is null then
    raise exception '0167 self-check: admin_feedback_set_status was not created';
  end if;

  -- RLS on with the two expected policies. A table with RLS enabled and NO policies would silently
  -- refuse every athlete insert — the support channel would look built and accept nothing.
  if not exists (
    select 1 from pg_tables where schemaname = 'public' and tablename = 'feedback' and rowsecurity
  ) then
    raise exception '0167 self-check: RLS is not enabled on feedback';
  end if;

  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'feedback') <> 2 then
    raise exception '0167 self-check: feedback should carry exactly two policies (insert own, select own)';
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'feedback_rate_limit' and not tgisinternal
  ) then
    raise exception '0167 self-check: the rate-limit trigger was not created';
  end if;

  if to_regclass('public.push_outbox') is null then
    raise notice '0167: push_outbox is absent — feedback SAVES, the operator PUSH will no-op until 0120 is applied.';
  end if;

  raise notice '0167 OK: feedback table, RLS, rate limit, operator push and both admin functions are present.';
end;
$$;

-- ══ VERIFY BY HAND ═══════════════════════════════════════════════════════════════════════════════════
--   As an admin:      select jsonb_pretty(public.admin_feedback(20));
--   Expect `counts.newest_at` to be null on an empty table — a null there is "nothing has ever been
--   filed", which a bare 0 in `counts.total` cannot distinguish from "the screen never shipped".
--
--   Guard regression:  node supabase/seed/admin-roundtrip.mjs   (asserts 42501 as a non-admin)
--   Anon audit:        supabase/apply/audit-anon-executable-functions.sql
