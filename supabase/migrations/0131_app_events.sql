-- Forge Legacy — 0131: what people actually do in the app
--
-- ══ WHAT THIS CLOSES ══
--
-- 0130 measures what athletes DID — workouts saved, programs finished, squads joined. It cannot measure
-- what they LIKED. Somebody who opens Forge every day and logs nothing is, to every metric in 0130,
-- indistinguishable from somebody who left. Screens opened, features tapped, session length and the
-- point at which a flow is abandoned are simply not in the database.
--
-- This is the table that changes that.
--
-- ══ ⚠ DO NOT APPLY THIS BEFORE THE PRIVACY POLICY EDIT IS LIVE ══
--
-- `Admin-Analytics-Architecture-v1.0.md` AA-D9 and `P-6-Amendment-001-Product-Analytics` P6-A1-D8 both
-- say it, and it is the one instruction in this migration with no technical enforcement: the disclosure
-- ships BEFORE the collection, not alongside it. A policy updated afterwards was wrong for however long
-- the gap lasted. The edit is in `Docs/Legal/Privacy-Policy.md` § 2, "Product usage".
--
-- ══ WHAT MAY BE IN A ROW, AND WHAT MAY NOT ══
--
-- The policy tells athletes a usage record never contains anything they wrote or anything they lifted.
-- That is enforced in `src/domain/analytics/props-core.ts` — an ALLOWLIST, tested, applied before the
-- insert — not by this table, which cannot inspect meaning. The `props` size check below is a blast
-- radius limit, not the rule.
--
-- ══ TWO CLOCKS, AND THE DIFFERENCE IS LOAD-BEARING ══
--
--   `occurred_at`  the DEVICE's clock. Can be wrong by years. Trustworthy ONLY for ordering events
--                  within one session_id.
--   `received_at`  the SERVER's clock. EVERY DASHBOARD METRIC IS COMPUTED FROM THIS ONE.
--
-- There is deliberately no CHECK clamping `occurred_at` to something sane: a constraint containing
-- `now()` is not immutable and breaks `pg_dump`.
--
-- Idempotent. Depends on 0001 (profiles) and 0120 (pg_cron). RUN AFTER 0130.

create table if not exists public.app_events (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  -- Random per app session, minted on the client. NOT a device id, not derived from hardware, not
  -- stable across sessions — the policy says so in as many words.
  session_id  uuid not null,
  kind        text not null check (length(kind) between 1 and 60),
  screen      text check (screen is null or length(screen) <= 120),
  props       jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  platform    text check (platform is null or platform in ('ios', 'android', 'web')),
  app_version text check (app_version is null or length(app_version) <= 32),
  -- The blast radius of a client bug that puts a whole workout into props. The allowlist is the real
  -- defence; this is what stops a bypass from being unbounded.
  constraint app_events_props_small check (pg_column_size(props) < 2048)
);

-- BRIN on the append-only time column: this table is written in `received_at` order forever, which is
-- exactly the access pattern BRIN is for, at a fraction of a btree's size.
create index if not exists app_events_received_brin on public.app_events using brin (received_at);
-- "how often is this event fired lately" — the rollup's query.
create index if not exists app_events_kind_time on public.app_events (kind, received_at desc);
-- "how many distinct athletes", and the athlete's own read of their own log.
create index if not exists app_events_user_time on public.app_events (user_id, received_at desc);
-- Screen-view counts skip the rest of the table entirely.
create index if not exists app_events_screen_time on public.app_events (screen, received_at desc)
  where screen is not null;

alter table public.app_events enable row level security;

drop policy if exists app_events_insert on public.app_events;
drop policy if exists app_events_own_select on public.app_events;

create policy app_events_insert on public.app_events for insert
  with check (user_id = auth.uid());

-- P6-A1-D10. Own-row SELECT, matching push_outbox's "readable by its owner for support and debugging".
-- It is also what makes the policy's "you can see what we collect" true without building an export
-- endpoint.
create policy app_events_own_select on public.app_events for select
  using (user_id = auth.uid());

-- ⚠ NO UPDATE POLICY AND NO DELETE POLICY, ON PURPOSE. An append-only log its subject can rewrite is
--   not a log. Deleting the account removes every row via the FK cascade, which is the deletion the
--   policy actually promises.

comment on table public.app_events is
  'First-party product-usage events (P-6-Amendment-001). Allowlisted payloads only — never athlete-authored text, never training values, never location (P6-A1-D3, enforced in domain/analytics/props-core.ts). Own-row insert + select; no update, no delete. Raw rows pruned at 90 days (P6-A1-D9); only anonymous daily totals survive. Metrics compute from received_at, never occurred_at.';

-- ── Retention: 90 days raw, aggregates forever (P6-A1-D9) ────────────────────
--
-- ⚠ THIS JOB IS THE ONLY THING MAKING THE POLICY'S 90-DAY SENTENCE TRUE. If it is unscheduled or fails
--   silently, the promise quietly becomes false while the sentence stays on the page. The policy's own
--   "Before You Publish" checklist now carries `select jobname, active from cron.job;` as a release
--   check for exactly this reason.
--
-- Bounded batch, in the `push_drain(50)` style: one statement can never lock the table for minutes.
create or replace function public.app_events_prune(p_limit int default 20000)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_n int;
begin
  with doomed as (
    select id from public.app_events
     where received_at < now() - interval '90 days'
     order by id
     limit greatest(coalesce(p_limit, 20000), 0)
  )
  delete from public.app_events e using doomed d where e.id = d.id;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke execute on function public.app_events_prune(int) from public;

-- Monthly partitioning + `drop partition` is the escalation path if volume ever justifies it. It does
-- not now, and a partitioned table is a permanent complexity tax paid against a four-figure daily rate.
select cron.unschedule('forge-events-prune')
 where exists (select 1 from cron.job where jobname = 'forge-events-prune');
select cron.schedule('forge-events-prune', '40 4 * * *', $cron$ select public.app_events_prune(20000); $cron$);
