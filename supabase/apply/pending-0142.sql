-- Forge Legacy — 0142: the pruned video leaves a forwarding address
--
-- ⚠ CORRECTS 0141. That migration wrapped its `delete from storage.objects` in an exception handler on the
--   theory that the privilege "may or may not be granted here." It is neither. Supabase installs a trigger,
--   `storage.protect_delete()`, that raises 42501 on ANY direct delete from a storage table:
--
--     ERROR: Direct deletion from storage tables is not allowed. Use the Storage API instead.
--
--   No grant, no role change and no `security definer` owner gets around it — it is a deliberate product
--   decision, not a permission gap. Verified empirically: `select` from `storage.objects` succeeds and the
--   matching rows are visible; `delete` raises. So SQL can never reclaim these bytes. Only the Storage API
--   can, and that needs a service key, which this project deliberately does not hold (see 0120's sender).
--
-- ⚠ WHICH LEFT A WORSE BUG THAN THE ONE 0141 FIXED. The prune nulls `video_url` — correctly; that is what
--   keeps the 24h promise, since nothing then points at the file and the app cannot serve it. But it also
--   destroyed the only record of WHICH file the row had pointed at. Every prune therefore minted an
--   untraceable orphan: bytes billed forever, with nothing in the database naming them. The first run
--   orphaned four (~40 MB, since removed by hand from the dashboard).
--
-- SO: keep nulling the url at 24h, and write the object path down. `video_object_path` is a durable,
-- queryable to-do list of exactly what is owed to the storage bucket — set when the video is pruned,
-- cleared once the file is actually gone. The promise is kept in SQL; the bytes are settled out of band.
--
-- The remaining storage delete stays manual (dashboard) until volume justifies wiring the Storage API
-- through pg_net with a service key in Supabase Vault. At four files that is not a trade worth making; at
-- a thousand athletes checking in weekly (~0.5 TB/yr) it plainly is. `squad_checkin_orphans()` is what
-- tells you when you have crossed that line.
--
-- RUN BY HAND.

-- ── The forwarding address ─────────────────────────────────────────────────────
alter table public.squad_checkins add column if not exists video_object_path text;

comment on column public.squad_checkins.video_object_path is
  'The squad-media object path this row''s video occupied, recorded when the video was pruned and cleared once the file is actually deleted. NOT NULL means bytes are still owed — SQL cannot delete from storage.objects (storage.protect_delete), so reclamation is a Storage API or dashboard action. See squad_checkin_orphans().';

create index if not exists squad_checkins_orphaned
  on public.squad_checkins (video_pruned_at)
  where video_object_path is not null;

-- ── The prune, corrected ───────────────────────────────────────────────────────
-- Return shape changes, so the old function has to go rather than be replaced. The cron command is
-- `select public.squad_checkin_prune(500)`, which is resolved by name at run time and stays valid.
drop function if exists public.squad_checkin_prune(int);

create function public.squad_checkin_prune(p_limit int default 500)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_n int;
begin
  -- No storage delete is attempted. 0141 tried and it is categorically blocked; an exception handler that
  -- can only ever fire reads like a fallback and is really dead code hiding a known impossibility.
  with doomed as (
    select id,
           -- Derived from the row's OWN url, never constructed. The upload convention is
           -- `<squadId>/checkin-<userId>-<epoch>.<ext>` (`uploadCheckinVideo`, src/data/squad-live.ts);
           -- squad posts, friends posts and squad photos share this bucket and none carry `/checkin-`.
           substring(video_url from '/squad-media/(.+)$') as object_name
      from public.squad_checkins
     where video_url is not null
       and created_at < now() - interval '24 hours'
     order by created_at
     limit greatest(coalesce(p_limit, 500), 0)
  )
  update public.squad_checkins c
     set video_url        = null,
         video_pruned_at  = now(),
         -- If the url ever fails to yield a path, record the raw url rather than NULL: an unparseable
         -- address is still a lead, and NULL here would silently mean "nothing owed".
         video_object_path = coalesce(d.object_name, c.video_url)
    from doomed d
   where c.id = d.id;

  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke execute on function public.squad_checkin_prune(int) from public;

comment on function public.squad_checkin_prune(int) is
  'Destroys squad check-in videos past the 24h story window by nulling video_url and recording the object path in video_object_path. Keeps the ROW so the team_player honor (0099/0100 count distinct check-in DAYS, threshold 50) and admin metrics (0130) stay correct. Returns rows cleared. Does not — and cannot — delete from storage.objects.';

-- ── The bill ───────────────────────────────────────────────────────────────────
create or replace function public.squad_checkin_orphans()
returns table (object_path text, pruned_at timestamptz, days_owed int)
language sql
security definer
set search_path = public, pg_temp
as $$
  select video_object_path,
         video_pruned_at,
         greatest(0, (extract(epoch from now() - video_pruned_at) / 86400)::int)
    from public.squad_checkins
   where video_object_path is not null
   order by video_pruned_at;
$$;

revoke execute on function public.squad_checkin_orphans() from public;

comment on function public.squad_checkin_orphans() is
  'Every squad-media object still owed deletion, oldest first. Delete these via the dashboard or Storage API, then settle the ledger with squad_checkin_mark_reclaimed(). A long or growing list is the signal that automating this through pg_net + Vault is finally worth the service key.';

-- Deliberately takes an explicit array with no all-rows default: marking the ledger clean is a claim that
-- the files are gone, and a convenience default would make it one keystroke to lose the list while the
-- bytes stay billed.
create or replace function public.squad_checkin_mark_reclaimed(p_paths text[])
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_n int;
begin
  if p_paths is null or cardinality(p_paths) = 0 then
    return 0;
  end if;
  update public.squad_checkins
     set video_object_path = null
   where video_object_path = any (p_paths);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke execute on function public.squad_checkin_mark_reclaimed(text[]) from public;

comment on function public.squad_checkin_mark_reclaimed(text[]) is
  'Clears the orphan ledger for paths whose files have actually been deleted. Requires an explicit array — see the function body for why there is no all-rows shorthand.';

-- ── Verify after applying ──────────────────────────────────────────────────────
--   select public.squad_checkin_prune(500);        -- rows cleared; 0 is correct if nothing is past 24h
--   select * from public.squad_checkin_orphans();  -- empty today: 0141's four were removed by hand
--   select jobname, schedule, active from cron.job where jobname = 'forge-checkin-prune';
--
-- Routine from here: run `squad_checkin_orphans()`, delete those paths from squad-media in the dashboard,
-- then pass the same paths to `squad_checkin_mark_reclaimed()`. When that chore starts to sting, automate
-- it — not before.
