-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0264: the database enforces the photo, video, squad and day-template caps (pricing sweep G1)
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: §0 and §2 only raise, §1 is create-or-replace / drop-if-exists + create, §3 is read-only.
-- If anything raises, NOTHING is kept — the editor runs the file as one transaction.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- The Free limits on photos, videos, squads and day templates were checked only in the app (MA3-D16 says the
-- enforcing gate belongs in Postgres). Three doors skip even the app's check: Workout Complete's "Save this day
-- as a template", Duplicate on a template, and an owner approving a join request from someone who has since
-- joined another squad. PO 11-11: enforce them on the server.
--
-- ══ WHAT THIS FILE DOES ══
--
-- §0  PREFLIGHT — RAISES, changing nothing, unless 0145's counting functions and the four tables are as expected
-- §1  four BEFORE triggers + one shared check (verbatim from
--     supabase/migrations/0264_server_caps_photos_videos_squads_templates.sql)
-- §2  RAISES unless every trigger is live, every function is server-only, and the check counts with
--     athlete_live_counts() — the same function that gives the app its "38 of 75"
-- §3  one row: what landed, the caps in force, and how many Free athletes are at / over each cap today
--
-- ⚠ NOTHING ALREADY THERE IS TOUCHED. No row is deleted or rewritten; an athlete over a cap keeps everything and
--   only cannot ADD until under it. Premium inside its paid caps is never refused.
-- ⚠ THIS EDITOR CANNOT SHOW A REFUSAL. It has no signed-in athlete, and inserts with no auth.uid() are exempt by
--   design (the operator, service role). The refusal is checked in the app on a Free account at a cap:
--   Workout Complete → Save as template with 5 templates → "You've reached the Free plan's limit for this…".
-- ⚠ No my_* function is called here (they raise 28000 in the editor). Everything is read from the catalog.
--
-- ══ PREDICTED §3 ══
--   cap_triggers_live 4 · client_can_call 0 · counts_like_the_app true
--   free_caps "75 / 5 / 1 / 5" (photos / videos / squads / templates — unless tuned by hand)
--   paid_caps "1000 / 100 / 5 / -1" (0145's row; 0158 changed only the column DEFAULT, not the row)
--   free_athletes = today's Free account count
--   free_next_add_refused: "squads N" = every Free athlete already in a squad (the app already stops them);
--     photos / videos / templates small
--   free_over_cap_kept: probably 0 everywhere except squads (accounts in 2+ squads from before the cap) — each of
--     those keeps every squad and every photo
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ═════════════════════════════════════════════════════════════════════════════
-- §0 — PREFLIGHT (raises before anything changes)
-- ═════════════════════════════════════════════════════════════════════════════

do $$
declare
  v_missing text := '';
begin
  if to_regclass('public.entitlement_config') is null then
    raise exception '0264 PREFLIGHT: public.entitlement_config does not exist — 0145 has not been applied. Nothing was changed.';
  end if;
  if not exists (select 1 from public.entitlement_config c where c.id) then
    v_missing := v_missing || ' entitlement_config row';
  end if;

  if to_regprocedure('public.athlete_live_counts(uuid)') is null then
    v_missing := v_missing || ' athlete_live_counts(uuid)';
  elsif pg_get_function_result('public.athlete_live_counts(uuid)'::regprocedure)
        <> 'TABLE(photos integer, videos integer, squads integer, templates integer)' then
    v_missing := v_missing || ' athlete_live_counts(uuid) returning (photos, videos, squads, templates) — it is now '
                 || pg_get_function_result('public.athlete_live_counts(uuid)'::regprocedure);
  end if;
  if to_regprocedure('public.athlete_caps(uuid)') is null then v_missing := v_missing || ' athlete_caps(uuid)'; end if;
  if to_regprocedure('public.athlete_tier(uuid)') is null then v_missing := v_missing || ' athlete_tier(uuid)'; end if;
  if to_regprocedure('public.cap_allows(integer, integer)') is null then v_missing := v_missing || ' cap_allows(int, int)'; end if;

  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'chapter_photos' and column_name = 'is_video') then
    v_missing := v_missing || ' chapter_photos.is_video';
  end if;
  if (select count(*) from information_schema.columns
       where table_schema = 'public' and table_name = 'transformation_entries'
         and column_name in ('photos', 'video_url')) <> 2 then
    v_missing := v_missing || ' transformation_entries.photos/video_url';
  end if;
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'squad_members' and column_name = 'user_id') then
    v_missing := v_missing || ' squad_members.user_id';
  end if;
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'workout_templates' and column_name = 'source_definition_id') then
    v_missing := v_missing || ' workout_templates.source_definition_id (0115)';
  end if;
  if to_regrole('anon') is null or to_regrole('authenticated') is null then
    v_missing := v_missing || ' roles anon/authenticated';
  end if;

  if v_missing <> '' then
    raise exception '0264 PREFLIGHT: missing —%. Nothing was changed.', v_missing;
  end if;
