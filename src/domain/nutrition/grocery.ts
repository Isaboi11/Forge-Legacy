import { AISLES, GROCERY, type Aisle, type BuyUnit } from './grocery-data.ts';
import { DAY_NAMES, cooksOf, recipeView, type PlanDay } from './meal-planner.ts';
import { INGREDIENTS, type PlanSlot } from './recipes-data.ts';

/**
 * Grocery List — built from the week's COOKS, never from the meals shown (Recipe Schema and Planner
 * Rules §1): a chilli cooked Monday for dinner and Tuesday's leftover lunch is bought once, for both.
 * Built to `Grocery List.dc.html`; pure so `node --test` can prove the totals a shopper buys against.
 *
 * ⚠ **THE ESTIMATE IS SOURCED OR IT IS SILENT.** Prices come from USDA ERS and BLS (`grocery-data.ts`).
 * Anything without a public price is left out of the total and COUNTED, so the line can say "3 items
 * not priced" instead of implying a number covers the whole list.
 */

const SLOT_LABEL: Record<PlanSlot, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snack' };

export interface GroceryUse {
  day: string;
  slot: string;
  recipe: string;
  servings: number;
  grams: number;
}

export interface GroceryItem {
  key: string;
  name: string;
  aisle: Aisle;
  /** "1½ lb", "12-count", "2 cans" — what to pick up. */
  amount: string;
  grams: number;
  staple: boolean;
  /** Dollars for the grams the recipes use, or null when there is no public price. */
  cost: number | null;
  uses: GroceryUse[];
}

export interface GroceryList {
  items: GroceryItem[];
  /** Times someone is in the kitchen this week (Rules §3 "cook count is a planner output"). */
  cooks: number;
}

/** Two recipe ingredients that are one thing in a shop: boiled eggs are eggs. */
const SAME_ITEM: Record<string, string> = { boiled_egg: 'egg' };

const plural = (w: string): string => (/(x|ch|sh|s)$/.test(w) ? `${w}es` : `${w}s`);

/** Round a need UP to what a store sells — the design's `buyAmount`. */
export function buyAmount(buy: BuyUnit, grams: number): string {
  if (buy.kind === 'lb') {
    const lb = Math.max(0.5, Math.ceil((grams / 453.6) * 2) / 2);
    return `${lb % 1 ? `${Math.floor(lb) || ''}½` : lb} lb`;
  }
  if (buy.kind === 'dozen') return `${Math.ceil(grams / 50 / 6) * 6}-count`;
  const n = Math.max(1, Math.ceil(grams / buy.grams - 1e-9));
  if (buy.kind === 'each') return `${n} ${n > 1 ? buy.many : buy.one}`;
  if (n === 1) return `1 ${buy.unit}`;
  const unit = / of /.test(buy.unit) ? buy.unit.replace(/^pack/, 'packs') : buy.unit.replace(/(\S+)$/, (m) => plural(m));
  return `${n} ${unit}`;
}

/** The week's list: every cook's ingredients × the servings it makes, summed per ingredient. */
export function groceryList(days: PlanDay[], household: number): GroceryList {
  const acc = new Map<string, { grams: number; uses: GroceryUse[] }>();
  const cooks = cooksOf(days, household);
  for (const c of cooks) {
    const view = recipeView(c.recipeId);
    if (!view) continue;
    const use = { day: DAY_NAMES[c.d], slot: SLOT_LABEL[c.slot], recipe: view.name, servings: c.servingsCooked };
    for (const { key: ingredient, g: perServing } of view.ingredients) {
      const key = SAME_ITEM[ingredient] ?? ingredient;
      const g = perServing * c.servingsCooked;
      const a = acc.get(key) ?? { grams: 0, uses: [] };
      a.grams += g;
      a.uses.push({ ...use, grams: Math.round(g) });
      acc.set(key, a);
    }
  }
  const items: GroceryItem[] = [...acc.entries()].map(([key, a]) => {
    const meta = GROCERY[key];
    const ing = INGREDIENTS[key as keyof typeof INGREDIENTS];
    return {
      key,
      name: meta?.name ?? ing?.name ?? key,
      aisle: meta?.aisle ?? 'Pantry',
      amount: meta ? buyAmount(meta.buy, a.grams) : `${Math.round(a.grams)} g`,
      grams: Math.round(a.grams),
      staple: !!meta?.staple,
      cost: meta?.price ? (a.grams * meta.price.per100g) / 100 : null,
      uses: a.uses,
    };
  });
  items.sort((x, y) => AISLES.indexOf(x.aisle) - AISLES.indexOf(y.aisle) || x.name.localeCompare(y.name));
  return { items, cooks: cooks.length };
}

/* ── the shopper's own marks ────────────────────────────────────────────── */

/** What the athlete did to the list — stored with the week (`meal_plan_weeks.grocery`, 0212). */
export interface GroceryState {
  /** The plan this state was made against. When the week changes, checks reset; "have it" and extras stay. */
  sig: string;
  checked: Record<string, true>;
  have: Record<string, true>;
  removed: Record<string, true>;
  extras: { key: string; name: string }[];
}

