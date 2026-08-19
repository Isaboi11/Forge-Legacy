-- Forge Legacy — 0170: referral attribution — remembering WHO sent an athlete, before there is anything to pay
--
-- ══ WHY THIS EXISTS ══
--
-- `0145` shipped the whole economic half of referrals and it has been sitting unused since: `referral_codes`
-- (a code per athlete, get-or-create), `referral_credits` (the two-sided ledger), `my_referral_code()`, and
-- `grant_referral_credit()` with MA3-D19's 12-month rolling cap enforced in SQL. What it did NOT ship is the
-- one fact the grant depends on:
--
--   `grant_referral_credit(p_referee, p_code)` takes the code AS AN ARGUMENT. Nothing in the database has
--   ever known which code a given athlete arrived through.
--
-- That is fine at the moment of a purchase only if the purchase happens in the same breath as the invite.
-- It does not. MA3-D20 grants credit on the referee's **first successful payment**, which is days or weeks
-- after they tapped a squad invite, signed up, and started training. Between those two moments the code has
-- to live somewhere, and today it lives nowhere.
--
-- ══ ⚠ WHY THIS IS A TABLE AND NOT A DEVICE-LOCAL VALUE ══
--
-- The obvious cheap answer is to keep the pending code in AsyncStorage until the athlete pays. This project
-- has already paid for that answer once, in full: `0169`'s write-up records that onboarding was collecting
-- experience and equipment into two AsyncStorage stores that survived neither a reinstall nor a second
-- device, and that Coach Holt — the one consumer that needed them — could not read either. A referral is a
-- strictly worse candidate for the same treatment, because the gap between capture and use is measured in
-- weeks rather than seconds, and the loss is somebody's money rather than a re-asked question.
--
-- The client still holds the code briefly — from "the link opened the app" to "a session exists" there is no
-- `auth.uid()` to attribute to, so a handoff is unavoidable. That window is one signup long, it is flushed
-- to this table at the first authenticated moment, and `src/lib/pending-referral.ts` says so in its header.
-- Transient handoff, not a store of record.
--
-- ══ ⚠ FIRST ATTRIBUTION WINS, AND THAT IS A RULE RATHER THAN A CONVENIENCE ══
--
-- `referee_id` is the PRIMARY KEY and the insert is `on conflict do nothing`. An athlete is attributed once,
-- to whoever actually reached them, and cannot be re-attributed afterwards.
--
-- Last-write-wins would be indefensible in both directions. It lets an athlete who is about to subscribe
-- paste a different friend's code and move the credit away from the person whose invite genuinely brought
-- them in; and it makes the reward farmable by anyone willing to ask a paying friend for a favour on the day
-- they buy. MA3-D19's cap is described in that amendment as legal exposure rather than a budget, so the
-- attribution feeding it should be the conservative reading, not the generous one.
--
-- ══ ⚠ SELF-REFERRAL IS REJECTED HERE, NOT AT PAYMENT ══
--
-- `grant_referral_credit` already declines a self-referral (0145 treats it, correctly, as "not an error worth
-- failing a payment over"). Catching it at capture as well is not redundant: it keeps a row that can never be
-- honoured out of the table entirely, so the attribution store means what it says and an operator reading it
-- is not counting rows that were always going to be discarded.
--
-- ══ ⚠ WHAT THIS MIGRATION DELIBERATELY DOES NOT DO ══
--
-- It does not grant anybody anything. `grant_referral_credit` remains ungranted to `authenticated` — 0145's
-- own comment gives the reason, that a client which could call it could credit itself — and it stays that
-- way. The grant is the payment webhook's job and arrives with the RevenueCat adapter (Launch Checklist
-- §4.2). This migration only makes the webhook's question answerable.
--
-- ⚠ OPEN AND UNSPECIFIED, RECORDED RATHER THAN INVENTED: **attribution does not expire.** MA3 §8 states no
--   window — it says "on their first successful payment" with no clock — so none is imposed here. If an
--   attribution window is ever wanted it is a product decision (MA3 amendment), not a schema tidy-up, and it
--   belongs as a check inside the webhook where it can be changed without a migration.

-- ── 1. THE ATTRIBUTION ───────────────────────────────────────────────────────────────────────────────

