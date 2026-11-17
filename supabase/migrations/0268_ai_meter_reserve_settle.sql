-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- 0268 · THE AI METER: reserve → model → settle — refunds on failure, a per-model rate map, admin metering
--        AI Road to 10, Sprint 1 (PL-1 / PL-2). Audit rows P-D2, P-D5, P-D6, P-D7, P-G8, P-G9, P-G10.
--        Contract: Docs/AI-Sprint-1-Build-Notes.md §1 (the meter) and §2 (cost).
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHY ══
--
-- Every metered Edge Function spends the credits with coach_ai_spend_credits BEFORE the model call (right: a
-- caller who cannot pay is refused before a dollar is spent) and never gives them back. On an upstream failure
-- it then writes a spend row marked uncharged = true, after the credits were already taken (P-D2: 375 such
-- `program` rows in the 09-21 week). The ledger prices every model at Sonnet 4.x rates (P-D5: $34.71 recorded
-- against ~$19.93 at list). coach_ai_record_usage writes any row an authenticated caller sends (P-D7).
--
-- ══ WHAT THIS DOES ══
--
--   1. coach_ai_spend gains fn · outcome · latency_ms · reservation_id · cost_usd_legacy (what the AI health
--      page reads), and one row per reservation at most (a unique partial index).
--   2. coach_ai_reservation — the credits a function holds between reserve and settle. RLS on, NO policy,
--      every privilege revoked: nobody can read an id (contract §1.3).
--   3. coach_ai_config.model_rates — USD per million tokens per model (contract §2), set once.
--   4. coach_ai_rate_cost(model, in, out, cache read, cache write) — exact key, else the LONGEST key that is a
--      prefix of the model, else `default`. The one place a cost is computed.
--   5. coach_ai_reserve(action, fn) — no auth → 28000 · no live coach_ai → not_entitled · latest ai_sharing
--      consent not `granted` → no_consent (nothing written for either) · then the EXISTING
--      coach_ai_spend_credits(action), CALLED (its body is not copied) · allowed → a reservation row. Also
--      returns the server's age (profiles.birth_year) and `minor` by the app's own rule (isUnderAge: the year
--      you turn 18 is still under 18; no birth year → not a minor).
--   6. coach_ai_settle(...) — the caller's own reservation, unsettled, reserved in the last 30 minutes;
--      anything else is a no-op (settled = false), so a second settle changes nothing. Refund → the
--      reservation's own period row gives the credits back (floor 0). Always ONE spend row, priced by (4).
--   7. coach_ai_record_usage — SAME SIGNATURE, hardened (P-D7): live coach_ai required (42501), the action must
--      be priced (22023), credits clamped to 0…that action's weight, tokens to 0…5,000,000, priced by (4).
--      Kept for the deployed functions that still call it; a later migration revokes it.
--   8. coach_ai_record_admin_usage(...) — is_app_admin() only; admin_bug_plain / admin_social_plan; 0 credits,
--      its own ledger line, nobody's balance touched (P-G10).
--   9. admin_ai_usage and admin_user_card — a REFUNDED row (uncharged and reservation_id set) no longer counts
--      its credits as spent; admin_ai_usage's per-athlete spread leaves out the operator tools. Each is the
--      LIVE source (pg_get_functiondef, 2026-11-17) with only those lines changed.
--  10. Backfill — cost_usd copied to cost_usd_legacy ONCE (only while no row has one yet), then every row
--      re-priced by (4).
--  11. Grants — Supabase grants EXECUTE on a new function to anon and authenticated directly, so each is
--      revoked from public AND anon, then granted to authenticated only where a function needs it.
--
-- ══ ⚠ SAFE FOR EVERY DEPLOYED FUNCTION ══
--
-- Additive for the old path: coach_ai_spend_credits and coach_ai_quote are untouched; coach_ai_record_usage keeps
-- its signature and grants and is only refused for calls no deployed function makes (no Premium AI, an unpriced
-- action). The deployed functions ignore record_usage's result, so even a refusal could not fail a request.
-- The new columns are nullable and nothing deployed selects them.
--
-- Depends on 0144, 0203, 0224, 0238 and 0267 (all applied). Wrapped in one transaction. Safe to run twice:
-- add-if-not-exists, create-if-not-exists, create-or-replace, a guarded one-time copy, idempotent re-pricing.

