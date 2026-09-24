/**
 * What P-8 shows, and in what order — the plan picker's arithmetic with no store SDK and no React in it.
 *
 * ══ WHY THIS IS A DOMAIN MODULE ══
 *
 * Every rule the P-8 wireframe spec calls out by decision number is a pure function of the plans the
 * store returned and the caps the server configured: which rows render, which one starts selected, what
 * the saving is, what each column of the comparison says. Those are the things that go quietly wrong —
 * a trial the store never granted, a saving computed against the wrong cadence, a "unlimited squads" claim the
 * tier does not deliver — and they are invisible until money changes hands. `node --test` can prove them.
 *
 * ⚠ `@/` IS TYPE-ONLY IN DOMAIN CODE. A runtime `@/` import here breaks `node --test`. Relative `.ts`.
 *
 * ══ ⚠ NO PRICE IS WRITTEN DOWN HERE, AND NONE MAY BE ══
 *
 * P-8 §80 and P8W-D3 are binding: every price is the localized string the platform returned. This file
 * never composes, formats, rounds or guesses one. The single number it derives is the annual **saving
 * percentage**, which is a ratio of two platform prices and carries no currency — and it renders nothing
 * at all when either price is missing or the two are in different currencies.
 *
 * If you are about to write a currency amount into this file: that is the thing the spec forbids, and
 * `plans-core.test.mjs` fails the build over it — including over an example in a comment, because a
 * naive grep of the P-8 surface has to come back empty for the check to mean anything.
 */

import { UNLIMITED, usageLabel, type CapKey, type Caps, type Usage } from '../entitlement/caps-core.ts';

// ── the plans ────────────────────────────────────────────────────────────────

/**
 * What a plan row IS: a tier and a cadence. Monetization Amendment 006 (three plans, each containing the
 * one below) and Amendment 007 (no lifetime, no Founder; Early Bird is the same plans, discounted).
 *
 *   premium     — Premium.
 *   premium_ai  — Premium AI: Premium plus the AI coach (grants BOTH entitlements, MA6-D3).
 *   ai_addon    — the comped testers' AI add-on (MA7-D7). `coach_ai` only; their Premium is the comp.
 */
export type PlanTier = 'premium' | 'premium_ai' | 'ai_addon';
export type Cadence = 'annual' | 'monthly';

/**
 * ⚠ A SLOT IS A REVENUECAT *PACKAGE* ID, AND NEVER A PRODUCT ID.
 *
 * The package ids are the same in every offering (Amendment 007, "RevenueCat layout"), so a regular plan
 * and its Early Bird twin are one slot and the screen never learns which price list it is reading. The
 * product ids carry their price in their name and stay in the RevenueCat dashboard — importing one would
 * smuggle a price past the grep in `plans-core.test.mjs`.
 */
export type PlanSlot =
  | 'premium_annual'
  | 'premium_monthly'
  | 'premium_ai_annual'
  | 'premium_ai_monthly'
  | 'ai_addon_annual'
  | 'ai_addon_monthly';

export const PLAN_SLOTS: readonly PlanSlot[] = [
  'premium_annual',
  'premium_monthly',
  'premium_ai_annual',
  'premium_ai_monthly',
  'ai_addon_annual',
  'ai_addon_monthly',
];

export function isPlanSlot(id: string): id is PlanSlot {
  return (PLAN_SLOTS as readonly string[]).includes(id);
}

export function tierOf(slot: PlanSlot): PlanTier {
  if (slot.startsWith('premium_ai_')) return 'premium_ai';
  if (slot.startsWith('ai_addon_')) return 'ai_addon';
  return 'premium';
}

export function cadenceOf(slot: PlanSlot): Cadence {
  return slot.endsWith('_annual') ? 'annual' : 'monthly';
}

export function slotFor(tier: PlanTier, cadence: Cadence): PlanSlot {
  return `${tier}_${cadence}` as PlanSlot;
}

/**
 * Which RevenueCat offering this athlete is shown. **Decided by our server, never by the client and never
 * by RevenueCat targeting** (Amendment 007) — `my_paywall_offer()`, migration 0214.
 *
 *   default     — the regular prices.
 *   early_bird  — the first 100 (MA7-D3), while seats remain.
 *   tester_ai   — the comped testers' AI add-on, and nobody else (MA7-D7).
 */
