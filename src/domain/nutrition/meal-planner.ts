import type { Allergen, MealPlanPrefs } from './meal-plan-setup.ts';
import { INGREDIENTS, RECIPE_SOURCES, type PlanSlot, type RecipeSource } from './recipes-data.ts';

/**
 * The week planner — Nutrition Architecture §6 steps 1–5, ported from `meal-recipes.js` in the design
 * project (Claude Design b029488a) so `Meal Plan.dc.html` behaves the same, and pure so `node --test` can
 * prove it.
 *
 * ⚠ **EVERY NUMBER IS COMPUTED FROM INGREDIENTS** (NUT-D4, §6 step 4). A recipe's calories and macros are
 * the sum of its ingredients' USDA figures × grams (`recipes-data.ts`), never a typed-in total. The
 * design's own recipe file carried hand-written numbers for its mockup; those are not used.
 *
 * ⚠ **THE HARD FILTER IS FINAL** (§6 step 1, NUT-D6). `fits()` decides diet, allergens, dislikes and
 * time; nothing downstream — swap, snack, rebuild — can offer a recipe `fits()` refused. Allergens and
 * diet are derived from INGREDIENTS, so a recipe cannot be tagged differently from what is in it.
 *
 * What the design's planner does and this keeps: choose, don't scale. Each day picks one recipe per
 * slot to land near the athlete's target (a per-serving plan); a batch dinner becomes the next day's
 * lunch; a locked meal survives a rebuild. Portion multipliers (§6 step 3, 0.5 steps) are a later pass.
 */

export type RecipeDiet = 'any' | 'pescatarian' | 'vegetarian' | 'vegan';

export interface Recipe {
  id: string;
  slot: PlanSlot;
  name: string;
  minutes: number;
  batch: boolean;
  /** Per serving, rounded once from the ingredient sum. */
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  allergens: Allergen[];
  diet: RecipeDiet;
  /** Lower-cased — what a dislike is matched against, with the name. */
  ingredientNames: string[];
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
    name: src.name,
    minutes: src.minutes,
    batch: src.batch,
    kcal: Math.round(kcal),
    protein: Math.round(protein),
    carb: Math.round(carb),
    fat: Math.round(fat),
    allergens: ALLERGEN_ORDER.filter((a) => allergens.has(a)),
    diet,
    ingredientNames: src.ingredients.map(([key]) => INGREDIENTS[key].name.toLowerCase()),
  };
}

export const RECIPES: readonly Recipe[] = RECIPE_SOURCES.map(deriveRecipe);
export const RECIPE_BY_ID: Readonly<Record<string, Recipe>> = Object.fromEntries(RECIPES.map((r) => [r.id, r]));

/* ── step 1 · the hard filter ───────────────────────────────────────────── */

const DIET_OK: Record<MealPlanPrefs['diet'], RecipeDiet[]> = {
  anything: ['any', 'pescatarian', 'vegetarian', 'vegan'],
  pescatarian: ['pescatarian', 'vegetarian', 'vegan'],
  vegetarian: ['vegetarian', 'vegan'],
  vegan: ['vegan'],
};

/** "mushrooms" matches "mushroom"; "tomatoes" matches "tomato". The design's rule, kept. */
const stem = (s: string): string => s.toLowerCase().trim().replace(/e?s$/, '');

export function fits(r: Recipe, p: MealPlanPrefs): boolean {
  if (!DIET_OK[p.diet].includes(r.diet)) return false;
  if (r.allergens.some((a) => p.allergens.includes(a))) return false;
  const hay = `${r.name} ${r.ingredientNames.join(' ')}`.toLowerCase();
  if (p.dislikes.some((d) => stem(d) && hay.includes(stem(d)))) return false;
  return p.cookMinutes == null || r.minutes <= p.cookMinutes;
}

const pool = (slot: PlanSlot, p: MealPlanPrefs): Recipe[] => RECIPES.filter((r) => r.slot === slot && fits(r, p));

