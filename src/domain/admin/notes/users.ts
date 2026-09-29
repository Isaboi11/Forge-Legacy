/**
 * Users & plans — the page note, and how one roster row reads (plan text + status tag).
 *
 * Pure and dependency-free so `node --test` can load it directly. Facts only.
 */

export interface UsersNoteInput {
  athletes: number;
  new30: number;
  /** Counts by the same rules as the list chips (admin_tiers.lists). */
  paying: number;
  trials: number;
  lapsed: number;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

export function usersNote(i: UsersNoteInput): string {
  if (i.athletes <= 0) return 'No athletes yet. People appear here the moment they sign up.';
  const first = `${fmt(i.athletes)} ${plural(i.athletes, 'athlete', 'athletes')}, ${fmt(i.new30)} new in the last 30 days.`;
  if (i.paying <= 0 && i.trials <= 0 && i.lapsed <= 0) return `${first} Nobody has bought a subscription yet.`;
  const parts = [`${fmt(i.paying)} paying`];
  if (i.trials > 0) parts.push(`${fmt(i.trials)} on a trial`);
  if (i.lapsed > 0) parts.push(`${fmt(i.lapsed)} lapsed`);
  return `${first} ${parts.join(', ')}.`;
}

// ── One roster row ──────────────────────────────────────────────────────────

/** The subset of a billing-list / search row this needs (admin_billing_list, admin_user_search). */
export interface PlanRowInput {
  tier: 'FREE' | 'PREMIUM';
  premium_kind: string | null;
  premium_ai: boolean;
  founder_seat: number | null;
  comped: boolean;
  /** The live store subscription's product, if any. */
  product: string | null;
  period_type: string | null;
  last_paid_until: string | null;
}

export type PlanStatus = 'Paying' | 'Trial' | 'Lapsed' | 'Comped' | 'Founder' | 'Granted' | 'Free';

const PAID_PERIODS = ['NORMAL', 'INTRO', 'PREPAID'];

/**
 * The row's status tag. The store subscription decides first (it is what money says), then the
 * entitlement row. "Lapsed" = ever paid, nothing live now — the same rule as the Lapsed list.
 */
export function planStatus(r: PlanRowInput): PlanStatus {
  if (r.product && r.period_type === 'TRIAL') return 'Trial';
  if (r.product && PAID_PERIODS.includes(r.period_type ?? '')) return 'Paying';
  if (!r.product && r.last_paid_until) return 'Lapsed';
  if (r.comped) return 'Comped';
  if (r.tier === 'PREMIUM' && r.premium_kind === 'FOUNDER') return 'Founder';
  if (r.tier === 'PREMIUM' || r.premium_ai) return 'Granted';
  return 'Free';
}

/**
 * The plan in words when there is no live store product to name (`productLabel` covers that case).
 * A Premium without a purchase came from somewhere else — grant, founder seat, lifetime, or the
 * app-wide default tier — and says which.
 */
export function planWithoutProduct(r: PlanRowInput): string {
  const base = r.premium_ai ? 'Premium AI' : 'Premium';
  if (r.tier !== 'PREMIUM') return r.premium_ai ? 'Free + Premium AI' : 'Free';
  switch (r.premium_kind) {
    case 'GRANT':
      return `${base} · granted`;
    case 'FOUNDER':
      return r.founder_seat != null ? `${base} · founder seat ${r.founder_seat}` : `${base} · founder`;
    case 'LIFETIME':
      return `${base} · lifetime`;
    case 'MONTHLY':
      return `${base} · monthly`;
    case 'ANNUAL':
      return `${base} · annual`;
    default:
      return `${base} · default for everyone`;
  }
}
