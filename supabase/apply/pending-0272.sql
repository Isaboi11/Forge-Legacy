-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0272: credits by real cost, one credit per typed build, a free tidy pass on every photo,
--           and the soft floor (AI Road to 10, Sprint 2 · UX-2 / PL-2)
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: §1 moves a weight only from its old value and is add-if-not-exists / guarded constraints /
-- create-or-replace; §2 only checks; §3 rolls its own test back. The editor shows only the LAST result — §3.
--
-- ORDER: after 0271 (ai/s2-gates) — 0272 touches none of 0271's objects, so it is also safe on its own.
-- Needs 0268 + 0269 (applied 11-17). PASTE THIS BEFORE the Sprint 2 OTA: the new app's chip reads
-- coach_ai_credits() and its "Fix it with AI" vote writes ai_feedback feature 'workout_tidy' — both exist only
-- after this. (The app copes without it: the chip falls back to coach_ai_balance, and a vote that fails says so.)
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- Docs/AI-Road-To-10-Plan-v1.0.md §1 ("Credit weights (MA3-D16 table)") and §2 PL-2's last bullet;
-- Docs/AI-Sprint-2-Build-Notes.md §1.3; Monetization-Architecture-Amendment-012. Weigh credits by what a call
-- really costs, stop charging a typed build twice and a photo import for its automatic tidy pass, and replace
-- the wall at 150 with a soft floor: chats and meal photos keep working, 5 a day, until the 1st.
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  (verbatim from supabase/migrations/0272_ai_credits_reweight_soft_floor.sql)
--       · action_credits: form_check 6 → 3 · recipe_photo 3 → 2 · web 3 → 2 — each only from its old value;
--         every other key untouched (meal_photo stays 1, ON PURPOSE since 09-28). Column default = the live map.
--       · coach_ai_config + floor_per_day (5) · floor_actions (coach-ask message; coach-interpret's turns;
--         meal-photo-read meal_photo) · credits_low_at (20)
--       · coach_ai_reservation.waiver + coach_ai_spend.waiver ('floor' · 'typed_build' · 'photo_tidy')
--       · coach_ai_reserve — the LIVE source + the profile's tz + step 3a (a waived call rides on the paid one
--         before it: coach-author after coach-interpret, workout-tidy after a photo read) + step 3b (the floor)
--       · coach_ai_settle — the LIVE source + the waiver on the ledger row
--       · coach_ai_credits() — the chip's read; ai_feedback feature + 'workout_tidy'; grants
-- §2  RAISES if any of that did not land, if a weight was not moved (it held something other than its old
--     value — then it was hand-set: decide it and set it by SQL), if a return shape changed, or if anon / PUBLIC
--     can call the meter, or the old path (spend_credits / quote / balance / record_usage) is not callable.
-- §3  one table, expected beside actual. Rows 1–9 read the database. Rows 10–19 are a REHEARSAL, run as two real
--     accounts and ROLLED BACK before it ends (a plpgsql sub-block that raises its own sentinel): an operator with
--     Premium AI and the AI consent, and an account without Premium AI. It reserves and settles through the real
--     functions, then every write it made — reservations, ledger rows, the month's balance — is undone. Row 19
--     proves nothing it did is left.
--
-- ⚠ LIVE FOR EVERY INSTALLED PHONE THE MOMENT IT LANDS (server only — no deploy, no OTA needed for the money):
--   the deployed functions charge the new weights, waive the typed build's write and the photo's tidy, and give
--   the floor. Their replies keep every field and reason name. An old phone at 0 credits simply finds that a
--   chat or a meal photo still works; when the day's 5 are used it says the same "out of Premium AI credits for
--   this month" it says today (true — the extra line about tomorrow is the new app's).
-- ⚠ The old quote → spend path (coach-form-check, until its Sprint 2 deploy) reads the same weights: 3 credits.
-- ⚠ "Someone saw it" (migration skill §5): on a Premium AI account, form check's start screen says "Uses 3 of your
--   N AI credits this month"; after the OTA, the chip on Holt's header shows the balance.
--
-- ══ PREDICTED §3 (2026-11-17, from read-only queries against prod; every row pass = true) ══
--    1 weights (every key) ............ day 1 · form_check 3 · kitchen 2 · meal_photo 1 · message 1 · photo_import 2 ·
--                                        photo_read 3 · program 1 · recipe_photo 2 · summary 0 · web 2 · workout_tidy 1
--    2 the floor ...................... 5 a day · coach-ask: message · coach-interpret: day, message, program ·
--                                        meal-photo-read: meal_photo · chip warns at 20
--    3 reserve's shape ................ TABLE(allowed boolean, reason text, reservation_id uuid, credits_spent integer,
--                                        remaining integer, allowance integer, age_years integer, minor boolean)
--    4 settle's shape ................. TABLE(settled boolean, refunded boolean, cost_usd numeric, remaining integer)
--    5 who can call the meter ......... authenticated: reserve, settle, credits · anon: none · PUBLIC: none
--    6 the old path ................... spend_credits, quote, balance, record_usage: callable
--    7 the column default ............. = row 1's map
--    8 thumbs features ................ … recipe_photo, workout_tidy
--    9 waived rows on the ledger ...... floor 0 · typed_build 0 · photo_tidy 0  (0 at paste time; a non-zero
--                                        count only once real calls run through the new reserve)
--   10 no Premium AI: a chat .......... not_entitled · nothing held
--   11 no Premium AI: the chip ........ entitled false · 0 of 0 · floor 0
--   12 a chat with credits ............ allowed · 1 credit
--   13 a typed build .................. interpret 1 · write 0 (typed_build) · a second write 1
--   14 a photo import ................. read 2 · tidy 0 (photo_tidy) · a typed "Fix it with AI" 1
--   15 the 0-credit tidy, recorded .... ledger: 0 credits · photo_tidy · workout-tidy · ok · on AI health: yes
--   16 at 0 credits, still refused .... web out_of_credits · kitchen out_of_credits · form_check out_of_credits ·
--                                        photo out_of_credits · typed write out_of_credits · typed fix out_of_credits
--   17 the floor ...................... 5 at 0 credits (chat, chat, typed turn, meal photo, chat) · the 6th chat: out_of_credits
--   18 the chip on the floor .......... remaining 0 · on_floor true · used 5 · left 0 · resets <first of next month>
--   19 a refunded floor call .......... spent unchanged · used 4 · the next chat goes through at 0
--   20 the rehearsal left nothing ..... reservations, ledger rows and the balance as before
--   A row 10–20 reading "skipped" means no operator account has Premium AI + the AI consent (prod has one).
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §1 — THE STATEMENTS (verbatim from supabase/migrations/0272_ai_credits_reweight_soft_floor.sql)
-- ───────────────────────────────────────────────────────────────────────────────────────────────

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
-- 8 · Grants — Supabase grants EXECUTE on a new function to anon and authenticated directly, so the new one is
--     revoked from public AND anon, then granted to authenticated. Replaced functions keep their grants.
-- ══════════════════════════════════════════════════════════════════════════════

