import type { Targets } from './day.ts';
import type { Allergen, MealPlanPrefs } from './meal-plan-setup.ts';
import {
  INGREDIENTS,
  RECIPE_SOURCES,
  type PlanSlot,
  type ProteinSource,
  type RecipeSource,
  type RecipeStep,
  type Reheat,
  type UsMeasure,
} from './recipes-data.ts';

/**
 * The week planner — Nutrition Architecture §6 steps 1–5, to the rules in `Recipe Schema and Planner
 * Rules.md` (Claude Design b029488a; PO: "the rules are good", 2026-09-23). Pure so `node --test` can prove
 * every rule it claims.
 *
 * ⚠ **EVERY NUMBER IS COMPUTED FROM INGREDIENTS** (NUT-D4, §6 step 4). A recipe's calories and macros are
 * the sum of its ingredients' USDA figures × grams (`recipes-data.ts`), never a typed-in total.
 *
 * ⚠ **THE HARD FILTERS ARE NEVER BROKEN** (Rules §3, NUT-D6): diet, allergens, dislikes (matched on
 * INGREDIENTS, never the recipe name), cook time, and the slot being in the recipe's `mealTypes`.
 * Nothing downstream — swap, snack, rebuild, a lock — can put back a recipe `fits()` refused.
 *
 * What the planner optimises, in the rules' priority order:
 *  1. Calories within ±5% of the day's target. Inside the band the day is "met" and says nothing.
 *  2. Protein ≥ 90% of target.  3. Carbs and fat within ±15%.
 *  · Each slot is scored against ITS share of the day (the allocation table), not an even split.
 *  · A portion scales (¾ · 1 · 1¼ · 1½ servings) before a day is reported short (§3 slot allocation).
 *  · Variety: no recipe twice a week (breakfast up to 3), a protein at most 3×/week and never twice in a
 *    day, a format at most 2×/week. These are heavy penalties, not walls: when the library runs out the
 *    planner REPEATS AND SAYS SO (`repeated`), the PO's choice for open question 1 (2026-09-23).
 *  · Leftovers: a dinner that keeps (`leftoverDays ≥ 1`, reheat ≠ poor) feeds a later lunch — tomorrow
 *    first, later within its keep days (PO: yes, a leftover may go further). At most 4 a week.
 *  · Locked and LOGGED meals survive a rebuild; locking a dinner that feeds a leftover locks that too.
 *
 * PO answers 2026-09-23: macro targets come from the Targets screen; everyone in the household eats the
 * same portion (so cooked servings = people × portion × meals fed).
 */

export type RecipeDiet = 'any' | 'pescatarian' | 'vegetarian' | 'vegan';
export type PlanSlotName = PlanSlot;

export interface Recipe {
  id: string;
  slot: PlanSlot;
  mealTypes: readonly PlanSlot[];
  name: string;
  minutes: number;
  /** Per ONE serving, rounded once from the ingredient sum. */
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  allergens: Allergen[];
  diet: RecipeDiet;
  /** Lower-cased ingredient names and keys — what a dislike is matched against. */
  ingredientNames: string[];
  leftoverDays: number;
  reheat: Reheat;
  proteinSource: ProteinSource;
  format: string;
  /** Can a cooked batch feed a later lunch? */
  keeps: boolean;
}

const ALLERGEN_ORDER: Allergen[] = ['peanuts', 'tree_nuts', 'dairy', 'eggs', 'gluten', 'soy', 'fish', 'shellfish', 'sesame'];

export function deriveRecipe(src: RecipeSource): Recipe {
  let kcal = 0, protein = 0, carb = 0, fat = 0;
  const allergens = new Set<Allergen>();
  const classes = new Set<string>();
  for (const [key, grams] of src.ingredients) {
    const ing = INGREDIENTS[key];
    kcal += (ing.kcal * grams) / 100;
    protein += (ing.protein * grams) / 100;
    carb += (ing.carb * grams) / 100;
    fat += (ing.fat * grams) / 100;
    ing.allergens.forEach((a) => allergens.add(a));
    classes.add(ing.diet);
  }
  const diet: RecipeDiet = classes.has('meat')
    ? 'any'
    : classes.has('fish') || classes.has('shellfish')
      ? 'pescatarian'
      : classes.has('animal')
        ? 'vegetarian'
        : 'vegan';
  return {
    id: src.id,
    slot: src.slot,
    mealTypes: src.mealTypes,
    name: src.name,
    minutes: src.minutes,
    kcal: Math.round(kcal),
    protein: Math.round(protein),
    carb: Math.round(carb),
    fat: Math.round(fat),
    allergens: ALLERGEN_ORDER.filter((a) => allergens.has(a)),
    diet,
    ingredientNames: src.ingredients.flatMap(([key]) => [INGREDIENTS[key].name.toLowerCase(), key.replace(/_/g, ' ')]),
    leftoverDays: src.leftoverDays,
    reheat: src.reheat,
    proteinSource: src.proteinSource,
    format: src.format,
    keeps: src.leftoverDays >= 1 && src.reheat !== 'poor',
  };
}

