-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
-- 0271 — AI deploys you can trust: a record of every function deploy (ai_deploy_log), the nightly
--        deployed-vs-repo check's results (ai_drift_checks), the /admin-ai "Deployed code" read
--        (admin_ai_deploys), and the definer-revoke half of PL-1.
--
-- AI Road to 10, Sprint 2 "gates + sync" — PL-5 (deploys you can trust) and PL-1's last item (Docs/AI-Road-To-10-
-- Plan-v1.0.md §2), platform gate ③ "deployed code == repo (checked daily)". Audit P-G5 (Docs/QA/AI-Audit-2026-11-16/
-- 5-platform.md): "Deploys are dashboard pastes with no check that deployed = repo" — program-photo-read sat stale for
-- seven weeks and build 11's form-check server half was never deployed. Contract: Docs/AI-Sprint-2-Build-Notes.md §1.5.
--
-- ══ WHAT IT ADDS ══
--
--   ai_deploy_log      one row per function version deployed through the deploy-ai skill: slug, version, the
--                      sha256 of the deployed file (raw and normalized), the repo commit it came from, how it was
--                      deployed (mgmt_api · mcp · dashboard · cli), when, and by whom. RLS on, no policy, no grant.
--   ai_drift_checks    one row per function per nightly check: the deployed version and hash, the repo bundle's
--                      hash, and the verdict (same · same_after_normalize · differs · missing_in_repo ·
--                      missing_live · fetch_failed). Kept 90 days. RLS on, no policy, no grant.
--   ai_deploy_record() / ai_drift_record()
--                      the two writers. ⛔ NOBODY BUT `postgres` CAN CALL THEM: SECURITY INVOKER (they carry no
--                      privilege of their own) and EXECUTE revoked from public, anon, authenticated AND
--                      service_role. The deploy-ai skill calls the first through the Supabase MCP's SQL tool or the
--                      Management API's SQL endpoint, the nightly job (.github/workflows/drift.yml) the second
--                      through the Management API — both run as `postgres`. A client key cannot reach them, and an
--                      app account could not write the tables even if it could (no table grant).
--   admin_ai_deploys() the /admin-ai "Deployed code" card: the latest check per function and the recent deploys.
--                      admin_guard() first, like every admin_* read.
--
-- ══ THE DEFINER-REVOKE HALF OF PL-1 (§4) ══
--
--   Postgres grants EXECUTE to PUBLIC on every new function, and Supabase's default privileges grant it to anon
--   DIRECTLY — so a SECURITY DEFINER function is closed only by `revoke … from public, anon` (0147). The new static
--   check (scripts/definer-grants-check.mjs, run by src/app/__tests__/rls-static.test.mjs in CI) replays the
--   migrations and finds 97 definer functions whose statements never closed both. §4 closes 93 of them; the other 4
--   are anon-callable on purpose (the allowlist in the test, with a reason each).
--
--   ·  80 of the 93 are ALREADY closed live (read 2026-11-17: anon cannot execute them and PUBLIC holds nothing —
--      0147's default privileges held for them). For those the revoke is a no-op that makes the repo say what the
--      database already does, so a database rebuilt from these files is closed too.
--   ·  13 are OPEN live today (PUBLIC holds EXECUTE): push_register_token (0187 dropped and re-created it),
--      is_trainer, athlete_respond_to_coach, athlete_revoke_coach and nine trainer_* functions (0182/0183, which
--      granted to authenticated and never revoked PUBLIC). Proof that nothing calls them signed out, checked
--      2026-11-17 across every branch (git grep) and every Edge Function: the only callers are
--      src/lib/push.tsx (runs only once a user id exists) and feat/forge-coach's trainer/athlete screens (behind
--      the boot router's sign-in gate, 0147's finding); no Edge Function names them; every one needs auth.uid()
--      (push_register_token raises 'not authenticated'). Live, `authenticated` holds a DIRECT grant on all 93, so
--      a signed-in caller keeps working — and §4 RAISES (rolling back) if any function loses authenticated
--      EXECUTE, so it cannot break the app by surprise.
--   ⚠ Not touched: arcade_ops_push / arcade_ops_snapshot — open to PUBLIC live, but not in this repo (another
--     product's SQL in this database). Listed for the PO. Trigger functions are exempt: Postgres will not run a
--     function that returns trigger outside a trigger.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 0. admin_guard FIRST — every admin_* read in this schema depends on it (0176).
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

do $$
begin
  if to_regprocedure('public.admin_guard()') is null then
    raise exception '0271: public.admin_guard() is missing (0176). This is not a Forge Legacy database that is up to date — stop.';
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 1. THE TWO TABLES — server only
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.ai_deploy_log (
  id                 bigint generated always as identity primary key,
  slug               text not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,62}$'),
  version            integer not null check (version >= 1),
  -- sha256 of the deployed entrypoint as read back after the deploy, exactly (raw) and after the bundle
  -- normaliser (scripts/lib/bundle-normalize.mjs). Lowercase hex.
  sha256_raw         text not null check (sha256_raw ~ '^[0-9a-f]{64}$'),
  sha256_normalized  text not null check (sha256_normalized ~ '^[0-9a-f]{64}$'),
  source_commit      text check (source_commit is null or source_commit ~ '^[0-9a-f]{7,40}$'),
  method             text not null check (method in ('mgmt_api', 'mcp', 'dashboard', 'cli')),
  deployed_at        timestamptz not null default now(),
  deployed_by        text not null check (length(deployed_by) between 1 and 80),
  note               text check (note is null or length(note) <= 500)
);

