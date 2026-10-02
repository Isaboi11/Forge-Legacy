-- ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
-- FILM SEED · STAGE 0 · the six demo accounts   (NOT a migration — data for the hero film, feat/hero-film)
--
-- ⚠ EDIT ONE LINE FIRST: Jordan's password, in §0 below ('CHANGE-ME'). The file refuses to run until you do.
--   Sign in afterwards on the web app with jordan.demo@forgelegacy.app + that password (normal email sign-in).
--
-- PASTE THE WHOLE FILE into the Supabase SQL editor and run it once. Safe to run twice (insert-if-absent
-- everywhere; a second run changes nothing and does NOT change the password — use the dashboard for that).
--
-- What it writes:
--   auth.users ×6 + auth.identities ×6 (provider 'email') — Jordan with a bcrypt password and a confirmed email;
--     Dre, Sam, Alex, Taylor, Morgan with random unusable passwords. They never sign in.
--   profiles ×6 — minted by the signup trigger handle_new_user() (0001:185) from raw_user_meta_data
--     (name, first_name, handle, initials), then completed here: onboarded_at (the ONLY boot gate,
--     route-for.ts:31-37), athlete_type, environment, experience, training_goals, tz, app_prefs (imperial),
--     standard, discoverable=false (kept out of athlete search), created_at backdated to the signup.
--   chapters ×6 — each account's Chapter I, as complete_onboarding (0199) would have made it. Jordan's is
--     "Chapter I — The Return", starting 2026-01-05.
--   athlete_entitlement (Jordan) — PREMIUM / GRANT / coach_ai = true / coach_ai_until null (0203:125 pattern).
--   health_consents (Jordan) — ai_sharing + nutrition granted at policy 2026-09-25 (consent.ts:41), so no AI call
--     or Nutrition visit stops at the Washington MHMDA consent sheet.
--   athlete_rank_state (Jordan) — Foundation I.
--
-- ⚠ ONE SIDE EFFECT OUTSIDE THE DEMO ACCOUNTS, AND HOW IT IS CANCELLED: naming a profile fires push_athlete_signup
--   (0137:205), which files a "New athlete — <name> just signed up" row in push_outbox for every app_admins user with
--   a live device — i.e. YOU. Those rows are deleted in this same transaction (by actor_id = the demo accounts),
--   before the 1-minute push drain (cron forge-push-drain, 0120:664) can ever read them. §2 asserts none remain.
--   Not cancellable: /admin's signup list and metrics will count six more athletes (no exclusion flag exists).
-- ══════════════════════════════════════════════════════════════════════════════════════════════════════════════

begin;

set local timezone = 'UTC';
set local search_path = public, extensions;

-- §0 ─────────────────────────────────────────────────────────────────────────────────────────────────────────
-- ⚠⚠ JORDAN'S PASSWORD — replace CHANGE-ME (at least 10 characters). Plain text in this editor only; stored as bcrypt.
create temp table fl_secret on commit drop as select 'CHANGE-ME'::text as pw;

create or replace function pg_temp.fl_id(p text) returns uuid language sql immutable as $fn$
  select ('f11de000' || substr(md5('forge-film:' || p), 9, 4) || '4' || substr(md5('forge-film:' || p), 14, 3) || '8' || substr(md5('forge-film:' || p), 18, 15))::uuid
$fn$;

create temp table fl_people on commit drop as
select v.*, pg_temp.fl_id('user:' || v.who) as id
  from (values
    ('jordan', 'jordan.demo@forgelegacy.app', 'Jordan Reyes', 'Jordan', 'jordan_reyes', 'JR', 'male', timestamptz '2026-01-04 20:05:00-06', timestamptz '2026-01-04 20:18:00-06'),
    ('dre', 'dre.demo@forgelegacy.app', 'Dre Carter', 'Dre', 'dre_carter', 'DC', 'male', timestamptz '2026-01-10 17:40:00-06', timestamptz '2026-01-10 17:52:00-06'),
    ('sam', 'sam.demo@forgelegacy.app', 'Sam Okafor', 'Sam', 'sam_okafor', 'SO', 'unspecified', timestamptz '2026-01-11 08:20:00-06', timestamptz '2026-01-11 08:33:00-06'),
    ('alex', 'alex.demo@forgelegacy.app', 'Alex Kim', 'Alex', 'alex_kim', 'AK', 'unspecified', timestamptz '2026-01-12 19:55:00-06', timestamptz '2026-01-12 20:06:00-06'),
    ('taylor', 'taylor.demo@forgelegacy.app', 'Taylor Brooks', 'Taylor', 'taylor_brooks', 'TB', 'female', timestamptz '2026-01-14 18:25:00-06', timestamptz '2026-01-14 18:37:00-06'),
    ('morgan', 'morgan.demo@forgelegacy.app', 'Morgan Lee', 'Morgan', 'morgan_lee', 'ML', 'unspecified', timestamptz '2026-01-16 07:10:00-06', timestamptz '2026-01-16 07:22:00-06')
  ) v(who, email, name, first_name, handle, initials, sex, signup_at, onboarded_at);

