-- ══════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0176: what actually broke, on whose phone, and what they did to get there
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once. Idempotent — safe to run twice
-- (`create table if not exists` + `create or replace` + `drop policy if exists`).
--
-- ⛔ DO NOT RUN THIS UNTIL THE PRIVACY DISCLOSURE IS PUBLISHED.
--
--   P6-A1-D8: the disclosure ships BEFORE the collection, not alongside it. A policy updated afterwards
--   was wrong for however long the gap lasted, and this is the one instruction here with no technical
--   enforcement — the SQL will run perfectly without it.
--
--   The text is already WRITTEN, in both places, in the same commit as this file:
--     • `Docs/Legal/Privacy-Policy.md`  § 2, "Diagnostics — when something goes wrong"
--     • `site/privacy.html`             § 2, same heading
--
--   ⚠ The second one is a SEPARATE SURFACE with a SEPARATE DEPLOY. `site/` is Cloudflare
--     (`npx wrangler deploy` from `site/`), NOT the Expo web preview. Writing the paragraph is not
--     publishing it. Confirm forgelegacy.app/privacy actually shows the Diagnostics heading before
--     running this file.
--
-- ⚠ THE CLIENT HALF IS ALREADY SHIPPED-SAFE. `data/errors-live.ts` disables itself for the life of the
--   process on `PGRST202` (the function does not exist). So deploying the app before applying this is
--   harmless — reporting is simply off. The reverse is also fine. There is no ordering hazard between
--   the two halves; only the privacy one above is real.
--
-- ⚠ AND ONE GRANT IS DELIBERATE AND WILL LOOK WRONG:
--
--     `report_client_error` is granted to **anon**.
--
--   It is the only anon-executable function in the schema and it is intentional — the worst outage this
--   project has shipped was a LAUNCH crash, which happens before a session exists, and a report that
--   needs `auth.uid()` would have thrown that one away. `user_id` comes from `auth.uid()` inside the
--   function and is never a parameter, so nobody can file a report against anyone else. Two rate limits
--   (30/hour per session, 5000/hour globally) are what make it safe rather than reckless.
--
--   ⛔ It WILL appear in `supabase/apply/audit-anon-executable-functions.sql`. Do not "fix" it.
--
-- WHAT YOU SHOULD SEE in Messages, in this order:
--   0176: retention job scheduled (forge-client-errors-prune, 04:50 daily).
--   0176 OK: both tables, RLS, the anon+authenticated writer (insert proven end to end), all three
--            admin functions and the prune are present.
--
--   ⚠ If pg_cron is not installed you get a NOTICE instead of the first line, saying the 90-day
--     retention sentence is not enforced. The table still works. Do not ignore it — the privacy policy
--     makes that promise in writing.
--
--   ⚠ The self-check INSERTS a real row through `report_client_error` and then deletes it. That is on
--     purpose: "the function exists" and "the function inserts" are different facts, and this project
--     has shipped the first while believing the second. If it returns null, the migration fails loudly.
--
-- AFTER RUNNING, verify by hand (predicted answers before you run them):
--
--   select jsonb_pretty(public.admin_client_errors(7, 50));
--     → `counts.ever_any` NULL, `rows` []. That is correct on a fresh install and means nothing has EVER
--       been reported. ⚠ Once the client is deployed and someone has used the app, a NULL here stops
--       being good news and becomes the bug — it means the reporter is not reaching the database.
--
--   select jobname, active from cron.job where jobname = 'forge-client-errors-prune';
--     → one row, active = true.
--
--   node supabase/seed/admin-roundtrip.mjs
--     → all three new admin_* functions refuse a non-admin with 42501.
--
-- Depends on 0129 (the admin gate) and 0001 (profiles). pg_cron (0120) optional, degrades with a notice.
-- ══════════════════════════════════════════════════════════════════════════════════════════

