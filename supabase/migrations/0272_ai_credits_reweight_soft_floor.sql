-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- 0272 · CREDITS YOU CAN SEE: the reweight by real cost, one credit per typed build, a free tidy pass on
--        every photo, and the soft floor (never a dead stop for a paying athlete).
--        AI Road to 10, Sprint 2 — UX-2 / PL-2 last bullet. Plan §1 "Credit weights (MA3-D16 table)".
--        Contract: Docs/AI-Sprint-2-Build-Notes.md §1.3 (on the Sprint 1 meter, Docs/AI-Sprint-1-Build-Notes.md §1).
--        Amendment: Docs/Amendments/Monetization-Architecture-Amendment-012-Credits-By-Real-Cost-And-Soft-Floor.md
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHY ══
--
-- The weights were set before anything was measured (CA-D7…CA-D9, 0221, 0232). The ledger now says what a call
-- really costs: a form check averages $0.018 and charged 6, a typed build charged twice (the coach-interpret turn
-- that opened it AND the coach-author write), and every photo import paid a second credit for the AI layout pass
-- the PO made automatic on 2026-09-30 ("every photo gets AI"). And at 150 the meter is a wall: someone who
-- photographs every meal and chats daily hits it around day 28-30, and then nothing works until the 1st.
--
-- ══ WHAT THIS DOES ══
--
--   1. coach_ai_config.action_credits, by real cost (each key moved ONLY if it still holds its old value, so a
--      weight the PO changed by hand is never overwritten — the meal_photo lesson, 09-28):
--        form_check 6 -> 3 · recipe_photo 3 -> 2 · web 3 -> 2. Every other key is untouched (meal_photo stays 1).
--      The column DEFAULT is rewritten to the live map (it still said meal_photo 3 from 0223).
--   2. A WAIVED call costs 0 and rides on one already paid for (coach_ai_reserve, step 3a):
--        · coach-author's day/program write after the PAID coach-interpret turn that opened it, within 30 minutes
--          and not already ridden on — a typed build is one credit, not two. A write with no paid turn before it
--          (a tapped opener, a typed answer the chips matched) still pays its own 1. `waiver = 'typed_build'`.
--        · workout-tidy's pass after the PAID photo read (workout-card-read / program-photo-read, photo_import) it
--          tidies, same rules — a photo is 2 credits, not 3. A typed "Fix it with AI" still pays 1: making the key 0
--          would make that free up to its 40-a-day cap (~$0.42 a day of model time per athlete). `'photo_tidy'`.
--   3. THE SOFT FLOOR (coach_ai_reserve, step 3b): when the meter refuses for lack of credits — never for lack of
--      Premium AI — a chat (coach-ask `message`; coach-interpret's turns) or a meal photo (meal-photo-read) still
--      goes through at 0 credits, `floor_per_day` (5) a day IN TOTAL, the day being the athlete's own
--      (profiles.tz, else UTC). `waiver = 'floor'`. A web search, Kitchen, form check, photo import, a typed build's
--      write, everything else still refuses at 0 with the reset date. A floor use refunded (the model failed) does
--      not count against the day, and can never create credit: it holds 0.
--   4. coach_ai_reservation.waiver / coach_ai_spend.waiver — 'floor' · 'typed_build' · 'photo_tidy' · null.
--      coach_ai_settle copies it onto the ledger row (its only change), so the AI health page can count floor uses.
--   5. coach_ai_credits() — the read behind the app's credits chip: entitled, remaining, allowance, spent, period,
--      resets_on, low_at (20, config), and the floor (per day, used today, left today, on_floor). Not entitled →
--      zeros, never a balance (coach_ai_balance answers 150 to anybody). coach_ai_balance is untouched (old phones).
--   6. ai_feedback.feature gains 'workout_tidy' (the typed "Fix it with AI" result's Helpful / Not helpful).
--   7. admin_ai_health — the LIVE source (= 0269's text, md5-checked 2026-11-17; 0271 does not touch it) plus the
--      waived counts: totals.waivers {floor, typed_build, photo_tidy} and floor_uses / typed_build / photo_tidy on
--      every by_fn and by_fn_day row — same window, same time zone, delivered calls only (a refunded one gave nothing).
--      Same signature, same admin_guard() (is_app_admin) first.
--   8. Grants: coach_ai_credits() revoked from public AND anon (Supabase grants both directly), granted to
--      authenticated. Replaced functions keep their grants (create or replace); restated anyway.
--
-- ══ ⚠ SAFE FOR EVERY DEPLOYED FUNCTION AND EVERY INSTALLED PHONE ══
--
--   · coach_ai_reserve keeps its signature, its return columns and its reason names. A waived or floor call is an
--     ordinary allowed row (allowed = true, reason 'ok', a reservation id, credits_spent 0) — the deployed
--     functions read only `allowed` / `reservation_id` / the numbers, and a 0-credit reservation is what `summary`
--     has always been. A floor refusal is the same `out_of_credits` as today.
--   · coach_ai_settle keeps its signature and result; a 0-credit refund changes no balance (its own `credits > 0`).
--   · coach_ai_spend_credits, coach_ai_quote, coach_ai_balance, coach_ai_record_usage: untouched. The old
--     quote → spend path (coach-form-check until its Sprint 2 deploy) reads the same weights, so it charges 3.
--   · No copy in any shipped build states a weight: form check's line is the server's quote, every other line says
--     "credits" without a number. Old phones simply see 3 where they saw 6.
--
-- ⛔ AI STAYS PAID-ONLY (PO 2026-11-16). The floor is reached only AFTER the Premium AI gate (step 1) and the
--   consent (step 2), and only on a refusal with an allowance above 0. An account without coach_ai still gets
--   not_entitled and nothing written.
--
-- Depends on 0144, 0203, 0221, 0224, 0232, 0268 and 0269 (all applied). Wrapped in one transaction. Safe to run
-- twice: guarded weights, add-if-not-exists, guarded constraints, create-or-replace.

begin;

-- ══════════════════════════════════════════════════════════════════════════════
-- 0 · 0268 + 0269 first
-- ══════════════════════════════════════════════════════════════════════════════

do $$
begin
  if to_regprocedure('public.coach_ai_reserve(text, text)') is null
     or to_regprocedure('public.coach_ai_settle(uuid, text, text, integer, integer, integer, integer, integer, boolean)') is null
     or to_regclass('public.coach_ai_reservation') is null then
    raise exception '0272 needs 0268 first (coach_ai_reserve / coach_ai_settle / coach_ai_reservation). Paste supabase/apply/pending-0268.sql, then this file.';
  end if;
  if to_regclass('public.ai_feedback') is null then
    raise exception '0272 needs 0269 first (ai_feedback). Paste supabase/apply/pending-0269.sql, then this file.';
  end if;
end $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1 · The reweight — each key moved only from its old value
-- ══════════════════════════════════════════════════════════════════════════════

update public.coach_ai_config c
   set action_credits = c.action_credits || (
         select jsonb_object_agg(w.k, w.new_w)
           from (values ('form_check', 6, 3), ('recipe_photo', 3, 2), ('web', 3, 2)) as w(k, old_w, new_w)
          where (c.action_credits ->> w.k)::integer = w.old_w),
       updated_at = now()
 where c.id
   and exists (
     select 1
       from (values ('form_check', 6), ('recipe_photo', 3), ('web', 3)) as w(k, old_w)
      where (c.action_credits ->> w.k)::integer = w.old_w);

alter table public.coach_ai_config
  alter column action_credits set default
  '{"day": 1, "web": 2, "kitchen": 2, "message": 1, "program": 1, "summary": 0, "form_check": 3, "meal_photo": 1, "photo_read": 3, "photo_import": 2, "recipe_photo": 2, "workout_tidy": 1}'::jsonb;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2 · The floor and the warning — server config, never a constant in src/ (MA3-D16)
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.coach_ai_config add column if not exists floor_per_day integer not null default 5;
alter table public.coach_ai_config add column if not exists floor_actions jsonb not null
  default '{"coach-ask": ["message"], "coach-interpret": ["message", "day", "program"], "meal-photo-read": ["meal_photo"]}'::jsonb;
alter table public.coach_ai_config add column if not exists credits_low_at integer not null default 20;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'coach_ai_config_floor_per_day_check') then
    alter table public.coach_ai_config
      add constraint coach_ai_config_floor_per_day_check check (floor_per_day between 0 and 50);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'coach_ai_config_floor_actions_check') then
    alter table public.coach_ai_config
      add constraint coach_ai_config_floor_actions_check check (jsonb_typeof(floor_actions) = 'object');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'coach_ai_config_credits_low_at_check') then
    alter table public.coach_ai_config
      add constraint coach_ai_config_credits_low_at_check check (credits_low_at >= 0);
  end if;