export type OfferingId = 'default' | 'early_bird' | 'tester_ai';

export interface PaywallOffer {
  /**
   * `null` means nothing is for sale to this athlete. ⚠ Apple does not stop someone holding two
   * subscriptions in two different groups, so the server answers null rather than offer a second group
   * to anyone who already holds one.
   */
  offering: OfferingId | null;
  /** Early Bird seats left. Only ever the server's own count; null when it could not be read. */
  seatsRemaining: number | null;
}

export interface StorePlan {
  slot: PlanSlot;
  /** Localized, exactly as the store returned it. Never composed here. */
  priceLabel: string;
  /**
   * The store's OWN per-month string, when the SDK supplies one. Null rather than derived — formatting
   * a currency Forge was not handed is how a wrong price reaches a purchase screen.
   */
  pricePerMonthLabel: string | null;
  /** Numeric price, for the saving ratio only. Never rendered. */
  amount: number;
  /** ISO-4217. Two plans in different currencies cannot be compared, so they are not. */
  currency: string;
  /**
   * The free-trial length in days when the store says this product carries one (MA6-D11, MA7-D4), else
   * null. Read from the store's introductory offer, never assumed from the cadence: a trial the store
   * does not actually grant is a false claim beside the buy button.
   */
  trialDays: number | null;
}

/**
 * ⚠ MIRRORS `entitlement_config.founder_seats_total`, AND IS NOT A CAP.
 *
 * The Early Bird seats keep their `founder_` names in the database (Amendment 007: only the product ids
 * say `earlybird_`). *"First 100"* is a public promise, MA3-D24 makes selling the 101st a deceptive
 * practice, and a promise that can be edited in a config row is not a promise. The server enforces it;
 * this constant only renders the denominator, and `plans-core.test.mjs` reads 0145 and fails if the two
 * ever disagree.
 */
export const EARLY_BIRD_SEATS_TOTAL = 100;

// ── which rows render, and which one starts selected ─────────────────────────

/**
 * The cadence rows for one tier, yearly first (MA6-D10). Slots the offering did not contain do not
 * render; duplicates collapse to the first, so a misconfigured offering cannot draw two yearly rows.
 */
export function rowsFor(plans: readonly StorePlan[], tier: PlanTier): StorePlan[] {
  const rows: StorePlan[] = [];
  for (const cadence of ['annual', 'monthly'] as const) {
    const found = plans.find((p) => p.slot === slotFor(tier, cadence));
    if (found) rows.push(found);
  }
  return rows;
}

/**
 * The tiers this offering can sell, in ladder order. The tier switch on P-8 renders only these — a
 * Premium AI tab over an offering with no Premium AI packages would be a door to nothing.
 */
export function tiersOn(plans: readonly StorePlan[]): PlanTier[] {
  return (['premium', 'premium_ai', 'ai_addon'] as const).filter((t) => rowsFor(plans, t).length > 0);
}

/**
 * What is selected when a tier is shown.
 *
 * ⚠ YEARLY WHEN IT EXISTS (MA6-D10), MONTHLY OTHERWISE, NOTHING WHEN NEITHER — never a guess the buy
 * button would then act on.
 */
export function defaultSelection(rows: readonly StorePlan[]): PlanSlot | null {
  return rows.find((p) => cadenceOf(p.slot) === 'annual')?.slot ?? rows[0]?.slot ?? null;
}

// ── the saving ───────────────────────────────────────────────────────────────

/**
 * The yearly saving against twelve months of monthly, as a whole percent (P8W-D3).
 *
 * ⚠ COMPUTED OR ABSENT — NEVER TYPED. A saving written as a literal is a price string in disguise: it
 * goes stale the moment a tier moves or a currency differs, and a wrong saving on a purchase screen is a
 * false claim about a transaction, not a copy bug.
 *
 * Returns null — meaning *render nothing* — whenever the claim cannot be stood behind:
 *  · either plan is missing, so there is nothing to compare
 *  · the two are priced in different currencies, where the ratio is meaningless
 *  · either amount is not a positive finite number
 *  · yearly is not actually cheaper, in which case there is no saving to announce
 */
