/**
 * What P-8 shows, and in what order — the plan picker's arithmetic with no store SDK and no React in it.
 *
 * ══ WHY THIS IS A DOMAIN MODULE ══
 *
 * Every rule the P-8 wireframe spec calls out by decision number is a pure function of the plans the
 * store returned and the caps the server configured: which rows render, which one starts selected, what
 * the saving is, what each column of the comparison says. Those are the things that go quietly wrong —
 * a pre-selected lifetime, a saving computed against the wrong cadence, a "unlimited squads" claim the
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

// ── the four slots ───────────────────────────────────────────────────────────

/**
 * The plan rows P-8 can present at launch.
 *
 * ⚠ A SLOT IS NOT A SKU. The store product identifiers live in the RevenueCat dashboard and never enter
 * `src/` — each one carries its price in its own name, so importing one would smuggle a price string
 * past the §9 grep. The adapter maps whatever the store returns onto these four slots by RevenueCat
 * *package*; the screen only ever knows the slot.
 *
 * Coach AI is deliberately absent (P8W-D9): it *requires* Premium, so listing it beside Premium would
 * present it as an alternative to the thing it depends on. It gets its own surface when it ships.
 */
export type PlanSlot = 'annual' | 'monthly' | 'founder' | 'lifetime';

/** Presentation order (P8W-D2, P8W-D8). Annual leads; lifetime is last and never steered toward. */
export const PLAN_ORDER: readonly PlanSlot[] = ['annual', 'monthly', 'founder', 'lifetime'];

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
}

/**
 * ⚠ MIRRORS `entitlement_config.founder_seats_total`, AND IS NOT A CAP.
 *
 * MA3-D16 says caps are server configuration because they will be re-tuned after the metered run. This
 * is the opposite kind of number: *"first 100"* is a public promise, MA3-D24 makes selling the 101st a
 * deceptive practice, and a promise that can be edited in a config row is not a promise. The server
 * still enforces it — `claim_founder_seat()` raises past the total — and `founder_seats_remaining()`
 * is what the athlete actually sees counting down. This constant exists only to render the denominator,
 * and `plans-core.test.mjs` reads 0145 and fails if the two ever disagree.
 */
export const FOUNDER_SEATS_TOTAL = 100;

// ── which rows render, and which one starts selected ─────────────────────────

/**
 * The rows P-8 draws, in locked order.
 *
 * ⚠ THE FOUNDER ROW IS HIDDEN UNLESS THE COUNT IS BOTH READ AND POSITIVE (P8W-D5). `null` means the
 * server could not be asked — and an unverifiable scarcity claim is worse than no claim, so the row
 * does not render rather than render a guess. Zero means the seats are gone and the SKU is delisted.
 *
 * Duplicate slots collapse to the first: an offering misconfigured with two annual packages must not
 * draw two annual rows for the athlete to choose between.
 */
export function orderPlans(plans: readonly StorePlan[], founderSeatsRemaining: number | null): StorePlan[] {
  const seen = new Set<PlanSlot>();
  const rows: StorePlan[] = [];

  for (const slot of PLAN_ORDER) {
    if (slot === 'founder' && !(typeof founderSeatsRemaining === 'number' && founderSeatsRemaining > 0)) continue;
    const found = plans.find((p) => p.slot === slot && !seen.has(p.slot));
    if (!found) continue;
    seen.add(slot);
    rows.push(found);
  }

  return rows;
}

/**
 * What is selected on mount.
 *
 * ⚠ ANNUAL, EVERY TIME, AND NEVER LIFETIME OR FOUNDER (P8W-D2, P8W-D8). A pre-selected three-figure
 * one-off charge is a dark pattern — the large commitments are offered, not defaulted into. When annual
 * is missing the fallback is monthly, the other renewing cadence; when neither is there, nothing is
 * selected and the buy button has nothing to do.
 */