/** Forge's own library — empty since 2026-09-24 until the PO's recipes land (`recipes-data.ts`). */
export let RECIPES: readonly Recipe[] = RECIPE_SOURCES.map(deriveRecipe);

/* ── the recipe book: Forge's recipes + the athlete's own ───────────────── */

export interface RecipeViewIngredient {
  /** A Forge catalogue key (`recipes-data.ts` INGREDIENTS) — what the grocery list buys. */
  key: string;
  name: string;
  /** Grams in ONE serving. */
  g: number;
  us: UsMeasure | null;
}

/** What the Recipe screen and the Grocery List read: the same shape for Forge's recipes and the athlete's. */
export interface RecipeView {
  id: string;
  name: string;
  minutes: number;
  equipment: readonly string[];
  steps: readonly RecipeStep[];
  ingredients: RecipeViewIngredient[];
  /** The athlete wrote it (My Recipes). */
  mine: boolean;
}

const starterView = (src: RecipeSource): RecipeView => ({
  id: src.id,
  name: src.name,
  minutes: src.minutes,
  equipment: src.equipment,
  steps: src.steps,
  ingredients: src.ingredients.map(([key, g]) => ({ key, name: INGREDIENTS[key].name, g, us: INGREDIENTS[key].us })),
  mine: false,
});

/**
 * Every recipe by id — Forge's, plus the athlete's own once `registerUserRecipes` has run. Mutable on
 * purpose: My Recipes registers into it after reading them, and every reader (the planner, a stored
 * week, the Recipe screen, the Grocery List) resolves ids through here.
 *
 * ⚠ **READ YOUR RECIPES BEFORE YOU READ A WEEK.** A stored week naming `u:…` with the athlete's recipes
 * not yet registered looks unreadable, and `resolveWeek` would rebuild it. Screens wait for the recipes
 * query before resolving.
 */
export const RECIPE_BY_ID: Record<string, Recipe> = Object.fromEntries(RECIPES.map((r) => [r.id, r]));
const VIEW_BY_ID: Record<string, RecipeView> = Object.fromEntries(RECIPE_SOURCES.map((s) => [s.id, starterView(s)]));
let USER_RECIPES: Recipe[] = [];

export const recipeView = (id: string): RecipeView | undefined => VIEW_BY_ID[id];

/**
 * Replace Forge's own library. The app never calls this (it ships `RECIPE_SOURCES`); the planner, grocery
 * and recipe-view tests load the 40 retired starter recipes through it so they still plan from a real book.
 */
export function setForgeRecipes(sources: readonly RecipeSource[]): void {
  for (const r of RECIPES) {
    delete RECIPE_BY_ID[r.id];
    delete VIEW_BY_ID[r.id];
  }
  RECIPES = sources.map(deriveRecipe);
  for (const r of RECIPES) RECIPE_BY_ID[r.id] = r;
  for (const s of sources) VIEW_BY_ID[s.id] = starterView(s);
}

/** Replace the athlete's recipes in the book. `plannable` are the ones the planner may pick. */
export function registerUserRecipes(entries: { recipe: Recipe; view: RecipeView; plannable: boolean }[]): void {
  for (const r of USER_RECIPES) {
    delete RECIPE_BY_ID[r.id];
    delete VIEW_BY_ID[r.id];
  }
  USER_RECIPES = [];
  for (const e of entries) {
    RECIPE_BY_ID[e.recipe.id] = e.recipe;
    VIEW_BY_ID[e.recipe.id] = e.view;
    if (e.plannable) USER_RECIPES.push(e.recipe);
  }
}

/* ── the hard filters ───────────────────────────────────────────────────── */

const DIET_OK: Record<MealPlanPrefs['diet'], RecipeDiet[]> = {
  anything: ['any', 'pescatarian', 'vegetarian', 'vegan'],
  pescatarian: ['pescatarian', 'vegetarian', 'vegan'],
  vegetarian: ['vegetarian', 'vegan'],
  vegan: ['vegan'],
};

/** "mushrooms" matches "mushroom"; "tomatoes" matches "tomato". */
const stem = (s: string): string => s.toLowerCase().trim().replace(/e?s$/, '');

/** Diet, allergens and dislikes — the rules that hold wherever a recipe appears, leftover or not. */
export function fits(r: Recipe, p: MealPlanPrefs): boolean {
  if (!DIET_OK[p.diet].includes(r.diet)) return false;
  if (r.allergens.some((a) => p.allergens.includes(a))) return false;
  const hay = r.ingredientNames.join(' | ');
  return !p.dislikes.some((d) => stem(d) && hay.includes(stem(d)));
}