end $$;

comment on column public.coach_ai_config.floor_per_day is
  'The soft floor (0272, MA12): once the month''s credits are used, this many floor calls a day IN TOTAL still go through at 0 credits. The day is the athlete''s own (profiles.tz, else UTC). 0 turns the floor off.';
comment on column public.coach_ai_config.floor_actions is
  'Which calls the soft floor covers (0272), by the calling function''s slug: {"<fn>": ["<action>", …]}. Plain chat and meal photos; never a web search, Kitchen, form check, photo import or a typed build''s write.';
comment on column public.coach_ai_config.credits_low_at is
  'The app''s credits chip turns to its warning at this many credits left or fewer (0272, plan UX-2: 20).';

-- ══════════════════════════════════════════════════════════════════════════════
-- 3 · The waiver on the reservation and on the ledger
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.coach_ai_reservation add column if not exists waiver text;
alter table public.coach_ai_spend add column if not exists waiver text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'coach_ai_reservation_waiver_check') then
    alter table public.coach_ai_reservation
      add constraint coach_ai_reservation_waiver_check
      check (waiver is null or (waiver in ('floor', 'typed_build', 'photo_tidy') and credits = 0));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'coach_ai_spend_waiver_check') then
    alter table public.coach_ai_spend
      add constraint coach_ai_spend_waiver_check
      check (waiver is null or waiver in ('floor', 'typed_build', 'photo_tidy'));
  end if;
