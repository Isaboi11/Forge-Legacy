-- Forge Legacy — 0234: Apple Health workouts can land in Forge (Build 10 · Docs/Apple-Health-Build-Plan.md §6)
--
-- ══ WHAT THIS IS FOR ══
--
-- PO, 2026-09-28: runs recorded on a Garmin, an Apple Watch or Strava reach Apple Health, and build 10 reads
-- them from there. Each becomes an ordinary, fully owned Forge workout (DEDUP §1), marked with where it came
-- from. This migration is the server half; the phone half (HealthKit, the connect screen, the sync) ships in
-- build 10. Nothing in the deployed apps (build 8, build 9, web) sends or reads anything added here.
--
-- ══ WHAT THIS DOES ══
--
--   1. `workouts` gains `source` ('forge' | 'apple_health', default 'forge'), `external_id` (the HealthKit
--      UUID) and `source_label` ("Garmin Connect", ≤ 60 chars). A before-update trigger makes `source` and
--      `external_id` immutable (DEDUP §2): an import is an import forever, even after an edit.
--   2. `workouts_external_uniq` — one row per (athlete, source, external id). Two phones syncing in the
--      same second cannot double-insert.
--   3. `external_activity_ledger` — every Health workout Forge has decided about (imported / skipped /
--      duplicate / deleted), owner-only. It is what stops a skipped or removed import coming back.
--   4. `import_external_workouts(p_source, p_rows)` — the one write path for imports. SECURITY INVOKER
--      (plan §6.4): it runs as the athlete, under the same RLS as `save_workout`, so it can only ever write
--      the caller's own rows. ≤ 200 rows per call, every row re-validated with the §4 filters, idempotent.
--   5. Squads are never told about an import: the `push_workout_saved` trigger and branch 16
--      (`squad_training_finished`) of `notification_events_for` now require `source = 'forge'`.
--   6. `health_consents.kind` accepts 'apple_health' (the MHMDA opt-in taken before the first read).
--
-- ══ ⚠ saved_at IS THE WORKOUT'S REAL END, NOT now() ══
--
-- Every server read — honors (`honor_metrics`), goals (`goal_metric_value`), competitions, squad totals,
-- the weekly story — keys on `saved_at`. Stamping now() would drop 90 days of history into this week's
-- goals, streaks and squad summary. The RPC stamps `saved_at = ended_at` from the payload. That is also why
-- (5) matters twice over: branch 16 looks back 24 HOURS by `saved_at`, so a run that ended this morning and
-- was imported tonight would otherwise appear in every squad-mate's inbox as "finished a workout".
--
-- ══ ⚠ THE PAYLOAD FIELD NAMES ARE PINNED BY THE CLIENT ══
--
-- `src/domain/health/import-rows.ts` (`ImportRowPayload`) builds each row, and `import-rows.test.mjs` pins the
-- names: external_id, activity_type, workout_name, started_at, ended_at, duration_sec, distance,
-- distance_unit, indoor, source_label. Rename one here and every import is silently rejected as invalid.
-- `indoor` is accepted and not stored — the workout name already says it ("Treadmill Run", "Indoor Ride").
--
-- ══ ⚠ BACK-COMPATIBLE WITH EVERY DEPLOYED CLIENT ══
--
--   · `source` is NOT NULL with a constant default, so `save_workout` (0162), `continue_workout`, and every
--     direct insert keep working untouched and write 'forge'. Postgres adds a constant-default column
--     without rewriting the table.
--   · The immutability trigger fires only on `update of source, external_id`. No deployed client names
--     either column, so no existing update path can reach it.
--   · The push trigger is dropped and recreated in ONE transaction, with the same function and the same
--     arms; the only change is `and new.source = 'forge'`, which every existing row satisfies.
--   · `notification_events_for` is 0225's body VERBATIM — 0225 is its latest definition (grepped across
--     every migration; 0225 rebuilt it from 0164, which rebuilt it from 0163) — plus ONE line, marked 0234.
--     `create or replace` with the same signature keeps 0147 §3's revoke; it is restated below anyway.
--     `src/domain/health/__tests__/migration-0234.test.mjs` proves the body is 0225's plus that one line.
--   · The consent constraint is WIDENED, never narrowed: every stored row stays valid.
--
-- ══ evaluate_honors('import') ══
--
-- Read from source (0099:544, the latest definition): `p_source` is written to `honor_instances.source`,
-- whose check (0012) has allowed 'import' since day one, and `v_live := (p_source = 'live_session')` gates
-- the timeline events. So 'import' grants honors QUIETLY — no ceremony, no timeline row — which is exactly
-- the PO's 09-28 decision ("granted quietly as one summary line"). Called once per RPC call, not per row.
--
-- Depends on 0001, 0012, 0099, 0153, 0162, 0224, 0225 (all applied). Idempotent: add-if-not-exists,
-- guarded constraints, create-or-replace, drop-if-exists + create. Safe to run twice.

