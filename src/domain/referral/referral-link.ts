// ⚠ The explicit `.ts` is required, not stylistic — `node --test` resolves this at runtime and an
// extensionless specifier is ERR_MODULE_NOT_FOUND. Same convention as `domain/coach/assemble.ts`.
import { REFERRAL_PARAM, isPlausibleReferralCode, normalizeReferralCode, type ReferralSource } from './referral-core.ts';

/**
 * The referral code carried by an incoming link — parsed, and nothing else.
 *
 * Sibling of `domain/squad/invite-link.ts`, and deliberately built the same way and for the same reason:
 * capture happens OUTSIDE the router, from a raw URL, at a moment when the route that would have read the
 * param does not exist. Raw URL handling is where the edge cases live, so it belongs somewhere
 * `node --test` can reach.
 *
 * ══ ⚠ THE ONE PLACE THIS DIFFERS FROM THE SQUAD PARSER, AND IT MATTERS ══
 *
 * `inviteCodeFromUrl` checks the path — *"a bare `?code=` on some other route is not an invite, and treating
 * it as one would hijack a link that meant something else."* That reasoning is right there and wrong here.
 *
 * `ref` is not route-specific. MA3-D21 attaches it to squad invites, challenge invites and a bare code
 * precisely because the athlete is already reaching out on all three, so requiring a known path would drop
 * the attribution on whichever surface got added next — silently, and in the direction where nobody notices
 * because a missing referral looks exactly like a person who was never invited.
 *
 * The parameter name carries the meaning instead. `ref` means one thing everywhere in this app, and an
 * unknown path is still an arrival worth attributing.
 */

/**
 * The referrer's code in an incoming URL, or `''`.
 *
 * Accepts both link shapes the invites carry, the same two as the squad parser:
 *   · `https://forgelegacy.expo.app/join-squad?code=IRON-4F2A&ref=ABCD2345`
 *   · `forgelegacy://join-squad?code=IRON-4F2A&ref=ABCD2345`
 */
export function referralCodeFromUrl(url: string | null | undefined): string {
  if (!url) return '';
  try {
    const q = url.indexOf('?');
    if (q < 0) return '';
    // Stop at a fragment, for the same reason the squad parser does: `?ref=X#/something` must not fold the
    // fragment into the value.
    const query = url.slice(q + 1).split('#')[0];

    for (const pair of query.split('&')) {
      const eq = pair.indexOf('=');
      if (eq < 0) continue;
      if (pair.slice(0, eq).toLowerCase() !== REFERRAL_PARAM) continue;
      const code = normalizeReferralCode(decodeURIComponent(pair.slice(eq + 1)));
      // An implausible code is dropped here rather than stashed. Stashing it would occupy the one
      // first-wins slot with a code that can never resolve, so a *real* invite tapped a minute later would
      // be ignored in favour of a typo.
      return isPlausibleReferralCode(code) ? code : '';
    }
    return '';
  } catch {
    return ''; // a malformed URL carries no referral
  }
}

/**
 * Which channel an arrival came through, read from the path.
 *
 * ⚠ THIS IS THE ONE THING MA3-D21 IS A CLAIM ABOUT — *"attach it to squad and challenge invites, not just a
 * generic code … a generic code that lives in Settings is one nobody opens."* That is a testable assertion
 * about which channel actually works, and it is only testable if the channel is recorded at capture. An
 * unrecognised path is `'code'`, which is the honest reading of "arrived with a referral, not through a
 * known invite surface".
 */
export function referralSourceFromUrl(url: string | null | undefined): ReferralSource {
  if (!url) return 'code';
  if (/[/:]join-squad(?:[/?#]|$)/i.test(url)) return 'squad';
  if (/[/:](?:challenge|join-challenge|competitions?)(?:[/?#]|$)/i.test(url)) return 'challenge';
  return 'code';
}
