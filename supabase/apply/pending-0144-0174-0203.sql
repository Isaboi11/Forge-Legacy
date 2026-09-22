-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0144 + 0174 + 0203: PREMIUM AI (the gate, the PO grant, and the Settings switch)
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor for the FORGE project (ucqbzoeouvwoyfnnmqoo — NOT
-- Ledger) and run it once. Safe to run twice: every statement is guarded, §2 raises, §3 is read-only.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- PO, 2026-09-21: *"I want this turned on for just me. So anything AI is going to be another tier that
-- will only have me on it."*
--
--   0144  Coach AI credit meter — config, per-period balance, spend ledger, and the functions every AI
--         Edge Function calls before touching a model. Authored in August, deliberately never applied
--         ("no AI spend before full release"). The PO has now lifted that for their own account only.
--   0174  gives `photo_import` its credit weight (2). Without it the photo reader fails at the meter.
--   0203  THE GATE: `coach_ai_spend_credits` refuses anyone without `athlete_entitlement.coach_ai`;
--         `coach_ai` is granted to `app_admins` (the PO); and `set_my_premium_ai` lets any signed-in
--         account switch its OWN Premium AI on or off from Settings → Subscription (PO's call, testing
--         phase only).
--
-- ⚠ ORDER MATTERS AND IS FIXED BY THIS FILE: 0144 creates what 0174 and 0203 alter.
-- ⚠ NOTHING CHARGES ANYONE. `metering_only` stays TRUE. Spend is recorded, never billed.
-- ⚠ THE PHOTO READER STILL NEEDS ITS EDGE FUNCTION DEPLOYED and `ANTHROPIC_API_KEY` set as a secret —
--   this file is the database half only.
--
-- ══ PREDICTED §3 ══
--   admins_with_premium_ai = 1   (the PO — `app_admins` holds one row)
--   premium_ai_holders     = 1   (nobody else has ever been granted coach_ai)
--   photo_import_credits   = 2
--   anon_can_spend         = false
--   gate_in_body           = true
--   switch_exists          = true
-- Anything else: stop and send the row back before using the feature.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────────────────────────
-- §1 — THE STATEMENTS (the three migration files, verbatim, in order)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────