create unique index if not exists ai_deploy_log_slug_version_key on public.ai_deploy_log (slug, version);
create index if not exists ai_deploy_log_at_idx on public.ai_deploy_log (deployed_at desc);

create table if not exists public.ai_drift_checks (
  id                bigint generated always as identity primary key,
  run_id            uuid not null,
  checked_at        timestamptz not null default now(),
  slug              text not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,62}$'),
  deployed_version  integer check (deployed_version is null or deployed_version >= 1),
  deployed_sha256   text check (deployed_sha256 is null or deployed_sha256 ~ '^[0-9a-f]{64}$'),
  repo_sha256       text check (repo_sha256 is null or repo_sha256 ~ '^[0-9a-f]{64}$'),
  repo_commit       text check (repo_commit is null or repo_commit ~ '^[0-9a-f]{7,40}$'),
  status            text not null check (status in ('same', 'same_after_normalize', 'differs', 'missing_in_repo', 'missing_live', 'fetch_failed')),
  -- What differs, in words the card can show ("line 336", "3 files deployed, the repo has 1"). Never a secret.
  detail            text check (detail is null or length(detail) <= 500)
);

create index if not exists ai_drift_checks_at_idx on public.ai_drift_checks (checked_at desc);
create index if not exists ai_drift_checks_run_idx on public.ai_drift_checks (run_id);

alter table public.ai_deploy_log   enable row level security;
alter table public.ai_drift_checks enable row level security;

revoke all on table public.ai_deploy_log, public.ai_drift_checks from public, anon, authenticated, service_role;