revoke all on function public.coach_ai_credits() from public, anon;
grant execute on function public.coach_ai_credits() to authenticated;

revoke all on function public.coach_ai_reserve(text, text) from public, anon;
grant execute on function public.coach_ai_reserve(text, text) to authenticated;

revoke all on function public.coach_ai_settle(uuid, text, text, integer, integer, integer, integer, integer, boolean) from public, anon;
grant execute on function public.coach_ai_settle(uuid, text, text, integer, integer, integer, integer, integer, boolean) to authenticated;

commit;


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §2 — THE ASSERTION (raises if §1 did not land)
-- ───────────────────────────────────────────────────────────────────────────────────────────────

do $$
declare
  v_cfg  public.coach_ai_config%rowtype;
  v_bad  text;
  v_fn   oid;
  v_src  text;
begin
  select * into v_cfg from public.coach_ai_config c where c.id;
  if not found then
    raise exception '0272: coach_ai_config has no row';
  end if;

  -- The three weights. A key that held something other than its old value was set by hand: §1 left it alone.
  select string_agg(format('%s = %s (want %s)', w.k, coalesce(v_cfg.action_credits ->> w.k, 'missing'), w.want), ', ')
    into v_bad
    from (values ('form_check', 3), ('recipe_photo', 2), ('web', 2)) as w(k, want)
   where (v_cfg.action_credits ->> w.k)::integer is distinct from w.want;
  if v_bad is not null then
    raise exception '0272: a weight did not move — %. It was not its old value, so it was set by hand: decide it, then set it by SQL.', v_bad;
  end if;

  -- The floor and the warning.
  if v_cfg.floor_per_day is null or v_cfg.floor_actions is null or v_cfg.credits_low_at is null then
    raise exception '0272: coach_ai_config.floor_per_day / floor_actions / credits_low_at missing';
  end if;
  if not ((v_cfg.floor_actions -> 'coach-ask') ? 'message' and (v_cfg.floor_actions -> 'meal-photo-read') ? 'meal_photo') then
    raise exception '0272: floor_actions does not cover a plain chat and a meal photo: %', v_cfg.floor_actions;
  end if;
  if (v_cfg.floor_actions -> 'coach-ask') ? 'web' or v_cfg.floor_actions ? 'coach-author' or v_cfg.floor_actions ? 'coach-kitchen'
     or v_cfg.floor_actions ? 'coach-form-check' or v_cfg.floor_actions ? 'workout-card-read' or v_cfg.floor_actions ? 'program-photo-read' then
    raise exception '0272: floor_actions reaches a call the floor must never cover: %', v_cfg.floor_actions;
  end if;

  -- The waiver, on the reservation and on the ledger.
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'coach_ai_reservation' and column_name = 'waiver')
     or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'coach_ai_spend' and column_name = 'waiver') then
    raise exception '0272: the waiver column is missing on coach_ai_reservation or coach_ai_spend';
  end if;
  if not exists (select 1 from pg_constraint where conname = 'coach_ai_reservation_waiver_check')
     or not exists (select 1 from pg_constraint where conname = 'coach_ai_spend_waiver_check') then
    raise exception '0272: a waiver check constraint is missing';
  end if;

  -- reserve: same shape, still SECURITY DEFINER, still CALLS the old meter, and carries both new steps.
  v_fn := to_regprocedure('public.coach_ai_reserve(text, text)');
  if v_fn is null then
    raise exception '0272: coach_ai_reserve(text, text) is missing';
  end if;
  if pg_get_function_result(v_fn) is distinct from
     'TABLE(allowed boolean, reason text, reservation_id uuid, credits_spent integer, remaining integer, allowance integer, age_years integer, minor boolean)' then
    raise exception '0272: coach_ai_reserve''s shape changed: % — every deployed function reads it by name', pg_get_function_result(v_fn);
  end if;
  select p.prosrc into v_src from pg_proc p where p.oid = v_fn and p.prosecdef;
  if v_src is null or position('public.coach_ai_spend_credits(p_action)' in v_src) = 0
     or position('floor_actions' in v_src) = 0 or position('''typed_build''' in v_src) = 0 or position('''photo_tidy''' in v_src) = 0 then
    raise exception '0272: coach_ai_reserve is not 0272''s (SECURITY DEFINER, calls coach_ai_spend_credits, the floor, the waivers)';
  end if;

  -- settle: same shape, and it writes the waiver.
  v_fn := to_regprocedure('public.coach_ai_settle(uuid, text, text, integer, integer, integer, integer, integer, boolean)');
  if v_fn is null or pg_get_function_result(v_fn) is distinct from 'TABLE(settled boolean, refunded boolean, cost_usd numeric, remaining integer)' then
    raise exception '0272: coach_ai_settle is missing or its shape changed';
  end if;
  select p.prosrc into v_src from pg_proc p where p.oid = v_fn and p.prosecdef;
  if v_src is null or position('v_res.waiver' in v_src) = 0 or position('v_refund and v_res.credits > 0' in v_src) = 0 then
    raise exception '0272: coach_ai_settle is not 0272''s (the waiver on the ledger; a 0-credit refund moves no balance)';
  end if;

  -- The chip's read.
  v_fn := to_regprocedure('public.coach_ai_credits()');
  if v_fn is null or not exists (select 1 from pg_proc p where p.oid = v_fn and p.prosecdef) then
    raise exception '0272: coach_ai_credits() is missing or not SECURITY DEFINER';
  end if;

  -- Who can call the meter: authenticated, never anon, never PUBLIC.
  foreach v_src in array array[
    'public.coach_ai_reserve(text, text)',
    'public.coach_ai_settle(uuid, text, text, integer, integer, integer, integer, integer, boolean)',
    'public.coach_ai_credits()'
  ] loop
    v_fn := to_regprocedure(v_src);
    if has_function_privilege('anon', v_fn, 'EXECUTE') then
      raise exception '0272: anon can EXECUTE %', v_src;
    end if;
    if exists (select 1 from pg_proc p, aclexplode(p.proacl) a where p.oid = v_fn and a.grantee = 0 and a.privilege_type = 'EXECUTE') then
      raise exception '0272: PUBLIC can EXECUTE %', v_src;
    end if;
    if not has_function_privilege('authenticated', v_fn, 'EXECUTE') then
      raise exception '0272: authenticated cannot EXECUTE %', v_src;
    end if;
  end loop;

  -- The path old phones and old deployed functions use. Nothing here touches it; if it is gone, stop.
  foreach v_src in array array[
    'public.coach_ai_spend_credits(text)',
    'public.coach_ai_quote(text)',
    'public.coach_ai_balance()',
    'public.coach_ai_record_usage(text, integer, text, integer, integer, integer, integer, boolean)'
  ] loop
    if to_regprocedure(v_src) is null or not has_function_privilege('authenticated', to_regprocedure(v_src), 'EXECUTE') then
      raise exception '0272: % is missing or not callable — old phones and old functions would break', v_src;
    end if;
  end loop;

  if not exists (select 1 from pg_constraint where conname = 'ai_feedback_feature_check'
                  and pg_get_constraintdef(oid) like '%workout_tidy%' and pg_get_constraintdef(oid) like '%recipe_photo%') then
    raise exception '0272: ai_feedback_feature_check does not allow workout_tidy';
  end if;
