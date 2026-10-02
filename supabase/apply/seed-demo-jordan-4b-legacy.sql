-- ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
-- FILM SEED · STAGE 4b · Jordan's Legacy, filled in   (NOT a migration — data for the hero film)
--
-- PO 10-02: "more awards on the legacy page… some accomplishments… make it more in depth — that's where the
-- emotional hits". Runs AFTER stage 4 (it refuses before). Every line below is true to the seeded year:
--   Accomplishments (athlete-authored, 0023), five more beside stage 4's "Bench Press 235" and stage 2's
--   "Back Squat 225 × 5" — each one a moment the seed's own workouts contain:
--     Deadlift 405 × 3 (Apr 18) · 100 miles run (Jun 10) · First 10K — 6.2 mi (Jul 5) · Deadlift 475 (Jul 25) ·
--     Squat 315 (Aug 3). Featured (max 3 in the app): Bench Press 235, Deadlift 475, First 10K.
--   Pinned Legacy (pins, 0005 + 0024), six pins in this order: Bench Press 235 · 1,000 Pound Club · Chapter I — The
--   Return · First 10K — 6.2 mi · Squat 315 (honor) · Deadlift 475. Shaped exactly as the app's pinCandidate writes
--   them (legacy-pins-live.ts:60-85): title, subtitle, ref_id = the real row, position 0..5.
-- No note on any accomplishment, so no honor metric moves; no trigger exists on accomplishments or pins.
--
-- PASTE THE WHOLE FILE into the Supabase SQL editor and run it once. Safe to run twice (it replaces its own rows).
-- Undo: stage 4 (or 2-REDO) removes the accomplishments; 2-REDO also removes every pin of Jordan's.
-- ══════════════════════════════════════════════════════════════════════════════════════════════════════════════

begin;
set local statement_timeout = '5min';
set local lock_timeout = '15s';
set local timezone = 'UTC';
set local search_path = public, extensions;

create or replace function pg_temp.fl_id(p text) returns uuid language sql immutable as $fn$
  select ('f11de000' || substr(md5('forge-film:' || p), 9, 4) || '4' || substr(md5('forge-film:' || p), 14, 3) || '8' || substr(md5('forge-film:' || p), 18, 15))::uuid
$fn$;

create temp table fl_demo on commit drop as
select v.who, u.id, u.email::text as email
  from (values ('jordan', 'jordan.demo@forgelegacy.app')) v(who, email)
  join auth.users u on lower(u.email) = v.email;

do $$
declare v_j uuid;
begin
  if exists (select 1 from fl_demo d where d.email not like '%.demo@forgelegacy.app') then
    raise exception 'REFUSED: a targeted account is not a .demo@forgelegacy.app address — nothing was changed.';
  end if;
  select d.id into v_j from fl_demo d where d.who = 'jordan';
  if v_j is null or v_j <> pg_temp.fl_id('user:jordan') then raise exception 'the seeded jordan.demo@ account is missing — run stages 0..4 first'; end if;
  if not exists (select 1 from public.chapters c where c.id = pg_temp.fl_id('chapter:jordan:2') and c.athlete_id = v_j) then
    raise exception 'stage 4 is not applied (Chapter II is missing) — paste seed-demo-jordan-4-year.sql first';
  end if;
  if not exists (select 1 from public.accomplishments a where a.id = pg_temp.fl_id('acc:bench-235')) then
    raise exception 'stage 4''s "Bench Press 235" accomplishment is missing — re-run stage 4';
  end if;
end $$;

-- §1 · accomplishments (replaces its own five rows)
delete from public.accomplishments a using fl_demo d where d.who = 'jordan' and a.athlete_id = d.id
   and a.id in (pg_temp.fl_id('acc:dl-405'), pg_temp.fl_id('acc:100-miles'), pg_temp.fl_id('acc:first-10k'),
                pg_temp.fl_id('acc:dl-475'), pg_temp.fl_id('acc:squat-315'));