-- Forge Legacy — 0176: what actually broke, on whose phone, and what they did to get there
--
-- ══ WHAT THIS CLOSES ══
--
-- PO, 2026-08-21: *"sometimes we're guessing at what the error is … catch the exact path they're going in
-- instead of having to ask them, but we capture on the back end and are able to fix it right away."*
--
-- The guessing is documented. `Forge-Legacy-Master-Status.md` records the "THE APP IS FROZEN" week:
-- **the diagnosis was wrong twice** — a missing `profiles` row (disproved by one query) and an RLS block
-- (disproved by `.single()` erroring rather than returning null) — before the survivor turned out to be
-- the last line of `routeFor`. Three of the first 28 accounts were trapped and **TestFlight showed
-- `Crashes: –` throughout**, because nothing crashed. Three controls silently did nothing.
--
-- That is the shape of the problem. This app's characteristic failure is NOT a native crash — Apple
-- already reports those. It is a JS fault, or a control that quietly no-ops, on a device nobody can
-- attach a debugger to, described second-hand by an athlete who has no reason to know what a stack trace
-- is. `src/components/screen-boundary.tsx` already catches the throw and prints it to a console that, on
-- a tester's phone, nobody will ever read. This table is where that console goes.
--
-- ══ WHY A TABLE AND NOT SENTRY ══
--
-- Sentry is the better long-term answer and is planned for the next NATIVE build. It cannot be the answer
-- today: `@sentry/react-native` carries a native module, so it cannot ride an `eas update`, and every
-- tester is on build 6. A Postgres table is reachable from the JS bundle, which means this ships over OTA
-- to the people who are hitting bugs right now. The two are complements — see `Docs/Error-Reporting.md`.
--
-- ══ ⚠ THE PRIVACY LINE, AND IT IS NOT THE ONE `0167` DREW ══
--
--   `app_events` (0131)  — allowlisted. Never a word the athlete wrote. Enforced in `props-core.ts`.
--   `feedback`   (0167)  — deliberate FREE TEXT. A support message is only useful in their own words.
--   `client_errors` (here) — the FIRST case, with ONE carve-out.
--
-- `breadcrumbs` follows 0131's rule exactly: route shapes, enum-shaped action names, ids. PO decision
-- 2026-08-21, chosen over an "everything including input" option that was offered and declined. It is
-- enforced client-side in `src/domain/diagnostics/breadcrumb-core.ts` and tested there — this table
-- cannot inspect meaning, and the `pg_column_size` checks below are a blast radius, not the rule.
--
-- The carve-out is `message` and `stack`. An error message IS the payload; redacting it leaves a
-- timestamp attached to nothing, which is the mistake 0167's header names about `feedback.body`. A
-- message can incidentally contain athlete text (`invalid input value "Push Day A"`), and that is
-- accepted deliberately — it is diagnostic exhaust, not a record of what they did, it is bounded at
-- 2000 characters, and it is pruned at 90 days like everything else.
--
-- ⚠ `site/privacy.html` § 2 must carry a "Diagnostics" paragraph BEFORE this migration is applied.
--   P6-A1-D8 makes the disclosure ship ahead of the collection, and 0131's header refuses to let that be
--   a footnote. This is the same instruction, and it has the same lack of technical enforcement.
--
-- ══ WHY `user_id` IS NULLABLE, WHICH NO OTHER TABLE IN THIS SCHEMA ALLOWS ══
--
-- The single worst incident this project has had was a LAUNCH crash: `CoachBubble` called
-- `useSafeAreaInsets()` with no provider above it and the app failed to open on device, with every
-- automated gate green (`src/components/overlay-boundary.tsx` carries the story). At that instant there
-- is no session, `auth.uid()` is null, and a `not null` column would have thrown away the one report
-- worth having. So the writer is a SECURITY DEFINER function granted to `anon` — and the rate limit
-- below is what makes that safe rather than reckless.
--
-- Depends on 0129 (the admin gate) and 0001 (profiles). pg_cron (0120) is OPTIONAL and degrades.
-- Idempotent throughout. RUN AFTER 0175.

begin;

-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- 0. THE GATE — restated verbatim from 0129 so this file stands alone (the 0137/0167 precedent)
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════

create table if not exists public.app_admins (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  granted_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;
-- ⚠ NO POLICIES. NOT AN OMISSION — see 0129's header (AA-D6).

create or replace function public.is_app_admin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.app_admins a where a.user_id = auth.uid());
$$;

create or replace function public.admin_guard()
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_app_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
end;
$$;

-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- 1. THE TABLE
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════

