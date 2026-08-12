/**
 * The cap arithmetic — every "may this athlete do this?" in the product, with no Supabase in it.
 *
 * ══ WHY THIS IS A DOMAIN MODULE AND NOT A HOOK ══
 *
 * There are nine gates and each one has an off-by-one that is invisible until an athlete hits it. "At the
 * limit" and "over the limit" differ by one photo, and the difference is whether the 75th photo is the
 * last one allowed or the first one refused. That belongs in something `node --test` can load and prove,
 * not in a component tree.
 *
 * Reuses the shape of `src/domain/exercise-picker/custom-core.ts:16` — the only enforced cap in the app
 * before this, and the right one to copy.
 *
 * ⚠ `@/` IS TYPE-ONLY IN DOMAIN CODE. A runtime `@/` import here breaks `node --test`. Relative `.ts`.
 *
 * ══ ⚠ NO NUMBER IN THIS FILE IS A CAP ══
 *
 * MA3-D16: every cap and allowance is server-side configuration, read from `entitlement_config` via
 * `my_entitlement()`. Being wrong about a number should cost a SQL update, not a release and an App Store
 * review. The only constant here is the **sentinel** — `-1` means unlimited — and it is defined once.
 *
 * If you are about to add `const FREE_PHOTOS = 75` to this file: that is the thing the amendment forbids.
 */

/** Every capped dimension. Named rather than stringly-typed so a typo is a compile error. */
export type CapKey =
  | 'programs'
  | 'photos'
  | 'videos'
  | 'squads'
  | 'templates'
  | 'imports'
  | 'holt_programs'
  | 'holt_days_per_month'
  | 'holt_in_workout';

export const CAP_KEYS: readonly CapKey[] = [
  'programs',
  'photos',
  'videos',
  'squads',
  'templates',
  'imports',
  'holt_programs',
  'holt_days_per_month',
  'holt_in_workout',
];

/**
 * `-1` is unlimited, matching `cap_allows()` in migration 0145.
 *
 * A sentinel rather than `null` because null is indistinguishable from "not configured", and rather than
 * a very large number because a reader auditing the config row should be able to tell a real ceiling from
 * an absent one at a glance.
 */
export const UNLIMITED = -1;

export type Tier = 'FREE' | 'PREMIUM';

export interface Caps {
  programs: number;
  photos: number;
  videos: number;
  squads: number;
  templates: number;
  imports: number;
  holt_programs: number;
  holt_days_per_month: number;
  holt_in_workout: number;
}

export interface Usage {
  programs: number;
  photos: number;
  videos: number;
  squads: number;
  templates: number;
  /** 0 or 1 — the free import is a boolean wearing a counter's clothes. */
  imports: number;
  holtPrograms: number;
  /** This calendar month only. Refills. */
  holtDays: number;
}

/** Which usage figure answers which cap. The one place the two vocabularies meet. */
const USAGE_FOR: Record<CapKey, keyof Usage> = {
  programs: 'programs',
  photos: 'photos',
  videos: 'videos',
  squads: 'squads',
  templates: 'templates',
  imports: 'imports',
  holt_programs: 'holtPrograms',
  holt_days_per_month: 'holtDays',
  // In-workout Holt is a yes/no, not a quantity — the athlete has used 0 of 0 on Free and 0 of ∞ on
  // Premium. Mapping it at `holtDays` would make one in-workout question cost a single-day allowance.
  holt_in_workout: 'imports',
};

// ── the primitive ────────────────────────────────────────────────────────────

/**
 * Is there room for one more?
 *
 * ⚠ STRICTLY LESS THAN, AND THAT IS THE WHOLE OFF-BY-ONE. An athlete holding 75 of 75 photos has room
 * for none: `75 < 75` is false. An athlete holding 74 may add one, becoming 75. So the cap of 75 means
 * "75 photos may exist", and M-7 fires on the attempt to create the 76th — which is exactly what the
 * M-7 spec's trigger table says.
 */
export function capAllows(used: number, cap: number): boolean {
  if (cap === UNLIMITED || cap < 0) return true;
  return toCount(used) < cap;
}

/** How many more may be created. `Infinity` when uncapped — callers render "Unlimited", never a number. */
export function remaining(used: number, cap: number): number {
  if (cap === UNLIMITED || cap < 0) return Number.POSITIVE_INFINITY;
  return Math.max(0, cap - toCount(used));
}

/**
 * A count that cannot poison the arithmetic.
 *
 * A NaN or a negative from a malformed server payload must not silently pass every cap — `NaN < 75` is
 * false, which happens to fail closed, but `-1 < 75` is true and would open every gate at once. Clamped
 * at the boundary rather than trusted.
 */
