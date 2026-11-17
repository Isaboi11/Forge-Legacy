-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0269: AI observability — thumbs, the /admin AI health read, the daily canary, the hourly alert
--
-- ⚠ APPLY AFTER 0268. Order: 0268 (money) → 0269 (this) → 0270 (keep). §1's first statement refuses to run
--   without 0268's columns and names the file to paste first.
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: every table is `create … if not exists`, every function `create or replace`, every
-- policy dropped and re-created, the config row `on conflict do nothing`, each cron job unscheduled before it
-- is scheduled again, and §3 is read-only. A second run changes nothing (the secret and the thresholds stay).
-- The editor shows only the LAST result — that is §3.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- AI Road to 10, Sprint 1 — PL-4 (Docs/AI-Road-To-10-Plan-v1.0.md §2), audit G1/G2: "AI failures are
-- invisible … the 09-21 key drain was found by testers." After this, failures, refunds, latency and real cost
-- per function per day are on /admin → AI health, athletes can say whether an answer helped, and the PO's phone
-- is told within the hour when something breaks.
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  (verbatim from supabase/migrations/0269_ai_observability.sql)
--     · ai_feedback — one Helpful / Not helpful per athlete per AI answer, RLS own-rows (select/insert/update).
--     · ai_ops_config (one row) + ai_canary_runs — RLS on, no policy, no client grant.
--     · admin_ai_health(p_days, p_tz) — the /admin-ai read, admin_guard() first.
--     · ai_canary_begin / ai_canary_record — the canary's claim and report (service_role only, secret checked).
--     · ai_health_alert_state / ai_health_alert_tick — FREE, SQL only; pushes operators, once per 6 h per kind.
--     · ai_canary_tick — the daily call to the ai-canary Edge Function. ⚠ Returns at once while
--       ai_ops_config.canary_url is null: APPLYING THIS SPENDS NOTHING.
--     · cron: forge-ai-health-alert (hourly, :25) and forge-ai-canary (daily, 15:40 UTC).
-- §2  RAISES if a table, its RLS, a policy, a grant, a function or a job did not land — or if anon or
--     authenticated can call something they must not.
-- §3  one row: what landed, what anon/authenticated can call, the alert state right now.
--
-- ══ AFTER APPLYING — THE CANARY STAYS OFF UNTIL THE PO TURNS IT ON (in this order) ══
--
--   1. Read the secret:      select cron_secret from public.ai_ops_config;
--   2. Edge Function secret: Dashboard → Edge Functions → Secrets → AI_CANARY_SECRET = that value.
--   3. Deploy ai-canary with "Verify JWT" OFF (pg_cron sends no user token; the secret is the gate, checked
--      before anything else, so a stranger gets a 401 and Anthropic is never called).
--   4. Turn it on:           update public.ai_ops_config
--                               set canary_url = 'https://<project-ref>.supabase.co/functions/v1/ai-canary',
--                                   updated_at = now()
--                             where id;
--   The first run is at the next 15:40 UTC. Cost: about $0.0001 a run, ~$0.004 a month (see the function).
--
-- ⚠ The hourly alert runs from the moment this is applied. It is free (SQL only) and pushes only when one of
--   its four checks trips. To see it work without waiting, open /admin → AI health.
-- ⚠ The app half (the AI health page, the thumbs, the push tap → /admin-ai) ships with the Sprint 1 OTA. Until
--   then nothing calls admin_ai_health and every ai_feedback count is 0 — that is expected, not broken.
--
-- ══ PREDICTED §3 (written 2026-11-17, before the Sprint 1 functions are redeployed) ══
--   rls_on = true,true,true · feedback_policies = 3 · config_rows = 1 · canary_on = false · secret_chars = 64 ·
--   jobs = forge-ai-canary 40 15 * * * | forge-ai-health-alert 25 * * * * · canary_runs = 0 · feedback_rows = 0 ·
--   anon_can_call = (none) · authenticated_can_call = admin_ai_health · service_role_can_call =
--   ai_canary_begin, ai_canary_record · admins_with_device = 1 · unsettled_now = 0 · alerts_now = [] ·
--   spend_rows_with_fn = 0
--   Why: no canary has run (the URL is null); the newest coach_ai_spend row is 11-03, so the 24 h failure check
--   has no calls and the 2 h drain check has no streak; no Sprint 1 function settles yet, so no row has `fn`
--   and no reservation exists. ⚠ spend_rows_with_fn > 0 or unsettled_now > 0 means a reserve/settle function
--   is already deployed — fine if it was, but say so before recording this as applied.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────────────────────────────────
-- §1 — THE STATEMENTS (verbatim from supabase/migrations/0269_ai_observability.sql)
-- ───────────────────────────────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 0. 0268 FIRST — refuse to run on a database that does not have the reserve/settle meter's columns.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