insert into public.accomplishments (id, athlete_id, name, date, chapter_id, featured, created_at)
select pg_temp.fl_id('acc:' || v.label), d.id, v.name, v.dt::date, pg_temp.fl_id('chapter:jordan:' || v.ch), v.featured, v.at::timestamptz
  from fl_demo d,
       (values ('dl-405',    'Deadlift 405 × 3',   '2026-04-18', 1, false, '2026-04-18 09:10:00-05'),
               ('100-miles', '100 miles run',      '2026-06-10', 2, false, '2026-06-10 07:40:00-05'),
               ('first-10k', 'First 10K — 6.2 mi', '2026-07-05', 2, true,  '2026-07-05 08:30:00-05'),
               ('dl-475',    'Deadlift 475',       '2026-07-25', 2, true,  '2026-07-25 09:05:00-05'),
               ('squat-315', 'Squat 315',          '2026-08-03', 2, false, '2026-08-03 08:00:00-05')) v(label, name, dt, ch, featured, at)
 where d.who = 'jordan';

-- §2 · pins (Jordan's whole Pinned Legacy, in order)
delete from public.pins p using fl_demo d where d.who = 'jordan' and p.athlete_id = d.id;
insert into public.pins (id, athlete_id, kind, title, subtitle, ref_id, position, created_at)
select pg_temp.fl_id('pin:' || v.pos), d.id, v.kind::pin_kind, v.title, v.subtitle, v.ref, v.pos, timestamptz '2026-09-01 06:00:00-05' + (v.pos || ' minutes')::interval
  from fl_demo d,
       (values (0, 'accomplishment', 'Bench Press 235',        'May 12, 2026 · Chapter II — Stronger Than Before', pg_temp.fl_id('acc:bench-235')),
               (1, 'honor',          '1,000 Pound Club',       'Honor · May 12, 2026',
                  (select h.id from public.honor_instances h where h.athlete_id = pg_temp.fl_id('user:jordan') and h.honor_type = 'club_1000' limit 1)),
               (2, 'chapter',        'Chapter I — The Return', 'Sealed chapter', pg_temp.fl_id('chapter:jordan:1')),
               (3, 'accomplishment', 'First 10K — 6.2 mi',     'Jul 5, 2026 · Chapter II — Stronger Than Before', pg_temp.fl_id('acc:first-10k')),
               (4, 'honor',          'Squat 315',              'Honor · Aug 3, 2026',
                  (select h.id from public.honor_instances h where h.athlete_id = pg_temp.fl_id('user:jordan') and h.display_name = 'Squat 315' limit 1)),
               (5, 'accomplishment', 'Deadlift 475',           'Jul 25, 2026 · Chapter II — Stronger Than Before', pg_temp.fl_id('acc:dl-475'))) v(pos, kind, title, subtitle, ref)
 where d.who = 'jordan';

-- §3 · assert
do $$
begin
  if (select count(*) from public.accomplishments a where a.athlete_id = pg_temp.fl_id('user:jordan')) <> 7 then
    raise exception 'expected 7 accomplishments, found %', (select count(*) from public.accomplishments a where a.athlete_id = pg_temp.fl_id('user:jordan'));
  end if;
  if (select count(*) from public.accomplishments a where a.athlete_id = pg_temp.fl_id('user:jordan') and a.featured) <> 3 then
    raise exception 'expected 3 featured accomplishments';
  end if;
  if exists (select 1 from public.pins p where p.athlete_id = pg_temp.fl_id('user:jordan') and p.ref_id is null) then
    raise exception 'a pin has no ref_id (an honor it points at is missing)';
  end if;
end $$;

commit;

-- §4 · report (the one result the SQL editor shows)
select 'accomplishments' as what,
       (select string_agg(a.name || case when a.featured then ' ★' else '' end, ' · ' order by a.date)
          from public.accomplishments a join auth.users u on u.id = a.athlete_id where u.email = 'jordan.demo@forgelegacy.app') as actual,
       '7 (★ Bench Press 235, First 10K, Deadlift 475)' as expected
union all
select 'pins',
       (select string_agg(p.position || ' ' || p.kind || ': ' || p.title, ' · ' order by p.position)
          from public.pins p join auth.users u on u.id = p.athlete_id where u.email = 'jordan.demo@forgelegacy.app'),
       '6, in order';
