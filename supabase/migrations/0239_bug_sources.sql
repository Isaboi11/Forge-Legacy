-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- 0239 — THE BUG BOARD'S FOUR SOURCES (Sentry · TestFlight · App Store · in-app)
--
-- The updated `Forge CRM.dc.html` (PO 09-29) draws the Bugs page from four places — Supabase (the board
-- and in-app reports), Sentry (crashes), TestFlight (tester feedback) and the App Store (reviews that
-- describe a bug) — with a source on every row and "Also reported in … · merged into one item".
-- Governed by `Docs/Admin-Analytics-Amendment-002-Business-CRM.md` (AA-D17, AA-D19; AA-D21 added with
-- this migration).
--
-- ══ WHAT IT ADDS ══
--
--   Tables (RLS ON, ZERO policies — AA-D6; written by the sync Edge Functions with the service role, read
--   only through the admin_* definer functions below):
--     sentry_issues     — one row per Sentry issue (crash group), with the latest event's trail + stack
--     asc_feedback      — TestFlight feedback (screenshot + crash submissions) from App Store Connect
--     ops_sync_log      — one row per Sentry sync run (App Store runs keep `asc_sync_log`, 0238)
--     ops_report_state  — "Dismissed" for a report from any source, keyed by its origin
--     ops_bug_links     — extra reports MERGED into a board item ("also reported in")
--
--   Functions (each opens with `perform public.admin_guard()` — AA-D5):
--     admin_bug_sources · admin_reports_inbox · admin_crashes · admin_bug_links
--     admin_report_track · admin_report_dismiss
--
-- ══ ORIGINS ══
--
--   Every report has one origin string, the same key everywhere: 'feedback:<id>' (in-app, 0167),
--   'testflight:<id>', 'review:<id>' (App Store), 'sentry:<issue id>', 'error:<fingerprint>' (in-app
--   crash, 0176). A bug's `origin` (0238) is the report it was created from; `ops_bug_links` holds any
--   further reports merged into it. An origin is on the board at most once, across both.
--
-- ══ ⚠ NOTHING HERE CHANGES AN APPLIED FUNCTION ══
--
--   0238 is applied. `admin_bug_track` and `admin_bugs` are left exactly as they are; the new
--   `admin_report_track` handles every source and merging, and `admin_bug_links` is read alongside
--   `admin_bugs` by the screen. Restating an applied function is how 0059 once reverted a feature.
--
-- ══ ⚠ AA-D13 STILL HOLDS ══
--
--   A Sentry trail is route names and actions (the app's breadcrumbs are scrubbed of anything typed —
--   `sentry-scrub.ts`); a TestFlight comment and an App Store review are what the person chose to send
--   us. No training, photo, nutrition or health data is stored or returned. The tester's email that
--   TestFlight attaches is NOT stored.
--
-- Safe to run twice. Pasted as a whole via `supabase/apply/pending-0239.sql`.
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 1. TABLES
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.sentry_issues (
  id           text primary key,              -- Sentry's issue id
  short_id     text,                          -- e.g. FORGE-LEGACY-1A
  title        text not null,
  culprit      text,
  level        text,
  status       text,                          -- unresolved / resolved / ignored (Sentry's own)
  environment  text,
  event_count  int  not null default 0,
  user_count   int  not null default 0,
  first_seen   timestamptz,
  last_seen    timestamptz,
  permalink    text,
  trail        jsonb not null default '[]'::jsonb,  -- [{label, kind}] from the latest event's breadcrumbs
  stack        text,
  release      text,
  synced_at    timestamptz not null default now()
);
alter table public.sentry_issues enable row level security;
create index if not exists sentry_issues_last_seen_idx on public.sentry_issues (last_seen desc);

create table if not exists public.asc_feedback (
  id             text primary key,            -- App Store Connect's submission id
  kind           text not null check (kind in ('screenshot', 'crash')),
  comment        text,
  device_model   text,
  os_version     text,
  app_platform   text,
  build_version  text,
  created_at     timestamptz,
  synced_at      timestamptz not null default now()
);
alter table public.asc_feedback enable row level security;
create index if not exists asc_feedback_created_idx on public.asc_feedback (created_at desc);

create table if not exists public.ops_sync_log (
  id       bigint generated always as identity primary key,
  source   text not null check (source in ('sentry')),
  ran_at   timestamptz not null default now(),
  ok       boolean not null,
  message  text
);
alter table public.ops_sync_log enable row level security;

create table if not exists public.ops_report_state (
  origin      text primary key,
  state       text not null check (state in ('dismissed')),
  updated_at  timestamptz not null default now()
);
alter table public.ops_report_state enable row level security;

create table if not exists public.ops_bug_links (
  origin      text primary key,               -- a report can be merged into ONE item
  bug_id      uuid not null references public.ops_bugs (id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.ops_bug_links enable row level security;
create index if not exists ops_bug_links_bug_idx on public.ops_bug_links (bug_id);

comment on table public.sentry_issues    is 'Sentry issues (crash groups), written by the sentry-sync Edge Function (0239, AA-D21). RLS on, no policies.';
comment on table public.asc_feedback     is 'TestFlight feedback submissions, written by asc-sync (0239, AA-D21). No tester email stored. RLS on, no policies.';
comment on table public.ops_sync_log     is 'One row per Sentry sync run (0239). RLS on, no policies.';
comment on table public.ops_report_state is 'Reports dismissed from the Bugs inbox, by origin (0239). RLS on, no policies.';
comment on table public.ops_bug_links    is 'Further reports merged into a board item — "also reported in" (0239). RLS on, no policies.';

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 2. HELPERS (not callable by clients)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

/* Which of the four sources an origin belongs to — the board's "Source" column. */
create or replace function public.ops_origin_source(p_origin text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select case split_part(coalesce(p_origin, ''), ':', 1)
    when 'sentry'     then 'Sentry'
    when 'testflight' then 'TestFlight'
    when 'review'     then 'App Store'
    else 'Supabase'   -- in-app reports, in-app crashes, QA items and bugs filed by hand all live here
  end;
$$;

/*
 * Does an App Store review describe a bug? Low-rated and saying so in words. A keyword rule, stated
 * plainly on the screen ("reviews that mention a bug"), because a guess dressed as understanding is
 * worse than a rule the owner can see through.
 */
create or replace function public.ops_review_is_bug(p_rating int, p_title text, p_body text)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select coalesce(p_rating, 5) <= 3
     and (coalesce(p_title, '') || ' ' || coalesce(p_body, '')) ~*
         '(crash|bug|broken|freez|froze|glitch|error|stuck|won''?t (load|open|save|work)|doesn''?t (load|open|save|work)|not working|can''?t (log|save|open|sign)|keeps (closing|crashing)|lost (my|all))';
$$;

/* The board ref an origin already sits under (as a bug's origin or a merged link), or null. */
create or replace function public.ops_origin_ref(p_origin text)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select b.ref from public.ops_bugs b where b.origin = p_origin limit 1),
    (select b.ref from public.ops_bug_links l join public.ops_bugs b on b.id = l.bug_id where l.origin = p_origin limit 1));
$$;

revoke all on function public.ops_origin_source(text) from public;
revoke all on function public.ops_review_is_bug(int, text, text) from public;
revoke all on function public.ops_origin_ref(text) from public;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 3. THE SOURCE CARDS
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.admin_bug_sources()
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_sentry record;
  v_asc    record;
begin
  perform public.admin_guard();

  select ran_at, ok, message into v_sentry from public.ops_sync_log where source = 'sentry' order by ran_at desc limit 1;
  select ran_at, ok, message into v_asc from public.asc_sync_log order by ran_at desc limit 1;

  return jsonb_build_array(
    jsonb_build_object('name', 'Supabase', 'feeds', 'Bug table · in-app reports', 'live', true,
      'synced_at', null, 'ok', true, 'message', null,
      'items', (select count(*) from public.ops_bugs b where public.ops_origin_source(b.origin) = 'Supabase'),
      'reports', (select count(*) from public.feedback f where f.kind = 'BUG')),
    jsonb_build_object('name', 'Sentry', 'feeds', 'Crashes · errors', 'live', false,
      'synced_at', v_sentry.ran_at, 'ok', v_sentry.ok, 'message', v_sentry.message,
      'items', (select count(*) from public.ops_bugs b where public.ops_origin_source(b.origin) = 'Sentry'),
      'reports', (select count(*) from public.sentry_issues)),
    jsonb_build_object('name', 'TestFlight', 'feeds', 'Tester feedback', 'live', false,
      'synced_at', v_asc.ran_at, 'ok', v_asc.ok, 'message', v_asc.message,
      'items', (select count(*) from public.ops_bugs b where public.ops_origin_source(b.origin) = 'TestFlight'),
      'reports', (select count(*) from public.asc_feedback)),
    jsonb_build_object('name', 'App Store', 'feeds', 'Reviews that mention a bug', 'live', false,
      'synced_at', v_asc.ran_at, 'ok', v_asc.ok, 'message', v_asc.message,
      'items', (select count(*) from public.ops_bugs b where public.ops_origin_source(b.origin) = 'App Store'),
      'reports', (select count(*) from public.asc_reviews r where public.ops_review_is_bug(r.rating, r.title, r.body)))
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 4. THE REPORTS INBOX — in-app, TestFlight and App Store, one list
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.admin_reports_inbox(p_limit int default 200)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 200), 1), 500);
begin
  perform public.admin_guard();

  return coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc nulls last) from (
    select x.*,
           public.ops_origin_ref(x.origin) as bug_ref,
           case when public.ops_origin_ref(x.origin) is not null then 'tracked'
                when exists (select 1 from public.ops_report_state s where s.origin = x.origin) then 'dismissed'
                else 'new' end as state
      from (
        -- In-app "Report a problem" (0167). Handle only — AA-D12's support identity.
        select 'feedback:' || f.id as origin, 'Supabase' as source, 'In-app' as channel,
               f.body as body, f.created_at,
               p.handle as handle, f.app_version as version, f.platform as platform,
               null::text as device, null::int as rating, f.screen as screen, null::text as country
          from public.feedback f
          left join public.profiles p on p.id = f.user_id
         where f.kind = 'BUG'
        union all
        -- TestFlight feedback (screenshots and crash reports testers sent from TestFlight).
        select 'testflight:' || a.id, 'TestFlight', case a.kind when 'crash' then 'TestFlight crash' else 'TestFlight' end,
               coalesce(nullif(btrim(a.comment), ''), case a.kind when 'crash' then 'A tester sent a crash report' else 'A tester sent a screenshot' end),
               a.created_at, null, a.build_version, a.app_platform, a.device_model, null, null, null
          from public.asc_feedback a
        union all
        -- App Store reviews that describe a bug (see ops_review_is_bug).
        select 'review:' || v.id, 'App Store', 'Review',
               concat_ws(E'\n', nullif(btrim(v.title), ''), nullif(btrim(v.body), '')),
               v.created_at, v.nickname, null, null, null, v.rating, null, v.territory
          from public.asc_reviews v
         where public.ops_review_is_bug(v.rating, v.title, v.body)
      ) x
     order by x.created_at desc nulls last
     limit v_limit) r), '[]'::jsonb);