begin;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1 · WHERE A WORKOUT CAME FROM
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.workouts add column if not exists source text not null default 'forge';
alter table public.workouts add column if not exists external_id text;
alter table public.workouts add column if not exists source_label text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'workouts_source_check') then
    alter table public.workouts
      add constraint workouts_source_check check (source in ('forge', 'apple_health'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'workouts_external_id_check') then
    -- A Forge-made workout has no external id; an imported one always has one.
    alter table public.workouts
      add constraint workouts_external_id_check check (
        (source = 'forge' and external_id is null)
        or (source <> 'forge' and external_id is not null and char_length(external_id) between 1 and 100)
      );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'workouts_source_label_check') then
    alter table public.workouts
      add constraint workouts_source_label_check check (source_label is null or char_length(source_label) <= 60);
  end if;
end $$;

comment on column public.workouts.source is
  'Where this workout was recorded (0234): forge = in Forge; apple_health = imported from Apple Health. Immutable (DEDUP §2). Squads are never told about a non-forge workout.';
comment on column public.workouts.external_id is
  'The source''s own id (0234) — the HealthKit workout UUID for apple_health. Null for forge. Immutable; unique per athlete and source.';
comment on column public.workouts.source_label is
  'Which app or device recorded an imported workout, for "Imported from …" (0234), e.g. Garmin Connect, Apple Watch. ≤ 60 chars.';

-- DEDUP §2: the source survives edits. `update of` so ordinary updates (distance, duration, notes) never
-- even call it.
create or replace function public.workouts_source_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.source is distinct from old.source or new.external_id is distinct from old.external_id then
    raise exception 'a workout''s source and external id cannot change (0234)' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function public.workouts_source_immutable() from public, anon, authenticated;

drop trigger if exists workouts_source_immutable on public.workouts;
create trigger workouts_source_immutable
  before update of source, external_id on public.workouts
  for each row
  execute function public.workouts_source_immutable();

-- ══════════════════════════════════════════════════════════════════════════════
-- 2 · ONE ROW PER EXTERNAL WORKOUT
-- ══════════════════════════════════════════════════════════════════════════════

create unique index if not exists workouts_external_uniq
  on public.workouts (athlete_id, source, external_id)
  where external_id is not null;

-- ══════════════════════════════════════════════════════════════════════════════
-- 3 · THE LEDGER — what Forge decided about every external workout it has seen
-- ══════════════════════════════════════════════════════════════════════════════
--
-- `workout_id` has no FK on purpose (the WSR-001 pattern): a 'deleted' row outlives its workout, and that
-- is the row that stops the workout coming back on the next sync.

create table if not exists public.external_activity_ledger (
  athlete_id  uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  source      text        not null,
  external_id text        not null,
  outcome     text        not null,
  workout_id  uuid,
  created_at  timestamptz not null default now(),
  primary key (athlete_id, source, external_id)
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'external_activity_ledger_source_check') then
    alter table public.external_activity_ledger
      add constraint external_activity_ledger_source_check check (source in ('apple_health'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'external_activity_ledger_external_id_check') then
    alter table public.external_activity_ledger
      add constraint external_activity_ledger_external_id_check check (char_length(external_id) between 1 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'external_activity_ledger_outcome_check') then
    alter table public.external_activity_ledger
      add constraint external_activity_ledger_outcome_check check (outcome in ('imported', 'skipped', 'duplicate', 'deleted'));
  end if;
end $$;

comment on table public.external_activity_ledger is
  'Every external workout Forge has decided about (0234; Apple-Health-Build-Plan §6.3): imported, skipped, duplicate (held for the athlete) or deleted (removed after import). A skipped or deleted id is never re-imported. Owner-only. Holds ids, never health data.';

alter table public.external_activity_ledger enable row level security;

drop policy if exists external_activity_ledger_own on public.external_activity_ledger;
create policy external_activity_ledger_own on public.external_activity_ledger for all
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());

