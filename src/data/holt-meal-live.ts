import type { ApplyResult, HoltActionExecutor, UndoToken } from '@/domain/coach/holt-actions';
import { localToday, MEAL_LABELS } from '@/domain/nutrition/day';
import {
  foodLogSlot,
  holtFoodLogCard,
  holtMealCard,
  mealCardComplete,
  mealCardEntries,
  mealCardEntry,
  mealCardRows,
  SAVE_MEAL_KEY,
} from '@/domain/nutrition/holt-meal';
import type { SavedItemRow } from '@/domain/nutrition/my-foods';
import { isTransportFailure } from '@/domain/workout/pending-save';
import { addEntries, removeEntry } from '@/data/nutrition-live';
import { uuid } from '@/lib/app-session';
import { reportError } from '@/lib/diagnostics';
import { signedInUserId, supabase } from '@/lib/supabase';

/**
 * THE WRITES BEHIND HOLT'S FOOD CARDS — `log_food` and `propose_meal` (AI Road to 10 Sprint 4a §1.2, NU-3;
 * Nutrition Architecture Amendment 006 HF-D3). Each implements `HoltActionExecutor` (holt-actions.ts): `apply` runs
 * only on a tap, `undo` puts back exactly what that tap wrote, and a failed `apply` leaves nothing behind.
 *
 *   log_food      Log → one diary row per food, today, at the slot the athlete named (else the hour's) — the one diary
 *                 write path (`addEntries`, which holds the write for a lost signal and sends it when it returns).
 *                 Undo → `removeEntry` on exactly those rows' ids.
 *   propose_meal  Log it (the Confirm) → ONE diary row under the meal's name, the order "as one whole thing" (HF-D3).
 *                 Save as a meal (`opts.key === 'save'`) → a saved meal and its items in My foods & meals.
 *                 Undo → the row removed / the saved meal deleted (its items cascade, 0205).
 *
 * Every number written is `holt-meal.ts`'s, recomputed here from the forwarded input — the same one the card was
 * drawn from — never the model's (NUT-D4). A card that cannot be counted (HF-D5) cannot be applied either.
 *
 * The integrator registers `HOLT_MEAL_EXECUTORS` in lane C's `executorFor` at merge.
 */

const refused = (reason: Extract<ApplyResult, { ok: false }>['reason']): ApplyResult => ({ ok: false, reason });

/** A thrown write → the result's reason: no signal is `offline` (nothing was written), anything else `failed`. */
function failure(e: unknown): ApplyResult {
  if (isTransportFailure(e)) return refused('offline');
  reportError(e);
  return refused('failed');
}

const entryIds = (token: UndoToken): string[] =>
  Array.isArray(token.entryIds) ? (token.entryIds as unknown[]).filter((x): x is string => typeof x === 'string') : [];

/** Undo a Log: remove exactly the rows it wrote. True only when every one is gone (or held to go). */
async function removeRows(token: UndoToken): Promise<boolean> {
  const ids = entryIds(token);
  if (!ids.length) return false;
  let all = true;
  for (const id of ids) {
    try {
      await removeEntry(id);
    } catch (e) {
      reportError(e);
      all = false;
    }
  }
  return all;
}

const isMissingColumn = (e: unknown): boolean => (e as { code?: unknown } | null)?.code === '42703';

/**
 * A saved meal and its items, all or nothing. There is no transaction from the client, so the meal's id is minted
 * here: when its items cannot be written, that one meal is deleted again and the athlete's list is as it was.
 * (`saveSavedMeal` — the meal editor's — leaves an empty meal behind on the same failure; the editor retries in place,
 * a card does not.)
 */
