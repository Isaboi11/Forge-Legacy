/**
 * The Revenue page's one-line note, from the page's real numbers only.
 *
 * Pure and dependency-free (no imports) so `node --test` runs it directly. Facts only: a sentence whose
 * number is missing or not comparable is left out, never guessed at.
 */

export interface RevenueNoteInput {
  /** "30 days" / "year" — the window as the page names it. */
  period: string;
  /** "prior 30 days". */
  prior: string;
  includeSandbox: boolean;
  gross: number;
  grossPrev: number;
  /** All-time production (real-money) store events. */
  productionEvents: number;
  /** All-time TestFlight test BUYS. */
  sandboxPurchases: number;
  /** Products in the window, any order; labels already readable ("Premium · Annual"). */
  byProduct: { label: string; gross: number; events: number }[];
}

const usd = (v: number) => `${v < 0 ? '−' : ''}$${Math.round(Math.abs(v)).toLocaleString('en-US')}`;
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** True when the page should show the design's "test data only" state. */
export function isTestOnly(i: Pick<RevenueNoteInput, 'includeSandbox' | 'productionEvents' | 'sandboxPurchases'>): boolean {
  return !i.includeSandbox && i.productionEvents === 0 && i.sandboxPurchases > 0;
}

export function revenueNote(i: RevenueNoteInput): string {
  if (isTestOnly(i)) {
    return `Only TestFlight purchases so far: ${i.sandboxPurchases} test ${plural(i.sandboxPurchases, 'buy', 'buys')}, none of ${plural(i.sandboxPurchases, 'it', 'them')} real money. Your first real purchase will show here the moment it happens.`;
  }
  if (i.productionEvents === 0 && !(i.includeSandbox && i.sandboxPurchases > 0)) {
    return 'No purchases recorded yet. The first one appears here within seconds of someone buying.';
  }
  if (!(i.gross > 0)) {
    return i.grossPrev > 0
      ? `No revenue in the last ${i.period}, down from ${usd(i.grossPrev)} in the ${i.prior}.`
      : `No revenue in the last ${i.period}.`;
  }

  let first = `${usd(i.gross)} gross over the last ${i.period}`;
  if (i.grossPrev > 0) {
    const pct = Math.round(((i.gross - i.grossPrev) / i.grossPrev) * 100);
    first += pct === 0 ? `, the same as the ${i.prior}` : `, ${Math.abs(pct)}% ${pct > 0 ? 'more' : 'less'} than the ${i.prior}`;
  } else {
    first += `, up from nothing in the ${i.prior}`;
  }
  first += '.';

  const top = [...i.byProduct].filter((p) => p.gross > 0).sort((a, b) => b.gross - a.gross)[0];
  if (!top) return first;
  // One product is the whole window: say so rather than "X of X".
  if (Math.abs(top.gross - i.gross) < 0.005) {
    return `${first} All of it came from ${top.label} (${top.events} ${plural(top.events, 'purchase', 'purchases')}).`;
  }
  return `${first} ${top.label} brought in the most: ${usd(top.gross)} of the ${usd(i.gross)}, from ${top.events} ${plural(top.events, 'purchase', 'purchases')}.`;
}
