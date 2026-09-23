import { portionLabel, type RecipeView } from './meal-planner.ts';
import type { UsMeasure } from './recipes-data.ts';

/**
 * The Recipe screen's arithmetic — amounts, US measures and how many servings to prepare. Built from
 * `Recipe.dc.html`'s logic block; pure so `node --test` can prove the fractions a cook reads off a phone.
 */

const FRACTIONS: Record<string, string> = { '0': '', '0.25': '¼', '0.5': '½', '0.75': '¾' };

/** Round to a kitchen step (¼ or ½) and write it with a fraction glyph. Null when it rounds to nothing. */
function frac(v: number, step: number): string | null {
  const r = Math.round(v / step) * step;
  if (r <= 0) return null;
  const whole = Math.floor(r);
  const f = String(+(r - whole).toFixed(2));
  return (whole ? String(whole) : '') + (FRACTIONS[f] ?? '');
}

function spoons(tsp: number): string {
  if (tsp >= 3) return `${frac(tsp / 3, 0.5)} tbsp`;
  const t = frac(tsp, 0.25);
  return t ? `${t} tsp` : 'pinch';
}

/** The design's US amount: ounces for meat, fish and cheese blocks; cups, spoons or "each" for the rest. */
export function usAmount(us: UsMeasure, grams: number): string {
  if (us.kind === 'oz') return `${(grams / 28.35).toFixed(1).replace(/\.0$/, '')} oz`;
  if (us.kind === 'tsp') return spoons(grams / us.grams);
  if (us.kind === 'cup') {
    const c = grams / us.grams;
    if (c < 0.2) return spoons(c * 48);
    return `${frac(c, 0.25)} ${Math.round(c * 4) / 4 > 1 ? 'cups' : 'cup'}`;
  }
  const n = grams / us.grams;
  return `${frac(n, 0.5) || '½'} ${n > 1.25 ? us.many : us.one}`;
}

/** Grams as a cook reads them: whole grams, a decimal under 10, "pinch" under half a gram. */
export function metricAmount(grams: number): string {
  if (grams < 0.5) return 'pinch';
  if (grams < 10) return `${String(+grams.toFixed(1))} g`;
  return `${Math.round(grams).toLocaleString('en-US')} g`;
}

export interface IngredientRow {
  key: string;
  name: string;
  metric: string;
  /** Null when metric is all the athlete asked for. */
  us: string | null;
}

export function ingredientRows(view: Pick<RecipeView, 'ingredients'>, servings: number, showUs: boolean): IngredientRow[] {
  return view.ingredients.map((ing, i) => {
    const g = ing.g * servings;
    const metric = metricAmount(g);
    return {
      key: `${ing.key}-${i}`,
      name: ing.name,
      metric,
      /* A pinch is a pinch in any system — saying it twice is noise. */
      us: showUs && metric !== 'pinch' && ing.us ? usAmount(ing.us, g) : null,
    };
  });
}

/* ── how much to prepare ────────────────────────────────────────────────── */

export interface ServingsContext {
  /** From Meal Plan Setup. */
  household: number;
  /** Servings per person the plan set for this meal (¾ · 1 · 1¼ · 1½). Everyone eats the same. */
  portion: number;
  /** This meal is last night's batch dinner, eaten again. */
  leftover: boolean;
  /** This dinner also feeds tomorrow's lunch — the day name, or null. */
  makesLunchFor: string | null;
  /** The day it was cooked, for a leftover. */
  cookedOn: string | null;
  /** "dinner", "lunch"… */
  slot: string;
  /** Opened from the plan. Without a plan there is no household to prepare for. */
  fromPlan: boolean;
}

export interface Servings {
  options: number[];
  defaultN: number;
  planned: number | null;
}

/**
 * The design's rule, and `Recipe Schema and Planner Rules` §3 "Servings to prepare": the Recipe screen
 * defaults to what the COOK makes — `people × portion × (1 + meals fed by leftovers)` — not the household
 * size. The other option is your own portion. A leftover prepares nothing: it offers your portion only.
 */
export function servingsFor(c: ServingsContext): Servings {
  if (!c.fromPlan) return { options: [1], defaultN: 1, planned: null };
  const mine = c.portion || 1;
  if (c.leftover) return { options: [mine], defaultN: mine, planned: null };
  const planned = Math.max(1, c.household) * mine * (c.makesLunchFor ? 2 : 1);
  const options = [...new Set([mine, planned])];
  return { options, defaultN: options[options.length - 1], planned };
}

/** The line under Ingredients that says what the amounts are FOR. Empty when 1 serving says it all. */
export function batchNote(c: ServingsContext, n: number, planned: number | null): string {
  if (c.leftover && c.cookedOn) return `Cooked with ${c.cookedOn} dinner. Reheat ${servingsLabel(c.portion || 1)}.`;
  if (planned == null || n !== planned || planned === (c.portion || 1)) return '';
  return c.makesLunchFor
    ? `${servingsLabel(planned)} · ${c.slot} for ${c.household} + ${c.makesLunchFor} lunch for ${c.household}`
    : `${servingsLabel(planned)} · ${c.slot} for ${c.household}`;
}

/** "1 serving", "2½ servings" — fractions as a cook reads them. */
export const servingsLabel = (n: number): string => (Number.isInteger(n * 4) ? portionLabel(n) : `${n} servings`);
