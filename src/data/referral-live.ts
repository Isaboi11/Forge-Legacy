import { supabase } from '@/lib/supabase';
import {
  type AttributionVerdict,
  type ReferralSource,
  isAttributionVerdict,
  isPlausibleReferralCode,
  isReferralSource,
  normalizeReferralCode,
} from '@/domain/referral/referral-core';
import { takePendingReferral } from '@/lib/pending-referral-store';

/**
 * REFERRALS — the client's whole share of them (migrations `0145` and `0170`).
 *
 * ══ ⚠ NOTHING HERE GRANTS ANYBODY ANYTHING ══
 *
 * There are three referral functions in the database and this file can reach two of them.
 * `grant_referral_credit()` is the third and is **not executable by `authenticated`** — `0145`'s own header
 * gives the reason in one line: *"a client that could call it could credit itself."* The credit is granted
 * by the payment webhook after a confirmed first payment (MA3-D20), which arrives with the RevenueCat
 * adapter in Launch Checklist §4.2.
 *
 * So what this file does is narrower than it looks, and deliberately so: it hands out the athlete's own
 * code, and it records who reached whom. The money is somebody else's job.
 *
 * ⛔ If a future pass adds a `grant_referral_credit` call here, `0170`'s self-check block fails the
 *    migration on purpose — the grant being absent from client roles is asserted, not assumed.
 */

/**
 * The caller's own code, created on first ask.
 *
 * `my_referral_code()` is get-or-create, so this is safe to call from any surface that wants to show or
 * share a code and there is no separate "generate" step to sequence.
 *
 * ⚠ NULL MEANS "COULD NOT BE READ", AND THE CALLER MUST NOT DRAW A CODE-SHAPED BLANK. Every surface that
 * shows a code shows it as part of an invite; an empty slot where a code belongs reads as "your code is
 * missing" rather than "we couldn't reach the server", and an athlete will share the invite anyway.
 */
export async function fetchMyReferralCode(): Promise<string | null> {
  const { data, error } = await supabase.rpc('my_referral_code');
  if (error) return null;
  const code = normalizeReferralCode(typeof data === 'string' ? data : '');
  return isPlausibleReferralCode(code) ? code : null;
}

/**
 * Record who sent this athlete. First one wins, server-side.
 *
 * Returns the RPC's own verdict, or `null` when the call could not be made at all — which is a different
 * thing from any of the four verdicts and must not be collapsed into one. `unknown` means the server looked
 * and found nobody; `null` means nobody looked.
 */
export async function recordReferralAttribution(
  rawCode: string,
  source: ReferralSource,
): Promise<AttributionVerdict | null> {
  const code = normalizeReferralCode(rawCode);
  // Saves a round trip on an obvious typo, and keeps a malformed code out of the table's check constraint.
  if (!isPlausibleReferralCode(code)) return 'unknown';

  const { data, error } = await supabase.rpc('record_referral_attribution', {
    p_code: code,
    p_source: source,
  });
  if (error) return null;
  return isAttributionVerdict(data) ? data : null;
}

export interface ReferralAttribution {
  code: string;
  source: ReferralSource;
  capturedAt: string;
}

/** The caller's attribution, or null when there is none (or it could not be read). */
export async function fetchMyReferralAttribution(): Promise<ReferralAttribution | null> {
  const { data, error } = await supabase.rpc('my_referral_attribution');
  if (error || !Array.isArray(data) || data.length === 0) return null;
  const row = data[0] as Record<string, unknown>;
  const code = normalizeReferralCode(typeof row.code === 'string' ? row.code : '');
  if (!code) return null;
  return {
    code,
    source: isReferralSource(row.source) ? row.source : 'code',
    capturedAt: typeof row.captured_at === 'string' ? row.captured_at : '',
  };
}

/**
 * Move a code held on the device to the server, at the first moment there is somebody to attribute it to.
 *
 * ══ WHY THIS IS FIRE-AND-FORGET, AND WHY IT RUNS FROM `auth.tsx` ══
 *
 * It is the same shape as `syncAthletePresence()` beside it: a write that follows a session appearing, that
 * nothing on screen is waiting for. It must never delay the splash and must never be able to fail a launch —
 * an athlete whose attribution did not record still gets a working app, and the only cost is that a referral
 * goes uncredited weeks later.
 *
 * ⚠ RUNS ONCE PER STASHED CODE, NOT ONCE PER LAUNCH. `takePendingReferral()` reads and clears together, so a
 * launch with nothing stashed does no work and never touches the network.
 */
export async function flushPendingReferral(): Promise<AttributionVerdict | null> {
  const pending = await takePendingReferral();
  if (!pending) return null;
  const source: ReferralSource = isReferralSource(pending.source) ? pending.source : 'code';
  try {
    return await recordReferralAttribution(pending.code, source);
  } catch {
    /*
     * Swallowed on purpose. The stash is already cleared, so there is nothing to retry against, and this
     * runs on the boot path where an unhandled rejection is a white screen rather than a missed credit.
     */
    return null;
  }
}
