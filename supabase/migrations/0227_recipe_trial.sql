-- 0227 — Holt's dishes are TRIAL recipes until the athlete saves them.
--
-- ══ WHY ══
--
-- PO 2026-09-27: "I saved a week meal plan and it saved all of the meals into my recipes … but I don't want
-- to save them all cause I haven't even tried them. … it should only add if I go into that meal or recipe
-- and have a button to add to my [recipes]."
--
-- "Let Holt fill them" has to store Holt's dishes somewhere the planner can plan from and a stored week can
-- name (`u:<id>`), and that place was `user_recipes` — so every accepted dish landed in My Recipes.
--
-- ══ SHAPE ══
--
-- user_recipes.trial boolean — true = one of Holt's dishes, in the plan but NOT in My Recipes. The Recipe
-- screen's "Save to My Recipes" sets it false. Default false, so every recipe that exists today stays
-- exactly where it is. Owner-only RLS (0213) already covers the column; deleting a recipe was always granted.

alter table public.user_recipes add column if not exists trial boolean not null default false;
