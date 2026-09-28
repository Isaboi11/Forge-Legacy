-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0235: form_checks.measured (body tracking's numbers for a form-check read)
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: every statement is guarded, and §3 is read-only.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- Build 10 measures a form-check set ON THE PHONE (Apple Vision body pose). PO decision 3 (09-28): save
-- the numbers — reps, depth, tempo — never the joints. This adds `form_checks.measured` (jsonb) for them.
--
-- ⛔ NUMBERS ONLY. The CHECK caps it at a 4,000-byte JSON object; a joint series is ~100 KB and cannot fit.
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  adds `form_checks.measured` (jsonb, nullable) and its CHECK
-- §2  asserts the column and the constraint exist, and RAISES if not
-- §3  reports the column and how many reads have measurements. Read-only. ONE result (the editor shows
--     only the last statement's result).
--
-- ⚠ APPLYING IS NOT THE SAME AS WORKING. The client that writes this column ships in native BUILD 10
-- (the numbers come from a native module), so §3's `reads_with_measured` SHOULD be 0 until build 10 is on
-- a phone and a form check has been run. A non-zero count before that means something is writing it that
-- should not be. The client survives this NOT being applied (it retries the insert without the column).
-- Safe to paste before or after the build-10 app ships.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ═════════════════════════════════════════════════════════════════════════════
-- §1 — THE COLUMN (verbatim from supabase/migrations/0235_form_check_measured.sql)
-- ═════════════════════════════════════════════════════════════════════════════

alter table public.form_checks add column if not exists measured jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'form_checks_measured_check') then
    alter table public.form_checks
      add constraint form_checks_measured_check
      check (measured is null or (jsonb_typeof(measured) = 'object' and octet_length(measured::text) <= 4000));
  end if;
end $$;

comment on column public.form_checks.measured is
  'Body tracking''s numbers for this read (build 10+): { v, kind, view, reps, depth[], tempo[] } from measuredForSave() in src/domain/coach/pose/pose-measure.ts. NUMBERS ONLY, never joints (PO decision 3, 2026-09-28). null = no body tracking for this read.';


-- ═════════════════════════════════════════════════════════════════════════════
-- §2 — ASSERT IT TOOK. Raises rather than returning a tidy false green.
-- ═════════════════════════════════════════════════════════════════════════════

do $$
declare
  missing text := '';
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'form_checks' and column_name = 'measured' and data_type = 'jsonb'
  ) then missing := missing || ' form_checks.measured(jsonb)'; end if;

  if not exists (select 1 from pg_constraint where conname = 'form_checks_measured_check') then
    missing := missing || ' form_checks_measured_check';
  end if;

  if missing <> '' then
    raise exception '0235 DID NOT FULLY APPLY. Missing:%', missing;
  end if;

  raise notice '0235 OK — form_checks.measured and its check are present.';
end $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- §3 — WHAT IS NOW THERE. Read-only, one row.
-- Predicted: measured_type = jsonb · is_nullable = YES · has_check = true · reads_with_measured = 0
-- ═════════════════════════════════════════════════════════════════════════════

select
  (select data_type from information_schema.columns
    where table_schema = 'public' and table_name = 'form_checks' and column_name = 'measured')      as measured_type,
  (select is_nullable from information_schema.columns
    where table_schema = 'public' and table_name = 'form_checks' and column_name = 'measured')      as is_nullable,
  exists (select 1 from pg_constraint where conname = 'form_checks_measured_check')                   as has_check,
  (select count(*) from public.form_checks)                                                            as reads_total,
  (select count(*) from public.form_checks where measured is not null)                                 as reads_with_measured;