end $$;

-- The floor count: this athlete's floor calls since their local midnight.
create index if not exists coach_ai_reservation_floor_idx
  on public.coach_ai_reservation (athlete_id, reserved_at desc)
  where waiver = 'floor';

comment on column public.coach_ai_reservation.waiver is
  'Why this call held 0 credits (0272): floor = the soft floor after the month''s credits; typed_build = coach-author riding on the paid coach-interpret turn that opened it; photo_tidy = workout-tidy riding on the paid photo read it tidies. Null = an ordinary reservation.';
comment on column public.coach_ai_spend.waiver is
  'Copied from the reservation by coach_ai_settle (0272): floor · typed_build · photo_tidy · null. The AI health page counts floor uses by it.';

-- ══════════════════════════════════════════════════════════════════════════════
-- 4 · coach_ai_reserve — the LIVE source (pg_get_functiondef, 2026-11-17) with three changes, each marked 0272:
--     the profile read also takes tz; step 3a (a waived call); step 3b (the soft floor, inside the refusal).
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function public.coach_ai_reserve(p_action text, p_fn text)
returns table(allowed boolean, reason text, reservation_id uuid, credits_spent integer, remaining integer, allowance integer, age_years integer, minor boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_fn      text;
  v_birth   integer;
  v_age     integer;
  v_minor   boolean;
  v_consent text;
  v_ok      boolean;
  v_cost    integer;
  v_left    integer;
  v_allow   integer;
  v_id      uuid;
  -- 0272
  v_tz      text;
  v_cfg     public.coach_ai_config%rowtype;
  v_waiver  text;
  v_paid_at timestamptz;
  v_day0    timestamptz;
  v_used    integer;
begin
  if v_uid is null then
    raise exception 'coach_ai_reserve: no authenticated athlete' using errcode = '28000';
  end if;

  -- The deployed slug, kept on the reservation and written to coach_ai_spend.fn by settle: the action keys are
  -- shared (day/program by interpret AND author, message by ask AND interpret) and the health page is per function.
  v_fn := case
    when p_fn in ('coach-ask', 'coach-interpret', 'coach-author', 'coach-kitchen', 'coach-form-check',
                  'meal-photo-read', 'recipe-photo-read', 'recipe-link-read', 'program-photo-read',
                  'workout-card-read', 'workout-tidy', 'bug-plain', 'social-plan') then p_fn
    else 'other'
  end;

  -- The server's age (P-G8), by the app's own rule — `ageFrom` + `isUnderAge` in src/domain/nutrition/targets.ts:
  -- this year minus the birth year; no birth year, one before 1900, or an age outside 0…129 is unknown; unknown is
  -- NOT a minor; and 18 is still a minor (Forge holds no birth date, so the year you turn 18 is read as under 18).
  -- 0272: the same read takes the athlete's time zone, for the soft floor's day.
  select pr.birth_year, pr.tz into v_birth, v_tz from public.profiles pr where pr.id = v_uid;
  v_age := case
    when v_birth is null or v_birth < 1900 then null
    else extract(year from (now() at time zone 'UTC'))::integer - v_birth
  end;
  if v_age is not null and (v_age < 0 or v_age >= 130) then
    v_age := null;
  end if;
  v_minor := v_age is not null and v_age <= 18;

  -- 1. Premium AI (0203). Refused before anything is written.
  if not exists (
    select 1
      from public.athlete_entitlement e
     where e.athlete_id = v_uid
       and e.coach_ai
       and (e.coach_ai_until is null or e.coach_ai_until > now())
  ) then
    return query select false, 'not_entitled'::text, null::uuid, 0, 0, 0, v_age, v_minor;
    return;
  end if;

  -- 2. The AI-sharing consent (0224, P-G9): the newest answer must be a grant. Any policy version counts — asking
  --    again for the 09-28 version is a PO decision (P-D9). Refused before anything is written.
  select hc.action into v_consent
    from public.health_consents hc
   where hc.athlete_id = v_uid
     and hc.kind = 'ai_sharing'
   order by hc.created_at desc
   limit 1;
  if v_consent is distinct from 'granted' then
    return query select false, 'no_consent'::text, null::uuid, 0, 0, 0, v_age, v_minor;
    return;
  end if;

  select * into v_cfg from public.coach_ai_config c where c.id;

  -- 3a. 0272 — A CALL THAT RIDES ON ONE ALREADY PAID FOR costs nothing more:
  --     · coach-author's write after the paid coach-interpret turn that opened it (a typed build is ONE credit);
  --     · workout-tidy's pass after the paid photo read it tidies (PO 2026-09-30: every photo gets AI — the photo
  --       read is the charge).
  --     The paid call: this athlete's newest, settled, NOT refunded, credits > 0, in the last 30 minutes (a
  --     reservation's own life) — locked, so two rides at once cannot both take it — and not ridden on yet: no
  --     later call of this function that kept its reservation. Anything else pays its own weight below.
  v_waiver := case
    when v_fn = 'coach-author' and p_action in ('day', 'program') then 'typed_build'
    when v_fn = 'workout-tidy' and p_action = 'workout_tidy' then 'photo_tidy'
  end;
  if v_waiver is not null and v_cfg.action_credits ? p_action then
    select r.reserved_at into v_paid_at
      from public.coach_ai_reservation r
     where r.athlete_id = v_uid
       and r.credits > 0
       and r.settled_at is not null
       and not r.refunded
       and r.reserved_at > now() - interval '30 minutes'
       and (   (v_waiver = 'typed_build' and r.fn = 'coach-interpret')
            or (v_waiver = 'photo_tidy' and r.fn in ('workout-card-read', 'program-photo-read') and r.action = 'photo_import'))
     order by r.reserved_at desc
     limit 1
     for update;

    if v_paid_at is not null and not exists (
      select 1
        from public.coach_ai_reservation a
       where a.athlete_id = v_uid
         and a.fn = v_fn
         and not a.refunded
         and a.reserved_at >= v_paid_at
    ) then
      insert into public.coach_ai_reservation (athlete_id, period, action, fn, credits, waiver)
      values (v_uid, date_trunc('month', now())::date, p_action, v_fn, 0, v_waiver)
      returning id into v_id;

      -- The balance the app shows (coach_ai_balance's arithmetic): nothing was taken.
      select greatest(coalesce(p.allowance, v_cfg.credits_per_period) - coalesce(p.spent, 0), 0)::integer,
             coalesce(p.allowance, v_cfg.credits_per_period)::integer
        into v_left, v_allow
        from (select 1) as one
        left join public.coach_ai_period p
          on p.athlete_id = v_uid
         and p.period = date_trunc('month', now())::date;

      return query select true, 'ok'::text, v_id, 0, v_left, v_allow, v_age, v_minor;
      return;
    end if;
  end if;

  -- 3. The EXISTING meter, called — its atomic guarded UPDATE is the one that takes the credits. An unknown
  --    action still raises 22023 from inside it.
  select s.allowed, s.credits_spent, s.remaining, s.allowance
    into v_ok, v_cost, v_left, v_allow
    from public.coach_ai_spend_credits(p_action) s;

  if not coalesce(v_ok, false) then
    -- 3b. 0272 — THE SOFT FLOOR (MA12). The month's credits are used, and this is a chat or a meal photo: it still
    --     goes through, at 0 credits, `floor_per_day` a day IN TOTAL — the athlete's day (profiles.tz, else UTC).
    --     Only on a refusal with an allowance (an athlete WITH Premium AI who has run out); never a web search,
    --     Kitchen, form check, photo import or a typed build's write (`floor_actions`). A floor call refunded by
    --     settle does not count against the day.
    if coalesce(v_allow, 0) > 0
       and coalesce(v_cfg.floor_per_day, 0) > 0
       and coalesce(v_cfg.floor_actions -> v_fn, '[]'::jsonb) ? p_action then
      if v_tz is null or not exists (select 1 from pg_catalog.pg_timezone_names z where z.name = v_tz) then
        v_tz := 'UTC';
      end if;
      v_day0 := ((now() at time zone v_tz)::date)::timestamp at time zone v_tz;

      -- One floor call at a time per athlete: the month's row (coach_ai_spend_credits just made sure it exists).
      perform 1
         from public.coach_ai_period p
        where p.athlete_id = v_uid
          and p.period = date_trunc('month', now())::date
        for update;

      select count(*)::integer into v_used
        from public.coach_ai_reservation r
       where r.athlete_id = v_uid
         and r.waiver = 'floor'
         and not r.refunded
         and r.reserved_at >= v_day0;

      if v_used < v_cfg.floor_per_day then
        insert into public.coach_ai_reservation (athlete_id, period, action, fn, credits, waiver)
        values (v_uid, date_trunc('month', now())::date, p_action, v_fn, 0, 'floor')
        returning id into v_id;

        return query select true, 'ok'::text, v_id, 0, coalesce(v_left, 0), v_allow, v_age, v_minor;
        return;
      end if;
    end if;

    return query select
      false,
      (case when coalesce(v_allow, 0) = 0 then 'not_entitled' else 'out_of_credits' end)::text,
      null::uuid,
      coalesce(v_cost, 0),
      coalesce(v_left, 0),
      coalesce(v_allow, 0),
      v_age,
      v_minor;
    return;
  end if;

  -- 4. Held. The period is the one coach_ai_spend_credits just charged (same now(): one transaction).
  insert into public.coach_ai_reservation (athlete_id, period, action, fn, credits)
  values (v_uid, date_trunc('month', now())::date, p_action, v_fn, v_cost)
  returning id into v_id;

  return query select true, 'ok'::text, v_id, v_cost, v_left, v_allow, v_age, v_minor;
end;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 5 · coach_ai_settle — the LIVE source (pg_get_functiondef, 2026-11-17); the ONE change: the ledger row carries
--     the reservation's waiver (marked 0272).
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function public.coach_ai_settle(
  p_reservation uuid, p_outcome text, p_model text,
  p_input_tokens integer, p_output_tokens integer, p_cache_read_input_tokens integer, p_cache_creation_input_tokens integer,
  p_latency_ms integer, p_refund boolean
)
returns table(settled boolean, refunded boolean, cost_usd numeric, remaining integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_refund  boolean := coalesce(p_refund, false);
  v_outcome text;
  v_res     public.coach_ai_reservation%rowtype;
  v_model   text := nullif(left(coalesce(p_model, ''), 100), '');
  v_in      integer := least(greatest(coalesce(p_input_tokens, 0), 0), 5000000);
  v_out     integer := least(greatest(coalesce(p_output_tokens, 0), 0), 5000000);
  v_read    integer := least(greatest(coalesce(p_cache_read_input_tokens, 0), 0), 5000000);
  v_write   integer := least(greatest(coalesce(p_cache_creation_input_tokens, 0), 0), 5000000);
  v_latency integer := case when p_latency_ms is null then null else least(greatest(p_latency_ms, 0), 600000) end;
  v_cost    numeric(12, 6);
  v_left    integer;
begin
  if v_uid is null then
    raise exception 'coach_ai_settle: no authenticated athlete' using errcode = '28000';
  end if;

  -- `guarded`: a server guard stopped the call after the reserve (coach-ask: a server-derived minor), refunded.
  v_outcome := case
    when p_outcome in ('ok', 'upstream_error', 'upstream_unreachable', 'timeout', 'refusal', 'truncated',
                       'not_a_program', 'unreadable', 'bad_output', 'cancelled', 'guarded') then p_outcome
    else 'other'
  end;

  -- Claim it: one UPDATE, guarded in its own WHERE, so two settles of the same reservation have one winner and
  -- the loser changes nothing. Only the caller's own, not yet settled, reserved in the last 30 minutes.
  update public.coach_ai_reservation r
     set settled_at = now(),
         refunded = v_refund,
         outcome = v_outcome
   where r.id = p_reservation
     and r.athlete_id = v_uid
     and r.settled_at is null
     and r.reserved_at > now() - interval '30 minutes'
  returning r.* into v_res;

  if not found then
    return query select false, false, null::numeric, null::integer;
    return;
  end if;

  -- The refund goes back to THE RESERVATION'S period row (a call reserved on the 31st refunds the 31st's month),
  -- never below zero.
  if v_refund and v_res.credits > 0 then
    update public.coach_ai_period p
       set spent = greatest(p.spent - v_res.credits, 0),
           updated_at = now()
     where p.athlete_id = v_uid
       and p.period = v_res.period;
  end if;

  v_cost := public.coach_ai_rate_cost(v_model, v_in, v_out, v_read, v_write);

  -- 0272: `waiver` — a floor call, a typed build's write or a photo's tidy pass is marked on the ledger.
  insert into public.coach_ai_spend (
    athlete_id, period, action, credits, model,
    input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens,
    cost_usd, uncharged, fn, outcome, latency_ms, reservation_id, waiver
  ) values (
    v_uid, v_res.period, v_res.action, v_res.credits, v_model,
    v_in, v_out, v_read, v_write,
    v_cost, v_refund, v_res.fn, v_outcome, v_latency, v_res.id, v_res.waiver
  );

  -- The balance the app shows: this month's (coach_ai_balance's arithmetic).
  select greatest(coalesce(p.allowance, c.credits_per_period) - coalesce(p.spent, 0), 0)::integer
    into v_left
    from public.coach_ai_config c
    left join public.coach_ai_period p
      on p.athlete_id = v_uid
     and p.period = date_trunc('month', now())::date
   where c.id;

  return query select true, v_refund, v_cost, v_left;
