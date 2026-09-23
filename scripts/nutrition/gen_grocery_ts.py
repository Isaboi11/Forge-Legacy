import json
from recipes import I, R
from grocery import G, SHOP

used = sorted({k for r in R for k, _ in r[6]})
ts = lambda v: json.dumps(v, ensure_ascii=False)

def buy_ts(b):
    if b[0] in ('lb', 'dozen'): return f"{{ kind: '{b[0]}' }}"
    if b[0] == 'each': return f"{{ kind: 'each', grams: {b[1]:g}, one: {ts(b[2])}, many: {ts(b[3])} }}"
    return f"{{ kind: 'pack', grams: {b[1]:g}, unit: {ts(b[2])} }}"

out = ["""/* ⚠ GENERATED — regenerate with scripts/nutrition/gen_grocery_ts.py (see grocery.py's header).
 *
 * How each ingredient is BOUGHT: its aisle, the unit a store sells it in, whether it is a pantry staple
 * (starts in "Have it"), and a price where a public government source has one:
 *   · USDA ERS Fruit and Vegetable Prices — 2023 data, updated 2025-12-09 (per pound as sold)
 *   · BLS Average Price Data — U.S. city average, August 2026 (series APU0000<item>)
 * Prices are converted to dollars per 100 g of the ingredient AS THE RECIPE WEIGHS IT — canned beans
 * drained (60% of net weight), an avocado without skin and seed, lemon as juice (84 g lemon → 48 g).
 *
 * ⚠ NO PRICE IS INVENTED. An ingredient with no public price is `price: null`, and the Grocery List
 * says how many items its estimate leaves out. Pack sizes are common US retail sizes, used only to
 * round a need up to something a store sells.
 */

export type Aisle = 'Produce' | 'Meat & Fish' | 'Dairy & Eggs' | 'Pantry' | 'Spices';

export type BuyUnit =
  | { kind: 'lb' }
  | { kind: 'dozen' }
  | { kind: 'each'; grams: number; one: string; many: string }
  | { kind: 'pack'; grams: number; unit: string };

export interface GroceryItemMeta {
  /** What it is called on a shopping list ("Lemons"), not how the recipe prepares it ("Lemon juice"). */
  name: string;
  aisle: Aisle;
  buy: BuyUnit;
  /** Salt, oil, spices… assumed in the kitchen: starts in "Have it". */
  staple: boolean;
  /** Dollars per 100 g as used, and where the number came from. Null = no public price. */
  price: { per100g: number; source: string } | null;
}

export const AISLES: readonly Aisle[] = ['Produce', 'Meat & Fish', 'Dairy & Eggs', 'Pantry', 'Spices'];

export const GROCERY: Record<string, GroceryItemMeta> = {"""]
for k in used:
    aisle, buy, staple, price = G[k]
    p = 'null' if not price else f"{{ per100g: {price['per100g']:g}, source: {ts(price['source'])} }}"
    out.append(f"  {k}: {{ name: {ts(SHOP.get(k, I[k][1]))}, aisle: {ts(aisle)}, buy: {buy_ts(buy)}, staple: {'true' if staple else 'false'}, price: {p} }},")
out.append("};\n")
open('grocery-data.gen.ts', 'w', encoding='utf-8', newline='\n').write('\n'.join(out))
print('ok', len(used))
