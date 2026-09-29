/**
 * The Business CRM's arithmetic and wording (Admin-Analytics-Amendment-002, migration 0238).
 *
 * Pure and dependency-free — no `@/` imports, because `node --test` runs this file directly with type
 * stripping and a runtime alias would not resolve. Everything the CRM screens compute lives here so it
 * can be tested without a database or a renderer.
 */

/** "$1,234" / "$12.50" / "$0.0064". Small AI costs keep enough digits to not all read as $0.00. */
export function money(v: number | null | undefined, opts: { cents?: boolean } = {}): string {
  if (v == null || !Number.isFinite(v)) return '—';
  const neg = v < 0;
  const a = Math.abs(v);
  let body: string;
  if (a > 0 && a < 0.01) body = a.toFixed(4);
  else if (opts.cents || (a < 100 && a % 1 !== 0)) body = a.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  else body = Math.round(a).toLocaleString('en-US');
  return `${neg ? '−' : ''}$${body}`;
}

/** Whole-number percentage, or null when the denominator is zero — "no data" is not "0%". */
export function rate(num: number | null | undefined, den: number | null | undefined): number | null {
  if (num == null || den == null || den <= 0) return null;
  return Math.round((num / den) * 1000) / 10;
}

export function pctText(p: number | null): string {
  return p == null ? '—' : `${p % 1 === 0 ? p.toFixed(0) : p.toFixed(1)}%`;
}

/**
 * Apple's cut. The Small Business Program rate (15%) applies under $1M/year, which is where Forge is;
 * AA-D18 requires the result to be labelled an ESTIMATE everywhere it appears.
 */
export const APPLE_COMMISSION = 0.15;
export function netEstimate(gross: number): number {
  return Math.round(gross * (1 - APPLE_COMMISSION) * 100) / 100;
}

/**
 * Churn for the window: subscribers who lapsed ÷ (still paying + lapsed). The denominator is everyone
 * who was a subscriber at some point in the window — a simple, honest base that never exceeds 100%.
 */
export function churnRate(churned: number, payingNow: number): number | null {
  return rate(churned, payingNow + churned);
}

/** AI margin: what Premium AI subscribers pay per month against what their AI actually cost. */
export function aiMargin(aiRevenueMonthly: number, aiCostMonthly: number): { margin: number; pct: number | null } {
  const margin = Math.round((aiRevenueMonthly - aiCostMonthly) * 100) / 100;
  return { margin, pct: rate(margin, aiRevenueMonthly) };
}

/** "1.2 MB". */
export function bytes(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

export type DocCategory = 'legal' | 'finance' | 'business' | 'marketing' | 'spec' | 'other';

export const DOC_CATEGORIES: { key: DocCategory; label: string }[] = [
  { key: 'legal', label: 'Legal' },
  { key: 'finance', label: 'Finance' },
  { key: 'business', label: 'Business' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'spec', label: 'Specs' },
  { key: 'other', label: 'Other' },
];

/** A first guess at a document's shelf from its file name. The operator can always move it. */
export function guessCategory(fileName: string): DocCategory {
  const n = fileName.toLowerCase();
  if (/(llc|operating.?agreement|articles|contract|nda|terms|privacy|license|trademark|agreement|legal)/.test(n)) return 'legal';
  if (/(invoice|tax|w-?9|1099|receipt|bank|budget|p&l|profit|revenue|finance|payout|statement)/.test(n)) return 'finance';
  if (/(logo|brand|deck|press|screenshot|banner|marketing|social|poster|\.png$|\.jpe?g$|\.svg$)/.test(n)) return 'marketing';
  if (/(architecture|amendment|spec|prd|wireframe|\.md$)/.test(n)) return 'spec';
  if (/(plan|strategy|pitch|roadmap|business)/.test(n)) return 'business';
  return 'other';
}

/** A title from a file name: "LLC_Operating-Agreement.v2.pdf" → "LLC Operating Agreement v2". */
export function titleFromFile(fileName: string): string {
  const base = fileName.replace(/\.[a-z0-9]{1,5}$/i, '');
  const t = base.replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim();
  return t || fileName;
}

/**
 * Where a file lands in the private bucket: `<category>/<yyyy-mm>/<random>-<safe-name>`. The random
 * prefix means two uploads of "contract.pdf" never overwrite each other; the safe name keeps the path a
 * valid storage key whatever the original was called.
 */
export function storagePathFor(category: DocCategory, fileName: string, now: Date, rand: string): string {
  const safe = fileName
    .normalize('NFKD')
    .replace(/\p{M}/gu, '') // combining accents: é → e, not e-
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/-\./g, '.')
    .replace(/^-|-$/g, '')
    .slice(-120) || 'file';
  const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  return `${category}/${ym}/${rand}-${safe}`;
}