begin;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1 · coach_ai_spend — what each call was, and how it ended
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.coach_ai_spend add column if not exists fn text;
alter table public.coach_ai_spend add column if not exists outcome text;
alter table public.coach_ai_spend add column if not exists latency_ms integer;
alter table public.coach_ai_spend add column if not exists reservation_id uuid;
alter table public.coach_ai_spend add column if not exists cost_usd_legacy numeric;

create unique index if not exists coach_ai_spend_reservation_uniq
  on public.coach_ai_spend (reservation_id)
  where reservation_id is not null;

comment on column public.coach_ai_spend.fn is
  'The Edge Function that made the call (0268), its deployed slug; ''other'' for an unknown one. Null on rows written before 0268 or by coach_ai_record_usage.';
comment on column public.coach_ai_spend.outcome is
  'How the call ended (0268): ok · upstream_error · upstream_unreachable · timeout · refusal · truncated · not_a_program · unreadable · bad_output · cancelled · guarded (a server guard stopped it after the reserve) · other. On a reserve/settle row every value but ok was refunded.';
comment on column public.coach_ai_spend.latency_ms is
  'The model round trip in milliseconds, as the function measured it (0268), 0…600,000.';
comment on column public.coach_ai_spend.reservation_id is
  'The coach_ai_reservation this row settled (0268). Set means the reserve/settle path wrote it; uncharged AND this set means the credits really were given back.';
comment on column public.coach_ai_spend.cost_usd_legacy is
  'cost_usd as recorded before 0268 re-priced the ledger per model (one flat Sonnet 4.x rate). Null on rows written after 0268.';

-- ══════════════════════════════════════════════════════════════════════════════
-- 2 · coach_ai_reservation — credits held between reserve and settle
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists public.coach_ai_reservation (
  id           uuid         primary key default gen_random_uuid(),
  athlete_id   uuid         not null references public.profiles (id) on delete cascade,
  period       date         not null,
  action       text         not null,
  fn           text         not null,
  credits      integer      not null,
  reserved_at  timestamptz  not null default now(),
  settled_at   timestamptz,
  refunded     boolean      not null default false,
  outcome      text
);

create index if not exists coach_ai_reservation_athlete_idx
  on public.coach_ai_reservation (athlete_id, reserved_at desc);

comment on table public.coach_ai_reservation is
  'Credits an AI Edge Function holds between coach_ai_reserve and coach_ai_settle (0268). Written and read only by those two SECURITY DEFINER functions: RLS on, no policy, no grants, so no caller can read an id. A row with settled_at null after 30 minutes is a call the platform cut off (the AI health page shows it as unsettled).';

alter table public.coach_ai_reservation enable row level security;

revoke all on table public.coach_ai_reservation from public, anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- 3 · coach_ai_config.model_rates — USD per million tokens, per model (contract §2)
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.coach_ai_config add column if not exists model_rates jsonb;

comment on column public.coach_ai_config.model_rates is
  'USD per million tokens per model (0268): {model: {input, output, cache_read, cache_write}}, plus default. Looked up by coach_ai_rate_cost: exact key, else the longest key that is a prefix of the model, else default. Anthropic list prices; check the pricing page before each monthly reconcile against the invoice. Mirrored in src/domain/ai/model-rates.ts.';

