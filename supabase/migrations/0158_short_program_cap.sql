-- Forge Legacy — 0158: a week does not spend a program slot
--
-- ⚠ RUN AFTER 0155, 0156 AND 0157. It calls `program_earns_credit` (0156) and reads
--   `programs.source_week_template_id` (0157).
--
-- ══ THE PROBLEM 0157 CREATED ══
--
-- `caps.programs` is **3 lifetime, and the slots do not reopen on delete** (MA3-D9, MA3-D10). That is
-- right for a multi-week commitment. It is badly wrong for a one-week block: a free athlete who builds
-- three deload weeks has PERMANENTLY exhausted their program allowance, and the door to a real 12-week
-- program is closed forever with no way to reopen it. Nobody designed that paywall; it is an existing
-- rule meeting a case it was not written for.
--
-- MA4-D1 splits them on exactly the line D-RCM-30 already draws — under four weeks is a *week of
-- training*, at or above it is a *program* — so the product has one threshold meaning one thing.
--
-- ══ AND THE DOUBLE-CHARGE THIS FILE EXISTS TO PREVENT ══
--
-- Saving a week template spends a unit. Starting it inserts a program, which would spend ANOTHER — two
-- charges for one intent, so a cap of 3 would fire at 2 (MA4-D4). `source_week_template_id` is what
-- makes the second charge skippable, and it is why 0157 added a dedicated column rather than reusing
-- `source_definition_id`.
--
-- Idempotent.

begin;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 1. THE COUNTER
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- MONOTONIC, exactly like `programs_created`. ⚠ NO `after delete` TRIGGER, DELIBERATELY (MA3-D9): a cap
-- that reopens never fires for the athlete running one block at a time, which is the common case. If a
-- future session adds one "for symmetry", the week cap silently stops working — 0145's own header
-- records that this nearly happened to the program counter.
alter table public.athlete_usage
  add column if not exists short_programs_created int not null default 0
    check (short_programs_created >= 0);

comment on column public.athlete_usage.short_programs_created is
  'Week templates saved + programs under four weeks created. ONE counter, TWO doors (MA4-D1). Monotonic;
   nothing decrements it and nothing should be written that does (MA3-D9). Migration 0158.';

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 2. THE CONFIG — ⚠ THE DEFAULT IS NOT ENOUGH, THE EXISTING ROW MUST BE UPDATED
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- `entitlement_config` holds EXACTLY ONE ROW, inserted by 0145. Changing a column DEFAULT does not touch
-- it. Without the UPDATE below, `my_entitlement()` returns no `short_programs` key, the client's `num()`
-- coerces the missing value to 0, `cap_allows(0, 0)` is false — and EVERY ATHLETE, on EVERY TIER,
-- INCLUDING PREMIUM AND INCLUDING THE PO, is blocked from saving a week. The feature would appear
-- completely broken while every gate reported green.
--
-- The default is set too, so a future fresh install is correct without remembering this file.
alter table public.entitlement_config
  alter column free_caps set default '{
    "programs": 3, "short_programs": 3, "photos": 75, "videos": 5, "squads": 1,
    "templates": 5, "imports": 1,
    "holt_programs": 1, "holt_days_per_month": 2, "holt_in_workout": 0
  }'::jsonb;

alter table public.entitlement_config
  alter column paid_caps set default '{
    "programs": -1, "short_programs": -1, "photos": -1, "videos": -1, "squads": 5,
    "templates": -1, "imports": -1,
    "holt_programs": -1, "holt_days_per_month": -1, "holt_in_workout": -1
  }'::jsonb;

-- `||` MERGES rather than replaces, so any number the PO has already tuned by hand survives. Adding the
-- key only if absent (`?` is the jsonb has-key operator) so re-running never resets a tuned value.
update public.entitlement_config
   set free_caps  = case when free_caps  ? 'short_programs' then free_caps
                         else free_caps  || '{"short_programs": 3}'::jsonb end,
       paid_caps  = case when paid_caps  ? 'short_programs' then paid_caps
                         else paid_caps  || '{"short_programs": -1}'::jsonb end,
       updated_at = now()
 where id;

