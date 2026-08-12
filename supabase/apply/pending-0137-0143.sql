-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- Forge Legacy — PASTE-READY BUNDLE: migrations 0137 · 0138 · 0139 · 0140 · 0143
--
-- HOW TO APPLY: Supabase Dashboard → SQL Editor → paste this whole file → Run.
-- There is no Supabase CLI and no service key in this project; the dashboard is the only path.
--
-- ⚠ RUN 0141 AND 0142 BEFORE THIS FILE. They came from a parallel workstream (squad check-in video
--   pruning) and live in `pending-0141.sql` / `pending-0142.sql`. The numbering IS the dependency
--   order — nothing here keeps a migration history table, so the filename is the only thing that says
--   what runs when.
--
-- WHAT EACH ONE DOES
--
--   0137 · WHO SIGNED UP. A list on /admin and a push the moment somebody is first NAMED — not on
--          insert, because every profile is minted as "Athlete" until onboarding names them, so an
--          insert trigger would push "Athlete signed up" every single time. Self-contained: it restates
--          0129's gate verbatim, so it runs whether or not 0129 is in.
--
--   0138 · WHAT THE ATHLETE TELLS YOU BY ACTING. `workout_exercises.prescribed_*` records what a
--          substitution REPLACED — required by Exercise-002 §10 since substitution shipped and never
--          built. Plus `exercise_avoidance`, the negative counterpart favourites has lacked since 0020.
--
--   0139 · EVERY ATHLETE ON POUNDS AND MILES. One-time data correction. `units` is the single switch —
--          weights, distance, pace and speed all read it — so this fixes lb AND mi in one write.
--          ⚠ It overwrites a genuine metric preference. Fine for a handful of known testers; do not
--          re-run it once the app has real users.
--
--   0140 · YOUR WEEK, FROM HOLT. `athlete_weekly_reviews` plus a LAZY generator — no scheduler, no
--          cron: the row is written the first time the athlete opens the app in a new week. Silence
--          beats zero, so a week with no workouts writes no row and shows no card. Bucketed in
--          `profiles.tz`, the first athlete-facing use of that column.
--
--   0143 · WHAT THE ATHLETE DOES WITH WHAT HOLT SAYS. One row per lift per session recording what
--          `progressionFor` decided. ⚠ Snapshotted because it CANNOT be recomputed: the verdict depends
--          on the prescription in force, and a saved workout does not store it — 8 reps is "topped the
--          range" against 3x8 and "short of it" against 3x12.
--
-- SAFE TO RUN TWICE: every statement is guarded (`if not exists`, `create or replace`,
-- `drop policy if exists`, and 0139's WHERE clause skips rows already correct).
--
-- VERIFY AFTER RUNNING — all of these are safe from the SQL editor:
--   select count(*) from public.exercise_avoidance;                  -- 0 rows is the pass
--   select count(*) from public.athlete_weekly_reviews;              -- 0 rows is the pass
--   select count(*) from public.coach_intensity_signal;              -- 0 rows is the pass
--   select count(*) from public.profiles
--    where app_prefs->>'units' is distinct from 'imperial';          -- must be 0
--   select to_regprocedure('public.admin_recent_signups(int)') is not null as signups_fn;   -- t
--
-- ⚠ DO NOT CALL `admin_recent_signups()` FROM THE SQL EDITOR. It returns `42501: not authorized`, and
--   that is the gate WORKING, not a broken migration. `admin_guard()` tests `auth.uid()` against
--   `app_admins`; the dashboard runs as `postgres`, where `auth.uid()` is NULL, so no dashboard session
--   can ever pass it. Read the list from /admin in the app, signed in as yourself.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════



-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- 0137_signup_alerts.sql
-- ───────────────────────────────────────────────────────────────────────────────────────────────

-- Forge Legacy — 0137: who just signed up
--
-- ══ WHAT THIS CLOSES ══
--
-- PO: *"is there a way for me to get notified whenever someone signs up? And to get the name of who?
-- I'm waiting on some that I don't know if they have or not."*
--
-- 0130 gave the dashboard a signup COUNT. A count answers "how many" and the question here is "who" —
-- the operator is handing out testing invitations one at a time and needs to know which ones landed.
-- Two halves, because they answer it at different moments: a LIST on `/admin` that can be checked at
-- any time, and a PUSH at the moment it happens.
--
-- ══ ⚠ WHY THE TRIGGER IS ON `name`, NOT ON THE INSERT ══
--
-- `handle_new_user()` (0001) mints the profile row from `auth.users` metadata, and the sign-in screen
-- passes **only email and password** — no name is collected until the Account step of onboarding. So
-- every profile is born as `name = 'Athlete'`, `handle = 'athlete_<8 hex>'`, and a trigger on INSERT
-- would have pushed "Athlete signed up" for every single person. That is the count again, with a
-- notification sound on it.
--
-- The moment an athlete becomes identifiable is the moment they are NAMED, so that is the moment this
-- fires. `event_at` is pinned to `created_at` rather than `now()`, which makes 0120's unique index do
-- the deduplication for free: renaming yourself later produces the same key and files nothing.
--
-- ══ ⚠ WHY IT SWALLOWS EVERY ERROR ══
--
-- This trigger sits on `public.profiles`, in the path of onboarding. An operator convenience that can
-- raise is an operator convenience that can stop a real athlete from finishing sign-up — and it would
-- fail for the most ordinary reason imaginable, since migrations here are pasted in by hand and 0120
-- may not be applied on the database this runs against. `to_regclass` checks first and the exception
-- block catches everything else. A missed alert is a missed alert; a blocked signup is a lost athlete.
--
-- ══ ⚠ WHY IT DOES NOT GO THROUGH `notification_events_for` ══
--
-- That function is the ATHLETE'S feed — `/inbox` renders it, and `push_enqueue_for` re-derives pushes
-- from it. A signup is an operator event: it belongs to nobody's inbox, it has no route inside the
-- social model, and adding a branch would mean rebuilding a 70-line union that six triggers depend on.
-- It writes `push_outbox` directly instead, which is the sender's own input and nothing else's.
--
-- ══ SELF-CONTAINED ON PURPOSE ══
--
-- `app_admins`, `is_app_admin()` and `admin_guard()` are restated below EXACTLY as 0129 defines them,
-- so this file runs correctly whether or not 0129 has been applied yet. `create table if not exists`
-- skips an existing table; the two `create or replace` bodies are byte-identical to 0129's, so
-- replacing them is a no-op. Re-running 0129 afterwards is equally harmless.
--
-- Idempotent. Depends on 0001 (profiles). Degrades to list-only without 0120 (push_outbox).

begin;

-- ── The operator allowlist — 0129's definition, restated so this file stands alone ──────────────────
create table if not exists public.app_admins (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  note       text,
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

-- ── HALF ONE: the list ──────────────────────────────────────────────────────────────────────────────
--
-- Newest first, and it deliberately INCLUDES the ones still called 'Athlete'. That is not noise, it is
-- the answer to the actual question: somebody who created an account and never finished onboarding is
-- exactly the case the PO cannot currently see, and "signed up but stalled at the Account step" is a
-- different problem from "never signed up at all".
--
-- `named` states which of those two a row is, so the screen never has to know that 'Athlete' is a
-- sentinel. `email` is NOT returned — it is not needed to answer "did they sign up", it lives in
-- `auth.users` rather than `profiles`, and AA-D2's rule against per-athlete drill-down is the standing
-- instinct here.
create or replace function public.admin_recent_signups(p_limit int default 60)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_rows jsonb;
begin
  perform public.admin_guard();

  select coalesce(jsonb_agg(r order by r.created_at desc), '[]'::jsonb)
    into v_rows
    from (
      select p.id,
             p.name,
             p.handle,
             p.created_at,
             -- 'Athlete' is what `handle_new_user()` writes when signup carried no metadata, which is
             -- always: the sign-in screen collects email and password only.
             (p.name is distinct from 'Athlete') as named
        from public.profiles p
       order by p.created_at desc
       limit greatest(1, least(coalesce(p_limit, 60), 200))
    ) r;

  return v_rows;
end;
$$;

comment on function public.admin_recent_signups(int) is
  'The newest accounts, name and handle and when. Includes profiles still named ''Athlete'' — an account that stalled during onboarding is a different state from no account, and both are answers to "did they sign up yet". Gated by admin_guard() (0129/0137).';

-- ⚠ Revoke FROM PUBLIC, never from `authenticated` — Postgres grants EXECUTE to PUBLIC on every new
-- function, and revoking from a role that never held a direct grant removes nothing (0120, 0129, 0130
-- all carry this note). The GUARD, not the grant, is what refuses a signed-in non-admin; the grant only
-- shuts out anon.
--
-- The two gate functions are re-stated here for the standalone case. `create or replace` PRESERVES
-- existing grants, so on a database where 0129 already ran these three lines are a no-op.
revoke execute on function public.admin_recent_signups(int) from public;
grant  execute on function public.admin_recent_signups(int) to authenticated;
revoke execute on function public.admin_guard() from public;
grant  execute on function public.is_app_admin() to authenticated;

-- ── HALF TWO: the push ──────────────────────────────────────────────────────────────────────────────
--
-- Fires when an athlete is first NAMED, files one row per operator with a live device, and cannot
-- raise. See the header for all three of those decisions.
create or replace function public.push_tg_athlete_signup()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Nothing to say until they have a real name, and nothing to say twice.
  if new.name is null or new.name = 'Athlete' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.name is not distinct from new.name then
    return new;
  end if;

  -- 0120 may not be applied on this database. `to_regclass` is null rather than an error for a missing
  -- relation, which is the whole reason it is used here instead of a plain reference.
  if to_regclass('public.push_outbox') is null or to_regclass('public.push_tokens') is null then
    return new;
  end if;

  begin
    insert into public.push_outbox (user_id, kind, event_at, actor_id, title, body, route)
    select a.user_id,
           'athlete_signup',
           -- ⚠ THE SIGNUP TIME, NOT NOW. Pinning it to `created_at` makes 0120's
           -- `push_outbox_event_uk` idempotent across every later rename of the same athlete.
           new.created_at,
           new.id,
           'New athlete',
           new.name || ' just signed up' || coalesce(' (@' || new.handle || ')', ''),
           '/admin'
      from public.app_admins a
      -- Only operators with a live device. `push_enqueue_for` makes the same check for the same
      -- reason: a row nothing can deliver is a row that sits PENDING and eventually FAILED.
     where exists (
             select 1 from public.push_tokens t
              where t.user_id = a.user_id and t.disabled_at is null
           )
       -- Never notify the operator about their own account.
       and a.user_id <> new.id
    on conflict do nothing;
  exception
    when others then
      -- ⚠ DELIBERATE, AND THE MOST IMPORTANT LINE IN THIS FILE. This trigger is in the path of
      -- onboarding. An alert that raises is an alert that stops somebody joining.
      null;
  end;

  return new;
end;
$$;

comment on function public.push_tg_athlete_signup() is
  'Files an operator push when an athlete is first given a real name — the moment a signup becomes identifiable, since profiles are minted as ''Athlete''. Writes push_outbox directly rather than through notification_events_for: a signup is an operator event and belongs in no athlete''s inbox. Swallows every error, because it runs inside onboarding.';

drop trigger if exists push_athlete_signup on public.profiles;
create trigger push_athlete_signup
  after insert or update of name on public.profiles
  for each row execute function public.push_tg_athlete_signup();

commit;

-- ══ SELF-CHECK ══════════════════════════════════════════════════════════════════════════════════════
-- Outside the transaction, so a failure here reports rather than rolling back a migration that worked.
-- Both halves are asserted by presence, because "the migration ran" and "the objects exist" are the two
-- facts that have come apart before on this project.
do $$
begin
  if to_regprocedure('public.admin_recent_signups(int)') is null then
    raise exception '0137 self-check: admin_recent_signups was not created';
  end if;
  if not exists (
    select 1 from pg_trigger where tgname = 'push_athlete_signup' and not tgisinternal
  ) then
    raise exception '0137 self-check: the signup trigger was not created';
  end if;
  if to_regclass('public.push_outbox') is null then
    raise notice '0137: push_outbox is absent — the LIST works, the PUSH will no-op until 0120 is applied.';
  end if;
end;
$$;


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- 0138_coach_capture_layer.sql
-- ───────────────────────────────────────────────────────────────────────────────────────────────

-- Forge Legacy — 0138: what the athlete told you by acting
--
-- ══ WHAT THIS CLOSES ══
--
-- PO: *"It should learn from the individual… what they like and don't like, what they swap for, how long
-- they take, everything about them."*
--
-- Holt learns nothing today — `src/domain/coach/**` reads no database at all. Most of the signal needed
-- to change that is already recorded (every set, every duration, every skipped session, every favourite).
-- Two things are not, and this migration is those two. Governed by
-- `Docs/Coach-Adaptive-Learning-Amendment-001.md` (CL-D9, CL-D10, CL-D11).
--
-- ══ ⚠ HALF ONE IS NOT A NEW DECISION ══
--
-- `Exercise-002-Exercise-Substitution-Architecture` §10.1–10.2 is LOCKED and already says it:
--
--   "Both `exerciseName` (substitute) and `prescribedExerciseName` (original) are snapshotted at the
--    moment of write… Historical integrity is complete and permanent for both exercises involved."
--
-- `save_workout` has always inserted `workout_exercises (workout_id, catalog_key, name, section,
-- position, group_*)` and there is no `prescribed_*` column anywhere in 137 migrations. So the app has
-- been throwing away the single most informative thing an athlete does in a session — telling you, by
-- acting, that the movement you gave them was the wrong one — for as long as substitution has shipped.
-- This implements §10; it does not decide it.
--
-- ══ ⚠ WHY A SEPARATE RPC AND NOT A CHANGE TO `save_workout` ══
--
-- `save_workout`'s eleven arguments have been frozen since 0095 and EVERY client path calls it. Widening
-- it, or rebuilding its 200-line body to read two more jsonb keys, would put every save in the app at
-- risk to record an annotation. `partners` (0016) and the playlist link (0105) set the precedent and
-- `save.ts` states the rule: these are marks ON a session rather than parts OF one, written after the
-- commit, and a failure must cost the mark and never the workout.
--
-- ══ HALF TWO: THE SIGNAL FAVOURITES NEVER HAD ══
--
-- `exercise_favorites` (0020) has carried "I like this" since the twentieth migration. Nothing has ever
-- carried "stop giving me this", which is why "what they don't like" was unanswerable. Same shape, same
-- key, one extra column for the reason.
--
-- ⚠ AN AVOIDANCE IS NOT READ BY THE ENGINE YET, ON PURPOSE (CL-D11). Capture ships first — nothing can
-- learn from data that was never written — and CL-D3 makes a VISIBLE, REVERSIBLE list a precondition of
-- `assemble()` ever reading this table. An invisible avoidance that silently narrows somebody's training
-- is the exact failure this system is being designed against.
--
-- Idempotent. Depends on 0001 (workouts, workout_exercises, profiles). RUN AFTER 0137.

begin;

-- ── HALF ONE: what a substitution replaced (EX-002 §10 / CL-D9) ─────────────────────────────────────
alter table public.workout_exercises
  add column if not exists prescribed_catalog_key text,
  add column if not exists prescribed_name        text;

comment on column public.workout_exercises.prescribed_name is
  'EX-002 §10.1. The exercise this row REPLACED, snapshotted at write time and permanent. Null in the overwhelming majority of rows — non-null only when the athlete explicitly substituted. Never set because they logged different weight or reps, and never because they skipped something (§10.1).';

-- Only the rows that carry a substitution, which is a small minority of a large table. The coach reads
-- this as "what did this athlete swap away from, and what to" — a per-athlete question, so the workout
-- join is always in play; the partial index keeps it off every ordinary row.
create index if not exists workout_exercises_substituted
  on public.workout_exercises (prescribed_catalog_key)
  where prescribed_catalog_key is not null;

-- ── The writer ───────────────────────────────────────────────────────────────────────────────────────
--
-- One statement for every substitution in a session. Keyed by `position`, which is what the client
-- already sends to `save_workout` and what uniquely places a row inside its workout.
--
-- ⚠ OWNERSHIP IS CHECKED ON THE WORKOUT, NOT THE EXERCISE ROW. `workout_exercises` has no athlete
-- column — the same reason `fetchLastNotes` joins `workouts!inner` — so an unguarded definer function
-- here would let anybody annotate anybody's session. The `exists` clause is the whole gate.
create or replace function public.record_substitutions(p_workout uuid, p_subs jsonb)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count int := 0;
begin
  if p_workout is null or p_subs is null or jsonb_typeof(p_subs) <> 'array' then
    return 0;
  end if;

  if not exists (
    select 1 from public.workouts w
     where w.id = p_workout and w.athlete_id = auth.uid()
  ) then
    raise exception 'not your workout' using errcode = '42501';
  end if;

  update public.workout_exercises we
     set prescribed_catalog_key = nullif(s->>'prescribed_catalog_key', ''),
         prescribed_name        = nullif(s->>'prescribed_name', '')
    from jsonb_array_elements(p_subs) s
   where we.workout_id = p_workout
     and we.position = (s->>'position')::int
     -- A name is the minimum: EX-002 §10.2 makes the NAME the display authority, and a custom or
     -- deleted exercise may have no catalogue key to record at all.
     and nullif(s->>'prescribed_name', '') is not null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function public.record_substitutions(uuid, jsonb) is
  'CL-D9. Records what each substituted exercise replaced, after the commit — never inside save_workout, whose signature has been frozen since 0095 and which every client path calls. Guarded on workouts.athlete_id because workout_exercises has no athlete column of its own.';

revoke execute on function public.record_substitutions(uuid, jsonb) from public;
grant  execute on function public.record_substitutions(uuid, jsonb) to authenticated;

-- ── HALF TWO: "stop giving me this" (CL-D10) ────────────────────────────────────────────────────────
create table if not exists public.exercise_avoidance (
  athlete_id  uuid not null references public.profiles (id) on delete cascade,
  catalog_key text not null,
  -- Optional and free text. A reason the athlete typed is worth more to a coach than any enum this
  -- migration could guess at, and "my shoulder" and "I just hate it" want different responses.
  reason      text check (reason is null or char_length(reason) <= 200),
  created_at  timestamptz not null default now(),
  primary key (athlete_id, catalog_key)
);

create index if not exists exercise_avoidance_athlete
  on public.exercise_avoidance (athlete_id, created_at desc);

alter table public.exercise_avoidance enable row level security;

-- Yours and nobody else's — the same posture `exercise_favorites` has held since 0020. CL-D7: learned
-- state is never readable by another athlete, never in a squad surface, never in /admin.
drop policy if exists exercise_avoidance_own on public.exercise_avoidance;
create policy exercise_avoidance_own on public.exercise_avoidance
  for all using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

comment on table public.exercise_avoidance is
  'CL-D10. The negative counterpart to exercise_favorites (0020) — "stop offering me this". ⚠ NOT READ BY THE COACH ENGINE YET (CL-D11): CL-D3 makes a visible, reversible list in the app a PRECONDITION of assemble() reading it, because an invisible avoidance silently narrowing somebody''s training is the failure mode this whole system is designed against. Removes one EXERCISE, never a movement pattern.';

commit;

-- ══ SELF-CHECK ══════════════════════════════════════════════════════════════════════════════════════
-- Outside the transaction, so a failure reports rather than rolling back work that succeeded.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'workout_exercises'
       and column_name = 'prescribed_name'
  ) then
    raise exception '0138 self-check: workout_exercises.prescribed_name was not added';
  end if;
  if to_regprocedure('public.record_substitutions(uuid, jsonb)') is null then
    raise exception '0138 self-check: record_substitutions was not created';
  end if;
  if to_regclass('public.exercise_avoidance') is null then
    raise exception '0138 self-check: exercise_avoidance was not created';
  end if;
end;
$$;


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- 0139_units_to_imperial.sql
-- ───────────────────────────────────────────────────────────────────────────────────────────────

-- Forge Legacy — 0139: put every athlete on pounds and miles
--
-- ══ WHAT THIS IS ══
--
-- PO: *"Set everyone on LBs right now that's on the app. I don't know what happened but I think you
-- switched everyone. Make sure everyone is on miles too and not kms."*
--
-- A one-time data correction for the closed test cohort, not a schema change.
--
-- ══ ⚠ THERE IS NO SEPARATE DISTANCE SETTING ══
--
-- `units` is the single switch. `distanceUnitFor()` reads it for km-vs-mi (and metres-vs-yards in a
-- pool), `displayWeight()` reads it for kg-vs-lb, and pace and speed follow the same value. Setting
-- `units` to `imperial` therefore fixes weights AND distances in one write — there is nothing else to
-- change, and a second column would be a second thing to disagree with this one.
--
-- ══ WHAT ACTUALLY HAPPENED, RECORDED SO IT IS NOT RE-LITIGATED ══
--
-- `DEFAULT_UNITS` has been `'imperial'` since the constant was written — one commit, never edited. And
-- until 2026-08-12 the ONLY code in the app that could store `'metric'` was the Kgs button on
-- `/preferences`: onboarding asked "Lbs or Kgs" under the hint *"weights, distance and pace across the
-- app"*, held the answer in local state, and **never saved it** (fixed the same day, in
-- `domain/onboarding/service.ts`). So no release, migration or default ever moved anybody to metric —
-- a stored `'metric'` can only have been tapped.
--
-- ⚠ AND THIS OVERWRITES A GENUINE PREFERENCE. Anybody who deliberately chose kilograms is being moved
-- off it without being asked. That is acceptable ONLY because the cohort is a handful of known testers
-- and the PO is asking for it directly. **Do not re-run this once the app has real users** — at that
-- point it stops being a correction and becomes taking somebody's setting away.
--
-- Idempotent, and safe to run twice: the WHERE clause skips rows already correct.
-- Depends on 0022 (profiles.app_prefs). RUN AFTER 0138.