-- ═══ 0144_coach_ai_credits.sql ═══
-- Forge Legacy — 0144: the Coach AI credit meter
--
-- ══ WHAT THIS IS ══
--
-- The server-side allowance behind the Coach AI add-on ($9.99/mo · $89.99/yr, Premium required). Locked
-- in the Pricing Structure & Monetization Build Plan, 2026-08-12:
--
--   · Metered in CREDITS, not per-feature counters — one balance is one number to explain, one to tune,
--     and any future capability gets a weight instead of a fifth meter.
--   · 150 credits per month. Message 1 · program/day 1 · photo read 3 · form check 6.
--   · Model is `claude-sonnet-5` with the rulebook prompt cached.
--
-- ══ ⚠ EVERY NUMBER HERE IS CONFIGURATION, NOT A CONSTANT ══
--
-- Board review finding 07: *"Every cap number is a guess, so make guessing cheap. Store every cap and
-- allowance as server-side config, never a hardcoded constant."* The plan then requires a 60-day metered
-- run with the 20 testers UNCAPPED before the real allowance is set — which is only possible if the
-- allowance is a row somebody can edit. Being wrong should cost a SQL update, not an App Store
-- submission and a week.
--
-- So `coach_ai_config` holds the allowance and the per-action weights, and the Edge Function reads them
-- on every call. Nothing in `src/` may hardcode 150, or 1/3/6.
--
-- ══ ⚠ WHY A BALANCE ROW AND A LEDGER, AND NOT ONE OR THE OTHER ══
--
-- Two jobs that want two shapes:
--
--   · **Enforcement** must be atomic. Deriving the balance with `sum(credits)` and then inserting is two
--     statements, and under READ COMMITTED two concurrent requests both read the same sum, both pass the
--     check, and both spend. A phone retrying a timed-out call is exactly this race. `coach_ai_period`
--     is therefore a single row per athlete per month, and the spend is ONE `update … where spent +
--     cost <= allowance` — the row lock is held across the re-check, so the second caller re-evaluates
--     against the first caller's write and is refused.
--
--   · **Cost truth** must be per call. The plan requires cost logged per athlete from day one, because
--     the 60-day run is what sets the price. `coach_ai_spend` keeps one row per model call with the
--     token counts and the computed dollar cost. It is an append-only ledger and never gates anything.
--
-- ⚠ THE LEDGER IS NOT THE BALANCE. If they ever disagree, the balance row is authoritative for
-- enforcement and the ledger is authoritative for money. Do not "fix" one from the other.
--
-- ══ ⚠ CACHE READS ARE WHY THE COST COLUMN IS NOT input_tokens × A RATE ══
--
-- The rulebook system prompt is cached, and a cache read costs ~0.1× a fresh input token. A cost derived
-- from `input_tokens` alone would overstate spend by roughly 10× and would make the 60-day run useless
-- — it is the one measurement the whole price rests on. So the function passes the three token counts
-- separately and the cost is computed from all three. `cache_read_input_tokens` sitting at zero across
-- repeated calls means a silent invalidator is in the system prompt; the plan's Phase D verification
-- calls for exactly that check, and `coach_ai_cache_health()` below is how you run it.
--
-- ══ WHAT THIS DOES NOT DO ══
--
-- ⚠ IT DOES NOT DECIDE WHO IS ENTITLED. There is still no entitlement in this app — `src/lib/
-- entitlement.ts` returns true for everyone, deliberately, and Phase B owns replacing it. This meter
-- answers "how much has this athlete spent this month", never "may they spend at all". When Phase B
-- lands, the entitlement check goes in FRONT of `coach_ai_spend_credits`, not inside it.
--
-- ⚠ AND IT IS NOT ANALYTICS. Like 0143, this is the athlete's own record, readable only by them. It is
-- deliberately not in `app_events`, which is opt-out product telemetry with a different consent.
--
-- Idempotent. Depends on 0001 (profiles). RUN AFTER 0143.

begin;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 1. CONFIGURATION — the numbers, editable without a release
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.coach_ai_config (
  -- One row, ever. The check is what makes that true rather than conventional.
  id                 boolean primary key default true check (id),
  credits_per_period int     not null default 150 check (credits_per_period >= 0),
  -- Per-action weights. A jsonb map rather than columns so a new capability is a config edit and not a
  -- migration — the plan's whole reason for choosing credits over per-feature counters.
  action_credits     jsonb   not null default
    '{"message": 1, "program": 1, "day": 1, "photo_read": 3, "form_check": 6}'::jsonb,
  -- Sonnet 5 list price, $/MTok. Here rather than in the function so a price change is a SQL update and
  -- so the 60-day run's numbers stay reproducible against the rates that were live when it ran.
  usd_per_mtok_input       numeric(10, 4) not null default 3.0000,
  usd_per_mtok_output      numeric(10, 4) not null default 15.0000,
  -- Cache reads are ~0.1× input; cache WRITES are ~1.25×. Both are real and both are billed.
  usd_per_mtok_cache_read  numeric(10, 4) not null default 0.3000,
  usd_per_mtok_cache_write numeric(10, 4) not null default 3.7500,
  -- ⚠ THE 60-DAY RUN. While true, the balance is still tracked and the ledger still written, but the
  -- spend is never refused. This is the plan's "run it uncapped for the 20 testers with metering on" —
  -- the measurement is the point, and a cap during measurement measures the cap instead of the athlete.
  metering_only      boolean not null default true,
  updated_at         timestamptz not null default now()
);

insert into public.coach_ai_config (id) values (true) on conflict (id) do nothing;

comment on table public.coach_ai_config is
  'Coach AI allowance and pricing. One row. Edited by hand; never written by the app.';
