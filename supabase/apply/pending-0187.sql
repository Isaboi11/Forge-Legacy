-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0187: one notification per start, and one device per device
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: every statement is guarded, and §3 is read-only.
--
-- This is the ONLY migration awaiting application. 0186 is already in.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- PO: *"I've gotten multiple notifications for when someone starts a workout. I only need one."*
--
-- TWO INDEPENDENT DEFECTS, both outside the code that decides what a start IS. Branch 15 of
-- `notification_events_for` already collapses shared squads, and `push_tg_training_started` already
-- selects distinct recipients. Both were right. The duplication happened on either side of them.
--
-- ⚠ DEFECT A — ONE PHONE, SEVERAL LIVE TOKENS. `push_register_token` (0120) treats the Expo TOKEN
--   STRING as the identity of a device. It is not: a device gets a new token whenever the installation
--   changes underneath it, and the old row stays live under the same user forever. `push_drain` builds
--   one message PER live token, so one event becomes N buzzes in the same second on ONE phone.
--   `push_reconcile` does not catch this — it only retires what Expo calls `DeviceNotRegistered`, and
--   both tokens are perfectly valid. This defect doubles EVERY notification kind, which is the tell.
--
-- ⚠ DEFECT B — A START THAT KEPT RE-STARTING. `set_training_status(true, …)` wrote
--   `training_since = now()` unconditionally, and that timestamp IS the outbox uniqueness key
--   (`user_id, kind, event_at, subject`). A second call during one workout was therefore a genuinely
--   NEW event, not a duplicate the index could absorb. The client calls it more than once on purpose —
--   `WorkoutSessionProvider` holds the session in React state only, so `workout.tsx` re-asserts presence
--   on mount after the app is killed. That assertion is correct. The schema was counting one fact twice.
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  A · adds `push_tokens.device_id` + a partial index, drops the 2-arg `push_register_token` and
--         replaces it with a 3-arg one that retires this user's OTHER live tokens on the SAME device.
--     B · rewrites `set_training_status` so an active session KEEPS the stamp it already has while that
--         stamp is inside the 4-hour ceiling every reader of the column already applies.
-- §2  asserts the column, the index, the single 3-arg signature and the 4-hour hold. RAISES if absent.
-- §3  reports what landed, plus the two diagnostics that say which defect you were actually hitting.
--     Read-only.
--
-- §1 is `supabase/migrations/0187_one_notification_per_start.sql` embedded BYTE FOR BYTE, header comment
-- and all nine statements included. `push.test.mjs` asserts it with a substring match, the same guard
-- every bundle back to 0120 carries — so a fix applied to one file and not the other goes red.
--
-- ⚠ APPLYING IS NOT THE SAME AS WORKING, and the two halves differ here:
--     · DEFECT B is fixed the moment this runs. It is server-side only and needs no client.
--     · DEFECT A is only fixed once the client that SENDS `p_device_id` is deployed. Until then
--       `p_device_id` arrives null, nothing is retired, and behaviour is exactly what it is today —
--       which is deliberate: "I did not say which device" must never mean "retire the ones that did".
--       Expect §3 to report 0 tokens carrying a device_id until that ships. That is correct, not a
--       failed migration. (0153 landed cleanly and nothing appeared for exactly this reason.)
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ═════════════════════════════════════════════════════════════════════════════
-- §1 — THE STATEMENTS
-- ═════════════════════════════════════════════════════════════════════════════
--
-- ⚠ EVERYTHING FROM HERE TO §2 IS supabase/migrations/0187_one_notification_per_start.sql BYTE FOR
--   BYTE, header comment included. push.test.mjs asserts that with a substring match, so an edit to
--   either file that is not made to both goes red.

