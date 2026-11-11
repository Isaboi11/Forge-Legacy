-- Forge Legacy — 0263: the database enforces the photo, video, squad and day-template caps (pricing sweep G1)
--
-- ══ WHAT THIS IS ══
--
-- MA3-D16 / Amendment 003 §7: "the configuration table tells the client what to draw; the enforcing gate
-- belongs in Postgres." Until this file, the server refused only programs and training weeks
-- (`programs_cap_guard`, `week_templates_cap_guard` — 0145, 0158) and Holt (`consume_holt_allowance`). Photos,
-- videos, squads and day templates were checked by the app alone, and three doors skip even that:
--
--   · "Save this day as a template" on Workout Complete (`workout-complete.tsx` → `save_workout_as_template`)
--   · Duplicate on a template (`template/[id].tsx` → `duplicateTemplate`)
--   · `approve_squad_join_request` (0177) — a request made at 0 squads can be approved after the athlete has
--     joined another one
--
-- and every client check reads usage that is frozen until the app comes back to the foreground (H67), so a
-- second device, or a long session, gets past the right number. PO 11-11: yes, enforce them on the server.
--
-- ══ ⚠ THE COUNT IS THE APP'S COUNT — BY CONSTRUCTION, NOT BY COPY ══
--
-- Every guard calls `athlete_live_counts()` (0145) — the very function `my_entitlement()` reports to the app as
-- `usage.photos / videos / squads / templates` (`entitlement-live.ts`). Nothing here re-derives that arithmetic,
-- so the number the server refuses at can never drift from the number the athlete is shown:
--
--   photos     chapter_photos where is_video = false  +  every pose key in transformation_entries.photos
--   videos     chapter_photos where is_video = true   +  transformation_entries with a video_url
--              ⚠ squad check-ins NEVER count (MA3-D14). Squad-feed video (`squad_posts.media`) is not counted
--              either — see "NOT COUNTED" below. Neither is widened here.
--   squads     squad_members rows, owner or member
--   templates  workout_templates rows
--
-- ══ ⚠ THE QUESTION IS THE APP'S QUESTION ══
--
-- `cap_allows(used, cap)` on the count BEFORE the write — "is there room for one more?" — which is `capAllows()`
-- in `caps-core.ts`, the predicate every pre-action check asks. For a one-row write that means a cap of 75 lets
-- 75 exist and refuses the 76th. ⚠ A PROGRESS SET IS SIX POSES IN ONE WRITE, and the app asks per pose against
-- the SAVED count (poses still in the form are not in it), so a set started at 74 is allowed every pose and
-- saves with six. Refusing that here would refuse at Save, off-screen, something the app had said yes to six
-- times. The overshoot is bounded by one set, and the next write is refused.
--
-- ══ WHAT COUNTS AS A WRITE THAT ADDS ══
--
--   chapter_photos          INSERT · or an UPDATE that flips is_video (a photo becoming a video is a new video)
--   transformation_entries  INSERT · or an UPDATE that grows the pose map or adds a clip — the gallery's Edit is
--                           an in-place update (`updateTransformationEntry`), and it is gated in the app
--                           (`transformation-add.tsx` asks `guard('photos')` per pose in edit mode too)
--   squad_members           INSERT — ONE trigger covers create_squad (0053), join_squad_by_code (0055) and
--                           approve_squad_join_request (0177). ⛔ None of those functions is restated here.
--                           A row that already exists (a re-tap) is not a new squad and is left to the key.
--   workout_templates       INSERT — ⚠ EXCEPT a Forge starter taken as your own (`source_definition_id` set,
--                           `adoptStarterTemplate`). MA3 §5 / M-7 §3: "the 81 Forge templates never count", and
--                           the app does not gate that door. The adopted row still COUNTS in `used` — the app
--                           counts it (see "CONFLICTS" below) — it is only never the write that is refused.
--
-- ══ ⚠ WHAT IS NEVER REFUSED ══
--
--   · Anything already there. Nothing here deletes, hides or rewrites a row. An athlete already over a cap (a
--     downgrade, or a cap lowered in config) keeps every photo, squad and template, and simply cannot add
--     another until under it — MA3 §4: "Remains in every squad. No removals, ever."
--   · Deletes, and every update that adds nothing (a caption, a star, a pose replaced, frames).
--   · Premium inside `paid_caps`. `-1` or a MISSING key is unlimited — `cap_allows()`, the one place the
--     sentinel is known, exactly as `programs_cap_guard` reads it.
--   · No signed-in athlete (`auth.uid()` is null): the SQL editor (runs as `postgres`) and service-role code
--     (Edge Functions, the RevenueCat webhook). ⚠ THIS DIFFERS FROM `programs_cap_guard`, which has no such
--     exemption — it counts and refuses whoever inserts. Here the operator acting by hand is not an athlete
--     adding a photo. Seeds (`supabase/seed/*`) sign in as real accounts, so they are gated like the athlete
--     they are, exactly as they already are by `programs_cap_guard`; a script that impersonates an athlete
--     (`request.jwt.claims`, e.g. `restore-brady-push-pull-day-a.sql`) IS that athlete and is gated too.
--     Account wipe only deletes. No client role can insert any of these rows without a uid (every RLS policy
--     on them is `= auth.uid()`), so the exemption opens no door.
--
-- ══ WHAT THE ATHLETE SEES WHEN THE SERVER SAYS NO ══
--
--   Free, their own write  → P0001 "<Kind> limit reached: N of C used. The pre-action check…" — programs_cap_guard's
--                            wording, which `plainError()` (src/lib/plain-error.ts, build 11) recognises by
--                            `P0001` + /limit reached/ and replaces with PLAIN.capReached.
--   Premium (a paid cap)   → P0001, a plain sentence with no upsell (Amendment 001 §5: a paid athlete at a ceiling
--                            is told, never sold to). It has no "limit reached" in it, on purpose, so
--                            `plainError()` shows it as written rather than as the Free upsell line.
--   Somebody else adding   → P0001, a sentence about THEM, not the caller. Only an owner approving a join request
--     them (approve)         does this (0177's header: the one place a membership is created by someone else).
--                            The RPC aborts, so the request stays pending and can be approved later.
--
-- ══ CONCURRENCY ══
--
-- A live count, read then compared, lets two concurrent inserts both read N and both pass — a phone retrying a
-- timed-out save is exactly that. `programs_cap_guard` closes it with a single UPDATE on a counter row; a live
-- count has no row to lock, so each check takes a transaction-scoped advisory lock on (cap, athlete) first. Under
-- READ COMMITTED the count that follows takes a fresh snapshot and sees the other writer's committed row.
--
-- ══ NOT COUNTED, ON PURPOSE ══
--
-- Squad-feed video (`squad_posts.media`, a `{ kind: 'video' }` item from `squad-composer.tsx`). MA3 §5 and M-7 §3
-- both list "feed" video as counted, but `athlete_live_counts()` — and therefore the app — does not count it, and
-- the composer has no video gate. Counting it here alone would refuse a gallery clip while the app shows room for
-- it. It needs `athlete_live_counts()` widened AND a composer pre-check, together — a separate decision.
--
-- ══ CONFLICTS LEFT AS THEY ARE (parity over spec — reported, not fixed) ══
--
--   · `athlete_live_counts()` counts adopted Forge starters as day templates; MA3 §5 / M-7 §3 say the 81 Forge
--     templates never count. 0145's comment says the starters "have never been rows", but 0115 (earlier) had
--     already made an adopted starter a row. The adoption door is left ungated here; the count stays as the app
--     shows it.
--   · PLAIN.capReached said "Premium makes it unlimited" — false for squads (5) and the paid photo/video caps.
--     Fixed on the app side in the same pricing pass ("Premium gives you more room"); the Premium refusal here
--     is a separate sentence.
--
-- ══ GRANTS ══
--
-- Supabase grants EXECUTE on every new public function to anon + authenticated DIRECTLY, so each function below is
-- revoked from public, anon AND authenticated. A trigger's function needs no EXECUTE grant to fire, and
-- `live_cap_check(athlete, key)` takes an arbitrary athlete — callable, it would answer questions about a
-- stranger's plan and usage (the reason 0170 revoked `athlete_live_counts`).
--
-- Additive in schema: four triggers and five new functions. No existing function, policy, grant or row is changed.
-- ⚠ It IS access-removing in behaviour — over-cap writes the live app completes today are refused from the moment it
-- is applied (Workout Complete's save-as-template, Duplicate, approving a requester already at their squad cap).
-- The client side of that is already live: build 11's `plainError()` turns the refusal into a sentence.
--
-- Idempotent. Depends on 0145 (entitlement_config, athlete_caps, athlete_tier, athlete_live_counts, cap_allows),
-- 0115 (workout_templates.source_definition_id), 0029 (squad_members), 0044 (transformation_entries),
-- 0085 (chapter_photos), 0091 (workout_templates). Independent of 0262.

begin;

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
  '0263. Refuses (P0001) unless the athlete has room for one more photo / video / squad / day template, counted by athlete_live_counts() — the number my_entitlement() shows the app — against athlete_caps(). cap_allows() decides; -1 or a missing key is unlimited. No auth.uid() (SQL editor, service role) is never refused. Called only by the 0263 cap guards; not callable by clients.';

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
      raise exception '0263 self-check: trigger % is missing or disabled', v_trg;
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
      raise exception '0263 self-check: % was not created', v_fn;
    end if;
    if has_function_privilege('anon', v_fn, 'execute') or has_function_privilege('authenticated', v_fn, 'execute') then
      raise exception '0263 self-check: % is executable by a client role', v_fn;
    end if;
  end loop;

  -- The count must be the app's: the check reads athlete_live_counts(), not a copy of it.
  if position('athlete_live_counts' in pg_get_functiondef('public.live_cap_check(uuid, text)'::regprocedure)) = 0 then
    raise exception '0263 self-check: live_cap_check does not read athlete_live_counts()';
  end if;

  raise notice '0263 OK: four cap triggers live, five functions server-side only.';
end;
$$;

commit;

-- ══ VERIFY ══
--
-- ⚠ The SQL editor has no auth.uid(), so every insert made from it is EXEMPT (see the header) — it cannot show a
--   refusal. The refusal is proven from the app, on a Free account at a cap:
--     · Workout Complete → Save as template with 5 templates  → "You've reached the Free plan's limit for this…"
--     · Template → Duplicate with 5                           → the same line
--     · an owner approving a requester already in 1 squad     → "They're already in as many squads…"
--   and a Premium account doing the same at Free numbers goes straight through.
--
-- From the editor, by source and catalog only: supabase/apply/pending-0263.sql §2–§3.
--
-- ══ UNDO (keeps every row; puts the caps back to app-only) ══
--
--   drop trigger if exists chapter_photos_cap_guard_trg          on public.chapter_photos;
--   drop trigger if exists transformation_entries_cap_guard_trg  on public.transformation_entries;
--   drop trigger if exists squad_members_cap_guard_trg           on public.squad_members;
--   drop trigger if exists workout_templates_cap_guard_trg       on public.workout_templates;
