-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0247: the CRM's Social section — TikTok + Instagram numbers, content, playbook (PO 2026-09-30)
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once. Safe to run twice.
--
-- What changes (everything is NEW; no existing table or function is touched):
--   · 13 tables, all named ops_social_*, RLS on with no policies (only admin functions can read them)
--   · admin_social_media() — the one read behind the Numbers, Content and Playbook pages
--   · 14 admin write functions (videos, postings, tags, goals, income, questions, notes, rules)
--   · social_link_hit() — what forgelegacy.app/go/tiktok and /go/instagram call to count a click
--   · social_sync_tick() + a daily cron job (09:10 UTC) that asks the social-sync function to pull numbers
--
-- ⚠ Safe before the web deploy: the current CRM does not call any of these.
-- ⚠ ORDER: this first, THEN the web deploy. The Social pages work as soon as both are done: ideas,
--   the pipeline, the calendar and the playbook need nothing else. Numbers arrive on their own only
--   after the `social-sync` Edge Function is deployed and the two accounts are connected
--   (Docs/Social-Accounts-Setup.md). Until then the page says "Not connected" and lets you type followers.
-- ⚠ The daily cron does nothing until an account is connected.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

-- §1 — THE CHANGE (verbatim from supabase/migrations/0247_crm_social.sql)

begin;

