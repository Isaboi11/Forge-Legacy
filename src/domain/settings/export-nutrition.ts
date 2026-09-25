/**
 * Export My Data — the nutrition half (pure).
 *
 * The workout CSV (`export-core.ts`) is one row per set, and it stays exactly that. Nutrition is six more
 * tables of different shapes, so an athlete with food data gets one ZIP (`zip.ts`): `workouts.csv` plus
 * one CSV per kind of thing they own. An athlete with no food data gets the plain CSV they always got.
 *
 * ══ WHAT IS THE ATHLETE'S DATA HERE ══
 *
 * What they logged, set, created and chose: the diary, the targets (every one, since NUT-D5 never
 * overwrites), their own foods, saved meals, recipes, the meal plan weeks, and the items they typed onto a
 * grocery list. The grocery list ITSELF is not stored (0212: it is derived from the week's cooks every
 * time), so the file carries the week's plan it comes from rather than a copy of a derivation.
 */

import { csvCell } from './export-core.ts';
import { INGREDIENTS, type IngredientKey } from '../nutrition/recipes-data.ts';

export interface ExportFoodEntry {
  loggedOn: string;
  meal: string;
  name: string;
  brand: string | null;
  servingLabel: string | null;
  quantity: number;
  grams: number | null;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  source: string;
}

export interface ExportTarget {
  effectiveFrom: string;
  method: string;
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  weightLb: number | null;
}

export interface ExportCustomFood {
  name: string;
  brand: string | null;
  gtin: string | null;
  kcal100: number | null;
  protein100: number | null;
  carb100: number | null;
  fat100: number | null;
  servings: { label: string; grams: number | null }[];
}

export interface ExportMealItem {
  name: string;
  brand: string | null;
  servingLabel: string | null;
  quantity: number;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
}

export interface ExportSavedMeal {
  name: string;
  items: ExportMealItem[];
}

export interface ExportRecipe {
  /** As plan weeks refer to it: `u:<uuid>`. */
  id: string;
  name: string;
  mealTypes: string[];
  minutes: number;
  yield: number;
  ingredients: { key: string; g: number }[];
  allergens: string[];
  confirmed: boolean;
  steps: string[];
  usePlan: boolean;
}

export interface ExportPlanItem {
  slot: string;
  recipeId: string;
  portion?: number;
  leftover?: boolean;
  extra?: boolean;
}

export interface ExportPlanWeek {
  weekStart: string;
  days: { items: ExportPlanItem[] }[];
  /** The athlete's own grocery items (0212 `extras`) and which of them are in the cart. */
  groceryExtras: { name: string; inCart: boolean }[];
}

export interface ExportNutrition {
  entries: ExportFoodEntry[];
  targets: ExportTarget[];
  foods: ExportCustomFood[];
  meals: ExportSavedMeal[];
  recipes: ExportRecipe[];
  weeks: ExportPlanWeek[];
}

/** Does this athlete have any food data at all? No means the export stays the plain workout CSV. */
export function hasNutrition(n: ExportNutrition): boolean {
  return (
    n.entries.length > 0 ||
    n.targets.length > 0 ||
    n.foods.length > 0 ||
    n.meals.length > 0 ||
    n.recipes.length > 0 ||
    n.weeks.length > 0
  );
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function csv(headers: readonly string[], rows: unknown[][]): string {
  const lines = [headers.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))];
  return `${lines.join('\r\n')}\r\n`;
}

