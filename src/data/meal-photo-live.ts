import { supabase } from '@/lib/supabase';
import { readAsBase64 } from '@/data/program-photo-live';
import { searchFoods } from '@/data/nutrition-live';
import { sniffMediaType } from '@/domain/program/photo-read-result';
import { MEAL_PHOTO_MEDIA, mealPhotoResultFrom, type MealItem, type MealPhotoResult } from '@/domain/nutrition/meal-photo-read';
import { rowFromHits, type ReviewRow } from '@/domain/nutrition/meal-photo-match';

/**
 * LOGGING A MEAL FROM A PHOTO — the client half of `meal-photo-read`, and the food-database match.
 *
 * `readMealPhoto` hands back what the model saw — food names and estimated portions, never a calorie
 * (NUT-D4) — re-guarded by `mealPhotoResultFrom` on arrival. `matchMealItems` then searches `food-search`
 * for every item and builds the review rows, whose every number comes from the matched food. Nothing here
 * logs anything: the screen writes through `addEntries`, the one diary write path, when the athlete taps Log.
 *
 * ⚠ NOTHING HERE HOLDS A KEY — the Edge Function is the only place Anthropic is called from.
 *
 * ⚠ THE PHOTO NEVER LEAVES FOR ANYWHERE ELSE (NUT-D7): read from the device, sent once, not uploaded to
 * storage and not cached beyond this session's in-memory result.
 *
 * ⚠ AN OUTAGE MUST NOT LOOK LIKE A VERDICT ON THE PHOTO — the same three-way split as
 * `recipe-photo-live.ts`: `offline` (no answer), `unavailable` (the server failed), and `not_food` /
 * `unreadable` (we looked).
 */

export type { MealPhotoResult };

/** The same picture picked twice is read once — keyed by its bytes, successful reads only. Session-only. */
const readByContent = new Map<string, MealPhotoResult>();
const MAX_REMEMBERED = 6;

function fingerprint(base64: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < base64.length; i++) {
    h ^= base64.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${base64.length}:${(h >>> 0).toString(36)}`;
}

/** Read one meal photo. ⚠ NEVER THROWS — it runs behind a button the athlete is waiting on. */
export async function readMealPhoto(uri: string): Promise<MealPhotoResult> {
  const file = await readAsBase64(uri);
  if (!file) return { kind: 'unsupported_format' };

  const mediaType = sniffMediaType(file.data) ?? file.mediaType;
  if (!MEAL_PHOTO_MEDIA.includes(mediaType)) return { kind: 'unsupported_format' };

  const key = fingerprint(file.data);
  const already = readByContent.get(key);
  if (already) return already;

  try {
    const { data, error } = await supabase.functions.invoke('meal-photo-read', {
      body: { image: file.data, mediaType },
    });

    // ⚠ A non-2xx is NOT "offline" — its body is on the error's `context` (see `program-photo-live.ts`).
    let body: unknown = data;
    if (error) {
      const ctx = (error as { context?: unknown }).context;
      if (!(ctx instanceof Response)) return { kind: 'offline' };
      body = await ctx.json().catch(() => null);
      if (!body) return { kind: 'unavailable' };
    }
    if (!body) return { kind: 'offline' };

    const result = mealPhotoResultFrom(body);
    if (result.kind === 'ok') {
      if (readByContent.size >= MAX_REMEMBERED) readByContent.delete(readByContent.keys().next().value!);
      readByContent.set(key, result);
    }
    return result;
  } catch {
    return { kind: 'offline' };
  }
}

/**
 * Every read item → a review row, matched against `food-search`. Searches run a few at a time — it is the
 * same function Log Food calls on a keystroke, and a plate is at most twelve items.
 *
 * `failed` counts items whose search got no answer at all (no signal, the function erred) — the screen
 * says "couldn't reach food search" for those rather than "no match", which would be a lie.
 */
export async function matchMealItems(items: MealItem[]): Promise<{ rows: ReviewRow[]; failed: number }> {
  const rows: ReviewRow[] = new Array(items.length);
  let failed = 0;
  const CONCURRENCY = 4;
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      const item = items[i];
      const found = await searchFoods(item.search || item.name).catch(() => ({ foods: [], failed: true }));
      // One retry for a search that never answered — USDA fails at random and a plate is worth the wait.
      const hits = found.failed ? await searchFoods(item.search || item.name).catch(() => ({ foods: [], failed: true })) : found;
      if (hits.failed) failed += 1;
      rows[i] = rowFromHits(`p${i}`, item, hits.foods);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
  return { rows, failed };
}