export function savingPercent(annual: StorePlan | undefined, monthly: StorePlan | undefined): number | null {
  if (!annual || !monthly) return null;
  if (annual.currency !== monthly.currency) return null;
  if (!isPositive(annual.amount) || !isPositive(monthly.amount)) return null;

  const yearOfMonthly = monthly.amount * 12;
  const pct = Math.round((1 - annual.amount / yearOfMonthly) * 100);
  return pct > 0 ? pct : null;
}

export function savingLabel(pct: number | null): string | null {
  return pct == null ? null : `Save ${pct}%`;
}

/** The saving for one tier's pair, straight from the rows the store returned. */
export function tierSaving(plans: readonly StorePlan[], tier: PlanTier): string | null {
  const rows = rowsFor(plans, tier);
  return savingLabel(
    savingPercent(
      rows.find((p) => cadenceOf(p.slot) === 'annual'),
      rows.find((p) => cadenceOf(p.slot) === 'monthly'),
    ),
  );
}

function isPositive(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}

/** "68 of 100 left". Only ever called with a count the server actually returned (P8W-D5). */
export function earlyBirdSeatLine(remaining: number): string {
  return `${Math.max(0, Math.floor(remaining))} of ${EARLY_BIRD_SEATS_TOTAL} left`;
}

/** "7-day free trial", or nothing when the store granted none. */
export function trialLabel(days: number | null): string | null {
  return days != null && Number.isFinite(days) && days > 0 ? `${Math.round(days)}-day free trial` : null;
}

// ── locked copy ──────────────────────────────────────────────────────────────

/**
 * ⚠ WHAT THE BUYER DOES NOT GET, ABOVE THE BUY BUTTON (P8W-D4, re-expressed for Amendment 006).
 *
 * P8W-D4's rule survives the ladder: a buyer who pays and later finds the feature they wanted is on
 * another plan is the classic deceptive-practices fact pattern, and the terms are the wrong place to tell
 * them. The old sentence ("…Coach AI is a separate subscription") described Amendment 003's add-on and is
 * no longer true — AI is now the plan above, not a second purchase. Keyed by the tier being bought.
 */
export const TIER_DISCLOSURE: Record<PlanTier, string> = {
  premium: 'Premium includes Basic Holt. Holt AI, the AI coach, is in Premium AI.',
  premium_ai: 'Premium AI is everything in Premium, plus Holt AI.',
  ai_addon: 'Adds Holt AI to the Premium you already have.',
};

/**
 * Never Charge For History, verbatim (Monetization Amendment 001 §2).
 *
 * Restated identically wherever it appears rather than paraphrased — for a locked principle, matching
 * copy is correct and a fresh wording each time is the error (P-8 §3.4).
 */
export const REASSURANCE = 'Everything you’ve already built is yours — forever.';

/**
 * Auto-renewal disclosure. Every plan renews now (MA7-D1 withdrew the one-off purchases), so it renders
 * beside every buy button. Deliberately worded clear of the five claims `content.test.mjs` guards against.
 */
export const AUTO_RENEWAL_NOTE =
  'Subscriptions renew automatically until you cancel them in your App Store account.';

/** Beside the buy button when the selected plan carries a trial (MA6-D11: the terms sit next to it). */
export const TRIAL_NOTE = 'Cancel before the trial ends and you won’t be charged.';

export const TIER_COPY: Record<PlanTier, { title: string }> = {
  premium: { title: 'Premium' },
  premium_ai: { title: 'Premium AI' },
  ai_addon: { title: 'Holt AI add-on' },
};

export const CADENCE_COPY: Record<Cadence, { title: string; cadence: string; badge?: string }> = {
  annual: { title: 'Yearly', cadence: 'Billed yearly', badge: 'Best value' },
  monthly: { title: 'Monthly', cadence: 'Billed monthly' },
};

/**
 * What Premium AI adds, as built today (P-8 §8: built features only). Holt AI answers and edits, and it
 * reads a program from a photo. Form check waits on build 9 and photo food logging is unbuilt, so neither
 * is listed. MA6-D4: an allowance, never "unlimited".
 */