-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 2. THE WRITERS — `postgres` only (the deploy-ai skill and the nightly job, through the SQL endpoints)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.ai_deploy_record(
  p_slug text,
  p_version integer,
  p_sha256_raw text,
  p_sha256_normalized text,
  p_source_commit text,
  p_method text,
  p_deployed_by text,
  p_note text default null
)
returns bigint
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_id bigint;
begin
  if p_slug is null or p_slug !~ '^[a-z0-9][a-z0-9-]{0,62}$' then
    raise exception 'ai_deploy_record: bad slug %', p_slug using errcode = '22023';
  end if;
  if p_version is null or p_version < 1 then
    raise exception 'ai_deploy_record: bad version %', p_version using errcode = '22023';
  end if;
  if p_sha256_raw is null or lower(p_sha256_raw) !~ '^[0-9a-f]{64}$'
     or p_sha256_normalized is null or lower(p_sha256_normalized) !~ '^[0-9a-f]{64}$' then
    raise exception 'ai_deploy_record: a hash is not 64 hex characters' using errcode = '22023';
  end if;
  if p_source_commit is not null and lower(p_source_commit) !~ '^[0-9a-f]{7,40}$' then
    raise exception 'ai_deploy_record: bad commit %', p_source_commit using errcode = '22023';
  end if;
  if p_method is null or p_method not in ('mgmt_api', 'mcp', 'dashboard', 'cli') then
    raise exception 'ai_deploy_record: method must be mgmt_api, mcp, dashboard or cli' using errcode = '22023';
  end if;
  if p_deployed_by is null or length(btrim(p_deployed_by)) not between 1 and 80 then
    raise exception 'ai_deploy_record: say who deployed it (1-80 characters)' using errcode = '22023';
  end if;

  -- Recording the same version again corrects it (a re-read hash), it never makes a second row.
  insert into public.ai_deploy_log as l (slug, version, sha256_raw, sha256_normalized, source_commit, method, deployed_by, note)
  values (p_slug, p_version, lower(p_sha256_raw), lower(p_sha256_normalized), lower(p_source_commit), p_method,
          btrim(p_deployed_by), left(p_note, 500))
  on conflict (slug, version) do update
     set sha256_raw        = excluded.sha256_raw,
         sha256_normalized = excluded.sha256_normalized,
         source_commit     = excluded.source_commit,
         method            = excluded.method,
         deployed_by       = excluded.deployed_by,
         note              = excluded.note
  returning l.id into v_id;
  return v_id;
end;
$$;

-- p_run = {"source_commit": "<sha of main>", "rows": [{"slug", "status", "deployed_version", "deployed_sha256",
--          "repo_sha256", "detail"}, …]} — one call per nightly run; every row gets the same run_id and time.
create or replace function public.ai_drift_record(p_run jsonb)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_run    uuid := gen_random_uuid();
  v_at     timestamptz := now();
  v_commit text := lower(p_run ->> 'source_commit');
  v_n      integer := 0;
  r        jsonb;
