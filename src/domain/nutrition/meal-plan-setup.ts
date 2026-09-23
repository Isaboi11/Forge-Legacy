import type { MealSlot, Targets } from './day.ts';
import { adultYear, ageFrom, isUnderAge } from './targets.ts';

/**
 * Meal Plan Setup — the first screen of Nutrition Phase 3, built from `Meal Plan Setup.dc.html`.
 *
 * Pure and relative-imported so `node --test` can prove the two things on this screen that matter:
 * the doors it keeps shut (under 18, no target) and the allergy question that cannot be skipped.
 *
 * ⚠ **ALLERGIES MUST BE ANSWERED, NOT DEFAULTED.** NUT-D6 makes allergens a hard constraint on every
 * plan. So the screen starts with NEITHER "No allergies" nor "Add allergies" chosen, and Continue stays
 * shut until one is — "never asked" and "none" must not look the same, here or in `meal_plan_prefs`
 * (0210), where a saved row with an empty array is the athlete saying "none" on purpose.
 */

export type Diet = 'anything' | 'vegetarian' | 'vegan' | 'pescatarian';
export type Allergen = 'peanuts' | 'tree_nuts' | 'dairy' | 'eggs' | 'gluten' | 'soy' | 'fish' | 'shellfish' | 'sesame';
/** Minutes, or null for "No limit". */
export type CookTime = 15 | 30 | 45 | null;

export const DIETS: readonly { key: Diet; label: string }[] = [
  { key: 'anything', label: 'Anything' },
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'vegan', label: 'Vegan' },
  { key: 'pescatarian', label: 'Pescatarian' },
];

export const ALLERGENS: readonly { key: Allergen; label: string }[] = [
  { key: 'peanuts', label: 'Peanuts' },
  { key: 'tree_nuts', label: 'Tree nuts' },
  { key: 'dairy', label: 'Dairy' },
  { key: 'eggs', label: 'Eggs' },
  { key: 'gluten', label: 'Gluten' },
  { key: 'soy', label: 'Soy' },
  { key: 'fish', label: 'Fish' },
  { key: 'shellfish', label: 'Shellfish' },
  { key: 'sesame', label: 'Sesame' },
];

/** The same four slots the diary uses, so a plan's meals land in the diary's meals. */
export const PLAN_MEALS: readonly { key: MealSlot; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snacks', label: 'Snacks' },
];

export const COOK_TIMES: readonly { key: CookTime; label: string }[] = [
  { key: 15, label: '15 min' },
  { key: 30, label: '30 min' },
  { key: 45, label: '45 min' },
  { key: null, label: 'No limit' },
];

export const MIN_HOUSEHOLD = 1;
export const MAX_HOUSEHOLD = 8;
export const MAX_DISLIKES = 50;
const MAX_DISLIKE_LENGTH = 30;

export interface MealPlanPrefs {
  diet: Diet;
  /** Empty = "No allergies", said on purpose. */
  allergens: Allergen[];
  dislikes: string[];
  meals: MealSlot[];
  cookMinutes: CookTime;
  household: number;
  /** Whole dollars a week, or null for no budget. Only ever an ESTIMATE target (NUT-D3). */
  weeklyBudgetUsd: number | null;
}

/** What the screen holds while it is being filled in. `allergyMode` null = not answered yet. */
export interface SetupDraft extends MealPlanPrefs {
  allergyMode: 'none' | 'add' | null;
}

/** The `.dc`'s starting state for someone who has never set up: every default, allergies unanswered. */
export function freshDraft(): SetupDraft {
  return {
    diet: 'anything',
    allergyMode: null,
    allergens: [],
    dislikes: [],
    meals: ['breakfast', 'lunch', 'dinner'],
    cookMinutes: 30,
    household: 1,
    weeklyBudgetUsd: null,
  };
}

/**
 * Reopening a saved setup: every answer as they left it. A saved row means the allergy question WAS
 * answered, so the mode is derived from it — never left null, which would re-lock Continue on
 * someone who already said "none".
 */
