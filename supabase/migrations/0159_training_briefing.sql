-- Forge Legacy — 0159: the morning briefing
--
-- ══ THE ASK ══
--
-- A tester: *"it would be nice to get a notification in the morning letting me know what my workout for
-- the day was, and maybe a 'let's get it' type of message."*
--
-- ══ ⚠ THIS IS THE FIRST NOTIFICATION IN THE APP NOT CAUSED BY ANOTHER PERSON ══
--
-- All sixteen branches of `notification_events_for` are somebody DOING something to you: inviting,
-- joining, commenting, reacting, training. `P-5-Notifications-Architecture.md` §1 records, as an audit
-- finding, that marketing and re-engagement notifications are absent from every locked document, and
-- `Calendar-System-Architecture-v1.0` CAL-D19 says the app "never notifies about inactivity".
--
-- So this is deliberately NOT part of that union. It is a scheduled sender that writes `push_outbox`
-- directly — the shape 0137 established for the operator signup alert — and it is governed by
-- `P-5-Amendment-003-Training-Briefing.md`, which is where the reasoning lives.
--
-- The line it must not cross: **a briefing states what is next; a nudge comments on what you did not
-- do.** Everything below exists to keep it the former.
--
-- ══ ⚠ THERE IS NO CALENDAR IN THIS APP, SO IT NEVER SAYS "TODAY" ══
--
-- `planned_workouts` (0136) has no date column. `ProgramStructure` has no weekday field — `daysPerWeek`
-- is a COUNT. Progress advances only when a `program_sessions` row is written, never with the clock, and
-- `progress-core.ts` states outright that elapsed calendar time is forbidden as a judgement input
-- (`Program-Architecture-Amendment-001` §4).
--
-- The title is therefore **"Next up"**, and it is honest. "Today's workout" would be a claim the schema
-- cannot support, wrong the first time anybody trained on a Tuesday instead of a Monday.
--
-- ══ ⚠ THE QUIET RULE — THE MOST IMPORTANT DECISION IN THIS FILE ══
--
-- Because the answer is a function of what you have DONE and not of the date, a daily job returns the
-- SAME session every morning until the athlete trains or skips. Right on day one; by day five it is a
-- repeated tap on the shoulder about something undone — an inactivity notification built by accident,
-- which is the exact thing CAL-D19 forbids.
--
-- So the briefing announces a given open session **at most twice**, and then goes silent until a
-- `program_sessions` row lands. It never says that it went quiet, never counts the days, and never
-- mentions the silence when it resumes. The app backs off instead of escalating.
--
-- ⚠ IT READS COMPLETION ONLY IN ORDER TO STOP SENDING. Nothing here can ever produce a message ABOUT an
-- unfinished session — `last_count >= 2` is a `continue`, never a different body.
--
-- ══ TONE COMES FROM A DIAL THAT ALREADY EXISTS ══
--
-- `profiles.app_prefs.coachIntensity` (`reminders | steady | push | drive`, CI-D1) exists because the PO
-- had already found the range: *"Some people want to be pushed... Some people want just reminders. So
-- it's a very big range."* This reuses it rather than inventing a second tone control that could
-- disagree with the first.
--
-- ⚠ `reminders` STILL RECEIVES THE BRIEFING — it receives it without a line. CI-D5: *"`reminders` is not
-- 'no coach'; it is the technique cue and nothing else"*, and the PO's own example of that level was *"a
-- helpful coaching DAILY reminder"*. This notification is that, minus the hype.
--
-- ⚠ EXPERIENCE RESOLVES TO `beginner`, PER CI-D8. `coach-memory.ts` keeps experience on the DEVICE, so
-- the server never has it. CI-D8's rule for an absent experience is the safe row, not the middle one —
-- which here means the voice is never louder than the athlete's dial has actually earned.
--
-- Idempotent. Depends on 0001 (profiles), 0013/0017 (programs), 0119 (program_slots, program_sessions),
-- 0120 (push_outbox, push_tokens, push_prefs_allows, pg_cron), 0136 (planned_workouts).