/* ── the plan's shape ───────────────────────────────────────────────────── */

export interface PlanItem {
  slot: PlanSlot;
  recipeId: string;
  /** Last night's batch dinner, eaten again. */
  leftover: boolean;
  /** A snack added to close a gap — not one of the setup's slots. */
  extra?: boolean;
}

export interface PlanDay {
  items: PlanItem[];
}

export type Locks = Record<string, { recipeId: string; leftover: boolean }>;

/** Where a meal sits, for locks and log marks: `2-dinner`, or `2-extra` for an added snack. */
export const slotKey = (d: number, it: PlanItem): string => `${d}-${it.extra ? 'extra' : it.slot}`;

/* ── steps 2–3 · score and solve ────────────────────────────────────────── */

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

export interface PlanInput {
  prefs: MealPlanPrefs;
  targetKcal: number;
  seed: number;
  locked: Locks;
}

/**
 * Seven days. Per day: locked meals stay, yesterday's batch dinner fills lunch, and the free slots are
 * searched (ten candidates each) for the combination closest to the target, penalising repeats across
 * the week and anything eaten in the last two days.
 */
export function planWeek({ prefs, targetKcal, seed, locked }: PlanInput): PlanDay[] {
  const rand = rng(seed || 1);
  const slots = prefs.meals;
  const pools: Partial<Record<PlanSlot, Recipe[]>> = {};
  for (const s of slots) pools[s] = pool(s, prefs);

  const used: Record<string, number> = {};
  const recent: Record<string, number> = {};
  const days: PlanDay[] = [];
  let carry: string | null = null;

  for (let d = 0; d < 7; d++) {
    const fixed: Partial<Record<PlanSlot, { recipeId: string; leftover: boolean }>> = {};
    for (const s of slots) {
      const l = locked[`${d}-${s}`];
      if (l && RECIPE_BY_ID[l.recipeId]) fixed[s] = { recipeId: l.recipeId, leftover: l.leftover };
    }
    if (carry && slots.includes('lunch') && !fixed.lunch) fixed.lunch = { recipeId: carry, leftover: true };
    carry = null;

    const free = slots.filter((s) => !fixed[s]);
    const base = Object.values(fixed).reduce((t, f) => t + RECIPE_BY_ID[f!.recipeId].kcal, 0);
    const lists = free.map((s) => shuffle(pools[s] ?? [], rand).slice(0, 10));

    let best: { sc: number; acc: (Recipe | null)[] } | null = null;
    const walk = (i: number, acc: (Recipe | null)[], sum: number, pen: number): void => {
      if (i === free.length) {
        const sc = Math.max(0, Math.abs(targetKcal - sum) - 60) + pen + rand() * 25;
        if (!best || sc < best.sc) best = { sc, acc: acc.slice() };
        return;
      }
      if (!lists[i].length) {
        acc.push(null);
        walk(i + 1, acc, sum, pen);
        acc.pop();
        return;
      }
      for (const r of lists[i]) {
        acc.push(r);
        const repeat = [0, 150, 1000][Math.min(used[r.id] ?? 0, 2)];
        const tooSoon = recent[r.id] != null && d - recent[r.id] <= 2 ? 300 : 0;
        walk(i + 1, acc, sum + r.kcal, pen + repeat + tooSoon);
        acc.pop();
      }
    };
    walk(0, [], base, 0);

    const chosen = best as { sc: number; acc: (Recipe | null)[] } | null;
    const items: PlanItem[] = [];
    for (const s of slots) {
      const f = fixed[s];
      if (f) {
        items.push({ slot: s, recipeId: f.recipeId, leftover: f.leftover });
        continue;
      }
      const r = chosen?.acc[free.indexOf(s)];
      if (r) items.push({ slot: s, recipeId: r.id, leftover: false });
    }
    for (const it of items) {
      if (!it.leftover) {
        used[it.recipeId] = (used[it.recipeId] ?? 0) + 1;
        recent[it.recipeId] = d;
      }
    }
    const dinner = items.find((i) => i.slot === 'dinner');
    if (dinner && RECIPE_BY_ID[dinner.recipeId].batch && d < 6) carry = dinner.recipeId;

    /* A locked added snack survives a rebuild too. */
    const extra = locked[`${d}-extra`];
    if (extra && RECIPE_BY_ID[extra.recipeId]) items.push({ slot: 'snacks', recipeId: extra.recipeId, leftover: false, extra: true });

    days.push({ items });
  }
  return days;
}