end $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- §1 — THE TRIGGERS (verbatim from supabase/migrations/0264_server_caps_photos_videos_squads_templates.sql)
-- ═════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 1. THE ONE CHECK — every guard below asks this, and only this
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

/*
 * Refuse unless `p_athlete` has room for one more `p_key` ('photos' | 'videos' | 'squads' | 'templates').
 *
 * ⚠ SECURITY INVOKER ON PURPOSE. It is reached only from the definer guards below, so it runs as their owner
 * and may read `athlete_caps` / `athlete_live_counts` (revoked from clients by 0170). Called by anyone else it
 * would run as them and fail on those reads — and it is revoked besides.
 */
create or replace function public.live_cap_check(p_athlete uuid, p_key text)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_cap  int;
  v_used int;
  v_live record;
  v_kind text;
  v_noun text;
begin
  -- No signed-in athlete: the SQL editor or service-role code. See the header — not programs_cap_guard's rule.
  if v_uid is null or p_athlete is null then
    return;
  end if;

  if p_key not in ('photos', 'videos', 'squads', 'templates') then
    raise exception 'live_cap_check: unknown cap %', p_key using errcode = '22023';
  end if;

  -- Config, never a literal (MA3-D16). A missing key reads as null, and cap_allows() reads null as unlimited.
  v_cap := (public.athlete_caps(p_athlete) ->> p_key)::int;

  -- Serialise this athlete's writes against THIS cap before counting, so two concurrent saves cannot both
  -- read the same number. Transaction-scoped: released at commit or rollback, nothing to clean up.
  perform pg_advisory_xact_lock(hashtext('fl_live_cap:' || p_key), hashtext(p_athlete::text));

  -- THE APP'S NUMBER: the same function my_entitlement() reports as `usage`.
  select * into v_live from public.athlete_live_counts(p_athlete);
  v_used := case p_key
              when 'photos'    then v_live.photos
              when 'videos'    then v_live.videos
              when 'squads'    then v_live.squads
              when 'templates' then v_live.templates
            end;

  if public.cap_allows(v_used, v_cap) then
    return;
  end if;

  v_kind := case p_key when 'photos' then 'Photo' when 'videos' then 'Video'
                       when 'squads' then 'Squad' else 'Day template' end;
  v_noun := case p_key when 'templates' then 'day templates' else p_key end;

  -- ⚠ SOMEBODY ELSE IS ADDING THEM — an owner approving a join request (0177). The caller is not the one at
  -- a limit, so they must not be shown the Free upsell. No "limit reached" in it: plainError() shows it as is.
  if v_uid is distinct from p_athlete then
    if p_key = 'squads' then
      raise exception 'They''re already in as many squads as their plan allows, so they can''t join this one yet. Their request stays open.'
        using errcode = 'P0001';
    end if;
    raise exception 'They already have as many % as their plan allows.', v_noun using errcode = 'P0001';
  end if;

  -- ⚠ PREMIUM AT A PAID CEILING IS TOLD, NEVER SOLD TO (Amendment 001 §5). Again no "limit reached", so the
  -- app does not swap this for the Free line that says Premium makes it unlimited.
  if public.athlete_tier(p_athlete) = 'PREMIUM' then
    if p_key = 'squads' then
      raise exception 'Your plan allows % squads and you''re in %. Leave one to join another.', v_cap, v_used
        using errcode = 'P0001';
    end if;
    raise exception 'Your plan holds % % and you have %. Delete one to add another.', v_cap, v_noun, v_used
      using errcode = 'P0001';
  end if;

  -- FREE, THEIR OWN WRITE: programs_cap_guard's wording, so plainError() recognises it (P0001 + "limit reached").
  raise exception
    '% limit reached: % of % used. The pre-action check that should have shown M-7 is missing at this call site.',
    v_kind, v_used, v_cap
    using errcode = 'P0001';
end;
$$;

