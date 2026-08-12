-- ══ PASTE THIS WHOLE FILE INTO THE SUPABASE SQL EDITOR ══
--
-- Verbatim copy of `supabase/migrations/0145_entitlement.sql`. Idempotent — safe to re-run.
--
-- ⚠ AFTER RUNNING, CONFIRM NOTHING CHANGED. That is Phase B's entire test:
--
--     select default_tier from public.entitlement_config;   -- must read 'PREMIUM'
--
--   If it reads 'FREE', monetization has switched on early and every athlete is capped.
--
-- ⚠ DO NOT VERIFY WITH `my_entitlement()` HERE. The SQL editor runs as `postgres` with no auth context,
--   so `auth.uid()` is NULL and every `my_*` function raises 28000. That is the guard working. The
--   session-free checks are in this file's footer.
--

-- Forge Legacy — 0145: entitlement, the caps, and the counters underneath them
--
-- ══ WHAT THIS IS ══
--
-- The signal that answers "is this athlete entitled?", the server-side configuration that answers "to how
-- much?", and the counters that answer "how much have they used?". Phase B of the Launch Checklist.
--
-- ⚠ NOTHING GATES YET, AND THAT IS THE POINT. `entitlement_config.default_tier` ships as **'PREMIUM'**,
-- so every athlete — existing and new — resolves to entitled and no behaviour changes anywhere. The gates
-- below are real and they are enforced; they simply never fire while everyone is on the paid side of them.
-- Phase F flips one word in one row and the whole thing goes live.
--
--   update public.entitlement_config set default_tier = 'FREE';   -- Phase F, and nothing else
--
-- ══ ⚠ EVERY NUMBER IS CONFIGURATION, NOT A CONSTANT ══
--
-- MA3-D16, and board review finding 07: *"every cap number is a guess, so make guessing cheap."* The plan
-- then requires the 20 testers to run UNCAPPED for 60–90 days before the real numbers are set, which is
-- only possible if the numbers are a row somebody can edit. Nothing in `src/` may hardcode 75, or 3, or 1.
--
-- Same reasoning as `coach_ai_config` in 0144, and deliberately the same shape.
--
-- ══ ⚠ WHICH CAPS REOPEN ON DELETE, AND WHICH DO NOT ══
--
-- This is the distinction the whole design turns on, and getting it backwards makes two of the caps
-- meaningless.
--
--   · STORAGE caps reopen. Photos, video, templates, squads. A deleted photo genuinely frees the storage
--     it occupied, and an athlete who leaves a squad is genuinely in one fewer. These are LIVE COUNTS,
--     computed from the tables themselves — there is nothing to store.
--
--   · CREATION caps do NOT reopen. Programs, the free import, the lifetime Holt program. **MA3-D9**: if a
--     program slot reopened on delete, the cap would never fire for someone running one four-week block at
--     a time, deleting the last — which is the most common real behaviour in this product. A cap that
--     never fires is not a cap. These are MONOTONIC COUNTERS in `athlete_usage`, and nothing decrements
--     them.
--
-- ⚠ AND `programs` HAS NO SOFT DELETE (0013 — a plain `for delete using (athlete_id = auth.uid())`), so
-- counting live rows was never going to work for the program cap even if we wanted it to. The counter is
-- maintained by a trigger on INSERT rather than by every call site, because there are five call sites
-- today (builder, Holt, share acceptance, catalogue adopt, template promote) and there will be more.
--
-- ══ ⚠ WORKOUTS ARE NEVER TOUCHED BY ANY OF THIS ══
--
-- MA3-D11, and Amendment 001 §2 which is permanent: deleting a program deletes the plan, never the
-- history. Nothing in this migration reads, writes, gates or cascades to `workouts`. That is the seam
-- where MA3-D9 could have quietly broken Never Charge For History, so it is stated rather than assumed.
--
-- ══ ⚠ THE CLIENT IS NOT THE BOUNDARY ══
--
-- `src/lib/entitlement.ts` decides what the SCREEN draws. `programs_cap_guard()` below decides what the
-- DATABASE accepts. Same rule `admin-live.ts` states about `isAppAdmin()`: if the client were deleted and
-- the inserts issued by hand, the answer would be the same.
--
-- Idempotent. Depends on 0001 (profiles), 0013 (programs), 0029 (squads), 0044 (transformation),
-- 0085 (chapter_photos), 0091 (workout_templates). RUN AFTER 0144 — or without it; they do not touch.

begin;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 1. CONFIGURATION — every cap and allowance, editable without a release
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

