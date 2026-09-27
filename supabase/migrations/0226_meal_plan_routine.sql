-- 0226 — Meal Plan: the athlete's routine, a shorter grocery list, my-recipes-only, and Clear week.
--
-- ══ WHY ══
--
-- PO 2026-09-27: "I eat the same breakfast everyday. I have the same lunch every day, but dinner is
-- different. Where as someone might want a different breakfast, same lunch and same dinner, or any
-- combination." — then "it'd be nice to be able to say that we want to just use our recipes", and "we need
-- a button to completely clear the week".
--
-- ══ SHAPE ══
--
-- meal_plan_prefs (0210):
--   routine            jsonb   {"breakfast":"same","lunch":"same","dinner":"vary"} — per meal: same | rotate
--                              | vary. A meal missing from the object is `vary`, which is how every week
--                              planned before this column existed; so the '{}' default changes no one's plan.
--   share_ingredients  boolean prefer recipes that reuse what the week already buys.
--   own_recipes_only   boolean plan from My Recipes alone; Holt is never offered to write dishes.
--
-- meal_plan_weeks (0211):
--   cleared_at         timestamptz  set when the athlete clears the week. A saved EMPTY week is otherwise
--                                   rebuilt every time it opens (`resolveWeek`), so without this mark a
--                                   cleared week would refill itself. null = not cleared.
--
-- Both tables already carry owner-only RLS behind has_nutrition_access(); new columns inherit it.

alter table public.meal_plan_prefs add column if not exists routine jsonb not null default '{}'::jsonb;
alter table public.meal_plan_prefs add column if not exists share_ingredients boolean not null default false;
alter table public.meal_plan_prefs add column if not exists own_recipes_only boolean not null default false;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'meal_plan_prefs_routine_chk') then
    alter table public.meal_plan_prefs add constraint meal_plan_prefs_routine_chk
      check (jsonb_typeof(routine) = 'object');
  end if;
end $$;

alter table public.meal_plan_weeks add column if not exists cleared_at timestamptz;
