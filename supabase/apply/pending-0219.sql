-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0219: community foods (Nutrition Architecture Amendment 004, LOCKED 2026-09-25)
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: every statement is guarded or `create or replace`, and §3 is read-only.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- A barcode none of USDA / FatSecret / Open Food Facts knows ends in Create Food. Until now that food
-- stayed private to whoever typed it, so the next athlete hit the same miss. This keeps the answer:
-- a food shared from Create Food (the box is ticked by default, PO) is found by every later scan.
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  the migration of record, verbatim: 3 tables, 3 helpers, 1 read policy, share + report RPCs,
--     3 admin RPCs, and 'community' added to the food log / saved meal source checks
-- §2  asserts every table, function, the policy and both widened checks exist, and RAISES if not
-- §3  one read-only row: what is there now
--
-- ⚠ ANONYMITY IS IN THE SCHEMA: `community_food_submissions` and `community_food_reports` carry the
--   people and have NO policies (deny-by-default). Do not add one. Readers see only `community_foods`.
-- ⚠ Additive. The two source checks are WIDENED ('community' added), never narrowed, so the app that
--   is live today keeps writing exactly what it writes now.
-- ⚠ Tested before handover in PGlite (all gate reasons, anonymity, own-report hide, 3-report hide,
--   admin restore, the 3-v-2 majority flip, account deletion keeping the food, run twice).
--
-- ══ PREDICTED §3 ══
--   foods 0 · submissions 0 · reports 0 · log_check_has_community true · meal_check_has_community true
--   Zeros are correct: the app code that shares is not deployed until after this is applied.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

-- ═══ §1 — THE MIGRATION (verbatim from supabase/migrations/0219_community_foods.sql) ═══════════════

-- 0219 — Community foods: a barcode one athlete adds, every athlete finds.
--
-- Governs: Docs/Amendments/Nutrition-Architecture-Amendment-004-Community-Foods.md (LOCKED 2026-09-25).
-- PO: "how do we get as robust as MyFitnessPal?" → share scanned foods; ticked by default; kept when an
-- account is deleted; not sent to Open Food Facts yet; everyone may share.
--
-- THREE TABLES, AND THE SPLIT IS THE PRIVACY DESIGN (CF-D3):
--   community_food_submissions — one row per athlete per barcode, WITH the contributor id. No policies:
--                                deny-by-default, so no athlete can ever read who added what.
--   community_foods            — the one CURRENT answer per barcode, with NO person on it. Readable.
--   community_food_reports     — "Numbers look wrong?". No policies; reporters are moderation-only.
--
-- Writes happen only through two SECURITY DEFINER functions: `share_community_food` (the CF-D4 gate) and
-- `report_community_food` (CF-D6). Operators restore or delete through `admin_*` functions behind 0129's
-- `admin_guard()`.
--
-- Safe to run twice.

-- ── 1. Tables ─────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.community_foods (
  -- `cf:<gtin-14>` — one entry per product, so the key IS the barcode.
  key           text primary key,
  gtin          text not null unique check (gtin ~ '^[0-9]{14}$'),
  name          text not null check (char_length(btrim(name)) between 1 and 80),
  brand         text check (brand is null or char_length(brand) <= 60),
  kcal_100      numeric not null,
  protein_100   numeric not null,
  carb_100      numeric not null,
  fat_100       numeric not null,
  servings      jsonb not null default '[]'::jsonb,
  micros        jsonb,
  entry         text not null check (entry in ('label_scan', 'typed')),
  -- How many athletes' submissions agree with these numbers (CF-D5). 2+ is shown as "confirmed".
  confirmations int not null default 1,
  hidden        boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint community_foods_key_is_gtin check (key = 'cf:' || gtin)
);

