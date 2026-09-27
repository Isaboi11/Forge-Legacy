-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- PENDING — 0227: Holt's dishes stay out of My Recipes until you save them
--
-- PASTE THIS WHOLE FILE into the Supabase SQL editor and run it once.
-- Safe to run twice: the one statement is guarded, and §3 is read-only.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
--
-- ══ WHAT THIS IS FOR ══
--
-- PO 2026-09-27: filling a week with Holt's dishes put every one of them in My Recipes (and the Recipes tab
-- of My Foods) before any had been cooked. Now they are TRIAL recipes: the week plans from them, the lists
-- don't show them, and opening one offers "Save to My Recipes".
--
-- ══ WHAT THIS FILE DOES ══
--
-- §1  adds user_recipes.trial (boolean, not null, default false)
-- §2  asserts the column exists, and RAISES if not
-- §3  reports recipes, and how many are trial. Read-only.
--
-- ⚠ THE DEFAULT CHANGES NOTHING THAT EXISTS. Every recipe already saved — including Holt's dishes from
-- earlier fills — stays in My Recipes. Those can now be deleted from the recipe's own screen.
--
-- ⚠ BEFORE THIS IS PASTED the app still works, but a Holt fill saves its dishes into My Recipes as it
-- did before. Paste this BEFORE the next fill.
--
-- ⚠ APPLYING IS NOT THE SAME AS WORKING. Expect §3 to report trial = 0 until the client ships and a fill runs.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════


-- ═════════════════════════════════════════════════════════════════════════════
-- §1 — the migration, verbatim from supabase/migrations/0227_recipe_trial.sql
-- ═════════════════════════════════════════════════════════════════════════════

alter table public.user_recipes add column if not exists trial boolean not null default false;


-- ═════════════════════════════════════════════════════════════════════════════
-- §2 — ASSERT IT TOOK.
-- ═════════════════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'user_recipes' and column_name = 'trial') then
    raise exception '0227 did not take — missing: user_recipes.trial';
  end if;
end $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- §3 — REPORT. Read-only. Expected now: recipes = today's count, trial = 0.
-- ═════════════════════════════════════════════════════════════════════════════

select
  (select count(*) from public.user_recipes)              as recipes,
  (select count(*) from public.user_recipes where trial)  as trial;
