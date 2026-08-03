-- ============================================================================
-- RESET ALL ACCOUNTS — full athlete-data wipe before an open testing round
-- ============================================================================
--
-- THIS IS NOT A MIGRATION. It is deliberately outside `supabase/migrations/`:
-- that chain is the schema's history and is applied in order, once. This is a
-- one-off operator action against DATA, run by hand, and it must never become
-- part of the chain.
--
-- WHAT IT DESTROYS, permanently and with no undo:
--   every account (auth.users) · every profile · every squad and its whole
--   contents · every workout, set and personal record · every chapter, goal,
--   photo, accomplishment, honor instance, rank state, competition, friendship
--   and timeline event · and every uploaded file in the six media buckets.
--
-- WHAT IT KEEPS — the app is unusable without these, and they are NOT athlete
-- data. Step 4 proves they survived:
--   honor_catalog · honor_requires · rank_families
--
-- IT DELETES YOUR OWN ACCOUNT TOO. "Every account" includes the one you are
-- signed in with; you will sign up again like everyone else. Step 2b is the
-- variant that spares one account if that is not what you want.
--
-- Run the steps IN ORDER, one at a time, in the Supabase SQL editor. Read the
-- output of step 1 before running step 2.
-- ============================================================================


-- ── STEP 1 · Look at what you are about to destroy ──────────────────────────
-- Run this alone, first. If the numbers are not what you expect, stop.

select 'auth.users'              as table_name, count(*) from auth.users
union all select 'profiles',              count(*) from public.profiles
union all select 'squads',                count(*) from public.squads
union all select 'workouts',              count(*) from public.workouts
union all select 'chapters',              count(*) from public.chapters
union all select 'honor_instances',       count(*) from public.honor_instances
union all select 'storage objects',       count(*) from storage.objects
  where bucket_id in ('avatars','chapter-photos','squad-media','squad-photos','transformation-media','media')
order by 1;


-- ── STEP 2 · Delete every account ───────────────────────────────────────────
-- ONE statement does nearly all of it. `profiles.id` references
-- `auth.users(id) ON DELETE CASCADE`, and 34 tables cascade off `profiles`
-- (squads included, via `squads.owner_id`), so removing the user unwinds the
-- entire graph beneath them.

delete from auth.users;

-- ── STEP 2b · …or keep ONE account (use INSTEAD of step 2, not after) ───────
-- Spares a single athlete — yours — so you can watch the app as a returning
-- user while testers arrive fresh. Replace the address.
--
--   delete from auth.users where email <> 'you@example.com';


-- ── STEP 3 · Delete the uploaded files — NOT IN SQL ─────────────────────────
--
-- Storage objects are NOT rows in the tables above and do NOT cascade. Without
-- clearing them, every avatar, progress photo, chapter photo, squad crest and
-- check-in video stays on disk, owned by accounts that no longer exist. All six
-- buckets are PUBLIC, so an orphaned file is still readable by anyone holding
-- its URL.
--
-- THIS CANNOT BE DONE IN SQL. Supabase guards the table with a trigger:
--
--   ERROR 42501: Direct deletion from storage tables is not allowed.
--                Use the Storage API instead.   [storage.protect_delete()]
--
-- Deleting the rows by hand would leave the actual FILES behind with nothing
-- pointing at them — the guard exists to prevent precisely that. The supported
-- route is the dashboard, which deletes rows and objects together:
--
--   Supabase Dashboard → Storage → pick the bucket → ⋯ → "Empty bucket"
--
-- Empty all six. Keep the BUCKETS — the app's RLS policies hang off them and
-- uploads break if they are deleted rather than emptied:
--
--   avatars · chapter-photos · squad-media · squad-photos
--   transformation-media · media
--
-- (`media` is from 0006 and predates the per-feature buckets. Nothing in the
--  current app writes to it, but it can still hold objects from earlier builds.)
--
-- Then run STEP 4, which counts what is left across all six.