create table if not exists public.client_errors (
  id           bigint generated always as identity primary key,

  -- ⚠ NULLABLE, and the only nullable owner column in this schema. See the header — a launch crash
  --   happens before there is a session, and that is the report that matters most.
  user_id      uuid references public.profiles (id) on delete cascade,

  -- ⭐ THE SAME session_id `app_events` (0131) MINTS, and that is the highest-value column here.
  --   It means an error row JOINS to the athlete's product-usage trail for the same sitting, so the
  --   40 crumbs this row carries can be extended backwards across the whole session when 40 is not
  --   enough. Random per app session, minted on the client, not a device id.
  session_id   uuid not null,

  -- ── which bug is this ──────────────────────────────────────────────────────
  --
  -- Computed on the CLIENT (`fingerprintError`) from name + normalised message + our own top stack
  -- frame. It is what turns a list of 400 rows into "eleven bugs, one of them hit 312 times".
  fingerprint  text not null check (length(fingerprint) between 4 and 64),

  name         text not null default 'Error' check (length(name) <= 60),
  message      text not null check (length(btrim(message)) between 1 and 2000),
  stack        text check (stack is null or length(stack) <= 8000),
  -- React's own "the component tree above the throw", which `componentDidCatch` supplies and a raw
  -- stack does not. It is usually the faster read of the two.
  component_stack text check (component_stack is null or length(component_stack) <= 8000),

  -- ── where ──────────────────────────────────────────────────────────────────
  --
  -- Route SHAPE, not the instance: `/squad/[id]`, never `/squad/9f3c…`.
  screen       text check (screen is null or length(screen) <= 120),

  -- Which door the report came in by. Enumerated because it changes how you read the row: a `boundary`
  -- error was survivable and the athlete saw a message; a `global` one may have taken the app down.
  source       text not null default 'global'
               check (source in ('global', 'boundary', 'overlay', 'rejection', 'query', 'manual')),
  -- Did the app die. `false` for anything a boundary caught.
  fatal        boolean not null default false,

  -- ── the trail ──────────────────────────────────────────────────────────────
  --
  -- ⚠ ROUTE + ACTION + IDS ONLY. Never athlete-authored text. Enforced in
  --   `src/domain/diagnostics/breadcrumb-core.ts`, tested in its `__tests__`. This constraint is a
  --   blast radius limit for a client bug or a bypass, NOT the rule.
  breadcrumbs  jsonb not null default '[]'::jsonb
               check (jsonb_typeof(breadcrumbs) = 'array' and pg_column_size(breadcrumbs) < 8192),

  -- ── which build ────────────────────────────────────────────────────────────
  --
  -- ⭐ `update_id` IS THE COLUMN THAT ANSWERS "did my fix work". This project ships OTA updates on top
  --   of a native build, so `app_version` alone is ambiguous — every OTA since build 6 reports 1.0.0.
  --   `Updates.updateId` names the exact bundle, so "no occurrences on the new update id" is a real
  --   answer instead of a hope. `runtime_version` is the fingerprint the OTA was published against.
  platform     text check (platform is null or platform in ('ios', 'android', 'web')),
  app_version  text check (app_version is null or length(app_version) <= 32),
  update_id    text check (update_id is null or length(update_id) <= 64),
  runtime_version text check (runtime_version is null or length(runtime_version) <= 64),
  channel      text check (channel is null or length(channel) <= 32),
  -- Model and OS only — `iPhone15,2` / `18.2`. Deliberately NOT `Device.deviceName`, which is
  -- "Isaiah's iPhone" and identifies a person rather than a configuration.
  device_model text check (device_model is null or length(device_model) <= 64),
  os_version   text check (os_version is null or length(os_version) <= 32),

  -- ── two clocks, and the difference is load-bearing (0131's rule, verbatim) ──
  --
  --   `occurred_at`  the DEVICE's clock. Can be wrong by years. Trustworthy ONLY for ordering within
  --                  one session_id.
  --   `received_at`  the SERVER's clock. EVERY COUNT AND EVERY "last seen" IS COMPUTED FROM THIS ONE.
  occurred_at  timestamptz not null default now(),
  received_at  timestamptz not null default now()
);

comment on table public.client_errors is
  'Client-side error reports with a breadcrumb trail (0176). `breadcrumbs` obeys the 0131 rule — route shapes, enum action names and ids, never athlete-authored text, enforced in src/domain/diagnostics/breadcrumb-core.ts. `message`/`stack` are the deliberate carve-out: an error message IS the payload. user_id is NULLABLE so a launch crash before session restore is still captured. Written only by report_client_error(); read only by the admin_client_error* functions and by its own subject. Pruned at 90 days.';

-- Append-only in `received_at` order forever — exactly what BRIN is for, at a fraction of a btree.
create index if not exists client_errors_received_brin on public.client_errors using brin (received_at);
-- The dashboard's own query: group by bug, newest first.
create index if not exists client_errors_fingerprint_time on public.client_errors (fingerprint, received_at desc);
-- "is this still happening on the update I just shipped"
create index if not exists client_errors_update_time on public.client_errors (update_id, received_at desc)
  where update_id is not null;
-- The athlete's own read of their own rows, and the FK cascade's lookup.
create index if not exists client_errors_user_time on public.client_errors (user_id, received_at desc)
  where user_id is not null;
-- The rate limiter's probe. Partial and time-ordered so it stays small.
create index if not exists client_errors_session_time on public.client_errors (session_id, received_at desc);

-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- 2. THE OPERATOR'S WORKFLOW STATE — keyed by BUG, not by occurrence
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHY THIS IS A SECOND TABLE AND NOT A COLUMN ══
--
-- `feedback.status` (0167) is per-row because each message is its own thing to answer. An error is the
-- opposite: 312 rows are ONE bug, and marking it fixed has to mark the bug, not 312 rows.
--
-- ⭐ AND IT DELIBERATELY DOES NOT RESET. A new occurrence after you marked something FIXED does not flip
--    it back to NEW — it leaves the status alone and moves `last_seen`. That asymmetry is the point: the
--    dashboard can then say **"marked FIXED on the 19th, 4 occurrences since"**, which is the single
--    most useful sentence an error tracker can produce and one that a self-resetting status can never
--    say. It is how you learn a fix did not take, instead of re-triaging the same row forever.

create table if not exists public.client_error_status (
  fingerprint text primary key check (length(fingerprint) between 4 and 64),
  status      text not null default 'NEW' check (status in ('NEW', 'ACKED', 'FIXED', 'IGNORED')),
  -- Free text for the operator, who is the only reader. Not athlete data.
  note        text check (note is null or length(note) <= 500),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id) on delete set null
);