-- Forge Legacy — 0187: one notification per start, and one device per device
--
-- PO: *"I've gotten multiple notifications for when someone starts a workout. Why? I only need one."*
--
-- TWO INDEPENDENT DEFECTS PRODUCED THE SAME SYMPTOM, and neither is in the branch that decides what a
-- start IS. Branch 15 of `notification_events_for` already collapses shared squads with
-- `distinct on (p.id)`, and `push_tg_training_started` already selects `distinct m.user_id`. Both were
-- right. The duplication happened on either side of them.
--
-- ── DEFECT A · ONE PHONE, SEVERAL LIVE TOKENS ────────────────────────────────────────────────────────
--
-- `push_register_token` (0120) upserts `on conflict (token)`, so the TOKEN STRING is the identity of a
-- device. It is not. A device gets a new Expo push token whenever the installation changes underneath it
-- — a fresh install, a credentials rotation, a project change — and the row holding the old string stays
-- live under the same `user_id` forever. `push_drain` then builds one message PER live token:
--
--     from public.push_tokens t where t.user_id = r.user_id and t.disabled_at is null
--
-- One outbox row, N buzzes, all in the same second, on ONE phone. This is not specific to training: it
-- doubles every notification the athlete receives, which is the tell that separates it from defect B.
--
-- ⚠ `push_reconcile` DOES NOT CATCH THIS, and it is worth saying why, because its existence reads like
-- the problem is already handled. It retires a token only when Expo answers `DeviceNotRegistered` —
-- which Expo says when the APP IS GONE, not when a still-installed app has moved on to a newer token.
-- Both tokens are valid. Both deliver. Expo has no complaint to make.
--
-- ⚠ AND "RETIRE THE USER'S OTHER TOKENS" IS THE WRONG FIX, though it is the obvious one. An athlete with
-- an iPhone and an iPad would have the two devices disable each other on every launch, each one going
-- silent until the other opened the app. The identity that was missing is the DEVICE, so this migration
-- adds it rather than guessing at it: `push_tokens.device_id`, a value the client generates once and
-- keeps. Registering a token retires only this user's OTHER tokens bearing THE SAME device_id.
--
-- ⚠ `p_device_id` IS OPTIONAL AND NULL CHANGES NOTHING. A client that has not shipped this yet — every
-- installed build on the day this is applied — registers exactly as it does today. Nothing is retired on
-- a null, because "I did not say which device" must never mean "retire the ones that did".
--
-- ── DEFECT B · A START THAT KEPT RE-STARTING ─────────────────────────────────────────────────────────
--
-- `set_training_status(true, …)` wrote `training_since = now()` UNCONDITIONALLY (0086), and the outbox's
-- uniqueness key is `(user_id, kind, event_at, subject)` (0120) where `event_at` IS that timestamp. So a
-- second call during one workout is not a duplicate the index can absorb — it is a NEW EVENT, correctly
-- deduplicated against nothing, and it announces again.
--
-- The client calls it more than once per session by design. `WorkoutSessionProvider` holds the session in
-- React state ONLY, so it does not survive the app being killed, and `workout.tsx` deliberately
-- re-asserts presence on mount for exactly that reason ("LIVE PRESENCE IS DERIVED FROM A SESSION
-- EXISTING, NOT FROM REMEMBERING TO ANNOUNCE ONE"). That assertion is right. It is the schema that was
-- treating a repeated statement of one fact as two facts.
--
-- THE FIX IS THE FOUR-HOUR CEILING THIS COLUMN ALREADY LIVES UNDER. Every reader of `training_since`
-- ignores it past four hours — `training_now()` (0086), branch 9 and branch 15 of
-- `notification_events_for`, and the client's own STALE_SESSION_TIMEOUT_MS. So: while the stamp is still
-- inside that window, a re-announcement KEEPS it; past it, or after an explicit finish cleared it to
-- null, a start writes a fresh one and is news again.
--
--   · finish, then train again an hour later  → the finish set null, so the second start announces. ✅
--   · app killed mid-session, reopened        → inside 4h, stamp held, no second announcement. ✅
--   · session abandoned without ending, 5h on → past the ceiling, and it genuinely is a new workout. ✅
--
-- `training_label` is still overwritten on every call, deliberately: the timestamp answers WHEN this
-- session began and must not move, the label answers WHAT they are doing now and should.
--
-- ⚠ THE COLUMN IS QUALIFIED ON THE RIGHT-HAND SIDE (`profiles.training_since`). This schema has already
-- lost a function to 42702 on a bare column name (0163, `tz`).
--
-- Idempotent. Depends on 0086 (training_since) and 0120 (push_tokens, push_register_token).
-- RUN AFTER 0186.


-- ══════════════════════════════════════════════════════════════════════════════
-- A · ONE DEVICE, ONE LIVE TOKEN
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.push_tokens add column if not exists device_id text;

comment on column public.push_tokens.device_id is
  'Stable per-installation id the client generates once and keeps (src/lib/device-id.ts). NOT the Expo token, which rotates underneath a device that has not changed. Registering a token retires this user''s other live tokens carrying the same device_id, which is what stops one phone receiving one notification several times. Null on any client predating 0187, and null retires nothing.';

-- Partial, because a retired row is allowed to keep sharing a device with the live one that replaced it.
create index if not exists push_tokens_device_idx
  on public.push_tokens (user_id, device_id) where disabled_at is null;

-- ⚠ DROP THE TWO-ARGUMENT SIGNATURE, do not leave it beside the three. `create or replace` cannot change
-- an argument list, so a bare create would leave BOTH overloads callable and PostgREST resolving between
-- them by whichever named arguments a client happened to send — the old one still registering devices
-- with no identity, invisibly, for as long as any build calls it. The new signature accepts every call
-- the old one did, because the third argument has a default.
drop function if exists public.push_register_token(text, text);

create or replace function public.push_register_token(
  p_token     text,
  p_platform  text default 'ios',
  p_device_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device text := nullif(btrim(coalesce(p_device_id, '')), '');
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.push_tokens (user_id, token, platform, device_id)
  values (auth.uid(), p_token, coalesce(p_platform, 'ios'), v_device)
  on conflict (token) do update
    set user_id      = excluded.user_id,   -- a shared device follows whoever signed in last
        platform     = excluded.platform,
        last_seen_at = now(),
        disabled_at  = null,               -- re-registering revives a token Expo had rejected
        -- coalesce, not excluded.device_id: an older build re-registering a token must not ERASE the
        -- identity a newer one already recorded for it.
        device_id    = coalesce(excluded.device_id, push_tokens.device_id);

  -- THE ACTUAL FIX. Only this athlete's rows, only this same device, never the row just written.
  if v_device is not null then
    update public.push_tokens t
       set disabled_at = now()
     where t.user_id = auth.uid()
       and t.device_id = v_device
       and t.token <> p_token
       and t.disabled_at is null;
  end if;

  -- Stamped once. coalesce keeps the original floor on every later registration.
  update public.profiles
     set push_baseline_at = coalesce(push_baseline_at, now())
   where id = auth.uid();
end;
$$;

-- A new signature carries none of the old one's grants. 0120 left this function callable through PUBLIC
-- on purpose — it pins auth.uid() itself and can register a token for nobody else — so this restores the
-- state it had rather than tightening it inside a migration about duplicate buzzes.
grant execute on function public.push_register_token(text, text, text) to authenticated;

comment on table public.push_tokens is
  'Expo push tokens, one row per device. Disabled rather than deleted when Expo answers DeviceNotRegistered, so a reinstall handing back the same token simply revives it. From 0187, also disabled when the same device_id registers a newer token: the token string is not a device identity, and treating it as one delivered every notification once per stale token.';


-- ══════════════════════════════════════════════════════════════════════════════
-- B · A LIVE SESSION KEEPS THE TIME IT REALLY BEGAN
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function public.set_training_status(p_active boolean, p_label text default null)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  update public.profiles
     set training_since = case
           when not p_active then null
           -- Already training, inside the four-hour ceiling every reader of this column applies: the same
           -- session saying so again. Keep the original stamp, so the outbox key does not change and the
           -- squad is not told twice.
           when profiles.training_since is not null
            and profiles.training_since > now() - interval '4 hours'
             then profiles.training_since
           else now()
         end,
         -- The label always follows the current call: the stamp says when, the label says what.
         training_label = case when p_active then nullif(btrim(coalesce(p_label, '')), '') else null end
   where id = auth.uid();
end;
$$;

comment on column public.profiles.training_since is
  'When the current workout started, or null. Presence only — never history. Reads ignore anything older than 4h so a crashed client cannot leave a ghost training forever. From 0187 it is WRITE-ONCE PER SESSION: set_training_status(true) keeps an existing stamp that is still inside that 4h window, because it is also the outbox event key and re-stamping it announced the same workout to the squad again.';


-- ═════════════════════════════════════════════════════════════════════════════
-- §2 — ASSERT IT TOOK. Raises rather than returning a tidy false green.
-- ═════════════════════════════════════════════════════════════════════════════

do $$
declare
  missing text := '';
  v_sigs  int;
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'push_tokens' and column_name = 'device_id'
  ) then missing := missing || ' push_tokens.device_id'; end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'push_tokens_device_idx'
  ) then missing := missing || ' push_tokens_device_idx'; end if;

  -- ⚠ EXACTLY ONE. Two would mean the drop did not take and the old 2-arg overload is still there,
  --   which is the silent half of defect A rather than a cosmetic leftover.
  select count(*) into v_sigs
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'push_register_token';

  if v_sigs <> 1 then
    missing := missing || ' push_register_token(expected 1 signature, found ' || v_sigs || ')';
  elsif not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'push_register_token' and p.pronargs = 3
  ) then
    missing := missing || ' push_register_token(p_device_id)';
  end if;

  -- Defect B is a change to a function BODY, so presence proves nothing — assert the hold itself.
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'set_training_status'
       and p.prosrc like '%4 hours%'
  ) then missing := missing || ' set_training_status(4h hold)'; end if;

  if missing <> '' then
    raise exception '0187 DID NOT FULLY APPLY. Missing:%', missing;
  end if;

  raise notice '0187 OK — device_id, its index, one 3-arg push_register_token, and the 4h hold are all present.';