do $$
begin
  if (select pw from fl_secret) = 'CHANGE-ME' or length((select pw from fl_secret)) < 10 then
    raise exception 'REFUSED: set Jordan''s password on the fl_secret line (not CHANGE-ME, ≥ 10 characters). Nothing was changed.';
  end if;
  if exists (select 1 from fl_people where email not like '%.demo@forgelegacy.app') then
    raise exception 'REFUSED: a non-demo address is in the list.';
  end if;
  -- An address already in use by an account this seed did not create (e.g. someone signed up with it by hand).
  if exists (select 1 from auth.users u join fl_people p on lower(u.email) = p.email where u.id <> p.id) then
    raise exception 'REFUSED: one of the six .demo@ addresses already belongs to another account — run seed-demo-jordan-REMOVE.sql or delete it in Auth first.';
  end if;
  -- profiles.handle is unique (citext). A real athlete holding one of these handles would make the signup trigger fail.
  if exists (select 1 from public.profiles pr join fl_people p on lower(pr.handle::text) = p.handle where pr.id <> p.id) then
    raise exception 'REFUSED: a real athlete already uses one of the handles (%). Edit the handle column in fl_people and re-run.',
      (select string_agg(p.handle, ', ') from public.profiles pr join fl_people p on lower(pr.handle::text) = p.handle where pr.id <> p.id);
  end if;
end $$;

-- ─── §1a · auth.users + auth.identities ──────────────────────────────────────────────────────────────────────

-- GoTrue reads these token columns as strings and fails sign-in on NULL, so they are written as ''.
-- raw_user_meta_data carries the profile fields handle_new_user() (0001:185) copies into profiles.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                        confirmation_token, recovery_token, email_change_token_new, email_change)
select '00000000-0000-0000-0000-000000000000'::uuid, p.id, 'authenticated', 'authenticated', p.email,
       crypt(case when p.who = 'jordan' then s.pw else encode(gen_random_bytes(32), 'hex') end, gen_salt('bf', 10)),
       p.signup_at,
       '{"provider":"email","providers":["email"]}'::jsonb,
       jsonb_build_object('name', p.name, 'first_name', p.first_name, 'handle', p.handle, 'initials', p.initials,
                          'email', p.email, 'email_verified', true, 'phone_verified', false, 'sub', p.id::text),
       p.signup_at, p.signup_at, '', '', '', ''
  from fl_people p cross join fl_secret s
 where not exists (select 1 from auth.users u where u.id = p.id);

-- The email identity GoTrue's password sign-in looks up (provider_id = the user id for provider 'email').
-- auth.identities.email is a generated column and is not written.
insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select p.id::text, p.id,
       jsonb_build_object('sub', p.id::text, 'email', p.email, 'email_verified', true, 'phone_verified', false),
       'email', null, p.signup_at, p.signup_at
  from fl_people p
 where not exists (select 1 from auth.identities i where i.provider = 'email' and i.user_id = p.id);

-- ─── §1b · cancel the operator "new athlete" pushes the signup trigger just filed ────────────────────────────

-- push_tg_athlete_signup (0137:150) inserted these for app_admins with a device. Still PENDING, uncommitted, unseen.
delete from public.push_outbox o
 using fl_people p
 where o.actor_id = p.id and o.kind = 'athlete_signup' and o.status = 'PENDING';

-- ─── §1c · profiles: fully onboarded ─────────────────────────────────────────────────────────────────────────

-- No trigger fires on these columns (push_athlete_signup is 'update of name', moderation is 'update of handle, name',
-- push_training_started is 'update of training_since').
update public.profiles pr
   set created_at   = p.signup_at,
       updated_at   = p.onboarded_at,
       onboarded_at = p.onboarded_at,
       sex          = p.sex::sex,
       athlete_type = (case when p.who = 'jordan' then 'Strength' else 'Hybrid' end)::athlete_type,
       environment  = 'commercial_gym',
       experience   = case when p.who = 'jordan' then 'intermediate' else 'beginner' end,
       training_goals = case when p.who = 'jordan' then array['strength', 'endurance'] else array['health'] end,
       tz           = 'America/Chicago',
       discoverable = false,
       app_prefs    = $json${"units":"imperial","theme":"forge","holtTips":"off","autoPost":{"friends":false,"squadIds":[],"asked":true},"holtInWorkout":"on"}$json$::jsonb,
       standard     = case when p.who = 'jordan' then 'Show up. Do the work. Come back.' else null end,
       -- a re-run must not undo a later stage's stored rank
       rank_family  = coalesce(pr.rank_family, 'foundation'),
       rank_level   = coalesce(pr.rank_level, 1)
  from fl_people p
 where pr.id = p.id;

-- auth.users.created_at = the signup moment ("Forging since" reads profiles.created_at, profile/live.ts:61).
update auth.users u set created_at = p.signup_at from fl_people p where u.id = p.id and u.created_at <> p.signup_at;

-- ─── §1d · Chapter I for each account (complete_onboarding, 0199) ────────────────────────────────────────────