create table if not exists public.referral_attribution (
  referee_id  uuid primary key references auth.users (id) on delete cascade,
  -- The code exactly as `grant_referral_credit` will be handed it. Stored rather than only `referrer_id`
  -- because the grant re-resolves the code itself, and handing the webhook a code it then re-resolves keeps
  -- one resolution path instead of two that can disagree.
  code        text not null check (code = upper(btrim(code)) and char_length(code) between 4 and 16),
  -- Resolved at capture for validation and for reading the table without a join. NOT the grant's input.
  referrer_id uuid not null references auth.users (id) on delete cascade,
  -- MA3-D21 is a claim about WHICH channel works: "attach it to squad and challenge invites, not just a
  -- generic code … a generic code that lives in Settings is one nobody opens." That claim is testable only
  -- if the channel is recorded, and `src/domain/analytics/invite-funnel.ts` already keeps the enum for the
  -- same reason.
  source      text not null check (source in ('squad', 'challenge', 'code')),
  captured_at timestamptz not null default now(),
  constraint referral_attribution_not_self check (referrer_id <> referee_id)
);

create index if not exists referral_attribution_referrer_idx
  on public.referral_attribution (referrer_id, captured_at desc);

alter table public.referral_attribution enable row level security;

-- An athlete may read their own attribution — the invite surface says "invited by" and that is the read.
-- There is deliberately NO insert/update/delete policy: writes go through the definer function below, which
-- is what enforces first-wins and the self-check. A client that could insert directly could attribute itself
-- to anyone at any time, which is precisely the rule this migration exists to hold.
drop policy if exists referral_attribution_own_select on public.referral_attribution;
create policy referral_attribution_own_select on public.referral_attribution
  for select using (referee_id = auth.uid());

-- The referrer is NOT given a select policy. "Who did I bring in" is a real question, but it names other
-- athletes and their signup timing, and the Performance Firewall's habit in this codebase is to answer that
-- kind of question with a count rather than a roster. The count comes from `referral_credits` at grant time.

-- ── 2. CAPTURE ───────────────────────────────────────────────────────────────────────────────────────

/*
 * Record who sent this athlete. Idempotent, first-wins, and honest about which of those two happened.
 *
 * Returns:
 *   'recorded'   — this call created the attribution
 *   'already'    — an attribution already existed (this one was correctly ignored)
 *   'unknown'    — the code matches no athlete
 *   'self'       — the caller's own code
 *
 * ⚠ A TEXT VERDICT RATHER THAN A BOOLEAN, ON PURPOSE. The caller has to tell the difference between "you
 * were already invited by someone else" and "that code is not real" — those are different sentences to show
 * a human, and a boolean collapses them into one shrug.
 */