comment on function public.live_cap_check(uuid, text) is
  '0264. Refuses (P0001) unless the athlete has room for one more photo / video / squad / day template, counted by athlete_live_counts() — the number my_entitlement() shows the app — against athlete_caps(). cap_allows() decides; -1 or a missing key is unlimited. No auth.uid() (SQL editor, service role) is never refused. Called only by the 0264 cap guards; not callable by clients.';

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 2. PHOTOS AND VIDEOS IN A CHAPTER
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.chapter_photos_cap_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- An edit adds a photo or a video only by changing which one the row is (or whose). Anything else adds nothing.
  if tg_op = 'UPDATE' then
    if new.is_video is not distinct from old.is_video
       and new.athlete_id is not distinct from old.athlete_id then
      return new;
    end if;
  end if;

  perform public.live_cap_check(new.athlete_id, case when new.is_video then 'videos' else 'photos' end);
  return new;
end;
$$;

drop trigger if exists chapter_photos_cap_guard_trg on public.chapter_photos;
create trigger chapter_photos_cap_guard_trg
  before insert or update of is_video, athlete_id on public.chapter_photos
  for each row execute function public.chapter_photos_cap_guard();

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 3. THE TRANSFORMATION GALLERY — six poses and a clip per entry, on the same two counters (MA3-D8)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.transformation_entries_cap_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_poses     int;
  v_was_poses int := 0;
  v_had_video boolean := false;
begin
  -- Poses counted EXACTLY as athlete_live_counts() counts them: the keys of an object, and 0 for anything else.
  v_poses := case when jsonb_typeof(new.photos) = 'object'
                  then (select count(*) from jsonb_object_keys(new.photos)) else 0 end;

  -- OLD is read only on UPDATE, and only when the row stays with the same athlete; otherwise it all counts as new.
  if tg_op = 'UPDATE' then
    if new.athlete_id is not distinct from old.athlete_id then
      v_was_poses := case when jsonb_typeof(old.photos) = 'object'
                          then (select count(*) from jsonb_object_keys(old.photos)) else 0 end;
      v_had_video := old.video_url is not null;
    end if;
  end if;

  -- Growth only. A pose replaced, removed, or left alone while the caption changes is never refused.
  if v_poses > v_was_poses then
    perform public.live_cap_check(new.athlete_id, 'photos');
  end if;

  if new.video_url is not null and not v_had_video then
    perform public.live_cap_check(new.athlete_id, 'videos');
  end if;

  return new;
end;
$$;

drop trigger if exists transformation_entries_cap_guard_trg on public.transformation_entries;
create trigger transformation_entries_cap_guard_trg
  before insert or update of photos, video_url, athlete_id on public.transformation_entries
  for each row execute function public.transformation_entries_cap_guard();

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 4. SQUADS — one trigger on the membership table covers every door into a squad
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

/*
 * Checks the athlete BEING ADDED (`new.user_id`), never the caller — on approve they differ.
 *
 * ⛔ `approve_squad_join_request`, `create_squad` and `join_squad_by_code` are NOT restated. Each inserts into
 * `squad_members` inside its own call, so a refusal here aborts the whole call: create_squad leaves no squad
 * without its owner, and an approve leaves the request pending.
 */
create or replace function public.squad_members_cap_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Already a member of THIS squad: not a new squad. The primary key answers the insert, not the cap.
  if exists (
    select 1 from public.squad_members sm
     where sm.squad_id = new.squad_id and sm.user_id = new.user_id
  ) then
    return new;
  end if;

  perform public.live_cap_check(new.user_id, 'squads');
  return new;
end;
$$;

drop trigger if exists squad_members_cap_guard_trg on public.squad_members;
create trigger squad_members_cap_guard_trg
  before insert on public.squad_members
  for each row execute function public.squad_members_cap_guard();

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 5. DAY TEMPLATES — every door: builder, Holt, import, Duplicate, and Workout Complete's save-as-template
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.workout_templates_cap_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- ⚠ A FORGE STARTER TAKEN AS YOUR OWN IS NEVER THE WRITE THAT IS REFUSED. "The 81 Forge templates never
  -- count" (MA3 §5, M-7 §3), and the app does not gate adoption. Its row is still in the count (the app's count).
  if new.source_definition_id is not null then
    return new;
  end if;

  perform public.live_cap_check(new.athlete_id, 'templates');
  return new;
end;
$$;

drop trigger if exists workout_templates_cap_guard_trg on public.workout_templates;
create trigger workout_templates_cap_guard_trg
  before insert on public.workout_templates
  for each row execute function public.workout_templates_cap_guard();

-- ⚠ NO `after delete` TRIGGER ON ANY OF THE FOUR. These are STORAGE caps (0145 §5): deleting a photo or leaving a
-- squad genuinely frees the slot, and the live count already says so. Nothing is stored that could need undoing.

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 6. GRANTS — none of these is for a client
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