insert into public.chapters (id, athlete_id, name, start_date, is_active, workout_count, honor_count, created_at)
select pg_temp.fl_id('chapter:' || p.who || ':1'), p.id,
       case when p.who = 'jordan' then 'Chapter I — The Return' else 'Chapter I — Building Your Foundation' end,
       case when p.who = 'jordan' then date '2026-01-05' else (p.onboarded_at at time zone 'America/Chicago')::date end,
       true, 0, 0, p.onboarded_at
  from fl_people p
 where not exists (select 1 from public.chapters c where c.athlete_id = p.id);

-- ─── §1e · Premium AI for Jordan only (0203:125 grant pattern; columns 0145:133 + 0214:98) ───────────────────

insert into public.athlete_entitlement (athlete_id, tier, premium_kind, premium_until, coach_ai, coach_ai_until, grant_note)
select p.id, 'PREMIUM', 'GRANT', null, true, null,
       'Film demo athlete Jordan (feat/hero-film). Premium AI grant. Demo account - remove with seed-demo-jordan-REMOVE.sql.'
  from fl_people p where p.who = 'jordan'
on conflict (athlete_id) do update
   set tier = 'PREMIUM', premium_kind = 'GRANT', premium_until = null, coach_ai = true, coach_ai_until = null,
       grant_note = excluded.grant_note, updated_at = now();

-- ─── §1f · health-data consents for Jordan (0224; current policy version consent.ts:41-45) ───────────────────

insert into public.health_consents (athlete_id, kind, action, policy_version, platform)
select p.id, k.kind, 'granted', '2026-09-25', 'web'
  from fl_people p cross join (values ('ai_sharing'), ('nutrition')) k(kind)
 where p.who = 'jordan'
   and not exists (select 1 from public.health_consents c where c.athlete_id = p.id and c.kind = k.kind
                     and c.action = 'granted' and c.policy_version = '2026-09-25');

-- ─── §1g · stored rank: Foundation I (no ceremony on a first look at Home) ───────────────────────────────────

insert into public.athlete_rank_state (athlete_id, family, sub_tier, rank_level, journey_start_date, family_entry_date, updated_at)
select p.id, 'foundation', 1, 1, null, date '2026-01-05', p.onboarded_at from fl_people p where p.who = 'jordan'
on conflict (athlete_id) do nothing;

-- ─── §2 · assert ─────────────────────────────────────────────────────────────────────────────────────────────

do $$
begin
  if (select count(*) from auth.users u join fl_people p on p.id = u.id and u.email_confirmed_at is not null) <> 6 then
    raise exception 'expected 6 confirmed auth.users rows';
  end if;
  if (select count(*) from auth.identities i join fl_people p on p.id = i.user_id where i.provider = 'email') <> 6 then
    raise exception 'expected 6 email identities';
  end if;
  if (select count(*) from public.profiles pr join fl_people p on p.id = pr.id
       where pr.onboarded_at is not null and pr.name = p.name and pr.first_name = p.first_name) <> 6 then
    raise exception 'expected 6 onboarded, named profiles (did handle_new_user fire?)';
  end if;
  if not exists (select 1 from auth.users u, fl_secret s
                  where u.id = pg_temp.fl_id('user:jordan') and u.encrypted_password = crypt(s.pw, u.encrypted_password)) then
    raise exception 'Jordan''s stored password does not match fl_secret (a re-run never changes it — use the dashboard)';
  end if;
  if not exists (select 1 from public.athlete_entitlement e where e.athlete_id = pg_temp.fl_id('user:jordan')
                   and e.tier = 'PREMIUM' and e.coach_ai and e.coach_ai_until is null) then
    raise exception 'Jordan has no Premium AI grant';
  end if;
  if (select count(*) from public.chapters c join fl_people p on p.id = c.athlete_id where c.is_active) <> 6 then
    raise exception 'expected one active Chapter I per account';
  end if;
  if exists (select 1 from public.push_outbox o join fl_people p on p.id in (o.user_id, o.actor_id)) then
    raise exception 'a push_outbox row exists for/about a demo account';
  end if;
end $$;

commit;

-- ─── §3 · report ─────────────────────────────────────────────────────────────────────────────────────────────
-- One row per account. Expected: 6 rows, every one confirmed · identity · onboarded · Chapter I active; Jordan PREMIUM + AI + 2 consents.
select u.email,
       pr.name,
       pr.handle::text as handle,
       (u.email_confirmed_at is not null)                                            as confirmed,
       exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email') as identity,
       (pr.onboarded_at is not null)                                                 as onboarded,
       (select c.name from public.chapters c where c.athlete_id = u.id and c.is_active) as active_chapter,
       coalesce((select e.tier || case when e.coach_ai then ' + AI' else '' end from public.athlete_entitlement e where e.athlete_id = u.id), '(default tier)') as entitlement,
       (select count(*) from public.health_consents h where h.athlete_id = u.id and h.action = 'granted') as consents,
       (select count(*) from public.push_outbox o where u.id in (o.user_id, o.actor_id))  as push_rows
  from auth.users u
  join public.profiles pr on pr.id = u.id
 where u.email like '%.demo@forgelegacy.app'
 order by u.created_at;
