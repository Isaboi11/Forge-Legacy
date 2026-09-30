/**
 * Nutrition — the ONE way a food becomes a diary row (QA 09-26, R2-B2).
 *
 * Log Food's round + and Food Detail each built the row themselves, and they had drifted: the + could
 * log a zero-calorie drink that Food Detail's button refused, and only one of them was kept in step when
 * a column was added. Both now ask `draftEntry` for the row, so what is stored — the name, the portion's
 * label, the multiplied-out numbers, the per-100 g micronutrients the licence allows — is the same
 * whichever door was used, and the same refusals apply at both.
 *
 * It also holds the other half of "the row keeps its own numbers" (0205): reopening a logged portion is
 * priced from what the row STORED (`pricedFood`), not from the food as it reads today.
 *
 * ⚠ Pure and relative-imported, so `node --test` can prove it (NUT-D4).
 */

import type { LogEntry, MealSlot } from './day.ts';
import { ENTRY_KCAL_ASK, ENTRY_KCAL_MAX, PORTION_GRAMS_MAX } from './amount.ts';
import {
  energyKnown,
  MAY_STORE_MICROS,
  portionLabel,
  portionMacros,
  repeatMacros,
  type CatalogFood,
  type Portion,
  type PortionMacros,
} from './serving.ts';

/** What `addEntries` writes for one food — `NewEntry`, stated here so the domain owns its shape. */
export interface EntryDraft {
  meal: MealSlot;
  source: CatalogFood['source'];
  sourceKey: string;
  name: string;
  brand: string | null;
  servingLabel: string | null;
  quantity: number;
  macros: PortionMacros;
  micros: Record<string, number> | null;
}

/**
 * Why a portion cannot be written.
 *  · `unknown-energy` — the source never gave this food's calories; a zero would be a claim (R2-F3).
 *  · `no-weight`      — nothing to multiply: an amount of zero, or a serving no source weighed.
 *  · `too-much`       — past what one entry can hold (`ENTRY_KCAL_MAX`, `PORTION_GRAMS_MAX`).
 */
export type PortionRefusal = 'unknown-energy' | 'no-weight' | 'too-much';

export interface PortionCheck {
  macros: PortionMacros;
  refusal: PortionRefusal | null;
  /** Large enough to ask about before it is written (`ENTRY_KCAL_ASK`). */
  ask: boolean;
}

/**
 * Price a portion and say whether it may be written.
 *
 * ⚠ **ZERO CALORIES IS A REAL ANSWER** (N-06). Diet soda, black coffee and water weigh something and
 * carry nothing; what is refused is a food whose energy is UNKNOWN, never one that is known to be zero.
 *
 * `stored` is the edit case: the food's numbers came from the row being edited, so they are already the
 * athlete's and there is nothing about the source left to doubt.
 */
export function checkPortion(food: CatalogFood, portion: Portion, stored = false): PortionCheck {
  const macros = portionMacros(food, portion);
  let refusal: PortionRefusal | null = null;
  if (!stored && !energyKnown(food)) refusal = 'unknown-energy';
  else if (macros.grams == null) refusal = 'no-weight';
  else if (macros.kcal > ENTRY_KCAL_MAX || macros.grams > PORTION_GRAMS_MAX) refusal = 'too-much';
  return { macros, refusal, ask: refusal == null && macros.kcal > ENTRY_KCAL_ASK };
}

/** The line under the amount when a portion is refused. Null for the refusals the screen already explains. */
export function portionRefusalLine(refusal: PortionRefusal | null): string | null {
  if (refusal === 'too-much') return 'That’s more than one entry can hold. Check the amount.';
  if (refusal === 'unknown-energy') return 'This food has no calories on record, so it can’t be logged as it is.';
  return null;
}

