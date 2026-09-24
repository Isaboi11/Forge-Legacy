-- Forge Legacy — 0214: App Store subscriptions reach the database (RevenueCat webhook), Early Bird seats,
-- and the server deciding which offer each athlete sees
--
-- ══ WHY ══
--
-- Monetization Amendment 007 (LOCKED 2026-09-23) and the RevenueCat project set up 2026-09-24. Until now
-- nothing could make an athlete Premium except a hand-written row: `athlete_entitlement` has had "writes
-- happen … eventually from the RevenueCat webhook" in its comment since 0145. This is that write path.
--
-- ══ WHAT THIS DOES ══
--
--   1. `store_subscriptions` — one row per (athlete, App Store product): its expiry, whether it was ever
--      paid for, and the timestamp of the newest event applied to it. RLS on, NO policies: only the
--      definer functions below read or write it.
--   2. `store_events` — every webhook delivery, keyed by RevenueCat's event id. A retried delivery is the
--      same event and is applied once. Also the audit trail when a purchase "didn't work".
--   3. `athlete_entitlement.comped_tester` — the 14 comped testers (MA7-D6/D7). ⚠ NOT `premium_kind =
--      'GRANT'`: GRANT also covers the App Review accounts and the PO, and the Tester AI add-on must be
--      offered to the 14 and nobody else (MA7-D7: "if it cannot be restricted mechanically, it must not
--      be offered"). Set by hand — `supabase/apply/set-comped-testers-0214.sql`.
--   4. `apply_store_event(event)` — called ONLY by the `revenuecat-webhook` Edge Function (service role).
--   5. `recompute_store_entitlement(athlete)` — derives `athlete_entitlement` from the store rows.
--   6. Early Bird seats: `claim_early_bird_seat` / `release_early_bird_seat`. A trial holds a seat; a
--      trial that ends without ever being paid gives it back (MA7-D5). Sandbox (TestFlight, App Review)
--      purchases still grant access, but never touch a seat.
--   7. `my_paywall_offer()` — which RevenueCat offering the caller sees. The client never decides.
--   8. `set_my_premium_ai` is now admins-only. It was a self-serve switch for the testing phase (0203);
--      with Premium AI on sale, any account flipping itself on would be free Premium AI.
--
-- ══ ⚠ PRODUCT IDS ARE NAMED HERE, AND THAT IS CORRECT ══
--
-- `src/` may never contain a product id (they carry prices; `plans-core.test.mjs` fails the build).
-- The server is where products are mapped to entitlements, and it maps them from the id ITSELF rather
-- than from RevenueCat's `entitlement_ids`: Amendment 007 is the source of truth, and a product attached
-- to the wrong entitlement in the dashboard must not quietly grant the wrong thing.
--
--   earlybird_premium_ai_* · premium_ai_*  → premium + coach_ai   (MA6-D3)
--   earlybird_premium_*    · premium_*     → premium
--   testerai_*                             → coach_ai only        (MA7-D7)
--
-- ══ ⚠ A STORE ROW NEVER WRITES A NULL EXPIRY ══
--
-- In `athlete_entitlement`, a null `premium_until` / `coach_ai_until` means FOREVER (lifetime, grants).
-- A subscription always has an end. Writing null from a malformed event would hand out perpetual Premium,
-- so every store-derived expiry is `coalesce(…, now())` — a malformed event ends access rather than
-- granting it forever.
--
-- ══ ⚠ A GRANT'S PREMIUM IS NEVER TOUCHED ══
--
-- The comped testers, App Review and the PO hold `premium_kind = 'GRANT'`. A store event may switch their
-- `coach_ai` (the Tester AI add-on is exactly that), but never their tier, kind or expiry — otherwise a
-- tester's add-on lapsing would end the free Premium MA7-D6 says they keep forever.
--
-- Depends on 0129 (app_admins), 0145 (athlete_entitlement, founder_seats_remaining), 0203. Idempotent.

begin;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 1–3. TABLES AND THE COMPED FLAG
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.store_subscriptions (
  athlete_id    uuid not null references public.profiles (id) on delete cascade,
  product_id    text not null,
  -- 'TRIAL' | 'INTRO' | 'NORMAL' | … as RevenueCat reports it on the newest applied event.
  period_type   text,
  expires_at    timestamptz,
  -- MA7-D5. Once any event reports a paid period, the Early Bird seat is kept for good.
  ever_paid     boolean not null default false,
  -- Events can arrive out of order; an older one never overwrites a newer one's state.
  last_event_ms bigint  not null default 0,
  updated_at    timestamptz not null default now(),
  primary key (athlete_id, product_id)
);

alter table public.store_subscriptions enable row level security;

create table if not exists public.store_events (
  event_id    text primary key,
  event_type  text not null,
  app_user_id text,
  athlete_id  uuid,
  product_id  text,
  outcome     text,
  received_at timestamptz not null default now(),
  payload     jsonb not null
);

alter table public.store_events enable row level security;

create index if not exists store_events_athlete_idx on public.store_events (athlete_id, received_at desc);

comment on table public.store_subscriptions is
  'App Store subscriptions per athlete and product (0214). Written ONLY by apply_store_event() from the revenuecat-webhook Edge Function. RLS on, no policies.';
comment on table public.store_events is
  'Every RevenueCat webhook delivery (0214), keyed by event id so a retry applies once. The audit trail when a purchase did not land. RLS on, no policies.';

alter table public.athlete_entitlement add column if not exists comped_tester boolean not null default false;

comment on column public.athlete_entitlement.comped_tester is
  'MA7-D6/D7 (0214): one of the 14 comped testers. Free Premium forever, and the ONLY accounts offered the Tester AI add-on. Set by hand; never by the app.';

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 4–6. THE WRITE PATH
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

/*
 * Which athlete an event belongs to. RevenueCat's app user id is the Supabase user id (the app calls
 * `logIn(uid)` before any purchase), but a purchase can predate the logIn and ride in on an alias — so
 * every candidate id is tried and the first that is a real profile wins. Anonymous ids never match.
 */
create or replace function public.store_athlete_for(p_ids text[])
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id
    from unnest(coalesce(p_ids, '{}'::text[])) with ordinality as c(id, ord)
    join public.profiles p
      on c.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     and p.id = c.id::uuid
   order by c.ord
   limit 1;
$$;

/* What a product grants, from its id. See the header for why the id and not the dashboard. */
create or replace function public.store_product_grants(p_product text)
returns text[]
language sql
immutable
as $$
  select case
    when p_product ~ '^(earlybird_)?premium_ai_' then array['premium', 'coach_ai']
    when p_product ~ '^(earlybird_)?premium_'    then array['premium']
    when p_product ~ '^testerai_'                then array['coach_ai']
    else '{}'::text[]
  end;
$$;

/*
 * Derive the athlete's entitlement from their store rows.
 *
 * Premium: the newest-expiring Premium-granting row sets tier, kind and expiry — unless the athlete holds
 * a GRANT, which store events never touch. `athlete_tier()` already reads an expiry in the past as FREE,
 * so lapsing needs no separate write.
 * Coach AI: the newest-expiring AI-granting row sets `coach_ai_until`.
 */
create or replace function public.recompute_store_entitlement(p_athlete uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_prem_until   timestamptz;
  v_prem_product text;
  v_ai_until     timestamptz;
  v_ai_rows      boolean;
  v_grant        boolean;
begin
  select s.expires_at, s.product_id
    into v_prem_until, v_prem_product
    from public.store_subscriptions s
   where s.athlete_id = p_athlete
     and 'premium' = any (public.store_product_grants(s.product_id))
   order by s.expires_at desc nulls last
   limit 1;

  select max(s.expires_at), count(*) > 0
    into v_ai_until, v_ai_rows
    from public.store_subscriptions s
   where s.athlete_id = p_athlete
     and 'coach_ai' = any (public.store_product_grants(s.product_id));

  select coalesce(e.premium_kind = 'GRANT', false)
    into v_grant
    from public.athlete_entitlement e
   where e.athlete_id = p_athlete;

  if v_prem_product is not null and not coalesce(v_grant, false) then
    insert into public.athlete_entitlement as e (athlete_id, tier, premium_kind, premium_until, grant_note)
    values (p_athlete, 'PREMIUM',
            case when v_prem_product like '%\_annual\_%' then 'ANNUAL' else 'MONTHLY' end,
            coalesce(v_prem_until, now()),
            'App Store subscription (0214)')
    on conflict (athlete_id) do update
      set tier = 'PREMIUM',
          premium_kind = excluded.premium_kind,
          premium_until = excluded.premium_until,
          updated_at = now();
  end if;

  if v_ai_rows then
    insert into public.athlete_entitlement as e (athlete_id, tier, coach_ai, coach_ai_until, grant_note)
    select p_athlete, c.default_tier, true, coalesce(v_ai_until, now()), 'App Store subscription (0214)'
      from public.entitlement_config c
     where c.id
    on conflict (athlete_id) do update
      set coach_ai = true,
          coach_ai_until = excluded.coach_ai_until,
          updated_at = now();
  end if;
end;
$$;

/*
 * Take the lowest free Early Bird seat. Idempotent: an athlete who holds one keeps it.
 *
 * ⚠ LOWEST FREE, NOT max + 1. Seats come back when a trial ends unpaid (MA7-D5), so after seat 57 is
 * released "max + 1" would be 101 while one seat is genuinely free — and the old `claim_founder_seat()`
 * (0145) would have raised on it. It is lifetime-shaped (null expiry, kind FOUNDER) and is left unused.
 *
 * ⚠ SERIALISED. Two purchases at seat 100 must not both get it; the advisory lock makes the second wait
 * and see the first's seat. Returns null when none is left — the caller records it; the athlete keeps what
 * they paid for.
 */
create or replace function public.claim_early_bird_seat(p_athlete uuid)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_seat  int;
  v_total int;
begin
  perform pg_advisory_xact_lock(hashtext('forge_early_bird_seats'));

  select e.founder_seat into v_seat from public.athlete_entitlement e where e.athlete_id = p_athlete;
  if v_seat is not null then
    return v_seat;
  end if;

  select c.founder_seats_total into v_total from public.entitlement_config c where c.id;

  select min(n) into v_seat
    from generate_series(1, v_total) as n
   where not exists (select 1 from public.athlete_entitlement e where e.founder_seat = n);

  if v_seat is null then
    return null;
  end if;

  update public.athlete_entitlement e
     set founder_seat = v_seat, updated_at = now()
   where e.athlete_id = p_athlete;

  return case when found then v_seat else null end;
end;
$$;

create or replace function public.release_early_bird_seat(p_athlete uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.athlete_entitlement e
     set founder_seat = null, updated_at = now()
   where e.athlete_id = p_athlete
     and e.founder_seat is not null
     and e.premium_kind is distinct from 'FOUNDER';
$$;

/*
 * Apply one RevenueCat webhook event. Returns what happened, which is also stored on the event row.
 *
 * Every event that names a product carries that product's current expiry (`expiration_at_ms`), including
 * cancellations, refunds and expirations — so one rule covers them all: upsert the product's row with
 * the newest expiry, then recompute. Cancelling auto-renew leaves the expiry in the future, and access
 * runs to it, which is what Apple promises.
 */
create or replace function public.apply_store_event(p_event jsonb)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id       text   := p_event ->> 'id';
  v_type     text   := coalesce(p_event ->> 'type', '');
  v_product  text   := p_event ->> 'product_id';
  v_period   text   := p_event ->> 'period_type';
  v_ms       bigint := coalesce(nullif(p_event ->> 'event_timestamp_ms', '')::bigint, 0);
  v_exp      timestamptz;
  v_paid     boolean;
  v_ids      text[];
  v_athlete  uuid;
  v_from     uuid;
  v_to       uuid;
  v_seat     int;
  v_outcome  text;
begin
  if v_id is null then
    raise exception 'apply_store_event: event has no id' using errcode = '22023';
  end if;

  insert into public.store_events (event_id, event_type, app_user_id, product_id, payload)
  values (v_id, v_type, p_event ->> 'app_user_id', v_product, p_event)
  on conflict (event_id) do nothing;

  if not found then
    return 'duplicate';
  end if;

  if nullif(p_event ->> 'expiration_at_ms', '') is not null then
    v_exp := to_timestamp((p_event ->> 'expiration_at_ms')::bigint / 1000.0);
  end if;
  v_paid := coalesce(v_period in ('NORMAL', 'INTRO', 'PREPAID'), false);

  -- ── TRANSFER: a restore on another account moved the purchases. Move our rows with them. ──
  if v_type = 'TRANSFER' then
    v_from := public.store_athlete_for(array(select jsonb_array_elements_text(
                case when jsonb_typeof(p_event -> 'transferred_from') = 'array' then p_event -> 'transferred_from' else '[]'::jsonb end)));
    v_to   := public.store_athlete_for(array(select jsonb_array_elements_text(
                case when jsonb_typeof(p_event -> 'transferred_to') = 'array' then p_event -> 'transferred_to' else '[]'::jsonb end)));

    if v_from is null or v_to is null or v_from = v_to then
      v_outcome := 'transfer_skipped';
    else
      insert into public.store_subscriptions as s
             (athlete_id, product_id, period_type, expires_at, ever_paid, last_event_ms, updated_at)
      select v_to, f.product_id, f.period_type, f.expires_at, f.ever_paid, f.last_event_ms, now()
        from public.store_subscriptions f
       where f.athlete_id = v_from
      on conflict (athlete_id, product_id) do update
        set expires_at = greatest(s.expires_at, excluded.expires_at),
            ever_paid = s.ever_paid or excluded.ever_paid,
            last_event_ms = greatest(s.last_event_ms, excluded.last_event_ms),
            updated_at = now();

      -- The old account's store-derived access ends now: its rows are gone, so expire what they granted.
      update public.athlete_entitlement e
         set premium_until = case when e.premium_kind in ('MONTHLY', 'ANNUAL') then now() else e.premium_until end,
             coach_ai_until = case when e.coach_ai and e.coach_ai_until is not null then now() else e.coach_ai_until end,
             updated_at = now()
       where e.athlete_id = v_from;
      delete from public.store_subscriptions f where f.athlete_id = v_from;

      perform public.recompute_store_entitlement(v_to);
      v_outcome := 'transferred';
    end if;

    update public.store_events set athlete_id = v_to, outcome = v_outcome where event_id = v_id;
    return v_outcome;
  end if;

  if v_product is null or v_type = 'TEST' or cardinality(public.store_product_grants(v_product)) = 0 then
    update public.store_events set outcome = 'ignored' where event_id = v_id;
    return 'ignored';
  end if;

  v_ids := array[p_event ->> 'app_user_id', p_event ->> 'original_app_user_id']
           || array(select jsonb_array_elements_text(
                case when jsonb_typeof(p_event -> 'aliases') = 'array' then p_event -> 'aliases' else '[]'::jsonb end));
  v_athlete := public.store_athlete_for(v_ids);

  if v_athlete is null then
    -- Bought under an id that is not an athlete. Recorded, not raised: a raise makes RevenueCat retry an
    -- event that can never succeed. `store_events` is where to look.
    update public.store_events set outcome = 'no_athlete' where event_id = v_id;
    return 'no_athlete';
  end if;

  insert into public.store_subscriptions as s
         (athlete_id, product_id, period_type, expires_at, ever_paid, last_event_ms, updated_at)
  values (v_athlete, v_product, v_period, v_exp, v_paid, v_ms, now())
  on conflict (athlete_id, product_id) do update
    set period_type   = case when excluded.last_event_ms >= s.last_event_ms then excluded.period_type else s.period_type end,
        expires_at    = case when excluded.last_event_ms >= s.last_event_ms and excluded.expires_at is not null
                             then excluded.expires_at else s.expires_at end,
        ever_paid     = s.ever_paid or excluded.ever_paid,
        last_event_ms = greatest(s.last_event_ms, excluded.last_event_ms),
        updated_at    = now();

  perform public.recompute_store_entitlement(v_athlete);
  v_outcome := 'applied';

  -- ── Early Bird seats (MA7-D3, MA7-D5) ──
  -- ⚠ PRODUCTION PURCHASES ONLY, AND NEVER A GRANT. RevenueCat sends TestFlight and App Review sandbox
  -- purchases to this same webhook; they still apply (App Review must see a purchase work), but a free
  -- sandbox purchase must not take one of the 100 real seats. Nor may the PO testing from their own
  -- (GRANT) account.
  if v_product like 'earlybird\_%'
     and coalesce(p_event ->> 'environment', 'PRODUCTION') = 'PRODUCTION'
     and not exists (select 1 from public.athlete_entitlement e
                      where e.athlete_id = v_athlete and e.premium_kind = 'GRANT') then
    if exists (select 1 from public.store_subscriptions s
                where s.athlete_id = v_athlete and s.product_id like 'earlybird\_%' and s.expires_at > now()) then
      v_seat := public.claim_early_bird_seat(v_athlete);
      if v_seat is null then
        v_outcome := 'applied_no_seat_left';
      end if;
    elsif not exists (select 1 from public.store_subscriptions s
                       where s.athlete_id = v_athlete and s.product_id like 'earlybird\_%' and s.ever_paid) then
      -- Every Early Bird row has ended and none was ever paid: a trial that never converted. The seat
      -- goes back. A payer who lapses keeps theirs — they were one of the 100.
      perform public.release_early_bird_seat(v_athlete);
      v_outcome := 'applied_seat_released';
    end if;
  end if;

  if v_product like 'testerai\_%'
     and not exists (select 1 from public.athlete_entitlement e where e.athlete_id = v_athlete and e.comped_tester) then
    -- Should be impossible (the offer is server-gated). They paid, so they get what they paid for; the
    -- outcome flags it for a look.
    v_outcome := v_outcome || '_tester_ai_not_comped';
  end if;

  update public.store_events set athlete_id = v_athlete, outcome = v_outcome where event_id = v_id;
  return v_outcome;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 7. WHICH OFFER THE CALLER SEES
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

/*
 * `{ offering: 'default' | 'early_bird' | 'tester_ai' | null, seatsRemaining: int }`
 *
 * ⚠ NEVER A SECOND GROUP (Amendment 007). Apple lets a subscriber switch freely inside their group and
 * does NOT stop them holding a second subscription in another group. So:
 *   · a live store subscription → their OWN group only (a Premium member may move up to Premium AI
 *     there); a Tester AI subscriber → nothing
 *   · a comped tester → `tester_ai` until they hold AI, then nothing (MA7-D7)
 *   · any other grant (App Review, …) → nothing. ⚠ Admins are the exception, so the PO can test a
 *     sandbox purchase from their own account.
 *   · everyone else → `early_bird` while seats remain and they have not already been a paying Early Bird
 *     (a lapsed payer returns at the regular price, MA7-D3), else `default`.
 */
create or replace function public.my_paywall_offer()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_e       public.athlete_entitlement%rowtype;
  v_seats   int;
  v_active  text;
  v_admin   boolean;
  v_offer   text;
begin
  if v_uid is null then
    raise exception 'my_paywall_offer: no authenticated athlete' using errcode = '28000';
  end if;

  v_seats := public.founder_seats_remaining();
  select * into v_e from public.athlete_entitlement e where e.athlete_id = v_uid;
  v_admin := exists (select 1 from public.app_admins a where a.user_id = v_uid);

  select s.product_id into v_active
    from public.store_subscriptions s
   where s.athlete_id = v_uid and s.expires_at > now()
   order by s.expires_at desc
   limit 1;

  if v_active is not null then
    v_offer := case when v_active like 'earlybird\_%' then 'early_bird'
                    when v_active like 'premium\_%'   then 'default'
                    else null end;
  elsif coalesce(v_e.comped_tester, false) then
    v_offer := case when coalesce(v_e.coach_ai, false)
                         and (v_e.coach_ai_until is null or v_e.coach_ai_until > now())
                    then null else 'tester_ai' end;
  elsif v_e.premium_kind = 'GRANT' and not v_admin then
    v_offer := null;
  elsif v_seats > 0
        and not exists (select 1 from public.store_subscriptions s
                         where s.athlete_id = v_uid and s.product_id like 'earlybird\_%' and s.ever_paid) then
    v_offer := 'early_bird';
  else
    v_offer := 'default';
  end if;

  return jsonb_build_object('offering', v_offer, 'seatsRemaining', v_seats);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 8. PREMIUM AI IS A PURCHASE NOW — the self-serve switch becomes admins-only
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

-- 0203's body, copied, with the one block marked 0214 added. Nothing else differs.
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

  -- 0214 — admins only. With Premium AI on sale, an account that could switch itself on would have it free.
  if not exists (select 1 from public.app_admins a where a.user_id = v_uid) then
    raise exception 'set_my_premium_ai: Premium AI is a purchase now (0214)' using errcode = '42501';
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

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- GRANTS — Supabase grants `anon` and `authenticated` directly on new functions, so `from public` alone
-- is not enough (the 0147 lesson).
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

revoke all on function public.store_athlete_for(text[])              from public, anon, authenticated;
revoke all on function public.store_product_grants(text)             from public, anon, authenticated;
revoke all on function public.recompute_store_entitlement(uuid)      from public, anon, authenticated;
revoke all on function public.claim_early_bird_seat(uuid)            from public, anon, authenticated;
revoke all on function public.release_early_bird_seat(uuid)          from public, anon, authenticated;
revoke all on function public.apply_store_event(jsonb)               from public, anon, authenticated;
grant execute on function public.apply_store_event(jsonb)            to service_role;

revoke all on function public.my_paywall_offer()                     from public, anon;
grant execute on function public.my_paywall_offer()                  to authenticated;

revoke all on function public.set_my_premium_ai(boolean)             from public;
revoke execute on function public.set_my_premium_ai(boolean)         from anon;
grant execute on function public.set_my_premium_ai(boolean)          to authenticated;

commit;