alter table public.client_error_status enable row level security;
-- ⚠ NO POLICIES, like `app_admins`. Deny-by-default: this is operator state and no athlete has any
--   business reading which of our bugs we have admitted to. Reached only through definer functions.

comment on table public.client_error_status is
  'Operator triage state per BUG (fingerprint), not per occurrence — 312 rows are one bug. RLS enabled with zero policies on purpose (the app_admins precedent, AA-D6): this is operator state. ⚠ Status does NOT reset when a fixed bug recurs — that is what lets the dashboard say "marked FIXED, 4 occurrences since".';

-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- 3. RLS ON THE REPORTS
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
--
-- No INSERT policy: every write goes through `report_client_error()`, which is SECURITY DEFINER and
-- therefore not subject to RLS. That indirection is not ceremony — it is what lets an anonymous,
-- pre-session launch crash be recorded without granting `anon` a direct INSERT on a public table.
--
-- ⚠ The own-row SELECT is the same right of access `feedback` and `app_events` grant. `site/privacy.html`
--   § 7 promises it; a table you can be written into but never read would make that promise false.
--   It is `user_id = auth.uid()` and never `user_id is null`, so anonymous rows belong to nobody and
--   are readable only by the operator — which is correct, since nobody can prove they authored one.

alter table public.client_errors enable row level security;

drop policy if exists client_errors_select_own on public.client_errors;
create policy client_errors_select_own on public.client_errors
  for select to authenticated
  using (user_id = auth.uid());