/** A fingerprint of what the list is built from — the cooks and the household. */
export function planSignature(days: PlanDay[], household: number): string {
  return `${days.map((d) => d.items.map((i) => `${i.recipeId}${i.leftover ? 'L' : ''}${i.portion ?? 1}`).join(',')).join('|')}#${household}`;
}

/**
 * The state to show for this plan. First visit: staples start in "Have it". A changed plan clears the
 * cart (last week's ticks do not describe this week's list) but keeps what the athlete has at home and
 * what they added themselves.
 */
export function stateFor(saved: Partial<GroceryState> | null, list: GroceryList, sig: string): GroceryState {
  if (!saved || !saved.sig) {
    const have: Record<string, true> = {};
    for (const it of list.items) if (it.staple) have[it.key] = true;
    return { sig, checked: {}, have, removed: {}, extras: [] };
  }
  const extras = saved.extras ?? [];
  if (saved.sig === sig) {
    return { sig, checked: saved.checked ?? {}, have: saved.have ?? {}, removed: saved.removed ?? {}, extras };
  }
  const checked: Record<string, true> = {};
  for (const x of extras) if (saved.checked?.[x.key]) checked[x.key] = true;
  return { sig, checked, have: saved.have ?? {}, removed: {}, extras };
}

export interface ActiveItem {
  key: string;
  name: string;
  amount: string;
  aisle: Aisle | 'Other';
  extra: boolean;
  item: GroceryItem | null;
}

/** What is still to buy (or in the cart): the list minus "have it" and removed, plus the athlete's own. */
export function activeItems(list: GroceryList, s: GroceryState): ActiveItem[] {
  return [
    ...list.items
      .filter((x) => !s.have[x.key] && !s.removed[x.key])
      .map((x) => ({ key: x.key, name: x.name, amount: x.amount, aisle: x.aisle, extra: false, item: x })),
    ...s.extras.map((x) => ({ key: x.key, name: x.name, amount: '', aisle: 'Other' as const, extra: true, item: null })),
  ];
}

/** Add something the plan did not: trimmed, capitalised, never a duplicate. Returns what happened. */
export function addExtra(
  list: GroceryList,
  s: GroceryState,
  typed: string,
): { state: GroceryState; note: string | null } {
  const name = typed.trim().replace(/\s+/g, ' ').slice(0, 40);
  if (!name) return { state: s, note: null };
  const label = name.charAt(0).toUpperCase() + name.slice(1);
  const lower = label.toLowerCase();
  const onList = list.items.find((x) => x.name.toLowerCase() === lower);
  if (onList && s.have[onList.key]) {
    const have = { ...s.have };
    delete have[onList.key];
    return { state: { ...s, have }, note: null };
  }
  if (onList && s.removed[onList.key]) {
    const removed = { ...s.removed };
    delete removed[onList.key];
    return { state: { ...s, removed }, note: null };
  }
  const key = `x:${lower}`;
  if (onList || s.extras.some((x) => x.key === key)) return { state: s, note: `${label} is already on the list` };
  return { state: { ...s, extras: [...s.extras, { key, name: label }] }, note: null };
}

export const toggle = (m: Record<string, true>, key: string): Record<string, true> => {
  const next = { ...m };
  if (next[key]) delete next[key];
  else next[key] = true;
  return next;
};

/** Mark as "have it": off the list and out of the cart. */
export function markHave(s: GroceryState, key: string): GroceryState {
  const checked = { ...s.checked };
  delete checked[key];
  return { ...s, have: { ...s.have, [key]: true }, checked };
}

/* ── the estimate ───────────────────────────────────────────────────────── */

export interface Estimate {
  dollars: number;
  /** Items still to buy that have no public price — said out loud. */
  unpriced: number;
}

/** What the items still on the list cost at average US prices. Staples at home are not bought. */
export function estimateFor(list: GroceryList, s: GroceryState): Estimate {
  let dollars = 0;
  let unpriced = 0;
  for (const x of list.items) {
    if (s.have[x.key] || s.removed[x.key]) continue;
    if (x.cost == null) unpriced++;
    else dollars += x.cost;
  }
  return { dollars, unpriced };
}

export function estimateLine(e: Estimate, budget: number | null): string {
  const base = `≈ $${Math.round(e.dollars).toLocaleString('en-US')} at average US prices`;
  const parts = [budget ? `${base} · budget $${budget.toLocaleString('en-US')}` : base];
  if (e.unpriced) parts.push(`${e.unpriced} ${e.unpriced === 1 ? 'item' : 'items'} not priced`);
  return parts.join(' · ');
}

/* ── share ──────────────────────────────────────────────────────────────── */

export function shareText(rangeLabel: string, active: ActiveItem[], s: GroceryState): string {
  const lines = [`Grocery list · ${rangeLabel}`, ''];
  for (const a of [...AISLES, 'Other'] as const) {
    const its = active.filter((x) => x.aisle === a && !s.checked[x.key]);
    if (!its.length) continue;
    lines.push(a.toUpperCase());
    for (const x of its) lines.push(x.amount ? `- ${x.name} · ${x.amount}` : `- ${x.name}`);
    lines.push('');
  }
  return lines.join('\n').trim();
}