/** Everything `fits` checks, plus the cook-time cap and the slot. */
export const fitsSlot = (r: Recipe, slot: PlanSlot, p: MealPlanPrefs): boolean =>
  r.mealTypes.includes(slot) && fits(r, p) && (p.cookMinutes == null || r.minutes <= p.cookMinutes);

const pool = (slot: PlanSlot, p: MealPlanPrefs): Recipe[] => [...RECIPES, ...USER_RECIPES].filter((r) => fitsSlot(r, slot, p));

/* ── the plan's shape ───────────────────────────────────────────────────── */

export interface PlanItem {
  slot: PlanSlot;
  recipeId: string;
  /** Servings per person (¾ · 1 · 1¼ · 1½). Everyone in the household eats the same portion. */
  portion: number;
  /** Eaten from an earlier cook. */
  leftover: boolean;
  /** For a leftover: the day (0–6) it was cooked. */
  cookDay?: number;
  /** A snack added to close a gap — not one of the setup's slots. */
  extra?: boolean;
  /** Chosen again past the variety rules because nothing else fit — the plan says so. */
  repeated?: boolean;
}

export interface PlanDay {
  items: PlanItem[];
}

export type Lock = { recipeId: string; leftover: boolean; portion?: number; cookDay?: number };
export type Locks = Record<string, Lock>;

/** Where a meal sits, for locks and log marks: `2-dinner`, or `2-extra` for an added snack. */
export const slotKey = (d: number, it: Pick<PlanItem, 'slot' | 'extra'>): string => `${d}-${it.extra ? 'extra' : it.slot}`;

export const PORTIONS = [0.75, 1, 1.25, 1.5] as const;
export const MAX_LEFTOVERS = 4;
export const LEFTOVER_MINUTES = 5;

/* ── slot allocation (Rules §3) ─────────────────────────────────────────── */

const SLOT_ORDER: PlanSlot[] = ['breakfast', 'lunch', 'dinner', 'snacks'];
const SHARE_TABLE: Record<string, Partial<Record<PlanSlot, number>>> = {
  'breakfast,lunch,dinner': { breakfast: 0.28, lunch: 0.34, dinner: 0.38 },
  'breakfast,lunch,dinner,snacks': { breakfast: 0.24, lunch: 0.28, dinner: 0.34, snacks: 0.14 },
  'lunch,dinner': { lunch: 0.45, dinner: 0.55 },
  'lunch,dinner,snacks': { lunch: 0.38, dinner: 0.46, snacks: 0.16 },
  'breakfast,dinner': { breakfast: 0.4, dinner: 0.6 },
};
const BASE_WEIGHT: Record<PlanSlot, number> = { breakfast: 24, lunch: 28, dinner: 34, snacks: 14 };

/** Each chosen slot's share of the day. The rules' table where it has a row; proportional otherwise. */
export function slotShares(meals: readonly PlanSlot[]): Partial<Record<PlanSlot, number>> {
  const slots = SLOT_ORDER.filter((s) => meals.includes(s));
  const row = SHARE_TABLE[slots.join(',')];
  if (row) return row;
  const total = slots.reduce((t, s) => t + BASE_WEIGHT[s], 0);
  return Object.fromEntries(slots.map((s) => [s, BASE_WEIGHT[s] / total]));
}

/* ── numbers ────────────────────────────────────────────────────────────── */

export interface Totals {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
}

/** One item's numbers for ONE person's portion. */
export function itemTotals(it: Pick<PlanItem, 'recipeId' | 'portion'>): Totals {
  const r = RECIPE_BY_ID[it.recipeId];
  const p = it.portion ?? 1;
  if (!r) return { kcal: 0, protein: 0, carb: 0, fat: 0 };
  return { kcal: Math.round(r.kcal * p), protein: Math.round(r.protein * p), carb: Math.round(r.carb * p), fat: Math.round(r.fat * p) };
}

export function dayTotals(day: PlanDay): Totals {
  const t = { kcal: 0, protein: 0, carb: 0, fat: 0 };
  for (const it of day.items) {
    const x = itemTotals(it);
    t.kcal += x.kcal;
    t.protein += x.protein;
    t.carb += x.carb;
    t.fat += x.fat;
  }
  return t;
}

/** The portion that brings a recipe closest to a calorie aim. */
function bestPortion(r: Recipe, aim: number): number {
  let best: number = 1;
  for (const p of PORTIONS) if (Math.abs(r.kcal * p - aim) < Math.abs(r.kcal * best - aim)) best = p;
  return best;
}

/**
 * How far short a day is, rounded to 10 — or 0 inside the ±5% band. Only SHORT is said; over is never
 * flagged (Rules §3.4, Architecture §3: over target never turns anything red).
 */