-- ── STEP 4 · Prove it worked ────────────────────────────────────────────────
-- Every athlete-data table must read 0. The three reference tables must NOT.
-- If any athlete table is non-zero, its rows did not have a cascade path —
-- report the table rather than deleting it blind.

select 'SHOULD BE 0 · auth.users'         as check, count(*) from auth.users
union all select 'SHOULD BE 0 · profiles',              count(*) from public.profiles
union all select 'SHOULD BE 0 · squads',                count(*) from public.squads
union all select 'SHOULD BE 0 · squad_members',         count(*) from public.squad_members
union all select 'SHOULD BE 0 · squad_posts',           count(*) from public.squad_posts
union all select 'SHOULD BE 0 · squad_post_comments',   count(*) from public.squad_post_comments
union all select 'SHOULD BE 0 · squad_post_reactions',  count(*) from public.squad_post_reactions
union all select 'SHOULD BE 0 · squad_checkins',        count(*) from public.squad_checkins
union all select 'SHOULD BE 0 · squad_checkin_views',   count(*) from public.squad_checkin_views
union all select 'SHOULD BE 0 · squad_join_requests',   count(*) from public.squad_join_requests
union all select 'SHOULD BE 0 · squad_records',         count(*) from public.squad_records
union all select 'SHOULD BE 0 · squad_goal_completions',count(*) from public.squad_goal_completions
union all select 'SHOULD BE 0 · challenges',            count(*) from public.challenges
union all select 'SHOULD BE 0 · challenge_participants',count(*) from public.challenge_participants
union all select 'SHOULD BE 0 · challenge_results',     count(*) from public.challenge_results
union all select 'SHOULD BE 0 · workouts',              count(*) from public.workouts
union all select 'SHOULD BE 0 · workout_exercises',     count(*) from public.workout_exercises
union all select 'SHOULD BE 0 · workout_sets',          count(*) from public.workout_sets
union all select 'SHOULD BE 0 · workout_templates',     count(*) from public.workout_templates
union all select 'SHOULD BE 0 · workout_invites',       count(*) from public.workout_invites
union all select 'SHOULD BE 0 · programs',              count(*) from public.programs
union all select 'SHOULD BE 0 · chapters',              count(*) from public.chapters
union all select 'SHOULD BE 0 · chapter_photos',        count(*) from public.chapter_photos
union all select 'SHOULD BE 0 · goals',                 count(*) from public.goals
union all select 'SHOULD BE 0 · goal_progress',         count(*) from public.goal_progress
union all select 'SHOULD BE 0 · accomplishments',       count(*) from public.accomplishments
union all select 'SHOULD BE 0 · pins',                  count(*) from public.pins
union all select 'SHOULD BE 0 · honor_instances',       count(*) from public.honor_instances
union all select 'SHOULD BE 0 · personal_records',      count(*) from public.personal_records
union all select 'SHOULD BE 0 · athlete_rank_state',    count(*) from public.athlete_rank_state
union all select 'SHOULD BE 0 · body_entries',          count(*) from public.body_entries
union all select 'SHOULD BE 0 · transformation_entries',count(*) from public.transformation_entries
union all select 'SHOULD BE 0 · exercise_favorites',    count(*) from public.exercise_favorites
union all select 'SHOULD BE 0 · friendships',           count(*) from public.friendships
union all select 'SHOULD BE 0 · timeline_events',       count(*) from public.timeline_events
union all select 'SHOULD BE 0 · storage objects',       count(*) from storage.objects
  where bucket_id in ('avatars','chapter-photos','squad-media','squad-photos','transformation-media','media')
-- ── the three that must SURVIVE ──
union all select 'MUST NOT BE 0 · honor_catalog',       count(*) from public.honor_catalog
union all select 'MUST NOT BE 0 · honor_requires',      count(*) from public.honor_requires
union all select 'MUST NOT BE 0 · rank_families',       count(*) from public.rank_families
order by 1;
