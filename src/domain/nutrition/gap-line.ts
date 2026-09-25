import { type Macros, type Targets } from './day.ts';
import { GROCERY } from './grocery-data.ts';
import { INGREDIENTS } from './recipes-data.ts';

/**
 * THE GAP LINE (`Coach-Holt-Check-ins-Scope-v1.0` §3, LOCKED by the PO 2026-09-24). The in-app half, OTA, ahead
 * of the push version, which needs the reminder system first.
 *
 * PO: *"Looks like you need 15 g more of protein. Did you end up getting that yogurt on the grocery list? That
 * would be perfect."*
 *
 * Every word and number is chosen here, by code. No model is involved (NUT-D4):
 *   · the GAP is the target minus the diary, protein only in v1 (the macro training asks for);
 *   · the ITEM comes only from the athlete's own Grocery List, whether bought, have-it or still to buy. It is
 *     never a food they don't have (suggestions from outside the list are the Kitchen's job);
 *   · the PORTION is a common one ("a cup", "two large eggs") from the ingredient's own US measure, and must
 *     cover the gap WITHOUT going past the day's calories.
 *
 * ⚠ SILENT WHEN IT SHOULD BE: before 2 pm (a morning gap is just a morning); with no target or nothing logged;
 * when calories are under half the target, because that is not a protein gap, that is not having eaten, and
 * the care response owns it, never a snack nudge; when nothing on the list fits; and when the gap is too
 * small to mention or too big for one item.
 */
export type PantryStatus = 'bought' | 'have' | 'to_buy';
export interface PantryItem {
  key: string;
  status: PantryStatus;
}

export const GAP_LINE_FROM_HOUR = 14;
const MIN_GAP = 5;
const MAX_GAP = 60;

interface Portion {
  label: string;
  grams: number;
}

const WORDS = ['', 'one', 'two'];

/** The common portions to try for an ingredient, smallest first. Condiments (tsp) never close a gap. */
function portionsFor(key: string): Portion[] {
  const ing = INGREDIENTS[key as keyof typeof INGREDIENTS];
  if (!ing) return [];
  const us = ing.us;
  if (us.kind === 'each') return [1, 2].map((n) => ({ label: `${WORDS[n]} ${n === 1 ? us.one : us.many}`, grams: us.grams * n }));
  if (us.kind === 'cup') return [{ label: 'half a cup', grams: us.grams / 2 }, { label: 'a cup', grams: us.grams }];
  if (us.kind === 'oz') return [3, 4].map((n) => ({ label: `${n} oz`, grams: n * 28.35 }));
  return [];
}

/** "Greek yogurt" stays capitalised; "Eggs" reads "eggs" mid-sentence. */
function listName(key: string): string {
  const name = GROCERY[key]?.name ?? INGREDIENTS[key as keyof typeof INGREDIENTS]?.name ?? key;
  return /^(Greek|Italian|Parmesan)\b/.test(name) ? name : name.charAt(0).toLowerCase() + name.slice(1);
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function gapLine(input: { eaten: Macros; logged: boolean; target: Targets | null; hour: number; pantry: readonly PantryItem[] }): string | null {
  const { eaten, logged, target, hour, pantry } = input;
  if (!target || !logged || hour < GAP_LINE_FROM_HOUR) return null;
  if (eaten.kcal < target.kcal * 0.5) return null; // not a protein gap: the care response's ground
  const gap = Math.round(target.protein - eaten.protein);
  const kcalLeft = target.kcal - eaten.kcal;
  if (gap < MIN_GAP || gap > MAX_GAP || kcalLeft <= 0) return null;

  const rank: Record<PantryStatus, number> = { bought: 0, have: 0, to_buy: 1 };
  const fits = pantry
    .flatMap((p) => {
      const ing = INGREDIENTS[p.key as keyof typeof INGREDIENTS];
      if (!ing) return [];
      // The smallest common portion that covers the gap, if it also fits the calories left.
      const portion = portionsFor(p.key).find((q) => (q.grams * ing.protein) / 100 >= gap);
      if (!portion) return [];
      const kcal = (portion.grams * ing.kcal) / 100;
      return kcal <= kcalLeft ? [{ ...p, portion, kcal }] : [];
    })
    .sort((a, b) => rank[a.status] - rank[b.status] || a.kcal - b.kcal);

  const pick = fits[0];
  if (!pick) return null;
  const name = listName(pick.key);
  return pick.status === 'to_buy'
    ? `${gap} g protein to go. Did you pick up the ${name} on your list? ${cap(pick.portion.label)} would cover it.`
    : `You've got ${name} from this week's list. ${cap(pick.portion.label)} would cover the last ${gap} g of protein.`;
}

/** The athlete's pantry from this week's Grocery List state: bought (checked), have-it, and still to buy. */
export function pantryFrom(listKeys: readonly string[], state: { checked: Record<string, true>; have: Record<string, true>; removed: Record<string, true>; extras: { key: string }[] }): PantryItem[] {
  const keys = new Set([...listKeys, ...state.extras.map((x) => x.key)]);
  return [...keys]
    .filter((k) => !state.removed[k])
    .map((key) => ({ key, status: state.have[key] ? 'have' : state.checked[key] ? 'bought' : 'to_buy' }) as PantryItem);
}