begin;

/*
 * `coalesce` because `app_prefs` is nullable WITH NO DEFAULT (0022's own decision: null means "never
 * touched, use code defaults"). A null row already resolves to imperial in the client, so it needs no
 * write — but writing one costs nothing and makes the column say plainly what the athlete gets, which
 * matters the day somebody reads this table instead of the code.
 *
 * `true` on `jsonb_set`'s create_missing so a blob written before `units` existed gains the key rather
 * than being silently skipped.
 */
update public.profiles
   set app_prefs = jsonb_set(coalesce(app_prefs, '{}'::jsonb), '{units}', '"imperial"', true)
 where app_prefs is null
    or app_prefs->>'units' is distinct from 'imperial';

commit;

-- ══ SELF-CHECK ══════════════════════════════════════════════════════════════════════════════════════
-- Outside the transaction, so a failure reports rather than rolling back a correction that worked.
do $$
declare
  v_wrong int;
  v_total int;
begin
  select count(*) into v_wrong from public.profiles where app_prefs->>'units' is distinct from 'imperial';
  select count(*) into v_total from public.profiles;
  if v_wrong > 0 then
    raise exception '0139 self-check: % of % athletes are still not on imperial', v_wrong, v_total;
  end if;
  raise notice '0139: all % athletes are on pounds and miles.', v_total;