create or replace function public.record_referral_attribution(p_code text, p_source text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_code     text := upper(btrim(coalesce(p_code, '')));
  v_referrer uuid;
begin
  if v_uid is null then
    raise exception 'record_referral_attribution: no authenticated athlete' using errcode = '28000';
  end if;

  if p_source is null or p_source not in ('squad', 'challenge', 'code') then
    raise exception 'record_referral_attribution: source must be squad, challenge or code'
      using errcode = '22023';
  end if;

  if v_code = '' then
    return 'unknown';
  end if;

  -- Cheapest check first: an existing attribution ends the call whatever the code says, because first wins.
  if exists (select 1 from public.referral_attribution where referee_id = v_uid) then
    return 'already';
  end if;

  select athlete_id into v_referrer from public.referral_codes where code = v_code;

  if v_referrer is null then
    return 'unknown';
  end if;

  if v_referrer = v_uid then
    return 'self';
  end if;

  insert into public.referral_attribution (referee_id, code, referrer_id, source)
       values (v_uid, v_code, v_referrer, p_source)
  on conflict (referee_id) do nothing;

  -- The conflict path is reachable: two devices flushing the same held code at once. It is not an error —
  -- the outcome is exactly what was wanted — but it is 'already', not 'recorded', because nothing was written.
  if not found then
    return 'already';
  end if;

  return 'recorded';
end;
$$;

revoke all on function public.record_referral_attribution(text, text) from public;
grant execute on function public.record_referral_attribution(text, text) to authenticated;

/*
 * The caller's own attribution, or null.
 *
 * Two readers. The invite surface uses it to avoid asking a question that is already answered — an athlete
 * who arrived through a squad invite should not be shown an empty "got a code?" field. The payment webhook
 * uses it to find the code to hand `grant_referral_credit`, which is the whole reason the table exists.
 */
create or replace function public.my_referral_attribution()
returns table (code text, source text, captured_at timestamptz)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select a.code, a.source, a.captured_at
    from public.referral_attribution a
   where a.referee_id = auth.uid();
$$;

revoke all on function public.my_referral_attribution() from public;
grant execute on function public.my_referral_attribution() to authenticated;

-- ── 3. ⛔ THE HOLE THIS MIGRATION'S OWN SELF-CHECK FOUND ──────────────────────────────────────────────
--
-- ══ WHAT HAPPENED ══
--
-- The self-check below was written to assert something believed already true — that `grant_referral_credit`
-- is not client-callable. It failed on the first run against the live database, and it was right.
--
--   · `0145` ended each internal function with `revoke all on function … from public` and, for the five
--     it considered internal, deliberately no `grant … to authenticated`. `claim_founder_seat` says so in
--     a comment on the very next line: *"Not granted to `authenticated`. Deliberately: seats are claimed
--     server-side after a confirmed payment."*
--   · `0147` §1 then ran `grant execute on all functions in schema public to authenticated` — correctly,
--     and for a good reason its header explains at length (some functions reached `authenticated` only
--     through the PUBLIC grant it was about to revoke, so the explicit grant had to come first).
--   · `0147` §3 took twelve functions back off `authenticated`. **These five were not on that list.**
--
-- So a blanket grant silently reversed five targeted revokes, two migrations later, and nothing failed.
-- `0147`'s own §4 assertion could not catch it: it counts what `anon` can reach, and this is `authenticated`.
--
-- ══ ⚠ WHY THIS IS NOT A TIDY-UP ══
--
-- `claim_founder_seat(p_athlete uuid)` is SECURITY DEFINER, takes the athlete as an ARGUMENT, and never
-- consults `auth.uid()`. It writes `tier='PREMIUM', premium_kind='FOUNDER', founder_seat=N` into
-- `athlete_entitlement`. Any signed-in athlete can therefore award themselves — or anyone else — a lifetime
-- Founder entitlement, the $149 SKU, for nothing, and can burn all 100 seats doing it.
--
-- It is invisible today only because `default_tier = 'PREMIUM'` makes everyone Premium anyway. It stops
-- being invisible at Phase F, and an `athlete_entitlement` row written now SURVIVES that flip — so this is
-- a hole that pays out precisely when money starts moving.
--
-- `grant_referral_credit` is the same shape: credit without a payment, against MA3-D20.
-- `athlete_tier`, `athlete_caps` and `athlete_live_counts` all take an arbitrary uuid and answer questions
-- about a stranger's subscription and usage.
--
-- ══ ⚠ SAFE TO REVOKE — CHECKED THE WAY 0150 SAYS TO, NOT THE WAY 0147 DID ══
--
-- `0147` §3's own header records the rule it learned the hard way: *"Before adding anything to this list:
-- check the security mode of its CALLERS, not its own."* Revoking `evaluate_honors` broke Finish Workout
-- for every athlete because its callers were `security invoker`. Checked here, function by function:
--
--   · `src/` RPC call sites: **zero for all five** (`grep -rn "rpc('<name>'" src`).
--   · `athlete_caps`   ← `my_entitlement`, `consume_holt_allowance`, `programs_cap_guard`,
--                          `week_templates_cap_guard` — ALL security definer.
--   · `athlete_tier`   ← `my_tier`, `athlete_caps`, `my_entitlement` — ALL security definer.
--   · `athlete_live_counts` ← `my_entitlement` — security definer.
--   · `claim_founder_seat`, `grant_referral_credit` ← no callers at all; the purchase webhook that will
--     call them does not exist yet (Launch Checklist §4.2).
--
-- Every caller being a definer means the permission check runs against that function's owner, not the
-- athlete, so none of these paths can notice the revoke.

do $$
declare
  f text;
  fns text[] := array[
    'public.claim_founder_seat(uuid)',
    'public.grant_referral_credit(uuid, text)',
    'public.athlete_tier(uuid)',
    'public.athlete_caps(uuid)',
    'public.athlete_live_counts(uuid)'
  ];
begin
  foreach f in array fns loop
    -- Tolerating an absent signature rather than aborting, exactly as 0147 §3 does: a re-typed function
    -- should show up as a warning and in the assertion below, not take the whole migration down.
    begin
      execute format('revoke execute on function %s from anon, authenticated', f);
    exception when undefined_function then
      raise warning '0170: no such function, skipped — %', f;
    end;
  end loop;
end;
$$;

-- ── 4. SELF-CHECK ────────────────────────────────────────────────────────────────────────────────────

do $$
declare
  v_policies int;
  v_fn       text;
begin
  if to_regclass('public.referral_attribution') is null then
    raise exception '0170 self-check: referral_attribution was not created';
  end if;

  if to_regclass('public.referral_codes') is null then
    raise exception '0170 self-check: referral_codes is absent — 0145 has not been applied, and this migration is meaningless without it';
  end if;

  if not exists (
    select 1 from pg_class where relname = 'referral_attribution' and relrowsecurity
  ) then
    raise exception '0170 self-check: RLS is not enabled on referral_attribution';
  end if;

  select count(*) into v_policies
    from pg_policies where schemaname = 'public' and tablename = 'referral_attribution';
  if v_policies <> 1 then
    raise exception '0170 self-check: referral_attribution should carry exactly one policy (own select), found %', v_policies;
  end if;

  if to_regprocedure('public.record_referral_attribution(text, text)') is null then
    raise exception '0170 self-check: record_referral_attribution was not created';
  end if;

  if to_regprocedure('public.my_referral_attribution()') is null then
    raise exception '0170 self-check: my_referral_attribution was not created';
  end if;

  /*
   * ⚠ THE ASSERTION THAT FOUND THE HOLE IN §3, NOW COVERING ALL FIVE.
   *
   * Written as a check on something believed already true, which is the only reason anyone looked. Keep it
   * broad rather than narrowing it back to referrals: the failure mode was never one function, it was a
   * blanket grant reaching functions whose targeted revoke nobody re-checked. Another blanket grant will
   * do it again, and this is what will say so.
   */
  for v_fn in
    select unnest(array[
      'claim_founder_seat', 'grant_referral_credit', 'athlete_tier', 'athlete_caps', 'athlete_live_counts'
    ])
  loop
    if exists (
      select 1
        from information_schema.role_routine_grants
       where routine_schema = 'public'
         and routine_name = v_fn
         and grantee in ('authenticated', 'anon', 'PUBLIC')
    ) then
      raise exception '0170 self-check: %() is executable by a client role — 0145 withheld that grant on purpose and §3 should have taken it back', v_fn;
    end if;
  end loop;

  raise notice '0170 OK: referral_attribution, RLS, capture and read are present, and all five internal functions are server-side only.';
end;
$$;

-- ══ VERIFY BY HAND ═══════════════════════════════════════════════════════════════════════════════════
--
-- ⛔ EVERY LINE BELOW NEEDS A REAL JWT AND MUST BE RUN FROM THE APP, NOT THE SQL EDITOR. The editor runs as
--    `postgres` with no auth context, so `auth.uid()` is null and each of these raises 28000 "no
--    authenticated athlete" — 0145's header says so and this file learned it the hard way, by putting
--    `my_referral_code()` in a paste bundle and rolling the whole migration back on the last statement.
--
--   Your own code:        select public.my_referral_code();
--   Capture (as another athlete, using the code above):
--                         select public.record_referral_attribution('ABCD2345', 'squad');   -- 'recorded'
--                         select public.record_referral_attribution('ABCD2345', 'squad');   -- 'already'
--                         select public.record_referral_attribution('NOTACODE', 'code');    -- 'unknown' … but
--     ⚠ only on an athlete with no attribution yet: 'already' is returned BEFORE the code is looked at, which
--     is the first-wins rule doing its job and not a bug in the verdict.
--   Own code back:        select public.record_referral_attribution(public.my_referral_code(), 'code'); -- 'self'
--   Read it back:         select * from public.my_referral_attribution();
--
--   ⛔ NOT verifiable here: the credit itself. `grant_referral_credit` is webhook-only by design and stays
--      that way until Launch Checklist §4.2 ships the adapter — see that function's header in 0145.
