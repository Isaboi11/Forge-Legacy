/**
 * ══ HOLT FILLS THE WEEK ══ — PO 2026-09-26: *"I tried having it build me a week"* (a week of one cookie
 * recipe and "No lunch fits your setup yet" everywhere), then *"yes I agree with the holt call."*
 *
 * The planner only plans from the recipe book (NUT-A2-D5), and the book is the PO's six recipes since the 40
 * starters were removed. When a slot is empty, Holt's Kitchen (`coach-kitchen`) writes dishes for it inside the
 * setup — meal, cook time, household, diet, allergens, dislikes — and NUT-A2-D8 lets them join a plan once they
 * are in My Recipes with every ingredient matched. Only fully-matched dishes are offered (an unmatched line
 * would leave the allergens unknown, which D5 counts as excluded).
 *
 * ⚠ THE ATHLETE CONFIRMS. A user recipe's allergens are a planning constraint only once a person confirms them
 * (`user-recipes.ts`). The screen shows each dish with the allergens the app derived, and the one tap that
 * adds them is that confirmation — `formForPlan` marks them confirmed only on that path.
 */
import { draftFromRead } from './recipe-import.ts';
import { dietAvoid, type DishCard } from './kitchen-cards.ts';
import { detectAllergens } from './user-recipes.ts';
import type { RecipeForm } from './user-recipes.ts';
import type { MealPlanPrefs } from './meal-plan-setup.ts';
import type { PlanDay } from './meal-planner.ts';
import type { PlanSlot } from './recipes-data.ts';

const WORD: Record<PlanSlot, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snack' };

/** The setup's meals that are empty on at least one day, in the setup's order. */
export function emptySlots(days: readonly PlanDay[], meals: readonly PlanSlot[]): PlanSlot[] {
  return meals.filter((s) => days.some((d) => !d.items.some((it) => it.slot === s && !it.extra)));
}

/** Does this day have a setup meal with nothing in it? Then the fix is dishes, not "add a snack". */
export function dayHasEmptySlot(day: PlanDay, meals: readonly PlanSlot[]): boolean {
  return meals.some((s) => !day.items.some((it) => it.slot === s && !it.extra));
}

/** Holt's words for one slot — the setup's limits in a sentence (the `ask` field; no function change needed). */
export function fillAsk(slot: PlanSlot, p: Pick<MealPlanPrefs, 'cookMinutes' | 'household' | 'weeklyBudgetUsd'>): string {
  const parts = [`${WORD[slot]} ideas for my weekly meal plan`];
  if (p.household > 1) parts.push(`cooking for ${p.household}`);
  if (p.cookMinutes) parts.push(`each ready in ${p.cookMinutes} minutes or less`);
  if (slot === 'lunch' || slot === 'dinner') parts.push('good as leftovers');
  if (p.weeklyBudgetUsd) parts.push('on a budget');
  return `${parts.join(', ')}.`;
}

/** Allergens (as words), the diet's groups, and the athlete's dislikes — all hard rules for Holt. */
export function fillAvoid(p: Pick<MealPlanPrefs, 'allergens' | 'diet' | 'dislikes'>): string[] {
  return [...p.allergens.map((a) => a.replace(/_/g, ' ')), ...dietAvoid(p.diet), ...p.dislikes].slice(0, 12);
}

/** Only dishes the planner can take: every line matched, and inside the cook-time limit. */
export function plannable(cards: readonly DishCard[], cookMinutes: number | null): DishCard[] {
  return cards.filter((c) => c.unmatched === 0 && (!cookMinutes || !c.minutes || c.minutes <= cookMinutes));
}

/**
 * A dish → a My Recipes form the planner can use. ⚠ `confirmed: true` is set here ONLY because this is called
 * from the athlete's "Add these" tap on a list that showed every dish's allergens (see the header).
 */
export function formForPlan(c: DishCard, slot: PlanSlot): RecipeForm {
  const draft = draftFromRead({ ...c.read, mealType: slot });
  const form = draft.form;
  return {
    ...form,
    name: c.name.slice(0, 40),
    mealTypes: [slot],
    minutes: c.minutes ?? form.minutes,
    allergens: detectAllergens(form.ingredients),
    confirmed: true,
    usePlan: true,
  };
}

/** The allergens a card will carry, in words, for the review list. */
export function allergenLine(c: DishCard): string {
  const found = detectAllergens(draftFromRead(c.read).form.ingredients);
  return found.length ? found.map((a) => a.replace(/_/g, ' ')).join(' · ') : 'No allergens';
}
