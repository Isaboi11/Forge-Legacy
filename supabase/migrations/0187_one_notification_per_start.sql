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