do $$
declare
  v_missing text;
begin
  select string_agg(want.t || '.' || want.c, ', ') into v_missing
    from (values ('coach_ai_spend', 'fn'), ('coach_ai_spend', 'outcome'), ('coach_ai_spend', 'latency_ms'),
                 ('coach_ai_spend', 'reservation_id'), ('coach_ai_reservation', 'reserved_at'),
                 ('coach_ai_reservation', 'settled_at')) as want(t, c)
   where not exists (select 1 from information_schema.columns ic
                      where ic.table_schema = 'public' and ic.table_name = want.t and ic.column_name = want.c);
  if v_missing is not null then
    raise exception '0269 needs 0268 first — missing %. Paste supabase/apply/pending-0268.sql, then this file.', v_missing;
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 1. THUMBS — ai_feedback
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.ai_feedback (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  feature     text not null
              constraint ai_feedback_feature_check
              check (feature in ('chat', 'kitchen', 'meal_photo', 'form_check', 'import', 'author', 'interpret', 'recipe_photo')),
  -- The output's own id: a server id where one exists (a form check), else one the app made once for that answer.
  ref         text not null
              constraint ai_feedback_ref_check
              check (length(ref) between 1 and 120 and ref ~ '^[A-Za-z0-9_.:-]+$'),
  rating      smallint not null constraint ai_feedback_rating_check check (rating in (-1, 1)),
  note        text constraint ai_feedback_note_check check (note is null or length(note) <= 280),
  model       text constraint ai_feedback_model_check check (model is null or length(model) <= 64),
  created_at  timestamptz not null default now(),
  constraint ai_feedback_one_vote unique (athlete_id, feature, ref)
);

create index if not exists ai_feedback_created_idx on public.ai_feedback (created_at desc);

alter table public.ai_feedback enable row level security;

drop policy if exists ai_feedback_select_own on public.ai_feedback;
create policy ai_feedback_select_own on public.ai_feedback
  for select to authenticated
  using (athlete_id = (select auth.uid()));

drop policy if exists ai_feedback_insert_own on public.ai_feedback;
create policy ai_feedback_insert_own on public.ai_feedback
  for insert to authenticated
  with check (athlete_id = (select auth.uid()));

drop policy if exists ai_feedback_update_own on public.ai_feedback;
create policy ai_feedback_update_own on public.ai_feedback
  for update to authenticated
  using (athlete_id = (select auth.uid()))
  with check (athlete_id = (select auth.uid()));

-- The app upserts (insert … on conflict (athlete_id, feature, ref) do update). Column grants keep `athlete_id`
-- (always auth.uid(), by default) and `created_at` out of the client's hands. No delete, no anon.
revoke all on table public.ai_feedback from anon, authenticated;
grant select on table public.ai_feedback to authenticated;
grant insert (feature, ref, rating, note, model) on table public.ai_feedback to authenticated;
grant update (feature, ref, rating, note, model) on table public.ai_feedback to authenticated;


-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 2. THE OPS ROW AND THE CANARY LEDGER — server only
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.ai_ops_config (
  id                    boolean primary key default true check (id),
  -- The ai-canary function's URL. ⚠ NULL = the canary is off and costs nothing (ai_canary_tick returns at once).
  canary_url            text check (canary_url is null or (length(canary_url) <= 500 and canary_url ~ '^https://')),
  -- What pg_cron sends as x-cron-secret. The Edge Function secret AI_CANARY_SECRET must be set to this value.
  cron_secret           text not null
                        default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
                        check (length(cron_secret) >= 32),
  fail_rate             numeric not null default 0.05 check (fail_rate > 0 and fail_rate <= 1),
  fail_min_calls        integer not null default 10 check (fail_min_calls >= 1),
  drain_streak          integer not null default 3 check (drain_streak >= 2),
  unsettled_minutes     integer not null default 30 check (unsettled_minutes >= 5),
  alert_cooldown_hours  integer not null default 6 check (alert_cooldown_hours >= 1),
  canary_min_gap_hours  integer not null default 20 check (canary_min_gap_hours >= 1),
  canary_started_at     timestamptz,
  -- {"canary_failed": "<when>", "key_drained": …, "failure_rate": …, "unsettled": …}
  last_alert_at         jsonb not null default '{}'::jsonb check (jsonb_typeof(last_alert_at) = 'object'),
  updated_at            timestamptz not null default now()
);

