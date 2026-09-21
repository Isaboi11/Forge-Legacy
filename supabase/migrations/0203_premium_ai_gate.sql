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
