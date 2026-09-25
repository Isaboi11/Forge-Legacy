/**
 * An Open Food Facts product → the app's food shape, for the PHONE-SIDE barcode fallback.
 *
 * Nutrition Architecture §4 says Open Food Facts is "looked up live from the device": its product API
 * allows 100 reads a minute PER IP, and every Supabase Edge Function shares a handful of egress
 * addresses, so the server's own call can be turned away while the phone's would not be. `food-search`
 * still asks it first (in parallel with USDA and FatSecret); when that whole answer is empty the app asks
 * Open Food Facts itself. PO, 2026-09-25: a protein bar scanned and "didn't pull up the food".
 *
 * Mirrors `offBarcode` in `supabase/functions/food-search` field for field, so a food found either way is
 * the same food. Pure, relative-imported, NUT-D4.
 */

import type { CatalogFood } from './serving.ts';

const num = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

/** `body` is the JSON of `GET /api/v2/product/<code>.json`. Null when it is not a loggable food. */
export function offProductToFood(body: unknown): CatalogFood | null {
  const b = body as { status?: number; product?: Record<string, any> } | null;
  if (!b || b.status !== 1 || !b.product) return null;
  const p = b.product;
  const n = (p.nutriments ?? {}) as Record<string, unknown>;
  const kcal = num(n['energy-kcal_100g']);
  const code = String(p.code ?? '').replace(/\D/g, '').replace(/^0+/, '');
  if (!p.product_name || kcal == null || !code) return null;

  const servings: CatalogFood['servings'] = [{ label: '100 g', grams: 100 }];
  if (p.serving_size) servings.unshift({ label: String(p.serving_size), grams: num(p.serving_quantity) });

  const micros: Record<string, number> = {};
  const fiber = num(n['fiber_100g']);
  const sugar = num(n['sugars_100g']);
  const satFat = num(n['saturated-fat_100g']);
  const sodium = num(n['sodium_100g']);
  if (fiber != null) micros.fiber = fiber;
  if (sugar != null) micros.sugar = sugar;
  if (satFat != null) micros.satFat = satFat;
  if (sodium != null) micros.sodium = sodium * 1000; // OFF reports grams; the app shows mg

  const brands = Array.isArray(p.brands) ? p.brands.join(', ') : p.brands;
  return {
    key: `off:${code}`,
    source: 'off',
    name: String(p.product_name).trim(),
    brand: brands ? String(brands) : null,
    kcal100: kcal,
    protein100: num(n['proteins_100g']),
    carb100: num(n['carbohydrates_100g']),
    fat100: num(n['fat_100g']),
    servings,
    micros: Object.keys(micros).length ? micros : null,
    attribution: 'Data from Open Food Facts (ODbL)',
  };
}