export function shortBy(day: PlanDay, targetKcal: number): number {
  const gap = Math.round((targetKcal - dayTotals(day).kcal) / 10) * 10;
  return gap > targetKcal * 0.05 ? gap : 0;
}

/* ── variety bookkeeping ────────────────────────────────────────────────── */

interface Tally {
  recipe: Record<string, number>;
  protein: Record<string, number>;
  format: Record<string, number>;
}

const emptyTally = (): Tally => ({ recipe: {}, protein: {}, format: {} });

/** Cooks already in a set of days (leftovers are not new cooks and do not count toward variety). */
function tallyOf(days: PlanDay[], skip?: { d: number; i: number }): Tally {
  const t = emptyTally();
  days.forEach((day, d) =>
    day.items.forEach((it, i) => {
      if (it.leftover || (skip && skip.d === d && skip.i === i)) return;
      const r = RECIPE_BY_ID[it.recipeId];
      if (!r) return;
      t.recipe[r.id] = (t.recipe[r.id] ?? 0) + 1;
      t.protein[r.proteinSource] = (t.protein[r.proteinSource] ?? 0) + 1;
      t.format[r.format] = (t.format[r.format] ?? 0) + 1;
    }),
  );
  return t;
}

const recipeAllowance = (slot: PlanSlot): number => (slot === 'breakfast' ? 3 : 1);

/** The variety penalty for adding `r` to a day that already has `dayProteins`. */
function varietyPenalty(r: Recipe, slot: PlanSlot, t: Tally, dayProteins: string[]): number {
  let pen = 0;
  if ((t.recipe[r.id] ?? 0) >= recipeAllowance(slot)) pen += 1000;
  else if (slot === 'breakfast' && (t.recipe[r.id] ?? 0) > 0) pen += 60; // routine is fine, variety is nicer
  if (r.proteinSource !== 'mixed') {
    if ((t.protein[r.proteinSource] ?? 0) >= 3) pen += 600;
    if (dayProteins.includes(r.proteinSource)) pen += 600;
  }
  if (r.format !== 'snack' && (t.format[r.format] ?? 0) >= 2) pen += 300;
  return pen;
}

const isRepeat = (r: Recipe, slot: PlanSlot, t: Tally): boolean => (t.recipe[r.id] ?? 0) >= recipeAllowance(slot);

/* ── the solver ─────────────────────────────────────────────────────────── */

/** mulberry32 — the design's generator, so the same seed builds the same week everywhere. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(list: readonly T[], rand: () => number): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** The score of a day's numbers against its target, lower is better. Priority order is in the weights. */
function nutritionScore(t: Totals, target: Targets): number {
  let s = Math.max(0, Math.abs(t.kcal - target.kcal) / target.kcal - 0.05) * 3000;
  if (target.protein > 0) s += (Math.max(0, 0.9 * target.protein - t.protein) / target.protein) * 1500;
  if (target.carb > 0) s += Math.max(0, Math.abs(t.carb - target.carb) / target.carb - 0.15) * 300;
  if (target.fat > 0) s += Math.max(0, Math.abs(t.fat - target.fat) / target.fat - 0.15) * 300;
  return s;
}

const slotScore = (kcal: number, aim: number): number => Math.max(0, Math.abs(kcal - aim) / aim - 0.1) * 400;

export interface PlanInput {
  prefs: MealPlanPrefs;
  target: Targets;
  seed: number;
  locked: Locks;
}

