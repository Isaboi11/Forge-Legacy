-- Forge Legacy — 0141: squad check-in videos actually expire
--
-- ⛔ SUPERSEDED BY 0142 — DO NOT RE-PASTE THIS FILE. Its `storage.objects` delete is not merely
--    ungranted, it is categorically impossible: Supabase's `storage.protect_delete()` trigger raises
--    42501 on any direct delete from a storage table. Worse, nulling `video_url` without recording the
--    object path minted untraceable orphans. 0142 drops and replaces `squad_checkin_prune` with a version
--    that writes the path down. Re-running this file would reinstate the broken body.
--
-- ⚠ THE BUG. 0049 re-modelled check-ins as ephemeral 24h "stories", and every read path honours that:
--   `fetchSquadCheckins` filters `.gte(created_at, now-24h)`, and 0050 / 0051 / 0053 / 0055 / 0108 all
--   carry `created_at >= now() - interval '24 hours'`. But that is a READ FILTER, not a lifetime. Nothing
--   has ever deleted anything. The row persists, and — the part that costs money — so does the ≤30s video
--   in the public `squad-media` bucket, forever, for a feature the athlete believes is gone by tomorrow.
--   The four jobs that exist (`forge-push-drain`, `forge-push-reconcile`, `forge-events-prune`,
--   `forge-metrics-rollup`) touch none of it. This is both an unbounded storage cost and a broken promise.
--
-- ⚠ WHY THIS DELETES THE VIDEO AND NOT THE ROW. The obvious fix — delete check-ins older than a day —
--   silently breaks two other systems that read this table WITHOUT a 24h window:
--     · 0099/0100 `squad_checkins_logged` = count(distinct created_at::date) per athlete, and the honor
--       `team_player` needs FIFTY of those days. Prune the rows and that count can never exceed 1, so the
--       honor becomes permanently unearnable — with no error anywhere to say so.
--     · 0130 admin metrics count check-ins 'ever' and per-window. Pruning makes both quietly wrong.
--   The row is a uuid, two fks, a url and a timestamp. The video is ~100% of the bytes. So: keep the row
--   forever (the honor and the analytics stay honest), and destroy the media at 24h.
--
-- ⚠ TWO HALVES, REPORTED SEPARATELY. Nulling `video_url` makes the video unreachable from the app the
--   moment it runs — nothing points at it. Deleting the `storage.objects` row is the byte-reclamation
--   half, and it needs privileges on a schema owned by `supabase_storage_admin`, which may or may not be
--   granted here. So the storage delete is wrapped: if it is denied, the row still gets nulled and the
--   function reports the shortfall rather than failing the whole prune. Check both numbers after applying.
--
-- Applicable by pasting into the SQL editor — there is no CLI and no service key in this project (see the
-- sender comment in 0120), which is also why this cannot call the Storage REST API to delete properly.
--
-- RUN BY HAND.

-- ── Schema: a pruned check-in is a row with no video ────────────────────────────
alter table public.squad_checkins alter column video_url drop not null;
alter table public.squad_checkins add column if not exists video_pruned_at timestamptz;

comment on column public.squad_checkins.video_url is
  'Public squad-media URL, or NULL once the 24h story window has passed and forge-checkin-prune destroyed the media. Every read path already filters to created_at >= now()-24h, so a NULL is never rendered.';
comment on column public.squad_checkins.video_pruned_at is
  'When the video was destroyed. The row itself is kept forever — 0099/0100 count check-in DAYS for the team_player honor, and 0130 counts them for admin metrics.';

-- Only rows still holding media are candidates, so the job converges instead of rescanning history.
create index if not exists squad_checkins_prunable
  on public.squad_checkins (created_at)
  where video_url is not null;