export function defaultSelection(rows: readonly StorePlan[]): PlanSlot | null {
  if (rows.some((p) => p.slot === 'annual')) return 'annual';
  if (rows.some((p) => p.slot === 'monthly')) return 'monthly';
  return null;
}

// ── the saving ───────────────────────────────────────────────────────────────

/**
 * The annual saving against twelve months of monthly, as a whole percent (P8W-D3).
 *
 * ⚠ COMPUTED OR ABSENT — NEVER TYPED. "Save 36%" written as a literal is a price string in disguise: it
 * goes stale the moment a tier moves or a currency differs, and a wrong saving on a purchase screen is a
 * false claim about a transaction, not a copy bug.
 *
 * Returns null — meaning *render nothing* — whenever the claim cannot be stood behind:
 *  · either plan is missing, so there is nothing to compare
 *  · the two are priced in different currencies, where the ratio is meaningless
 *  · either amount is not a positive finite number
 *  · annual is not actually cheaper, in which case there is no saving to announce
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

function isPositive(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}

/** "68 of 100 left". Only ever called with a count the server actually returned (P8W-D5). */
export function founderSeatLine(remaining: number): string {
  return `${Math.max(0, Math.floor(remaining))} of ${FOUNDER_SEATS_TOTAL} left`;
}

// ── locked copy ──────────────────────────────────────────────────────────────

/**
 * ⚠ A LEGAL REQUIREMENT, NOT COPY (P8W-D4), AND IT SITS ABOVE THE BUY BUTTON.
 *
 * A buyer who pays for "lifetime" and later finds a feature needs another subscription is the classic
 * deceptive-practices fact pattern. Putting this in the terms instead of on the purchase surface is
 * exactly the failure the requirement exists to prevent. It renders in **every** Free state, not only
 * when Lifetime is selected — the athlete comparing plans is the one who needs it.
 */
export const AI_DISCLOSURE = 'The app and your legacy, forever. Coach AI is a separate subscription.';

/**
 * Never Charge For History, verbatim (Monetization Amendment 001 §2).
 *
 * Restated identically wherever it appears rather than paraphrased — for a locked principle, matching
 * copy is correct and a fresh wording each time is the error (P-8 §3.4).
 */
export const REASSURANCE = 'Everything you’ve already built is yours — forever.';

/**
 * Auto-renewal disclosure, shown only when a renewing plan is selected.
 *
 * Required before purchase for a subscription, and *false* for lifetime and Founder, which renew
 * nothing. Deliberately worded clear of the five claims `content.test.mjs` guards against — the sentence
 * that shipped to testers ("Your plan renews yearly. Billing is handled through your app store.") was
 * banned for asserting a subscription that did not exist, not for describing one that does.
 */
export const AUTO_RENEWAL_NOTE =
  'Subscriptions renew automatically until you cancel them in your App Store account.';

/** True for the cadences that actually renew. Lifetime and Founder are one-off purchases. */
export function renews(slot: PlanSlot | null): boolean {
  return slot === 'annual' || slot === 'monthly';
}

export const PLAN_COPY: Record<PlanSlot, { title: string; cadence: string; badge?: string }> = {
  annual: { title: 'Annual', cadence: 'Billed yearly', badge: 'Best value' },
  monthly: { title: 'Monthly', cadence: 'Billed monthly' },
  founder: { title: 'Founder', cadence: 'One payment, Premium for life' },
  lifetime: { title: 'Lifetime', cadence: 'One payment, Premium for life' },
};

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
  holt_programs: { one: 'Coach Holt program', many: 'Coach Holt programs' },
  holt_days_per_month: { one: 'Coach Holt day a month', many: 'Coach Holt days a month' },
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
  if (key === 'holt_in_workout') return cap === 0 ? 'No Coach Holt mid-workout' : 'Coach Holt in your workout';

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
  holt_programs: 'Coach Holt programs',
  holt_days_per_month: 'Coach Holt days',
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