end $$;


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §3 — THE REPORT (rows 1–9 read; rows 10–20 are a rehearsal that is ROLLED BACK — see the header)
-- ───────────────────────────────────────────────────────────────────────────────────────────────

create temp table if not exists r0272_report (n integer primary key, check_name text, expected text, actual text, pass boolean);
truncate r0272_report;

do $$
declare
  v_cfg     public.coach_ai_config%rowtype;
  v_period  date := date_trunc('month', now())::date;
  v_map     text;
  v_want    text := 'day 1 · form_check 3 · kitchen 2 · meal_photo 1 · message 1 · photo_import 2 · photo_read 3 · program 1 · recipe_photo 2 · summary 0 · web 2 · workout_tidy 1';
  v_ops     uuid;
  v_free    uuid;
  v_rows    jsonb := '[]'::jsonb;
  v_err     text;
  v_before  text;
  v_after   text;
  r         record;
  s         record;
  t         record;
  v_txt     text;
  v_n       integer;
  v_last    uuid;
  v_spent   integer;
  v_kept    integer;
  v_floor   integer;
begin
  select * into v_cfg from public.coach_ai_config c where c.id;
  v_floor := v_cfg.floor_per_day;

  -- ── 1–9: read ────────────────────────────────────────────────────────────────────────────────
  select string_agg(e.k || ' ' || e.v, ' · ' order by e.k) into v_map from jsonb_each_text(v_cfg.action_credits) as e(k, v);
  insert into r0272_report values (1, 'weights (every key)', v_want, v_map, v_map = v_want);

  select format('%s a day · %s · chip warns at %s', v_cfg.floor_per_day,
                (select string_agg(f.k || ': ' || (select string_agg(a.x, ', ' order by a.x) from jsonb_array_elements_text(f.v) as a(x)), ' · ' order by f.k)
                   from jsonb_each(v_cfg.floor_actions) as f(k, v)),
                v_cfg.credits_low_at)
    into v_txt;
  insert into r0272_report values (2, 'the floor',
    '5 a day · coach-ask: message · coach-interpret: day, message, program · meal-photo-read: meal_photo · chip warns at 20',
    v_txt, v_txt = '5 a day · coach-ask: message · coach-interpret: day, message, program · meal-photo-read: meal_photo · chip warns at 20');

  v_txt := pg_get_function_result('public.coach_ai_reserve(text, text)'::regprocedure);
  insert into r0272_report values (3, 'reserve''s shape (deployed functions read it by name)',
    'TABLE(allowed boolean, reason text, reservation_id uuid, credits_spent integer, remaining integer, allowance integer, age_years integer, minor boolean)',
    v_txt, v_txt = 'TABLE(allowed boolean, reason text, reservation_id uuid, credits_spent integer, remaining integer, allowance integer, age_years integer, minor boolean)');

  v_txt := pg_get_function_result('public.coach_ai_settle(uuid, text, text, integer, integer, integer, integer, integer, boolean)'::regprocedure);
  insert into r0272_report values (4, 'settle''s shape', 'TABLE(settled boolean, refunded boolean, cost_usd numeric, remaining integer)',
    v_txt, v_txt = 'TABLE(settled boolean, refunded boolean, cost_usd numeric, remaining integer)');

  select format('authenticated: %s · anon: %s · PUBLIC: %s',
           coalesce(string_agg(x.nm, ', ' order by x.ord) filter (where has_function_privilege('authenticated', x.f, 'EXECUTE')), 'none'),
           coalesce(string_agg(x.nm, ', ' order by x.ord) filter (where has_function_privilege('anon', x.f, 'EXECUTE')), 'none'),
           coalesce(string_agg(x.nm, ', ' order by x.ord) filter (where exists (select 1 from pg_proc p, aclexplode(p.proacl) a
                                                                                 where p.oid = x.f and a.grantee = 0 and a.privilege_type = 'EXECUTE')), 'none'))
    into v_txt
    from (values (1, 'reserve', 'public.coach_ai_reserve(text, text)'::regprocedure),
                 (2, 'settle', 'public.coach_ai_settle(uuid, text, text, integer, integer, integer, integer, integer, boolean)'::regprocedure),
                 (3, 'credits', 'public.coach_ai_credits()'::regprocedure)) as x(ord, nm, f);
  insert into r0272_report values (5, 'who can call the meter', 'authenticated: reserve, settle, credits · anon: none · PUBLIC: none',
    v_txt, v_txt = 'authenticated: reserve, settle, credits · anon: none · PUBLIC: none');

  select case when bool_and(to_regprocedure(x.f) is not null and has_function_privilege('authenticated', to_regprocedure(x.f), 'EXECUTE'))
              then 'spend_credits, quote, balance, record_usage: callable' else 'MISSING OR NOT CALLABLE' end
    into v_txt
    from (values ('public.coach_ai_spend_credits(text)'), ('public.coach_ai_quote(text)'), ('public.coach_ai_balance()'),
                 ('public.coach_ai_record_usage(text, integer, text, integer, integer, integer, integer, boolean)')) as x(f);
  insert into r0272_report values (6, 'the old path (old phones, old functions)', 'spend_credits, quote, balance, record_usage: callable',
    v_txt, v_txt = 'spend_credits, quote, balance, record_usage: callable');

  select string_agg(e.k || ' ' || e.v, ' · ' order by e.k) into v_txt
    from information_schema.columns ic,
         jsonb_each_text(regexp_replace(ic.column_default, '^''(.*)''::jsonb$', '\1')::jsonb) as e(k, v)
   where ic.table_schema = 'public' and ic.table_name = 'coach_ai_config' and ic.column_name = 'action_credits';
  insert into r0272_report values (7, 'the column default', v_want, coalesce(v_txt, '(unreadable)'), v_txt = v_want);

  select pg_get_constraintdef(c.oid) into v_txt from pg_constraint c where c.conname = 'ai_feedback_feature_check';
  insert into r0272_report values (8, 'thumbs features', '… recipe_photo, workout_tidy',
    case when v_txt like '%''recipe_photo''::text, ''workout_tidy''::text%' then '… recipe_photo, workout_tidy' else coalesce(v_txt, '(missing)') end,
    v_txt like '%''recipe_photo''::text, ''workout_tidy''::text%');

  select format('floor %s · typed_build %s · photo_tidy %s',
                count(*) filter (where s0.waiver = 'floor'), count(*) filter (where s0.waiver = 'typed_build'),
                count(*) filter (where s0.waiver = 'photo_tidy'))
    into v_txt from public.coach_ai_spend s0 where s0.waiver is not null;
  insert into r0272_report values (9, 'waived rows on the ledger (0 at paste time)', 'floor 0 · typed_build 0 · photo_tidy 0',
    v_txt, v_txt = 'floor 0 · typed_build 0 · photo_tidy 0');

  -- ── 10–20: the rehearsal, rolled back ──────────────────────────────────────────────────────────
  select a.user_id into v_ops
    from public.app_admins a
    join public.athlete_entitlement e
      on e.athlete_id = a.user_id and e.coach_ai and (e.coach_ai_until is null or e.coach_ai_until > now())
   where (select hc.action from public.health_consents hc
           where hc.athlete_id = a.user_id and hc.kind = 'ai_sharing'
           order by hc.created_at desc limit 1) = 'granted'
   order by a.user_id
   limit 1;
  select p.id into v_free
    from public.profiles p
   where not exists (select 1 from public.athlete_entitlement e
                      where e.athlete_id = p.id and e.coach_ai and (e.coach_ai_until is null or e.coach_ai_until > now()))
   order by p.id
   limit 1;

  if v_ops is null or v_free is null then
    insert into r0272_report values (10, 'the rehearsal', 'an operator with Premium AI + the AI consent, and an account without Premium AI',
      'skipped — none found', false);
  else
    v_before := (select format('%s reservations · %s ledger rows · spent %s', (select count(*) from public.coach_ai_reservation),
                               (select count(*) from public.coach_ai_spend),
                               coalesce((select string_agg(p.athlete_id::text || '=' || p.spent, ',' order by p.athlete_id)
                                           from public.coach_ai_period p where p.period = v_period), '-')));
    begin
      -- 10–11. No Premium AI: refused before anything is written, at any balance; the chip has nothing to show.
      perform set_config('request.jwt.claims', json_build_object('sub', v_free, 'role', 'authenticated')::text, true);
      select * into r from public.coach_ai_reserve('message', 'coach-ask');
      v_rows := v_rows || jsonb_build_object('n', 10, 'c', 'no Premium AI: a chat', 'e', 'not_entitled · nothing held',
        'a', r.reason || case when r.reservation_id is null then ' · nothing held' else ' · HELD' end);
      select * into r from public.coach_ai_credits();
      v_rows := v_rows || jsonb_build_object('n', 11, 'c', 'no Premium AI: the chip', 'e', 'entitled false · 0 of 0 · floor 0',
        'a', format('entitled %s · %s of %s · floor %s', r.entitled::text, r.remaining, r.allowance, r.floor_per_day));

      -- The operator, a clean slate: a full month, nothing recent to ride on, no floor used today.
      perform set_config('request.jwt.claims', json_build_object('sub', v_ops, 'role', 'authenticated')::text, true);
      update public.coach_ai_reservation x set refunded = true, settled_at = coalesce(x.settled_at, now())
       where x.athlete_id = v_ops and x.reserved_at > now() - interval '2 days';
      insert into public.coach_ai_period (athlete_id, period, spent, allowance)
      values (v_ops, v_period, 0, v_cfg.credits_per_period)
      on conflict (athlete_id, period) do update set spent = 0, allowance = excluded.allowance;

      -- 12. A chat with credits in hand.
      select * into r from public.coach_ai_reserve('message', 'coach-ask');
      perform public.coach_ai_settle(r.reservation_id, 'ok', 'claude-sonnet-5', 100, 100, 0, 0, 500, false);
      v_rows := v_rows || jsonb_build_object('n', 12, 'c', 'a chat with credits', 'e', 'allowed · 1 credit',
        'a', format('%s · %s credit', case when r.allowed then 'allowed' else r.reason end, r.credits_spent));

      -- 13. A typed build: the coach-interpret turn pays, coach-author's write rides on it; a second write pays.
      select * into r from public.coach_ai_reserve('program', 'coach-interpret');
      perform public.coach_ai_settle(r.reservation_id, 'ok', 'claude-sonnet-5', 100, 100, 0, 0, 500, false);
      select * into s from public.coach_ai_reserve('program', 'coach-author');
      select x.waiver into v_txt from public.coach_ai_reservation x where x.id = s.reservation_id;
      perform public.coach_ai_settle(s.reservation_id, 'ok', 'claude-sonnet-5', 3000, 1500, 0, 0, 9000, false);
      select * into t from public.coach_ai_reserve('program', 'coach-author');
      perform public.coach_ai_settle(t.reservation_id, 'ok', 'claude-sonnet-5', 3000, 1500, 0, 0, 9000, false);
      v_rows := v_rows || jsonb_build_object('n', 13, 'c', 'a typed build', 'e', 'interpret 1 · write 0 (typed_build) · a second write 1',
        'a', format('interpret %s · write %s (%s) · a second write %s', r.credits_spent, s.credits_spent, coalesce(v_txt, 'none'), t.credits_spent));

      -- 14–15. A photo import: the read pays, the tidy pass rides on it (and is recorded at 0); a typed fix pays.
      select * into r from public.coach_ai_reserve('photo_import', 'workout-card-read');
      perform public.coach_ai_settle(r.reservation_id, 'ok', 'claude-sonnet-5', 2000, 300, 0, 0, 7000, false);
      select * into s from public.coach_ai_reserve('workout_tidy', 'workout-tidy');
      select x.waiver into v_txt from public.coach_ai_reservation x where x.id = s.reservation_id;
      perform public.coach_ai_settle(s.reservation_id, 'ok', 'claude-sonnet-5', 400, 600, 0, 0, 6000, false);
      v_last := s.reservation_id;
      select * into t from public.coach_ai_reserve('workout_tidy', 'workout-tidy');
      perform public.coach_ai_settle(t.reservation_id, 'ok', 'claude-sonnet-5', 400, 600, 0, 0, 6000, false);
      v_rows := v_rows || jsonb_build_object('n', 14, 'c', 'a photo import', 'e', 'read 2 · tidy 0 (photo_tidy) · a typed "Fix it with AI" 1',
        'a', format('read %s · tidy %s (%s) · a typed "Fix it with AI" %s', r.credits_spent, s.credits_spent, coalesce(v_txt, 'none'), t.credits_spent));

      select format('ledger: %s credits · %s · %s · %s', x.credits, coalesce(x.waiver, 'none'), x.fn, x.outcome) into v_txt
        from public.coach_ai_spend x where x.reservation_id = v_last;
      v_txt := coalesce(v_txt, 'ledger: NO ROW') || ' · on AI health: '
        || case when exists (select 1 from jsonb_array_elements(public.admin_ai_health(1, 'UTC') -> 'by_fn') as b(v)
                              where b.v ->> 'fn' = 'workout-tidy' and (b.v ->> 'calls')::integer >= 2) then 'yes' else 'NO' end;
      v_rows := v_rows || jsonb_build_object('n', 15, 'c', 'the 0-credit tidy, recorded',
        'e', 'ledger: 0 credits · photo_tidy · workout-tidy · ok · on AI health: yes', 'a', v_txt);

      -- 16. The month's credits used: everything but a chat and a meal photo still refuses, with the reset date.
      update public.coach_ai_period p set spent = p.allowance where p.athlete_id = v_ops and p.period = v_period;
      select string_agg(x.lbl || ' ' || (select case when q.allowed then 'ALLOWED' else q.reason end
                                            from public.coach_ai_reserve(x.act, x.fn) as q), ' · ' order by x.ord)
        into v_txt
        from (values (1, 'web', 'web', 'coach-ask'), (2, 'kitchen', 'kitchen', 'coach-kitchen'),
                     (3, 'form_check', 'form_check', 'coach-form-check'), (4, 'photo', 'photo_import', 'workout-card-read'),
                     (5, 'typed write', 'program', 'coach-author'), (6, 'typed fix', 'workout_tidy', 'workout-tidy')) as x(ord, lbl, act, fn);
      v_rows := v_rows || jsonb_build_object('n', 16, 'c', 'at 0 credits, still refused',
        'e', 'web out_of_credits · kitchen out_of_credits · form_check out_of_credits · photo out_of_credits · typed write out_of_credits · typed fix out_of_credits',
        'a', v_txt);

      -- 17. The floor: five in total, at 0 credits, then a dead stop for the day — and only for the day.
      v_n := 0;
      v_txt := '';
      for r in select * from (values (1, 'message', 'coach-ask', 'chat'), (2, 'message', 'coach-ask', 'chat'),
                                     (3, 'message', 'coach-interpret', 'typed turn'), (4, 'meal_photo', 'meal-photo-read', 'meal photo'),
                                     (5, 'message', 'coach-ask', 'chat')) as x(ord, act, fn, lbl) order by x.ord loop
        select * into s from public.coach_ai_reserve(r.act, r.fn);
        if s.allowed and s.credits_spent = 0 then
          v_n := v_n + 1;
          v_txt := v_txt || case when v_txt = '' then '' else ', ' end || r.lbl;
        end if;
        v_last := s.reservation_id;
        -- the last one stays unsettled for row 19's refund
        if r.ord < 5 then
          perform public.coach_ai_settle(s.reservation_id, 'ok', 'claude-sonnet-5', 100, 100, 0, 0, 500, false);
        end if;
      end loop;
      select * into t from public.coach_ai_reserve('message', 'coach-ask');
      v_rows := v_rows || jsonb_build_object('n', 17, 'c', 'the floor',
        'e', format('%s at 0 credits (chat, chat, typed turn, meal photo, chat) · the 6th chat: out_of_credits', v_floor),
        'a', format('%s at 0 credits (%s) · the 6th chat: %s', v_n, v_txt, case when t.allowed then 'ALLOWED' else t.reason end));

      -- 18. The chip on the floor.
      select * into s from public.coach_ai_credits();
      v_rows := v_rows || jsonb_build_object('n', 18, 'c', 'the chip on the floor',
        'e', format('remaining 0 · on_floor true · used %s · left 0 · resets %s', v_floor, (v_period + interval '1 month')::date),
        'a', format('remaining %s · on_floor %s · used %s · left %s · resets %s', s.remaining, s.on_floor::text, s.floor_used_today, s.floor_left_today, s.resets_on));

      -- 19. A floor call that failed is refunded: it gives back the day's use, and never a credit.
      select p.spent into v_spent from public.coach_ai_period p where p.athlete_id = v_ops and p.period = v_period;
      perform public.coach_ai_settle(v_last, 'upstream_error', 'claude-sonnet-5', 0, 0, 0, 0, 500, true);
      select p.spent into v_kept from public.coach_ai_period p where p.athlete_id = v_ops and p.period = v_period;
      select * into s from public.coach_ai_credits();
      select * into t from public.coach_ai_reserve('message', 'coach-ask');
      v_rows := v_rows || jsonb_build_object('n', 19, 'c', 'a refunded floor call',
        'e', format('spent unchanged · used %s · the next chat goes through at 0', v_floor - 1),
        'a', format('%s · used %s · the next chat %s', case when v_kept = v_spent then 'spent unchanged' else format('spent %s → %s', v_spent, v_kept) end,
                    s.floor_used_today, case when t.allowed and t.credits_spent = 0 then 'goes through at 0' else 'REFUSED ' || t.reason end));

      raise exception using errcode = 'P0001', message = 'r0272 rehearsal rolled back';
    exception when others then
      if sqlerrm is distinct from 'r0272 rehearsal rolled back' then
        v_err := sqlstate || ': ' || sqlerrm;
      end if;
    end;

    insert into r0272_report (n, check_name, expected, actual, pass)
    select (x ->> 'n')::integer, x ->> 'c', x ->> 'e', x ->> 'a', (x ->> 'e') = (x ->> 'a')
      from jsonb_array_elements(v_rows) as x;
    if v_err is not null then
      insert into r0272_report values (99, 'the rehearsal STOPPED', 'no error', v_err, false);
    end if;

    v_after := (select format('%s reservations · %s ledger rows · spent %s', (select count(*) from public.coach_ai_reservation),
                              (select count(*) from public.coach_ai_spend),
                              coalesce((select string_agg(p.athlete_id::text || '=' || p.spent, ',' order by p.athlete_id)
                                          from public.coach_ai_period p where p.period = v_period), '-')));
    insert into r0272_report values (20, 'the rehearsal left nothing', 'reservations, ledger rows and the balance as before',
      case when v_after = v_before then 'reservations, ledger rows and the balance as before' else v_before || '  →  ' || v_after end,
      v_after = v_before);
  end if;
end $$;

select n, check_name, expected, actual, pass from r0272_report order by n;