-- ── The prune ──────────────────────────────────────────────────────────────────
-- Returns (videos_cleared, objects_deleted). A gap between them means the storage delete was denied and
-- those bytes are orphaned — reachable by nobody, but still billed until a dashboard pass removes them.
--
-- ⚠ DROPPED FIRST, AND IT MUST BE. `create or replace` CANNOT change a function's return type — Postgres
-- raises `42P13: cannot change return type of existing function`. 0142 replaces this same function with
-- one returning `int`, so the moment 0142 has run, re-running this file (or running the two out of
-- order) fails on that error and stops the whole chain. Migrations here are pasted by hand and re-runs
-- are the normal recovery, so a file that can only ever be run once is a file that will strand somebody.
--
-- Dropping resets the EXECUTE grant to PUBLIC; the `revoke` further down restores it in the same pass,
-- which is the same reasoning 0120 records for `notification_events_for`.
drop function if exists public.squad_checkin_prune(int);

create function public.squad_checkin_prune(p_limit int default 500)
returns table (videos_cleared int, objects_deleted int)
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare
  v_cleared int := 0;
  v_objects int := 0;
begin
  -- Bounded batch, in the `push_drain(50)` / `app_events_prune(20000)` style: one statement can never
  -- hold a lock for minutes.
  create temp table _doomed on commit drop as
    select id,
           -- Derive the object path from the row's OWN url. Never construct it — that is what keeps this
           -- from ever touching a squad photo (`<squad>/photo.ext`) or a feed post's media, which share
           -- this bucket. The upload convention is `<squadId>/checkin-<userId>-<epoch>.<ext>`
           -- (`uploadCheckinVideo`, src/data/squad-live.ts).
           substring(video_url from '/squad-media/(.+)$') as object_name
      from public.squad_checkins
     where video_url is not null
       and created_at < now() - interval '24 hours'
     order by created_at
     limit greatest(coalesce(p_limit, 500), 0);

  -- Byte reclamation. Belt and braces on top of deriving the name from the row: the bucket must be
  -- squad-media AND the name must carry the checkin- prefix. A squad photo can never match both.
  begin
    with gone as (
      delete from storage.objects o
       using _doomed d
       where o.bucket_id = 'squad-media'
         and o.name = d.object_name
         and o.name like '%/checkin-%'
      returning 1
    )
    select count(*) into v_objects from gone;
  exception when insufficient_privilege or undefined_table then
    -- Denied on storage.objects. The row is still cleared below, so the video becomes unreachable; the
    -- bytes need a dashboard cleanup. The returned gap is the signal.
    v_objects := 0;
  end;

  update public.squad_checkins c
     set video_url = null, video_pruned_at = now()
    from _doomed d
   where c.id = d.id;
  get diagnostics v_cleared = row_count;

  return query select v_cleared, v_objects;
end;
$$;

revoke execute on function public.squad_checkin_prune(int) from public;

comment on function public.squad_checkin_prune(int) is
  'Destroys squad check-in videos past the 24h story window, keeping the row so the team_player honor (0099/0100) and admin metrics (0130) stay correct. Returns (videos_cleared, objects_deleted) — a gap means the storage delete lacked privileges and those bytes are orphaned.';

-- ── The schedule ───────────────────────────────────────────────────────────────
-- Hourly, not daily: the promise is "gone after a day", and a nightly job would leave a video live for up
-- to 24h past its window. pg_cron + pg_net are already installed by 0120.
select cron.unschedule('forge-checkin-prune')
 where exists (select 1 from cron.job where jobname = 'forge-checkin-prune');
select cron.schedule('forge-checkin-prune', '17 * * * *', $cron$ select public.squad_checkin_prune(500); $cron$);

-- ── Verify after applying ──────────────────────────────────────────────────────
--   select * from public.squad_checkin_prune(500);          -- run once by hand; both numbers should match
--   select jobname, schedule, active from cron.job where jobname = 'forge-checkin-prune';
--   select count(*) from public.squad_checkins
--    where video_url is not null and created_at < now() - interval '24 hours';   -- must be 0
--
-- If videos_cleared > objects_deleted, the storage delete was denied: the videos are unreachable but the
-- bytes remain. Delete `squad-media/*/checkin-*` older than a day from the dashboard, and grant this
-- function rights on storage.objects before relying on the schedule for cost control.