/** `2026-09-21` + 2 → `2026-09-23`, by calendar, not by clock (UTC arithmetic, no DST drift). */
export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  const p = (x: number) => String(x).padStart(2, '0');
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}`;
}

/** An ingredient's name, or its key if the catalogue no longer carries it (never a blank cell). */
const ingredientName = (key: string): string => INGREDIENTS[key as IngredientKey]?.name ?? key;

export const FOOD_LOG_HEADERS = ['Date', 'Meal', 'Food', 'Brand', 'Serving', 'Quantity', 'Grams', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)', 'Source'] as const;
export const TARGET_HEADERS = ['Effective from', 'Method', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)', 'Weight (lb)'] as const;
export const MY_FOOD_HEADERS = ['Food', 'Brand', 'Barcode', 'Calories per 100 g', 'Protein per 100 g', 'Carbs per 100 g', 'Fat per 100 g', 'Servings'] as const;
export const MY_MEAL_HEADERS = ['Meal', 'Food', 'Brand', 'Serving', 'Quantity', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)'] as const;
export const RECIPE_HEADERS = ['Recipe', 'Meal types', 'Minutes', 'Servings', 'Allergens', 'Allergens confirmed', 'Use in my plans', 'Line', 'Item', 'Grams'] as const;
export const PLAN_HEADERS = ['Week of', 'Date', 'Meal', 'Recipe', 'Portion', 'Leftover'] as const;
export const GROCERY_HEADERS = ['Week of', 'Item', 'In cart'] as const;

const SOURCE_LABEL: Record<string, string> = { usda: 'USDA', off: 'Open Food Facts', fs: 'FatSecret', custom: 'My food', quick: 'Quick add' };

/**
 * The nutrition CSVs, in the order a person would look for them. Every file is present even when empty
 * (headings, no rows): a missing file reads as "the export forgot it", an empty one as "you have none".
 *
 * `builtInRecipeName` resolves a recipe id that is not the athlete's own (the app's recipe book); the
 * caller passes it so this stays free of the planner's mutable registry.
 */
export function nutritionCsvFiles(
  n: ExportNutrition,
  builtInRecipeName: (id: string) => string | null,
): { name: string; text: string }[] {
  const recipeName = new Map(n.recipes.map((r) => [r.id, r.name]));
  const nameOf = (id: string) => recipeName.get(id) ?? builtInRecipeName(id) ?? id;

  const foodLog = n.entries.map((e) => [
    e.loggedOn,
    cap(e.meal),
    e.name,
    e.brand ?? '',
    e.servingLabel ?? '',
    e.quantity,
    e.grams ?? '',
    e.kcal,
    e.protein,
    e.carb,
    e.fat,
    SOURCE_LABEL[e.source] ?? e.source,
  ]);

  const targets = n.targets.map((t) => [t.effectiveFrom, cap(t.method), t.kcal, t.proteinG, t.carbG, t.fatG, t.weightLb ?? '']);

  const foods = n.foods.map((f) => [
    f.name,
    f.brand ?? '',
    f.gtin ?? '',
    f.kcal100 ?? '',
    f.protein100 ?? '',
    f.carb100 ?? '',
    f.fat100 ?? '',
    f.servings.map((s) => (s.grams != null ? `${s.label} (${s.grams} g)` : s.label)).join('; '),
  ]);

  const meals: unknown[][] = [];
  for (const m of n.meals) {
    /* A meal with no items is still a meal the athlete named — one row keeps it in the file. */
    if (!m.items.length) meals.push([m.name, '', '', '', '', '', '', '', '']);
    for (const it of m.items) {
      meals.push([m.name, it.name, it.brand ?? '', it.servingLabel ?? '', it.quantity, it.kcal, it.protein, it.carb, it.fat]);
    }
  }

  const recipes: unknown[][] = [];
  for (const r of n.recipes) {
    const head = [r.name, r.mealTypes.map(cap).join('; '), r.minutes, r.yield, r.allergens.join('; '), r.confirmed ? 'Yes' : 'No', r.usePlan ? 'Yes' : 'No'];
    if (!r.ingredients.length && !r.steps.length) recipes.push([...head, '', '', '']);
    for (const ing of r.ingredients) recipes.push([...head, 'Ingredient', ingredientName(ing.key), ing.g]);
    r.steps.forEach((s, i) => recipes.push([...head, `Step ${i + 1}`, s, '']));
  }

  const plan: unknown[][] = [];
  const grocery: unknown[][] = [];
  for (const w of n.weeks) {
    w.days.forEach((day, d) => {
      for (const it of day.items ?? []) {
        plan.push([w.weekStart, addDays(w.weekStart, d), cap(it.extra ? 'snack (added)' : it.slot), nameOf(it.recipeId), it.portion ?? 1, it.leftover ? 'Yes' : 'No']);
      }
    });
    for (const g of w.groceryExtras) grocery.push([w.weekStart, g.name, g.inCart ? 'Yes' : 'No']);
  }

  return [
    { name: 'food-log.csv', text: csv(FOOD_LOG_HEADERS, foodLog) },
    { name: 'nutrition-targets.csv', text: csv(TARGET_HEADERS, targets) },
    { name: 'my-foods.csv', text: csv(MY_FOOD_HEADERS, foods) },
    { name: 'my-meals.csv', text: csv(MY_MEAL_HEADERS, meals) },
    { name: 'my-recipes.csv', text: csv(RECIPE_HEADERS, recipes) },
    { name: 'meal-plans.csv', text: csv(PLAN_HEADERS, plan) },
    { name: 'grocery-items-i-added.csv', text: csv(GROCERY_HEADERS, grocery) },
  ];
}

/**
 * Text files → ZIP entries. A byte-order mark leads each CSV: Excel on Windows reads a UTF-8 CSV as the
 * system codepage without one (the same reason `save-file.web.ts` adds it), and every other reader
 * ignores it.
 */
export function toZipEntries(files: { name: string; text: string }[]): { name: string; data: Uint8Array }[] {
  const enc = new TextEncoder();
  return files.map((f) => ({ name: f.name, data: enc.encode(`﻿${f.text}`) }));
}