-- `-1` means unlimited. A null would be ambiguous with "not configured", and a very large number would
-- read as a real limit to anyone auditing the row. `cap_allows()` below is the only place that knows.
create table if not exists public.entitlement_config (
  -- One row, ever. The check is what makes that true rather than conventional.
  id           boolean primary key default true check (id),

  -- ⚠ PHASE B SHIPS 'PREMIUM'. Phase F sets it to 'FREE'. This single value is the switch-on.
  default_tier text not null default 'PREMIUM' check (default_tier in ('FREE', 'PREMIUM')),

  -- Amendment 003 §5. Every one of these is an Initial Assumption, to be reset at p50–p60 of engaged
  -- behaviour once the 60–90 day metered run has data.
  free_caps jsonb not null default '{
    "programs": 3,
    "photos": 75,
    "videos": 5,
    "templates": 5,
    "squads": 1,
    "imports": 1,
    "holt_programs": 1,
    "holt_days_per_month": 2,
    "holt_in_workout": 0
  }'::jsonb,

  -- Abuse guards, not tier features (Amendment 001 §4A). Set so no legitimate athlete reaches one.
  -- `programs: 500` mirrors CUSTOM_LIMIT in src/domain/exercise-picker/custom-core.ts:16.
  -- `squads: 5` is a real product ceiling (MA3-D7) — nobody needs more, and it is stated to the athlete.
  paid_caps jsonb not null default '{
    "programs": 500,
    "photos": 1000,
    "videos": 100,
    "templates": -1,
    "squads": 5,
    "imports": -1,
    "holt_programs": -1,
    "holt_days_per_month": -1,
    "holt_in_workout": -1
  }'::jsonb,

  -- MA3-D22/D24. The counter must stop here; selling the 101st seat is a deceptive practice, not a
  -- rounding error.
  founder_seats_total int not null default 100 check (founder_seats_total >= 0),

  -- MA3-D19. Financial and legal — an uncapped recruitment reward resembles a chain-referral scheme.
  referral_months_per_grant   int not null default 1  check (referral_months_per_grant >= 0),
  referral_referrer_year_cap  int not null default 12 check (referral_referrer_year_cap >= 0),

  updated_at timestamptz not null default now()
);

insert into public.entitlement_config (id) values (true) on conflict (id) do nothing;

comment on table public.entitlement_config is
  'Every cap, allowance and seat count. One row. Edited by hand; never written by the app. -1 = unlimited.';
comment on column public.entitlement_config.default_tier is
  'PHASE B = PREMIUM (nothing gates). Phase F = FREE. This one value switches monetization on.';

-- Anyone signed in may READ the caps — the client has to draw "38 of 75" and M-7 has to render the
-- number in its copy. Nobody may write: no INSERT/UPDATE/DELETE policy exists, on purpose, which is how
-- "read-only to the app" is said in Postgres. Same shape as `app_admins` in 0129.
alter table public.entitlement_config enable row level security;