-- Proven, not assumed. This is the single most likely way to ship this feature dark.
do $$
declare v_free jsonb; v_paid jsonb;
begin
  select free_caps, paid_caps into v_free, v_paid from public.entitlement_config where id;
  if v_free is null then
    raise exception '0158 FAILED: entitlement_config has no row — 0145 did not run';
  end if;
  if not (v_free ? 'short_programs') or not (v_paid ? 'short_programs') then
    raise exception '0158 FAILED: the config row is missing short_programs — every athlete would be blocked';
  end if;
  if (v_paid ->> 'short_programs')::int <> -1 then
    raise exception '0158 FAILED: paid short_programs is %, expected -1 (unlimited)', v_paid ->> 'short_programs';
  end if;
  raise notice '0158: config carries short_programs — free %, paid %.',
    v_free ->> 'short_programs', v_paid ->> 'short_programs';
end $$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 3. WHICH ALLOWANCE A PROGRAM SPENDS
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- 0145's body, with the key and the column chosen per-row instead of hardcoded. The
-- increment-and-re-check-in-ONE-statement shape is preserved exactly: two statements under READ
-- COMMITTED let two concurrent inserts both read the same count, both pass and both write — a phone
-- retrying a timed-out create is precisely that race.
create or replace function public.programs_cap_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cap   int;
  v_used  int;
  v_short boolean;
begin
  -- ⚠ ALREADY PAID FOR (MA4-D4). Starting a saved week creates this program, and the week was charged
  -- when it was saved. Charging again would make one intent cost two units and fire a cap of 3 at 2.
  if new.source_week_template_id is not null then
    return new;
  end if;

  -- The same predicate that decides rank credit, so "week" means one thing across the whole product.
  v_short := not public.program_earns_credit(new.structure);
  v_cap   := (public.athlete_caps(new.athlete_id) ->> case when v_short then 'short_programs' else 'programs' end)::int;

  insert into public.athlete_usage (athlete_id) values (new.athlete_id)
  on conflict (athlete_id) do nothing;

  if v_short then
    update public.athlete_usage u
       set short_programs_created = u.short_programs_created + 1,
           updated_at = now()
     where u.athlete_id = new.athlete_id
       and public.cap_allows(u.short_programs_created, v_cap)
    returning u.short_programs_created into v_used;
  else
    update public.athlete_usage u
       set programs_created = u.programs_created + 1,
           updated_at = now()
     where u.athlete_id = new.athlete_id
       and public.cap_allows(u.programs_created, v_cap)
    returning u.programs_created into v_used;
  end if;

  if not found then
    select case when v_short then u.short_programs_created else u.programs_created end into v_used
      from public.athlete_usage u where u.athlete_id = new.athlete_id;
    raise exception
      '% limit reached: % of % used. The pre-action check that should have shown M-7 is missing at this call site.',
      case when v_short then 'Training week' else 'Program' end, v_used, v_cap
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 4. THE OTHER DOOR — saving a week template
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- Same key, same counter, same shape. Two triggers, ONE number — which is what "one new cap" means.
create or replace function public.week_templates_cap_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cap  int;
  v_used int;
begin
  v_cap := (public.athlete_caps(new.athlete_id) ->> 'short_programs')::int;

  insert into public.athlete_usage (athlete_id) values (new.athlete_id)
  on conflict (athlete_id) do nothing;

  update public.athlete_usage u
     set short_programs_created = u.short_programs_created + 1,
         updated_at = now()
   where u.athlete_id = new.athlete_id
     and public.cap_allows(u.short_programs_created, v_cap)
  returning u.short_programs_created into v_used;

  if not found then
    select u.short_programs_created into v_used
      from public.athlete_usage u where u.athlete_id = new.athlete_id;
    raise exception
      'Training week limit reached: % of % used. The pre-action check that should have shown M-7 is missing at this call site.',
      v_used, v_cap
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists week_templates_cap_guard_trg on public.week_templates;
create trigger week_templates_cap_guard_trg
  before insert on public.week_templates
  for each row execute function public.week_templates_cap_guard();