begin
  if p_run is null or jsonb_typeof(p_run) <> 'object' or coalesce(jsonb_typeof(p_run -> 'rows'), '') <> 'array' then
    raise exception 'ai_drift_record: expected {"source_commit", "rows": [...]}' using errcode = '22023';
  end if;
  if jsonb_array_length(p_run -> 'rows') = 0 or jsonb_array_length(p_run -> 'rows') > 200 then
    raise exception 'ai_drift_record: 1 to 200 rows' using errcode = '22023';
  end if;
  if v_commit is not null and v_commit !~ '^[0-9a-f]{7,40}$' then
    raise exception 'ai_drift_record: bad source_commit' using errcode = '22023';
  end if;

  for r in select e from jsonb_array_elements(p_run -> 'rows') as t(e) loop
    if jsonb_typeof(r) <> 'object' then
      raise exception 'ai_drift_record: every row is an object' using errcode = '22023';
    end if;
    insert into public.ai_drift_checks (run_id, checked_at, slug, deployed_version, deployed_sha256, repo_sha256,
                                        repo_commit, status, detail)
    values (v_run, v_at, r ->> 'slug', (r ->> 'deployed_version')::integer, lower(r ->> 'deployed_sha256'),
            lower(r ->> 'repo_sha256'), v_commit, r ->> 'status', left(r ->> 'detail', 500));
    v_n := v_n + 1;
  end loop;

  delete from public.ai_drift_checks where checked_at < now() - interval '90 days';
  return v_n;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 3. THE READER — /admin-ai's "Deployed code" card, operators only
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.admin_ai_deploys(p_limit integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_run uuid;
  v_at  timestamptz;
begin
  perform public.admin_guard();

  select d.run_id, max(d.checked_at)
    into v_run, v_at
    from public.ai_drift_checks d
   group by d.run_id
   order by max(d.checked_at) desc
   limit 1;

  return jsonb_build_object(
    'generated_at', now(),
    'last_check', case when v_run is null then null else jsonb_build_object(
      'checked_at', v_at,
      'rows', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'slug', d.slug,
                 'status', d.status,
                 'deployed_version', d.deployed_version,
                 'repo_commit', d.repo_commit,
                 'detail', d.detail) order by d.slug)
          from public.ai_drift_checks d
         where d.run_id = v_run), '[]'::jsonb)) end,
    'runs_7d', (select count(distinct d.run_id) from public.ai_drift_checks d where d.checked_at > now() - interval '7 days'),
    'deploys', coalesce((
      select jsonb_agg(jsonb_build_object(
               'slug', l.slug,
               'version', l.version,
               'method', l.method,
               'deployed_at', l.deployed_at,
               'deployed_by', l.deployed_by,
               'source_commit', l.source_commit) order by l.deployed_at desc)
        from (select * from public.ai_deploy_log x
               order by x.deployed_at desc
               limit greatest(1, least(coalesce(p_limit, 30), 200))) l), '[]'::jsonb)
  );
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 4. THE DEFINER-REVOKE HALF OF PL-1 — close 93 SECURITY DEFINER functions to public AND anon
--    (80 already closed live: a no-op that makes the repo say so · 13 open live: see the header for the proof)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