/* ── step 4 · validate ──────────────────────────────────────────────────── */

export interface Totals {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
}

export function dayTotals(day: PlanDay): Totals {
  const t = { kcal: 0, protein: 0, carb: 0, fat: 0 };
  for (const it of day.items) {
    const r = RECIPE_BY_ID[it.recipeId];
    if (!r) continue;
    t.kcal += r.kcal;
    t.protein += r.protein;
    t.carb += r.carb;
    t.fat += r.fat;
  }
  return t;
}

/**
 * How far short a day is, rounded to 10 — or 0 when it is close enough to say nothing. "Close enough"
 * is the design's: the larger of 100 kcal or 5% of the target. Only SHORT is said; over is never
 * flagged (Architecture §3: over target never turns anything red).
 */
export function shortBy(day: PlanDay, targetKcal: number): number {
  const gap = Math.round((targetKcal - dayTotals(day).kcal) / 10) * 10;
  return gap > Math.max(100, targetKcal * 0.05) ? gap : 0;
}

/* ── step 5 · swap ──────────────────────────────────────────────────────── */

/** Up to `n` other recipes for one spot, closest to the day's target first. Never one already in the day. */
export function alternatives(day: PlanDay, idx: number, p: MealPlanPrefs, targetKcal: number, n = 3): Recipe[] {
  const it = day.items[idx];
  const others = day.items.reduce((t, x, i) => t + (i === idx ? 0 : (RECIPE_BY_ID[x.recipeId]?.kcal ?? 0)), 0);
  const inDay = new Set(day.items.map((x) => x.recipeId));
  return pool(it.slot, p)
    .filter((r) => !inDay.has(r.id))
    .sort((a, b) => Math.abs(targetKcal - others - a.kcal) - Math.abs(targetKcal - others - b.kcal))
    .slice(0, n);
}

/** Snacks that close a short day, closest to the gap first. */
export function snackOptions(day: PlanDay, p: MealPlanPrefs, targetKcal: number, n = 3): Recipe[] {
  const total = dayTotals(day).kcal;
  const inDay = new Set(day.items.map((x) => x.recipeId));
  return pool('snacks', p)
    .filter((r) => !inDay.has(r.id))
    .sort((a, b) => Math.abs(targetKcal - total - a.kcal) - Math.abs(targetKcal - total - b.kcal))
    .slice(0, n);
}

/**
 * Swap one meal. If it was a batch dinner feeding tomorrow's lunch, tomorrow follows: a batch
 * replacement carries over as the new leftover; a non-batch one leaves tomorrow's lunch to be
 * re-picked, since there is nothing left to eat. A lock on the swapped spot moves to the new recipe.
 */
