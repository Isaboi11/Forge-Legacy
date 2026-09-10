-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0200: when a squad goal ends (Squad-Architecture-Amendment-006, LOCKED 2026-09-10)
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: every statement is guarded, and §3 is read-only.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- PO: *"A goal in the squad Moch 1 ended without anyone knowing. It didn't prompt us or post anything.
-- Didn't send a notification, and it still looks like it's going right now."* Nothing was ever built to
-- happen when a goal ends. After this, a job runs every 15 minutes and closes any goal that is met or
-- past its deadline: it posts to the squad feed, pushes every member (ON by default — PO decision D1),
-- shows up in the inbox, and the card flips to its finished state.
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  0200 verbatim: two squad columns, the `squad_goal_closures` log, the close functions, the owner
--     replace/remove trigger, the inbox rows, the weekly recap's goal guard, and the pg_cron job
-- §2  asserts every piece exists — and that the act-as helper is NOT callable by a client — and RAISES
-- §3  lists exactly which squads the FIRST run will close, and whether each gets a post. Read-only.
--
-- ⚠ ORDER: THE APP GOES OUT FIRST, THEN THIS PASTE. The job's first run is within 15 minutes of the paste
--   and it writes a post the current build draws with an "Athlete" header, because the header that names
--   the squad instead ships in the same pass as this file. Deploy web + OTA, then paste.
--
-- ⚠ IT DOES NOT TOUCH `notification_events_for`, `push_pref_key` OR `push_pref_default`. 0195 and 0196
--   (feat/forge-coach, not applied) restate all three; this file writes the push to `push_outbox`
--   directly and serves the inbox rows from its own function, so the paste order between them is free.
--
-- ⚠ BACKFILL: the first run closes every goal already past its deadline. Deadlines within the last 7
--   days get a post and a push (Moch 1's should be one). Older ones close silently into the log.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ═════════════════════════════════════════════════════════════════════════════
-- §1 — 0200_squad_goal_close.sql, verbatim
-- ═════════════════════════════════════════════════════════════════════════════

-- Forge Legacy — 0200: a squad goal ENDS (Squad-Architecture-Amendment-006, LOCKED 2026-09-10)
--
-- ══ WHAT THIS CLOSES ══
--
-- PO, 2026-09-10: *"A goal in the squad Moch 1 ended without anyone knowing. It didn't prompt us or post
-- anything. Didn't send a notification, and it still looks like it's going right now."*
--
-- Nothing was ever built to happen when a goal ends. 0103 chose "expiry is derived at read time" and only
-- FROZE the running total at the deadline — no status, no job, no post, no push. A met goal was banked
-- into `squad_goal_completions` only when the owner next set or cleared a goal; an unmet one left no
-- trace at all.
--
-- ══ WHAT THIS DOES ══
--
--   1. `squads.goal_closed_at` + `goal_outcome` — the close, stored, so every screen reads one answer.
--   2. `squad_goal_closures` — every goal that ended, met / closed / removed (Amendment 006 §7). Past
--      Goals reads it. `squad_goal_completions` is left EXACTLY as it is: the Squad honors count its rows
--      (`squad_goals_completed`, 0099), and putting unmet goals in it would mean rewriting that metric.
--   3. `squad_goal_record_close` — writes the log row and, when announced, the authorless system post
--      (a milestone band, like a ceremony share) and the push to every member.
--   4. `squad_goals_due` / `squad_goals_close_due` — the scheduled close, every 15 minutes (pg_cron).
--   5. `squads_goal_lifecycle` — a trigger that logs a goal the owner REPLACES or REMOVES before the job
--      reached it, and reopens the row for the next goal. No client write path changes.
--   6. `squad_goal_notifications()` — the inbox rows: goal met, goal closed, and the owner-only
--      "closes soon" nudge (§6). Merged into `/inbox` by the client.
--   7. `ensure_weekly_recap` — stops attaching a goal that closed before the recapped week.
--
-- ══ ⚠ WHY THIS DOES NOT TOUCH THE NOTIFICATION UNION ══
--
-- The obvious build adds a branch to `notification_events_for`, a key to `push_pref_key` and a default to
-- `push_pref_default`. All three are ALSO restated by `0195_coaching_notifications` and
-- `0196_trainer_messages` on `feat/forge-coach` — written, NOT applied. Whichever is pasted second wins,
-- whole-body: 0195 pasted after this would silently delete the goal branch, and building on 0196's copy
-- here would reference trainer tables this branch does not have. So:
--
--   · the PUSH is written to `push_outbox` directly — the shape `briefing_send` (0159) already uses for
--     an event nobody caused — honouring the `squad_goals` preference itself;
--   · the INBOX rows come from their own function, which the client merges.
--
-- Neither of the three shared functions is restated. `push_pref_default('squad_goals')` still answers
-- false, and nothing reads that arm: no union kind maps to `squad_goals`. The effective default — ON,
-- PO decision D1 — lives in `squad_goal_record_close` below, and `push.test.mjs` pins it to the toggle.
--
-- ══ ⚠ THE JOB RUNS THE SUM AS THE SQUAD'S OWNER ══
--
-- `squad_metric_sum` answers 0 for a private squad unless `auth.uid()` is a member, and a pg_cron job has
-- no user. Copying the sum's five-metric body into an unguarded twin is the drift this schema keeps
-- paying for (0103's own header). Instead `squad_goal_act_as` sets the request's JWT subject to the
-- owner, TRANSACTION-LOCAL, around each squad — so the job computes exactly the number the owner's own
-- screen shows. It is revoked from PUBLIC: only the definer functions below can call it.
--
-- ══ BACKFILL ══
--
-- The first run closes every goal already past its deadline. One that ended within the last 7 days —
-- Moch 1's — gets its post and push. Older ones close silently into the log: nobody is told in September
-- about a goal that ended in June. §3 of the bundle lists exactly which squads the first run will touch.
--
-- Depends on 0099 (completions, archive), 0103 (dates, window), 0107 (contributions), 0120 (push_outbox,
-- pg_cron), 0057 (weekly recap). Idempotent. Safe to run twice.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · the close, stored on the squad
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.squads add column if not exists goal_closed_at timestamptz;
alter table public.squads add column if not exists goal_outcome text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'squads_goal_outcome_check') then
    alter table public.squads add constraint squads_goal_outcome_check
      check (goal_outcome is null or goal_outcome in ('met', 'closed'));
  end if;
end $$;

comment on column public.squads.goal_closed_at is
  'When the current goal closed (0200). NULL = live, or no goal. Cleared by squads_goal_lifecycle the moment the owner sets the next goal.';
comment on column public.squads.goal_outcome is
  'met | closed (deadline passed under target). Never "failed" — Amendment 006 §5. NULL while live.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · every goal that ended
-- ─────────────────────────────────────────────────────────────────────────────
-- Keyed like `squad_goal_completions`: (squad, started_at) is one goal INSTANCE, so a second close of the
-- same goal — the job and the trigger racing, or a re-run — writes nothing and posts nothing.
create table if not exists public.squad_goal_closures (
  squad_id     uuid        not null references public.squads(id) on delete cascade,
  started_at   timestamptz not null,
  goal         text,
  target       int         not null,
  metric_kind  text        not null,
  metric_key   text,
  ends_at      timestamptz,
  final_total  numeric     not null default 0,
  contributors int         not null default 0,
  outcome      text        not null check (outcome in ('met', 'closed', 'removed')),
  -- The inbox line, worded once at close: "412 workouts logged together".
  summary      text        not null default '',
  announced    boolean     not null default false,
  post_id      uuid        references public.squad_posts(id) on delete set null,
  closed_at    timestamptz not null default now(),
  primary key (squad_id, started_at)
);

alter table public.squad_goal_closures enable row level security;
drop policy if exists squad_goal_closures_read on public.squad_goal_closures;
create policy squad_goal_closures_read on public.squad_goal_closures for select using (
  exists (select 1 from public.squad_members m
           where m.squad_id = squad_goal_closures.squad_id and m.user_id = auth.uid())
);
-- No insert/update/delete policy: only the definer functions below write here.

-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · wording helpers — the same units `GOAL_UNITS` draws on the card
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.squad_goal_figure(p_kind text, p_value numeric)
returns text
language sql
immutable
as $$
  select case
    when coalesce(p_kind, 'workout_count') in ('distance_total', 'time_total')
         and round(coalesce(p_value, 0), 1) <> trunc(coalesce(p_value, 0))
      then to_char(round(coalesce(p_value, 0), 1), 'FM999,999,990.0')
    else to_char(trunc(coalesce(p_value, 0)), 'FM999,999,999,990')
  end;
$$;

create or replace function public.squad_goal_unit(p_kind text, p_value numeric)
returns text
language sql
immutable
as $$
  select case coalesce(p_kind, 'workout_count')
    when 'workout_count'  then case when trunc(coalesce(p_value, 0)) = 1 then 'workout' else 'workouts' end
    when 'distance_total' then 'mi'
    when 'volume_total'   then 'lb'
    when 'time_total'     then 'hrs'
    when 'pr_count'       then case when trunc(coalesce(p_value, 0)) = 1 then 'PR' else 'PRs' end
    else ''
  end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4 · act as the owner, for this transaction only — see the header
-- ─────────────────────────────────────────────────────────────────────────────
-- Both settings, because `auth.uid()` reads `request.jwt.claim.sub` first and `request.jwt.claims`
-- second depending on the auth schema's age. `true` = transaction-local: it cannot outlive the run.
create or replace function public.squad_goal_act_as(p_uid uuid)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true);
  perform set_config('request.jwt.claims',
                     case when p_uid is null then ''
                          else json_build_object('sub', p_uid, 'role', 'authenticated')::text end,
                     true);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5 · record one close — the log row, and when announced the post and the push
