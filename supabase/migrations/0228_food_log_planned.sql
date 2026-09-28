-- 0228 — Plan ahead: a diary row can be PLANNED (not eaten yet) and checked off when it is.
--
-- ══ WHY ══
--
-- PO 2026-09-27: "an arrow that goes forward into the future so that you can scroll down to the 'today's meal'
-- section for tomorrow and basically plan and pre log, and then when tomorrow comes it will all be down there
-- with a check box next to it for when you actually eat it." Then: unchecked food counts toward NOTHING, a
-- check is what logs it, and an item never checked stays unchecked on its day.
--
-- ══ SHAPE ══
--
-- food_log_entries (0205):
--   planned     boolean  true = on the plan, not eaten. Counts toward nothing — no ring, no week, no Holt read.
--                        The check sets it false; unchecking sets it back.
--   pre_logged  boolean  true = the row was put on a day AHEAD of time. Never changes after the insert, so a
--                        checked row still shows in the day's checklist (ticked) and can be unticked.
--
-- Meal Plan meals are NOT copied in here: Nutrition Home reads the saved week (`meal_plan_weeks`) and draws each
-- meal as an unchecked item; the check writes the real row, as "Log meal" always has, on the PLANNED day.
--
-- ⚠ EVERY READ THAT SUMS THE DIARY MUST SKIP `planned`. In the app that is `fetchDay` (planned rows come back
-- separately), `fetchRangeTotals`, Recent foods, the export, and Holt's `get_nutrition_log`.
--
-- ⚠ THE BACKFILL: a row already on a day after today was copied there by Meal Detail (meal prep) and would have
-- counted by itself when the day came. It now waits for its check like any other pre-logged row. `current_date`
-- is the server's UTC date, which is at or ahead of every athlete's local date — so this can only miss a row
-- (which then counts as before), never flag one on a day that has already begun.
--
-- The table's owner-only RLS (0206) covers the new columns.

alter table public.food_log_entries add column if not exists planned boolean not null default false;
alter table public.food_log_entries add column if not exists pre_logged boolean not null default false;

update public.food_log_entries
   set planned = true, pre_logged = true
 where logged_on > current_date
   and pre_logged = false;
