/**
 * REFERRAL CODES — the pure half.
 *
 * Everything here is a string operation with no store, no network and no clock, so the rules that decide
 * whether a typed code is worth sending to the server can be tested without one.
 *
 * ══ ⚠ THE ALPHABET IS NOT A STYLE CHOICE — IT MIRRORS `0145` ══
 *
 * `my_referral_code()` generates from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` and says why: *"a code is read
 * aloud and typed by hand, and O/0 and I/1 are where that fails."* So **I, O, 0 and 1 never appear in a
 * real code**, and this file must generate no expectation that they might. If the SQL alphabet is ever
 * changed, this constant is the other half of that change.
 *
 * ══ ⚠ AN AMBIGUOUS CHARACTER IS REJECTED, NOT REPAIRED ══
 *
 * The tempting kindness is to map a typed `0` onto `O`, or `1` onto `I`. It cannot work here, because
 * BOTH members of each pair are excluded — there is no valid character to map onto. Repairing would mean
 * deleting the character, which silently shifts the remaining seven and can produce a *different, valid,
 * real* code belonging to somebody else. A code that fails to match is a sentence the athlete can act on;
 * a code that matches the wrong person is money moving to a stranger.
 */

/** The generator alphabet from `0145`. I, O, 0 and 1 are absent by design. */
export const REFERRAL_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** `my_referral_code()` builds exactly 8 characters. The column permits 4–16 so the length can move without a migration. */
export const REFERRAL_CODE_LENGTH = 8;

/**
 * Fold a human's typing into the form the server compares against.
 *
 * Case, surrounding whitespace and the separators people insert when reading a code aloud (`ABCD-2345`,
 * `ABCD 2345`) are all noise. Nothing else is removed — see the header on why repair is refused.
 */
export function normalizeReferralCode(raw: string | null | undefined): string {
  if (typeof raw !== 'string') return '';
  return raw
    .toUpperCase()
    .replace(/[\s\-_.]+/g, '')
    .trim();
}

/**
 * Whether this is worth a round trip.
 *
 * ⚠ PLAUSIBLE, NOT VALID. Only the server knows whether a code belongs to anybody; this rejects the shapes
 * that cannot possibly belong to anybody, so an obvious typo gets an instant answer instead of a network
 * call and a spinner.
 */
export function isPlausibleReferralCode(code: string): boolean {
  if (code.length !== REFERRAL_CODE_LENGTH) return false;
  for (const ch of code) {
    if (!REFERRAL_ALPHABET.includes(ch)) return false;
  }
  return true;
}

/** The four things `record_referral_attribution()` can report back. */
export type AttributionVerdict = 'recorded' | 'already' | 'unknown' | 'self';

/**
 * Whether a string off the wire is one of the verdicts.
 *
 * An RPC returning something unrecognised is a deploy skew, not a verdict, and the caller has to be able to
 * tell those apart — treating an unknown string as a failure would report "that code is not real" about a
 * code that was never checked.
 */
export function isAttributionVerdict(value: unknown): value is AttributionVerdict {
  return value === 'recorded' || value === 'already' || value === 'unknown' || value === 'self';
}

/**
 * What to say to the athlete about each verdict.
 *
 * ⚠ `already` IS NOT AN ERROR AND IS NOT PHRASED AS ONE. First-wins is the rule `0170` exists to hold, so
 * an athlete who taps a second friend's invite has done nothing wrong and nothing has gone wrong — the
 * person who reached them first keeps the credit. Saying "couldn't apply that code" would invite them to
 * try again at something that will never succeed.
 *
 * ⚠ NO SENTENCE HERE PROMISES A REWARD. See `referralLinkFor()`.
 */
export function attributionMessage(verdict: AttributionVerdict): string {
  switch (verdict) {
    case 'recorded':
      return 'Invite applied.';
    case 'already':
      return 'You’ve already been invited by someone — that one stands.';
    case 'unknown':
      return 'That code doesn’t match anyone.';
    case 'self':
      return 'That’s your own code.';
  }
}

/** The query parameter an invite link carries the referrer's code in. */
export const REFERRAL_PARAM = 'ref';

/**
 * Add the referrer's code to an invite link.
 *
 * ══ ⚠ THE LINK CARRIES IT; THE INVITE TEXT DOES NOT PROMISE ANYTHING ══
 *
 * MA3-D17 makes referral two-sided — a month for each side — and the obvious move is to say so in the
 * invite: *"we both get a month free."* **That sentence must not ship yet, and this is the deliberate
 * place the decision is recorded.**
 *
 * Two things have to be true before it becomes sayable, and neither is true today:
 *
 *   1. `grant_referral_credit` is webhook-only and there is no webhook — the credit cannot be granted at
 *      all until Launch Checklist §4.2 ships the RevenueCat adapter.
 *   2. `entitlement_config.default_tier` is still `PREMIUM`, so nobody is paying for anything. A promise of
 *      "a month free" made to someone who is already getting everything free is not a benefit; it is the
 *      same class of false billing claim Phase F exists to retire, and it would be shipping a NEW one
 *      while that list is still being worked through.
 *
 * Capturing the attribution now is right regardless: it costs the athlete nothing, it is silent, and an
 * athlete attributed today is credited correctly when they pay after Phase F. Recording who reached whom
 * before the reward is announced is the conservative order — the reverse would be announcing a reward
 * against attributions that were never captured.
 *
 * ⛔ **PHASE F OWES THIS FILE A REVISIT.** When 4.2 and the flip are both done, the reward line belongs in
 *    the invite copy, and `Docs/GO-LIVE.md`'s Phase F table is where that is tracked.
 */
export function referralLinkFor(link: string, referralCode: string | null | undefined): string {
  const code = normalizeReferralCode(referralCode);
  if (!link || !isPlausibleReferralCode(code)) return link;
  // The link is built locally and is always a `forgelegacy://` or `https://forgelegacy.app` string, so the
  // separator can be decided by inspection rather than by parsing a URL that may not parse on every RN engine.
  const sep = link.includes('?') ? '&' : '?';
  return `${link}${sep}${REFERRAL_PARAM}=${encodeURIComponent(code)}`;
}

/**
 * Pull a referral code out of whatever a route handed us.
 *
 * ⚠ `useLocalSearchParams` can hand back `string | string[]` — a param repeated in a URL arrives as an
 * array, and a link pasted twice into a messaging app is a real way to produce one. Taking `[0]` keeps the
 * first, which is the same first-wins reading `0170` applies server-side.
 */
export function referralCodeFromParam(param: string | string[] | undefined): string {
  const raw = Array.isArray(param) ? param[0] : param;
  const code = normalizeReferralCode(raw);
  return isPlausibleReferralCode(code) ? code : '';
}

/** Where an attribution came from. Mirrors `0170`'s `source` check constraint. */
export type ReferralSource = 'squad' | 'challenge' | 'code';

export function isReferralSource(value: unknown): value is ReferralSource {
  return value === 'squad' || value === 'challenge' || value === 'code';
}