insert into public.ai_ops_config (id) values (true) on conflict (id) do nothing;

create table if not exists public.ai_canary_runs (
  id       bigint generated always as identity primary key,
  ran_at   timestamptz not null default now(),
  ok       boolean not null,
  failed   integer not null default 0 check (failed >= 0),
  -- [{model, kind, status, latency_ms}] — kinds and numbers only, never an error message.
  results  jsonb not null check (jsonb_typeof(results) = 'array')
);

create index if not exists ai_canary_runs_ran_idx on public.ai_canary_runs (ran_at desc);

alter table public.ai_ops_config  enable row level security;
alter table public.ai_canary_runs enable row level security;

revoke all on table public.ai_ops_config, public.ai_canary_runs from anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 3. SHARED RULES — one definition of "failed", one secret check
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.ai_spend_failed(p_outcome text, p_uncharged boolean)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
           when p_outcome is not null then p_outcome not in ('ok', 'cancelled', 'guarded')
           else coalesce(p_uncharged, false)
         end;
$$;

create or replace function public.ai_ops_secret_ok(p_secret text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_secret text;
begin
  select c.cron_secret into v_secret from public.ai_ops_config c where c.id;
  return p_secret is not null and v_secret is not null and length(p_secret) >= 32 and p_secret = v_secret;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 4. THE ALERT — what is wrong right now (state), and who is told (tick)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.ai_health_alert_state()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_cfg        public.ai_ops_config%rowtype;
  v_run        public.ai_canary_runs%rowtype;
  v_have_run   boolean;
  v_bad        text;
  v_drained    text;
  v_calls      int;
  v_fail       int;
  v_streak     int;
  v_streak_bad int;
  v_unsettled  int;
  v_oldest     timestamptz;
  v_out        jsonb := '[]'::jsonb;
begin
  select * into v_cfg from public.ai_ops_config c where c.id;
  if not found then
    return v_out;
  end if;

  -- ① The latest canary, if it ran in the last 26 h, failed for at least one model.
  select * into v_run from public.ai_canary_runs r
   where r.ran_at > now() - interval '26 hours'
   order by r.ran_at desc
   limit 1;
  v_have_run := found;
  if v_have_run and not v_run.ok then
    select string_agg((e ->> 'model') || ' ' || (e ->> 'kind'), ', ') into v_bad
      from jsonb_array_elements(v_run.results) e
     where e ->> 'kind' <> 'ok';
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'kind', 'canary_failed',
      'line', 'Canary failed: ' || coalesce(v_bad, 'unknown')));
  end if;

  -- ② The key looks drained: the canary was told "credit balance too low" / refused the key, OR the newest
  --    N app calls in the last 2 h ALL came back as an upstream error, with no answer in between.
  if v_have_run then
    select string_agg(e ->> 'model', ', ') into v_drained
      from jsonb_array_elements(v_run.results) e
     where e ->> 'kind' in ('key_drained', 'auth_error');
  end if;
  select count(*), count(*) filter (where x.upstream) into v_streak, v_streak_bad
    from (select coalesce(s.outcome, case when s.uncharged then 'upstream_error' end) = 'upstream_error' as upstream
            from public.coach_ai_spend s
           where s.occurred_at > now() - interval '2 hours'
           order by s.occurred_at desc
           limit v_cfg.drain_streak) x;
  if v_drained is not null then
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'kind', 'key_drained',
      'line', 'The Anthropic key looks drained or refused (canary: ' || v_drained || ')'));
  elsif v_streak >= v_cfg.drain_streak and v_streak_bad = v_streak then
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'kind', 'key_drained',
      'line', 'The last ' || v_streak || ' AI calls all failed at Anthropic — the key may be drained'));
  end if;

  -- ③ More than fail_rate of the last 24 h failed — only once there are fail_min_calls calls to judge.
  select count(*), count(*) filter (where public.ai_spend_failed(s.outcome, s.uncharged)) into v_calls, v_fail
    from public.coach_ai_spend s
   where s.occurred_at > now() - interval '24 hours';
  if v_calls >= v_cfg.fail_min_calls and v_fail::numeric / v_calls > v_cfg.fail_rate then
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'kind', 'failure_rate',
      'line', round(100.0 * v_fail / v_calls, 1) || '% of ' || v_calls || ' AI calls failed in 24 h'));
  end if;

  -- ④ A reservation nobody settled — the function was killed between the model and the meter.
  select count(*), min(r.reserved_at) into v_unsettled, v_oldest
    from public.coach_ai_reservation r
   where r.settled_at is null
     and r.reserved_at < now() - make_interval(mins => v_cfg.unsettled_minutes);
  if v_unsettled > 0 then
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'kind', 'unsettled',
      'line', v_unsettled || ' AI reservation' || case when v_unsettled = 1 then '' else 's' end
              || ' unsettled for over ' || v_cfg.unsettled_minutes || ' min'));
  end if;

  return v_out;