export function planWeek({ prefs, target, seed, locked }: PlanInput): PlanDay[] {
  const rand = rng(seed || 1);
  const slots = SLOT_ORDER.filter((s) => prefs.meals.includes(s));
  const shares = slotShares(slots);
  const pools: Partial<Record<PlanSlot, Recipe[]>> = {};
  for (const s of slots) pools[s] = pool(s, prefs);

  const tally = emptyTally();
  const days: PlanDay[] = [];
  /* Lunches promised to a leftover: day → the cook that feeds it. Locked leftovers are placed first. */
  const pending: Record<number, Lock> = {};
  let leftovers = 0;
  for (let d = 0; d < 7; d++) {
    const l = locked[`${d}-lunch`];
    if (l?.leftover) {
      pending[d] = l;
      leftovers++;
    }
  }

  for (let d = 0; d < 7; d++) {
    const fixed: Partial<Record<PlanSlot, PlanItem>> = {};
    for (const s of slots) {
      const l = locked[`${d}-${s}`];
      if (l && RECIPE_BY_ID[l.recipeId]) {
        fixed[s] = { slot: s, recipeId: l.recipeId, portion: l.portion ?? 1, leftover: l.leftover, ...(l.cookDay != null ? { cookDay: l.cookDay } : {}) };
      }
    }
    const p = pending[d];
    if (p && slots.includes('lunch') && !fixed.lunch && RECIPE_BY_ID[p.recipeId]) {
      fixed.lunch = { slot: 'lunch', recipeId: p.recipeId, portion: p.portion ?? 1, leftover: true, cookDay: p.cookDay };
    }

    const free = slots.filter((s) => !fixed[s]);
    const fixedItems = Object.values(fixed) as PlanItem[];
    const dayProteins = fixedItems.filter((x) => !x.leftover).map((x) => RECIPE_BY_ID[x.recipeId].proteinSource as string);
    const base = fixedItems.reduce(
      (t, x) => {
        const y = itemTotals(x);
        return { kcal: t.kcal + y.kcal, protein: t.protein + y.protein, carb: t.carb + y.carb, fat: t.fat + y.fat };
      },
      { kcal: 0, protein: 0, carb: 0, fat: 0 },
    );

    /* Ten candidates per slot: variety-clean first, shuffled within, so a repeat is only reached for when
       the clean list runs dry. */
    const lists = free.map((s) =>
      shuffle(pools[s] ?? [], rand)
        .map((r) => ({ r, pen: varietyPenalty(r, s, tally, dayProteins) }))
        .sort((a, b) => a.pen - b.pen)
        .slice(0, 10)
        .map((x) => x.r),
    );

    let best: { sc: number; picks: ({ r: Recipe; portion: number } | null)[] } | null = null;
    const walk = (i: number, picks: ({ r: Recipe; portion: number } | null)[], t: Totals, pen: number, proteins: string[]): void => {
      if (i === free.length) {
        const sc = nutritionScore(t, target) + pen + rand() * 25;
        if (!best || sc < best.sc) best = { sc, picks: picks.slice() };
        return;
      }
      const s = free[i];
      if (!lists[i].length) {
        picks.push(null);
        walk(i + 1, picks, t, pen, proteins);
        picks.pop();
        return;
      }
      const aim = (shares[s] ?? 0) * target.kcal;
      /* ⚠ If every candidate is already on today's plate, the slot is left EMPTY and the day goes on. The
         old loop just ended, reaching no complete day, so a one-recipe book (the PO's own, 2026-09-24,
         after the starter 40 were removed) planned nothing at all. */
      if (lists[i].every((r) => picks.some((x) => x?.r.id === r.id))) {
        picks.push(null);
        walk(i + 1, picks, t, pen, proteins);
        picks.pop();
        return;
      }
      for (const r of lists[i]) {
        if (picks.some((x) => x?.r.id === r.id)) continue;
        const portion = bestPortion(r, aim);
        const k = r.kcal * portion;
        const add = slotScore(k, aim) + varietyPenalty(r, s, tally, proteins) + Math.abs(portion - 1) * 80;
        picks.push({ r, portion });
        walk(
          i + 1,
          picks,
          { kcal: t.kcal + k, protein: t.protein + r.protein * portion, carb: t.carb + r.carb * portion, fat: t.fat + r.fat * portion },
          pen + add,
          r.proteinSource === 'mixed' ? proteins : [...proteins, r.proteinSource],
        );
        picks.pop();
      }
    };
    walk(0, [], base, 0, dayProteins);

    const chosen = (best as { picks: ({ r: Recipe; portion: number } | null)[] } | null)?.picks ?? [];
    const items: PlanItem[] = [];
    for (const s of slots) {
      if (fixed[s]) {
        items.push(fixed[s] as PlanItem);
        continue;
      }
      const c = chosen[free.indexOf(s)];
      if (!c) continue; // nothing in the library fits this slot at all — the screen says so
      items.push({ slot: s, recipeId: c.r.id, portion: c.portion, leftover: false, ...(isRepeat(c.r, s, tally) ? { repeated: true } : {}) });
    }

    /* Day-level portion nudge: still outside ±5%? Step free portions toward the target, one at a time. */
    const freeIdx = items.map((it, i) => (free.includes(it.slot) && !it.leftover ? i : -1)).filter((i) => i >= 0);
    for (let guard = 0; guard < 8; guard++) {
      const kcal = dayTotals({ items }).kcal;
      const off = (kcal - target.kcal) / target.kcal;
      if (Math.abs(off) <= 0.05) break;
      let moved = false;
      for (const i of freeIdx) {
        const cur = PORTIONS.indexOf(items[i].portion as (typeof PORTIONS)[number]);
        const next = off < 0 ? cur + 1 : cur - 1;
        if (next < 0 || next >= PORTIONS.length) continue;
        const r = RECIPE_BY_ID[items[i].recipeId];
        const after = kcal + r.kcal * (PORTIONS[next] - items[i].portion);
        if (Math.abs(after - target.kcal) < Math.abs(kcal - target.kcal)) {
          items[i] = { ...items[i], portion: PORTIONS[next] };
          moved = true;
          break;
        }
      }
      if (!moved) break;
    }

    for (const it of items) {
      if (it.leftover) continue;
      const r = RECIPE_BY_ID[it.recipeId];
      tally.recipe[r.id] = (tally.recipe[r.id] ?? 0) + 1;
      tally.protein[r.proteinSource] = (tally.protein[r.proteinSource] ?? 0) + 1;
      tally.format[r.format] = (tally.format[r.format] ?? 0) + 1;
    }

    /* This dinner feeds a later lunch — tomorrow first, then within its keep days. */
    const dinner = items.find((x) => x.slot === 'dinner' && !x.leftover);
    if (dinner && slots.includes('lunch') && leftovers < MAX_LEFTOVERS) {
      const r = RECIPE_BY_ID[dinner.recipeId];
      if (r.keeps) {
        for (let e = d + 1; e <= Math.min(6, d + r.leftoverDays); e++) {
          if (pending[e] || locked[`${e}-lunch`]) continue;
          pending[e] = { recipeId: r.id, leftover: true, portion: dinner.portion, cookDay: d };
          leftovers++;
          break;
        }
      }
    }

    /* A locked added snack survives a rebuild too. */
    const extra = locked[`${d}-extra`];
    if (extra && RECIPE_BY_ID[extra.recipeId]) {
      items.push({ slot: 'snacks', recipeId: extra.recipeId, portion: extra.portion ?? 1, leftover: false, extra: true });
    }

    days.push({ items });
  }
  return days;
}