/** Follow-up wording relative to today (both as yyyy-mm-dd, local). */
export function followUpLabel(due: string | null | undefined, today: string): { text: string; overdue: boolean } | null {
  if (!due) return null;
  const d = Date.parse(`${due}T00:00:00Z`);
  const t = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(d) || Number.isNaN(t)) return null;
  const days = Math.round((d - t) / 86_400_000);
  if (days < 0) return { text: days === -1 ? 'follow up — 1 day overdue' : `follow up — ${-days} days overdue`, overdue: true };
  if (days === 0) return { text: 'follow up today', overdue: true };
  if (days === 1) return { text: 'follow up tomorrow', overdue: false };
  return { text: `follow up in ${days} days`, overdue: false };
}

export function todayKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** "premium_ai_annual_v1" → "Premium AI · Annual". Unknown ids pass through, readable. */
export function productLabel(id: string | null | undefined): string {
  if (!id) return '—';
  const early = id.startsWith('earlybird_') ? 'Early Bird ' : '';
  const s = id.replace(/^earlybird_/, '');
  const plan = s.startsWith('premium_ai') ? 'Premium AI' : s.startsWith('premium') ? 'Premium' : s.startsWith('testerai') ? 'Tester AI' : null;
  const period = /annual|yearly/.test(s) ? 'Annual' : /month/.test(s) ? 'Monthly' : null;
  if (!plan) return id;
  return `${early}${plan}${period ? ` · ${period}` : ''}`;
}

const ACTION_LABELS: Record<string, string> = {
  message: 'Holt chat',
  program: 'Holt program',
  day: 'Holt day',
  photo_read: 'Photo read',
  form_check: 'Form check',
  meal_photo: 'Meal photo',
  recipe_photo: 'Recipe photo',
  kitchen: 'Holt’s Kitchen',
  workout_tidy: 'Workout tidy',
};

/** An AI metering action in words. Unknown actions pass through readable — a new feature still shows up. */
export function actionLabel(a: string): string {
  return ACTION_LABELS[a] ?? a.replace(/_/g, ' ');
}

const STORE_EVENT_LABELS: Record<string, string> = {
  INITIAL_PURCHASE: 'First purchase',
  RENEWAL: 'Renewal',
  CANCELLATION: 'Cancelled',
  UNCANCELLATION: 'Resubscribed',
  EXPIRATION: 'Expired',
  BILLING_ISSUE: 'Billing problem',
  PRODUCT_CHANGE: 'Changed plan',
  NON_RENEWING_PURCHASE: 'One-time purchase',
  SUBSCRIPTION_PAUSED: 'Paused',
  TRANSFER: 'Moved accounts',
};

/** A RevenueCat event type in words ("INITIAL_PURCHASE" → "First purchase"). */
export function storeEventLabel(t: string): string {
  return STORE_EVENT_LABELS[t] ?? t.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export type BugSeverity ='critical' | 'high' | 'medium' | 'low';
export type BugStatus = 'open' | 'in_progress' | 'fixed' | 'wont_fix';

export const SEVERITIES: BugSeverity[] = ['critical', 'high', 'medium', 'low'];
export const BUG_STATUSES: { key: BugStatus; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'fixed', label: 'Fixed' },
  { key: 'wont_fix', label: 'Won’t fix' },
];

export type ContactKind = 'tester' | 'trainer' | 'business' | 'user' | 'other';
export type ContactStage = 'lead' | 'contacted' | 'in_talks' | 'active' | 'inactive';

export const CONTACT_KINDS: { key: ContactKind; label: string }[] = [
  { key: 'business', label: 'Business' },
  { key: 'tester', label: 'Testers' },
  { key: 'trainer', label: 'Trainers' },
  { key: 'user', label: 'App users' },
  { key: 'other', label: 'Other' },
];

export const CONTACT_STAGES: { key: ContactStage; label: string }[] = [
  { key: 'lead', label: 'Lead' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'in_talks', label: 'In talks' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
];

/** Comma/space separated tags → a clean, de-duplicated list. */
export function parseTags(input: string): string[] {
  const out: string[] = [];
  for (const raw of input.split(/[,\n]/)) {
    const t = raw.trim().replace(/^#/, '').toLowerCase();
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}