export function swapMeal(
  days: PlanDay[],
  locked: Locks,
  d: number,
  i: number,
  newId: string,
  p: MealPlanPrefs,
  targetKcal: number,
): { days: PlanDay[]; locked: Locks } {
  const next = days.map((x) => ({ items: x.items.slice() }));
  const old = next[d].items[i];
  next[d].items[i] = { ...old, recipeId: newId, leftover: false };

  if (old.slot === 'dinner' && d < 6) {
    const n = next[d + 1].items.findIndex((x) => x.slot === 'lunch' && x.leftover && x.recipeId === old.recipeId);
    if (n >= 0) {
      if (RECIPE_BY_ID[newId]?.batch) {
        next[d + 1].items[n] = { ...next[d + 1].items[n], recipeId: newId };
      } else {
        next[d + 1].items[n] = { ...next[d + 1].items[n], leftover: false };
        const alt = alternatives(next[d + 1], n, p, targetKcal, 1)[0];
        if (alt) next[d + 1].items[n] = { ...next[d + 1].items[n], recipeId: alt.id };
      }
    }
  }

  const k = slotKey(d, old);
  const nextLocks = { ...locked };
  if (nextLocks[k]) nextLocks[k] = { recipeId: newId, leftover: false };
  return { days: next, locked: nextLocks };
}

/** Does this dinner become tomorrow's lunch? — the "makes Tuesday lunch" line. */
export function feedsTomorrow(days: PlanDay[], d: number, it: PlanItem): boolean {
  if (it.slot !== 'dinner' || d >= 6) return false;
  return days[d + 1].items.some((x) => x.slot === 'lunch' && x.leftover && x.recipeId === it.recipeId);
}

/** Every recipe id in a stored plan still exists — a plan saved against an older recipe set is rebuilt, not half-drawn. */
export function planIsReadable(days: unknown): days is PlanDay[] {
  return (
    Array.isArray(days) &&
    days.length === 7 &&
    days.every(
      (d) =>
        d &&
        Array.isArray((d as PlanDay).items) &&
        (d as PlanDay).items.every((it) => it && typeof it.recipeId === 'string' && !!RECIPE_BY_ID[it.recipeId]),
    )
  );
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
  /** "Monday" */
  name: string;
  /** "Mon" */
  short: string;
  /** 28 */
  num: number;
  /** "Sep 28" */
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

/* ── the stored week ────────────────────────────────────────────────────── */

/** The week as stored in `meal_plan_weeks` (0211). Recipe ids only — numbers always come from the set. */
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

export const logKey = (d: number, it: PlanItem): string => `${slotKey(d, it)}-${it.recipeId}`;

/**
 * The week to show: the stored one when it still describes the athlete's setup and target, otherwise a
 * fresh build that keeps their locks and log marks.
 *
 * ⚠ **A WEEK BUILT ON OLD ANSWERS IS REBUILT, NOT SHOWN.** If the target moved, a week fitted to the old
 * number would say "2,480 / 2,500" against a target that is now 2,200. If the setup changed — a new
 * allergy above all — a stored week may hold exactly the meal they just excluded. Locks survive only
 * when the locked recipe still passes `fits()`: a lock can never smuggle an allergen back in.
 */
export function resolveWeek(
  stored: MealPlanWeek | null,
  prefs: MealPlanPrefs,
  prefsUpdatedAt: string | null,
  targetKcal: number,
  weekStart: string,
): { week: MealPlanWeek; rebuilt: boolean } {
  if (
    stored &&
    stored.weekStart === weekStart &&
    planIsReadable(stored.days) &&
    stored.targetKcal === targetKcal &&
    stored.prefsUpdatedAt === prefsUpdatedAt
  ) {
    return { week: stored, rebuilt: false };
  }
  const sameWeek = stored?.weekStart === weekStart ? stored : null;
  const locked: Locks = {};
  for (const [k, v] of Object.entries(sameWeek?.locked ?? {})) {
    const r = RECIPE_BY_ID[v.recipeId];
    if (r && fits(r, prefs)) locked[k] = v;
  }
  const seed = sameWeek?.seed ?? 1;
  return {
    week: {
      weekStart,
      seed,
      targetKcal,
      prefsUpdatedAt,
      days: planWeek({ prefs, targetKcal, seed, locked }),
      locked,
      logged: sameWeek?.logged ?? {},
    },
    rebuilt: true,
  };
}