create table if not exists public.community_food_submissions (
  id             uuid primary key default gen_random_uuid(),
  gtin           text not null check (gtin ~ '^[0-9]{14}$'),
  -- Q2 (PO): a deleted account's foods are KEPT. `set null` severs the person and keeps the fact.
  contributor_id uuid references public.profiles(id) on delete set null,
  name           text not null,
  brand          text,
  kcal_100       numeric not null,
  protein_100    numeric not null,
  carb_100       numeric not null,
  fat_100        numeric not null,
  servings       jsonb not null default '[]'::jsonb,
  micros         jsonb,
  entry          text not null check (entry in ('label_scan', 'typed')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- One submission per athlete per barcode; a re-share replaces their own earlier one.
create unique index if not exists community_food_submissions_one_each
  on public.community_food_submissions (gtin, contributor_id);

create table if not exists public.community_food_reports (
  gtin        text not null,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (gtin, reporter_id)
);

alter table public.community_foods enable row level security;
alter table public.community_food_submissions enable row level security;
alter table public.community_food_reports enable row level security;
-- ⛔ Submissions and reports carry ZERO policies on purpose — they hold people. Do not "fix" this.

-- ── 2. Helpers ────────────────────────────────────────────────────────────────────────────────────────

/* GTIN mod-10 check digit. Works on the 14-digit left-padded form of an EAN-8/UPC-A/EAN-13. */
create or replace function public.gtin_valid(p_gtin text)
returns boolean
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  v_sum int := 0;
  i int;
begin
  if p_gtin is null or p_gtin !~ '^[0-9]{14}$' or p_gtin ~ '^0+$' then
    return false;
  end if;
  for i in 1..13 loop
    v_sum := v_sum + substr(p_gtin, i, 1)::int * (case when i % 2 = 1 then 3 else 1 end);
  end loop;
  return (10 - v_sum % 10) % 10 = substr(p_gtin, 14, 1)::int;
end;
$$;

/* Two sets of per-100 g numbers are "the same label" when each is within 5% or 1 unit (CF-D5). */
create or replace function public.community_numbers_agree(
  k1 numeric, p1 numeric, c1 numeric, f1 numeric,
  k2 numeric, p2 numeric, c2 numeric, f2 numeric
)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select abs(k1 - k2) <= greatest(1, 0.05 * greatest(k1, k2))
     and abs(p1 - p2) <= greatest(1, 0.05 * greatest(p1, p2))
     and abs(c1 - c2) <= greatest(1, 0.05 * greatest(c1, c2))
     and abs(f1 - f2) <= greatest(1, 0.05 * greatest(f1, f2));
$$;

/* Whether the CALLER has reported this barcode — their own report hides it for them at once (CF-D6). */
create or replace function public.community_food_reported_by_me(p_gtin text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.community_food_reports r
     where r.gtin = p_gtin and r.reporter_id = auth.uid()
  );
$$;

revoke all on function public.community_food_reported_by_me(text) from public;
grant execute on function public.community_food_reported_by_me(text) to authenticated;

-- ── 3. Read policy ────────────────────────────────────────────────────────────────────────────────────

drop policy if exists community_foods_read on public.community_foods;
create policy community_foods_read on public.community_foods for select to authenticated
  using (
    public.has_nutrition_access()
    and not community_foods.hidden
    and not public.community_food_reported_by_me(community_foods.gtin)
  );

-- ── 4. Share — the CF-D4 gate ─────────────────────────────────────────────────────────────────────────
--
-- Returns { shared: bool, reason: text|null }. A refusal is an ANSWER, not an exception: the athlete's
-- own food is already saved by the time this runs, and "saved, but not shared because …" is what they
-- are told. Reasons: 'signed_out' · 'barcode' · 'incomplete' · 'numbers' · 'name'.

create or replace function public.share_community_food(
  p_gtin        text,
  p_name        text,
  p_brand       text,
  p_kcal_100    numeric,
  p_protein_100 numeric,
  p_carb_100    numeric,
  p_fat_100     numeric,
  p_servings    jsonb,
  p_micros      jsonb,
  p_entry       text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me      uuid := auth.uid();
  v_gtin    text := lpad(regexp_replace(coalesce(p_gtin, ''), '[^0-9]', '', 'g'), 14, '0');
  v_name    text := btrim(coalesce(p_name, ''));
  v_brand   text := nullif(btrim(coalesce(p_brand, '')), '');
  v_norm    text;
  v_atwater numeric;
  v_entry   text := case when p_entry = 'label_scan' then 'label_scan' else 'typed' end;
  v_cur     public.community_foods%rowtype;
  v_agree_cur int;
  v_agree_new int;
begin
  if v_me is null or not public.has_nutrition_access() then
    return jsonb_build_object('shared', false, 'reason', 'signed_out');
  end if;

  if char_length(v_gtin) <> 14 or not public.gtin_valid(v_gtin) then
    return jsonb_build_object('shared', false, 'reason', 'barcode');
  end if;

  if v_name = '' or char_length(v_name) > 80 or (v_brand is not null and char_length(v_brand) > 60)
     or p_kcal_100 is null or p_protein_100 is null or p_carb_100 is null or p_fat_100 is null then
    return jsonb_build_object('shared', false, 'reason', 'incomplete');
  end if;

  -- Per 100 g: nothing is above 900 kcal (pure fat), no macro above 100 g, and the three together
  -- cannot outweigh the 100 g they are in (5 g of rounding allowed).
  v_atwater := 4 * p_protein_100 + 4 * p_carb_100 + 9 * p_fat_100;
  if p_kcal_100 <= 0 or p_kcal_100 > 900
     or least(p_protein_100, p_carb_100, p_fat_100) < 0
     or greatest(p_protein_100, p_carb_100, p_fat_100) > 100
     or p_protein_100 + p_carb_100 + p_fat_100 > 105
     -- Calories the macros cannot explain (checkCalories' rule, widened for fibre and sugar alcohols).
     or abs(p_kcal_100 - v_atwater) > greatest(20, 0.2 * greatest(p_kcal_100, v_atwater))
     or jsonb_typeof(coalesce(p_servings, '[]'::jsonb)) <> 'array' then
    return jsonb_build_object('shared', false, 'reason', 'numbers');
  end if;

  -- Guideline 1.2: the same blocklist 0171/0173 enforce on handles and names, same normalisation.
  v_norm := lower(regexp_replace(v_name || ' ' || coalesce(v_brand, ''), '[^a-z0-9]', '', 'gi'));
  if exists (
    select 1 from public.moderation_blocklist b
     where b.kind in ('name', 'both') and v_norm like '%' || b.pattern || '%'
  ) then
    return jsonb_build_object('shared', false, 'reason', 'name');
  end if;

  insert into public.community_food_submissions as s
    (gtin, contributor_id, name, brand, kcal_100, protein_100, carb_100, fat_100, servings, micros, entry)
  values
    (v_gtin, v_me, v_name, v_brand, p_kcal_100, p_protein_100, p_carb_100, p_fat_100,
     coalesce(p_servings, '[]'::jsonb), p_micros, v_entry)
  on conflict (gtin, contributor_id) do update set
    name = excluded.name, brand = excluded.brand,
    kcal_100 = excluded.kcal_100, protein_100 = excluded.protein_100,
    carb_100 = excluded.carb_100, fat_100 = excluded.fat_100,
    servings = excluded.servings, micros = excluded.micros, entry = excluded.entry,
    updated_at = now();

  select * into v_cur from public.community_foods cf where cf.gtin = v_gtin;

  if not found then
    insert into public.community_foods
      (key, gtin, name, brand, kcal_100, protein_100, carb_100, fat_100, servings, micros, entry)
    values
      ('cf:' || v_gtin, v_gtin, v_name, v_brand, p_kcal_100, p_protein_100, p_carb_100, p_fat_100,
       coalesce(p_servings, '[]'::jsonb), p_micros, v_entry);
    return jsonb_build_object('shared', true, 'reason', null);
  end if;

  -- CF-D5: the answer shown is the one the most athletes agree with.
  select count(*) into v_agree_cur from public.community_food_submissions s
   where s.gtin = v_gtin
     and public.community_numbers_agree(s.kcal_100, s.protein_100, s.carb_100, s.fat_100,
                                        v_cur.kcal_100, v_cur.protein_100, v_cur.carb_100, v_cur.fat_100);
  select count(*) into v_agree_new from public.community_food_submissions s
   where s.gtin = v_gtin
     and public.community_numbers_agree(s.kcal_100, s.protein_100, s.carb_100, s.fat_100,
                                        p_kcal_100, p_protein_100, p_carb_100, p_fat_100);

  if public.community_numbers_agree(p_kcal_100, p_protein_100, p_carb_100, p_fat_100,
                                    v_cur.kcal_100, v_cur.protein_100, v_cur.carb_100, v_cur.fat_100) then
    update public.community_foods cf
       set confirmations = greatest(v_agree_cur, 1), updated_at = now()
     where cf.gtin = v_gtin;
  elsif v_agree_new > v_agree_cur then
    -- A different label now has more agreement: it becomes the answer, and reports against the old
    -- numbers no longer describe what is shown.
    update public.community_foods cf
       set name = v_name, brand = v_brand, kcal_100 = p_kcal_100, protein_100 = p_protein_100,
           carb_100 = p_carb_100, fat_100 = p_fat_100, servings = coalesce(p_servings, '[]'::jsonb),
           micros = p_micros, entry = v_entry, confirmations = v_agree_new, hidden = false,
           updated_at = now()
     where cf.gtin = v_gtin;
    delete from public.community_food_reports r where r.gtin = v_gtin;
  end if;

  return jsonb_build_object('shared', true, 'reason', null);
end;
$$;

revoke all on function public.share_community_food(text, text, text, numeric, numeric, numeric, numeric, jsonb, jsonb, text) from public;
grant execute on function public.share_community_food(text, text, text, numeric, numeric, numeric, numeric, jsonb, jsonb, text) to authenticated;

-- ── 5. Report — CF-D6 ─────────────────────────────────────────────────────────────────────────────────

create or replace function public.report_community_food(p_key text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me    uuid := auth.uid();
  v_gtin  text := regexp_replace(coalesce(p_key, ''), '^cf:', '');
  v_count int;
begin
  if v_me is null or not public.has_nutrition_access() then
    raise exception 'Sign in to report a food.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.community_foods cf where cf.gtin = v_gtin) then
    return jsonb_build_object('reported', false, 'hidden', false);
  end if;

  insert into public.community_food_reports (gtin, reporter_id) values (v_gtin, v_me)
  on conflict (gtin, reporter_id) do nothing;

  select count(*) into v_count from public.community_food_reports r where r.gtin = v_gtin;
  if v_count >= 3 then
    update public.community_foods cf set hidden = true, updated_at = now() where cf.gtin = v_gtin;
  end if;

  return jsonb_build_object('reported', true, 'hidden', v_count >= 3);
end;
$$;

revoke all on function public.report_community_food(text) from public;
grant execute on function public.report_community_food(text) to authenticated;

-- ── 6. Operator surface — /admin, behind 0129's admin_guard() ─────────────────────────────────────────

create or replace function public.admin_community_foods(p_hidden_only boolean default true, p_limit int default 100)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_rows jsonb;
begin
  perform public.admin_guard();
  select coalesce(jsonb_agg(x order by x->>'updated_at' desc), '[]'::jsonb) into v_rows
    from (
      select jsonb_build_object(
               'key', cf.key, 'gtin', cf.gtin, 'name', cf.name, 'brand', cf.brand,
               'kcal_100', cf.kcal_100, 'protein_100', cf.protein_100, 'carb_100', cf.carb_100,
               'fat_100', cf.fat_100, 'entry', cf.entry, 'confirmations', cf.confirmations,
               'hidden', cf.hidden, 'updated_at', cf.updated_at,
               'reports', (select count(*) from public.community_food_reports r where r.gtin = cf.gtin),
               'submissions', (select count(*) from public.community_food_submissions s where s.gtin = cf.gtin)
             ) as x
        from public.community_foods cf
       where (not p_hidden_only) or cf.hidden
       order by cf.updated_at desc
       limit greatest(1, least(p_limit, 500))
    ) q;
  return v_rows;
end;
$$;

create or replace function public.admin_restore_community_food(p_key text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_gtin text := regexp_replace(coalesce(p_key, ''), '^cf:', '');
begin
  perform public.admin_guard();
  update public.community_foods cf set hidden = false, updated_at = now() where cf.gtin = v_gtin;
  delete from public.community_food_reports r where r.gtin = v_gtin;
end;
$$;

create or replace function public.admin_delete_community_food(p_key text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_gtin text := regexp_replace(coalesce(p_key, ''), '^cf:', '');
begin
  perform public.admin_guard();
  delete from public.community_food_reports r where r.gtin = v_gtin;
  delete from public.community_food_submissions s where s.gtin = v_gtin;
  delete from public.community_foods cf where cf.gtin = v_gtin;
end;
$$;

revoke all on function public.admin_community_foods(boolean, int) from public;
revoke all on function public.admin_restore_community_food(text) from public;
revoke all on function public.admin_delete_community_food(text) from public;
grant execute on function public.admin_community_foods(boolean, int) to authenticated;
grant execute on function public.admin_restore_community_food(text) to authenticated;
grant execute on function public.admin_delete_community_food(text) to authenticated;

-- ── 7. A community food can be logged and saved in a meal ─────────────────────────────────────────────
--
-- 0205's inline checks were unnamed, so Postgres named them `<table>_source_check`. Widened, never
-- narrowed: every value the deployed client writes is still allowed.

alter table public.food_log_entries drop constraint if exists food_log_entries_source_check;
alter table public.food_log_entries add constraint food_log_entries_source_check
  check (source in ('usda', 'off', 'fs', 'custom', 'quick', 'community'));

alter table public.saved_meal_items drop constraint if exists saved_meal_items_source_check;
alter table public.saved_meal_items add constraint saved_meal_items_source_check
  check (source in ('usda', 'off', 'fs', 'custom', 'quick', 'community'));

-- ═══ §2 — ASSERT IT TOOK. Raises rather than returning a tidy false green. ════════════════════════

do $$
declare
  missing text := '';
begin
  if to_regclass('public.community_foods') is null then missing := missing || ' community_foods'; end if;
  if to_regclass('public.community_food_submissions') is null then missing := missing || ' community_food_submissions'; end if;
  if to_regclass('public.community_food_reports') is null then missing := missing || ' community_food_reports'; end if;
  if to_regprocedure('public.gtin_valid(text)') is null then missing := missing || ' gtin_valid'; end if;
  if to_regprocedure('public.community_numbers_agree(numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric)') is null then missing := missing || ' community_numbers_agree'; end if;
  if to_regprocedure('public.community_food_reported_by_me(text)') is null then missing := missing || ' community_food_reported_by_me'; end if;
  if to_regprocedure('public.share_community_food(text,text,text,numeric,numeric,numeric,numeric,jsonb,jsonb,text)') is null then missing := missing || ' share_community_food'; end if;
  if to_regprocedure('public.report_community_food(text)') is null then missing := missing || ' report_community_food'; end if;
  if to_regprocedure('public.admin_community_foods(boolean,int)') is null then missing := missing || ' admin_community_foods'; end if;
  if to_regprocedure('public.admin_restore_community_food(text)') is null then missing := missing || ' admin_restore_community_food'; end if;
  if to_regprocedure('public.admin_delete_community_food(text)') is null then missing := missing || ' admin_delete_community_food'; end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'community_foods' and policyname = 'community_foods_read') then
    missing := missing || ' community_foods_read';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename in ('community_food_submissions', 'community_food_reports')) then
    missing := missing || ' [a policy exists on submissions/reports — anonymity broken]';
  end if;
  -- Every check constraint on the two source columns must allow 'community'; a leftover narrower one
  -- under another name would still reject it.
  if exists (
    select 1 from pg_constraint c
     where c.conrelid in ('public.food_log_entries'::regclass, 'public.saved_meal_items'::regclass)
       and c.contype = 'c'
       and pg_get_constraintdef(c.oid) like '%source%'
       and pg_get_constraintdef(c.oid) not like '%community%'
  ) then
    missing := missing || ' [a source check still rejects community]';
  end if;
  if not public.gtin_valid('00888849000463') or public.gtin_valid('00888849000464') then
    missing := missing || ' [gtin_valid is wrong]';
  end if;
  if length(missing) > 0 then
    raise exception '0219 DID NOT FULLY APPLY. Missing:%', missing;
  end if;
  raise notice '0219 OK — tables, functions, policy and both source checks present.';
end $$;

-- ═══ §3 — WHAT IS NOW THERE. Read-only. ══════════════════════════════════════════════════════════

select
  (select count(*) from public.community_foods)            as foods,
  (select count(*) from public.community_food_submissions) as submissions,
  (select count(*) from public.community_food_reports)     as reports,
  exists (select 1 from pg_constraint c where c.conname = 'food_log_entries_source_check'
          and pg_get_constraintdef(c.oid) like '%community%')                    as log_check_has_community,
  exists (select 1 from pg_constraint c where c.conname = 'saved_meal_items_source_check'
          and pg_get_constraintdef(c.oid) like '%community%')                    as meal_check_has_community;
