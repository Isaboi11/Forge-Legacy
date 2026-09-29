/**
 * The Overview's briefing — the design's greeting, summary paragraph, "Two things I'm watching" and
 * "What I'd do today" — written from REAL figures only.
 *
 * ══ EVERY SENTENCE IS A FACT OR IT IS NOT SAID ══
 *
 * The design (`Forge CRM.dc.html`) shows sample prose ("one review asks for Android", "Call Iron Temple
 * Gym"). None of that is copied. Each sentence below is assembled from a number the database returned,
 * and a sentence whose number is missing, zero or not comparable is left out rather than softened into
 * something that sounds informed. Opinion is limited to what follows arithmetically ("that puts churn at
 * 10.3%").
 *
 * Pure and dependency-free (no `@/` imports) so `node --test` runs it directly.
 */

export type RangeKey = '7D' | '30D' | '90D' | '1Y';

export const RANGE_INFO: Record<RangeKey, { days: number; label: string; prior: string; period: string }> = {
  '7D': { days: 7, label: '7 days', prior: 'prior 7 days', period: 'week' },
  '30D': { days: 30, label: '30 days', prior: 'prior 30 days', period: 'month' },
  '90D': { days: 90, label: '90 days', prior: 'prior 90 days', period: 'quarter' },
  '1Y': { days: 365, label: 'year', prior: 'prior year', period: 'year' },
};

/** "last 30 days" / "last year". */
export function lastLabel(r: RangeKey): string {
  return r === '1Y' ? 'last year' : `last ${RANGE_INFO[r].label}`;
}

export const usd0 = (v: number) => `${v < 0 ? '−' : ''}$${Math.round(Math.abs(v)).toLocaleString('en-US')}`;
export const usd2 = (v: number) => `${v < 0 ? '−' : ''}$${Math.abs(v).toFixed(2)}`;
export const int = (v: number) => Math.round(v).toLocaleString('en-US');
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Change vs the prior window, as the design writes it: "▲ +84% vs prior 30 days". Null when not comparable. */
export function deltaNote(
  value: number,
  prev: number,
  range: RangeKey,
  opts: { costUp?: boolean } = {},
): { text: string; tone: 'good' | 'bad' | null } | null {
  if (!Number.isFinite(value) || !Number.isFinite(prev)) return null;
  const prior = RANGE_INFO[range].prior;
  if (prev <= 0) return value > 0 ? { text: `New vs ${prior}`, tone: null } : null;
  const pct = Math.round(((value - prev) / prev) * 100);
  if (pct === 0) return { text: `No change vs ${prior}`, tone: null };
  const up = pct > 0;
  const good = opts.costUp ? !up : up;
  return { text: `${up ? '▲ +' : '▼ −'}${Math.abs(pct)}% vs ${prior}${opts.costUp && up ? ' · cost up' : ''}`, tone: good ? 'good' : 'bad' };
}

/** Sum a daily series into weeks, newest week last (the 1Y chart plots weeks, as the design does). */
export function rollWeekly(values: number[], days: string[]): { values: number[]; days: string[] } {
  const outV: number[] = [];
  const outD: string[] = [];
  for (let end = values.length; end > 0; end -= 7) {
    const start = Math.max(0, end - 7);
    outV.unshift(values.slice(start, end).reduce((a, b) => a + b, 0));
    outD.unshift(days[start]);
  }
  return { values: outV, days: outD };
}

export interface BriefingInput {
  now: Date;
  range: RangeKey;
  // money
  gross: number;
  grossPrev: number;
  paying: number;
  newPaid: number;
  churned: number;
  productionEvents: number;
  sandboxPurchases: number;
  /** Days since the newest purchase event, null when there has never been one. */
  lastPurchaseDaysAgo: number | null;
  // AI
  aiCost: number | null;
  aiCostPrev: number | null;
  /** What Premium AI subscribers pay per month at list price, when known. */
  aiRevenueMonthly: number | null;
  // operations
  criticalOpen: number | null;
  oldestCriticalDays: number | null;
  newUserReports: number | null;
  newCrashGroups: number | null;
  reportsWaiting: number | null;
  oldestReportDays: number | null;
  overdue: { id: string; name: string; daysOver: number }[] | null;
  // growth
  downloads: number | null;
  downloadsPrev: number | null;
  rating: number | null;
  ascConfigured: boolean | null;
  ascLastOk: boolean | null;
  ascMessage: string | null;
}

export type AttentionDest = 'bugs' | 'bugs:reports' | 'contacts' | 'moderation' | 'revenue' | 'appstore';