end;
$$;


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- 0140_athlete_weekly_review.sql
-- ───────────────────────────────────────────────────────────────────────────────────────────────

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


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- 0143_coach_intensity_signal.sql
-- ───────────────────────────────────────────────────────────────────────────────────────────────

-- Forge Legacy — 0143: what the athlete does with what Holt says
--
-- ══ WHAT THIS IS ══
--
-- PO: *"Coach Holt would need to learn from how the person is working out. If they're jumping up in
-- weight. If they're staying put. If they're going down in weight. He can ask if they like the feedback
-- every once in a while."*
--
-- Governed by `Coach-Adaptive-Learning-Amendment-001` (CL-D1…CL-D11) and `-002` (the intensity dial).
--
-- ══ ⚠ THE SIGNAL IS ALREADY COMPUTED — IT IS JUST NEVER KEPT ══
--
-- `progressionFor()` classifies every lift in every session as `add_weight | add_reps | hold |
-- back_off | no_history`, which is exactly the PO's three states plus the two honest edges. The live
-- logger builds that map on every session and throws it away when the screen unmounts.
--
-- ⚠ AND IT CANNOT BE RECOMPUTED LATER. The classification depends on the PRESCRIPTION in force at the
-- time — sets, reps, and the top of the range — and none of that is stored on a saved workout. A set
-- of 8 reps means "topped the range" against 3×8 and "short of it" against 3×12, and the saved row
-- cannot tell the two apart. So the decision has to be snapshotted at the moment it is made, exactly
-- like `partners` and the substitution record before it.
--
-- ══ WHY A TABLE AND NOT A COLUMN ══
--
-- One row per LIFT per session, not per session — the athlete who adds weight on squats and backs off
-- on presses in the same hour is the interesting case, and a per-session summary would average them
-- into "hold" and describe nobody.
--
-- ══ WHAT THIS DOES NOT DO ══
--
-- ⚠ NOTHING READS IT YET, AND THAT IS CL-D11. Capture ships before consumption, because nothing can
-- learn from data that was never written and the table's value starts accruing the day it exists
-- rather than the day the engine reads it. When it is read, CL-D3 binds: two occurrences before
-- anything moves, a shown sentence, and a level RAISE must be accepted rather than applied.
--
-- ⚠ AND IT IS NOT ANALYTICS. This is the athlete's own training, readable only by them, and it never
-- leaves their account — `P-6` and CL-D7 both. It is deliberately not in `app_events`, which is
-- opt-out product telemetry with a different purpose, a different consent and a different retention.
--
-- Idempotent. Depends on 0001 (workouts). RUN AFTER 0142.
--
-- ⚠ THIS WAS 0142 AND WAS RENUMBERED. A parallel workstream committed its own 0142
-- (`0142_checkin_orphan_ledger.sql`) while this was being written. Two files claiming one number apply
-- in an undefined order, and the numbering IS the dependency graph here — there is no CLI keeping a
-- history table, so the filename is the only thing saying what runs when.