revoke all on function public.live_cap_check(uuid, text)              from public, anon, authenticated;
revoke all on function public.chapter_photos_cap_guard()              from public, anon, authenticated;
revoke all on function public.transformation_entries_cap_guard()      from public, anon, authenticated;
revoke all on function public.squad_members_cap_guard()               from public, anon, authenticated;
revoke all on function public.workout_templates_cap_guard()           from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 7. SELF-CHECK — raises rather than returning a tidy green
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

do $$
declare
  v_fn  text;
  v_trg text;
begin
  foreach v_trg in array array[
    'chapter_photos_cap_guard_trg', 'transformation_entries_cap_guard_trg',
    'squad_members_cap_guard_trg', 'workout_templates_cap_guard_trg'
  ] loop
    if not exists (select 1 from pg_trigger t where t.tgname = v_trg and not t.tgisinternal and t.tgenabled <> 'D') then
      raise exception '0264 self-check: trigger % is missing or disabled', v_trg;
    end if;
  end loop;

  foreach v_fn in array array[
    'public.live_cap_check(uuid, text)',
    'public.chapter_photos_cap_guard()',
    'public.transformation_entries_cap_guard()',
    'public.squad_members_cap_guard()',
    'public.workout_templates_cap_guard()'
  ] loop
    if to_regprocedure(v_fn) is null then
      raise exception '0264 self-check: % was not created', v_fn;
    end if;
    if has_function_privilege('anon', v_fn, 'execute') or has_function_privilege('authenticated', v_fn, 'execute') then
      raise exception '0264 self-check: % is executable by a client role', v_fn;
    end if;
  end loop;

  -- The count must be the app's: the check reads athlete_live_counts(), not a copy of it.
  if position('athlete_live_counts' in pg_get_functiondef('public.live_cap_check(uuid, text)'::regprocedure)) = 0 then
    raise exception '0264 self-check: live_cap_check does not read athlete_live_counts()';
  end if;

  raise notice '0264 OK: four cap triggers live, five functions server-side only.';
end;
$$;



-- ═════════════════════════════════════════════════════════════════════════════
-- §2 — THE ASSERTION (catalog and source only)
-- ═════════════════════════════════════════════════════════════════════════════

do $$
declare
  v_trg  text;
  v_fn   text;
  v_def  text;
  v_need text;
begin
  -- Each trigger: present, enabled, BEFORE, fires on INSERT, on the right table, calling its guard.
  for v_trg, v_def in
    select x.trg, x.tbl from (values
      ('chapter_photos_cap_guard_trg',         'public.chapter_photos'),
      ('transformation_entries_cap_guard_trg', 'public.transformation_entries'),
      ('squad_members_cap_guard_trg',          'public.squad_members'),
      ('workout_templates_cap_guard_trg',      'public.workout_templates')
    ) as x(trg, tbl)
  loop
    if not exists (
      select 1 from pg_trigger t
       where t.tgname = v_trg and not t.tgisinternal and t.tgenabled <> 'D'
         and t.tgrelid = v_def::regclass
         and pg_get_triggerdef(t.oid) like '%BEFORE INSERT%'
         and pg_get_triggerdef(t.oid) like '%FOR EACH ROW%'
    ) then
      raise exception '0264 FAILED: % is missing, disabled, not BEFORE INSERT, or not on %', v_trg, v_def;
    end if;
  end loop;

  -- No client role can call any of the five (Supabase grants new functions to anon + authenticated directly).
  foreach v_fn in array array[
    'public.live_cap_check(uuid, text)',
    'public.chapter_photos_cap_guard()',
    'public.transformation_entries_cap_guard()',
    'public.squad_members_cap_guard()',
    'public.workout_templates_cap_guard()'
  ] loop
    if to_regprocedure(v_fn) is null then
      raise exception '0264 FAILED: % does not exist', v_fn;
    end if;
    if has_function_privilege('anon', v_fn, 'execute') or has_function_privilege('authenticated', v_fn, 'execute') then
      raise exception '0264 FAILED: % is executable by a client role', v_fn;
    end if;
  end loop;

  -- The shared check counts with the APP's function, reads caps from config, and refuses in the wording
  -- plainError() recognises.
  v_def := pg_get_functiondef('public.live_cap_check(uuid, text)'::regprocedure);
  foreach v_need in array array['athlete_live_counts', 'athlete_caps', 'cap_allows', 'athlete_tier',
                                'pg_advisory_xact_lock', 'limit reached', 'auth.uid()'] loop
    if position(v_need in v_def) = 0 then
      raise exception '0264 FAILED: the installed live_cap_check() is missing %', v_need;
    end if;
  end loop;

  -- Every guard asks the shared check (none re-derives a count).
  foreach v_fn in array array[
    'public.chapter_photos_cap_guard()', 'public.transformation_entries_cap_guard()',
    'public.squad_members_cap_guard()', 'public.workout_templates_cap_guard()'
  ] loop
    if position('live_cap_check' in pg_get_functiondef(v_fn::regprocedure)) = 0 then
      raise exception '0264 FAILED: % does not call live_cap_check()', v_fn;
    end if;
  end loop;

  -- The Forge-starter exemption is in place (MA3 §5), or adopting a starter at the cap would be refused.
  if position('source_definition_id' in pg_get_functiondef('public.workout_templates_cap_guard()'::regprocedure)) = 0 then
    raise exception '0264 FAILED: workout_templates_cap_guard has no Forge-starter exemption';
  end if;

  -- Approve is covered by the membership trigger only if it still inserts into squad_members itself.
  if position('insert into public.squad_members'
              in pg_get_functiondef('public.approve_squad_join_request(uuid, uuid)'::regprocedure)) = 0 then
    raise exception '0264 FAILED: approve_squad_join_request no longer inserts into squad_members — check what it calls';
  end if;