revoke all on public.external_activity_ledger from anon;
grant select, insert, update, delete on public.external_activity_ledger to authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4 · THE IMPORT
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Per row, in order: shape (§4 filters again — the client already applied them; this is the server not
-- trusting it), then the ledger (a 'skipped' or 'deleted' id never comes back; a 'duplicate' — held for the
-- athlete — may, because "Keep" is how the athlete answers it), then the insert, where the unique index
-- turns a second copy into a no-op. A malformed row is counted as `invalid` and never aborts the batch.
--
-- CHAPTERS: a workout joins the ACTIVE chapter only if it happened on or after that chapter's start date
-- (in the athlete's own time zone). Older history belongs to no chapter, and a sealed chapter's
-- `workout_count` is never touched.
--
-- Returns { inserted, skipped, invalid, honors }. `honors` is evaluate_honors('import')'s array — quiet
-- grants, shown by the client as one summary line.

create or replace function public.import_external_workouts(p_source text, p_rows jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $fn$
declare
  v_uid       uuid := auth.uid();
  v_tz        text;
  v_chapter   uuid;
  v_ch_start  date;
  v_row       jsonb;
  v_ext       text;
  v_act       text;
  v_start     timestamptz;
  v_end       timestamptz;
  v_dur       integer;
  v_dist      numeric;
  v_name      text;
  v_label     text;
  v_in_ch     boolean;
  v_id        uuid;
  v_inserted  int := 0;
  v_skipped   int := 0;
  v_invalid   int := 0;
  v_ch_added  int := 0;
  v_honors    jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_source is distinct from 'apple_health' then
    raise exception 'import_external_workouts: unknown source %', p_source using errcode = '22023';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'import_external_workouts: p_rows must be a JSON array' using errcode = '22023';
  end if;
  if jsonb_array_length(p_rows) > 200 then
    raise exception 'import_external_workouts: at most 200 rows per call (got %)', jsonb_array_length(p_rows) using errcode = '22023';
  end if;

  select pr.tz into v_tz from public.profiles pr where pr.id = v_uid;
  if v_tz is null or not exists (select 1 from pg_timezone_names tzn where tzn.name = v_tz) then
    v_tz := 'UTC';
  end if;

  select c.id, c.start_date into v_chapter, v_ch_start
    from public.chapters c
   where c.athlete_id = v_uid and c.is_active
   limit 1;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_id := null;

    -- ── shape: anything that does not parse or fails a §4 filter is invalid, never an error ──
    begin
      if jsonb_typeof(v_row) <> 'object' then raise exception 'not an object'; end if;
      v_ext   := nullif(btrim(v_row->>'external_id'), '');
      v_act   := v_row->>'activity_type';
      v_start := (v_row->>'started_at')::timestamptz;
      v_end   := (v_row->>'ended_at')::timestamptz;
      v_dur   := round((v_row->>'duration_sec')::numeric)::integer;
      v_dist  := (v_row->>'distance')::numeric;
      v_name  := left(coalesce(nullif(btrim(v_row->>'workout_name'), ''), 'Workout'), 80);
      v_label := left(nullif(btrim(v_row->>'source_label'), ''), 60);

      if v_ext is null or char_length(v_ext) > 100 then raise exception 'external_id'; end if;
      if v_act is null or v_act not in ('running', 'walking', 'cycling', 'swimming', 'rowing', 'elliptical', 'stair_climber') then
        raise exception 'activity_type';
      end if;
      if v_start is null or v_end is null or v_end < v_start then raise exception 'dates'; end if;
      if v_start < timestamptz '2014-09-17 00:00:00+00' then raise exception 'before HealthKit'; end if;
      if v_start > now() + interval '5 minutes' or v_end > now() + interval '5 minutes' then raise exception 'future'; end if;
      if v_dur is null or v_dur < 60 or v_dur > 86400 then raise exception 'duration'; end if;
      -- 500 km in miles is 310.686; the client rounds to 3 decimals.
      if v_dist is not null and (v_dist <= 0 or v_dist > 310.687) then raise exception 'distance'; end if;
      if coalesce(v_row->>'distance_unit', 'mi') <> 'mi' then raise exception 'distance_unit'; end if;
    exception when others then
      v_invalid := v_invalid + 1;
      continue;
    end;

    -- ── the ledger: a skip or a removal is remembered ──
    if exists (
      select 1 from public.external_activity_ledger l
       where l.athlete_id = v_uid and l.source = p_source and l.external_id = v_ext
         and l.outcome in ('skipped', 'deleted')
    ) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    v_in_ch := v_chapter is not null and (v_start at time zone v_tz)::date >= v_ch_start;

    insert into public.workouts (athlete_id, chapter_id, workout_name, activity_type, started_at, saved_at,
                                 duration_sec, distance, distance_unit, state, source, external_id, source_label)
    values (v_uid, case when v_in_ch then v_chapter end, v_name, v_act::modality, v_start, v_end,
            v_dur, v_dist, case when v_dist is not null then 'mi' end, 'saved', p_source, v_ext, v_label)
    on conflict (athlete_id, source, external_id) where external_id is not null do nothing
    returning id into v_id;

    if v_id is null then
      v_skipped := v_skipped + 1;   -- already in Forge
      continue;
    end if;

    v_inserted := v_inserted + 1;
    if v_in_ch then v_ch_added := v_ch_added + 1; end if;

    insert into public.external_activity_ledger (athlete_id, source, external_id, outcome, workout_id)
    values (v_uid, p_source, v_ext, 'imported', v_id)
    on conflict (athlete_id, source, external_id)
      do update set outcome = 'imported', workout_id = excluded.workout_id;
  end loop;

  if v_ch_added > 0 then
    update public.chapters c set workout_count = c.workout_count + v_ch_added where c.id = v_chapter;
  end if;

  -- Once per call. Its own block on 0018's principle: the workouts are the thing worth saving, and a
  -- failed honor pass must not roll 200 of them back. The next save or import re-evaluates anyway.
  if v_inserted > 0 then
    begin
      v_honors := public.evaluate_honors('import');
    exception when others then
      v_honors := '[]'::jsonb;
      raise warning 'import_external_workouts: evaluate_honors failed (% %)', sqlstate, sqlerrm;
    end;
  end if;

  return jsonb_build_object('inserted', v_inserted, 'skipped', v_skipped, 'invalid', v_invalid, 'honors', v_honors);
end;
$fn$;

comment on function public.import_external_workouts(text, jsonb) is
  'Imports external workouts for the CALLER (0234; Apple-Health-Build-Plan §6.4). SECURITY INVOKER. ≤ 200 rows; each re-validated; saved_at = the workout''s real end; idempotent via workouts_external_uniq; skipped/deleted ledger ids never return; evaluate_honors(''import'') once, quietly. Payload names pinned by src/domain/health/import-rows.ts. Returns {inserted, skipped, invalid, honors}.';

revoke execute on function public.import_external_workouts(text, jsonb) from public, anon;
grant execute on function public.import_external_workouts(text, jsonb) to authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- 5 · SQUADS ARE NEVER TOLD ABOUT AN IMPORT
-- ══════════════════════════════════════════════════════════════════════════════
--
-- (a) The push trigger — 0153's definition, same function, same arms, plus `new.source = 'forge'`.

drop trigger if exists push_workout_saved on public.workouts;
create trigger push_workout_saved
  after insert or update of saved_at on public.workouts
  for each row
  when (new.state = 'saved' and new.saved_at is not null and new.source = 'forge')
  execute function public.push_tg_training_finished();

-- (b) The inbox AND the push sender (push_enqueue_for reads this same union, so a squad-mate's own finish
--     re-enqueueing would otherwise still carry the import). 0225's body verbatim + the one 0234 line.

create or replace function public.notification_events_for(p_user uuid)
returns table (kind text, at timestamptz, squad_id uuid, actor_id uuid, challenge_id uuid, invite_id uuid, share_id uuid, post_id uuid)
language sql
security definer
stable
set search_path = public
as $$
  -- 0225. THE SEVENTEEN BRANCHES BELOW ARE 0164'S, VERBATIM. They are wrapped rather than edited one by one:
  -- a filter on the shared `actor_id` covers every branch at once, including any branch added later
  -- inside the wrapper. Rows with no actor (squad_recap, request_approved/declined) are the squad's or
  -- your own and stay. This also filters the push sender, which reads this same union.
  select e.kind, e.at, e.squad_id, e.actor_id, e.challenge_id, e.invite_id, e.share_id, e.post_id
    from (
  -- 1
  select 'join_request'::text, q.created_at, q.squad_id, q.user_id, null::uuid, null::uuid, null::uuid, null::uuid
    from public.squad_join_requests q
    join public.squads s on s.id = q.squad_id
   where s.owner_id = p_user and q.status = 'pending'

  union all
  -- 2
  select 'member_joined'::text, m.joined_at, m.squad_id, m.user_id, null::uuid, null::uuid, null::uuid, null::uuid
    from public.squad_members m
    join public.squads s on s.id = m.squad_id
   where s.owner_id = p_user and m.user_id <> p_user

  union all
  -- 3
  select ('request_' || q.status)::text, q.decided_at, q.squad_id, null::uuid, null::uuid, null::uuid, null::uuid, null::uuid
    from public.squad_join_requests q
   where q.user_id = p_user
     and q.status in ('approved', 'declined')
     and q.decided_at is not null

  union all
  -- 4 (0073, restored 0109)
  select 'friend_request'::text, f.requested_at, null::uuid, f.requested_by, null::uuid, null::uuid, null::uuid, null::uuid
    from public.friendships f
   where f.status = 'PENDING'
     and p_user in (f.low_id, f.high_id)
     and f.requested_by <> p_user

  union all
  -- 5 (0073, restored 0109)
  select 'friend_accepted'::text, f.accepted_at, null::uuid,
         case when f.low_id = p_user then f.high_id else f.low_id end,
         null::uuid, null::uuid, null::uuid, null::uuid
    from public.friendships f
   where f.status = 'ACCEPTED'
     and f.accepted_at is not null
     and f.requested_by = p_user

  union all
  -- 6 (widened 0163) — ENROLLMENT *or* ACTIVE. "Starts today" means midnight this morning, so the
  --   creator's own trip back to the hub calls advance_challenges() and flips the competition to ACTIVE
  --   within seconds of it being created. Gated on ENROLLMENT, this derived event stopped existing before
  --   the invited friend ever opened the app — no notification, no push, and no "Open to Join" row to opt
  --   in from. It now lasts as long as joining does.
  select 'challenge_invite'::text, c.created_at, null::uuid, c.creator_id, c.id, null::uuid, null::uuid, null::uuid
    from public.challenges c
   where c.context = 'FRIENDS'
     and c.state in ('ENROLLMENT', 'ACTIVE')
     and p_user = any(c.invited_ids)
     and not exists (
       select 1 from public.challenge_participants cp
        where cp.challenge_id = c.id and cp.user_id = p_user
     )

  union all
  -- 7 (narrowed 0121)
  select 'workout_invite'::text, i.created_at, null::uuid, i.from_id, null::uuid, i.id, null::uuid, null::uuid
    from public.workout_invites i
   where i.to_id = p_user and i.status = 'PENDING' and i.kind = 'INVITE'

  union all
  -- 8 (0110)
  select 'program_shared'::text, ps.created_at, null::uuid, ps.from_id, null::uuid, null::uuid, ps.id, null::uuid
    from public.program_shares ps
   where ps.to_id = p_user and ps.status = 'PENDING'

  union all
  -- 9 (0121)
  select 'workout_join_request'::text, i.created_at, null::uuid, i.from_id, null::uuid, i.id, null::uuid, null::uuid
    from public.workout_invites i
    join public.profiles h on h.id = i.to_id
   where i.to_id = p_user
     and i.kind = 'JOIN_REQUEST'
     and i.status = 'PENDING'
     and h.training_since is not null
     and h.training_since > now() - interval '4 hours'

  union all
  -- 10 (0122, narrowed 0126) — THE FIRST FAN-OUT BRANCH. Windowed at 14 days; see 0122's header for why
  --     that predicate is load-bearing rather than tidy.
  --     `author_id is not null` keeps the AUTHORLESS weekly recap out of this branch and in branch 12,
  --     where it is worded as the squad's own summary instead of as somebody's post.
  select 'squad_post'::text, sp.created_at, sp.squad_id, sp.author_id, null::uuid, null::uuid, null::uuid, null::uuid
    from public.squad_posts sp
    join public.squad_members m on m.squad_id = sp.squad_id and m.user_id = p_user
   where sp.author_id is not null
     and sp.author_id <> p_user
     and sp.created_at > now() - interval '14 days'

  union all
  -- 11 (0122)
  select 'squad_checkin'::text, sc.created_at, sc.squad_id, sc.user_id, null::uuid, null::uuid, null::uuid, null::uuid
    from public.squad_checkins sc
    join public.squad_members m on m.squad_id = sc.squad_id and m.user_id = p_user
   where sc.user_id <> p_user
     and sc.created_at > now() - interval '14 days'

  union all
  -- 12 (0126) — the weekly review. `actor_id` is null on purpose: the SQUAD wrote this, not a member,
  --     and the client draws the crest rather than an avatar for exactly that reason.
  select 'squad_recap'::text, sp.created_at, sp.squad_id, null::uuid, null::uuid, null::uuid, null::uuid, null::uuid
    from public.squad_posts sp
    join public.squad_members m on m.squad_id = sp.squad_id and m.user_id = p_user
   where sp.type = 'weekly'
     and sp.author_id is null
     and sp.created_at > now() - interval '14 days'

  union all
  -- 13 (0135) — somebody commented on your post. `squad_posts.squad_id` rides along so the row can wear
  --     the squad's crest and open `/squad-post/<id>`; it is NULL on a FRIENDS post, which is how the
  --     client knows to open `/friends` instead. Not fan-out: one comment notifies one person.
  select 'post_comment'::text, c.created_at, sp.squad_id, c.author_id, null::uuid, null::uuid, null::uuid, sp.id
    from public.squad_post_comments c
    join public.squad_posts sp on sp.id = c.post_id
   where sp.author_id = p_user
     and c.author_id is distinct from p_user
     and c.created_at > now() - interval '14 days'

  union all
  -- 14 (0135) — somebody reacted to your post. Default OFF for push (SOC-D11), always present in the
  --     inbox (P-5 §4). The table's primary key is (post_id, user_id), so one reactor is one row and
  --     changing a reaction from respect to honor cannot notify twice.
  select 'post_reaction'::text, r.created_at, sp.squad_id, r.user_id, null::uuid, null::uuid, null::uuid, sp.id
    from public.squad_post_reactions r
    join public.squad_posts sp on sp.id = r.post_id
   where sp.author_id = p_user
     and r.user_id is distinct from p_user
     and r.created_at > now() - interval '14 days'

  union all
  -- 15 (0153) — A SQUAD-MATE STARTED TRAINING. The first branch whose subject is a fact about RIGHT NOW
  --     rather than a row somebody wrote, so it is bounded by the same 4-hour presence ceiling branch 9
  --     uses (0086) instead of the 14-day window: "they stopped training" and "this is over" are the
  --     same event, and a start from yesterday is not news.
  --
  --     THREE GATES, and each is somebody's decision:
  --       · `s.training_alerts`  — the squad LEADER turned this on for the squad. Off by default.
  --       · `me.notify_start`    — the RECIPIENT asked for starts, in this squad. Off by default.
  --       · `vis_clears(…)`      — the ACTOR's own training audience (0086/0069). An athlete who hides
  --                                their training from squads is not announced by it. Their setting
  --                                already governs the Live Now row; a push must not be the back door
  --                                around it.
  --
  --     `distinct on (p.id)`: two people can share several squads, and without it one start becomes one
  --     inbox row per shared squad. The push would already have collapsed (the outbox key coalesces
  --     actor_id first), so only the feed would have doubled — visible to nobody writing the branch.
  select 'squad_training_started'::text, t.at, t.squad_id, t.actor_id, null::uuid, null::uuid, null::uuid, null::uuid
    from (
      select distinct on (p.id)
             p.training_since as at,
             s.id             as squad_id,
             p.id             as actor_id
        from public.squad_members me
        join public.squads s on s.id = me.squad_id and s.training_alerts
        join public.squad_members other on other.squad_id = me.squad_id and other.user_id <> p_user
        join public.profiles p on p.id = other.user_id
       where me.user_id = p_user
         and me.notify_start
         and p.training_since is not null
         and p.training_since > now() - interval '4 hours'
         and public.vis_clears(coalesce(p.visibility->>'training', 'squads'), 'squad')
       order by p.id, p.training_since desc, s.id
    ) t

  union all
  -- 16 (0153) — AND WHEN THEY FINISHED ONE. Same three gates, its own toggle, and a 24-hour window.
  --
  --     ⚠ NOT 14 DAYS. Every windowed branch before this one is about something written down that keeps
  --     its meaning — a post is worth reading a week later. A finished session is only news on the day,
  --     and the fan-out here is far wider than the feed branches: a 50-member squad training four times
  --     a week is ~200 rows a fortnight, per member, which would bury every other notification the
  --     athlete has. One day is the longest window that still survives not opening the app overnight.
  --
  --     `distinct on (w.id)`, keyed on the WORKOUT rather than the athlete: unlike a start, two sessions
  --     in one day are two separate pieces of news, and only the shared-squad duplication is collapsed.
  select 'squad_training_finished'::text, t.at, t.squad_id, t.actor_id, null::uuid, null::uuid, null::uuid, null::uuid
    from (
      select distinct on (w.id)
             w.saved_at   as at,
             s.id         as squad_id,
             w.athlete_id as actor_id
        from public.squad_members me
        join public.squads s on s.id = me.squad_id and s.training_alerts
        join public.squad_members other on other.squad_id = me.squad_id and other.user_id <> p_user
        join public.workouts w on w.athlete_id = other.user_id
        join public.profiles p on p.id = w.athlete_id
       where me.user_id = p_user
         and me.notify_finish
         and w.state = 'saved'
         and w.saved_at is not null
         and w.saved_at > now() - interval '24 hours'
         and w.source = 'forge'   -- 0234: an import is history, never "finished a workout"
         and public.vis_clears(coalesce(p.visibility->>'training', 'squads'), 'squad')
       order by w.id, s.id
    ) t

  union all
  -- 17 (0164) — SOMEBODY ANSWERED YOUR CHALLENGE. The other half of branch 6, missing since 0087: an
  --   invitation could be sent and accepted with the sender told neither. The creator found out by
  --   opening the competition and counting the roster.
  --
  --   NOT FAN-OUT. One join notifies exactly one person, the creator — unlike branches 10/11/12/15/16,
  --   where one row becomes one event per member. A 50-athlete squad competition is 50 rows for one
  --   person over its lifetime, which is why it is bounded twice:
  --     · 14 days, the window every WRITTEN branch uses (`joined_at` is a row somebody caused).
  --     · the competition's own life — who is in stops being news once it is over, and a COMPLETED
  --       season would otherwise keep its whole roster in the creator's inbox forever.
  --
  --   `cp.user_id <> p_user` because creating a competition inserts YOUR OWN participant row first
  --   (`createChallenge`), and being told you joined your own competition is not news either.
  select 'challenge_joined'::text, cp.joined_at, null::uuid, cp.user_id, c.id, null::uuid, null::uuid, null::uuid
    from public.challenge_participants cp
    join public.challenges c on c.id = cp.challenge_id
   where c.creator_id = p_user
     and cp.user_id <> p_user
     and c.state in ('ENROLLMENT', 'ACTIVE')
     and cp.joined_at > now() - interval '14 days'
    ) as e (kind, at, squad_id, actor_id, challenge_id, invite_id, share_id, post_id)
   where e.actor_id is null
      or not public.is_blocked(p_user, e.actor_id);   -- 0225
$$;

-- Restated, never granted: SECURITY DEFINER over ANY user id (0120, 0147 §3).
revoke execute on function public.notification_events_for(uuid) from public, anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- 6 · THE APPLE HEALTH CONSENT
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.health_consents drop constraint if exists health_consents_kind_check;
alter table public.health_consents
  add constraint health_consents_kind_check check (kind in ('nutrition', 'ai_sharing', 'apple_health'));

commit;