-- ⚠ NO `after delete` TRIGGER on either table (MA3-D9). Stated twice on purpose.

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- 5. my_entitlement() REPORTS THE NEW USAGE
-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
--
-- `caps` passes straight through from `athlete_caps`, so only the usage object needs the new key. The
-- client reads `usage.shortPrograms` (camelCase, matching every other key this function emits).
-- ⚠ PATCHED BY TRANSFORM RATHER THAN RETYPED. `my_entitlement()` is long and this migration only needs
-- one key added to it; hand-copying the whole body is the operation that has silently dropped a shipped
-- branch in this schema four times.
--
-- ⚠ AND `replace()` RETURNS ITS INPUT UNCHANGED WHEN THE ANCHOR IS ABSENT — so a moved anchor would
-- re-execute the identical definition, report success, and leave the key missing. Every step is checked.
do $$
declare
  v_src text;
  v_new text;
begin
  v_src := pg_get_functiondef('public.my_entitlement()'::regprocedure);

  if position('shortPrograms' in v_src) > 0 then
    raise notice '0158: my_entitlement already reports shortPrograms.';
    return;
  end if;

  if position($x$'holtPrograms'$x$ in v_src) = 0 then
    raise exception
      '0158 FAILED: my_entitlement has no ''holtPrograms'' anchor — its body has changed. Patch it by hand and re-run.';
  end if;

  v_new := replace(
    v_src,
    $x$'holtPrograms'$x$,
    $x$'shortPrograms', coalesce(v_usage.short_programs_created, 0),
        'holtPrograms'$x$
  );

  if v_new = v_src then
    raise exception '0158 FAILED: the replace changed nothing';
  end if;

  execute v_new;

  -- Re-read from the catalog. Proving the INSTALLED body carries it, not the string we built.
  if position('shortPrograms' in pg_get_functiondef('public.my_entitlement()'::regprocedure)) = 0 then
    raise exception '0158 FAILED: my_entitlement was not replaced — an older body is still installed';
  end if;
  if position('holt_days_used' in pg_get_functiondef('public.my_entitlement()'::regprocedure)) = 0 then
    raise exception '0158 FAILED: the rebuilt my_entitlement lost its Holt usage — do not proceed';
  end if;
  raise notice '0158: my_entitlement patched; existing usage keys intact.';
end $$;

commit;

-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
-- VERIFY — read-only unless stated. Run 6a FIRST; it is the one that has broken a launch.
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════
--
-- ── 6a · THE CONFIG ROW ACTUALLY CARRIES THE KEY ──
--
--   select free_caps -> 'short_programs' as free, paid_caps -> 'short_programs' as paid
--     from public.entitlement_config where id;
--
--   Expected: free 3, paid -1. If either is NULL, the client reads 0 and BLOCKS EVERY ATHLETE INCLUDING
--   PREMIUM. Do not ship the client until this returns two numbers.
--
-- ── 6b · my_entitlement reports it ──
--
--   select public.my_entitlement() -> 'usage' -> 'shortPrograms',
--          public.my_entitlement() -> 'caps'  -> 'short_programs';
--
--   Expected: two numbers, never null.
--
-- ── 6c · THE FOUR CASES, on a scratch FREE account. Wrap in begin; … rollback; ──
--
--   -- (1) a 4-week program spends `programs`, not `short_programs`
--   -- (2) a 2-week program spends `short_programs`, not `programs`
--   -- (3) saving a week template spends `short_programs`
--   -- (4) starting that template spends NOTHING MORE  ← the MA4-D4 assertion
--   select programs_created, short_programs_created
--     from public.athlete_usage where athlete_id = '<scratch>'::uuid;
--
--   Take the reading before and after each step. Step 4 must not move either number.
--
-- ── 6d · The wall fires at the number, in the app ──
--
--   With `free_caps.short_programs` temporarily set to 1: save one week (allowed), save a second (M-7,
--   not a raw error toast), start the first (allowed — it was already paid for), build a 4-week program
--   (allowed; it spends the other allowance).
