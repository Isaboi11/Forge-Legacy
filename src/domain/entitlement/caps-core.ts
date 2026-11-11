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

import { STRUCTURED_DEVELOPMENT_MIN_WEEKS } from '../rank/thresholds.ts';

/** Every capped dimension. Named rather than stringly-typed so a typo is a compile error. */
export type CapKey =
  | 'programs'
  /**
   * Week templates saved AND programs shorter than four weeks, sharing one allowance (MA4-D1).
   *
   * It is separate from `programs` because that cap is 3 LIFETIME and never reopens (MA3-D9) — three
   * throwaway deload weeks would have permanently closed the door on a real 12-week block. The split
   * runs on exactly the line D-RCM-30 draws, so the product has one threshold meaning one thing.
   */
  | 'short_programs'
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
  'short_programs',
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
  short_programs: number;
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
  /** Week templates saved + short programs created. One counter, two doors (MA4-D1). */
  shortPrograms: number;
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
  short_programs: 'shortPrograms',
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
 * Where the entitlement read stands for the athlete signed in NOW (QA F6, 2026-09-26).
 *
 * ⚠ A READ FOR SOMEBODY ELSE IS STILL LOADING, NOT UNKNOWN. The provider's query re-runs when `uid`
 * changes, but it does not flip back to `loading` — so between signing in and the new read landing it
 * still holds the signed-out answer (`null`) with `loading: false`, and that used to surface as
 * `unknown`. An invite link that sent you to sign in then auto-joined inside that window and told you
 * "Unable to verify your subscription" on every slow network. The answer is tagged with the uid it was
 * read for, and one read for a different uid (including the signed-out `null`) reads as `loading`.
 *
 * `read` is `null` when the query has never answered or its last run rejected — that is `unknown`
 * unless a run is in flight.
 *
 * ⚠ A REFRESH OF A GOOD ANSWER IS STILL `ready` (PO 2026-09-27, sandbox purchase: *"it keeps flashing
 * black"*). `refetch()` sets `loading` again but keeps the last answer, and this used to read `loading`
 * for the length of every refresh — so Subscription blanked to its spinner six times in the minute after
 * a purchase (the settle re-reads) and on every return to the foreground, and every gate reading
 * `ready` (the Nutrition tab, Premium AI) blinked off with it. Only a FIRST read for this athlete loads.
 */
export type EntitlementReadStatus = 'loading' | 'ready' | 'unknown';

export function entitlementReadStatus<S>(
  loading: boolean,
  read: { uid: string | null; snap: S | null } | null,
  uid: string | null,
): EntitlementReadStatus {
  if (loading) return read && read.uid === uid && read.snap ? 'ready' : 'loading';
  if (!read) return 'unknown';
  if (read.uid !== uid) return 'loading';
  return read.snap ? 'ready' : 'unknown';
}

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

/**
 * Which allowance the door to a Holt BLOCK checks, or null to let the athlete in (MA4-D5).
 *
 * A block under four weeks is a week of training: it spends `short_programs` when it is kept and leaves the one
 * lifetime Holt program alone. The line is D-RCM-30's, the same one the save doors draw. `weeks` is usually not
 * asked yet at the door (it comes after the goal, `sizeQuestion`) — then a spent Holt program is no reason to
 * refuse while a week is still on offer, and the build checks the allowance that applies once the length is known.
 */
export function holtBlockDoor(weeks: number | null | undefined, gate: (key: CapKey) => Gate): CapKey | null {
  if (typeof weeks === 'number' && Number.isFinite(weeks)) {
    return Math.floor(weeks) < STRUCTURED_DEVELOPMENT_MIN_WEEKS ? 'short_programs' : 'holt_programs';
  }
  if (gate('holt_programs').outcome === 'blocked' && gate('short_programs').outcome === 'allowed') return null;
  return 'holt_programs';
}

/**
 * What a build does with `consume_holt_allowance`'s answer (pricing sweep G4).
 *
 * ⚠ A NULL FAILS CLOSED FOR ANYONE WITH A CEILING. Null is an unreadable answer (offline, an error), and a cap that
 * builds on one runs out only while the network works — Holt days have no other server check at all. It is a retry,
 * never an upsell (M-7 §10): what failed is the read, not the athlete's plan. `gate` is the snapshot's own answer for
 * that allowance; an athlete with no ceiling on it never needed the spend, so its silence cannot stop them.
 */
export function holtSpendVerdict(spend: { allowed: boolean } | null, gate: Gate): 'build' | 'used_up' | 'retry' {
  if (spend) return spend.allowed ? 'build' : 'used_up';
  return gate.outcome === 'allowed' && typeof gate.cap === 'number' && gate.cap < 0 ? 'build' : 'retry';
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
const CANONICAL: readonly CapKey[] = ['programs', 'photos', 'squads', 'imports', 'holt_programs', 'templates'];

/**
 * Triggers that are not themselves a canonical row borrow one.
 *
 * ⚠ `short_programs` borrows `programs` rather than adding a seventh CANONICAL row: M-7 §6.2 v1.1 locks
 * the list at six and renders four, so a seventh would push a locked row off the modal.
 */
const ROW_FOR: Partial<Record<CapKey, CapKey>> = {
  short_programs: 'programs',
  holt_in_workout: 'holt_programs',
};

const PAID_NOUN: Partial<Record<CapKey, string>> = {
  programs: 'programs',
  photos: 'photos',
  videos: 'videos',
  squads: 'squads',
  imports: 'imports',
  templates: 'day templates',
  // "Basic Holt", never "Coach Holt" alone, on a Premium row — so nobody reads Premium as buying the AI
  // coach, which is Premium AI (MA6-D7a; P-8 already says it this way).
  holt_programs: 'Basic Holt programs',
  holt_days_per_month: 'Basic Holt days',
};

/** "1,000" — a cap is a whole number, and four digits without a separator read as a typo. */
export function capNumber(n: number): string {
  return String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * One Premium row, from the CONFIGURED paid ceiling (pricing sweep C2, PO 2026-11-11).
 *
 * ⚠ "UNLIMITED" ONLY WHEN CONFIG SAYS SO. These rows used to be typed — "Unlimited photos" over a paid
 * ceiling of 1,000, "5 squads" as a literal. A purchase surface that says unlimited and stops at 1,001 is
 * a false claim, and a typed number drifts the first time the config changes (M7-D14). So the row states
 * the real number, says "Unlimited" when the cap is -1, and — when config could not be read — makes no
 * number claim at all ("More photos").
 */
export function paidRow(key: CapKey, paid: Caps | null): string {
  const noun = PAID_NOUN[key];
  if (!noun) return 'Unlock premium features';
  const cap = paid?.[key];
  if (cap == null || !Number.isFinite(cap)) return `More ${noun}`;
  if (cap === UNLIMITED || cap < 0) return `Unlimited ${noun}`;
  return `${capNumber(cap)} ${noun}${key === 'holt_days_per_month' ? ' a month' : ''}`;
}

/** `paid` = Premium's configured caps (`fetchCapConfig().paid`); null renders the rows without numbers. */
export function m7Content(key: CapKey, cap: number, paid: Caps | null = null): M7Content {
  return { reason: reasonFor(key, cap), feature: paidRow(ROW_FOR[key] ?? key, paid) };
}

function reasonFor(key: CapKey, cap: number): string {
  switch (key) {
    case 'programs':
      return `You've reached your ${cap}-program limit.`;
    case 'short_programs':
      // "Training week" rather than "week template", because the allowance is spent by saving a template
      // AND by starting a short program, and naming only one of the two doors would read as a bug to
      // whoever hit the other one. Interpolated from `cap`, never a literal (M7-D14).
      return `You've used your ${cap} free training week${cap === 1 ? '' : 's'}.`;
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
      return cap === 1 ? "You've used your free import." : `You've used your ${cap} free imports.`;
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
export function m7Benefits(key: CapKey, paid: Caps | null = null): string[] {
  const { feature } = m7Content(key, 0, paid);
  const rest = CANONICAL.map((k) => paidRow(k, paid)).filter((l) => l !== feature);
  return [feature, ...rest].slice(0, 4);
}

/** "38 of 75" for P-8's usage rows, or "38" when uncapped — never "38 of -1". */
export function usageLabel(used: number, cap: number): string {
  const n = toCount(used);
  return cap === UNLIMITED || cap < 0 ? String(n) : `${n} of ${cap}`;
}