end $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- §3 — WHAT IS NOW THERE, AND WHICH DEFECT YOU WERE HITTING. Read-only.
-- ═════════════════════════════════════════════════════════════════════════════

-- The shape.
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'push_tokens' and column_name = 'device_id')  as device_id_column,
  (select count(*) from pg_indexes
    where schemaname = 'public' and indexname = 'push_tokens_device_idx')                        as device_index,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'push_register_token')                            as register_signatures;

-- ⚠ `tokens_with_device_id` SHOULD BE 0 right now. The client that sends it is not deployed. A non-zero
--   count before that ships would mean something is writing this column that should not be.
--
--   `athletes_with_several_live_tokens` IS DEFECT A, counted. Every athlete in this number is receiving
--   each notification once per row. It does not fall on its own — those rows only get retired when the
--   device next registers WITH an id, i.e. after the client deploys.
select
  count(*)                                                as live_token_rows,
  count(*) filter (where device_id is not null)           as tokens_with_device_id,
  count(distinct user_id)                                 as athletes_with_a_device,
  (select count(*) from (
     select user_id from public.push_tokens
      where disabled_at is null group by user_id having count(*) > 1
   ) d)                                                   as athletes_with_several_live_tokens
from public.push_tokens
where disabled_at is null;

-- ⚠ DEFECT B, counted, over the last seven days. Each row is one athlete who was told about one other
--   athlete's start MORE THAN ONCE on one day — different `event_at` values, so the outbox key could not
--   collapse them. This number stops growing the moment §1B is applied; the rows already written stay,
--   because the outbox is a delivery ledger and a push that was sent cannot be un-sent.
select
  o.user_id                       as told,
  o.actor_id                      as about,
  date_trunc('day', o.event_at)   as day,
  count(*)                        as times_told,
  min(o.event_at)                 as first_stamp,
  max(o.event_at)                 as last_stamp
from public.push_outbox o
where o.kind = 'squad_training_started'
  and o.created_at > now() - interval '7 days'
group by 1, 2, 3
having count(*) > 1
order by times_told desc, day desc
limit 50;
