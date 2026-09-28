-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0229: auto-post lands once per workout per destination
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: §1 is guarded (`if not exists`), §2 only raises, §3 is read-only.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- Auto-post lets a finished workout post itself to friends and/or squads. It writes the SAME recap row a
-- manual post writes, marked `workout_summary->>'auto' = 'true'`. The client skips destinations that
-- already have the workout; this unique index is the database's guarantee that a retry racing a slow
-- first attempt still produces ONE post, not two.
--
-- ⚠ THE APP WORKS WITHOUT THIS. Auto-post ships in client code and is idempotent on its own for every
-- ordinary case. This closes the race. Nothing breaks if it is applied late.
--
-- ⚠ AUTO ROWS ONLY — manual posts are untouched, because older data may hold duplicate manual posts and
-- a table-wide unique index would refuse to build over them.
--
-- §1  creates the partial unique index `squad_posts_auto_once`
-- §2  asserts it exists and is UNIQUE, and RAISES if not
-- §3  reports it, and how many auto-posted rows exist (read-only)
--
-- PREDICTED §3 OUTPUT: one row — is_unique = true — and auto_posts = 0 until the client that writes the
-- marker is deployed AND someone with auto-post on finishes a workout. A non-zero count before the web
-- deploy / OTA would mean something else is writing the marker.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ═════════════════════════════════════════════════════════════════════════════
-- §1 — THE INDEX (verbatim from supabase/migrations/0229_auto_post_once.sql — 2 of 2 statements)
-- ═════════════════════════════════════════════════════════════════════════════

create unique index if not exists squad_posts_auto_once
  on public.squad_posts (workout_id, coalesce(squad_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where workout_id is not null and (workout_summary ->> 'auto') = 'true';

comment on index public.squad_posts_auto_once is
  'Auto-post idempotency (0229): at most one auto-posted recap per workout per destination (squad, or friends when squad_id is null). Marker is workout_summary->>''auto''. Manual posts are not constrained.';


-- ═════════════════════════════════════════════════════════════════════════════
-- §2 — ASSERT
-- ═════════════════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (
    select 1
    from pg_index i
    join pg_class c on c.oid = i.indexrelid
    where c.relname = 'squad_posts_auto_once' and i.indisunique
  ) then
    raise exception '0229: squad_posts_auto_once is missing or not unique';
  end if;
end $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- §3 — REPORT (read-only)
-- ═════════════════════════════════════════════════════════════════════════════

select
  c.relname as index_name,
  i.indisunique as is_unique,
  (select count(*) from public.squad_posts p where (p.workout_summary ->> 'auto') = 'true') as auto_posts
from pg_index i
join pg_class c on c.oid = i.indexrelid
where c.relname = 'squad_posts_auto_once';