end;
$$;

/* Dismiss (p_dismiss true) or restore a report from the inbox. The original row is never touched. */
create or replace function public.admin_report_dismiss(p_origin text, p_dismiss boolean default true)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.admin_guard();
  if p_dismiss then
    insert into public.ops_report_state (origin, state) values (p_origin, 'dismissed')
    on conflict (origin) do update set state = 'dismissed', updated_at = now();
  else
    delete from public.ops_report_state where origin = p_origin;
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 5. CRASHES — Sentry groups and the app's own crash reports, one list
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.admin_crashes(p_days int default 30)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_days  int := least(greatest(coalesce(p_days, 30), 1), 365);
  v_since timestamptz := now() - make_interval(days => v_days);
begin
  perform public.admin_guard();

  return coalesce((select jsonb_agg(to_jsonb(r) order by r.last_seen desc nulls last) from (
    select 'sentry:' || s.id as origin, 'Sentry' as source,
           s.title, s.culprit as detail, s.event_count as events, s.user_count as people,
           s.first_seen, s.last_seen, s.status, s.release as version, s.environment,
           s.trail, s.stack, s.permalink, s.short_id,
           (s.first_seen > now() - interval '7 days') as is_new,
           public.ops_origin_ref('sentry:' || s.id) as bug_ref
      from public.sentry_issues s
     where s.last_seen >= v_since
    union all
    -- The app's own reporter (0176), grouped by fingerprint. Kept beside Sentry: builds before 10 have
    -- no Sentry, and this is the only crash record for them.
    select 'error:' || g.fingerprint, 'Supabase',
           g.name || coalesce(': ' || g.message, ''), g.screen, g.events, g.people,
           g.first_seen, g.last_seen, coalesce(st.status, 'NEW'), g.version, null,
           '[]'::jsonb, null, null, null,
           (g.first_seen > now() - interval '7 days'),
           public.ops_origin_ref('error:' || g.fingerprint)
      from (
        select c.fingerprint, max(c.name) as name, max(c.message) as message, max(c.screen) as screen,
               count(*)::int as events, count(distinct c.user_id)::int as people,
               min(c.received_at) as first_seen, max(c.received_at) as last_seen, max(c.app_version) as version
          from public.client_errors c
         where c.received_at >= v_since
         group by c.fingerprint
      ) g
      left join public.client_error_status st on st.fingerprint = g.fingerprint
  ) r), '[]'::jsonb);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 6. TRACK + MERGE, AND THE LINKS THE BOARD DRAWS
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