update public.coach_ai_config c
   set model_rates = '{
     "claude-sonnet-5":   {"input": 2.00, "output": 10.00, "cache_read": 0.20, "cache_write": 2.50},
     "claude-sonnet-5-5": {"input": 2.00, "output": 10.00, "cache_read": 0.10, "cache_write": 2.50},
     "claude-haiku-4-5":  {"input": 1.00, "output": 5.00,  "cache_read": 0.10, "cache_write": 1.25},
     "claude-haiku-5-5":  {"input": 0.10, "output": 0.50,  "cache_read": 0.01, "cache_write": 0.125},
     "claude-opus-5-5":   {"input": 4.00, "output": 20.00, "cache_read": 0.20, "cache_write": 5.00},
     "claude-opus-5":     {"input": 5.00, "output": 25.00, "cache_read": 0.50, "cache_write": 6.25},
     "default":           {"input": 2.00, "output": 10.00, "cache_read": 0.20, "cache_write": 2.50}
   }'::jsonb,
       updated_at = now()
 where c.id
   and c.model_rates is null;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4 · coach_ai_rate_cost — the one place a call is priced
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function public.coach_ai_rate_cost(
  p_model text,
  p_input_tokens integer,
  p_output_tokens integer,
  p_cache_read_input_tokens integer,
  p_cache_creation_input_tokens integer
)
returns numeric
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  v_cfg   public.coach_ai_config%rowtype;
  v_key   text;
  v_rate  jsonb;
  v_in    numeric := greatest(coalesce(p_input_tokens, 0), 0);
  v_out   numeric := greatest(coalesce(p_output_tokens, 0), 0);
  v_read  numeric := greatest(coalesce(p_cache_read_input_tokens, 0), 0);
  v_write numeric := greatest(coalesce(p_cache_creation_input_tokens, 0), 0);
begin
  select * into v_cfg from public.coach_ai_config c where c.id;

  if v_cfg.model_rates is not null then
    if p_model is not null and v_cfg.model_rates ? p_model then
      v_key := p_model;
    else
      -- The longest key that the model starts with: claude-haiku-4-5-20251001 → claude-haiku-4-5. `left()`, not
      -- LIKE, so an underscore in a key is a character and not a wildcard.
      select k.key into v_key
        from jsonb_object_keys(v_cfg.model_rates) as k(key)
       where k.key <> 'default'
         and p_model is not null
         and left(p_model, length(k.key)) = k.key
       order by length(k.key) desc
       limit 1;
    end if;
    v_rate := v_cfg.model_rates -> coalesce(v_key, 'default');
  end if;

  if v_rate is null then
    -- No map (or no default in it): the single row of rates every call was priced at before 0268.
    return coalesce(round(
        (v_in    / 1000000) * v_cfg.usd_per_mtok_input
      + (v_out   / 1000000) * v_cfg.usd_per_mtok_output
      + (v_read  / 1000000) * v_cfg.usd_per_mtok_cache_read
      + (v_write / 1000000) * v_cfg.usd_per_mtok_cache_write, 6), 0);
  end if;

  return coalesce(round(
      (v_in    / 1000000) * (v_rate ->> 'input')::numeric
    + (v_out   / 1000000) * (v_rate ->> 'output')::numeric
    + (v_read  / 1000000) * (v_rate ->> 'cache_read')::numeric
    + (v_write / 1000000) * (v_rate ->> 'cache_write')::numeric, 6), 0);
end;
$$;

comment on function public.coach_ai_rate_cost(text, integer, integer, integer, integer) is
  'USD for one model call from coach_ai_config.model_rates (0268): exact key, else the longest prefix key, else default; the flat usd_per_mtok_* columns only if there is no map. Used by coach_ai_settle, coach_ai_record_usage, coach_ai_record_admin_usage and the 0268 backfill. Not callable by app roles.';

-- ══════════════════════════════════════════════════════════════════════════════
-- 5 · coach_ai_reserve — hold the credits, or say why not
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function public.coach_ai_reserve(p_action text, p_fn text)
returns table (
  allowed        boolean,
  reason         text,
  reservation_id uuid,
  credits_spent  integer,
  remaining      integer,
  allowance      integer,
  age_years      integer,
  minor          boolean
)
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
  select pr.birth_year into v_birth from public.profiles pr where pr.id = v_uid;
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

  -- 3. The EXISTING meter, called — its atomic guarded UPDATE is the one that takes the credits. An unknown
  --    action still raises 22023 from inside it.
  select s.allowed, s.credits_spent, s.remaining, s.allowance
    into v_ok, v_cost, v_left, v_allow
    from public.coach_ai_spend_credits(p_action) s;

  if not coalesce(v_ok, false) then
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