-- ─────────────────────────────────────────────────────────────────────────────
-- Takes the goal's values as arguments rather than reading `squads`, because the trigger calls it with
-- the OLD row while the NEW one is being written. Returns true only when it wrote the log row.
--
-- Copy rules (Amendment 006 §3, §5): a met goal says what was reached and when; a closed one leads with
-- what the squad DID. Never "failed", "missed", "short", or a deficit number. Contributors are a COUNT,
-- never names (SQ-D3.5).
create or replace function public.squad_goal_record_close(
  p_squad    uuid,
  p_started  timestamptz,
  p_goal     text,
  p_target   int,
  p_kind     text,
  p_key      text,
  p_ends     timestamptz,
  p_total    numeric,
  p_outcome  text,
  p_announce boolean
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now      timestamptz := now();
  v_name     text;
  v_tz       text;
  v_kind     text := coalesce(p_kind, 'workout_count');
  v_title    text := nullif(trim(coalesce(p_goal, '')), '');
  v_headline text;
  v_line     text;
  v_summary  text;
  v_timing   text := '';
  v_days     int;
  v_contrib  int := 0;
  v_post     uuid;
  v_ptitle   text;
  v_pbody    text;
begin
  select sq.name, coalesce(pr.tz, 'UTC')
    into v_name, v_tz
    from public.squads sq
    left join public.profiles pr on pr.id = sq.owner_id
   where sq.id = p_squad;
  if not found then
    return false;
  end if;

  -- An unrecognised IANA string raises; one bad tz must not stop a close (0159's rule).
  begin
    perform v_now at time zone v_tz;
  exception when others then
    v_tz := 'UTC';
  end;

  -- Who put work in — a count, from the same per-member window S-2b draws (0107).
  begin
    select count(*)::int into v_contrib
      from public.squad_member_contributions(p_squad) c
     where c.value > 0;
  exception when others then
    v_contrib := 0;
  end;

  v_headline := coalesce(v_title,
    'Reach ' || public.squad_goal_figure(v_kind, p_target) || ' ' || public.squad_goal_unit(v_kind, p_target));

  if p_outcome = 'met' then
    if p_ends is not null then
      v_days := (p_ends at time zone v_tz)::date - (v_now at time zone v_tz)::date;
      v_timing := case
        when v_days > 1 then ', ' || v_days || ' days early'
        when v_days = 1 then ', a day early'
        when v_days = 0 then ', on the final day'
        else ''
      end;
    end if;
    v_summary := public.squad_goal_figure(v_kind, p_target) || ' ' || public.squad_goal_unit(v_kind, p_target) || ' reached together';
    v_line    := v_summary || v_timing || '.'
                 || case when v_contrib > 1 then ' ' || v_contrib || ' members put work in.' else '' end;
    v_ptitle  := 'Goal complete';
    v_pbody   := v_name || ' hit its goal — ' || public.squad_goal_figure(v_kind, p_target) || ' '
                 || public.squad_goal_unit(v_kind, p_target) || v_timing || '.';
  else
    v_summary := public.squad_goal_figure(v_kind, p_total) || ' ' || public.squad_goal_unit(v_kind, p_total) || ' logged together';
    v_line    := v_summary || ', toward ' || public.squad_goal_figure(v_kind, p_target) || '.';
    v_ptitle  := 'Goal closed';
    v_pbody   := v_name || '''s goal closed — ' || v_summary || '.';
  end if;

  insert into public.squad_goal_closures (
    squad_id, started_at, goal, target, metric_kind, metric_key, ends_at,
    final_total, contributors, outcome, summary, announced, closed_at
  ) values (
    p_squad, p_started, p_goal, p_target, v_kind, p_key, p_ends,
    coalesce(p_total, 0), v_contrib, p_outcome, v_summary, false, v_now
  )
  on conflict (squad_id, started_at) do nothing;

  if not found then
    return false;
  end if;

  if not coalesce(p_announce, false) or p_outcome not in ('met', 'closed') then
    return true;
  end if;

  -- The post. Authorless — the squad wrote it, like the Weekly Summary (0057) — and drawn as a milestone
  -- band (`MilestoneCard`, event 'goal'). Body null: the band IS the post, and the client reads the
  -- authorless row as the squad's own voice.
  insert into public.squad_posts (squad_id, author_id, type, body, layout)
  values (
    p_squad,
    null,
    'milestone',
    null,
    jsonb_build_object(
      'kind',        'milestone-card',
      'event',       'goal',
      'eyebrow',     case when p_outcome = 'met' then 'Squad Goal Complete' else 'Goal Closed' end,
      'headline',    v_headline,
      'line',        v_line,
      'date',        to_char(v_now at time zone v_tz, 'Mon FMDD, YYYY'),
      'goalOutcome', p_outcome
    )
  )
  returning id into v_post;

  update public.squad_goal_closures c
     set announced = true, post_id = v_post
   where c.squad_id = p_squad and c.started_at = p_started;

  -- The push. Written to the outbox directly (0159's shape), so the notification union is untouched —
  -- see the header. `squad_goals` defaults ON (PO decision D1); an explicit false is honoured.
  insert into public.push_outbox (user_id, kind, event_at, squad_id, title, body, route)
  select m.user_id,
         'squad_goal_' || p_outcome,
         v_now,
         p_squad,
         v_ptitle,
         v_pbody,
         '/squad/' || p_squad::text || '/goal'
    from public.squad_members m
    join public.profiles pr on pr.id = m.user_id
   where m.squad_id = p_squad
     and pr.push_baseline_at is not null
     and pr.push_baseline_at < v_now
     and exists (select 1 from public.push_tokens t where t.user_id = m.user_id and t.disabled_at is null)
     and case
           when jsonb_typeof(coalesce(pr.notif_prefs, '{}'::jsonb) -> 'squad_goals') = 'boolean'
             then (pr.notif_prefs ->> 'squad_goals')::boolean
           else true
         end
  on conflict do nothing;

  return true;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6 · which goals are due — read-only, and what §3 of the bundle prints
-- ─────────────────────────────────────────────────────────────────────────────
-- Met closes the moment it is met (SQ-D3.5). Closed is a deadline passed under target. A goal with no
-- deadline closes only as met, or when the owner removes it.
create or replace function public.squad_goals_due()
returns table (
  due_squad    uuid,
  due_name     text,
  due_outcome  text,
  due_total    numeric,
  due_target   int,
  due_ends     timestamptz,
  due_announce boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  r       record;
  v_total numeric;
begin
  for r in
    select s.id, s.name, s.owner_id, s.goal_target, s.goal_started_at, s.goal_ends_at,
           coalesce(s.goal_metric_kind, 'workout_count') as kind, s.goal_metric_key as key
      from public.squads s
     where s.goal_target is not null
       and s.goal_started_at is not null
       and s.goal_closed_at is null
  loop
    perform public.squad_goal_act_as(r.owner_id);
    begin
      v_total := coalesce(public.squad_metric_sum(r.id, r.kind, r.key, r.goal_started_at), 0);
    exception when others then
      continue;
    end;

    if v_total >= r.goal_target then
      due_outcome := 'met';
    elsif r.goal_ends_at is not null and r.goal_ends_at <= now() then
      due_outcome := 'closed';
    else
      continue;
    end if;

    due_squad    := r.id;
    due_name     := r.name;
    due_total    := v_total;
    due_target   := r.goal_target;
    due_ends     := r.goal_ends_at;
    -- The backfill rule: a deadline more than 7 days gone closes silently.
    due_announce := r.goal_ends_at is null or r.goal_ends_at > now() - interval '7 days';
    return next;
  end loop;

  perform public.squad_goal_act_as(null);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7 · the close — run by pg_cron every 15 minutes
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.squad_goals_close_due()
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  d      record;
  v_sq   public.squads%rowtype;
  v_done int := 0;
begin
  for d in select * from public.squad_goals_due() loop
    -- Its own block: one squad failing must not stop the run for everyone else.
    begin
      select * into v_sq from public.squads s where s.id = d.due_squad and s.goal_closed_at is null;
      if not found then
        continue;
      end if;

      perform public.squad_goal_act_as(v_sq.owner_id);

      -- A met goal is banked where the honors count it, exactly as the owner's next edit would have.
      if d.due_outcome = 'met' then
        begin
          perform public.archive_squad_goal(v_sq.id);
        exception when others then
          null;
        end;
      end if;

      perform public.squad_goal_record_close(
        v_sq.id, v_sq.goal_started_at, v_sq.goal, v_sq.goal_target,
        coalesce(v_sq.goal_metric_kind, 'workout_count'), v_sq.goal_metric_key, v_sq.goal_ends_at,
        d.due_total, d.due_outcome, d.due_announce
      );

      -- Guarded on started_at: if the owner set a new goal mid-run, this goal is not that one.
      update public.squads s
         set goal_closed_at = now(), goal_outcome = d.due_outcome
       where s.id = v_sq.id and s.goal_started_at = v_sq.goal_started_at and s.goal_closed_at is null;

      v_done := v_done + 1;
    exception when others then
      raise warning 'squad_goals_close_due: squad % failed: %', d.due_squad, sqlerrm;
    end;
  end loop;

  perform public.squad_goal_act_as(null);
  return v_done;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8 · the owner replaces or removes a goal before the job reached it
-- ─────────────────────────────────────────────────────────────────────────────
-- A NEW goal instance is a changed `goal_started_at` or a cleared target. An EDIT keeps the start — the
-- editor always writes it back — so extending a live deadline (D2) records nothing and simply stays live.
--
-- Whatever changed, the row is an open question again: `goal_closed_at` / `goal_outcome` are cleared. And
-- a cleared goal drops its deadline too — `clearSquadGoal` never nulled `goal_ends_at`, leaving a stale
-- date on the row.
--
-- ⚠ BEFORE UPDATE, so `squad_metric_sum` — which reads the window from `squads` — still sees the OLD row.
-- ⚠ Never raises: failing to write history must never stop the owner setting their next goal.
create or replace function public.squads_goal_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_total   numeric;
  v_outcome text;
begin
  if (new.goal, new.goal_target, new.goal_metric_kind, new.goal_metric_key, new.goal_started_at, new.goal_ends_at)
     is not distinct from
     (old.goal, old.goal_target, old.goal_metric_kind, old.goal_metric_key, old.goal_started_at, old.goal_ends_at) then
    return new;
  end if;

  if (new.goal_target is null or new.goal_started_at is distinct from old.goal_started_at)
     and old.goal_target is not null
     and old.goal_started_at is not null
     and old.goal_closed_at is null then
    begin
      v_total := coalesce(public.squad_metric_sum(
        old.id, coalesce(old.goal_metric_kind, 'workout_count'), old.goal_metric_key, old.goal_started_at), 0);
      v_outcome := case
        when v_total >= old.goal_target then 'met'
        when old.goal_ends_at is not null and old.goal_ends_at <= now() then 'closed'
        else 'removed'
      end;
      perform public.squad_goal_record_close(
        old.id, old.goal_started_at, old.goal, old.goal_target,
        coalesce(old.goal_metric_kind, 'workout_count'), old.goal_metric_key, old.goal_ends_at,
        v_total, v_outcome,
        v_outcome <> 'removed' and (old.goal_ends_at is null or old.goal_ends_at > now() - interval '7 days')
      );
    exception when others then
      raise warning 'squads_goal_lifecycle: squad % history not recorded: %', old.id, sqlerrm;
    end;
  end if;

  new.goal_closed_at := null;
  new.goal_outcome := null;
  if new.goal_target is null then
    new.goal_ends_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists squads_goal_lifecycle on public.squads;
create trigger squads_goal_lifecycle
  before update of goal, goal_target, goal_metric_kind, goal_metric_key, goal_started_at, goal_ends_at
  on public.squads
  for each row execute function public.squads_goal_lifecycle();

-- ─────────────────────────────────────────────────────────────────────────────
-- 9 · the inbox rows
-- ─────────────────────────────────────────────────────────────────────────────
-- Its own function, merged by the client, for the reason in the header. Same 14-day window and the same
-- read line (`notifications_seen_at`) as `notification_feed`.
--
--   squad_goal_met / squad_goal_closed — every member, from the log, announced closes only.
--   squad_goal_closing — the OWNER alone, when a live goal under target is within 2 days of its deadline
--     (§6). Derived, never stored; it disappears the moment the goal is met, extended, or closed. No push.
create or replace function public.squad_goal_notifications()
returns table (
  kind            text,
  at              timestamptz,
  unread          boolean,
  squad_id        uuid,
  squad_name      text,
  squad_crest     text,
  squad_photo_url text,
  detail          text
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_uid  uuid := auth.uid();
  v_seen timestamptz;
begin
  if v_uid is null then
    return;
  end if;

  select coalesce(p.notifications_seen_at, '-infinity'::timestamptz) into v_seen
    from public.profiles p where p.id = v_uid;
  v_seen := coalesce(v_seen, '-infinity'::timestamptz);

  return query
    select ('squad_goal_' || c.outcome)::text,
           c.closed_at,
           c.closed_at > v_seen,
           c.squad_id,
           s.name,
           s.crest,
           s.photo_url,
           c.summary
      from public.squad_goal_closures c
      join public.squad_members m on m.squad_id = c.squad_id and m.user_id = v_uid
      join public.squads s on s.id = c.squad_id
     where c.announced
       and c.outcome in ('met', 'closed')
       and c.closed_at > now() - interval '14 days';

  return query
    select 'squad_goal_closing'::text,
           s.goal_ends_at - interval '2 days',
           (s.goal_ends_at - interval '2 days') > v_seen,
           s.id,
           s.name,
           s.crest,
           s.photo_url,
           public.squad_goal_figure(coalesce(s.goal_metric_kind, 'workout_count'), x.total) || ' / '
             || public.squad_goal_figure(coalesce(s.goal_metric_kind, 'workout_count'), s.goal_target) || ' '
             || public.squad_goal_unit(coalesce(s.goal_metric_kind, 'workout_count'), s.goal_target)
      from public.squads s
      cross join lateral (
        select coalesce(public.squad_metric_sum(
          s.id, coalesce(s.goal_metric_kind, 'workout_count'), s.goal_metric_key, s.goal_started_at), 0) as total
      ) x
     where s.owner_id = v_uid
       and s.goal_target is not null
       and s.goal_started_at is not null
       and s.goal_closed_at is null
       and s.goal_ends_at is not null
       and s.goal_ends_at > now()
       and s.goal_ends_at <= now() + interval '2 days'
       and x.total < s.goal_target;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10 · the weekly recap stops attaching a goal that closed before its week
-- ─────────────────────────────────────────────────────────────────────────────
-- 0057's body, spliced programmatically with ONE predicate added to the goal block — never retyped. A goal
-- that closed DURING the recapped week still shows its final week; one closed earlier is not "this week's
-- goal" any more (0057 kept attaching it with a delta of about 0).
create or replace function public.ensure_weekly_recap(p_squad uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_start   timestamptz := date_trunc('week', now());   -- Postgres weeks start Monday
  v_prev    timestamptz := date_trunc('week', now()) - interval '7 days';
  v_sq      public.squads%rowtype;
  v_id      uuid;
  v_total   int;
  v_active  int;
  v_workouts int;
  v_prs     jsonb;
  v_honors  jsonb;
  v_goal    jsonb := null;
  v_delta   numeric;
begin
  if v_uid is null or not public.is_squad_member(p_squad, v_uid) then
    return null;
  end if;

  -- Already generated for the week that just ended? Nothing to do.
  select id into v_id
    from public.squad_posts
   where squad_id = p_squad and type = 'weekly' and recap_week = v_prev::date
   limit 1;
  if found then
    return v_id;
  end if;

  select * into v_sq from public.squads where id = p_squad;
  if not found then
    return null;
  end if;

  -- The window is the PRIOR seven days — the week that just closed, not the one in progress.
  select count(*)::int into v_total from public.squad_members where squad_id = p_squad;

  select count(*)::int into v_workouts
    from public.workouts w
    join public.squad_members sm on sm.user_id = w.athlete_id
   where sm.squad_id = p_squad and w.saved_at >= v_prev and w.saved_at < v_start;

  select count(distinct w.athlete_id)::int into v_active
    from public.workouts w
    join public.squad_members sm on sm.user_id = w.athlete_id
   where sm.squad_id = p_squad and w.saved_at >= v_prev and w.saved_at < v_start;

  -- A week where nobody trained isn't a summary worth posting — silence beats "0 sessions".
  if v_workouts = 0 then
    return null;
  end if;

  -- PRs, named by member. No ordering by size: SQ-D8 §4 forbids ranking inside the summary.
  select coalesce(jsonb_agg(jsonb_build_object('name', x.name, 'exercise', x.exercise, 'value', x.value) order by x.name), '[]'::jsonb)
    into v_prs
    from (
      select coalesce(p.name, 'Athlete') as name,
             pr.exercise,
             case pr.measure_kind::text
               when 'load'     then trim(to_char(pr.load_value, 'FM999999990.##')) || ' ' || coalesce(pr.load_unit, 'lb')
               when 'time'     then to_char((pr.time_seconds || ' seconds')::interval, 'MI:SS')
               when 'distance' then trim(to_char(pr.distance_value, 'FM999999990.##')) || ' ' || coalesce(pr.distance_unit, 'mi')
               when 'reps'     then pr.reps_count || ' reps'
               else ''
             end as value
        from public.personal_records pr
        join public.squad_members sm on sm.user_id = pr.athlete_id
        join public.profiles p on p.id = pr.athlete_id
       where sm.squad_id = p_squad
         and pr.achieved_on >= v_prev::date and pr.achieved_on < v_start::date
    ) x;

  select coalesce(jsonb_agg(jsonb_build_object('name', coalesce(p.name, 'Athlete'), 'honor', h.display_name) order by p.name), '[]'::jsonb)
    into v_honors
    from public.honor_instances h
    join public.squad_members sm on sm.user_id = h.athlete_id
    join public.profiles p on p.id = h.athlete_id
   where sm.squad_id = p_squad
     and h.awarded_at >= v_prev and h.awarded_at < v_start;

  -- Goal progress FOR THE WEEK: the same metric the squad's goal counts, measured over this window
  -- only. Reuses squad_metric_sum (0051) so the recap and the goal bar can't disagree.
  if v_sq.goal_target is not null and v_sq.goal_started_at is not null
     and (v_sq.goal_closed_at is null or v_sq.goal_closed_at >= v_prev) then
    v_delta := public.squad_metric_sum(
      p_squad,
      coalesce(v_sq.goal_metric_kind, 'workout_count'),
      v_sq.goal_metric_key,
      greatest(v_prev, v_sq.goal_started_at)
    );
    v_goal := jsonb_build_object(
      'title',  v_sq.goal,
      'kind',   coalesce(v_sq.goal_metric_kind, 'workout_count'),
      'delta',  round(coalesce(v_delta, 0), 1),
      'target', v_sq.goal_target
    );
  end if;

  insert into public.squad_posts (squad_id, author_id, type, body, recap_week, recap)
    values (
      p_squad,
      null,
      'weekly',
      null,
      v_prev::date,
      jsonb_build_object(
        'week_start',    v_prev,
        'week_end',      v_start,
        'workouts',      v_workouts,
        'participation', jsonb_build_object('active', v_active, 'total', v_total),
        'prs',           v_prs,
        'pr_count',      jsonb_array_length(v_prs),
        'honors',        v_honors,
        'honor_count',   jsonb_array_length(v_honors),
        'goal',          v_goal
      )
    )
    on conflict do nothing
    returning id into v_id;

  -- Lost the race to a concurrent caller — take theirs.
  if v_id is null then
    select id into v_id from public.squad_posts
     where squad_id = p_squad and type = 'weekly' and recap_week = v_prev::date limit 1;
  end if;

  return v_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 11 · grants
-- ─────────────────────────────────────────────────────────────────────────────
-- ⚠ Revoke FROM PUBLIC, never from `authenticated` alone: Postgres grants EXECUTE to PUBLIC on every new
-- function. `squad_goal_act_as` above all — it sets the request's subject — is reachable by nothing a
-- client can call.
revoke execute on function public.squad_goal_act_as(uuid) from public;
revoke execute on function public.squad_goal_record_close(uuid, timestamptz, text, int, text, text, timestamptz, numeric, text, boolean) from public;
revoke execute on function public.squad_goals_due() from public;
revoke execute on function public.squad_goals_close_due() from public;
revoke execute on function public.squads_goal_lifecycle() from public;
revoke execute on function public.squad_goal_notifications() from public;
grant execute on function public.squad_goal_notifications() to authenticated;

commit;

-- ─────────────────────────────────────────────────────────────────────────────
-- 12 · the job
-- ─────────────────────────────────────────────────────────────────────────────
-- Quarter-hourly, beside the briefing. A lazy close — on feed open, like the Weekly Summary — would
-- reproduce the report exactly: nothing happens until somebody opens the squad.
select cron.unschedule('forge-squad-goals') where exists (select 1 from cron.job where jobname = 'forge-squad-goals');
select cron.schedule('forge-squad-goals', '*/15 * * * *', $cron$ select public.squad_goals_close_due(); $cron$);


-- ═════════════════════════════════════════════════════════════════════════════
-- §2 — ASSERT. Raises if anything above did not land.
-- ═════════════════════════════════════════════════════════════════════════════

do $$
declare
  v_missing text[] := '{}';
  f text;
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'squads' and column_name = 'goal_closed_at') then
    v_missing := v_missing || 'squads.goal_closed_at';
  end if;
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'squads' and column_name = 'goal_outcome') then
    v_missing := v_missing || 'squads.goal_outcome';
  end if;
  if not exists (select 1 from pg_constraint where conname = 'squads_goal_outcome_check') then
    v_missing := v_missing || 'squads_goal_outcome_check';
  end if;
  if to_regclass('public.squad_goal_closures') is null then
    v_missing := v_missing || 'squad_goal_closures';
  end if;

  foreach f in array array[
    'squad_goal_figure', 'squad_goal_unit', 'squad_goal_act_as', 'squad_goal_record_close',
    'squad_goals_due', 'squad_goals_close_due', 'squads_goal_lifecycle', 'squad_goal_notifications'
  ] loop
    if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                    where n.nspname = 'public' and p.proname = f) then
      v_missing := v_missing || f;
    end if;
  end loop;

  if not exists (select 1 from pg_trigger where tgname = 'squads_goal_lifecycle' and not tgisinternal) then
    v_missing := v_missing || 'trigger squads_goal_lifecycle';
  end if;
  if not exists (select 1 from cron.job where jobname = 'forge-squad-goals') then
    v_missing := v_missing || 'cron job forge-squad-goals';
  end if;
  if position('goal_closed_at' in pg_get_functiondef('public.ensure_weekly_recap(uuid)'::regprocedure)) = 0 then
    v_missing := v_missing || 'ensure_weekly_recap goal guard';
  end if;

  if array_length(v_missing, 1) > 0 then
    raise exception '0200 did not land: %', array_to_string(v_missing, ', ');
  end if;

  -- The helper that sets the request's subject must be unreachable from a client.
  if has_function_privilege('authenticated', 'public.squad_goal_act_as(uuid)', 'execute')
     or has_function_privilege('anon', 'public.squad_goal_act_as(uuid)', 'execute') then
    raise exception '0200: squad_goal_act_as is callable by a client — the revoke did not apply';
  end if;
  if not has_function_privilege('authenticated', 'public.squad_goal_notifications()', 'execute') then
    raise exception '0200: squad_goal_notifications is not callable by a signed-in athlete';
  end if;

  -- The wording the post and the inbox will print.
  if public.squad_goal_figure('workout_count', 412) <> '412'
     or public.squad_goal_figure('volume_total', 25000) <> '25,000'
     or public.squad_goal_figure('distance_total', 12) <> '12'
     or public.squad_goal_figure('distance_total', 12.34) <> '12.3'
     or public.squad_goal_unit('workout_count', 1) <> 'workout'
     or public.squad_goal_unit('workout_count', 412) <> 'workouts' then
    raise exception '0200: goal wording helpers print the wrong thing';
  end if;

  raise notice '0200 OK — columns, log, 8 functions, trigger, job, recap guard, grants and wording all present.';
end $$;

-- ═════════════════════════════════════════════════════════════════════════════
-- §3 — REPORT. Read-only.
-- ═════════════════════════════════════════════════════════════════════════════
--
-- PREDICTION, before it runs:
--   · Result 1 — one row per squad the first run will close. Moch 1 should be here as `closed`, with
--     `due_announce = true` if its deadline passed within the last 7 days. Any squad whose goal is
--     already met shows as `met`. A live goal short of its deadline is NOT listed — that is correct.
--   · Result 2 — 1 row: forge-squad-goals, */15 * * * *.
--   · Result 3 — 0 closures, 0 posts: nothing has closed until the job's first run.
--   Paste this §3 again 15 minutes later: Result 1 empty, Result 3 counting the squads Result 1 listed.

select due_name, due_outcome, due_total, due_target, due_ends, due_announce
  from public.squad_goals_due()
 order by due_name;

select jobname, schedule, active from cron.job where jobname = 'forge-squad-goals';

select count(*)                                  as closures,
       count(*) filter (where announced)         as announced,
       count(*) filter (where post_id is not null) as posts
  from public.squad_goal_closures;