-- No UPDATE policy and no DELETE policy. An append-only log its subject can rewrite is not a log
-- (0131's words). Deleting the account removes every row via the FK cascade.

-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- 4. THE WRITER
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ ⚠ THIS IS THE ONE FUNCTION IN THE SCHEMA CALLABLE BY `anon`, SO READ THE LIMITS ══
--
-- Two of them, and they answer different threats.
--
--   PER SESSION (30/hour) — the honest failure. A render loop can throw hundreds of times a second, and
--   without this one athlete's one bug would write a million rows in an afternoon. The CLIENT also
--   de-duplicates, but a client is exactly the thing that is broken when this table is being written to,
--   so the limit that matters is the one here.
--
--   GLOBAL (5000/hour) — the malicious one. `session_id` is client-minted, so anyone with the anon key
--   (which is in the web bundle, by design) can rotate it and defeat the per-session cap. This is the
--   circuit breaker that keeps that from being a disk-fill. 5000/hour is far above anything 28 testers
--   can generate and far below anything that costs money.
--
-- ⚠ BOTH LIMITS RETURN QUIETLY RATHER THAN RAISING. That is the opposite of `feedback_tg_rate_limit`,
--   which raises so the athlete is never told their support message was sent when it was not. Here
--   nobody is waiting on an answer, and a throw inside an error reporter is how a reporter becomes the
--   crash — the caller is, by definition, already handling an error.

create or replace function public.report_client_error(
  p_session_id      uuid,
  p_fingerprint     text,
  p_name            text,
  p_message         text,
  p_stack           text default null,
  p_component_stack text default null,
  p_screen          text default null,
  p_source          text default 'global',
  p_fatal           boolean default false,
  p_breadcrumbs     jsonb default '[]'::jsonb,
  p_platform        text default null,
  p_app_version     text default null,
  p_update_id       text default null,
  p_runtime_version text default null,
  p_channel         text default null,
  p_device_model    text default null,
  p_os_version      text default null,
  p_occurred_at     timestamptz default null
)
returns bigint
language plpgsql
security definer
volatile
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_recent int;
  v_global int;
  v_id     bigint;
  v_msg    text := left(btrim(coalesce(p_message, '')), 2000);
  v_crumbs jsonb := coalesce(p_breadcrumbs, '[]'::jsonb);
begin
  -- Nothing to record. Return null rather than raising: see the header.
  if p_session_id is null or p_fingerprint is null or v_msg = '' then
    return null;
  end if;

  -- Defence in depth against a client that sends the wrong shape. The column CHECK would reject an
  -- object and take the whole report with it; coercing to an empty array keeps the stack trace.
  if jsonb_typeof(v_crumbs) is distinct from 'array' or pg_column_size(v_crumbs) >= 8192 then
    v_crumbs := '[]'::jsonb;
  end if;

  select count(*) into v_recent
    from public.client_errors
   where session_id = p_session_id
     and received_at > now() - interval '1 hour';
  if v_recent >= 30 then
    return null;
  end if;

  select count(*) into v_global
    from public.client_errors
   where received_at > now() - interval '1 hour';
  if v_global >= 5000 then
    return null;
  end if;

  insert into public.client_errors (
    user_id, session_id, fingerprint, name, message, stack, component_stack,
    screen, source, fatal, breadcrumbs,
    platform, app_version, update_id, runtime_version, channel, device_model, os_version,
    occurred_at
  ) values (
    -- ⚠ `auth.uid()`, never a caller-supplied id. A definer function that accepted a uuid would let
    --   anyone file an error report against anyone — the exact footgun 0120's grants block documents
    --   about `notification_events_for(uuid)`.
    v_uid,
    p_session_id,
    left(btrim(p_fingerprint), 64),
    coalesce(nullif(left(btrim(coalesce(p_name, '')), 60), ''), 'Error'),
    v_msg,
    left(p_stack, 8000),
    left(p_component_stack, 8000),
    left(p_screen, 120),
    case when coalesce(p_source, '') in ('global', 'boundary', 'overlay', 'rejection', 'query', 'manual')
         then p_source else 'global' end,
    coalesce(p_fatal, false),
    v_crumbs,
    case when p_platform in ('ios', 'android', 'web') then p_platform else null end,
    left(p_app_version, 32),
    left(p_update_id, 64),
    left(p_runtime_version, 64),
    left(p_channel, 32),
    left(p_device_model, 64),
    left(p_os_version, 32),
    -- A device clock years in the future would sort above every real row forever. Clamp rather than
    -- reject: the row is still worth having, and `received_at` is what every read actually uses.
    case when p_occurred_at is null or p_occurred_at > now() + interval '1 day'
              or p_occurred_at < now() - interval '30 days'
         then now() else p_occurred_at end
  )
  returning id into v_id;

  -- Open a triage row the first time a bug is ever seen, so the dashboard's left join always has
  -- something and "NEW" is a real state rather than a null rendered as one.
  insert into public.client_error_status (fingerprint)
  values (left(btrim(p_fingerprint), 64))
  on conflict (fingerprint) do nothing;

  return v_id;
exception
  -- ⛔ A REPORTER THAT THROWS IS A SECOND CRASH. The caller is already inside a failure; there is no
  --    outcome here worth propagating. This is the last line of defence behind the client's own
  --    try/catch, and it is deliberate.
  when others then
    return null;
end;
$$;

comment on function public.report_client_error is
  'The ONLY writer of client_errors (0176). SECURITY DEFINER and granted to anon as well as authenticated, so a launch crash before session restore is still captured — user_id comes from auth.uid() and is never a parameter. Rate limited twice: 30/hour per session_id (a render loop) and 5000/hour globally (a rotating-session abuser). Both limits, and every internal error, return null QUIETLY — a reporter that raises becomes the crash it was reporting.';

-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- 5. THE ADMIN READ MODELS
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
--
-- ⚠ ADDING AN admin_* FUNCTION MEANS ADDING ITS NAME TO `supabase/seed/admin-roundtrip.mjs` IN THE SAME
--   COMMIT (0130's standing rule, restated in 0167 after three functions were missed). That script loops
--   every admin function as a non-admin and asserts 42501. All three below are added. Done.
--
-- ══ AA-D2 ══
--
-- `admin_client_error_detail` returns a NAMED athlete, and that is the same argument 0167 makes: AA-D2
-- forbids a named athlete beside PERFORMANCE — "a volume number, a challenge standing, a leaderboard
-- position, or a rank". A crash report is not performance data, and "which three accounts are trapped in
-- onboarding" is a question you cannot act on without knowing which three. The list view below is
-- aggregate-only and names nobody; identity appears one level down, where you are working a specific
-- bug. Joining a training figure onto either would be the actual breach.

-- ── 5a. The list: one row per BUG ────────────────────────────────────────────
create or replace function public.admin_client_errors(
  p_days   int default 7,
  p_limit  int default 50,
  p_status text default null
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_days   int  := least(greatest(coalesce(p_days, 7), 1), 90);
  v_limit  int  := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_status text := nullif(btrim(coalesce(p_status, '')), '');
  v_since  timestamptz;
  v_rows   jsonb;
  v_counts jsonb;
begin
  perform public.admin_guard();
  v_since := now() - make_interval(days => v_days);

  select coalesce(jsonb_agg(g order by g.last_seen desc), '[]'::jsonb)
    into v_rows
    from (
      select e.fingerprint,
             count(*)                                            as occurrences,
             -- ⭐ The number that decides what to fix first. 200 crashes from one tester is a bad
             --    afternoon; 12 crashes across 12 people is a release blocker.
             count(distinct e.user_id)                           as athletes,
             count(*) filter (where e.fatal)                     as fatal_count,
             min(e.received_at)                                  as first_seen,
             max(e.received_at)                                  as last_seen,
             -- The most recent sample's identifying fields, so the list reads without a second call.
             (array_agg(e.name       order by e.received_at desc))[1] as name,
             (array_agg(e.message    order by e.received_at desc))[1] as message,
             (array_agg(e.screen     order by e.received_at desc))[1] as screen,
             (array_agg(e.source     order by e.received_at desc))[1] as source,
             (array_agg(e.platform   order by e.received_at desc))[1] as platform,
             (array_agg(e.app_version order by e.received_at desc))[1] as app_version,
             -- Which builds it has been seen on, newest first. ⭐ This is the "did my fix work" column:
             -- a bug whose update_id list does not include the one you just shipped is fixed.
             (select coalesce(jsonb_agg(distinct u), '[]'::jsonb)
                from (select e2.update_id as u
                        from public.client_errors e2
                       where e2.fingerprint = e.fingerprint
                         and e2.received_at >= v_since
                         and e2.update_id is not null
                       limit 20) s)                              as update_ids,
             coalesce(st.status, 'NEW')                          as status,
             st.note                                             as note,
             st.updated_at                                       as status_at,
             -- ⭐ Occurrences AFTER the operator last touched this bug. Non-zero on a FIXED row means
             --    the fix did not take, and that sentence is the whole reason status does not reset.
             count(*) filter (where st.updated_at is not null and e.received_at > st.updated_at)
                                                                 as since_status
        from public.client_errors e
        left join public.client_error_status st on st.fingerprint = e.fingerprint
       where e.received_at >= v_since
         and (v_status is null or coalesce(st.status, 'NEW') = v_status)
       group by e.fingerprint, st.status, st.note, st.updated_at
       order by max(e.received_at) desc
       limit v_limit
    ) g;

  select jsonb_build_object(
    'occurrences', count(*),
    'bugs',        count(distinct fingerprint),
    'athletes',    count(distinct user_id),
    'fatal',       count(*) filter (where fatal),
    -- ⚠ The honest-zero guard (0167's). A null means nothing has EVER been reported, which a bare 0
    --   cannot distinguish from "the client half was never deployed" — a state this project has
    --   shipped before and spent a day misreading.
    'newest_at',   max(received_at),
    'ever_any',    (select max(received_at) from public.client_errors)
  ) into v_counts
  from public.client_errors
  where received_at >= v_since;

  return jsonb_build_object('rows', v_rows, 'counts', v_counts, 'days', v_days, 'status', v_status);
end;
$$;

comment on function public.admin_client_errors(int, int, text) is
  'The operator error list, one row per BUG (fingerprint) rather than per occurrence. Aggregate only — names no athlete (AA-D2). `athletes` is the triage number: many people hitting one bug outranks one person hitting it many times. `since_status` counts occurrences after the last triage action, which is how you learn a fix did not take. Gated by admin_guard() (0129).';

-- ── 5b. The detail: one bug, with the trail ──────────────────────────────────
create or replace function public.admin_client_error_detail(
  p_fingerprint text,
  p_limit       int default 20
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_fp    text := left(btrim(coalesce(p_fingerprint, '')), 64);
  v_limit int  := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_rows  jsonb;
begin
  perform public.admin_guard();

  if v_fp = '' then
    raise exception 'a fingerprint is required' using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(r order by r.received_at desc), '[]'::jsonb)
    into v_rows
    from (
      select e.id, e.name, e.message, e.stack, e.component_stack,
             e.screen, e.source, e.fatal,
             -- ⭐ THE TRAIL. This is the answer to "what path were they on" and the reason the whole
             --    system exists. Route shapes and enum action names only — see the table comment.
             e.breadcrumbs,
             e.platform, e.app_version, e.update_id, e.runtime_version, e.channel,
             e.device_model, e.os_version,
             e.occurred_at, e.received_at,
             e.session_id,
             -- Identity, because "which accounts are affected" is the actionable half of a bug report.
             -- Handle and name ONLY, and never beside a training figure. See the AA-D2 note above.
             p.handle as athlete_handle,
             p.name   as athlete_name
        from public.client_errors e
        left join public.profiles p on p.id = e.user_id
       where e.fingerprint = v_fp
       order by e.received_at desc
       limit v_limit
    ) r;

  return jsonb_build_object(
    'fingerprint', v_fp,
    'rows', v_rows,
    'status', (select jsonb_build_object('status', s.status, 'note', s.note, 'updated_at', s.updated_at)
                 from public.client_error_status s where s.fingerprint = v_fp)
  );
end;
$$;

comment on function public.admin_client_error_detail(text, int) is
  'The most recent occurrences of ONE bug, each with its full stack and its breadcrumb trail. Returns the athlete''s handle and name — not an AA-D2 breach, which concerns a named athlete beside performance data (the 0167 precedent); you cannot act on "three accounts are trapped" without knowing which three. Gated by admin_guard() (0129).';

-- ── 5c. Triage ───────────────────────────────────────────────────────────────
create or replace function public.admin_client_error_set_status(
  p_fingerprint text,
  p_status      text,
  p_note        text default null
)
returns jsonb
language plpgsql
security definer
volatile
set search_path = public, pg_temp
as $$
declare
  v_fp     text := left(btrim(coalesce(p_fingerprint, '')), 64);
  v_status text := upper(btrim(coalesce(p_status, '')));
  v_row    public.client_error_status;
begin
  perform public.admin_guard();

  if v_status not in ('NEW', 'ACKED', 'FIXED', 'IGNORED') then
    raise exception 'unknown error status: %', v_status using errcode = '22023';
  end if;
  if v_fp = '' then
    raise exception 'a fingerprint is required' using errcode = '22023';
  end if;

  insert into public.client_error_status (fingerprint, status, note, updated_at, updated_by)
  values (v_fp, v_status, left(p_note, 500), now(), auth.uid())
  on conflict (fingerprint) do update
    set status = excluded.status,
        note = coalesce(excluded.note, public.client_error_status.note),
        updated_at = now(),
        updated_by = excluded.updated_by
  returning * into v_row;

  return jsonb_build_object('fingerprint', v_row.fingerprint, 'status', v_row.status,
                            'note', v_row.note, 'updated_at', v_row.updated_at);
end;
$$;

comment on function public.admin_client_error_set_status(text, text, text) is
  'Moves one BUG through NEW → ACKED → FIXED (or IGNORED). Keyed by fingerprint, so it triages the bug rather than 312 occurrences of it. The only writer of client_error_status — the table has RLS on with zero policies, so nothing else can. Gated by admin_guard() (0129).';

-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- 6. GRANTS
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
--
-- ⚠ Revoke FROM PUBLIC, never from `authenticated` — Postgres grants EXECUTE to PUBLIC on every new
-- function, and revoking from a role that never held a direct grant removes nothing (0120, 0129, 0130,
-- 0137, 0167 all carry this note).
--
-- ⚠⚠ AND ONE MORE, FROM THE `evaluate_honors` INCIDENT: a `revoke ... from public` on a function that is
--    CALLED BY another definer function is fine, because the callee runs as the definer's owner — but a
--    revoke on the function the CLIENT calls kills the feature with every gate still green. The client
--    calls `report_client_error` directly. It must keep both grants below.
--
-- `report_client_error` is granted to `anon` DELIBERATELY. See §4's header — a launch crash has no
-- session, and the rate limits are what make that safe.

revoke execute on function public.report_client_error(uuid, text, text, text, text, text, text, text, boolean, jsonb, text, text, text, text, text, text, text, timestamptz) from public;
grant  execute on function public.report_client_error(uuid, text, text, text, text, text, text, text, boolean, jsonb, text, text, text, text, text, text, text, timestamptz) to   anon, authenticated;

revoke execute on function public.admin_client_errors(int, int, text)                 from public;
grant  execute on function public.admin_client_errors(int, int, text)                 to   authenticated;
revoke execute on function public.admin_client_error_detail(text, int)                from public;
grant  execute on function public.admin_client_error_detail(text, int)                to   authenticated;
revoke execute on function public.admin_client_error_set_status(text, text, text)     from public;
grant  execute on function public.admin_client_error_set_status(text, text, text)     to   authenticated;

revoke execute on function public.admin_guard()  from public;
grant  execute on function public.is_app_admin() to   authenticated;

commit;

-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- 7. RETENTION — 90 days, matching `app_events` (P6-A1-D9)
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
--
-- Outside the transaction: `cron.schedule` is not something to roll a working migration back over.
--
-- ⚠ THIS JOB IS THE ONLY THING MAKING THE 90-DAY SENTENCE TRUE. If it is unscheduled or fails silently,
--   the promise quietly becomes false while the sentence stays on the page — 0131's warning, and it
--   applies identically here. Release check: `select jobname, active from cron.job;`

create or replace function public.client_errors_prune(p_limit int default 20000)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_n int;
begin
  with doomed as (
    select id from public.client_errors
     where received_at < now() - interval '90 days'
     order by id
     limit greatest(coalesce(p_limit, 20000), 0)
  )
  delete from public.client_errors e using doomed d where e.id = d.id;
  get diagnostics v_n = row_count;

  -- Triage rows for bugs that no longer have a single occurrence are dead weight. Keep anything an
  -- operator deliberately marked, so "we decided to ignore this" survives the data it was about.
  delete from public.client_error_status s
   where s.status in ('NEW')
     and not exists (select 1 from public.client_errors e where e.fingerprint = s.fingerprint);

  return v_n;
end;
$$;

revoke execute on function public.client_errors_prune(int) from public;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('forge-client-errors-prune')
      where exists (select 1 from cron.job where jobname = 'forge-client-errors-prune');
    perform cron.schedule('forge-client-errors-prune', '50 4 * * *',
                          $cron$ select public.client_errors_prune(20000); $cron$);
    raise notice '0176: retention job scheduled (forge-client-errors-prune, 04:50 daily).';
  else
    -- 0120 not applied on this database. The table works; only the 90-day promise is unenforced.
    raise notice '0176: ⚠ pg_cron is NOT installed — client_errors_prune() exists but NOTHING CALLS IT. The 90-day retention sentence is not true until this is scheduled.';
  end if;
end;
$$;

-- ══ SELF-CHECK ══════════════════════════════════════════════════════════════════════════════════════
-- Outside the transaction, so a failure here reports rather than rolling back a migration that worked.
-- Asserted by PRESENCE, because "the migration ran" and "the objects exist" are the two facts that have
-- come apart before on this project.
do $$
declare v_id bigint;
begin
  if to_regclass('public.client_errors') is null then
    raise exception '0176 self-check: the client_errors table was not created';
  end if;
  if to_regclass('public.client_error_status') is null then
    raise exception '0176 self-check: the client_error_status table was not created';
  end if;

  if to_regprocedure('public.admin_client_errors(int, int, text)') is null then
    raise exception '0176 self-check: admin_client_errors was not created';
  end if;
  if to_regprocedure('public.admin_client_error_detail(text, int)') is null then
    raise exception '0176 self-check: admin_client_error_detail was not created';
  end if;
  if to_regprocedure('public.admin_client_error_set_status(text, text, text)') is null then
    raise exception '0176 self-check: admin_client_error_set_status was not created';
  end if;

  if not exists (
    select 1 from pg_tables where schemaname = 'public' and tablename = 'client_errors' and rowsecurity
  ) then
    raise exception '0176 self-check: RLS is not enabled on client_errors';
  end if;

  -- Exactly one policy: own-row select. An INSERT policy appearing here later would mean somebody
  -- "fixed" the writer indirection and re-opened a direct anon write path.
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'client_errors') <> 1 then
    raise exception '0176 self-check: client_errors should carry exactly ONE policy (select own)';
  end if;

  -- ⚠ THE GRANT CHECK. This is the `evaluate_honors` lesson made mechanical: the feature dies silently
  --   if the client cannot execute the writer, and every other gate stays green.
  if not has_function_privilege('anon',
      'public.report_client_error(uuid, text, text, text, text, text, text, text, boolean, jsonb, text, text, text, text, text, text, text, timestamptz)', 'execute') then
    raise exception '0176 self-check: anon cannot execute report_client_error — a launch crash would go unreported';
  end if;
  if not has_function_privilege('authenticated',
      'public.report_client_error(uuid, text, text, text, text, text, text, text, boolean, jsonb, text, text, text, text, text, text, text, timestamptz)', 'execute') then
    raise exception '0176 self-check: authenticated cannot execute report_client_error';
  end if;

  -- End to end, for real, then removed. "The function exists" and "the function inserts" are different
  -- facts and this project has shipped the first while believing the second.
  select public.report_client_error(
    gen_random_uuid(), 'selfchk0', 'SelfCheck', '0176 self-check row',
    null, null, '/self-check', 'manual', false, '[]'::jsonb
  ) into v_id;

  if v_id is null then
    -- ⚠ The writer swallows every internal error by design (§4), so a null here is the ONLY signal that
    --   something inside it failed. Name the candidates, because the function itself will never say.
    --   Neither rate limit can fire on this call: the session id is freshly minted and the global cap is
    --   5000/hour. So a null means the insert itself raised.
    raise exception '0176 self-check: report_client_error returned null — the insert did not happen. It swallows its own errors by design, so check, in order: the client_errors CHECK constraints, the profiles FK, and whether auth.uid() resolves in this session.';
  end if;

  delete from public.client_errors where id = v_id;
  delete from public.client_error_status where fingerprint = 'selfchk0';

  raise notice '0176 OK: both tables, RLS, the anon+authenticated writer (insert proven end to end), all three admin functions and the prune are present.';
end;
$$;

-- ══ VERIFY BY HAND ═══════════════════════════════════════════════════════════════════════════════════
--   As an admin:     select jsonb_pretty(public.admin_client_errors(7, 50));
--                    Expect `counts.ever_any` to be NULL on a fresh install. ⚠ A null there means
--                    nothing has EVER been reported — which, once the client half is deployed, means
--                    the client half is NOT deployed. A bare `occurrences: 0` cannot say that, and
--                    this project has lost a day to exactly that ambiguity before (0153).
--
--   One bug's trail: select jsonb_pretty(public.admin_client_error_detail('<fingerprint>'));
--   Triage:          select public.admin_client_error_set_status('<fingerprint>', 'FIXED', 'shipped in OTA xyz');
--
--   Guard regression: node supabase/seed/admin-roundtrip.mjs   (asserts 42501 as a non-admin)
--   Anon audit:       supabase/apply/audit-anon-executable-functions.sql
--                     ⚠ `report_client_error` WILL appear in that audit's output and is the one
--                       intended anon-executable function in the schema. Do not "fix" it. See §4.
--   Retention:        select jobname, active from cron.job where jobname = 'forge-client-errors-prune';
