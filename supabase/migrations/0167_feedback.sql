-- Forge Legacy — 0167: in-app feedback, bug reports and suggestions
--
-- ══ WHY THIS EXISTS ══
--
-- Two obligations, one table.
--
--   1. THE PRODUCT ONE. Nothing in this app has ever let an athlete tell us anything. The only support
--      touchpoint in the entire binary was a sentence of copy inside the privacy sheet
--      (`src/domain/settings/content.ts`, LEGAL.privacy.body) — not a form, not a link, not reachable by
--      anyone actually looking for help.
--
--   2. THE STORE ONE. App Store Connect requires a **Support URL** and Apple rejects a bare `mailto:` as
--      an answer (GO-LIVE §10.4). `site/support.html` is that URL; this table is its in-app half.
--
-- ══ ⚠ FREE TEXT IS DELIBERATE HERE — DO NOT "FIX" IT ══
--
-- `feedback.body` stores exactly what the athlete typed. That is the OPPOSITE of `app_events` (0131),
-- whose whole design is P6-A1-D3: "an event payload may never contain … any other text the athlete
-- authored", enforced by `sanitizeProps()` at the boundary.
--
-- Both are correct, because they answer different questions. An analytics event asks "which screen was
-- opened", and free text there is a privacy leak with no upside. A support message asks "what went
-- wrong for you", and it is ONLY useful in the athlete's own words. Redacting it would leave a table of
-- timestamps attached to nothing.
--
-- ⛔ A future migration must not route this column through `sanitizeProps`, allow-list it, or truncate it
--    to enumerated values. If that ever looks like a good idea, read `site/privacy.html` §2 "Support
--    messages and feedback" first — the disclosure that makes this lawful describes free text, in
--    writing, publicly, and shipped BEFORE this migration per P6-A1-D8.
--
-- ══ AA-D2 ══
--
-- `admin_feedback()` returns a NAMED athlete, which every other admin read model refuses to do. That is
-- not a breach: AA-D2 forbids a named athlete beside "a volume number, a challenge standing, a
-- leaderboard position, or a rank" — beside PERFORMANCE. A support ticket is not performance data, and
-- you cannot answer a bug report without knowing who filed it. `admin_recent_signups` (0137) set this
-- precedent. This function returns handle and display name and NOT ONE training figure; joining a
-- workout count onto it later would be the actual breach.
--
-- Depends on 0129 (the admin gate), 0120 (push_outbox — optional, degrades), 0001/0022 (profiles).
-- Idempotent: `if not exists` on the table, `create or replace` on every function, `drop trigger if
-- exists` before each trigger.
--
-- ⚠ 0164/0165 are not applied on every database, so the three gate objects are RE-STATED inline
--   byte-identically (the 0137:44-49 precedent) and this file stands alone.

begin;

-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- 0. THE GATE — restated verbatim from 0129 so this file is standalone
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════