/*
 * Put a report from ANY source on the board. p_target null → a new item (B-number, `origin` set);
 * p_target given → MERGE it into that item (an `ops_bug_links` row). Idempotent: an origin already on
 * the board returns where it is. Returns {id, ref, merged}. The report itself is never modified.
 */
create or replace function public.admin_report_track(p_origin text, p_target uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_kind   text := split_part(p_origin, ':', 1);
  v_key    text := substr(p_origin, length(split_part(p_origin, ':', 1)) + 2);
  v_id     uuid;
  v_ref    text;
  v_title  text;
  v_body   text;
  v_area   text;
begin
  perform public.admin_guard();

  -- Already on the board, as an item's origin or merged into one.
  select b.id, b.ref into v_id, v_ref from public.ops_bugs b where b.origin = p_origin;
  if v_id is null then
    select b.id, b.ref into v_id, v_ref from public.ops_bug_links l join public.ops_bugs b on b.id = l.bug_id where l.origin = p_origin;
  end if;
  if v_id is not null then
    return jsonb_build_object('id', v_id, 'ref', v_ref, 'merged', false, 'existing', true);
  end if;

  if p_target is not null then
    select b.ref into v_ref from public.ops_bugs b where b.id = p_target;
    if v_ref is null then
      raise exception 'bug % not found', p_target using errcode = 'P0002';
    end if;
    insert into public.ops_bug_links (origin, bug_id) values (p_origin, p_target);
    delete from public.ops_report_state where origin = p_origin;
    return jsonb_build_object('id', p_target, 'ref', v_ref, 'merged', true, 'existing', false);
  end if;

  if v_kind = 'feedback' then
    select left(regexp_replace(f.body, '\s+', ' ', 'g'), 120), f.body, f.screen into v_title, v_body, v_area
      from public.feedback f where f.id = v_key::bigint;
  elsif v_kind = 'error' then
    select left(coalesce(c.name, 'Error') || ': ' || coalesce(c.message, ''), 200),
           coalesce(c.message, '') || E'\n\nfingerprint ' || c.fingerprint, c.screen
      into v_title, v_body, v_area
      from public.client_errors c where c.fingerprint = v_key order by c.received_at desc limit 1;
  elsif v_kind = 'sentry' then
    select left(s.title, 200), concat_ws(E'\n\n', s.culprit, 'Sentry ' || coalesce(s.short_id, s.id), s.permalink), null
      into v_title, v_body, v_area
      from public.sentry_issues s where s.id = v_key;
  elsif v_kind = 'testflight' then
    select left(regexp_replace(coalesce(nullif(btrim(a.comment), ''), 'TestFlight ' || a.kind || ' report'), '\s+', ' ', 'g'), 120),
           concat_ws(E'\n', a.comment, concat_ws(' · ', 'build ' || a.build_version, a.device_model, a.os_version)), null
      into v_title, v_body, v_area
      from public.asc_feedback a where a.id = v_key;
  elsif v_kind = 'review' then
    select left(coalesce(nullif(btrim(v.title), ''), left(v.body, 120)), 120),
           concat_ws(E'\n', v.title, v.body, v.rating || '★ · ' || coalesce(v.territory, '')), null
      into v_title, v_body, v_area
      from public.asc_reviews v where v.id = v_key;
  else
    raise exception 'unknown report source %', v_kind using errcode = '22023';
  end if;

  if v_title is null then
    raise exception 'report % not found', p_origin using errcode = 'P0002';
  end if;

  insert into public.ops_bugs (source, ref, origin, title, severity, area, detail)
  values ('manual', public.ops_next_bug_ref(), p_origin, v_title, 'medium', v_area, v_body)
  returning id, ref into v_id, v_ref;
  delete from public.ops_report_state where origin = p_origin;
  return jsonb_build_object('id', v_id, 'ref', v_ref, 'merged', false, 'existing', false);
end;
$$;

/* Every merged report, for "Also reported in …" on the board. Small: one row per merge. */
create or replace function public.admin_bug_links()
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  perform public.admin_guard();
  return coalesce((select jsonb_agg(jsonb_build_object(
            'bug_id', l.bug_id, 'origin', l.origin, 'source', public.ops_origin_source(l.origin), 'created_at', l.created_at)
          order by l.created_at) from public.ops_bug_links l), '[]'::jsonb);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 7. GRANTS — revoke from PUBLIC; the guard refuses a signed-in non-admin (0137's note)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

do $$
declare
  f text;
begin
  foreach f in array array[
    'admin_bug_sources()',
    'admin_reports_inbox(int)',
    'admin_report_dismiss(text, boolean)',
    'admin_crashes(int)',
    'admin_report_track(text, uuid)',
    'admin_bug_links()'
  ] loop
    execute format('revoke execute on function public.%s from public', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