export function draftFrom(saved: MealPlanPrefs | null): SetupDraft {
  if (!saved) return freshDraft();
  return { ...saved, allergyMode: saved.allergens.length ? 'add' : 'none' };
}

/* ── the doors ──────────────────────────────────────────────────────────── */

export type SetupGate = { kind: 'under-age'; unlockYear: number | null } | { kind: 'no-target' } | null;

/**
 * Why no plan can be set up, in the order that matters.
 *
 * ⛔ AGE FIRST, AND IT ANSWERS ALONE — the same order as `blockerFor`. An under-18 athlete MAY hold a
 * manual target (NUT-D5 allows it, with the floors), so "has a target" is not enough: a plan built
 * around it would be Forge planning a growing body's intake, which is the line NUT-D5 draws.
 *
 * Then the target: a plan is fitted to the athlete's own number (NUT-A2-D3), and without one there is
 * nothing to fit — Forge does not invent a calorie figure to plan against.
 */
export function setupGate(birthYear: number | null, target: Targets | null, todayIso: string): SetupGate {
  if (isUnderAge(ageFrom(birthYear, todayIso))) return { kind: 'under-age', unlockYear: adultYear(birthYear) };
  if (!target || !(target.kcal > 0)) return { kind: 'no-target' };
  return null;
}

/* ── the button ─────────────────────────────────────────────────────────── */

/**
 * The line under the button, when it is shut. Empty string = the button may be pressed. Written in the
 * `.dc`'s words, which say what to do rather than what is wrong.
 */
export function blockedNote(step: 1 | 2, d: SetupDraft): string {
  if (step === 1) {
    if (d.allergyMode == null) return 'Answer allergies to continue.';
    if (d.allergyMode === 'add' && d.allergens.length === 0) return 'Pick at least one allergy, or choose No allergies.';
    return '';
  }
  if (d.meals.length === 0) return 'Pick at least one meal.';
  return '';
}

/* ── editing ────────────────────────────────────────────────────────────── */

/**
 * Add what was typed as a dislike. Trimmed, lower-cased, de-duplicated, capped — the `.dc` lower-cases
 * so "Mushrooms" and "mushrooms" are one tag, and the planner matches on it later.
 */
export function addDislike(list: string[], typed: string): string[] {
  const v = typed.trim().replace(/\s+/g, ' ').toLowerCase().slice(0, MAX_DISLIKE_LENGTH);
  if (!v || list.includes(v) || list.length >= MAX_DISLIKES) return list;
  return [...list, v];
}

export function toggleAllergen(list: Allergen[], a: Allergen): Allergen[] {
  return list.includes(a) ? list.filter((x) => x !== a) : ALLERGENS.map((x) => x.key).filter((k) => k === a || list.includes(k));
}

/** Toggle a meal, keeping the diary's order (breakfast → snacks) whatever order they were tapped in. */
export function toggleMeal(list: MealSlot[], m: MealSlot): MealSlot[] {
  return list.includes(m) ? list.filter((x) => x !== m) : PLAN_MEALS.map((x) => x.key).filter((k) => k === m || list.includes(k));
}

export const clampHousehold = (n: number): number => Math.min(MAX_HOUSEHOLD, Math.max(MIN_HOUSEHOLD, Math.round(n)));

/** The budget field: digits only, five at most, and empty or zero means no budget. */
export function parseBudget(typed: string): { text: string; value: number | null } {
  const text = typed.replace(/\D/g, '').replace(/^0+/, '').slice(0, 5);
  return { text, value: text ? Number(text) : null };
}

/**
 * What gets saved. "No allergies" saves an EMPTY list even if chips were tapped before switching back —
 * the answer on screen is the answer kept.
 */
export function prefsFrom(d: SetupDraft): MealPlanPrefs {
  return {
    diet: d.diet,
    allergens: d.allergyMode === 'add' ? d.allergens : [],
    dislikes: d.dislikes,
    meals: d.meals,
    cookMinutes: d.cookMinutes,
    household: clampHousehold(d.household),
    weeklyBudgetUsd: d.weeklyBudgetUsd && d.weeklyBudgetUsd > 0 ? d.weeklyBudgetUsd : null,
  };
}