-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- 0247 — CRM SOCIAL (the owner's TikTok + Instagram: numbers, content pipeline, playbook)
--
-- PO 2026-09-30: "Build the social side in the CRM." Governed by
-- `Docs/Admin-Analytics-Amendment-003-Social.md` (AA-D23 – AA-D33).
--
-- ══ ⚠ THIS IS NOT THE APP'S SOCIAL PILLAR ══
--
--   `admin_social_health` (0130) is about squads and friends INSIDE the app. Everything here is about
--   the owner's public TikTok and Instagram accounts. The tables are `ops_social_*` and the functions
--   `admin_social_media` / `admin_social_<noun>_*`. Nothing here reads an athlete table (AA-D13).
--
-- ══ ONE RECORD: THE VIDEO, ONE POSTING PER PLATFORM (AA-D23) ══
--
--   ops_social_videos    — idea → scripted → filmed → scheduled → posted, its tags and its lesson
--   ops_social_postings  — one per platform a video goes out on: the date and that platform's numbers
--   Every page (pipeline, calendar, top videos, playbook) is a view of these two tables.
--
-- ══ HOW NUMBERS GET HERE (AA-D26) ══
--
--   The `social-sync` Edge Function signs the owner in to each platform, keeps the tokens in
--   `ops_social_accounts`, and writes followers into `ops_social_account_daily` and each video's
--   numbers into `ops_social_postings`. It runs on "Sync now" and once a day: `social_sync_tick()`
--   (pg_cron) posts to the function with `ops_social_config.cron_secret`. The function tells the
--   database its own URL the first time an admin calls it, so nothing here hard-codes a project.
--
--   ⚠ TOKENS NEVER LEAVE THE SERVER. `admin_social_media()` returns `connected` (a boolean), never a
--   token, and §5 asserts that. The tables are RLS on with ZERO policies (AA-D6): only the service
--   role (the Edge Function) and the definer functions below can read them.
--
-- ══ LINKS (AA-D27) ══
--
--   forgelegacy.app/go/tiktok and /go/instagram call `social_link_hit()` with the public anon key —
--   the same path as the site's early-access form (0215) — then forward. It adds one to a counter for
--   (platform, day) and can do nothing else. The early-access form then records that platform as its
--   `source`, which is what "early-access signups" on the Numbers page counts. No athlete is recorded.
--
-- Safe to run twice. Pasted as a whole via `supabase/apply/pending-0247.sql`.
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 1. TABLES
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.ops_social_accounts (
  platform           text primary key check (platform in ('tiktok', 'instagram')),
  handle             text check (handle is null or length(handle) <= 120),
  external_id        text check (external_id is null or length(external_id) <= 200),
  -- Written and read ONLY by the social-sync Edge Function (service role). Never returned by any RPC.
  access_token       text,
  refresh_token      text,
  token_expires_at   timestamptz,
  refresh_expires_at timestamptz,
  scopes             text,
  connected_at       timestamptz,
  last_sync_at       timestamptz,
  last_sync_ok       boolean,
  last_sync_message  text check (last_sync_message is null or length(last_sync_message) <= 500),
  updated_at         timestamptz not null default now()
);

-- One sign-in in flight: the random `state` the platform hands back, good for ten minutes.
create table if not exists public.ops_social_oauth_states (
  state       text primary key check (length(state) between 20 and 200),
  platform    text not null check (platform in ('tiktok', 'instagram')),
  admin_id    uuid not null,
  return_to   text check (return_to is null or length(return_to) <= 500),
  created_at  timestamptz not null default now()
);

-- One row. The function's own URL (it reports it) and the secret the daily cron proves itself with.
create table if not exists public.ops_social_config (
  id            boolean primary key default true check (id),
  function_url  text check (function_url is null or length(function_url) <= 500),
  cron_secret   text not null
                default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  updated_at    timestamptz not null default now()
);

insert into public.ops_social_config (id) values (true) on conflict (id) do nothing;

-- A dated snapshot per platform, so "followers gained" is the difference between two days.
create table if not exists public.ops_social_account_daily (
  platform       text not null check (platform in ('tiktok', 'instagram')),
  day            date not null,
  followers      integer check (followers is null or followers >= 0),
  reach          integer,
  profile_views  integer,
  link_taps      integer,
  source         text not null default 'sync' check (source in ('sync', 'typed')),
  updated_at     timestamptz not null default now(),
  primary key (platform, day)
);

create table if not exists public.ops_social_videos (
  id             uuid primary key default gen_random_uuid(),
  title          text not null check (length(title) between 1 and 200),
  topic          text check (topic is null or length(topic) <= 60),
  hook           text check (hook is null or length(hook) <= 60),
  format         text check (format is null or length(format) <= 60),
  length_s       integer check (length_s is null or length_s between 1 and 7200),
  stage          text not null default 'idea'
                 check (stage in ('idea', 'scripted', 'filmed', 'scheduled', 'posted', 'dropped')),
  first_line     text check (first_line is null or length(first_line) <= 500),
  notes          text check (notes is null or length(notes) <= 8000),
  lesson_tried   text check (lesson_tried is null or length(lesson_tried) <= 500),
  lesson_result  text check (lesson_result is null or length(lesson_result) <= 500),
  verdict        text check (verdict is null or verdict in ('keep', 'retest', 'kill')),
  -- Platforms it is meant for before it has a date on any of them.
  planned        text[] not null default '{}',
  -- Set when the sync found a post nobody planned: which platform it came in from. "Needs tags".
  imported_from  text check (imported_from is null or imported_from in ('tiktok', 'instagram')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists ops_social_videos_stage_idx on public.ops_social_videos (stage, updated_at desc);

create table if not exists public.ops_social_postings (
  id               uuid primary key default gen_random_uuid(),
  video_id         uuid not null references public.ops_social_videos (id) on delete cascade,
  platform         text not null check (platform in ('tiktok', 'instagram')),
  scheduled_for    date,
  posted_at        timestamptz,
  -- The platform's own id for the post. Null until it is up and the sync has seen it.
  external_id      text check (external_id is null or length(external_id) <= 200),
  url              text check (url is null or length(url) <= 500),
  caption          text check (caption is null or length(caption) <= 2300),
  duration_s       numeric(8, 2),
  views            bigint,
  likes            bigint,
  comments         bigint,
  shares           bigint,
  saves            bigint,
  reach            bigint,
  -- Instagram shares average watch TIME; the share of the video watched is this over the length.
  avg_watch_s      numeric(8, 2),
  -- TikTok shares neither, so the owner may type the percentage from the TikTok app (AA-D26).
  watch_pct_typed  numeric(5, 2) check (watch_pct_typed is null or watch_pct_typed between 0 and 100),
  synced_at        timestamptz,
  typed_at         timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (video_id, platform)
);

create unique index if not exists ops_social_postings_external_key
  on public.ops_social_postings (platform, external_id) where external_id is not null;
create index if not exists ops_social_postings_video_idx on public.ops_social_postings (video_id);

-- The operator's own short lists (AA-D24). Renaming one renames it on every video.
create table if not exists public.ops_social_tags (
  kind   text not null check (kind in ('topic', 'hook', 'format')),
  label  text not null check (length(label) between 1 and 60),
  sort   integer not null default 0,
  primary key (kind, label)
);

insert into public.ops_social_tags (kind, label, sort)
select v.kind, v.label, v.sort
  from (values
    ('topic', 'Holt', 1), ('topic', 'Transformation', 2), ('topic', 'Founder story', 3), ('topic', 'Feature demo', 4),
    ('hook', 'Result first', 1), ('hook', 'Before and after', 2), ('hook', 'Confession', 3), ('hook', 'Question', 4),
    ('hook', 'Story', 5), ('hook', 'Show it', 6), ('hook', 'Curiosity', 7),
    ('format', 'Screen recording', 1), ('format', 'Talking head', 2)
  ) as v(kind, label, sort)
 where not exists (select 1 from public.ops_social_tags);

create table if not exists public.ops_social_goals (
  platform         text primary key check (platform in ('tiktok', 'instagram')),
  posts_per_week   integer not null default 3 check (posts_per_week between 0 and 70),
  follower_target  integer check (follower_target is null or follower_target >= 0),
  target_date      date,
  updated_at       timestamptz not null default now()
);

insert into public.ops_social_goals (platform, posts_per_week) values ('tiktok', 4), ('instagram', 3)
on conflict (platform) do nothing;

-- Platform income: payouts and brand deals, typed by hand (AA-D29). Never summed with app revenue.
create table if not exists public.ops_social_income (
  id          uuid primary key default gen_random_uuid(),
  platform    text not null check (platform in ('tiktok', 'instagram')),
  what        text not null check (length(what) between 1 and 200),
  amount_usd  numeric(10, 2) not null,
  day         date not null default current_date,
  created_at  timestamptz not null default now()
);

-- What people keep asking, typed by hand from comments and messages (AA-D31).
create table if not exists public.ops_social_questions (
  id          uuid primary key default gen_random_uuid(),
  question    text not null check (length(question) between 1 and 300),
  platform    text check (platform is null or platform in ('tiktok', 'instagram')),
  times       integer not null default 1 check (times between 1 and 100000),
  video_id    uuid references public.ops_social_videos (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.ops_social_rivals (
  id          uuid primary key default gen_random_uuid(),
  who         text not null check (length(who) between 1 and 120),
  what        text not null check (length(what) between 1 and 300),
  why         text check (why is null or length(why) <= 1000),
  url         text check (url is null or length(url) <= 500),
  noted_on    date not null default current_date,
  created_at  timestamptz not null default now()
);

create table if not exists public.ops_social_rules (
  id          uuid primary key default gen_random_uuid(),
  body        text not null check (length(body) between 1 and 300),
  sort        integer not null default 0,
  created_at  timestamptz not null default now()
);

-- forgelegacy.app/go/<platform>: one counter per platform per UTC day. Nothing about who clicked.
create table if not exists public.ops_social_link_clicks (
  platform  text not null check (platform in ('tiktok', 'instagram')),
  day       date not null,
  clicks    integer not null default 0 check (clicks >= 0),
  primary key (platform, day)
);

alter table public.ops_social_accounts       enable row level security;
alter table public.ops_social_oauth_states   enable row level security;
alter table public.ops_social_config         enable row level security;
alter table public.ops_social_account_daily  enable row level security;
alter table public.ops_social_videos         enable row level security;
alter table public.ops_social_postings       enable row level security;
alter table public.ops_social_tags           enable row level security;
alter table public.ops_social_goals          enable row level security;
alter table public.ops_social_income         enable row level security;
alter table public.ops_social_questions      enable row level security;
alter table public.ops_social_rivals         enable row level security;
alter table public.ops_social_rules          enable row level security;
alter table public.ops_social_link_clicks    enable row level security;

comment on table public.ops_social_accounts is 'CRM Social (0247, AA-D26): the owner''s connected TikTok/Instagram account and its tokens. RLS on, no policies; tokens read only by the social-sync Edge Function.';
comment on table public.ops_social_videos   is 'CRM Social (0247, AA-D23): one row per video, idea to posted. RLS on, no policies.';
comment on table public.ops_social_postings is 'CRM Social (0247, AA-D23): one row per platform a video goes out on, with that platform''s numbers. RLS on, no policies.';
comment on table public.ops_social_link_clicks is 'CRM Social (0247, AA-D27): clicks on forgelegacy.app/go/<platform>, per day. Written only by social_link_hit().';

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 2. THE LINK COUNTER — the only thing the public site can do here.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.social_link_hit(p_platform text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_p text := lower(btrim(coalesce(p_platform, '')));
begin
  if v_p not in ('tiktok', 'instagram') then
    return;
  end if;
  insert into public.ops_social_link_clicks as c (platform, day, clicks)
  values (v_p, (now() at time zone 'UTC')::date, 1)
  on conflict (platform, day) do update set clicks = c.clicks + 1;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 3. THE CRM'S READ (AA-D5: admin_guard first, always)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

/*
 * Everything the three Social pages draw, in one read: it is one operator's two accounts, so the whole
 * thing is a few hundred rows and the pages filter it themselves (platform chips, date range, tags).
 *
 * ⚠ NO TOKEN IS EVER IN THIS PAYLOAD. `connected` is a boolean. §5 asserts the body never names a
 *   token column outside that one expression.
 */
create or replace function public.admin_social_media(p_tz text default 'UTC')
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_tz  text := coalesce(nullif(p_tz, ''), 'UTC');
  v_out jsonb;
begin
  perform public.admin_guard();

  select jsonb_build_object(
    'sync_ready', (select c.function_url is not null from public.ops_social_config c),
    'accounts', coalesce((select jsonb_agg(jsonb_build_object(
        'platform', a.platform, 'username', a.handle,
        'connected', a.access_token is not null,
        'connected_at', a.connected_at, 'last_sync_at', a.last_sync_at,
        'last_sync_ok', a.last_sync_ok, 'last_sync_message', a.last_sync_message) order by a.platform)
      from public.ops_social_accounts a), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(jsonb_build_object(
        'platform', d.platform, 'day', d.day, 'followers', d.followers, 'reach', d.reach,
        'profile_views', d.profile_views, 'link_taps', d.link_taps, 'source', d.source) order by d.day)
      from public.ops_social_account_daily d where d.day >= current_date - 760), '[]'::jsonb),
    'videos', coalesce((select jsonb_agg(jsonb_build_object(
        'id', v.id, 'title', v.title, 'topic', v.topic, 'hook', v.hook, 'format', v.format,
        'length_s', v.length_s, 'stage', v.stage, 'first_line', v.first_line, 'notes', v.notes,
        'lesson_tried', v.lesson_tried, 'lesson_result', v.lesson_result, 'verdict', v.verdict,
        'planned', v.planned, 'imported_from', v.imported_from,
        'created_at', v.created_at, 'updated_at', v.updated_at) order by v.created_at desc)
      from public.ops_social_videos v), '[]'::jsonb),
    'postings', coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.id, 'video_id', p.video_id, 'platform', p.platform,
        'scheduled_for', p.scheduled_for, 'posted_at', p.posted_at,
        'posted_day', (p.posted_at at time zone v_tz)::date,
        'linked', p.external_id is not null, 'url', p.url, 'caption', p.caption,
        'duration_s', p.duration_s, 'views', p.views, 'likes', p.likes, 'comments', p.comments,
        'shares', p.shares, 'saves', p.saves, 'reach', p.reach, 'avg_watch_s', p.avg_watch_s,
        'watch_pct_typed', p.watch_pct_typed, 'synced_at', p.synced_at, 'typed_at', p.typed_at)
        order by coalesce(p.posted_at, p.scheduled_for::timestamptz) desc nulls last)
      from public.ops_social_postings p), '[]'::jsonb),
    'tags', coalesce((select jsonb_agg(jsonb_build_object('kind', t.kind, 'label', t.label, 'sort', t.sort)
        order by t.kind, t.sort, t.label) from public.ops_social_tags t), '[]'::jsonb),
    'goals', coalesce((select jsonb_agg(jsonb_build_object(
        'platform', g.platform, 'posts_per_week', g.posts_per_week,
        'follower_target', g.follower_target, 'target_date', g.target_date) order by g.platform)
      from public.ops_social_goals g), '[]'::jsonb),
    'income', coalesce((select jsonb_agg(jsonb_build_object(
        'id', i.id, 'platform', i.platform, 'what', i.what, 'amount_usd', i.amount_usd, 'day', i.day)
        order by i.day desc, i.created_at desc) from public.ops_social_income i), '[]'::jsonb),
    'questions', coalesce((select jsonb_agg(jsonb_build_object(
        'id', q.id, 'question', q.question, 'platform', q.platform, 'times', q.times, 'video_id', q.video_id,
        'created_at', q.created_at) order by q.times desc, q.created_at desc)
      from public.ops_social_questions q), '[]'::jsonb),
    'rivals', coalesce((select jsonb_agg(jsonb_build_object(
        'id', r.id, 'who', r.who, 'what', r.what, 'why', r.why, 'url', r.url, 'noted_on', r.noted_on)
        order by r.noted_on desc, r.created_at desc) from public.ops_social_rivals r), '[]'::jsonb),
    'rules', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'body', r.body, 'sort', r.sort)
        order by r.sort, r.created_at) from public.ops_social_rules r), '[]'::jsonb),
    'clicks', coalesce((select jsonb_agg(jsonb_build_object('platform', c.platform, 'day', c.day, 'clicks', c.clicks)
        order by c.day) from public.ops_social_link_clicks c where c.day >= current_date - 760), '[]'::jsonb),
    -- Early-access signups that arrived through a platform link: a count per day, never an address.
    'waitlist', coalesce((select jsonb_agg(jsonb_build_object('platform', w.platform, 'day', w.day, 'n', w.n) order by w.day)
      from (select case when t.source like 'tiktok%' then 'tiktok' else 'instagram' end as platform,
                   (t.created_at at time zone v_tz)::date as day, count(*) as n
              from public.testflight_requests t
             where (t.source like 'tiktok%' or t.source like 'instagram%')
               and t.created_at >= now() - interval '760 days'
             group by 1, 2) w), '[]'::jsonb)
  ) into v_out;

  return v_out;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 4. THE CRM'S WRITES
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.admin_social_video_save(p_id uuid, p_patch jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid := p_id;
  v_p  jsonb := coalesce(p_patch, '{}'::jsonb);
  v_planned text[];
begin
  perform public.admin_guard();

  if v_p ? 'planned' then
    select coalesce(array_agg(distinct x), '{}') into v_planned
      from jsonb_array_elements_text(case when jsonb_typeof(v_p -> 'planned') = 'array' then v_p -> 'planned' else '[]'::jsonb end) x
     where x in ('tiktok', 'instagram');
  end if;

  if v_id is null then
    insert into public.ops_social_videos (title, topic, hook, format, length_s, stage, first_line, notes, planned)
    values (left(coalesce(nullif(btrim(v_p ->> 'title'), ''), 'Untitled video'), 200),
            nullif(btrim(v_p ->> 'topic'), ''), nullif(btrim(v_p ->> 'hook'), ''), nullif(btrim(v_p ->> 'format'), ''),
            nullif(v_p ->> 'length_s', '')::int,
            coalesce(nullif(v_p ->> 'stage', ''), 'idea'),
            nullif(btrim(v_p ->> 'first_line'), ''), nullif(btrim(v_p ->> 'notes'), ''),
            coalesce(v_planned, '{}'))
    returning id into v_id;
    return v_id;
  end if;

  update public.ops_social_videos v
     set title         = case when v_p ? 'title' then left(coalesce(nullif(btrim(v_p ->> 'title'), ''), v.title), 200) else v.title end,
         topic         = case when v_p ? 'topic' then nullif(btrim(v_p ->> 'topic'), '') else v.topic end,
         hook          = case when v_p ? 'hook' then nullif(btrim(v_p ->> 'hook'), '') else v.hook end,
         format        = case when v_p ? 'format' then nullif(btrim(v_p ->> 'format'), '') else v.format end,
         length_s      = case when v_p ? 'length_s' then nullif(v_p ->> 'length_s', '')::int else v.length_s end,
         stage         = case when v_p ? 'stage' then coalesce(nullif(v_p ->> 'stage', ''), v.stage) else v.stage end,
         first_line    = case when v_p ? 'first_line' then nullif(btrim(v_p ->> 'first_line'), '') else v.first_line end,
         notes         = case when v_p ? 'notes' then nullif(btrim(v_p ->> 'notes'), '') else v.notes end,
         lesson_tried  = case when v_p ? 'lesson_tried' then nullif(btrim(v_p ->> 'lesson_tried'), '') else v.lesson_tried end,
         lesson_result = case when v_p ? 'lesson_result' then nullif(btrim(v_p ->> 'lesson_result'), '') else v.lesson_result end,
         verdict       = case when v_p ? 'verdict' then nullif(v_p ->> 'verdict', '') else v.verdict end,
         planned       = case when v_p ? 'planned' then v_planned else v.planned end,
         updated_at    = now()
   where v.id = v_id;
  if not found then
    raise exception 'video % not found', v_id using errcode = 'P0002';
  end if;
  return v_id;
end;
$$;

create or replace function public.admin_social_video_delete(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.admin_guard();
  delete from public.ops_social_videos where id = p_id;
end;
$$;

/*
 * A posting: where and when a video goes out, and (only when the owner types them) its numbers.
 * Numbers in the patch stamp `typed_at`; a later sync overwrites what the platform shares and leaves
 * `watch_pct_typed` alone, because no platform call writes that column.
 */
create or replace function public.admin_social_posting_save(p_id uuid, p_patch jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id    uuid := p_id;
  v_p     jsonb := coalesce(p_patch, '{}'::jsonb);
  v_typed boolean := v_p ?| array['views', 'likes', 'comments', 'shares', 'saves', 'watch_pct_typed'];
begin
  perform public.admin_guard();

  if v_id is null then
    insert into public.ops_social_postings (video_id, platform, scheduled_for, posted_at, url)
    values ((v_p ->> 'video_id')::uuid, v_p ->> 'platform',
            nullif(v_p ->> 'scheduled_for', '')::date, nullif(v_p ->> 'posted_at', '')::timestamptz,
            nullif(btrim(v_p ->> 'url'), ''))
    on conflict (video_id, platform) do update
       set scheduled_for = coalesce(excluded.scheduled_for, public.ops_social_postings.scheduled_for),
           posted_at     = coalesce(excluded.posted_at, public.ops_social_postings.posted_at),
           updated_at    = now()
    returning id into v_id;
  end if;

  update public.ops_social_postings p
     set scheduled_for   = case when v_p ? 'scheduled_for' then nullif(v_p ->> 'scheduled_for', '')::date else p.scheduled_for end,
         posted_at       = case when v_p ? 'posted_at' then nullif(v_p ->> 'posted_at', '')::timestamptz else p.posted_at end,
         url             = case when v_p ? 'url' then nullif(btrim(v_p ->> 'url'), '') else p.url end,
         views           = case when v_p ? 'views' then nullif(v_p ->> 'views', '')::bigint else p.views end,
         likes           = case when v_p ? 'likes' then nullif(v_p ->> 'likes', '')::bigint else p.likes end,
         comments        = case when v_p ? 'comments' then nullif(v_p ->> 'comments', '')::bigint else p.comments end,
         shares          = case when v_p ? 'shares' then nullif(v_p ->> 'shares', '')::bigint else p.shares end,
         saves           = case when v_p ? 'saves' then nullif(v_p ->> 'saves', '')::bigint else p.saves end,
         watch_pct_typed = case when v_p ? 'watch_pct_typed' then nullif(v_p ->> 'watch_pct_typed', '')::numeric else p.watch_pct_typed end,
         typed_at        = case when v_typed then now() else p.typed_at end,
         updated_at      = now()
   where p.id = v_id;
  if not found then
    raise exception 'posting % not found', v_id using errcode = 'P0002';
  end if;
  return v_id;
end;
$$;

create or replace function public.admin_social_posting_delete(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.admin_guard();
  delete from public.ops_social_postings where id = p_id;
end;
$$;

/*
 * "This post is one of my planned videos": move a posting the sync imported onto the video it belongs
 * to. The planned video's empty placeholder for that platform (no platform id yet) gives way to the real
 * one and hands over its typed percentage. The imported shell, once empty, is removed.
 */
create or replace function public.admin_social_posting_attach(p_id uuid, p_video uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_post  public.ops_social_postings%rowtype;
  v_old   public.ops_social_postings%rowtype;
begin
  perform public.admin_guard();
  select * into v_post from public.ops_social_postings where id = p_id;
  if not found then
    raise exception 'posting % not found', p_id using errcode = 'P0002';
  end if;
  if v_post.video_id = p_video then
    return;
  end if;
  if not exists (select 1 from public.ops_social_videos where id = p_video) then
    raise exception 'video % not found', p_video using errcode = 'P0002';
  end if;

  select * into v_old from public.ops_social_postings where video_id = p_video and platform = v_post.platform;
  if found then
    if v_old.external_id is not null then
      raise exception 'that video already has a live % post', v_post.platform using errcode = '23505';
    end if;
    delete from public.ops_social_postings where id = v_old.id;
  end if;

  update public.ops_social_postings p
     set video_id = p_video,
         scheduled_for = coalesce(p.scheduled_for, v_old.scheduled_for),
         watch_pct_typed = coalesce(p.watch_pct_typed, v_old.watch_pct_typed),
         updated_at = now()
   where p.id = p_id;

  update public.ops_social_videos v set stage = 'posted', updated_at = now() where v.id = p_video;

  delete from public.ops_social_videos v
   where v.id = v_post.video_id and v.imported_from is not null
     and not exists (select 1 from public.ops_social_postings p where p.video_id = v.id);
end;
$$;

/* The other direction: the sync matched a post to the wrong plan. It becomes its own video again. */
create or replace function public.admin_social_posting_unlink(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_post public.ops_social_postings%rowtype;
  v_new  uuid;
begin
  perform public.admin_guard();
  select * into v_post from public.ops_social_postings where id = p_id;
  if not found then
    raise exception 'posting % not found', p_id using errcode = 'P0002';
  end if;
  if v_post.external_id is null then
    raise exception 'only a synced post can be unlinked' using errcode = '22023';
  end if;

  insert into public.ops_social_videos (title, stage, imported_from, length_s)
  values (left(coalesce(nullif(btrim(split_part(coalesce(v_post.caption, ''), E'\n', 1)), ''), 'Untitled post'), 200),
          'posted', v_post.platform, nullif(round(v_post.duration_s), 0)::int)
  returning id into v_new;

  update public.ops_social_postings p set video_id = v_new, updated_at = now() where p.id = p_id;

  -- The plan it was wrongly matched to gets its empty slot back, on the date it was planned for.
  insert into public.ops_social_postings (video_id, platform, scheduled_for)
  values (v_post.video_id, v_post.platform, v_post.scheduled_for)
  on conflict (video_id, platform) do nothing;

  update public.ops_social_videos v
     set stage = 'scheduled', updated_at = now()
   where v.id = v_post.video_id and v.stage = 'posted'
     and not exists (select 1 from public.ops_social_postings p where p.video_id = v.id and p.posted_at is not null);

  return v_new;
end;
$$;

/* p_old null = add; otherwise rename, and every video wearing the old label follows (AA-D24). */
create or replace function public.admin_social_tag_save(p_kind text, p_old text, p_new text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_new text := left(btrim(coalesce(p_new, '')), 60);
begin
  perform public.admin_guard();
  if p_kind not in ('topic', 'hook', 'format') or v_new = '' then
    raise exception 'bad tag' using errcode = '22023';
  end if;
  if p_old is null then
    insert into public.ops_social_tags (kind, label, sort)
    values (p_kind, v_new, coalesce((select max(sort) + 1 from public.ops_social_tags where kind = p_kind), 1))
    on conflict (kind, label) do nothing;
    return;
  end if;
  if p_old = v_new then
    return;
  end if;
  if exists (select 1 from public.ops_social_tags where kind = p_kind and label = v_new) then
    delete from public.ops_social_tags where kind = p_kind and label = p_old;
  else
    update public.ops_social_tags set label = v_new where kind = p_kind and label = p_old;
  end if;
  if p_kind = 'topic' then
    update public.ops_social_videos set topic = v_new, updated_at = now() where topic = p_old;
  elsif p_kind = 'hook' then
    update public.ops_social_videos set hook = v_new, updated_at = now() where hook = p_old;
  else
    update public.ops_social_videos set format = v_new, updated_at = now() where format = p_old;
  end if;
end;
$$;

/* Removes the label from the list. Videos already wearing it keep it. */
create or replace function public.admin_social_tag_delete(p_kind text, p_label text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.admin_guard();
  delete from public.ops_social_tags where kind = p_kind and label = p_label;
end;
$$;

create or replace function public.admin_social_goal_save(p_platform text, p_posts_per_week int, p_follower_target int, p_target_date date)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.admin_guard();
  insert into public.ops_social_goals as g (platform, posts_per_week, follower_target, target_date)
  values (p_platform, least(greatest(coalesce(p_posts_per_week, 0), 0), 70), p_follower_target, p_target_date)
  on conflict (platform) do update
     set posts_per_week = excluded.posts_per_week, follower_target = excluded.follower_target,
         target_date = excluded.target_date, updated_at = now();
end;
$$;

/* Followers typed by hand for a day — for the time before an account is connected. A sync replaces it. */
create or replace function public.admin_social_followers_save(p_platform text, p_day date, p_followers int)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.admin_guard();
  insert into public.ops_social_account_daily as d (platform, day, followers, source)
  values (p_platform, coalesce(p_day, current_date), greatest(coalesce(p_followers, 0), 0), 'typed')
  on conflict (platform, day) do update set followers = excluded.followers, source = 'typed', updated_at = now();
end;
$$;

/*
 * The four small operator lists — income, question, rival, rule — share one save and one delete:
 * each is a handful of text fields with no rule beyond "an admin wrote it".
 */
create or replace function public.admin_social_item_save(p_kind text, p_id uuid, p_patch jsonb)
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

  if p_kind = 'income' then
    if v_id is null then
      insert into public.ops_social_income (platform, what, amount_usd, day)
      values (v_p ->> 'platform', left(btrim(v_p ->> 'what'), 200), (v_p ->> 'amount_usd')::numeric,
              coalesce(nullif(v_p ->> 'day', '')::date, current_date))
      returning id into v_id;
    else
      update public.ops_social_income i
         set platform   = coalesce(v_p ->> 'platform', i.platform),
             what       = coalesce(nullif(left(btrim(v_p ->> 'what'), 200), ''), i.what),
             amount_usd = coalesce(nullif(v_p ->> 'amount_usd', '')::numeric, i.amount_usd),
             day        = coalesce(nullif(v_p ->> 'day', '')::date, i.day)
       where i.id = v_id;
    end if;

  elsif p_kind = 'question' then
    if v_id is null then
      insert into public.ops_social_questions (question, platform, times)
      values (left(btrim(v_p ->> 'question'), 300), nullif(v_p ->> 'platform', ''),
              greatest(coalesce(nullif(v_p ->> 'times', '')::int, 1), 1))
      returning id into v_id;
    else
      update public.ops_social_questions q
         set question   = coalesce(nullif(left(btrim(v_p ->> 'question'), 300), ''), q.question),
             platform   = case when v_p ? 'platform' then nullif(v_p ->> 'platform', '') else q.platform end,
             times      = greatest(coalesce(nullif(v_p ->> 'times', '')::int, q.times), 1),
             updated_at = now()
       where q.id = v_id;
    end if;

  elsif p_kind = 'rival' then
    if v_id is null then
      insert into public.ops_social_rivals (who, what, why, url)
      values (left(btrim(v_p ->> 'who'), 120), left(btrim(v_p ->> 'what'), 300),
              nullif(left(btrim(v_p ->> 'why'), 1000), ''), nullif(left(btrim(v_p ->> 'url'), 500), ''))
      returning id into v_id;
    else
      update public.ops_social_rivals r
         set who  = coalesce(nullif(left(btrim(v_p ->> 'who'), 120), ''), r.who),
             what = coalesce(nullif(left(btrim(v_p ->> 'what'), 300), ''), r.what),
             why  = case when v_p ? 'why' then nullif(left(btrim(v_p ->> 'why'), 1000), '') else r.why end,
             url  = case when v_p ? 'url' then nullif(left(btrim(v_p ->> 'url'), 500), '') else r.url end
       where r.id = v_id;
    end if;

  elsif p_kind = 'rule' then
    if v_id is null then
      insert into public.ops_social_rules (body, sort)
      values (left(btrim(v_p ->> 'body'), 300), coalesce((select max(sort) + 1 from public.ops_social_rules), 1))
      returning id into v_id;
    else
      update public.ops_social_rules r
         set body = coalesce(nullif(left(btrim(v_p ->> 'body'), 300), ''), r.body)
       where r.id = v_id;
    end if;

  else
    raise exception 'unknown kind %', p_kind using errcode = '22023';
  end if;

  return v_id;
end;
$$;

create or replace function public.admin_social_item_delete(p_kind text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.admin_guard();
  if p_kind = 'income' then
    delete from public.ops_social_income where id = p_id;
  elsif p_kind = 'question' then
    delete from public.ops_social_questions where id = p_id;
  elsif p_kind = 'rival' then
    delete from public.ops_social_rivals where id = p_id;
  elsif p_kind = 'rule' then
    delete from public.ops_social_rules where id = p_id;
  else
    raise exception 'unknown kind %', p_kind using errcode = '22023';
  end if;
end;
$$;

/* One tap from "people keep asking this" to an idea in the pipeline (AA-D31). */
create or replace function public.admin_social_question_to_video(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_q   public.ops_social_questions%rowtype;
  v_vid uuid;
begin
  perform public.admin_guard();
  select * into v_q from public.ops_social_questions where id = p_id;
  if not found then
    raise exception 'question % not found', p_id using errcode = 'P0002';
  end if;
  if v_q.video_id is not null then
    return v_q.video_id;
  end if;
  insert into public.ops_social_videos (title, stage, planned)
  values (left('Answer: “' || v_q.question || '”', 200), 'idea',
          case when v_q.platform is null then '{}'::text[] else array[v_q.platform] end)
  returning id into v_vid;
  update public.ops_social_questions set video_id = v_vid, updated_at = now() where id = p_id;
  return v_vid;
end;
$$;

/* Forget the sign-in. The handle, the history and every number stay; they just stop updating. */
create or replace function public.admin_social_disconnect(p_platform text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.admin_guard();
  update public.ops_social_accounts a
     set access_token = null, refresh_token = null, token_expires_at = null, refresh_expires_at = null,
         last_sync_message = null, updated_at = now()
   where a.platform = p_platform;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 5. THE DAILY SYNC — pg_cron posts to the Edge Function, which checks the secret.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.social_sync_tick()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cfg public.ops_social_config%rowtype;
begin
  select * into v_cfg from public.ops_social_config where id;
  if v_cfg.function_url is null then
    return;
  end if;
  if not exists (select 1 from public.ops_social_accounts where access_token is not null) then
    return;
  end if;
  perform net.http_post(
    url     := v_cfg.function_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_cfg.cron_secret),
    body    := jsonb_build_object('action', 'sync')
  );
end;
$$;

select cron.unschedule('forge-social-sync') where exists (select 1 from cron.job where jobname = 'forge-social-sync');
select cron.schedule('forge-social-sync', '10 9 * * *', $cron$ select public.social_sync_tick(); $cron$);

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 6. GRANTS — revoke from PUBLIC; the guard refuses a signed-in non-admin (0137's note).
--    social_link_hit alone goes to anon: the landing site is not signed in.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

revoke all on public.ops_social_accounts, public.ops_social_oauth_states, public.ops_social_config,
              public.ops_social_account_daily, public.ops_social_videos, public.ops_social_postings,
              public.ops_social_tags, public.ops_social_goals, public.ops_social_income,
              public.ops_social_questions, public.ops_social_rivals, public.ops_social_rules,
              public.ops_social_link_clicks
  from anon, authenticated;

revoke all on function public.social_link_hit(text) from public;
grant execute on function public.social_link_hit(text) to anon, authenticated;

revoke all on function public.social_sync_tick() from public, anon, authenticated;

do $$
declare
  f text;
begin
  foreach f in array array[
    'admin_social_media(text)',
    'admin_social_video_save(uuid, jsonb)',
    'admin_social_video_delete(uuid)',
    'admin_social_posting_save(uuid, jsonb)',
    'admin_social_posting_delete(uuid)',
    'admin_social_posting_attach(uuid, uuid)',
    'admin_social_posting_unlink(uuid)',
    'admin_social_tag_save(text, text, text)',
    'admin_social_tag_delete(text, text)',
    'admin_social_goal_save(text, int, int, date)',
    'admin_social_followers_save(text, date, int)',
    'admin_social_item_save(text, uuid, jsonb)',
    'admin_social_item_delete(text, uuid)',
    'admin_social_question_to_video(uuid)',
    'admin_social_disconnect(text)'
  ] loop
    execute format('revoke execute on function public.%s from public', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

commit;

-- §2 — THE ASSERTION: raise if anything is missing ─────────────────────────────────────────────
do $$
declare
  t text;
  f text;
  def text;
begin
  foreach t in array array[
    'ops_social_accounts', 'ops_social_oauth_states', 'ops_social_config', 'ops_social_account_daily',
    'ops_social_videos', 'ops_social_postings', 'ops_social_tags', 'ops_social_goals', 'ops_social_income',
    'ops_social_questions', 'ops_social_rivals', 'ops_social_rules', 'ops_social_link_clicks'
  ] loop
    if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                    where n.nspname = 'public' and c.relname = t and c.relrowsecurity) then
      raise exception '0247: % is missing or RLS is off', t;
    end if;
    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = t) then
      raise exception '0247: % has a policy; it must have none', t;
    end if;
  end loop;

  foreach f in array array[
    'admin_social_media(text)', 'admin_social_video_save(uuid, jsonb)', 'admin_social_video_delete(uuid)',
    'admin_social_posting_save(uuid, jsonb)', 'admin_social_posting_delete(uuid)',
    'admin_social_posting_attach(uuid, uuid)', 'admin_social_posting_unlink(uuid)',
    'admin_social_tag_save(text, text, text)', 'admin_social_tag_delete(text, text)',
    'admin_social_goal_save(text, int, int, date)', 'admin_social_followers_save(text, date, int)',
    'admin_social_item_save(text, uuid, jsonb)', 'admin_social_item_delete(text, uuid)',
    'admin_social_question_to_video(uuid)', 'admin_social_disconnect(text)',
    'social_link_hit(text)', 'social_sync_tick()'
  ] loop
    if to_regprocedure('public.' || f) is null then
      raise exception '0247: % is missing', f;
    end if;
  end loop;

  -- The read may say WHETHER an account is connected. It may never carry a token.
  def := pg_get_functiondef('public.admin_social_media(text)'::regprocedure);
  if position('refresh_token' in def) > 0 or position('cron_secret' in def) > 0
     or (length(def) - length(replace(def, 'access_token', ''))) / length('access_token') <> 1 then
    raise exception '0247: admin_social_media reads a token it must not';
  end if;

  if (select count(*) from cron.job where jobname = 'forge-social-sync') <> 1 then
    raise exception '0247: the daily sync job is not scheduled exactly once';
  end if;
end $$;

-- §3 — THE REPORT (read-only). Expect:  13 · 17 · 13 · 2 · 1 · 1 · 0 · 0
--      (on a second run, tags/goals/videos/accounts show whatever you have added since).
select
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname like 'ops\_social\_%' and c.relkind = 'r' and c.relrowsecurity) as tables_rls_on,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and (p.proname like 'admin\_social\_%' or p.proname in ('social_link_hit', 'social_sync_tick'))
      and p.proname <> 'admin_social_health')                                                            as functions,
  (select count(*) from public.ops_social_tags)                                                         as tags,
  (select count(*) from public.ops_social_goals)                                                        as goals,
  (select count(*) from cron.job where jobname = 'forge-social-sync')                                   as cron_jobs,
  (select count(*) from public.ops_social_config)                                                       as config_rows,
  (select count(*) from public.ops_social_accounts)                                                     as accounts,
  (select count(*) from public.ops_social_videos)                                                       as videos;