create table if not exists public.app_admins (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  granted_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;
-- ⚠ NO POLICIES. NOT AN OMISSION — see 0129's header (AA-D6). RLS on with zero policies is
-- deny-by-default, which is what keeps the key-holder roster from being joinable to world-readable
-- `profiles`. A later migration must not "fix" this by adding an owner policy.

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

create table if not exists public.feedback (
  -- bigint identity, not uuid: an operator reads these in a list and refers to them out loud and in
  -- email ("#41 is fixed"). push_outbox uses uuid because nobody ever says a push row's id.
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles (id) on delete cascade,

  -- ⚠ NOT AN ALLOW-LIST THE READ PATH FILTERS ON. The constraint keeps the four buckets honest at write
  --   time; `admin_feedback` deliberately does NOT filter by kind, so a fifth kind added here shows up
  --   on the dashboard the same day rather than being silently dropped. That exact failure — a client
  --   allow-list quietly discarding rows it did not know about — cost this project eleven migrations of
  --   invisible notifications (`src/data/notifications-live.ts` KINDS).
  kind         text not null check (kind in ('BUG', 'SUGGESTION', 'PRAISE', 'OTHER')),

  -- The athlete's own words. See the header. 2000 chars is generous for a bug report and small enough
  -- that no single row can be used as file storage.
  body         text not null check (length(btrim(body)) between 1 and 2000),

  -- Context captured automatically, because "it broke" plus a screen name is reproducible and "it broke"
  -- alone is not. All nullable: a message sent from a state we failed to capture is still worth having.
  screen       text,
  app_version  text,
  platform     text,

  -- Did they agree to be replied to. Not the same as having an email — it is consent to use it.
  contact_ok   boolean not null default true,

  -- Operator workflow. Written only by admin_feedback_set_status().
  status       text not null default 'NEW' check (status in ('NEW', 'READ', 'ACTIONED', 'CLOSED')),

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.feedback is
  'In-app bug reports, suggestions and praise. ⚠ `body` is DELIBERATE FREE TEXT — the one table in this schema that stores words the athlete wrote, disclosed in site/privacy.html §2 "Support messages and feedback". Do not route it through sanitizeProps(). See 0167''s header.';

-- Newest-first admin list, and the rate-limit probe. One index serves both.
create index if not exists feedback_created_at on public.feedback (created_at desc);
create index if not exists feedback_user_time   on public.feedback (user_id, created_at desc);
create index if not exists feedback_status_time on public.feedback (status, created_at desc);

-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- 2. RLS
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
--
-- Insert your own, read your own, and that is all. No UPDATE policy and no DELETE policy — an athlete
-- cannot rewrite a report after we have read it, and cannot delete one to cover an abuse report. The
-- operator reaches these rows through SECURITY DEFINER functions, which bypass RLS by design.
--
-- ⚠ The own-row SELECT is not decoration. `site/privacy.html` §7 gives a right of access; a policy that
--   let you write but never read would make that promise false in the database.

alter table public.feedback enable row level security;

drop policy if exists feedback_insert_own on public.feedback;
create policy feedback_insert_own on public.feedback
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists feedback_select_own on public.feedback;
create policy feedback_select_own on public.feedback
  for select to authenticated
  using (user_id = auth.uid());

-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- 3. RATE LIMIT
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
--
-- Ten lines, and the difference between a support table and a spam target the day the app is public.
-- Six per hour is far above any honest use and far below anything that fills a disk.
--
-- ⚠ Raises rather than silently dropping. A swallowed insert would tell the athlete their message was
--   sent when it was not — the one failure mode a support channel must never have.

create or replace function public.feedback_tg_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_recent int;
begin
  select count(*) into v_recent
    from public.feedback
   where user_id = new.user_id
     and created_at > now() - interval '1 hour';

  if v_recent >= 6 then
    raise exception 'Too many messages in a short time. Please wait a little while before sending another.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists feedback_rate_limit on public.feedback;
create trigger feedback_rate_limit
  before insert on public.feedback
  for each row execute function public.feedback_tg_rate_limit();

-- Keep `updated_at` honest without making the app remember to set it.
create or replace function public.feedback_tg_touch()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists feedback_touch on public.feedback;
create trigger feedback_touch
  before update on public.feedback
  for each row execute function public.feedback_tg_touch();

-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- 4. OPERATOR PUSH — the 0137 pattern, verbatim
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
--
-- Writes `push_outbox` DIRECTLY rather than through `notification_events_for`: feedback is an operator
-- event and belongs in no athlete's inbox. Swallows every error, because it runs inside the insert that
-- delivers the athlete's message and a broken notifier must never eat a support ticket.

create or replace function public.push_tg_feedback_filed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- 0120 may not be applied on this database. `to_regclass` is null rather than an error for a missing
  -- relation, which is the whole reason it is used here instead of a plain reference.
  if to_regclass('public.push_outbox') is null or to_regclass('public.push_tokens') is null then
    return new;
  end if;

  begin
    insert into public.push_outbox (user_id, kind, event_at, actor_id, title, body, route)
    select a.user_id,
           'feedback_filed',
           -- ⚠ THE FILING TIME, NOT NOW — keeps 0120's push_outbox_event_uk idempotent on replay.
           new.created_at,
           new.user_id,
           case new.kind
             when 'BUG'        then 'Bug report'
             when 'SUGGESTION' then 'Suggestion'
             when 'PRAISE'     then 'Someone said thanks'
             else                   'New feedback'
           end,
           left(btrim(new.body), 120),
           '/admin'
      from public.app_admins a
      -- Only operators with a live device — a row nothing can deliver sits PENDING and ends FAILED.
     where exists (
             select 1 from public.push_tokens t
              where t.user_id = a.user_id and t.disabled_at is null
           )
       -- Never notify the operator about their own message.
       and a.user_id <> new.user_id
    on conflict do nothing;
  exception
    when others then null;
  end;

  return new;
end;
$$;

comment on function public.push_tg_feedback_filed() is
  'Files an operator push when an athlete sends feedback. Writes push_outbox directly — feedback is an operator event and belongs in no athlete''s inbox. Swallows every error, because it runs inside the insert that carries the athlete''s message.';

drop trigger if exists push_feedback_filed on public.feedback;
create trigger push_feedback_filed
  after insert on public.feedback
  for each row execute function public.push_tg_feedback_filed();

-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- 5. THE ADMIN READ MODEL
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
--
-- ⚠ ADDING THIS FUNCTION MEANS ADDING ITS NAME TO `supabase/seed/admin-roundtrip.mjs` IN THE SAME
--   COMMIT (0130's standing rule). That script loops every admin function as a non-admin and asserts
--   42501; it is the only thing standing between "somebody forgot admin_guard()" and exposure. Done.
--
-- `p_status` is an OPTIONAL filter, null meaning all. It does not filter by `kind` — see the table's
-- kind comment.

create or replace function public.admin_feedback(p_limit int default 100, p_status text default null)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_limit  int := least(greatest(coalesce(p_limit, 100), 1), 500);
  v_status text := nullif(btrim(coalesce(p_status, '')), '');
  v_rows   jsonb;
  v_counts jsonb;
begin
  perform public.admin_guard();

  select coalesce(jsonb_agg(r order by r.created_at desc), '[]'::jsonb)
    into v_rows
    from (
      select f.id,
             f.kind,
             f.body,
             f.screen,
             f.app_version,
             f.platform,
             f.contact_ok,
             f.status,
             f.created_at,
             -- Identity, because you cannot answer a bug report without knowing who filed it. Handle and
             -- name ONLY — see the AA-D2 note in this file's header. Never join a training figure here.
             p.name   as athlete_name,
             p.handle as athlete_handle
        from public.feedback f
        join public.profiles p on p.id = f.user_id
       where v_status is null or f.status = v_status
       order by f.created_at desc
       limit v_limit
    ) r;

  -- Counts are computed over the WHOLE table, never over the filtered page — otherwise "unread: 0" would
  -- mean "0 on this screen" and read as "nothing to do".
  select jsonb_build_object(
    'total',    count(*),
    'new',      count(*) filter (where status = 'NEW'),
    'read',     count(*) filter (where status = 'READ'),
    'actioned', count(*) filter (where status = 'ACTIONED'),
    'closed',   count(*) filter (where status = 'CLOSED'),
    'bugs',     count(*) filter (where kind = 'BUG'),
    -- ⚠ The honest-zero guard. "no feedback yet" and "the screen never shipped" are different facts, and
    --   a bare 0 cannot tell them apart. A null here means the table is genuinely empty.
    'newest_at', max(created_at)
  ) into v_counts
  from public.feedback;

  return jsonb_build_object('rows', v_rows, 'counts', v_counts, 'limit', v_limit, 'status', v_status);
end;
$$;

comment on function public.admin_feedback(int, text) is
  'Operator inbox for in-app feedback. Returns the athlete''s handle and name because a support ticket must be answerable — NOT an AA-D2 breach, which concerns a named athlete beside performance data (see 0167''s header). Counts span the whole table, not the returned page. Gated by admin_guard() (0129).';

-- The status writer. Without it `status` would be a column nothing can ever change, permanently 'NEW' —
-- which is exactly the sort of dead field that makes a dashboard lie.
create or replace function public.admin_feedback_set_status(p_id bigint, p_status text)
returns jsonb
language plpgsql
security definer
volatile
set search_path = public, pg_temp
as $$
declare
  v_status text := btrim(coalesce(p_status, ''));
  v_row    public.feedback;
begin
  perform public.admin_guard();

  if v_status not in ('NEW', 'READ', 'ACTIONED', 'CLOSED') then
    raise exception 'unknown feedback status: %', v_status using errcode = '22023';
  end if;

  update public.feedback set status = v_status where id = p_id returning * into v_row;

  if not found then
    raise exception 'no feedback row with id %', p_id using errcode = 'P0002';
  end if;

  return jsonb_build_object('id', v_row.id, 'status', v_row.status, 'updated_at', v_row.updated_at);
end;
$$;

comment on function public.admin_feedback_set_status(bigint, text) is
  'Moves one feedback row through NEW → READ → ACTIONED → CLOSED. Gated by admin_guard() (0129). The only writer of feedback.status — the table has no UPDATE policy, so nothing else can.';

-- ⚠ Revoke FROM PUBLIC, never from `authenticated` — Postgres grants EXECUTE to PUBLIC on every new
-- function, and revoking from a role that never held a direct grant removes nothing (0120, 0129, 0130,
-- 0137 all carry this note). The GUARD, not the grant, is what refuses a signed-in non-admin; the grant
-- only shuts out anon. 0147 §2 additionally set default privileges so a new function is not handed to
-- `anon` by the platform — re-run `supabase/apply/audit-anon-executable-functions.sql` after this file.
revoke execute on function public.admin_feedback(int, text)                from public;
grant  execute on function public.admin_feedback(int, text)                to   authenticated;
revoke execute on function public.admin_feedback_set_status(bigint, text)  from public;
grant  execute on function public.admin_feedback_set_status(bigint, text)  to   authenticated;
revoke execute on function public.admin_guard()  from public;
grant  execute on function public.is_app_admin() to   authenticated;

commit;

-- ══ SELF-CHECK ══════════════════════════════════════════════════════════════════════════════════════
-- Outside the transaction, so a failure here reports rather than rolling back a migration that worked.
-- Asserted by presence, because "the migration ran" and "the objects exist" are the two facts that have
-- come apart before on this project.
do $$
begin
  if to_regclass('public.feedback') is null then
    raise exception '0167 self-check: the feedback table was not created';
  end if;

  if to_regprocedure('public.admin_feedback(int, text)') is null then
    raise exception '0167 self-check: admin_feedback was not created';
  end if;

  if to_regprocedure('public.admin_feedback_set_status(bigint, text)') is null then
    raise exception '0167 self-check: admin_feedback_set_status was not created';
  end if;

  -- RLS on with the two expected policies. A table with RLS enabled and NO policies would silently
  -- refuse every athlete insert — the support channel would look built and accept nothing.
  if not exists (
    select 1 from pg_tables where schemaname = 'public' and tablename = 'feedback' and rowsecurity
  ) then
    raise exception '0167 self-check: RLS is not enabled on feedback';
  end if;

  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'feedback') <> 2 then
    raise exception '0167 self-check: feedback should carry exactly two policies (insert own, select own)';
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'feedback_rate_limit' and not tgisinternal
  ) then
    raise exception '0167 self-check: the rate-limit trigger was not created';
  end if;

  if to_regclass('public.push_outbox') is null then
    raise notice '0167: push_outbox is absent — feedback SAVES, the operator PUSH will no-op until 0120 is applied.';
  end if;

  raise notice '0167 OK: feedback table, RLS, rate limit, operator push and both admin functions are present.';
end;
$$;

-- ══ VERIFY BY HAND ═══════════════════════════════════════════════════════════════════════════════════
--   As an admin:      select jsonb_pretty(public.admin_feedback(20));
--   Expect `counts.newest_at` to be null on an empty table — a null there is "nothing has ever been
--   filed", which a bare 0 in `counts.total` cannot distinguish from "the screen never shipped".
--
--   Guard regression:  node supabase/seed/admin-roundtrip.mjs   (asserts 42501 as a non-admin)
--   Anon audit:        supabase/apply/audit-anon-executable-functions.sql
