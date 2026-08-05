-- Forge Legacy — 0112: an honor knows whether it has been celebrated
--
-- M-2 has never played. `HonorCeremony` (the forged medallion, built to `Forge First Honor
-- Ceremony.dc.html`) is a real component, `CeremonyProvider` special-cases `honorEarned` to render
-- it instead of the generic Modal, and `CeremonyProvider` is mounted app-wide in `_layout.tsx` — and
-- `kind: 'honorEarned'` is enqueued NOWHERE outside `ceremony-harness.tsx` and the unit tests. An
-- athlete earning an honor got one line of text on the Seal screen, which the PO reasonably read as
-- the honor "popping up at the workout end", and asked for it on Legacy instead.
--
-- Legacy is where it belongs and where the pattern already lives: `legacy.tsx` has fired M-1 rank-ups
-- from its focus effect since the rank engine shipped. What was missing is not the ceremony, it is
-- the STATE — "has this athlete been shown this honor yet."
--
-- WHY A COLUMN AND NOT A CLIENT FLAG. Device-local state replays the ceremony on every reinstall and
-- forgets it on every other device. Router params from W-17 only work when the athlete reaches Legacy
-- by finishing a workout, and this must also work for an honor granted by `claim_earned_honors` on a
-- retroactive sweep — which is precisely the case where a silent grant is most confusing.
--
-- WHY MARKING IS ITS OWN CALL. `uncelebrated_honors()` reads and marks NOTHING. A ceremony that a
-- crash, a force-quit or a tab close cut short must still play next time — showing an honor twice is
-- a small annoyance, and never showing it at all is losing the moment the whole system exists for.

alter table public.honor_instances add column if not exists celebrated_at timestamptz;

comment on column public.honor_instances.celebrated_at is
  'When the M-2 ceremony for this honor was dismissed. Null = still owed. Set by mark_honors_celebrated() AFTER the ceremony closes, never at fetch time — a ceremony cut short must replay.';

-- BACKFILL, and it is not optional. Every honor in the system predates this column, so leaving them
-- null would greet every existing athlete with a ceremony for every honor they have ever earned the
-- next time they open Legacy — 139 medallions in a row for the account that has them all. They were
-- earned before the ceremony existed; the honest record is that their moment has passed.
update public.honor_instances set celebrated_at = awarded_at where celebrated_at is null;

-- Owed honors, oldest first. `security invoker` — the `honor_own` policy (0012) already scopes this
-- to the caller's own rows, and a definer here would be a wider grant than the read needs.
create or replace function public.uncelebrated_honors()
returns jsonb
language sql
security invoker
stable
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',           h.id,
        'honorType',    h.honor_type,
        'displayName',  h.display_name,
        'dateEarned',   h.date_earned
      )
      order by h.awarded_at, h.id
    ),
    '[]'::jsonb
  )
    from public.honor_instances h
   where h.athlete_id = auth.uid()
     and h.celebrated_at is null;
$$;

-- Returns how many rows it actually changed, so a caller can tell "marked" from "already was".
-- `is null` in the WHERE keeps this idempotent: a double-dismiss does not rewrite the timestamp.
create or replace function public.mark_honors_celebrated(p_ids uuid[])
returns int
language plpgsql
security invoker
as $$
declare
  v_n int;
begin
  if p_ids is null or array_length(p_ids, 1) is null then
    return 0;
  end if;
  update public.honor_instances
     set celebrated_at = now()
   where athlete_id = auth.uid()
     and id = any(p_ids)
     and celebrated_at is null;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