do $$
declare
  f        text;
  v_before boolean;
  v_absent text[] := '{}';
  fns text[] := array[
    -- ── open live on 2026-11-17 (PUBLIC held EXECUTE) ──
    'public.athlete_respond_to_coach(uuid, boolean)',
    'public.athlete_revoke_coach()',
    'public.is_trainer()',
    'public.push_register_token(text, text, text)',
    'public.trainer_client_adherence(uuid)',
    'public.trainer_client_body(uuid, date)',
    'public.trainer_client_lifts(uuid, date)',
    'public.trainer_client_sessions(uuid, integer)',
    'public.trainer_end_client(uuid)',
    'public.trainer_invitations()',
    'public.trainer_invite_client(text)',
    'public.trainer_roster()',
    'public.trainer_withdraw_invite(uuid)',
    -- ── already closed live (no-op; the repo now says so) ──
    'public.admin_activity_done(uuid, boolean)',
    'public.admin_activity_log(uuid, text, text, date)',
    'public.admin_appstore(integer)',
    'public.admin_billing_list(text, integer)',
    'public.admin_bug_context(uuid)',
    'public.admin_bug_delete(uuid)',
    'public.admin_bug_links()',
    'public.admin_bug_plain_save(uuid, jsonb)',
    'public.admin_bug_save(uuid, jsonb)',
    'public.admin_bug_sources()',
    'public.admin_bug_track(text, text)',
    'public.admin_bugs(text, text, text, integer)',
    'public.admin_client_error_detail(text, integer)',
    'public.admin_client_error_set_status(text, text, text)',
    'public.admin_client_errors(integer, integer, text)',
    'public.admin_community_foods(boolean, integer)',
    'public.admin_contact_activity(uuid)',
    'public.admin_contact_delete(uuid)',
    'public.admin_contact_save(uuid, jsonb)',
    'public.admin_contacts(text, text)',
    'public.admin_crashes(integer)',
    'public.admin_delete_community_food(text)',
    'public.admin_document_delete(uuid)',
    'public.admin_document_save(uuid, jsonb)',
    'public.admin_documents(text, text)',
    'public.admin_feedback_set_status(bigint, text)',
    'public.admin_feedback(integer, text)',
    'public.admin_report_dismiss(text, boolean)',
    'public.admin_report_track(text, uuid)',
    'public.admin_reports_inbox(integer)',
    'public.admin_reports(integer, text)',
    'public.admin_resolve_report(uuid, text, text)',
    'public.admin_restore_community_food(text)',
    'public.admin_revenue(integer, text, boolean)',
    'public.admin_social_disconnect(text)',
    'public.admin_social_followers_save(text, date, integer)',
    'public.admin_social_goal_save(text, integer, integer, date)',
    'public.admin_social_item_delete(text, uuid)',
    'public.admin_social_item_save(text, uuid, jsonb)',
    'public.admin_social_media(text)',
    'public.admin_social_posting_attach(uuid, uuid)',
    'public.admin_social_posting_delete(uuid)',
    'public.admin_social_posting_save(uuid, jsonb)',
    'public.admin_social_posting_unlink(uuid)',
    'public.admin_social_question_to_video(uuid)',
    'public.admin_social_tag_delete(text, text)',
    'public.admin_social_tag_save(text, text, text)',
    'public.admin_social_video_delete(uuid)',
    'public.admin_social_video_save(uuid, jsonb)',
    'public.admin_survey_delete(uuid)',
    'public.admin_survey_hide(uuid, boolean)',
    'public.admin_survey_save(uuid, jsonb)',
    'public.admin_survey(uuid)',
    'public.admin_surveys()',
    'public.admin_tiers()',
    'public.admin_user_search(text, integer)',
    'public.admin_waitlist(integer, text)',
    'public.block_athlete(uuid)',
    'public.briefing_body(uuid)',
    'public.briefing_send()',
    'public.client_errors_prune(integer)',
    'public.community_food_reported_by_me(text)',
    'public.crm_sub_env(uuid, text)',
    'public.edit_squad_post(uuid, text, jsonb)',
    'public.has_nutrition_access()',
    'public.has_nutrition_planner()',
    'public.is_blocked(uuid, uuid)',
    'public.live_session_of(uuid)',
    'public.my_blocked_athletes()',
    'public.my_referral_attribution()',
    'public.ops_origin_ref(text)',
    'public.pin_squad_post(uuid, boolean)',
    'public.record_referral_attribution(text, text)',
    'public.rename_squad_post(uuid, text)',
    'public.report_community_food(text)',
    'public.report_content(text, text, text, text, uuid)',
    'public.share_community_food(text, text, text, numeric, numeric, numeric, numeric, jsonb, jsonb, text)',
    'public.trainer_client_guard(uuid)',
    'public.trainer_guard()',
    'public.unblock_athlete(uuid)'
  ];
begin
  foreach f in array fns loop
    if to_regprocedure(f) is null then
      v_absent := v_absent || f;
      continue;
    end if;
    v_before := has_function_privilege('authenticated', f, 'execute');
    execute format('revoke execute on function %s from public, anon', f);
    if v_before and not has_function_privilege('authenticated', f, 'execute') then
      raise exception '0271: % held authenticated EXECUTE only through PUBLIC — nothing was changed (this statement rolls back). Grant it to authenticated first.', f;
    end if;
  end loop;
  if cardinality(v_absent) > 0 then
    raise warning '0271: not in this database, skipped: %', array_to_string(v_absent, ', ');
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 5. GRANTS — Supabase grants EXECUTE on every new function to anon AND authenticated DIRECTLY, so both
--    go first. The writers go to NOBODY (postgres owns them and needs no grant); the reader to authenticated
--    (admin_guard refuses anybody else).
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

revoke all on function public.ai_deploy_record(text, integer, text, text, text, text, text, text) from public, anon, authenticated, service_role;
revoke all on function public.ai_drift_record(jsonb)                                             from public, anon, authenticated, service_role;
revoke all on function public.admin_ai_deploys(integer)                                          from public, anon;
grant execute on function public.admin_ai_deploys(integer)                                       to authenticated;