export const AI_BENEFITS: readonly { title: string; detail: string }[] = [
  { title: 'Holt AI', detail: 'Ask your coach anything in plain words, and have it change your plan for you.' },
  { title: 'Import from a photo', detail: 'Snap a coach’s program and Holt AI reads it into the builder.' },
];
export const AI_ALLOWANCE_NOTE = 'Includes a generous monthly AI allowance.';

// ── the comparison, the benefits, and the usage review ───────────────────────

/**
 * The six rows of the at-a-glance table (P-8 §3.2), in locked order.
 *
 * Videos and day templates are real caps but are deliberately not here: the spec fixes this table at six
 * rows, and these six are the ones M-7 fires on most.
 */
export const COMPARISON_KEYS: readonly CapKey[] = [
  'programs',
  'photos',
  'squads',
  'imports',
  'holt_programs',
  'holt_days_per_month',
];

const NOUN: Partial<Record<CapKey, { one: string; many: string; unlimited?: string }>> = {
  programs: { one: 'program', many: 'programs' },
  short_programs: { one: 'training week', many: 'training weeks' },
  photos: { one: 'photo', many: 'photos' },
  videos: { one: 'video', many: 'videos' },
  squads: { one: 'squad', many: 'squads' },
  templates: { one: 'day template', many: 'day templates' },
  imports: { one: 'lifetime import', many: 'lifetime imports', unlimited: 'imports' },
  /* "Basic Holt" — the rules engine, named so nobody reads it as the AI coach (PO 2026-09-21; that one is
     Premium AI, MA6-D1). */
  holt_programs: { one: 'Basic Holt program', many: 'Basic Holt programs' },
  holt_days_per_month: { one: 'Basic Holt day a month', many: 'Basic Holt days a month' },
};

/**
 * One cell of the comparison, rendered from the configured number (MA3-D16, M7-D14).
 *
 * ⚠ THE NUMBER IS INTERPOLATED, NEVER TYPED. A hardcoded "75 photos" here is the cap written down in a
 * second place, and the two drift the first time the config changes — which the pricing plan says will
 * happen after the metered run.
 */
export function capPhrase(key: CapKey, cap: number): string {
  // In-workout Holt is a capability, not a quantity — "0 Coach Holt in-workouts" is not a sentence.
  if (key === 'holt_in_workout') return cap === 0 ? 'No Basic Holt mid-workout' : 'Basic Holt in your workout';

  const noun = NOUN[key];
  if (!noun) return '';
  if (cap === UNLIMITED || cap < 0) return `Unlimited ${noun.unlimited ?? noun.many}`;
  return `${cap} ${cap === 1 ? noun.one : noun.many}`;
}

/**
 * The Premium cell.
 *
 * ⚠ `paid_caps` MIXES TWO DIFFERENT KINDS OF NUMBER, AND ONLY ONE OF THEM IS TOLD TO THE ATHLETE.
 *
 * Most paid ceilings (500 programs, 1,000 photos, 100 videos) are abuse guards set so no legitimate
 * athlete reaches one — 0145 says so in as many words. The product promise is genuinely "no limits on
 * anything you build", so rendering "500 programs" would understate the tier and invite the question
 * of what happens at 501.
 *
 * Squads is the exception and the reason this function exists: **Premium's squad ceiling is really 5**
 * (MA3-D7), it is stated to the athlete on purpose, and M7-D15 forbids promising "unlimited squads" on
 * a purchase surface because the tier does not deliver it. A benefit row that claims something the tier
 * cannot honour is a false claim, not loose copy.
 */
const PREMIUM_STATES_ITS_CEILING: ReadonlySet<CapKey> = new Set<CapKey>(['squads']);

export function premiumPhrase(key: CapKey, cap: number): string {
  if (PREMIUM_STATES_ITS_CEILING.has(key)) return capPhrase(key, cap);
  return capPhrase(key, UNLIMITED);
}

export interface ComparisonRow {
  key: CapKey;
  free: string;
  premium: string;
}

