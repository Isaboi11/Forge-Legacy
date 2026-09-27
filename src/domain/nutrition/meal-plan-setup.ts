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

/**
 * How a meal repeats across the week (PO 09-27: *"I eat the same breakfast everyday. I have the same lunch every
 * day, but dinner is different. Where as someone might want a different breakfast, same lunch and same dinner, or
 * any combination."*). Asked per meal, so every combination is one answer each.
 *  · `same`   — one recipe on all seven days.
 *  · `rotate` — a few (up to `ROTATE_SIZE`) that take turns.
 *  · `vary`   — something different each day: the planner's variety rules, as they were before this question.
 */
export type Routine = 'same' | 'rotate' | 'vary';

export const ROUTINES: readonly { key: Routine; label: string }[] = [
  { key: 'same', label: 'Same' },
  { key: 'rotate', label: 'A few' },
  { key: 'vary', label: 'Mix' },
];

/** The most recipes a `rotate` meal takes turns between. */
export const ROTATE_SIZE = 3;

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
  /*
   * The three below are 0226. Optional because a row saved before it (or a read before it is pasted) has none
   * of them, and "no answer" must plan exactly as the week did before the question existed — read them through
   * `routineOf`, never directly.
   */
  /** Per meal; a missing meal is `vary`. */
  routine?: Partial<Record<MealSlot, Routine>>;
  /** Prefer recipes that reuse what the week already buys — a shorter grocery list. */
  shareIngredients?: boolean;
  /** Plan from My Recipes alone: Forge's library is left out and Holt is never offered to write dishes. */
  ownRecipesOnly?: boolean;
}

/** A meal's routine, `vary` when unanswered. */
export const routineOf = (p: Pick<MealPlanPrefs, 'routine'>, slot: MealSlot): Routine => p.routine?.[slot] ?? 'vary';

const ROUTINE_KEYS: readonly string[] = ROUTINES.map((r) => r.key);

/** A stored routine, kept to known meals and values — a hand-edited or future row never reaches the planner raw. */
export function cleanRoutine(raw: unknown): Partial<Record<MealSlot, Routine>> {
  const out: Partial<Record<MealSlot, Routine>> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const m of PLAN_MEALS) {
    const v = (raw as Record<string, unknown>)[m.key];
    if (typeof v === 'string' && ROUTINE_KEYS.includes(v)) out[m.key] = v as Routine;
  }
  return out;
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
    routine: {},
    shareIngredients: false,
    ownRecipesOnly: false,
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
    /* Only the meals being planned; a meal switched off keeps no routine to surprise anyone later. */
    routine: Object.fromEntries(d.meals.map((m) => [m, routineOf(d, m)])) as Partial<Record<MealSlot, Routine>>,
    shareIngredients: !!d.shareIngredients,
    ownRecipesOnly: !!d.ownRecipesOnly,
  };
}
