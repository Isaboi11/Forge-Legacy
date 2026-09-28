-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- 0236 — THE BUSINESS CRM
--
-- Governed by `Docs/Admin-Analytics-Amendment-002-Business-CRM.md` (AA-D12…AA-D20, PO 2026-09-28).
-- Turns the Creator Dashboard into the operator's CRM: revenue, tiers, AI spend, conversion and churn,
-- a bug board, contacts, business documents and App Store Connect numbers.
--
-- ══ WHAT IT ADDS ══
--
--   Tables (all RLS ON, ZERO policies — AA-D6's pattern; only the admin_* definer functions read them):
--     ops_bugs        — the bug board: QA-report items + bugs filed by hand (AA-D19)
--     crm_contacts    — testers, trainers, business contacts, linked app users (AA-D15)
--     crm_activity    — notes, calls, emails, meetings, follow-ups per contact
--     ops_documents   — metadata for files in the private `ops-docs` bucket, or links elsewhere (AA-D16)
--     asc_daily / asc_reviews / asc_sync_log — App Store Connect, written ONLY by `asc-sync` (AA-D17)
--
--   Storage: bucket `ops-docs`, PRIVATE, 50 MB per file, read/write for app admins only.
--
--   Functions (every one opens with `perform public.admin_guard()` — AA-D5):
--     admin_revenue · admin_tiers · admin_ai_usage · admin_waitlist · admin_appstore
--     admin_bugs · admin_bug_save · admin_bug_delete · admin_bug_track
--     admin_user_search · admin_user_card · admin_billing_list            ← person-level (AA-D12)
--     admin_contacts · admin_contact_save · admin_contact_delete
--     admin_contact_activity · admin_activity_log · admin_activity_done
--     admin_documents · admin_document_save · admin_document_delete
--
-- ══ ⚠ THE PERSON-LEVEL CEILING (AA-D12 / AA-D13) ══
--
--   admin_user_card may return account, billing, AI METERING, support and business facts. It may NEVER
--   join a training table, a photo table, nutrition, health, routes, squads, friends, presence, or
--   auth.users. The roundtrip script asserts the payload carries none of those keys (AA-D20).
--
-- ══ ⚠ REVENUE IS GROSS, USD, FROM REVENUECAT'S `price` (AA-D18) ══
--
--   `store_events.payload ->> 'price'` is RevenueCat's USD price of the transaction: 0 for a trial,
--   negative for a refund, null when unknown. Summing it is the revenue. Sandbox (TestFlight / App
--   Review) events are excluded unless p_include_sandbox — they are free and would inflate everything.
--
-- Safe to run twice. Pasted as a whole via `supabase/apply/pending-0236.sql`.
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 1. TABLES
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.ops_bugs (
  id          uuid primary key default gen_random_uuid(),
  -- 'qa' = imported from a QA report; 'manual' = filed by the operator (including "Track this" copies
  -- of a feedback row or a crash group, which keep a back-reference in `ref`).
  source      text not null default 'manual' check (source in ('qa', 'manual')),
  report      text,
  ref         text,
  title       text not null check (length(btrim(title)) between 1 and 300),
  severity    text not null default 'medium' check (severity in ('critical', 'high', 'medium', 'low')),
  area        text,
  round       int,
  detail      text check (detail is null or length(detail) <= 8000),
  status      text not null default 'open' check (status in ('open', 'in_progress', 'fixed', 'wont_fix')),
  note        text check (note is null or length(note) <= 4000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  closed_at   timestamptz
);

do $$
begin
  -- Per REPORT: the next QA report will reuse "F1", and must not be silently skipped as a duplicate.
  if not exists (select 1 from pg_constraint where conname = 'ops_bugs_source_report_ref_key') then
    alter table public.ops_bugs add constraint ops_bugs_source_report_ref_key unique (source, report, ref);
  end if;
end $$;

alter table public.ops_bugs enable row level security;

create table if not exists public.crm_contacts (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null default 'business'
                  check (kind in ('tester', 'trainer', 'business', 'user', 'other')),
  name            text check (name is null or length(name) <= 200),
  email           text check (email is null or length(email) <= 254),
  phone           text check (phone is null or length(phone) <= 40),
  company         text check (company is null or length(company) <= 200),
  role            text check (role is null or length(role) <= 200),
  stage           text not null default 'lead'
                  check (stage in ('lead', 'contacted', 'in_talks', 'active', 'inactive')),
  tags            text[] not null default '{}',
  notes           text check (notes is null or length(notes) <= 8000),
  -- An app account this contact IS. Nulled, never cascaded, when the account is deleted: the business
  -- relationship (a contract, a trainer conversation) outlives the login.
  athlete_id      uuid references public.profiles (id) on delete set null,
  -- Where the row came from, so the auto-sync can find its own rows again and never duplicate them.
  source          text not null default 'manual' check (source in ('manual', 'testflight_form', 'trainer_seat')),
  source_ref      text,
  next_follow_up  date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists crm_contacts_source_ref_idx
  on public.crm_contacts (source, source_ref) where source_ref is not null;

alter table public.crm_contacts enable row level security;

create table if not exists public.crm_activity (
  id          uuid primary key default gen_random_uuid(),
  contact_id  uuid not null references public.crm_contacts (id) on delete cascade,
  kind        text not null default 'note' check (kind in ('note', 'call', 'email', 'meeting', 'task')),
  body        text not null check (length(btrim(body)) between 1 and 4000),
  due_on      date,
  done_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists crm_activity_contact_idx on public.crm_activity (contact_id, created_at desc);

alter table public.crm_activity enable row level security;

create table if not exists public.ops_documents (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (length(btrim(title)) between 1 and 300),
  category      text not null default 'other'
                check (category in ('legal', 'finance', 'business', 'marketing', 'spec', 'other')),
  -- Exactly one of the two: a file in the private bucket, or a link to where the document lives.
  storage_path  text,
  url           text check (url is null or url ~* '^https?://'),
  mime          text,
  size_bytes    bigint,
  tags          text[] not null default '{}',
  notes         text check (notes is null or length(notes) <= 4000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ops_documents_one_target') then
    alter table public.ops_documents add constraint ops_documents_one_target
      check ((storage_path is null) <> (url is null));
  end if;
end $$;

alter table public.ops_documents enable row level security;

-- App Store Connect (AA-D17). Written only by the `asc-sync` Edge Function with the service role.
create table if not exists public.asc_daily (
  day         date not null,
  metric      text not null,          -- 'downloads' | 'redownloads' | 'updates' | 'iap' | 'proceeds_usd'
  dim         text not null default '', -- '' = total; otherwise a country code
  value       numeric not null default 0,
  synced_at   timestamptz not null default now(),
  primary key (day, metric, dim)
);
alter table public.asc_daily enable row level security;

create table if not exists public.asc_reviews (
  id          text primary key,
  rating      int check (rating between 1 and 5),
  title       text,
  body        text,
  nickname    text,
  territory   text,
  created_at  timestamptz,
  synced_at   timestamptz not null default now()
);
alter table public.asc_reviews enable row level security;

create table if not exists public.asc_sync_log (
  id            bigint generated always as identity primary key,
  ran_at        timestamptz not null default now(),
  ok            boolean not null,
  message       text,
  -- The public iTunes rating (no key needed), captured on each run because Apple offers no history.
  rating_avg    numeric,
  rating_count  int
);
alter table public.asc_sync_log enable row level security;

comment on table public.ops_bugs      is 'Operator bug board (0236, AA-D19). RLS on, no policies.';
comment on table public.crm_contacts  is 'Operator CRM contacts (0236, AA-D15). RLS on, no policies.';
comment on table public.crm_activity  is 'Operator CRM notes/tasks per contact (0236). RLS on, no policies.';
comment on table public.ops_documents is 'Business document metadata; files in private bucket ops-docs (0236, AA-D16). RLS on, no policies.';
comment on table public.asc_daily     is 'App Store Connect daily sales units, written by asc-sync (0236, AA-D17). RLS on, no policies.';
comment on table public.asc_reviews   is 'App Store customer reviews, written by asc-sync (0236, AA-D17). RLS on, no policies.';
comment on table public.asc_sync_log  is 'One row per asc-sync run, with the public rating at that moment (0236). RLS on, no policies.';

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 2. THE PRIVATE DOCUMENTS BUCKET (AA-D16)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit)
values ('ops-docs', 'ops-docs', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists "ops_docs_admin_select" on storage.objects;
create policy "ops_docs_admin_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'ops-docs' and public.is_app_admin());

drop policy if exists "ops_docs_admin_insert" on storage.objects;
create policy "ops_docs_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ops-docs' and public.is_app_admin());

drop policy if exists "ops_docs_admin_update" on storage.objects;
create policy "ops_docs_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'ops-docs' and public.is_app_admin());

drop policy if exists "ops_docs_admin_delete" on storage.objects;
create policy "ops_docs_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'ops-docs' and public.is_app_admin());

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 3. SHARED HELPERS (not callable by clients)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

/* A product's list price per month, USD, used only when no real price has been seen for it yet.
   Monetization amendment: Premium $14.99/mo · $119.99/yr; Premium AI $19.99/mo · $169.99/yr. */
create or replace function public.crm_list_price_monthly(p_product text)
returns numeric
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when p_product ~ 'premium_ai' and p_product like '%annual%' then round(169.99 / 12.0, 2)
    when p_product ~ 'premium_ai'                                then 19.99
    when p_product like '%annual%'                               then round(119.99 / 12.0, 2)
    when p_product ~ '^(earlybird_)?premium_'                    then 14.99
    else 0
  end;
$$;

/* The environment of an athlete's newest event for a product ('PRODUCTION' when unknown). */
create or replace function public.crm_sub_env(p_athlete uuid, p_product text)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((
    select e.payload ->> 'environment'
      from public.store_events e
     where e.athlete_id = p_athlete and e.product_id = p_product
     order by e.received_at desc
     limit 1), 'PRODUCTION');
$$;

revoke all on function public.crm_list_price_monthly(text) from public;
revoke all on function public.crm_sub_env(uuid, text) from public;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 4. REVENUE, CONVERSION AND CHURN (AA-D18)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.admin_revenue(
  p_days int default 30,
  p_tz text default 'UTC',
  p_include_sandbox boolean default false
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_days   int  := least(greatest(coalesce(p_days, 30), 1), 730);
  v_tz     text := coalesce(nullif(p_tz, ''), 'UTC');
  v_since  timestamptz := now() - make_interval(days => v_days);
  v_prev   timestamptz := now() - make_interval(days => v_days * 2);
  v_out    jsonb;
begin
  perform public.admin_guard();

  with ev as (
    select e.event_type,
           e.athlete_id,
           e.product_id,
           e.received_at,
           e.payload ->> 'period_type' as period_type,
           coalesce(e.payload ->> 'environment', 'PRODUCTION') as env,
           nullif(e.payload ->> 'price', '')::numeric as price,
           coalesce((e.payload ->> 'is_trial_conversion')::boolean, false) as trial_conv
      from public.store_events e
     where p_include_sandbox or coalesce(e.payload ->> 'environment', 'PRODUCTION') = 'PRODUCTION'
  ),
  subs as (
    select s.athlete_id, s.product_id, s.period_type, s.expires_at,
           public.crm_sub_env(s.athlete_id, s.product_id) as env
      from public.store_subscriptions s
     where s.expires_at > now()
  ),
  live as (
    select * from subs where p_include_sandbox or env = 'PRODUCTION'
  ),
  paying as (
    select l.*,
           coalesce(
             (select case when l.product_id like '%annual%' then round(e.price / 12.0, 2) else e.price end
                from ev e
               where e.product_id = l.product_id and e.price > 0
               order by e.received_at desc limit 1),
             public.crm_list_price_monthly(l.product_id)) as monthly
      from live l
     where l.period_type in ('NORMAL', 'INTRO', 'PREPAID')
  ),
  series as (
    select d::date as d,
           coalesce((select sum(e.price) from ev e
                      where (e.received_at at time zone v_tz)::date = d::date and e.price is not null), 0) as gross
      from generate_series((now() at time zone v_tz)::date - (v_days - 1), (now() at time zone v_tz)::date, interval '1 day') d
  ),
  churned as (
    select distinct e.athlete_id
      from ev e
     where e.event_type = 'EXPIRATION' and e.received_at >= v_since
       and coalesce(e.period_type, 'NORMAL') <> 'TRIAL'
       and e.athlete_id is not null
       and not exists (select 1 from paying p where p.athlete_id = e.athlete_id)
  ),
  paywall as (
    select distinct a.user_id
      from public.app_events a
     where a.kind = 'paywall_shown' and a.occurred_at >= v_since
  )
  select jsonb_build_object(
    'days', v_days,
    'include_sandbox', p_include_sandbox,
    'gross',       coalesce((select sum(price) from ev where received_at >= v_since and price is not null), 0),
    'gross_prev',  coalesce((select sum(price) from ev where received_at >= v_prev and received_at < v_since and price is not null), 0),
    'gross_all',   coalesce((select sum(price) from ev where price is not null), 0),
    'refunds',     coalesce((select -sum(price) from ev where received_at >= v_since and price < 0), 0),
    'series',      coalesce((select jsonb_agg(jsonb_build_object('d', s.d, 'gross', s.gross) order by s.d) from series s), '[]'::jsonb),
    'by_product',  coalesce((select jsonb_agg(x order by x.gross desc) from (
                      select product_id as product, sum(price) as gross, count(*) as events
                        from ev where received_at >= v_since and price is not null and price <> 0
                       group by product_id) x), '[]'::jsonb),
    'mrr',         coalesce((select round(sum(monthly), 2) from paying), 0),
    'paying', jsonb_build_object(
       'total',      (select count(distinct athlete_id) from paying),
       'premium_ai', (select count(distinct athlete_id) from paying where product_id ~ 'premium_ai'),
       'premium',    (select count(distinct athlete_id) from paying where product_id !~ 'premium_ai'),
       'annual',     (select count(*) from paying where product_id like '%annual%'),
       'monthly',    (select count(*) from paying where product_id not like '%annual%')),
    'trials_active',     (select count(distinct athlete_id) from live where period_type = 'TRIAL'),
    'trial_starts',      (select count(*) from ev where event_type = 'INITIAL_PURCHASE' and period_type = 'TRIAL' and received_at >= v_since),
    'trial_conversions', (select count(*) from ev where trial_conv and received_at >= v_since),
    'new_paid',          (select count(distinct athlete_id) from ev
                           where received_at >= v_since
                             and ((price > 0 and event_type in ('INITIAL_PURCHASE', 'NON_RENEWING_PURCHASE'))
                                  or trial_conv)),
    'churned',           (select count(*) from churned),
    'paywall_viewers',   (select count(*) from paywall),
    'paywall_buyers',    (select count(distinct e.athlete_id) from ev e
                           join paywall p on p.user_id = e.athlete_id
                          where e.event_type = 'INITIAL_PURCHASE' and e.received_at >= v_since),
    'athletes_total',    (select count(*) from public.profiles),
    'ever_paid',         (select count(distinct athlete_id) from public.store_subscriptions where ever_paid),
    'sandbox_events',    (select count(*) from public.store_events where payload ->> 'environment' = 'SANDBOX'),
    'last_event_at',     (select max(received_at) from public.store_events)
  ) into v_out;

  return v_out;
end;
$$;

comment on function public.admin_revenue(int, text, boolean) is
  'Gross USD revenue from RevenueCat price, MRR, paying/trial counts, trial conversion, churn, paywall conversion (0236, AA-D18). Sandbox excluded unless asked. Aggregates only. Gated by admin_guard().';

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 5. TIERS
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.admin_tiers()
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_out jsonb;
begin
  perform public.admin_guard();

  with a as (
    select p.id,
           public.athlete_tier(p.id) as tier,
           e.premium_kind,
           (e.premium_until is not null and e.premium_until <= now()) as lapsed,
           coalesce(e.coach_ai, false) and (e.coach_ai_until is null or e.coach_ai_until > now()) as ai,
           e.founder_seat,
           coalesce(e.comped_tester, false) as comped,
           e.athlete_id is not null as has_row
      from public.profiles p
      left join public.athlete_entitlement e on e.athlete_id = p.id
  )
  select jsonb_build_object(
    'athletes_total', (select count(*) from a),
    'default_tier',   (select c.default_tier from public.entitlement_config c where c.id),
    'free',           (select count(*) from a where tier = 'FREE'),
    'premium',        (select count(*) from a where tier = 'PREMIUM' and not ai),
    'premium_ai',     (select count(*) from a where tier = 'PREMIUM' and ai),
    'ai_without_premium', (select count(*) from a where tier = 'FREE' and ai),
    'by_kind', coalesce((select jsonb_agg(x order by x.n desc) from (
                  select coalesce(premium_kind, case when has_row then 'NONE' else 'DEFAULT' end) as kind,
                         count(*) as n
                    from a where tier = 'PREMIUM' group by 1) x), '[]'::jsonb),
    'founder_seats',  (select count(*) from a where founder_seat is not null),
    'comped_testers', (select count(*) from a where comped),
    'on_default',     (select count(*) from a where not has_row)
  ) into v_out;

  return v_out;
end;
$$;

comment on function public.admin_tiers() is
  'Athletes per effective tier (athlete_tier), Premium AI, premium_kind mix, founders and comped testers (0236). Aggregates only. Gated by admin_guard().';

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 6. AI USAGE (AA-D14 — metered, never read)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.admin_ai_usage(p_days int default 30, p_tz text default 'UTC')
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_days  int  := least(greatest(coalesce(p_days, 30), 1), 730);
  v_tz    text := coalesce(nullif(p_tz, ''), 'UTC');
  v_since timestamptz := now() - make_interval(days => v_days);
  v_prev  timestamptz := now() - make_interval(days => v_days * 2);
  v_out   jsonb;
begin
  perform public.admin_guard();

  with s as (
    select * from public.coach_ai_spend where occurred_at >= v_since
  ),
  per as (
    select athlete_id, sum(cost_usd) as cost from s group by athlete_id
  )
  select jsonb_build_object(
    'days', v_days,
    'calls',      (select count(*) from s),
    'credits',    coalesce((select sum(credits) from s), 0),
    'cost_usd',   coalesce((select round(sum(cost_usd), 4) from s), 0),
    'cost_prev',  coalesce((select round(sum(cost_usd), 4) from public.coach_ai_spend
                            where occurred_at >= v_prev and occurred_at < v_since), 0),
    'cost_all',   coalesce((select round(sum(cost_usd), 2) from public.coach_ai_spend), 0),
    'athletes',   (select count(*) from per),
    'uncharged',  (select count(*) from s where uncharged),
    'tokens', jsonb_build_object(
       'input',        coalesce((select sum(input_tokens) from s), 0),
       'output',       coalesce((select sum(output_tokens) from s), 0),
       'cache_read',   coalesce((select sum(cache_read_input_tokens) from s), 0),
       'cache_write',  coalesce((select sum(cache_creation_input_tokens) from s), 0)),
    'series', coalesce((select jsonb_agg(x order by x.d) from (
                select d::date as d,
                       coalesce((select round(sum(cost_usd), 4) from s where (s.occurred_at at time zone v_tz)::date = d::date), 0) as cost,
                       (select count(*) from s where (s.occurred_at at time zone v_tz)::date = d::date) as calls
                  from generate_series((now() at time zone v_tz)::date - (v_days - 1), (now() at time zone v_tz)::date, interval '1 day') d) x), '[]'::jsonb),
    'by_action', coalesce((select jsonb_agg(x order by x.cost_usd desc) from (
                select action, count(*) as calls, sum(credits) as credits,
                       round(sum(cost_usd), 4) as cost_usd, count(distinct athlete_id) as athletes
                  from s group by action) x), '[]'::jsonb),
    'by_model', coalesce((select jsonb_agg(x order by x.cost_usd desc) from (
                select coalesce(model, 'unknown') as model, count(*) as calls, round(sum(cost_usd), 4) as cost_usd
                  from s group by 1) x), '[]'::jsonb),
    -- Distribution, not a roster: how spend is spread across the athletes who used AI (AA-D2 shape).
    'per_athlete', jsonb_build_object(
       'median', coalesce((select round(percentile_cont(0.5) within group (order by cost)::numeric, 4) from per), 0),
       'p90',    coalesce((select round(percentile_cont(0.9) within group (order by cost)::numeric, 4) from per), 0),
       'max',    coalesce((select round(max(cost), 4) from per), 0)),
    'credits_per_period', (select c.credits_per_period from public.coach_ai_config c limit 1),
    'at_allowance', (select count(*) from public.coach_ai_period p
                      where p.period = (select max(period) from public.coach_ai_period) and p.spent >= p.allowance)
  ) into v_out;

  return v_out;
end;
$$;

comment on function public.admin_ai_usage(int, text) is
  'AI calls, credits, tokens and USD cost by day/action/model, and the spread per athlete (0236, AA-D14). Never content. Gated by admin_guard().';

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 7. WAITLIST (the landing site's TestFlight form, 0215)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.admin_waitlist(p_days int default 30, p_tz text default 'UTC')
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_days  int  := least(greatest(coalesce(p_days, 30), 1), 730);
  v_tz    text := coalesce(nullif(p_tz, ''), 'UTC');
  v_out   jsonb;
begin
  perform public.admin_guard();

  select jsonb_build_object(
    'total',    (select count(*) from public.testflight_requests),
    'invited',  (select count(*) from public.testflight_requests where invited_at is not null),
    'in_window',(select count(*) from public.testflight_requests where created_at >= now() - make_interval(days => v_days)),
    'by_source', coalesce((select jsonb_agg(x order by x.n desc) from (
                  select source, count(*) as n from public.testflight_requests group by source) x), '[]'::jsonb),
    'series', coalesce((select jsonb_agg(x order by x.d) from (
                select d::date as d,
                       (select count(*) from public.testflight_requests t
                         where (t.created_at at time zone v_tz)::date = d::date) as n
                  from generate_series((now() at time zone v_tz)::date - (v_days - 1), (now() at time zone v_tz)::date, interval '1 day') d) x), '[]'::jsonb)
  ) into v_out;

  return v_out;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 8. APP STORE CONNECT (AA-D17)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.admin_appstore(p_days int default 30)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_days  int := least(greatest(coalesce(p_days, 30), 1), 730);
  v_since date := current_date - v_days;
  v_prev  date := current_date - v_days * 2;
  v_out   jsonb;
begin
  perform public.admin_guard();

  select jsonb_build_object(
    'days', v_days,
    'last_sync', (select to_jsonb(l) from (select ran_at, ok, message from public.asc_sync_log order by ran_at desc limit 1) l),
    'last_ok_at', (select max(ran_at) from public.asc_sync_log where ok),
    'rating', (select to_jsonb(r) from (
                 select rating_avg as avg, rating_count as count, ran_at as at
                   from public.asc_sync_log where rating_count is not null order by ran_at desc limit 1) r),
    'downloads',      coalesce((select sum(value) from public.asc_daily where metric = 'downloads' and dim = '' and day > v_since), 0),
    'downloads_prev', coalesce((select sum(value) from public.asc_daily where metric = 'downloads' and dim = '' and day > v_prev and day <= v_since), 0),
    'downloads_all',  coalesce((select sum(value) from public.asc_daily where metric = 'downloads' and dim = ''), 0),
    'redownloads',    coalesce((select sum(value) from public.asc_daily where metric = 'redownloads' and dim = '' and day > v_since), 0),
    'updates',        coalesce((select sum(value) from public.asc_daily where metric = 'updates' and dim = '' and day > v_since), 0),
    'proceeds_usd',   coalesce((select sum(value) from public.asc_daily where metric = 'proceeds_usd' and dim = '' and day > v_since), 0),
    'series', coalesce((select jsonb_agg(x order by x.d) from (
                select d::date as d,
                       coalesce((select value from public.asc_daily a where a.day = d::date and a.metric = 'downloads' and a.dim = ''), 0) as downloads
                  from generate_series(current_date - (v_days - 1), current_date, interval '1 day') d) x), '[]'::jsonb),
    'by_country', coalesce((select jsonb_agg(x order by x.n desc) from (
                select dim as country, sum(value) as n from public.asc_daily
                 where metric = 'downloads' and dim <> '' and day > v_since
                 group by dim order by 2 desc limit 12) x), '[]'::jsonb),
    'reviews', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from (
                select id, rating, title, body, nickname, territory, created_at
                  from public.asc_reviews order by created_at desc limit 25) r), '[]'::jsonb)
  ) into v_out;

  return v_out;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 9. THE BUG BOARD (AA-D19)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.admin_bugs(
  p_status text default null,
  p_severity text default null,
  p_q text default null,
  p_limit int default 400
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_status text := nullif(btrim(coalesce(p_status, '')), '');
  v_sev    text := nullif(btrim(coalesce(p_severity, '')), '');
  v_q      text := nullif(btrim(coalesce(p_q, '')), '');
  v_limit  int  := least(greatest(coalesce(p_limit, 400), 1), 1000);
  v_out    jsonb;
begin
  perform public.admin_guard();

  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(to_jsonb(b) order by
                        case b.severity when 'critical' then 0 when 'high' then 1 when 'medium' then 2 else 3 end,
                        b.created_at desc)
                      from (
                        select id, source, report, ref, title, severity, area, round, detail, status, note,
                               created_at, updated_at, closed_at
                          from public.ops_bugs
                         where (v_status is null
                                or (v_status = 'active' and status in ('open', 'in_progress'))
                                or status = v_status)
                           and (v_sev is null or severity = v_sev)
                           and (v_q is null or title ilike '%' || v_q || '%' or ref ilike v_q || '%'
                                or area ilike '%' || v_q || '%' or detail ilike '%' || v_q || '%')
                         order by case severity when 'critical' then 0 when 'high' then 1 when 'medium' then 2 else 3 end,
                                  created_at desc
                         limit v_limit) b), '[]'::jsonb),
    -- Counts span the whole board, never the filtered page (the admin_feedback rule).
    'counts', (select jsonb_build_object(
                 'total',       count(*),
                 'open',        count(*) filter (where status = 'open'),
                 'in_progress', count(*) filter (where status = 'in_progress'),
                 'fixed',       count(*) filter (where status = 'fixed'),
                 'wont_fix',    count(*) filter (where status = 'wont_fix'),
                 'active_critical', count(*) filter (where status in ('open', 'in_progress') and severity = 'critical'),
                 'active_high',     count(*) filter (where status in ('open', 'in_progress') and severity = 'high'),
                 'active_medium',   count(*) filter (where status in ('open', 'in_progress') and severity = 'medium'),
                 'active_low',      count(*) filter (where status in ('open', 'in_progress') and severity = 'low'),
                 'fixed_7d',    count(*) filter (where status = 'fixed' and closed_at > now() - interval '7 days'))
                 from public.ops_bugs),
    'areas', coalesce((select jsonb_agg(x order by x.n desc) from (
                 select area, count(*) as n from public.ops_bugs
                  where status in ('open', 'in_progress') and area is not null group by area) x), '[]'::jsonb),
    'feedback_new', (select count(*) from public.feedback where status = 'NEW' and kind = 'BUG'),
    'errors_new',   (select count(distinct c.fingerprint) from public.client_errors c
                      left join public.client_error_status s on s.fingerprint = c.fingerprint
                     where coalesce(s.status, 'NEW') = 'NEW' and c.received_at > now() - interval '14 days')
  ) into v_out;

  return v_out;
end;
$$;

/* Create (p_id null) or update one bug. Only the keys present in p_patch change. */
create or replace function public.admin_bug_save(p_id uuid, p_patch jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid := p_id;
  v_p  jsonb := coalesce(p_patch, '{}'::jsonb);
begin
  perform public.admin_guard();

  if v_id is null then
    insert into public.ops_bugs (source, ref, title, severity, area, detail, status, note)
    values ('manual',
            nullif(v_p ->> 'ref', ''),
            coalesce(nullif(btrim(v_p ->> 'title'), ''), 'Untitled bug'),
            coalesce(nullif(v_p ->> 'severity', ''), 'medium'),
            nullif(btrim(v_p ->> 'area'), ''),
            nullif(v_p ->> 'detail', ''),
            coalesce(nullif(v_p ->> 'status', ''), 'open'),
            nullif(v_p ->> 'note', ''))
    returning id into v_id;
    return v_id;
  end if;

  update public.ops_bugs b
     set title    = case when v_p ? 'title'    then coalesce(nullif(btrim(v_p ->> 'title'), ''), b.title) else b.title end,
         severity = case when v_p ? 'severity' then v_p ->> 'severity' else b.severity end,
         area     = case when v_p ? 'area'     then nullif(btrim(v_p ->> 'area'), '') else b.area end,
         detail   = case when v_p ? 'detail'   then nullif(v_p ->> 'detail', '') else b.detail end,
         note     = case when v_p ? 'note'     then nullif(v_p ->> 'note', '') else b.note end,
         status   = case when v_p ? 'status'   then v_p ->> 'status' else b.status end,
         closed_at = case
                       when v_p ? 'status' and v_p ->> 'status' in ('fixed', 'wont_fix')
                            and b.status not in ('fixed', 'wont_fix') then now()
                       when v_p ? 'status' and v_p ->> 'status' in ('open', 'in_progress') then null
                       else b.closed_at end,
         updated_at = now()
   where b.id = v_id;

  if not found then
    raise exception 'bug % not found', v_id using errcode = 'P0002';
  end if;
  return v_id;
end;
$$;

/* Delete a bug the operator filed. QA-report items are closed (won't fix), never deleted — the report
   they came from still names them. */
create or replace function public.admin_bug_delete(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.admin_guard();
  delete from public.ops_bugs where id = p_id and source = 'manual';
  if not found then
    raise exception 'only a manually filed bug can be deleted' using errcode = '42501';
  end if;
end;
$$;

/* "Track this" — copy a feedback row or a crash group onto the board. The original is read, never
   written (AA-D19). Running it twice returns the same bug. */
create or replace function public.admin_bug_track(p_kind text, p_ref text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ref   text := p_kind || ':' || p_ref;
  v_id    uuid;
  v_title text;
  v_body  text;
  v_area  text;
begin
  perform public.admin_guard();

  select id into v_id from public.ops_bugs where source = 'manual' and ref = v_ref;
  if v_id is not null then
    return v_id;
  end if;

  if p_kind = 'feedback' then
    select left(regexp_replace(f.body, '\s+', ' ', 'g'), 120), f.body, f.screen
      into v_title, v_body, v_area
      from public.feedback f where f.id = p_ref::bigint;
  elsif p_kind = 'error' then
    select left(coalesce(c.name, 'Error') || ': ' || coalesce(c.message, ''), 200),
           coalesce(c.message, '') || E'\n\nfingerprint ' || c.fingerprint,
           c.screen
      into v_title, v_body, v_area
      from public.client_errors c where c.fingerprint = p_ref
     order by c.received_at desc limit 1;
  else
    raise exception 'unknown kind %', p_kind using errcode = '22023';
  end if;

  if v_title is null then
    raise exception '% % not found', p_kind, p_ref using errcode = 'P0002';
  end if;

  insert into public.ops_bugs (source, ref, title, severity, area, detail)
  values ('manual', v_ref, v_title, 'medium', v_area, v_body)
  returning id into v_id;
  return v_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 10. PEOPLE — search, the user card, billing lists (AA-D12 / AA-D13)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.admin_user_search(p_q text, p_limit int default 25)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_q     text := btrim(coalesce(p_q, ''));
  v_limit int  := least(greatest(coalesce(p_limit, 25), 1), 100);
begin
  perform public.admin_guard();

  if length(v_q) < 1 then
    return '[]'::jsonb;
  end if;

  return coalesce((select jsonb_agg(to_jsonb(r) order by r.exact desc, r.created_at desc) from (
    select p.id, p.name, p.handle, p.created_at,
           (p.handle ilike ltrim(v_q, '@')) as exact,
           public.athlete_tier(p.id) as tier,
           coalesce(e.coach_ai, false) and (e.coach_ai_until is null or e.coach_ai_until > now()) as premium_ai,
           exists (select 1 from public.store_subscriptions s
                    where s.athlete_id = p.id and s.expires_at > now()
                      and s.period_type in ('NORMAL', 'INTRO', 'PREPAID')) as paying
      from public.profiles p
      left join public.athlete_entitlement e on e.athlete_id = p.id
     where p.handle ilike ltrim(v_q, '@') || '%'
        or p.name ilike '%' || v_q || '%'
        or p.id::text = v_q
     order by (p.handle ilike ltrim(v_q, '@')) desc, p.created_at desc
     limit v_limit) r), '[]'::jsonb);
end;
$$;

/*
 * ⚠ THE CEILING IS THIS FUNCTION'S BODY (AA-D12). Every key below is account, billing, AI metering,
 * support or business. Adding a training, social, presence, photo, health or auth-email key here is a
 * new decision against AA-D2 (AA-D13), and the roundtrip script fails it.
 */
create or replace function public.admin_user_card(p_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_out jsonb;
begin
  perform public.admin_guard();

  select jsonb_build_object(
    'account', jsonb_build_object(
       'id', p.id, 'name', p.name, 'handle', p.handle, 'created_at', p.created_at,
       'named', (p.name is distinct from 'Athlete')),
    'billing', jsonb_build_object(
       'tier',           public.athlete_tier(p.id),
       'premium_kind',   e.premium_kind,
       'premium_until',  e.premium_until,
       'premium_ai',     coalesce(e.coach_ai, false) and (e.coach_ai_until is null or e.coach_ai_until > now()),
       'premium_ai_until', e.coach_ai_until,
       'founder_seat',   e.founder_seat,
       'comped_tester',  coalesce(e.comped_tester, false),
       'subscriptions',  coalesce((select jsonb_agg(to_jsonb(s) order by s.updated_at desc) from (
                            select product_id, period_type, expires_at, ever_paid, updated_at,
                                   public.crm_sub_env(p.id, product_id) as environment
                              from public.store_subscriptions where athlete_id = p.id) s), '[]'::jsonb),
       'events',         coalesce((select jsonb_agg(to_jsonb(x) order by x.received_at desc) from (
                            select event_type as type, product_id as product, received_at,
                                   nullif(payload ->> 'price', '')::numeric as price,
                                   payload ->> 'environment' as environment,
                                   payload ->> 'period_type' as period_type
                              from public.store_events where athlete_id = p.id
                             order by received_at desc limit 50) x), '[]'::jsonb),
       'paid_total',     coalesce((select sum(nullif(payload ->> 'price', '')::numeric) from public.store_events
                                    where athlete_id = p.id and coalesce(payload ->> 'environment', 'PRODUCTION') = 'PRODUCTION'), 0)),
    'ai', jsonb_build_object(
       'periods', coalesce((select jsonb_agg(to_jsonb(x) order by x.period desc) from (
                     select period, spent, allowance from public.coach_ai_period
                      where athlete_id = p.id order by period desc limit 6) x), '[]'::jsonb),
       'by_action', coalesce((select jsonb_agg(to_jsonb(x) order by x.cost_usd desc) from (
                     select action, count(*) as calls, sum(credits) as credits, round(sum(cost_usd), 4) as cost_usd
                       from public.coach_ai_spend where athlete_id = p.id group by action) x), '[]'::jsonb),
       'cost_all', coalesce((select round(sum(cost_usd), 4) from public.coach_ai_spend where athlete_id = p.id), 0)),
    'support', jsonb_build_object(
       'feedback', coalesce((select jsonb_agg(to_jsonb(f) order by f.created_at desc) from (
                     select id, kind, body, screen, status, created_at from public.feedback
                      where user_id = p.id order by created_at desc limit 20) f), '[]'::jsonb),
       'errors', (select count(*) from public.client_errors where user_id = p.id),
       'error_bugs', (select count(distinct fingerprint) from public.client_errors where user_id = p.id)),
    'business', jsonb_build_object(
       'trainer', (select to_jsonb(t) from (select status, seat_cap, granted_at from public.trainers where user_id = p.id) t),
       'trainer_clients', (select count(*) from public.trainer_clients where trainer_id = p.id and status = 'active'),
       'contact_id', (select c.id from public.crm_contacts c where c.athlete_id = p.id order by c.created_at limit 1))
  ) into v_out
  from public.profiles p
  left join public.athlete_entitlement e on e.athlete_id = p.id
  where p.id = p_id;

  if v_out is null then
    raise exception 'athlete % not found', p_id using errcode = 'P0002';
  end if;
  return v_out;
end;
$$;

comment on function public.admin_user_card(uuid) is
  'One athlete''s account, billing, AI metering, support and business record — and nothing else (0236, AA-D12/AA-D13). Gated by admin_guard().';

/* A billing list: who is on what. Handle, name and plan only — a roster of the customer relationship,
   never of training (AA-D9 narrowing, AA-D12). */
create or replace function public.admin_billing_list(p_filter text default 'paying', p_limit int default 200)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_f     text := coalesce(nullif(p_filter, ''), 'paying');
  v_limit int  := least(greatest(coalesce(p_limit, 200), 1), 1000);
begin
  perform public.admin_guard();

  return coalesce((select jsonb_agg(to_jsonb(r) order by r.since desc nulls last) from (
    select p.id, p.name, p.handle, p.created_at,
           public.athlete_tier(p.id) as tier,
           e.premium_kind,
           coalesce(e.coach_ai, false) and (e.coach_ai_until is null or e.coach_ai_until > now()) as premium_ai,
           e.founder_seat,
           coalesce(e.comped_tester, false) as comped,
           s.product_id as product,
           s.period_type,
           s.expires_at,
           s.updated_at as since
      from public.profiles p
      left join public.athlete_entitlement e on e.athlete_id = p.id
      left join lateral (
        select * from public.store_subscriptions x
         where x.athlete_id = p.id and x.expires_at > now()
         order by x.expires_at desc limit 1) s on true
     where case v_f
             when 'paying'     then s.period_type in ('NORMAL', 'INTRO', 'PREPAID')
             when 'trial'      then s.period_type = 'TRIAL'
             when 'premium_ai' then coalesce(e.coach_ai, false) and (e.coach_ai_until is null or e.coach_ai_until > now())
             when 'founder'    then e.founder_seat is not null
             when 'comped'     then coalesce(e.comped_tester, false)
             when 'grant'      then e.premium_kind = 'GRANT'
             when 'free'       then public.athlete_tier(p.id) = 'FREE'
             when 'lapsed'     then s.product_id is null and exists (
                                      select 1 from public.store_subscriptions z where z.athlete_id = p.id and z.ever_paid)
             else false
           end
     limit v_limit) r), '[]'::jsonb);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 11. CONTACTS (AA-D15)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

/*
 * Lists contacts. First pulls in anyone new from the two places people already arrive — the site's
 * TestFlight form and the trainer seat register — so a tester or a trainer is never missing from the
 * CRM just because nobody typed them in. `on conflict do nothing` on (source, source_ref): an existing
 * row, including every note and stage the operator set on it, is never overwritten.
 */
create or replace function public.admin_contacts(p_kind text default null, p_q text default null)
returns jsonb
language plpgsql
security definer
volatile
set search_path = public, pg_temp
as $$
declare
  v_kind text := nullif(btrim(coalesce(p_kind, '')), '');
  v_q    text := nullif(btrim(coalesce(p_q, '')), '');
begin
  perform public.admin_guard();

  insert into public.crm_contacts (kind, email, stage, source, source_ref, created_at)
  select 'tester', t.email,
         case when t.invited_at is not null then 'active' else 'lead' end,
         'testflight_form', t.id::text, t.created_at
    from public.testflight_requests t
  on conflict (source, source_ref) where source_ref is not null do nothing;

  insert into public.crm_contacts (kind, name, stage, athlete_id, source, source_ref, created_at)
  select 'trainer', p.name,
         case when tr.status = 'active' then 'active' else 'inactive' end,
         tr.user_id, 'trainer_seat', tr.user_id::text, tr.granted_at
    from public.trainers tr
    join public.profiles p on p.id = tr.user_id
  on conflict (source, source_ref) where source_ref is not null do nothing;

  return jsonb_build_object(
    'rows', coalesce((select jsonb_agg(to_jsonb(r) order by r.follow_sort, r.updated_at desc) from (
       select c.id, c.kind, c.name, c.email, c.phone, c.company, c.role, c.stage, c.tags, c.notes,
              c.athlete_id, p.handle as athlete_handle, c.source, c.next_follow_up, c.created_at, c.updated_at,
              (select count(*) from public.crm_activity a where a.contact_id = c.id) as activity,
              (select count(*) from public.crm_activity a where a.contact_id = c.id and a.kind = 'task' and a.done_at is null) as open_tasks,
              (select max(a.created_at) from public.crm_activity a where a.contact_id = c.id) as last_touch,
              coalesce(c.next_follow_up, 'infinity'::date) as follow_sort
         from public.crm_contacts c
         left join public.profiles p on p.id = c.athlete_id
        where (v_kind is null or c.kind = v_kind)
          and (v_q is null or c.name ilike '%' || v_q || '%' or c.email ilike '%' || v_q || '%'
               or c.company ilike '%' || v_q || '%' or p.handle ilike ltrim(v_q, '@') || '%'
               or v_q = any (c.tags))) r), '[]'::jsonb),
    'counts', (select jsonb_build_object(
                 'total', count(*),
                 'tester', count(*) filter (where kind = 'tester'),
                 'trainer', count(*) filter (where kind = 'trainer'),
                 'business', count(*) filter (where kind = 'business'),
                 'user', count(*) filter (where kind = 'user'),
                 'other', count(*) filter (where kind = 'other'),
                 'follow_up_due', count(*) filter (where next_follow_up <= current_date))
                 from public.crm_contacts)
  );
end;
$$;

create or replace function public.admin_contact_save(p_id uuid, p_patch jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid := p_id;
  v_p  jsonb := coalesce(p_patch, '{}'::jsonb);
  v_tags text[];
begin
  perform public.admin_guard();

  if v_p ? 'tags' then
    v_tags := array(select btrim(x) from jsonb_array_elements_text(
                case when jsonb_typeof(v_p -> 'tags') = 'array' then v_p -> 'tags' else '[]'::jsonb end) x
              where btrim(x) <> '');
  end if;

  if v_id is null then
    insert into public.crm_contacts (kind, name, email, phone, company, role, stage, tags, notes, athlete_id, next_follow_up)
    values (coalesce(nullif(v_p ->> 'kind', ''), 'business'),
            nullif(btrim(v_p ->> 'name'), ''),
            nullif(lower(btrim(v_p ->> 'email')), ''),
            nullif(btrim(v_p ->> 'phone'), ''),
            nullif(btrim(v_p ->> 'company'), ''),
            nullif(btrim(v_p ->> 'role'), ''),
            coalesce(nullif(v_p ->> 'stage', ''), 'lead'),
            coalesce(v_tags, '{}'),
            nullif(v_p ->> 'notes', ''),
            nullif(v_p ->> 'athlete_id', '')::uuid,
            nullif(v_p ->> 'next_follow_up', '')::date)
    returning id into v_id;
    return v_id;
  end if;

  update public.crm_contacts c
     set kind    = case when v_p ? 'kind'    then v_p ->> 'kind' else c.kind end,
         name    = case when v_p ? 'name'    then nullif(btrim(v_p ->> 'name'), '') else c.name end,
         email   = case when v_p ? 'email'   then nullif(lower(btrim(v_p ->> 'email')), '') else c.email end,
         phone   = case when v_p ? 'phone'   then nullif(btrim(v_p ->> 'phone'), '') else c.phone end,
         company = case when v_p ? 'company' then nullif(btrim(v_p ->> 'company'), '') else c.company end,
         role    = case when v_p ? 'role'    then nullif(btrim(v_p ->> 'role'), '') else c.role end,
         stage   = case when v_p ? 'stage'   then v_p ->> 'stage' else c.stage end,
         tags    = case when v_p ? 'tags'    then coalesce(v_tags, '{}') else c.tags end,
         notes   = case when v_p ? 'notes'   then nullif(v_p ->> 'notes', '') else c.notes end,
         athlete_id = case when v_p ? 'athlete_id' then nullif(v_p ->> 'athlete_id', '')::uuid else c.athlete_id end,
         next_follow_up = case when v_p ? 'next_follow_up' then nullif(v_p ->> 'next_follow_up', '')::date else c.next_follow_up end,
         updated_at = now()
   where c.id = v_id;

  if not found then
    raise exception 'contact % not found', v_id using errcode = 'P0002';
  end if;
  return v_id;
end;
$$;

/* Delete a contact. An auto-synced row (tester form, trainer seat) would come straight back on the next
   list, so it is marked inactive instead. */
create or replace function public.admin_contact_delete(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.admin_guard();
  update public.crm_contacts set stage = 'inactive', updated_at = now()
   where id = p_id and source <> 'manual';
  if not found then
    delete from public.crm_contacts where id = p_id;
  end if;
end;
$$;

create or replace function public.admin_contact_activity(p_contact uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  perform public.admin_guard();
  return coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc) from (
    select id, kind, body, due_on, done_at, created_at
      from public.crm_activity where contact_id = p_contact
     order by created_at desc limit 200) a), '[]'::jsonb);
end;
$$;

create or replace function public.admin_activity_log(p_contact uuid, p_kind text, p_body text, p_due date default null)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  perform public.admin_guard();
  insert into public.crm_activity (contact_id, kind, body, due_on)
  values (p_contact, coalesce(nullif(p_kind, ''), 'note'), btrim(p_body), p_due)
  returning id into v_id;
  update public.crm_contacts set updated_at = now() where id = p_contact;
  return v_id;
end;
$$;

create or replace function public.admin_activity_done(p_id uuid, p_done boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.admin_guard();
  update public.crm_activity set done_at = case when p_done then now() else null end where id = p_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 12. DOCUMENTS (AA-D16)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.admin_documents(p_category text default null, p_q text default null)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_cat text := nullif(btrim(coalesce(p_category, '')), '');
  v_q   text := nullif(btrim(coalesce(p_q, '')), '');
begin
  perform public.admin_guard();
  return jsonb_build_object(
    'rows', coalesce((select jsonb_agg(to_jsonb(d) order by d.updated_at desc) from (
       select id, title, category, storage_path, url, mime, size_bytes, tags, notes, created_at, updated_at
         from public.ops_documents
        where (v_cat is null or category = v_cat)
          and (v_q is null or title ilike '%' || v_q || '%' or notes ilike '%' || v_q || '%' or v_q = any (tags))) d), '[]'::jsonb),
    'counts', coalesce((select jsonb_object_agg(category, n) from (
       select category, count(*) as n from public.ops_documents group by category) x), '{}'::jsonb),
    'bytes', coalesce((select sum(size_bytes) from public.ops_documents), 0)
  );
end;
$$;

create or replace function public.admin_document_save(p_id uuid, p_patch jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid := p_id;
  v_p  jsonb := coalesce(p_patch, '{}'::jsonb);
  v_tags text[];
begin
  perform public.admin_guard();

  if v_p ? 'tags' then
    v_tags := array(select btrim(x) from jsonb_array_elements_text(
                case when jsonb_typeof(v_p -> 'tags') = 'array' then v_p -> 'tags' else '[]'::jsonb end) x
              where btrim(x) <> '');
  end if;

  if v_id is null then
    insert into public.ops_documents (title, category, storage_path, url, mime, size_bytes, tags, notes)
    values (coalesce(nullif(btrim(v_p ->> 'title'), ''), 'Untitled'),
            coalesce(nullif(v_p ->> 'category', ''), 'other'),
            nullif(v_p ->> 'storage_path', ''),
            nullif(btrim(v_p ->> 'url'), ''),
            nullif(v_p ->> 'mime', ''),
            nullif(v_p ->> 'size_bytes', '')::bigint,
            coalesce(v_tags, '{}'),
            nullif(v_p ->> 'notes', ''))
    returning id into v_id;
    return v_id;
  end if;

  update public.ops_documents d
     set title    = case when v_p ? 'title'    then coalesce(nullif(btrim(v_p ->> 'title'), ''), d.title) else d.title end,
         category = case when v_p ? 'category' then v_p ->> 'category' else d.category end,
         tags     = case when v_p ? 'tags'     then coalesce(v_tags, '{}') else d.tags end,
         notes    = case when v_p ? 'notes'    then nullif(v_p ->> 'notes', '') else d.notes end,
         url      = case when v_p ? 'url' and d.storage_path is null then nullif(btrim(v_p ->> 'url'), '') else d.url end,
         updated_at = now()
   where d.id = v_id;

  if not found then
    raise exception 'document % not found', v_id using errcode = 'P0002';
  end if;
  return v_id;
end;
$$;

/* Removes the row and returns the storage path, which the client then deletes from the bucket (Supabase
   refuses direct deletes on storage.objects from SQL). Row first: a dangling file is invisible clutter,
   a dangling row is a broken link on screen. */
create or replace function public.admin_document_delete(p_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_path text;
begin
  perform public.admin_guard();
  delete from public.ops_documents where id = p_id returning storage_path into v_path;
  return v_path;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 13. GRANTS — revoke from PUBLIC (never from authenticated: see 0137's note); the GUARD refuses a
--     signed-in non-admin, the grant only shuts out anon.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

do $$
declare
  f text;
begin
  foreach f in array array[
    'admin_revenue(int, text, boolean)',
    'admin_tiers()',
    'admin_ai_usage(int, text)',
    'admin_waitlist(int, text)',
    'admin_appstore(int)',
    'admin_bugs(text, text, text, int)',
    'admin_bug_save(uuid, jsonb)',
    'admin_bug_delete(uuid)',
    'admin_bug_track(text, text)',
    'admin_user_search(text, int)',
    'admin_user_card(uuid)',
    'admin_billing_list(text, int)',
    'admin_contacts(text, text)',
    'admin_contact_save(uuid, jsonb)',
    'admin_contact_delete(uuid)',
    'admin_contact_activity(uuid)',
    'admin_activity_log(uuid, text, text, date)',
    'admin_activity_done(uuid, boolean)',
    'admin_documents(text, text)',
    'admin_document_save(uuid, jsonb)',
    'admin_document_delete(uuid)'
  ] loop
    execute format('revoke execute on function public.%s from public', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
