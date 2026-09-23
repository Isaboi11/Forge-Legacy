-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0209: what the athlete weighed when a target was set
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: §1 is `add column if not exists`, §2 only raises, §3 is read-only.
--
-- ⚠ Supabase's editor shows only the LAST statement's result, so §3 is the only output you will see.
--   §2 raises on failure, so silence from it means it passed.
--
-- ⚠ `0207` (micros on user_foods + saved_meal_items) may still be unpasted. The two are INDEPENDENT
--   and may be pasted in either order, or together. Neither touches the other's tables.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- `Nutrition Targets.dc.html` opens with a review banner: *"Your weight has changed since these targets
-- were set — 201.8 lb on Aug 4 · 196.4 lb now."* Every figure a recommended target is built from comes
-- from bodyweight — Mifflin–St Jeor, the 1%-a-week loss cap, protein at 0.9 g per lb — so a target goes
-- out of date the moment the body it was calculated for changes. Without this column the banner was the
-- one piece of that screen that could not be built.
--
-- ⚠ AND IT MUST NOT BE FAKED WITHOUT IT. The only weight the app can otherwise see is the LATEST
--   weigh-in, which is the "now" half of that sentence. Comparing it to itself yields nothing;
--   comparing it to the oldest weigh-in on file answers a completely different question. Either way the
--   banner would state a change that did not happen — on the screen whose entire job is saying true
--   things about somebody's body. It was left unbuilt until this column existed.
--
-- ⚠ A SNAPSHOT, NEVER RECALCULATED. It records what was true when the row was written, for the same
--   reason `effective_from` is never edited (NUT-D5, 0205 §4: "an old day stays readable against what
--   was true then"). Do not backfill it from today's weigh-in — that would write a number the athlete
--   did not weigh on a date they did not weigh it.
--
-- ⚠ NULL MEANS "NO COMPARISON TO DRAW", NEVER "0 lb". A manual target typed before any weigh-in keeps
--   null, and the client shows no banner for it rather than claiming a change from zero.
--
-- ⚠ POUNDS, like `body_entries.weight_lb`. Units are a display concern; this store is lb-canonical
--   everywhere and this column is not the exception.
--
-- ══ ORDER OF OPERATIONS — EITHER WAY IS SAFE ══
--
-- Additive and nullable, so:
--   · the DEPLOYED client is unaffected — it neither selects nor writes this column;
--   · the NEW client writes it and, if this file has not been pasted yet, catches the
--     "column not found" error and retries the write WITHOUT it. The target is still saved; only the
--     weight snapshot is lost, so that one target never earns a review banner later.
-- Pasting BEFORE the deploy is better — nothing is lost.
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  adds `nutrition_targets.weight_lb` (numeric, nullable) + its column comment
-- §2  asserts the column exists, and RAISES if not
-- §3  reports the column and how many target rows carry a weight. Read-only.
--
-- No RLS work: `nutrition_targets` already carries owner-scoped select/insert/update policies from
-- `0205`, and a new column inherits them. No table is rewritten — `add column if not exists` on a
-- nullable column with no default is a catalogue-only change and does not touch existing rows.
--
-- ══ PREDICT §3 BEFORE YOU RUN IT ══
--
--   weight_lb  present = true,  target_rows = <however many targets you have set>,  rows_with_weight = 0
--
-- rows_with_weight MUST BE 0. The client that writes it is not deployed at the time of writing, and
-- nothing backfills this column. A non-zero count means something wrote it that should not have —
-- investigate before believing it.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §1 — the statements (verbatim from supabase/migrations/0209_target_weight_snapshot.sql)
--      1 of 1 ALTER present; 1 of 1 COMMENT present.
-- ───────────────────────────────────────────────────────────────────────────────────────────────

alter table public.nutrition_targets add column if not exists weight_lb numeric;

comment on column public.nutrition_targets.weight_lb is
  'What the athlete weighed, in lb, when this target was written — a SNAPSHOT, never recalculated. Drives the "your weight has changed since these targets were set" review prompt. Null = no weigh-in existed at the time, so no comparison can be drawn.';


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §2 — the assertion. Silence is success; this RAISES if the column is missing.
-- ───────────────────────────────────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'nutrition_targets' and column_name = 'weight_lb'
  ) then
    raise exception '0209 FAILED — nutrition_targets.weight_lb absent after the alter';
  end if;
end $$;


-- ───────────────────────────────────────────────────────────────────────────────────────────────
-- §3 — the report. Read-only. rows_with_weight should be 0 until the client is deployed.
-- ───────────────────────────────────────────────────────────────────────────────────────────────

select
  'nutrition_targets.weight_lb' as column,
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'nutrition_targets' and column_name = 'weight_lb') = 1 as present,
  (select count(*) from public.nutrition_targets) as target_rows,
  (select count(*) from public.nutrition_targets where weight_lb is not null) as rows_with_weight;