/* ── leftovers and cooks ────────────────────────────────────────────────── */

/** The day whose lunch this dinner feeds, or null. */
export function feedsDay(days: PlanDay[], d: number, it: PlanItem): number | null {
  if (it.slot !== 'dinner' || it.leftover) return null;
  for (let e = d + 1; e < days.length; e++) {
    if (days[e].items.some((x) => x.leftover && x.cookDay === d && x.recipeId === it.recipeId)) return e;
  }
  return null;
}

export interface Cook {
  d: number;
  slot: PlanSlot;
  recipeId: string;
  /** Everyone eats the same portion (PO 2026-09-23), so: household × portion × meals it feeds. */
  servingsCooked: number;
  feeds: number | null;
}

/** Every time someone is in the kitchen this week — what the Grocery List is built from (Rules §1). */
export function cooksOf(days: PlanDay[], household: number): Cook[] {
  const cooks: Cook[] = [];
  days.forEach((day, d) =>
    day.items.forEach((it) => {
      if (it.leftover) return;
      const feeds = feedsDay(days, d, it);
      cooks.push({ d, slot: it.slot, recipeId: it.recipeId, feeds, servingsCooked: Math.max(1, household) * (it.portion ?? 1) * (feeds != null ? 2 : 1) });
    }),
  );
  return cooks;
}

/* ── swaps and snacks ───────────────────────────────────────────────────── */

export interface Option {
  recipe: Recipe;
  portion: number;
  kcal: number;
}

/**
 * Up to `n` other recipes for one meal, ranked by distance to the day target, then variety (Rules §3).
 * Never one already in the day; never one the hard filters refuse.
 */
export function alternatives(days: PlanDay[], d: number, idx: number, p: MealPlanPrefs, target: Targets, n = 3): Option[] {
  const day = days[d];
  const it = day.items[idx];
  const others = day.items.reduce((t, x, i) => t + (i === idx ? 0 : itemTotals(x).kcal), 0);
  const inDay = new Set(day.items.map((x) => x.recipeId));
  const tally = tallyOf(days, { d, i: idx });
  const proteins = day.items.filter((x, i) => i !== idx && !x.leftover).map((x) => RECIPE_BY_ID[x.recipeId]?.proteinSource as string);
  return pool(it.slot, p)
    .filter((r) => !inDay.has(r.id))
    .map((r) => {
      const portion = bestPortion(r, target.kcal - others);
      const kcal = Math.round(r.kcal * portion);
      return { recipe: r, portion, kcal, gap: Math.abs(target.kcal - others - kcal), pen: varietyPenalty(r, it.slot, tally, proteins) };
    })
    .sort((a, b) => a.gap + a.pen * 0.5 - (b.gap + b.pen * 0.5))
    .slice(0, n)
    .map(({ recipe, portion, kcal }) => ({ recipe, portion, kcal }));
}

/** Snacks that close a short day, closest to the gap first. */
export function snackOptions(days: PlanDay[], d: number, p: MealPlanPrefs, target: Targets, n = 3): Option[] {
  const day = days[d];
  const gap = target.kcal - dayTotals(day).kcal;
  const inDay = new Set(day.items.map((x) => x.recipeId));
  return pool('snacks', p)
    .filter((r) => !inDay.has(r.id))
    .map((r) => {
      const portion = bestPortion(r, gap);
      return { recipe: r, portion, kcal: Math.round(r.kcal * portion) };
    })
    .sort((a, b) => Math.abs(gap - a.kcal) - Math.abs(gap - b.kcal))
    .slice(0, n);
}