end;
$$;

create or replace function public.ai_health_alert_tick()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cfg   public.ai_ops_config%rowtype;
  v_now   timestamptz := now();
  v_due   jsonb;
  v_body  text;
  v_sent  int := 0;
begin
  -- Locked: the canary's own report and the hourly tick can never both decide "not sent yet" and both send.
  select * into v_cfg from public.ai_ops_config c where c.id for update;
  if not found then
    return 0;
  end if;

  select coalesce(jsonb_agg(a order by ord), '[]'::jsonb) into v_due
    from jsonb_array_elements(public.ai_health_alert_state()) with ordinality as x(a, ord)
   where coalesce((v_cfg.last_alert_at ->> (a ->> 'kind'))::timestamptz, '-infinity'::timestamptz)
         < v_now - make_interval(hours => v_cfg.alert_cooldown_hours);
  if jsonb_array_length(v_due) = 0 then
    return 0;
  end if;

  select string_agg(a ->> 'line', ' · ' order by ord) into v_body
    from jsonb_array_elements(v_due) with ordinality as x(a, ord);

  if to_regclass('public.push_outbox') is null or to_regclass('public.push_tokens') is null then
    return 0;
  end if;

  -- The 0167 feedback push's shape: one row per operator with a live device (a row nothing can deliver sits
  -- PENDING and ends FAILED). `event_at` is this tick's instant, so 0120's push_outbox_event_uk holds.
  insert into public.push_outbox (user_id, kind, event_at, title, body, route)
  select a.user_id, 'ai_alert', v_now, 'AI alert', left(v_body, 240), '/admin-ai'
    from public.app_admins a
   where exists (select 1 from public.push_tokens t
                  where t.user_id = a.user_id and t.disabled_at is null)
  on conflict do nothing;
  get diagnostics v_sent = row_count;

  -- Stamped only when somebody can be told: with no operator device, the alert waits for the next tick.
  if v_sent > 0 then
    update public.ai_ops_config c
       set last_alert_at = c.last_alert_at
                           || (select jsonb_object_agg(a ->> 'kind', to_jsonb(v_now)) from jsonb_array_elements(v_due) a),
           updated_at    = v_now
     where c.id;
  end if;

  return v_sent;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 5. THE CANARY — claim, record, and the daily tick that starts it
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.ai_canary_begin(p_secret text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ok boolean;
begin
  if not public.ai_ops_secret_ok(p_secret) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  -- One run per canary_min_gap_hours, claimed atomically BEFORE the function spends anything.
  update public.ai_ops_config c
     set canary_started_at = now(),
         updated_at        = now()
   where c.id
     and (c.canary_started_at is null
          or c.canary_started_at < now() - make_interval(hours => c.canary_min_gap_hours))
  returning true into v_ok;

  return coalesce(v_ok, false);
end;
$$;

create or replace function public.ai_canary_record(p_secret text, p_results jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_clean  jsonb;
  v_failed int;
  v_id     bigint;
begin
  if not public.ai_ops_secret_ok(p_secret) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_results is null or jsonb_typeof(p_results) <> 'array' or jsonb_array_length(p_results) not between 1 and 10 then
    raise exception 'ai_canary_record: results must be an array of 1 to 10 entries' using errcode = '22023';
  end if;

  -- Only what the page reads, each one bounded. An unknown kind is stored as 'other', never as 'ok'.
  select jsonb_agg(jsonb_build_object(
           'model',      left(regexp_replace(coalesce(e ->> 'model', ''), '[^a-z0-9.-]', '', 'g'), 64),
           'kind',       case when e ->> 'kind' in ('ok', 'rate_limited', 'overloaded', 'server_error', 'auth_error',
                                                    'key_drained', 'timeout', 'model_unavailable', 'bad_request',
                                                    'network_error')
                              then e ->> 'kind' else 'other' end,
           'status',     case when (e ->> 'status') ~ '^[0-9]{1,3}$' then (e ->> 'status')::int end,
           'latency_ms', case when (e ->> 'latency_ms') ~ '^[0-9]{1,6}$' then least((e ->> 'latency_ms')::int, 600000) end
         ) order by ord)
    into v_clean
    from jsonb_array_elements(p_results) with ordinality as x(e, ord);

  select count(*) into v_failed from jsonb_array_elements(v_clean) e where e ->> 'kind' <> 'ok';

  insert into public.ai_canary_runs (ok, failed, results)
  values (v_failed = 0, v_failed, v_clean)
  returning id into v_id;

  -- Told now, not at the next hourly tick. A broken alert must never lose the run it is about.
  begin
    perform public.ai_health_alert_tick();
  exception when others then
    raise warning 'ai_canary_record: the alert check failed (%)', sqlerrm;
  end;

  return jsonb_build_object('run', v_id, 'ok', v_failed = 0, 'failed', v_failed);
end;
$$;

create or replace function public.ai_canary_tick()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cfg public.ai_ops_config%rowtype;
begin
  select * into v_cfg from public.ai_ops_config c where c.id;
  -- ⚠ OFF UNTIL THE PO TURNS IT ON. No URL → no request → no model call → nothing spent.
  if v_cfg.canary_url is null then
    return;
  end if;
  perform net.http_post(
    url                  := v_cfg.canary_url,
    headers              := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_cfg.cron_secret),
    body                 := jsonb_build_object('action', 'canary'),
    timeout_milliseconds := 60000
  );
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 6. THE AI HEALTH READ — /admin-ai
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.admin_ai_health(p_days integer default 7, p_tz text default 'UTC')
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_days  int  := least(greatest(coalesce(p_days, 7), 1), 90);
  v_tz    text := coalesce(nullif(p_tz, ''), 'UTC');
  v_since timestamptz;
  v_cfg   public.ai_ops_config%rowtype;
  v_out   jsonb;
begin
  perform public.admin_guard();

  -- An unknown zone would raise inside every bucket below; the dashboard's clock falls back to UTC instead.
  if not exists (select 1 from pg_catalog.pg_timezone_names z where z.name = v_tz) then
    v_tz := 'UTC';
  end if;
  -- The first local midnight of the window, so the oldest day is a whole day like the others.
  v_since := (((now() at time zone v_tz)::date - (v_days - 1))::timestamp) at time zone v_tz;

  select * into v_cfg from public.ai_ops_config c where c.id;

  with s as (
    select x.fn,
           x.action,
           coalesce(x.fn, 'legacy:' || x.action)                  as grp,
           x.credits,
           x.cost_usd,
           x.latency_ms,
           (x.reservation_id is not null and x.uncharged)         as refunded,
           public.ai_spend_failed(x.outcome, x.uncharged)         as failed,
           coalesce(x.outcome = 'cancelled', false)               as cancelled,
           (x.occurred_at at time zone v_tz)::date                as d
      from public.coach_ai_spend x
     where x.occurred_at >= v_since
  ),
  f as (
    select fb.feature, fb.rating, (fb.created_at at time zone v_tz)::date as d
      from public.ai_feedback fb
     where fb.created_at >= v_since
  )
  select jsonb_build_object(
    'days',         v_days,
    'tz',           v_tz,
    'since',        v_since,
    'generated_at', now(),
    'totals', jsonb_build_object(
      'calls',        (select count(*) from s),
      'failures',     (select count(*) from s where s.failed),
      'cancelled',    (select count(*) from s where s.cancelled),
      'refunds',      (select count(*) from s where s.refunded),
      'credits',      coalesce((select sum(s.credits) from s where not s.refunded), 0),
      'cost_usd',     coalesce((select round(sum(s.cost_usd), 4) from s), 0),
      'legacy_calls', (select count(*) from s where s.fn is null)),
    'last_24h', (select jsonb_build_object(
                          'calls',    count(*),
                          'failures', count(*) filter (where public.ai_spend_failed(y.outcome, y.uncharged)))
                   from public.coach_ai_spend y
                  where y.occurred_at > now() - interval '24 hours'),
    'by_fn', coalesce((select jsonb_agg(r order by r.calls desc, r.grp) from (
        select s.grp,
               max(s.fn)                                                   as fn,
               case when max(s.fn) is null then max(s.action) end          as action,
               count(*)                                                    as calls,
               count(*) filter (where s.failed)                            as failures,
               count(*) filter (where s.cancelled)                         as cancelled,
               count(*) filter (where s.refunded)                          as refunds,
               coalesce(sum(s.credits) filter (where not s.refunded), 0)   as credits,
               round(coalesce(sum(s.cost_usd), 0), 4)                      as cost_usd,
               count(s.latency_ms)                                         as timed,
               round(percentile_cont(0.5)  within group (order by s.latency_ms))::int as p50_ms,
               round(percentile_cont(0.95) within group (order by s.latency_ms))::int as p95_ms
          from s
         group by s.grp) r), '[]'::jsonb),
    'by_fn_day', coalesce((select jsonb_agg(r order by r.d desc, r.calls desc, r.grp) from (
        select s.d,
               s.grp,
               max(s.fn)                                                   as fn,
               case when max(s.fn) is null then max(s.action) end          as action,
               count(*)                                                    as calls,
               count(*) filter (where s.failed)                            as failures,
               count(*) filter (where s.cancelled)                         as cancelled,
               count(*) filter (where s.refunded)                          as refunds,
               coalesce(sum(s.credits) filter (where not s.refunded), 0)   as credits,
               round(coalesce(sum(s.cost_usd), 0), 4)                      as cost_usd,
               count(s.latency_ms)                                         as timed,
               round(percentile_cont(0.5)  within group (order by s.latency_ms))::int as p50_ms,
               round(percentile_cont(0.95) within group (order by s.latency_ms))::int as p95_ms
          from s
         group by s.d, s.grp) r), '[]'::jsonb),
    'feedback', coalesce((select jsonb_agg(r order by r.d desc, r.feature) from (
        select f.d, f.feature,
               count(*) filter (where f.rating = 1)  as up,
               count(*) filter (where f.rating = -1) as down
          from f
         group by f.d, f.feature) r), '[]'::jsonb),
    'feedback_totals', coalesce((select jsonb_agg(r order by r.feature) from (
        select f.feature,
               count(*) filter (where f.rating = 1)  as up,
               count(*) filter (where f.rating = -1) as down
          from f
         group by f.feature) r), '[]'::jsonb),
    'canary', jsonb_build_object(
      'configured', coalesce(v_cfg.canary_url is not null, false),
      'last',       (select jsonb_build_object('ran_at', r.ran_at, 'ok', r.ok, 'failed', r.failed, 'results', r.results)
                       from public.ai_canary_runs r order by r.ran_at desc limit 1),
      'last_ok_at', (select max(r.ran_at) from public.ai_canary_runs r where r.ok),
      'recent',     coalesce((select jsonb_agg(jsonb_build_object('ran_at', r.ran_at, 'ok', r.ok, 'failed', r.failed)
                                               order by r.ran_at desc)
                                from (select * from public.ai_canary_runs order by ran_at desc limit 14) r), '[]'::jsonb)),
    'unsettled', (select jsonb_build_object('count', count(*), 'oldest_at', min(r.reserved_at))
                    from public.coach_ai_reservation r
                   where r.settled_at is null
                     and r.reserved_at < now() - make_interval(mins => coalesce(v_cfg.unsettled_minutes, 30))),
    'alerts', jsonb_build_object(
      'tripped',            public.ai_health_alert_state(),
      'last_sent',          coalesce(v_cfg.last_alert_at, '{}'::jsonb),
      'admins_with_device', (select count(*) from public.app_admins a
                              where exists (select 1 from public.push_tokens t
                                             where t.user_id = a.user_id and t.disabled_at is null))),
    'thresholds', jsonb_build_object(
      'fail_rate',            v_cfg.fail_rate,
      'fail_min_calls',       v_cfg.fail_min_calls,
      'drain_streak',         v_cfg.drain_streak,
      'unsettled_minutes',    v_cfg.unsettled_minutes,
      'alert_cooldown_hours', v_cfg.alert_cooldown_hours,
      'canary_min_gap_hours', v_cfg.canary_min_gap_hours)
  ) into v_out;

  return v_out;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 7. THE JOBS — hourly alert (free), daily canary (off until canary_url is set)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

select cron.unschedule('forge-ai-health-alert') where exists (select 1 from cron.job where jobname = 'forge-ai-health-alert');
select cron.schedule('forge-ai-health-alert', '25 * * * *', $cron$ select public.ai_health_alert_tick(); $cron$);

select cron.unschedule('forge-ai-canary') where exists (select 1 from cron.job where jobname = 'forge-ai-canary');
select cron.schedule('forge-ai-canary', '40 15 * * *', $cron$ select public.ai_canary_tick(); $cron$);


-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 8. GRANTS — Supabase grants EXECUTE on every new function to anon AND authenticated DIRECTLY, so
--    `from public` alone would leave them callable. The app calls exactly one: admin_ai_health (its own
--    admin_guard refuses anybody else). The canary's two go to service_role, which the function holds.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

revoke all on function public.ai_spend_failed(text, boolean)   from public, anon, authenticated;
revoke all on function public.ai_ops_secret_ok(text)           from public, anon, authenticated;
revoke all on function public.ai_health_alert_state()          from public, anon, authenticated;
revoke all on function public.ai_health_alert_tick()           from public, anon, authenticated;
revoke all on function public.ai_canary_tick()                 from public, anon, authenticated;
revoke all on function public.ai_canary_begin(text)            from public, anon, authenticated;
revoke all on function public.ai_canary_record(text, jsonb)    from public, anon, authenticated;
grant execute on function public.ai_canary_begin(text)         to service_role;
grant execute on function public.ai_canary_record(text, jsonb) to service_role;
revoke all on function public.admin_ai_health(integer, text)   from public, anon;
grant execute on function public.admin_ai_health(integer, text) to authenticated;


-- ───────────────────────────────────────────────────────────────────────────────────────────────────────
-- §2 — THE ASSERTION (raises if §1 did not land)
-- ───────────────────────────────────────────────────────────────────────────────────────────────────────

do $$
declare
  v_t    text;
  v_sig  text;
  v_left text;
  v_n    int;
begin
  -- Tables, each with row-level security on.
  foreach v_t in array array['ai_feedback', 'ai_ops_config', 'ai_canary_runs'] loop
    if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                    where n.nspname = 'public' and c.relname = v_t and c.relrowsecurity) then
      raise exception '0269: public.% is missing or has row-level security OFF', v_t;
    end if;
  end loop;

  -- ai_feedback: its three own-row policies, one vote per output, the feature list.
  select count(*) into v_n from pg_policies
   where schemaname = 'public' and tablename = 'ai_feedback'
     and policyname in ('ai_feedback_select_own', 'ai_feedback_insert_own', 'ai_feedback_update_own');
  if v_n <> 3 then
    raise exception '0269: ai_feedback has % of its 3 policies', v_n;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ai_feedback_one_vote' and conrelid = 'public.ai_feedback'::regclass) then
    raise exception '0269: ai_feedback_one_vote (one vote per athlete per output) is missing';
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ai_feedback_feature_check' and conrelid = 'public.ai_feedback'::regclass) then
    raise exception '0269: ai_feedback_feature_check is missing';
  end if;

  -- The client roles: nothing on the ops tables, no delete on the votes, nothing for anon anywhere.
  select string_agg(grantee || ':' || table_name || ':' || privilege_type, ', ') into v_left
    from information_schema.role_table_grants
   where table_schema = 'public'
     and ((table_name in ('ai_ops_config', 'ai_canary_runs') and grantee in ('anon', 'authenticated'))
          or (table_name = 'ai_feedback' and grantee = 'anon')
          or (table_name = 'ai_feedback' and grantee = 'authenticated' and privilege_type in ('DELETE', 'TRUNCATE')));
  if v_left is not null then
    raise exception '0269: a client role holds a privilege it must not: %', v_left;
  end if;
  if not has_table_privilege('authenticated', 'public.ai_feedback', 'select') then
    raise exception '0269: authenticated cannot read its own ai_feedback rows';
  end if;

  if not exists (select 1 from public.ai_ops_config where id) then
    raise exception '0269: the ai_ops_config row is missing';
  end if;

  -- Functions: all present; anon calls none; authenticated calls only admin_ai_health; the canary's two are
  -- service_role's. (Supabase grants new functions to anon + authenticated DIRECTLY — this is the check.)
  foreach v_sig in array array[
    'public.ai_spend_failed(text, boolean)', 'public.ai_ops_secret_ok(text)', 'public.ai_health_alert_state()',
    'public.ai_health_alert_tick()', 'public.ai_canary_tick()', 'public.ai_canary_begin(text)',
    'public.ai_canary_record(text, jsonb)', 'public.admin_ai_health(integer, text)'] loop
    if to_regprocedure(v_sig) is null then
      raise exception '0269: % is missing', v_sig;
    end if;
    if has_function_privilege('anon', v_sig, 'execute') then
      raise exception '0269: anon can call %', v_sig;
    end if;
    if has_function_privilege('authenticated', v_sig, 'execute') <> (v_sig = 'public.admin_ai_health(integer, text)') then
      raise exception '0269: authenticated EXECUTE on % is wrong', v_sig;
    end if;
  end loop;
  if not has_function_privilege('service_role', 'public.ai_canary_begin(text)', 'execute')
     or not has_function_privilege('service_role', 'public.ai_canary_record(text, jsonb)', 'execute') then
    raise exception '0269: service_role cannot call the canary''s claim / report';
  end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and not p.prosecdef
                and p.proname in ('ai_ops_secret_ok', 'ai_health_alert_state', 'ai_health_alert_tick', 'ai_canary_tick',
                                  'ai_canary_begin', 'ai_canary_record', 'admin_ai_health')) then
    raise exception '0269: a function that reads the server-only tables is not SECURITY DEFINER';
  end if;

  -- The two jobs.
  if not exists (select 1 from cron.job where jobname = 'forge-ai-health-alert' and schedule = '25 * * * *') then
    raise exception '0269: cron job forge-ai-health-alert is missing';
  end if;
  if not exists (select 1 from cron.job where jobname = 'forge-ai-canary' and schedule = '40 15 * * *') then
    raise exception '0269: cron job forge-ai-canary is missing';
  end if;