end;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 6 · coach_ai_credits() — the app's credits chip (UX-2). One read; the app refreshes it from each answer's
--     `remaining`. Successor to coach_ai_balance for NEW clients only; coach_ai_balance stays as it is.
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function public.coach_ai_credits()
returns table(
  entitled boolean, remaining integer, allowance integer, spent integer, period date, resets_on date,
  low_at integer, floor_per_day integer, floor_used_today integer, floor_left_today integer, on_floor boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_cfg    public.coach_ai_config%rowtype;
  v_period date := date_trunc('month', now())::date;
  v_tz     text;
  v_day0   timestamptz;
  v_allow  integer;
  v_spent  integer;
  v_left   integer;
  v_used   integer := 0;
  v_floor  integer;
begin
  if v_uid is null then
    raise exception 'coach_ai_credits: no authenticated athlete' using errcode = '28000';
  end if;

  select * into v_cfg from public.coach_ai_config c where c.id;
  v_floor := greatest(coalesce(v_cfg.floor_per_day, 0), 0);

  -- No Premium AI: no balance, no floor. (coach_ai_balance answers 150 to anybody, which is why the chip reads this.)
  if not exists (
    select 1
      from public.athlete_entitlement e
     where e.athlete_id = v_uid
       and e.coach_ai
       and (e.coach_ai_until is null or e.coach_ai_until > now())
  ) then
    return query select false, 0, 0, 0, v_period, (v_period + interval '1 month')::date,
                        coalesce(v_cfg.credits_low_at, 0), 0, 0, 0, false;
    return;
  end if;

  select coalesce(p.allowance, v_cfg.credits_per_period)::integer, coalesce(p.spent, 0)::integer
    into v_allow, v_spent
    from (select 1) as one
    left join public.coach_ai_period p
      on p.athlete_id = v_uid
     and p.period = v_period;
  v_left := greatest(v_allow - v_spent, 0);

  if v_floor > 0 then
    select pr.tz into v_tz from public.profiles pr where pr.id = v_uid;
    if v_tz is null or not exists (select 1 from pg_catalog.pg_timezone_names z where z.name = v_tz) then
      v_tz := 'UTC';
    end if;
    v_day0 := ((now() at time zone v_tz)::date)::timestamp at time zone v_tz;
    select count(*)::integer into v_used
      from public.coach_ai_reservation r
     where r.athlete_id = v_uid
       and r.waiver = 'floor'
       and not r.refunded
       and r.reserved_at >= v_day0;
  end if;

  return query select
    true,
    v_left,
    v_allow,
    v_spent,
    v_period,
    (v_period + interval '1 month')::date,
    coalesce(v_cfg.credits_low_at, 0),
    v_floor,
    v_used,
    greatest(v_floor - v_used, 0),
    (v_floor > 0 and not coalesce(v_cfg.metering_only, false) and v_left = 0);
end;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 7 · ai_feedback — the typed "Fix it with AI" result gets its own feature (UX-4)
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.ai_feedback drop constraint if exists ai_feedback_feature_check;
alter table public.ai_feedback add constraint ai_feedback_feature_check
  check (feature in ('chat', 'kitchen', 'meal_photo', 'form_check', 'import', 'author', 'interpret', 'recipe_photo', 'workout_tidy'));

-- ══════════════════════════════════════════════════════════════════════════════
-- 8 · admin_ai_health — the LIVE source (pg_get_functiondef 2026-11-17 = 0269's text, md5 de03285c…); the ONE
--     change: the waived calls are counted (marked 0272), so /admin-ai can say how many free daily uses the soft
--     floor gave, and how many typed builds and photo tidies rode on a paid call.
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function public.admin_ai_health(p_days integer default 7, p_tz text default 'UTC')
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_days  int  := least(greatest(coalesce(p_days, 7), 1), 90);
  v_tz    text := coalesce(nullif(p_tz, ''), 'UTC');
  v_since timestamptz;
  v_cfg   public.ai_ops_config%rowtype;
  v_out   jsonb;
begin
  perform public.admin_guard();

  -- An unknown zone would raise inside every bucket below; the dashboard's clock falls back to UTC instead.
  if not exists (select 1 from pg_catalog.pg_timezone_names z where z.name = v_tz) then
    v_tz := 'UTC';
  end if;
  -- The first local midnight of the window, so the oldest day is a whole day like the others.
  v_since := (((now() at time zone v_tz)::date - (v_days - 1))::timestamp) at time zone v_tz;

  select * into v_cfg from public.ai_ops_config c where c.id;

  with s as (
    select x.fn,
           x.action,
           coalesce(x.fn, 'legacy:' || x.action)                  as grp,
           x.credits,
           x.cost_usd,
           x.latency_ms,
           x.waiver,                                              -- 0272
           (x.reservation_id is not null and x.uncharged)         as refunded,
           public.ai_spend_failed(x.outcome, x.uncharged)         as failed,
           coalesce(x.outcome = 'cancelled', false)               as cancelled,
           (x.occurred_at at time zone v_tz)::date                as d
      from public.coach_ai_spend x
     where x.occurred_at >= v_since
  ),
  f as (
    select fb.feature, fb.rating, (fb.created_at at time zone v_tz)::date as d
      from public.ai_feedback fb
     where fb.created_at >= v_since
  )
  select jsonb_build_object(
    'days',         v_days,
    'tz',           v_tz,
    'since',        v_since,
    'generated_at', now(),
    'totals', jsonb_build_object(
      'calls',        (select count(*) from s),
      'failures',     (select count(*) from s where s.failed),
      'cancelled',    (select count(*) from s where s.cancelled),
      'refunds',      (select count(*) from s where s.refunded),
      'credits',      coalesce((select sum(s.credits) from s where not s.refunded), 0),
      'cost_usd',     coalesce((select round(sum(s.cost_usd), 4) from s), 0),
      'legacy_calls', (select count(*) from s where s.fn is null),
      -- 0272: calls that held 0 credits on purpose, delivered (a refunded one gave nothing): the soft floor's free daily
      -- uses, a typed build's write riding on its paid turn, a photo's tidy pass riding on its paid read.
      'waivers', jsonb_build_object(
        'floor',       (select count(*) from s where s.waiver = 'floor' and not s.refunded),
        'typed_build', (select count(*) from s where s.waiver = 'typed_build' and not s.refunded),
        'photo_tidy',  (select count(*) from s where s.waiver = 'photo_tidy' and not s.refunded))),
    'last_24h', (select jsonb_build_object(
                          'calls',    count(*),
                          'failures', count(*) filter (where public.ai_spend_failed(y.outcome, y.uncharged)))
                   from public.coach_ai_spend y
                  where y.occurred_at > now() - interval '24 hours'),
    'by_fn', coalesce((select jsonb_agg(r order by r.calls desc, r.grp) from (
        select s.grp,
               max(s.fn)                                                   as fn,
               case when max(s.fn) is null then max(s.action) end          as action,
               count(*)                                                    as calls,
               count(*) filter (where s.failed)                            as failures,
               count(*) filter (where s.cancelled)                         as cancelled,
               count(*) filter (where s.refunded)                          as refunds,
               coalesce(sum(s.credits) filter (where not s.refunded), 0)   as credits,
               count(*) filter (where s.waiver = 'floor' and not s.refunded)       as floor_uses,   -- 0272
               count(*) filter (where s.waiver = 'typed_build' and not s.refunded) as typed_build,  -- 0272
               count(*) filter (where s.waiver = 'photo_tidy' and not s.refunded)  as photo_tidy,   -- 0272
               round(coalesce(sum(s.cost_usd), 0), 4)                      as cost_usd,
               count(s.latency_ms)                                         as timed,
               round(percentile_cont(0.5)  within group (order by s.latency_ms))::int as p50_ms,
               round(percentile_cont(0.95) within group (order by s.latency_ms))::int as p95_ms
          from s
         group by s.grp) r), '[]'::jsonb),
    'by_fn_day', coalesce((select jsonb_agg(r order by r.d desc, r.calls desc, r.grp) from (
        select s.d,
               s.grp,
               max(s.fn)                                                   as fn,
               case when max(s.fn) is null then max(s.action) end          as action,
               count(*)                                                    as calls,
               count(*) filter (where s.failed)                            as failures,
               count(*) filter (where s.cancelled)                         as cancelled,
               count(*) filter (where s.refunded)                          as refunds,
               coalesce(sum(s.credits) filter (where not s.refunded), 0)   as credits,
               count(*) filter (where s.waiver = 'floor' and not s.refunded)       as floor_uses,   -- 0272
               count(*) filter (where s.waiver = 'typed_build' and not s.refunded) as typed_build,  -- 0272
               count(*) filter (where s.waiver = 'photo_tidy' and not s.refunded)  as photo_tidy,   -- 0272
               round(coalesce(sum(s.cost_usd), 0), 4)                      as cost_usd,
               count(s.latency_ms)                                         as timed,
               round(percentile_cont(0.5)  within group (order by s.latency_ms))::int as p50_ms,
               round(percentile_cont(0.95) within group (order by s.latency_ms))::int as p95_ms
          from s
         group by s.d, s.grp) r), '[]'::jsonb),
    'feedback', coalesce((select jsonb_agg(r order by r.d desc, r.feature) from (
        select f.d, f.feature,
               count(*) filter (where f.rating = 1)  as up,
               count(*) filter (where f.rating = -1) as down
          from f
         group by f.d, f.feature) r), '[]'::jsonb),
    'feedback_totals', coalesce((select jsonb_agg(r order by r.feature) from (
        select f.feature,
               count(*) filter (where f.rating = 1)  as up,
               count(*) filter (where f.rating = -1) as down
          from f
         group by f.feature) r), '[]'::jsonb),
    'canary', jsonb_build_object(
      'configured', coalesce(v_cfg.canary_url is not null, false),
      'last',       (select jsonb_build_object('ran_at', r.ran_at, 'ok', r.ok, 'failed', r.failed, 'results', r.results)
                       from public.ai_canary_runs r order by r.ran_at desc limit 1),
      'last_ok_at', (select max(r.ran_at) from public.ai_canary_runs r where r.ok),
      'recent',     coalesce((select jsonb_agg(jsonb_build_object('ran_at', r.ran_at, 'ok', r.ok, 'failed', r.failed)
                                               order by r.ran_at desc)
                                from (select * from public.ai_canary_runs order by ran_at desc limit 14) r), '[]'::jsonb)),
    'unsettled', (select jsonb_build_object('count', count(*), 'oldest_at', min(r.reserved_at))
                    from public.coach_ai_reservation r
                   where r.settled_at is null
                     and r.reserved_at < now() - make_interval(mins => coalesce(v_cfg.unsettled_minutes, 30))),
    'alerts', jsonb_build_object(
      'tripped',            public.ai_health_alert_state(),
      'last_sent',          coalesce(v_cfg.last_alert_at, '{}'::jsonb),
      'admins_with_device', (select count(*) from public.app_admins a
                              where exists (select 1 from public.push_tokens t
                                             where t.user_id = a.user_id and t.disabled_at is null))),
    'thresholds', jsonb_build_object(
      'fail_rate',            v_cfg.fail_rate,
      'fail_min_calls',       v_cfg.fail_min_calls,
      'drain_streak',         v_cfg.drain_streak,
      'unsettled_minutes',    v_cfg.unsettled_minutes,
      'alert_cooldown_hours', v_cfg.alert_cooldown_hours,
      'canary_min_gap_hours', v_cfg.canary_min_gap_hours)
  ) into v_out;

  return v_out;
end;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 9 · Grants — Supabase grants EXECUTE on a new function to anon and authenticated directly, so the new one is
--     revoked from public AND anon, then granted to authenticated. Replaced functions keep their grants; restated.
-- ══════════════════════════════════════════════════════════════════════════════

revoke all on function public.coach_ai_credits() from public, anon;
grant execute on function public.coach_ai_credits() to authenticated;

revoke all on function public.coach_ai_reserve(text, text) from public, anon;
grant execute on function public.coach_ai_reserve(text, text) to authenticated;

revoke all on function public.coach_ai_settle(uuid, text, text, integer, integer, integer, integer, integer, boolean) from public, anon;
grant execute on function public.coach_ai_settle(uuid, text, text, integer, integer, integer, integer, integer, boolean) to authenticated;

revoke all on function public.admin_ai_health(integer, text) from public, anon;
grant execute on function public.admin_ai_health(integer, text) to authenticated;

commit;