function toCount(n: number): number {
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

// ── the gate ─────────────────────────────────────────────────────────────────

/**
 * What a pre-action check resolves to.
 *
 * ⚠ THREE OUTCOMES, NOT TWO, AND THE THIRD IS THE ONE THAT MATTERS.
 *
 * `unknown` exists because M-7 §10 is explicit: when subscription status cannot be verified, **M-7 does
 * not fire** — the surface shows *"Unable to verify your subscription. Try again."* and the action stays
 * blocked. Showing an upsell to a Premium athlete whose network dropped is worse than blocking them with
 * an honest error, and M7-D10 says so in as many words: *trust is higher-priority than conversion at this
 * moment.*
 *
 * Collapsing `unknown` into `blocked` would produce exactly the upsell that rule forbids.
 */
export type GateOutcome = 'allowed' | 'blocked' | 'unknown';

export interface Gate {
  outcome: GateOutcome;
  /** The cap in force, for copy. `-1` when uncapped. Undefined when the outcome is `unknown`. */
  cap?: number;
  used?: number;
}

export const ALLOWED: Gate = { outcome: 'allowed' };
export const UNKNOWN: Gate = { outcome: 'unknown' };

/**
 * The pre-action check. Call this BEFORE opening a flow, never partway through one.
 *
 * ⚠ "PRE-ACTION" IS THE SPEC, NOT A PREFERENCE (M-7 §2). An athlete must never choose a photo, name a
 * squad, or build half a template and only then be told they cannot finish. Every call site asks first
 * and opens second.
 *
 * `caps`/`usage` null means the entitlement read has not resolved or has failed → `unknown`.
 */
export function gateFor(key: CapKey, caps: Caps | null, usage: Usage | null): Gate {
  if (!caps || !usage) return UNKNOWN;

  const cap = caps[key];
  if (typeof cap !== 'number') return UNKNOWN;

  // In-workout Holt is a capability switch, not a quantity: 0 means never, anything else means always.
  // Running it through `capAllows` would compare a use count to a permission and allow the first one.
  if (key === 'holt_in_workout') {
    return cap === 0 ? { outcome: 'blocked', cap, used: 0 } : { ...ALLOWED, cap };
  }

  const used = usage[USAGE_FOR[key]];
  return capAllows(used, cap)
    ? { outcome: 'allowed', cap, used }
    : { outcome: 'blocked', cap, used };
}

// ── what the athlete is shown ────────────────────────────────────────────────

/**
 * The M-7 injection pair for one trigger (M-7 §6.1).
 *
 * ⚠ THE NUMBER COMES FROM `cap`, NEVER FROM A LITERAL (M7-D14). A hardcoded "75" in copy is the cap
 * written down in a second place, and the two drift the first time the config changes — which the plan
 * says will happen after the 60–90 day metered run.
 */
export interface M7Content {
  reason: string;
  feature: string;
}

/**
 * M-7's four benefit rows for a given trigger.
 *
 * Canonical order is six long (M-7 §6.2 v1.1): programs · photos · squads · imports · Coach Holt · day
 * templates. The triggered feature moves to first; the next three in canonical order follow. Exactly four
 * render, because §4 forbids scrolling content.
 */
const CANONICAL: { key: CapKey; label: string }[] = [
  { key: 'programs', label: 'Unlimited programs' },
  { key: 'photos', label: 'Unlimited photos' },
  // ⚠ NOT "Unlimited squads" (M7-D15). Premium's squad ceiling is genuinely 5, and a benefits row on a
  // purchase surface promising something the tier does not deliver is a false claim, not loose copy.
  { key: 'squads', label: '5 squads' },
  { key: 'imports', label: 'Unlimited imports' },
  { key: 'holt_programs', label: 'Unlimited Coach Holt' },
  { key: 'templates', label: 'Unlimited day templates' },
];

/** Triggers that are not themselves a canonical row borrow one — video has no row of its own. */
const ROW_FOR: Partial<Record<CapKey, CapKey>> = {
  holt_days_per_month: 'holt_programs',
  holt_in_workout: 'holt_programs',
};

export function m7Content(key: CapKey, cap: number): M7Content {
  const row = ROW_FOR[key] ?? key;
  const feature =
    key === 'videos'
      ? 'Unlimited video'
      : key === 'holt_days_per_month'
        ? 'Unlimited Coach Holt workouts'
        : (CANONICAL.find((c) => c.key === row)?.label ?? 'Unlock premium features');

  return { reason: reasonFor(key, cap), feature };
}

function reasonFor(key: CapKey, cap: number): string {
  switch (key) {
    case 'programs':
      return `You've reached your ${cap}-program limit.`;
    case 'photos':
      return `You've reached your ${cap}-photo limit.`;
    case 'videos':
      return `You've reached your ${cap}-video limit.`;
    case 'squads':
      // ⚠ "your 1-squad limit" reads awkwardly, and that is accepted (M-7 §6.1). The alternative is a
      // hand-written special case that stops tracking the configured value the first time it changes.
      return `You've reached your ${cap}-squad limit.`;
    case 'templates':
      return `You've reached your ${cap}-template limit.`;
    case 'imports':
      return "You've used your one free import.";
    case 'holt_programs':
      return "You've used your free Coach Holt program.";
    case 'holt_days_per_month':
      return `You've used ${cap === 1 ? 'your' : 'both'} Coach Holt ${cap === 1 ? 'day' : 'days'} this month.`;
    case 'holt_in_workout':
      // ⚠ UNREACHABLE BY DESIGN (M7-D13). In-workout Holt is enforced by NOT RENDERING the control on
      // Free — §12 bans M-7 during an active workout, that rule is older and locked, and an upsell
      // interrupting a working set is the worst place in the product to ask for money. Present so the
      // switch is exhaustive, never so it can be shown.
      return 'Coach Holt helps during your workout on Premium.';
  }
}

/** The four rows M-7 renders, triggered feature first (M-7 §6.2). */
export function m7Benefits(key: CapKey): string[] {
  const { feature } = m7Content(key, 0);
  const rest = CANONICAL.map((c) => c.label).filter((l) => l !== feature);
  return [feature, ...rest].slice(0, 4);
}

/** "38 of 75" for P-8's usage rows, or "38" when uncapped — never "38 of -1". */
export function usageLabel(used: number, cap: number): string {
  const n = toCount(used);
  return cap === UNLIMITED || cap < 0 ? String(n) : `${n} of ${cap}`;
}