export interface AttentionItem {
  tag: string;
  tone: 'crit' | 'warn' | 'plain';
  title: string;
  meta: string;
  dest: AttentionDest;
  destLabel: string;
  /** A contact id for "Open contact". */
  arg?: string;
}

export interface Briefing {
  greeting: string;
  summary: string;
  watching: string | null;
  attention: AttentionItem[];
  signoff: string | null;
}

function greetingWord(now: Date): string {
  const h = now.getHours();
  return h < 12 ? 'Morning.' : h < 18 ? 'Afternoon.' : 'Evening.';
}

export function buildBriefing(b: BriefingInput): Briefing {
  const r = RANGE_INFO[b.range];
  const hasMoney = b.productionEvents > 0;

  // ── Greeting ──
  let mood: string;
  if (!hasMoney) mood = 'It’s early days.';
  else if (b.grossPrev > 0 && b.gross > b.grossPrev * 1.05) mood = `It was a good ${r.period}.`;
  else if (b.grossPrev > 0 && b.gross < b.grossPrev * 0.9) mood = `A quieter ${r.period}.`;
  else mood = `Here’s your ${r.period}.`;
  const greeting = `${greetingWord(b.now)} ${mood}`;

  // ── Summary paragraph ──
  let summary: string;
  if (!hasMoney) {
    summary =
      b.sandboxPurchases > 0
        ? `No real purchases yet. There ${plural(b.sandboxPurchases, 'has been 1 TestFlight test buy', `have been ${b.sandboxPurchases} TestFlight test buys`)}, which ${plural(b.sandboxPurchases, 'isn’t', 'aren’t')} real money. Your first real purchase will show here the moment it happens.`
        : 'No purchases yet. Your first one will show here the moment it happens.';
  } else {
    const parts: string[] = [];
    let first = `You brought in ${usd0(b.gross)} over the ${lastLabel(b.range)}`;
    if (b.grossPrev > 0) {
      const pct = Math.round(((b.gross - b.grossPrev) / b.grossPrev) * 100);
      first += pct === 0 ? `, the same as the ${r.prior}` : `, ${Math.abs(pct)}% ${pct > 0 ? 'more' : 'less'} than the ${r.prior}`;
    } else if (b.gross > 0) {
      first += `, up from nothing in the ${r.prior}`;
    }
    parts.push(`${first}.`);
    let second = `${int(b.paying)} ${plural(b.paying, 'person is', 'people are')} paying now`;
    if (b.newPaid > 0) second += `, ${int(b.newPaid)} of them new in this window`;
    parts.push(`${second}.`);
    summary = parts.join(' ');
  }

  // ── What I'm watching (at most two) ──
  const watch: string[] = [];
  if (b.aiCost != null && b.aiCostPrev != null && b.aiCostPrev > 0 && b.aiCost > b.aiCostPrev * 1.2) {
    const pct = Math.round(((b.aiCost - b.aiCostPrev) / b.aiCostPrev) * 100);
    const monthly = (b.aiCost / r.days) * 30;
    let s = `AI spend went up ${pct}% to ${usd2(b.aiCost)}`;
    if (b.aiRevenueMonthly != null && b.aiRevenueMonthly > 0) {
      s += monthly < b.aiRevenueMonthly ? `, still under the ${usd0(b.aiRevenueMonthly)} a month Premium AI brings in` : `, which is more than the ${usd0(b.aiRevenueMonthly)} a month Premium AI brings in`;
    }
    watch.push(`${s}.`);
  }
  if (hasMoney && b.churned > 0) {
    const base = b.paying + b.churned;
    const pct = base > 0 ? Math.round((b.churned / base) * 1000) / 10 : null;
    watch.push(`${int(b.churned)} ${plural(b.churned, 'person', 'people')} cancelled${pct != null ? `, which puts churn at ${pct}%` : ''}.`);
  }
  if (b.downloads != null && b.downloadsPrev != null && b.downloadsPrev >= 10 && b.downloads < b.downloadsPrev * 0.8) {
    const pct = Math.round(((b.downloadsPrev - b.downloads) / b.downloadsPrev) * 100);
    watch.push(`Downloads are down ${pct}% on the ${r.prior}.`);
  }
  const w = watch.slice(0, 2);
  const watching = w.length === 0 ? null : w.length === 1 ? `One thing I’m watching: ${w[0]}` : `Two things I’m watching for you. ${w.join(' ')}`;

  // ── What I'd do today ──
  const attention: AttentionItem[] = [];
  if (b.criticalOpen && b.criticalOpen > 0) {
    attention.push({
      tag: 'Critical',
      tone: 'crit',
      title: `Start with the ${b.criticalOpen} critical ${plural(b.criticalOpen, 'bug', 'bugs')}`,
      meta: b.oldestCriticalDays != null ? `The oldest has been open ${b.oldestCriticalDays} ${plural(b.oldestCriticalDays, 'day', 'days')}.` : 'Still open on the board.',
      dest: 'bugs',
      destLabel: 'Open bugs',
    });
  }
  if (b.overdue && b.overdue.length) {
    const top = [...b.overdue].sort((x, y) => y.daysOver - x.daysOver)[0];
    const more = b.overdue.length - 1;
    attention.push({
      tag: 'Overdue',
      tone: 'warn',
      title: `Follow up with ${top.name}`,
      meta:
        (top.daysOver === 0 ? 'The follow-up you set is today.' : `${top.daysOver} ${plural(top.daysOver, 'day', 'days')} past the follow-up you set.`) +
        (more > 0 ? ` ${more} more ${plural(more, 'contact is', 'contacts are')} due.` : ''),
      dest: 'contacts',
      destLabel: 'Open contact',
      arg: top.id,
    });
  }
  if (b.reportsWaiting && b.reportsWaiting > 0) {
    attention.push({
      tag: 'Waiting',
      tone: 'warn',
      title: `Answer the ${b.reportsWaiting} ${plural(b.reportsWaiting, 'report', 'reports')} waiting`,
      meta:
        b.oldestReportDays != null && b.oldestReportDays > 0
          ? `The oldest has waited ${b.oldestReportDays} ${plural(b.oldestReportDays, 'day', 'days')}. Apple expects a timely answer.`
          : 'Apple expects a timely answer.',
      dest: 'moderation',
      destLabel: 'Open moderation',
    });
  }
  const rep = b.newUserReports ?? 0;
  const cr = b.newCrashGroups ?? 0;
  if (rep > 0 || cr > 0) {
    const bits = [rep > 0 ? `${rep} new user ${plural(rep, 'report', 'reports')}` : null, cr > 0 ? `${cr} new ${plural(cr, 'crash', 'crashes')}` : null].filter(Boolean);
    attention.push({
      tag: 'New',
      tone: 'plain',
      title: `Sort the ${bits.join(' and ')}`,
      meta: 'Mark each one so it doesn’t pile up.',
      dest: 'bugs:reports',
      destLabel: 'Open reports',
    });
  }
  if (hasMoney && b.lastPurchaseDaysAgo != null && b.lastPurchaseDaysAgo > 7) {
    attention.push({
      tag: 'Check',
      tone: 'warn',
      title: 'Check the RevenueCat webhook',
      meta: `No purchase events in ${b.lastPurchaseDaysAgo} days. If people are still buying, the webhook has stopped reaching the database.`,
      dest: 'revenue',
      destLabel: 'Open revenue',
    });
  }
  if (b.ascLastOk === false) {
    attention.push({
      tag: 'Check',
      tone: 'warn',
      title: 'The last App Store sync failed',
      meta: b.ascMessage ? b.ascMessage : 'Run it again from the App Store page.',
      dest: 'appstore',
      destLabel: 'Open App Store',
    });
  } else if (b.ascConfigured === false) {
    attention.push({
      tag: 'Set up',
      tone: 'plain',
      title: 'Connect App Store Connect',
      meta: 'Downloads, ratings and reviews stay empty until the Apple key is added.',
      dest: 'appstore',
      destLabel: 'Open App Store',
    });
  }

  // ── Sign-off: only what is actually true and healthy ──
  const healthy: string[] = [];
  if (b.downloads != null && b.downloads > 0 && !(b.downloadsPrev != null && b.downloadsPrev >= 10 && b.downloads < b.downloadsPrev * 0.8)) healthy.push('downloads');
  if (b.rating != null && b.rating >= 4) healthy.push('ratings');
  if (hasMoney && b.grossPrev > 0 && b.gross >= b.grossPrev) healthy.push('revenue');
  let signoff: string | null = null;
  if (attention.length) {
    signoff = 'After that you’re clear.';
    if (healthy.length) {
      const list = healthy.length === 1 ? healthy[0] : `${healthy.slice(0, -1).join(', ')} and ${healthy[healthy.length - 1]}`;
      signoff += ` ${list[0].toUpperCase()}${list.slice(1)} ${healthy.length === 1 ? 'looks' : 'all look'} healthy.`;
    }
  }

  return { greeting, summary, watching, attention, signoff };
}
