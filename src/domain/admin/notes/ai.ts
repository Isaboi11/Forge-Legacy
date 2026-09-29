/**
 * The AI usage page's one-line note, from the page's real numbers only.
 *
 * Pure and dependency-free so `node --test` runs it directly. Facts and arithmetic only.
 */

export interface AiNoteInput {
  /** "30 days" / "year". */
  period: string;
  /** Length of the window in days — to put the window's cost on a per-month footing. */
  days: number;
  calls: number;
  cost: number;
  /** Athletes who made at least one AI call in the window. */
  athletes: number;
  /** Athletes on Premium AI right now; null when not loaded. */
  premiumAi: number | null;
  /** What Premium AI costs over Premium per month, at list price. */
  priceOver: number;
  /** Features in the window; labels already readable ("Holt chat"). */
  byFeature: { label: string; calls: number; cost: number }[];
}

const usd2 = (v: number) => `$${v.toFixed(2)}`;
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export function aiNote(i: AiNoteInput): string {
  if (!(i.calls > 0)) return 'No AI calls yet. Costs show up as soon as someone uses Holt or a photo feature.';

  const monthly = (i.cost / Math.max(1, i.days)) * 30;
  let first: string;
  if (i.premiumAi != null && i.premiumAi > 0) {
    // Every AI call is counted against Premium AI athletes, so this is the most it could be per head.
    first = `AI is costing you about ${usd2(monthly / i.premiumAi)} per Premium AI athlete a month, against the ${usd2(i.priceOver)} extra they pay.`;
  } else {
    first = `AI cost ${usd2(i.cost)} over the last ${i.period}, across ${i.athletes} ${plural(i.athletes, 'athlete', 'athletes')}.`;
  }

  const used = i.byFeature.filter((f) => f.calls > 0);
  if (!used.length) return first;
  if (used.length === 1) return `${first} ${used[0].label} is the only feature used.`;
  const busiest = [...used].sort((a, b) => b.calls - a.calls)[0];
  const dearest = [...used].sort((a, b) => b.cost / b.calls - a.cost / a.calls)[0];
  if (busiest.label === dearest.label) return `${first} ${busiest.label} is both the busiest feature and the most expensive per call.`;
  return `${first} ${busiest.label} is the busiest feature; ${dearest.label} is the most expensive per call.`;
}