/**
 * Swap one meal. If it was a dinner feeding a leftover lunch, that lunch follows: a replacement that
 * keeps long enough carries over as the new leftover; one that doesn't leaves the lunch to be re-picked
 * (Rules §3 "swapping a dinner that feeds a leftover also updates the leftover"). A lock on the swapped
 * spot moves to the new recipe.
 */
export function swapMeal(
  days: PlanDay[],
  locked: Locks,
  d: number,
  i: number,
  pick: { recipeId: string; portion: number },
  p: MealPlanPrefs,
  target: Targets,
): { days: PlanDay[]; locked: Locks } {
  const next = days.map((x) => ({ items: x.items.slice() }));
  const old = next[d].items[i];
  const fed = feedsDay(next, d, old);
  next[d].items[i] = { slot: old.slot, recipeId: pick.recipeId, portion: pick.portion, leftover: false, ...(old.extra ? { extra: true } : {}) };

  if (fed != null) {
    const n = next[fed].items.findIndex((x) => x.leftover && x.cookDay === d);
    const r = RECIPE_BY_ID[pick.recipeId];
    if (r?.keeps && fed - d <= r.leftoverDays) {
      next[fed].items[n] = { ...next[fed].items[n], recipeId: pick.recipeId, portion: pick.portion };
    } else {
      next[fed].items[n] = { ...next[fed].items[n], leftover: false, cookDay: undefined };
      const alt = alternatives(next, fed, n, p, target, 1)[0];
      if (alt) next[fed].items[n] = { slot: 'lunch', recipeId: alt.recipe.id, portion: alt.portion, leftover: false };
    }
  }

  const k = slotKey(d, old);
  const nextLocks = { ...locked };
  if (nextLocks[k]) nextLocks[k] = { recipeId: pick.recipeId, leftover: false, portion: pick.portion };
  return { days: next, locked: nextLocks };
}

/** Add a snack to a day (the "Add a snack?" line). Replaces an earlier added snack on that day. */
export function addSnack(days: PlanDay[], d: number, opt: Option): PlanDay[] {
  return days.map((x, j) =>
    j === d
      ? { items: [...x.items.filter((it) => !it.extra), { slot: 'snacks', recipeId: opt.recipe.id, portion: opt.portion, leftover: false, extra: true }] }
      : x,
  );
}

/* ── locks ──────────────────────────────────────────────────────────────── */

const lockOf = (it: PlanItem): Lock => ({
  recipeId: it.recipeId,
  leftover: it.leftover,
  portion: it.portion,
  ...(it.cookDay != null ? { cookDay: it.cookDay } : {}),
});

/** Lock or unlock a meal. Locking a dinner that feeds a leftover locks the leftover too (Rules §3). */
export function toggleLock(days: PlanDay[], locked: Locks, d: number, i: number): Locks {
  const it = days[d].items[i];
  const k = slotKey(d, it);
  const next = { ...locked };
  const fed = feedsDay(days, d, it);
  const lunchKey = fed != null ? `${fed}-lunch` : null;
  if (next[k]) {
    delete next[k];
    if (lunchKey) delete next[lunchKey];
  } else {
    next[k] = lockOf(it);
    if (lunchKey && fed != null) {
      const lunch = days[fed].items.find((x) => x.leftover && x.cookDay === d);
      if (lunch) next[lunchKey] = lockOf(lunch);
    }
  }
  return next;
}

/* ── the stored week ────────────────────────────────────────────────────── */

/** The week as stored in `meal_plan_weeks` (0211). Recipe ids and portions — numbers come from the set. */
export interface MealPlanWeek {
  weekStart: string;
  seed: number;
  targetKcal: number;
  prefsUpdatedAt: string | null;
  days: PlanDay[];
  locked: Locks;
  /** `slotKey-recipeId` → the diary row "Log meal" created, so it can be undone exactly. */
  logged: Record<string, string>;
}

export const logKey = (d: number, it: Pick<PlanItem, 'slot' | 'extra' | 'recipeId'>): string => `${slotKey(d, it)}-${it.recipeId}`;

/**
 * What a rebuild must keep: the athlete's locks, plus every LOGGED meal — "logged meals are frozen and
 * are skipped by a rebuild" (Rules §3). A lock only survives if the recipe still passes the hard
 * filters: a lock can never carry an allergen back in.
 */
