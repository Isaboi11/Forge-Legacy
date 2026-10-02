-- ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
-- FILM SEED · REMOVE · deletes the six demo accounts and everything they own   (NOT a migration)
--
-- PASTE THE WHOLE FILE. Safe to run twice (a second run finds nothing and reports zeros).
-- Deletes exactly six auth.users rows — the .demo@forgelegacy.app addresses below — and lets the cascades do the
-- rest: auth.identities/sessions (GoTrue FKs), profiles (0001: on delete cascade) and every athlete table under it
-- (the same path reset-all-accounts.sql relies on). squads cascade through owner_id.
--
-- Order, and why: Ironside's members are deleted first, then the squad, so the BEFORE DELETE trigger
-- squads_tell_members_deleted (0251:266) finds nobody to notify; then the users.
--
-- ⚠ NOT DONE IN SQL: photos/videos uploaded to the chapter-photos bucket (or an avatar). storage.objects cannot be
--   deleted from SQL (storage.protect_delete). Delete the uploaded files under Storage → chapter-photos → the folders
--   named after Jordan's chapter ids BEFORE running this (§3 of SEED-NOTES lists them), or they stay as orphans.
-- ══════════════════════════════════════════════════════════════════════════════════════════════════════════════

begin;

create temp table fl_demo on commit drop as
select u.id, u.email::text as email
  from auth.users u
 where lower(u.email) in ('jordan.demo@forgelegacy.app', 'dre.demo@forgelegacy.app', 'sam.demo@forgelegacy.app', 'alex.demo@forgelegacy.app', 'taylor.demo@forgelegacy.app', 'morgan.demo@forgelegacy.app');

-- §2-guard: only .demo@forgelegacy.app accounts, at most six, and nobody else inside Jordan's squad.
do $$
begin
  if exists (select 1 from fl_demo where email not like '%.demo@forgelegacy.app') or (select count(*) from fl_demo) > 6 then
    raise exception 'REFUSED: the target list is not exactly the demo accounts.';
  end if;
  if exists (select 1 from public.squad_members m
               join public.squads s on s.id = m.squad_id
               join fl_demo d on d.id = s.owner_id
              where m.user_id not in (select id from fl_demo)) then
    raise exception 'REFUSED: a non-demo athlete is a member of a demo squad — remove them by hand first.';
  end if;
end $$;

delete from public.squad_members m using public.squads s, fl_demo d
 where m.squad_id = s.id and s.owner_id = d.id and m.user_id <> s.owner_id;
delete from public.squad_members m using fl_demo d where m.user_id = d.id;
delete from public.squads s using fl_demo d where s.owner_id = d.id;

-- Push rows ABOUT a demo account sitting in a real athlete's outbox (actor_id has no FK, so no cascade reaches them).
delete from public.push_outbox o using fl_demo d where o.actor_id = d.id;

delete from auth.users u using fl_demo d where u.id = d.id;

-- §2: nothing left.
do $$
begin
  if exists (select 1 from auth.users where lower(email) in ('jordan.demo@forgelegacy.app', 'dre.demo@forgelegacy.app', 'sam.demo@forgelegacy.app', 'alex.demo@forgelegacy.app', 'taylor.demo@forgelegacy.app', 'morgan.demo@forgelegacy.app')) then
    raise exception 'auth.users rows remain';
  end if;
end $$;

commit;

-- §3 — every count must be 0. (Ids are recomputed from the seed's deterministic scheme, so this also finds
-- orphans that would have outlived their auth.users row.)
with ids as (
  select ('f11de000' || substr(md5('forge-film:user:' || w), 9, 4) || '4' || substr(md5('forge-film:user:' || w), 14, 3) || '8' || substr(md5('forge-film:user:' || w), 18, 15))::uuid as id
    from unnest(array['jordan', 'dre', 'sam', 'alex', 'taylor', 'morgan']) w
)
select 'auth.users (by email)' as remaining, count(*) as n from auth.users where lower(email) in ('jordan.demo@forgelegacy.app', 'dre.demo@forgelegacy.app', 'sam.demo@forgelegacy.app', 'alex.demo@forgelegacy.app', 'taylor.demo@forgelegacy.app', 'morgan.demo@forgelegacy.app')
union all select 'auth.identities', count(*) from auth.identities where user_id in (select id from ids)
union all select 'profiles', count(*) from public.profiles where id in (select id from ids)
union all select 'squads (Ironside)', count(*) from public.squads where id = ('f11de000' || substr(md5('forge-film:squad:ironside'), 9, 4) || '4' || substr(md5('forge-film:squad:ironside'), 14, 3) || '8' || substr(md5('forge-film:squad:ironside'), 18, 15))::uuid
union all select 'workouts', count(*) from public.workouts where athlete_id in (select id from ids)
union all select 'personal_records', count(*) from public.personal_records where athlete_id in (select id from ids)
union all select 'timeline_events', count(*) from public.timeline_events where athlete_id in (select id from ids)
union all select 'honor_instances', count(*) from public.honor_instances where athlete_id in (select id from ids)
union all select 'chapters', count(*) from public.chapters where athlete_id in (select id from ids)
union all select 'programs', count(*) from public.programs where athlete_id in (select id from ids)
union all select 'program_sessions', count(*) from public.program_sessions where athlete_id in (select id from ids)
union all select 'accomplishments', count(*) from public.accomplishments where athlete_id in (select id from ids)
union all select 'athlete_rank_state', count(*) from public.athlete_rank_state where athlete_id in (select id from ids)
union all select 'athlete_entitlement', count(*) from public.athlete_entitlement where athlete_id in (select id from ids)
union all select 'athlete_usage', count(*) from public.athlete_usage where athlete_id in (select id from ids)
union all select 'health_consents', count(*) from public.health_consents where athlete_id in (select id from ids)
union all select 'squad_members', count(*) from public.squad_members where user_id in (select id from ids)
union all select 'push_outbox', count(*) from public.push_outbox where user_id in (select id from ids)
union all select 'chapter_photos', count(*) from public.chapter_photos where athlete_id in (select id from ids)
union all select 'push_outbox (about them)', count(*) from public.push_outbox where actor_id in (select id from ids);