async function saveMealWhole(name: string, rows: SavedItemRow[]): Promise<{ ok: true; mealId: string } | { ok: false; error: unknown }> {
  const athlete = await signedInUserId();
  if (!athlete) return { ok: false, error: new Error('Not signed in') };
  const mealId = uuid();
  const made = await supabase.from('saved_meals').insert({ id: mealId, athlete_id: athlete, name });
  if (made.error) return { ok: false, error: made.error };

  const items = (withMicros: boolean) =>
    rows.map((r) => {
      const { micros, ...rest } = r;
      return { meal_id: mealId, ...rest, ...(withMicros ? { micros: micros ?? null } : {}) };
    });
  let { error } = await supabase.from('saved_meal_items').insert(items(true));
  if (error && isMissingColumn(error)) ({ error } = await supabase.from('saved_meal_items').insert(items(false)));
  if (!error) return { ok: true, mealId };

  const undone = await supabase.from('saved_meals').delete().eq('id', mealId).eq('athlete_id', athlete);
  if (undone.error) reportError(undone.error);
  return { ok: false, error };
}

async function deleteMeal(token: UndoToken): Promise<boolean> {
  const mealId = typeof token.mealId === 'string' ? token.mealId : null;
  const athlete = mealId ? await signedInUserId().catch(() => null) : null;
  if (!mealId || !athlete) return false;
  const { error } = await supabase.from('saved_meals').delete().eq('id', mealId).eq('athlete_id', athlete);
  if (error) {
    if (!isTransportFailure(error)) reportError(error);
    return false;
  }
  return true;
}

/** "2 eggs and toast" — each food its own diary row. */
export const logFoodExecutor: HoltActionExecutor = {
  async apply(input) {
    const card = holtFoodLogCard(input);
    if (!card || !mealCardComplete(card)) return refused('not_allowed');
    const slot = foodLogSlot(input, new Date().getHours());
    const entries = mealCardEntries(card, slot);
    let written;
    try {
      written = await addEntries(localToday(), entries);
    } catch (e) {
      return failure(e);
    }
    if (!written.length) return refused('not_allowed');
    const n = written.length;
    return {
      ok: true,
      undo: { action: 'log_food', entryIds: written.map((r) => r.id) },
      said: `Logged ${n} ${n === 1 ? 'food' : 'foods'} to ${MEAL_LABELS[slot]}.`,
    };
  },
  undo: removeRows,
};

/** An order as one meal: Log it (one row under its name), or Save as a meal (`opts.key === 'save'`). */
export const proposeMealExecutor: HoltActionExecutor = {
  async apply(input, opts) {
    const card = holtMealCard(input);
    if (!card || !mealCardComplete(card)) return refused('not_allowed');

    if (opts?.key === SAVE_MEAL_KEY) {
      const saved = await saveMealWhole(card.name, mealCardRows(card)).catch((error: unknown) => ({ ok: false as const, error }));
      if (!saved.ok) return failure(saved.error);
      return { ok: true, undo: { action: 'propose_meal', mealId: saved.mealId }, said: `Saved to My foods & meals as “${card.name}”.` };
    }

    const slot = foodLogSlot(null, new Date().getHours());
    const entry = mealCardEntry(card);
    let written;
    try {
      written = await addEntries(localToday(), [{ meal: slot, source: 'quick', name: entry.name, servingLabel: entry.servingLabel, quantity: 1, macros: entry.macros }]);
    } catch (e) {
      return failure(e);
    }
    if (!written.length) return refused('not_allowed');
    return { ok: true, undo: { action: 'propose_meal', entryIds: written.map((r) => r.id) }, said: `Logged to ${MEAL_LABELS[slot]}.` };
  },
  async undo(token) {
    return typeof token.mealId === 'string' ? deleteMeal(token) : removeRows(token);
  },
};

/** For lane C's `executorFor` (holt-actions-live.ts), wired by the integrator. */
export const HOLT_MEAL_EXECUTORS = {
  log_food: logFoodExecutor,
  propose_meal: proposeMealExecutor,
} as const satisfies Record<'log_food' | 'propose_meal', HoltActionExecutor>;