comment on column public.coach_ai_config.metering_only is
  'TRUE = record spend but never refuse. The 60-day calibration run. Flip to FALSE at Phase F.';

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 2. THE BALANCE — one row per athlete per period, and the thing enforcement locks
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

-- The period is a month, stored as its first day. A `date` rather than a text 'YYYY-MM' so ordering,
-- ranges and "last month" are arithmetic instead of string surgery.
create table if not exists public.coach_ai_period (
  athlete_id uuid not null references public.profiles (id) on delete cascade,
  period     date not null,
  spent      int  not null default 0 check (spent >= 0),
  -- Snapshotted from config at row creation. The allowance an athlete was told they had must not move
  -- underneath them mid-month because someone edited the config — and the 60-day run WILL edit it.
  allowance  int  not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (athlete_id, period)
);

alter table public.coach_ai_period enable row level security;

drop policy if exists coach_ai_period_own_select on public.coach_ai_period;
create policy coach_ai_period_own_select on public.coach_ai_period
  for select using (athlete_id = auth.uid());

-- ⚠ NO INSERT/UPDATE/DELETE POLICY, ON PURPOSE. The only writer is the SECURITY DEFINER function
-- below. A client that could update its own balance row could grant itself credits, and RLS-on-with-no-
-- write-policy is how that is said in Postgres. Same shape as `app_admins` in 0129.

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 3. THE LEDGER — one row per model call, and the only source of truth about money
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.coach_ai_spend (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references public.profiles (id) on delete cascade,
  period      date not null,
  occurred_at timestamptz not null default now(),
  action      text not null,
  credits     int  not null check (credits >= 0),
  model       text,
  -- All four token counts kept separately. Collapsing them loses the cache signal, which is the single
  -- biggest cost lever in the product and the thing Phase D verification checks.
  input_tokens             int not null default 0,
  output_tokens            int not null default 0,
  cache_read_input_tokens  int not null default 0,
  cache_creation_input_tokens int not null default 0,
  -- Computed from the counts and the config rates at the time of the call. Stored rather than derived
  -- so a later rate change cannot silently rewrite what last month cost.
  cost_usd    numeric(12, 6) not null default 0,
  -- TRUE when the call was recorded but not charged (metering_only, or a refusal that still burned
  -- tokens). Kept so the 60-day run can separate "what they used" from "what they'd have been allowed".
  uncharged   boolean not null default false
);

create index if not exists coach_ai_spend_athlete_period_idx
  on public.coach_ai_spend (athlete_id, period);
create index if not exists coach_ai_spend_occurred_idx
  on public.coach_ai_spend (occurred_at desc);

alter table public.coach_ai_spend enable row level security;

drop policy if exists coach_ai_spend_own_select on public.coach_ai_spend;
create policy coach_ai_spend_own_select on public.coach_ai_spend
  for select using (athlete_id = auth.uid());

-- Same reasoning as the balance: no client write path exists.

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 4. SPEND — the one atomic entry point
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

/*
 * Reserve `p_action`'s credits for the caller, or refuse.
 *
 * ⚠ CALLED BEFORE THE MODEL CALL, NOT AFTER. An athlete at 149 of 150 credits who asks for a form check
 * (6) must be refused before a dollar is spent, not billed and then told. The token counts are therefore
 * unknown here and are attached afterwards by `coach_ai_record_usage`.
 *
 * ⚠ AND IT IS `security definer` BECAUSE THE TABLES HAVE NO WRITE POLICY. `search_path` is pinned: a
 * definer function that resolves `coach_ai_period` through a caller-controlled path is a privilege
 * escalation, and this one writes the balance that decides spend.
 *
 * Returns one row: whether it was allowed, and the remaining balance after.
 */
create or replace function public.coach_ai_spend_credits(p_action text)
returns table (allowed boolean, credits_spent int, remaining int, allowance int)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid       uuid := auth.uid();
  v_period    date := date_trunc('month', now())::date;
  v_cost      int;
  v_allowance int;
  v_metering  boolean;
  v_spent     int;
