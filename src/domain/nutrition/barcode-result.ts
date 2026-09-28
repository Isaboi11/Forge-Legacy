/**
 * ══ WHAT A BARCODE SCAN SHOULD DO WITH WHAT CAME BACK ══
 *
 * PO, 2026-09-28: *"I have a protein bar that forge did technically have but the macros weren't there. They
 * were all zero. So what should happen in that case? Cause I made a new one but not from scanning the
 * barcode cause forge would come up."*
 *
 * A record with no nutrition is not a food anyone can log — it is a name. Opening it as a match sent the
 * athlete to a page of zeros and, worse, off the only path that lets them fix it for everyone: Create Food
 * WITH the barcode, where "Share with Forge" lives (Amendment 004). So:
 *
 *   1. A shared Forge food for this barcode that has nutrition wins. A person checked it against the label
 *      (CF-D5), and it must beat the empty record the server has cached for the same code — the server
 *      returns its cache before it ever looks at shared foods.
 *   2. Otherwise the first result that has nutrition.
 *   3. Otherwise, if something came back with NO nutrition, that is `empty`: Create Food, with the barcode,
 *      and the name and brand filled in from the empty record so only the numbers are left to type.
 *   4. Nothing at all is `none` — the ordinary miss.
 *
 * "Has nutrition" is calories above zero, or any macro above zero. Blank and zero both count as nothing:
 * the record the PO hit had zeros, and a 0-calorie bar is not a protein bar.
 */

export interface BarcodeCandidate {
  name: string;
  brand?: string | null;
  kcal100: number | null;
  protein100: number | null;
  carb100: number | null;
  fat100: number | null;
}

export function hasNutrition(f: BarcodeCandidate): boolean {
  const n = (v: number | null) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);
  return n(f.kcal100) > 0 || n(f.protein100) + n(f.carb100) + n(f.fat100) > 0;
}

export type BarcodeOutcome<F extends BarcodeCandidate> =
  | { kind: 'food'; food: F }
  | { kind: 'empty'; name: string; brand: string | null }
  | { kind: 'none' };

export function pickBarcodeResult<F extends BarcodeCandidate>(found: readonly F[], shared: F | null): BarcodeOutcome<F> {
  if (shared && hasNutrition(shared)) return { kind: 'food', food: shared };
  const good = found.find(hasNutrition);
  if (good) return { kind: 'food', food: good };
  const blank = found[0] ?? shared;
  if (blank) return { kind: 'empty', name: blank.name?.trim() ?? '', brand: blank.brand?.trim() || null };
  return { kind: 'none' };
}

/** The 14-digit form every barcode is stored under (`share_community_food`, `food-search`). */
export function gtin14(raw: string): string {
  return raw.replace(/\D/g, '').padStart(14, '0').slice(-14);
}
