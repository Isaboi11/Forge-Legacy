-- Forge Legacy — 0146: close the write holes on two buckets, and the anon read on honor_metrics
--
-- ══ WHAT THIS IS ══
--
-- Three security fixes found by the 2026-08-12 launch audit (`Docs/Launch-Audit-2026-08-12.md`). All three
-- are the SAME defect this repo has already diagnosed and fixed once, in a place it was not then applied.
--
-- Nothing in `src/` depends on the capability being removed, so this needs no app change, no new build and
-- no OTA. It is safe to run at any time, and running it twice does nothing.
--
-- ⚠ WHAT THIS DELIBERATELY DOES **NOT** DO — read §"Still open" at the bottom before assuming the audit's
--   privacy findings are closed. Two of them cannot be fixed by a policy change and are not attempted here.
--
-- Idempotent. Depends on 0044 (transformation-media), 0030/0033 (squad-photos), 0099/0100 (honor_metrics).
-- RUN ANY TIME.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · transformation-media — owner-scope UPDATE and DELETE
-- ─────────────────────────────────────────────────────────────────────────────
--
-- ══ THE DEFECT ══
--
-- `0044_transformation.sql:42-45`:
--
--     create policy xform_media_update on storage.objects for update to authenticated
--       using (bucket_id = 'transformation-media');
--     create policy xform_media_delete on storage.objects for delete to authenticated
--       using (bucket_id = 'transformation-media');
--
-- No owner predicate. ANY authenticated athlete could delete or overwrite ANY object in that bucket —
-- every other athlete's six progress poses and their posing video. Their `transformation_entries` rows
-- still hold the URLs, so the gallery would render broken frames with no explanation and no recovery.
--
-- ══ WHY THIS IS NOT A NEW DISCOVERY ══
--
-- `0075_media_owner_scope.sql` found this EXACT policy shape on `squad-media`, fixed it, and wrote down
-- the reasoning: "ANY authenticated athlete could delete or overwrite ANY object in that bucket… Nothing
-- in the app does that, which is why it has gone unnoticed, but the policy is what actually holds the
-- line and it wasn't holding one." `0085_chapter_photos.sql:84,86` applies the same predicate correctly.
-- 0044 was written before 0075 and was never revisited.
--
-- Of the app's six buckets, this is the one holding body photographs.
--
-- `storage.objects.owner` is set to the uploading user automatically, so scoping to the owner needs no
-- path convention — which matters here, because `transformation-media` keys are `xf-<epoch-ms>/<pose>.jpg`
-- and carry no athlete id at all (see §"Still open").
--
-- INSERT stays open to any authenticated athlete, exactly as 0075 left it: the bucket is shared and the
-- owner column is what distinguishes objects after the fact.

drop policy if exists xform_media_update on storage.objects;
create policy xform_media_update on storage.objects for update to authenticated
  using (bucket_id = 'transformation-media' and owner = auth.uid())
  with check (bucket_id = 'transformation-media' and owner = auth.uid());

drop policy if exists xform_media_delete on storage.objects;
create policy xform_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'transformation-media' and owner = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · squad-photos — owner-scope UPDATE and DELETE
-- ─────────────────────────────────────────────────────────────────────────────
--
-- ══ FOUND BY SWEEPING FOR THE PATTERN, NOT BY A REPORT ══
--
-- The audit reported `transformation-media`. Enumerating every `storage.objects` policy in the schema
-- turned up a third bucket with the identical shape — `0030_squad_identity.sql:32-35`, re-created
-- unchanged by `0033_squad_photo_rls_fix.sql:16-21` (which fixed a different problem and carried the
-- unscoped predicate forward):
--
--     create policy squad_photos_owner_update on storage.objects for update to authenticated
--       using (bucket_id = 'squad-photos');
--
-- The policy names say `owner_update` / `owner_delete`. They have never checked an owner. Any
-- authenticated athlete can overwrite or delete any squad's crest or cover photo, including squads they
-- have never been in.
--
-- ══ ⚠ WHY THIS ONE IS **NOT** `owner = auth.uid()` ══
--
-- §1's predicate would be a REGRESSION here, and catching that is why the sweep looked at the upload code
-- and not only at the policy.
--
-- `uploadSquadPhoto` (`squad-live.ts:671-681`) writes to a FIXED path — `<squadId>/photo.<ext>` — with
-- `upsert: true`. `storage.objects.owner` is therefore whoever uploaded the photo FIRST and never changes.
-- Scoping to that owner would mean:
--
--   • a squad whose ownership has transferred (`transfer_squad_ownership`, 0047) can never have its photo
--     replaced again — the new owner is not the object owner;
--   • the original uploader keeps write access to a squad they have since left.
--
-- Both are wrong. The correct subject here is "do you own THIS SQUAD", which is what the policy name has
-- always claimed and what the path convention was built for — `squad-live.ts:668` says so outright: "The
-- object lives under `<squadId>/…` so the owner-scoped storage policy resolves."
--
-- So: scope by the squad's `owner_id`, resolved through the first path segment. INSERT is scoped the same
-- way — otherwise any athlete could plant a photo in an empty `<squadId>/` folder. The legitimate flow
-- still passes: `create_squad` inserts the founder as owner atomically, so by the time
-- `create-squad.tsx:96` uploads, `auth.uid()` IS the owner.