begin
  if v_uid is null then
    raise exception 'coach_ai_spend_credits: no authenticated athlete' using errcode = '28000';
  end if;

  select c.credits_per_period,
         coalesce((c.action_credits ->> p_action)::int, null),
         c.metering_only
    into v_allowance, v_cost, v_metering
    from public.coach_ai_config c
   where c.id;

  -- An unknown action must not cost zero and sail through. A capability that forgot to declare a weight
  -- would otherwise be free and invisible, which is precisely the failure the credit model exists to
  -- avoid.
  if v_cost is null then
    raise exception 'coach_ai_spend_credits: unknown action %', p_action using errcode = '22023';
  end if;

  insert into public.coach_ai_period (athlete_id, period, spent, allowance)
       values (v_uid, v_period, 0, v_allowance)
  on conflict (athlete_id, period) do nothing;

  -- THE ATOMIC BIT. One UPDATE, guarded in its own WHERE. Postgres holds the row lock across the
  -- re-check, so a concurrent caller sees the first caller's `spent` and is refused rather than racing
  -- it. Do not split this into a SELECT and an UPDATE.
  update public.coach_ai_period p
     set spent = p.spent + v_cost,
         updated_at = now()
   where p.athlete_id = v_uid
     and p.period = v_period
     and (v_metering or p.spent + v_cost <= p.allowance)
  returning p.spent, p.allowance into v_spent, v_allowance;

  if not found then
    -- Refused. Report the true remaining balance so the surface can say how short they are.
    select p.spent, p.allowance into v_spent, v_allowance
      from public.coach_ai_period p
     where p.athlete_id = v_uid and p.period = v_period;
    return query select false, v_cost, greatest(v_allowance - v_spent, 0), v_allowance;
    return;
  end if;

  return query select true, v_cost, greatest(v_allowance - v_spent, 0), v_allowance;
end;
$$;