export function keptLocks(week: MealPlanWeek, prefs: MealPlanPrefs): Locks {
  const out: Locks = {};
  for (const [k, v] of Object.entries(week.locked)) {
    const r = RECIPE_BY_ID[v.recipeId];
    if (r && fits(r, prefs)) out[k] = v;
  }
  week.days.forEach((day, d) =>
    day.items.forEach((it) => {
      if (week.logged[logKey(d, it)]) out[slotKey(d, it)] = lockOf(it);
    }),
  );
  return out;
}

/** Rebuild with a new seed, keeping locks and logged meals. */
export function rebuildWeek(week: MealPlanWeek, prefs: MealPlanPrefs, target: Targets): MealPlanWeek {
  const seed = week.seed + 1;
  return { ...week, seed, days: planWeek({ prefs, target, seed, locked: keptLocks(week, prefs) }) };
}

/** Every recipe id in a stored plan still exists and carries a portion — else it is rebuilt, not half-drawn. */
export function planIsReadable(days: unknown): days is PlanDay[] {
  return (
    Array.isArray(days) &&
    days.length === 7 &&
    days.every(
      (d) =>
        d &&
        Array.isArray((d as PlanDay).items) &&
        (d as PlanDay).items.every(
          (it) => it && typeof it.recipeId === 'string' && !!RECIPE_BY_ID[it.recipeId] && typeof it.portion === 'number',
        ),
    )
  );
}

/**
 * The week to show: the stored one when it still describes the athlete's setup and target, otherwise a
 * fresh build that keeps locks that still fit and every logged meal.
 *
 * ⚠ **A WEEK BUILT ON OLD ANSWERS IS REBUILT, NOT SHOWN.** A new target would leave "2,480 / 2,500"
 * against a number that is now 2,200; a changed setup — a new allergy above all — may leave exactly the
 * meal just excluded.
 */
export function resolveWeek(
  stored: MealPlanWeek | null,
  prefs: MealPlanPrefs,
  prefsUpdatedAt: string | null,
  target: Targets,
  weekStart: string,
): { week: MealPlanWeek; rebuilt: boolean } {
  if (
    stored &&
    stored.weekStart === weekStart &&
    planIsReadable(stored.days) &&
    stored.targetKcal === target.kcal &&
    stored.prefsUpdatedAt === prefsUpdatedAt
  ) {
    return { week: stored, rebuilt: false };
  }
  const sameWeek = stored?.weekStart === weekStart && planIsReadable(stored.days) ? stored : null;
  const locked = sameWeek ? keptLocks(sameWeek, prefs) : {};
  const seed = sameWeek?.seed ?? stored?.seed ?? 1;
  return {
    week: {
      weekStart,
      seed,
      targetKcal: target.kcal,
      prefsUpdatedAt,
      days: planWeek({ prefs, target, seed, locked }),
      locked: sameWeek ? Object.fromEntries(Object.entries(sameWeek.locked).filter(([k]) => k in locked)) : {},
      logged: sameWeek?.logged ?? {},
    },
    rebuilt: true,
  };
}

/* ── the week's dates ───────────────────────────────────────────────────── */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const parts = (iso: string): [number, number, number] => iso.split('-').map(Number) as [number, number, number];

/** The Monday on or before a date — a plan week runs Monday to Sunday, like the design's. */
export function mondayOf(iso: string): string {
  const [y, m, d] = parts(iso);
  const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // Mon = 0
  return new Date(Date.UTC(y, m - 1, d - dow)).toISOString().slice(0, 10);
}

export interface WeekDate {
  iso: string;
  name: string;
  short: string;
  num: number;
  label: string;
}

export function weekDates(mondayIso: string): WeekDate[] {
  const [y, m, d] = parts(mondayIso);
  return DAY_NAMES.map((name, i) => {
    const dt = new Date(Date.UTC(y, m - 1, d + i));
    return {
      iso: dt.toISOString().slice(0, 10),
      name,
      short: name.slice(0, 3),
      num: dt.getUTCDate(),
      label: `${MONTHS[dt.getUTCMonth()]} ${dt.getUTCDate()}`,
    };
  });
}

/** "Sep 28 – Oct 4" */
export const weekRange = (dates: WeekDate[]): string => `${dates[0].label} – ${dates[6].label}`;

/** Which day the week opens on: today when it is in this week, else Monday. */
export const todayIndex = (dates: WeekDate[], todayIso: string): number => Math.max(0, dates.findIndex((x) => x.iso === todayIso));

/** "1¼ servings" — a portion as a cook reads it. */
export function portionLabel(p: number): string {
  const whole = Math.floor(p);
  const frac = { 0: '', 0.25: '¼', 0.5: '½', 0.75: '¾' }[+(p - whole).toFixed(2) as 0 | 0.25 | 0.5 | 0.75] ?? '';
  const txt = `${whole || ''}${frac}` || '0';
  return `${txt} ${p <= 1 ? 'serving' : 'servings'}`;
}