drop policy if exists squad_photos_owner_insert on storage.objects;
create policy squad_photos_owner_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'squad-photos'
    and exists (
      select 1 from public.squads s
       where s.id::text = (storage.foldername(name))[1]
         and s.owner_id = auth.uid()
    )
  );

drop policy if exists squad_photos_owner_update on storage.objects;
create policy squad_photos_owner_update on storage.objects for update to authenticated
  using (
    bucket_id = 'squad-photos'
    and exists (
      select 1 from public.squads s
       where s.id::text = (storage.foldername(name))[1]
         and s.owner_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'squad-photos'
    and exists (
      select 1 from public.squads s
       where s.id::text = (storage.foldername(name))[1]
         and s.owner_id = auth.uid()
    )
  );

drop policy if exists squad_photos_owner_delete on storage.objects;
create policy squad_photos_owner_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'squad-photos'
    and exists (
      select 1 from public.squads s
       where s.id::text = (storage.foldername(name))[1]
         and s.owner_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · honor_metrics — revoke from PUBLIC
-- ─────────────────────────────────────────────────────────────────────────────
--
-- ══ THE DEFECT ══
--
-- `0100_squad_streak_trailing_week.sql:39` guards the function with:
--
--     if auth.uid() is not null and p_uid <> auth.uid() then raise exception …
--
-- Under the `anon` role `auth.uid()` IS NULL, so the first conjunct is false, the guard never fires, and
-- the call proceeds for ANY athlete id. The function is `security definer`, and Postgres grants EXECUTE
-- to PUBLIC on every newly created function unless told otherwise — neither 0099 nor 0100 revokes it.
--
-- So any holder of the public anon key can POST to `/rest/v1/rpc/honor_metrics` with an arbitrary uuid and
-- read that athlete's lifetime workout count, hours trained, lifetime volume, PR count, distinct training
-- partners, squad membership and every hidden-honor time-of-day count.
--
-- It chains: `profiles_read` is `using (true)` (`0001_spine.sql:165`), and `0114_athlete_search.sql:20-22`
-- already records that "any client holding the anon key can already page the entire profile table through
-- PostgREST". Population-wide uuids plus an unguarded per-uuid metrics function is a full population read.
--
-- ══ WHY A REVOKE AND NOT A GUARD REWRITE ══
--
-- Changing the guard to `if auth.uid() is null or p_uid <> auth.uid()` would also work, but it means
-- `create or replace` over a ~300-line body — and this repo has three recorded ways a partial function
-- rebuild lies about having worked. A grant change touches no body at all.
--
-- This is precisely what `0135_post_reply_notifications.sql:211` does for `notification_events_for(uuid)`,
-- for the same reason, one migration later. The pattern was known; it was not applied backwards.
--
-- `evaluate_honors` calls `honor_metrics` internally and is itself SECURITY DEFINER, so it executes as the
-- function owner and is unaffected by these grants. `src/` never calls `honor_metrics` — verified by grep;
-- the only references are comments. `authenticated` is granted anyway so the function's documented
-- self-read behaviour is preserved rather than silently removed.

-- ══ ⚠ `FROM PUBLIC` IS NOT ENOUGH ON SUPABASE — AND THIS IS SCHEMA-WIDE ══
--
-- The first run of this migration failed its own assertion: after `revoke execute … from public`, `anon`
-- could STILL execute the function. The reason is a Supabase platform default:
--
--     alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
--
-- So every new function in `public` gets a DIRECT grant to `anon`, and `revoke … from public` does not
-- touch a direct role grant. The revoke reports success and changes nothing.
--
-- ⚠ THIS APPLIES TO ALL 33 `revoke execute` STATEMENTS IN THIS SCHEMA. Every one of them —
--   0120's `notification_events_for` / `push_enqueue_for` / `push_drain` / `push_reconcile`, 0130's seven
--   `admin_*`, 0131's `app_events_prune`, 0133's rollups, 0135's re-revoke, 0140/0141/0142/0143 — says
--   `from public` and none says `from anon`. They are all presumed ineffective until proven otherwise.
--
--   They are NOT fixed here. Several are load-bearing (`push_drain` is called by cron as the table owner;
--   the `admin_*` family additionally calls `admin_guard()`, which raises 42501 for a non-admin, so those
--   are defended in depth). Revoking 33 grants blind is how a security fix becomes an outage. The
--   reporting block at the bottom of this migration lists exactly which functions `anon` can reach, so the
--   follow-up is a decision made against real output rather than a guess.
--
-- This is the same class as the three failure modes `preflight-what-is-applied.sql` documents: a statement
-- that runs cleanly and does not do what it says. It was caught only because this migration asserts its
-- own result. Assert the outcome, never the statement.

revoke execute on function public.honor_metrics(uuid) from public;
revoke execute on function public.honor_metrics(uuid) from anon;
grant  execute on function public.honor_metrics(uuid) to authenticated;

comment on function public.honor_metrics(uuid) is
  'Per-athlete honor metric bundle. SECURITY DEFINER, self-only. ⚠ REVOKED FROM PUBLIC (0146): its guard is `auth.uid() is not null and p_uid <> auth.uid()`, which short-circuits to false under the anon role and therefore never fires for an unauthenticated caller. The revoke, not the guard, is what keeps this self-only. Do not GRANT to anon.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Verification — reports what is now true. Read the output.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  v_bad_policies int;
  v_anon_metrics boolean;
begin
  -- Every write policy on a media bucket must discriminate by the CALLER. `auth.uid()` is the test, not
  -- the word "owner" — `squad_photos_*` scopes by `squads.owner_id` and would match a naive '%owner%'
  -- check even if the caller comparison were missing.
  select count(*) into v_bad_policies
    from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and policyname in (
       'xform_media_update', 'xform_media_delete',
       'squad_photos_owner_insert', 'squad_photos_owner_update', 'squad_photos_owner_delete',
       'squad_media_update', 'squad_media_delete',
       'chapter_photos_update', 'chapter_photos_delete'
     )
     and coalesce(qual, '') || coalesce(with_check, '') not like '%auth.uid()%';

  select has_function_privilege('anon', 'public.honor_metrics(uuid)', 'execute')
    into v_anon_metrics;

  raise notice '─────────────────────────────────────────────';
  raise notice '0146 verification';
  raise notice '  unscoped media write policies remaining : %  (expect 0)', v_bad_policies;
  raise notice '  anon may execute honor_metrics          : %  (expect false)', v_anon_metrics;
  raise notice '─────────────────────────────────────────────';

  if v_bad_policies <> 0 then
    raise exception '0146: % media write polic(ies) still do not check the caller', v_bad_policies;
  end if;
  if v_anon_metrics then
    raise exception '0146: anon can STILL execute honor_metrics — revoke from anon, not just public';
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Reporting only — the triage list for the `from public` / `from anon` problem
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Changes nothing. Lists every SECURITY DEFINER function in `public` that the `anon` role can execute
-- today, so the follow-up migration is written against fact.
--
-- HOW TO READ IT:
--   • `guarded_internally = true`  → the body calls admin_guard() / auth.uid() / raises. Defended in depth;
--     the grant is untidy but not an open door. Lower priority.
--   • `guarded_internally = false` → nothing inside stops an unauthenticated caller. Triage these first.
--   • A function that takes a uuid AND is unguarded is the honor_metrics shape exactly.
--
-- Expect `honor_metrics` to be ABSENT from this list after this migration.

do $$
declare r record; v_n int := 0;
begin
  raise notice '';
  raise notice '══ SECURITY DEFINER functions in public that ANON can execute ══';
  for r in
    select p.proname,
           pg_get_function_identity_arguments(p.oid) as args,
           (pg_get_functiondef(p.oid) ilike '%admin_guard%'
             or pg_get_functiondef(p.oid) ilike '%auth.uid() is null%'
             or pg_get_functiondef(p.oid) ilike '%not authenticated%') as guarded_internally
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prosecdef
       and has_function_privilege('anon', p.oid, 'execute')
     order by (pg_get_functiondef(p.oid) ilike '%admin_guard%')::int, p.proname
  loop
    v_n := v_n + 1;
    raise notice '  [%] %(%)  guarded_internally=%',
      lpad(v_n::text, 2), r.proname, r.args, r.guarded_internally;
  end loop;
  raise notice '── % function(s). See §"Still open" item 5. ──', v_n;
  raise notice '';
end $$;

-- ═════════════════════════════════════════════════════════════════════════════
-- STILL OPEN — do not read this migration as closing the audit's privacy section
-- ═════════════════════════════════════════════════════════════════════════════
--
-- Four findings from `Docs/Launch-Audit-2026-08-12.md` are NOT addressed here, because none of them is a
-- policy change and pretending otherwise is how "fixed" becomes wrong:
--
-- 1 · READ on `transformation-media` and `squad-media` is still open to `anon`.
--     Both buckets are `public: true` with `for select using (bucket_id = …)` and no `TO` clause. So a
--     friends-only post photo and a shared transformation pose are both fetchable by anyone with the URL,
--     and sibling poses are derivable by substituting the pose key (`ff` → `rf`) because the object path is
--     `<draftId>/<pose>.<ext>`.
--     ⚠ THIS CANNOT BE CLOSED BY A POLICY. The client builds every image URL with `getPublicUrl()`
--       (`transformation-live.ts:171`, `friends-feed-live.ts:320`, `accomplishments-live.ts:161`,
--       `photos-live.ts`). Making the bucket private turns every one of those into a 404 — every photo in
--       the app disappears. Closing it means moving to signed URLs across every media surface, which is an
--       app change and a release, not a migration.
--
-- 2 · `transformation-media` object keys carry no athlete id (`xf-<epoch-ms>/<pose>.jpg`,
--     `transformation-add.tsx:38`). Two athletes composing in the same millisecond collide, and the upload
--     is `upsert: true`. Fixing the convention requires an app change plus a migration of existing objects.
--     §1 above makes the collision harmless for *deletes* (owner is checked) but not for the key itself.
--
-- 3 · `squads.invite_code` is readable by any member off the table row, so "Who Can Invite → Owner Only"
--     is advisory and request-only joining is bypassable for public squads. The clean fix is column-level:
--     `revoke select on squads from anon, authenticated` then `grant select (<every other column>)`.
--     ⚠ NOT DONE HERE ON PURPOSE. A column-level grant must enumerate every remaining column, and any
--       column added later is silently ungranted — a future migration would break reads with no warning.
--       That trade needs a decision, not a quiet include. `SQUAD_COLS` (`squad-live.ts:107`) already
--       excludes `invite_code` and the live read path is `squad_invite_info()` (0056), so the app itself
--       is ready for it; the only client reader is the pre-0056 fallback at `squad-live.ts:336`, which is
--       unreachable now that 0056 is applied.
--
-- 5 · ⚠ EVERY OTHER `revoke execute … from public` IN THIS SCHEMA IS PRESUMED INEFFECTIVE.
--     33 of them, none naming `anon`, for the platform-default reason written out in §3. Confirmed for
--     `honor_metrics` by this migration's own failing assertion on its first run. The reporting block above
--     prints the real list. Highest-suspicion members, all SECURITY DEFINER over an arbitrary id:
--
--       · `notification_events_for(uuid)` — 0120/0121/0122/0126/0135 each re-revoke it `from public`, and
--         0135's comment says leaving the line out "silently re-opens the escalation the revoke exists to
--         close". If the revoke never worked, that escalation has been open the whole time: any athlete's
--         notification stream, by uuid.
--       · `push_enqueue_for(uuid)`, `push_drain(int)`, `push_reconcile(int)` — enqueue and delivery.
--       · `app_events_prune(int)`, `metrics_rollup(int,text)`, `squad_checkin_prune(int)`,
--         `squad_checkin_mark_reclaimed(text[])` — destructive maintenance.
--       · The seven `admin_*` — lower priority ONLY because each calls `admin_guard()` first, which raises
--         42501 for a non-admin. The grant is still wrong; it is just not the thing holding the line.
--
--     Fix these in 0147, written against the reporting block's actual output, one deliberate group at a
--     time — checking for each whether cron or another definer function is the real caller before removing
--     a grant. `push_drain` in particular is invoked by pg_cron and must keep working.
--
-- 4 · `profiles.training_since` / `training_label` are selectable straight off the table
--     (`0086:35-36` + `profiles_read using (true)`), so "Live Workout Status → Only me" restricts nothing.
--     Same column-level-grant trade as §3. Verified safe on the app side — `src/` never selects either
--     column, and there are no `select('*')` calls on `profiles` — so this one is ready to do the moment
--     the enumeration trade is accepted. `0132_athlete_activity.sql:10-13` reached the same conclusion
--     about a `last_active_at` column and put it on its own table instead; that is the other option here.