/** The row for `portion` of `food` in `meal` — or null when `checkPortion` refuses it. */
export function draftEntry(food: CatalogFood, portion: Portion, meal: MealSlot): EntryDraft | null {
  const { macros, refusal } = checkPortion(food, portion);
  if (refusal) return null;
  return {
    meal,
    source: food.source,
    sourceKey: food.key,
    name: food.name,
    brand: food.brand ?? null,
    servingLabel: portionLabel(portion),
    quantity: portion.quantity,
    macros,
    /* Kept with the row so a meal's full breakdown survives the catalogue changing under it — and only
       from a source whose licence allows it (§4). */
    micros: MAY_STORE_MICROS.has(food.source) ? (food.micros ?? null) : null,
  };
}

/** The portion a Recent row stored, as far as a repeat needs it. */
export interface StoredPortion {
  key: string;
  source: CatalogFood['source'];
  name: string;
  brand: string | null;
  servingLabel: string | null;
  quantity: number;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  grams: number | null;
  micros: Record<string, number> | null;
}

/**
 * Log again exactly what was logged last time (the + on a Recent row). Null when the stored numbers
 * cannot be trusted (`repeatMacros`) — the caller re-reads the food and goes through `draftEntry`.
 */
export function repeatDraft(stored: StoredPortion, meal: MealSlot): EntryDraft | null {
  const macros = repeatMacros(stored);
  if (!macros || macros.kcal > ENTRY_KCAL_MAX) return null;
  return {
    meal,
    source: stored.source,
    sourceKey: stored.key,
    name: stored.name,
    brand: stored.brand ?? null,
    servingLabel: stored.servingLabel ?? null,
    quantity: Number.isFinite(stored.quantity) && stored.quantity > 0 ? stored.quantity : 1,
    macros,
    micros: MAY_STORE_MICROS.has(stored.source) ? (stored.micros ?? null) : null,
  };
}

/* ── reopening a logged portion ───────────────────────────────────────────── */

/** Per-100 g figures recovered from a stored row. Null when the row has no weight or no trusted numbers. */
function storedPer100(entry: Pick<LogEntry, 'kcal' | 'protein' | 'carb' | 'fat' | 'grams'>) {
  const m = repeatMacros({ kcal: entry.kcal, protein: entry.protein, carb: entry.carb, fat: entry.fat, grams: entry.grams ?? null });
  if (!m || m.grams == null) return null;
  const k = 100 / m.grams;
  return { kcal100: m.kcal * k, protein100: m.protein * k, carb100: m.carb * k, fat100: m.fat * k };
}

/**
 * The food to price an EDIT from: today's servings (the pills still work), the ROW's numbers.
 *
 * ⚠ **A LOGGED DAY KEEPS WHAT WAS EATEN** (N-07). My Foods promises it, and 0205 stores the snapshot to
 * make it true — but Food Detail re-multiplied the portion from the food as it reads NOW, so reopening a
 * 350 cal bowl after editing the food to 400 showed 400, and any save rewrote the past. Priced from the
 * row, an unchanged save writes back exactly what was there, and a changed portion scales what was eaten.
 *
 * A row with no weight, or whose numbers cannot be trusted (a 0 cal row an earlier bug wrote), falls
 * back to the food as it is — for that row, the catalogue is the better answer.
 */
export function pricedFood(food: CatalogFood, entry: LogEntry | null | undefined): { food: CatalogFood; stored: boolean } {
  const per100 = entry ? storedPer100(entry) : null;
  if (!entry || !per100) return { food, stored: false };
  return { food: { ...food, ...per100, micros: entry.micros ?? food.micros ?? null }, stored: true };
}

/**
 * A logged row AS a food, for when the food behind it is gone — a custom food since deleted, a catalogue
 * row evicted. The row stored enough to change its portion in grams. Null when it stored no weight.
 */
export function entryAsFood(entry: LogEntry): CatalogFood | null {
  const per100 = storedPer100(entry);
  if (!per100 || entry.source === 'quick' || !entry.sourceKey) return null;
  return {
    key: entry.sourceKey,
    source: entry.source,
    name: entry.name,
    brand: entry.brand ?? null,
    ...per100,
    servings: [],
    micros: entry.micros ?? null,
    attribution: null,
  };
}