revoke all on function public.coach_ai_spend_credits(text) from public;
grant execute on function public.coach_ai_spend_credits(text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 5. RECORD USAGE — what it actually cost, after the model has answered
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

/*
 * Append one ledger row with the real token counts. Never gates anything and never touches the balance
 * — the credits were already reserved by `coach_ai_spend_credits`.
 *
 * Cost is computed here rather than in the Edge Function so that every row is priced by the same rates
 * from the same place, and so a function deployed with a stale rate cannot quietly corrupt the only
 * measurement the price rests on.
 */
create or replace function public.coach_ai_record_usage(
  p_action                      text,
  p_credits                     int,
  p_model                       text,
  p_input_tokens                int,
  p_output_tokens               int,
  p_cache_read_input_tokens     int,
  p_cache_creation_input_tokens int,
  p_uncharged                   boolean default false
)
returns numeric
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_cost numeric(12, 6);
  v_cfg  public.coach_ai_config%rowtype;
begin
  if v_uid is null then
    raise exception 'coach_ai_record_usage: no authenticated athlete' using errcode = '28000';
  end if;

  select * into v_cfg from public.coach_ai_config where id;

  v_cost :=
      (coalesce(p_input_tokens, 0)::numeric                / 1000000) * v_cfg.usd_per_mtok_input
    + (coalesce(p_output_tokens, 0)::numeric               / 1000000) * v_cfg.usd_per_mtok_output
    + (coalesce(p_cache_read_input_tokens, 0)::numeric     / 1000000) * v_cfg.usd_per_mtok_cache_read
    + (coalesce(p_cache_creation_input_tokens, 0)::numeric / 1000000) * v_cfg.usd_per_mtok_cache_write;

  insert into public.coach_ai_spend (
    athlete_id, period, action, credits, model,
    input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens,
    cost_usd, uncharged
  ) values (
    v_uid, date_trunc('month', now())::date, p_action, coalesce(p_credits, 0), p_model,
    coalesce(p_input_tokens, 0), coalesce(p_output_tokens, 0),
    coalesce(p_cache_read_input_tokens, 0), coalesce(p_cache_creation_input_tokens, 0),
    v_cost, coalesce(p_uncharged, false)
  );

  return v_cost;
end;
$$;

revoke all on function public.coach_ai_record_usage(text, int, text, int, int, int, int, boolean) from public;
grant execute on function public.coach_ai_record_usage(text, int, text, int, int, int, int, boolean) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 6. BALANCE READ — what the surface shows
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.coach_ai_balance()
returns table (remaining int, allowance int, spent int, period date)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select greatest(coalesce(p.allowance, c.credits_per_period) - coalesce(p.spent, 0), 0)::int,
         coalesce(p.allowance, c.credits_per_period)::int,
         coalesce(p.spent, 0)::int,
         date_trunc('month', now())::date
    from public.coach_ai_config c
    left join public.coach_ai_period p
      on p.athlete_id = auth.uid()
     and p.period = date_trunc('month', now())::date
   where c.id;
$$;

revoke all on function public.coach_ai_balance() from public;
grant execute on function public.coach_ai_balance() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 7. CACHE HEALTH — the check Phase D verification asks for
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

/*
 * ⚠ IF `cache_read_share` IS NEAR ZERO ACROSS MANY CALLS, THE PROMPT CACHE IS NOT WORKING and every cost
 * projection in the pricing plan is wrong by roughly 10×. The usual cause is a silent invalidator in the
 * system prompt — a timestamp, a per-athlete id, a non-deterministic JSON key order — placed ahead of
 * the cache breakpoint.
 *
 * Admin-shaped, so it is gated the way `admin-live.ts` states: the gate belongs in Postgres.
 */
create or replace function public.coach_ai_cache_health(p_since timestamptz default now() - interval '7 days')
returns table (
  calls              bigint,
  avg_input          numeric,
  avg_cache_read     numeric,
  cache_read_share   numeric,
  total_cost_usd     numeric
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::bigint,
         round(avg(s.input_tokens), 1),
         round(avg(s.cache_read_input_tokens), 1),
         round(
           sum(s.cache_read_input_tokens)::numeric
           / nullif(sum(s.input_tokens + s.cache_read_input_tokens), 0), 3),
         round(sum(s.cost_usd), 4)
    from public.coach_ai_spend s
   where s.occurred_at >= p_since
     -- ⚠ `is_app_admin()`, NOT `admin_guard()` — fixed 2026-09-21 before this was ever applied. This file
     -- was written when `admin_guard()` returned boolean; 0176 redefined it to `returns void` (it raises
     -- instead), so `and public.admin_guard()` failed with 42804 on the first paste. `is_app_admin()`
     -- (0129) is the boolean it wraps, and gives the same zero-for-non-admins result the note below says.
     and public.is_app_admin();
$$;

revoke all on function public.coach_ai_cache_health(timestamptz) from public;
grant execute on function public.coach_ai_cache_health(timestamptz) to authenticated;

commit;

-- ══ VERIFY ══
--
--   select * from public.coach_ai_config;                  -- one row, metering_only = true
--   select * from public.coach_ai_spend_credits('message'); -- allowed, remaining 149
--   select * from public.coach_ai_balance();                -- remaining 149 of 150
--   select * from public.coach_ai_spend_credits('nonsense'); -- ERROR 22023, as intended
--
-- ⚠ The `coach_ai_cache_health` line returns zero rows unless you are in `app_admins` — that is
-- `is_app_admin()` doing its job, not a failure. Same by-design behaviour recorded for 0130.

-- ═══ 0174_coach_ai_photo_import.sql ═══
-- 0174 — `photo_import` gets its own credit weight
--
-- Idempotent. Depends on 0144 (coach_ai_config). RUN AFTER 0173.
--
-- ══ WHY THIS EXISTS ══
--
-- `program-photo-read` transcribes a photographed training table into TSV for the existing importer.
-- `coach_ai_spend_credits(p_action)` reads its weight out of `coach_ai_config.action_credits`, and that
-- function RAISES `22023` on an action it does not know:
--
--   "An unknown action must not cost zero and sail through. A capability that forgot to declare a
--    weight would otherwise be free and invisible, which is precisely the failure the credit model
--    exists to avoid."
--
-- So until this runs, every photo import fails at the meter before the model is ever called. That is
-- the designed behaviour, not a bug to work around in the function.
--
-- ══ ⚠ ITS OWN ACTION RATHER THAN REUSING `photo_read` ══
--
-- `photo_read` (3) is photo COACHING — a model looking at a person and reasoning about what it sees,
-- costed at ~$0.075 in the capability scope. This is a transcription of a table: one uncached image,
-- a cached system prompt, and TSV out, at roughly half that. Two capabilities sharing one action would
-- save this file and cost the 60-day run the only thing it is for — a ledger that cannot tell them
-- apart cannot price either.
--
-- **2 credits**, set here and nowhere else. MA3-D16: every cap and allowance is server-side config,
-- never a constant in `src/`.
--
-- ⚠ `metering_only` IS ALREADY TRUE (0144's default) AND THIS FILE DOES NOT CHANGE IT. Spend is
-- recorded and never refused, which is the plan's uncapped metered-tester posture. Flipping it is
-- Phase F's job, and when it happens photo import starts gating with no code change.

begin;

-- ── 1. The default, for a database built from scratch ────────────────────────────────────────────
--
-- Kept in step with the row update below. A default that disagrees with the live row is how the next
-- environment gets a different price list than this one.
alter table public.coach_ai_config
  alter column action_credits set default
    '{"message": 1, "program": 1, "day": 1, "photo_read": 3, "photo_import": 2, "form_check": 6}'::jsonb;

-- ── 2. The live row ──────────────────────────────────────────────────────────────────────────────
--
-- ⚠ MERGE ORDER IS LOAD-BEARING AND IT IS NOT THE OBVIOUS ONE. In `a || b`, b's keys win. The new
-- object is on the LEFT so the existing `action_credits` wins every collision — which means this adds
-- `photo_import` when it is missing and can never overwrite a weight that has been hand-tuned in the
-- SQL editor since. The `where` makes it a no-op on a second run; the merge order makes it harmless
-- even if the `where` is ever removed.
update public.coach_ai_config
   set action_credits = jsonb_build_object('photo_import', 2) || action_credits,
       updated_at = now()
 where not (action_credits ? 'photo_import');

comment on column public.coach_ai_config.action_credits is
  'Per-action credit weights. message/program/day 1 · photo_import 2 · photo_read 3 · form_check 6. '
  'An action absent from this map raises 22023 in coach_ai_spend_credits rather than costing zero.';

commit;

-- ═══ 0203_premium_ai_gate.sql ═══
-- Forge Legacy — 0203: Premium AI — the AI features are gated to the Coach AI add-on, and only the PO holds it
--
-- ══ WHAT WAS ASKED ══
--
-- PO, 2026-09-21: *"I want this turned on for just me. So anything AI is going to be another tier that
-- will only have me on it… it'll be safe to call it Premium AI for right now."*
--
-- ══ THE TIER ALREADY EXISTED — THE CHECK DID NOT ══
--
-- `athlete_entitlement.coach_ai` (0145, applied) is exactly this tier: concurrent with Premium, per
-- athlete, optionally time-boxed. `my_entitlement()` already returns it as `coachAi`. "Premium AI" is the
-- display name; the column keeps the name the SKU (`coach_ai_*`) and the pricing plan use.
--
-- ⚠ BUT NOTHING ON THE SERVER READ IT. `coach_ai_spend_credits` (0144) — which every AI Edge Function
-- calls BEFORE the model, by design — checked only the credit balance, and `metering_only` is TRUE, so
-- it never refused anybody. Any signed-in account could have called `program-photo-read` and spent the
-- PO's API key. Hiding a tab in the client is not a gate; this is.
--
-- ══ WHAT THIS DOES ══
--
--   1. `coach_ai_spend_credits` refuses (allowed = false, 0 credits) any caller without a live
--      `coach_ai`. The rest of the body is 0144's, copied by script, not retyped — the only difference is
--      the one block marked 0203.
--   2. Revokes `anon` on the four 0144 functions (the 0147 lesson: Supabase grants `anon` directly, so
--      `revoke … from public` alone leaves it reachable).
--   4. `set_my_premium_ai(on)` — PO, same day: *"Have it be as an option in the subscription page in
--      settings to change to for whatever account I'm using. I'm not worried about anyone finding it for
--      right now."* So ANY signed-in account can switch its OWN Premium AI on or off. ⚠ That means the
--      gate in (1) protects against callers who never flipped it, not against someone who does — the
--      PO accepted that for the testing phase. Before public release this must become a purchase
--      (RevenueCat) or an admin-only write; see the Decision Queue.
--      A new row copies the CURRENT default tier (never pins someone to Free), so flipping AI on changes
--      nothing about their Premium/Free status today.
--   3. Grants `coach_ai` to every account in `app_admins` (0129) — today, only the PO. Upserted:
--      a PO with no entitlement row gets one (PREMIUM grant, as every tester holds); an existing row
--      only has `coach_ai` switched on and nothing else touched.
--
-- Depends on 0144 (the functions) and 0145 (athlete_entitlement). Idempotent. RUN AFTER 0144 AND 0174.

begin;

create or replace function public.coach_ai_spend_credits(p_action text)
returns table (allowed boolean, credits_spent int, remaining int, allowance int)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid       uuid := auth.uid();
  v_period    date := date_trunc('month', now())::date;
  v_cost      int;
  v_allowance int;
  v_metering  boolean;
  v_spent     int;
begin
  if v_uid is null then
    raise exception 'coach_ai_spend_credits: no authenticated athlete' using errcode = '28000';
  end if;

  -- 0203 — PREMIUM AI. Nobody reaches a model without the add-on. Refused BEFORE a credit row is even
  -- created, so a caller without it leaves no trace in the meter and costs nothing.
  if not exists (
    select 1
      from public.athlete_entitlement e
     where e.athlete_id = v_uid
       and e.coach_ai
       and (e.coach_ai_until is null or e.coach_ai_until > now())
  ) then
    return query select false, 0, 0, 0;
    return;
  end if;

  select c.credits_per_period,
         coalesce((c.action_credits ->> p_action)::int, null),
         c.metering_only
    into v_allowance, v_cost, v_metering
    from public.coach_ai_config c
   where c.id;

  -- An unknown action must not cost zero and sail through. A capability that forgot to declare a weight
  -- would otherwise be free and invisible, which is precisely the failure the credit model exists to
  -- avoid.
  if v_cost is null then
    raise exception 'coach_ai_spend_credits: unknown action %', p_action using errcode = '22023';
  end if;

  insert into public.coach_ai_period (athlete_id, period, spent, allowance)
       values (v_uid, v_period, 0, v_allowance)
  on conflict (athlete_id, period) do nothing;

  -- THE ATOMIC BIT. One UPDATE, guarded in its own WHERE. Postgres holds the row lock across the
  -- re-check, so a concurrent caller sees the first caller's `spent` and is refused rather than racing
  -- it. Do not split this into a SELECT and an UPDATE.
  update public.coach_ai_period p
     set spent = p.spent + v_cost,
         updated_at = now()
   where p.athlete_id = v_uid
     and p.period = v_period
     and (v_metering or p.spent + v_cost <= p.allowance)
  returning p.spent, p.allowance into v_spent, v_allowance;

  if not found then
    -- Refused. Report the true remaining balance so the surface can say how short they are.
    select p.spent, p.allowance into v_spent, v_allowance
      from public.coach_ai_period p
     where p.athlete_id = v_uid and p.period = v_period;
    return query select false, v_cost, greatest(v_allowance - v_spent, 0), v_allowance;
    return;
  end if;

  return query select true, v_cost, greatest(v_allowance - v_spent, 0), v_allowance;
end;
$$;

revoke all on function public.coach_ai_spend_credits(text) from public;
grant execute on function public.coach_ai_spend_credits(text) to authenticated;

-- The 0147 lesson: Supabase grants `anon` EXECUTE directly, so `revoke … from public` does not reach it.
revoke execute on function public.coach_ai_spend_credits(text) from anon;
revoke execute on function public.coach_ai_record_usage(text, int, text, int, int, int, int, boolean) from anon;
revoke execute on function public.coach_ai_balance() from anon;
revoke execute on function public.coach_ai_cache_health(timestamptz) from anon;

-- Premium AI for the operator allowlist — the PO, and nobody else today.
insert into public.athlete_entitlement (athlete_id, tier, premium_kind, coach_ai, grant_note)
select a.user_id, 'PREMIUM', 'GRANT', true,
       'PO - Premium AI (coach_ai), owner-only AI testing. 0203, 2026-09-21. Exclude from ALL metrics.'
  from public.app_admins a
on conflict (athlete_id) do update
  set coach_ai = true, coach_ai_until = null, updated_at = now();

-- (4) The self-serve switch. Zero-argument identity: it can only ever reach the caller's own row.
create or replace function public.set_my_premium_ai(p_on boolean)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'set_my_premium_ai: no authenticated athlete' using errcode = '28000';
  end if;

  insert into public.athlete_entitlement (athlete_id, tier, coach_ai, grant_note)
  select v_uid, c.default_tier, p_on, 'Premium AI self-serve switch (0203) - testing phase.'
    from public.entitlement_config c
   where c.id
  on conflict (athlete_id) do update
    set coach_ai = p_on, coach_ai_until = null, updated_at = now();

  return p_on;
end;
$$;

revoke all on function public.set_my_premium_ai(boolean) from public;
revoke execute on function public.set_my_premium_ai(boolean) from anon;
grant execute on function public.set_my_premium_ai(boolean) to authenticated;

commit;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────
-- §2 — THE ASSERTION (raises if anything did not land)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────

do $$
begin
  if to_regclass('public.coach_ai_config') is null or to_regclass('public.coach_ai_period') is null
     or to_regclass('public.coach_ai_spend') is null then
    raise exception '0144 did not land: a coach_ai table is missing';
  end if;
  if not exists (select 1 from public.coach_ai_config c where c.action_credits ? 'photo_import') then
    raise exception '0174 did not land: photo_import has no credit weight';
  end if;
  if position('athlete_entitlement' in pg_get_functiondef('public.coach_ai_spend_credits(text)'::regprocedure)) = 0 then
    raise exception '0203 did not land: coach_ai_spend_credits has no Premium AI gate';
  end if;
  if has_function_privilege('anon', 'public.coach_ai_spend_credits(text)', 'execute') then
    raise exception '0203 did not land: anon can still execute coach_ai_spend_credits';
  end if;
  if to_regprocedure('public.set_my_premium_ai(boolean)') is null then
    raise exception '0203 did not land: set_my_premium_ai is missing';
  end if;
  if not exists (
    select 1 from public.app_admins a
      join public.athlete_entitlement e on e.athlete_id = a.user_id
     where e.coach_ai
  ) then
    raise exception '0203 did not land: no admin holds Premium AI (is app_admins empty?)';
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────
-- §3 — THE REPORT (read-only, one row)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────

select
  (select count(*) from public.app_admins a
     join public.athlete_entitlement e on e.athlete_id = a.user_id
    where e.coach_ai)                                                                   as admins_with_premium_ai,
  (select count(*) from public.athlete_entitlement e where e.coach_ai)                  as premium_ai_holders,
  (select (c.action_credits ->> 'photo_import')::int from public.coach_ai_config c)     as photo_import_credits,
  has_function_privilege('anon', 'public.coach_ai_spend_credits(text)', 'execute')      as anon_can_spend,
  position('athlete_entitlement'
    in pg_get_functiondef('public.coach_ai_spend_credits(text)'::regprocedure)) > 0     as gate_in_body,
  to_regprocedure('public.set_my_premium_ai(boolean)') is not null                      as switch_exists;
