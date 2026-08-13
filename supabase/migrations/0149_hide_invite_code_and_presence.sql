-- Forge Legacy — 0149: two columns stop being world-readable
--
-- ══ THE TWO SETTINGS THAT DID NOT SETTLE ANYTHING ══
--
-- Found by the 2026-08-12 launch audit. Both are controls the app offers, and neither restricted a thing:
--
-- **1 · `squads.invite_code`.** `squads_select` (0032:23-24) is row-level — `privacy = 'public' or
--    owner_id = auth.uid() or is_squad_member(...)` — with no column restriction, and nothing in 0029–0148
--    revokes the column. So any signed-in athlete could run
--    `select id, invite_code from squads where privacy = 'public'`, collect every public squad's code, and
--    hand themselves in through `join_squad_by_code`. Request-only joining (SQ-D16) was bypassable for
--    100% of public squads, and "Who Can Invite → Owner Only" was advisory: a member who was refused the
--    invite screen could read the code off the row they were already entitled to select.
--    `0056_squad_invite_permission.sql` names this risk in its own header and then adds a second, gated
--    path (`squad_invite_info()`) instead of closing the first.
--
-- **2 · `profiles.training_since` / `training_label`.** `0086_training_presence.sql:35-36` put live
--    training presence directly on `profiles`, whose read policy is `using (true)` (`0001_spine.sql:165`)
--    — world-readable, as `0114_athlete_search.sql:20-22` already records: *"any client holding the anon
--    key can already page the entire profile table… Every guard below is ADVISORY UX, not enforcement,
--    and the toggle is a promise this database does not keep."* So "Live Workout Status → Only me" hid
--    nothing: the columns were selectable straight off the table, mid-workout, by anyone.
--    `0132_athlete_activity.sql:10-13` reached the same conclusion about a `last_active_at` column and
--    put it on its own table instead. This is the cheaper half of that same fix.
--
-- ══ ⚠ WHY THIS IS NOT A HAND-WRITTEN COLUMN LIST ══
--
-- Postgres cannot subtract one column from a table-level SELECT grant. The only way is to revoke the
-- table and re-grant each column you want visible — and the obvious way to write that is to type out
-- every remaining column, which is precisely the trap: a column added by a later migration is silently
-- ungranted, and reads start failing with an error that never says "missing grant".
--
-- So the grants are DERIVED at apply time from `information_schema`, not typed. Two consequences worth
-- knowing:
--   · this migration is safe to RE-RUN, and re-running it is the fix after any migration adds a column;
--   · the verify block at the bottom lists any column that is not granted, so the gap is visible rather
--     than mysterious. Re-run this file whenever it reports one.
--
-- ══ WHAT STILL WORKS, VERIFIED BEFORE WRITING THIS ══
--
--   · `SQUAD_COLS` (`squad-live.ts:107`) is an explicit list and never included `invite_code`.
--   · The live invite path is `squad_invite_info()` (0056) — SECURITY DEFINER, so column grants do not
--     apply to it, and it is already permission-gated. The only client reader of the raw column is the
--     pre-0056 fallback at `squad-live.ts:336`, unreachable now that 0056 is applied.
--   · `src/` never selects `training_since` or `training_label` — the presence surfaces read
--     `training_now()` and `athlete_training_status()`, both SECURITY DEFINER and both already applying
--     the visibility ladder.
--   · There are NO `select('*')` calls on `profiles` or `squads` anywhere in `src/` — a star-select is
--     what a column revoke actually breaks, and there are none.
--
-- Idempotent and re-runnable. Depends on 0001 (profiles), 0029 (squads), 0032, 0086. RUN ANY TIME.

do $$
declare
  c record;
  v_hidden text[];
begin
  -- ── profiles: everything except live presence ──────────────────────────────
  v_hidden := array['training_since', 'training_label'];

  revoke select on public.profiles from anon, authenticated;
  for c in
    select column_name from information_schema.columns
     where table_schema = 'public' and table_name = 'profiles'
       and not (column_name = any (v_hidden))
     order by ordinal_position
  loop
    execute format('grant select (%I) on public.profiles to anon, authenticated', c.column_name);
  end loop;

  -- ── squads: everything except the join code ────────────────────────────────
  v_hidden := array['invite_code'];

  revoke select on public.squads from anon, authenticated;
  for c in
    select column_name from information_schema.columns
     where table_schema = 'public' and table_name = 'squads'
       and not (column_name = any (v_hidden))
     order by ordinal_position
  loop
    execute format('grant select (%I) on public.squads to anon, authenticated', c.column_name);
  end loop;
end $$;

comment on column public.squads.invite_code is
  'The join code. ⚠ NOT SELECTABLE by anon or authenticated (0149) — read it through squad_invite_info() (0056), which is SECURITY DEFINER and applies the who-can-invite permission. Granting this column back re-opens SQ-D16: any member could read the code off the row and bypass request-only joining.';

comment on column public.profiles.training_since is
  'Live training presence. ⚠ NOT SELECTABLE by anon or authenticated (0149) — profiles_read is `using (true)`, so a grant here publishes every athlete''s live status to anyone holding the anon key and makes "Live Workout Status → Only me" a promise the database does not keep. Read it through training_now() / athlete_training_status(), which apply the visibility ladder.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Verify — returns ROWS. Expect ungranted_columns = 0 and both hidden = false.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- ⚠ `ungranted_columns` IS THE ONE THAT GOES STALE. It counts columns that exist and have no SELECT grant
--   for `authenticated` — i.e. columns a later migration added after this one ran. A non-zero number here
--   means reads of that column are failing; re-running this file grants it.

select
  (select count(*)
     from information_schema.columns col
    where col.table_schema = 'public'
      and col.table_name in ('profiles', 'squads')
      and col.column_name not in ('training_since', 'training_label', 'invite_code')
      and not has_column_privilege('authenticated', format('public.%I', col.table_name), col.column_name, 'select')
  )                                                                                as ungranted_columns_expect_0,
  has_column_privilege('authenticated', 'public.squads',   'invite_code',    'select') as authed_sees_invite_code_expect_false,
  has_column_privilege('authenticated', 'public.profiles', 'training_since', 'select') as authed_sees_presence_expect_false,
  has_column_privilege('anon',          'public.profiles', 'training_label', 'select') as anon_sees_presence_expect_false;