end $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- §3 — THE REPORT (read-only, one row)
-- ═════════════════════════════════════════════════════════════════════════════

with caps as (
  select c.free_caps as f, c.paid_caps as p from public.entitlement_config c where c.id
),
free_use as (
  select lc.photos, lc.videos, lc.squads, lc.templates
    from public.profiles pr
    cross join lateral public.athlete_live_counts(pr.id) lc
   where public.athlete_tier(pr.id) = 'FREE'
),
cap as (
  select (f ->> 'photos')::int as photos, (f ->> 'videos')::int as videos,
         (f ->> 'squads')::int as squads, (f ->> 'templates')::int as templates
    from caps
)
select
  (select count(*) from pg_trigger t
    where t.tgname in ('chapter_photos_cap_guard_trg', 'transformation_entries_cap_guard_trg',
    'squad_members_cap_guard_trg', 'workout_templates_cap_guard_trg')
      and not t.tgisinternal and t.tgenabled <> 'D')                                             as cap_triggers_live,
  (select count(*) from unnest(array[
    'public.live_cap_check(uuid, text)',
    'public.chapter_photos_cap_guard()',
    'public.transformation_entries_cap_guard()',
    'public.squad_members_cap_guard()',
    'public.workout_templates_cap_guard()'
  ]) fn
    where has_function_privilege('anon', fn, 'execute')
       or has_function_privilege('authenticated', fn, 'execute'))                                as client_can_call,
  position('athlete_live_counts' in pg_get_functiondef('public.live_cap_check(uuid, text)'::regprocedure)) > 0
                                                                                                 as counts_like_the_app,
  (select concat_ws(' / ', coalesce(f ->> 'photos', 'missing'), coalesce(f ->> 'videos', 'missing'),
                           coalesce(f ->> 'squads', 'missing'), coalesce(f ->> 'templates', 'missing')) from caps)
                                                                                                 as free_caps,
  (select concat_ws(' / ', coalesce(p ->> 'photos', 'missing'), coalesce(p ->> 'videos', 'missing'),
                           coalesce(p ->> 'squads', 'missing'), coalesce(p ->> 'templates', 'missing')) from caps)
                                                                                                 as paid_caps,
  (select count(*) from free_use)                                                                as free_athletes,
  (select concat('photos ',    count(*) filter (where cap.photos    >= 0 and u.photos    >= cap.photos),
                 ' · videos ',  count(*) filter (where cap.videos    >= 0 and u.videos    >= cap.videos),
                 ' · squads ',  count(*) filter (where cap.squads    >= 0 and u.squads    >= cap.squads),
                 ' · templates ', count(*) filter (where cap.templates >= 0 and u.templates >= cap.templates))
     from free_use u cross join cap)                                                             as free_next_add_refused,
  (select concat('photos ',    count(*) filter (where cap.photos    >= 0 and u.photos    > cap.photos),
                 ' · videos ',  count(*) filter (where cap.videos    >= 0 and u.videos    > cap.videos),
                 ' · squads ',  count(*) filter (where cap.squads    >= 0 and u.squads    > cap.squads),
                 ' · templates ', count(*) filter (where cap.templates >= 0 and u.templates > cap.templates))
     from free_use u cross join cap)                                                             as free_over_cap_kept;