end $$;


-- ───────────────────────────────────────────────────────────────────────────────────────────────────────
-- §3 — THE REPORT (read-only)
-- ───────────────────────────────────────────────────────────────────────────────────────────────────────

select
  (select string_agg(c.relrowsecurity::text, ',' order by array_position(array['ai_feedback', 'ai_ops_config', 'ai_canary_runs'], c.relname::text))
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in ('ai_feedback', 'ai_ops_config', 'ai_canary_runs'))       as rls_on,
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'ai_feedback')             as feedback_policies,
  (select count(*) from public.ai_ops_config)                                                            as config_rows,
  (select canary_url is not null from public.ai_ops_config where id)                                     as canary_on,
  (select length(cron_secret) from public.ai_ops_config where id)                                        as secret_chars,
  (select string_agg(jobname || ' ' || schedule, ' | ' order by jobname) from cron.job
    where jobname in ('forge-ai-canary', 'forge-ai-health-alert'))                                       as jobs,
  (select count(*) from public.ai_canary_runs)                                                           as canary_runs,
  (select count(*) from public.ai_feedback)                                                              as feedback_rows,
  coalesce((select string_agg(p.proname, ', ' order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and (p.proname like 'ai\_%' or p.proname = 'admin_ai_health')
               and has_function_privilege('anon', p.oid, 'execute')), '(none)')                          as anon_can_call,
  coalesce((select string_agg(p.proname, ', ' order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and (p.proname like 'ai\_%' or p.proname = 'admin_ai_health')
               and has_function_privilege('authenticated', p.oid, 'execute')), '(none)')                 as authenticated_can_call,
  coalesce((select string_agg(p.proname, ', ' order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname in ('ai_canary_begin', 'ai_canary_record')
               and has_function_privilege('service_role', p.oid, 'execute')), '(none)')                  as service_role_can_call,
  (select count(*) from public.app_admins a
    where exists (select 1 from public.push_tokens t where t.user_id = a.user_id and t.disabled_at is null)) as admins_with_device,
  (select count(*) from public.coach_ai_reservation r
    where r.settled_at is null and r.reserved_at < now() - interval '30 minutes')                        as unsettled_now,
  public.ai_health_alert_state()                                                                         as alerts_now,
  (select count(*) from public.coach_ai_spend where fn is not null)                                      as spend_rows_with_fn;