comment on function public.coach_ai_reserve(text, text) is
  'Reserve an AI action''s credits for the calling Edge Function (0268, contract §1): not_entitled / no_consent / out_of_credits, or a reservation id. Calls coach_ai_spend_credits for the charge. Also returns the server-derived age and minor flag. The id must never reach the app.';

-- ══════════════════════════════════════════════════════════════════════════════
-- 6 · coach_ai_settle — record the call once; refund when it failed
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function public.coach_ai_settle(
  p_reservation uuid,
  p_outcome text,
  p_model text,
  p_input_tokens integer,
  p_output_tokens integer,
  p_cache_read_input_tokens integer,
  p_cache_creation_input_tokens integer,
  p_latency_ms integer,
  p_refund boolean
)
returns table (settled boolean, refunded boolean, cost_usd numeric, remaining integer)
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

  insert into public.coach_ai_spend (
    athlete_id, period, action, credits, model,
    input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens,
    cost_usd, uncharged, fn, outcome, latency_ms, reservation_id
  ) values (
    v_uid, v_res.period, v_res.action, v_res.credits, v_model,
    v_in, v_out, v_read, v_write,
    v_cost, v_refund, v_res.fn, v_outcome, v_latency, v_res.id
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

comment on function public.coach_ai_settle(uuid, text, text, integer, integer, integer, integer, integer, boolean) is
  'Settle a coach_ai_reserve reservation once (0268, contract §1): writes one coach_ai_spend row priced by coach_ai_rate_cost; p_refund gives the credits back to the reservation''s period (floor 0). Only the caller''s own, unsettled, reserved in the last 30 minutes; anything else returns settled = false and writes nothing.';

-- ══════════════════════════════════════════════════════════════════════════════
-- 7 · coach_ai_record_usage — the old path, hardened (P-D7). SAME SIGNATURE.
-- ══════════════════════════════════════════════════════════════════════════════
--
-- ⛔ The LIVE source (pg_get_functiondef, 2026-11-17), edited — not retyped. Changed: the Premium AI check, the
-- priced-action check, the clamps, and the cost now from coach_ai_rate_cost. Everything else is as it was.

create or replace function public.coach_ai_record_usage(p_action text, p_credits integer, p_model text, p_input_tokens integer, p_output_tokens integer, p_cache_read_input_tokens integer, p_cache_creation_input_tokens integer, p_uncharged boolean default false)
 returns numeric
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_uid  uuid := auth.uid();
  v_cost numeric(12, 6);
  v_cfg  public.coach_ai_config%rowtype;
  -- 0268 (P-D7): the action's weight, and every count clamped.
  v_weight integer;
  v_in     integer := least(greatest(coalesce(p_input_tokens, 0), 0), 5000000);
  v_out    integer := least(greatest(coalesce(p_output_tokens, 0), 0), 5000000);
  v_read   integer := least(greatest(coalesce(p_cache_read_input_tokens, 0), 0), 5000000);
  v_write  integer := least(greatest(coalesce(p_cache_creation_input_tokens, 0), 0), 5000000);
begin
  if v_uid is null then
    raise exception 'coach_ai_record_usage: no authenticated athlete' using errcode = '28000';
  end if;

  -- 0268 (P-D7): a spend row is written only for an account with live Premium AI. Every deployed caller has just
  -- passed coach_ai_spend_credits or coach_ai_quote, which require the same thing.
  if not exists (
    select 1
      from public.athlete_entitlement e
     where e.athlete_id = v_uid
       and e.coach_ai
       and (e.coach_ai_until is null or e.coach_ai_until > now())
  ) then
    raise exception 'coach_ai_record_usage: Premium AI is not active on this account' using errcode = '42501';
  end if;

  select * into v_cfg from public.coach_ai_config where id;

  -- 0268 (P-D7): only a priced action, and never more credits than its weight.
  v_weight := (v_cfg.action_credits ->> p_action)::int;
  if v_weight is null then
    raise exception 'coach_ai_record_usage: unknown action %', p_action using errcode = '22023';
  end if;

  -- 0268 (P-D5): priced per model, not at one flat rate.
  v_cost := public.coach_ai_rate_cost(p_model, v_in, v_out, v_read, v_write);

  insert into public.coach_ai_spend (
    athlete_id, period, action, credits, model,
    input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens,
    cost_usd, uncharged
  ) values (
    v_uid, date_trunc('month', now())::date, p_action, least(greatest(coalesce(p_credits, 0), 0), v_weight), left(p_model, 100),
    v_in, v_out,
    v_read, v_write,
    v_cost, coalesce(p_uncharged, false)
  );

  return v_cost;
end;
$function$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 8 · coach_ai_record_admin_usage — the operator tools on their own ledger line (P-G10)
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function public.coach_ai_record_admin_usage(
  p_action text,
  p_model text,
  p_input_tokens integer,
  p_output_tokens integer,
  p_cache_read_input_tokens integer,
  p_cache_creation_input_tokens integer,
  p_latency_ms integer,
  p_outcome text
)
returns numeric
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_outcome text;
  v_model   text := nullif(left(coalesce(p_model, ''), 100), '');
  v_in      integer := least(greatest(coalesce(p_input_tokens, 0), 0), 5000000);
  v_out     integer := least(greatest(coalesce(p_output_tokens, 0), 0), 5000000);
  v_read    integer := least(greatest(coalesce(p_cache_read_input_tokens, 0), 0), 5000000);
  v_write   integer := least(greatest(coalesce(p_cache_creation_input_tokens, 0), 0), 5000000);
  v_latency integer := case when p_latency_ms is null then null else least(greatest(p_latency_ms, 0), 600000) end;
  v_cost    numeric(12, 6);
begin
  if v_uid is null then
    raise exception 'coach_ai_record_admin_usage: no authenticated caller' using errcode = '28000';
  end if;
  if not public.is_app_admin() then
    raise exception 'coach_ai_record_admin_usage: operators only' using errcode = '42501';
  end if;
  if p_action is null or p_action not in ('admin_bug_plain', 'admin_social_plan') then
    raise exception 'coach_ai_record_admin_usage: unknown admin action %', p_action using errcode = '22023';
  end if;

  v_outcome := case
    when p_outcome in ('ok', 'upstream_error', 'upstream_unreachable', 'timeout', 'refusal', 'truncated',
                       'not_a_program', 'unreadable', 'bad_output', 'cancelled') then p_outcome
    else 'other'
  end;

  v_cost := public.coach_ai_rate_cost(v_model, v_in, v_out, v_read, v_write);

  -- 0 credits and uncharged = false: there was no allowance to charge, and nobody's balance is touched.
  insert into public.coach_ai_spend (
    athlete_id, period, action, credits, model,
    input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens,
    cost_usd, uncharged, fn, outcome, latency_ms
  ) values (
    v_uid, date_trunc('month', now())::date, p_action, 0, v_model,
    v_in, v_out, v_read, v_write,
    v_cost, false,
    case p_action when 'admin_bug_plain' then 'bug-plain' else 'social-plan' end,
    v_outcome, v_latency
  );

  return v_cost;
end;
$$;

comment on function public.coach_ai_record_admin_usage(text, text, integer, integer, integer, integer, integer, text) is
  'Record an operator tool''s model call (0268, P-G10): admin_bug_plain or admin_social_plan, is_app_admin() only, 0 credits, priced by coach_ai_rate_cost. Never touches a balance.';

-- ══════════════════════════════════════════════════════════════════════════════
-- 9 · The /admin readers — a refunded row's credits are not spent
-- ══════════════════════════════════════════════════════════════════════════════
--
-- ⛔ Both are the LIVE source (pg_get_functiondef, 2026-11-17; last defined in 0238), edited — not retyped.
-- A row with uncharged = true AND reservation_id set was refunded (settle gave the credits back), so its credits
-- are no longer summed. A pre-0268 uncharged row has no reservation_id: its credits WERE taken (P-D2), so it still
-- counts. admin_ai_usage's per-athlete spread also leaves out the operator tools' admin_* rows. Calls, tokens and
-- cost are unchanged: a refunded call still cost real money.

create or replace function public.admin_ai_usage(p_days integer default 30, p_tz text default 'UTC'::text)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_days  int  := least(greatest(coalesce(p_days, 30), 1), 730);
  v_tz    text := coalesce(nullif(p_tz, ''), 'UTC');
  v_since timestamptz := now() - make_interval(days => v_days);
  v_prev  timestamptz := now() - make_interval(days => v_days * 2);
  v_out   jsonb;
begin
  perform public.admin_guard();

  with s as (
    -- 0268: `refunded` — settle gave this row's credits back.
    select sp.*, (sp.uncharged and sp.reservation_id is not null) as refunded
      from public.coach_ai_spend sp where sp.occurred_at >= v_since
  ),
  per as (
    -- 0268: the operator tools (admin_*) are not an athlete's AI use.
    select athlete_id, sum(cost_usd) as cost from s where left(s.action, 6) <> 'admin_' group by athlete_id
  )
  select jsonb_build_object(
    'days', v_days,
    'calls',      (select count(*) from s),
    'credits',    coalesce((select sum(credits) filter (where not s.refunded) from s), 0),
    'cost_usd',   coalesce((select round(sum(cost_usd), 4) from s), 0),
    'cost_prev',  coalesce((select round(sum(cost_usd), 4) from public.coach_ai_spend
                            where occurred_at >= v_prev and occurred_at < v_since), 0),
    'cost_all',   coalesce((select round(sum(cost_usd), 2) from public.coach_ai_spend), 0),
    'first_at',   (select min(occurred_at) from public.coach_ai_spend),
    'calls_prev', (select count(*) from public.coach_ai_spend where occurred_at >= v_prev and occurred_at < v_since),
    'athletes',   (select count(*) from per),
    'uncharged',  (select count(*) from s where uncharged),
    'tokens', jsonb_build_object(
       'input',        coalesce((select sum(input_tokens) from s), 0),
       'output',       coalesce((select sum(output_tokens) from s), 0),
       'cache_read',   coalesce((select sum(cache_read_input_tokens) from s), 0),
       'cache_write',  coalesce((select sum(cache_creation_input_tokens) from s), 0)),
    'series', coalesce((select jsonb_agg(x order by x.d) from (
                select d::date as d,
                       coalesce((select round(sum(cost_usd), 4) from s where (s.occurred_at at time zone v_tz)::date = d::date), 0) as cost,
                       (select count(*) from s where (s.occurred_at at time zone v_tz)::date = d::date) as calls
                  from generate_series((now() at time zone v_tz)::date - (v_days - 1), (now() at time zone v_tz)::date, interval '1 day') d) x), '[]'::jsonb),
    'by_action', coalesce((select jsonb_agg(x order by x.cost_usd desc) from (
                select action, count(*) as calls, coalesce(sum(credits) filter (where not s.refunded), 0) as credits,
                       round(sum(cost_usd), 4) as cost_usd, count(distinct athlete_id) as athletes
                  from s group by action) x), '[]'::jsonb),
    'by_model', coalesce((select jsonb_agg(x order by x.cost_usd desc) from (
                select coalesce(model, 'unknown') as model, count(*) as calls, round(sum(cost_usd), 4) as cost_usd
                  from s group by 1) x), '[]'::jsonb),
    -- Distribution, not a roster: how spend is spread across the athletes who used AI (AA-D2 shape).
    'per_athlete', jsonb_build_object(
       'median', coalesce((select round(percentile_cont(0.5) within group (order by cost)::numeric, 4) from per), 0),
       'p90',    coalesce((select round(percentile_cont(0.9) within group (order by cost)::numeric, 4) from per), 0),
       'max',    coalesce((select round(max(cost), 4) from per), 0)),
    'credits_per_period', (select c.credits_per_period from public.coach_ai_config c limit 1),
    'at_allowance', (select count(*) from public.coach_ai_period p
                      where p.period = (select max(period) from public.coach_ai_period) and p.spent >= p.allowance)
  ) into v_out;

  return v_out;
end;
$function$;

create or replace function public.admin_user_card(p_id uuid)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_out jsonb;
begin
  perform public.admin_guard();

  select jsonb_build_object(
    'account', jsonb_build_object(
       'id', p.id, 'name', p.name, 'handle', p.handle, 'created_at', p.created_at,
       'named', (p.name is distinct from 'Athlete')),
    'billing', jsonb_build_object(
       'tier',           public.athlete_tier(p.id),
       'premium_kind',   e.premium_kind,
       'premium_until',  e.premium_until,
       'premium_ai',     coalesce(e.coach_ai, false) and (e.coach_ai_until is null or e.coach_ai_until > now()),
       'premium_ai_until', e.coach_ai_until,
       'founder_seat',   e.founder_seat,
       'comped_tester',  coalesce(e.comped_tester, false),
       'subscriptions',  coalesce((select jsonb_agg(to_jsonb(s) order by s.updated_at desc) from (
                            select product_id, period_type, expires_at, ever_paid, updated_at,
                                   public.crm_sub_env(p.id, product_id) as environment
                              from public.store_subscriptions where athlete_id = p.id) s), '[]'::jsonb),
       'events',         coalesce((select jsonb_agg(to_jsonb(x) order by x.received_at desc) from (
                            select event_type as type, product_id as product, received_at,
                                   nullif(payload ->> 'price', '')::numeric as price,
                                   payload ->> 'environment' as environment,
                                   payload ->> 'period_type' as period_type
                              from public.store_events where athlete_id = p.id
                             order by received_at desc limit 50) x), '[]'::jsonb),
       'paid_total',     coalesce((select sum(nullif(payload ->> 'price', '')::numeric) from public.store_events
                                    where athlete_id = p.id and coalesce(payload ->> 'environment', 'PRODUCTION') = 'PRODUCTION'), 0)),
    'ai', jsonb_build_object(
       'periods', coalesce((select jsonb_agg(to_jsonb(x) order by x.period desc) from (
                     select period, spent, allowance from public.coach_ai_period
                      where athlete_id = p.id order by period desc limit 6) x), '[]'::jsonb),
       -- 0268: a refunded row's credits (uncharged, and settled through a reservation) are not counted as spent.
       'by_action', coalesce((select jsonb_agg(to_jsonb(x) order by x.cost_usd desc) from (
                     select action, count(*) as calls,
                            coalesce(sum(credits) filter (where not (uncharged and reservation_id is not null)), 0) as credits,
                            round(sum(cost_usd), 4) as cost_usd
                       from public.coach_ai_spend where athlete_id = p.id group by action) x), '[]'::jsonb),
       'cost_all', coalesce((select round(sum(cost_usd), 4) from public.coach_ai_spend where athlete_id = p.id), 0),
       'last30', (select jsonb_build_object(
                     'credits', coalesce(sum(credits) filter (where not (uncharged and reservation_id is not null)), 0),
                     'cost', coalesce(round(sum(cost_usd), 4), 0),
                     'calls', count(*))
                    from public.coach_ai_spend
                   where athlete_id = p.id and occurred_at > now() - interval '30 days'),
       'last30_by_action', coalesce((select jsonb_agg(to_jsonb(x) order by x.cost_usd desc) from (
                     select action, count(*) as calls, round(sum(cost_usd), 4) as cost_usd
                       from public.coach_ai_spend
                      where athlete_id = p.id and occurred_at > now() - interval '30 days'
                      group by action) x), '[]'::jsonb)),
    'support', jsonb_build_object(
       'feedback', coalesce((select jsonb_agg(to_jsonb(f) order by f.created_at desc) from (
                     select id, kind, body, screen, status, created_at from public.feedback
                      where user_id = p.id order by created_at desc limit 20) f), '[]'::jsonb),
       'errors', (select count(*) from public.client_errors where user_id = p.id),
       'error_bugs', (select count(distinct fingerprint) from public.client_errors where user_id = p.id)),
    'business', jsonb_build_object(
       'trainer', (select to_jsonb(t) from (select status, seat_cap, granted_at from public.trainers where user_id = p.id) t),
       'trainer_clients', (select count(*) from public.trainer_clients where trainer_id = p.id and status = 'active'),
       'contact_id', (select c.id from public.crm_contacts c where c.athlete_id = p.id order by c.created_at limit 1))
  ) into v_out
  from public.profiles p
  left join public.athlete_entitlement e on e.athlete_id = p.id
  where p.id = p_id;

  if v_out is null then
    raise exception 'athlete % not found', p_id using errcode = 'P0002';
  end if;
  return v_out;
end;
$function$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 10 · Backfill — keep the old figure once, then price every row per model (P-D5)
-- ══════════════════════════════════════════════════════════════════════════════

-- ONCE: only while no row has a legacy figure yet. A second run must not copy a post-0268 (already per-model)
-- cost into cost_usd_legacy, so the copy is skipped as soon as any row has one.
do $$
begin
  if not exists (select 1 from public.coach_ai_spend s where s.cost_usd_legacy is not null) then
    update public.coach_ai_spend s
       set cost_usd_legacy = s.cost_usd
     where s.cost_usd_legacy is null;
  end if;
end $$;

-- Every row, at the map's rates. Idempotent: the same map gives the same figure.
update public.coach_ai_spend s
   set cost_usd = public.coach_ai_rate_cost(
         s.model, s.input_tokens, s.output_tokens, s.cache_read_input_tokens, s.cache_creation_input_tokens);

-- ══════════════════════════════════════════════════════════════════════════════
-- 11 · Grants — revoked from public AND anon (Supabase grants both directly), then only what is needed
-- ══════════════════════════════════════════════════════════════════════════════

-- Called only by the SECURITY DEFINER functions above (and the backfill, as postgres).
revoke all on function public.coach_ai_rate_cost(text, integer, integer, integer, integer) from public, anon, authenticated;

-- The Edge Functions run as the caller (anon key + the athlete's JWT), so these three are authenticated-only.
revoke all on function public.coach_ai_reserve(text, text) from public, anon;
grant execute on function public.coach_ai_reserve(text, text) to authenticated;

revoke all on function public.coach_ai_settle(uuid, text, text, integer, integer, integer, integer, integer, boolean) from public, anon;
grant execute on function public.coach_ai_settle(uuid, text, text, integer, integer, integer, integer, integer, boolean) to authenticated;

revoke all on function public.coach_ai_record_admin_usage(text, text, integer, integer, integer, integer, integer, text) from public, anon;
grant execute on function public.coach_ai_record_admin_usage(text, text, integer, integer, integer, integer, integer, text) to authenticated;

-- Restated for the replaced functions: create-or-replace keeps an ACL, and this is the one they already had.
revoke all on function public.coach_ai_record_usage(text, integer, text, integer, integer, integer, integer, boolean) from public, anon;
grant execute on function public.coach_ai_record_usage(text, integer, text, integer, integer, integer, integer, boolean) to authenticated;

revoke all on function public.admin_ai_usage(integer, text) from public, anon;
grant execute on function public.admin_ai_usage(integer, text) to authenticated;

revoke all on function public.admin_user_card(uuid) from public, anon;
grant execute on function public.admin_user_card(uuid) to authenticated;

commit;