begin;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 1. THE SCHEDULE — which days, what hour, and the quiet-rule state
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- ⚠ `days` IS WHEN THE BRIEFING FIRES, NOT WHEN THE ATHLETE TRAINS. That distinction is the whole reason
-- this table is three columns instead of a training schedule. A "I train Mon/Wed/Fri" field would let the
-- app decide that a Tuesday was a failure, and `Calendar-System-Architecture-v1.0` — LOCKED, unbuilt — is
-- where that concept belongs if it is ever wanted. Here the athlete is only choosing when to be told.

create table if not exists public.briefing_schedule (
  athlete_id   uuid primary key references public.profiles(id) on delete cascade,
  -- ISO day-of-week, 1 = Monday … 7 = Sunday, matching `extract(isodow …)`.
  days         smallint[] not null check (
                 array_length(days, 1) between 1 and 7
                 and days <@ array[1,2,3,4,5,6,7]::smallint[]
               ),
  hour         smallint not null check (hour between 0 and 23),
  -- ── the quiet rule's memory ──
  -- Which item was last announced ('p:<program>:<week>:<day>' or 'w:<stamp>'), and how many times in a
  -- row. A different key resets the count to 1 on its own, so training or skipping needs no trigger here.
  last_key     text,
  last_count   smallint not null default 0,
  -- The athlete's LOCAL date, which is what makes a quarter-hourly job send once a day.
  last_sent_on date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- The cron walk is "everyone with a briefing", so the hour is the only useful narrowing.
create index if not exists briefing_schedule_hour on public.briefing_schedule (hour);

alter table public.briefing_schedule enable row level security;

drop policy if exists briefing_schedule_own_select on public.briefing_schedule;
drop policy if exists briefing_schedule_own_insert on public.briefing_schedule;
drop policy if exists briefing_schedule_own_update on public.briefing_schedule;
drop policy if exists briefing_schedule_own_delete on public.briefing_schedule;

create policy briefing_schedule_own_select on public.briefing_schedule for select
  using (athlete_id = auth.uid());
create policy briefing_schedule_own_insert on public.briefing_schedule for insert
  with check (athlete_id = auth.uid());
create policy briefing_schedule_own_update on public.briefing_schedule for update
  using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
create policy briefing_schedule_own_delete on public.briefing_schedule for delete
  using (athlete_id = auth.uid());

comment on table public.briefing_schedule is
  'When an athlete wants their morning briefing — which weekdays and what local hour — plus the quiet '
  'rule''s memory (last item announced, how many times, and the local date it last sent). A row exists '
  'only for an athlete who set one up; the notif_prefs toggle is the master switch. Migration 0159.';

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 2. THE DAY BEHIND A SLOT — the gap between `program_slots` and a sentence
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- `program_slots` (0119) answers WHICH session is next as `(week_index, day_index)`. Nothing in SQL has
-- ever needed its NAME before, because the only server-side consumer was `save_workout` deciding
-- graduation, which counts rather than reads.
--
-- ⚠ `day_index` INDEXES THE FILTERED LIST, NOT THE RAW ONE. `trainingDays()` in `progress-core.ts` drops
-- days with no warmup, no main and no cooldown before indexing — a day with nothing in it is not a
-- session you owe — and `program_slots`'s `sized` CTE counts exactly those non-empty days. A resolver
-- that indexed `days[day_index]` directly would be silently off by one for every program containing an
-- empty day, and would name the wrong session rather than fail.
--
-- So the filter predicate below is 0119's, character for character, and the self-check at the foot of
-- this file pins the result against the TypeScript twin.
create or replace function public.briefing_day(p_structure jsonb, p_week int, p_day int)
returns table(name text, cnt int)
language sql
immutable
parallel safe
as $$
  with s as (select coalesce(p_structure, '{}'::jsonb) as j),
  arr as (
    select case
             when s.j->'vary' = 'true'::jsonb
              and jsonb_typeof(s.j->'weekPlans'->p_week->'days') = 'array'
               then s.j->'weekPlans'->p_week->'days'
             when jsonb_typeof(s.j->'days') = 'array'
               then s.j->'days'
             else null
           end as days
      from s
  ),
  filtered as (
    -- `d_json`, not `day`: `day` is a keyword inside `extract`/interval syntax, and this file is applied
    -- by hand in a SQL editor with nothing to catch a parse error but the person pasting it.
    select d.value as d_json,
           (row_number() over (order by d.ord) - 1)::int as idx
      from arr
      cross join lateral jsonb_array_elements(coalesce(arr.days, '[]'::jsonb)) with ordinality d(value, ord)
     where jsonb_typeof(d.value) = 'object'
       and (case when jsonb_typeof(d.value->'warmup')   = 'array' then jsonb_array_length(d.value->'warmup')   else 0 end)
         + (case when jsonb_typeof(d.value->'main')     = 'array' then jsonb_array_length(d.value->'main')     else 0 end)
         + (case when jsonb_typeof(d.value->'cooldown') = 'array' then jsonb_array_length(d.value->'cooldown') else 0 end) > 0
  )
  -- The same fallback the hero card uses: a day with no name is "Day A", never a blank line.
  select coalesce(nullif(btrim(f.d_json->>'name'), ''), 'Day ' || coalesce(f.d_json->>'letter', '?')),
         case when jsonb_typeof(f.d_json->'main') = 'array' then jsonb_array_length(f.d_json->'main') else 0 end
    from filtered f
   where f.idx = p_day;
$$;

comment on function public.briefing_day(jsonb, int, int) is
  'The name and main-exercise count of the session at (week_index, day_index) — indexing the SAME '
  'non-empty-day filter program_slots() applies, so it agrees with scheduleSlots()/trainingDays() in '
  'src/domain/program/progress-core.ts. Returns no row when the slot has no day object behind it. 0159.';

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 3. THE COPY — rows, not code
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- Kept as data for the same reason the honor catalogue is (0077): the next change to this is somebody
-- disliking a sentence, and that should be an UPDATE rather than a migration.
--
-- ⚠ THE `quiet` REGISTER HAS NO ROWS, ON PURPOSE. At `reminders` the body is the facts and stops. An
-- empty table for it would be a table waiting to be filled; its absence is the decision.
--
-- ⚠ BINDING COPY RULE (this is CI-D11 pointed at a lock screen): NO LINE MAY CHARACTERISE ELAPSED TIME,
-- ABSENCE, OR ANYTHING THE ATHLETE HAS NOT DONE. `Home-Screen-Wireframe-Spec-H1.md` fails H-1 when it
-- "communicates what the athlete has NOT done", and the same bar applies here. A regex test over these
-- rows enforces it, because this is the exact table a well-meaning edit would put "back at it!" into.

create table if not exists public.briefing_lines (
  register text     not null check (register in ('plain', 'direct')),
  idx      smallint not null,
  text     text     not null check (char_length(btrim(text)) between 1 and 120),
  primary key (register, idx)
);

alter table public.briefing_lines enable row level security;
-- ⚠ NO POLICIES, and not an omission — the same posture 0137 takes with `app_admins`. Nothing on a client
-- reads this: the sender words the notification server-side and `push_outbox` stores the finished text.

insert into public.briefing_lines (register, idx, text) values
  -- `plain` — steady and push. An invitation with the door already open.
  ('plain',  1, 'It''s there when you are.'),
  ('plain',  2, 'Everything''s laid out. Just show up.'),
  ('plain',  3, 'The work is written. Go do it.'),
  ('plain',  4, 'Start with the warm-up. It earns the rest of the session.'),
  ('plain',  5, 'One session. That''s the whole ask.'),
  ('plain',  6, 'Take your time on the first set.'),
  -- `direct` — drive. Louder, never harsher; it talks about the work, never about the athlete.
  ('direct', 1, 'Go take it.'),
  ('direct', 2, 'Load the bar. The first set decides the session.'),
  ('direct', 3, 'You know the lifts. Go get after them.'),
  ('direct', 4, 'Chalk up. Let''s work.'),
  ('direct', 5, 'Get in, do the work, get out.'),
  ('direct', 6, 'Let''s get it.')
on conflict (register, idx) do nothing;

comment on table public.briefing_lines is
  'The optional closing line of a morning briefing, keyed by the register coachIntensity resolves to '
  '(CI-D10). `quiet` has no rows — at `reminders` the body is the facts alone. No line may reference '
  'elapsed time or anything undone; a test asserts it. Migration 0159.';

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 4. PREFERENCES — one new key, restated in full
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- Restated whole, per this file set's standing discipline: `push_pref_key` is rebuilt by every migration
-- that adds a kind, and rebuilding from an older copy is how 0088, 0092 and 0106 each silently deleted a
-- shipped feature. This body is 0153's with one row added.
--
-- ⚠ THE KIND IS REGISTERED HERE EVEN THOUGH IT NEVER PASSES THROUGH `push_enqueue_for`. That is the
-- point: registering it means `briefing_send` can call `push_prefs_allows` — the identical gate every
-- other notification in the app is filtered by — instead of hand-rolling a second reading of
-- `notif_prefs` that could disagree with the first.

create or replace function public.push_pref_key(p_kind text)
returns text
language sql
immutable
as $$
  select case p_kind
    when 'join_request'         then 'squad_activity'
    when 'member_joined'        then 'squad_activity'
    when 'request_approved'     then 'squad_activity'
    when 'friend_request'       then 'friend_requests'
    when 'friend_accepted'      then 'friend_requests'
    when 'challenge_invite'     then 'challenge_updates'
    when 'workout_invite'       then 'workout_tags'
    when 'workout_join_request' then 'workout_tags'
    when 'program_shared'       then 'program_shares'
    when 'squad_post'           then 'squad_feed'
    when 'squad_checkin'        then 'squad_feed'
    when 'squad_recap'          then 'squad_feed'
    when 'post_comment'         then 'post_comments'
    when 'post_reaction'        then 'squad_reactions'
    when 'squad_training_started'  then 'squad_training'
    when 'squad_training_finished' then 'squad_training'
    -- 0159. Its own key, and the first one whose event has no actor.
    when 'training_briefing'    then 'training_briefing'
    else null
  end;
$$;

-- ⚠ These MUST equal `NOTIF_DEFAULTS` in src/domain/settings/notifications.ts. A test parses this
-- function and asserts the two agree, because a default that differs between client and sender means the
-- screen shows one thing and the server does another, silently.
create or replace function public.push_pref_default(p_key text)
returns boolean
language sql
immutable
as $$
  select case p_key
    when 'squad_activity'    then false
    when 'friend_requests'   then true
    when 'challenge_updates' then false
    when 'workout_tags'      then true
    when 'program_shares'    then true
    when 'squad_feed'        then false
    when 'squad_reactions'   then false
    when 'squad_goals'       then false
    when 'squad_invites'     then true
    when 'post_comments'     then true
    when 'squad_training'    then true
    -- 0159. FALSE — P-5 §3.1's ambient default. This is the one notification in the app that nobody
    -- else triggers, so nothing about it is a request the athlete would be sorry to miss; and a daily
    -- push that arrives without being asked for is precisely the posture DNA §8 rules out.
    when 'training_briefing' then false
    else false
  end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 5. THE BODY — what "next up" actually is, for one athlete
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- Precedence follows `composeHome()` in `src/domain/home/composition.ts`: an active program's session
-- outranks a one-off built for later. The `resume` face outranks both on Home, but it is a DEVICE-LOCAL
-- autosave and invisible from here — which is exactly why a tapped briefing lands on Home rather than
-- launching a session directly. Home re-runs the real composition and honours the resume this cannot see.
--
-- ⚠ RETURNS NO ROW WHEN THERE IS NOTHING TO SAY. No active program and no planned workout is a reason to
-- stay quiet. "Nothing planned — get after it" would be a notification whose entire content is that the
-- athlete has not done something, which is the one thing this feature may never send.
create or replace function public.briefing_body(p_user uuid)
returns table(title text, body text, item_key text)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_prog     record;
  v_planned  record;
  v_wk       int;
  v_dy       int;
  v_name     text;
  v_cnt      int;
  v_level    text;
  v_register text;
  v_line     text;
  v_facts    text;
  v_key      text;
begin
  select coalesce(p.app_prefs->>'coachIntensity', 'steady') into v_level
    from public.profiles p
   where p.id = p_user;

  -- CI-D8: experience lives on the device, so "absent" is what the server always sees. Resolving to the
  -- `beginner` row means `push` speaks in `plain` rather than `direct` — quieter than the athlete's dial
  -- might allow, never louder.
  v_register := case v_level
                  when 'reminders' then 'quiet'
                  when 'drive'     then 'direct'
                  else 'plain'
                end;

  select pr.id, pr.structure into v_prog
    from public.programs pr
   where pr.athlete_id = p_user
     and pr.state = 'active'
   limit 1;   -- 0017's partial unique index already guarantees at most one

  if v_prog.id is not null then
    -- The same walk `save_workout` makes (0119): the first slot with no mark against it.
    select s.week_index, s.day_index into v_wk, v_dy
      from public.program_slots(v_prog.structure) s
     where not exists (
             select 1
               from public.program_sessions ps
              where ps.program_id = v_prog.id
                and ps.week_index = s.week_index
                and ps.day_index  = s.day_index)
     order by s.ordinal
     limit 1;

    if v_wk is not null then
      select d.name, d.cnt into v_name, v_cnt
        from public.briefing_day(v_prog.structure, v_wk, v_dy) d;

      if v_name is not null then
        v_key   := 'p:' || v_prog.id::text || ':' || v_wk || ':' || v_dy;
        v_facts := 'Week ' || (v_wk + 1) || ', Day ' || (v_dy + 1) || ' — ' || v_name
                   || ' · ' || v_cnt || ' exercise' || case when v_cnt = 1 then '' else 's' end;
      end if;
    end if;
  end if;

  if v_facts is null then
    select pw.name,
           jsonb_array_length(coalesce(pw.exercises, '[]'::jsonb)) as n,
           pw.updated_at
      into v_planned
      from public.planned_workouts pw
     where pw.athlete_id = p_user;

    if v_planned.name is not null then
      -- Keyed on the stamp, so replacing the plan (0136 upserts over one row) is a NEW item and the
      -- quiet rule's count starts again — the athlete built something else and should hear about it.
      v_key   := 'w:' || to_char(v_planned.updated_at at time zone 'UTC', 'YYYYMMDDHH24MISS');
      v_facts := v_planned.name
                 || ' · ' || v_planned.n || ' exercise' || case when v_planned.n = 1 then '' else 's' end;
    end if;
  end if;

  if v_facts is null then
    return;   -- nothing to say; see the header
  end if;

  if v_register <> 'quiet' then
    select l.text into v_line
      from public.briefing_lines l
     where l.register = v_register
     -- Deterministic per athlete AND per item: varied between people and between sessions, identical
     -- across the two announcements of the SAME session, so a repeat never reads as a different workout.
     order by md5(p_user::text || v_key || l.idx::text)
     limit 1;
  end if;

  return query select
    'Next up'::text,
    (v_facts || coalesce(E'\n' || v_line, ''))::text,
    v_key::text;
end;
$$;

comment on function public.briefing_body(uuid) is
  'The morning briefing for one athlete: title, body and the item key the quiet rule counts against. '
  'Program session outranks a planned one-off (composeHome precedence); returns NO ROW when neither '
  'exists, because silence is the right answer to an empty schedule. Tone from coachIntensity. 0159.';

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 6. THE SENDER — the only time-triggered thing in this database that talks to an athlete
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- ⚠ EVERY GATE BELOW FAILS SILENTLY AND LOOKS LIKE "the briefing is quiet", so each one is named:
--   · `tz is null`          — 0099 deliberately left it nullable ("a guessed timezone awards honors that
--                             did not happen"). Near-unreachable here, since a push token implies a
--                             launch and `syncAthletePresence()` writes tz on every launch — but guessing
--                             would mean firing at 7am in a city the athlete does not live in.
--   · no live push token    — `push_enqueue_for` makes the same check: a row nothing can deliver sits
--                             PENDING and then FAILED.
--   · `push_prefs_allows`   — the master switch, read through the identical gate as every other kind.
--   · `last_sent_on`        — the job runs quarter-hourly; this is what makes it a DAILY notification.
--   · the quiet rule        — see the header. A `continue`, never a different message.
create or replace function public.briefing_send()
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r        record;
  v        record;
  v_local  timestamp;
  v_date   date;
  v_dow    int;
  v_hour   int;
  v_sent   int := 0;
begin
  for r in
    select b.athlete_id, b.days, b.hour, b.last_key, b.last_count, b.last_sent_on,
           p.tz,
           coalesce(p.notif_prefs, '{}'::jsonb) as prefs
      from public.briefing_schedule b
      join public.profiles p on p.id = b.athlete_id
     where p.tz is not null
       and exists (
             select 1 from public.push_tokens t
              where t.user_id = b.athlete_id and t.disabled_at is null)
  loop
    if not public.push_prefs_allows(r.prefs, 'training_briefing') then
      continue;
    end if;

    -- An unrecognised IANA string raises. One athlete with a bad tz must not stop the run for everyone
    -- else, which is the whole reason this is its own block.
    begin
      v_local := now() at time zone r.tz;
    exception when others then
      continue;
    end;

    v_date := v_local::date;
    v_dow  := extract(isodow from v_local)::int;
    v_hour := extract(hour   from v_local)::int;

    if r.last_sent_on is not distinct from v_date then continue; end if;
    if not (v_dow = any (r.days))                 then continue; end if;
    if v_hour <> r.hour                           then continue; end if;

    select * into v from public.briefing_body(r.athlete_id);
    if v.item_key is null then continue; end if;

    -- ⚠ THE QUIET RULE. Announced twice already and still open: say nothing, and never say why.
    if r.last_key is not distinct from v.item_key and r.last_count >= 2 then continue; end if;

    insert into public.push_outbox (user_id, kind, event_at, title, body, route)
    values (
      r.athlete_id,
      'training_briefing',
      -- Local midnight, not now(): a stable per-athlete-per-day value, so 0120's `push_outbox_event_uk`
      -- makes a double run free rather than merely unlikely.
      date_trunc('day', v_local) at time zone r.tz,
      v.title,
      v.body,
      '/'
    )
    on conflict do nothing;

    update public.briefing_schedule s
       set last_key     = v.item_key,
           -- A different key resets the count on its own. That is why training or skipping needs no
           -- trigger to reach this table: the next open slot simply has a different key.
           last_count   = case when s.last_key is not distinct from v.item_key then s.last_count + 1 else 1 end,
           last_sent_on = v_date,
           updated_at   = now()
     where s.athlete_id = r.athlete_id;

    v_sent := v_sent + 1;
  end loop;

  return v_sent;
end;
$$;

comment on function public.briefing_send() is
  'The morning briefing sender, run quarter-hourly by pg_cron. Writes push_outbox directly (0137''s '
  'shape) rather than joining the notification union, because nobody caused this event. Sends at most '
  'once per athlete-local day, and at most twice for any one open session — after that it goes quiet '
  'until progress is recorded, and never says so. Migration 0159.';

-- ⚠ Revoke FROM PUBLIC, never from `authenticated`: Postgres grants EXECUTE to PUBLIC on every new
-- function, and revoking from a role that never held a direct grant removes nothing (0120, 0129, 0130,
-- 0137 all carry this note). `briefing_body` is SECURITY DEFINER over ANY user id — it would answer for
-- anybody's programs if left reachable. Nothing on a client calls any of these three.
revoke execute on function public.briefing_body(uuid) from public;
revoke execute on function public.briefing_send() from public;
revoke execute on function public.briefing_day(jsonb, int, int) from public;

commit;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 7. THE JOB
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- ⚠ QUARTER-HOURLY, NOT HOURLY. `Asia/Kolkata` is +05:30, `Asia/Kathmandu` +05:45 and
-- `Pacific/Chatham` +12:45 — an hourly job pinned to UTC:00 lands mid-hour in all three and would still
-- work, but only by accident of `extract(hour …)`. Four passes an hour makes the local-hour match
-- reliable everywhere, and `last_sent_on` makes the other three free.
select cron.unschedule('forge-briefing') where exists (select 1 from cron.job where jobname = 'forge-briefing');
select cron.schedule('forge-briefing', '*/15 * * * *', $cron$ select public.briefing_send(); $cron$);

-- ══ SELF-CHECKS ══════════════════════════════════════════════════════════════════════════════════════
-- Outside the transaction, so a failure reports rather than rolling back a migration that worked.

-- ⚠ GOLDEN VECTORS FOR `briefing_day`, PINNED AGAINST THE TYPESCRIPT.
--
-- This is 0119's discipline applied to the one rule 0159 adds. `src/domain/notifications/__tests__/
-- briefing.test.mjs` PARSES the literal below and runs `scheduleSlots()` over the same structures, so the
-- vectors are written once and both sides are held to them. Case 3 is the one that matters: an empty day
-- sits between two real ones, so a resolver indexing the raw array would name "Pull" where the schedule
-- means "Legs".
do $$
declare
  -- ⚠ EVERY DAY CARRIES ALL THREE ARRAYS, because a real `ProgramDay` does. The SQL is defensive about a
  -- missing `warmup`/`cooldown` (`jsonb_typeof … else 0`) and the TypeScript is not — `trainingDays()`
  -- reads `d.warmup.length` straight — so a tidied-down fixture would exercise a shape the app never
  -- stores and would throw on the twin instead of comparing against it.
  v_cases jsonb := '[
    {"week":0,"day":0,"name":"Push","count":2,
     "structure":{"weeks":2,"daysPerWeek":2,"days":[
       {"letter":"A","name":"Push","warmup":[],"main":[{"a":1},{"b":2}],"cooldown":[]},
       {"letter":"B","name":"Pull","warmup":[],"main":[{"c":3}],"cooldown":[]}]}},
    {"week":0,"day":1,"name":"Pull","count":1,
     "structure":{"weeks":2,"daysPerWeek":2,"days":[
       {"letter":"A","name":"Push","warmup":[],"main":[{"a":1},{"b":2}],"cooldown":[]},
       {"letter":"B","name":"Pull","warmup":[],"main":[{"c":3}],"cooldown":[]}]}},
    {"week":0,"day":1,"name":"Legs","count":3,
     "structure":{"weeks":1,"daysPerWeek":2,"days":[
       {"letter":"A","name":"Push","warmup":[],"main":[{"a":1}],"cooldown":[]},
       {"letter":"B","name":"","warmup":[],"main":[],"cooldown":[]},
       {"letter":"C","name":"Legs","warmup":[],"main":[{"a":1},{"b":2},{"c":3}],"cooldown":[]}]}},
    {"week":1,"day":0,"name":"Heavy Day","count":1,
     "structure":{"weeks":2,"daysPerWeek":1,"vary":true,"weekPlans":[
       {"days":[{"letter":"A","name":"Light Day","warmup":[],"main":[{"a":1}],"cooldown":[]}]},
       {"days":[{"letter":"A","name":"Heavy Day","warmup":[],"main":[{"a":1}],"cooldown":[]}]}]}},
    {"week":0,"day":0,"name":"Day A","count":1,
     "structure":{"weeks":1,"daysPerWeek":1,"days":[
       {"letter":"A","name":"   ","warmup":[],"main":[{"a":1}],"cooldown":[]}]}}
  ]'::jsonb;
  c      jsonb;
  v_name text;
  v_cnt  int;
begin
  for c in select * from jsonb_array_elements(v_cases)
  loop
    v_name := null; v_cnt := null;
    select d.name, d.cnt into v_name, v_cnt
      from public.briefing_day(c->'structure', (c->>'week')::int, (c->>'day')::int) d;

    if v_name is distinct from (c->>'name') or v_cnt is distinct from (c->>'count')::int then
      raise exception '0159 self-check: briefing_day gave %/%, expected %/% for %',
        v_name, v_cnt, c->>'name', c->>'count', c;
    end if;
  end loop;
end $$;

-- Presence, because "the migration ran" and "the objects exist" have come apart on this project before.
do $$
begin
  if to_regclass('public.briefing_schedule') is null then
    raise exception '0159 self-check: briefing_schedule was not created';
  end if;
  if to_regprocedure('public.briefing_send()') is null then
    raise exception '0159 self-check: briefing_send was not created';
  end if;
  if (select count(*) from public.briefing_lines) < 12 then
    raise exception '0159 self-check: the copy table is short — expected 12 lines, found %',
      (select count(*) from public.briefing_lines);
  end if;
  if not exists (select 1 from cron.job where jobname = 'forge-briefing' and active) then
    raise exception '0159 self-check: forge-briefing is not scheduled';
  end if;
  -- The toggle defaults OFF, so applying this sends nothing to anybody until somebody opts in.
  if public.push_pref_default('training_briefing') then
    raise exception '0159 self-check: the briefing must default OFF';
  end if;
  raise notice '0159 applied. Nothing sends until an athlete turns Morning Briefing on and picks their days.';
end $$;