drop policy if exists entitlement_config_read on public.entitlement_config;
create policy entitlement_config_read on public.entitlement_config
  for select to authenticated using (true);

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 2. THE SIGNAL — one row per athlete, and the only thing that decides entitled-or-not
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.athlete_entitlement (
  athlete_id uuid primary key references public.profiles (id) on delete cascade,

  tier text not null default 'PREMIUM' check (tier in ('FREE', 'PREMIUM')),

  -- HOW they hold it, which is a different question from WHETHER. Needed because Founder carries a
  -- durable 30%-off promise (MA3-D26) and lifetime carries a different support obligation from monthly.
  --   GRANT    — the 20 OG testers, and every existing athlete during Phase B. Occupies no seat.
  --   FOUNDER  — founder_lifetime_149. Occupies a seat.
  premium_kind text check (premium_kind in ('MONTHLY', 'ANNUAL', 'LIFETIME', 'FOUNDER', 'GRANT')),

  -- Null means perpetual — lifetime, Founder, or a grant. A date means a renewing subscription, and
  -- `is_entitled()` compares it to now(). Deliberately NOT a boolean "active": a boolean has to be
  -- written by something on expiry, and nothing runs on expiry.
  premium_until timestamptz,

  -- ⚠ CONCURRENT, NOT A TIER ABOVE (MA3-D2/D3). An athlete holds Premium, or Coach AI, or both. There is
  -- no ordering. Coach AI requires Premium commercially; that is enforced at purchase, not modelled here
  -- as a hierarchy — modelling it as one is how "no tier above Premium" got violated in the first place.
  coach_ai       boolean not null default false,
  coach_ai_until timestamptz,

  -- MA3-D25: the OG testers occupy NO seat. A grant leaves this null, so all 100 paid seats remain.
  founder_seat int check (founder_seat >= 1),

  -- Why a grant exists, for the audit trail. Never shown to the athlete.
  grant_note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One athlete per seat, one seat per athlete, and no seat number twice — the claim below is atomic, and
-- this index is what makes a lost race fail loudly instead of overselling.
create unique index if not exists athlete_entitlement_founder_seat
  on public.athlete_entitlement (founder_seat) where founder_seat is not null;

alter table public.athlete_entitlement enable row level security;

drop policy if exists athlete_entitlement_own_select on public.athlete_entitlement;
create policy athlete_entitlement_own_select on public.athlete_entitlement
  for select using (athlete_id = auth.uid());

-- ⚠ NO CLIENT WRITE PATH, ON PURPOSE. A client that could update its own tier could grant itself
-- Premium, which is the entire point of the table. Writes happen through SECURITY DEFINER functions
-- (seat claim below) or by hand in the SQL editor (grants), and eventually from the RevenueCat webhook.

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 3. THE COUNTERS — only the ones that cannot be derived
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

-- Photos, videos, templates and squads are NOT here. They are live counts over their own tables, because
-- deleting a photo really does free the slot. Storing a second copy of a number the database already
-- knows is how the two drift.
create table if not exists public.athlete_usage (
  athlete_id uuid primary key references public.profiles (id) on delete cascade,

  -- MA3-D9. MONOTONIC. Nothing in this schema decrements it, and nothing should be written that does.
  programs_created int not null default 0 check (programs_created >= 0),

  -- MA3-D6. Also monotonic, and separate from programs_created: a Holt-generated program consumes BOTH,
  -- and an athlete who built three by hand has used no Holt allowance at all.
  holt_programs_used int not null default 0 check (holt_programs_used >= 0),

  -- The refilling one (MA3-D4). Period is the month as its first day — a `date` rather than 'YYYY-MM'
  -- text so "last month" is arithmetic instead of string surgery. Reset is LAZY: the consume function
  -- rolls the period and the count in the same atomic UPDATE, so nothing has to run on the 1st.
  holt_days_period date,
  holt_days_used   int not null default 0 check (holt_days_used >= 0),

  -- Amendment 001 §8. `hasUsedFreeImport` had ZERO occurrences in code or SQL before this line — the
  -- locked import model had never been given anywhere to live.
  -- ⚠ Set ONLY on W-IM-4 confirmation. A parse failure or an abandoned flow must leave it false.
  has_used_free_import boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.athlete_usage enable row level security;

drop policy if exists athlete_usage_own_select on public.athlete_usage;
create policy athlete_usage_own_select on public.athlete_usage
  for select using (athlete_id = auth.uid());

-- No client write path, same reasoning as above: a client that could zero its own counters could reopen
-- a lifetime cap.

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 4. THE PRIMITIVES — what "entitled" and "allowed" actually mean
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

/*
 * `-1` is unlimited. Everything that compares a use-count to a cap goes through here, so the sentinel is
 * known in exactly one place.
 */
create or replace function public.cap_allows(p_used int, p_cap int)
returns boolean
language sql
immutable
as $$
  select p_cap is null or p_cap < 0 or coalesce(p_used, 0) < p_cap;
$$;

/*
 * The tier for one athlete, resolving the default and the expiry.
 *
 * ⚠ AN ATHLETE WITH NO ROW GETS `default_tier`, WHICH IS WHY PHASE B NEEDS NO BACKFILL AND WHY PHASE F
 * NEEDS NO MIGRATION. Every existing athlete is entitled today because the config says PREMIUM; on the
 * day it says FREE they are all Free at once, except the ones holding an explicit row.
 */
create or replace function public.athlete_tier(p_athlete uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select case
              when e.tier = 'PREMIUM'
               and (e.premium_until is null or e.premium_until > now())
              then 'PREMIUM'
              else 'FREE'
            end
       from public.athlete_entitlement e
      where e.athlete_id = p_athlete),
    (select c.default_tier from public.entitlement_config c where c.id)
  );
$$;

/* The caller's own tier. The overwhelmingly common call. */
create or replace function public.my_tier()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.athlete_tier(auth.uid());
$$;

/* The caps that apply to one athlete, already resolved by tier. */
create or replace function public.athlete_caps(p_athlete uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case when public.athlete_tier(p_athlete) = 'PREMIUM' then c.paid_caps else c.free_caps end
    from public.entitlement_config c
   where c.id;
$$;

revoke all on function public.athlete_tier(uuid) from public;
revoke all on function public.athlete_caps(uuid) from public;
grant execute on function public.my_tier() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 5. THE LIVE COUNTS — photos, video, squads, templates
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

/*
 * ⚠ THE EXCLUSIONS ARE THE SPEC, NOT AN OPTIMISATION. Get one wrong and the cap is wrong:
 *
 *   · Photos count `chapter_photos` (is_video = false) PLUS every pose inside a
 *     `transformation_entries.photos` map — MA3-D8 puts Gallery entries on the SAME account-wide counter,
 *     which is the question `Transformation-Gallery-Architecture` left open and this closes. Six poses in
 *     one entry are six photos, because six photos is what was stored.
 *
 *   · Video counts `chapter_photos` (is_video = true) plus a Gallery entry's own clip.
 *     **`squad_checkins` is NOT counted and must never be** (MA3-D14) — check-ins are uncapped on every
 *     tier and 0141 destroys their media at 24 hours, so they are not persistent storage at all.
 *
 *   · Templates count `workout_templates`, which holds only athlete-authored rows. The 81 Forge starter
 *     templates are catalogue content in `src/domain/workout/starter-templates.ts` and have never been
 *     rows — so they cannot accidentally be counted, and this comment exists so nobody "fixes" that by
 *     seeding them into the table.
 */
create or replace function public.athlete_live_counts(p_athlete uuid)
returns table (photos int, videos int, squads int, templates int)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    (
      (select count(*) from public.chapter_photos cp
        where cp.athlete_id = p_athlete and cp.is_video = false)
      +
      -- One row can hold up to six poses; the map's key count is the photo count.
      -- ⚠ The `jsonb_typeof` guard is not defensive noise: `jsonb_object_keys` RAISES on a non-object,
      -- and one malformed row would take out the entitlement read for the entire account — every screen
      -- that asks "may I draw this button?" at once. A bad row should cost its own photos, nothing more.
      (select coalesce(sum(k.n), 0) from public.transformation_entries te
         cross join lateral (
           select case when jsonb_typeof(te.photos) = 'object'
                       then (select count(*) from jsonb_object_keys(te.photos))
                       else 0 end as n
         ) k
        where te.athlete_id = p_athlete)
    )::int,
    (
      (select count(*) from public.chapter_photos cp
        where cp.athlete_id = p_athlete and cp.is_video = true)
      +
      (select count(*) from public.transformation_entries te
        where te.athlete_id = p_athlete and te.video_url is not null)
    )::int,
    (select count(*) from public.squad_members sm where sm.user_id = p_athlete)::int,
    (select count(*) from public.workout_templates wt where wt.athlete_id = p_athlete)::int;
$$;

revoke all on function public.athlete_live_counts(uuid) from public;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 6. THE ONE READ THE CLIENT MAKES
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

/*
 * Everything `src/lib/entitlement.ts` needs, in one round trip: the tier, the caps that apply, and every
 * current usage figure.
 *
 * One call rather than seven because the alternative is seven independent loading states on a screen
 * that has to decide, before it draws anything, whether a button exists.
 *
 * ⚠ IT NEVER THROWS FOR A NORMAL ATHLETE. An athlete with no `athlete_entitlement` row and no
 * `athlete_usage` row gets the configured default and zeroes — which is every athlete on the day this is
 * applied.
 */
create or replace function public.my_entitlement()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_tier   text;
  v_caps   jsonb;
  v_live   record;
  v_usage  public.athlete_usage%rowtype;
  v_ent    public.athlete_entitlement%rowtype;
  v_period date := date_trunc('month', now())::date;
begin
  if v_uid is null then
    raise exception 'my_entitlement: no authenticated athlete' using errcode = '28000';
  end if;

  v_tier := public.athlete_tier(v_uid);
  v_caps := public.athlete_caps(v_uid);

  select * into v_live from public.athlete_live_counts(v_uid);
  select * into v_usage from public.athlete_usage where athlete_id = v_uid;
  select * into v_ent   from public.athlete_entitlement where athlete_id = v_uid;

  return jsonb_build_object(
    'tier',        v_tier,
    'premiumKind', v_ent.premium_kind,
    'premiumUntil', v_ent.premium_until,
    -- Concurrent with Premium, never implied by it (MA3-D3).
    'coachAi',     coalesce(v_ent.coach_ai, false)
                     and (v_ent.coach_ai_until is null or v_ent.coach_ai_until > now()),
    'founderSeat', v_ent.founder_seat,
    'caps',        v_caps,
    'usage', jsonb_build_object(
      'programs',  coalesce(v_usage.programs_created, 0),
      'photos',    v_live.photos,
      'videos',    v_live.videos,
      'squads',    v_live.squads,
      'templates', v_live.templates,
      'imports',   case when coalesce(v_usage.has_used_free_import, false) then 1 else 0 end,
      'holtPrograms', coalesce(v_usage.holt_programs_used, 0),
      -- ⚠ ZERO WHEN THE STORED PERIOD IS LAST MONTH. The refill is lazy (see §3), so a stale row must
      -- read as refilled here too — otherwise the screen shows "0 of 2 left" on the 1st while the
      -- consume function would happily allow two.
      'holtDays',  case when v_usage.holt_days_period = v_period
                        then coalesce(v_usage.holt_days_used, 0) else 0 end
    )
  );
end;
$$;

revoke all on function public.my_entitlement() from public;
grant execute on function public.my_entitlement() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 7. THE PROGRAM COUNTER — a trigger, because there are five call sites and there will be more
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

/*
 * Counts and enforces in one BEFORE INSERT. Built, generated by Holt, adopted from the catalogue, or
 * ACCEPTED FROM ANOTHER ATHLETE (MA3-D10) — all of them are an insert into `programs`, so all of them
 * count, and none of them can be forgotten at a call site.
 *
 * ⚠ THE GATE FIRES ON THE RECIPIENT, NOT THE SENDER (M7-D17). Accepting a `program_shares` row inserts
 * into the recipient's `programs`, so this trigger runs as the recipient. Sending stays free (MA3-D13)
 * and is untouched by anything here.
 *
 * ⚠ THIS IS A BACKSTOP, NOT THE USER EXPERIENCE. The client checks the cap BEFORE opening the flow and
 * shows M-7. If this exception ever reaches an athlete, a pre-action check is missing somewhere — the
 * message says so, because a raw 23514 in a toast helps nobody.
 *
 * ⚠ IT DOES NOT TOUCH `workouts`. Deleting a program keeps every set logged against it, forever
 * (MA3-D11).
 */
create or replace function public.programs_cap_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cap  int;
  v_used int;
begin
  v_cap := (public.athlete_caps(new.athlete_id) ->> 'programs')::int;

  insert into public.athlete_usage (athlete_id) values (new.athlete_id)
  on conflict (athlete_id) do nothing;

  -- Increment and re-check in ONE statement. Two statements under READ COMMITTED let two concurrent
  -- inserts both read the same count, both pass, and both write — a phone retrying a timed-out create is
  -- exactly that race. The row lock is held across the WHERE, so the second caller re-evaluates against
  -- the first caller's write.
  update public.athlete_usage u
     set programs_created = u.programs_created + 1,
         updated_at = now()
   where u.athlete_id = new.athlete_id
     and public.cap_allows(u.programs_created, v_cap)
  returning u.programs_created into v_used;

  if not found then
    select u.programs_created into v_used
      from public.athlete_usage u where u.athlete_id = new.athlete_id;
    raise exception
      'Program limit reached: % of % lifetime program slots used. The pre-action check that should have shown M-7 is missing at this call site.',
      v_used, v_cap
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists programs_cap_guard_trg on public.programs;
create trigger programs_cap_guard_trg
  before insert on public.programs
  for each row execute function public.programs_cap_guard();

-- ⚠ NO `after delete` TRIGGER, DELIBERATELY. MA3-D9: the slot does not reopen. If a future session adds
-- one "for symmetry", the program cap silently stops firing for the most common athlete in the product.

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 8. THE HOLT ALLOWANCES — one lifetime, two a month
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

/*
 * Consume one Coach Holt allowance, or refuse. Called BEFORE generation, never after — an athlete who is
 * out must be told before they answer six questions about their goal.
 *
 * `p_kind`:
 *   'program' — 1 lifetime on Free (MA3-D4). Does not reopen on delete (MA3-D6).
 *   'day'     — 2 per calendar month on Free, refilling forever.
 *
 * ⚠ THE MONTHLY REFILL IS LAZY AND ATOMIC. The period roll and the increment happen in the same UPDATE,
 * so nothing has to run on the 1st and two concurrent calls on the boundary cannot both reset.
 *
 * Note that a Holt-generated PROGRAM consumes this allowance AND a program slot; the caller inserts into
 * `programs` afterwards and §7 does the second half.
 */
create or replace function public.consume_holt_allowance(p_kind text)
returns table (allowed boolean, used int, allowance int)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_caps   jsonb;
  v_cap    int;
  v_period date := date_trunc('month', now())::date;
  v_used   int;
begin
  if v_uid is null then
    raise exception 'consume_holt_allowance: no authenticated athlete' using errcode = '28000';
  end if;

  if p_kind not in ('program', 'day') then
    raise exception 'consume_holt_allowance: unknown kind %', p_kind using errcode = '22023';
  end if;

  v_caps := public.athlete_caps(v_uid);
  v_cap  := (v_caps ->> (case when p_kind = 'program' then 'holt_programs' else 'holt_days_per_month' end))::int;

  insert into public.athlete_usage (athlete_id) values (v_uid) on conflict (athlete_id) do nothing;

  if p_kind = 'program' then
    update public.athlete_usage u
       set holt_programs_used = u.holt_programs_used + 1,
           updated_at = now()
     where u.athlete_id = v_uid
       and public.cap_allows(u.holt_programs_used, v_cap)
    returning u.holt_programs_used into v_used;
  else
    update public.athlete_usage u
       set holt_days_used = case when u.holt_days_period = v_period then u.holt_days_used + 1 else 1 end,
           holt_days_period = v_period,
           updated_at = now()
     where u.athlete_id = v_uid
       -- A stale period is a full allowance. Evaluated against the row as it was, before the SET.
       and (u.holt_days_period is distinct from v_period or public.cap_allows(u.holt_days_used, v_cap))
    returning u.holt_days_used into v_used;
  end if;

  if not found then
    select case when p_kind = 'program' then u.holt_programs_used
                when u.holt_days_period = v_period then u.holt_days_used
                else 0 end
      into v_used
      from public.athlete_usage u where u.athlete_id = v_uid;
    return query select false, coalesce(v_used, 0), v_cap;
    return;
  end if;

  return query select true, v_used, v_cap;
end;
$$;

revoke all on function public.consume_holt_allowance(text) from public;
grant execute on function public.consume_holt_allowance(text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 9. THE FREE IMPORT — one boolean that had never existed
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

/*
 * ⚠ CALL THIS ON W-IM-4 CONFIRMATION AND NOWHERE ELSE. Amendment 001 §8 defines the moment precisely:
 * "the athlete taps Confirm Import. That is the moment content is created." A parse error, a bad file, or
 * an abandoned flow at any earlier step must leave the athlete their free import — a migration that
 * failed is not a migration that happened.
 *
 * Idempotent: calling it twice is not two imports, and the second call reports false.
 */
create or replace function public.mark_free_import_used()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_ok  boolean;
begin
  if v_uid is null then
    raise exception 'mark_free_import_used: no authenticated athlete' using errcode = '28000';
  end if;

  insert into public.athlete_usage (athlete_id) values (v_uid) on conflict (athlete_id) do nothing;

  update public.athlete_usage u
     set has_used_free_import = true, updated_at = now()
   where u.athlete_id = v_uid and u.has_used_free_import = false
  returning true into v_ok;

  return coalesce(v_ok, false);
end;
$$;

revoke all on function public.mark_free_import_used() from public;
grant execute on function public.mark_free_import_used() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 10. FOUNDER SEATS — the counter that has to stop at 100
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

/*
 * ⚠ "FIRST 100" IS A FACTUAL CLAIM ABOUT A TRANSACTION (MA3-D24). Selling the 101st seat is a deceptive
 * practice, so the count is derived from the seats actually held — never stored, never cached, never
 * incremented by hand. A stored counter that drifts high sells a seat that does not exist.
 *
 * ⚠ AND THE 20 OG TESTERS OCCUPY NO SEATS (MA3-D25). They hold `premium_kind = 'GRANT'` with a null
 * `founder_seat`, so they are invisible to this count and all 100 paid seats remain available.
 */
create or replace function public.founder_seats_remaining()
returns int
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select greatest(
    (select c.founder_seats_total from public.entitlement_config c where c.id)
    - (select count(*) from public.athlete_entitlement e where e.founder_seat is not null),
    0
  )::int;
$$;

revoke all on function public.founder_seats_remaining() from public;
grant execute on function public.founder_seats_remaining() to authenticated;

/*
 * Claim the next seat. Called by the purchase webhook after the platform confirms payment — never from a
 * client, and never speculatively.
 *
 * The unique index on `founder_seat` is what makes a lost race fail loudly. Two concurrent claims compute
 * the same next number; one commits and the other violates the index and is retried by the caller. That
 * is the correct failure — the wrong one is both committing and two people holding seat 87.
 */
create or replace function public.claim_founder_seat(p_athlete uuid)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_total int;
  v_next  int;
begin
  select c.founder_seats_total into v_total from public.entitlement_config c where c.id;

  select coalesce(max(e.founder_seat), 0) + 1 into v_next
    from public.athlete_entitlement e;

  if v_next > v_total then
    raise exception 'Founder seats are gone: % of % sold. The SKU should already be delisted.',
      v_total, v_total using errcode = 'P0001';
  end if;

  insert into public.athlete_entitlement (athlete_id, tier, premium_kind, founder_seat)
       values (p_athlete, 'PREMIUM', 'FOUNDER', v_next)
  on conflict (athlete_id) do update
     -- Unqualified table name: ON CONFLICT DO UPDATE refers to the existing row by the table's name, and
     -- schema-qualifying it here is a parse error. An athlete who somehow already holds a seat keeps the
     -- one they have — re-running a webhook must not hand out a second number.
     set tier = 'PREMIUM', premium_kind = 'FOUNDER',
         founder_seat = coalesce(athlete_entitlement.founder_seat, excluded.founder_seat),
         premium_until = null, updated_at = now();

  return v_next;
end;
$$;

revoke all on function public.claim_founder_seat(uuid) from public;
-- Not granted to `authenticated`. Deliberately: seats are claimed server-side after a confirmed payment.

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 11. REFERRALS — a code, a ledger, and a cap that matters legally
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.referral_codes (
  athlete_id uuid primary key references public.profiles (id) on delete cascade,
  code       text not null unique check (code ~ '^[A-Z0-9]{6,12}$'),
  created_at timestamptz not null default now()
);

alter table public.referral_codes enable row level security;

-- An athlete reads their own code. Resolving somebody ELSE's code happens inside the definer function
-- below, never by a client select — a readable table of every code is a table of every athlete.
drop policy if exists referral_codes_own_select on public.referral_codes;
create policy referral_codes_own_select on public.referral_codes
  for select using (athlete_id = auth.uid());

/*
 * The ledger. Append-only, one row per credited month per side.
 *
 * ⚠ MA3-D18: CREDIT, NOT A FREE MONTH. A "free month" is meaningless to a lifetime holder and awkward on
 * an annual plan; account credit behaves identically on all three, which is why the plan chose it.
 *
 * ⚠ MA3-D20: GRANTED ON THE REFEREE'S FIRST SUCCESSFUL PAYMENT, never on install or signup. Nothing
 * accrues from an account that never converts.
 */
create table if not exists public.referral_credits (
  id          uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  referee_id  uuid not null references public.profiles (id) on delete cascade,
  -- Which side this row credits. Two rows per conversion, both pointing at the same pair.
  side        text not null check (side in ('REFERRER', 'REFEREE')),
  months      int  not null default 1 check (months > 0),
  granted_at  timestamptz not null default now(),
  note        text,
  constraint referral_credits_not_self check (referrer_id <> referee_id)
);

-- One conversion credits each side exactly once. A retried webhook is the same conversion, not two.
create unique index if not exists referral_credits_once
  on public.referral_credits (referee_id, side);

create index if not exists referral_credits_referrer_idx
  on public.referral_credits (referrer_id, granted_at desc);

alter table public.referral_credits enable row level security;

drop policy if exists referral_credits_own_select on public.referral_credits;
create policy referral_credits_own_select on public.referral_credits
  for select using (referrer_id = auth.uid() or referee_id = auth.uid());

/*
 * Get-or-create the caller's referral code.
 *
 * MA3-D21 says the credit should ride on squad and challenge invites rather than living as a generic code
 * in Settings — the invite is the moment an athlete is already reaching out. The code still has to exist
 * for those invites to carry it.
 *
 * Ambiguous glyphs are excluded from the alphabet: a code is read aloud and typed by hand, and
 * O/0 and I/1 are where that fails.
 */
create or replace function public.my_referral_code()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_code  text;
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i       int;
begin
  if v_uid is null then
    raise exception 'my_referral_code: no authenticated athlete' using errcode = '28000';
  end if;

  select code into v_code from public.referral_codes where athlete_id = v_uid;
  if v_code is not null then
    return v_code;
  end if;

  -- Bounded retry on collision. 32^8 is large enough that the loop is a formality, and a formality is
  -- cheaper than an unhandled 23505 on somebody's first share.
  for attempt in 1 .. 8 loop
    v_code := '';
    for i in 1 .. 8 loop
      v_code := v_code || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
    end loop;

    begin
      insert into public.referral_codes (athlete_id, code) values (v_uid, v_code);
      return v_code;
    exception when unique_violation then
      -- Either the code collided or a concurrent call already made this athlete one. Check the second
      -- case before burning another attempt.
      select code into v_code from public.referral_codes where athlete_id = v_uid;
      if v_code is not null then
        return v_code;
      end if;
    end;
  end loop;

  raise exception 'my_referral_code: could not allocate a unique code' using errcode = 'P0001';
end;
$$;

revoke all on function public.my_referral_code() from public;
grant execute on function public.my_referral_code() to authenticated;

/*
 * Credit both sides of a conversion.
 *
 * ⚠ CALLED FROM THE PAYMENT WEBHOOK, AFTER A CONFIRMED FIRST PAYMENT (MA3-D20). Not granted to
 * `authenticated`, because a client that could call it could credit itself.
 *
 * ⚠ THE 12-MONTH ROLLING CAP IS NOT AN ACCOUNTING PREFERENCE (MA3-D19). An uncapped recruitment reward
 * starts to resemble a chain-referral scheme, and that is a legal exposure rather than a financial one.
 * It is enforced here, in the only place credit is created, and it is not raisable without counsel.
 *
 * The referee is credited even when the referrer is at their cap — the referee did nothing wrong, and
 * withholding their side would make the invitation they accepted a false one.
 */
create or replace function public.grant_referral_credit(p_referee uuid, p_code text)
returns table (referrer_credited boolean, referee_credited boolean, referrer_months_this_year int)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_referrer uuid;
  v_cfg      public.entitlement_config%rowtype;
  v_year     int;
  v_ref_ok   boolean := false;
  v_ree_ok   boolean := false;
begin
  select * into v_cfg from public.entitlement_config where id;

  select athlete_id into v_referrer from public.referral_codes where code = upper(btrim(p_code));

  if v_referrer is null or v_referrer = p_referee then
    -- An unknown code, or a self-referral. Neither is an error worth failing a payment over.
    return query select false, false, 0;
    return;
  end if;

  select coalesce(sum(months), 0)::int into v_year
    from public.referral_credits
   where referrer_id = v_referrer
     and side = 'REFERRER'
     and granted_at > now() - interval '1 year';

  if v_year + v_cfg.referral_months_per_grant <= v_cfg.referral_referrer_year_cap then
    insert into public.referral_credits (referrer_id, referee_id, side, months)
         values (v_referrer, p_referee, 'REFERRER', v_cfg.referral_months_per_grant)
    on conflict (referee_id, side) do nothing;
    v_ref_ok := found;
    if v_ref_ok then
      v_year := v_year + v_cfg.referral_months_per_grant;
    end if;
  end if;

  insert into public.referral_credits (referrer_id, referee_id, side, months)
       values (v_referrer, p_referee, 'REFEREE', v_cfg.referral_months_per_grant)
  on conflict (referee_id, side) do nothing;
  v_ree_ok := found;

  return query select v_ref_ok, v_ree_ok, v_year;
end;
$$;

revoke all on function public.grant_referral_credit(uuid, text) from public;

commit;

-- ══ VERIFY ══
--
-- ⚠ THE SQL EDITOR HAS NO `auth.uid()`. It runs as `postgres` with no auth context, so every `my_*`
--   function below raises **28000 "no authenticated athlete"** when pasted into it. That is the guard
--   working, not the migration failing — those functions are for the app, which calls them with the
--   athlete's JWT. Do not "fix" them by loosening the check.
--
-- These four need no session and are the real post-apply check:
--
--   select default_tier from public.entitlement_config;                        -- 'PREMIUM'
--   select public.founder_seats_remaining();                                   -- 100
--   select id, public.athlete_tier(id) as tier from public.profiles limit 10;  -- every row 'PREMIUM'
--   select * from public.athlete_live_counts('<athlete uuid>');                -- their real counts
--
-- The `my_*` wrappers — `my_tier()`, `my_entitlement()`, `my_referral_code()`,
-- `consume_holt_allowance()`, `mark_free_import_used()` — are verified from the app, not from here.
--
-- ⚠ PHASE B'S WHOLE TEST IS THAT NOTHING CHANGED. Every athlete resolving PREMIUM is the migration
-- working, not the migration failing.
--
-- ══ FORCING FREE TO TEST PHASE C, WITHOUT TOUCHING ANYONE ELSE ══
--
--   insert into public.athlete_entitlement (athlete_id, tier) values ('<your uuid>', 'FREE')
--   on conflict (athlete_id) do update set tier = 'FREE', premium_until = null;
--
--   -- and back:
--   delete from public.athlete_entitlement where athlete_id = '<your uuid>';
--
-- ══ PHASE F — THE SWITCH-ON, IN FULL ══
--
--   -- 1. Grant the 20 OG testers first. They occupy NO founder seats (MA3-D25).
--   insert into public.athlete_entitlement (athlete_id, tier, premium_kind, grant_note)
--   select id, 'PREMIUM', 'GRANT', 'OG tester — permanent, seat-free (MA3-D25)'
--     from public.profiles where id in ( ... 20 uuids ... )
--   on conflict (athlete_id) do update
--     set tier = 'PREMIUM', premium_kind = 'GRANT', premium_until = null;
--
--   -- 2. THEN flip the default. Not before — between these two statements the testers would be Free.
--   update public.entitlement_config set default_tier = 'FREE', updated_at = now();