begin;

create table if not exists public.coach_intensity_signal (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references public.profiles (id) on delete cascade,
  workout_id  uuid not null references public.workouts (id) on delete cascade,
  -- Which lift in the session, by its position — the same key `record_substitutions` uses (0138).
  position    int  not null,
  observed_at timestamptz not null default now(),
  -- `progressionFor().action`. Constrained so a client that invents a sixth state is rejected here
  -- rather than quietly widening what the reader has to handle.
  action      text not null check (action in ('add_weight', 'add_reps', 'hold', 'back_off', 'no_history')),
  catalog_key text,
  pattern     text,
  unique (workout_id, position)
);

create index if not exists coach_intensity_signal_athlete
  on public.coach_intensity_signal (athlete_id, observed_at desc);

alter table public.coach_intensity_signal enable row level security;

-- Yours and nobody else's. CL-D7: learned state is never readable by another athlete, never in a squad
-- surface, never in /admin.
drop policy if exists coach_intensity_signal_own on public.coach_intensity_signal;
create policy coach_intensity_signal_own on public.coach_intensity_signal
  for all using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

comment on table public.coach_intensity_signal is
  'CL-D1/CL-D11. One row per lift per session: what progressionFor decided at the time. Snapshotted because the decision depends on the prescription in force, which a saved workout does not store — 8 reps is "topped the range" against 3x8 and "short" against 3x12. Read by nothing yet, deliberately.';