export function comparisonRows(free: Caps | null, paid: Caps | null): ComparisonRow[] {
  if (!free || !paid) return [];
  return COMPARISON_KEYS.map((key) => ({
    key,
    free: capPhrase(key, free[key]),
    premium: premiumPhrase(key, paid[key]),
  }));
}

export interface BenefitLine {
  /** The cap this benefit is true because of. The screen keys its icon and supporting copy off this. */
  key: CapKey;
  line: string;
}

/**
 * The benefits-unlocked list (P-8 §3.3), Legacy first — the design's ordering, and the moat.
 *
 * ⚠ BUILT FEATURES ONLY, IN EITHER STATE (P-8 §8). Advanced analytics, Communities, premium share
 * layouts and the Legacy export book are all part of Premium's long-term definition and none of them
 * exist — showing them as a current benefit would overpromise on the screen that takes the money.
 * Every line below maps 1:1 onto a cap the app actually enforces today, and says so in `key`.
 *
 * ⚠ KEYED, NOT ORDERED. The screen pairs each line with an icon and a supporting sentence; matching
 * those up by array index means reordering this list silently mislabels every row beneath the change.
 */
export function premiumBenefitLines(paid: Caps | null): BenefitLine[] {
  if (!paid) return [];
  return [
    { key: 'photos', line: premiumPhrase('photos', paid.photos) },
    { key: 'programs', line: premiumPhrase('programs', paid.programs) },
    { key: 'squads', line: premiumPhrase('squads', paid.squads) },
    { key: 'imports', line: premiumPhrase('imports', paid.imports) },
    {
      key: 'holt_programs',
      // Two caps in one line, because "unlimited Holt" and "Holt during a workout" are one benefit to
      // the athlete, and the in-workout half is the recurring reason the tier is worth paying for.
      line:
        paid.holt_in_workout === 0
          ? premiumPhrase('holt_programs', paid.holt_programs)
          : `${premiumPhrase('holt_programs', paid.holt_programs)}, including in your workout`,
    },
  ];
}

export interface UsageRow {
  key: CapKey;
  label: string;
  /** "38 of 75", or "Used" for the allowances that are a boolean wearing a counter's clothes. */
  value: string;
}

const USAGE_LABEL: Partial<Record<CapKey, string>> = {
  programs: 'Programs',
  photos: 'Photos',
  squads: 'Squads',
  imports: 'Import',
  holt_programs: 'Basic Holt programs',
  holt_days_per_month: 'Basic Holt days',
};

const USAGE_FIELD: Partial<Record<CapKey, keyof Usage>> = {
  programs: 'programs',
  photos: 'photos',
  squads: 'squads',
  imports: 'imports',
  holt_programs: 'holtPrograms',
  holt_days_per_month: 'holtDays',
};

/**
 * Allowances that are spent rather than counted.
 *
 * ⚠ NOT SIMPLY "CAP OF 1" — the spec's own usage block shows *"Squads 1 of 1"* beside *"Import Used"*,
 * and the difference is real. A squad is a thing you hold, so a fraction describes it; the free import
 * is a boolean wearing a counter's clothes, and "1 of 1" for something already spent reads as a bug to
 * whoever spent it. The `cap === 1` guard keeps this correct if either allowance is ever raised.
 */
const ONE_SHOT: ReadonlySet<CapKey> = new Set<CapKey>(['imports', 'holt_programs']);

/**
 * "Your Usage" (P-8 §3, architecture) — proximity to the free limits, on the athlete's own terms.
 *
 * It exists so nobody first learns where the ceiling is by hitting it. Informational only: it never says
 * "delete something", because Never Charge For History means there is nothing to delete your way out of.
 */
export function usageRows(caps: Caps | null, usage: Usage | null): UsageRow[] {
  if (!caps || !usage) return [];

  return COMPARISON_KEYS.map((key) => {
    const field = USAGE_FIELD[key];
    const label = USAGE_LABEL[key];
    if (!field || !label) return null;

    const cap = caps[key];
    const used = usage[field];
    const value =
      ONE_SHOT.has(key) && cap === 1 ? (used >= 1 ? 'Used' : 'Available') : usageLabel(used, cap);
    return { key, label, value };
  }).filter((r): r is UsageRow => r != null);
}