-- ── The writer ───────────────────────────────────────────────────────────────────────────────────
--
-- Post-commit, at the same call site as `record_substitutions`, and for the same stated reason: this is
-- a mark ON a session rather than part of one, and it must never be able to fail a save that worked.
create or replace function public.record_intensity_signals(p_workout uuid, p_rows jsonb)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count int := 0;
begin
  if p_workout is null or p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    return 0;
  end if;

  -- ⚠ OWNERSHIP FROM THE WORKOUT. Same rule as `record_substitutions`: the child rows carry no athlete
  -- of their own, so an unguarded definer function here would let anybody write against anybody.
  if not exists (select 1 from public.workouts w where w.id = p_workout and w.athlete_id = auth.uid()) then
    raise exception 'not your workout' using errcode = '42501';
  end if;

  insert into public.coach_intensity_signal (athlete_id, workout_id, position, action, catalog_key, pattern)
  select auth.uid(),
         p_workout,
         (r->>'position')::int,
         r->>'action',
         nullif(r->>'catalog_key', ''),
         nullif(r->>'pattern', '')
    from jsonb_array_elements(p_rows) r
   where r->>'action' in ('add_weight', 'add_reps', 'hold', 'back_off', 'no_history')
  on conflict (workout_id, position) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.record_intensity_signals(uuid, jsonb) from public;
grant  execute on function public.record_intensity_signals(uuid, jsonb) to authenticated;

commit;

-- ══ SELF-CHECK ══════════════════════════════════════════════════════════════════════════════════════
do $$
begin
  if to_regclass('public.coach_intensity_signal') is null then
    raise exception '0143 self-check: the table was not created';
  end if;
  if to_regprocedure('public.record_intensity_signals(uuid, jsonb)') is null then
    raise exception '0143 self-check: record_intensity_signals was not created';
  end if;
  raise notice '0143: intensity capture ready. Nothing reads it yet — that is CL-D11.';
end;
$$;
